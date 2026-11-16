'use client';

import { useSyncExternalStore } from 'react';

/**
 * Unsent text per chat, like WhatsApp: what you type in a chat stays with that chat, another
 * chat opens with its own text (or an empty box), and the chat list shows "Draft: …".
 *
 * Kept in memory and mirrored to localStorage so a reload keeps drafts. Storage can be
 * unavailable (private mode, blocked site data); everything still works for the session then.
 */
const STORAGE_KEY = 'wa-chat-drafts-v1';
const MAX_DRAFTS = 300;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

let drafts = null; // Map<chatKey, { text, at }>
const listeners = new Set();
let saveTimer = null;

function load() {
	if (drafts) return drafts;
	drafts = new Map();
	try {
		const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
		const parsed = raw ? JSON.parse(raw) : null;
		const now = Date.now();
		if (parsed && typeof parsed === 'object') {
			for (const [key, value] of Object.entries(parsed)) {
				const text = typeof value?.text === 'string' ? value.text : '';
				const at = Number(value?.at) || 0;
				if (key && text.trim() && now - at < MAX_AGE_MS) drafts.set(key, { text, at });
			}
		}
	} catch {
		/* storage blocked or corrupt: start empty */
	}
	return drafts;
}

function persistSoon() {
	if (typeof window === 'undefined') return;
	if (saveTimer) window.clearTimeout(saveTimer);
	saveTimer = window.setTimeout(() => {
		saveTimer = null;
		try {
			const entries = [...load()].sort((a, b) => b[1].at - a[1].at).slice(0, MAX_DRAFTS);
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
		} catch {
			/* storage full or blocked: drafts stay for this session */
		}
	}, 300);
}

export function getChatDraft(chatKey) {
	if (!chatKey) return '';
	return load().get(String(chatKey))?.text || '';
}

/** Store `text` as the draft of `chatKey`; blank text removes it. */
export function setChatDraft(chatKey, text) {
	if (!chatKey) return;
	const key = String(chatKey);
	const store = load();
	const value = String(text ?? '');
	const previous = store.get(key)?.text || '';
	if (!value.trim()) {
		if (!store.has(key)) return;
		store.delete(key);
	} else {
		if (previous === value) return;
		store.set(key, { text: value, at: Date.now() });
	}
	persistSoon();
	for (const listener of listeners) listener(key);
}

function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Live draft text of one chat (re-renders only when that value changes). */
export function useChatDraft(chatKey) {
	return useSyncExternalStore(
		subscribe,
		() => getChatDraft(chatKey),
		() => '',
	);
}
