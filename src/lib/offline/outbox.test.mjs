import assert from 'node:assert/strict';
import test from 'node:test';
import {
	OUTBOX_STORAGE_KEY,
	__configureOutboxForTests,
	enqueue,
	flush,
	getRecord,
	getRecords,
	getStatus,
	migrateLegacyWorkoutQueue,
	onSynced,
	registerSender,
} from './outbox.js';

function memoryStorage() {
	const map = new Map();
	return {
		getItem: key => (map.has(key) ? map.get(key) : null),
		setItem: (key, value) => map.set(key, String(value)),
		removeItem: key => map.delete(key),
		raw: map,
	};
}

function setup({ online = true, userId = 'u1' } = {}) {
	const storage = memoryStorage();
	let isOnline = online;
	__configureOutboxForTests({ storage, online: () => isOnline, userId });
	return { storage, setOnline: value => (isOnline = value) };
}

const sets = (weight, reps) => [{ setNumber: 1, weight, reps, done: weight > 0 && reps > 0 }];

test('a change is stored at once and marked synced after the server confirms it', async () => {
	const { storage } = setup();
	const calls = [];
	registerSender('workout-sets', async (payload, { idempotencyKey }) => {
		calls.push({ payload, idempotencyKey });
		return { records: payload.records };
	});
	const record = enqueue({ kind: 'workout-sets', key: 'k1', userId: 'u1', payload: { records: sets(60, 8) } });
	assert.equal(record.status, 'pending');
	assert.ok(JSON.parse(storage.getItem(OUTBOX_STORAGE_KEY)).k1, 'written synchronously');
	await flush();
	assert.equal(calls.length, 1);
	assert.equal(calls[0].idempotencyKey, record.idempotencyKey);
	assert.equal(getRecord('k1').status, 'synced');
	assert.equal(getStatus().pending, 0);
});

test('an edit made while the request is in flight is not marked synced and is sent again', async () => {
	setup();
	const sent = [];
	let release;
	registerSender('workout-sets', payload => {
		sent.push(payload.records[0].reps);
		if (sent.length === 1) return new Promise(resolve => (release = resolve));
		return Promise.resolve({});
	});
	enqueue({ kind: 'workout-sets', key: 'k1', userId: 'u1', payload: { records: sets(60, 8) } });
	const running = flush();
	await new Promise(resolve => setImmediate(resolve));
	enqueue({ kind: 'workout-sets', key: 'k1', userId: 'u1', payload: { records: sets(60, 10) } });
	release({});
	await running;
	assert.deepEqual(sent, [8, 10], 'the newer version follows in the next pass');
	assert.equal(getRecord('k1').status, 'synced');
	assert.equal(getRecord('k1').version, 2);
});

test('a network failure keeps the data pending with a backoff; nothing is lost', async () => {
	setup();
	registerSender('workout-sets', () => Promise.reject(new Error('Network Error')));
	enqueue({ kind: 'workout-sets', key: 'k1', userId: 'u1', payload: { records: sets(50, 5) } });
	const result = await flush();
	assert.equal(result.offline, true);
	const record = getRecord('k1');
	assert.equal(record.status, 'pending');
	assert.equal(record.attempts, 1);
	assert.ok(record.nextAttemptAt > Date.now());
	assert.deepEqual(record.payload.records, sets(50, 5));
});

test('a rejected payload is marked failed but kept, and a forced sync retries it', async () => {
	setup();
	let fail = true;
	registerSender('nutrition-log', () => (fail ? Promise.reject({ response: { status: 400 } }) : Promise.resolve({})));
	enqueue({ kind: 'nutrition-log', key: 'n1', userId: 'u1', payload: { body: {} } });
	await flush();
	assert.equal(getRecord('n1').status, 'failed');
	assert.equal(getStatus().failed, 1);
	await flush();
	assert.equal(getRecord('n1').status, 'failed', 'not retried automatically');
	fail = false;
	await flush({ force: true });
	assert.equal(getRecord('n1').status, 'synced');
});

test('nothing is sent while offline, and rows of another account are never sent', async () => {
	const { setOnline } = setup({ online: false });
	const sent = [];
	registerSender('workout-sets', payload => {
		sent.push(payload.id);
		return Promise.resolve({});
	});
	enqueue({ kind: 'workout-sets', key: 'mine', userId: 'u1', payload: { id: 'mine' } });
	enqueue({ kind: 'workout-sets', key: 'theirs', userId: 'u2', payload: { id: 'theirs' } });
	await flush();
	assert.deepEqual(sent, []);
	setOnline(true);
	await flush();
	assert.deepEqual(sent, ['mine']);
	assert.equal(getRecord('theirs').status, 'pending');
});

test('synced listeners hear whether the confirmed version is still the latest', async () => {
	setup();
	registerSender('workout-sets', () => Promise.resolve({ records: [{ id: 's1' }] }));
	const heard = [];
	const stop = onSynced(event => heard.push(event.current));
	enqueue({ kind: 'workout-sets', key: 'k1', userId: 'u1', payload: {} });
	await flush();
	stop();
	assert.deepEqual(heard, [true]);
});

test('the old workouts queue is migrated into the outbox once', () => {
	const { storage } = setup();
	storage.setItem('mw.pendingPRs.v1', JSON.stringify([{ userId: 'u1', date: '2026-11-01', exerciseName: 'Squat', records: [] }]));
	const moved = migrateLegacyWorkoutQueue(item => ({ key: `w:${item.exerciseName}`, kind: 'workout-sets', payload: item }));
	assert.equal(moved, 1);
	assert.equal(storage.getItem('mw.pendingPRs.v1'), null);
	assert.equal(getRecords({ kind: 'workout-sets' }).length, 1);
});
