'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	CalendarClock,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Pause,
	Pencil,
	Play,
	Plus,
	Repeat,
	Trash2,
	Users,
	X,
} from 'lucide-react';

const copy = {
	en: {
		title: 'Scheduled',
		chats: count => (count === 1 ? '1 chat' : `${count} chats`),
		next: 'Next',
		pause: 'Pause',
		resume: 'Resume',
		edit: 'Edit',
		cancel: 'Delete',
		hide: 'Hide scheduled',
		addNew: 'New schedule',
		previous: 'Previous',
		following: 'Next',
		paused: 'Paused',
		sending: 'Sending',
		daily: 'Every day',
		weekdays: 'Weekdays',
		once: 'Once',
		recurring: 'Recurring',
		loading: 'Loading scheduled messages',
	},
	ar: {
		title: 'مجدولة',
		chats: count => (count === 1 ? 'شات واحد' : `${count} شات`),
		next: 'التالي',
		pause: 'إيقاف مؤقت',
		resume: 'استئناف',
		edit: 'تعديل',
		cancel: 'حذف',
		hide: 'إخفاء المجدولة',
		addNew: 'جدولة جديدة',
		previous: 'السابق',
		following: 'التالي',
		paused: 'متوقفة',
		sending: 'جارٍ الإرسال',
		daily: 'كل يوم',
		weekdays: 'أيام العمل',
		once: 'مرة واحدة',
		recurring: 'متكررة',
		loading: 'جارٍ تحميل الرسائل المجدولة',
	},
};

