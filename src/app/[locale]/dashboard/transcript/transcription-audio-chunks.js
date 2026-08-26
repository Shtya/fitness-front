/**
 * Browser-side audio prep for long / video transcription jobs.
 * Extracts audio from video, compresses to Opus when possible, then slices by duration.
 */

export const DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 210; // 3.5 minutes
export const MIN_TRANSCRIPTION_CHUNK_SECONDS = 60;
export const MAX_TRANSCRIPTION_CHUNK_SECONDS = 900;
export const TRANSCRIPTION_CHUNK_STORAGE_KEY = 'transcript:chunkSeconds';

/**
 * Production nginx often caps uploads (~20m). Stay under that so the proxy
 * does not drop the request (browser then shows a generic Network Error).
 */
export const SAFE_PROXY_UPLOAD_BYTES = 18 * 1024 * 1024;

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

function pickOpusRecorderMime() {
	if (typeof MediaRecorder === 'undefined') return '';
	const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
	return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

async function encodeAudioBufferToOpus(audioBuffer, startSample = 0, length = audioBuffer.length) {
	const mimeType = pickOpusRecorderMime();
	if (!mimeType) return null;

	const AudioCtx = window.AudioContext || window.webkitAudioContext;
	const context = new AudioCtx();
	try {
		const mono = mixToMono(audioBuffer, startSample, length);
		const slice = context.createBuffer(1, mono.length, audioBuffer.sampleRate);
		slice.copyToChannel(mono, 0);
		const destination = context.createMediaStreamDestination();
		const source = context.createBufferSource();
		source.buffer = slice;
		source.connect(destination);

		const chunks = [];
		const recorder = new MediaRecorder(destination.stream, {
			mimeType,
			audioBitsPerSecond: 24_000,
		});
		recorder.ondataavailable = event => {
			if (event.data?.size) chunks.push(event.data);
		};
		const stopped = new Promise(resolve => {
			recorder.onstop = resolve;
			recorder.onerror = resolve;
		});
		recorder.start(250);
		await context.resume();
		source.start(0);
		await new Promise(resolve => {
			source.onended = resolve;
		});
		if (recorder.state !== 'inactive') recorder.stop();
		await stopped;
		const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
		return blob.size ? blob : null;
	} finally {
		await context.close().catch(() => {});
	}
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

function isVideoLikeFile(file) {
	const type = String(file?.type || '').toLowerCase();
	const name = String(file?.name || '').toLowerCase();
	return type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(name);
}

function baseFileName(file) {
	return String(file?.name || 'audio').replace(/\.[^.]+$/, '') || 'audio';
}

/**
 * Extract / recompress media so large MP4 uploads do not hit the reverse-proxy body limit.
 * Returns the original file when compression is unnecessary or unavailable.
 */
export async function prepareTranscriptionUploadFile(file) {
	if (!file) return file;
	const needsPrep =
		isVideoLikeFile(file) || file.size > SAFE_PROXY_UPLOAD_BYTES || file.size > 8 * 1024 * 1024;
	if (!needsPrep) return file;

	try {
		const decoded = await decodeAudioFile(file);
		const opus = await encodeAudioBufferToOpus(decoded);
		if (opus && opus.size > 0 && opus.size < file.size) {
			const ext = String(opus.type || '').includes('ogg') ? 'ogg' : 'webm';
			return new File([opus], `${baseFileName(file)}.${ext}`, {
				type: opus.type || `audio/${ext}`,
			});
		}
		// Fallback: mono WAV can still be smaller than a video container, but keep size in check.
		const wav = encodeWavMono(mixToMono(decoded, 0, decoded.length), decoded.sampleRate);
		if (wav.size > 0 && wav.size < file.size) {
			return new File([wav], `${baseFileName(file)}.wav`, { type: 'audio/wav' });
		}
	} catch {
		/* keep original — caller may still chunk or fail with a clear message */
	}
	return file;
}

/**
 * @returns {Promise<File[]>} original file as single-item array when no split needed
 */
export async function splitAudioFileForTranscription(file, chunkSeconds) {
	const limit = normalizeTranscriptionChunkSeconds(chunkSeconds);
	if (!file || limit <= 0) return [file];

	const decoded = await decodeAudioFile(file);
	const duration = Number(decoded.duration) || 0;
	if (!(duration > limit + 2)) {
		return [file];
	}

	const sampleRate = decoded.sampleRate;
	const totalSamples = decoded.length;
	const chunkSamples = Math.max(1, Math.floor(limit * sampleRate));
	const nameRoot = baseFileName(file);
	const parts = [];

	for (let start = 0, index = 0; start < totalSamples; start += chunkSamples, index += 1) {
		const length = Math.min(chunkSamples, totalSamples - start);
		if (length < sampleRate * 0.25) break; // skip tiny trailing scraps < 0.25s
		const partLabel = `${nameRoot}.part${String(index + 1).padStart(2, '0')}`;
		let blob = await encodeAudioBufferToOpus(decoded, start, length);
		let extension = 'webm';
		let type = 'audio/webm';
		if (!blob) {
			blob = encodeWavMono(mixToMono(decoded, start, length), sampleRate);
			extension = 'wav';
			type = 'audio/wav';
		} else {
			extension = String(blob.type || '').includes('ogg') ? 'ogg' : 'webm';
			type = blob.type || `audio/${extension}`;
		}
		parts.push(new File([blob], `${partLabel}.${extension}`, { type }));
	}

	return parts.length ? parts : [file];
}
