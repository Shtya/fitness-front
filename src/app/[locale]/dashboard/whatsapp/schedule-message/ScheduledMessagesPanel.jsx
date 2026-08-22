'use client';

import { CalendarClock, Loader2, Pause, Play, Trash2 } from 'lucide-react';

const copy = {
	en: {
		title: 'Scheduled messages',
		recipients: '{count} chats',
		next: 'Next: {when}',
		pause: 'Pause',
		resume: 'Resume',
		cancel: 'Cancel',
		status: {
			active: 'Active',
			paused: 'Paused',
			completed: 'Completed',
			cancelled: 'Cancelled',
			processing: 'Sending…',
		},
		kind: {
			once: 'Once',
			recurring: 'Recurring',
		},
	},
	ar: {
		title: 'رسائل مجدولة',
		recipients: '{count} شات',
		next: 'التالي: {when}',
		pause: 'إيقاف',
		resume: 'استئناف',
		cancel: 'إلغاء',
		status: {
			active: 'نشط',
			paused: 'موقوف',
			completed: 'اكتمل',
			cancelled: 'ملغي',
			processing: 'بيُرسَل…',
		},
		kind: {
			once: 'مرة واحدة',
			recurring: 'متكرر',
		},
	},
};

function formatTemplate(template, values) {
	return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
}

function formatWhen(value, ar) {
	if (!value) return '—';
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return '—';
	return date.toLocaleString(ar ? 'ar-EG' : undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function describeSchedule(item, t, ar) {
	if (item.scheduleKind === 'once') {
		return `${t.kind.once} · ${formatWhen(item.scheduledAt || item.nextRunAt, ar)}`;
	}
	const days = Array.isArray(item.daysOfWeek) ? item.daysOfWeek : [];
	const dayLabel =
		days.length === 7 ? (ar ? 'يومي' : 'Daily') : days.length ? days.join(',') : t.kind.recurring;
	return `${t.kind.recurring} · ${dayLabel} · ${item.timeOfDay || ''}`;
}

export default function ScheduledMessagesPanel({
	ar = false,
	schedules = [],
	loading = false,
	busyId = '',
	onPause,
	onResume,
	onCancel,
}) {
	const t = ar ? copy.ar : copy.en;
	const list = Array.isArray(schedules) ? schedules : [];

	if (loading) {
		return (
			<div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-[12px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
				<Loader2 size={14} className="animate-spin" />
				{t.title}
			</div>
		);
	}

	if (!list.length) return null;

	return (
		<div className="shrink-0 border-b border-amber-100 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
			<div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-amber-900 dark:text-amber-100">
				<CalendarClock size={14} />
				{t.title}
			</div>
			<div className="space-y-2">
				{list.slice(0, 5).map(item => {
					const busy = busyId === item.id;
					const statusLabel = t.status[item.status] || item.status;
					return (
						<div
							key={item.id}
							className="rounded-xl border border-amber-200/80 bg-white/90 px-3 py-2 text-[11px] dark:border-amber-900/40 dark:bg-slate-950/70"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate font-semibold text-slate-800 dark:text-slate-100">
										{item.text || item.title || 'Scheduled message'}
									</p>
									<p className="mt-0.5 text-slate-500">{describeSchedule(item, t, ar)}</p>
									<p className="mt-0.5 text-slate-500">
										{formatTemplate(t.recipients, {
											count: item.recipients?.length || 0,
										})}
										{' · '}
										{statusLabel}
									</p>
									{item.nextRunAt ? (
										<p className="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
											{formatTemplate(t.next, { when: formatWhen(item.nextRunAt, ar) })}
										</p>
									) : null}
								</div>
								<div className="flex shrink-0 items-center gap-1">
									{item.status === 'active' ? (
										<button
											type="button"
											disabled={busy}
											onClick={() => onPause?.(item)}
											className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
											title={t.pause}
										>
											{busy ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />}
										</button>
									) : null}
									{item.status === 'paused' ? (
										<button
											type="button"
											disabled={busy}
											onClick={() => onResume?.(item)}
											className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
											title={t.resume}
										>
											{busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
										</button>
									) : null}
									{item.status === 'active' || item.status === 'paused' ? (
										<button
											type="button"
											disabled={busy}
											onClick={() => onCancel?.(item)}
											className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
											title={t.cancel}
										>
											{busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
										</button>
									) : null}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
