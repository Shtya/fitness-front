import { formatWhatsAppPhone } from './whatsapp-utils.js';

const CONTACT_TYPES = new Set([
	'contact',
	'contacts',
	'contactsarray',
	'vcard',
	'multi_vcard',
	'contact_card',
]);

export function isContactMessage(message) {
	return CONTACT_TYPES.has(String(message?.type || '').toLowerCase());
}

function looksLikeWhatsAppJid(value) {
	const text = String(value || '').trim();
	return /@(c\.us|s\.whatsapp\.net|lid|hosted\.lid)$/i.test(text);
}

function digitsFromWaId(value) {
	return String(value || '')
		.replace(/@.*$/, '')
		.replace(/\D/g, '');
}

function decodeVcardValue(value) {
	return String(value || '')
		.replace(/\\n/gi, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.trim();
}

export function parseVcardPhones(vcard) {
	const text = String(vcard || '').replace(/\r\n/g, '\n');
	if (!text.trim()) return [];
	const phones = [];
	const seen = new Set();
	for (const line of text.split('\n')) {
		if (!/^TEL/i.test(line.trim())) continue;
		const waidMatch = line.match(/waid=([0-9]+)/i);
		const waId = waidMatch?.[1] ? `${waidMatch[1]}@c.us` : null;
		const colonIndex = line.lastIndexOf(':');
		const afterColon = colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : '';
		const phone = decodeVcardValue(afterColon);
		const labelMatch = line.match(/type=([^;:]+)/i);
		const label = labelMatch?.[1] ? decodeVcardValue(labelMatch[1]) : null;
		const digits = digitsFromWaId(waId || phone);
		if (!digits && !phone) continue;
		const key = `${waId || ''}:${digits || phone}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const formatted = formatWhatsAppPhone(digits || phone.replace(/\D/g, '')) || phone;
		phones.push({
			label,
			phone: phone || formatted,
			waId,
			formatted,
		});
	}
	return phones;
}

function parseVcardName(vcard) {
	const text = String(vcard || '');
	const fn = text.match(/^FN[^:]*:(.+)$/im)?.[1];
	if (fn) return decodeVcardValue(fn);
	const n = text.match(/^N[^:]*:(.+)$/im)?.[1];
	if (n) {
		const parts = decodeVcardValue(n).split(';').filter(Boolean);
		if (parts.length) return parts.join(' ').trim();
	}
	return null;
}

function phoneFromLooseValue(value) {
	const text = String(value || '').trim();
	if (!text) return null;
	if (looksLikeWhatsAppJid(text)) {
		const digits = digitsFromWaId(text);
		if (digits.length < 7) return null;
		return {
			phone: formatWhatsAppPhone(digits) || `+${digits}`,
			waId: text.includes('@') ? text : `${digits}@c.us`,
			formatted: formatWhatsAppPhone(digits) || `+${digits}`,
		};
	}
	const digits = text.replace(/\D/g, '');
	if (digits.length < 7) return null;
	return {
		phone: formatWhatsAppPhone(digits) || `+${digits}`,
		waId: `${digits}@c.us`,
		formatted: formatWhatsAppPhone(digits) || `+${digits}`,
	};
}

function normalizeSharedContact(displayName, phones) {
	const name = String(displayName || '').trim();
	const cleanedPhones = (phones || []).filter(item => item?.phone || item?.waId);
	if (!name && !cleanedPhones.length) return null;
	return {
		displayName: name || cleanedPhones[0]?.formatted || cleanedPhones[0]?.phone || 'Contact',
		phones: cleanedPhones,
		waId: cleanedPhones[0]?.waId || null,
		primaryPhone: cleanedPhones[0]?.formatted || cleanedPhones[0]?.phone || null,
	};
}

export function parseContactFromMessage(message) {
	if (!message) return null;
	if (message.sharedContact?.displayName || message.sharedContact?.phones?.length) {
		const phones = Array.isArray(message.sharedContact.phones) ? message.sharedContact.phones : [];
		return normalizeSharedContact(message.sharedContact.displayName, phones);
	}

	const raw = message?.raw && typeof message.raw === 'object' ? message.raw : {};
	if (raw.sharedContact?.displayName || raw.sharedContact?.phones?.length) {
		return normalizeSharedContact(raw.sharedContact.displayName, raw.sharedContact.phones || []);
	}
	if (raw.contact?.displayName || raw.contact?.phoneNumber) {
		const phone = phoneFromLooseValue(raw.contact.phoneNumber || raw.contact.waId);
		return normalizeSharedContact(raw.contact.displayName || message.text, phone ? [phone] : []);
	}

	const contactMessage =
		raw?.message?.contactMessage || raw?.contactMessage || null;
	const contactsArray =
		raw?.message?.contactsArrayMessage?.contacts ||
		raw?.contactsArrayMessage?.contacts ||
		raw?.vcardList ||
		null;

	const vcardSources = [];
	if (contactMessage?.vcard) vcardSources.push(String(contactMessage.vcard));
	if (contactMessage?.vCard) vcardSources.push(String(contactMessage.vCard));
	if (raw?.vcard) vcardSources.push(String(raw.vcard));
	if (Array.isArray(contactsArray)) {
		for (const entry of contactsArray) {
			if (entry?.vcard) vcardSources.push(String(entry.vcard));
			if (entry?.vCard) vcardSources.push(String(entry.vCard));
		}
	}

	const phones = [];
	for (const vcard of vcardSources) phones.push(...parseVcardPhones(vcard));

	const displayName =
		String(
			contactMessage?.displayName ||
				raw?.vcardFormattedName ||
				(Array.isArray(contactsArray) ? contactsArray[0]?.displayName : '') ||
				parseVcardName(vcardSources[0] || '') ||
				message?.text ||
				raw?.body ||
				'',
		).trim() || '';

	if (looksLikeWhatsAppJid(displayName)) {
		const loose = phoneFromLooseValue(displayName);
		if (loose) return normalizeSharedContact(message?.contactName || 'Contact', [loose]);
	}

	const shared = normalizeSharedContact(
		displayName && !looksLikeWhatsAppJid(displayName) ? displayName : message?.contactName,
		phones,
	);
	if (shared) return shared;

	const fallbackName =
		String(message?.contactName || message?.text || '').trim() || null;
	if (fallbackName && !looksLikeWhatsAppJid(fallbackName)) {
		const loose = phoneFromLooseValue(message?.text);
		if (loose) return normalizeSharedContact(fallbackName, [loose]);
	}

	return null;
}

export function extractRawVcardFromMessage(message) {
	const raw = message?.raw && typeof message.raw === 'object' ? message.raw : {};
	const contactMessage = raw?.message?.contactMessage || raw?.contactMessage || null;
	const contactsArray =
		raw?.message?.contactsArrayMessage?.contacts ||
		raw?.contactsArrayMessage?.contacts ||
		raw?.vcardList ||
		null;
	const sources = [];
	if (contactMessage?.vcard) sources.push(String(contactMessage.vcard));
	if (contactMessage?.vCard) sources.push(String(contactMessage.vCard));
	if (raw?.vcard) sources.push(String(raw.vcard));
	if (Array.isArray(contactsArray)) {
		for (const entry of contactsArray) {
			if (entry?.vcard) sources.push(String(entry.vcard));
			if (entry?.vCard) sources.push(String(entry.vCard));
		}
	}
	return sources.find(item => String(item || '').trim()) || null;
}

export function buildContactVcard(contact) {
	const name = String(contact?.displayName || 'Contact').trim() || 'Contact';
	const phones = Array.isArray(contact?.phones) ? contact.phones : [];
	const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`];
	for (const phone of phones) {
		const digits = digitsFromWaId(phone?.waId || phone?.phone);
		const display = phone?.formatted || phone?.phone || (digits ? `+${digits}` : '');
		if (!digits && !display) continue;
		lines.push(
			digits
				? `TEL;type=CELL;waid=${digits}:${display || `+${digits}`}`
				: `TEL;type=CELL:${display}`,
		);
	}
	lines.push('END:VCARD');
	return lines.join('\r\n');
}

export function downloadContactVcard(contact) {
	const vcard =
		(contact?.__rawVcard && String(contact.__rawVcard).trim()) || buildContactVcard(contact);
	const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	const safeName = String(contact?.displayName || 'contact')
		.replace(/[^\w\u0600-\u06FF\s-]+/g, '')
		.trim()
		.replace(/\s+/g, '_')
		.slice(0, 48) || 'contact';
	anchor.href = url;
	anchor.download = `${safeName}.vcf`;
	anchor.click();
	URL.revokeObjectURL(url);
}
