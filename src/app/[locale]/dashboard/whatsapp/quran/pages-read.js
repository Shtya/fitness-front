/**
 * Pages you marked as read in the mushaf (double-tap a page), per day:
 *   { 'YYYY-MM-DD': { [page]: time } }   — a negative time = the mark was taken off then.
 * Kept in localStorage, synced to the account (the newest change of each page and day wins,
 * so a removal travels between devices too).
 */
import { dayKey } from './reading-time.js';

// Loaded on first use, so the pure helpers stay importable on their own (tests).
const putQuranRevisionState = patch => import('../../quran-revision/quran-revision-api').then(m => m.putQuranRevisionState(patch));

export const LS_PAGES_READ = 'so7ba:quran-revision:pages-read:v1';
export const PAGES_READ_EVENT = 'so7ba:quran-pages-read';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Same day and page on two devices: the newest change wins. */
export function mergePagesRead(a, b) {
	const out = {};
	[a, b].forEach(src => {
		Object.entries(src && typeof src === 'object' ? src : {}).forEach(([day, pages]) => {
			if (!DAY.test(day) || !pages || typeof pages !== 'object') return;
			const into = (out[day] = out[day] || {});
			Object.entries(pages).forEach(([page, at]) => {
				const p = Number(page);
				const t = Number(at);
				if (!Number.isInteger(p) || p < 1 || p > 604 || !Number.isFinite(t) || !t) return;
				if (!into[page] || Math.abs(t) >= Math.abs(into[page])) into[page] = Math.round(t);
			});
		});
	});
	return out;
}

/** The pages read on a day, in the order you read them: [{ page, at }]. */
export function pagesOn(log, day) {
	return Object.entries(log?.[day] || {})
		.filter(([, at]) => at > 0)
		.map(([page, at]) => ({ page: Number(page), at }))
		.sort((x, y) => x.at - y.at);
}

export const isRead = (log, day, page) => (log?.[day]?.[page] || 0) > 0;

/** Mark / unmark a page for a day. → { log, on } */
export function togglePage(log, page, now = Date.now()) {
	const day = dayKey(now);
	const on = !isRead(log, day, page);
	return { log: { ...log, [day]: { ...(log?.[day] || {}), [page]: on ? now : -now } }, on, day };
}

/** The last n days (oldest first) with their pages: [{ key, date, pages: [{page, at}] }]. */
export function recentDays(log, n = 7, now = Date.now()) {
	const out = [];
	for (let i = n - 1; i >= 0; i -= 1) {
		const d = new Date(now);
		d.setHours(12, 0, 0, 0);
		d.setDate(d.getDate() - i);
		const key = dayKey(d.getTime());
		out.push({ key, date: d, pages: pagesOn(log, key) });
	}
	return out;
}

/** Days in a row (ending today, or yesterday if nothing yet today) with at least one page. */
export function pageStreak(log, now = Date.now()) {
	let run = 0;
	const d = new Date(now);
	d.setHours(12, 0, 0, 0);
	if (!pagesOn(log, dayKey(d.getTime())).length) d.setDate(d.getDate() - 1);
	while (pagesOn(log, dayKey(d.getTime())).length) {
		run += 1;
		d.setDate(d.getDate() - 1);
	}
	return run;
}

export function readPagesRead() {
	try {
		const v = JSON.parse(localStorage.getItem(LS_PAGES_READ) || '{}');
		return v && typeof v === 'object' ? v : {};
	} catch {
		return {};
	}
}

function save(log) {
	try {
		localStorage.setItem(LS_PAGES_READ, JSON.stringify(log));
		window.dispatchEvent(new Event(PAGES_READ_EVENT));
	} catch {
		/* storage blocked: the change stays on screen only */
	}
}

/** Mark / unmark a page today; saved here and sent to the account. */
export function togglePageRead(page, now = Date.now()) {
	const { log, on, day } = togglePage(readPagesRead(), page, now);
	save(log);
	void putQuranRevisionState({ pagesRead: { [day]: { [page]: log[day][page] } } }).catch(() => {});
	return { on, today: pagesOn(log, day) };
}

/** Pull: merge the account's pages into this device, send back what is newer here. */
export function syncPagesReadFromCloud(cloud) {
	const local = readPagesRead();
	const merged = mergePagesRead(local, cloud);
	save(merged);
	const newer = {};
	Object.entries(merged).forEach(([day, pages]) =>
		Object.entries(pages).forEach(([page, at]) => {
			if (Math.abs(at) > Math.abs(cloud?.[day]?.[page] || 0)) (newer[day] = newer[day] || {})[page] = at;
		}),
	);
	if (Object.keys(newer).length) void putQuranRevisionState({ pagesRead: newer }).catch(() => {});
	return merged;
}
