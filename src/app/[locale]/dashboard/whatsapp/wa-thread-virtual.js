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

export function messageRowKey(row) {
	if (!row) return 'unknown-row';
	if (row.key) return String(row.key);
	if (row.kind === 'image-gallery') {
		const first = row.messages?.[0]?.id || row.messages?.[0]?.clientMessageId;
		const last = row.messages?.[row.messages.length - 1]?.id;
		if (first && last && first !== last) return `${first}:${last}`;
		if (first) return String(first);
	}
	const message = row.message;
	if (message?.id) return String(message.id);
	if (message?.clientMessageId) return String(message.clientMessageId);
	return 'unknown-row';
}

/** Sum estimated heights for rows prepended at the top of the thread. */
export function estimatePrependedThreadHeight(rows = [], addedRowCount = 0) {
	const count = Math.max(0, Number(addedRowCount) || 0);
	if (!count || !Array.isArray(rows) || !rows.length) return 0;
	let total = 0;
	for (let i = 0; i < Math.min(count, rows.length); i += 1) {
		total += estimateMessageRowSize(rows[i]);
	}
	return total;
}

/**
 * Layout-aware estimate for a text row, calibrated against the rendered thread.
 *
 * The virtualizer compensates every mis-estimated row above the viewport with a
 * programmatic scrollTo when that row is first measured. The flat estimate above
 * over-shot plain text rows by 34–44px, so scrolling up fired a scrollTo for almost
 * every row, which cancels wheel/momentum scrolling and feels like the thread
 * pulling the reader back down. Returns null when the row is not plain text, so the
 * caller keeps the fixed media estimate.
 *
 * layout: { textMaxWidth, lineHeight, bubbleChrome, metaWidthMine, metaWidthOther,
 *           metaLineHeight, measureText(text, rtl) -> px }
 * context: { startsNewDay, precedesSame, showsSenderName }
 * sizes:   { dateSeparator, groupGap, clusterGap, reactionsExtra, linkPreview,
 *           replyQuote, replyQuoteLine, senderName }
 */
export const THREAD_ROW_EXTRAS = {
	dateSeparator: 60,
	groupGap: 12,
	clusterGap: 2,
	reactionsExtra: 10,
	linkPreview: 66,
	// Quote block with the author line and one body line (incl. its 8px margin);
	// a second clamped body line adds replyQuoteLine.
	replyQuote: 56,
	replyQuoteLine: 16,
	senderName: 20,
};

const URL_RE = /\bhttps?:\/\/\S+/i;
const ARABIC_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;

export function estimateTextRowSize(row, layout, context = {}, sizes = THREAD_ROW_EXTRAS) {
	if (!row || row.kind === 'image-gallery' || !layout) return null;
	const message = row.message || {};
	if ((message.attachments || []).length) return null;
	const type = String(message.type || 'text').toLowerCase();
	if (type && !['text', 'chat', 'extendedtext', 'conversation'].includes(type)) return null;
	const text = String(message.text || '').replace(/\u200e|\u200f/g, '');
	if (!text.trim()) return null;
	const maxWidth = Number(layout.textMaxWidth) || 0;
	const lineHeight = Number(layout.lineHeight) || 19;
	if (maxWidth < 40 || typeof layout.measureText !== 'function') return null;

	const rtl = ARABIC_RE.test(text);
	let lines = 0;
	let lastLineWidth = 0;
	for (const paragraph of text.split('\n')) {
		const width = paragraph.trim() ? Number(layout.measureText(paragraph, rtl)) || 0 : 0;
		// Word wrapping never packs a line completely; a small allowance keeps long
		// paragraphs from being under-counted by a line.
		const paragraphLines = Math.max(1, Math.ceil((width * 1.04) / maxWidth));
		lines += paragraphLines;
		lastLineWidth = width - (paragraphLines - 1) * maxWidth;
	}
	const mine = message.direction === 'outbound';
	const metaWidth = Number(mine ? layout.metaWidthMine : layout.metaWidthOther) || 0;
	// The time sits on the last line when it fits, otherwise it drops to its own line.
	const metaWraps = lastLineWidth + metaWidth > maxWidth;
	let height =
		Number(layout.bubbleChrome || 0) +
		lines * lineHeight +
		(metaWraps ? Number(layout.metaLineHeight) || 15 : 0);

	if (URL_RE.test(text)) height += sizes.linkPreview;
	if (message.replyTo) {
		height += sizes.replyQuote;
		const quoted = String(message.replyTo.text || '').trim();
		// Quote text is set at 12px (about 0.85 of the bubble font) inside 24px of chrome.
		if (quoted && Number(layout.measureText(quoted, ARABIC_RE.test(quoted))) * 0.85 > maxWidth - 24) {
			height += sizes.replyQuoteLine || 0;
		}
	}
	if (context.showsSenderName) height += sizes.senderName;
	if (context.startsNewDay) height += sizes.dateSeparator;
	const hasReactions = Array.isArray(message.reactions) && message.reactions.length > 0;
	// The reactions chip hangs below the bubble; its row reserves a fixed 22px instead
	// of the usual run/turn gap.
	height += hasReactions
		? sizes.groupGap + sizes.reactionsExtra
		: context.precedesSame
			? sizes.clusterGap
			: sizes.groupGap;
	return Math.round(height);
}
