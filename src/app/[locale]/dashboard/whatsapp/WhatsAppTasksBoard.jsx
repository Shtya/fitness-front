'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import toast from 'react-hot-toast';
import {
	ArrowLeft,
	ArrowRight,
	ArrowUpRight,
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
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Settings2,
	ShieldCheck,
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
			className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[11px] font-semibold transition-colors ${
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
	todo: {
		key: 'todo',
		header: 'from-[#fff6f8]',
		accent: 'bg-[#f13d72]',
		count: 'bg-[#ffe8ef] text-[#ee3c6c]',
		dot: 'bg-[#f13d72]',
		add: 'border-[#ffb8c9] text-[#ee3d70] hover:bg-[#fff6f8]',
	},
	progress: {
		key: 'progress',
		header: 'from-[#faf7ff]',
		accent: 'bg-[#8d58de]',
		count: 'bg-[#f1e8ff] text-[#8554d9]',
		dot: 'bg-[#8d58de]',
		add: 'border-[#d9c8f8] text-[#8957db] hover:bg-[#faf7ff]',
	},
	review: {
		key: 'review',
		header: 'from-[#f5faff]',
		accent: 'bg-[#2785ed]',
		count: 'bg-[#e8f3ff] text-[#2781e8]',
		dot: 'bg-[#2785ed]',
		add: 'border-[#b8d9ff] text-[#2583eb] hover:bg-[#f5faff]',
	},
	done: {
		key: 'done',
		header: 'from-[#f4fcf8]',
		accent: 'bg-[#17b77a]',
		count: 'bg-[#e5f8ef] text-[#16aa6e]',
		dot: 'bg-[#17b77a]',
		add: 'border-[#b4e8d2] text-[#18ae71] hover:bg-[#f4fcf8]',
	},
};

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

function columnTheme(title = '') {
	const t = String(title).toLowerCase();
	if (t.includes('progress') || t.includes('تقدم')) return COLUMN_THEME.progress;
	if (t.includes('review') || t.includes('مراجعة')) return COLUMN_THEME.review;
	if (t.includes('done') || t.includes('منتهي') || t.includes('مكتمل')) return COLUMN_THEME.done;
	return COLUMN_THEME.todo;
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

function formatDue(value) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatCard({ icon: Icon, iconClass, label, value, delta, caption, ring, chart }) {
	return (
		<div className="relative min-h-[76px] rounded-xl border border-[#e8ecf2] bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(29,42,65,0.04)]">
			<div className={`absolute start-3 top-[16px] grid h-8 w-8 place-items-center rounded-lg ${iconClass}`}>
				<Icon size={16} strokeWidth={1.8} />
			</div>
			<div className="ps-[46px] pe-12 pt-0.5">
				<p className="text-[10px] font-semibold leading-3 text-[#3b4555]">{label}</p>
				<p className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap text-[16px] font-bold leading-5 tracking-tight text-[#182235]">
					{value}
					{delta ? <span className={`text-[9px] font-bold ${delta.className}`}>{delta.text}</span> : null}
				</p>
				<p className="mt-0.5 text-[9px] text-[#8a95a5]">{caption}</p>
			</div>
			{ring ? (
				<div
					className="absolute end-2.5 top-3 grid h-11 w-11 place-items-center rounded-full"
					style={{ background: `conic-gradient(${ring.color} ${ring.percent}%, #edf0f4 0)` }}
				>
					<span className="absolute inset-[4px] rounded-full bg-white" />
					<span className="relative z-[1] text-[9px] font-bold text-[#182235]">{ring.label}</span>
				</div>
			) : null}
			{chart ? (
				<svg className="absolute bottom-4 end-2.5 h-5 w-[38px]" viewBox="0 0 40 24" fill="none" aria-hidden>
					<path d={chart} stroke="#748091" strokeWidth="1.2" />
				</svg>
			) : null}
		</div>
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
	theme,
	onOpen,
	isCompleting,
	isSettling,
	onToggleComplete,
	highlightOverdue,
	compact,
	onMagicEnterEnd,
}) {
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
			'transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, box-shadow 180ms ease',
		opacity: isDragging ? 0.25 : 1,
	};
	const due = formatDue(card.dueDate);
	const label = card.labels?.[0];
	const checklist = card.checklist || [];
	const checklistDone = checklist.filter(item => item.completed).length;
	const cover = resolveBoardMediaUrl(card.coverImage);
	const showMetaPanel =
		!compact && Boolean(card.isStarred || checklist.length || label || card.links?.length);

	return (
		<article
			ref={setNodeRef}
			data-board-card-id={card.id}
			style={style}
			onAnimationEnd={event => {
				if (event.target !== event.currentTarget) return;
				if (magicEnter) onMagicEnterEnd?.(card.id);
			}}
			className={`wa-board-card group relative mx-2 mb-2.5 cursor-pointer overflow-hidden rounded-[15px] border bg-white shadow-[0_3px_12px_rgba(35,49,68,0.055)] ${
				isCompleting
					? 'wa-board-card--completing border-[#13b779]'
					: completedVisual
						? 'border-[#d7eee3]'
						: overdue
							? 'border-[#f7c2d0]'
							: 'border-[#e7ebef] hover:border-[#d5dde8]'
			} ${isDragging ? 'z-20' : ''} ${magicEnter ? 'wa-board-card--magic' : ''} ${
				isSettling ? 'wa-board-card--settling' : ''
			}`}
			onClick={() => {
				if (isDragging || card.__optimistic) return;
				onOpen(card, listId);
			}}
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
				className="absolute end-2 top-2 z-[1] grid h-7 w-7 place-items-center rounded-md text-[#b0bac8] opacity-0 transition-opacity hover:bg-[#f3f5f8] hover:text-[#54656f] group-hover:opacity-100 active:cursor-grabbing"
				aria-label="Drag card"
				onClick={event => event.stopPropagation()}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={14} />
			</button>

			{cover ? (
				<div className="overflow-hidden border-b border-[#edf0f3]">
					<img src={cover} alt="" className="h-[120px] w-full object-cover" />
				</div>
			) : null}

			<div className={`${compact ? 'px-3 py-3' : 'px-[17px] py-4'}`}>
				<div className="flex min-h-[42px] items-center gap-3 pe-6">
					<button
						type="button"
						aria-label={completedVisual ? 'Reopen task' : 'Complete task'}
						onClick={event => {
							event.stopPropagation();
							onToggleComplete?.(card);
						}}
						className={`wa-board-checkbox grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border-2 ${
							completedVisual
								? 'is-checked border-[#10c98b] bg-[#10c98b] text-white'
								: 'border-[#d4dbe4] bg-white text-transparent hover:border-[#10c98b]'
						}`}
					>
						{completedVisual ? (
							<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
								<path
									className="wa-board-checkbox__mark"
									d="M2.5 6.2L4.8 8.5L9.5 3.5"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						) : null}
					</button>

					<span className={`h-[9px] w-[9px] shrink-0 rounded-full ${theme.dot}`} />

					<h4
						className={`min-w-0 flex-1 truncate text-[15px] font-bold leading-5 tracking-tight text-[#1d2a3d] ${
							completedVisual ? 'text-[#6b7788] line-through decoration-[#10c98b]/60' : ''
						}`}
					>
						{card.title}
					</h4>

					{due ? (
						<span
							className={`ms-auto inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium ${
								overdue ? 'text-[#e11d48]' : 'text-[#778499]'
							}`}
						>
							<Calendar size={15} strokeWidth={1.8} />
							{due}
						</span>
					) : null}
				</div>

				{card.description && !compact ? (
					<div className="mt-3 rounded-[8px] border border-[#e5e9ee] bg-[#fbfcfd] px-2.5 py-2 text-[11px] leading-4 text-[#64738a] line-clamp-3">
						{card.description}
					</div>
				) : null}

				{showMetaPanel ? (
					<div className="mt-3 overflow-hidden rounded-[10px] border border-[#edf0f3]">
						{card.isStarred || checklist.length ? (
							<>
								<div className="flex h-[48px] items-center gap-3 border-b border-[#edf0f3] px-3">
									<span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#fff0f4] text-[#f43f74]">
										<Flag size={16} strokeWidth={1.8} />
									</span>
									<span className="text-[13px] font-medium text-[#1d2a3d]">Priority</span>
									<span
										className={`ms-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
											card.isStarred
												? 'bg-[#fff0f4] text-[#f13f70]'
												: 'bg-[#f0f2f5] text-[#8692a5]'
										}`}
									>
										{card.isStarred ? 'High' : 'Normal'}
									</span>
								</div>
								{checklist.length ? (
									<div className="flex h-[48px] items-center gap-3 border-b border-[#edf0f3] px-3">
										<span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#e7faf2] text-[#0cbe7d]">
											<CheckSquare size={16} strokeWidth={1.8} />
										</span>
										<span className="text-[13px] font-medium text-[#1d2a3d]">
											Checklist status
										</span>
										<span className="ms-auto rounded-full bg-[#e8faf2] px-2.5 py-1 text-[11px] font-semibold text-[#10b879]">
											{checklistDone} / {checklist.length}
										</span>
									</div>
								) : null}
							</>
						) : null}

						{label || card.links?.length ? (
							<div className="flex h-[48px] items-center gap-3 px-3">
								<span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#eef6ff] text-[#2589ed]">
									{label ? <Tag size={16} strokeWidth={1.8} /> : <Link2 size={16} strokeWidth={1.8} />}
								</span>
								<span className="text-[13px] font-medium text-[#1d2a3d]">
									{label ? 'Label' : 'WhatsApp'}
								</span>
								<span className="ms-auto max-w-[46%] truncate text-[12px] font-semibold text-[#8692a5]">
									{label?.name || `${card.links.length} linked`}
								</span>
							</div>
						) : null}
					</div>
				) : null}

				{compact && (due || checklist.length > 0 || label) ? (
					<div className="mt-2 flex flex-wrap items-center gap-1.5 ps-10">
						{label ? (
							<span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${labelPillClass(label)}`}>
								{label.name}
							</span>
						) : null}
						{checklist.length ? (
							<span className="rounded-full bg-[#e8faf2] px-2 py-0.5 text-[9px] font-semibold text-[#10b879]">
								{checklistDone}/{checklist.length}
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
			className={`min-h-0 flex-1 overflow-y-auto px-0 pb-12 nice-scroll transition-colors duration-150 ${
				isOver ? 'bg-[#eefaf4] ring-1 ring-inset ring-[#0db873]/20' : ''
			} ${empty ? 'flex flex-col' : ''}`}
		>
			{children}
		</div>
	);
}

function ColumnDropIndicator() {
	return (
		<div
			className="mx-0.5 flex h-full min-h-[360px] w-2 shrink-0 items-stretch"
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
	const theme = columnTheme(list.title);
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
				className={`relative flex h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-[#fbfcfd] shadow-[0_1px_6px_rgba(30,43,65,0.04)] transition-[box-shadow,opacity,border-color] duration-150 lg:min-w-[240px] lg:flex-1 lg:max-w-[340px] ${
					isDragging
						? 'border-dashed border-[#0db873]/55 bg-[#eefaf4]/70 opacity-30 shadow-none'
						: 'border-[#e8ecf1] hover:shadow-[0_3px_12px_rgba(30,43,65,0.06)]'
				}`}
			>
				<header className="flex shrink-0 items-center gap-1.5 border-b border-[#f0f2f5] bg-white/80 px-2 py-2.5 backdrop-blur-sm">
					<button
						type="button"
						className="grid h-7 w-6 cursor-grab place-items-center rounded-md text-[#9aa5b5] transition-colors hover:bg-[#f5f7fa] hover:text-[#54656f] active:cursor-grabbing"
						aria-label={ar ? 'سحب العمود' : 'Drag column'}
						{...attributes}
						{...listeners}
					>
						<GripVertical size={14} />
					</button>
					<span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
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
							className="h-7 min-w-0 flex-1 rounded-md border border-[#0db873] bg-white px-2 text-[11px] font-bold text-[#182235] outline-none"
						/>
					) : (
						<button
							type="button"
							onClick={() => setRenaming(true)}
							className="min-w-0 flex-1 truncate text-start text-[12px] font-bold text-[#182235] hover:underline"
							title={ar ? 'إعادة تسمية' : 'Rename'}
						>
							{list.title}
						</button>
					)}
					{cards.length > 0 ? (
						<span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${theme.count}`}>
							{cards.length}
						</span>
					) : null}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="grid h-7 w-7 place-items-center rounded-md text-[#54656f] transition-colors hover:bg-[#f5f7fa]"
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
					<div
						className={`pt-5 ${
							empty && !creating ? 'flex min-h-full flex-1 flex-col' : ''
						}`}
					>
						<SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
							{cards.map(card => (
								<SortableTaskCard
									key={card.id}
									card={card}
									listId={list.id}
									theme={theme}
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
								className="mx-2 mb-2 flex min-h-[140px] w-[calc(100%-1rem)] flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d7dee8] bg-white/70 text-[11px] font-semibold text-[#667781] transition-colors hover:border-[#0db873] hover:text-[#0db873]"
							>
								<Plus size={16} />
								{ar ? 'إضافة بطاقة جديدة' : 'Add new card'}
							</button>
						) : null}
					</div>
				</ColumnDropArea>

				{!creating && cards.length > 0 ? (
					<div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-[#fbfcfd] via-[#fbfcfd]/95 to-transparent px-2 pb-2 pt-6">
						<button
							type="button"
							onClick={startCreate}
							className="pointer-events-auto flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#e2e7ee] bg-white text-[11px] font-semibold text-[#54656f] shadow-[0_2px_8px_rgba(30,43,65,0.06)] transition-all hover:border-[#0db873] hover:text-[#0db873] active:scale-[0.99]"
						>
							<Plus size={13} />
							{ar ? 'إضافة بطاقة جديدة' : 'Add new card'}
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
				next.sort((a, b) => Number(Boolean(b.isStarred)) - Number(Boolean(a.isStarred)));
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
			const columnNext = nextCompleted
				? [...incomplete, ...completed, updated]
				: [...incomplete, updated, ...completed];
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
			const others = cards.filter(card => card.listId !== activeCard.listId);
			const from = columnCards.findIndex(card => card.id === active.id);
			const to = columnCards.findIndex(card => card.id === over.id);
			if (from >= 0 && to >= 0 && from !== to) {
				const reordered = arrayMove(columnCards, from, to);
				setCards([...others, ...reordered]);
				void persistCardMove(
					active.id,
					activeCard.listId,
					reordered.map(card => card.id),
				).catch(err => {
					toast.error(err?.message || (ar ? 'فشل نقل البطاقة' : 'Could not move card'));
				});
			}
			return;
		}
		const columnId = overData?.type === 'column' ? overData.listId : activeCard.listId;
		const ids = cards.filter(card => card.listId === columnId).map(card => card.id);
		void persistCardMove(active.id, columnId, ids).catch(err => {
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
			toast.success(ar ? 'تم إنشاء البطاقة' : 'Card created');
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
			toast.success(ar ? 'تم إضافة العمود' : 'Column added');
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
			<header className="flex shrink-0 flex-col gap-2 pt-1 sm:pt-2">
				<div className="flex flex-wrap items-end justify-between gap-2">
					<div className="min-w-0 shrink-0">
						<h1 className="flex items-center gap-1.5 text-xl font-bold tracking-tight sm:text-[20px]">
							{ar ? 'لوحة المهام' : 'Tasks board'}
							<span className="inline-flex text-[#13b879]">
								<ArrowUpRight size={18} />
							</span>
						</h1>
						<p className="mt-0.5 text-[11px] leading-4 text-[#7b8799]">
							{ar ? 'إدارة المهام اليومية من محادثات واتساب' : 'Daily task management from WhatsApp conversations'}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="relative flex h-8 w-full max-w-[220px] items-center rounded-lg border border-[#e2e7ee] bg-white px-2 shadow-sm focus-within:border-[#0db873]/50 sm:w-[200px]">
						<Search size={14} className="shrink-0 text-[#26364b]" />
						<input
							value={searchTerm}
							onChange={event => setSearchTerm(event.target.value)}
							placeholder={ar ? 'بحث…' : 'Search…'}
							className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-[11px] outline-none placeholder:text-[#758196]"
						/>
						{searchTerm ? (
							<button
								type="button"
								onClick={() => setSearchTerm('')}
								className="rounded p-0.5 text-[#7f8b9c] hover:bg-[#f3f5f8]"
							>
								<X size={12} />
							</button>
						) : null}
					</div>

					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								className={`inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-[11px] font-semibold transition-colors hover:border-[#cfd7e2] ${
									panelFilterCount
										? 'border-[#0db873] text-[#0a9a62]'
										: 'border-[#e2e7ee] text-[#26354a]'
								}`}
							>
								<Filter size={13} className="text-[#53637a]" />
								{ar ? 'فلاتر وترتيب' : 'Filters & Sort'}
								{panelFilterCount ? (
									<span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#0db873] px-1 text-[9px] text-white">
										{panelFilterCount}
									</span>
								) : null}
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="z-[120000] w-[320px] space-y-3 p-3">
							<div className="rounded-xl bg-[#f8fafb] p-2">
								<p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
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
								<p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
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
								<p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
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
									className="w-full rounded-lg border border-[#e2e7ee] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#54656f] hover:bg-[#f8fafc]"
								>
									{ar ? 'مسح الكل' : 'Clear all'}
								</button>
							) : null}
						</PopoverContent>
					</Popover>

					<Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e2e7ee] bg-white px-2.5 text-[10px] font-semibold text-[#26354a] hover:border-[#cfd7e2]"
							>
								<Settings2 size={13} className="text-[#53637a]" />
								{ar ? 'إعدادات اللوحة' : 'Board settings'}
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="z-[120000] w-[300px] space-y-2 p-3">
							<div>
								<p className="text-[12px] font-bold text-[#182235]">
									{ar ? 'إعدادات اللوحة' : 'Board settings'}
								</p>
								<p className="mt-0.5 text-[10px] text-[#8a95a5]">
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
									<span className="block text-[11px] font-semibold text-[#182235]">
										{ar ? 'تمييز المتأخر' : 'Highlight overdue'}
									</span>
									<span className="mt-0.5 block text-[10px] leading-3.5 text-[#667781]">
										{ar
											? 'حدود حمراء خفيفة للبطاقات المتأخرة.'
											: 'Subtle red border on overdue cards.'}
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
									<span className="block text-[11px] font-semibold text-[#182235]">
										{ar ? 'بطاقات مضغوطة' : 'Compact cards'}
									</span>
									<span className="mt-0.5 block text-[10px] leading-3.5 text-[#667781]">
										{ar ? 'تقليل المسافات داخل البطاقة.' : 'Tighter padding inside cards.'}
									</span>
								</span>
							</label>
							<p className="rounded-lg bg-[#f8fafb] px-2.5 py-2 text-[10px] leading-4 text-[#667781]">
								{ar
									? 'الإكمال يُبقي البطاقة في نفس العمود وينزّلها للأسفل. السحب حر بين الأعمدة.'
									: 'Complete keeps the card in-column and sinks it. Drag stays free across columns.'}
							</p>
						</PopoverContent>
					</Popover>

					{panelFilterCount ? (
						<div className="flex flex-wrap items-center gap-1.5">
							{filterStatus !== 'all' ? (
								<button
									type="button"
									onClick={() => setFilterStatus('all')}
									className="inline-flex h-7 items-center gap-1 rounded-full bg-[#e8f8f0] px-2.5 text-[10px] font-semibold text-[#0a9a62]"
								>
									{filterStatusLabel[filterStatus]}
									<X size={12} />
								</button>
							) : null}
							{filterLabel !== 'all' ? (
								<button
									type="button"
									onClick={() => setFilterLabel('all')}
									className="inline-flex h-7 items-center gap-1 rounded-full bg-[#f0eaff] px-2.5 text-[10px] font-semibold text-[#8056dc]"
								>
									{labels.find(label => label.id === filterLabel)?.name || 'Label'}
									<X size={12} />
								</button>
							) : null}
							{sortBy !== 'none' ? (
								<button
									type="button"
									onClick={() => setSortBy('none')}
									className="inline-flex h-7 items-center gap-1 rounded-full bg-[#eef4ff] px-2.5 text-[10px] font-semibold text-[#3b82f6]"
								>
									{ar ? 'مرتب' : 'Sorted'}
									<X size={12} />
								</button>
							) : null}
						</div>
					) : null}

					<button
						type="button"
						onClick={() => setAddingList(true)}
						className="ms-auto inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-[#d5dde8] bg-white px-2.5 text-[10px] font-semibold text-[#54656f] hover:border-[#0db873] hover:text-[#0db873]"
					>
						<Plus size={13} />
						{ar ? 'إضافة عمود' : 'Add column'}
					</button>
				</div>
			</header>

			<section className="mt-2 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
				<StatCard
					icon={FileText}
					iconClass="bg-[#f0eaff] text-[#8056dc]"
					label={ar ? 'إجمالي البطاقات' : 'Total Cards'}
					value={stats.total}
					caption={ar ? 'من هذا الحساب' : 'on this account'}
					chart="M1 16l5-2 5 5 6-8 5 4 6-7 6 3"
				/>
				<StatCard
					icon={ShieldCheck}
					iconClass="bg-[#e7f8ef] text-[#12aa70]"
					label={ar ? 'مكتمل' : 'Completed'}
					value={stats.completed}
					delta={{ text: `${stats.completedPct}%`, className: 'text-[#17b778]' }}
					caption={ar ? 'من الإجمالي' : 'of total'}
					ring={{ color: '#39c38b', percent: stats.completedPct, label: `${stats.completedPct}%` }}
				/>
				<StatCard
					icon={Timer}
					iconClass="bg-[#fff1df] text-[#ff981b]"
					label={ar ? 'قيد التنفيذ' : 'In Progress'}
					value={stats.inProgress}
					delta={{ text: `${stats.progressPct}%`, className: 'text-[#f39a1c]' }}
					caption={ar ? 'من الإجمالي' : 'of total'}
					ring={{ color: '#ffad42', percent: stats.progressPct, label: `${stats.progressPct}%` }}
				/>
				<StatCard
					icon={Clock}
					iconClass="bg-[#ffe8ef] text-[#ef4d76]"
					label={ar ? 'متأخر' : 'Overdue'}
					value={stats.overdue}
					delta={{ text: `${stats.overduePct}%`, className: 'text-[#ef4c57]' }}
					caption={ar ? 'تحتاج متابعة' : 'need attention'}
					ring={{ color: '#f06b87', percent: Math.max(stats.overduePct, 1), label: `${stats.overduePct}%` }}
				/>
				<StatCard
					icon={Timer}
					iconClass="bg-[#e8f4ff] text-[#2386ee]"
					label={ar ? 'أعمدة اللوحة' : 'Board columns'}
					value={lists.length}
					caption={ar ? 'نشطة الآن' : 'active now'}
					chart="M1 7l7 6 5-2 5 7 6-8 5 4 5-6"
				/>
			</section>

			<div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden pb-2 sm:mt-5">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCorners}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					onDragEnd={onDragEnd}
					onDragCancel={onDragCancel}
				>
					<div className="nice-scroll flex h-full min-h-0 flex-1 items-stretch gap-5 overflow-x-auto">
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
							<div className="flex h-full min-h-0 w-[260px] shrink-0 flex-col rounded-2xl border border-[#e6ebf1] bg-white p-3 shadow-sm">
								<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
									{ar ? 'اسم العمود' : 'Column name'}
								</p>
								<div className="relative">
									<input
										autoFocus
										value={newListTitle}
										disabled={listSaving}
										onChange={event => setNewListTitle(event.target.value)}
										placeholder={ar ? 'عمود جديد' : 'New column'}
										className="h-9 w-full rounded-xl border border-[#e2e7ee] pe-16 ps-3 text-[12px] font-semibold outline-none focus:border-[#0db873]"
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
											className="grid h-6 w-6 place-items-center rounded-md border border-[#e2e7ee] bg-white text-[#54656f]"
										>
											<X size={12} />
										</button>
										<button
											type="button"
											disabled={listSaving || !newListTitle.trim()}
											onClick={() => void saveNewList()}
											className="grid h-6 w-6 place-items-center rounded-md bg-[#0db873] text-white disabled:opacity-50"
										>
											{listSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
										</button>
									</div>
								</div>
								{listError ? <p className="mt-1.5 text-[10px] font-semibold text-[#e11d48]">{listError}</p> : null}
							</div>
						) : null}
					</div>
					<DragOverlay dropAnimation={DROP_ANIMATION}>
						{activeList ? (
							<div className="w-[260px] rotate-[1deg] rounded-2xl border border-[#0db873]/35 bg-white p-3 shadow-2xl ring-2 ring-[#0db873]/20">
								<div className="mb-2 flex items-center gap-2">
									<span className={`h-2 w-2 rounded-full ${columnTheme(activeList.title).dot}`} />
									<p className="text-[12px] font-bold">{activeList.title}</p>
									<span className="rounded-full bg-[#f1f3f6] px-1.5 text-[9px] font-bold text-[#667781]">
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
							<div className="w-[240px] rotate-[1deg] rounded-xl border border-[#0db873]/40 bg-white p-3 text-[12px] font-semibold shadow-2xl ring-2 ring-[#0db873]/15">
								{activeCard.title}
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
					onDelete={cardId => void removeCard(cardId)}
					onOpenConversation={onOpenConversation}
					onToggleComplete={card => void toggleCompleteCard(card)}
					onDuplicate={card => void duplicateCard(card)}
				/>
			) : null}
		</div>
	);
}
