/**
 * Browser-side audio splitting for long transcription jobs.
 * Decodes with Web Audio, slices by duration, encodes mono 16-bit WAV chunks.
 */

export const DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 210; // 3.5 minutes
export const MIN_TRANSCRIPTION_CHUNK_SECONDS = 60;
export const MAX_TRANSCRIPTION_CHUNK_SECONDS = 900;
export const TRANSCRIPTION_CHUNK_STORAGE_KEY = 'transcript:chunkSeconds';

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
	const baseName = String(file.name || 'audio').replace(/\.[^.]+$/, '') || 'audio';
	const parts = [];

	for (let start = 0, index = 0; start < totalSamples; start += chunkSamples, index += 1) {
		const length = Math.min(chunkSamples, totalSamples - start);
		if (length < sampleRate * 0.25) break; // skip tiny trailing scraps < 0.25s
		const mono = mixToMono(decoded, start, length);
		const blob = encodeWavMono(mono, sampleRate);
		parts.push(
			new File([blob], `${baseName}.part${String(index + 1).padStart(2, '0')}.wav`, {
				type: 'audio/wav',
			}),
		);
	}

	return parts.length ? parts : [file];
}
