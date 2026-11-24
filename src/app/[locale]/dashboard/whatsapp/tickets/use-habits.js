'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/utils/axios';
import { DEFAULT_CARDS, dayKey, hid, mergeById, normalizeCard, normalizeHabit } from './habits-model';

const LS = 'wa-habits:v1';
const PUSH_MS = 600;

function readCache() {
	try {
		const v = JSON.parse(window.localStorage.getItem(LS) || 'null');
		return v && typeof v === 'object' ? v : null;
	} catch {
		return null;
	}
}

/**
 * The habit tracker: works from a local copy at once (and offline), syncs with the account.
 * Each change sends only the habits / cards that changed; the server merges them by id.
 */
export function useHabits() {
	const today = dayKey();
	const [state, setState] = useState(() => {
		const c = typeof window === 'undefined' ? null : readCache();
		return {
			habits: (c?.habits || []).map(h => normalizeHabit(h, today)),
			cards: (c?.cards || []).map(normalizeCard),
			planStart: c?.planStart || '',
			loaded: Boolean(c),
		};
	});
	const [synced, setSynced] = useState(false);
	const stateRef = useRef(state);
	stateRef.current = state;
	const pending = useRef({ habits: new Map(), cards: new Map(), planStart: '' });
	const timer = useRef(0);

	const persist = useCallback(next => {
		try {
			window.localStorage.setItem(LS, JSON.stringify({ habits: next.habits, cards: next.cards, planStart: next.planStart }));
		} catch {
			/* full / blocked: the account copy still has it */
		}
	}, []);

	const flush = useCallback(async () => {
		window.clearTimeout(timer.current);
		const p = pending.current;
		if (!p.habits.size && !p.cards.size && !p.planStart) return;
		const body = {};
		if (p.habits.size) body.habits = [...p.habits.values()];
		if (p.cards.size) body.cards = [...p.cards.values()];
		if (p.planStart) body.planStart = p.planStart;
		pending.current = { habits: new Map(), cards: new Map(), planStart: '' };
		try {
			await api.put('/habits', body);
		} catch {
			// keep them for the next try (newer edits of the same id win)
			(body.habits || []).forEach(h => !pending.current.habits.has(h.id) && pending.current.habits.set(h.id, h));
			(body.cards || []).forEach(c => !pending.current.cards.has(c.id) && pending.current.cards.set(c.id, c));
			if (body.planStart && !pending.current.planStart) pending.current.planStart = body.planStart;
		}
	}, []);
	const schedule = useCallback(() => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => void flush(), PUSH_MS);
	}, [flush]);

	const commit = useCallback(
		(next, changed = {}) => {
			stateRef.current = next;
			setState(next);
			persist(next);
			(changed.habits || []).forEach(h => pending.current.habits.set(h.id, h));
			(changed.cards || []).forEach(c => pending.current.cards.set(c.id, c));
			if (changed.planStart) pending.current.planStart = changed.planStart;
			if (changed.habits?.length || changed.cards?.length || changed.planStart) schedule();
		},
		[persist, schedule],
	);

	// first load: merge the account copy with this device's
	useEffect(() => {
		let live = true;
		api
			.get('/habits')
			.then(({ data }) => {
				if (!live) return;
				const local = stateRef.current;
				const habits = mergeById(local.habits, data?.habits || []).map(h => normalizeHabit(h, today));
				const isFirst = !local.loaded && !(data?.cards || []).length && !local.cards.length;
				const cards = isFirst
					? DEFAULT_CARDS.map((c, i) => normalizeCard({ ...c, id: hid('c'), order: i, createdAt: Date.now(), updatedAt: Date.now() }))
					: mergeById(local.cards, data?.cards || []).map(normalizeCard);
				const planStart = data?.planStart || local.planStart || today;
				const serverAt = new Map([...(data?.habits || []), ...(data?.cards || [])].map(x => [x.id, Number(x.updatedAt || 0)]));
				const newer = list => list.filter(x => x.updatedAt > (serverAt.get(x.id) ?? -1));
				commit(
					{ habits, cards, planStart, loaded: true },
					{ habits: newer(habits), cards: newer(cards), planStart: data?.planStart ? '' : planStart },
				);
				setSynced(true);
			})
			.catch(() => {
				if (!live) return;
				const s = stateRef.current;
				if (!s.planStart) commit({ ...s, planStart: today, loaded: true });
				setSynced(true);
			});
		const onHide = () => document.visibilityState === 'hidden' && void flush();
		document.addEventListener('visibilitychange', onHide);
		return () => {
			live = false;
			document.removeEventListener('visibilitychange', onHide);
			void flush();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	/* habits */
	const updateHabit = useCallback(
		(id, fn) => {
			const s = stateRef.current;
			const cur = s.habits.find(h => h.id === id);
			if (!cur) return;
			const next = normalizeHabit({ ...fn(cur), updatedAt: Date.now() }, today);
			commit({ ...s, habits: s.habits.map(h => (h.id === id ? next : h)) }, { habits: [next] });
		},
		[commit, today],
	);
	const addHabits = useCallback(
		list => {
			const s = stateRef.current;
			const top = s.habits.reduce((m, h) => Math.max(m, h.order), -1);
			const added = list.map((h, i) => normalizeHabit({ ...h, order: top + 1 + i, updatedAt: Date.now() }, today));
			commit({ ...s, habits: [...s.habits, ...added] }, { habits: added });
			return added;
		},
		[commit, today],
	);
	const removeHabit = useCallback(id => updateHabit(id, h => ({ ...h, deletedAt: Date.now() })), [updateHabit]);
	const reorder = useCallback(
		ids => {
			const s = stateRef.current;
			const now = Date.now();
			const changed = [];
			const habits = s.habits.map(h => {
				const i = ids.indexOf(h.id);
				if (i < 0 || h.order === i) return h;
				const n = { ...h, order: i, updatedAt: now };
				changed.push(n);
				return n;
			});
			commit({ ...s, habits }, { habits: changed });
		},
		[commit],
	);
	const setPlanStart = useCallback(day => commit({ ...stateRef.current, planStart: day }, { planStart: day }), [commit]);

	/* motivation cards */
	const saveCard = useCallback(
		card => {
			const s = stateRef.current;
			const exists = s.cards.some(c => c.id === card.id);
			const next = normalizeCard({ ...card, id: card.id || hid('c'), createdAt: card.createdAt || Date.now(), updatedAt: Date.now(), order: exists ? card.order : s.cards.length });
			commit({ ...s, cards: exists ? s.cards.map(c => (c.id === next.id ? next : c)) : [...s.cards, next] }, { cards: [next] });
		},
		[commit],
	);
	const removeCard = useCallback(
		id => {
			const s = stateRef.current;
			const card = s.cards.find(c => c.id === id);
			if (!card) return;
			const next = { ...card, deletedAt: Date.now(), updatedAt: Date.now() };
			commit({ ...s, cards: s.cards.map(c => (c.id === id ? next : c)) }, { cards: [next] });
		},
		[commit],
	);

	return {
		today,
		habits: state.habits,
		cards: state.cards.filter(c => !c.deletedAt).sort((a, b) => a.order - b.order),
		planStart: state.planStart || today,
		ready: state.loaded || synced,
		updateHabit,
		addHabits,
		removeHabit,
		reorder,
		setPlanStart,
		saveCard,
		removeCard,
	};
}
