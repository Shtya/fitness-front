'use client';

const DB_NAME = 'so7ba-whatsapp-cache-v1';
/** v2 adds the `cachedAt` index used for TTL pruning and LRU eviction. */
const DB_VERSION = 2;
const STORE = 'message_pages';
const CACHED_AT_INDEX = 'cachedAt';
const MESSAGES_PER_PAGE = 200;

/**
 * A paint-before-network cache, not an archive: anything older than this is
 * likelier to flash stale bubbles than to save a request.
 */
const PAGE_TTL_MS = 7 * 24 * 60 * 60_000;
/** Keeps the store bounded — recently opened threads are the ones worth paintng. */
const MAX_CACHED_PAGES = 80;

let dbPromise = null;

function openDb() {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	// Reusing the connection matters: every message update writes a page.
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			const store = db.objectStoreNames.contains(STORE)
				? request.transaction.objectStore(STORE)
				: db.createObjectStore(STORE, { keyPath: 'key' });
			if (!store.indexNames.contains(CACHED_AT_INDEX)) {
				store.createIndex(CACHED_AT_INDEX, 'cachedAt');
			}
		};
		request.onsuccess = () => {
			const db = request.result;
			// Another tab upgrading or deleting the DB invalidates this handle.
			db.onclose = () => {
				dbPromise = null;
			};
			db.onversionchange = () => {
				db.close();
				dbPromise = null;
			};
			resolve(db);
		};
		request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
	}).catch(error => {
		dbPromise = null;
		throw error;
	});
	return dbPromise;
}

function runTransaction(db, mode, work) {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, mode);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
		work(tx.objectStore(STORE));
	});
}

function pageKey(conversationId, starredOnly) {
	return `${conversationId}:${starredOnly ? 'starred' : 'all'}`;
}

export async function readCachedMessagePage(conversationId, starredOnly = false) {
	const key = pageKey(conversationId, starredOnly);
	try {
		const db = await openDb();
		if (!db) return null;
		const page = await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, 'readonly');
			const req = tx.objectStore(STORE).get(key);
			req.onsuccess = () => resolve(req.result || null);
			req.onerror = () => reject(req.error);
		});
		if (!page) return null;
		if (Date.now() - (Number(page.cachedAt) || 0) > PAGE_TTL_MS) {
			void dropCachedMessagePage(conversationId, starredOnly);
			return null;
		}
		return page;
	} catch {
		return null;
	}
}

/** Drops expired pages, then the oldest ones while the store is over budget. */
async function pruneCachedMessagePages(db) {
	const expiredBefore = Date.now() - PAGE_TTL_MS;
	await runTransaction(db, 'readwrite', store => {
		const index = store.index(CACHED_AT_INDEX);
		const expired = index.openCursor(IDBKeyRange.upperBound(expiredBefore));
		expired.onsuccess = () => {
			const cursor = expired.result;
			if (!cursor) return;
			cursor.delete();
			cursor.continue();
		};
	});
	const total = await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).count();
		req.onsuccess = () => resolve(req.result || 0);
		req.onerror = () => reject(req.error);
	});
	if (total <= MAX_CACHED_PAGES) return;
	let toDelete = total - MAX_CACHED_PAGES;
	await runTransaction(db, 'readwrite', store => {
		const oldest = store.index(CACHED_AT_INDEX).openCursor();
		oldest.onsuccess = () => {
			const cursor = oldest.result;
			if (!cursor || toDelete <= 0) return;
			cursor.delete();
			toDelete -= 1;
			cursor.continue();
		};
	});
}

export async function writeCachedMessagePage(conversationId, payload, starredOnly = false) {
	const key = pageKey(conversationId, starredOnly);
	const items = Array.isArray(payload?.items) ? payload.items.slice(-MESSAGES_PER_PAGE) : [];
	const record = {
		key,
		conversationId,
		starredOnly: Boolean(starredOnly),
		items,
		cachedAt: Date.now(),
	};
	const put = async db =>
		runTransaction(db, 'readwrite', store => {
			store.put(record);
		});
	try {
		const db = await openDb();
		if (!db) return false;
		try {
			await put(db);
		} catch (error) {
			// A full quota only recovers if we free space, so prune and retry once.
			if (error?.name !== 'QuotaExceededError') throw error;
			await pruneCachedMessagePages(db);
			await put(db);
		}
		void pruneCachedMessagePages(db).catch(() => undefined);
		return true;
	} catch {
		return false;
	}
}

export async function dropCachedMessagePage(conversationId, starredOnly = false) {
	try {
		const db = await openDb();
		if (!db) return;
		await runTransaction(db, 'readwrite', store => {
			store.delete(pageKey(conversationId, starredOnly));
		});
	} catch {
		/* ignore */
	}
}

export async function clearCachedMessagePages() {
	try {
		const db = await openDb();
		if (!db) return;
		await runTransaction(db, 'readwrite', store => {
			store.clear();
		});
	} catch {
		/* ignore */
	}
}
