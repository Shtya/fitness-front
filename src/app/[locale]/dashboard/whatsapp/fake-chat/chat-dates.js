/**
 * Message dates for the mock chat. A message stores `date` (YYYY-MM-DD) and labels are worked out
 * when shown, so "Yesterday" stays correct tomorrow. A message with no date continues the day of
 * the one before it.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date = new Date()) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/** The date `daysAgo` days before `now`, as a key. */
export function dateKeyDaysAgo(daysAgo = 0, now = new Date()) {
	return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo));
}

function parseKey(key) {
	const match = DATE_KEY.exec(String(key || ''));
	if (!match) return null;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysBetween(earlier, later) {
	const dayMs = 24 * 60 * 60 * 1000;
	const a = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
	const b = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
	return Math.round((b - a) / dayMs);
}

/** Pill between messages: Today, Yesterday, Monday, Wed, 5 Nov, 5 Nov 2025. */
export function dayPillLabel(key, now = new Date()) {
	const date = parseKey(key);
	if (!date) return '';
	const age = daysBetween(date, now);
	if (age === 0) return 'Today';
	if (age === 1) return 'Yesterday';
	if (age > 1 && age < 7) return WEEKDAYS[date.getDay()];
	const dayMonth = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
	if (date.getFullYear() === now.getFullYear()) {
		return `${WEEKDAYS[date.getDay()].slice(0, 3)}, ${dayMonth}`;
	}
	return `${dayMonth} ${date.getFullYear()}`;
}

/** Time column of a chat-list row: the clock today, then Yesterday, weekday, dd/mm/yyyy. */
export function listRowTime(key, clock, now = new Date()) {
	const date = parseKey(key);
	if (!date) return clock || '';
	const age = daysBetween(date, now);
	if (age <= 0) return clock || '';
	if (age === 1) return 'Yesterday';
	if (age < 7) return WEEKDAYS[date.getDay()];
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	return `${day}/${month}/${date.getFullYear()}`;
}

/** The day each message falls on, carrying the last known day forward. */
export function resolveMessageDays(messages) {
	let current = '';
	return (Array.isArray(messages) ? messages : []).map(message => {
		if (DATE_KEY.test(String(message?.date || ''))) current = message.date;
		return current;
	});
}

/** "9:55 pm" plus some minutes, wrapping past midnight. Returns the input if it is not a clock. */
export function addMinutesToClock(clock, minutes = 1) {
	const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(clock || '').trim());
	if (!match) return String(clock || '');
	let hours = Number(match[1]) % 12;
	if (match[3].toLowerCase() === 'pm') hours += 12;
	const total = (((hours * 60 + Number(match[2]) + minutes) % 1440) + 1440) % 1440;
	const nextHours = Math.floor(total / 60);
	const shown = nextHours % 12 || 12;
	return `${shown}:${String(total % 60).padStart(2, '0')} ${nextHours < 12 ? 'am' : 'pm'}`;
}

function clockMinutes(clock) {
	const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(clock || '').trim());
	if (!match) return null;
	let hours = Number(match[1]) % 12;
	if (match[3].toLowerCase() === 'pm') hours += 12;
	return hours * 60 + Number(match[2]);
}

/** Messenger prints a time when the day changes or after a 10 minute pause. */
export function messengerGapStarts(days, clocks) {
	return clocks.map((clock, index) => {
		if (index === 0) return true;
		if (days[index] !== days[index - 1]) return true;
		const now = clockMinutes(clock);
		const before = clockMinutes(clocks[index - 1]);
		if (now === null || before === null) return false;
		return Math.abs(now - before) >= 10;
	});
}

/** "6:42 PM" today, "SAT 5:20 PM" this week, "6 NOV AT 12:28 PM" earlier, with the year once it differs. */
export function messengerStamp(key, clock, now = new Date()) {
	const time = String(clock || '').toUpperCase();
	const date = parseKey(key);
	if (!date || daysBetween(date, now) <= 0) return time;
	if (daysBetween(date, now) < 7) return `${WEEKDAYS[date.getDay()].slice(0, 3).toUpperCase()} ${time}`;
	const month = MONTHS[date.getMonth()].toUpperCase();
	const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
	return `${date.getDate()} ${month}${year} AT ${time}`;
}

/** Messenger writes older days as "14 Aug 2024" and recent ones as "Fri". */
export function messengerRowTime(value) {
	const text = String(value || '');
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
	if (match) return `${Number(match[1])} ${MONTHS[Number(match[2]) - 1]} ${match[3]}`;
	if (WEEKDAYS.includes(text)) return text.slice(0, 3);
	return text;
}
