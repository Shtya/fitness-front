import api from '@/utils/axios';

function normalizeVoiceChangerErrorText(value) {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.filter(Boolean).join(' ');
	if (typeof value === 'object') {
		const nested = value.message || value.error || value.detail?.message || '';
		if (Array.isArray(nested)) return nested.filter(Boolean).join(' ');
		return nested;
	}
	return String(value);
}

export function isElevenLabsPaidVoiceError(text) {
	return /paid_plan_required|payment_required|library voices|cannot use Voice Library/i.test(
		String(text || ''),
	);
}

export function isElevenLabsClonePermissionError(text) {
	return /create_instant_voice_clone|instant voice cloning|cannot clone voices/i.test(String(text || ''));
}

export async function readVoiceChangerError(error, locale = 'en') {
	const data = error?.response?.data;
	let message = '';
	if (data instanceof Blob) {
		const text = await data.text();
		try {
			const parsed = JSON.parse(text);
			message = normalizeVoiceChangerErrorText(parsed) || text;
		} catch {
			message = text;
		}
	} else {
		message = normalizeVoiceChangerErrorText(data) || error?.message || '';
	}
	if (/Cartesia Voice Changer was discontinued|discontinued on 20 Aug 2026/i.test(message)) {
		return locale === 'ar'
			? 'Cartesia أوقفت Voice Changer. استخدم ElevenLabs أو تغيير الدرجة المجاني.'
			: 'Cartesia discontinued Voice Changer. Use ElevenLabs or the free pitch changer.';
	}
	if (isElevenLabsClonePermissionError(message) && /elevenlabs/i.test(message)) {
		return locale === 'ar'
			? 'مفتاح ElevenLabs الحالي مش مسموح له يعمل Instant Voice Cloning. Restricted في الإعدادات غير صلاحية Voices على المفتاح نفسه: elevenlabs.io → Settings → API Keys → افتح المفتاح ده، طفّي Restricted، وفعّل Voices / Instant Voice Cloning. محتاج Starter على الأقل. تقدر كمان تستنسخ من موقع ElevenLabs وبعدين تختاره هنا.'
			: 'This ElevenLabs key cannot clone voices. Restricted is separate from Voices permission on the key itself: elevenlabs.io → Settings → API Keys → open THIS key, turn Restricted off, and enable Voices / Instant Voice Cloning. Starter or higher is required. You can also clone on the ElevenLabs website, then pick it here.';
	}
	if (/too_short|too short|at least (1 minute|60 seconds)|minimum of 60|not enough audio|needs about 60 seconds/i.test(message)) {
		return locale === 'ar'
			? 'استنساخ ElevenLabs محتاج حوالي 60 ثانية كلام واضح. ارفع عيّنات أكتر أو سجّل أطول وبعدين جرّب تاني. النافذة هتفضل مفتوحة.'
			: 'ElevenLabs Instant Voice Cloning needs about 60 seconds of clean speech. Add more clips or record longer samples, then try again.';
	}
	if (/insufficient balance|MiniMax account has insufficient balance/i.test(message)) {
		return locale === 'ar'
			? 'حساب MiniMax مفيهوش رصيد كافي لاستنساخ الصوت. أضف رصيد من platform.minimax.io أو استخدم مفتاح Coding Plan (speech-2.8-hd).'
			: 'Your MiniMax account has insufficient balance for voice cloning. Add credits at platform.minimax.io or use a Coding Plan key with speech-2.8-hd.';
	}
	if (/MiniMax cloning needs at least 10 seconds/i.test(message)) {
		return locale === 'ar'
			? 'استنساخ MiniMax محتاج 10 ثواني كلام واضح على الأقل. ارفع عيّنة أطول وبعدين جرّب تاني.'
			: message;
	}
	if (/Fish Audio cloning needs at least 8 seconds/i.test(message)) {
		return locale === 'ar'
			? 'استنساخ Fish Audio محتاج 8 ثواني كلام واضح على الأقل. ارفع عيّنة أطول وبعدين جرّب تاني.'
			: message;
	}
	if (/Save a free Groq key first|clone the voice then respeak/i.test(message)) {
		return locale === 'ar'
			? 'Fish Audio و MiniMax بيستنسخوا الصوت وبعدين ينطقوا الكلام. احفظ مفتاح Groq المجاني أولاً عشان الرسالة تتتفرغ.'
			: 'Fish Audio and MiniMax clone the voice then respeak the words. Save a free Groq key first so the WhatsApp note can be transcribed.';
	}
	if (isElevenLabsPaidVoiceError(message)) {
		return locale === 'ar'
			? 'الخطة المجانية في ElevenLabs لا تسمح بأصوات المكتبة عبر الـ API. اختَر صوتاً جاهزاً أو استنساخاً، أو استخدم تغيير الدرجة المجاني.'
			: 'Free ElevenLabs accounts cannot use Voice Library voices via the API. Pick a premade or cloned voice, or use the free pitch changer.';
	}
	return message || 'Voice conversion failed';
}

export async function fetchVoiceChangerSettings() {
	const { data } = await api.get('/whatsapp/voice-changer');
	return data;
}

export async function saveVoiceChangerSettings(body) {
	const { data } = await api.put('/whatsapp/voice-changer', body);
	return data;
}

export async function saveVoiceChangerCredential(provider, apiKey) {
	const { data } = await api.put(`/whatsapp/voice-changer/providers/${provider}/credential`, {
		apiKey,
	});
	return data;
}

export async function removeVoiceChangerCredential(provider) {
	const { data } = await api.delete(`/whatsapp/voice-changer/providers/${provider}/credential`);
	return data;
}

export async function cloneVoiceFromSamples({ name, files, consent, cloneProvider }) {
	const form = new FormData();
	form.append('name', String(name || '').trim());
	form.append('consent', consent ? 'true' : 'false');
	if (cloneProvider) form.append('cloneProvider', String(cloneProvider));
	for (const file of files || []) form.append('files', file);
	const { data } = await api.post('/whatsapp/voice-changer/clone', form, {
		timeout: 120000,
		skipAuthRedirect: true,
	});
	return data;
}

export async function transformVoiceNote(file, options = {}) {
	const form = new FormData();
	form.append('file', file);
	if (options.provider) form.append('provider', options.provider);
	if (options.preset) form.append('preset', options.preset);
	if (options.pitchSemitones != null) form.append('pitchSemitones', String(options.pitchSemitones));
	if (options.voiceId) form.append('voiceId', options.voiceId);
	if (options.apiKey) form.append('apiKey', options.apiKey);
	const response = await api.post('/whatsapp/voice-changer/transform', form, {
		responseType: 'blob',
		timeout: 120000,
	});
	const blob = response.data;
	const mime = String(response.headers['content-type'] || blob.type || file.type || 'audio/mpeg')
		.split(';')[0]
		.trim();
	const match = String(response.headers['content-disposition'] || '').match(/filename="?([^"]+)"?/i);
	const durationMatch = String(file.name || '').match(/voice-(\d+)s/i);
	const durationTag = durationMatch ? `voice-${durationMatch[1]}s` : 'voice';
	const ext = mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : mime.includes('ogg') ? 'ogg' : 'webm';
	const name = match?.[1] || `${durationTag}.${ext}`;
	return new File([blob], name, { type: mime });
}
