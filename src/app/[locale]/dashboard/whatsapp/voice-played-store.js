'use client';

import { useEffect, useState } from 'react';

/**
 * Which incoming voice notes this browser has listened to.
 *
 * WhatsApp does not tell a linked device which voice notes the user played, and the
 * CRM stores no such field, so this is local to the browser: it survives refreshes,
 * chat switches and other tabs (via the storage event), but not other devices.
 * Outgoing notes do not use this store; their state is the real `played` receipt.
 */
const STORAGE_KEY = 'wa:voice-played:v1';
const MAX_ENTRIES = 4000;

let cache = null;
const listeners = new Set();

function load() {
	if (cache) return cache;
	cache = new Set();
	if (typeof window === 'undefined') return cache;
	try {
		const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
		if (Array.isArray(parsed)) cache = new Set(parsed.map(String));
	} catch {
		/* blocked or corrupt storage: start empty */
	}
	return cache;
}

function persist() {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...load()]));
	} catch {
		/* quota or private mode: keep the in-memory state */
	}
}

export function isVoicePlayed(messageId) {
	return Boolean(messageId) && load().has(String(messageId));
}

export function markVoicePlayed(messageId) {
	if (!messageId) return;
	const key = String(messageId);
	// Optimistic rows are replaced by the persisted id, so they are not worth storing.
	if (key.startsWith('pending:')) return;
	const set = load();
	if (set.has(key)) return;
	set.add(key);
	if (set.size > MAX_ENTRIES) {
		// Sets keep insertion order: drop the oldest entries.
		cache = new Set([...set].slice(set.size - MAX_ENTRIES));
	}
	persist();
	listeners.forEach(listener => listener(key));
}

export function useVoicePlayed(messageId) {
	const [played, setPlayed] = useState(() => isVoicePlayed(messageId));

	useEffect(() => {
		const key = messageId ? String(messageId) : '';
		setPlayed(isVoicePlayed(key));
		if (!key) return undefined;
		const onMark = marked => {
			if (marked === key) setPlayed(true);
		};
		const onStorage = event => {
			if (event.key !== STORAGE_KEY) return;
			cache = null;
			setPlayed(isVoicePlayed(key));
		};
		listeners.add(onMark);
		window.addEventListener('storage', onStorage);
		return () => {
			listeners.delete(onMark);
			window.removeEventListener('storage', onStorage);
		};
	}, [messageId]);

	return played;
}
