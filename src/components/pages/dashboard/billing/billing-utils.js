import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';

/** Methods offered when recording a payment (backend enum values). */
export const PAYMENT_METHODS = [
	{ id: 'cash', icon: Banknote },
	{ id: 'bank_transfer', icon: Landmark },
	{ id: 'card', icon: CreditCard },
	{ id: 'wallet', icon: Smartphone },
];

export const STATUS_COLOR = { active: 'green', expiring: 'amber', expired: 'red', none: 'slate' };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Gym-local calendar day (matches the backend's Africa/Cairo "today"). */
export function todayYmd() {
	return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

export function addDays(ymd, days) {
	const d = new Date(`${ymd}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

function addMonths(ymd, months) {
	const [y, m, day] = ymd.split('-').map(Number);
	const target = new Date(Date.UTC(y, m - 1 + months, 1));
	const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
	target.setUTCDate(Math.min(day, lastDay));
	return target.toISOString().slice(0, 10);
}

const INTERVAL_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const DEFAULT_PERIOD_MONTHS = 3;

/** End of a period starting on `start`: the package length, or 3 months when there is no package. */
export function periodEnd(start, plan) {
	if (!start || !YMD.test(start)) return '';
	if (plan?.durationDays > 0) return addDays(start, plan.durationDays - 1);
	const months = INTERVAL_MONTHS[plan?.interval];
	if (months) return addDays(addMonths(start, months * Math.max(1, plan.intervalCount || 1)), -1);
	return addMonths(start, DEFAULT_PERIOD_MONTHS);
}

/** Form prefill only — the server re-validates the period it receives. */
export function suggestPeriod(plan, currentEnd) {
	const today = todayYmd();
	const start = currentEnd && YMD.test(currentEnd) && currentEnd >= today ? addDays(currentEnd, 1) : today;
	return { start, end: periodEnd(start, plan) };
}

/** A package's length as { unit, count } for display and editing. */
export function planLength(plan) {
	if (!plan) return { unit: 'months', count: 1 };
	if (plan.interval === 'one_time' || plan.durationDays) return { unit: 'days', count: plan.durationDays || 1 };
	return { unit: 'months', count: (INTERVAL_MONTHS[plan.interval] || 1) * Math.max(1, plan.intervalCount || 1) };
}

export function formatMoney(value) {
	return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatDate(ymd, locale) {
	if (!ymd || !YMD.test(String(ymd).slice(0, 10))) return '—';
	const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00Z`);
	return d.toLocaleDateString(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function whatsappLink(phone, text) {
	const digits = String(phone || '').replace(/\D/g, '');
	if (!digits) return null;
	const intl = digits.startsWith('0') && digits.length === 11 ? `2${digits}` : digits;
	return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function apiError(e, fallback) {
	const msg = e?.response?.data?.message;
	if (Array.isArray(msg)) return msg.join(' · ');
	return msg || fallback;
}
