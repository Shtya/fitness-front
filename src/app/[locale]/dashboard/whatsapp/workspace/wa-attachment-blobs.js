'use client';

import api from '@/utils/axios';
import { createByteBoundedCache } from '../wa-bounded-cache';
import { withPlaybackFormat } from '../whatsapp-media-stream';

export async function readBlobErrorMessage(blob) {
	try {
		const text = await blob.text();
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed?.message)) return parsed.message.join(', ');
		return parsed?.message || text || null;
	} catch {
		return null;
	}
}

async function fetchAttachmentContentBlob(attachmentId, { timeout = 120_000, format = '' } = {}) {
	const debugMedia =
		typeof window !== 'undefined' &&
		window.localStorage?.getItem('WA_MEDIA_DEBUG') === '1';
	const started = debugMedia ? performance.now() : 0;
	const response = await api.get(withPlaybackFormat(`/whatsapp/attachments/${attachmentId}/content`, format), {
		responseType: 'blob',
		validateStatus: () => true,
		timeout,
	});
	const blob = response.data;
	if (debugMedia) {
		const ms = Math.round(performance.now() - started);
		const sizeKb = blob instanceof Blob ? Math.round(blob.size / 1024) : 0;
		// eslint-disable-next-line no-console
		console.debug(
			`[wa-media] content ${attachmentId.slice(0, 8)}… status=${response.status} ${ms}ms ${sizeKb}KB`,
		);
	}
	if (!blob || response.status >= 400) {
		const message =
			(blob instanceof Blob ? await readBlobErrorMessage(blob) : null) ||
			'Media unavailable';
		throw new Error(message);
	}
	const headerType = String(response.headers?.['content-type'] || '')
		.split(';')[0]
		.trim()
		.toLowerCase();
	const blobType = String(blob.type || '')
		.split(';')[0]
		.trim()
		.toLowerCase();
	// Reject API error bodies only — do not block text/* documents (.txt, .csv, mis-typed docs).
	if (
		headerType.includes('json') ||
		blobType.includes('json') ||
		headerType.includes('text/html') ||
		blobType.includes('text/html')
	) {
		throw new Error((await readBlobErrorMessage(blob)) || 'Media unavailable');
	}
	if (!blob.size) throw new Error('Media unavailable');
	if (
		(!blobType || blobType === 'application/octet-stream') &&
		(headerType.startsWith('image/') ||
			headerType.startsWith('video/') ||
			headerType.startsWith('audio/'))
	) {
		return new Blob([blob], { type: headerType });
	}
	return blob;
}

// Media that is not on disk yet is pulled from the linked WhatsApp Web page one
// item at a time. A chat page full of photos and voice notes used to fire every
// request at once, which saturated the browser connection pool and made each
// one time out. Requests are therefore deduped per attachment and drained a few
// at a time, with playback/open actions jumping ahead of background prefetches.
const ATTACHMENT_FETCH_CONCURRENCY = 8;

const attachmentBlobCache = createByteBoundedCache({
	maxEntries: 120,
	maxBytes: 150 * 1024 * 1024,
});

const attachmentBlobRequests = new Map();

const attachmentFetchQueue = [];

let attachmentFetchActive = 0;

function attachmentFetchPriorityScore(attachmentId, { priority = false, kind = '' } = {}) {
	if (priority) return 0;
	const type = String(kind || '').toLowerCase();
	if (
		type === 'image' ||
		type === 'sticker' ||
		type === 'audio' ||
		type === 'ptt' ||
		type === 'voice'
	) {
		return 1;
	}
	if (type === 'video') return 2;
	return 3;
}

function drainAttachmentFetchQueue() {
	while (
		attachmentFetchActive < ATTACHMENT_FETCH_CONCURRENCY &&
		attachmentFetchQueue.length
	) {
		attachmentFetchQueue.sort((a, b) => a.score - b.score);
		const task = attachmentFetchQueue.shift();
		attachmentFetchActive += 1;
		task.run().finally(() => {
			attachmentFetchActive -= 1;
			drainAttachmentFetchQueue();
		});
	}
}

function attachmentBlobKey(attachmentId, format = '') {
	const id = String(attachmentId || '');
	return format ? `${id}|${format}` : id;
}

