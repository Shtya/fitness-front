/**
 * Chat directory: every chat's name, number and photo, kept on this device so chat search finds
 * anyone at once — not only the chats the list has loaded so far. The first visit fetches the
 * whole directory once; after that only what changed since the last fetch (deleted chats too).
 * Stored per account in localStorage (a few hundred KB for thousands of chats).
 */
import { conversationTitle, foldWhatsAppSearchText } from '../whatsapp-utils.js';

const STORAGE_PREFIX = 'wa-chat-directory:v1:';
/** Refetch the changes at most this often while the page is open. */
export const DIRECTORY_REFRESH_MS = 2 * 60_000;

function storage() {
	try {
		return typeof window !== 'undefined' ? window.localStorage : null;
	} catch {
		return null;
	}
}

export function readStoredDirectory(accountId) {
	if (!accountId) return null;
	try {
		const raw = storage()?.getItem(STORAGE_PREFIX + accountId);
		const parsed = raw ? JSON.parse(raw) : null;
		return parsed && Array.isArray(parsed.items) ? parsed : null;
	} catch {
		return null;
	}
}

function writeStoredDirectory(accountId, value) {
	try {
		storage()?.setItem(STORAGE_PREFIX + accountId, JSON.stringify(value));
	} catch {
		// Quota or private mode: the directory still works for this page, from memory.
	}
}

/** Apply a server answer to the stored list: a full answer replaces it, a delta merges in. */
export function applyDirectoryResponse(previous, response) {
	const incoming = Array.isArray(response?.items) ? response.items : [];
	const byId = new Map(response?.full || !previous ? [] : previous.items.map(item => [item.id, item]));
	for (const item of incoming) {
		if (!item?.id) continue;
		if (item.deleted) byId.delete(item.id);
		else byId.set(item.id, item);
	}
	return { serverTime: response?.serverTime || previous?.serverTime || null, items: [...byId.values()] };
}

/** Fetch what changed (or everything the first time), store it, and return the full list. */
export async function syncChatDirectory(accountId, api) {
	const previous = readStoredDirectory(accountId);
	const { data } = await api.get(`/whatsapp/accounts/${accountId}/conversations/directory`, {
		params: previous?.serverTime ? { updatedSince: previous.serverTime } : {},
		timeout: 60_000,
	});
	const next = applyDirectoryResponse(previous, data);
	writeStoredDirectory(accountId, next);
	return next;
}

/** Each entry with its searchable text worked out once (names folded for Arabic, digits). */
export function indexChatDirectory(items) {
	return (items || []).map(item => {
		const title = conversationTitle(item);
		return {
			item,
			title,
			names: foldWhatsAppSearchText([title, item.contact?.name, item.group?.subject].filter(Boolean).join(' ')),
			digits: String(item.contact?.phoneNumber || item.providerChatId || '').replace(/\D/g, ''),
			at: item.lastMessageAt ? new Date(item.lastMessageAt).getTime() : 0,
		};
	});
}

/**
 * Directory entries matching the search, best first: names starting with it, then containing
 * it, then by last activity. `excludeIds`: chats already shown from the list.
 */
export function searchChatDirectory(index, query, { excludeIds = new Set(), limit = 60 } = {}) {
	const q = foldWhatsAppSearchText(query);
	const qDigits = String(query || '').replace(/\D/g, '');
	if (!q && qDigits.length < 3) return [];
	const hits = [];
	for (const entry of index || []) {
		if (excludeIds.has(entry.item.id)) continue;
		const nameAt = q ? entry.names.indexOf(q) : -1;
		const byPhone = qDigits.length >= 3 && entry.digits.includes(qDigits);
		if (nameAt < 0 && !byPhone) continue;
		const startsWord = nameAt === 0 || (nameAt > 0 && entry.names[nameAt - 1] === ' ');
		hits.push({ entry, rank: startsWord ? 0 : nameAt >= 0 ? 1 : 2 });
	}
	hits.sort((a, b) => a.rank - b.rank || b.entry.at - a.entry.at);
	return hits.slice(0, limit).map(hit => hit.entry.item);
}

/** A directory entry shaped like a list row (no last message: the row shows name and photo). */
export function directoryRowConversation(item) {
	return {
		...item,
		unreadCount: 0,
		lastMessage: null,
		fromDirectory: true,
	};
}
