import api from '@/utils/axios';
import {
	SAFE_PROXY_UPLOAD_BYTES,
	getStoredTranscriptionChunkSeconds,
	normalizeTranscriptionChunkSeconds,
	prepareTranscriptionUploadFile,
	splitAudioFileForTranscription,
} from './transcription-audio-chunks';

export {
	DEFAULT_TRANSCRIPTION_CHUNK_SECONDS,
	MAX_TRANSCRIPTION_CHUNK_SECONDS,
	MIN_TRANSCRIPTION_CHUNK_SECONDS,
	SAFE_PROXY_UPLOAD_BYTES,
	TRANSCRIPTION_CHUNK_PRESETS,
	TRANSCRIPTION_CHUNK_STORAGE_KEY,
	getStoredTranscriptionChunkSeconds,
	normalizeTranscriptionChunkSeconds,
	prepareTranscriptionUploadFile,
	storeTranscriptionChunkSeconds,
} from './transcription-audio-chunks';

export const ACCEPTED_TRANSCRIPTION_EXTENSIONS = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'mp4'];
export const TRANSCRIPTION_ACCEPT = ACCEPTED_TRANSCRIPTION_EXTENSIONS
	.map(extension => `.${extension}`)
	.join(',');
export const MAX_TRANSCRIPTION_FILE_SIZE = 500 * 1024 * 1024;
export const GROQ_FREE_MAX_FILE_SIZE = 25 * 1024 * 1024;
/** Cloud STT (especially long WhatsApp notes) can take several minutes. */
export const TRANSCRIPTION_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;
export const TRANSCRIPTION_PROVIDER_STORAGE_KEY = 'transcript:provider';
export const TRANSCRIPTION_PROVIDERS = [
	{
		id: 'assemblyai',
		name: 'AssemblyAI Universal 3.5 Pro',
		score: 96,
		keyUrl: 'https://www.assemblyai.com/dashboard',
	},
	{
		id: 'groq',
		name: 'Groq Whisper Large V3 Turbo',
		score: 93,
		keyUrl: 'https://console.groq.com/keys',
	},
	{
		id: 'deepgram',
		name: 'Deepgram Nova-3',
		score: 89,
		keyUrl: 'https://console.deepgram.com/',
	},
	{
		id: 'local',
		name: 'Local faster-whisper Base',
		score: 76,
		keyUrl: null,
	},
];
export const CLOUD_TRANSCRIPTION_PROVIDER_IDS = TRANSCRIPTION_PROVIDERS
	.filter(item => item.id !== 'local')
	.map(item => item.id);

export function getStoredTranscriptionProvider() {
	if (typeof window === 'undefined') return 'local';
	try {
		const provider = window.localStorage.getItem(TRANSCRIPTION_PROVIDER_STORAGE_KEY);
		return TRANSCRIPTION_PROVIDERS.some(item => item.id === provider) ? provider : 'local';
	} catch {
		return 'local';
	}
}

export function storeTranscriptionProvider(provider) {
	if (!TRANSCRIPTION_PROVIDERS.some(item => item.id === provider)) return false;
	try {
		window.localStorage.setItem(TRANSCRIPTION_PROVIDER_STORAGE_KEY, provider);
		return true;
	} catch {
		return false;
	}
}

function extensionFromMimeType(mimeType) {
	const normalized = String(mimeType || '').split(';')[0].toLowerCase();
	if (normalized.includes('ogg')) return 'ogg';
	if (normalized.includes('wav')) return 'wav';
	if (normalized.includes('mpeg')) return 'mp3';
	if (normalized.includes('mp4')) return 'm4a';
	return 'webm';
}

export function createTranscriptionFile(blob, preferredName, fallbackId, mimeType) {
	const type = String(mimeType || blob?.type || 'audio/webm').split(';')[0];
	const preferred = String(preferredName || '').trim();
	const preferredExtension = preferred.split('.').pop()?.toLowerCase();
	const name = ACCEPTED_TRANSCRIPTION_EXTENSIONS.includes(preferredExtension)
		? preferred
		: `whatsapp-voice-${fallbackId || Date.now()}.${extensionFromMimeType(type)}`;
	return new File([blob], name, { type });
}

export async function createTranscription({
	file,
	provider,
	language = 'auto',
	customVocabulary = '',
	onUploadProgress,
}) {
	const form = new FormData();
	form.append('file', file);
	form.append('provider', provider);
	form.append('language', language);
	const vocabulary = String(customVocabulary || '').trim();
	if (vocabulary) form.append('customVocabulary', vocabulary);
	const { data } = await api.post('/transcriptions', form, {
		// Let the browser set multipart boundary; do not force Content-Type.
		timeout: TRANSCRIPTION_REQUEST_TIMEOUT_MS,
		onUploadProgress,
	});
	return data;
}

