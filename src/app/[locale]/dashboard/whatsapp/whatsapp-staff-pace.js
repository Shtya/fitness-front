export const PACE_STYLES = {
	fast: {
		en: 'Replies quickly',
		ar: 'بيرد بسرعة',
		className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
	},
	ok: {
		en: 'Normal pace',
		ar: 'رد طبيعي',
		className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
	},
	slow: {
		en: 'Replies late',
		ar: 'بيرد متأخر',
		className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
	},
	backlog: {
		en: 'Messages piling up',
		ar: 'رسايل متراكمة',
		className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
	},
	idle: {
		en: 'No recent replies',
		ar: 'مفيش ردود في الفترة',
		className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
	},
};

export function formatDuration(totalSeconds, locale = 'en') {
	if (totalSeconds == null || Number.isNaN(Number(totalSeconds))) return '—';
	const s = Math.max(0, Math.round(Number(totalSeconds)));
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (locale === 'ar') {
		if (d > 0) return h ? `${d} يوم و${h}س` : `${d} يوم`;
		if (h > 0) return `${h}س ${m}د`;
		if (m > 0) return `${m}د`;
		return `${sec}ث`;
	}
	if (d > 0) return h ? `${d}d ${h}h` : `${d}d`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m`;
	return `${sec}s`;
}

export function staffAssignHint(item, locale = 'en') {
	if (!item) return '';
	const pace = PACE_STYLES[item.pace] || PACE_STYLES.idle;
	const paceLabel = locale === 'ar' ? pace.ar : pace.en;
	const wait = item.waitingConversations
		? locale === 'ar'
			? `${item.waitingConversations} شات / ${item.waitingInboundMessages || 0} رسالة مستنية`
			: `${item.waitingConversations} chats / ${item.waitingInboundMessages || 0} unanswered`
		: locale === 'ar'
			? 'مفيش رسايل متراكمة'
			: 'no backlog';
	const median = item.medianResponseSeconds == null
		? ''
		: ` · ${formatDuration(item.medianResponseSeconds, locale)}`;
	return `${paceLabel} · ${wait}${median}`;
}
