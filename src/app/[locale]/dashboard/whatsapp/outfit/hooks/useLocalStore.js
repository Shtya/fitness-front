'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe localStorage state shared by every component using the same key. The server and the
 * first client render see `fallback`; the stored value arrives after hydration. Writes that
 * overflow the quota return false so the caller can show a "storage full" message.
 */
const listeners = new Map();
const cache = new Map();

function read(key, fallback) {
	if (cache.has(key)) return cache.get(key);
	let value = fallback;
	try {
		const raw = window.localStorage.getItem(key);
		if (raw != null) value = JSON.parse(raw);
	} catch {
		value = fallback;
	}
	cache.set(key, value);
	return value;
}

function emit(key) {
	for (const listener of listeners.get(key) || []) listener();
}

function subscribe(key, listener) {
	if (!listeners.has(key)) listeners.set(key, new Set());
	listeners.get(key).add(listener);
	const onStorage = event => {
		if (event.key !== key) return;
		cache.delete(key);
		listener();
	};
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.get(key)?.delete(listener);
		window.removeEventListener('storage', onStorage);
	};
}

export function writeLocal(key, value) {
	cache.set(key, value);
	emit(key);
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

export function useLocalStore(key, fallback) {
	const value = useSyncExternalStore(
		listener => subscribe(key, listener),
		() => read(key, fallback),
		() => fallback,
	);
	const setValue = useCallback(
		next => writeLocal(key, typeof next === 'function' ? next(read(key, fallback)) : next),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[key],
	);
	return [value, setValue];
}

export const STORE_KEYS = {
	profile: 'wa.outfit.profile.v1',
	wardrobe: 'wa.outfit.wardrobe.v1',
	saved: 'wa.outfit.saved.v1',
	prefs: 'wa.outfit.prefs.v1',
};
