import api from '@/utils/axios';

export const ACCEPTED_TRANSCRIPTION_EXTENSIONS = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'mp4'];
export const TRANSCRIPTION_ACCEPT = ACCEPTED_TRANSCRIPTION_EXTENSIONS
	.map(extension => `.${extension}`)
	.join(',');
export const MAX_TRANSCRIPTION_FILE_SIZE = 500 * 1024 * 1024;
export const GROQ_FREE_MAX_FILE_SIZE = 25 * 1024 * 1024;
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
		headers: { 'Content-Type': 'multipart/form-data' },
		timeout: 0,
		onUploadProgress,
	});
	return data;
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

export function buildTimelineTranscript(items, labels = {}) {
	const audioLabel = labels.audioLabel || 'Audio {n}';
	const messageLabel = labels.messageLabel || 'Message';
	const missingVoice = labels.missingVoice || '';
	return (items || [])
		.map(item => {
			const time = formatTimestampWithMs(item.timestamp);
			const heading =
				item.kind === 'voice'
					? audioLabel.replace('{n}', String(item.audioIndex || 1))
					: messageLabel;
			const body =
				String(item.text || '').trim() ||
				(item.kind === 'voice' ? missingVoice : '');
			return [time ? `[${time}] ${heading}` : heading, body].filter(Boolean).join('\n');
		})
		.join('\n\n');
}
