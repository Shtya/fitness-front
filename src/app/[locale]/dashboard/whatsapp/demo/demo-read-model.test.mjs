import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildEffectiveConversations,
	buildEffectiveMessages,
	isDemoId,
	namespaceDemoId,
	rawDemoId,
	sortEffectiveConversations,
} from './demo-read-model.js';
import {
	DemoRoutingError,
	assertSafeRealWriteId,
	routeMessageCommand,
} from './demo-command-adapter.js';
import { prepareScheduledEvents } from './demo-event-scheduler.js';

test('demo ids are namespaced exactly once and reversible', () => {
	assert.equal(namespaceDemoId('abc'), 'demo:abc');
	assert.equal(namespaceDemoId('demo:abc'), 'demo:abc');
	assert.equal(rawDemoId('demo:abc'), 'abc');
	assert.equal(isDemoId('demo:abc'), true);
	assert.equal(isDemoId('abc'), false);
});

test('effective read model never mutates real conversations or nested contacts', () => {
	const contact = Object.freeze({ id: 'contact-1', name: 'Real contact' });
	const realConversation = Object.freeze({
		id: 'real-1',
		contact,
		lastMessageAt: '2026-07-21T10:00:00.000Z',
	});
	const realConversations = Object.freeze([realConversation]);
	const result = buildEffectiveConversations({
		realConversations,
		enabled: true,
		demoState: {
			contacts: [{ id: 'fake-contact', name: 'Fake contact' }],
			conversations: [{ id: 'fake-conversation', contactId: 'fake-contact' }],
			messagesByConversation: {},
		},
		runtime: { conversations: {} },
	});

	assert.equal(realConversation.sourceType, undefined);
	assert.equal(result.length, 2);
	assert.notEqual(result.find(item => item.id === 'real-1'), realConversation);
	assert.notEqual(result.find(item => item.id === 'real-1').contact, contact);
	assert.equal(result.find(item => isDemoId(item.id)).contact.name, 'Fake contact');
});

test('effective conversations sort pinned first then newest first', () => {
	const result = sortEffectiveConversations([
		{ id: 'old', lastMessageAt: '2026-01-01T00:00:00.000Z' },
		{ id: 'new', lastMessageAt: '2026-03-01T00:00:00.000Z' },
		{ id: 'pinned', isPinned: true, lastMessageAt: '2025-01-01T00:00:00.000Z' },
	]);
	assert.deepEqual(result.map(item => item.id), ['pinned', 'new', 'old']);
});

test('demo messages are normalized and chronologically sorted without touching real state', () => {
	const realMessages = Object.freeze([{ id: 'real-message', text: 'untouched' }]);
	const selectedConversation = { id: 'demo:conversation-1', rawDemoId: 'conversation-1', sourceType: 'demo' };
	const result = buildEffectiveMessages({
		realMessages,
		selectedConversation,
		enabled: true,
		demoState: {
			messagesByConversation: {
				'conversation-1': [
					{ id: 'second', text: '2', providerTimestamp: '2026-02-02T00:00:00.000Z' },
					{ id: 'first', text: '1', providerTimestamp: '2026-02-01T00:00:00.000Z' },
				],
			},
		},
		runtime: { conversations: {} },
	});
	assert.deepEqual(result.map(item => item.id), ['demo:first', 'demo:second']);
	assert.equal(realMessages[0].sourceType, undefined);
});

test('backend demo timestamps and attachments map into the WhatsApp read model', () => {
	const result = buildEffectiveMessages({
		selectedConversation: {
			id: 'demo:conversation-1',
			rawDemoId: 'conversation-1',
			sourceType: 'demo',
		},
		enabled: true,
		demoState: {
			messagesByConversation: {
				'conversation-1': [
					{
						id: 'message-1',
						type: 'image',
						timestamp: '2026-07-21T12:34:00.000Z',
						attachments: [{ id: 'attachment-1', kind: 'image' }],
					},
				],
			},
		},
		runtime: { conversations: {} },
	});

	assert.equal(result[0].providerTimestamp, '2026-07-21T12:34:00.000Z');
	assert.equal(result[0].attachments[0].id, 'demo:attachment-1');
	assert.equal(result[0].attachments[0].type, 'image');
	assert.equal(result[0].attachments[0].demoAttachment, true);
});

