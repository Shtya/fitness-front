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
