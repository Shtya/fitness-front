import { getMessageTranscript } from './whatsapp-message-transcripts.js';
import { visibleMessageText } from './whatsapp-utils.js';

const VOICE_TYPES = new Set(['audio', 'ptt', 'voice']);
const VIDEO_TYPES = new Set(['video']);

function timestampMs(value) {
	if (value == null || value === '') return 0;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
	}
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function isVoiceLikeType(type) {
	return VOICE_TYPES.has(String(type || '').toLowerCase());
}

function isVideoLikeType(type) {
	const normalized = String(type || '').toLowerCase();
	return VIDEO_TYPES.has(normalized) || normalized.startsWith('video/');
}

export function isTranscribableMediaMessage(message) {
	const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
	if (attachments.some(item => isVoiceLikeType(item?.type) || isVideoLikeType(item?.type))) {
		return true;
	}
	return isVoiceLikeType(message?.type) || isVideoLikeType(message?.type);
}

export function messageTimestampValue(message) {
	return message?.providerTimestamp || message?.timestamp || message?.created_at;
}

export function sortMessagesByTime(messages = []) {
	return [...messages].sort((a, b) => {
		const delta =
			timestampMs(messageTimestampValue(a)) - timestampMs(messageTimestampValue(b));
		if (delta !== 0) return delta;
		return String(a?.id || '').localeCompare(String(b?.id || ''));
	});
}

export function resolveStoredTranscript(message, transcriptMap = {}) {
	const id = String(message?.id || '');
	const fromState = transcriptMap[id]?.text;
	const fromStore = getMessageTranscript(id)?.text;
	return String(fromState || fromStore || '').trim();
}

export function messageNeedsTranscription(message, transcriptMap = {}) {
	if (!message || message.optimistic) return false;
	if (!isTranscribableMediaMessage(message)) return false;
	return !resolveStoredTranscript(message, transcriptMap);
}

export function messageCopyBody(message, transcriptMap = {}, textOverrideById = {}) {
	const id = String(message?.id || '');
	if (textOverrideById[id]) return String(textOverrideById[id]).trim();
	if (isTranscribableMediaMessage(message)) {
		return resolveStoredTranscript(message, transcriptMap);
	}
	return String(visibleMessageText(message?.text) || '').trim();
}

export function formatMessageCopyTimestamp(value, locale = 'en') {
	const ms = timestampMs(value);
	if (!ms) return '';
	return new Date(ms).toLocaleTimeString(locale === 'ar' ? 'ar-QA' : undefined, {
		hour: 'numeric',
		minute: '2-digit',
	});
}

export function buildSelectedMessagesCopyText(
	messages = [],
	{ locale = 'en', transcriptMap = {}, textOverrideById = {} } = {},
) {
	return sortMessagesByTime(messages)
		.map(message => {
			const time = formatMessageCopyTimestamp(messageTimestampValue(message), locale);
			const body = messageCopyBody(message, transcriptMap, textOverrideById);
			if (!time && !body) return '';
			if (!body) return time;
			if (!time) return body;
			return `${time}\n${body}`;
		})
		.filter(Boolean)
		.join('\n\n');
}

export function transcriptTextByIdFromTimeline(timeline = []) {
	const out = {};
	for (const item of timeline) {
		const id = String(item?.id || '').trim();
		const text = String(item?.text || '').trim();
		if (id && text) out[id] = text;
	}
	return out;
}
