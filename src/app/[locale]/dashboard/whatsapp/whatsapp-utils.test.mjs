import assert from 'node:assert/strict';
import test from 'node:test';
import {
	conversationTitle,
	firstMessageLink,
	groupConsecutiveImageMessages,
	isRenderableWhatsAppMessage,
	mergeMessages,
	messageTextSegments,
	messageTextPresentation,
	normalizeWhatsAppIdentity,
	parseWhatsAppBold,
	relativeTime,
	seekRatio,
	updateConversationPreview,
} from './whatsapp-utils.js';

test('mergeMessages deduplicates provider messages and sorts chronologically', () => {
	const result = mergeMessages(
		[
			{
				id: 'local-2',
				providerMessageId: 'provider-2',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
				text: 'old',
			},
		],
		[
			{
				id: 'local-1',
				providerMessageId: 'provider-1',
				providerTimestamp: '2026-01-01T00:00:00.000Z',
			},
			{
				id: 'local-2-new',
				providerMessageId: 'provider-2',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
				text: 'new',
			},
		],
	);
	assert.deepEqual(
		result.map(item => item.providerMessageId),
		['provider-1', 'provider-2'],
	);
	assert.equal(result[1].text, 'new');
});

test('conversationTitle follows group/contact/provider precedence', () => {
	assert.equal(conversationTitle({ group: { subject: 'Support' } }), 'Support');
	assert.equal(conversationTitle({ contact: { name: 'Ahmed' } }), 'Ahmed');
	assert.equal(conversationTitle({ providerChatId: '201000000000@c.us' }), '201000000000');
	assert.equal(conversationTitle(null), 'Chat');
});

test('normalizeWhatsAppIdentity matches contact, chat and status identifiers', () => {
	assert.equal(normalizeWhatsAppIdentity('201001234567@c.us'), '201001234567');
	assert.equal(normalizeWhatsAppIdentity('201001234567@s.whatsapp.net'), '201001234567');
	assert.equal(normalizeWhatsAppIdentity('ABC123@lid'), 'abc123');
	assert.equal(normalizeWhatsAppIdentity('201001234567'), '201001234567');
});

test('updateConversationPreview replaces an outbound preview with the latest inbound reply', () => {
	const conversations = [
		{
			id: 'conversation-1',
			lastMessageAt: '2026-07-21T18:15:00.000Z',
			lastMessage: {
				text: 'My message',
				direction: 'outbound',
				providerTimestamp: '2026-07-21T18:15:00.000Z',
			},
			unreadCount: 0,
		},
	];
	const result = updateConversationPreview(conversations, {
		conversationId: 'conversation-1',
		lastMessageAt: '2026-07-21T18:16:00.000Z',
		unreadCount: 1,
		preview: {
			id: 'reply-1',
			text: 'Latest reply',
			type: 'text',
			direction: 'inbound',
			providerTimestamp: '2026-07-21T18:16:00.000Z',
		},
	});

	assert.equal(result[0].lastMessage.text, 'Latest reply');
	assert.equal(result[0].lastMessage.direction, 'inbound');
	assert.equal(result[0].unreadCount, 1);
});

test('updateConversationPreview does not let an older event replace a newer message', () => {
	const conversations = [
		{
			id: 'conversation-1',
			lastMessageAt: '2026-07-21T18:20:00.000Z',
			lastMessage: {
				text: 'Newer message',
				direction: 'inbound',
				providerTimestamp: '2026-07-21T18:20:00.000Z',
			},
		},
	];
	const result = updateConversationPreview(conversations, {
		conversationId: 'conversation-1',
		lastMessageAt: '2026-07-21T18:19:00.000Z',
		preview: {
			text: 'Older message',
			direction: 'outbound',
			providerTimestamp: '2026-07-21T18:19:00.000Z',
		},
	});

	assert.equal(result[0].lastMessage.text, 'Newer message');
});

test('updateConversationPreview ignores empty provider placeholders', () => {
	const conversations = [
		{
			id: 'conversation-1',
			lastMessageAt: '2026-07-21T18:20:00.000Z',
			lastMessage: {
				text: 'Latest real message',
				type: 'text',
				providerTimestamp: '2026-07-21T18:20:00.000Z',
			},
			unreadCount: 0,
		},
	];
	const result = updateConversationPreview(conversations, {
		conversationId: 'conversation-1',
		lastMessageAt: '2026-07-21T18:21:00.000Z',
		unreadCount: 1,
		preview: {
			text: '',
			type: 'chat',
			providerTimestamp: '2026-07-21T18:21:00.000Z',
		},
	});

	assert.equal(result[0].lastMessage.text, 'Latest real message');
	assert.equal(result[0].unreadCount, 1);
});

