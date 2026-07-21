const DEMO_PREFIX = 'demo:';

export function namespaceDemoId(id) {
	if (id === null || id === undefined || id === '') {
		throw new Error('A demo entity id is required');
	}
	const value = String(id);
	return value.startsWith(DEMO_PREFIX) ? value : `${DEMO_PREFIX}${value}`;
}

export function rawDemoId(id) {
	const value = String(id || '');
	return value.startsWith(DEMO_PREFIX) ? value.slice(DEMO_PREFIX.length) : value;
}

export function isDemoId(id) {
	return String(id || '').startsWith(DEMO_PREFIX);
}

function timestampOf(value) {
	const parsed = new Date(value || 0).getTime();
	return Number.isFinite(parsed) ? parsed : 0;
}

function itemTime(item) {
	return timestampOf(
		item?.providerTimestamp ||
			item?.timestamp ||
			item?.lastMessage?.providerTimestamp ||
			item?.lastMessage?.timestamp ||
			item?.lastMessageAt ||
			item?.lastActivityAt ||
			item?.created_at ||
			item?.createdAt,
	);
}

export function sortEffectiveConversations(conversations) {
	return [...(conversations || [])].sort((a, b) => {
		if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
		const timeDifference = itemTime(b) - itemTime(a);
		if (timeDifference) return timeDifference;
		return String(a.id).localeCompare(String(b.id));
	});
}

export function sortEffectiveMessages(messages) {
	return [...(messages || [])].sort((a, b) => {
		const timeDifference = itemTime(a) - itemTime(b);
		if (timeDifference) return timeDifference;
		return String(a.id).localeCompare(String(b.id));
	});
}

function normalizeContact(contact = {}) {
	return {
		...contact,
		id: contact.id ? namespaceDemoId(contact.id) : undefined,
		name: contact.name || contact.displayName || contact.pushName || contact.phone || '',
		phone: contact.phone || contact.waId || contact.number || '',
		avatarUrl: contact.avatarUrl || contact.avatar_url || '',
		sourceType: 'demo',
	};
}

function normalizeMessage(message = {}, sourceType = 'demo') {
	const createdAt =
		message.providerTimestamp ||
		message.timestamp ||
		message.created_at ||
		message.createdAt ||
		new Date().toISOString();
	return {
		...message,
		id: namespaceDemoId(message.id),
		rawDemoId: rawDemoId(message.id),
		type: message.type || 'text',
		text: message.text || message.body || '',
		direction: message.direction === 'inbound' ? 'inbound' : 'outbound',
		status: message.status || (message.direction === 'inbound' ? 'read' : 'sent'),
		providerTimestamp: createdAt,
		created_at: message.created_at || message.createdAt || createdAt,
		attachments: Array.isArray(message.attachments)
			? message.attachments.map(attachment => ({
					...attachment,
					id: namespaceDemoId(attachment.id),
					rawDemoId: rawDemoId(attachment.id),
					type: attachment.type || attachment.kind,
					demoAttachment: true,
				}))
			: [],
		sourceType,
	};
}

function latestMessage(messages) {
	return sortEffectiveMessages(messages)[messages.length - 1] || null;
}

function runtimeFor(runtime, conversationId) {
	return runtime?.conversations?.[String(conversationId)] || {};
}

function messagesFor(demoState, conversationId) {
	const rawId = rawDemoId(conversationId);
	const source = demoState?.messagesByConversation?.[rawId];
	return Array.isArray(source) ? source : [];
}

function contactFor(demoState, conversation) {
	const contactId = String(conversation.contactId || conversation.contact_id || '');
	const stateContact =
		(demoState?.contacts || []).find(contact => String(contact.id) === contactId) || {};
	return conversation.contact
		? {
				...stateContact,
				...conversation.contact,
				avatarUrl:
					stateContact.avatarUrl ||
					conversation.contact.avatarUrl ||
					conversation.contact.avatar_url,
			}
		: stateContact;
}

