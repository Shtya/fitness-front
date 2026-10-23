import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotifyStateCache, isConversationActivelyMuted, shouldNotifyForConversation } from './whatsapp-mute.js';

const NOW = Date.parse('2026-10-23T12:00:00.000Z');

test('mute with no end is always on; an expired mute is off', () => {
	assert.equal(isConversationActivelyMuted({ isMuted: true, mutedUntil: null }, NOW), true);
	assert.equal(isConversationActivelyMuted({ isMuted: true, mutedUntil: '2026-10-23T13:00:00Z' }, NOW), true);
	assert.equal(isConversationActivelyMuted({ isMuted: true, mutedUntil: '2026-10-23T11:00:00Z' }, NOW), false);
	assert.equal(isConversationActivelyMuted({ isMuted: false }, NOW), false);
	assert.equal(isConversationActivelyMuted(null, NOW), false);
});

test('a muted chat that is not in the loaded list stays quiet', async () => {
	const calls = [];
	const cache = createNotifyStateCache(async id => {
		calls.push(id);
		return { isMuted: id === 'muted-group', notificationsEnabled: true };
	});
	assert.equal(await shouldNotifyForConversation(undefined, 'muted-group', cache, NOW), false);
	assert.equal(await shouldNotifyForConversation(undefined, 'other-chat', cache, NOW), true);
	// Cached for a minute: a burst of group messages asks the server once.
	await shouldNotifyForConversation(undefined, 'muted-group', cache, NOW + 5_000);
	assert.deepEqual(calls, ['muted-group', 'other-chat']);
	await shouldNotifyForConversation(undefined, 'muted-group', cache, NOW + 61_000);
	assert.deepEqual(calls, ['muted-group', 'other-chat', 'muted-group']);
});

test('a loaded chat uses its own mute, and a failed lookup does not notify', async () => {
	const cache = createNotifyStateCache(async () => {
		throw new Error('offline');
	});
	assert.equal(await shouldNotifyForConversation({ isMuted: true }, 'a', cache, NOW), false);
	assert.equal(await shouldNotifyForConversation({ isMuted: false }, 'a', cache, NOW), true);
	assert.equal(await shouldNotifyForConversation(undefined, 'b', cache, NOW), false);
});
