/**
 * Helpers for the customer typing log. The API returns UTC ISO instants; these
 * helpers only format them in the browser's local time zone.
 */

export const TYPING_LOG_FILTERS = ['all', 'typing', 'waiting', 'sent', 'no_message'];
export const TYPING_LOG_RANGES = ['today', '7d', 'all', 'custom'];
function localMidnight(date) {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

/** `yyyy-mm-dd` from an <input type="date"> → local midnight. */
function parseLocalDate(value) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
	if (!match) return null;
	const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return Number.isFinite(d.getTime()) ? d : null;
}

/** API `from` / `to` (UTC ISO) for a range picked in local time. `to` is exclusive. */
export function typingRangeParams(range, custom = {}, now = new Date()) {
	if (range === 'today') return { from: localMidnight(now).toISOString() };
	if (range === '7d') {
		const start = localMidnight(now);
		start.setDate(start.getDate() - 6);
		return { from: start.toISOString() };
	}
	if (range === 'custom') {
		let from = parseLocalDate(custom.from);
		let to = parseLocalDate(custom.to);
		if (from && to && to < from) [from, to] = [to, from];
		const out = {};
		if (from) out.from = from.toISOString();
		if (to) {
			const end = new Date(to.getTime());
			end.setDate(end.getDate() + 1);
			out.to = end.toISOString();
		}
		return out;
	}
	return {};
}

export function formatTypingDuration(ms, ar = false) {
	const value = Number(ms);
	if (!Number.isFinite(value) || value < 0) return '';
	const total = Math.round(value / 1000);
	const s = ar ? 'ث' : 's';
	const m = ar ? 'د' : 'm';
	const h = ar ? 'س' : 'h';
	if (total < 60) return `${total}${s}`;
	const minutes = Math.floor(total / 60);
	if (minutes < 60) {
		const rest = total % 60;
		return rest ? `${minutes}${m} ${rest}${s}` : `${minutes}${m}`;
	}
	const hours = Math.floor(minutes / 60);
	const restMinutes = minutes % 60;
	return restMinutes ? `${hours}${h} ${restMinutes}${m}` : `${hours}${h}`;
}

export function formatTypingTime(value, ar = false, withDate = true) {
	if (!value) return '';
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return '';
	const options = withDate
		? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }
		: { hour: 'numeric', minute: '2-digit', second: '2-digit' };
	return date.toLocaleString(ar ? 'ar-EG-u-nu-latn' : undefined, options);
}

/** Server-relative "now" so elapsed times do not drift with a wrong client clock. */
export function typingNow(clockSkewMs = 0) {
	return Date.now() + (Number(clockSkewMs) || 0);
}

/** Time since the last typing for open attempts; null once a message closed it. */
export function typingElapsedMs(attempt, nowMs = Date.now()) {
	if (!attempt || attempt.messageAt) return null;
	if (attempt.status === 'no_message') return 30 * 60_000;
	const ref = new Date(attempt.lastTypingAt || attempt.startedAt || 0).getTime();
	return Number.isFinite(ref) && ref > 0 ? Math.max(0, nowMs - ref) : null;
}

export function typingAttemptMatchesFilter(attempt, filter) {
	if (!attempt) return false;
	switch (filter) {
		case 'typing':
			return attempt.status === 'typing';
		case 'waiting':
			return attempt.status === 'stopped';
		case 'sent':
			return attempt.status === 'sent';
		case 'no_message':
			return attempt.status === 'no_message';
		default:
			return true;
	}
}

export function typingAttemptInRange(attempt, params = {}) {
	const at = new Date(attempt?.startedAt || 0).getTime();
	if (!Number.isFinite(at)) return false;
	if (params.from && at < new Date(params.from).getTime()) return false;
	if (params.to && at >= new Date(params.to).getTime()) return false;
	return true;
}

/**
 * Live socket update → list. Existing rows are replaced in place (even if they no
 * longer match, so the row does not vanish under the user's cursor); new rows are
 * added only when they match the active filter, range, and search.
 */
