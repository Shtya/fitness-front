'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Bookmark,
	BookOpen,
	Check,
	ChevronRight,
	ExternalLink,
	GraduationCap,
	Layers,
	Loader2,
	Map,
	Plus,
	RefreshCw,
	Sparkles,
	Star,
	Target,
	Trash2,
	X,
	Zap,
} from 'lucide-react';
import Select from '@/components/atoms/Select';
import {
	aggregateDailyPlan,
	classifyPathDailyItems,
	daysOverdue,
	isDailyItemDone,
	pathProgress,
	todayKey,
} from './learning-utils';
import { learningText } from './learning-localize';

const cx = (...parts) => parts.filter(Boolean).join(' ');

const LS_WELCOME = 'learning:welcome-seen';

export function learningWelcomeSeen() {
	try {
		return localStorage.getItem(LS_WELCOME) === '1';
	} catch {
		return true;
	}
}

export function markLearningWelcomeSeen() {
	try {
		localStorage.setItem(LS_WELCOME, '1');
	} catch {
		/* ignore */
	}
}

/** Thin wrapper so Learning always uses the shared custom dropdown. */
export function LearningSelect({
	value,
	onChange,
	options = [],
	placeholder,
	label,
	className = '',
	searchable = false,
	clearable = false,
	disabled = false,
}) {
	const normalized = useMemo(
		() =>
			options.map(option =>
				typeof option === 'string'
					? { id: option, label: option }
					: { id: option.id ?? option.value, label: option.label },
			),
		[options],
	);

	return (
		<div className={cx('min-w-[148px]', className)}>
			<Select
				label={label}
				value={value}
				onChange={onChange}
				options={normalized}
				placeholder={placeholder}
				searchable={searchable}
				clearable={clearable}
				disabled={disabled}
				className="!w-full"
			/>
		</div>
	);
}

export function LearningPanel({ title, icon: Icon, tone = 'default', children, className = '', action }) {
	const iconTone =
		tone === 'amber'
			? 'text-amber-500'
			: tone === 'primary'
				? 'text-[var(--color-primary-500)]'
				: 'text-slate-500';

	return (
		<section
			className={cx(
				'flex h-full min-h-[220px] flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900',
				className,
			)}
		>
			<div className="mb-4 flex items-center justify-between gap-3">
				<h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
					{Icon ? <Icon size={16} className={iconTone} /> : null}
					{title}
				</h3>
				{action}
			</div>
			<div className="flex min-h-0 flex-1 flex-col">{children}</div>
		</section>
	);
}

function ProgressRing({ value = 0, size = 52, id }) {
	const r = (size - 8) / 2;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(100, Number(value) || 0));
	const gradId = id || `learn-grad-${size}-${Math.round(pct)}`;
	return (
		<svg width={size} height={size} className="-rotate-90">
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				stroke="currentColor"
				strokeWidth="6"
				className="text-slate-200 dark:text-slate-700"
				fill="none"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				stroke={`url(#${gradId})`}
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={c}
				strokeDashoffset={c - (pct / 100) * c}
				fill="none"
			/>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="var(--color-gradient-from, #6366f1)" />
					<stop offset="100%" stopColor="var(--color-gradient-to, #a855f7)" />
				</linearGradient>
			</defs>
		</svg>
	);
}

const DAILY_KIND_META = {
	overdue: {
		labelKey: 'dailyOverdue',
		className:
			'border-rose-200/90 bg-rose-50/90 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
		dot: 'bg-rose-500',
	},
	new: {
		labelKey: 'dailyNew',
		className:
			'border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/80 text-[var(--color-primary-800)] dark:border-slate-700 dark:bg-slate-900 dark:text-[var(--color-primary-200)]',
		dot: 'bg-[var(--color-primary-500)]',
	},
	review: {
		labelKey: 'dailyReview',
		className:
			'border-amber-200/90 bg-amber-50/90 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100',
		dot: 'bg-amber-500',
	},
	done: {
		labelKey: 'dailyDone',
		className:
			'border-slate-200/80 bg-slate-50/80 text-slate-500 line-through dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400',
		dot: 'bg-emerald-500',
	},
};

function DailyKindBadge({ kind, t, overdueDays = 0, variant = 'default' }) {
	const meta = DAILY_KIND_META[kind] || DAILY_KIND_META.new;
	if (variant === 'path') {
		const label =
			kind === 'overdue' && overdueDays > 0
				? `${t.dailyOverdue} · ${overdueDays}${t.dailyDaysShort}`
				: t[meta.labelKey] || meta.labelKey;
		return (
			<span className={cx('learning-today-badge', `learning-today-badge--${kind}`)}>
				{label}
			</span>
		);
	}
	return (
		<span
			className={cx(
				'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
				meta.className,
			)}
		>
			<span className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} />
			{kind === 'overdue' && overdueDays > 0
				? `${t.dailyOverdue} · ${overdueDays}${t.dailyDaysShort}`
				: t[meta.labelKey] || meta.labelKey}
		</span>
	);
}

