'use client';

import { CalendarClock, Loader2, Pause, Play, Trash2 } from 'lucide-react';

const copy = {
	en: {
		title: 'Scheduled',
		recipients: '{count} chats',
		next: 'Next {when}',
		pause: 'Pause',
		resume: 'Resume',
		cancel: 'Cancel',
		status: {
			active: 'Active',
			paused: 'Paused',
			completed: 'Done',
			cancelled: 'Cancelled',
			processing: 'Sending…',
		},
		kind: {
			once: 'Once',
			recurring: 'Recurring',
		},
	},
	ar: {
		title: 'مجدولة',
		recipients: '{count} شات',
		next: 'التالي {when}',
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
			once: 'مرة',
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

function statusTone(status) {
	switch (status) {
		case 'paused':
			return {
				bar: 'bg-amber-400',
				pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
			};
		case 'processing':
			return {
				bar: 'bg-sky-400',
				pill: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
			};
		case 'completed':
			return {
				bar: 'bg-slate-300',
				pill: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
			};
		case 'cancelled':
			return {
				bar: 'bg-rose-300',
				pill: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
			};
		default:
			return {
				bar: 'bg-emerald-500',
				pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
			};
	}
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
			<div className="flex shrink-0 items-center gap-1.5 border-b border-[#e9edef] bg-[#f0f2f5] px-3 py-1.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
				<Loader2 size={12} className="animate-spin text-emerald-600" />
				<span className="font-semibold">{t.title}</span>
			</div>
		);
	}

	if (!list.length) return null;

	const visible = list.slice(0, 5);
	const extra = Math.max(0, list.length - visible.length);

	return (
		<div className="shrink-0 border-b border-[#e9edef] bg-[#f0f2f5] px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/80">
			<div className="mb-1 flex items-center gap-1.5 px-0.5">
				<span className="grid h-5 w-5 place-items-center rounded-md bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
					<CalendarClock size={11} strokeWidth={2.4} />
				</span>
				<span className="text-[11px] font-bold tracking-wide text-slate-700 dark:text-slate-200">
					{t.title}
				</span>
				<span className="rounded-full bg-white px-1.5 py-px text-[10px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
					{list.length}
				</span>
				{extra > 0 ? (
					<span className="text-[10px] text-slate-400">+{extra}</span>
				) : null}
			</div>

			<div className="flex flex-col gap-1">
				{visible.map(item => {
					const busy = busyId === item.id;
					const statusLabel = t.status[item.status] || item.status;
					const tone = statusTone(item.status);
					const title = item.text || item.title || 'Scheduled message';
					const meta = [
						describeSchedule(item, t, ar),
						formatTemplate(t.recipients, { count: item.recipients?.length || 0 }),
					]
						.filter(Boolean)
						.join(' · ');

					return (
						<div
							key={item.id}
							className="group flex items-center gap-2 overflow-hidden rounded-lg border border-white/80 bg-white py-1 ps-0 pe-1 shadow-[0_1px_2px_rgba(11,20,26,0.04)] dark:border-slate-700/80 dark:bg-slate-950/70"
						>
							<span className={`h-8 w-0.5 shrink-0 rounded-full ${tone.bar}`} aria-hidden="true" />

							<div className="min-w-0 flex-1 py-0.5">
								<div className="flex min-w-0 items-center gap-1.5">
									<p className="min-w-0 truncate text-[12px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
										{title}
									</p>
									<span
										className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${tone.pill}`}
									>
										{statusLabel}
									</span>
								</div>
								<div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
									<span className="truncate">{meta}</span>
									{item.nextRunAt ? (
										<>
											<span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
												·
											</span>
											<span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
												{formatTemplate(t.next, { when: formatWhen(item.nextRunAt, ar) })}
											</span>
										</>
									) : null}
								</div>
							</div>

							<div className="flex shrink-0 items-center gap-0.5">
								{item.status === 'active' ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onPause?.(item)}
										className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100"
										title={t.pause}
										aria-label={t.pause}
									>
										{busy ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
									</button>
								) : null}
								{item.status === 'paused' ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onResume?.(item)}
										className="grid h-6 w-6 place-items-center rounded-md text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/40"
										title={t.resume}
										aria-label={t.resume}
									>
										{busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
									</button>
								) : null}
								{item.status === 'active' || item.status === 'paused' ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onCancel?.(item)}
										className="grid h-6 w-6 place-items-center rounded-md text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
										title={t.cancel}
										aria-label={t.cancel}
									>
										{busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
									</button>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
