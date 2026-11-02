'use client';

/**
 * Page side of the offline media cache (the work happens in worker/media.js).
 *
 * prefetchMediaGroup(group, urls)   called when a workout day is opened: the worker downloads
 *                                    that day's images/videos in the background.
 * refreshMediaStatus({ group: urls }) asks how much of each day is stored (no download).
 * useMediaGroups() / useOnline()     live state for the UI.
 *
 * Opened days are remembered, so an interrupted download resumes when the network returns
 * or the app comes back to the foreground.
 */
import { useSyncExternalStore } from 'react';

const VISITED_KEY = 'so7ba.media.visited.v1';
const MAX_VISITED = 30;

const groups = new Map(); // group → { total, cached, failed, missing: Set, state }
const listeners = new Set();
const quotaListeners = new Set();
let version = 0;
let wired = false;
let persistAsked = false;

function emit() {
	version += 1;
	listeners.forEach(listener => listener());
}

function supported() {
	return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window;
}

async function post(message) {
	if (!supported()) return false;
	try {
		const registration = navigator.serviceWorker.controller ? null : await navigator.serviceWorker.getRegistration();
		const target = navigator.serviceWorker.controller || registration?.active;
		if (!target) return false;
		target.postMessage(message);
		return true;
	} catch {
		return false;
	}
}

function readVisited() {
	try {
		const value = JSON.parse(localStorage.getItem(VISITED_KEY) || '{}');
		return value && typeof value === 'object' ? value : {};
	} catch {
		return {};
	}
}

function rememberVisited(group, urls) {
	try {
		const visited = readVisited();
		visited[group] = { urls, at: Date.now() };
		const trimmed = Object.entries(visited)
			.sort((a, b) => b[1].at - a[1].at)
			.slice(0, MAX_VISITED);
		localStorage.setItem(VISITED_KEY, JSON.stringify(Object.fromEntries(trimmed)));
	} catch {
		/* storage full or blocked: the day is still downloaded now, just not resumed later */
	}
}

/** Resume days that were opened but are not fully stored yet. */
function resumeIncomplete() {
	if (!navigator.onLine) return;
	for (const [group, entry] of Object.entries(readVisited())) {
		const known = groups.get(group);
		if (known && (known.state === 'ready' || known.state === 'downloading')) continue;
		if (Array.isArray(entry?.urls) && entry.urls.length) void post({ type: 'media:prefetch', group, urls: entry.urls });
	}
}

function wire() {
	if (wired || !supported()) return;
	wired = true;
	navigator.serviceWorker.addEventListener('message', event => {
		const data = event.data || {};
		if (data.type === 'media:progress' && data.group) {
			groups.set(data.group, {
				total: data.total || 0,
				cached: data.cached || 0,
				failed: data.failed || 0,
				missing: new Set(data.missing || []),
				state: data.state || 'none',
			});
			emit();
		} else if (data.type === 'media:evicted' && data.group) {
			groups.delete(data.group);
			emit();
		} else if (data.type === 'media:quota') {
			quotaListeners.forEach(listener => listener(data));
		}
	});
	window.addEventListener('online', () => {
		emit();
		resumeIncomplete();
	});
	window.addEventListener('offline', emit);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') resumeIncomplete();
	});
	// The worker took control after the page loaded (first visit): ask again.
	navigator.serviceWorker.addEventListener('controllerchange', resumeIncomplete);
}

/** Ask once that the browser keeps this site's storage (no prompt in Chrome/Safari). */
async function askPersist() {
	if (persistAsked) return;
	persistAsked = true;
	try {
		if (navigator.storage?.persisted && (await navigator.storage.persisted())) return;
		await navigator.storage?.persist?.();
	} catch {
		/* not supported */
	}
}

export function prefetchMediaGroup(group, urls) {
	if (!supported()) return;
	wire();
	const list = [...new Set((urls || []).filter(Boolean))];
	rememberVisited(group, list);
	if (!list.length) {
		groups.set(group, { total: 0, cached: 0, failed: 0, missing: new Set(), state: 'ready' });
		emit();
		return;
	}
	void askPersist();
	void post(navigator.onLine ? { type: 'media:prefetch', group, urls: list } : { type: 'media:status', groups: { [group]: list } });
}

export function refreshMediaStatus(map) {
	if (!supported()) return;
	wire();
	const entries = Object.entries(map || {}).filter(([, urls]) => Array.isArray(urls));
	if (entries.length) void post({ type: 'media:status', groups: Object.fromEntries(entries) });
}

export function onMediaQuotaLow(listener) {
	quotaListeners.add(listener);
	return () => quotaListeners.delete(listener);
}

/** Is this URL known to be missing from the offline copy? */
export function isMediaMissing(group, url) {
	const entry = groups.get(group);
	return !!entry && entry.missing.has(url);
}

function subscribe(listener) {
	listeners.add(listener);
	wire();
	return () => listeners.delete(listener);
}

const serverVersion = () => 0;

/** Map of group → { total, cached, failed, missing, state, percent } (re-renders on change). */
export function useMediaGroups() {
	useSyncExternalStore(subscribe, () => version, serverVersion);
	return groups;
}

export function useOnline() {
	return useSyncExternalStore(
		subscribe,
		() => navigator.onLine,
		() => true,
	);
}