function formatWhen(value, ar) {
	if (!value) return '';
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return '';
	return date.toLocaleString(ar ? 'ar-EG' : undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

// daysOfWeek uses JS weekday numbers (0 = Sunday). 2024-01-07 was a Sunday.
function weekdayName(index, ar) {
	const date = new Date(2024, 0, 7 + Number(index));
	return date.toLocaleDateString(ar ? 'ar-EG' : undefined, { weekday: 'short' });
}

function describeSchedule(item, t, ar) {
	if (item.scheduleKind === 'once') return t.once;
	const days = (Array.isArray(item.daysOfWeek) ? item.daysOfWeek : [])
		.map(Number)
		.filter(day => day >= 0 && day <= 6)
		.sort((a, b) => a - b);
	let dayLabel = t.recurring;
	if (days.length === 7) dayLabel = t.daily;
	// Mon–Fri is only 'weekdays' in English; Arabic locales often work Sun–Thu.
	else if (!ar && days.join(',') === '1,2,3,4,5') dayLabel = t.weekdays;
	else if (days.length) dayLabel = days.map(day => weekdayName(day, ar)).join(ar ? '، ' : ', ');
	return item.timeOfDay ? `${dayLabel} · ${item.timeOfDay}` : dayLabel;
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
	onAdd,
	onPause,
	onResume,
	onEdit,
	onCancel,
}) {
	const t = ar ? copy.ar : copy.en;
	const scrollerRef = useRef(null);
	const [edges, setEdges] = useState({ start: false, end: false });
	const list = (Array.isArray(schedules) ? schedules : []).filter(isLiveSchedule);

	// Prev/next only show when there is somewhere to go, like WhatsApp's carousels.
	const measureEdges = useCallback(() => {
		const node = scrollerRef.current;
		if (!node) return;
		const max = node.scrollWidth - node.clientWidth;
		const offset = Math.abs(node.scrollLeft);
		setEdges(current => {
			const next = { start: offset > 2, end: max - offset > 2 };
			return current.start === next.start && current.end === next.end ? current : next;
		});
	}, []);

	useEffect(() => {
		if (!open || !scrollerRef.current) return undefined;
		scrollerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
		measureEdges();
		window.addEventListener('resize', measureEdges);
		return () => window.removeEventListener('resize', measureEdges);
	}, [open, list.length, measureEdges]);

	if (!open) return null;

	if (loading) {
		return (
			<div className="wa-ui-sched is-loading" role="status" aria-label={t.loading}>
				<Loader2 size={14} className="animate-spin" aria-hidden="true" />
				<span>{t.title}</span>
			</div>
		);
	}

	if (!list.length) return null;

	const scrollBy = direction => {
		const node = scrollerRef.current;
		if (!node) return;
		const delta = Math.max(180, Math.round(node.clientWidth * 0.7)) * direction;
		node.scrollBy({ left: ar ? -delta : delta, behavior: 'smooth' });
	};

	return (
		<section className="wa-ui-sched" aria-label={`${t.title} (${list.length})`}>
			<div className="wa-ui-sched__bar">
				<CalendarClock size={16} strokeWidth={1.9} className="wa-ui-sched__glyph" aria-hidden="true" />
				<span className="wa-ui-sched__title">{t.title}</span>
				<span className="wa-ui-sched__count">{list.length}</span>
				<div className="wa-ui-sched__tools">
					{edges.start ? (
						<button
							type="button"
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
							onClick={() => scrollBy(-1)}
							aria-label={t.previous}
							title={t.previous}
						>
							{ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
						</button>
					) : null}
					{edges.end ? (
						<button
							type="button"
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
							onClick={() => scrollBy(1)}
							aria-label={t.following}
							title={t.following}
						>
							{ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
						</button>
					) : null}
					{typeof onAdd === 'function' ? (
						<button
							type="button"
							onClick={event => onAdd(event)}
							className="wa-ui-btn wa-ui-btn--ghost wa-ui-btn--sm wa-ui-sched__add"
							title={t.addNew}
						>
							<Plus size={15} strokeWidth={2.2} aria-hidden="true" />
							<span>{t.addNew}</span>
						</button>
					) : null}
					{typeof onHide === 'function' ? (
						<button
							type="button"
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
							onClick={onHide}
							title={t.hide}
							aria-label={t.hide}
						>
							<X size={16} strokeWidth={2} />
						</button>
					) : null}
				</div>
			</div>

			<ul ref={scrollerRef} className="wa-ui-sched__list" onScroll={measureEdges}>
				{list.map(item => {
					const busy = busyId === item.id;
					const status = String(item.status || '').toLowerCase();
					const title = item.text || item.title || t.title;
					const canEdit = status === 'active' || status === 'paused';
					const recipients = item.recipients?.length || 0;
					const when = formatWhen(item.nextRunAt || item.scheduledAt, ar);
					const recurring = item.scheduleKind !== 'once';

					return (
						<li key={item.id} className={`wa-ui-sched__card is-${status}`} aria-busy={busy || undefined}>
							<p className="wa-ui-sched__text" dir="auto" title={title}>
								{title}
							</p>
							<p className="wa-ui-sched__meta">
								{recurring ? <Repeat size={12} strokeWidth={2} aria-hidden="true" /> : null}
								<span className="truncate">{describeSchedule(item, t, ar)}</span>
								{recipients > 0 ? (
									<>
										<span aria-hidden="true">·</span>
										<Users size={12} strokeWidth={2} aria-hidden="true" />
										<span className="shrink-0">{t.chats(recipients)}</span>
									</>
								) : null}
							</p>
							<div className="wa-ui-sched__foot">
								{status === 'paused' ? (
									<span className="wa-ui-badge wa-ui-badge--warning">{t.paused}</span>
								) : status === 'processing' ? (
									<span className="wa-ui-badge">{t.sending}</span>
								) : when ? (
									<span className="wa-ui-sched__when">
										<span className="sr-only">{t.next}: </span>
										{when}
									</span>
								) : (
									<span />
								)}
								<span className="wa-ui-sched__actions">
									{canEdit ? (
										<button
											type="button"
											className="wa-ui-icon-btn wa-ui-icon-btn--sm"
											disabled={busy}
											onClick={() => onEdit?.(item)}
											title={t.edit}
											aria-label={t.edit}
										>
											<Pencil size={14} strokeWidth={2} />
										</button>
									) : null}
									{status === 'active' ? (
										<button
											type="button"
											className="wa-ui-icon-btn wa-ui-icon-btn--sm"
											disabled={busy}
											onClick={() => onPause?.(item)}
											title={t.pause}
											aria-label={t.pause}
										>
											{busy ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} strokeWidth={2} />}
										</button>
									) : null}
									{status === 'paused' ? (
										<button
											type="button"
											className="wa-ui-icon-btn wa-ui-icon-btn--sm"
											disabled={busy}
											onClick={() => onResume?.(item)}
											title={t.resume}
											aria-label={t.resume}
										>
											{busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} strokeWidth={2} />}
										</button>
									) : null}
									{canEdit ? (
										<button
											type="button"
											className="wa-ui-icon-btn wa-ui-icon-btn--sm wa-ui-sched__delete"
											disabled={busy}
											onClick={() => onCancel?.(item)}
											title={t.cancel}
											aria-label={t.cancel}
										>
											<Trash2 size={14} strokeWidth={2} />
										</button>
									) : null}
								</span>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
