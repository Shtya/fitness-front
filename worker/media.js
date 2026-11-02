/*
 * Offline exercise media (images + videos), downloaded per workout day ("group") when the
 * page opens that day, and served from the cache afterwards, online or not.
 *
 *   page → { type: 'media:prefetch', group, urls }   download what is missing (2 at a time)
 *   page → { type: 'media:status', groups: { [group]: urls } }
 *   worker → { type: 'media:progress', group, total, cached, failed, missing, state }
 *            state: 'none' | 'partial' | 'downloading' | 'ready' | 'quota'
 *   worker → { type: 'media:quota', usage, quota }   storage almost full even after eviction
 *
 * Images are cache-first. Videos: the browser asks for byte ranges (HTTP 206) and cache.put
 * refuses a 206, so the whole file is downloaded (200), and each requested range is sliced
 * from the stored copy. A file enters the cache only once it has arrived in full, so an
 * interrupted download leaves nothing behind and is simply fetched again next time.
 */
import { parseRange } from '../src/lib/offline/media-range';

const MEDIA_PREFIX = 'so7ba-media-';
export const MEDIA_CACHE = `${MEDIA_PREFIX}v1`;
const INDEX_URL = '/__so7ba/media-index';
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i;
const VIDEO_EXT = /\.(?:mp4|webm|ogg|ogv|mov|m4v)$/i;
const CONCURRENCY = 2;
const ATTEMPTS = 3;
const DOWNLOAD_TIMEOUT_MS = 120000;
// Keep at least this much of the browser's quota free (the smaller of the two).
const MIN_FREE_BYTES = 100 * 1024 * 1024;
const MIN_FREE_RATIO = 0.1;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function mediaKind(url) {
	let pathname = '';
	try {
		pathname = decodeURIComponent(new URL(url).pathname);
	} catch {
		return null;
	}
	if (IMAGE_EXT.test(pathname)) return 'image';
	if (VIDEO_EXT.test(pathname)) return 'video';
	return null;
}

/* ── What is stored ─────────────────────────────────────────── */

// URLs in the media cache; null until read once after the worker starts.
let known = null;
let knownLoading = null;

function loadKnown() {
	if (known) return Promise.resolve(known);
	if (!knownLoading) {
		knownLoading = caches
			.open(MEDIA_CACHE)
			.then(cache => cache.keys())
			.then(requests => {
				known = new Set(requests.map(request => request.url).filter(url => !url.endsWith(INDEX_URL)));
				return known;
			})
			.catch(() => {
				known = new Set();
				return known;
			});
	}
	return knownLoading;
}

/* ── Group index (which day uses which files, last opened) — for eviction ── */

let indexChain = Promise.resolve();

async function readIndex(cache) {
	try {
		const saved = await cache.match(INDEX_URL);
		const data = saved ? await saved.json() : null;
		return data && typeof data.groups === 'object' ? data : { groups: {} };
	} catch {
		return { groups: {} };
	}
}

function updateIndex(change) {
	indexChain = indexChain
		.then(async () => {
			const cache = await caches.open(MEDIA_CACHE);
			const index = await readIndex(cache);
			change(index);
			await cache.put(INDEX_URL, new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } }));
		})
		.catch(() => undefined);
	return indexChain;
}

/** Frees room by dropping the least recently opened days (never `keep`). */
async function evictOldest(keep) {
	const cache = await caches.open(MEDIA_CACHE);
	const index = await readIndex(cache);
	const order = Object.entries(index.groups)
		.filter(([group]) => group !== keep)
		.sort((a, b) => (a[1].lastUsed || 0) - (b[1].lastUsed || 0));
	if (!order.length) return false;
	const [oldest] = order[0];
	delete index.groups[oldest];
	const stillUsed = new Set(Object.values(index.groups).flatMap(entry => entry.urls || []));
	const known = await loadKnown();
	for (const url of order[0][1].urls || []) {
		if (stillUsed.has(url)) continue;
		await cache.delete(url);
		known.delete(url);
	}
	await updateIndex(next => {
		delete next.groups[oldest];
	});
	broadcast({ type: 'media:evicted', group: oldest });
	return true;
}