export function requestAttachmentBlob(
	attachmentId,
	{ timeout = 120_000, priority = false, kind = '', format = '' } = {},
) {
	const id = String(attachmentId || '');
	if (!id) return Promise.reject(new Error('Attachment is unavailable'));
	const key = attachmentBlobKey(id, format);
	const cached = attachmentBlobCache.get(key);
	if (cached) return Promise.resolve(cached);
	const pending = attachmentBlobRequests.get(key);
	if (pending) return pending;

	const promise = new Promise((resolve, reject) => {
		const run = () =>
			fetchAttachmentContentBlob(id, { timeout, format })
				.then(blob => {
					rememberAttachmentBlob(key, blob);
					resolve(blob);
				})
				.catch(reject);
		const entry = {
			score: attachmentFetchPriorityScore(id, { priority, kind }),
			run,
		};
		if (priority) attachmentFetchQueue.unshift(entry);
		else attachmentFetchQueue.push(entry);
		drainAttachmentFetchQueue();
	}).finally(() => {
		attachmentBlobRequests.delete(key);
	});

	attachmentBlobRequests.set(key, promise);
	return promise;
}

function rememberAttachmentBlob(attachmentId, blob) {
	attachmentBlobCache.set(attachmentId, blob);
}

export function forgetAttachmentBlob(attachmentId) {
	const id = String(attachmentId || '');
	if (!id) return;
	for (const key of [id, attachmentBlobKey(id, 'm4a')]) {
		attachmentBlobCache.delete(key);
		attachmentBlobRequests.delete(key);
	}
}

export function getCachedAttachmentBlob(attachmentId, format = '') {
	const id = String(attachmentId || '');
	if (!id) return null;
	return attachmentBlobCache.get(attachmentBlobKey(id, format)) || null;
}

export function isUsefulWaveform(peaks) {
	if (!Array.isArray(peaks) || peaks.length < 12) return false;
	let min = 1;
	let max = 0;
	let sum = 0;
	for (const value of peaks) {
		const n = Number(value);
		if (!Number.isFinite(n)) return false;
		min = Math.min(min, n);
		max = Math.max(max, n);
		sum += n;
	}
	const avg = sum / peaks.length;
	const variance =
		peaks.reduce((total, value) => total + (Number(value) - avg) ** 2, 0) / peaks.length;
	// Reject silent / corrupt / near-flat decodes (common with some ogg/opus blobs).
	return max - min >= 0.14 && variance >= 0.004;
}

function waveformPeaksFromAudioBuffer(audioBuffer, count = 48) {
	const channel = audioBuffer?.getChannelData?.(0);
	if (!channel?.length) return [];
	const blockSize = Math.max(1, Math.floor(channel.length / count));
	const peaks = [];
	for (let index = 0; index < count; index += 1) {
		const start = index * blockSize;
		const end = Math.min(channel.length, start + blockSize);
		let peak = 0;
		let sumSquares = 0;
		const samples = Math.max(1, end - start);
		for (let cursor = start; cursor < end; cursor += 1) {
			const sample = Math.abs(channel[cursor]);
			peak = Math.max(peak, sample);
			sumSquares += sample * sample;
		}
		const rms = Math.sqrt(sumSquares / samples);
		peaks.push(peak * 0.4 + rms * 0.6);
	}
	const maxPeak = Math.max(...peaks, 0.0001);
	const normalized = peaks.map(peak => peak / maxPeak);
	if (!isUsefulWaveform(normalized)) return [];
	// Expand mid dynamics so voice notes look like WhatsApp frequencies.
	return normalized.map(peak => Math.max(0.14, Math.min(1, peak ** 0.55)));
}

async function probeAudioDuration(objectUrl) {
	return new Promise(resolve => {
		const audio = new Audio();
		let settled = false;
		const finish = value => {
			if (settled) return;
			settled = true;
			audio.removeAttribute('src');
			audio.load();
			resolve(Number.isFinite(value) && value > 0 ? value : 0);
		};
		const timer = setTimeout(() => finish(0), 4000);
		const tryRead = () => {
			const value = audio.duration;
			if (Number.isFinite(value) && value > 0) {
				clearTimeout(timer);
				finish(value);
				return true;
			}
			return false;
		};
		audio.preload = 'metadata';
		audio.addEventListener('loadedmetadata', () => {
			if (tryRead()) return;
			// Chrome webm often reports Infinity until we force a far seek.
			const onTick = () => {
				if (tryRead()) {
					audio.removeEventListener('timeupdate', onTick);
					audio.currentTime = 0;
				}
			};
			audio.addEventListener('timeupdate', onTick);
			try {
				audio.currentTime = 1e101;
			} catch {
				audio.removeEventListener('timeupdate', onTick);
			}
		});
		audio.addEventListener('error', () => {
			clearTimeout(timer);
			finish(0);
		});
		audio.src = objectUrl;
	});
}

