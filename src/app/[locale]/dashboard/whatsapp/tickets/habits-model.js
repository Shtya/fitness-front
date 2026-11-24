/*
 * Habit tracker (the "Habits" tab of Today's tickets): repeating habits, one check per day.
 * Pure helpers, tested in habits-model.test.mjs.
 *
 * habit = {
 *   id, title, icon (emoji), color, link, notes,
 *   subtasks: [{ id, text }],
 *   schedule: { type: 'daily' | 'weekdays' | 'interval', days: [0..6], every: n },
 *   start: 'YYYY-MM-DD', end: '' | 'YYYY-MM-DD',
 *   pauses: [{ from, to }]          // to '' = still paused
 *   snoozedFrom / snoozedUntil      // days in [from, until) count as rest days
 *   pinned, archived, order,
 *   log: { [day]: { s: 'done' | 'skip', sub?: [subtaskId] } },
 *   createdAt, updatedAt, deletedAt?
 * }
 */

export const HABIT_COLORS = ['green', 'teal', 'blue', 'violet', 'rose', 'amber', 'slate'];
export const HABIT_ICONS = ['📖', '🤲', '🕌', '🧠', '🇬🇧', '🎧', '💻', '🏃', '💧', '🥗', '😴', '✍️', '📚', '🧘', '💪', '🎯', '⭐', '🌱'];
export const PLAN_DAYS = 14;

/* ───── days ───── */

const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = key => {
	const [y, m, d] = String(key).split('-').map(Number);
	return new Date(y, (m || 1) - 1, d || 1, 12);
};
export const addDays = (key, n) => {
	const d = parseDay(key);
	d.setDate(d.getDate() + n);
	return dayKey(d);
};
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86_400_000);
export const weekday = key => parseDay(key).getDay();

/** The 14 days of the plan window that contains `day` (windows run from `planStart`). */
export function planWindow(planStart, day, size = PLAN_DAYS) {
	const offset = Math.floor(daysBetween(planStart, day) / size) * size;
	const first = addDays(planStart, offset);
	return Array.from({ length: size }, (_, i) => addDays(first, i));
}

export const hid = (p = 'h') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/* ───── one habit ───── */

export function newHabit(fields = {}, today = dayKey()) {
	const now = Date.now();
	return normalizeHabit({ id: hid('h'), start: today, createdAt: now, updatedAt: now, ...fields }, today);
}

export function normalizeHabit(raw, today = dayKey()) {
	const h = raw && typeof raw === 'object' ? raw : {};
	const sched = h.schedule && typeof h.schedule === 'object' ? h.schedule : {};
	const type = ['daily', 'weekdays', 'interval'].includes(sched.type) ? sched.type : 'daily';
	const days = Array.isArray(sched.days) ? [...new Set(sched.days.map(Number).filter(d => d >= 0 && d <= 6))].sort() : [];
	const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
	return {
		id: String(h.id || hid('h')),
		title: String(h.title || '').slice(0, 120),
		icon: typeof h.icon === 'string' ? h.icon.slice(0, 8) : '',
		color: HABIT_COLORS.includes(h.color) ? h.color : 'green',
		link: typeof h.link === 'string' ? h.link.slice(0, 600) : '',
		notes: typeof h.notes === 'string' ? h.notes.slice(0, 4000) : '',
		subtasks: (Array.isArray(h.subtasks) ? h.subtasks : []).filter(s => s && s.id && String(s.text || '').trim()).slice(0, 20).map(s => ({ id: String(s.id), text: String(s.text).slice(0, 160) })),
		schedule: { type: type === 'weekdays' && !days.length ? 'daily' : type, days, every: Math.max(2, Math.min(30, Number(sched.every) || 2)) },
		start: isDay(h.start) ? h.start : today,
		end: isDay(h.end) ? h.end : '',
		pauses: (Array.isArray(h.pauses) ? h.pauses : []).filter(p => p && isDay(p.from)).map(p => ({ from: p.from, to: isDay(p.to) ? p.to : '' })),
		snoozedUntil: isDay(h.snoozedUntil) ? h.snoozedUntil : '',
		snoozedFrom: isDay(h.snoozedFrom) ? h.snoozedFrom : '',
		pinned: Boolean(h.pinned),
		archived: Boolean(h.archived),
		order: Number.isFinite(Number(h.order)) ? Number(h.order) : 0,
		log: h.log && typeof h.log === 'object' && !Array.isArray(h.log) ? h.log : {},
		createdAt: Number(h.createdAt) || 0,
		updatedAt: Number(h.updatedAt) || 0,
		...(h.deletedAt ? { deletedAt: Number(h.deletedAt) || 1 } : {}),
	};
}

