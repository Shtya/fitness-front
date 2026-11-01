/**
 * Offline outbox: every change the user makes is written here first (synchronously, so a
 * closed tab or a dead network can never lose it) and sent to the server in the background.
 *
 * One record per logical row (`key`, e.g. one exercise's sets for one day). A newer change to
 * the same row replaces the payload and bumps `version`, so the server only ever receives the
 * latest snapshot. A record becomes `synced` only when the server confirmed *that* version; if
 * the user edited it while the request was in flight it stays `pending` and is sent again.
 *
 * Records:  { key, kind, userId, payload, version, idempotencyKey, status, attempts,
 *             nextAttemptAt, error, createdAt, updatedAt, syncedAt }
 * status:   'pending' | 'syncing' | 'synced' | 'failed'
 */

export const OUTBOX_STORAGE_KEY = 'so7ba.outbox.v1';
export const OUTBOX_SYNC_TAG = 'so7ba-outbox';

const SYNCED_KEEP_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const FLUSH_DEBOUNCE_MS = 500;
const MAX_PASSES = 3;

const senders = new Map();
const listeners = new Set();
const syncedListeners = new Set();

let storage = typeof window !== 'undefined' ? safeLocalStorage() : null;
let memoryRecords = {};
let flushing = null;
let flushTimer = null;
let retryTimer = null;
let syncing = false;
let lastSyncedAt = 0;
let snapshotVersion = 0;
let currentUserId = () => readStoredUserId();
let onlineCheck = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

function safeLocalStorage() {
	try {
		const probe = '__so7ba_outbox_probe__';
		window.localStorage.setItem(probe, '1');
		window.localStorage.removeItem(probe);
		return window.localStorage;
	} catch {
		return null;
	}
}

function readStoredUserId() {
	try {
		const user = JSON.parse(window.localStorage.getItem('user') || 'null');
		return user?.id != null ? String(user.id) : null;
	} catch {
		return null;
	}
}

function makeId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll() {
	if (!storage) return { ...memoryRecords };
	try {
		const parsed = JSON.parse(storage.getItem(OUTBOX_STORAGE_KEY) || '{}');
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function writeAll(records) {
	const now = Date.now();
	for (const [key, record] of Object.entries(records)) {
		if (record?.status === 'synced' && now - (record.syncedAt || 0) > SYNCED_KEEP_MS) delete records[key];
	}
	if (storage) {
		try {
			storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(records));
		} catch {
			// Quota: keep the unsynced rows, drop the confirmed ones, and try once more.
			for (const [key, record] of Object.entries(records)) if (record.status === 'synced') delete records[key];
			try {
				storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(records));
			} catch {
				memoryRecords = records;
			}
		}
	} else {
		memoryRecords = records;
	}
	emit();
}

function emit() {
	snapshotVersion += 1;
	for (const listener of listeners) {
		try {
			listener();
		} catch {
			/* a broken subscriber must not stop the others */
		}
	}
}

function isUnsynced(record) {
	return record && record.status !== 'synced';
}

function belongsToCurrentUser(record) {
	const uid = currentUserId();
	// Rows written for one account are never sent with another account's token.
	return !record.userId || !uid || String(record.userId) === uid;
}

/** Exponential backoff: 2s, 4s, 8s … capped at 5 minutes. */
export function backoffMs(attempts) {
	return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.max(1, Number(attempts) || 1));
}

/** A 4xx other than auth/timeout/rate-limit will not succeed by retrying the same payload. */
export function isPermanentFailure(error) {
	const status = Number(error?.response?.status || error?.status || 0);
	return status >= 400 && status < 500 && ![401, 403, 408, 409, 425, 429].includes(status);
}

function isNetworkFailure(error) {
	return !error?.response && !error?.status;
}

export function registerSender(kind, send) {
	senders.set(kind, send);
}

export function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Called after the server confirmed a record that is still the latest local version. */
export function onSynced(listener) {
	syncedListeners.add(listener);
	return () => syncedListeners.delete(listener);
}

export function getSnapshotVersion() {
	return snapshotVersion;
}

