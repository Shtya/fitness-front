import assert from 'node:assert/strict';
import test from 'node:test';
import {
	computeDelayedSend,
	delayedSendTitle,
	formatDelayDuration,
	isDelayedSendOnForChat,
	normalizeDelayedSendPrefs,
	waitingOnceSchedules,
	writeDelayedSendForChat,
} from './delayed-send.js';

test('waiting queue keeps unsent one-time messages, soonest first', () => {
	const rows = waitingOnceSchedules([
		{ id: 'late', scheduleKind: 'once', status: 'active', nextRunAt: '2026-10-23T15:00:00Z' },
		{ id: 'daily', scheduleKind: 'recurring', status: 'active', nextRunAt: '2026-10-23T10:00:00Z' },
		{ id: 'done', scheduleKind: 'once', status: 'completed', nextRunAt: null },
		{ id: 'soon', scheduleKind: 'once', status: 'ACTIVE', nextRunAt: '2026-10-23T13:00:00Z' },
		{ id: 'failed', scheduleKind: 'once', status: 'failed', scheduledAt: '2026-10-23T14:00:00Z' },
	]);
	assert.deepEqual(rows.map(row => row.id), ['soon', 'failed', 'late']);
	assert.deepEqual(waitingOnceSchedules(null), []);
});

test('delay on/off is remembered per chat', () => {
	const store = new Map();
	globalThis.window = {
		localStorage: {
			getItem: key => (store.has(key) ? store.get(key) : null),
			setItem: (key, value) => store.set(key, String(value)),
		},
	};
	try {
		writeDelayedSendForChat('chat-a', true);
		assert.equal(isDelayedSendOnForChat('chat-a'), true);
		assert.equal(isDelayedSendOnForChat('chat-b'), false);
		writeDelayedSendForChat('chat-a', true);
		assert.equal(JSON.parse(store.get('wa-delayed-send-chats')).length, 1);
		writeDelayedSendForChat('chat-a', false);
		assert.equal(isDelayedSendOnForChat('chat-a'), false);
		assert.equal(isDelayedSendOnForChat(''), false);
	} finally {
		delete globalThis.window;
	}
});

const MIN = 60_000;
const NOW = Date.parse('2026-10-23T12:00:00.000Z');

test('fixed delay counts from now and adds the extra time', () => {
	const plan = computeDelayedSend({ method: 'custom', customMinutes: 30, extraMinutes: 15 }, null, NOW);
	assert.equal(plan.ok, true);
	assert.equal(plan.totalMs, 45 * MIN);
	assert.equal(plan.sendAt, NOW + 45 * MIN);
});

test('reply gap: their 1h answer + 30 min sends 1h30 after their last message', () => {
	const gap = { ok: true, gapMs: 60 * MIN, theirLastAt: new Date(NOW - 5 * MIN).toISOString() };
	const plan = computeDelayedSend({ method: 'reply', adjustMinutes: 30 }, gap, NOW);
	assert.equal(plan.totalMs, 90 * MIN);
	assert.equal(plan.sendAt, NOW - 5 * MIN + 90 * MIN);
	assert.equal(plan.fromNow, false);
});

test('reply gap that already passed counts from now instead', () => {
	const gap = { ok: true, gapMs: 10 * MIN, theirLastAt: new Date(NOW - 3 * 60 * MIN).toISOString() };
	const plan = computeDelayedSend({ method: 'reply' }, gap, NOW);
	assert.equal(plan.fromNow, true);
	assert.equal(plan.sendAt, NOW + 10 * MIN);
});

test('negative adjustment never goes below zero and the shortest delay is 1 minute', () => {
	const gap = { ok: true, gapMs: 10 * MIN, theirLastAt: new Date(NOW).toISOString() };
	const plan = computeDelayedSend({ method: 'reply', adjustMinutes: -30 }, gap, NOW);
	assert.equal(plan.baseMs, 0);
	assert.equal(plan.raisedToMin, true);
	assert.equal(plan.sendAt, NOW + MIN);
});

test('reply method explains a missing gap', () => {
	assert.deepEqual(computeDelayedSend({ method: 'reply' }, null, NOW), { ok: false, reason: 'loading' });
	assert.deepEqual(computeDelayedSend({ method: 'reply' }, { ok: false, reason: 'no_reply' }, NOW), {
		ok: false,
		reason: 'no_reply',
	});
});

test('prefs are clamped and labels read well', () => {
	assert.deepEqual(normalizeDelayedSendPrefs({ method: 'x', customMinutes: -5, extraMinutes: 'abc' }), {
		method: 'custom',
		customMinutes: 0,
		adjustMinutes: 0,
		extraMinutes: 0,
	});
	assert.equal(formatDelayDuration(90 * MIN), '1h 30m');
	assert.equal(formatDelayDuration(0), '0m');
	assert.equal(formatDelayDuration(26 * 60 * MIN), '1d 2h');
	const gap = { ok: true, gapMs: 60 * MIN, theirLastAt: new Date(NOW).toISOString() };
	const prefs = { method: 'reply', adjustMinutes: 30, extraMinutes: 5 };
	assert.equal(
		delayedSendTitle(prefs, computeDelayedSend(prefs, gap, NOW), gap),
		'Delayed reply · reply gap 1h + 30m + 5m',
	);
});
