/** True when a presence event would not change what the inbox row renders (event time `t` ignored). */
export function isSameConversationPresence(conversation, presence) {
	const current = conversation?.presence;
	if (!current || !presence) return false;
	return (
		Boolean(conversation.isTyping) === Boolean(presence.typing) &&
		Boolean(conversation.typing) === Boolean(presence.typing) &&
		Boolean(current.typing) === Boolean(presence.typing) &&
		Boolean(current.recording) === Boolean(presence.recording) &&
		Boolean(current.online) === Boolean(presence.online) &&
		String(current.state || '') === String(presence.state || '') &&
		String(current.senderName || '') === String(presence.senderName || '') &&
		Number(current.lastSeen || 0) === Number(presence.lastSeen || 0) &&
		Boolean(current.confirmedOffline) === Boolean(presence.confirmedOffline)
	);
}

/**
 * Keep / stamp last-online when WhatsApp omits lastSeen on unavailable.
 * If we watched them online, the moment we lose them is the last online time.
 */
export function resolvePresenceLastSeen(previousPresence, next = {}) {
	const fromPayload = Number(next.lastSeen || 0);
	if (fromPayload > 0) return fromPayload;
	const prevSeen = Number(previousPresence?.lastSeen || 0);
	if (prevSeen > 0) return prevSeen;
	const wasLive = Boolean(
		previousPresence?.online || previousPresence?.typing || previousPresence?.recording,
	);
	const nowLive = Boolean(next.online || next.typing || next.recording);
	if (wasLive && !nowLive) {
		return Number(previousPresence?.t || Date.now()) || Date.now();
	}
	return 0;
}

/**
 * Chat-header subtitle for contact presence.
 * Never invent "Offline" from a missing/expired subscription — only from explicit unavailable.
 */
export function conversationPresenceSubtitle(presence, locale = 'en', formatLastSeenFn) {
	if (!presence || typeof presence !== 'object') return null;
	const ar = String(locale).toLowerCase().startsWith('ar');
	if (presence.typing || presence.recording) return null;
	if (presence.online) {
		return { kind: 'online', text: ar ? 'متصل الآن' : 'Online' };
	}
	const lastSeen = Number(presence.lastSeen || 0);
	if (lastSeen > 0 && typeof formatLastSeenFn === 'function') {
		const text = formatLastSeenFn(lastSeen, locale);
		if (text) return { kind: 'lastSeen', text };
	}
	if (presence.confirmedOffline || presence.state === 'unavailable') {
		return { kind: 'offline', text: ar ? 'غير متصل' : 'Offline' };
	}
	return null;
}
