/**
 * Delayed replies from the composer: work out when a message typed now should go out.
 * Every time here is an absolute instant (ms since epoch); only the labels use the local zone.
 */

export const DELAYED_SEND_PREFS_KEY = 'wa-delayed-send-prefs';
/** The server only accepts one-time sends at least this far ahead. */
export const DELAYED_SEND_MIN_MS = 60_000;
export const DELAYED_SEND_MAX_MINUTES = 7 * 24 * 60;

export const DEFAULT_DELAYED_SEND_PREFS = {
	method: 'custom',
	customMinutes: 30,
	adjustMinutes: 0,
	extraMinutes: 0,
};

const clampMinutes = (value, min, max) => {
	const number = Math.round(Number(value));
	return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : 0;
};

export function normalizeDelayedSendPrefs(value) {
	const source = value && typeof value === 'object' ? value : {};
	return {
		method: source.method === 'reply' ? 'reply' : 'custom',
		customMinutes: clampMinutes(source.customMinutes ?? DEFAULT_DELAYED_SEND_PREFS.customMinutes, 0, DELAYED_SEND_MAX_MINUTES),
		adjustMinutes: clampMinutes(source.adjustMinutes ?? 0, -DELAYED_SEND_MAX_MINUTES, DELAYED_SEND_MAX_MINUTES),
		extraMinutes: clampMinutes(source.extraMinutes ?? 0, 0, DELAYED_SEND_MAX_MINUTES),
	};
}

export function readDelayedSendPrefs() {
	try {
		const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(DELAYED_SEND_PREFS_KEY);
		return normalizeDelayedSendPrefs(raw ? JSON.parse(raw) : null);
	} catch {
		return normalizeDelayedSendPrefs(null);
	}
}

export function writeDelayedSendPrefs(prefs) {
	try {
		window.localStorage.setItem(DELAYED_SEND_PREFS_KEY, JSON.stringify(normalizeDelayedSendPrefs(prefs)));
	} catch {
		// Not remembered: the next visit starts from the defaults.
	}
}

/**
 * @param prefs  normalized prefs
 * @param gap    server reply gap ({ ok, gapMs, theirLastAt, ... }) for the "reply" method
 * @returns { ok, baseMs, totalMs, sendAt, anchorAt, fromNow, raisedToMin } or { ok: false, reason }
 *   - custom: counts from now.
 *   - reply:  their answer time (gap) ± adjust, counted from their latest message. If that moment
 *             has already passed, the same delay counts from now instead (fromNow).
 *   Extra minutes are added on top for both.
 */
export function computeDelayedSend(prefs, gap, now = Date.now()) {
	const p = normalizeDelayedSendPrefs(prefs);
	let baseMs;
	let anchorAt = now;
	if (p.method === 'reply') {
		if (!gap) return { ok: false, reason: 'loading' };
		if (!gap.ok) return { ok: false, reason: gap.reason || 'no_reply' };
		baseMs = Number(gap.gapMs) + p.adjustMinutes * 60_000;
		const last = new Date(gap.theirLastAt).getTime();
		if (Number.isFinite(last)) anchorAt = last;
	} else {
		baseMs = p.customMinutes * 60_000;
	}
	baseMs = Math.max(0, baseMs);
	const totalMs = baseMs + p.extraMinutes * 60_000;
	let sendAt = anchorAt + totalMs;
	let fromNow = false;
	if (p.method === 'reply' && sendAt < now + DELAYED_SEND_MIN_MS) {
		fromNow = true;
		anchorAt = now;
		sendAt = now + totalMs;
	}
	let raisedToMin = false;
	if (sendAt < now + DELAYED_SEND_MIN_MS) {
		raisedToMin = true;
		sendAt = now + DELAYED_SEND_MIN_MS;
	}
	return { ok: true, baseMs, totalMs, anchorAt, sendAt, fromNow, raisedToMin };
}

export function formatDelayDuration(ms, ar = false) {
	const totalMinutes = Math.max(0, Math.round(Number(ms) / 60_000));
	const days = Math.floor(totalMinutes / 1440);
	const hours = Math.floor((totalMinutes % 1440) / 60);
	const minutes = totalMinutes % 60;
	const parts = [];
	if (days) parts.push(ar ? `${days} يوم` : `${days}d`);
	if (hours) parts.push(ar ? `${hours} س` : `${hours}h`);
	if (minutes || !parts.length) parts.push(ar ? `${minutes} د` : `${minutes}m`);
	return parts.join(' ');
}

/** Short label stored as the schedule title, so the chat strip can say how the time was chosen. */
export function delayedSendTitle(prefs, plan, gap, ar = false) {
	const p = normalizeDelayedSendPrefs(prefs);
	if (!plan?.ok) return '';
	const extra = p.extraMinutes ? ` + ${formatDelayDuration(p.extraMinutes * 60_000, ar)}` : '';
	if (p.method === 'reply') {
		const adjust = p.adjustMinutes
			? ` ${p.adjustMinutes > 0 ? '+' : '−'} ${formatDelayDuration(Math.abs(p.adjustMinutes) * 60_000, ar)}`
			: '';
		return `${ar ? 'رد مؤجّل · فرق الرد' : 'Delayed reply · reply gap'} ${formatDelayDuration(gap?.gapMs || 0, ar)}${adjust}${extra}`;
	}
	return `${ar ? 'رد مؤجّل' : 'Delayed reply'} · ${formatDelayDuration(p.customMinutes * 60_000, ar)}${extra}`;
}

export const browserTimeZone = () => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
};
