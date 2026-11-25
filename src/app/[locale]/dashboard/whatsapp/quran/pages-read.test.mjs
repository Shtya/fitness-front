import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRead, mergePagesRead, pageStreak, pagesOn, recentDays, togglePage } from './pages-read.js';

const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();

test('double-tap marks a page for today, again takes it off', () => {
	const t1 = at(2026, 11, 25, 9);
	const a = togglePage({}, 160, t1);
	assert.equal(a.on, true);
	assert.equal(a.day, '2026-11-25');
	assert.equal(isRead(a.log, '2026-11-25', 160), true);
	const b = togglePage(a.log, 160, t1 + 1000);
	assert.equal(b.on, false);
	assert.equal(isRead(b.log, '2026-11-25', 160), false);
	assert.equal(b.log['2026-11-25'][160], -(t1 + 1000));
});

test('pages of a day in reading order', () => {
	let log = {};
	log = togglePage(log, 161, at(2026, 11, 25, 9)).log;
	log = togglePage(log, 160, at(2026, 11, 25, 8)).log;
	log = togglePage(log, 162, at(2026, 11, 25, 10)).log;
	log = togglePage(log, 162, at(2026, 11, 25, 11)).log; // taken off
	assert.deepEqual(pagesOn(log, '2026-11-25').map(x => x.page), [160, 161]);
});

test('merge: the newest change of each page wins, junk dropped', () => {
	const m = mergePagesRead({ '2026-11-25': { 5: 100, 6: 100 } }, { '2026-11-25': { 5: -200, 700: 1 }, bad: { 1: 1 } });
	assert.deepEqual(m, { '2026-11-25': { 5: -200, 6: 100 } });
	assert.deepEqual(mergePagesRead({ '2026-11-25': { 5: -100 } }, { '2026-11-25': { 5: 300 } }), { '2026-11-25': { 5: 300 } });
});

test('recent days and the streak', () => {
	const now = at(2026, 11, 25);
	let log = {};
	log = togglePage(log, 1, at(2026, 11, 23)).log;
	log = togglePage(log, 2, at(2026, 11, 24)).log;
	log = togglePage(log, 3, at(2026, 11, 25)).log;
	log = togglePage(log, 4, at(2026, 11, 25, 11)).log;
	const days = recentDays(log, 3, now);
	assert.deepEqual(days.map(d => [d.key, d.pages.length]), [['2026-11-23', 1], ['2026-11-24', 1], ['2026-11-25', 2]]);
	assert.equal(pageStreak(log, now), 3);
	assert.equal(pageStreak({}, now), 0);
});
