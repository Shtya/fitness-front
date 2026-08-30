/**
 * Browser-side audio prep for long / video transcription jobs.
 * Always extracts audio from video first, downsamples to 16 kHz mono WAV,
 * and slices by a byte budget so each POST survives small nginx body limits
 * (default 1m → browser shows generic "Network Error" with no HTTP status).
 */

export const DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 210; // 3.5 minutes
export const MIN_TRANSCRIPTION_CHUNK_SECONDS = 60;
export const MAX_TRANSCRIPTION_CHUNK_SECONDS = 900;
export const TRANSCRIPTION_CHUNK_STORAGE_KEY = 'transcript:chunkSeconds';
export const TRANSCRIPTION_TARGET_SAMPLE_RATE = 16_000;

/**
 * Stay under common nginx `client_max_body_size 1m` with multipart overhead.
 * Older 8MB cap still failed on many hosts after WAV conversion.
 */
export const SAFE_PROXY_UPLOAD_BYTES = 900 * 1024;

/** Fallback slice length when video/large; still clamped by byte budget below. */
export const VIDEO_FORCE_CHUNK_SECONDS = 25;

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
	if (type.startsWith('audio/')) return false;
	return (
		type.startsWith('video/') ||
		/\.(mp4|mov|m4v|mkv|avi)$/i.test(name) ||
		/^whatsapp-video[-_]/i.test(name)
	);
}

export function isAudioUploadFile(file) {
	const type = String(file?.type || '').toLowerCase();
	const name = String(file?.name || '').toLowerCase();
	if (isVideoLikeFile(file)) return false;
	return (
		type.startsWith('audio/') ||
		/\.(mp3|wav|m4a|ogg|opus|webm|aac|flac)$/i.test(name)
	);
}

/** Max seconds of 16-bit mono WAV that fit under the proxy budget. */
export function maxWavChunkSeconds(
	sampleRate = TRANSCRIPTION_TARGET_SAMPLE_RATE,
	budgetBytes = SAFE_PROXY_UPLOAD_BYTES,
) {
	const bytesPerSecond = Math.max(1, sampleRate) * 2;
	const usable = Math.max(bytesPerSecond, budgetBytes - 64);
	return Math.max(12, Math.floor(usable / bytesPerSecond));
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

/**
 * Fallback when decodeAudioData rejects MP4/WhatsApp video containers:
 * play through a media element and capture Opus audio (realtime, but reliable).
 */
async function extractAudioViaMediaElement(file) {
	if (typeof document === 'undefined') throw new Error('No document');
	const url = URL.createObjectURL(file);
	const media = document.createElement('video');
	media.preload = 'auto';
	media.playsInline = true;
	media.muted = false;
	media.volume = 0.001;
	media.src = url;

	const waitEvent = (target, eventName, timeoutMs = 60_000) =>
		new Promise((resolve, reject) => {
			const timer = window.setTimeout(() => {
				cleanup();
				reject(new Error(`Timed out waiting for ${eventName}`));
			}, timeoutMs);
			const onOk = () => {
				cleanup();
				resolve();
			};
			const onErr = () => {
				cleanup();
				reject(new Error(`Media failed during ${eventName}`));
			};
			const cleanup = () => {
				window.clearTimeout(timer);
				target.removeEventListener(eventName, onOk);
				target.removeEventListener('error', onErr);
			};
			target.addEventListener(eventName, onOk, { once: true });
			target.addEventListener('error', onErr, { once: true });
		});

	try {
		await waitEvent(media, 'loadedmetadata');
		if (!Number.isFinite(media.duration) || media.duration <= 0) {
			throw new Error('Media has no duration');
		}

		const capture =
			typeof media.captureStream === 'function'
				? media.captureStream()
				: typeof media.mozCaptureStream === 'function'
					? media.mozCaptureStream()
					: null;
		if (!capture) throw new Error('captureStream is not supported');

		const audioTracks = capture.getAudioTracks();
		if (!audioTracks.length) throw new Error('No audio track in video');
		const audioStream = new MediaStream(audioTracks);

		const mimeCandidates = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/ogg;codecs=opus',
			'audio/mp4',
		];
		const mimeType =
			mimeCandidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';
		const chunks = [];
		const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);

		const done = new Promise((resolve, reject) => {
			recorder.ondataavailable = event => {
				if (event.data?.size) chunks.push(event.data);
			};
			recorder.onerror = () => reject(new Error('Audio capture failed'));
			recorder.onstop = () => resolve();
		});

		recorder.start(500);
		await media.play();
		await waitEvent(media, 'ended', Math.ceil(media.duration * 1000) + 30_000);
		if (recorder.state !== 'inactive') recorder.stop();
		await done;

		const blobType = recorder.mimeType || mimeType || 'audio/webm';
		const blob = new Blob(chunks, { type: blobType });
		if (blob.size < 64) throw new Error('Captured audio is empty');
		const ext = blobType.includes('ogg') ? 'ogg' : blobType.includes('mp4') ? 'm4a' : 'webm';
		return new File([blob], `${baseFileName(file)}.extracted.${ext}`, { type: blobType.split(';')[0] });
	} finally {
		media.pause();
		media.removeAttribute('src');
		media.load();
		URL.revokeObjectURL(url);
	}
}