async function hasRoom() {
	const estimate = await self.navigator?.storage?.estimate?.().catch(() => null);
	if (!estimate?.quota) return { ok: true };
	const free = estimate.quota - (estimate.usage || 0);
	const needed = Math.min(MIN_FREE_BYTES, estimate.quota * MIN_FREE_RATIO);
	return { ok: free > needed, usage: estimate.usage, quota: estimate.quota };
}

/** Evicts old days until there is room; tells the page when even that is not enough. */
async function ensureRoom(group) {
	let room = await hasRoom();
	while (!room.ok && (await evictOldest(group))) room = await hasRoom();
	if (!room.ok) broadcast({ type: 'media:quota', usage: room.usage, quota: room.quota });
	return room.ok;
}

/* ── Download ─────────────────────────────────────────────── */

function isQuotaError(error) {
	return error?.name === 'QuotaExceededError' || /quota/i.test(String(error?.message || ''));
}

async function fetchWhole(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
	try {
		// No Range header, so a full 200. CORS (the API sends Access-Control-Allow-Origin on
		// /uploads) gives a readable response that can be sliced into ranges later.
		const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
		if (response.status !== 200) {
			await response.body?.cancel().catch(() => undefined);
			throw new Error(`HTTP ${response.status}`);
		}
		const blob = await response.blob();
		const declared = Number(response.headers.get('content-length'));
		if (!response.headers.get('content-encoding') && declared > 0 && blob.size !== declared) {
			throw new Error('incomplete download');
		}
		const type = response.headers.get('content-type') || blob.type || (mediaKind(url) === 'video' ? 'video/mp4' : 'image/*');
		return new Response(blob, {
			status: 200,
			headers: {
				'Content-Type': type,
				'Content-Length': String(blob.size),
				'Accept-Ranges': 'bytes',
				'X-So7ba-Cached-At': String(Date.now()),
			},
		});
	} finally {
		clearTimeout(timer);
	}
}

/** 'ok' | 'failed' | 'quota' */
async function downloadOne(cache, url, group) {
	for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
		let response;
		try {
			response = await fetchWhole(url);
		} catch (error) {
			// A server without CORS headers: an image can still be stored opaque (no ranges
			// needed). An opaque video cannot be sliced, so it stays online-only.
			if (attempt === ATTEMPTS && mediaKind(url) === 'image') {
				response = await fetch(url, { mode: 'no-cors', credentials: 'omit' }).catch(() => null);
			}
			if (!response) {
				if (attempt < ATTEMPTS) await sleep(1500 * attempt * attempt);
				continue;
			}
		}
		try {
			await cache.put(url, response);
			(await loadKnown()).add(url);
			return 'ok';
		} catch (error) {
			if (!isQuotaError(error)) return 'failed';
			if (!(await evictOldest(group))) return 'quota';
			attempt -= 1; // room was made; the same file again (its body was consumed)
		}
	}
	return 'failed';
}

const jobs = new Map(); // group → running download

async function groupProgress(group, urls) {
	const set = await loadKnown();
	const missing = urls.filter(url => !set.has(url));
	const cached = urls.length - missing.length;
	return {
		type: 'media:progress',
		group,
		total: urls.length,
		cached,
		missing,
		state: jobs.has(group) ? 'downloading' : !urls.length || !missing.length ? 'ready' : cached ? 'partial' : 'none',
	};
}

