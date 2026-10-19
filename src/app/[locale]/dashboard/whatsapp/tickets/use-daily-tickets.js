'use client';

import { useCallback, useEffect, useState } from 'react';

/*
 * Daily task tickets for the empty chat pane. Personal and per-browser (localStorage), so
 * nothing touches the CRM database. Each day starts clean: finished tickets from earlier
 * days are dropped, unfinished ones carry over and say where they came from.
 *
 * Ticket: { id, no, title, status: 'todo'|'doing'|'done', done, priority: 'high'|'medium'|'low',
 *           pinned, createdAt, doneAt, day }. The array order is the manual (drag) order.
 */
const KEY = 'wa-daily-tickets:v1';
export const MAX_TITLE = 120;
export const PRIORITIES = ['high', 'medium', 'low'];
export const STATUSES = ['todo', 'doing', 'done'];

export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const EMPTY = { seq: 0, tickets: [] };

/** Older saves had only `done`; fill in the newer fields. */
function normalize(t) {
	const status = STATUSES.includes(t.status) ? t.status : t.done ? 'done' : 'todo';
	return {
		...t,
		status,
		done: status === 'done',
		priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
		pinned: Boolean(t.pinned),
	};
}

function read() {
	try {
		const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null');
		if (raw && Array.isArray(raw.tickets) && Number.isFinite(raw.seq)) return { ...raw, tickets: raw.tickets.map(normalize) };
	} catch {
		/* unreadable or blocked storage: start empty */
	}
	return EMPTY;
}

/** Returns false when the browser refuses to save (private mode, quota). */
function write(data) {
	try {
		window.localStorage.setItem(KEY, JSON.stringify(data));
		return true;
	} catch {
		return false;
	}
}

function rollover(data) {
	const today = dayKey();
	const tickets = data.tickets.filter(t => t.day === today || !t.done);
	return tickets.length === data.tickets.length ? data : { ...data, tickets };
}

function withStatus(t, status) {
	if (t.status === status) return t;
	const done = status === 'done';
	return { ...t, status, done, doneAt: done ? Date.now() : null, day: done ? dayKey() : t.day };
}

export function useDailyTickets() {
	const [data, setData] = useState(EMPTY);
	const [ready, setReady] = useState(false);
	const [saveError, setSaveError] = useState(false);

	useEffect(() => {
		const load = () => {
			const next = rollover(read());
			if (!write(next)) setSaveError(true);
			setData(next);
		};
		load();
		setReady(true);
		const onStorage = event => {
			if (event.key === KEY) setData(rollover(read()));
		};
		// A tab left open overnight rolls over when you come back to it.
		const onVisible = () => {
			if (document.visibilityState === 'visible') load();
		};
		window.addEventListener('storage', onStorage);
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			window.removeEventListener('storage', onStorage);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, []);

	const commit = useCallback(update => {
		setData(prev => {
			const next = update(prev);
			if (next !== prev) setSaveError(!write(next));
			return next;
		});
	}, []);

	const mapOne = useCallback((id, fn) => commit(prev => ({ ...prev, tickets: prev.tickets.map(t => (t.id === id ? fn(t) : t)) })), [commit]);

	const add = useCallback(
		(title, { priority = 'medium' } = {}) => {
			const clean = title.trim().slice(0, MAX_TITLE);
			if (!clean) return null;
			let created = null;
			commit(prev => {
				const seq = prev.seq + 1;
				created = {
					id: `t${Date.now().toString(36)}${seq}`,
					no: seq,
					title: clean,
					status: 'todo',
					done: false,
					priority: PRIORITIES.includes(priority) ? priority : 'medium',
					pinned: false,
					createdAt: Date.now(),
					doneAt: null,
					day: dayKey(),
				};
				return { seq, tickets: [...prev.tickets, created] };
			});
			return created;
		},
		[commit],
	);

	const rename = useCallback(
		(id, title) => {
			const clean = title.trim().slice(0, MAX_TITLE);
			if (clean) mapOne(id, t => ({ ...t, title: clean }));
		},
		[mapOne],
	);

	const setStatus = useCallback((id, status) => STATUSES.includes(status) && mapOne(id, t => withStatus(t, status)), [mapOne]);
	const toggle = useCallback(id => mapOne(id, t => withStatus(t, t.done ? 'todo' : 'done')), [mapOne]);
	const setPriority = useCallback((id, priority) => PRIORITIES.includes(priority) && mapOne(id, t => ({ ...t, priority })), [mapOne]);
	const togglePinned = useCallback(id => mapOne(id, t => ({ ...t, pinned: !t.pinned })), [mapOne]);

	/**
	 * Manual order (drag and drop, "move earlier/later"): the board hands over the full order it
	 * shows, so what you see is exactly what gets saved. Unknown ids are ignored, missing ones keep
	 * their place at the end.
	 */
	const setOrder = useCallback(
		ids => {
			commit(prev => {
				const byId = new Map(prev.tickets.map(t => [t.id, t]));
				const ordered = ids.map(id => byId.get(id)).filter(Boolean);
				const rest = prev.tickets.filter(t => !ids.includes(t.id));
				const tickets = [...ordered, ...rest];
				return tickets.every((t, i) => t === prev.tickets[i]) ? prev : { ...prev, tickets };
			});
		},
		[commit],
	);

	const remove = useCallback(id => commit(prev => ({ ...prev, tickets: prev.tickets.filter(t => t.id !== id) })), [commit]);

	/** Put deleted tickets back where they were (undo). */
	const restore = useCallback(
		items => {
			const list = (Array.isArray(items) ? items : [items]).filter(Boolean);
			commit(prev => {
				const missing = list.filter(item => !prev.tickets.some(t => t.id === item.id));
				if (!missing.length) return prev;
				const tickets = prev.tickets.slice();
				for (const item of missing.sort((a, b) => (a._index ?? 1e9) - (b._index ?? 1e9))) {
					const { _index, ...ticket } = item;
					tickets.splice(Math.min(_index ?? tickets.length, tickets.length), 0, normalize(ticket));
				}
				return { ...prev, tickets };
			});
		},
		[commit],
	);

	/** Index lookup so undo can put a ticket back in its slot. */
	const indexOf = useCallback(id => data.tickets.findIndex(t => t.id === id), [data.tickets]);

	return { tickets: data.tickets, ready, saveError, add, rename, toggle, setStatus, setPriority, togglePinned, setOrder, remove, restore, indexOf };
}
