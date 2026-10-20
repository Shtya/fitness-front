'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/utils/axios';

/*
 * Daily task tickets for the empty chat pane, saved to the signed-in user's account
 * (/daily-tickets) so they follow you to any device. Changes show at once and are saved in the
 * background, one request at a time per ticket; if a save fails the board reloads from the server.
 * Each day starts clean: finished tickets from earlier days drop off, unfinished ones carry over.
 *
 * Ticket: { id, no, title, status: 'todo'|'doing'|'done', done, priority: 'high'|'medium'|'low',
 *           pinned, steps, progress, createdAt, doneAt, day, notes, items: [{ id, text, done }],
 *           repeat: 'none'|'daily', history: [{ day, done, progress, steps, doneAt }] }.
 * A daily ticket is reset to pending by the server every new day; how each earlier day
 * ended is kept in `history`. A ticket can be split into `steps`;
 * every check fills one more and the ticket is done when progress reaches steps.
 * The array order is the manual (drag) order.
 */
const LEGACY_KEY = 'wa-daily-tickets:v1';
export const MAX_TITLE = 120;
export const MAX_STEPS = 20;
export const MAX_NOTES = 5000;
export const MAX_ITEMS = 50;
export const MAX_ITEM_TEXT = 200;
export const PRIORITIES = ['high', 'medium', 'low'];
export const STATUSES = ['todo', 'doing', 'done'];

export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000];
const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clampSteps = n => Math.min(MAX_STEPS, Math.max(1, Math.round(Number(n) || 1)));

function newId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	const b = crypto.getRandomValues(new Uint8Array(16));
	b[6] = (b[6] & 0x0f) | 0x40;
	b[8] = (b[8] & 0x3f) | 0x80;
	const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Fills in fields older tickets did not have and keeps status / progress in step. */
export function normalize(t) {
	const steps = clampSteps(t.steps);
	const status = STATUSES.includes(t.status) ? t.status : t.done ? 'done' : 'todo';
	const progress = status === 'done' ? steps : Math.min(steps - 1, Math.max(0, Math.round(Number(t.progress) || 0)));
	return {
		...t,
		status,
		done: status === 'done',
		priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
		pinned: Boolean(t.pinned),
		steps,
		progress,
		notes: typeof t.notes === 'string' ? t.notes : '',
		items: Array.isArray(t.items) ? t.items.filter(i => i && typeof i.text === 'string').map(i => ({ id: String(i.id), text: i.text, done: Boolean(i.done) })) : [],
		repeat: t.repeat === 'daily' ? 'daily' : 'none',
		history: Array.isArray(t.history) ? t.history : [],
	};
}

/** A ticket with `progress` steps filled; `status` only matters when nothing is filled. */
function withProgress(t, progress, status) {
	const p = Math.min(t.steps, Math.max(0, progress));
	const next = p >= t.steps ? 'done' : p > 0 ? 'doing' : status || (t.status === 'done' ? 'todo' : t.status);
	const done = next === 'done';
	if (next === t.status && p === t.progress) return t;
	return { ...t, status: next, done, progress: p, doneAt: done ? (t.done ? t.doneAt : Date.now()) : null, day: done ? dayKey() : t.day };
}

function withStatus(t, status) {
	if (status === 'done') return withProgress(t, t.steps);
	if (status === 'todo') return withProgress(t, 0, 'todo');
	// "doing" keeps the steps already filled.
	const p = Math.min(t.progress, t.steps - 1);
	return t.status === 'doing' && p === t.progress ? t : { ...t, status: 'doing', done: false, progress: p, doneAt: null };
}

/** Fields the server stores for a ticket (doneAt as epoch ms). */
const saved = t => ({
	title: t.title,
	status: t.status,
	priority: t.priority,
	pinned: t.pinned,
	steps: t.steps,
	progress: t.progress,
	day: t.day,
	doneAt: t.doneAt ?? null,
	notes: t.notes || '',
	items: t.items || [],
	repeat: t.repeat === 'daily' ? 'daily' : 'none',
});

/** A new id for a checklist line. */
export const itemId = () => newId().slice(0, 8) + Date.now().toString(36);

function readLegacy() {
	try {
		const raw = JSON.parse(window.localStorage.getItem(LEGACY_KEY) || 'null');
		return raw && Array.isArray(raw.tickets) ? raw.tickets : [];
	} catch {
		return [];
	}
}

