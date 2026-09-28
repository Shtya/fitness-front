import assert from 'node:assert/strict';
import test from 'node:test';

import { isSameConversationPresence } from './wa-presence.js';

const presence = { typing: false, recording: false, online: true, state: 'available', senderName: '', lastSeen: undefined, t: 1 };

test('repeated identical presence is a no-op even when the event time differs', () => {
	const conversation = { id: 'c1', isTyping: false, typing: false, presence };
	assert.equal(isSameConversationPresence(conversation, { ...presence, t: 999 }), true);
});

test('typing, online, recording or state changes are not skipped', () => {
	const conversation = { id: 'c1', isTyping: false, typing: false, presence };
	assert.equal(isSameConversationPresence(conversation, { ...presence, typing: true }), false);
	assert.equal(isSameConversationPresence(conversation, { ...presence, online: false }), false);
	assert.equal(isSameConversationPresence(conversation, { ...presence, recording: true }), false);
	assert.equal(isSameConversationPresence(conversation, { ...presence, state: 'unavailable' }), false);
	assert.equal(isSameConversationPresence(conversation, { ...presence, lastSeen: 123 }), false);
});

test('a row without presence yet always applies the first event', () => {
	assert.equal(isSameConversationPresence({ id: 'c1' }, presence), false);
	assert.equal(isSameConversationPresence({ id: 'c1', isTyping: true, presence }, presence), false);
});
