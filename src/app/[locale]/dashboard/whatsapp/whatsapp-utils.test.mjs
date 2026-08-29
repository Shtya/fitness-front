import assert from 'node:assert/strict';
import test from 'node:test';
import {
	conversationTitle,
	isChannelConversation,
	firstMessageLink,
	textWithoutFirstLink,
	groupConsecutiveImageMessages,
	isRenderableWhatsAppMessage,
	isWhatsAppLocationMessage,
	whatsAppLocationFromMessage,
	whatsAppLocationHref,
	mergeMessages,
	buildOptimisticMediaMessage,
	messageDeliveryState,
	preferWhatsAppAckStatus,
	isSelfChatConversation,
	messageMatchesAckTarget,
	messageTextSegments,
	firstStrongTextDirection,
	messageTextPresentation,
	groupSenderIdentity,
	quotedMessageLabel,
	quotedPreviewFromMessage,
	quotedVoicePresentation,
	quotedTargetFromMessage,
	messageMatchesQuotedTarget,
	inboxAvatarForWaId,
	normalizeWhatsAppIdentity,
	parseWhatsAppBold,
	relativeTime,
	resolveWhatsAppMentionLabel,
	buildWhatsAppMentionDirectory,
	scopeMessagesToConversation,
	seekRatio,
	sortConversationsByActivity,
	updateConversationPreview,
	conversationUnreadCount,
	conversationMatchesInboxFilter,
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

test('mergeMessages collapses optimistic sends into confirmed provider rows', () => {
	const result = mergeMessages(
		[
			{
				id: 'pending:client-1',
				clientMessageId: 'client-1',
				optimistic: true,
				text: 'Hello',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
			},
		],
		[
			{
				id: 'db-1',
				clientMessageId: 'client-1',
				providerMessageId: 'provider-1',
				text: 'Hello',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
			},
		],
	);
	assert.equal(result.length, 1);
	assert.equal(result[0].id, 'db-1');
	assert.equal(result[0].providerMessageId, 'provider-1');
	assert.equal(result[0].optimistic, false);
});

test('mergeMessages updates a lone pending voice in place when the confirmed row has no client id', () => {
	const result = mergeMessages(
		[
			{
				id: 'pending:voice-1',
				clientMessageId: 'voice-1',
				optimistic: true,
				direction: 'outbound',
				type: 'voice',
				status: 'pending',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
				attachments: [{ id: 'pending-att:voice-1', url: 'blob:local' }],
			},
		],
		[
			{
				id: 'db-voice',
				providerMessageId: 'provider-voice',
				direction: 'outbound',
				type: 'ptt',
				status: 'sent',
				providerTimestamp: '2026-01-02T00:00:05.000Z',
				attachments: [{ id: 'att-1', type: 'ptt' }],
			},
		],
	);
	assert.equal(result.length, 1);
	assert.equal(result[0].id, 'db-voice');
	assert.equal(result[0].clientMessageId, 'voice-1');
	assert.equal(result[0].status, 'sent');
	assert.equal(result[0].attachments[0].url, 'blob:local');
	assert.equal(result[0].providerTimestamp, '2026-01-02T00:00:00.000Z');
});

test('mergeMessages does not re-add an optimistic voice after the confirmed row already exists', () => {
	const result = mergeMessages(
		[
			{
				id: 'db-voice',
				providerMessageId: 'provider-voice',
				direction: 'outbound',
				type: 'ptt',
				status: 'sent',
				providerTimestamp: '2026-01-02T00:00:05.000Z',
				attachments: [{ id: 'att-1', type: 'ptt' }],
			},
		],
		[
			{
				id: 'pending:voice-1',
				clientMessageId: 'voice-1',
				optimistic: true,
				direction: 'outbound',
				type: 'voice',
				status: 'pending',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
				attachments: [{ id: 'pending-att:voice-1', url: 'blob:local' }],
			},
		],
	);
	assert.equal(result.length, 1);
	assert.equal(result[0].id, 'db-voice');
	assert.equal(result[0].clientMessageId, 'voice-1');
	assert.equal(result[0].optimistic, false);
	assert.equal(result[0].attachments[0].url, 'blob:local');
});

test('preferWhatsAppAckStatus never goes backwards, and self-chat ticks stay grey', () => {
	assert.equal(preferWhatsAppAckStatus('delivered', 'sent'), 'delivered');
	assert.equal(preferWhatsAppAckStatus('sent', 'read'), 'read');
	assert.equal(messageDeliveryState({ status: 'read' }, { selfChat: true }), 'delivered');
	assert.equal(messageDeliveryState({ status: 'read' }), 'read');
	assert.equal(messageDeliveryState({ status: 'sent' }), 'sent');
	assert.equal(
		isSelfChatConversation({ contact: { name: 'You' } }),
		true,
	);
	assert.equal(
		isSelfChatConversation(
			{ providerChatId: '201041422849@s.whatsapp.net' },
			{ phoneNumber: '+201041422849' },
		),
		true,
	);
	assert.equal(
		messageMatchesAckTarget(
			{ id: 'pending:1', clientMessageId: 'client-1' },
			{ messageId: 'db-1', clientMessageId: 'client-1' },
		),
		true,
	);
});

test('mergeMessages refuses to keep messages from another conversation', () => {
	const result = mergeMessages(
		[
			{
				id: 'from-previous-chat',
				conversationId: 'chat-a',
				providerTimestamp: '2026-01-01T00:00:00.000Z',
			},
		],
		[
			{
				id: 'from-open-chat',
				conversationId: 'chat-b',
				providerTimestamp: '2026-01-02T00:00:00.000Z',
			},
		],
		'chat-b',
	);
	assert.deepEqual(
		result.map(item => item.id),
		['from-open-chat'],
	);
});

test('buildOptimisticMediaMessage creates a pending voice bubble that merge can confirm', () => {
	const pending = buildOptimisticMediaMessage({
		conversationId: 'chat-1',
		clientMessageId: 'client-9',
		type: 'voice',
		file: { type: 'audio/webm', name: 'voice-4s.webm', size: 1200 },
		previewUrl: 'blob:http://local/voice',
	});
	assert.equal(pending.id, 'pending:client-9');
	assert.equal(pending.optimistic, true);
	assert.equal(pending.type, 'voice');
	assert.equal(pending.attachments[0].url, 'blob:http://local/voice');
	const confirmed = mergeMessages(
		[pending],
		[
			{
				id: 'db-voice',
				conversationId: 'chat-1',
				clientMessageId: 'client-9',
				providerMessageId: 'provider-voice',
				type: 'voice',
				direction: 'outbound',
				providerTimestamp: pending.providerTimestamp,
				attachments: [{ id: 'att-1', type: 'voice' }],
			},
		],
		'chat-1',
	);
	assert.equal(confirmed.length, 1);
	assert.equal(confirmed[0].id, 'db-voice');
	assert.equal(confirmed[0].optimistic, false);
});

test('scopeMessagesToConversation keeps items that carry no conversation id', () => {
	const items = [
		{ id: 'optimistic' },
		{ id: 'same', conversationId: 'chat-a' },
		{ id: 'other', conversationId: 'chat-b' },
	];
	assert.deepEqual(
		scopeMessagesToConversation(items, 'chat-a').map(item => item.id),
		['optimistic', 'same'],
	);
	assert.deepEqual(scopeMessagesToConversation(items, null), items);
});

test('an incoming message bubbles its conversation to the top of the list', () => {
	const conversations = [
		{ id: 'busy', lastMessageAt: '2026-03-01T10:00:00.000Z' },
		{ id: 'quiet', lastMessageAt: '2026-02-01T10:00:00.000Z' },
	];
	const result = updateConversationPreview(conversations, {
		conversationId: 'quiet',
		lastMessageAt: '2026-03-02T10:00:00.000Z',
		preview: {
			id: 'message-1',
			text: 'Hello',
			type: 'text',
			direction: 'inbound',
			providerTimestamp: '2026-03-02T10:00:00.000Z',
		},
	});
	assert.deepEqual(
		result.map(item => item.id),
		['quiet', 'busy'],
	);
});

test('pinned conversations stay above newer activity', () => {
	const result = sortConversationsByActivity([
		{ id: 'new', lastMessageAt: '2026-03-01T00:00:00.000Z' },
		{ id: 'pinned', isPinned: true, lastMessageAt: '2025-01-01T00:00:00.000Z' },
		{ id: 'old', lastMessageAt: '2026-01-01T00:00:00.000Z' },
	]);
	assert.deepEqual(
		result.map(item => item.id),
		['pinned', 'new', 'old'],
	);
});

test('conversationTitle prefers alias names and formats the phone otherwise', () => {
	assert.equal(conversationTitle({ group: { subject: 'Support' } }), 'Support');
	assert.equal(conversationTitle({ contact: { name: 'Ahmed' } }), 'Ahmed');
	assert.equal(
		conversationTitle({ providerChatId: '201000000000@c.us' }),
		'+201000000000',
	);
	assert.equal(
		conversationTitle({
			providerChatId: '26934293586114@lid',
			contact: { name: '26934293586114', phoneNumber: '201090998111' },
		}),
		'+201090998111',
	);
	assert.equal(
		conversationTitle({
			type: 'group',
			providerChatId: '120363163799333272@g.us',
			group: { subject: '120363163799333272' },
		}),
		'Group',
	);
	assert.equal(conversationTitle(null), 'Chat');
	assert.equal(
		conversationTitle({
			providerChatId: '120363163799333272@newsletter',
			contact: { name: 'أسعار العملات اليوم' },
		}),
		'أسعار العملات اليوم',
	);
	assert.equal(
		conversationTitle({
			providerChatId: '120363163799333272@newsletter',
		}),
		'Channel',
	);
	assert.equal(
		isChannelConversation({ providerChatId: '120363163799333272@newsletter' }),
		true,
	);
	assert.equal(
		isChannelConversation({ providerChatId: '201000000000@c.us' }),
		false,
	);
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

test('updateConversationPreview does not copy previous read ticks onto a new outbound voice', () => {
	const conversations = [
		{
			id: 'conversation-1',
			lastMessageAt: '2026-07-21T18:15:00.000Z',
			lastMessage: {
				id: 'old-1',
				text: 'Older voice',
				type: 'ptt',
				direction: 'outbound',
				status: 'read',
				providerTimestamp: '2026-07-21T18:15:00.000Z',
			},
		},
	];
	const result = updateConversationPreview(conversations, {
		conversationId: 'conversation-1',
		lastMessageAt: '2026-07-21T18:16:00.000Z',
		preview: {
			id: 'voice-2',
			type: 'ptt',
			direction: 'outbound',
			status: 'sent',
			providerTimestamp: '2026-07-21T18:16:00.000Z',
		},
	});
	assert.equal(result[0].lastMessage.id, 'voice-2');
	assert.equal(result[0].lastMessage.status, 'sent');
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

test('firstStrongTextDirection uses the first Arabic or Latin letter', () => {
	assert.equal(firstStrongTextDirection('رسالة عربية'), 'rtl');
	assert.equal(firstStrongTextDirection('English message'), 'ltr');
	assert.equal(firstStrongTextDirection('Hello مرحباً'), 'ltr');
	assert.equal(firstStrongTextDirection('مرحبا Hello'), 'rtl');
	assert.equal(firstStrongTextDirection('  123 ssh-ed25519 AAA...'), 'ltr');
	assert.equal(firstStrongTextDirection('بعد ما تضيفه Frontend'), 'rtl');
	assert.equal(firstStrongTextDirection('!!!'), 'ltr');
});

test('messageTextPresentation handles Arabic, English and mixed text', () => {
	const arabic = messageTextPresentation('رسالة عربية');
	assert.equal(arabic.dir, 'rtl');
	assert.equal(arabic.style.textAlign, 'right');
	assert.match(arabic.style.fontFamily, /--font-arabic/);
	assert.equal(arabic.style.fontWeight, 500);
	assert.equal(messageTextPresentation('English message').dir, 'ltr');
	const startsEnglish = messageTextPresentation('Hello مرحباً');
	assert.equal(startsEnglish.dir, 'ltr');
	assert.match(startsEnglish.style.fontFamily, /--font-inter/);
	const startsArabic = messageTextPresentation('مرحبا Hello');
	assert.equal(startsArabic.dir, 'rtl');
	assert.match(startsArabic.style.fontFamily, /Tajawal/);
	const mostlyEnglish = messageTextPresentation(
		'New Email\nFrom: Admin\nReceived: السبت، ٢٢ أغسطس في ٣:٤٣ م',
	);
	assert.equal(mostlyEnglish.dir, 'ltr');
	assert.equal(mostlyEnglish.className, 'wa-message-text--en');
	assert.equal(mostlyEnglish.style.textAlign, 'left');
	assert.equal(
		messageTextPresentation(
			'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...\nبعد ما تضيفه Frontend',
		).dir,
		'ltr',
	);
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
	assert.equal(textWithoutFirstLink('https://www.awesomescreenshot.com/video/1'), '');
	assert.equal(
		textWithoutFirstLink('Check this https://example.com/path now'),
		'Check this now',
	);
});

test('numeric WhatsApp mentions are segmented separately from plain text', () => {
	assert.deepEqual(
		messageTextSegments('Please check @246896262172848 now'),
		[
			{ type: 'text', text: 'Please check ' },
			{ type: 'mention', text: '@246896262172848' },
			{ type: 'text', text: ' now' },
		],
	);
	assert.equal(
		messageTextSegments('email me at user@example.com')[0].type,
		'text',
	);
	assert.deepEqual(
		messageTextSegments('hello 🙈 there'),
		[
			{ type: 'text', text: 'hello ' },
			{ type: 'emoji', text: '🙈' },
			{ type: 'text', text: ' there' },
		],
	);
});

test('mention labels resolve WhatsApp LID ids to a name or phone', () => {
	const directory = buildWhatsAppMentionDirectory({
		conversations: [
			{
				type: 'chat',
				contact: {
					waId: '246896262172848@lid',
					name: 'Sara',
					phoneNumber: '201000000000',
				},
			},
		],
		messages: [
			{
				senderWaId: '246896262172848@lid',
				senderName: 'Sara',
			},
		],
	});
	assert.equal(
		resolveWhatsAppMentionLabel('@246896262172848', directory),
		'@Sara',
	);
	assert.equal(
		resolveWhatsAppMentionLabel('@246896262172848', new Map(), {
			'246896262172848': 'Adam',
		}),
		'@Adam',
	);
	assert.equal(
		resolveWhatsAppMentionLabel(
			'@111222333444',
			buildWhatsAppMentionDirectory({
				conversations: [
					{
						contact: {
							waId: '111222333444@lid',
							name: null,
							phoneNumber: '201555555555',
						},
					},
				],
			}),
		),
		'@+201555555555',
	);
});

test('group sender identity prefers stored name over raw WhatsApp id', () => {
	const sender = groupSenderIdentity({
		senderWaId: '246896262172848@lid',
		senderName: 'Ahmed',
		senderAvatarUrl: 'https://example.com/a.jpg',
	});
	assert.equal(sender.name, 'Ahmed');
	assert.equal(sender.avatarUrl, 'https://example.com/a.jpg');
	assert.equal(sender.key, '246896262172848@lid');
	assert.match(sender.color, /^#/);
});

test('inbox avatar lookup uses a matching direct chat photo', () => {
	assert.equal(
		inboxAvatarForWaId(
			[
				{
					type: 'chat',
					contact: { waId: '201000000000@c.us', avatarUrl: 'https://cdn/a.jpg' },
				},
			],
			'201000000000@c.us',
		),
		'https://cdn/a.jpg',
	);
	assert.equal(inboxAvatarForWaId([], '201000000000@c.us'), '');
});

test('quoted image labels and previews do not fall back to the word image', () => {
	assert.equal(quotedMessageLabel({ type: 'image' }, 'en'), 'Photo');
	assert.equal(quotedMessageLabel({ type: 'image' }, 'ar'), 'صورة');
	assert.equal(quotedMessageLabel({ type: 'location' }, 'en'), 'Location');
	assert.equal(quotedMessageLabel({ type: 'location' }, 'ar'), 'موقع');
	assert.equal(
		quotedPreviewFromMessage({
			replyTo: { type: 'image', previewDataUrl: 'data:image/jpeg;base64,abc' },
		}),
		'data:image/jpeg;base64,abc',
	);
});

test('quoted voice labels show duration and time instead of only Voice message', () => {
	const label = quotedMessageLabel(
		{
			type: 'ptt',
			durationSeconds: 42,
			timestamp: '2026-08-23T09:02:00.000Z',
		},
		'en',
	);
	assert.match(label, /0:42/);
	assert.doesNotMatch(label, /^Voice message$/);
	assert.equal(
		quotedMessageLabel({ type: 'ptt', attachments: [{ fileName: 'voice-15s.ogg' }] }, 'en'),
		'0:15',
	);
	const voice = quotedVoicePresentation(
		{
			type: 'ptt',
			durationSeconds: 9,
			timestamp: '2026-08-23T09:03:00.000Z',
			senderName: 'Ahmed Magdy',
		},
		'en',
	);
	assert.equal(voice?.senderName, 'Ahmed Magdy');
	assert.equal(voice?.durationLabel, '0:09');
	assert.ok(voice?.timeLabel);
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
	assert.equal(isRenderableWhatsAppMessage({ id: 'zwsp', type: 'text', text: '\u200e\u200b' }), false);
	assert.equal(isRenderableWhatsAppMessage({ id: 'text', text: 'Hello' }), true);
	assert.equal(
		isRenderableWhatsAppMessage({
			id: 'attachment',
			attachments: [{ id: 'media-1', type: 'image' }],
		}),
		true,
	);
	assert.equal(isRenderableWhatsAppMessage({ id: 'voice', type: 'ptt' }), true);
	assert.equal(
		isRenderableWhatsAppMessage({
			id: 'live-voice',
			type: 'ptt',
			attachments: [{ type: 'ptt', key: 'live-att:1', providerMediaId: 'abc' }],
		}),
		true,
	);
	assert.equal(isRenderableWhatsAppMessage({ id: 'location', type: 'location' }), true);
	assert.equal(isWhatsAppLocationMessage({ type: 'location' }), true);
	assert.equal(
		whatsAppLocationFromMessage({
			type: 'location',
			raw: {
				message: {
					locationMessage: {
						degreesLatitude: 30.0444,
						degreesLongitude: 31.2357,
						name: 'Cairo',
					},
				},
			},
		})?.name,
		'Cairo',
	);
	assert.equal(
		whatsAppLocationHref({
			type: 'location',
			location: { latitude: 30.0444, longitude: 31.2357 },
		}),
		'https://www.google.com/maps?q=30.0444%2C31.2357',
	);
	assert.equal(
		whatsAppLocationHref({
			type: 'location',
			text: 'https://www.google.com/maps?q=30.04,31.23',
		}),
		'https://www.google.com/maps?q=30.04,31.23',
	);
});

test('conversationUnreadCount follows CRM unreadCount, not last-message direction', () => {
	assert.equal(
		conversationUnreadCount({
			unreadCount: 4,
			lastMessage: { direction: 'outbound', text: 'من الموبايل' },
		}),
		4,
	);
	assert.equal(
		conversationUnreadCount({
			unreadCount: 2,
			lastMessage: { direction: 'inbound', text: 'أهلاً' },
		}),
		2,
	);
});

test('conversationMatchesInboxFilter applies unread/favorites/important locally', () => {
	assert.equal(
		conversationMatchesInboxFilter({ unreadCount: 2 }, 'unread'),
		true,
	);
	assert.equal(
		conversationMatchesInboxFilter({ unreadCount: 0 }, 'unread'),
		false,
	);
	assert.equal(
		conversationMatchesInboxFilter({ isFavorite: true }, 'favorites'),
		true,
	);
	assert.equal(
		conversationMatchesInboxFilter({ isFavorite: false }, 'favorites'),
		false,
	);
	assert.equal(
		conversationMatchesInboxFilter({ hasImportantMessages: true }, 'important'),
		true,
	);
	assert.equal(
		conversationMatchesInboxFilter({ id: 'c1' }, 'important'),
		false,
	);
	assert.equal(conversationMatchesInboxFilter({ unreadCount: 0 }, 'all'), true);
});

test('updateConversationPreview clears unread when the latest message is from us', () => {
	const conversations = [
		{
			id: 'conversation-1',
			lastMessageAt: '2026-07-21T18:15:00.000Z',
			lastMessage: {
				text: 'Unread inbound',
				direction: 'inbound',
				providerTimestamp: '2026-07-21T18:15:00.000Z',
			},
			unreadCount: 3,
		},
	];
	const result = updateConversationPreview(conversations, {
		conversationId: 'conversation-1',
		lastMessageAt: '2026-07-21T18:16:00.000Z',
		unreadCount: 3,
		preview: {
			id: 'phone-reply',
			text: 'Replied from phone',
			type: 'text',
			direction: 'outbound',
			providerTimestamp: '2026-07-21T18:16:00.000Z',
		},
	});
	assert.equal(result[0].unreadCount, 0);
	assert.equal(result[0].lastMessage.direction, 'outbound');
});

test('quotedTargetFromMessage reads reply ids', () => {
	assert.deepEqual(
		quotedTargetFromMessage({
			replyTo: { id: 'msg-1', providerMessageId: 'ABC' },
		}),
		{ id: 'msg-1', providerMessageId: 'ABC' },
	);
	assert.deepEqual(
		quotedTargetFromMessage({
			quotedProviderMessageId: 'XYZ',
			replyToId: 'msg-2',
		}),
		{ id: 'msg-2', providerMessageId: 'XYZ' },
	);
	assert.equal(
		messageMatchesQuotedTarget({ id: 'msg-1', providerMessageId: 'ABC' }, { id: 'msg-1' }),
		true,
	);
	assert.equal(
		messageMatchesQuotedTarget(
			{ id: 'other', providerMessageId: 'ABC' },
			{ providerMessageId: 'ABC' },
		),
		true,
	);
	assert.equal(
		messageMatchesQuotedTarget({ id: 'msg-1' }, { id: 'msg-9', providerMessageId: 'NO' }),
		false,
	);
});