async function runGroup(group, urls) {
	const cache = await caches.open(MEDIA_CACHE);
	await updateIndex(index => {
		index.groups[group] = { urls, lastUsed: Date.now() };
	});
	const set = await loadKnown();
	const queue = urls.filter(url => !set.has(url));
	let failed = 0;
	if (queue.length && !(await ensureRoom(group))) {
		return { ...(await groupProgress(group, urls)), state: 'quota' };
	}
	let quota = false;
	broadcast({ ...(await groupProgress(group, urls)), failed });
	const worker = async () => {
		while (queue.length && !quota) {
			const url = queue.shift();
			const result = await downloadOne(cache, url, group);
			if (result === 'quota') quota = true;
			else if (result !== 'ok') failed += 1;
			broadcast({ ...(await groupProgress(group, urls)), failed });
		}
	};
	await Promise.all(Array.from({ length: CONCURRENCY }, worker));
	if (quota) {
		const room = await hasRoom();
		broadcast({ type: 'media:quota', usage: room.usage, quota: room.quota });
	}
	return { ...(await groupProgress(group, urls)), failed, state: quota ? 'quota' : undefined };
}

function prefetchGroup(group, urls) {
	if (jobs.has(group)) return jobs.get(group);
	const job = runGroup(group, urls)
		.catch(() => null)
		.then(async result => {
			jobs.delete(group);
			const final = await groupProgress(group, urls);
			broadcast({ ...final, failed: result?.failed || 0, state: result?.state || final.state });
		});
	jobs.set(group, job);
	return job;
}

function broadcast(message) {
	return self.clients
		.matchAll({ type: 'window', includeUncontrolled: true })
		.then(clients => clients.forEach(client => client.postMessage(message)))
		.catch(() => undefined);
}

/* ── Serving ──────────────────────────────────────────────── */

async function serveMedia(request) {
	const cache = await caches.open(MEDIA_CACHE);
	const hit = await cache.match(request.url, { ignoreVary: true });
	if (!hit) return fetch(request);
	const rangeHeader = request.headers.get('range');
	if (!rangeHeader || hit.type === 'opaque') return hit;
	const blob = await hit.blob();
	const range = parseRange(rangeHeader, blob.size);
	const type = hit.headers.get('content-type') || blob.type;
	if (range === undefined) {
		return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(blob.size), 'Accept-Ranges': 'bytes' } });
	}
	if (range === null) {
		return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
	}
	const { start, end } = range;
	return new Response(blob.slice(start, end + 1, type), {
		status: 206,
		statusText: 'Partial Content',
		headers: {
			'Content-Type': type,
			'Content-Length': String(end - start + 1),
			'Content-Range': `bytes ${start}-${end}/${blob.size}`,
			'Accept-Ranges': 'bytes',
		},
	});
}

export function installMediaCache() {
	self.addEventListener('activate', event => {
		event.waitUntil(
			caches
				.keys()
				.then(keys => Promise.all(keys.filter(key => key.startsWith(MEDIA_PREFIX) && key !== MEDIA_CACHE).map(key => caches.delete(key)))),
		);
	});

	self.addEventListener('fetch', event => {
		const { request } = event;
		if (request.method !== 'GET' || request.mode === 'navigate') return;
		// Only files this cache stored. Before the list is read (just after the worker woke up),
		// any image/video URL is looked up; a miss goes to the network untouched.
		if (known ? !known.has(request.url) : !mediaKind(request.url)) return;
		// Workbox's rules (e.g. NetworkOnly for the API host) must not answer it a second time.
		event.stopImmediatePropagation();
		event.respondWith(serveMedia(request).catch(() => fetch(request)));
	});

	self.addEventListener('message', event => {
		const data = event.data || {};
		if (data.type === 'media:prefetch' && data.group && Array.isArray(data.urls)) {
			event.waitUntil(prefetchGroup(String(data.group), data.urls.filter(url => typeof url === 'string')));
		} else if (data.type === 'media:status' && data.groups && typeof data.groups === 'object') {
			event.waitUntil(
				Promise.all(
					Object.entries(data.groups).map(async ([group, urls]) => {
						if (!Array.isArray(urls)) return;
						const progress = await groupProgress(group, urls);
						event.source?.postMessage(progress);
					}),
				),
			);
		}
	});

	// Warm the list so later requests take the synchronous path.
	loadKnown();
}
