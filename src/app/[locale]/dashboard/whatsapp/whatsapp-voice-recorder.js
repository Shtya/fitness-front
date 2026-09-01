export const VOICE_NOTE_MAX_SECONDS = 299;
export const VOICE_NOTE_BITRATE = 16_000;

const VOICE_RECORDER_MIME_TYPES = [
	'audio/ogg;codecs=opus',
	'audio/webm;codecs=opus',
	'audio/webm',
];

export function pickVoiceRecorderMimeType() {
	if (typeof MediaRecorder === 'undefined') return undefined;
	return VOICE_RECORDER_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
}

export function getVoiceMediaStream() {
	return navigator.mediaDevices.getUserMedia({
		audio: {
			channelCount: 1,
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
	});
}

export function createVoiceMediaRecorder(stream) {
	const mimeType = pickVoiceRecorderMimeType();
	return new MediaRecorder(stream, {
		...(mimeType ? { mimeType } : {}),
		audioBitsPerSecond: VOICE_NOTE_BITRATE,
	});
}

export function buildVoicePreviewBlob(chunks, recorder) {
	if (!chunks?.length) return null;
	const recordedType = recorder?.mimeType || chunks[0]?.type || 'audio/webm';
	const mime = recordedType.split(';')[0] || recordedType;
	const blob = new Blob(chunks, { type: mime });
	if (!blob.size) return null;
	return blob;
}

export function buildVoicePreviewUrl(chunks, recorder) {
	const blob = buildVoicePreviewBlob(chunks, recorder);
	if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
	return URL.createObjectURL(blob);
}

export function buildVoiceNoteFile(chunks, recorder, durationSec) {
	const blob = buildVoicePreviewBlob(chunks, recorder);
	if (!blob) return null;
	const recordedType = recorder?.mimeType || chunks[0]?.type || 'audio/webm';
	const mime = recordedType.split(';')[0] || recordedType;
	const seconds = Math.max(1, Number(durationSec) || 1);
	const extension = mime.includes('ogg') ? 'ogg' : 'webm';
	const fileType = mime.includes('ogg') ? 'audio/ogg;codecs=opus' : mime;
	return new File([blob], `voice-${seconds}s.${extension}`, { type: fileType });
}

function extractApiErrorMessage(error) {
	const data = error?.response?.data;
	if (!data) return String(error?.message || '').trim();
	if (typeof data === 'string') return data.trim();
	const message = data.message;
	if (typeof message === 'string' && message.trim()) return message.trim();
	if (Array.isArray(message) && message.length) {
		return message.map(item => String(item || '').trim()).filter(Boolean).join(', ');
	}
	if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
	return String(error?.message || '').trim();
}

export function mediaUploadFailedMessage(error, locale = 'en') {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const status = error?.response?.status;
	const text = extractApiErrorMessage(error);
	const tooLarge =
		status === 413 || /413|entity too large|payload too large|file too large/i.test(text);
	if (tooLarge) {
		return ar
			? 'الملف كبير جداً على السيرفر. جرّب ملفاً أصغر.'
			: 'This file is too large for the server. Try a smaller file.';
	}
	if (!error?.response && (error?.code === 'ERR_NETWORK' || /network error/i.test(text))) {
		return ar
			? 'فشل رفع الوسائط. تحقق من الاتصال أو جرّب ملفاً أصغر.'
			: 'Media upload failed. Check your connection or try a smaller file.';
	}
	if (text) return text;
	if (status === 502 || status === 503) {
		return ar
			? 'تعذر إرسال الوسائط عبر واتساب. تأكد أن الحساب متصل ثم أعد المحاولة.'
			: 'Could not send media through WhatsApp. Make sure the account is connected, then try again.';
	}
	return ar ? 'فشل إرسال الوسائط' : 'Media message failed';
}
