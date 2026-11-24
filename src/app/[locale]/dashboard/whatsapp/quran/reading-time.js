/**
 * Time spent reading the mushaf, per local day: { 'YYYY-MM-DD': seconds }.
 * A stretch that crosses midnight is split between the two days.
 * Synced per device ({ [deviceId]: log }) so two devices on the same day add up.
 */
// Loaded on first use, so the pure helpers stay importable on their own (tests).
const putQuranRevisionState = patch => import('../../quran-revision/quran-revision-api').then(m => m.putQuranRevisionState(patch));

export const LS_READING = 'so7ba:quran-revision:reading-time:v1';
const LS_OTHERS = 'so7ba:quran-revision:reading-time-others:v1';
const LS_DEVICE = 'so7ba:quran-revision:device-id:v1';
const PUSH_EVERY_MS = 60 * 1000;
const PUSH_DAYS = 60;
export const READING_EVENT = 'so7ba:quran-reading-time';
/** No touch / page turn / audio for this long → you stopped reading; the rest is not counted. */
export const IDLE_MS = 4 * 60 * 1000;
const KEEP_DAYS = 400;

const pad = n => String(n).padStart(2, '0');
export const dayKey = ms => {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nextMidnight = ms => {
	const d = new Date(ms);
	d.setHours(24, 0, 0, 0);
	return d.getTime();
};

/** Adds the stretch [from, to) to the log (returns a new object). */
export function addStretch(log, from, to) {
	const out = { ...(log || {}) };
	let a = from;
	while (to > a) {
		const end = Math.min(to, nextMidnight(a));
		const k = dayKey(a);
		out[k] = Math.round(((out[k] || 0) + (end - a) / 1000) * 10) / 10;
		a = end;
	}
	return out;
}

/** The last n days ending today, oldest first: [{ key, date, sec }]. */
export function lastDays(log, n = 7, now = Date.now()) {
	const out = [];
	const d = new Date(now);
	d.setHours(12, 0, 0, 0);
	for (let i = n - 1; i >= 0; i -= 1) {
		const day = new Date(d);
		day.setDate(d.getDate() - i);
		const key = dayKey(day.getTime());
		out.push({ key, date: day, sec: Math.round((log && log[key]) || 0) });
	}
	return out;
}

/** Days in a row (ending today, or yesterday if today has nothing yet) with at least one minute. */
export function streak(log, now = Date.now()) {
	const days = lastDays(log, KEEP_DAYS, now).reverse();
	let i = days[0].sec >= 60 ? 0 : 1;
	let n = 0;
	for (; i < days.length && days[i].sec >= 60; i += 1) n += 1;
	return n;
}

export function prune(log, now = Date.now()) {
	const keep = new Set(lastDays(log, KEEP_DAYS, now).map(d => d.key));
	return Object.fromEntries(Object.entries(log || {}).filter(([k]) => keep.has(k)));
}

/** "1 h 05 min" style parts: { h, m } rounded to the minute. */
export function splitDuration(sec) {
	const mins = Math.round((sec || 0) / 60);
	return { h: Math.floor(mins / 60), m: mins % 60 };
}

export function readReadingLog() {
	try {
		const v = JSON.parse(localStorage.getItem(LS_READING) || '{}');
		return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
	} catch {
		return {};
	}
}

export function logReading(from, to) {
	if (!(to > from)) return;
	try {
		const next = prune(addStretch(readReadingLog(), from, to), to);
		localStorage.setItem(LS_READING, JSON.stringify(next));
		window.dispatchEvent(new Event(READING_EVENT));
		schedulePush();
	} catch {
		/* ignore */
	}
}

/** Several logs (devices) → one: seconds added per day. */
export function sumLogs(logs) {
	const out = {};
	logs.forEach(l =>
		Object.entries(l || {}).forEach(([k, v]) => {
			const n = Number(v);
			if (Number.isFinite(n) && n > 0) out[k] = (out[k] || 0) + n;
		}),
	);
	return out;
}

/** Per day, the larger count (a device's own counters only grow). */
export function maxLogs(a, b) {
	const out = { ...(a || {}) };
	Object.entries(b || {}).forEach(([k, v]) => {
		const n = Number(v);
		if (Number.isFinite(n) && n > (out[k] || 0)) out[k] = n;
	});
	return out;
}

export function deviceId() {
	try {
		let id = localStorage.getItem(LS_DEVICE);
		if (!id) {
			id = `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
			localStorage.setItem(LS_DEVICE, id);
		}
		return id;
	} catch {
		return 'd-unknown';
	}
}

function readOthers() {
	try {
		const v = JSON.parse(localStorage.getItem(LS_OTHERS) || '{}');
		return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
	} catch {
		return {};
	}
}

/** This device + every other device on the account. */
export function readAllReading() {
	return sumLogs([readReadingLog(), ...Object.values(readOthers())]);
}

/* push: at most once a minute, and when the app goes to the background */
let lastPush = 0;
let pushTimer = 0;
export function pushReading() {
	window.clearTimeout(pushTimer);
	pushTimer = 0;
	lastPush = Date.now();
	const recent = Object.fromEntries(lastDays(readReadingLog(), PUSH_DAYS).filter(d => d.sec > 0).map(d => [d.key, d.sec]));
	if (!Object.keys(recent).length) return;
	void putQuranRevisionState({ readingTime: { [deviceId()]: recent } }).catch(() => {});
}
function schedulePush() {
	if (pushTimer) return;
	pushTimer = window.setTimeout(pushReading, Math.max(0, lastPush + PUSH_EVERY_MS - Date.now()));
}

/** Pull: keep the other devices' logs; take back this device's own if the account has more. */
export function syncReadingFromCloud(cloud) {
	const mine = deviceId();
	const all = cloud && typeof cloud === 'object' ? cloud : {};
	const others = Object.fromEntries(Object.entries(all).filter(([d]) => d !== mine));
	try {
		localStorage.setItem(LS_OTHERS, JSON.stringify(others));
		if (all[mine]) localStorage.setItem(LS_READING, JSON.stringify(maxLogs(readReadingLog(), all[mine])));
		window.dispatchEvent(new Event(READING_EVENT));
	} catch {
		/* ignore */
	}
}
