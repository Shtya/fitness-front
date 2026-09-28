import assert from 'node:assert/strict';
import test from 'node:test';
import {
	autoRetryDelayMs,
	forgetFailedOutbound,
	isTransientSendError,
	rememberFailedOutbound,
	restoreFailedOutbound,
} from './wa-failed-outbox.js';

test('auto-retry schedule is bounded and increasing (audit F5)', () => {
	const delays = [0, 1, 2].map(autoRetryDelayMs);
	assert.deepEqual(delays, [2_000, 5_000, 12_000]);
	assert.equal(autoRetryDelayMs(3), null);
	assert.ok(delays.reduce((sum, value) => sum + value, 0) < 15 * 60_000);
});

test('only transient send failures are auto-retried (audit F5)', () => {
	assert.equal(isTransientSendError({ code: 'ECONNABORTED' }), true);
	assert.equal(isTransientSendError(new Error('Network Error')), true);
	assert.equal(isTransientSendError({ response: { status: 503 } }), true);
	assert.equal(isTransientSendError({ response: { status: 429 } }), true);
	assert.equal(isTransientSendError({ response: { status: 408 } }), true);
	assert.equal(isTransientSendError({ response: { status: 400 } }), false);
	assert.equal(isTransientSendError({ response: { status: 403 } }), false);
	assert.equal(isTransientSendError({ code: 'ERR_CANCELED' }), false);
	assert.equal(isTransientSendError(null), false);
});

function memoryStorage() {
	const data = new Map();
	return {
		getItem: key => (data.has(key) ? data.get(key) : null),
		setItem: (key, value) => data.set(key, String(value)),
		removeItem: key => data.delete(key),
		get size() {
			return data.size;
		},
	};
}

const NOW = Date.parse('2026-09-28T12:00:00.000Z');

function failedText(overrides = {}) {
	return {
		id: 'pending:c1',
		conversationId: 'conv-1',
		clientMessageId: 'c1',
		type: 'text',
		text: 'hello',
		direction: 'outbound',
		status: 'failed',
		optimistic: false,
		providerTimestamp: '2026-09-28T11:59:00.000Z',
		...overrides,
	};
}

test('failed text survives a reload as a retryable failed bubble (audit A11)', () => {
	const storage = memoryStorage();
	assert.equal(rememberFailedOutbound(failedText(), storage, NOW), true);

	const restored = restoreFailedOutbound([], 'conv-1', storage, NOW);
	assert.equal(restored.length, 1);
	assert.equal(restored[0].status, 'failed');
	assert.equal(restored[0].optimistic, false);
	assert.equal(restored[0].text, 'hello');
	assert.deepEqual(restoreFailedOutbound([], 'conv-2', storage, NOW), []);
});

test('media, inbound and empty rows are never stored', () => {
	const storage = memoryStorage();
	assert.equal(rememberFailedOutbound(failedText({ type: 'image' }), storage, NOW), false);
	assert.equal(rememberFailedOutbound(failedText({ direction: 'inbound' }), storage, NOW), false);
	assert.equal(rememberFailedOutbound(failedText({ text: '  ' }), storage, NOW), false);
	assert.equal(rememberFailedOutbound(failedText({ clientMessageId: '' }), storage, NOW), false);
	assert.equal(storage.size, 0);
});

test('a successful retry forgets the row and clears the key when empty', () => {
	const storage = memoryStorage();
	rememberFailedOutbound(failedText(), storage, NOW);
	assert.equal(forgetFailedOutbound('conv-1', 'c1', storage), true);
	assert.equal(storage.size, 0);
	assert.deepEqual(restoreFailedOutbound([], 'conv-1', storage, NOW), []);
});

test('a delivered copy on the loaded page wins over the stored failure', () => {
	const storage = memoryStorage();
	rememberFailedOutbound(failedText(), storage, NOW);
	rememberFailedOutbound(
		failedText({ id: 'pending:c2', clientMessageId: 'c2', text: 'second' }),
		storage,
		NOW,
	);
	const page = [
		{
			id: 'srv-1',
			direction: 'outbound',
			type: 'text',
			text: 'hello',
			status: 'delivered',
			providerTimestamp: '2026-09-28T11:59:20.000Z',
		},
	];
	const restored = restoreFailedOutbound(page, 'conv-1', storage, NOW);
	assert.deepEqual(restored.map(row => row.clientMessageId), ['c2']);
	assert.deepEqual(
		restoreFailedOutbound([], 'conv-1', storage, NOW).map(row => row.clientMessageId),
		['c2'],
	);
});

test('same text far outside the match window is not treated as delivered', () => {
	const storage = memoryStorage();
	rememberFailedOutbound(failedText(), storage, NOW);
	const page = [
		{
			id: 'srv-old',
			direction: 'outbound',
			text: 'hello',
			status: 'read',
			providerTimestamp: '2026-09-27T08:00:00.000Z',
		},
	];
	assert.equal(restoreFailedOutbound(page, 'conv-1', storage, NOW).length, 1);
});

test('rows already on the page are not duplicated, and expired rows are pruned', () => {
	const storage = memoryStorage();
	rememberFailedOutbound(failedText(), storage, NOW);
	assert.deepEqual(restoreFailedOutbound([failedText()], 'conv-1', storage, NOW), []);
	assert.equal(restoreFailedOutbound([], 'conv-1', storage, NOW).length, 1);

	const eightDaysLater = NOW + 8 * 24 * 60 * 60_000;
	assert.deepEqual(restoreFailedOutbound([], 'conv-1', storage, eightDaysLater), []);
	assert.equal(storage.size, 0);
});

test('corrupt or unavailable storage degrades to a no-op', () => {
	const broken = memoryStorage();
	broken.setItem('so7ba-wa-failed-outbox-v1', '{not json');
	assert.deepEqual(restoreFailedOutbound([], 'conv-1', broken, NOW), []);
	assert.equal(rememberFailedOutbound(failedText(), null, NOW), false);
	const throwing = {
		getItem: () => {
			throw new Error('denied');
		},
		setItem: () => {
			throw new Error('denied');
		},
		removeItem: () => {},
	};
	assert.equal(rememberFailedOutbound(failedText(), throwing, NOW), false);
	assert.deepEqual(restoreFailedOutbound([], 'conv-1', throwing, NOW), []);
});