export function upsertTypingAttempt(list, attempt, { filter = 'all', range = {}, query = '' } = {}) {
	const items = Array.isArray(list) ? list : [];
	if (!attempt?.id) return items;
	const index = items.findIndex(item => item.id === attempt.id);
	if (index >= 0) {
		const next = items.slice();
		next[index] = { ...items[index], ...attempt };
		return next;
	}
	if (!typingAttemptMatchesFilter(attempt, filter)) return items;
	if (!typingAttemptInRange(attempt, range)) return items;
	const q = String(query || '').trim().toLowerCase();
	if (q) {
		const digits = q.replace(/\D/g, '');
		const hay = `${attempt.name || ''} ${attempt.chatId || ''}`.toLowerCase();
		const phoneHit = digits.length >= 3 && String(attempt.phone || '').includes(digits);
		if (!hay.includes(q) && !phoneHit) return items;
	}
	return [attempt, ...items].sort(
		(a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
	);
}

export function typingLogCopy(locale) {
	const ar = locale === 'ar';
	return ar
		? {
				ar,
				tab: 'محاولات الكتابة',
				title: 'محاولات الكتابة',
				subtitle: 'من أحداث الكتابة الحقيقية في واتساب فقط. نص المسودة لا يصلنا ولا يُحفظ.',
				historyTitle: 'سجل الكتابة',
				hide: 'إخفاء سجل الكتابة',
				search: 'ابحث بالاسم أو الرقم',
				filters: {
					all: 'الكل',
					typing: 'يكتب الآن',
					waiting: 'لم يرسل بعد',
					sent: 'أرسل بعد الكتابة',
					no_message: 'لا رسالة خلال 30 د',
				},
				ranges: { today: 'اليوم', '7d': 'آخر 7 أيام', all: 'كل الوقت', custom: 'مخصص' },
				from: 'من',
				to: 'إلى',
				status: {
					typing: 'يكتب الآن',
					recording: 'يسجل صوتًا الآن',
					stopped: 'توقف — لم يرسل بعد',
					sent: 'أرسل رسالة',
					no_message: 'لم يرسل خلال 30 دقيقة',
				},
				cols: {
					customer: 'العميل',
					started: 'بدأ الكتابة',
					last: 'آخر كتابة',
					status: 'الحالة',
					message: 'الرسالة',
					waiting: 'المدة',
				},
				messageAt: 'وصلت',
				afterStart: 'بعد بدء الكتابة بـ',
				afterLast: 'بعد آخر كتابة بـ',
				withinBucket: n => `خلال ${n} د`,
				noMessageYet: 'لا رسالة بعد',
				sinceTyping: d => `بدون رسالة منذ ${d}`,
				passedCheckpoint: n => `تجاوز ${n} د`,
				events: n => `${n} حدث`,
				superseded: 'تلتها محاولة أحدث',
				openChat: 'فتح المحادثة',
				empty: 'لا توجد محاولات كتابة مطابقة.',
				emptyChat: 'لا توجد محاولات كتابة مسجلة لهذه المحادثة.',
				loading: 'جارٍ التحميل…',
				loadMore: 'عرض المزيد',
				retry: 'إعادة المحاولة',
				error: 'تعذر تحميل محاولات الكتابة.',
				selectAccount: 'اختر حساب واتساب أولًا.',
				unknown: 'عميل',
				voice: 'تسجيل صوتي',
			}
		: {
				ar,
				tab: 'Typing log',
				title: 'Typing attempts',
				subtitle: 'Built only from real WhatsApp typing events. Draft text never reaches us and is never stored.',
				historyTitle: 'Typing history',
				hide: 'Hide typing history',
				search: 'Search by name or number',
				filters: {
					all: 'All',
					typing: 'Typing now',
					waiting: 'Not sent yet',
					sent: 'Sent after typing',
					no_message: 'No message in 30 min',
				},
				ranges: { today: 'Today', '7d': 'Last 7 days', all: 'All time', custom: 'Custom' },
				from: 'From',
				to: 'To',
				status: {
					typing: 'Typing now',
					recording: 'Recording audio',
					stopped: 'Stopped · no message yet',
					sent: 'Sent a message',
					no_message: 'No message within 30 min',
				},
				cols: {
					customer: 'Customer',
					started: 'Started typing',
					last: 'Last typing',
					status: 'Status',
					message: 'Message',
					waiting: 'Duration',
				},
				messageAt: 'Arrived',
				afterStart: 'after typing started',
				afterLast: 'after last typing',
				withinBucket: n => `within ${n} min`,
				noMessageYet: 'No message yet',
				sinceTyping: d => `No message for ${d}`,
				passedCheckpoint: n => `passed ${n} min`,
				events: n => `${n} events`,
				superseded: 'Followed by a newer attempt',
				openChat: 'Open chat',
				empty: 'No matching typing attempts.',
				emptyChat: 'No typing attempts recorded for this chat.',
				loading: 'Loading…',
				loadMore: 'Load more',
				retry: 'Retry',
				error: 'Could not load typing attempts.',
				selectAccount: 'Choose a WhatsApp account first.',
				unknown: 'Customer',
				voice: 'Voice recording',
			};
}

export function typingStatusLabel(attempt, copy) {
	if (!attempt) return '';
	if (attempt.status === 'typing' && attempt.kind === 'recording') return copy.status.recording;
	return copy.status[attempt.status] || attempt.status;
}
