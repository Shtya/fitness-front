import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStep, pieceCount, pieceOf, pieceProgress, pieceTick, cleanLoop, fmtClock, loopProgress, loopTick, minuteTicks, nextPart, parseClock, partFrom, snapMinute } from './video-loop.js';

test('parseClock', () => {
	assert.equal(parseClock('5'), 300);
	assert.equal(parseClock('5:30'), 330);
	assert.equal(parseClock('0:45'), 45);
	assert.equal(parseClock('1:02:03'), 3723);
	assert.equal(parseClock('90s'), 90);
	assert.equal(parseClock('2m'), 120);
	assert.equal(parseClock('٥'), 300);
	assert.equal(parseClock(''), null);
	assert.equal(parseClock('abc'), null);
	assert.equal(parseClock('5:75'), null);
});

test('fmtClock', () => {
	assert.equal(fmtClock(330), '5:30');
	assert.equal(fmtClock(3723), '1:02:03');
	assert.equal(fmtClock(0), '0:00');
});

test('cleanLoop keeps the part inside the video', () => {
	assert.deepEqual(cleanLoop({ from: 0, to: 300, reps: 3 }, 1000), { from: 0, to: 300, reps: 3, step: 0 });
	assert.deepEqual(cleanLoop({ from: 600, to: 900, reps: 2 }, 700), { from: 600, to: 700, reps: 2, step: 0 });
	assert.deepEqual(cleanLoop({ from: 300, to: 100, reps: 1 }), { from: 300, to: 600, reps: 1, step: 0 });
	assert.equal(cleanLoop({ from: 0, to: 10, reps: 99 }).reps, 20);
	assert.equal(cleanLoop({ from: 0, to: 10, reps: 0 }).reps, 0);
});

test('nextPart / partFrom', () => {
	assert.deepEqual(nextPart({ from: 0, to: 300, reps: 2 }, 1000), { from: 300, to: 600, reps: 2, step: 0 });
	assert.deepEqual(nextPart({ from: 600, to: 900, reps: 2 }, 1000), { from: 900, to: 1000, reps: 2, step: 0 });
	assert.equal(nextPart({ from: 900, to: 1000, reps: 2 }, 1000), null);
	assert.deepEqual(partFrom(125.6, 5, 1, 1000), { from: 125, to: 425, reps: 1, step: 0 });
});

test('snapMinute / minuteTicks', () => {
	assert.equal(snapMinute(290, 1000), 300);
	assert.equal(snapMinute(331, 1000), 360);
	assert.equal(snapMinute(-5, 1000), 0);
	assert.equal(snapMinute(990, 1000), 1000);
	assert.equal(snapMinute(1200, 1000), 1000);
	assert.equal(minuteTicks(600).length, 11);
	assert.ok(minuteTicks(600).every(x => x.t % 60 === 0));
	assert.equal(minuteTicks(3600)[1].t, 300);
});

test('loopTick: repeat, then stop', () => {
	const l = { from: 0, to: 300, reps: 3, round: 1 };
	assert.deepEqual(loopTick(l, 120), { do: 'none' });
	assert.deepEqual(loopTick(l, 299.9), { do: 'seek', round: 2 });
	assert.deepEqual(loopTick({ ...l, round: 3 }, 300), { do: 'stop' });
	assert.deepEqual(loopTick({ ...l, reps: 0, round: 9 }, 300), { do: 'seek', round: 10 });
});

test('loopProgress across rounds', () => {
	assert.equal(loopProgress({ from: 0, to: 100, reps: 2, round: 1 }, 50), 0.25);
	assert.equal(loopProgress({ from: 0, to: 100, reps: 2, round: 2 }, 100), 1);
	assert.equal(loopProgress({ from: 0, to: 100, reps: 0, round: 4 }, 50), 0.5);
});

test('parseStep: seconds by default', () => {
	assert.equal(parseStep('2'), 2);
	assert.equal(parseStep('1m'), 60);
	assert.equal(parseStep('0:30'), 30);
	assert.equal(parseStep(''), 0);
	assert.equal(parseStep('abc'), null);
	assert.equal(parseStep('9999'), 600);
});

test('piece by piece: each piece N times, then the next, then stop', () => {
	const l = { from: 0, to: 5, reps: 3, step: 1 };
	assert.equal(pieceCount(l), 5);
	assert.deepEqual(pieceOf(l, 2), { a: 2, b: 3 });
	assert.deepEqual(pieceOf({ from: 0, to: 5, step: 2 }, 2), { a: 4, b: 5 });
	assert.deepEqual(pieceTick({ ...l, round: 1, seg: 0 }, 0.5), { do: 'none' });
	assert.deepEqual(pieceTick({ ...l, round: 1, seg: 0 }, 0.9), { do: 'seek', at: 0, round: 2, seg: 0 });
	assert.deepEqual(pieceTick({ ...l, round: 3, seg: 0 }, 1), { do: 'seek', at: 1, round: 1, seg: 1 });
	assert.deepEqual(pieceTick({ ...l, round: 3, seg: 4 }, 5), { do: 'stop' });
	assert.equal(pieceProgress({ ...l, round: 3, seg: 4 }, 5), 1);
	assert.equal(pieceProgress({ ...l, round: 1, seg: 0 }, 0), 0);
});

test('whole part = one piece', () => {
	const l = { from: 10, to: 20, reps: 2, step: 0 };
	assert.equal(pieceCount(l), 1);
	assert.deepEqual(pieceTick({ ...l, round: 1, seg: 0 }, 19.9), { do: 'seek', at: 10, round: 2, seg: 0 });
	assert.deepEqual(pieceTick({ ...l, round: 2, seg: 0 }, 20), { do: 'stop' });
});