/**
 * Splits long audio into timed chunks (configurable), transcribes each request,
 * then merges into one transcription record.
 */
export async function createChunkedTranscription({
	file,
	provider,
	language = 'auto',
	customVocabulary = '',
	chunkSeconds = getStoredTranscriptionChunkSeconds(),
	onUploadProgress,
	onChunkProgress,
}) {
	let prepared = file;
	try {
		prepared = await prepareTranscriptionUploadFile(file);
	} catch {
		prepared = file;
	}

	let parts = [prepared];
	try {
		parts = await splitAudioFileForTranscription(prepared, chunkSeconds);
	} catch {
		parts = [prepared];
	}

	// If the whole file is still huge and chunking was off, force time-based splits.
	if (
		parts.length === 1 &&
		parts[0].size > SAFE_PROXY_UPLOAD_BYTES &&
		normalizeTranscriptionChunkSeconds(chunkSeconds) <= 0
	) {
		try {
			parts = await splitAudioFileForTranscription(prepared, 180);
		} catch {
			/* keep single part */
		}
	}

	const oversized = parts.find(part => part.size > SAFE_PROXY_UPLOAD_BYTES);
	if (oversized) {
		const mb = (oversized.size / (1024 * 1024)).toFixed(1);
		const error = new Error(
			`Upload too large for production proxy (~${mb} MB). Use a shorter video, a smaller audio export, or enable chunking (2–3 minutes).`,
		);
		error.code = 'UPLOAD_TOO_LARGE_FOR_PROXY';
		throw error;
	}

	if (provider === 'groq') {
		const groqOversize = parts.find(part => part.size > GROQ_FREE_MAX_FILE_SIZE);
		if (groqOversize) {
			const error = new Error(
				'A transcription chunk is larger than Groq free tier allows (25 MB). Use a shorter chunk length.',
			);
			error.code = 'GROQ_CHUNK_TOO_LARGE';
			throw error;
		}
	}

	const records = [];
	for (let index = 0; index < parts.length; index += 1) {
		onChunkProgress?.({
			chunkIndex: index + 1,
			chunkTotal: parts.length,
			fileName: parts[index]?.name,
		});
		const data = await createTranscription({
			file: parts[index],
			provider,
			language,
			customVocabulary,
			onUploadProgress:
				parts.length === 1
					? onUploadProgress
					: event => {
							if (!event?.total) return;
							const local = Math.min(100, Math.round((event.loaded * 100) / event.total));
							const overall = Math.min(
								100,
								Math.round(((index + local / 100) / parts.length) * 100),
							);
							onUploadProgress?.({
								...event,
								loaded: overall,
								total: 100,
								chunkIndex: index + 1,
								chunkTotal: parts.length,
							});
						},
		});
		records.push(data);
	}

	if (records.length === 1) return records[0];

	const combinedText = records
		.map(item => String(item?.text || '').trim())
		.filter(Boolean)
		.join('\n\n');
	const durationSeconds = records.reduce(
		(sum, item) => sum + (Number(item.durationSeconds) || 0),
		0,
	);
	const processingTimeSeconds = records.reduce(
		(sum, item) => sum + (Number(item.processingTimeSeconds) || 0),
		0,
	);
	const extras = records.slice(1);
	let merged = {
		...records[0],
		text: combinedText,
		originalFileName: file?.name || records[0].originalFileName,
		durationSeconds,
		processingTimeSeconds,
		chunkCount: records.length,
	};
	try {
		const { data } = await api.patch(
			`/transcriptions/${records[0].id}`,
			{ text: combinedText },
			{ timeout: TRANSCRIPTION_REQUEST_TIMEOUT_MS },
		);
		merged = {
			...data,
			originalFileName: file?.name || data.originalFileName,
			durationSeconds,
			processingTimeSeconds,
			chunkCount: records.length,
		};
	} catch {
		/* keep local merge if patch fails */
	}
	if (extras.length) {
		await Promise.allSettled(extras.map(item => api.delete(`/transcriptions/${item.id}`)));
	}
	return merged;
}