export function getRecords({ kind, kinds, userId, includeSynced = false } = {}) {
	const wanted = kinds ? new Set(kinds) : kind ? new Set([kind]) : null;
	return Object.values(readAll())
		.filter(record => (includeSynced ? true : isUnsynced(record)))
		.filter(record => (wanted ? wanted.has(record.kind) : true))
		.filter(record => (userId == null ? true : String(record.userId) === String(userId)))
		.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function getRecord(key) {
	return readAll()[key] || null;
}

export function getStatus({ kinds } = {}) {
	const records = getRecords({ kinds, includeSynced: true });
	const unsynced = records.filter(isUnsynced);
	return {
		online: onlineCheck(),
		syncing,
		pending: unsynced.filter(r => r.status !== 'failed').length,
		failed: unsynced.filter(r => r.status === 'failed').length,
		lastSyncedAt: Math.max(lastSyncedAt, ...records.map(r => r.syncedAt || 0)),
	};
}

/**
 * Saves a change locally (synchronously) and schedules a background send.
 * Returns the stored record.
 */
export function enqueue({ kind, key, payload, userId = null }) {
	if (!kind || !key) throw new Error('outbox: kind and key are required');
	const records = readAll();
	const prev = records[key];
	const now = Date.now();
	const record = {
		key,
		kind,
		userId: userId != null ? String(userId) : prev?.userId ?? currentUserId(),
		payload,
		version: (prev?.version || 0) + 1,
		// A new key per version: a retried request for the same version is the same operation.
		idempotencyKey: makeId(),
		status: 'pending',
		attempts: 0,
		nextAttemptAt: 0,
		error: null,
		createdAt: isUnsynced(prev) ? prev.createdAt : now,
		updatedAt: now,
		syncedAt: prev?.syncedAt || 0,
	};
	records[key] = record;
	writeAll(records);
	scheduleFlush(FLUSH_DEBOUNCE_MS);
	requestBackgroundSync();
	return record;
}

export function scheduleFlush(delay = FLUSH_DEBOUNCE_MS) {
	if (typeof setTimeout === 'undefined') return;
	if (flushTimer) clearTimeout(flushTimer);
	flushTimer = setTimeout(() => {
		flushTimer = null;
		void flush();
	}, delay);
}

function scheduleRetry() {
	if (retryTimer) clearTimeout(retryTimer);
	retryTimer = null;
	const waiting = getRecords().filter(r => r.status === 'pending' && belongsToCurrentUser(r));
	if (!waiting.length || !onlineCheck()) return;
	const next = Math.min(...waiting.map(r => r.nextAttemptAt || 0));
	retryTimer = setTimeout(() => {
		retryTimer = null;
		void flush();
	}, Math.max(250, next - Date.now()));
}

async function sendOne(record) {
	const send = senders.get(record.kind);
	if (!send) return 'skipped';
	{
		const records = readAll();
		if (records[record.key]?.version === record.version) {
			records[record.key] = { ...records[record.key], status: 'syncing' };
			writeAll(records);
		}
	}
	try {
		const response = await send(record.payload, { idempotencyKey: record.idempotencyKey, record });
		const records = readAll();
		const latest = records[record.key];
		const current = Boolean(latest && latest.version === record.version);
		if (current) {
			records[record.key] = {
				...latest,
				status: 'synced',
				attempts: 0,
				error: null,
				nextAttemptAt: 0,
				syncedAt: Date.now(),
			};
			writeAll(records);
		}
		lastSyncedAt = Date.now();
		for (const listener of syncedListeners) {
			try {
				listener({ record, response, current });
			} catch {
				/* ignore */
			}
		}
		return 'ok';
	} catch (error) {
		const records = readAll();
		const latest = records[record.key];
		// A newer edit arrived meanwhile: it is already pending and will carry the data.
		if (!latest || latest.version !== record.version) return isNetworkFailure(error) ? 'offline' : 'error';
		const attempts = (latest.attempts || 0) + 1;
		const permanent = isPermanentFailure(error);
		records[record.key] = {
			...latest,
			status: permanent ? 'failed' : 'pending',
			attempts,
			error: String(error?.response?.data?.message || error?.message || 'Sync failed').slice(0, 200),
			nextAttemptAt: Date.now() + backoffMs(attempts),
		};
		writeAll(records);
		return isNetworkFailure(error) ? 'offline' : 'error';
	}
}

/**
 * Sends every due record. `force` also retries rows that are backing off or failed
 * (the user tapped "sync now"). Concurrent calls share one run.
 */
export function flush({ force = false } = {}) {
	if (flushing) return flushing;
	if (!onlineCheck()) {
		emit();
		return Promise.resolve({ ok: false, offline: true });
	}
	flushing = (async () => {
		syncing = true;
		emit();
		let sent = 0;
		let failed = 0;
		let offline = false;
		for (let pass = 0; pass < MAX_PASSES && !offline; pass += 1) {
			const now = Date.now();
			const due = getRecords().filter(
				r =>
					belongsToCurrentUser(r) &&
					senders.has(r.kind) &&
					(force || (r.status !== 'failed' && (r.nextAttemptAt || 0) <= now)),
			);
			if (!due.length) break;
			for (const record of due) {
				const outcome = await sendOne(record);
				if (outcome === 'ok') sent += 1;
				else if (outcome === 'offline') {
					offline = true;
					break;
				} else if (outcome === 'error') failed += 1;
			}
			force = false;
		}
		return { ok: failed === 0 && !offline, sent, failed, offline };
	})().finally(() => {
		flushing = null;
		syncing = false;
		emit();
		scheduleRetry();
	});
	return flushing;
}

/** Asks the service worker to wake the app when connectivity returns (Chromium only). */
export function requestBackgroundSync() {
	if (typeof navigator === 'undefined' || !navigator.serviceWorker?.ready) return;
	navigator.serviceWorker.ready
		.then(registration => registration.sync?.register(OUTBOX_SYNC_TAG))
		.catch(() => undefined);
}

/** Moves rows from the old workouts-only queue (`mw.pendingPRs.v1`) into the outbox once. */
export function migrateLegacyWorkoutQueue(toRecord) {
	if (!storage) return 0;
	const LEGACY_KEY = 'mw.pendingPRs.v1';
	let items = [];
	try {
		items = JSON.parse(storage.getItem(LEGACY_KEY) || '[]');
	} catch {
		items = [];
	}
	if (!Array.isArray(items) || !items.length) {
		storage.removeItem(LEGACY_KEY);
		return 0;
	}
	const records = readAll();
	for (const item of items) {
		const mapped = toRecord(item);
		if (!mapped || records[mapped.key]) continue;
		records[mapped.key] = {
			...mapped,
			userId: item.userId != null ? String(item.userId) : null,
			version: 1,
			idempotencyKey: makeId(),
			status: 'pending',
			attempts: 0,
			nextAttemptAt: 0,
			error: null,
			createdAt: item.createdAt || Date.now(),
			updatedAt: Date.now(),
			syncedAt: 0,
		};
	}
	writeAll(records);
	storage.removeItem(LEGACY_KEY);
	return items.length;
}

let started = false;

/** Wires the triggers once per page: back online, tab visible, SW background sync, timer. */
export function startOutbox() {
	if (started || typeof window === 'undefined') return;
	started = true;
	const kick = () => void flush();
	window.addEventListener('online', () => {
		emit();
		kick();
	});
	window.addEventListener('offline', emit);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') kick();
	});
	window.addEventListener('storage', event => {
		if (event.key === OUTBOX_STORAGE_KEY) emit();
	});
	navigator.serviceWorker?.addEventListener?.('message', event => {
		if (event.data?.type === 'outbox:flush') kick();
	});
	setInterval(() => {
		if (getRecords().some(r => r.status === 'pending')) kick();
	}, 30_000);
	kick();
}

/** Test hooks. */
export function __configureOutboxForTests({ storage: nextStorage = null, online, userId } = {}) {
	storage = nextStorage;
	memoryRecords = {};
	flushing = null;
	syncing = false;
	if (flushTimer) clearTimeout(flushTimer);
	if (retryTimer) clearTimeout(retryTimer);
	flushTimer = null;
	retryTimer = null;
	senders.clear();
	syncedListeners.clear();
	if (online) onlineCheck = online;
	if (userId !== undefined) currentUserId = () => userId;
}