let voiceDecodeContext = null;

/** One decode-only context for every voice note: an AudioContext per bubble opened the audio device each time. */
function sharedVoiceDecodeContext() {
	if (voiceDecodeContext) return voiceDecodeContext;
	const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
	if (Offline) {
		try {
			voiceDecodeContext = new Offline(1, 1, 44100);
			return voiceDecodeContext;
		} catch {
			/* fall through to a realtime context */
		}
	}
	return null;
}

async function analyzeVoiceBlob(blob, mimeType, objectUrlForProbe) {
	const rawType = String(mimeType || blob.type || 'audio/ogg; codecs=opus');
	const type = rawType.split(';')[0] || 'audio/ogg';
	const typedBlob = blob.type ? blob : new Blob([blob], { type: rawType });
	const buffer = await typedBlob.arrayBuffer();
	let duration = 0;
	let waveform = [];
	try {
		const shared = sharedVoiceDecodeContext();
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (shared || AudioCtx) {
			const ctx = shared || new AudioCtx();
			try {
				const decodeOnce = () =>
					Promise.race([
						ctx.decodeAudioData(buffer.slice(0)),
						new Promise((_, reject) => {
							window.setTimeout(() => reject(new Error('decode timeout')), 4500);
						}),
					]);
				let decoded = null;
				try {
					decoded = await decodeOnce();
				} catch {
					// WhatsApp PTT is often ogg/opus with odd/missing blob MIME — retry once.
					const retryBlob = new Blob([buffer], { type: 'audio/ogg; codecs=opus' });
					const retryBuf = await retryBlob.arrayBuffer();
					decoded = await Promise.race([
						ctx.decodeAudioData(retryBuf.slice(0)),
						new Promise((_, reject) => {
							window.setTimeout(() => reject(new Error('decode timeout')), 4500);
						}),
					]);
				}
				duration = decoded?.duration || 0;
				waveform = waveformPeaksFromAudioBuffer(decoded);
			} finally {
				if (ctx !== shared) await ctx.close().catch(() => { });
			}
		}
	} catch {
		/* decodeAudioData can fail / hang for some ogg/opus variants — keep seeded bars */
	}
	if (!(Number.isFinite(duration) && duration > 0) && objectUrlForProbe) {
		duration = await probeAudioDuration(objectUrlForProbe);
	}
	return {
		duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
		waveform: isUsefulWaveform(waveform) ? waveform : [],
	};
}

function coerceVoiceBlobMime(blob, mimeType) {
	const preferred = String(mimeType || '').trim() || 'audio/ogg; codecs=opus';
	const current = String(blob?.type || '')
		.trim()
		.toLowerCase();
	// Browsers will not decode WhatsApp PTT when the blob is labeled octet-stream /
	// empty / generic ogg. Always re-wrap into a playable audio/* type.
	if (
		!current ||
		current.includes('octet-stream') ||
		current === 'application/ogg' ||
		current === 'audio/ogg' ||
		!current.startsWith('audio/')
	) {
		return blob.slice(0, blob.size, preferred);
	}
	return blob;
}

export async function prepareVoicePlaybackFromBlob(blob, mimeType, { analyze = true, reuseObjectUrl = null } = {}) {
	const typedBlob = coerceVoiceBlobMime(blob, mimeType);
	const type = (typedBlob.type || mimeType || 'audio/ogg').split(';')[0];
	// If MIME was coerced, the old object URL still points at the unplayable blob.
	const canReuse = Boolean(reuseObjectUrl) && typedBlob === blob;
	const objectUrl = canReuse ? reuseObjectUrl : URL.createObjectURL(typedBlob);

	// Fast path for prefetch / first paint: skip AudioContext decode (can take seconds).
	if (!analyze) {
		return { objectUrl, duration: 0, waveform: [], reused: canReuse };
	}

	const analyzed = await analyzeVoiceBlob(typedBlob, type, objectUrl);
	return {
		objectUrl,
		duration: analyzed.duration,
		waveform: analyzed.waveform,
		reused: canReuse,
	};
}

export function isPersistedAttachmentId(value) {
	const id = String(value || '');
	if (!id || id.startsWith('live:') || id.startsWith('live-att:')) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