function normalizeDemoConversation(conversation, demoState, runtime) {
	const rawId = rawDemoId(conversation.id);
	const persistedMessages = messagesFor(demoState, rawId);
	const runtimeState = runtimeFor(runtime, rawId);
	const allMessages = [
		...persistedMessages,
		...(Array.isArray(runtimeState.messages) ? runtimeState.messages : []),
	].map(message => normalizeMessage(message, 'demo'));
	const lastMessage = latestMessage(allMessages);
	const contact = normalizeContact(contactFor(demoState, conversation));
	return {
		...conversation,
		id: namespaceDemoId(rawId),
		rawDemoId: rawId,
		sourceType: 'demo',
		effectiveSource: 'demo',
		type: conversation.type || 'direct',
		contact,
		contactId: contact.id,
		isPinned: Boolean(conversation.isPinned ?? conversation.pinned),
		isArchived: Boolean(conversation.isArchived ?? conversation.archived),
		mutedUntil: conversation.mutedUntil || null,
		lastMessage: lastMessage || (conversation.lastMessage ? normalizeMessage(conversation.lastMessage) : null),
		lastMessageAt:
			runtimeState.preserveOrder
				? conversation.lastMessageAt ||
					conversation.lastActivityAt ||
					conversation.updatedAt ||
					conversation.createdAt
				: runtimeState.lastMessageAt ||
					lastMessage?.providerTimestamp ||
					lastMessage?.timestamp ||
					conversation.lastMessageAt ||
					conversation.lastActivityAt ||
					conversation.updatedAt ||
					conversation.createdAt,
		unreadCount:
			runtimeState.unreadCount ??
			Math.max(0, Number(conversation.unreadCount ?? conversation.unread_count) || 0),
		isTyping: Boolean(
			runtimeState.typing ??
				conversation.isTyping ??
				conversation.typing ??
				contact.presenceStatus === 'typing',
		),
		isRecording: Boolean(
			runtimeState.recording ??
				conversation.isRecording ??
				contact.presenceStatus === 'recording',
		),
	};
}

function realOverlayTarget(conversation) {
	return String(
		conversation.realConversationId ||
			conversation.targetConversationId ||
			conversation.externalConversationId ||
			conversation.real_conversation_id ||
			'',
	);
}

function sourceTypeOf(conversation) {
	return conversation?.sourceType || conversation?.source_type || 'demo';
}

function applyRealOverlay(realConversation, overlay, demoState, runtime) {
	const rawOverlayId = rawDemoId(overlay.id);
	const overlayRuntime = runtimeFor(runtime, rawOverlayId);
	const realTargetRuntime = runtimeFor(runtime, realConversation.id);
	const runtimeState = {
		...realTargetRuntime,
		...overlayRuntime,
		messages: [
			...(Array.isArray(realTargetRuntime.messages) ? realTargetRuntime.messages : []),
			...(Array.isArray(overlayRuntime.messages) ? overlayRuntime.messages : []),
		],
	};
	const persistedMessages = messagesFor(demoState, rawOverlayId);
	const runtimeMessages = Array.isArray(runtimeState.messages) ? runtimeState.messages : [];
	const overlayMessages = [...persistedMessages, ...runtimeMessages].map(message =>
		normalizeMessage(message, 'real_overlay'),
	);
	const lastMessage =
		latestMessage(overlayMessages) ||
		(overlay.lastMessage ? normalizeMessage(overlay.lastMessage, 'real_overlay') : null);
	return {
		...realConversation,
		contact: realConversation.contact ? { ...realConversation.contact } : realConversation.contact,
		sourceType: 'real_overlay',
		effectiveSource: 'real_overlay',
		demoOverlayId: rawOverlayId,
		isPinned: Boolean(overlay.isPinned ?? overlay.pinned ?? realConversation.isPinned),
		isArchived: Boolean(
			overlay.isArchived ?? overlay.archived ?? realConversation.isArchived,
		),
		mutedUntil: overlay.mutedUntil ?? realConversation.mutedUntil,
		lastMessage: lastMessage || (realConversation.lastMessage ? { ...realConversation.lastMessage } : null),
		lastMessageAt:
			runtimeState.preserveOrder
				? realConversation.lastMessageAt
				: runtimeState.lastMessageAt ||
					lastMessage?.providerTimestamp ||
					overlay.lastMessageAt ||
					overlay.lastActivityAt ||
					realConversation.lastMessageAt,
		unreadCount:
			runtimeState.unreadCount ??
			overlay.unreadCount ??
			realConversation.unreadCount ??
			0,
		isTyping: Boolean(runtimeState.typing ?? overlay.isTyping ?? overlay.typing),
		isRecording: Boolean(runtimeState.recording ?? overlay.isRecording),
	};
}

