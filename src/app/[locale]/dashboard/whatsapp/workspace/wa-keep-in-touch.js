/**
 * "Keep in touch" (صلة رحم): reach out to someone at least every N days.
 * The server sends `conversation.keepInTouch = { days, lastContactAt, dueAt, overdue }`;
 * these helpers only turn it into words.
 */

export const KEEP_IN_TOUCH_FILTER = 'keep_in_touch';

/** Choices offered in the chat menu. */
export const KEEP_IN_TOUCH_INTERVALS = [1, 3, 7, 14, 30];

const DAY_MS = 86_400_000;

/** Arabic count of days with the right noun form: يوم، يومين، 3 أيام، 14 يومًا. */
export function arabicDays(n) {
	const days = Math.max(0, Math.round(Number(n) || 0));
	if (days === 1) return 'يوم';
	if (days === 2) return 'يومين';
	if (days >= 3 && days <= 10) return `${days} أيام`;
	return `${days} يومًا`;
}

export function intervalLabel(days, locale = 'en') {
	const n = Number(days) || 0;
	const ar = locale === 'ar';
	if (n === 1) return ar ? 'كل يوم' : 'Every day';
	if (n === 7) return ar ? 'كل أسبوع' : 'Every week';
	if (n === 14) return ar ? 'كل أسبوعين' : 'Every 2 weeks';
	if (n === 30) return ar ? 'كل شهر' : 'Every month';
	return ar ? `كل ${arabicDays(n)}` : `Every ${n} days`;
}

/** "today", "yesterday", "5 days ago" for the last time you wrote to them. */
export function sinceLabel(at, locale = 'en', now = Date.now()) {
	const ar = locale === 'ar';
	const time = at ? new Date(at).getTime() : 0;
	if (!time) return ar ? 'لم تراسله بعد' : 'Never messaged';
	const days = Math.floor((now - time) / DAY_MS);
	if (days <= 0) return ar ? 'اليوم' : 'today';
	if (days === 1) return ar ? 'أمس' : 'yesterday';
	if (ar) return `منذ ${arabicDays(days)}`;
	return `${days} days ago`;
}

/**
 * One line for the chat row in the keep-in-touch tab, e.g.
 * "Last message 9 days ago · Every week" (overdue) or "Due in 2 days · Every week".
 */
export function keepInTouchSummary(keepInTouch, locale = 'en', now = Date.now()) {
	if (!keepInTouch) return { text: '', overdue: false };
	const ar = locale === 'ar';
	const every = intervalLabel(keepInTouch.days, locale);
	if (!keepInTouch.lastContactAt) {
		return { text: `${ar ? 'لم تراسله بعد' : 'Never messaged'} · ${every}`, overdue: true };
	}
	const due = keepInTouch.dueAt ? new Date(keepInTouch.dueAt).getTime() : 0;
	const overdue = Boolean(keepInTouch.overdue) || (due > 0 && due <= now);
	if (overdue) {
		const since = sinceLabel(keepInTouch.lastContactAt, locale, now);
		return { text: `${ar ? 'آخر رسالة منك' : 'Last message'} ${since} · ${every}`, overdue: true };
	}
	const left = Math.max(1, Math.ceil((due - now) / DAY_MS));
	const dueText = ar
		? left === 1
			? 'موعدها بكرة'
			: `موعدها بعد ${arabicDays(left)}`
		: left === 1
			? 'Due tomorrow'
			: `Due in ${left} days`;
	return { text: `${dueText} · ${every}`, overdue: false };
}
