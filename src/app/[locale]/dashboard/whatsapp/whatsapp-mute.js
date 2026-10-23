/** Mute rules shared by the chat list and the in-page notifications. */

export function isConversationActivelyMuted(conversation, now = Date.now()) {
	if (!conversation?.isMuted) return false;
	if (!conversation.mutedUntil) return true;
	const until = new Date(conversation.mutedUntil).getTime();
	return !Number.isFinite(until) || until > now;
}

/**
 * Notify-state for chats that are not in the loaded list (another page of chats, a filter, the
 * archive). Without it an unknown chat looked "not muted" and a muted group still rang.
 * `fetchState(conversationId)` resolves to `{ isMuted, notificationsEnabled }`.
 */
export function createNotifyStateCache(fetchState, ttlMs = 60_000) {
	const entries = new Map();
	return {
		async get(conversationId, now = Date.now()) {
			const key = String(conversationId || '');
			if (!key) return null;
			const hit = entries.get(key);
			if (hit && now - hit.at < ttlMs) return hit.promise;
			const promise = Promise.resolve(fetchState(key)).catch(() => null);
			entries.set(key, { at: now, promise });
			const state = await promise;
			if (!state) entries.delete(key);
			return state;
		},
		set(conversationId, state, now = Date.now()) {
			entries.set(String(conversationId), { at: now, promise: Promise.resolve(state) });
		},
		clear() {
			entries.clear();
		},
	};
}

/**
 * Whether an inbound message should raise a page notification. A known chat uses its own mute
 * (with expiry); an unknown one asks the server. When in doubt (lookup failed) stay quiet.
 */
export async function shouldNotifyForConversation(peer, conversationId, cache, now = Date.now()) {
	if (peer) return !isConversationActivelyMuted(peer, now);
	const state = await cache.get(conversationId, now);
	return Boolean(state && !state.isMuted && state.notificationsEnabled !== false);
}
