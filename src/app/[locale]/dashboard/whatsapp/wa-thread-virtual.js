export const MESSAGE_ROW_GAP = 12;

export function estimateMessageRowSize(row) {
	if (!row) return 72 + MESSAGE_ROW_GAP;
	if (row.kind === 'image-gallery') {
		const count = Array.isArray(row.attachments) ? row.attachments.length : 1;
		if (count <= 1) return 280 + MESSAGE_ROW_GAP;
		if (count === 2) return 176 + MESSAGE_ROW_GAP;
		return 248 + MESSAGE_ROW_GAP;
	}
	const message = row.message || {};
	const types = (message.attachments || []).map(item =>
		String(item?.type || '').toLowerCase(),
	);
	if (types.includes('video') || String(message.type || '').toLowerCase() === 'video') {
		return 320 + MESSAGE_ROW_GAP;
	}
	if (
		types.some(type => ['audio', 'ptt', 'voice'].includes(type)) ||
		['audio', 'ptt', 'voice'].includes(String(message.type || '').toLowerCase())
	) {
		return 78 + MESSAGE_ROW_GAP;
	}
	if (types.every(type => type === 'sticker') && types.length) return 160 + MESSAGE_ROW_GAP;
	if (types.includes('image') || types.includes('sticker')) return 280 + MESSAGE_ROW_GAP;
	const text = String(message.text || '');
	if (!text.trim()) return 56 + MESSAGE_ROW_GAP;
	const lines = Math.max(1, Math.ceil(text.length / 46));
	return Math.min(280, 52 + Math.min(lines, 10) * 20) + MESSAGE_ROW_GAP;
}

export function messageRowKey(row, index = 0) {
	return String(row?.key || row?.message?.id || row?.message?.clientMessageId || index);
}
