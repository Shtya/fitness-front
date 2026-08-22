import {
	findVoiceAttachment,
	isVoiceMessage,
	timestampMs,
} from '../../transcript/transcription-client';

const VOICE_DURATION_RE = /voice-(\d+(?:\.\d+)?)s/i;

function normalizeDurationSeconds(value) {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0) return 0;
	// WhatsApp voice notes are seconds; large values are usually milliseconds.
	if (num > 600 && num < 3_600_000) return Math.round(num / 1000);
	return num;
}

function readRawVoiceDuration(raw) {
	if (!raw || typeof raw !== 'object') return 0;
	const candidates = [
		raw.duration,
		raw.mediaData?.duration,
		raw.message?.audioMessage?.seconds,
		raw.message?.audioMessage?.duration,
		raw.message?.pttMessage?.seconds,
		raw.audioMessage?.seconds,
		raw.audioMessage?.duration,
	];
	for (const value of candidates) {
		const normalized = normalizeDurationSeconds(value);
		if (normalized > 0) return normalized;
	}
	return 0;
}

export function voiceDurationSeconds(message) {
	const attachment = findVoiceAttachment(message);
	const fromName = voiceDurationFromFileName(attachment?.fileName);
	if (fromName > 0) return fromName;

	const fromAttachment = normalizeDurationSeconds(
		attachment?.durationSeconds ??
			attachment?.duration ??
			(Number(attachment?.durationMs) > 0 ? Number(attachment.durationMs) / 1000 : 0),
	);
	if (fromAttachment > 0) return fromAttachment;

	const fromMessage = normalizeDurationSeconds(message?.duration);
	if (fromMessage > 0) return fromMessage;

	const fromRaw = readRawVoiceDuration(message?.raw);
	if (fromRaw > 0) return fromRaw;

	return 0;
}

export function voiceDurationFromFileName(fileName) {
	const match = String(fileName || '').match(VOICE_DURATION_RE);
	if (!match) return 0;
	const value = Number(match[1]);
	return Number.isFinite(value) && value > 0 ? value : 0;
}

export function isInboundVoiceMessage(message) {
	return String(message?.direction || '').toLowerCase() === 'inbound';
}

export function getCloneVoiceMediaState(message, { whatsAppConnected = true } = {}) {
	const attachment = findVoiceAttachment(message);
	if (!attachment?.id) return 'unavailable';
	const status = String(attachment.downloadStatus || 'pending').toLowerCase();
	if (status === 'downloaded') return 'ready';
	if (status === 'failed') return 'unavailable';
	if (status === 'downloading') return 'checking';
	if (!whatsAppConnected) return 'waiting_whatsapp';
	return 'pending';
}

export function isCloneVoiceMediaSelectable(message, options = {}) {
	return getCloneVoiceMediaState(message, options) === 'ready';
}

export function isUsableCloneVoiceMessage(message) {
	if (!message || message.optimistic) return false;
	if (message.deletedMode && message.deletedMode !== 'none') return false;
	if (!isVoiceMessage(message)) return false;
	const attachment = findVoiceAttachment(message);
	return Boolean(attachment?.id);
}

export function summarizeCloneVoiceScan(messages, options = {}) {
	const inboundOnly = options.inboundOnly !== false;
	const list = Array.isArray(messages) ? messages : [];
	let totalVoices = 0;
	let inboundVoices = 0;
	let outboundVoices = 0;
	for (const message of list) {
		if (!isVoiceMessage(message)) continue;
		totalVoices += 1;
		if (isInboundVoiceMessage(message)) inboundVoices += 1;
		else outboundVoices += 1;
	}
	const contactVoices = inboundOnly
		? extractCloneVoiceCandidates(list, { inboundOnly: true }).length
		: extractCloneVoiceCandidates(list, { inboundOnly: false }).length;
	return {
		scannedMessages: list.length,
		totalVoices,
		inboundVoices,
		outboundVoices,
		contactVoices,
	};
}

export const CLONE_VOICE_HISTORY_PAGE_SIZE = 100;
export const CLONE_VOICE_HISTORY_MAX_PAGES = 50;

