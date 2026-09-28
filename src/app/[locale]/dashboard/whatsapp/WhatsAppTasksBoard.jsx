'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import toast from 'react-hot-toast';
import {
	ArrowLeft,
	ArrowRight,
	BarChart3,
	Calendar,
	Check,
	CheckSquare,
	Clock,
	Copy,
	FileText,
	Filter,
	Flag,
	GripVertical,
	Link2,
	ListFilter,
	Loader2,
	MessageSquare,
	MoreHorizontal,
	Paperclip,
	Pencil,
	Plus,
	Search,
	Settings2,
	Star,
	Tag,
	Timer,
	Trash2,
	X,
} from 'lucide-react';
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	defaultDropAnimationSideEffects,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	horizontalListSortingStrategy,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { resolveBoardMediaUrl } from './useWhatsAppBoardApi';
import TaskBoardCardDrawer, { InlineCardComposer } from './TaskBoardCardDrawer';

function FilterOptionButton({ active, onClick, icon: Icon, children }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[12px] font-medium transition-colors ${
				active ? 'bg-[#e8f8f0] text-[#0a9a62]' : 'text-[#3b4555] hover:bg-[#f5f7fa]'
			}`}
		>
			{Icon ? <Icon size={13} className={active ? 'text-[#0db873]' : 'text-[#8a95a5]'} /> : null}
			<span className="min-w-0 flex-1 truncate">{children}</span>
			{active ? <Check size={13} className="shrink-0" /> : null}
		</button>
	);
}

const DROP_ANIMATION = {
	sideEffects: defaultDropAnimationSideEffects({
		styles: { active: { opacity: '0.35' } },
	}),
};

const COLUMN_THEME = {
	purple: { key: 'purple', surface: 'bg-[#f7f6fa]', border: 'border-[#ebe8f2]', dot: 'bg-[#9b87c9]' },
	green: { key: 'green', surface: 'bg-[#f5f8f6]', border: 'border-[#e3ebe6]', dot: 'bg-[#5fad86]' },
	orange: { key: 'orange', surface: 'bg-[#f9f7f4]', border: 'border-[#efe8de]', dot: 'bg-[#d4a574]' },
	blue: { key: 'blue', surface: 'bg-[#f5f7fa]', border: 'border-[#e3e8ef]', dot: 'bg-[#6f93c4]' },
	pink: { key: 'pink', surface: 'bg-[#f9f6f7]', border: 'border-[#efe5e9]', dot: 'bg-[#c97f95]' },
};

/** Cycle: purple → green → orange → blue → pink (matches Tasks board reference). */
const COLUMN_THEME_CYCLE = [
	COLUMN_THEME.purple,
	COLUMN_THEME.green,
	COLUMN_THEME.orange,
	COLUMN_THEME.blue,
	COLUMN_THEME.pink,
];

/** Keep semantic aliases used by board stats. */
COLUMN_THEME.todo = COLUMN_THEME.pink;
COLUMN_THEME.progress = { ...COLUMN_THEME.orange, key: 'progress' };
COLUMN_THEME.review = { ...COLUMN_THEME.blue, key: 'review' };
COLUMN_THEME.done = { ...COLUMN_THEME.green, key: 'done' };

function columnTheme(title = '', index = 0) {
	const t = String(title).toLowerCase();
	if (t.includes('progress') || t.includes('تقدم')) return COLUMN_THEME.progress;
	if (t.includes('review') || t.includes('مراجعة')) return COLUMN_THEME.review;
	if (t.includes('done') || t.includes('منتهي') || t.includes('مكتمل')) return COLUMN_THEME.done;
	const safeIndex = Number.isFinite(index) ? Math.abs(index) : 0;
	return COLUMN_THEME_CYCLE[safeIndex % COLUMN_THEME_CYCLE.length];
}

const LABEL_PILL = {
	pink: 'bg-[#fff0f4] text-[#de4b70]',
	orange: 'bg-[#fff5e7] text-[#eb9218]',
	purple: 'bg-[#f4efff] text-[#8556d8]',
	blue: 'bg-[#edf6ff] text-[#2c82de]',
	green: 'bg-[#e9f9f2] text-[#17a96f]',
};

const LABEL_COLORS = [
	{ id: 'pink', value: '#f13d72' },
	{ id: 'orange', value: '#eb9218' },
	{ id: 'purple', value: '#8d58de' },
	{ id: 'blue', value: '#2785ed' },
	{ id: 'green', value: '#17b77a' },
];

const DEFAULT_BOARD_PREFS = {
	autoMoveCompletedToDone: false,
	autoCreateDoneColumn: false,
	highlightOverdue: true,
	compactCards: false,
	showStats: true,
};

function loadBoardPrefs(accountId) {
	if (!accountId || typeof window === 'undefined') return { ...DEFAULT_BOARD_PREFS };
	try {
		const raw = window.localStorage.getItem(`wa-board-prefs:${accountId}`);
		if (!raw) return { ...DEFAULT_BOARD_PREFS };
		return { ...DEFAULT_BOARD_PREFS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULT_BOARD_PREFS };
	}
}

function saveBoardPrefs(accountId, prefs) {
	if (!accountId || typeof window === 'undefined') return;
	window.localStorage.setItem(`wa-board-prefs:${accountId}`, JSON.stringify(prefs));
}

function applyColumnOrder(cards, listId, orderedColumnCards) {
	const byId = new Map(
		orderedColumnCards.map((card, index) => [card.id, { ...card, orderIndex: index }]),
	);
	return cards.map(card => (card.listId === listId ? byId.get(card.id) || card : card));
}

function isCardOverdue(card, doneListIds) {
	if (!card?.dueDate || card.isCompleted || doneListIds?.has(card.listId)) return false;
	const due = new Date(card.dueDate);
	if (Number.isNaN(due.getTime())) return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	due.setHours(0, 0, 0, 0);
	return due.getTime() < today.getTime();
}

function prefersReducedMotion() {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function captureBoardCardRects(cardIds) {
	const map = new Map();
	if (typeof document === 'undefined') return map;
	for (const id of cardIds) {
		const el = document.querySelector(`[data-board-card-id="${CSS.escape(String(id))}"]`);
		if (el) map.set(id, el.getBoundingClientRect());
	}
	return map;
}

function animateBoardCardFlip(cardIds, firstRects, durationMs = 520) {
	if (typeof document === 'undefined' || !firstRects?.size) return Promise.resolve();
	const animations = [];
	for (const id of cardIds) {
		const el = document.querySelector(`[data-board-card-id="${CSS.escape(String(id))}"]`);
		const first = firstRects.get(id);
		if (!el || !first) continue;
		const last = el.getBoundingClientRect();
		const dy = first.top - last.top;
		if (Math.abs(dy) < 1) continue;
		const animation = el.animate(
			[{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }],
			{
				duration: durationMs,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
				fill: 'both',
			},
		);
		animations.push(animation.finished.catch(() => undefined));
	}
	return Promise.all(animations).then(() => undefined);
}

function labelPillClass(label) {
	const name = String(label?.name || '').toLowerCase();
	const color = String(label?.color || '').toLowerCase();
	if (name.includes('integration') || name.includes('template') || color.includes('ef') || color.includes('f4')) {
		return LABEL_PILL.pink;
	}
	if (name.includes('automation') || name.includes('campaign') || color.includes('7c') || color.includes('a1')) {
		return LABEL_PILL.purple;
	}
	if (name.includes('support') || name.includes('report') || name.includes('content') || color.includes('3b') || color.includes('06')) {
		return LABEL_PILL.blue;
	}
	if (name.includes('setting') || name.includes('contact') || name.includes('done') || color.includes('10') || color.includes('43')) {
		return LABEL_PILL.green;
	}
	if (name.includes('automat') || color.includes('f5') || color.includes('ff9')) return LABEL_PILL.orange;
	return LABEL_PILL.blue;
}

function formatDue(value, locale = 'en') {
	if (!value) return null;
	const raw = String(value);
	const parts = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
	const date = parts
		? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
		: new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', {
		month: 'short',
		day: 'numeric',
	});
}

function isMostlyArabic(text) {
	const value = String(text || '');
	const arabic = (value.match(/[\u0600-\u06FF]/g) || []).length;
	const latin = (value.match(/[A-Za-z]/g) || []).length;
	return arabic > 0 && arabic >= latin;
}

function boardTextDir(text) {
	return isMostlyArabic(text) ? 'rtl' : 'ltr';
}

const PRIORITY_OPTIONS = [
	{ id: 'low', en: 'Low', ar: 'منخفضة' },
	{ id: 'medium', en: 'Medium', ar: 'متوسطة' },
	{ id: 'high', en: 'High', ar: 'عالية' },
	{ id: 'urgent', en: 'Urgent', ar: 'عاجلة' },
];

function priorityLabel(value, ar) {
	const found = PRIORITY_OPTIONS.find(item => item.id === value) || PRIORITY_OPTIONS[1];
	return ar ? found.ar : found.en;
}

function priorityTextTone(value) {
	if (value === 'urgent') return 'text-[#be123c]';
	if (value === 'high') return 'text-[#b45309]';
	return 'text-[#6b7585]';
}

function BoardSummary({ stats, ar }) {
	const segments = [
		{
			key: 'completed',
			label: ar ? 'مكتمل' : 'Completed',
			value: stats.completed,
			pct: stats.completedPct,
			dot: 'bg-[#10b981]',
		},
		{
			key: 'progress',
			label: ar ? 'قيد التنفيذ' : 'In progress',
			value: stats.inProgress,
			pct: stats.progressPct,
			dot: 'bg-[#f59e0b]',
		},
		{
			key: 'overdue',
			label: ar ? 'متأخر' : 'Overdue',
			value: stats.overdue,
			pct: stats.overduePct,
			dot: 'bg-[#f43f5e]',
			alert: stats.overdue > 0,
		},
	];
	return (
		<section
			aria-label={ar ? 'ملخص اللوحة' : 'Board summary'}
			className="grid grid-cols-3 gap-x-4 gap-y-3 rounded-xl border border-[#e7eaef] bg-white px-4 py-3 sm:grid-cols-[minmax(220px,1.6fr)_repeat(3,minmax(0,1fr))]"
		>
			<div className="col-span-3 min-w-0 sm:col-span-1">
				<div className="flex items-baseline justify-between gap-3">
					<p className="text-[12px] font-medium text-[#6b7585]">{ar ? 'إجمالي البطاقات' : 'Total cards'}</p>
					<p className="text-[12px] tabular-nums text-[#8a94a3]">
						{ar
							? `${stats.completed} من ${stats.total} مكتملة`
							: `${stats.completed} of ${stats.total} done`}
					</p>
				</div>
				<p className="text-[24px] font-semibold leading-8 tabular-nums text-[#111827]">{stats.total}</p>
				<div
					className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#eef1f4]"
					role="img"
					aria-label={
						ar
							? `${stats.completedPct}% مكتمل، ${stats.progressPct}% قيد التنفيذ`
							: `${stats.completedPct}% completed, ${stats.progressPct}% in progress`
					}
				>
					<span className="h-full bg-[#10b981] transition-[width] duration-300" style={{ width: `${stats.completedPct}%` }} />
					<span className="h-full bg-[#f59e0b] transition-[width] duration-300" style={{ width: `${stats.progressPct}%` }} />
				</div>
			</div>
			{segments.map(item => (
				<div key={item.key} className="min-w-0 sm:border-s sm:border-[#eef1f4] sm:ps-4">
					<p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-[#6b7585]">
						<span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} aria-hidden />
						{item.label}
					</p>
					<p className="mt-0.5 flex items-baseline gap-1.5">
						<span
							className={`text-[24px] font-semibold leading-8 tabular-nums ${
								item.alert ? 'text-[#be123c]' : 'text-[#111827]'
							}`}
						>
							{item.value}
						</span>
						<span className="text-[12px] tabular-nums text-[#8a94a3]">{item.pct}%</span>
					</p>
				</div>
			))}
		</section>
	);
}

function ConfirmDeleteDialog({ open, locale, title, description, onConfirm, onClose }) {
	const ar = locale === 'ar';
	return (
		<Dialog open={open} onOpenChange={next => (!next ? onClose() : undefined)}>
			<DialogContent className="max-w-sm rounded-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-2">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-[#e2e7ee] px-3 py-2 text-sm font-semibold text-[#54656f]"
					>
						{ar ? 'إلغاء' : 'Cancel'}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="rounded-lg bg-[#e11d48] px-3 py-2 text-sm font-semibold text-white"
					>
						{ar ? 'حذف' : 'Delete'}
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function SortableTaskCard({
	card,
	listId,
	onOpen,
	isCompleting,
	isSettling,
	onToggleComplete,
	highlightOverdue,
	compact,
	onMagicEnterEnd,
	locale = 'en',
}) {
	const ar = locale === 'ar';
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: card.id,
		data: { type: 'card', cardId: card.id, listId },
	});
	const completedVisual = Boolean(card.isCompleted) || Boolean(isCompleting);
	const overdue = highlightOverdue && isCardOverdue(card, completedVisual ? new Set([listId]) : null);
	const magicEnter = Boolean(card.__magicEnter);
	const style = {
		transform: CSS.Transform.toString(transform),
		transition:
			transition ||
			'transform 480ms cubic-bezier(0.22, 1, 0.36, 1), translate 180ms ease-out, opacity 220ms ease, box-shadow 180ms ease-out, border-color 180ms ease-out',
	};
	const due = formatDue(card.dueDate, locale);
	const labels = card.labels || [];
	const checklist = card.checklist || [];
	const checklistDone = checklist.filter(item => item.completed).length;
	const attachmentsCount = (card.attachments || []).length;
	const commentsCount = (card.comments || []).length;
	const linksCount = (card.links || []).length;
	const cover = resolveBoardMediaUrl(card.coverImage);
	const priority = card.priority || (card.isStarred ? 'high' : 'medium');
	const showPriority = priority !== 'medium';
	const hasMeta = Boolean(
		due || showPriority || checklist.length || attachmentsCount || commentsCount || linksCount,
	);
	const titleDir = boardTextDir(card.title);
	const descriptionDir = boardTextDir(card.description);
	const openCard = () => {
		if (isDragging || card.__optimistic) return;
		onOpen(card, listId);
	};

	return (
		<article
			ref={setNodeRef}
			data-board-card-id={card.id}
			style={style}
			tabIndex={isDragging ? -1 : 0}
			aria-label={card.title}
			onAnimationEnd={event => {
				if (event.target !== event.currentTarget) return;
				if (magicEnter) onMagicEnterEnd?.(card.id);
			}}
			onKeyDown={event => {
				if (event.target !== event.currentTarget) return;
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					openCard();
				}
			}}
			className={`wa-board-card group relative mx-2 mb-2 cursor-pointer overflow-hidden rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-[#0db873]/40 ${
				isDragging
					? 'wa-board-card--placeholder z-20 border-dashed border-[#b8c2cf] bg-[#eef1f5] shadow-none'
					: `hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(16,24,40,0.18)] ${
							completedVisual ? 'bg-[#fbfcfc]' : 'bg-white'
						} ${
							isCompleting
								? 'wa-board-card--completing border-[#13b779]'
								: 'border-[#e3e7ec] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-[#cfd6df]'
						}`
			} ${magicEnter ? 'wa-board-card--magic' : ''} ${isSettling ? 'wa-board-card--settling' : ''}`}
			onClick={openCard}
		>
			{isCompleting && completedVisual ? (
				<span className="wa-board-card__sparkles" aria-hidden>
					<span className="wa-board-card__sparkle" />
					<span className="wa-board-card__sparkle" />
					<span className="wa-board-card__sparkle" />
					<span className="wa-board-card__sparkle" />
					<span className="wa-board-card__sparkle" />
				</span>
			) : null}

			<button
				type="button"
				className="absolute end-1.5 top-1.5 z-[3] grid h-7 w-7 cursor-grab place-items-center rounded-md bg-white/90 text-[#9aa5b5] opacity-0 transition-opacity duration-150 hover:bg-[#f1f4f7] hover:text-[#4b5565] focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
				aria-label={ar ? 'سحب البطاقة' : 'Drag card'}
				onClick={event => event.stopPropagation()}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={14} />
			</button>

			{cover ? (
				<div className="h-[128px] overflow-hidden border-b border-[#edf0f3] bg-[#f4f6f8]">
					<img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
				</div>
			) : null}

			<div className={compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}>
				{labels.length ? (
					<div className="mb-2 flex flex-wrap items-center gap-1 pe-6">
						{labels.slice(0, 3).map(item => (
							<span
								key={item.id || item.name}
								className={`max-w-[9rem] truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${labelPillClass(item)}`}
							>
								{item.name}
							</span>
						))}
						{labels.length > 3 ? (
							<span className="text-[11px] font-medium text-[#8a94a3]">+{labels.length - 3}</span>
						) : null}
					</div>
				) : null}

				<div className={`flex items-start gap-2.5 ${labels.length ? '' : 'pe-6'}`}>
					<button
						type="button"
						aria-label={
							completedVisual ? (ar ? 'إعادة فتح المهمة' : 'Reopen task') : ar ? 'إكمال المهمة' : 'Complete task'
						}
						aria-pressed={completedVisual}
						onClick={event => {
							event.stopPropagation();
							onToggleComplete?.(card);
						}}
						className={`wa-board-checkbox mt-0.5 grid h-4 w-4 shrink-0 place-items-center overflow-hidden rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-[#0db873]/40 ${
							completedVisual
								? 'is-checked border-[#10b981] bg-[#10b981] text-white'
								: 'border-[#c3ccd7] bg-white text-transparent hover:border-[#10b981]'
						}`}
					>
						{completedVisual ? (
							<svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
								<path
									className="wa-board-checkbox__mark"
									d="M2.5 6.2L4.8 8.5L9.5 3.5"
									stroke="currentColor"
									strokeWidth="2.2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						) : null}
					</button>

					<h4
						dir={titleDir}
						lang={titleDir === 'rtl' ? 'ar' : undefined}
						title={card.title}
						className={`min-w-0 flex-1 break-words text-[14px] font-semibold leading-5 line-clamp-3 ${
							titleDir === 'rtl'
								? 'text-right font-[family-name:var(--font-arabic),"Tajawal","Cairo",Tahoma,sans-serif]'
								: 'text-left'
						} ${
							completedVisual
								? 'text-[#5b6577] line-through decoration-[#94a3b8]/70'
								: 'text-[#172033]'
						}`}
					>
						{card.title}
					</h4>
				</div>

				{card.description && !compact ? (
					<p
						dir={descriptionDir}
						lang={descriptionDir === 'rtl' ? 'ar' : undefined}
						className={`mt-1.5 whitespace-pre-line break-words ps-[26px] text-[13px] leading-5 line-clamp-2 ${
							completedVisual ? 'text-[#8a94a3]' : 'text-[#5b6577]'
						} ${
							descriptionDir === 'rtl'
								? 'text-right font-[family-name:var(--font-arabic),"Tajawal","Cairo",Tahoma,sans-serif]'
								: 'text-left'
						}`}
					>
						{card.description}
					</p>
				) : null}

				{hasMeta ? (
					<div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 ps-[26px] text-[12px] leading-4 text-[#6b7585]">
						{due ? (
							<span
								title={overdue ? (ar ? 'متأخرة' : 'Overdue') : ar ? 'تاريخ الاستحقاق' : 'Due date'}
								className={`inline-flex items-center gap-1 font-medium ${
									overdue ? '-mx-1.5 rounded-md bg-[#fff1f3] px-1.5 py-0.5 text-[#be123c]' : ''
								}`}
							>
								{overdue ? <Clock size={13} aria-hidden /> : <Calendar size={13} aria-hidden />}
								{due}
								{overdue ? <span className="sr-only">{ar ? '(متأخرة)' : '(overdue)'}</span> : null}
							</span>
						) : null}
						{showPriority ? (
							<span
								title={ar ? 'الأولوية' : 'Priority'}
								className={`inline-flex items-center gap-1 font-medium ${priorityTextTone(priority)}`}
							>
								<Flag size={13} aria-hidden />
								{priorityLabel(priority, ar)}
							</span>
						) : null}
						{checklist.length ? (
							<span
								title={ar ? 'قائمة المهام' : 'Checklist'}
								className={`inline-flex items-center gap-1 tabular-nums ${
									checklistDone === checklist.length ? 'font-medium text-[#0f9f6e]' : ''
								}`}
							>
								<CheckSquare size={13} aria-hidden />
								{checklistDone}/{checklist.length}
							</span>
						) : null}
						{attachmentsCount ? (
							<span title={ar ? 'المرفقات' : 'Attachments'} className="inline-flex items-center gap-1 tabular-nums">
								<Paperclip size={13} aria-hidden />
								{attachmentsCount}
							</span>
						) : null}
						{commentsCount ? (
							<span title={ar ? 'التعليقات' : 'Comments'} className="inline-flex items-center gap-1 tabular-nums">
								<MessageSquare size={13} aria-hidden />
								{commentsCount}
							</span>
						) : null}
						{linksCount ? (
							<span
								title={ar ? 'محادثات واتساب مرتبطة' : 'Linked WhatsApp chats'}
								className="inline-flex items-center gap-1 tabular-nums"
							>
								<Link2 size={13} aria-hidden />
								{linksCount}
							</span>
						) : null}
					</div>
				) : null}
			</div>
		</article>
	);
}

function ColumnDropArea({ listId, children, empty }) {
	const { setNodeRef, isOver } = useDroppable({
		id: `column-${listId}`,
		data: { type: 'column', listId },
	});
	return (
		<div
			ref={setNodeRef}
			className={`nice-scroll min-h-0 overflow-y-auto overscroll-y-contain rounded-lg pb-1 transition-[background-color,outline-color] duration-150 ${
				isOver
					? 'bg-[#0db873]/[0.06] outline-dashed outline-1 -outline-offset-2 outline-[#0db873]/45'
					: 'outline-transparent'
			} ${empty ? 'flex flex-col' : ''}`}
		>
			{children}
		</div>
	);
}

function ColumnDropIndicator() {
	return (
		<div
			className="mx-0.5 flex min-h-[160px] w-2 shrink-0 items-stretch self-stretch"
			aria-hidden
		>
			<div className="my-1 w-1.5 rounded-full bg-[#0db873] shadow-[0_0_0_3px_rgba(13,184,115,0.18)]" />
		</div>
	);
}

function SortableColumn({
	list,
	cards,
	locale,
	index,
	total,
	onAddCard,
	onOpenCard,
	onRenameList,
	onMoveList,
	onDuplicateList,
	onDeleteList,
	onToggleComplete,
	completingIds,
	settlingIds,
	onMagicEnterEnd,
	highlightOverdue,
	compactCards,
	dragDisabled,
	showDropBefore = false,
}) {
	const theme = columnTheme(list.title, index);
	const ar = locale === 'ar';
	const [creating, setCreating] = useState(false);
	const [renaming, setRenaming] = useState(false);
	const [draftTitle, setDraftTitle] = useState(list.title);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const renameInputRef = useRef(null);
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `sortable-${list.id}`,
		data: { type: 'list', listId: list.id },
		disabled: dragDisabled,
	});

	useEffect(() => {
		setDraftTitle(list.title);
	}, [list.title]);

	useEffect(() => {
		if (renaming) renameInputRef.current?.focus();
	}, [renaming]);

	const saveRename = () => {
		const next = draftTitle.trim();
		if (!next || next === list.title) {
			setDraftTitle(list.title);
			setRenaming(false);
			return;
		}
		onRenameList(list.id, next);
		setRenaming(false);
	};

	const empty = cards.length === 0 && !creating;

	const startCreate = () => setCreating(true);

	const handleCreate = payload => {
		flushSync(() => setCreating(false));
		void onAddCard(list.id, payload);
	};

	return (
		<>
			{showDropBefore ? <ColumnDropIndicator /> : null}
			<section
				ref={setNodeRef}
				style={{
					transform: CSS.Transform.toString(transform),
					transition: transition || 'transform 200ms ease',
				}}
				className={`group/column relative flex max-h-full min-h-0 w-[288px] shrink-0 flex-col self-start overflow-hidden rounded-xl border transition-[opacity,border-color] duration-150 ${
					theme.surface
				} ${isDragging ? 'border-dashed border-[#0db873]/55 opacity-30' : theme.border}`}
			>
				<header className="flex shrink-0 items-center gap-1.5 px-2 pb-2 pt-2.5">
					<button
						type="button"
						className="grid h-7 w-5 cursor-grab place-items-center rounded-md text-[#9aa5b5] opacity-0 transition-opacity duration-150 hover:bg-black/[0.04] hover:text-[#4b5565] focus-visible:opacity-100 group-hover/column:opacity-100 active:cursor-grabbing"
						aria-label={ar ? 'سحب العمود' : 'Drag column'}
						{...attributes}
						{...listeners}
					>
						<GripVertical size={14} />
					</button>
					<span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} aria-hidden />
					{renaming ? (
						<input
							ref={renameInputRef}
							value={draftTitle}
							onChange={event => setDraftTitle(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter') saveRename();
								if (event.key === 'Escape') {
									setDraftTitle(list.title);
									setRenaming(false);
								}
							}}
							onBlur={saveRename}
							className="h-7 min-w-0 flex-1 rounded-md border border-[#0db873] bg-white px-2 text-[14px] font-semibold text-[#172033] outline-none"
						/>
					) : (
						<button
							type="button"
							onClick={() => setRenaming(true)}
							className="min-w-0 flex-1 truncate rounded-md px-1 py-0.5 text-start text-[14px] font-semibold text-[#172033] transition-colors duration-150 hover:bg-black/[0.04]"
							title={list.title}
						>
							{list.title}
						</button>
					)}
					<span
						className="shrink-0 text-[12px] font-medium tabular-nums text-[#7c8797]"
						aria-label={ar ? `${cards.length} بطاقة` : `${cards.length} cards`}
					>
						{cards.length}
					</span>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="grid h-7 w-7 place-items-center rounded-md text-[#6b7585] transition-colors duration-150 hover:bg-black/[0.05] hover:text-[#172033]"
								aria-label={ar ? 'إجراءات العمود' : 'Column actions'}
							>
								<MoreHorizontal size={15} />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="z-[120000] w-48">
							<DropdownMenuItem
								onSelect={() => {
									setDraftTitle(list.title);
									setRenaming(true);
								}}
							>
								<Pencil size={14} />
								{ar ? 'إعادة تسمية' : 'Rename column'}
							</DropdownMenuItem>
							<DropdownMenuItem disabled={index <= 0} onSelect={() => onMoveList(list.id, -1)}>
								{ar ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
								{ar ? 'تحريك لليمين' : 'Move left'}
							</DropdownMenuItem>
							<DropdownMenuItem disabled={index >= total - 1} onSelect={() => onMoveList(list.id, 1)}>
								{ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
								{ar ? 'تحريك لليسار' : 'Move right'}
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => onDuplicateList(list)}>
								<Copy size={14} />
								{ar ? 'تكرار العمود' : 'Duplicate column'}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
								<Trash2 size={14} />
								{ar ? 'حذف العمود' : 'Delete column'}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</header>

				<ColumnDropArea listId={list.id} empty={empty && !creating}>
					<div className={`pt-0.5 ${empty && !creating ? 'flex flex-1 flex-col' : ''}`}>
						<SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
							{cards.map(card => (
								<SortableTaskCard
									key={card.id}
									card={card}
									listId={list.id}
									locale={locale}
									isCompleting={completingIds?.has(card.id)}
									isSettling={settlingIds?.has(card.id)}
									onToggleComplete={onToggleComplete}
									onOpen={onOpenCard}
									onMagicEnterEnd={onMagicEnterEnd}
									highlightOverdue={highlightOverdue}
									compact={compactCards}
								/>
							))}
						</SortableContext>
						{creating ? (
							<InlineCardComposer
								locale={locale}
								onCancel={() => setCreating(false)}
								onCreate={handleCreate}
							/>
						) : null}
						{empty && !creating ? (
							<button
								type="button"
								onClick={startCreate}
								className="mx-2 mb-2 flex min-h-[72px] w-[calc(100%-1rem)] flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/[0.1] text-[13px] text-[#7c8797] transition-colors duration-150 hover:border-black/[0.16] hover:bg-black/[0.03] hover:text-[#4b5565]"
							>
								<span>{ar ? 'لا توجد بطاقات بعد' : 'No cards yet'}</span>
								<span className="inline-flex items-center gap-1 font-medium">
									<Plus size={14} strokeWidth={2} aria-hidden />
									{ar ? 'إضافة بطاقة' : 'Add a card'}
								</span>
							</button>
						) : null}
					</div>
				</ColumnDropArea>

				{!creating && cards.length > 0 ? (
					<div className="shrink-0 px-2 pb-2">
						<button
							type="button"
							onClick={startCreate}
							className="flex h-9 w-full items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-[#6b7585] transition-colors duration-150 hover:bg-black/[0.05] hover:text-[#172033]"
						>
							<Plus size={15} strokeWidth={2} aria-hidden />
							{ar ? 'إضافة بطاقة' : 'Add a card'}
						</button>
					</div>
				) : null}

				<ConfirmDeleteDialog
					open={confirmDelete}
					locale={locale}
					title={ar ? 'حذف العمود؟' : 'Delete column?'}
					description={
						ar
							? 'سيتم حذف العمود وكل بطاقاته. لا يمكن التراجع عن هذا الإجراء.'
							: 'This removes the column and all of its cards. This cannot be undone.'
					}
					onClose={() => setConfirmDelete(false)}
					onConfirm={() => {
						setConfirmDelete(false);
						onDeleteList(list.id);
					}}
				/>
			</section>
		</>
	);
}

export default function WhatsAppTasksBoard({
	boardApi,
	locale = 'en',
	onOpenConversation,
}) {
	const ar = locale === 'ar';
	const {
		accountId,
		board,
		lists,
		cards,
		setLists,
		setCards,
		addList,
		updateList,
		addCard,
		patchCard,
		removeCard,
		removeList,
		persistColumnOrder,
		persistCardMove,
	} = boardApi;
	const [searchTerm, setSearchTerm] = useState('');
	const [filterLabel, setFilterLabel] = useState('all');
	const [filterStatus, setFilterStatus] = useState('all');
	const [sortBy, setSortBy] = useState('none');
	const [selected, setSelected] = useState(null);
	const [activeCardId, setActiveCardId] = useState(null);
	const [activeListId, setActiveListId] = useState(null);
	const [columnDropIndex, setColumnDropIndex] = useState(null);
	const listsSnapshotRef = useRef(null);
	const [addingList, setAddingList] = useState(false);
	const [newListTitle, setNewListTitle] = useState('');
	const [listSaving, setListSaving] = useState(false);
	const [listError, setListError] = useState('');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [prefs, setPrefs] = useState(() => loadBoardPrefs(accountId));
	const [completingIds, setCompletingIds] = useState(() => new Set());
	const [settlingIds, setSettlingIds] = useState(() => new Set());
	const completingLock = useRef(new Set());
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	useEffect(() => {
		setPrefs(loadBoardPrefs(accountId));
	}, [accountId]);

	const updatePrefs = next => {
		setPrefs(next);
		saveBoardPrefs(accountId, next);
	};

	const stats = useMemo(() => {
		const total = cards.length;
		const completed = cards.filter(card => Boolean(card.isCompleted)).length;
		const progressListIds = new Set(
			lists.filter(list => columnTheme(list.title).key === 'progress').map(list => list.id),
		);
		const inProgress = cards.filter(
			card => !card.isCompleted && progressListIds.has(card.listId),
		).length;
		const overdue = cards.filter(card => !card.isCompleted && isCardOverdue(card, null)).length;
		const completedPct = total ? Math.round((completed / total) * 100) : 0;
		const progressPct = total ? Math.round((inProgress / total) * 100) : 0;
		const overduePct = total ? Math.round((overdue / total) * 100) : 0;
		return { total, completed, inProgress, overdue, completedPct, progressPct, overduePct };
	}, [cards, lists]);

	const labels = useMemo(() => {
		const map = new Map();
		cards.forEach(card => (card.labels || []).forEach(label => map.set(label.id, label)));
		return [...map.values()];
	}, [cards]);

	const clearFilters = () => {
		setFilterStatus('all');
		setFilterLabel('all');
		setSortBy('none');
	};

	const panelFilterCount = useMemo(() => {
		let count = 0;
		if (filterStatus !== 'all') count += 1;
		if (filterLabel !== 'all') count += 1;
		if (sortBy !== 'none') count += 1;
		return count;
	}, [filterStatus, filterLabel, sortBy]);

	const sortRows = useCallback(
		rows => {
			const next = [...rows];
			if (sortBy === 'none') {
				// Keep incomplete tasks above completed ones inside the same column.
				next.sort((a, b) => {
					const completedDiff = Number(Boolean(a.isCompleted)) - Number(Boolean(b.isCompleted));
					if (completedDiff !== 0) return completedDiff;
					return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
				});
				return next;
			}
			if (sortBy === 'dueDate') {
				next.sort((a, b) => {
					if (!a.dueDate) return 1;
					if (!b.dueDate) return -1;
					return new Date(a.dueDate) - new Date(b.dueDate);
				});
			} else if (sortBy === 'title') {
				next.sort((a, b) => a.title.localeCompare(b.title));
			} else if (sortBy === 'priority') {
				const rank = value => {
					const map = { urgent: 4, high: 3, medium: 2, low: 1 };
					const key = value.priority || (value.isStarred ? 'high' : 'medium');
					return map[key] || 0;
				};
				next.sort((a, b) => rank(b) - rank(a));
			} else if (sortBy === 'createdAt') {
				next.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
			} else if (sortBy === 'updatedAt') {
				next.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
			} else if (sortBy === 'status') {
				next.sort(
					(a, b) => Number(Boolean(a.isCompleted)) - Number(Boolean(b.isCompleted)),
				);
			}
			return next;
		},
		[sortBy],
	);

	const filteredCards = listId => {
		let rows = cards.filter(card => card.listId === listId);
		if (searchTerm.trim()) {
			const q = searchTerm.toLowerCase();
			rows = rows.filter(
				card =>
					card.title.toLowerCase().includes(q) ||
					String(card.description || '')
						.toLowerCase()
						.includes(q),
			);
		}
		if (filterLabel !== 'all') {
			rows = rows.filter(card => card.labels?.some(label => label.id === filterLabel));
		}
		if (filterStatus === 'active') {
			rows = rows.filter(card => !card.isCompleted);
		} else if (filterStatus === 'completed') {
			rows = rows.filter(card => Boolean(card.isCompleted));
		} else if (filterStatus === 'overdue') {
			rows = rows.filter(card => !card.isCompleted && isCardOverdue(card, null));
		} else if (filterStatus === 'starred') {
			rows = rows.filter(card => card.isStarred);
		} else if (filterStatus === 'hasDue') {
			rows = rows.filter(card => Boolean(card.dueDate));
		} else if (filterStatus === 'hasLinks') {
			rows = rows.filter(card => card.links?.length);
		}
		return sortRows(rows);
	};

	const clearMagicEnter = useCallback(
		cardId => {
			setCards(current =>
				current.map(card =>
					card.id === cardId ? { ...card, __magicEnter: false } : card,
				),
			);
		},
		[setCards],
	);

	const toggleCompleteCard = useCallback(
		card => {
			if (!card || completingLock.current.has(card.id)) return;
			completingLock.current.add(card.id);
			const nextCompleted = !Boolean(card.isCompleted);
			const reduced = prefersReducedMotion();
			const previousCards = cards;
			const columnIds = cards
				.filter(item => item.listId === card.listId)
				.map(item => item.id);

			const columnOthers = cards.filter(
				item => item.listId === card.listId && item.id !== card.id,
			);
			const updated = { ...card, isCompleted: nextCompleted };
			const incomplete = columnOthers.filter(item => !item.isCompleted);
			const completed = columnOthers.filter(item => item.isCompleted);
			const columnNext = (
				nextCompleted
					? [...incomplete, ...completed, updated]
					: [...incomplete, updated, ...completed]
			).map((item, index) => ({ ...item, orderIndex: index }));
			const orderedIds = columnNext.map(item => item.id);
			const outside = cards.filter(item => item.listId !== card.listId);

			const finishToggle = () => {
				setCompletingIds(current => {
					const next = new Set(current);
					next.delete(card.id);
					return next;
				});
				setSettlingIds(current => {
					const next = new Set(current);
					next.delete(card.id);
					return next;
				});
				completingLock.current.delete(card.id);
			};

			setCompletingIds(current => new Set(current).add(card.id));
			setCards(current =>
				current.map(item =>
					item.id === card.id ? { ...item, isCompleted: nextCompleted } : item,
				),
			);

			void (async () => {
				try {
					if (!reduced && nextCompleted) {
						await new Promise(resolve => setTimeout(resolve, 280));
					}

					const firstRects = reduced ? new Map() : captureBoardCardRects(columnIds);
					flushSync(() => {
						setCards([...outside, ...columnNext]);
					});

					if (!reduced) {
						await animateBoardCardFlip(columnIds, firstRects, 520);
						if (nextCompleted) {
							setSettlingIds(current => new Set(current).add(card.id));
							await new Promise(resolve => setTimeout(resolve, 220));
						}
					}
				} finally {
					finishToggle();
				}
			})();

			void (async () => {
				try {
					await patchCard(card.id, { isCompleted: nextCompleted });
					await persistCardMove(card.id, card.listId, orderedIds);
				} catch (err) {
					setCards(previousCards);
					toast.error(
						err?.response?.data?.message ||
							err?.message ||
							(ar ? 'تعذر تحديث حالة المهمة' : 'Could not update task status'),
					);
				}
			})();
		},
		[ar, cards, patchCard, persistCardMove, setCards],
	);

	const duplicateCard = async card => {
		const created = await addCard(card.listId, `${card.title} (copy)`);
		if (!created) return;
		await patchCard(created.id, {
			description: card.description || '',
			dueDate: card.dueDate || null,
			isStarred: Boolean(card.isStarred),
			labels: card.labels || [],
			checklist: (card.checklist || []).map((item, index) => ({
				id: `chk-${created.id}-${index}`,
				text: item.text,
				completed: Boolean(item.completed),
			})),
		});
	};

	const onDragStart = event => {
		const type = event.active.data.current?.type;
		if (type === 'card') setActiveCardId(event.active.id);
		if (type === 'list') {
			setActiveListId(event.active.data.current.listId);
			listsSnapshotRef.current = lists;
			setColumnDropIndex(null);
		}
	};

	const resolveOverListId = over => {
		if (!over) return null;
		const data = over.data.current;
		if (data?.type === 'list' || data?.type === 'column') return data.listId;
		if (String(over.id || '').startsWith('sortable-')) {
			return String(over.id).replace(/^sortable-/, '');
		}
		return cards.find(card => card.id === over.id)?.listId || null;
	};

	const onDragOver = event => {
		const { active, over } = event;
		if (!over) return;

		if (active.data.current?.type === 'list') {
			const activeListKey = active.data.current.listId;
			const overListId = resolveOverListId(over);
			if (!overListId || overListId === activeListKey) return;
			setLists(current => {
				const from = current.findIndex(list => list.id === activeListKey);
				const to = current.findIndex(list => list.id === overListId);
				if (from < 0 || to < 0 || from === to) return current;
				queueMicrotask(() => setColumnDropIndex(to));
				return arrayMove(current, from, to);
			});
			return;
		}

		if (active.data.current?.type !== 'card') return;
		const activeCard = cards.find(card => card.id === active.id);
		if (!activeCard) return;
		const overListId = resolveOverListId(over);
		if (overListId && activeCard.listId !== overListId) {
			setCards(current =>
				current.map(card => (card.id === active.id ? { ...card, listId: overListId } : card)),
			);
		}
	};

	const onDragCancel = () => {
		if (listsSnapshotRef.current) {
			setLists(listsSnapshotRef.current);
			listsSnapshotRef.current = null;
		}
		setActiveCardId(null);
		setActiveListId(null);
		setColumnDropIndex(null);
	};

	const onDragEnd = event => {
		const { active, over } = event;
		const activeData = active.data.current;
		const overData = over?.data.current;
		setActiveCardId(null);
		setActiveListId(null);
		setColumnDropIndex(null);

		if (activeData?.type === 'list') {
			const snapshot = listsSnapshotRef.current;
			listsSnapshotRef.current = null;
			if (!over) {
				if (snapshot) setLists(snapshot);
				return;
			}
			void (async () => {
				try {
					await persistColumnOrder(lists);
				} catch (err) {
					if (snapshot) setLists(snapshot);
					toast.error(
						err?.response?.data?.message ||
							err?.message ||
							(ar ? 'فشل حفظ ترتيب الأعمدة' : 'Could not save column order'),
					);
				}
			})();
			return;
		}

		if (!over || activeData?.type !== 'card') return;
		const activeCard = cards.find(card => card.id === active.id);
		if (!activeCard) return;
		if (overData?.type === 'card' && activeCard.listId === overData.listId) {
			const columnCards = cards.filter(card => card.listId === activeCard.listId);
			const from = columnCards.findIndex(card => card.id === active.id);
			const to = columnCards.findIndex(card => card.id === over.id);
			if (from >= 0 && to >= 0 && from !== to) {
				const reordered = arrayMove(columnCards, from, to);
				const previousCards = cards;
				setCards(applyColumnOrder(cards, activeCard.listId, reordered));
				void persistCardMove(
					active.id,
					activeCard.listId,
					reordered.map(card => card.id),
				).catch(err => {
					setCards(previousCards);
					toast.error(err?.message || (ar ? 'فشل نقل البطاقة' : 'Could not move card'));
				});
			}
			return;
		}
		const columnId = overData?.type === 'column' ? overData.listId : activeCard.listId;
		const columnCards = cards.filter(card => card.listId === columnId);
		const ids = columnCards.map(card => card.id);
		const previousCards = cards;
		setCards(applyColumnOrder(cards, columnId, columnCards));
		void persistCardMove(active.id, columnId, ids).catch(err => {
			setCards(previousCards);
			toast.error(err?.message || (ar ? 'فشل نقل البطاقة' : 'Could not move card'));
		});
	};

	const createCardInList = async (listId, payload) => {
		try {
			const created = await addCard(listId, payload.title, {
				description: payload.description || '',
				images: payload.images || [],
				dueDate: payload.dueDate || null,
			});
			if (!created) {
				throw new Error(ar ? 'البطاقة قيد الإنشاء بالفعل' : 'Card is already being created');
			}
		} catch (err) {
			toast.error(err?.response?.data?.message || err?.message || (ar ? 'فشل الإنشاء' : 'Create failed'));
			throw err;
		}
	};

	const saveNewList = async () => {
		if (!newListTitle.trim() || listSaving) return;
		setListSaving(true);
		setListError('');
		try {
			await addList(newListTitle.trim());
			setNewListTitle('');
			setAddingList(false);
		} catch (err) {
			setListError(err?.response?.data?.message || err?.message || (ar ? 'فشل الإنشاء' : 'Create failed'));
		} finally {
			setListSaving(false);
		}
	};

	const moveListBy = (listId, delta) => {
		const from = lists.findIndex(list => list.id === listId);
		if (from < 0) return;
		const to = from + delta;
		if (to < 0 || to >= lists.length) return;
		const previous = lists;
		const next = arrayMove(lists, from, to);
		setLists(next);
		void persistColumnOrder(next).catch(err => {
			setLists(previous);
			toast.error(err?.message || (ar ? 'فشل حفظ ترتيب الأعمدة' : 'Could not save column order'));
		});
	};

	const duplicateList = async list => {
		const title = `${list.title} (copy)`;
		await addList(title);
	};

	const activeCard = activeCardId ? cards.find(card => card.id === activeCardId) : null;
	const activeList = activeListId ? lists.find(list => list.id === activeListId) : null;
	const selectedList = selected ? lists.find(list => list.id === selected.listId) : null;

	const filterStatusLabel = {
		all: ar ? 'الكل' : 'All',
		active: ar ? 'نشط' : 'Active',
		completed: ar ? 'مكتمل' : 'Completed',
		overdue: ar ? 'متأخر' : 'Overdue',
		starred: ar ? 'مميّز' : 'Starred',
		hasDue: ar ? 'له استحقاق' : 'Has due date',
		hasLinks: ar ? 'مرتبط بواتساب' : 'Has WhatsApp links',
	};

	return (
		<div
			className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent px-1 text-[#182235] sm:px-2"
			dir={ar ? 'rtl' : 'ltr'}
			onClick={event => event.stopPropagation()}
			onMouseDown={event => event.stopPropagation()}
		>
			<header className="flex shrink-0 flex-col gap-3 pt-1 sm:pt-2">
				<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
					<div className="min-w-0">
						<h1 className="text-[20px] font-semibold leading-7 tracking-tight text-[#111827]">
							{ar ? 'لوحة المهام' : 'Tasks board'}
						</h1>
						<p className="text-[13px] leading-5 text-[#6b7585]">
							{ar
								? 'إدارة المهام اليومية من محادثات واتساب'
								: 'Daily task management from WhatsApp conversations'}
						</p>
					</div>

					<div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
					<div className="relative flex h-9 w-full items-center rounded-lg border border-[#dfe4ea] bg-white px-2.5 transition-[border-color,box-shadow] duration-150 focus-within:border-[#0db873]/60 focus-within:shadow-[0_0_0_3px_rgba(13,184,115,0.12)] sm:w-[280px]">
						<Search size={15} className="shrink-0 text-[#7c8797]" aria-hidden />
						<input
							type="search"
							value={searchTerm}
							onChange={event => setSearchTerm(event.target.value)}
							placeholder={ar ? 'ابحث في البطاقات…' : 'Search cards…'}
							aria-label={ar ? 'ابحث في البطاقات' : 'Search cards'}
							className="h-full min-w-0 flex-1 bg-transparent px-2 text-[13px] text-[#172033] outline-none placeholder:text-[#8a94a3] [&::-webkit-search-cancel-button]:hidden"
						/>
						{searchTerm ? (
							<button
								type="button"
								onClick={() => setSearchTerm('')}
								aria-label={ar ? 'مسح البحث' : 'Clear search'}
								className="grid h-6 w-6 place-items-center rounded-md text-[#7c8797] hover:bg-[#f1f4f7] hover:text-[#172033]"
							>
								<X size={14} />
							</button>
						) : null}
					</div>

					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								className={`inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors duration-150 hover:bg-[#f8f9fb] ${
									panelFilterCount
										? 'border-[#0db873]/60 text-[#0a8a58]'
										: 'border-[#dfe4ea] text-[#344054]'
								}`}
							>
								<Filter size={15} className={panelFilterCount ? 'text-[#0db873]' : 'text-[#7c8797]'} aria-hidden />
								{ar ? 'فلاتر وترتيب' : 'Filters & Sort'}
								{panelFilterCount ? (
									<span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0db873] px-1 text-[11px] font-semibold text-white">
										{panelFilterCount}
									</span>
								) : null}
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="z-[120000] w-[320px] space-y-3 p-3">
							<div className="rounded-xl bg-[#f8fafb] p-2">
								<p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#7c8797]">
									<Tag size={11} />
									{ar ? 'التصنيفات' : 'Labels'}
								</p>
								<div className="max-h-28 space-y-0.5 overflow-y-auto">
									<FilterOptionButton
										active={filterLabel === 'all'}
										onClick={() => setFilterLabel('all')}
										icon={Tag}
									>
										{ar ? 'كل التصنيفات' : 'All labels'}
									</FilterOptionButton>
									{labels.map(label => (
										<FilterOptionButton
											key={label.id}
											active={filterLabel === label.id}
											onClick={() => setFilterLabel(label.id)}
											icon={Tag}
										>
											{label.name}
										</FilterOptionButton>
									))}
								</div>
							</div>

							<div className="rounded-xl bg-[#f8fafb] p-2">
								<p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#7c8797]">
									<ListFilter size={11} />
									{ar ? 'الترتيب' : 'Sort by'}
								</p>
								<div className="grid grid-cols-2 gap-0.5">
									{(
										[
											['none', ar ? 'بدون ترتيب' : 'No sorting', ListFilter],
											['createdAt', ar ? 'الإنشاء' : 'Created', Clock],
											['updatedAt', ar ? 'التحديث' : 'Updated', Timer],
											['dueDate', ar ? 'الاستحقاق' : 'Due date', Calendar],
											['priority', ar ? 'الأولوية' : 'Priority', Star],
											['status', ar ? 'الحالة' : 'Status', CheckSquare],
											['title', ar ? 'العنوان' : 'Title', FileText],
										]
									).map(([value, label, Icon]) => (
										<FilterOptionButton
											key={value}
											active={sortBy === value}
											onClick={() => setSortBy(value)}
											icon={Icon}
										>
											{label}
										</FilterOptionButton>
									))}
								</div>
							</div>

							<div className="rounded-xl bg-[#f8fafb] p-2">
								<p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#7c8797]">
									<Filter size={11} />
									{ar ? 'فلاتر' : 'Filters'}
								</p>
								<div className="grid grid-cols-2 gap-0.5">
									{(
										[
											['all', filterStatusLabel.all, ListFilter],
											['active', filterStatusLabel.active, Timer],
											['completed', filterStatusLabel.completed, CheckSquare],
											['overdue', filterStatusLabel.overdue, Clock],
											['starred', filterStatusLabel.starred, Star],
											['hasDue', filterStatusLabel.hasDue, Calendar],
											['hasLinks', filterStatusLabel.hasLinks, Link2],
										]
									).map(([value, label, Icon]) => (
										<FilterOptionButton
											key={value}
											active={filterStatus === value}
											onClick={() => setFilterStatus(value)}
											icon={Icon}
										>
											{label}
										</FilterOptionButton>
									))}
								</div>
							</div>

							{panelFilterCount ? (
								<button
									type="button"
									onClick={clearFilters}
									className="w-full rounded-lg border border-[#e2e7ee] bg-white px-2.5 py-2 text-[12px] font-medium text-[#475467] hover:bg-[#f8fafc]"
								>
									{ar ? 'مسح الكل' : 'Clear all'}
								</button>
							) : null}
						</PopoverContent>
					</Popover>

					<button
						type="button"
						onClick={() => updatePrefs({ ...prefs, showStats: !prefs.showStats })}
						aria-pressed={Boolean(prefs.showStats)}
						title={
							prefs.showStats
								? ar
									? 'إخفاء الإحصائيات'
									: 'Hide stats'
								: ar
									? 'إظهار الإحصائيات'
									: 'Show stats'
						}
						className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 ${
							prefs.showStats
								? 'bg-black/[0.05] text-[#172033]'
								: 'text-[#5b6577] hover:bg-black/[0.04] hover:text-[#172033]'
						}`}
					>
						<BarChart3 size={15} className="text-[#7c8797]" aria-hidden />
						{ar ? 'إحصائيات' : 'Stats'}
					</button>

					<Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								aria-label={ar ? 'إعدادات اللوحة' : 'Board settings'}
								title={ar ? 'إعدادات اللوحة' : 'Board settings'}
								className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 ${
									settingsOpen
										? 'bg-black/[0.05] text-[#172033]'
										: 'text-[#5b6577] hover:bg-black/[0.04] hover:text-[#172033]'
								}`}
							>
								<Settings2 size={15} className="text-[#7c8797]" aria-hidden />
								<span className="hidden md:inline">{ar ? 'الإعدادات' : 'Settings'}</span>
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="z-[120000] w-[300px] space-y-2 p-3">
							<div>
								<p className="text-[13px] font-semibold text-[#172033]">
									{ar ? 'إعدادات اللوحة' : 'Board settings'}
								</p>
								<p className="mt-0.5 text-[12px] text-[#7c8797]">
									{board?.name
										? ar
											? `اللوحة: ${board.name}`
											: `Board: ${board.name}`
										: ar
											? 'تفضيلات العرض'
											: 'Display preferences'}
								</p>
							</div>
							<label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e8ecf1] p-2.5 hover:bg-[#f8fafb]">
								<input
									type="checkbox"
									checked={prefs.highlightOverdue}
									onChange={event =>
										updatePrefs({ ...prefs, highlightOverdue: event.target.checked })
									}
									className="mt-0.5"
								/>
								<span>
									<span className="block text-[13px] font-medium text-[#172033]">
										{ar ? 'تمييز المتأخر' : 'Highlight overdue'}
									</span>
									<span className="mt-0.5 block text-[12px] leading-4 text-[#6b7585]">
										{ar
											? 'تمييز تاريخ الاستحقاق المتأخر بلون وردي هادئ.'
											: 'Soft red tag on overdue due dates.'}
									</span>
								</span>
							</label>
							<label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e8ecf1] p-2.5 hover:bg-[#f8fafb]">
								<input
									type="checkbox"
									checked={prefs.compactCards}
									onChange={event => updatePrefs({ ...prefs, compactCards: event.target.checked })}
									className="mt-0.5"
								/>
								<span>
									<span className="block text-[13px] font-medium text-[#172033]">
										{ar ? 'بطاقات مضغوطة' : 'Compact cards'}
									</span>
									<span className="mt-0.5 block text-[12px] leading-4 text-[#6b7585]">
										{ar
											? 'مسافات أقل وإخفاء وصف البطاقة.'
											: 'Tighter padding and hide card descriptions.'}
									</span>
								</span>
							</label>
							<p className="rounded-lg bg-[#f8fafb] px-2.5 py-2 text-[12px] leading-4 text-[#6b7585]">
								{ar
									? 'الإكمال يُبقي البطاقة في نفس العمود وينزّلها للأسفل. السحب حر بين الأعمدة.'
									: 'Complete keeps the card in-column and sinks it. Drag stays free across columns.'}
							</p>
						</PopoverContent>
					</Popover>
					</div>
				</div>

				{panelFilterCount ? (
					<div className="flex flex-wrap items-center gap-1.5">
						{filterStatus !== 'all' ? (
							<button
								type="button"
								onClick={() => setFilterStatus('all')}
								className="inline-flex h-7 items-center gap-1 rounded-full bg-[#e8f8f0] px-2.5 text-[12px] font-medium text-[#0a8a58]"
							>
								{filterStatusLabel[filterStatus]}
								<X size={12} />
							</button>
						) : null}
						{filterLabel !== 'all' ? (
							<button
								type="button"
								onClick={() => setFilterLabel('all')}
								className="inline-flex h-7 max-w-[14rem] items-center gap-1 rounded-full bg-[#f0eaff] px-2.5 text-[12px] font-medium text-[#6d45c9]"
							>
								<span className="truncate">
									{labels.find(label => label.id === filterLabel)?.name || (ar ? 'تصنيف' : 'Label')}
								</span>
								<X size={12} className="shrink-0" />
							</button>
						) : null}
						{sortBy !== 'none' ? (
							<button
								type="button"
								onClick={() => setSortBy('none')}
								className="inline-flex h-7 items-center gap-1 rounded-full bg-[#eef4ff] px-2.5 text-[12px] font-medium text-[#2563eb]"
							>
								{ar ? 'مرتب' : 'Sorted'}
								<X size={12} />
							</button>
						) : null}
					</div>
				) : null}
			</header>

			<div
				className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
					prefs.showStats
						? 'mt-3 grid-rows-[1fr] opacity-100'
						: 'pointer-events-none mt-0 grid-rows-[0fr] opacity-0'
				}`}
				aria-hidden={!prefs.showStats}
			>
				<div className="min-h-0 overflow-hidden">
					<BoardSummary stats={stats} ar={ar} />
				</div>
			</div>

			<div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCorners}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					onDragEnd={onDragEnd}
					onDragCancel={onDragCancel}
				>
					<div
						className={`nice-scroll flex h-full min-h-0 flex-1 items-start gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 ${
							activeCardId || activeListId ? 'wa-board-dragging' : ''
						}`}
					>
						<SortableContext
							items={lists.map(list => `sortable-${list.id}`)}
							strategy={horizontalListSortingStrategy}
						>
							{lists.map((list, index) => (
								<SortableColumn
									key={list.id}
									list={list}
									cards={filteredCards(list.id)}
									locale={locale}
									index={index}
									total={lists.length}
									showDropBefore={activeListId != null && columnDropIndex === index}
									onAddCard={(listId, payload) => createCardInList(listId, payload)}
									onOpenCard={(card, listId) => setSelected({ card, listId })}
									onRenameList={(listId, title) => void updateList(listId, { title })}
									onMoveList={moveListBy}
									onDuplicateList={listItem => void duplicateList(listItem)}
									onDeleteList={listId => void removeList(listId)}
									onToggleComplete={card => void toggleCompleteCard(card)}
									completingIds={completingIds}
									settlingIds={settlingIds}
									onMagicEnterEnd={clearMagicEnter}
									highlightOverdue={prefs.highlightOverdue}
									compactCards={prefs.compactCards}
								/>
							))}
						</SortableContext>

						{addingList ? (
							<div className="flex w-[288px] shrink-0 flex-col self-start rounded-xl border border-[#e3e7ec] bg-white p-3">
								<p className="mb-2 text-[12px] font-medium text-[#6b7585]">
									{ar ? 'اسم العمود' : 'Column name'}
								</p>
								<div className="relative">
									<input
										autoFocus
										value={newListTitle}
										disabled={listSaving}
										onChange={event => setNewListTitle(event.target.value)}
										placeholder={ar ? 'عمود جديد' : 'New column'}
										className="h-9 w-full rounded-lg border border-[#dfe4ea] pe-16 ps-3 text-[14px] font-medium text-[#172033] outline-none focus:border-[#0db873]"
										onKeyDown={event => {
											if (event.key === 'Enter') void saveNewList();
											if (event.key === 'Escape') {
												setAddingList(false);
												setNewListTitle('');
												setListError('');
											}
										}}
									/>
									<div className="absolute end-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
										<button
											type="button"
											disabled={listSaving}
											onClick={() => {
												setAddingList(false);
												setNewListTitle('');
												setListError('');
											}}
											aria-label={ar ? 'إلغاء' : 'Cancel'}
											className="grid h-6 w-6 place-items-center rounded-md border border-[#e2e7ee] bg-white text-[#54656f]"
										>
											<X size={12} />
										</button>
										<button
											type="button"
											disabled={listSaving || !newListTitle.trim()}
											onClick={() => void saveNewList()}
											aria-label={ar ? 'حفظ العمود' : 'Save column'}
											className="grid h-6 w-6 place-items-center rounded-md bg-[#0db873] text-white disabled:opacity-50"
										>
											{listSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
										</button>
									</div>
								</div>
								{listError ? <p className="mt-1.5 text-[12px] font-medium text-[#be123c]">{listError}</p> : null}
							</div>
						) : (
							<button
								type="button"
								onClick={() => setAddingList(true)}
								className="flex h-11 w-[288px] shrink-0 items-center gap-2 self-start rounded-xl bg-black/[0.03] px-3 text-[14px] font-medium text-[#5b6577] ring-1 ring-inset ring-black/[0.05] transition-colors duration-150 hover:bg-black/[0.06] hover:text-[#172033]"
							>
								<Plus size={16} strokeWidth={2} aria-hidden />
								{ar ? 'إضافة عمود' : 'Add column'}
							</button>
						)}
						<div className="w-1 shrink-0" aria-hidden />
					</div>
					<DragOverlay dropAnimation={DROP_ANIMATION}>
						{activeList ? (
							<div className="w-[288px] rotate-[1deg] rounded-xl border border-[#0db873]/35 bg-white p-3 shadow-[0_16px_32px_-12px_rgba(16,24,40,0.28)]">
								<div className="mb-2 flex items-center gap-2">
									<span
										className={`h-2 w-2 rounded-full ${
											columnTheme(
												activeList.title,
												Math.max(
													0,
													lists.findIndex(list => list.id === activeList.id),
												),
											).dot
										}`}
									/>
									<p className="min-w-0 truncate text-[14px] font-semibold text-[#172033]">{activeList.title}</p>
									<span className="text-[12px] font-medium tabular-nums text-[#7c8797]">
										{cards.filter(card => card.listId === activeList.id).length}
									</span>
								</div>
								<div className="space-y-1.5">
									<div className="h-10 rounded-lg bg-[#f5f7fa]" />
									<div className="h-10 rounded-lg bg-[#f5f7fa]" />
									<div className="h-8 rounded-lg bg-[#f5f7fa]" />
								</div>
							</div>
						) : activeCard ? (
							<div className="w-[272px] rotate-[1.5deg] cursor-grabbing rounded-xl border border-[#0db873]/40 bg-white px-3.5 py-3 shadow-[0_16px_32px_-12px_rgba(16,24,40,0.28)]">
								<p
									dir={boardTextDir(activeCard.title)}
									className="break-words text-[14px] font-semibold leading-5 text-[#172033] line-clamp-3"
								>
									{activeCard.title}
								</p>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			</div>

			{selected ? (
				<TaskBoardCardDrawer
					card={cards.find(card => card.id === selected.card.id) || selected.card}
					lists={lists}
					locale={locale}
					availableLabels={labels}
					isDone={Boolean(
						(cards.find(card => card.id === selected.card.id) || selected.card).isCompleted,
					)}
					onClose={() => setSelected(null)}
					onPatch={(cardId, updates) => patchCard(cardId, updates)}
					onDelete={async cardId => {
						try {
							await removeCard(cardId);
							setSelected(null);
						} catch (err) {
							toast.error(
								err?.response?.data?.message ||
									err?.message ||
									(ar ? 'فشل حذف البطاقة' : 'Could not delete card'),
							);
							throw err;
						}
					}}
					onOpenConversation={onOpenConversation}
					onToggleComplete={card => void toggleCompleteCard(card)}
					onDuplicate={card => void duplicateCard(card)}
				/>
			) : null}
		</div>
	);
}