export function useDailyTickets() {
	const [tickets, setTickets] = useState([]);
	const [ready, setReady] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const ticketsRef = useRef(tickets);
	ticketsRef.current = tickets;
	const queues = useRef(new Map());
	const pending = useRef(0);
	const loadSeq = useRef(0);

	const load = useCallback(async () => {
		const seq = ++loadSeq.current;
		try {
			// Tickets from before they were saved to the account: move them over once.
			const legacy = readLegacy();
			if (legacy.length) {
				const today = dayKey();
				const items = legacy
					.filter(t => t && String(t.title || '').trim() && (t.day === today || !t.done))
					.map(t => {
						const n = normalize(t);
						return {
							...(UUID.test(String(n.id)) ? { id: n.id } : {}),
							...saved(n),
							title: String(n.title).trim().slice(0, MAX_TITLE),
							...(Number.isInteger(n.no) && n.no > 0 ? { no: n.no } : {}),
							...(Number.isFinite(n.createdAt) ? { createdAt: n.createdAt } : {}),
							day: /^\d{4}-\d{2}-\d{2}$/.test(String(n.day)) ? n.day : today,
						};
					});
				if (items.length) await api.post('/daily-tickets/import', { items });
				window.localStorage.removeItem(LEGACY_KEY);
			}
			const res = await api.get('/daily-tickets', { params: { today: dayKey() } });
			// A newer load, or a change still being saved, would make this response stale.
			if (seq !== loadSeq.current || pending.current > 0) return;
			setTickets((res.data?.tickets || []).map(normalize));
			setSaveError(false);
		} catch {
			if (seq === loadSeq.current) setSaveError(true);
		} finally {
			if (seq === loadSeq.current) setReady(true);
		}
	}, []);

	useEffect(() => {
		load();
		// Coming back to the tab picks up changes made on another device (and rolls over the day).
		const onVisible = () => {
			if (document.visibilityState === 'visible') load();
		};
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('online', load);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('online', load);
		};
	}, [load]);

	/**
	 * Runs requests for one key strictly in order, so the last change always wins. A dropped
	 * connection or a restarting server is retried for about half a minute before giving up.
	 */
	const enqueue = useCallback(
		(key, request) => {
			pending.current += 1;
			const prev = queues.current.get(key) || Promise.resolve();
			const attempt = async () => {
				for (let i = 0; ; i += 1) {
					try {
						return await request();
					} catch (error) {
						const status = error?.response?.status;
						const retryable = !status || status >= 500 || status === 429;
						if (!retryable || i >= RETRY_DELAYS.length) throw error;
						setSaveError(true);
						await new Promise(resolve => window.setTimeout(resolve, RETRY_DELAYS[i]));
					}
				}
			};
			const next = prev
				.then(attempt)
				.then(
					() => setSaveError(false),
					() => {
						setSaveError(true);
						loadSeq.current += 1; // drop any load already on its way
						window.setTimeout(load, 0);
					},
				)
				.finally(() => {
					pending.current -= 1;
					if (queues.current.get(key) === next) queues.current.delete(key);
				});
			queues.current.set(key, next);
			return next;
		},
		[load],
	);

	/** Change one ticket locally and save the result. */
	const mapOne = useCallback(
		(id, fn) => {
			const current = ticketsRef.current.find(t => t.id === id);
			if (!current) return;
			const next = fn(current);
			if (!next || next === current) return;
			ticketsRef.current = ticketsRef.current.map(t => (t.id === id ? next : t));
			setTickets(ticketsRef.current);
			enqueue(id, () => api.patch(`/daily-tickets/${id}`, saved(next)));
		},
		[enqueue],
	);

	const add = useCallback(
		(title, { priority = 'medium', steps = 1, repeat = 'none' } = {}) => {
			const clean = title.trim().slice(0, MAX_TITLE);
			if (!clean) return null;
			const list = ticketsRef.current;
			const created = normalize({
				id: newId(),
				no: list.reduce((m, t) => Math.max(m, t.no || 0), 0) + 1,
				title: clean,
				status: 'todo',
				priority: PRIORITIES.includes(priority) ? priority : 'medium',
				pinned: false,
				steps: clampSteps(steps),
				progress: 0,
				repeat: repeat === 'daily' ? 'daily' : 'none',
				createdAt: Date.now(),
				doneAt: null,
				day: dayKey(),
			});
			ticketsRef.current = [...list, created];
			setTickets(ticketsRef.current);
			enqueue(created.id, async () => {
				const res = await api.post('/daily-tickets', { id: created.id, ...saved(created) });
				// The server numbers tickets; take its number.
				const no = res.data?.no;
				if (no && no !== created.no) setTickets(prev => prev.map(t => (t.id === created.id ? { ...t, no } : t)));
			});
			return created;
		},
		[enqueue],
	);

	const rename = useCallback(
		(id, title) => {
			const clean = title.trim().slice(0, MAX_TITLE);
			if (clean) mapOne(id, t => (t.title === clean ? t : { ...t, title: clean }));
		},
		[mapOne],
	);

	const setStatus = useCallback((id, status) => STATUSES.includes(status) && mapOne(id, t => withStatus(t, status)), [mapOne]);

	/** The check: fills the next step; on a finished ticket it takes the last step back. */
	const toggle = useCallback(id => mapOne(id, t => (t.done ? withProgress(t, t.steps - 1, 'todo') : withProgress(t, t.progress + 1))), [mapOne]);

	/** Split a ticket into `steps` parts (1 = a single check). Filled steps are kept. */
	const setSteps = useCallback(
		(id, steps) =>
			mapOne(id, t => {
				const n = clampSteps(steps);
				if (n === t.steps) return t;
				const progress = Math.min(t.progress, n);
				return withProgress({ ...t, steps: n, progress: -1 }, progress, t.status === 'done' ? 'doing' : t.status);
			}),
		[mapOne],
	);

	/** Notes and checklist inside the ticket. */
	const setDetails = useCallback(
		(id, { notes, items }) =>
			mapOne(id, t => {
				const next = { ...t };
				if (typeof notes === 'string') next.notes = notes.slice(0, MAX_NOTES);
				if (Array.isArray(items)) next.items = items.slice(0, MAX_ITEMS).map(i => ({ id: i.id, text: String(i.text).slice(0, MAX_ITEM_TEXT), done: Boolean(i.done) }));
				return next.notes === t.notes && JSON.stringify(next.items) === JSON.stringify(t.items) ? t : next;
			}),
		[mapOne],
	);

	/** Daily tickets come back as pending every new day. */
	const setRepeat = useCallback(
		(id, repeat) => mapOne(id, t => (t.repeat === repeat ? t : { ...t, repeat: repeat === 'daily' ? 'daily' : 'none' })),
		[mapOne],
	);

	const setPriority = useCallback((id, priority) => PRIORITIES.includes(priority) && mapOne(id, t => (t.priority === priority ? t : { ...t, priority })), [mapOne]);
	const togglePinned = useCallback(id => mapOne(id, t => ({ ...t, pinned: !t.pinned })), [mapOne]);

	/**
	 * Manual order (drag and drop, "move earlier/later"): the board hands over the full order it
	 * shows, so what you see is exactly what gets saved.
	 */
	const setOrder = useCallback(
		ids => {
			const prev = ticketsRef.current;
			const byId = new Map(prev.map(t => [t.id, t]));
			const ordered = ids.map(id => byId.get(id)).filter(Boolean);
			const rest = prev.filter(t => !ids.includes(t.id));
			const next = [...ordered, ...rest];
			if (next.every((t, i) => t === prev[i])) return;
			ticketsRef.current = next;
			setTickets(next);
			// Waits for any ticket still being created, so the server knows every id.
			const creating = next.map(t => queues.current.get(t.id)).filter(Boolean);
			enqueue('__order', async () => {
				await Promise.all(creating);
				await api.put('/daily-tickets/order', { ids: ticketsRef.current.map(t => t.id) });
			});
		},
		[enqueue],
	);

	const remove = useCallback(
		id => {
			if (!ticketsRef.current.some(t => t.id === id)) return;
			ticketsRef.current = ticketsRef.current.filter(t => t.id !== id);
			setTickets(ticketsRef.current);
			enqueue(id, () => api.delete(`/daily-tickets/${id}`));
		},
		[enqueue],
	);

	/** Put deleted tickets back where they were (undo). */
	const restore = useCallback(
		items => {
			const list = (Array.isArray(items) ? items : [items]).filter(Boolean);
			const prev = ticketsRef.current;
			const missing = list.filter(item => !prev.some(t => t.id === item.id)).sort((a, b) => (a._index ?? 1e9) - (b._index ?? 1e9));
			if (!missing.length) return;
			const next = prev.slice();
			for (const item of missing) {
				const { _index, ...ticket } = item;
				const at = Math.min(_index ?? next.length, next.length);
				const t = normalize(ticket);
				next.splice(at, 0, t);
				enqueue(t.id, () => api.post('/daily-tickets', { id: t.id, no: t.no, createdAt: t.createdAt, ...saved(t) }));
			}
			ticketsRef.current = next;
			setTickets(next);
			// Then save the slot each one went back into.
			const restoring = missing.map(t => queues.current.get(t.id)).filter(Boolean);
			enqueue('__order', async () => {
				await Promise.all(restoring);
				await api.put('/daily-tickets/order', { ids: ticketsRef.current.map(t => t.id) });
			});
		},
		[enqueue],
	);

	/** Index lookup so undo can put a ticket back in its slot. */
	const indexOf = useCallback(id => ticketsRef.current.findIndex(t => t.id === id), []);

	return { tickets, ready, saveError, add, rename, toggle, setStatus, setSteps, setDetails, setRepeat, setPriority, togglePinned, setOrder, remove, restore, indexOf };
}