export function extractCloneVoiceCandidates(messages, options = {}) {
	const inboundOnly = options.inboundOnly !== false;
	const seen = new Set();
	return (Array.isArray(messages) ? messages : [])
		.filter(isUsableCloneVoiceMessage)
		.filter(message => !inboundOnly || isInboundVoiceMessage(message))
		.map(message => {
			const attachment = findVoiceAttachment(message);
			const durationSec = voiceDurationSeconds(message);
			const analysis = scoreCloneVoiceSample({ durationSec, inbound: isInboundVoiceMessage(message) });
			const mediaState = getCloneVoiceMediaState(message, options);
			const mediaReady = isCloneVoiceMediaSelectable(message, options);
			return {
				id: String(message.id),
				message,
				attachment,
				durationSec,
				inbound: isInboundVoiceMessage(message),
				timestamp: message?.providerTimestamp || message?.timestamp || message?.created_at,
				mediaState,
				mediaReady,
				...analysis,
			};
		})
		.filter(item => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		})
		.sort((left, right) => {
			if (right.score !== left.score) return right.score - left.score;
			return timestampMs(right.timestamp) - timestampMs(left.timestamp);
		});
}

/**
 * Scores a voice note for clone sampling based on Fish Audio / MiniMax guidance:
 * ~12–25s clean speech from the contact is ideal.
 */
export function scoreCloneVoiceSample({ durationSec = 0, inbound = false } = {}) {
	let score = 0;
	const reasonsEn = [];
	const reasonsAr = [];

	if (inbound) {
		score += 35;
		reasonsEn.push('from contact');
		reasonsAr.push('من العميل');
	} else {
		score += 5;
	}

	if (durationSec >= 12 && durationSec <= 25) {
		score += 45;
		reasonsEn.push('12–25s');
		reasonsAr.push('12–25 ثانية');
	} else if (durationSec >= 10 && durationSec <= 30) {
		score += 28;
		reasonsEn.push('10–30s');
		reasonsAr.push('10–30 ثانية');
	} else if (durationSec >= 8 && durationSec < 10) {
		score += 12;
		reasonsEn.push('a bit short');
		reasonsAr.push('قصير شوية');
	} else if (durationSec > 30 && durationSec <= 45) {
		score += 10;
		reasonsEn.push('long — trim silence');
		reasonsAr.push('طويل — قص الصمت');
	} else if (durationSec > 0 && durationSec < 8) {
		score -= 15;
		reasonsEn.push('too short');
		reasonsAr.push('قصير جداً');
	} else if (durationSec > 60) {
		score -= 10;
		reasonsEn.push('very long');
		reasonsAr.push('طويل جداً');
	}

	const recommended = score >= 55;
	return {
		score,
		recommended,
		reasonEn: reasonsEn.join(' · ') || (recommended ? 'good sample' : ''),
		reasonAr: reasonsAr.join(' · ') || (recommended ? 'عيّنة مناسبة' : ''),
	};
}

/**
 * Walks conversation history (newest page first, then older) until pages are exhausted.
 */
