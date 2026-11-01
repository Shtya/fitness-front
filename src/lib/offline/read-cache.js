/**
 * Last-known server data for offline reads (plans, last sets, meal logs), kept in IndexedDB.
 * `cachedRead` is network-first: a successful response refreshes the copy; when the request
 * fails for lack of a network (or a 5xx), the saved copy is returned instead.
 */

const DB_NAME = 'so7ba-offline';
const STORE = 'reads';
const memory = new Map();
let dbPromise = null;

function openDb() {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	if (!dbPromise) {
		dbPromise = new Promise(resolve => {
			try {
				const request = indexedDB.open(DB_NAME, 1);
				request.onupgradeneeded = () => {
					if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => resolve(null);
				request.onblocked = () => resolve(null);
			} catch {
				resolve(null);
			}
		});
	}
	return dbPromise;
}

function run(mode, fn) {
	return openDb().then(
		db =>
			new Promise(resolve => {
				if (!db) return resolve(undefined);
				try {
					const tx = db.transaction(STORE, mode);
					const request = fn(tx.objectStore(STORE));
					tx.oncomplete = () => resolve(request?.result);
					tx.onerror = () => resolve(undefined);
					tx.onabort = () => resolve(undefined);
				} catch {
					resolve(undefined);
				}
			}),
	);
}

export async function readCached(key) {
	const stored = await run('readonly', store => store.get(key));
	return stored ?? memory.get(key) ?? null;
}

export async function writeCached(key, data) {
	const entry = { data, savedAt: Date.now() };
	memory.set(key, entry);
	await run('readwrite', store => store.put(entry, key));
	return entry;
}

function shouldFallBack(error) {
	const status = Number(error?.response?.status || 0);
	return !status || status >= 500;
}

/**
 * @returns {Promise<{ data: any, fromCache: boolean, savedAt: number }>}
 * Throws the original error when there is neither a network answer nor a saved copy.
 */
export async function cachedRead(key, fetcher) {
	try {
		const data = await fetcher();
		void writeCached(key, data);
		return { data, fromCache: false, savedAt: Date.now() };
	} catch (error) {
		if (!shouldFallBack(error)) throw error;
		const cached = await readCached(key);
		if (cached) return { data: cached.data, fromCache: true, savedAt: cached.savedAt };
		throw error;
	}
}

export function currentUserIdFromStorage() {
	try {
		const user = JSON.parse(window.localStorage.getItem('user') || 'null');
		return user?.id != null ? String(user.id) : 'anon';
	} catch {
		return 'anon';
	}
}
