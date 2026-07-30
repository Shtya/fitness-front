'use client';

/** Global outreach counts keyed by phone or social profile (shared across all Lead Scout sheets). */
const STORAGE_KEY = 'lead-scout:wa-send-counts';

export function digitsPhone(phone) {
	return String(phone || '').replace(/\D/g, '');
}

/** Prefer phone; else facebook / instagram URL so marks work across sheets without a phone. */
export function contactKey(lead) {
	const phone = digitsPhone(lead?.phone);
	if (phone.length >= 8) return phone;
	const fb = String(lead?.facebookUrl || '')
		.trim()
		.toLowerCase()
		.replace(/\/$/, '');
	if (fb) return `fb:${fb}`;
	const ig = String(lead?.instagramUrl || '')
		.trim()
		.toLowerCase()
		.replace(/\/$/, '');
	if (ig) return `ig:${ig}`;
	return '';
}

export function loadWaSendCounts() {
	if (typeof window === 'undefined') return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		if (!parsed || typeof parsed !== 'object') return {};
		const out = {};
		for (const [k, v] of Object.entries(parsed)) {
			const n = Number(v) || 0;
			if (n <= 0) continue;
			if (k.startsWith('fb:') || k.startsWith('ig:')) {
				out[k] = Math.min(99, n);
				continue;
			}
			const key = digitsPhone(k);
			if (key.length >= 8) out[key] = Math.min(99, n);
		}
		return out;
	} catch {
		return {};
	}
}

export function saveWaSendCounts(map) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		/* ignore */
	}
}

/** Level 0 = never, 1 / 2 / 3+ for coloring */
export function sendLevel(count) {
	const n = Number(count) || 0;
	if (n <= 0) return 0;
	if (n === 1) return 1;
	if (n === 2) return 2;
	return 3;
}

export function incrementWaSend(map, leadOrPhone) {
	const key =
		typeof leadOrPhone === 'string'
			? digitsPhone(leadOrPhone).length >= 8
				? digitsPhone(leadOrPhone)
				: ''
			: contactKey(leadOrPhone);
	if (!key) return map;
	return { ...map, [key]: Math.min(99, (Number(map[key]) || 0) + 1) };
}

export function getLeadSendCount(map, lead) {
	const key = contactKey(lead);
	if (!key) return 0;
	return Number(map[key]) || 0;
}