export async function loadConversationHistoryForClone({
	conversationId,
	fetchPage,
	syncOlderPage,
	primeSync,
	mergePage,
	pageSize = CLONE_VOICE_HISTORY_PAGE_SIZE,
	maxPages = CLONE_VOICE_HISTORY_MAX_PAGES,
} = {}) {
	if (!conversationId || typeof fetchPage !== 'function') return [];
	let items = [];
	let before;
	let pages = 0;
	let providerHasMore = false;

	const appendSynced = synced => {
		if (!synced) return;
		const syncedItems = Array.isArray(synced) ? synced : synced?.items || [];
		if (typeof synced?.hasMore === 'boolean') providerHasMore = synced.hasMore;
		if (!syncedItems.length) return;
		items =
			typeof mergePage === 'function'
				? mergePage(syncedItems, items, conversationId)
				: [...syncedItems, ...items];
	};

	if (typeof primeSync === 'function') {
		try {
			appendSynced(await primeSync({ conversationId, limit: pageSize }));
		} catch {
			/* keep going with DB pages */
		}
	}

	while (pages < maxPages) {
		let page = await fetchPage({ conversationId, before, limit: pageSize });
		if (!Array.isArray(page)) page = [];

		const shouldSyncOlder =
			typeof syncOlderPage === 'function' &&
			(page.length === 0 || page.length < pageSize || providerHasMore);

		if (shouldSyncOlder) {
			try {
				const synced = await syncOlderPage({ conversationId, limit: pageSize });
				const syncedItems = Array.isArray(synced) ? synced : synced?.items || [];
				if (typeof synced?.hasMore === 'boolean') {
					providerHasMore = synced.hasMore;
				} else if (!syncedItems.length) {
					providerHasMore = false;
				}
				if (syncedItems.length) {
					page =
						typeof mergePage === 'function'
							? mergePage(syncedItems, page, conversationId)
							: [...syncedItems, ...page];
					const refreshed = await fetchPage({ conversationId, before, limit: pageSize });
					if (Array.isArray(refreshed) && refreshed.length > page.length) {
						page = refreshed;
					}
				}
			} catch {
				providerHasMore = false;
			}
		}

		if (!page.length) break;

		items =
			typeof mergePage === 'function'
				? mergePage(page, items, conversationId)
				: [...page, ...items];
		before = items[0]?.id;
		pages += 1;

		const dbHasMore = page.length >= pageSize;
		if (!dbHasMore && !providerHasMore) break;
	}

	return items;
}

/** Loads the next batch of history on top of existing messages (mirrors chat loadOlder). */
export async function loadMoreConversationHistoryForClone({
	conversationId,
	existingItems = [],
	before,
	providerHasMore = true,
	fetchPage,
	syncOlderPage,
	mergePage,
	pageSize = CLONE_VOICE_HISTORY_PAGE_SIZE,
	maxRounds = 12,
} = {}) {
	if (!conversationId || typeof fetchPage !== 'function') {
		return {
			messages: existingItems,
			before: before || existingItems[0]?.id || null,
			hasMore: false,
			providerHasMore: false,
			addedMessages: 0,
		};
	}

	let items = Array.isArray(existingItems) ? existingItems : [];
	let cursor = before || items[0]?.id || null;
	let nextProviderHasMore = providerHasMore !== false;
	let addedMessages = 0;
	let lastIncomingCount = 0;

	for (let round = 0; round < maxRounds; round += 1) {
		let local = await fetchPage({ conversationId, before: cursor, limit: pageSize });
		if (!Array.isArray(local)) local = [];

		let providerItems = [];
		if (
			typeof syncOlderPage === 'function' &&
			canUseWhatsAppSyncGate(local.length, pageSize)
		) {
			try {
				const synced = await syncOlderPage({ conversationId, limit: pageSize });
				providerItems = Array.isArray(synced) ? synced : synced?.items || [];
				if (typeof synced?.hasMore === 'boolean') {
					nextProviderHasMore = synced.hasMore;
				} else if (!providerItems.length) {
					nextProviderHasMore = false;
				}
			} catch {
				nextProviderHasMore = false;
			}
		}

		const incoming = [...local, ...providerItems];
		lastIncomingCount = incoming.length;
		if (!incoming.length) break;

		const previousCount = items.length;
		items =
			typeof mergePage === 'function'
				? mergePage(incoming, items, conversationId)
				: [...incoming, ...items];
		addedMessages += Math.max(0, items.length - previousCount);
		cursor = items[0]?.id || cursor;

		const dbHasMore = local.length >= pageSize;
		if (!dbHasMore && !nextProviderHasMore) break;
		if (incoming.length < pageSize && !nextProviderHasMore) break;
	}

	const dbHasMore = lastIncomingCount >= pageSize;
	return {
		messages: items,
		before: cursor,
		hasMore: dbHasMore || nextProviderHasMore,
		providerHasMore: nextProviderHasMore,
		addedMessages,
	};
}

function canUseWhatsAppSyncGate(localCount, pageSize) {
	// Match chat loadOlder: only ask WhatsApp Web when the DB page is short.
	return localCount < pageSize;
}

export function formatVoiceClock(seconds) {
	const value = Math.max(0, Math.floor(Number(seconds) || 0));
	if (!Number.isFinite(value)) return '0:00';
	const m = Math.floor(value / 60);
	const s = value % 60;
	return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}
