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

/**
 * Soft-open: paint from cache and skip GET + sync when the thread is warm.
 */
export function shouldSkipOpenChatNetwork({
	cacheIsFresh = false,
	forceProvider = false,
	itemCount = 0,
} = {}) {
	if (forceProvider || !cacheIsFresh || itemCount <= 0) return false;
	// Warm in-memory thread: skip GET + phone work on reopen (any length).
	return true;
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
