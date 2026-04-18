export function formatDate(date) {
	if (!date) return '—';
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toISOString().slice(0, 10);
}

export function formatMoney(value, currency = 'EGP') {
	const n = Number(value || 0);
	return `${n.toLocaleString()} ${currency}`;
}

export function daysLeft(endDate) {
	if (!endDate) return null;
	const end = new Date(endDate);
	const now = new Date();
	end.setHours(0, 0, 0, 0);
	now.setHours(0, 0, 0, 0);
	return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function initials(name = '') {
	const p = String(name).trim().split(/\s+/).filter(Boolean);
	return p.slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'U';
}
