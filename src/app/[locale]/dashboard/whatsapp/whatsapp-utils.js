export function mergeMessages(current = [], incoming = []) {
	const map = new Map();
	for (const item of [...current, ...incoming]) {
		map.set(item.providerMessageId || item.id, item);
	}
	return [...map.values()].sort(
		(a, b) =>
			new Date(a.providerTimestamp || a.created_at) -
			new Date(b.providerTimestamp || b.created_at),
	);
}

export function conversationTitle(conversation) {
	const raw =
		conversation?.group?.subject ||
		conversation?.contact?.name ||
		conversation?.contact?.phoneNumber ||
		conversation?.providerChatId ||
		'';
	return String(raw)
		.replace(/@(c\.us|s\.whatsapp\.net|g\.us|lid)$/i, '')
		.trim() || 'Chat';
}

export function seekRatio(clientX, left, width, isRtl = false) {
	if (!(width > 0)) return 0;
	const physicalRatio = (clientX - left) / width;
	return Math.min(1, Math.max(0, isRtl ? 1 - physicalRatio : physicalRatio));
}

export function relativeTime(dateStr, now = Date.now()) {
	if (!dateStr) return '';
	const time = new Date(dateStr).getTime();
	if (!Number.isFinite(time)) return '';
	const diff = Math.max(0, now - time);
	const min = Math.floor(diff / 60000);
	if (min < 1) return 'now';
	if (min < 60) return `${min} min`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr} hr`;
	const day = Math.floor(hr / 24);
	if (day < 30) return `${day}d`;
	const month = Math.floor(day / 30);
	if (month < 12) return `${month} mo`;
	return `${Math.floor(day / 365)}y`;
}
