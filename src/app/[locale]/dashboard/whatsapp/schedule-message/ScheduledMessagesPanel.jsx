'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Pause, Pencil, Play, Trash2, X } from 'lucide-react';

const copy = {
	en: {
		title: 'Scheduled',
		recipients: '{count} chats',
		next: 'Next {when}',
		pause: 'Pause',
		resume: 'Resume',
		edit: 'Edit',
		cancel: 'Delete',
		hide: 'Hide',
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
		edit: 'تعديل',
		cancel: 'حذف',
		hide: 'إخفاء',
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
	return `${dayLabel} · ${item.timeOfDay || ''}`;
}

function statusTone(status) {
	switch (status) {
		case 'paused':
			return 'bg-amber-400';
		case 'processing':
			return 'bg-sky-400';
		default:
			return 'bg-emerald-500';
	}
}

function isLiveSchedule(item) {
	const status = String(item?.status || '').toLowerCase();
	return status === 'active' || status === 'paused' || status === 'processing';
}

export default function ScheduledMessagesPanel({
	ar = false,
	open = true,
	schedules = [],
	loading = false,
	busyId = '',
	onHide,
	onPause,
	onResume,
	onEdit,
	onCancel,
}) {
	const t = ar ? copy.ar : copy.en;
	const scrollerRef = useRef(null);
	const list = (Array.isArray(schedules) ? schedules : []).filter(isLiveSchedule);

	useEffect(() => {
		if (!open || !scrollerRef.current) return;
		scrollerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
	}, [open, list.length]);

	if (!open) return null;

	if (loading) {
		return (
			<div className="flex shrink-0 items-center gap-1.5 border-b border-[#e9edef] bg-[#f0f2f5] px-3 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/80">
				<Loader2 size={12} className="animate-spin text-emerald-600" />
				<span className="font-semibold">{t.title}</span>
			</div>
		);
	}

	if (!list.length) return null;

	const scrollBy = direction => {
		const node = scrollerRef.current;
		if (!node) return;
		const delta = Math.max(160, Math.round(node.clientWidth * 0.7)) * direction;
		node.scrollBy({ left: ar ? -delta : delta, behavior: 'smooth' });
	};

	return (
		<div className="shrink-0 border-b border-[#e9edef] bg-[#f0f2f5] px-2 py-1 dark:border-slate-800 dark:bg-slate-900/80">
			<div className="mb-0.5 flex items-center gap-1.5 px-0.5">
				<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					{t.title}
				</span>
				<span className="rounded-full bg-white px-1.5 py-px text-[9px] font-bold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
					{list.length}
				</span>
				<div className="ms-auto flex items-center gap-0.5">
					{list.length > 1 ? (
						<>
							<button
								type="button"
								className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
								onClick={() => scrollBy(-1)}
								aria-label="Previous"
							>
								{ar ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
							</button>
							<button
								type="button"
								className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
								onClick={() => scrollBy(1)}
								aria-label="Next"
							>
								{ar ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
							</button>
						</>
					) : null}
					{typeof onHide === 'function' ? (
						<button
							type="button"
							className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800"
							onClick={onHide}
							title={t.hide}
							aria-label={t.hide}
						>
							<X size={11} strokeWidth={2.4} />
						</button>
					) : null}
				</div>
			</div>

			<div
				ref={scrollerRef}
				className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{list.map(item => {
					const busy = busyId === item.id;
					const title = item.text || item.title || 'Scheduled';
					const canEdit = item.status === 'active' || item.status === 'paused';
					const meta = [
						describeSchedule(item, t, ar),
						formatTemplate(t.recipients, { count: item.recipients?.length || 0 }),
					].join(' · ');

					return (
						<div
							key={item.id}
							className="flex w-[min(220px,72vw)] shrink-0 items-stretch overflow-hidden rounded-lg border border-white/90 bg-white shadow-[0_1px_2px_rgba(11,20,26,0.05)] dark:border-slate-700/80 dark:bg-slate-950/75"
						>
							<span className={`w-0.5 shrink-0 ${statusTone(item.status)}`} aria-hidden="true" />
							<div className="min-w-0 flex-1 px-2 py-1">
								<p className="truncate text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
									{title}
								</p>
								<p className="mt-0.5 truncate text-[9px] leading-tight text-slate-500 dark:text-slate-400">
									{meta}
								</p>
								{item.nextRunAt ? (
									<p className="mt-0.5 truncate text-[9px] font-semibold leading-tight text-emerald-600 dark:text-emerald-400">
										{formatTemplate(t.next, { when: formatWhen(item.nextRunAt, ar) })}
									</p>
								) : null}
							</div>
							<div className="flex shrink-0 flex-col justify-center gap-px border-s border-slate-100 pe-0.5 ps-0.5 dark:border-slate-800">
								{canEdit ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onEdit?.(item)}
										className="grid h-5 w-5 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-slate-800"
										title={t.edit}
										aria-label={t.edit}
									>
										<Pencil size={10} strokeWidth={2.3} />
									</button>
								) : null}
								{item.status === 'active' ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onPause?.(item)}
										className="grid h-5 w-5 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
										title={t.pause}
										aria-label={t.pause}
									>
										{busy ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />}
									</button>
								) : null}
								{item.status === 'paused' ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onResume?.(item)}
										className="grid h-5 w-5 place-items-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/40"
										title={t.resume}
										aria-label={t.resume}
									>
										{busy ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
									</button>
								) : null}
								{canEdit ? (
									<button
										type="button"
										disabled={busy}
										onClick={() => onCancel?.(item)}
										className="grid h-5 w-5 place-items-center rounded text-rose-500 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
										title={t.cancel}
										aria-label={t.cancel}
									>
										{busy ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
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
