/**
 * Open-chat sync / hydration policy (WhatsApp Web–like).
 *
 * Never treat “fewer than one page of messages” as “must re-sync from phone”.
 * Short threads that are already hydrated stay on Postgres + socket until stale.
 */

export const MESSAGE_PAGE_SIZE = 100;
/** Client paint / RQ reuse window for an opened thread. */
export const MESSAGES_CACHE_TTL_MS = 5 * 60_000;
/** Skip provider sync/latest while hydration watermark is this fresh. */
export const PROVIDER_SYNC_FRESH_MS = 5 * 60_000;

export function hydrationTimestampMs(value) {
	if (value == null || value === '') return 0;
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	const time = new Date(value).getTime();
	return Number.isFinite(time) ? time : 0;
}

export function isHydrationFresh(
	value,
	now = Date.now(),
	freshMs = PROVIDER_SYNC_FRESH_MS,
) {
	const at = hydrationTimestampMs(value);
	return at > 0 && now - at < freshMs;
}

/** True when the in-memory thread is safe to paint without a GET on open. */
export function isMessageThreadCacheComplete(
	cache,
	pageSize = MESSAGE_PAGE_SIZE,
) {
	const items = Array.isArray(cache?.items) ? cache.items : [];
	if (!items.length) return false;
	if (items.length >= pageSize) return true;
	// A lone inbox preview / prefetch row is not a hydrated thread.
	if (cache.hasMore === false) return items.length > 1;
	return false;
}

/** True when open-chat must hit Postgres (partial preview / IDB row is not enough). */
export function shouldReloadOpenChatMessages({
	switchedConversation = false,
	loadKey = '',
	lastOpenLoadKey = '',
	cache = null,
	pageSize = MESSAGE_PAGE_SIZE,
} = {}) {
	if (switchedConversation) return true;
	if (lastOpenLoadKey !== loadKey) return true;
	return !isMessageThreadCacheComplete(cache, pageSize);
}

/**
 * Soft-open: paint from cache and skip GET + sync when the thread is warm.
 */
export function shouldSkipOpenChatNetwork({
	cacheIsFresh = false,
	forceProvider = false,
	itemCount = 0,
	hasMore = true,
	socketHealthy = false,
	pageSize = MESSAGE_PAGE_SIZE,
} = {}) {
	if (forceProvider || itemCount <= 0) return false;
	// A lone inbox/socket row is not a hydrated thread — always fetch Postgres.
	if (itemCount <= 1) return false;
	const threadComplete =
		itemCount >= pageSize || (hasMore === false && itemCount > 1);
	if (!threadComplete) return false;
	if (cacheIsFresh) return true;
	if (socketHealthy) return true;
	return false;
}

/**
 * Whether POST .../sync/latest should run after the DB/cache paint.
 * @returns {{ needed: boolean, reason: string }}
 */
export function shouldProviderBackfill({
	canSync = false,
	starredOnly = false,
	forceProvider = false,
	historySyncBlocked = false,
	itemCount = 0,
	providerHydratedAt = 0,
	lastProviderSyncAt = null,
	now = Date.now(),
} = {}) {
	if (starredOnly) return { needed: false, reason: 'starred_only' };
	if (!canSync) return { needed: false, reason: 'cannot_sync' };
	if (historySyncBlocked && !forceProvider) {
		return { needed: false, reason: 'cooldown' };
	}
	if (forceProvider) return { needed: true, reason: 'forced' };
	if (itemCount <= 0) {
		if (
			hydrationTimestampMs(lastProviderSyncAt) > 0 ||
			hydrationTimestampMs(providerHydratedAt) > 0
		) {
			return { needed: false, reason: 'hydrated_empty' };
		}
		return { needed: true, reason: 'empty_thread' };
	}
	// Local Postgres rows are the replica. Do not POST sync/latest on open
	// just because the 5-minute watermark expired or was never stored on the client.
	return { needed: false, reason: 'local_replica' };
}
