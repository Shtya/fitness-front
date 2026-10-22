/** Members currently typing / recording in a group chat, keyed by participant jid. */

function phoneLabel(phone) {
	const digits = String(phone || '').replace(/\D/g, '');
	return digits ? `+${digits}` : '';
}

/**
 * Returns the next typers list after one group presence event.
 * Stale entries (no update within ttlMs) are dropped so a missed `paused` cannot stick.
 */
export function applyGroupTyperPresence(typers, event, now = Date.now(), ttlMs = 25_000) {
	const jid = String(event?.participantJid || '').trim();
	const fresh = (Array.isArray(typers) ? typers : []).filter(
		item => item?.jid && now - Number(item.t || 0) < ttlMs && item.jid !== jid,
	);
	if (!jid) return fresh;
	const active = Boolean(event.typing || event.recording);
	if (!active) return fresh;
	const previous = (Array.isArray(typers) ? typers : []).find(item => item?.jid === jid);
	const name =
		String(event.senderName || '').trim() ||
		previous?.name ||
		phoneLabel(event.participantPhone);
	return [...fresh, { jid, name, recording: Boolean(event.recording), t: now }];
}

/** "Ahmed", "Ahmed and Mona", "Ahmed and 2 others". */
export function groupTypersLabel(typers, locale = 'en') {
	const names = (Array.isArray(typers) ? typers : [])
		.map(item => String(item?.name || '').trim())
		.filter(Boolean);
	const ar = locale === 'ar';
	if (!names.length) return '';
	if (names.length === 1) return names[0];
	if (names.length === 2) return ar ? `${names[0]} و${names[1]}` : `${names[0]} and ${names[1]}`;
	const others = names.length - 1;
	return ar ? `${names[0]} و${others} كمان` : `${names[0]} and ${others} others`;
}