test('seekRatio supports LTR and RTL and clamps values', () => {
	assert.equal(seekRatio(25, 0, 100, false), 0.25);
	assert.equal(seekRatio(25, 0, 100, true), 0.75);
	assert.equal(seekRatio(-10, 0, 100), 0);
	assert.equal(seekRatio(110, 0, 100), 1);
	assert.equal(seekRatio(10, 0, 0), 0);
});

test('relativeTime handles deterministic valid and invalid timestamps', () => {
	const now = new Date('2026-07-19T12:00:00.000Z').getTime();
	assert.equal(relativeTime('2026-07-19T11:55:00.000Z', now), '5 min');
	assert.equal(relativeTime('2026-07-17T12:00:00.000Z', now), '2d');
	assert.equal(relativeTime('2026-07-19T11:55:00.000Z', now, 'ar'), '5 د');
	assert.equal(relativeTime('invalid', now), '');
});

test('groupConsecutiveImageMessages groups only adjacent images from the same sender', () => {
	const imageMessage = (id, direction = 'inbound') => ({
		id,
		direction,
		senderWaId: direction === 'inbound' ? '20100@c.us' : '',
		attachments: [{ id: `image-${id}`, type: 'image' }],
	});
	const rows = groupConsecutiveImageMessages([
		imageMessage('1'),
		imageMessage('2'),
		imageMessage('3'),
		imageMessage('4'),
		{ id: 'text', direction: 'inbound', senderWaId: '20100@c.us', text: 'separator' },
		imageMessage('5', 'outbound'),
	]);

	assert.equal(rows.length, 3);
	assert.equal(rows[0].kind, 'image-gallery');
	assert.equal(rows[0].attachments.length, 4);
	assert.equal(rows[1].kind, 'message');
	assert.equal(rows[2].attachments.length, 1);
});

test('image galleries support one, two, three and four image layouts', () => {
	for (const count of [1, 2, 3, 4]) {
		const messages = Array.from({ length: count }, (_, index) => ({
			id: String(index + 1),
			direction: 'inbound',
			senderWaId: '20100@c.us',
			attachments: [{ id: `image-${index + 1}`, type: 'image' }],
		}));
		const rows = groupConsecutiveImageMessages(messages);
		assert.equal(rows.length, 1);
		assert.equal(rows[0].attachments.length, count);
	}
});

test('messageTextPresentation handles Arabic, English and mixed text', () => {
	const arabic = messageTextPresentation('رسالة عربية');
	assert.equal(arabic.dir, 'rtl');
	assert.match(arabic.style.fontFamily, /--font-arabic/);
	assert.equal(arabic.style.fontWeight, 500);
	assert.equal(messageTextPresentation('English message').dir, 'ltr');
	const mixed = messageTextPresentation('Hello مرحباً');
	assert.equal(mixed.dir, 'auto');
	assert.match(mixed.style.fontFamily, /Tajawal/);
});

test('message links are segmented and normalized for safe previews', () => {
	assert.deepEqual(messageTextSegments('Open www.example.com/path, now'), [
		{ type: 'text', text: 'Open ' },
		{
			type: 'link',
			text: 'www.example.com/path',
			href: 'https://www.example.com/path',
		},
		{ type: 'text', text: ',' },
		{ type: 'text', text: ' now' },
	]);
	assert.deepEqual(firstMessageLink('https://claude.ai/share/example'), {
		href: 'https://claude.ai/share/example',
		hostname: 'claude.ai',
		displayUrl: 'claude.ai/share/example',
	});
	assert.equal(firstMessageLink('javascript:alert(1)'), null);
});

test('parseWhatsAppBold converts double-asterisk sections into bold text', () => {
	assert.deepEqual(parseWhatsAppBold('Use **ECS-HQ** or **SPX5** now'), [
		{ text: 'Use ', bold: false },
		{ text: 'ECS-HQ', bold: true },
		{ text: ' or ', bold: false },
		{ text: 'SPX5', bold: true },
		{ text: ' now', bold: false },
	]);
	assert.deepEqual(parseWhatsAppBold('Unclosed **text'), [
		{ text: 'Unclosed **text', bold: false },
	]);
});

test('isRenderableWhatsAppMessage removes empty provider placeholders', () => {
	assert.equal(isRenderableWhatsAppMessage({ id: 'empty', type: 'chat', text: '' }), false);
	assert.equal(isRenderableWhatsAppMessage({ id: 'spaces', text: '   ' }), false);
	assert.equal(isRenderableWhatsAppMessage({ id: 'text', text: 'Hello' }), true);
	assert.equal(
		isRenderableWhatsAppMessage({
			id: 'attachment',
			attachments: [{ id: 'media-1', type: 'image' }],
		}),
		true,
	);
	assert.equal(isRenderableWhatsAppMessage({ id: 'voice', type: 'ptt' }), true);
});
