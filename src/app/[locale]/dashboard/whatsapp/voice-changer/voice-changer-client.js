import api from '@/utils/axios';

function normalizeVoiceChangerErrorText(value) {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'object') {
		return value.message || value.error || value.detail?.message || '';
	}
	return String(value);
}

export function isElevenLabsPaidVoiceError(text) {
	return /paid_plan_required|payment_required|library voices|cannot use Voice Library/i.test(
		String(text || ''),
	);
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
	const name = match?.[1] || file.name || 'voice.mp3';
	return new File([blob], name, { type: mime });
}