/** Is the habit planned on this day by its schedule (ignores pauses / snooze)? */
export function isPlanned(h, day) {
	if (day < h.start || (h.end && day > h.end)) return false;
	const s = h.schedule;
	if (s.type === 'weekdays') return s.days.includes(weekday(day));
	if (s.type === 'interval') return daysBetween(h.start, day) % s.every === 0;
	return true;
}

export const isPausedOn = (h, day) => h.pauses.some(p => day >= p.from && (!p.to || day <= p.to)) || Boolean(h.snoozedUntil && day < h.snoozedUntil && day >= (h.snoozedFrom || h.snoozedUntil));
export const isPaused = (h, today) => h.pauses.some(p => !p.to && today >= p.from);

const subDone = (h, day) => {
	const e = h.log[day];
	if (!e) return 0;
	if (e.s === 'done') return h.subtasks.length;
	return Array.isArray(e.sub) ? e.sub.filter(id => h.subtasks.some(s => s.id === id)).length : 0;
};

/**
 * One day of one habit:
 *  'done' | 'partial' (some subtasks) | 'skip' | 'rest' (paused / snoozed) | 'off' (not planned)
 *  | 'missed' (past, planned, not done) | 'open' (today or later, not done yet).
 * A day you checked by hand counts even when it was not planned.
 */
export function dayState(h, day, today) {
	const e = h.log[day];
	if (e?.s === 'done') return 'done';
	if (e?.s === 'skip') return 'skip';
	if (h.subtasks.length && subDone(h, day) > 0) return 'partial';
	if (!isPlanned(h, day)) return 'off';
	if (isPausedOn(h, day)) return 'rest';
	return day < today ? 'missed' : 'open';
}

export const progressOn = (h, day) => ({ done: subDone(h, day), total: h.subtasks.length });

/** Days in a row up to today (today counts once done; skipped / rest / off days don't break it). */
export function streak(h, today) {
	let n = 0;
	let day = dayState(h, today, today) === 'done' ? today : addDays(today, -1);
	for (let guard = 0; guard < 2000 && day >= h.start; guard += 1, day = addDays(day, -1)) {
		const s = dayState(h, day, today);
		if (s === 'done') n += 1;
		else if (s === 'skip' || s === 'rest' || s === 'off') continue;
		else break;
	}
	return n;
}

/** Best run ever (same rules). */
export function bestStreak(h, today) {
	let best = 0;
	let run = 0;
	for (let day = h.start, guard = 0; day <= today && guard < 3000; day = addDays(day, 1), guard += 1) {
		const s = dayState(h, day, today);
		if (s === 'done') best = Math.max(best, (run += 1));
		else if (s === 'missed' || s === 'partial') run = 0;
	}
	return best;
}

/** Share of planned days done, from the start (or `from`) up to today; today only once it is done. */
export function adherence(h, today, from = h.start) {
	let planned = 0;
	let done = 0;
	for (let day = from < h.start ? h.start : from, guard = 0; day <= today && guard < 3000; day = addDays(day, 1), guard += 1) {
		const s = dayState(h, day, today);
		if (s === 'done') {
			done += 1;
			planned += 1;
		} else if (s === 'missed' || (s === 'partial' && day < today)) planned += 1;
	}
	return planned ? Math.round((done / planned) * 100) : null;
}

/* ───── changes (each returns a new habit with updatedAt) ───── */

const touch = (h, patch, now = Date.now()) => ({ ...h, ...patch, updatedAt: now });

function setLog(h, day, entry, now) {
	const log = { ...h.log };
	if (entry) log[day] = entry;
	else delete log[day];
	return touch(h, { log }, now);
}

/** Check / uncheck a day (with subtasks: checking marks them all). */
export function toggleDay(h, day, now) {
	return setLog(h, day, h.log[day]?.s === 'done' ? null : { s: 'done' }, now);
}

export function skipDay(h, day, now) {
	return setLog(h, day, h.log[day]?.s === 'skip' ? null : { s: 'skip' }, now);
}

export const clearDay = (h, day, now) => setLog(h, day, null, now);