export function buildEffectiveConversations({
	realConversations = [],
	demoState,
	runtime,
	enabled = false,
	featureFlags = {},
}) {
	if (!enabled) return realConversations;

	const overlays = (demoState?.conversations || []).filter(
		conversation => sourceTypeOf(conversation) === 'real_overlay',
	).filter(() => featureFlags.overlayRealChats !== false);
	const overlayByTarget = new Map(
		overlays.map(overlay => [realOverlayTarget(overlay), overlay]).filter(([id]) => id),
	);
	const effectiveReal = realConversations.map(conversation => {
		const overlay = overlayByTarget.get(String(conversation.id));
		return overlay
			? applyRealOverlay(conversation, overlay, demoState, runtime)
			: {
					...conversation,
					contact: conversation.contact ? { ...conversation.contact } : conversation.contact,
					sourceType: 'real',
					effectiveSource: 'real',
				};
	});
	const fake = (demoState?.conversations || [])
		.filter(conversation => sourceTypeOf(conversation) !== 'real_overlay')
		.filter(() => featureFlags.useFakeContacts !== false)
		.map(conversation => normalizeDemoConversation(conversation, demoState, runtime));
	return sortEffectiveConversations([...effectiveReal, ...fake]);
}

export function buildEffectiveMessages({
	realMessages = [],
	selectedConversation,
	demoState,
	runtime,
	enabled = false,
}) {
	if (!enabled || !selectedConversation) return realMessages;
	const source = selectedConversation.effectiveSource || selectedConversation.sourceType;
	if (source === 'demo') {
		const rawId = selectedConversation.rawDemoId || rawDemoId(selectedConversation.id);
		const state = runtimeFor(runtime, rawId);
		return sortEffectiveMessages([
			...messagesFor(demoState, rawId),
			...(Array.isArray(state.messages) ? state.messages : []),
		].map(message => normalizeMessage(message, 'demo')));
	}
	if (source === 'real_overlay') {
		const overlayId = selectedConversation.demoOverlayId;
		const overlayState = runtimeFor(runtime, overlayId);
		const realTargetState = runtimeFor(runtime, selectedConversation.id);
		const overlayMessages = [
			...messagesFor(demoState, overlayId),
			...(Array.isArray(realTargetState.messages) ? realTargetState.messages : []),
			...(Array.isArray(overlayState.messages) ? overlayState.messages : []),
		].map(message => normalizeMessage(message, 'real_overlay'));
		return sortEffectiveMessages([
			...realMessages.map(message => ({
				...message,
				attachments: Array.isArray(message.attachments)
					? message.attachments.map(attachment => ({ ...attachment }))
					: message.attachments,
				sourceType: 'real',
			})),
			...overlayMessages,
		]);
	}
	return realMessages;
}

export function resolveConversationSource(conversation) {
	if (!conversation) return 'unknown';
	return conversation.effectiveSource || conversation.sourceType || 'unknown';
}
