import assert from 'node:assert/strict';
import test from 'node:test';

const storage = new Map();
globalThis.window = {
	localStorage: {
		getItem: key => (storage.has(key) ? storage.get(key) : null),
		setItem: (key, value) => storage.set(key, String(value)),
	},
	addEventListener() {},
	removeEventListener() {},
};

const { isVoicePlayed, markVoicePlayed } = await import('./voice-played-store.js');

test('a voice note is unplayed until it is marked', () => {
	assert.equal(isVoicePlayed('msg-1'), false);
	markVoicePlayed('msg-1');
	assert.equal(isVoicePlayed('msg-1'), true);
});

test('played state is written to localStorage so it survives a reload', () => {
	markVoicePlayed('msg-2');
	const saved = JSON.parse(storage.get('wa:voice-played:v1'));
	assert.ok(saved.includes('msg-2'));
});

test('optimistic pending ids and empty ids are ignored', () => {
	markVoicePlayed('pending:abc');
	markVoicePlayed('');
	assert.equal(isVoicePlayed('pending:abc'), false);
	assert.equal(isVoicePlayed(''), false);
});

test('the store stays bounded and keeps the newest entries', () => {
	for (let index = 0; index < 4100; index += 1) markVoicePlayed(`bulk-${index}`);
	const saved = JSON.parse(storage.get('wa:voice-played:v1'));
	assert.equal(saved.length, 4000);
	assert.equal(isVoicePlayed('bulk-4099'), true);
	assert.equal(isVoicePlayed('bulk-0'), false);
});