test('showcase-only mode shows fake chats only and never real messages', () => {
	const demoState = {
		contacts: [{ id: 'fake-contact', name: 'Fake contact' }],
		conversations: [
			{ id: 'fake-conversation', contactId: 'fake-contact', sourceType: 'fake' },
			{ id: 'overlay-1', sourceType: 'real_overlay', realConversationId: 'real-1' },
		],
		messagesByConversation: {},
	};
	const featureFlags = { showcaseOnly: true, overlayRealChats: true, useFakeContacts: true };
	const conversations = buildEffectiveConversations({
		realConversations: [{ id: 'real-1', name: 'Real person' }],
		enabled: true,
		demoState,
		runtime: { conversations: {} },
		featureFlags,
	});
	assert.deepEqual(conversations.map(item => item.id), ['demo:fake-conversation']);

	const realMessages = [{ id: 'real-message', text: 'private' }];
	for (const selectedConversation of [null, { id: 'real-1', sourceType: 'real' }]) {
		assert.deepEqual(
			buildEffectiveMessages({ realMessages, selectedConversation, demoState, enabled: true, featureFlags }),
			[],
		);
	}
	assert.equal(
		buildEffectiveMessages({ realMessages, selectedConversation: null, demoState, enabled: false, featureFlags }),
		realMessages,
	);
});

test('demo stickers, shared contacts and group senders reach the bubble fields', () => {
	const [conversation] = buildEffectiveConversations({
		enabled: true,
		featureFlags: { showcaseOnly: true },
		demoState: {
			contacts: [{ id: 'team', name: 'Team' }],
			conversations: [{ id: 'group-1', contactId: 'team', overrides: { type: 'group' } }],
			messagesByConversation: {},
		},
		runtime: { conversations: {} },
	});
	assert.equal(conversation.type, 'group');

	const messages = buildEffectiveMessages({
		selectedConversation: conversation,
		enabled: true,
		featureFlags: { showcaseOnly: true },
		demoState: {
			messagesByConversation: {
				'group-1': [
					{
						id: 'sticker',
						type: 'sticker',
						direction: 'inbound',
						timestamp: '2026-07-21T12:00:00.000Z',
						attachments: [{ id: 'a1', kind: 'image' }],
						metadata: { senderName: 'Mona', senderWaId: '201000000001@c.us' },
					},
					{
						id: 'card',
						type: 'contact',
						direction: 'outbound',
						timestamp: '2026-07-21T12:01:00.000Z',
						metadata: { sharedContact: { displayName: 'Omar', phones: [{ phone: '+20 100 000 0002' }] } },
					},
				],
			},
		},
		runtime: { conversations: {} },
	});
	assert.equal(messages[0].attachments[0].type, 'sticker');
	assert.equal(messages[0].senderName, 'Mona');
	assert.equal(messages[0].fromMe, false);
	assert.equal(messages[1].sharedContact.displayName, 'Omar');
	assert.equal(messages[1].fromMe, true);
});

test('scheduler adds deterministic typing stop and typing-before-message events', () => {
	const scheduled = prepareScheduledEvents(
		[
			{
				id: 'typing-1',
				eventType: 'typing',
				delayMs: 1000,
				durationMs: 2500,
				payload: { active: true },
			},
			{
				id: 'incoming-1',
				eventType: 'incoming_message',
				delayMs: 5000,
				payload: { text: 'Hello', typingBefore: true },
			},
		],
		'fixed',
		10000,
	);

	assert.deepEqual(
		scheduled.map(event => [event._schedulerKey, event._runAt, event.eventType, event.payload?.active]),
		[
			['typing-1', 11000, 'typing', true],
			['incoming-1:typing', 13000, 'typing', true],
			['typing-1:stop', 13500, 'typing', false],
			['incoming-1', 15000, 'incoming_message', undefined],
		],
	);
});

test('command routing sends demo and overlay writes only to demo command', async () => {
	let demoCalls = 0;
	let realCalls = 0;
	const demoCommand = async input => {
		demoCalls += 1;
		return input;
	};
	const realCommand = async input => {
		realCalls += 1;
		return input;
	};

	const fakeResult = await routeMessageCommand({
		demoEnabled: true,
		conversation: { id: 'demo:fake-1', rawDemoId: 'fake-1', sourceType: 'demo' },
		demoCommand,
		realCommand,
	});
	const overlayResult = await routeMessageCommand({
		demoEnabled: true,
		conversation: {
			id: 'real-1',
			demoOverlayId: 'overlay-1',
			sourceType: 'real_overlay',
		},
		demoCommand,
		realCommand,
	});

	assert.equal(fakeResult.conversationId, 'fake-1');
	assert.equal(overlayResult.conversationId, 'overlay-1');
	assert.equal(demoCalls, 2);
	assert.equal(realCalls, 0);
});

test('command routing fails closed for unknown sources and synthetic real writes', async () => {
	await assert.rejects(
		routeMessageCommand({
			demoEnabled: true,
			conversation: { id: 'real-1', sourceType: 'real' },
			demoCommand: async () => null,
			realCommand: async () => null,
		}),
		error => error instanceof DemoRoutingError && error.code === 'UNKNOWN_DEMO_SOURCE',
	);
	assert.throws(
		() => assertSafeRealWriteId('demo:fake-1'),
		error => error instanceof DemoRoutingError && error.code === 'UNSAFE_REAL_WRITE_ID',
	);
});
