'use client';

/**
 * Wardrobe storage: IndexedDB on this device (no server copy of your photos).
 *   items   — item metadata (keyPath id)
 *   images  — Blobs keyed `${id}:thumb` (~256px) and `${id}:medium` (~768px)
 *   kv      — settings: profile, body, feedback, plans, consent, ai usage, saved outfits
 *   aicache — AI analyses keyed by image SHA-256, so a photo is never analysed twice
 * All access is lazy and SSR-safe (nothing touches `indexedDB` during server render).
 */
import { useSyncExternalStore } from 'react';

const DB_NAME = 'wa-wardrobe';
const DB_VERSION = 1;
let dbPromise = null;

function open() {
	if (typeof indexedDB === 'undefined') return Promise.reject(new Error('indexeddb-unavailable'));
	dbPromise ||= new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
			if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
			if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
			if (!db.objectStoreNames.contains('aicache')) db.createObjectStore('aicache');
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

function tx(store, mode, fn) {
	return open().then(
		db =>
			new Promise((resolve, reject) => {
				const t = db.transaction(store, mode);
				const result = fn(t.objectStore(store));
				// Reads return the request's value (undefined when missing), writes return nothing.
				t.oncomplete = () => resolve(typeof IDBRequest !== 'undefined' && result instanceof IDBRequest ? result.result : result);
				t.onerror = () => reject(t.error);
				t.onabort = () => reject(t.error);
			}),
	);
}

const reqP = req => new Promise((resolve, reject) => {
	req.onsuccess = () => resolve(req.result);
	req.onerror = () => reject(req.error);
});

/* ---------------- Reactive item cache ---------------- */
let items = [];
let loaded = false;
let loading = null;
const listeners = new Set();
const emit = () => {
	for (const listener of listeners) listener();
};

export function loadItems() {
	if (loaded) return Promise.resolve(items);
	loading ||= open()
		.then(db => reqP(db.transaction('items').objectStore('items').getAll()))
		.then(list => {
			items = list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
			loaded = true;
			emit();
			return items;
		})
		.catch(() => {
			loaded = true;
			emit();
			return items;
		});
	return loading;
}

const EMPTY = [];
const snapshot = () => ({ items, loaded });
let lastSnap = { items: EMPTY, loaded: false };
function getSnapshot() {
	if (lastSnap.items !== items || lastSnap.loaded !== loaded) lastSnap = snapshot();
	return lastSnap;
}
const SERVER_SNAP = { items: EMPTY, loaded: false };

export function useWardrobeItems() {
	return useSyncExternalStore(
		listener => {
			listeners.add(listener);
			void loadItems();
			return () => listeners.delete(listener);
		},
		getSnapshot,
		() => SERVER_SNAP,
	);
}

export async function putItem(item) {
	const next = { ...item, updatedAt: Date.now() };
	// Optimistic: update the in-memory list first, then persist.
	const index = items.findIndex(i => i.id === next.id);
	items = index >= 0 ? items.map(i => (i.id === next.id ? next : i)) : [next, ...items];
	emit();
	await tx('items', 'readwrite', store => store.put(next));
	return next;
}

export async function putItems(list) {
	const now = Date.now();
	const byId = new Map(items.map(i => [i.id, i]));
	for (const item of list) byId.set(item.id, { ...item, updatedAt: now });
	items = [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
	emit();
	await tx('items', 'readwrite', store => {
		for (const item of list) store.put({ ...item, updatedAt: now });
	});
}

export async function deleteItem(id) {
	items = items.filter(i => i.id !== id);
	revokeUrl(id);
	emit();
	await tx('items', 'readwrite', store => store.delete(id));
	await tx('images', 'readwrite', store => {
		store.delete(`${id}:thumb`);
		store.delete(`${id}:medium`);
	});
}

/* ---------------- Images ---------------- */
const urlCache = new Map();
function revokeUrl(id) {
	for (const size of ['thumb', 'medium']) {
		const key = `${id}:${size}`;
		const url = urlCache.get(key);
		if (url) URL.revokeObjectURL(url);
		urlCache.delete(key);
	}
}

export async function putImages(id, { thumb, medium }) {
	revokeUrl(id);
	await tx('images', 'readwrite', store => {
		if (thumb) store.put(thumb, `${id}:thumb`);
		if (medium) store.put(medium, `${id}:medium`);
	});
}

export async function getImage(id, size = 'thumb') {
	return tx('images', 'readonly', store => store.get(`${id}:${size}`));
}

/** Object URL for an item image (cached; revoked when the item is deleted). */
export async function imageUrl(id, size = 'thumb') {
	const key = `${id}:${size}`;
	if (urlCache.has(key)) return urlCache.get(key);
	const blob = await getImage(id, size).catch(() => null);
	if (!blob) return null;
	const url = URL.createObjectURL(blob);
	urlCache.set(key, url);
	return url;
}

/* ---------------- Key/value + AI cache ---------------- */
export const kvGet = key => tx('kv', 'readonly', store => store.get(key)).catch(() => undefined);
export const kvSet = (key, value) => tx('kv', 'readwrite', store => store.put(value, key));
export const aiCacheGet = hash => tx('aicache', 'readonly', store => store.get(hash)).catch(() => undefined);
export const aiCacheSet = (hash, value) => tx('aicache', 'readwrite', store => store.put(value, hash)).catch(() => undefined);

/** Reactive kv value with optimistic writes. */
const kvValues = new Map();
const kvListeners = new Map();
export function useKv(key, fallback) {
	const value = useSyncExternalStore(
		listener => {
			if (!kvListeners.has(key)) kvListeners.set(key, new Set());
			kvListeners.get(key).add(listener);
			if (!kvValues.has(key)) {
				kvValues.set(key, undefined);
				kvGet(key).then(stored => {
					if (stored !== undefined && kvValues.get(key) === undefined) {
						kvValues.set(key, stored);
						for (const l of kvListeners.get(key) || []) l();
					}
				});
			}
			return () => kvListeners.get(key)?.delete(listener);
		},
		() => kvValues.get(key),
		() => undefined,
	);
	const set = next => {
		const current = kvValues.get(key) ?? fallback;
		const resolved = typeof next === 'function' ? next(current) : next;
		kvValues.set(key, resolved);
		for (const l of kvListeners.get(key) || []) l();
		return kvSet(key, resolved).catch(() => false);
	};
	return [value ?? fallback, set];
}

/* ---------------- Backup: export / import as a zip ---------------- */
export async function exportWardrobe() {
	const { default: JSZip } = await import('jszip');
	const zip = new JSZip();
	const list = await loadItems();
	const kvKeys = ['profile', 'body', 'feedback', 'plans', 'saved', 'prefs'];
	const kv = {};
	for (const key of kvKeys) kv[key] = await kvGet(key);
	zip.file('wardrobe.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items: list, kv }, null, 2));
	for (const item of list) {
		for (const size of ['thumb', 'medium']) {
			const blob = await getImage(item.id, size).catch(() => null);
			if (blob) zip.file(`images/${item.id}-${size}.jpg`, blob);
		}
	}
	return zip.generateAsync({ type: 'blob' });
}

export async function importWardrobe(file) {
	const { default: JSZip } = await import('jszip');
	const zip = await JSZip.loadAsync(file);
	const raw = await zip.file('wardrobe.json')?.async('string');
	if (!raw) throw new Error('not-a-backup');
	const data = JSON.parse(raw);
	const list = Array.isArray(data.items) ? data.items.filter(item => item && typeof item.id === 'string' && item.id.length < 80) : [];
	for (const item of list) {
		const thumb = await zip.file(`images/${item.id}-thumb.jpg`)?.async('blob');
		const medium = await zip.file(`images/${item.id}-medium.jpg`)?.async('blob');
		if (thumb || medium) await putImages(item.id, { thumb: thumb && new Blob([thumb], { type: 'image/jpeg' }), medium: medium && new Blob([medium], { type: 'image/jpeg' }) });
	}
	await putItems(list);
	for (const [key, value] of Object.entries(data.kv || {})) if (value !== undefined) await kvSet(key, value);
	return list.length;
}
