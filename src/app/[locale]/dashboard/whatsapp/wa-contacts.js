import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const PERSIAN = /[\u06f0-\u06f9]/g;
const ALLOWED = /^[\d+\s\-().\u200e\u200f]*$/;

export function toAsciiDigits(value) {
	return String(value ?? '')
		.replace(ARABIC_INDIC, d => String(d.charCodeAt(0) - 0x0660))
		.replace(PERSIAN, d => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Instant feedback only; the server normalizes and has the final word.
 * Returns `{ ok, code, e164 }` — e164 only when the number is complete.
 */
export function precheckPhone(raw, country) {
	const input = toAsciiDigits(raw).trim();
	if (!input) return { ok: false, code: 'PHONE_REQUIRED', e164: null };
	if (!ALLOWED.test(input)) return { ok: false, code: 'PHONE_INVALID', e164: null };
	const compact = input.replace(/[\s\-().\u200e\u200f]/g, '');
	const international = compact.startsWith('+')
		? compact
		: compact.startsWith('00')
			? `+${compact.slice(2)}`
			: null;
	if (!international && !country) return { ok: true, code: null, e164: null };
	const parsed = parsePhoneNumberFromString(international || compact, international ? undefined : country);
	if (!parsed || !parsed.isValid()) return { ok: false, code: 'PHONE_INVALID', e164: null };
	return { ok: true, code: null, e164: parsed.format('E.164') };
}

export function countryOptions(locale) {
	let names = null;
	try {
		names = new Intl.DisplayNames([locale || 'en'], { type: 'region' });
	} catch {
		names = null;
	}
	return getCountries()
		.map(code => ({
			code,
			dial: `+${getCountryCallingCode(code)}`,
			name: names?.of(code) || code,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, locale || 'en'));
}

export function apiErrorCode(error) {
	const data = error?.response?.data;
	return data?.code || data?.message?.code || null;
}

export function apiErrorMessage(error, fallback) {
	const message = error?.response?.data?.message;
	if (Array.isArray(message)) return message[0] || fallback;
	if (typeof message === 'string' && message) return message;
	return error?.message || fallback;
}

/** 409 DUPLICATE_CONTACT carries the contact that already exists. */
export function duplicateContactFrom(error) {
	const data = error?.response?.data;
	if (error?.response?.status !== 409 || apiErrorCode(error) !== 'DUPLICATE_CONTACT') return null;
	return data?.contact || data?.message?.contact || null;
}

export function contactInitials(name, fallback = '#') {
	const words = String(name || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!words.length) return fallback;
	const first = Array.from(words[0])[0] || '';
	const last = words.length > 1 ? Array.from(words[words.length - 1])[0] || '' : '';
	return (first + last).toUpperCase();
}

export const SYNC_TONES = {
	not_requested: 'muted',
	pending: 'warn',
	syncing: 'info',
	synced: 'ok',
	failed: 'error',
	unsupported: 'muted',
};

export function syncTone(status) {
	return SYNC_TONES[status] || 'muted';
}

/** Localized sync error when the server sent a known code, else its own text. */
export function syncErrorText(sync, messages = {}) {
	if (!sync?.error) return null;
	return (sync.errorCode && messages[sync.errorCode]) || sync.error;
}

export function canRetrySync(contact) {
	return ['failed', 'pending', 'unsupported'].includes(contact?.sync?.status);
}

export function canStartChatFor(lookup) {
	return lookup?.registration?.status === 'registered';
}

/** Lookup card rows, in display order; fields WhatsApp did not share are left out. */
export function profileRows(lookup) {
	const rows = [];
	const profile = lookup?.profile;
	if (!profile) return rows;
	if (profile.pushName) rows.push({ key: 'pushName', value: profile.pushName });
	if (profile.about?.status === 'available' && profile.about.text) {
		rows.push({ key: 'about', value: profile.about.text });
	}
	const business = profile.business;
	if (business?.status === 'available') {
		if (business.category) rows.push({ key: 'category', value: business.category });
		if (business.description) rows.push({ key: 'description', value: business.description });
		if (business.email) rows.push({ key: 'email', value: business.email });
		for (const site of business.websites || []) rows.push({ key: 'website', value: site });
		if (business.address) rows.push({ key: 'address', value: business.address });
	}
	return rows;
}
