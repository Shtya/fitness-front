'use client';

import { useEffect, useRef } from 'react';
import {
	ChevronLeft,
	ChevronRight,
	Loader2,
	Pause,
	Pencil,
	Play,
	Plus,
	Trash2,
	X,
} from 'lucide-react';

const copy = {
	en: {
		title: 'Scheduled',
		recipients: '{count}',
		next: '{when}',
		pause: 'Pause',
		resume: 'Resume',
		edit: 'Edit',
		cancel: 'Delete',
		hide: 'Hide',
		add: 'Add',
		addNew: 'New schedule',
		kind: {
			once: 'Once',
			recurring: 'Recurring',
		},
	},
	ar: {
		title: 'مجدولة',
		recipients: '{count}',
		next: '{when}',
		pause: 'إيقاف',
		resume: 'استئناف',
		edit: 'تعديل',
		cancel: 'حذف',
		hide: 'إخفاء',
		add: 'إضافة',
		addNew: 'جدولة جديدة',
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

function IconBtn({ title, onClick, disabled, tone = 'slate', children }) {
	const tones = {
		slate: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100',
		emerald:
			'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40',
		rose: 'text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30',
	};
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			title={title}
			aria-label={title}
			className={`grid h-5 w-5 place-items-center rounded-md transition disabled:opacity-40 ${tones[tone] || tones.slate}`}
		>
			{children}
		</button>
	);
}

export default function ScheduledMessagesPanel({
	ar = false,
	open = true,
	schedules = [],
	loading = false,
	busyId = '',
	onHide,
	onAdd,
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
			<div className="flex shrink-0 items-center gap-1.5 border-b border-[#d1d7db] bg-[#e9edef] px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
				<Loader2 size={11} className="animate-spin text-emerald-600" />
				{t.title}
			</div>
		);
	}

	if (!list.length) return null;

	const scrollBy = direction => {
		const node = scrollerRef.current;
		if (!node) return;
		const delta = Math.max(140, Math.round(node.clientWidth * 0.65)) * direction;
		node.scrollBy({ left: ar ? -delta : delta, behavior: 'smooth' });
	};

	return (
		<div className="shrink-0 border-b border-[#d1d7db] bg-[#e9edef] px-2 py-1 dark:border-slate-800 dark:bg-slate-900/85">
			<div className="mb-1 flex items-center gap-1">
				<span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
					{t.title}
				</span>
				<span className="grid h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
					{list.length}
				</span>

				{typeof onAdd === 'function' ? (
					<button
						type="button"
						onClick={event => onAdd(event)}
						className="ms-0.5 inline-flex h-5 items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-emerald-700"
						title={t.addNew}
					>
						<Plus size={11} strokeWidth={2.6} />
						<span>{t.add}</span>
					</button>
				) : null}

				<div className="ms-auto flex items-center gap-0.5">
					{list.length > 1 ? (
						<>
							<button
								type="button"
								className="grid h-5 w-5 place-items-center rounded-md text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800"
								onClick={() => scrollBy(-1)}
								aria-label="Previous"
							>
								{ar ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
							</button>
							<button
								type="button"
								className="grid h-5 w-5 place-items-center rounded-md text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800"
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
							className="grid h-5 w-5 place-items-center rounded-md text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800"
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
				className="flex gap-1.5 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{list.map(item => {
					const busy = busyId === item.id;
					const title = item.text || item.title || 'Scheduled';
					const canEdit = item.status === 'active' || item.status === 'paused';
					const chats = formatTemplate(t.recipients, {
						count: item.recipients?.length || 0,
					});
					const when = item.nextRunAt ? formatWhen(item.nextRunAt, ar) : '';

					return (
						<div
							key={item.id}
							className="flex w-[min(188px,68vw)] shrink-0 overflow-hidden rounded-md border border-white bg-white shadow-[0_1px_1px_rgba(11,20,26,0.06)] dark:border-slate-700 dark:bg-slate-950/80"
						>
							<span className={`w-[3px] shrink-0 ${statusTone(item.status)}`} aria-hidden="true" />
							<div className="min-w-0 flex-1 px-1.5 py-1">
								<div className="flex items-start gap-1">
									<p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-none text-slate-800 dark:text-slate-100">
										{title}
									</p>
									{item.status === 'paused' ? (
										<span className="shrink-0 rounded bg-amber-100 px-1 py-px text-[8px] font-bold uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
											{ar ? 'وقف' : 'Paused'}
										</span>
									) : null}
								</div>
								<p className="mt-0.5 truncate text-[9px] leading-tight text-slate-500 dark:text-slate-400">
									{describeSchedule(item, t, ar)}
									{' · '}
									{chats}
									{ar ? ' شات' : ' chats'}
								</p>
								{when ? (
									<p className="mt-0.5 truncate text-[9px] font-semibold leading-tight text-emerald-600 dark:text-emerald-400">
										{formatTemplate(t.next, { when })}
									</p>
								) : null}
								<div className="mt-1 flex items-center gap-0.5">
									{canEdit ? (
										<IconBtn title={t.edit} disabled={busy} onClick={() => onEdit?.(item)} tone="emerald">
											<Pencil size={10} strokeWidth={2.3} />
										</IconBtn>
									) : null}
									{item.status === 'active' ? (
										<IconBtn title={t.pause} disabled={busy} onClick={() => onPause?.(item)}>
											{busy ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />}
										</IconBtn>
									) : null}
									{item.status === 'paused' ? (
										<IconBtn
											title={t.resume}
											disabled={busy}
											onClick={() => onResume?.(item)}
											tone="emerald"
										>
											{busy ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
										</IconBtn>
									) : null}
									{canEdit ? (
										<IconBtn
											title={t.cancel}
											disabled={busy}
											onClick={() => onCancel?.(item)}
											tone="rose"
										>
											{busy ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
										</IconBtn>
									) : null}
								</div>
							</div>
						</div>
					);
				})}

				{typeof onAdd === 'function' ? (
					<button
						type="button"
						onClick={event => onAdd(event)}
						className="flex h-auto w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-emerald-400/70 bg-emerald-50/70 px-1 py-1.5 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
						title={t.addNew}
					>
						<span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white">
							<Plus size={12} strokeWidth={2.6} />
						</span>
						<span className="text-[9px] font-bold leading-none">{t.add}</span>
					</button>
				) : null}
			</div>
		</div>
	);
}