export function transcriptionErrorMessage(error, fallback = 'Transcription failed.') {
	const status = error?.response?.status;
	const data = error?.response?.data;
	const raw = data?.message ?? data?.error ?? error?.message;
	const rawText = Array.isArray(raw)
		? raw.map(String).filter(Boolean).join(', ')
		: typeof raw === 'string'
			? raw.trim()
			: raw && typeof raw === 'object' && typeof raw.message === 'string'
				? raw.message.trim()
				: '';

	// Production reverse proxies (nginx default ~1MB) reject before Nest reaches Multer (500MB).
	if (status === 413 || /request entity too large|payload too large/i.test(rawText)) {
		return 'Upload rejected: file too large for the server proxy (HTTP 413). Raise nginx client_max_body_size (e.g. 100m) for api.so7bafit.com, reload nginx, then retry.';
	}

	if (Array.isArray(raw)) return rawText || fallback;
	if (rawText) return rawText;
	if (error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''))) {
		return 'Transcription timed out. Try again, or use a shorter clip.';
	}
	// Nginx 413 often omits CORS headers → axios surfaces "Network Error" with no response body.
	if (!error?.response && /network error/i.test(String(error?.message || ''))) {
		return 'Network Error — the reverse proxy likely blocked a large upload (HTTP 413). The app now compresses video to audio first; if it still fails, raise nginx client_max_body_size to 100m for api.so7bafit.com and reload nginx.';
	}
	if (!error?.response && error?.message) return error.message;
	return fallback;
}

export async function enhanceTranscription(id, payload = {}) {
	const { data } = await api.post(`/transcriptions/${id}/enhance`, payload, {
		timeout: 0,
	});
	return data;
}

export async function memorizeTranscription(id, payload = {}) {
	const { data } = await api.post(`/transcriptions/${id}/memorize`, payload, {
		timeout: 0,
	});
	return data;
}

export async function summarizeTranscription(id, payload = {}) {
	const { data } = await api.post(`/transcriptions/${id}/summarize`, payload, {
		timeout: 0,
	});
	return data;
}

export async function createTextTranscription({
	text,
	originalFileName = 'whatsapp-selection.txt',
	language = 'auto',
} = {}) {
	const { data } = await api.post(
		'/transcriptions/from-text',
		{ text, originalFileName, language },
		{ timeout: 0 },
	);
	return data;
}

export const MAX_TRANSCRIPT_BUNDLE_ITEMS = 25;
export const VOICE_ATTACHMENT_TYPES = ['audio', 'ptt', 'voice'];

export function isVoiceLikeType(type) {
	return VOICE_ATTACHMENT_TYPES.includes(String(type || '').toLowerCase());
}

export function timestampMs(value) {
	if (value == null || value === '') return 0;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
	}
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTimestampWithMs(value) {
	const ms = timestampMs(value);
	if (!ms) return '';
	const date = new Date(ms);
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');
	const milli = String(date.getMilliseconds()).padStart(3, '0');
	return `${hh}:${mm}:${ss}.${milli}`;
}

export function findVoiceAttachment(message) {
	const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
	return (
		attachments.find(item => isVoiceLikeType(item?.type || message?.type)) ||
		null
	);
}

export function isVoiceMessage(message) {
	if (findVoiceAttachment(message)) return true;
	return isVoiceLikeType(message?.type);
}

export function isSelectableTranscriptMessage(message) {
	if (!message || message.optimistic) return false;
	if (message.deletedMode && message.deletedMode !== 'none') return false;
	if (isVoiceMessage(message)) return true;
	return Boolean(String(message.text || '').trim());
}

export function toTranscriptSource(message) {
	const voice = findVoiceAttachment(message);
	const voiceMessage = Boolean(voice) || isVoiceLikeType(message?.type);
	return {
		id: String(message?.id || ''),
		kind: voiceMessage ? 'voice' : 'text',
		timestamp: message?.providerTimestamp || message?.timestamp || message?.created_at,
		text: String(message?.text || '').trim(),
		attachment: voice,
		fileName: voice?.fileName || '',
		size: Number(voice?.sizeBytes || voice?.size || voice?.fileSize || 0),
	};
}

export function audioDisplayName(item, index = 0, fallbackTemplate = 'Audio {n}') {
	const raw = String(
		item?.originalFileName || item?.fileName || item?.name || item?.label || '',
	).trim();
	if (raw) {
		const base = raw.split(/[/\\]/).pop() || raw;
		return base.replace(/\s+/g, ' ').trim() || fallbackTemplate.replace('{n}', String(index + 1));
	}
	return String(fallbackTemplate || 'Audio {n}').replace('{n}', String(index + 1));
}

export function buildTimelineTranscript(items, labels = {}) {
	const audioLabel = labels.audioLabel || 'Audio {n}';
	const messageLabel = labels.messageLabel || 'Message';
	const missingVoice = labels.missingVoice || '';
	return (items || [])
		.map((item, index) => {
			const time = formatTimestampWithMs(item.timestamp);
			const heading =
				item.kind === 'voice'
					? audioDisplayName(item, (item.audioIndex || index + 1) - 1, audioLabel)
					: messageLabel;
			const body =
				String(item.text || '').trim() ||
				(item.kind === 'voice' ? missingVoice : '');
			return [time ? `[${time}] ${heading}` : heading, body].filter(Boolean).join('\n');
		})
		.join('\n\n');
}
