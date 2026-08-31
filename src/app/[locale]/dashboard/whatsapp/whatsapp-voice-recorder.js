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
	return new File([blob], `voice-${seconds}s.${extension}`, { type: mime });
}

export function mediaUploadFailedMessage(error, locale = 'en') {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const status = error?.response?.status;
	const text = String(error?.response?.data?.message || error?.message || '');
	const tooLarge =
		status === 413 || /413|entity too large|payload too large|file too large/i.test(text);
	if (tooLarge) {
		return ar
			? 'التسجيل كبير على السيرفر. جرّب رسالة أقصر.'
			: 'This recording is too large for the server. Try a shorter voice note.';
	}
	if (!error?.response && (error?.code === 'ERR_NETWORK' || /network error/i.test(text))) {
		return ar
			? 'فشل رفع الصوت. غالباً التسجيل أكبر من الحد المسموح على السيرفر.'
			: 'Voice upload failed. The recording is likely larger than the server allows.';
	}
	return error?.response?.data?.message || (ar ? 'فشل إرسال الوسائط' : 'Media message failed');
}
