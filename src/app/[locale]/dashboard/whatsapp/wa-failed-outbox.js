/**
 * Failed outbound text sends, kept across reloads so a dropped network call
 * leaves a retryable bubble instead of silently losing what the agent typed.
 * Media is not stored here: a File cannot be persisted cheaply.
 */

const STORAGE_KEY = 'so7ba-wa-failed-outbox-v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_PER_CONVERSATION = 50;
const MAX_CONVERSATIONS = 200;
/**
 * A send can fail client-side (timeout) yet land on WhatsApp. A delivered
 * outbound row with the same text this close to the failed one wins.
 */
const DELIVERED_MATCH_WINDOW_MS = 5 * 60_000;

/**
 * Automatic resend of a failed text. Safe because the backend dedupes sends by
 * clientMessageId for 15 minutes; the whole schedule fits well inside that.
 */
const AUTO_RETRY_DELAYS_MS = [2_000, 5_000, 12_000];

export function autoRetryDelayMs(attempt) {
	return AUTO_RETRY_DELAYS_MS[attempt] ?? null;
}

/** Only transient failures: no response (network/timeout), 408, 429, 5xx. */
export function isTransientSendError(error) {
	if (!error || error.code === 'ERR_CANCELED') return false;
	const status = Number(error.response?.status || 0);
	if (!status) return true;
	return status === 408 || status === 429 || status >= 500;
}

function defaultStorage() {
	try {
		return typeof window !== 'undefined' ? window.localStorage : null;
	} catch {
		return null;
	}
}

function readOutbox(storage) {
	if (!storage) return {};
	try {
		const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function writeOutbox(storage, outbox) {
	if (!storage) return false;
	try {
		const conversationIds = Object.keys(outbox).filter(id => outbox[id]?.length);
		if (!conversationIds.length) {
			storage.removeItem(STORAGE_KEY);
			return true;
		}
		const compact = {};
		for (const id of conversationIds.slice(-MAX_CONVERSATIONS)) compact[id] = outbox[id];
		storage.setItem(STORAGE_KEY, JSON.stringify(compact));
		return true;
	} catch {
		return false;
	}
}

function timestampMs(message) {
	const value = Date.parse(message?.providerTimestamp || message?.created_at || '');
	return Number.isFinite(value) ? value : 0;
}

function isFresh(row, now) {
	const at = timestampMs(row);
	return at > 0 && now - at <= MAX_AGE_MS;
}

function isStorableFailedText(message) {
	return Boolean(
		message?.conversationId &&
			message.clientMessageId &&
			String(message.direction || '').toLowerCase() === 'outbound' &&
			String(message.type || 'text').toLowerCase() === 'text' &&
			String(message.text || '').trim(),
	);
}

function toOutboxRow(message) {
	return {
		id: message.id || `pending:${message.clientMessageId}`,
		conversationId: message.conversationId,
		clientMessageId: message.clientMessageId,
		type: 'text',
		text: message.text,
		direction: 'outbound',
		status: 'failed',
		optimistic: false,
		providerTimestamp: message.providerTimestamp || message.created_at || new Date().toISOString(),
		created_at: message.created_at || message.providerTimestamp || new Date().toISOString(),
		quotedProviderMessageId: message.quotedProviderMessageId || null,
		replyTo: message.replyTo || null,
	};
}

export function rememberFailedOutbound(message, storage = defaultStorage(), now = Date.now()) {
	if (!isStorableFailedText(message)) return false;
	const outbox = readOutbox(storage);
	const row = toOutboxRow(message);
	const rows = (outbox[row.conversationId] || []).filter(
		item => item?.clientMessageId !== row.clientMessageId && isFresh(item, now),
	);
	rows.push(row);
	delete outbox[row.conversationId];
	outbox[row.conversationId] = rows.slice(-MAX_PER_CONVERSATION);
	return writeOutbox(storage, outbox);
}

export function forgetFailedOutbound(conversationId, clientMessageId, storage = defaultStorage()) {
	if (!conversationId || !clientMessageId) return false;
	const outbox = readOutbox(storage);
	const rows = outbox[conversationId];
	if (!rows?.length) return false;
	const next = rows.filter(item => item?.clientMessageId !== clientMessageId);
	if (next.length === rows.length) return false;
	outbox[conversationId] = next;
	return writeOutbox(storage, outbox);
}

function isDeliveredCopy(row, item) {
	if (!item || item.status === 'failed') return false;
	if (String(item.direction || '').toLowerCase() !== 'outbound') return false;
	if (String(item.text || '').trim() !== String(row.text || '').trim()) return false;
	const itemAt = timestampMs(item);
	return itemAt > 0 && Math.abs(itemAt - timestampMs(row)) <= DELIVERED_MATCH_WINDOW_MS;
}

/**
 * Failed rows to show next to a freshly loaded page. Rows the page already
 * covers (same clientMessageId or a delivered copy) are dropped from storage.
 */
export function restoreFailedOutbound(
	items,
	conversationId,
	storage = defaultStorage(),
	now = Date.now(),
) {
	if (!conversationId) return [];
	const outbox = readOutbox(storage);
	const rows = outbox[conversationId];
	if (!rows?.length) return [];
	const loaded = Array.isArray(items) ? items : [];
	const loadedClientIds = new Set(
		loaded.map(item => item?.clientMessageId).filter(Boolean),
	);
	const keep = [];
	for (const row of rows) {
		if (!row?.clientMessageId || !isFresh(row, now)) continue;
		if (loaded.some(item => item?.clientMessageId === row.clientMessageId && item.status !== 'failed')) {
			continue;
		}
		if (loaded.some(item => isDeliveredCopy(row, item))) continue;
		keep.push(row);
	}
	if (keep.length !== rows.length) {
		outbox[conversationId] = keep;
		writeOutbox(storage, outbox);
	}
	return keep.filter(row => !loadedClientIds.has(row.clientMessageId));
}