async function decodeMediaToAudioBuffer(file) {
	try {
		return await decodeAudioFile(file);
	} catch (primaryError) {
		if (!isVideoLikeFile(file)) throw primaryError;
		const extracted = await extractAudioViaMediaElement(file);
		return decodeAudioFile(extracted);
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
	const parts = await buildTranscriptionUploadParts(file);
	return parts[0] || file;
}

/**
 * @returns {Promise<File[]>} original file as single-item array when no split needed
 */
export async function splitAudioFileForTranscription(file, chunkSeconds) {
	const parts = await buildTranscriptionUploadParts(file, chunkSeconds);
	return parts;
}

/**
 * Decode video/audio → 16 kHz mono WAV slices sized for the proxy budget.
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
	const mustConvert = videoLike || large || !isAudioUploadFile(file);

	const budgetSeconds = maxWavChunkSeconds(TRANSCRIPTION_TARGET_SAMPLE_RATE);
	let limit = preferred;

	// Video / oversized: always convert + keep each WAV under nginx-safe size.
	if (videoLike || large || mustConvert) {
		if (limit <= 0) limit = Math.min(VIDEO_FORCE_CHUNK_SECONDS, budgetSeconds);
		limit = Math.min(limit || budgetSeconds, budgetSeconds, VIDEO_FORCE_CHUNK_SECONDS);
	}

	// Small plain audio under the proxy cap with chunking off: upload as-is.
	if (!mustConvert && !large && limit <= 0) {
		onProgress?.({ phase: 'ready', percent: 100 });
		return [file];
	}

	onProgress?.({ phase: 'decoding', percent: 8 });
	let decoded;
	try {
		decoded = await decodeMediaToAudioBuffer(file);
	} catch (error) {
		if (!videoLike && !large && file.size <= SAFE_PROXY_UPLOAD_BYTES) return [file];
		const err = new Error(
			'Could not extract sound from this video in the browser. Export audio (mp3/wav/m4a) and retry.',
		);
		err.code = 'AUDIO_DECODE_FAILED';
		err.cause = error;
		throw err;
	}

	const duration = Number(decoded.duration) || 0;
	const sampleRate = decoded.sampleRate;
	const totalSamples = decoded.length;
	const nameRoot = baseFileName(file);
	// Chunk in source-sample space so downsampled 16 kHz WAV stays under budget.
	const maxSourceSamplesPerChunk = Math.max(
		1,
		Math.floor(maxWavChunkSeconds(TRANSCRIPTION_TARGET_SAMPLE_RATE) * sampleRate),
	);

	let chunkSamples =
		limit > 0
			? Math.min(Math.floor(limit * sampleRate), maxSourceSamplesPerChunk)
			: maxSourceSamplesPerChunk;
	chunkSamples = Math.max(1, chunkSamples);

	const needsSplit =
		mustConvert ||
		large ||
		file.size > SAFE_PROXY_UPLOAD_BYTES ||
		(limit > 0 && duration > limit + 2) ||
		totalSamples > maxSourceSamplesPerChunk;

	if (!needsSplit) {
		onProgress?.({ phase: 'encoding', percent: 55 });
		const single = sliceToWavFile(decoded, 0, totalSamples, `${nameRoot}.wav`);
		onProgress?.({ phase: 'ready', percent: 100 });
		if (!videoLike && file.size <= SAFE_PROXY_UPLOAD_BYTES && file.size <= single.size) {
			return [file];
		}
		if (single.size <= SAFE_PROXY_UPLOAD_BYTES) {
			return [single];
		}
		chunkSamples = Math.min(chunkSamples, Math.floor(maxSourceSamplesPerChunk * 0.85));
	}

	const parts = [];
	const estimatedParts = Math.max(1, Math.ceil(totalSamples / chunkSamples));
	let start = 0;
	let index = 0;

	while (start < totalSamples) {
		let length = Math.min(chunkSamples, totalSamples - start);
		if (length < sampleRate * 0.2) break;

		let part = sliceToWavFile(
			decoded,
			start,
			length,
			`${nameRoot}.part${String(index + 1).padStart(2, '0')}.wav`,
		);

		// If a slice still exceeds the budget, shrink and re-encode.
		let guard = 0;
		while (part.size > SAFE_PROXY_UPLOAD_BYTES && length > sampleRate * 0.5 && guard < 6) {
			length = Math.floor(length * 0.75);
			part = sliceToWavFile(
				decoded,
				start,
				length,
				`${nameRoot}.part${String(index + 1).padStart(2, '0')}.wav`,
			);
			guard += 1;
		}

		if (part.size > SAFE_PROXY_UPLOAD_BYTES) {
			const err = new Error(
				'Converted audio chunk is still too large for the server proxy. Try a shorter video.',
			);
			err.code = 'UPLOAD_TOO_LARGE_FOR_PROXY';
			throw err;
		}

		parts.push(part);
		start += length;
		index += 1;

		onProgress?.({
			phase: 'encoding',
			percent: Math.min(95, Math.round((index / estimatedParts) * 90) + 8),
			chunkIndex: index,
			chunkTotal: estimatedParts,
		});
	}

	onProgress?.({ phase: 'ready', percent: 100 });

	if (!parts.length) {
		const err = new Error(
			'Could not extract sound from this video. Export audio (mp3/wav) and retry.',
		);
		err.code = 'AUDIO_DECODE_FAILED';
		throw err;
	}

	// Hard rule: never return a video container for upload.
	if (parts.some(part => isVideoLikeFile(part))) {
		const err = new Error('Video must be converted to audio before upload.');
		err.code = 'VIDEO_NOT_CONVERTED';
		throw err;
	}

	return parts;
}