export function DailyItemRow({
	item,
	t,
	today = todayKey(),
	onToggle,
	onOpen,
	compact = false,
	showPath = false,
	pathTitle = '',
	variant = 'default',
	hideKindBadge = false,
}) {
	const done = isDailyItemDone(item);
	const baseKind = (() => {
		const scheduled = String(item.scheduledDate || '');
		if (scheduled < today) return 'overdue';
		if (item.kind === 'review') return 'review';
		return 'new';
	})();
	const overdueDays = baseKind === 'overdue' ? daysOverdue({ ...item, completedAt: null }, today) : 0;
	const isPath = variant === 'path';
	const priority = Number(item.priority) || 0;
	const showBadge = !hideKindBadge && !compact;

	if (isPath) {
		return (
			<div
				className={cx(
					'learning-today-item',
					`learning-today-item--${baseKind}`,
					done && 'is-done',
				)}
			>
				<button
					type="button"
					onClick={() => onToggle?.(item)}
					className={cx('learning-today-radio', done && 'is-checked')}
					aria-label={done ? t.dailyUncheck : t.dailyCheck}
				>
					{done ? <Check size={11} strokeWidth={3} /> : null}
				</button>
				<button
					type="button"
					onClick={() => onOpen?.(item)}
					className="learning-today-item__body"
				>
					{showBadge ? (
						<div className="learning-today-item__tags">
							{priority > 0 && !done ? (
								<span className="learning-today-priority">P{priority}</span>
							) : null}
							<DailyKindBadge
								kind={done ? 'done' : baseKind}
								t={t}
								overdueDays={overdueDays}
								variant="path"
							/>
						</div>
					) : null}
					<span className="learning-today-item__title">
						{!showBadge && priority > 0 && !done ? (
							<span className="learning-today-priority is-inline">P{priority}</span>
						) : null}
						{item.title}
					</span>
				</button>
			</div>
		);
	}

	return (
		<div
			className={cx(
				'learning-plan-item',
				`learning-plan-item--${baseKind}`,
				done && 'is-done',
				compact && 'is-compact',
			)}
		>
			<button
				type="button"
				onClick={() => onToggle?.(item)}
				className={cx('learning-plan-item__check', done && 'is-checked')}
				aria-label={done ? t.dailyUncheck : t.dailyCheck}
			>
				{done ? <Check size={12} strokeWidth={3} /> : null}
			</button>
			<button
				type="button"
				onClick={() => onOpen?.(item)}
				className="learning-plan-item__body"
			>
				<p className="learning-plan-item__title">
					{priority > 0 && !done ? (
						<span className="learning-today-priority is-inline">P{priority}</span>
					) : null}
					{item.title}
				</p>
				{(showPath && pathTitle) || showBadge ? (
					<div className="learning-plan-item__meta">
						{showBadge ? (
							<DailyKindBadge kind={done ? 'done' : baseKind} t={t} overdueDays={overdueDays} />
						) : null}
						{showPath && pathTitle ? (
							<span className="learning-plan-item__path">{pathTitle}</span>
						) : null}
					</div>
				) : null}
			</button>
		</div>
	);
}

export function LearningDailyCardPreview({ path, t, today = todayKey(), onToggle, onOpenItem }) {
	const groups = classifyPathDailyItems(path, today);
	const preview = [...groups.overdue, ...groups.todayNew, ...groups.todayReview].slice(0, 4);
	const remaining =
		groups.overdue.length + groups.todayNew.length + groups.todayReview.length - preview.length;

	if (!preview.length && !groups.doneToday.length) {
		return (
			<div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-3 dark:border-slate-700">
				<p className="text-xs text-slate-500">{t.dailyEmptyCard}</p>
			</div>
		);
	}

	return (
		<div className="mt-4 space-y-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.dailyTodayList}</p>
				<div className="flex flex-wrap gap-1">
					{groups.overdue.length > 0 && (
						<span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
							{groups.overdue.length} {t.dailyOverdue}
						</span>
					)}
					{groups.todayNew.length > 0 && (
						<span className="rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-700)] dark:bg-slate-800 dark:text-[var(--color-primary-300)]">
							{groups.todayNew.length} {t.dailyNew}
						</span>
					)}
					{groups.todayReview.length > 0 && (
						<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
							{groups.todayReview.length} {t.dailyReview}
						</span>
					)}
				</div>
			</div>
			<div className="space-y-1.5">
				{preview.map(item => (
					<DailyItemRow
						key={item.id}
						item={item}
						t={t}
						today={today}
						compact
						onToggle={() => onToggle?.(path.id, item.id)}
						onOpen={() => onOpenItem?.(path, item)}
					/>
				))}
			</div>
			{remaining > 0 && (
				<p className="text-[11px] font-semibold text-slate-400">+{remaining} {t.dailyMore}</p>
			)}
		</div>
	);
}

