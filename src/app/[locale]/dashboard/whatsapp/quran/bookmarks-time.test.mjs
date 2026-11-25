import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBookmark, bookmarksOnPage, normalizeBookmarks, removeBookmark, setBookmarkPage, visibleBookmarks } from './quran-bookmarks.js';
import { addStretch, dayKey, lastDays, splitDuration, streak } from './reading-time.js';

test('bookmarks: fixed three always present, custom kept after them', () => {
	const l = normalizeBookmarks([{ id: 'x', name: 'Fajr', color: 'red', page: 50, createdAt: 2 }, { id: 'new', page: 9 }, { id: 'junk' }]);
	assert.deepEqual(l.map(b => b.id), ['review', 'new', 'listen', 'x']);
	assert.equal(l[1].page, 9);
	assert.equal(l[1].color, 'green');
});

test('bookmarks: set, add, remove', () => {
	let l = normalizeBookmarks([]);
	l = setBookmarkPage(l, 'review', 138, 1);
	assert.equal(l[0].page, 138);
	l = addBookmark(l, '  Night  ', 200, 5);
	assert.equal(l.length, 4);
	assert.equal(l[3].name, 'Night');
	assert.ok(!['gold', 'green', 'blue'].includes(l[3].color));
	assert.equal(addBookmark(l, '   ', 3).length, 4);
	assert.deepEqual(bookmarksOnPage(l, 138).map(b => b.id), ['review']);
	l = removeBookmark(l, 'review');
	assert.equal(l[0].page, null);
	assert.equal(l.length, 4);
	l = removeBookmark(l, l[3].id);
	assert.ok(l[3].deletedAt, 'kept as a tombstone for sync');
	assert.equal(visibleBookmarks(l).length, 3);
	assert.equal(setBookmarkPage(l, 'listen', 999)[2].page, null);
});

test('reading time: stretch split at midnight', () => {
	const mid = new Date(2026, 10, 24, 0, 0, 0).getTime();
	const log = addStretch({}, mid - 90_000, mid + 30_000);
	assert.equal(log[dayKey(mid - 1)], 90);
	assert.equal(log[dayKey(mid)], 30);
	const more = addStretch(log, mid + 60_000, mid + 120_000);
	assert.equal(more[dayKey(mid)], 90);
});

test('reading time: last days, streak, duration', () => {
	const now = new Date(2026, 10, 24, 15).getTime();
	const day = 86_400_000;
	let log = {};
	log = addStretch(log, now - 10 * 60_000, now);
	log = addStretch(log, now - day - 5 * 60_000, now - day);
	log = addStretch(log, now - 3 * day - 5 * 60_000, now - 3 * day);
	const days = lastDays(log, 7, now);
	assert.equal(days.length, 7);
	assert.equal(days[6].sec, 600);
	assert.equal(days[5].sec, 300);
	assert.equal(days[4].sec, 0);
	assert.equal(streak(log, now), 2);
	assert.deepEqual(splitDuration(3900), { h: 1, m: 5 });
});

test('sync: bookmarks newest edit wins, tombstones hidden', async () => {
	const { mergeBookmarks, visibleBookmarks } = await import('./quran-bookmarks.js');
	const phone = [{ id: 'review', page: 10, updatedAt: 5 }, { id: 'x', name: 'Fajr', page: 3, createdAt: 1, updatedAt: 9, deletedAt: 9 }];
	const laptop = [{ id: 'review', page: 40, updatedAt: 7 }, { id: 'x', name: 'Fajr', page: 3, createdAt: 1, updatedAt: 2 }];
	const m = mergeBookmarks(phone, laptop);
	assert.equal(m.find(b => b.id === 'review').page, 40);
	assert.ok(m.find(b => b.id === 'x').deletedAt);
	assert.deepEqual(visibleBookmarks(m).map(b => b.id), ['review', 'new', 'listen']);
});

test('sync: reading time adds devices, keeps the larger count per device', async () => {
	const { sumLogs, maxLogs } = await import('./reading-time.js');
	assert.deepEqual(sumLogs([{ '2026-11-24': 600 }, { '2026-11-24': 300, '2026-11-23': 60 }]), { '2026-11-24': 900, '2026-11-23': 60 });
	assert.deepEqual(maxLogs({ '2026-11-24': 600 }, { '2026-11-24': 420, '2026-11-22': 30 }), { '2026-11-24': 600, '2026-11-22': 30 });
});

test('listening wird follows the recitation', async () => {
	const { setListenMark, isAutoBookmark } = await import('./quran-bookmarks.js');
	const l = setListenMark(normalizeBookmarks([]), 160, '7:76', 5);
	const b = l.find(x => x.id === 'listen');
	assert.equal(b.page, 160);
	assert.equal(b.ayah, '7:76');
	assert.equal(b.updatedAt, 5);
	assert.equal(isAutoBookmark('listen'), true);
	assert.equal(normalizeBookmarks([{ id: 'listen', page: 3, ayah: 'bad' }])[2].ayah, '');
});