/** Tick one subtask on a day; all of them ticked = the day is done. */
export function toggleSub(h, day, subId, now) {
	const e = h.log[day] || {};
	const current = e.s === 'done' ? h.subtasks.map(s => s.id) : Array.isArray(e.sub) ? e.sub : [];
	const next = current.includes(subId) ? current.filter(x => x !== subId) : [...current, subId];
	const all = h.subtasks.every(s => next.includes(s.id));
	if (all) return setLog(h, day, { s: 'done' }, now);
	return setLog(h, day, next.length ? { sub: next } : null, now);
}

export function pause(h, today, now) {
	if (isPaused(h, today)) return h;
	return touch(h, { pauses: [...h.pauses, { from: today, to: '' }] }, now);
}

export function resume(h, today, now) {
	const yesterday = addDays(today, -1);
	return touch(
		h,
		{
			pauses: h.pauses
				.map(p => (p.to ? p : { ...p, to: yesterday }))
				.filter(p => p.to >= p.from),
		},
		now,
	);
}

export const snooze = (h, today, days, now) => touch(h, { snoozedFrom: days ? today : '', snoozedUntil: days ? addDays(today, days) : '' }, now);

/* ───── the whole list ───── */

/** Shown order: pinned first, then your order (archived and deleted left out). */
export function activeHabits(list) {
	return (list || [])
		.filter(h => !h.deletedAt && !h.archived)
		.map((h, i) => [h, i])
		.sort(([a, i], [b, j]) => Number(b.pinned) - Number(a.pinned) || a.order - b.order || i - j)
		.map(([h]) => h);
}

/** Today's numbers for the header: planned today, done today, best current streak. */
export function todaySummary(list, today) {
	const shown = activeHabits(list);
	let planned = 0;
	let done = 0;
	let best = 0;
	shown.forEach(h => {
		const s = dayState(h, today, today);
		if (s === 'done' || s === 'open' || s === 'partial') planned += 1;
		if (s === 'done') done += 1;
		best = Math.max(best, streak(h, today));
	});
	return { planned, done, best, pct: planned ? Math.round((done / planned) * 100) : 0 };
}

/** Newest edit of each id wins (two devices). */
export function mergeById(a, b) {
	const byId = new Map();
	[...(a || []), ...(b || [])].forEach(x => {
		if (!x || !x.id) return;
		const prev = byId.get(x.id);
		if (!prev || Number(x.updatedAt || 0) >= Number(prev.updatedAt || 0)) byId.set(x.id, x);
	});
	return [...byId.values()];
}

/** A repeating ticket from Today's tickets → a habit (history and today's state come along). */
export function habitFromTicket(t, today, order = 0) {
	const log = {};
	(Array.isArray(t.history) ? t.history : []).forEach(e => {
		if (e?.day && e.done) log[e.day] = { s: 'done' };
	});
	if (t.done && t.day) log[t.day] = { s: 'done' };
	const days = Object.keys(log).sort();
	return newHabit(
		{
			title: t.title,
			subtasks: (t.items || []).filter(i => String(i.text || '').trim()).map(i => ({ id: String(i.id), text: i.text })),
			notes: t.notes || '',
			start: days[0] && days[0] < today ? days[0] : today,
			log,
			order,
			pinned: Boolean(t.pinned),
		},
		today,
	);
}

/* ───── motivation cards ───── */

export const CARD_TONES = ['sun', 'mint', 'sky', 'rose', 'lilac'];
export const DEFAULT_CARDS = [
	{ text: 'Small steps every day beat big steps once in a while.', tone: 'mint' },
	{ text: 'خير الأعمال أدومها وإن قل', tone: 'sun' },
	{ text: 'Don’t break the chain.', tone: 'sky' },
];

export function normalizeCard(c) {
	return {
		id: String(c?.id || hid('c')),
		text: String(c?.text || '').slice(0, 280),
		tone: CARD_TONES.includes(c?.tone) ? c.tone : 'sun',
		order: Number(c?.order) || 0,
		createdAt: Number(c?.createdAt) || 0,
		updatedAt: Number(c?.updatedAt) || 0,
		...(c?.deletedAt ? { deletedAt: Number(c.deletedAt) || 1 } : {}),
	};
}

/** The card of the day: rotates through your cards, one per day. */
export function cardOfDay(cards, today) {
	const live = (cards || []).filter(c => !c.deletedAt && c.text.trim());
	if (!live.length) return -1;
	return Math.abs(daysBetween('2020-01-01', today)) % live.length;
}
