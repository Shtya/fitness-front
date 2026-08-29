'use client';

const DB_NAME = 'so7ba-whatsapp-cache-v1';
const DB_VERSION = 1;
const STORE = 'message_pages';

function openDb() {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: 'key' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
	});
}

export async function readCachedMessagePage(conversationId, starredOnly = false) {
	const key = `${conversationId}:${starredOnly ? 'starred' : 'all'}`;
	try {
		const db = await openDb();
		if (!db) return null;
		return await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, 'readonly');
			const req = tx.objectStore(STORE).get(key);
			req.onsuccess = () => resolve(req.result || null);
			req.onerror = () => reject(req.error);
		});
	} catch {
		return null;
	}
}

export async function writeCachedMessagePage(conversationId, payload, starredOnly = false) {
	const key = `${conversationId}:${starredOnly ? 'starred' : 'all'}`;
	const items = Array.isArray(payload?.items) ? payload.items.slice(-200) : [];
	try {
		const db = await openDb();
		if (!db) return false;
		await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, 'readwrite');
			tx.objectStore(STORE).put({
				key,
				conversationId,
				starredOnly: Boolean(starredOnly),
				items,
				cachedAt: Date.now(),
			});
			tx.oncomplete = () => resolve(true);
			tx.onerror = () => reject(tx.error);
		});
		return true;
	} catch {
		return false;
	}
}

export async function clearCachedMessagePages() {
	try {
		const db = await openDb();
		if (!db) return;
		await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, 'readwrite');
			tx.objectStore(STORE).clear();
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		/* ignore */
	}
}
