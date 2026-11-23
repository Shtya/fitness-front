export const VOICE_NOTE_MAX_SECONDS = 299;
/** Recording clock resolution; fine enough that pausing does not skew the length. */
export const VOICE_TICK_SECONDS = 0.25;
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

/*
 * Warm microphone reuse. Browsers (iOS especially) ask "Allow microphone?" again whenever
 * a page requests the mic after it stopped every track. So after a voice note the stream
 * is kept muted for a short while and handed to the next recording instead of asking again.
 * It is released as soon as any audio/video starts playing (a live mic routes iOS playback
 * to the quiet earpiece), when the app goes to the background, or after VOICE_WARM_MS.
 */
export const VOICE_WARM_MS = 45_000;
let warmVoice = null; // { stream, timer }
let warmListenersReady = false;

function streamIsLive(stream) {
	return Boolean(stream?.getAudioTracks?.().some(track => track.readyState === 'live'));
}

export function stopWarmVoiceStream() {
	if (!warmVoice) return;
	clearTimeout(warmVoice.timer);
	warmVoice.stream.getTracks().forEach(track => track.stop());
	warmVoice = null;
}

function ensureWarmListeners() {
	if (warmListenersReady || typeof document === 'undefined') return;
	warmListenersReady = true;
	document.addEventListener('play', stopWarmVoiceStream, true);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') stopWarmVoiceStream();
	});
	window.addEventListener('pagehide', stopWarmVoiceStream);
}

export async function getVoiceMediaStream() {
	if (warmVoice && streamIsLive(warmVoice.stream)) {
		clearTimeout(warmVoice.timer);
		const { stream } = warmVoice;
		warmVoice = null;
		stream.getAudioTracks().forEach(track => (track.enabled = true));
		return stream;
	}
	warmVoice = null;
	return navigator.mediaDevices.getUserMedia({
		audio: {
			channelCount: 1,
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
	});
}

/** End of a recording: keep the mic muted and warm for the next one instead of stopping it. */
export function releaseVoiceMediaStream(stream) {
	if (!streamIsLive(stream)) return;
	if (warmVoice && warmVoice.stream !== stream) stopWarmVoiceStream();
	stream.getAudioTracks().forEach(track => (track.enabled = false));
	ensureWarmListeners();
	clearTimeout(warmVoice?.timer);
	warmVoice = { stream, timer: setTimeout(stopWarmVoiceStream, VOICE_WARM_MS) };
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
