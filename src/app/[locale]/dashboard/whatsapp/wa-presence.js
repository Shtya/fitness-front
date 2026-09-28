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
		Number(current.lastSeen || 0) === Number(presence.lastSeen || 0)
	);
}
