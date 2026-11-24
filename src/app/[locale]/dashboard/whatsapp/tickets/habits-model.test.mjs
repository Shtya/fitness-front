import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	activeHabits,
	adherence,
	bestStreak,
	dayState,
	habitFromTicket,
	isPlanned,
	mergeById,
	newHabit,
	pause,
	planWindow,
	resume,
	skipDay,
	snooze,
	streak,
	toggleDay,
	toggleSub,
	todaySummary,
} from './habits-model.js';

const T = '2026-11-24'; // Tuesday

test('plan window: 14 days from the plan start, moving in blocks', () => {
	const w = planWindow('2026-11-24', '2026-11-24');
	assert.equal(w.length, 14);
	assert.equal(w[0], '2026-11-24');
	assert.equal(w[13], '2026-12-07');
	assert.equal(planWindow('2026-11-24', '2026-12-09')[0], '2026-12-08');
	assert.equal(planWindow('2026-11-24', '2026-11-20')[0], '2026-11-10');
});

test('schedules: daily, weekdays, every N days, start and end', () => {
	const daily = newHabit({ title: 'Quran', start: '2026-11-20' }, T);
	assert.ok(isPlanned(daily, '2026-11-20'));
	assert.ok(!isPlanned(daily, '2026-11-19'));
	const wd = newHabit({ title: 'Gym', start: '2026-11-01', schedule: { type: 'weekdays', days: [0, 2, 4] } }, T);
	assert.ok(isPlanned(wd, T)); // Tuesday = 2
	assert.ok(!isPlanned(wd, '2026-11-25'));
	const every3 = newHabit({ title: 'Call mum', start: '2026-11-24', schedule: { type: 'interval', every: 3 } }, T);
	assert.ok(isPlanned(every3, '2026-11-27'));
	assert.ok(!isPlanned(every3, '2026-11-26'));
	const ends = newHabit({ title: 'x', start: '2026-11-01', end: '2026-11-23' }, T);
	assert.equal(dayState(ends, T, T), 'off');
});

test('states, streaks and adherence (skip and pause never break a streak)', () => {
	let h = newHabit({ title: 'Quran', start: '2026-11-17' }, T);
	// 17 18 19 done, 20 skipped, 21 missed, 22 23 done, today open
	['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-22', '2026-11-23'].forEach(d => (h = toggleDay(h, d, 1)));
	h = skipDay(h, '2026-11-20', 2);
	assert.equal(dayState(h, '2026-11-21', T), 'missed');
	assert.equal(dayState(h, T, T), 'open');
	assert.equal(dayState(h, '2026-11-20', T), 'skip');
	assert.equal(streak(h, T), 2); // 22, 23 (today not done yet does not break it)
	h = toggleDay(h, T, 3);
	assert.equal(streak(h, T), 3);
	assert.equal(bestStreak(h, T), 3);
	// fix the missed day by hand → the whole run joins up (20 was skipped)
	h = toggleDay(h, '2026-11-21', 4);
	assert.equal(streak(h, T), 7);
	assert.equal(adherence(h, T), 100);
	// uncheck one → 6 of 7 planned
	h = toggleDay(h, '2026-11-18', 5);
	assert.equal(adherence(h, T), 86);
});

test('subtasks: partial days, all ticked = done', () => {
	let h = newHabit({ title: 'Remember Allah', subtasks: [{ id: 'a', text: 'morning' }, { id: 'b', text: 'evening' }] }, T);
	h = toggleSub(h, T, 'a', 1);
	assert.equal(dayState(h, T, T), 'partial');
	h = toggleSub(h, T, 'b', 2);
	assert.equal(dayState(h, T, T), 'done');
	h = toggleSub(h, T, 'a', 3);
	assert.equal(dayState(h, T, T), 'partial');
});

test('pause, resume, snooze', () => {
	let h = newHabit({ title: 'x', start: '2026-11-10' }, T);
	h = pause(h, '2026-11-20', 1);
	assert.equal(dayState(h, '2026-11-21', T), 'rest');
	h = resume(h, T, 2);
	assert.equal(dayState(h, '2026-11-23', T), 'rest');
	assert.equal(dayState(h, T, T), 'open');
	h = snooze(h, T, 2, 3);
	assert.equal(dayState(h, T, T), 'rest');
	assert.equal(dayState(h, '2026-11-26', T), 'open');
	// snoozing never hides days you already missed
	assert.equal(dayState(snooze(newHabit({ title: 'y', start: '2026-11-20' }, T), T, 3, 1), '2026-11-22', T), 'missed');
});

test('list order, summary, merge, import from a ticket', () => {
	const a = newHabit({ title: 'a', order: 1 }, T);
	const b = newHabit({ title: 'b', order: 0, pinned: true }, T);
	const c = { ...newHabit({ title: 'c' }, T), archived: true };
	assert.deepEqual(
		activeHabits([a, b, c]).map(h => h.title),
		['b', 'a'],
	);
	const s = todaySummary([toggleDay(a, T, 1), b], T);
	assert.deepEqual([s.planned, s.done, s.pct], [2, 1, 50]);
	assert.equal(mergeById([{ id: 'x', updatedAt: 2, v: 'new' }], [{ id: 'x', updatedAt: 1, v: 'old' }])[0].v, 'new');
	const imported = habitFromTicket({ title: 'Quran', items: [{ id: 'i1', text: 'Juz' }], history: [{ day: '2026-11-22', done: true }], done: true, day: T }, T);
	assert.equal(imported.start, '2026-11-22');
	assert.equal(dayState(imported, T, T), 'done');
	assert.equal(imported.subtasks.length, 1);
});
