/**
 * Browser-side audio prep for long / video transcription jobs.
 * Decodes with Web Audio, downsamples to 16 kHz mono WAV (fast, STT-friendly),
 * and slices by duration so uploads stay under reverse-proxy body limits.
 */

export const DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 210; // 3.5 minutes
export const MIN_TRANSCRIPTION_CHUNK_SECONDS = 60;
export const MAX_TRANSCRIPTION_CHUNK_SECONDS = 900;
export const TRANSCRIPTION_CHUNK_STORAGE_KEY = 'transcript:chunkSeconds';
export const TRANSCRIPTION_TARGET_SAMPLE_RATE = 16_000;

/**
 * Production nginx often caps uploads (~1–20m). Stay well under common
 * defaults so the proxy does not drop the request (browser then shows
 * a generic Network Error with no HTTP status).
 */
export const SAFE_PROXY_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Prefer shorter slices for video / large containers so each POST stays small. */
export const VIDEO_FORCE_CHUNK_SECONDS = 90;

export const TRANSCRIPTION_CHUNK_PRESETS = [
	{ value: 0, labelEn: 'Off (whole file)', labelAr: 'إيقاف (الملف كامل)' },
	{ value: 120, labelEn: '2 minutes', labelAr: 'دقيقتان' },
	{ value: 180, labelEn: '3 minutes', labelAr: '3 دقايق' },
	{ value: 210, labelEn: '3.5 minutes (default)', labelAr: '3.5 دقايق (افتراضي)' },
	{ value: 240, labelEn: '4 minutes', labelAr: '4 دقايق' },
	{ value: 300, labelEn: '5 minutes', labelAr: '5 دقايق' },
];

export function normalizeTranscriptionChunkSeconds(value) {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.min(
		MAX_TRANSCRIPTION_CHUNK_SECONDS,
		Math.max(MIN_TRANSCRIPTION_CHUNK_SECONDS, Math.round(n)),
	);
}

export function getStoredTranscriptionChunkSeconds() {
	if (typeof window === 'undefined') return DEFAULT_TRANSCRIPTION_CHUNK_SECONDS;
	try {
		const raw = window.localStorage.getItem(TRANSCRIPTION_CHUNK_STORAGE_KEY);
		if (raw == null || raw === '') return DEFAULT_TRANSCRIPTION_CHUNK_SECONDS;
		return normalizeTranscriptionChunkSeconds(raw);
	} catch {
		return DEFAULT_TRANSCRIPTION_CHUNK_SECONDS;
	}
}

export function storeTranscriptionChunkSeconds(value) {
	const next = normalizeTranscriptionChunkSeconds(value);
	try {
		window.localStorage.setItem(TRANSCRIPTION_CHUNK_STORAGE_KEY, String(next));
	} catch {
		/* ignore quota */
	}
	return next;
}

export function isVideoLikeFile(file) {
	const type = String(file?.type || '').toLowerCase();
	const name = String(file?.name || '').toLowerCase();
	return type.startsWith('video/') || /\.(mp4|mov|m4v|mkv|avi)$/i.test(name);
}

function mixToMono(source, startSample, length) {
	const mixed = new Float32Array(length);
	const channelCount = source.numberOfChannels || 1;
	for (let channel = 0; channel < channelCount; channel += 1) {
		const data = source.getChannelData(channel);
		for (let i = 0; i < length; i += 1) {
			mixed[i] += data[startSample + i] / channelCount;
		}
	}
	return mixed;
}

function downsampleMono(samples, fromRate, toRate) {
	if (!toRate || toRate >= fromRate) return { samples, sampleRate: fromRate };
	const ratio = fromRate / toRate;
	const length = Math.max(1, Math.floor(samples.length / ratio));
	const out = new Float32Array(length);
	for (let i = 0; i < length; i += 1) {
		out[i] = samples[Math.min(samples.length - 1, Math.floor(i * ratio))];
	}
	return { samples: out, sampleRate: toRate };
}

