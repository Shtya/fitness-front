import assert from 'node:assert/strict';
import test from 'node:test';

import { readEventClearsViewer, unreadPayloadForViewer } from './wa-unread-scope.js';

const owner = { seesWholeAccount: true, viewerUserId: 'owner' };
const coach = { seesWholeAccount: false, viewerUserId: 'coach' };

test('the coach opening a chat does not clear the owner badge', () => {
	const event = { conversationId: 'c1', userId: 'coach', scope: 'assignee' };
	assert.equal(readEventClearsViewer(event, owner), false);
	assert.equal(readEventClearsViewer(event, coach), true);
});

test('the owner opening a chat does not clear the coach badge', () => {
	const event = { conversationId: 'c1', userId: 'owner', scope: 'account' };
	assert.equal(readEventClearsViewer(event, owner), true);
	assert.equal(readEventClearsViewer(event, coach), false);
});

test('reading on the phone clears the owner only', () => {
	const event = { conversationId: 'c1', reason: 'phone_read' };
	assert.equal(readEventClearsViewer(event, owner), true);
	assert.equal(readEventClearsViewer(event, coach), false);
});

test('a reader who owns neither count clears nothing', () => {
	const event = { conversationId: 'c1', userId: 'x', scope: null };
	assert.equal(readEventClearsViewer(event, owner), false);
	assert.equal(readEventClearsViewer(event, coach), false);
});

test('new message: each side gets its own count', () => {
	const payload = { conversationId: 'c1', unreadCount: 7, assigneeUnreadCount: 2, preview: { id: 'm' } };
	assert.deepEqual(unreadPayloadForViewer(payload, owner), {
		conversationId: 'c1',
		unreadCount: 7,
		preview: { id: 'm' },
	});
	assert.deepEqual(unreadPayloadForViewer(payload, coach), {
		conversationId: 'c1',
		unreadCount: 2,
		preview: { id: 'm' },
	});
});

test('an owner-only count change leaves the coach count alone', () => {
	const payload = { conversationId: 'c1', unreadCount: 0 };
	assert.deepEqual(unreadPayloadForViewer(payload, coach), { conversationId: 'c1' });
});