export function LearningDailyPlanner({
	path,
	t,
	today = todayKey(),
	onToggle,
	onOpenItem,
	onAdd,
	compact = false,
	variant = 'default',
}) {
	const groups = classifyPathDailyItems(path, today);
	const [draft, setDraft] = useState('');
	const [draftKind, setDraftKind] = useState('new');
	const isPath = variant === 'path';

	const sections = [
		{ key: 'overdue', title: t.dailyOverdue, items: groups.overdue, icon: AlertCircle, tone: 'overdue', iconClass: 'learning-path-section__icon--overdue' },
		{ key: 'todayNew', title: t.dailyNewToday, items: groups.todayNew, icon: BookOpen, tone: 'learn', iconClass: 'learning-path-section__icon--learn' },
		{ key: 'todayReview', title: t.dailyReviewToday, items: groups.todayReview, icon: RefreshCw, tone: 'review', iconClass: 'learning-path-section__icon--review' },
	];

	const content = (
		<>
			{!isPath && (
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{t.dailyPlanner}</h3>
						<p className="mt-1 text-sm text-slate-500">{t.dailyPlannerHint}</p>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{groups.overdue.length > 0 && (
							<span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
								{groups.overdue.length} {t.dailyOverdue}
							</span>
						)}
						{groups.todayNew.length > 0 && (
							<span className="rounded-full bg-[var(--color-primary-100)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-700)]">
								{groups.todayNew.length} {t.dailyNew}
							</span>
						)}
						{groups.todayReview.length > 0 && (
							<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40">
								{groups.todayReview.length} {t.dailyReview}
							</span>
						)}
					</div>
				</div>
			)}

			{isPath && (
				<div className="learning-path-list-head">
					<h2>{t.dailyPlanner}</h2>
					<p>{t.dailyPlannerHint}</p>
				</div>
			)}

			{sections.map(section => {
				const Icon = section.icon;
				const pendingCount = section.items.filter(item => !isDailyItemDone(item)).length;
				return (
					<div
						key={section.key}
						className={isPath ? cx('learning-path-section', `learning-path-section--${section.tone}`) : undefined}
					>
						<div className={isPath ? 'learning-path-section__label' : 'mb-2 flex items-center gap-2'}>
							{isPath ? (
								<span className={cx('learning-path-section__icon', section.iconClass)}>
									<Icon size={15} />
								</span>
							) : (
								<Icon
									size={14}
									className={
										section.tone === 'overdue'
											? 'text-rose-500'
											: section.tone === 'review'
												? 'text-amber-500'
												: 'text-[var(--color-primary-500)]'
									}
								/>
							)}
							<span className={isPath ? 'learning-path-section__title' : undefined}>{section.title}</span>
							<span
								className={
									isPath
										? cx('learning-path-section__count', `is-${section.tone}`)
										: 'text-[11px] font-semibold text-slate-400'
								}
							>
								({pendingCount}/{section.items.length})
							</span>
						</div>
						{section.items.length === 0 ? (
							isPath ? (
								<div className="learning-path-section-empty">—</div>
							) : (
								<p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">
									—
								</p>
							)
						) : (
							<div className={isPath ? 'learning-path-section__items' : 'space-y-1.5'}>
								{section.items.map(item => (
									<DailyItemRow
										key={item.id}
										item={item}
										t={t}
										today={today}
										variant={isPath ? 'path' : 'default'}
										hideKindBadge={isPath}
										compact={!isPath}
										onToggle={() => onToggle?.(item.id)}
										onOpen={() => onOpenItem?.(item)}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}

			<form
				className={isPath ? 'learning-path-add-row' : 'flex flex-col gap-2 sm:flex-row'}
				onSubmit={event => {
					event.preventDefault();
					if (!draft.trim()) return;
					onAdd?.(draft.trim(), draftKind);
					setDraft('');
				}}
			>
				<input
					value={draft}
					onChange={event => setDraft(event.target.value)}
					placeholder={t.dailyAddPlaceholder}
					className={
						isPath
							? 'learning-path-add-input'
							: 'h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950'
					}
				/>
				<div className={isPath ? 'learning-path-type-select flex gap-2' : 'flex gap-2'}>
					<LearningSelect
						value={draftKind}
						onChange={setDraftKind}
						className={isPath ? 'learning-path-type-select__control w-[120px]' : 'w-[130px]'}
						options={[
							{ id: 'new', label: t.dailyNew },
							{ id: 'review', label: t.dailyReview },
						]}
					/>
					<button
						type="submit"
						className={
							isPath
								? 'learning-path-add-btn'
								: 'inline-flex h-11 items-center gap-1.5 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-900'
						}
					>
						<Plus size={15} />
						{t.dailyAdd}
					</button>
				</div>
			</form>
		</>
	);

	if (isPath) {
		return content;
	}

	return (
		<div className={cx('space-y-4', compact ? '' : 'rounded-[28px] border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6')}>
			{content}
		</div>
	);
}

export function LearningDailyOverview({
	paths,
	t,
	locale = 'en',
	today = todayKey(),
	onToggle,
	onOpenItem,
}) {
	const plan = aggregateDailyPlan(paths, today);
	const hasAny = plan.all.length > 0;

	if (!hasAny) {
		return <p className="learning-plan-empty">{t.dailyOverviewEmpty}</p>;
	}

	const buckets = [
		{ key: 'overdue', title: t.dailyOverdue, rows: plan.overdue, tone: 'overdue' },
		{ key: 'todayNew', title: t.dailyNewToday, rows: plan.todayNew, tone: 'learn' },
		{ key: 'todayReview', title: t.dailyReviewToday, rows: plan.todayReview, tone: 'review' },
	];

	return (
		<div className="learning-plan-overview is-compact">
			{buckets
				.filter(bucket => bucket.rows.length > 0)
				.map(bucket => {
					const pending = bucket.rows.filter(row => !isDailyItemDone(row.item)).length;
					return (
						<section
							key={bucket.key}
							className={cx('learning-plan-bucket', `learning-plan-bucket--${bucket.tone}`)}
						>
							<div className="learning-plan-bucket__head">
								<p className="learning-plan-bucket__title">{bucket.title}</p>
								<span className="learning-plan-bucket__count">
									{pending}/{bucket.rows.length}
								</span>
							</div>
							<div className="learning-plan-bucket__items">
								{bucket.rows.map(({ path, item }) => (
									<DailyItemRow
										key={`${path.id}:${item.id}`}
										item={item}
										t={t}
										today={today}
										compact
										hideKindBadge
										showPath
										pathTitle={learningText(path, 'title', locale) || path.title}
										onToggle={() => onToggle?.(path.id, item.id)}
										onOpen={() => onOpenItem?.(path, item)}
									/>
								))}
							</div>
						</section>
					);
				})}
		</div>
	);
}

export function LearningPathShell({
	path,
	t,
	progress,
	activeTab,
	onTabChange,
	onBack,
	onTitleChange,
	children,
}) {
	const tabs = [
		{ id: 'today', label: t.tabToday, icon: Target },
		{ id: 'details', label: t.tabDetails, icon: Sparkles },
		{ id: 'roadmap', label: t.tabRoadmap, icon: Layers },
	];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-5">
			<section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800">
				<div
					className="absolute inset-0 opacity-95"
					style={{
						background:
							'linear-gradient(135deg, color-mix(in srgb, var(--color-gradient-from) 92%, #0f172a), color-mix(in srgb, var(--color-gradient-to) 88%, #1e293b))',
					}}
				/>
				<div
					className="absolute inset-0 opacity-[0.14]"
					style={{
						backgroundImage:
							'radial-gradient(circle at 20% 20%, white 0, transparent 42%), radial-gradient(circle at 80% 0%, white 0, transparent 35%)',
					}}
				/>
				<div className="relative p-5 sm:p-6">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="min-w-0 flex-1">
							<button
								type="button"
								onClick={onBack}
								className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
							>
								<ArrowLeft size={15} />
								{t.back}
							</button>
							<input
								value={path.title || ''}
								onChange={event => onTitleChange?.(event.target.value)}
								className="w-full border-none bg-transparent text-2xl font-black text-white outline-none placeholder:text-white/50 sm:text-3xl"
								placeholder={t.titleLabel}
							/>
							<p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
								{path.description || path.goal || t.pathWorldHint}
							</p>
							<div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/90">
								<span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
									{path.category || 'General'}
								</span>
								<span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
									{progress.done}/{progress.total} {t.topics}
								</span>
								<span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
									{progress.percent}%
								</span>
							</div>
						</div>
						<div className="relative shrink-0 rounded-2xl bg-white/15 p-3 backdrop-blur">
							<ProgressRing value={progress.percent} size={84} id={`path-world-${path.id}`} />
							<span className="absolute inset-0 grid place-items-center text-base font-black text-white">
								{progress.percent}%
							</span>
						</div>
					</div>

					<div className="mt-6 flex flex-wrap gap-2">
						{tabs.map(tab => {
							const Icon = tab.icon;
							const active = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => onTabChange?.(tab.id)}
									className={cx(
										'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition',
										active
											? 'bg-white text-slate-900 shadow-lg'
											: 'bg-white/12 text-white hover:bg-white/20',
									)}
								>
									<Icon size={15} />
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>
			</section>

			<div className="min-h-0 flex-1">{children}</div>
		</div>
	);
}

export function LearningPathsTable({
	paths = [],
	t,
	locale = 'en',
	relativeTime,
	onOpen,
	onContinue,
	onToggleFavorite,
	onDelete,
}) {
	return (
		<section className="learning-neu learning-paths-table-wrap" aria-label={t.tabPaths || t.paths}>
			<div className="learning-paths-table-scroll">
				<table className="learning-paths-table">
					<thead>
						<tr>
							<th scope="col">{t.colPath || t.paths}</th>
							<th scope="col">{t.colProgress || t.completed}</th>
							<th scope="col">{t.colCurrent || t.current}</th>
							<th scope="col">{t.colActivity || t.lastActivity}</th>
							<th scope="col" className="is-actions">
								{t.colActions || t.actions || 'Actions'}
							</th>
						</tr>
					</thead>
					<tbody>
						{paths.map(path => {
							const progress = pathProgress(path);
							const displayTitle = learningText(path, 'title', locale);
							const currentTitle = progress.current
								? learningText(progress.current, 'title', locale)
								: '—';
							const gradId = `table-ring-${path.id}`;
							const activityLabel =
								typeof relativeTime === 'function'
									? relativeTime(path.lastActivityAt, locale)
									: '—';

							return (
								<tr
									key={path.id}
									className="learning-paths-table__row"
									onClick={() => onOpen?.(path)}
									onKeyDown={event => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											onOpen?.(path);
										}
									}}
									tabIndex={0}
									role="link"
								>
									<td className="learning-paths-table__path">
										<div className="learning-paths-table__identity">
											<div className="learning-stack-icon is-table">
												<Layers size={16} />
											</div>
											<div className="learning-paths-table__copy">
												<p className="learning-paths-table__meta">
													{path.category || 'General'} ·{' '}
													{t[path.difficulty] || path.difficulty}
												</p>
												<p className="learning-paths-table__title">{displayTitle}</p>
											</div>
										</div>
									</td>
									<td className="learning-paths-table__progress">
										<div className="learning-paths-table__progress-inner">
											<div className="learning-ring-wrap is-table">
												<ProgressRing value={progress.percent} size={42} id={gradId} />
												<span className="learning-ring-label">{progress.percent}%</span>
											</div>
											<div>
												<p className="learning-paths-table__topics">
													{progress.done} / {progress.total} {t.topics}
												</p>
												<div className="learning-paths-table__bar" aria-hidden>
													<span style={{ width: `${Math.min(100, progress.percent)}%` }} />
												</div>
											</div>
										</div>
									</td>
									<td className="learning-paths-table__current">
										<span title={currentTitle}>{currentTitle}</span>
									</td>
									<td className="learning-paths-table__activity">
										<span>{activityLabel}</span>
									</td>
									<td
										className="learning-paths-table__actions"
										onClick={event => event.stopPropagation()}
										onKeyDown={event => event.stopPropagation()}
									>
										<div className="learning-paths-table__action-row">
											<button
												type="button"
												className={cx('learning-fav-btn is-table', path.favorite && 'is-on')}
												onClick={() => onToggleFavorite?.(path)}
												aria-label={t.favorite}
											>
												<Star size={15} fill={path.favorite ? 'currentColor' : 'none'} />
											</button>
											<button
												type="button"
												className="learning-pill-btn is-table"
												onClick={() => onContinue?.(path)}
											>
												{t.continueShort || t.continue}
												<ChevronRight size={14} />
											</button>
											<button
												type="button"
												className="learning-trash-btn is-table"
												onClick={() => onDelete?.(path)}
												aria-label={t.delete}
											>
												<Trash2 size={15} />
											</button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

export function LearningLandingPathCard({
	path,
	t,
	locale = 'en',
	relativeTimeLabel,
	onOpen,
	onContinue,
	onToggleFavorite,
	onDelete,
	today = todayKey(),
}) {
	const progress = pathProgress(path);
	const groups = classifyPathDailyItems(path, today);
	const hasDaily =
		groups.overdue.length + groups.todayNew.length + groups.todayReview.length > 0;
	const gradId = `landing-ring-${path.id}`;
	const displayTitle = learningText(path, 'title', locale);
	const currentTitle = progress.current
		? learningText(progress.current, 'title', locale)
		: '—';

	const stop = event => event.stopPropagation();

	return (
		<article
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={event => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onOpen?.();
				}
			}}
			className="learning-neu learning-path-card"
		>
			<div className="learning-path-card__top">
				<div className="learning-path-card__identity">
					<div className="learning-stack-icon">
						<Layers size={18} />
					</div>
					<div className="learning-path-card__copy">
						<p className="learning-eyebrow">
							{path.category || 'General'} · {t[path.difficulty] || path.difficulty}
						</p>
						<h3 className="learning-path-title">{displayTitle}</h3>
					</div>
				</div>
				<button
					type="button"
					onClick={event => {
						stop(event);
						onToggleFavorite?.();
					}}
					className={cx(
						'learning-fav-btn',
						path.favorite ? 'is-on' : '',
					)}
					aria-label={t.favorite}
				>
					<Star size={16} fill={path.favorite ? 'currentColor' : 'none'} />
				</button>
			</div>

			<div className="learning-progress-row learning-neu-inset" onClick={stop}>
				<div className="learning-ring-wrap">
					<ProgressRing value={progress.percent} size={56} id={gradId} />
					<span className="learning-ring-label">{progress.percent}%</span>
				</div>
				<div className="learning-progress-meta">
					<p className="learning-progress-meta__title">
						{progress.done} / {progress.total} {t.topics}
					</p>
					<p className="learning-progress-meta__sub">
						{t.current}: {currentTitle} · {t.lastActivity}{' '}
						{relativeTimeLabel}
					</p>
				</div>
			</div>

			{!hasDaily && (
				<div className="learning-empty-note">{t.dailyEmptyCard}</div>
			)}

			<div className="learning-path-actions" onClick={stop}>
				<button type="button" className="learning-pill-btn" onClick={onContinue}>
					{t.continue}
					<ChevronRight size={16} />
				</button>
				<button
					type="button"
					className="learning-trash-btn"
					onClick={onDelete}
					aria-label={t.delete}
				>
					<Trash2 size={16} />
				</button>
			</div>
		</article>
	);
}

export function LearningPathsCarousel({ children, label = 'Learning paths' }) {
	const scrollerRef = useRef(null);
	const [canPrev, setCanPrev] = useState(false);
	const [canNext, setCanNext] = useState(false);

	const updateArrows = useCallback(() => {
		const node = scrollerRef.current;
		if (!node) {
			setCanPrev(false);
			setCanNext(false);
			return;
		}
		const max = node.scrollWidth - node.clientWidth;
		setCanPrev(node.scrollLeft > 4);
		setCanNext(node.scrollLeft < max - 4);
	}, []);

	useEffect(() => {
		const node = scrollerRef.current;
		if (!node) return undefined;
		updateArrows();
		const onScroll = () => updateArrows();
		node.addEventListener('scroll', onScroll, { passive: true });
		const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null;
		observer?.observe(node);
		window.addEventListener('resize', updateArrows);
		return () => {
			node.removeEventListener('scroll', onScroll);
			observer?.disconnect();
			window.removeEventListener('resize', updateArrows);
		};
	}, [updateArrows, children]);

	const scrollByCard = direction => {
		const node = scrollerRef.current;
		if (!node) return;
		const amount = Math.max(280, Math.floor(node.clientWidth * 0.72)) * direction;
		node.scrollBy({ left: amount, behavior: 'smooth' });
	};

	return (
		<section className="learning-paths-carousel" aria-label={label}>
			{canPrev ? (
				<button
					type="button"
					className="learning-paths-carousel__arrow is-prev"
					onClick={() => scrollByCard(-1)}
					aria-label="Previous"
				>
					<ArrowLeft size={18} />
				</button>
			) : null}
			<div className="learning-paths-carousel__scroller" ref={scrollerRef}>
				{children}
			</div>
			{canNext ? (
				<button
					type="button"
					className="learning-paths-carousel__arrow is-next"
					onClick={() => scrollByCard(1)}
					aria-label="Next"
				>
					<ArrowRight size={18} />
				</button>
			) : null}
		</section>
	);
}

export function LearningRoadmapSearchPanel({
	t,
	query,
	onQueryChange,
	onSearch,
	busy = false,
	result = null,
	catalog = [],
	catalogBusy = false,
	onUseOfficial,
	onUseGenerated,
	onUseWebHit,
}) {
	const normalizedQuery = String(query || '')
		.trim()
		.toLowerCase();
	const filteredCatalog = (catalog || []).filter(item => {
		if (!normalizedQuery) return true;
		const hay = `${item.title || ''} ${item.slug || ''} ${item.description || ''}`.toLowerCase();
		return hay.includes(normalizedQuery);
	});
	const popularCatalog = filteredCatalog.filter(item => item.popular);
	const otherCatalog = filteredCatalog.filter(item => !item.popular);

	const renderCatalogCard = match => (
		<article key={match.slug || match.url} className="learning-neu learning-roadmap-search__card">
			<div className="learning-roadmap-search__card-top">
				<p className="learning-roadmap-search__badge">roadmap.sh</p>
				{match.popular ? (
					<span className="learning-roadmap-search__popular">{t.searchRoadmapsPopular}</span>
				) : null}
			</div>
			<h4>{match.title}</h4>
			{match.description ? <p>{match.description}</p> : null}
			<div className="learning-roadmap-search__card-actions">
				<a href={match.url} target="_blank" rel="noreferrer">
					{t.openLink}
					<ExternalLink size={13} />
				</a>
				<button
					type="button"
					className="learning-pill-btn"
					disabled={Boolean(busy)}
					onClick={() => onUseOfficial?.(match)}
				>
					{busy === match.url || busy === match.slug ? (
						<Loader2 size={14} className="animate-spin" />
					) : (
						<Map size={14} />
					)}
					{t.importRoadmapResult}
				</button>
			</div>
		</article>
	);

	return (
		<section className="learning-roadmap-search">
			<div className="learning-neu learning-roadmap-search__hero">
				<p className="learning-roadmap-search__eyebrow">{t.searchRoadmaps}</p>
				<h2>{t.searchRoadmapsTitle}</h2>
				<p>{t.searchRoadmapsHint}</p>
				<form
					className="learning-roadmap-search__form"
					onSubmit={event => {
						event.preventDefault();
						onSearch?.();
					}}
				>
					<input
						value={query}
						onChange={event => onQueryChange?.(event.target.value)}
						placeholder={t.searchRoadmapsPlaceholder}
						disabled={Boolean(busy)}
					/>
					<button type="submit" className="learning-pill-btn" disabled={!query.trim() || Boolean(busy)}>
						{busy === 'search' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
						{busy === 'search' ? t.searchRoadmapsEnhancing : t.searchRoadmapsRun}
					</button>
				</form>
			</div>

			{result?.enhancedQuery || (result?.keywords || []).length ? (
				<div className="learning-roadmap-search__enhance learning-neu-inset">
					<p>
						<span>{t.searchRoadmapsEnhancedLabel}</span>
						<strong>{result.enhancedQuery || result.query}</strong>
					</p>
					{(result.keywords || []).length ? (
						<div className="learning-roadmap-search__keywords">
							{result.keywords.map(keyword => (
								<span key={keyword}>{keyword}</span>
							))}
						</div>
					) : null}
				</div>
			) : null}

			{result?.hint ? (
				<p className="learning-roadmap-search__hint learning-neu-inset">{result.hint}</p>
			) : null}

			{(result?.matches || []).length > 0 ? (
				<div className="learning-roadmap-search__block">
					<h3>{t.searchRoadmapsOfficial}</h3>
					<div className="learning-roadmap-search__grid">
						{result.matches.map(match => renderCatalogCard(match))}
					</div>
				</div>
			) : null}

			{result?.generated?.sections?.length ? (
				<div className="learning-roadmap-search__block">
					<h3>{t.searchRoadmapsGenerated}</h3>
					<article className="learning-neu learning-roadmap-search__card is-generated">
						<p className="learning-roadmap-search__badge is-ai">AI + Web</p>
						<h4>{result.generated.title || result.query}</h4>
						{result.generated.description ? <p>{result.generated.description}</p> : null}
						<ul className="learning-roadmap-search__sections">
							{(result.generated.sections || []).slice(0, 6).map((section, index) => (
								<li key={`${section.title}-${index}`}>
									<strong>{section.title}</strong>
									<span>
										{(section.topics || []).length} {t.topics}
										{section.estimatedMinutes ? ` · ${section.estimatedMinutes}m` : ''}
									</span>
								</li>
							))}
						</ul>
						<button
							type="button"
							className="learning-pill-btn"
							disabled={Boolean(busy)}
							onClick={() => onUseGenerated?.(result.generated)}
						>
							{busy === 'generated' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
							{t.createFromGenerated}
						</button>
					</article>
				</div>
			) : null}

			{(result?.webHits || []).length > 0 ? (
				<div className="learning-roadmap-search__block">
					<h3>{t.searchRoadmapsWeb}</h3>
					<ul className="learning-roadmap-search__web">
						{result.webHits.map(hit => (
							<li key={hit.url}>
								<a href={hit.url} target="_blank" rel="noreferrer">
									{hit.title}
									<ExternalLink size={13} />
								</a>
								{onUseWebHit ? (
									<button type="button" disabled={Boolean(busy)} onClick={() => onUseWebHit(hit)}>
										{busy === hit.url ? <Loader2 size={13} className="animate-spin" /> : null}
										{t.importRoadmapResult}
									</button>
								) : null}
							</li>
						))}
					</ul>
				</div>
			) : null}

			<div className="learning-roadmap-search__block">
				<div className="learning-roadmap-search__block-head">
					<h3>{t.searchRoadmapsCatalog}</h3>
					<p>{t.searchRoadmapsCatalogHint}</p>
				</div>
				{catalogBusy && !catalog.length ? (
					<p className="learning-roadmap-search__empty">
						<Loader2 size={16} className="animate-spin inline-block me-2" />
						{t.searchRoadmapsCatalogLoading}
					</p>
				) : filteredCatalog.length ? (
					<>
						{popularCatalog.length ? (
							<>
								<p className="learning-roadmap-search__subhead">{t.searchRoadmapsPopular}</p>
								<div className="learning-roadmap-search__grid">
									{popularCatalog.map(renderCatalogCard)}
								</div>
							</>
						) : null}
						{otherCatalog.length ? (
							<>
								<p className="learning-roadmap-search__subhead">{t.searchRoadmapsAll}</p>
								<div className="learning-roadmap-search__grid">
									{otherCatalog.map(renderCatalogCard)}
								</div>
							</>
						) : null}
					</>
				) : (
					<p className="learning-roadmap-search__empty">{t.searchRoadmapsCatalogEmpty}</p>
				)}
			</div>

			{result &&
			!(result.matches || []).length &&
			!(result.generated?.sections || []).length &&
			!(result.webHits || []).length ? (
				<p className="learning-roadmap-search__empty">{t.searchRoadmapsEmpty}</p>
			) : null}
		</section>
	);
}

export function LearningLandingSidePaths({ paths = [], t, emptyLabel, onOpen }) {
	if (!paths.length) {
		return (
			<section className="learning-neu learning-side-panel">
				<div className="learning-side-panel__empty">
					<div>
						<span className="learning-side-panel__empty-icon">✦</span>
						{emptyLabel}
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="learning-neu learning-side-panel">
			{paths.map(path => {
				const progress = pathProgress(path);
				return (
					<button
						key={path.id}
						type="button"
						onClick={() => onOpen?.(path)}
						className="learning-side-path text-start"
					>
						<p className="learning-side-path__eyebrow">
							{path.category || 'General'}
						</p>
						<p className="learning-side-path__title">{path.title}</p>
						<p className="learning-side-path__meta">
							{progress.done}/{progress.total} {t.topics} · {progress.percent}%
						</p>
					</button>
				);
			})}
		</section>
	);
}

export function LearningPathCard({
	path,
	t,
	relativeTimeLabel,
	onOpen,
	onContinue,
	onToggleFavorite,
	onDelete,
	onToggleDailyItem,
	onOpenDailyItem,
	today = todayKey(),
}) {
	const progress = pathProgress(path);

	const stop = event => event.stopPropagation();

	return (
		<article
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={event => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onOpen?.();
				}
			}}
			className="group flex h-full min-h-[380px] cursor-pointer flex-col rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-primary-200)] hover:shadow-[0_22px_48px_-24px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
		>
			<div className="flex items-start justify-between gap-3">
				<div
					className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
					style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				>
					<Layers size={20} />
				</div>
				<button
					type="button"
					onClick={event => {
						stop(event);
						onToggleFavorite?.();
					}}
					className={cx(
						'rounded-full p-2 transition',
						path.favorite ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
					)}
					aria-label={t.favorite}
				>
					<Star size={16} fill={path.favorite ? 'currentColor' : 'none'} />
				</button>
			</div>

			<div className="mt-4 text-start">
				<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
					{path.category} · {t[path.difficulty] || path.difficulty}
				</p>
				<h3 className="mt-2 text-lg font-black leading-snug text-slate-900 dark:text-white">{path.title}</h3>
				<p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-slate-500">
					{path.description || path.goal || '—'}
				</p>
			</div>

			<div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-950/60" onClick={stop}>
				<div className="relative shrink-0">
					<ProgressRing value={progress.percent} id={`path-card-${path.id}`} />
					<span className="absolute inset-0 grid place-items-center text-[11px] font-black">
						{progress.percent}%
					</span>
				</div>
				<div className="min-w-0 text-sm">
					<p className="font-semibold text-slate-800 dark:text-slate-100">
						{progress.done} / {progress.total} {t.topics}
					</p>
					<p className="mt-0.5 truncate text-slate-500">
						{t.current}: {progress.current?.title || '—'}
					</p>
					<p className="mt-0.5 text-xs text-slate-400">
						{t.lastActivity}: {relativeTimeLabel}
					</p>
				</div>
			</div>

			<div onClick={stop}>
				<LearningDailyCardPreview
					path={path}
					t={t}
					today={today}
					onToggle={onToggleDailyItem}
					onOpenItem={(pathArg, item) => onOpenDailyItem?.(pathArg, item)}
				/>
			</div>

			{(path.tags || []).length > 0 && (
				<div className="mt-4 flex flex-wrap gap-1.5">
					{path.tags.slice(0, 4).map(tag => (
						<span
							key={tag}
							className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
						>
							#{tag}
						</span>
					))}
				</div>
			)}

			<div className="mt-auto flex items-center gap-2 pt-5" onClick={stop}>
				<button
					type="button"
					onClick={onContinue}
					className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-600)] px-3 py-2.5 text-sm font-bold text-white"
				>
					{t.continue}
					<ChevronRight size={15} />
				</button>
				<button
					type="button"
					onClick={onDelete}
					className="rounded-2xl border border-slate-200 p-2.5 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 dark:border-slate-700"
					aria-label={t.delete}
				>
					<Trash2 size={15} />
				</button>
			</div>
		</article>
	);
}

function LearningQuickCreatePopover({ open, anchorRef, title, onTitleChange, onSubmit, onClose, t }) {
	const panelRef = useRef(null);
	const inputRef = useRef(null);
	const [portalReady, setPortalReady] = useState(false);
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });

	const updatePosition = useCallback(() => {
		const anchor = anchorRef?.current;
		if (!anchor) return;
		const rect = anchor.getBoundingClientRect();
		const width = 320;
		const gap = 10;
		let left = rect.right - width;
		left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
		setCoords({ top: rect.bottom + gap, left, width });
	}, [anchorRef]);

	useEffect(() => setPortalReady(true), []);

	useEffect(() => {
		if (!open) return;
		updatePosition();
		const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
		const onDoc = event => {
			if (panelRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) return;
			onClose();
		};
		document.addEventListener('mousedown', onDoc);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('mousedown', onDoc);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open, onClose, updatePosition, anchorRef]);

	if (!portalReady || !open) return null;

	return createPortal(
		<AnimatePresence>
			<motion.div
				ref={panelRef}
				role="dialog"
				aria-label={t.newPath}
				initial={{ opacity: 0, y: -8, scale: 0.97 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: -6, scale: 0.98 }}
				transition={{ type: 'spring', stiffness: 420, damping: 32 }}
				style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 99999 }}
				className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.5)] dark:border-slate-700 dark:bg-slate-900"
			>
				<div
					className="h-1.5"
					style={{
						background:
							'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))',
					}}
				/>
				<div className="p-4">
					<div className="mb-3 flex items-start justify-between gap-2">
						<div>
							<p className="text-sm font-black text-slate-900 dark:text-white">{t.newPath}</p>
							<p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t.quickCreateHint}</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
							aria-label={t.cancel}
						>
							<X size={14} />
						</button>
					</div>
					<label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
						{t.titleLabel}
						<input
							ref={inputRef}
							value={title}
							onChange={event => onTitleChange(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter') {
									event.preventDefault();
									onSubmit();
								}
								if (event.key === 'Escape') onClose();
							}}
							placeholder={t.quickCreatePlaceholder}
							className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-950"
						/>
					</label>
					<button
						type="button"
						onClick={onSubmit}
						disabled={!title.trim()}
						className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
					>
						{t.startPath}
						<ArrowRight size={15} />
					</button>
				</div>
			</motion.div>
		</AnimatePresence>,
		document.body,
	);
}

export const NewLearningPathButton = forwardRef(function NewLearningPathButton(
	{ t, onSubmit, variant = 'primary', className = '' },
	ref,
) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState('');
	const btnRef = useRef(null);

	useImperativeHandle(ref, () => ({
		open: () => setOpen(true),
		close: () => setOpen(false),
	}));

	const close = () => {
		setOpen(false);
		setTitle('');
	};

	const submit = () => {
		const trimmed = title.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		close();
		btnRef.current?.blur();
	};

	const btnClass =
		variant === 'header'
			? 'learning-pill-btn--light'
			: variant === 'header-light'
				? 'learning-pill-btn learning-pill-btn--light'
				: variant === 'pill'
					? 'learning-pill-btn'
					: 'learning-pill-btn';

	return (
		<div className={cx('relative inline-flex', className)}>
			<button
				ref={btnRef}
				type="button"
				onClick={() => setOpen(current => !current)}
				className={btnClass}
			>
				<Plus size={16} />
				{t.newPath}
			</button>
			<LearningQuickCreatePopover
				open={open}
				anchorRef={btnRef}
				title={title}
				onTitleChange={setTitle}
				onSubmit={submit}
				onClose={close}
				t={t}
			/>
		</div>
	);
});

export function LearningWelcome({ open, t, onClose, onStart }) {
	const steps = [
		{ icon: Map, title: t.welcomeStep1Title, desc: t.welcomeStep1Desc },
		{ icon: Target, title: t.welcomeStep2Title, desc: t.welcomeStep2Desc },
		{ icon: RefreshCw, title: t.welcomeStep3Title, desc: t.welcomeStep3Desc },
		{ icon: Bookmark, title: t.welcomeStep4Title, desc: t.welcomeStep4Desc },
	];

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
				>
					<motion.div
						initial={{ y: 22, opacity: 0, scale: 0.98 }}
						animate={{ y: 0, opacity: 1, scale: 1 }}
						exit={{ y: 12, opacity: 0, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 320, damping: 28 }}
						onClick={event => event.stopPropagation()}
						className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
					>
						<div
							className="absolute inset-x-0 top-0 h-36 opacity-90"
							style={{
								background:
									'linear-gradient(135deg, color-mix(in srgb, var(--color-gradient-from) 88%, white), color-mix(in srgb, var(--color-gradient-to) 80%, white))',
							}}
						/>
						<button
							type="button"
							onClick={onClose}
							className="absolute end-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
							aria-label={t.cancel}
						>
							<X size={16} />
						</button>

						<div className="relative px-6 pb-6 pt-8 sm:px-8">
							<div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
								<GraduationCap size={14} />
								{t.welcomeBadge}
							</div>
							<h2 className="max-w-xl text-2xl font-black leading-tight text-white sm:text-3xl">
								{t.welcomeTitle}
							</h2>
							<p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">{t.welcomeDesc}</p>

							<div className="mt-8 grid gap-3 sm:grid-cols-2">
								{steps.map((step, index) => {
									const Icon = step.icon;
									return (
										<div
											key={step.title}
											className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/90"
										>
											<div className="mb-3 flex items-center gap-2">
												<span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-slate-800 dark:text-[var(--color-primary-300)]">
													<Icon size={15} />
												</span>
												<span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
													{index + 1}
												</span>
											</div>
											<p className="text-sm font-black text-slate-900 dark:text-white">{step.title}</p>
											<p className="mt-1 text-xs leading-relaxed text-slate-500">{step.desc}</p>
										</div>
									);
								})}
							</div>

							<div className="mt-6 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={onStart}
									className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-600)] px-4 py-3 text-sm font-bold text-white sm:flex-none"
								>
									<Plus size={16} />
									{t.startPath}
								</button>
								<button
									type="button"
									onClick={onClose}
									className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
								>
									{t.welcomeSkip}
								</button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export function useLearningWelcome(ready) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!ready) return;
		if (learningWelcomeSeen()) return;
		const timer = window.setTimeout(() => setOpen(true), 420);
		return () => window.clearTimeout(timer);
	}, [ready]);

	const dismiss = () => {
		markLearningWelcomeSeen();
		setOpen(false);
	};

	return { welcomeOpen: open, dismissWelcome: dismiss, openWelcome: () => setOpen(true) };
}

export function LearningHeaderCard({ children, className = '', as: Tag = 'section' }) {
	return (
		<Tag className={cx('learning-header-card', className)}>
			<div className="learning-header-card__grain" aria-hidden />
			<div className="learning-header-card__signature-ring" aria-hidden />
			<div className="learning-header-card__glow-orb" aria-hidden />
			<div className="learning-header-card__content">{children}</div>
		</Tag>
	);
}

export function LearningHeaderStat({ label, value, icon, ring }) {
	return (
		<div className="learning-header-stat">
			<div className="learning-header-stat__icon">
				{ring}
				<div className="learning-header-stat__core">{icon}</div>
			</div>
			<div className="learning-header-stat__text">
				<div className="learning-header-stat__label">{label}</div>
				<div className="learning-header-stat__value">{value}</div>
			</div>
		</div>
	);
}