function encodeWavMono(samples, sampleRate) {
	const dataSize = samples.length * 2;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	const writeString = (offset, text) => {
		for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
	};

	writeString(0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeString(8, 'WAVE');
	writeString(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeString(36, 'data');
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < samples.length; i += 1) {
		const sample = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
		offset += 2;
	}
	return new Blob([buffer], { type: 'audio/wav' });
}

async function decodeAudioFile(file) {
	const AudioCtx = window.AudioContext || window.webkitAudioContext;
	if (!AudioCtx) throw new Error('Web Audio is not available in this browser');
	const context = new AudioCtx();
	try {
		const bytes = await file.arrayBuffer();
		return await context.decodeAudioData(bytes.slice(0));
	} finally {
		await context.close().catch(() => {});
	}
}

function baseFileName(file) {
	return String(file?.name || 'audio').replace(/\.[^.]+$/, '') || 'audio';
}

function sliceToWavFile(decoded, startSample, length, fileName) {
	const mono = mixToMono(decoded, startSample, length);
	const { samples, sampleRate } = downsampleMono(
		mono,
		decoded.sampleRate,
		TRANSCRIPTION_TARGET_SAMPLE_RATE,
	);
	const blob = encodeWavMono(samples, sampleRate);
	return new File([blob], fileName, { type: 'audio/wav' });
}

/**
 * Kept for API compatibility — realtime Opus encoding was removed (it blocked
 * the UI for the full media duration). Preparation happens in buildTranscriptionUploadParts.
 */
export async function prepareTranscriptionUploadFile(file) {
	return file;
}

/**
 * @returns {Promise<File[]>} original file as single-item array when no split needed
 */
export async function splitAudioFileForTranscription(file, chunkSeconds) {
	const parts = await buildTranscriptionUploadParts(file, chunkSeconds);
	return parts;
}

/**
 * Decode → optional downsampled WAV slices. Always finishes in CPU time, not wall-clock
 * media duration (unlike MediaRecorder realtime encode).
 *
 * @returns {Promise<File[]>}
 */
export async function buildTranscriptionUploadParts(
	file,
	chunkSeconds = getStoredTranscriptionChunkSeconds(),
	{ onProgress } = {},
) {
	if (!file) return [];

	const preferred = normalizeTranscriptionChunkSeconds(chunkSeconds);
	const videoLike = isVideoLikeFile(file);
	const large = file.size > SAFE_PROXY_UPLOAD_BYTES;
	let limit = preferred;

	// Videos / oversized containers: always slice short so each POST stays small.
	if (videoLike || large) {
		if (limit <= 0) limit = VIDEO_FORCE_CHUNK_SECONDS;
		limit = Math.min(limit, VIDEO_FORCE_CHUNK_SECONDS);
	}

	// Small plain audio under the proxy cap: upload as-is.
	if (!videoLike && !large && limit <= 0) {
		onProgress?.({ phase: 'ready', percent: 100 });
		return [file];
	}

	onProgress?.({ phase: 'decoding', percent: 8 });
	let decoded;
	try {
		decoded = await decodeAudioFile(file);
	} catch (error) {
		// Never return the raw video — production nginx will drop it as Network Error.
		if (!videoLike && file.size <= SAFE_PROXY_UPLOAD_BYTES) return [file];
		const err = new Error(
			'Could not read audio from this video in the browser. Export audio (mp3/wav/m4a) and retry.',
		);
		err.code = 'AUDIO_DECODE_FAILED';
		err.cause = error;
		throw err;
	}

	const duration = Number(decoded.duration) || 0;
	const sampleRate = decoded.sampleRate;
	const totalSamples = decoded.length;
	const nameRoot = baseFileName(file);

	const needsSplit =
		limit > 0 &&
		(duration > limit + 2 || videoLike || large || file.size > SAFE_PROXY_UPLOAD_BYTES);

	if (!needsSplit) {
		onProgress?.({ phase: 'encoding', percent: 55 });
		const single = sliceToWavFile(decoded, 0, totalSamples, `${nameRoot}.wav`);
		onProgress?.({ phase: 'ready', percent: 100 });
		// Prefer original only when it is already small enough and not a video container.
		if (!videoLike && file.size <= SAFE_PROXY_UPLOAD_BYTES && file.size <= single.size) {
			return [file];
		}
		if (single.size > SAFE_PROXY_UPLOAD_BYTES) {
			// Force a short split even for short duration if WAV is huge.
			limit = VIDEO_FORCE_CHUNK_SECONDS;
		} else {
			return [single];
		}
	}

	const chunkSamples = Math.max(1, Math.floor(limit * sampleRate));
	const parts = [];
	const estimatedParts = Math.max(1, Math.ceil(totalSamples / chunkSamples));

	for (let start = 0, index = 0; start < totalSamples; start += chunkSamples, index += 1) {
		const length = Math.min(chunkSamples, totalSamples - start);
		if (length < sampleRate * 0.25) break;
		const partLabel = `${nameRoot}.part${String(index + 1).padStart(2, '0')}.wav`;
		parts.push(sliceToWavFile(decoded, start, length, partLabel));
		onProgress?.({
			phase: 'encoding',
			percent: Math.min(95, Math.round(((index + 1) / estimatedParts) * 90) + 8),
			chunkIndex: index + 1,
			chunkTotal: estimatedParts,
		});
	}

	onProgress?.({ phase: 'ready', percent: 100 });
	return parts.length ? parts : [file];
}
