'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
	AlertCircle, CalendarDays, Clock, CopyPlus, Dumbbell, Eye, Flame, GripVertical, HeartPulse, Layers, NotebookPen,
	Plus, Tag, Trash2, X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import {
	FIELD_BG, FIELD_SHELL, MINI_LABEL, NUMBER_INPUT, GmListEditor, MiniField, fromListRows, toListRows,
} from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import { useUser } from '@/hooks/useUser';
import { categoryLabel } from '@/lib/exercise-categories';
import { readGmTokens } from '@/utils/gmTokens';
import { ExercisePicker } from './ExercisePicker';

export const WEEK_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const PLAN_BLOCKS = [
	{ id: 'warmup', key: 'warmupExercises', icon: Flame, tone: 'var(--gm-warn)' },
	{ id: 'main', key: 'exercises', icon: Dumbbell, tone: 'var(--color-primary-600)' },
	{ id: 'cardio', key: 'cardioExercises', icon: HeartPulse, tone: 'var(--color-secondary-600)' },
];
const BLOCK_LABEL = { warmup: 'builder.blocks.warmup', main: 'builder.blocks.workout', cardio: 'builder.blocks.cardio' };
const blockKeyOf = id => PLAN_BLOCKS.find(b => b.id === id)?.key || 'exercises';

/* ─────────────────────────── Helpers ─────────────────────────── */
const toSecondsFromValueAndUnit = (value, unit) => {
	const s = String(value ?? '').trim();
	if (!s) return null;
	const n = Number(s);
	if (!Number.isFinite(n) || n <= 0) return null;
	return unit === 'sec' ? Math.trunc(n) : Math.trunc(n) * 60;
};

const fromDurationSeconds = (secs, unit) => {
	const n = Number(secs);
	if (!Number.isFinite(n) || n <= 0) return '';
	return unit === 'sec' ? String(Math.trunc(n)) : String(Math.round(n / 60));
};

const normalizeInt = (v, def) => {
	const n = Number(String(v ?? '').trim());
	return Number.isFinite(n) && n > 0 ? Math.trunc(n) : def;
};
const normalizeTempo = (v, def) => (/^\d+\/\d+\/\d+$/.test(String(v ?? '').trim()) ? String(v).trim() : def);
const normalizeMinutes = v => {
	const n = Number(String(v ?? '').trim());
	return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
};
const numOrNull = v => (v === '' || v == null ? null : Number(v));

export const formatDuration = secs => {
	const n = Number(secs);
	if (!Number.isFinite(n) || n <= 0) return null;
	return n >= 60 ? { value: Math.round(n / 60), unit: 'min' } : { value: Math.round(n), unit: 'sec' };
};

export function buildPayloadFromPlan(sourcePlan, { userId, nameSuffix = ' (copy)', isActive = true } = {}) {
	const srcDays = sourcePlan?.program?.days || sourcePlan?.days || [];
	const strength = list => (list || []).map((ex, idx) => ({
		order: ex.order || ex.orderIndex || idx + 1,
		exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
		targetSets: ex.targetSets ?? 3,
		targetReps: ex.targetReps ?? 12,
		tempo: ex.tempo ?? '1/1/1',
		restSeconds: ex.restSeconds ?? null,
		note: ex.note ?? null,
	}));
	return {
		userId: userId ?? null,
		name: ((sourcePlan?.name || 'Plan') + nameSuffix).trim(),
		isActive,
		notes: sourcePlan?.notes ?? null,
		program: {
			days: srcDays.map((d, i) => ({
				dayOfWeek: String(d.dayOfWeek || d.day || 'saturday').toLowerCase(),
				nameOfWeek: d.nameOfWeek || d.name || `Day #${i + 1}`,
				warmupExercises: strength(d.warmupExercises),
				exercises: strength(d.exercises),
				cardioExercises: (d.cardioExercises || []).map((ex, idx) => ({
					order: ex.order || ex.orderIndex || idx + 1,
					exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
					durationSeconds: ex.durationSeconds ?? null,
					note: ex.note ?? '',
				})),
			})),
		},
	};
}

const mapEditorExercise = (e, j, cardio) => {
	const base = {
		exerciseId: e.exerciseId || e.exercise?.id || e.id,
		name: e.name || e.exercise?.name,
		img: e.img,
		category: e.exercise?.category || e.category || null,
		order: e.order || e.orderIndex || j + 1,
		note: e.note ?? '',
	};
	if (cardio) return { ...base, durationValue: fromDurationSeconds(e.durationSeconds, 'min'), durationUnit: 'min' };
	return {
		...base,
		targetSets: e.targetSets ?? 3,
		targetReps: e.targetReps ?? 12,
		tempo: e.tempo ?? '1/1/1',
		restSeconds: e.restSeconds ?? e.rest ?? null,
	};
};

const serializeStrength = list => (list || []).map(ex => ({
	order: ex.order,
	exerciseId: ex.exerciseId,
	targetSets: numOrNull(ex.targetSets),
	targetReps: numOrNull(ex.targetReps),
	tempo: ex.tempo === '' || ex.tempo == null ? null : String(ex.tempo).trim(),
	restSeconds: numOrNull(ex.restSeconds),
	note: String(ex.note ?? '').trim() || null,
}));

const dayExerciseCount = d => (d.warmupExercises?.length || 0) + (d.exercises?.length || 0) + (d.cardioExercises?.length || 0);

const scrollToEnd = ref => requestAnimationFrame(() => {
	ref?.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
});

/* ─────────────────────────── Small primitives ─────────────────────────── */
function DurationField({ label, groupLabel, value, unit, unitLabels, onChange, onBlur, onUnit, className = '' }) {
	return (
		<label className={`relative flex h-9 min-w-0 items-center gap-1.5 ps-2.5 pe-1 ${FIELD_SHELL} ${className}`} style={FIELD_BG}>
			<span className={MINI_LABEL}>{label}</span>
			<Clock className='size-3.5 shrink-0 gm-faint' />
			<input
				type='number'
				inputMode='numeric'
				dir='ltr'
				value={value ?? ''}
				onChange={e => onChange(e.target.value)}
				onBlur={onBlur}
				className={`w-full min-w-0 bg-transparent font-en text-[12.5px] font-semibold tabular-nums text-(--gm-ink) outline-none ${NUMBER_INPUT}`}
			/>
			<span role='group' aria-label={groupLabel} className='flex shrink-0 gap-0.5 rounded-xl p-0.5' style={{ background: 'color-mix(in srgb, var(--color-primary-100) 55%, transparent)' }}>
				{['min', 'sec'].map(u => {
					const on = unit === u;
					return (
						<button
							key={u}
							type='button'
							aria-pressed={on}
							onClick={e => { e.preventDefault(); onUnit(u); }}
							className={`h-6 min-w-8 rounded-[7px] px-2 text-[10.5px] font-bold transition-all ${on ? 'text-white shadow-[0_3px_8px_color-mix(in_srgb,var(--color-primary-600)_28%,transparent)]' : 'gm-muted hover:text-(--color-primary-700)'}`}
							style={on ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' } : undefined}
						>
							{unitLabels[u]}
						</button>
					);
				})}
			</span>
		</label>
	);
}

export function ImageLightbox({ src, alt = '', onClose, closeLabel }) {
	useEffect(() => {
		if (!src) return undefined;
		const onKey = e => {
			if (e.key !== 'Escape') return;
			e.stopPropagation();
			onClose();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [src, onClose]);

	if (typeof document === 'undefined') return null;
	return createPortal(
		<AnimatePresence>
			{src ? (
				<motion.div
					className='fixed inset-0 z-1200000 grid place-items-center bg-black/75 p-4 backdrop-blur-sm'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.96, y: 8 }}
						animate={{ scale: 1, y: 0 }}
						exit={{ scale: 0.97, y: 6 }}
						className='relative max-h-[88vh] max-w-[92vw]'
						onClick={e => e.stopPropagation()}
					>
						<Img src={src} alt={alt} showBlur={false} className='max-h-[88vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl' />
						<button
							type='button'
							onClick={onClose}
							aria-label={closeLabel}
							className='absolute end-2 top-2 grid size-9 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70'
						>
							<X className='size-4' />
						</button>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
}

/* ─────────────────────────── Sortable row ─────────────────────────── */
const SortableExerciseRow = memo(function SortableExerciseRow({ ex, index, dayId, blockId, onSetField, onRemove, onPreviewImg, t, locale }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.exerciseId });
	const isCardio = blockId === 'cardio';
	const set = patch => onSetField(dayId, blockId, ex.exerciseId, patch);
	const unit = ex.durationUnit ?? 'min';

	const changeUnit = u => {
		if (unit === u) return;
		const secs = toSecondsFromValueAndUnit(ex.durationValue, unit);
		set({ durationUnit: u, durationValue: secs != null ? fromDurationSeconds(secs, u) : '' });
	};

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				borderColor: isDragging ? 'var(--color-primary-300)' : 'var(--gm-line)',
				background: 'color-mix(in srgb, var(--gm-paper) 80%, transparent)',
			}}
			className={`group/row flex flex-wrap items-center gap-x-2.5 gap-y-2.5 rounded-[14px] border py-2 ps-1.5 pe-2 transition-[box-shadow,border-color] lg:flex-nowrap ${isDragging ? 'opacity-50 shadow-lg' : 'hover:border-[color-mix(in_srgb,var(--color-primary-400)_35%,transparent)] hover:shadow-(--gm-shadow-1)'}`}
		>
			<button
				type='button'
				{...attributes}
				{...listeners}
				aria-label={t('builder.dragHandle')}
				title={t('builder.dragHandle')}
				className='grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-xl gm-faint transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] hover:text-(--color-primary-600) active:cursor-grabbing'
			>
				<GripVertical className='size-4' />
			</button>

			<button
				type='button'
				onClick={() => ex.img && onPreviewImg(ex.img)}
				aria-label={t('actions.preview')}
				className='group relative size-10 shrink-0 overflow-hidden rounded-[11px] border border-(--gm-line)'
				style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}
			>
				{ex.img ? (
					<>
						<Img src={ex.img} alt='' showBlur={false} className='h-full w-full object-cover' />
						<span className='absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'>
							<Eye className='size-3.5' />
						</span>
					</>
				) : (
					<span className='grid h-full place-items-center text-(--color-primary-300)'><Dumbbell className='size-4' /></span>
				)}
				<span
					className='absolute start-0 top-0 grid h-4 min-w-4 place-items-center rounded-ee-[7px] px-1 font-en text-[9.5px] font-bold text-white tabular-nums'
					style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				>
					{index + 1}
				</span>
			</button>

			<div className='min-w-0 flex-1 basis-[calc(100%-8rem)] lg:basis-auto'>
				<MultiLangText className='block truncate text-[13px] font-bold leading-tight gm-ink' title={ex.name}>{ex.name}</MultiLangText>
				{ex.category && (
					<span className='mt-1 inline-flex max-w-full items-center gap-1 text-[11px] leading-none gm-muted'>
						<Tag className='size-3 shrink-0' />
						<span className='truncate'>{categoryLabel(ex.category, locale)}</span>
					</span>
				)}
			</div>

			{isCardio ? (
				<div className='order-last grid w-full grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-1.5 lg:order-0 lg:flex lg:w-auto'>
					<DurationField
						className='lg:w-44'
						label={t('builder.duration')}
						groupLabel={t('builder.durationUnit')}
						value={ex.durationValue}
						unit={unit}
						unitLabels={{ min: t('builder.cardio.min'), sec: t('builder.cardio.sec') }}
						onChange={v => set({ durationValue: v })}
						onBlur={() => set({ durationValue: normalizeMinutes(ex.durationValue) })}
						onUnit={changeUnit}
					/>
					<MiniField className='lg:w-[250px] xl:w-[300px]' label={t('builder.cardio.note')} value={ex.note} onChange={v => set({ note: v })} />
				</div>
			) : (
				<div className='order-last grid w-full grid-cols-[repeat(3,minmax(0,1fr))_minmax(6.5rem,1.35fr)] gap-1.5 lg:order-0 lg:flex lg:w-auto'>
					<MiniField
						numeric
						className='lg:w-[58px]'
						type='number'
						inputMode='numeric'
						label={t('preview.sets')}
						value={ex.targetSets}
						onChange={v => set({ targetSets: v })}
						onBlur={() => String(ex.targetSets ?? '').trim() && set({ targetSets: normalizeInt(ex.targetSets, 3) })}
					/>
					<MiniField
						numeric
						className='lg:w-[58px]'
						inputMode='numeric'
						label={t('preview.reps')}
						value={ex.targetReps}
						onChange={v => set({ targetReps: v })}
						onBlur={() => String(ex.targetReps ?? '').trim() && set({ targetReps: normalizeInt(ex.targetReps, 12) })}
					/>
					<MiniField
						numeric
						className='lg:w-[70px]'
						label={t('preview.tempo')}
						value={ex.tempo}
						onChange={v => set({ tempo: v })}
						onBlur={() => String(ex.tempo ?? '').trim() && set({ tempo: normalizeTempo(ex.tempo, '1/1/1') })}
					/>
					<MiniField
						numeric
						className='min-w-26 lg:w-[104px]'
						type='number'
						inputMode='numeric'
						label={t('builder.restTime')}
						value={ex.restSeconds}
						onChange={v => set({ restSeconds: v })}
						onBlur={() => String(ex.restSeconds ?? '').trim() && set({ restSeconds: normalizeInt(ex.restSeconds, 90) })}
						suffix={t('builder.secondsShort')}
					/>
					<MiniField
						className='col-span-4 lg:w-[170px] xl:w-[220px]'
						label={t('builder.exerciseNote')}
						value={ex.note}
						onChange={v => set({ note: v })}
					/>
				</div>
			)}

			<button
				type='button'
				onClick={() => onRemove(dayId, blockId, ex.exerciseId)}
				aria-label={t('actions.delete')}
				title={t('actions.delete')}
				className='grid size-8 shrink-0 place-items-center rounded-[9px] gm-faint transition-colors hover:bg-[color-mix(in_srgb,var(--gm-danger)_10%,transparent)] hover:text-(--gm-danger) focus-visible:text-(--gm-danger)'
			>
				<Trash2 className='size-4' />
			</button>
		</div>
	);
});

/* ─────────────────────────── Exercise block ─────────────────────────── */
const ExerciseBlock = memo(function ExerciseBlock({ dayId, block, list, onSetField, onRemove, onReorder, onAdd, onPreviewImg, t, locale }) {
	const rootRef = useRef(null);
	const [active, setActive] = useState(null);
	const [tokens, setTokens] = useState({});
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);
	const ids = useMemo(() => list.map(x => x.exerciseId), [list]);
	const Icon = block.icon;

	const onDragEnd = ({ active: a, over }) => {
		setActive(null);
		if (!a?.id || !over?.id || a.id === over.id) return;
		const from = ids.indexOf(a.id);
		const to = ids.indexOf(over.id);
		if (from < 0 || to < 0) return;
		onReorder(dayId, block.id, arrayMove(list, from, to));
	};

	return (
		<div ref={rootRef}>
			<div className='mb-2.5 flex items-center gap-2'>
				<span
					className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold'
					style={{ color: block.tone, background: `color-mix(in srgb, ${block.tone} 12%, transparent)` }}
				>
					<Icon className='size-3.5' />
					{t(BLOCK_LABEL[block.id])}
				</span>
				<span className='font-en text-[11px] font-semibold tabular-nums gm-faint'>{list.length}</span>
				<span aria-hidden className='h-px flex-1 bg-(--gm-line)' />
				<button
					type='button'
					onClick={() => onAdd(dayId, block.id)}
					className='inline-flex h-7 items-center gap-1 rounded-xl px-2 text-[11.5px] font-semibold transition-colors hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]'
					style={{ color: block.tone }}
				>
					<Plus className='size-3.5' />
					{t('builder.addMore')}
				</button>
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={({ active: a }) => {
					setTokens(readGmTokens(rootRef.current));
					setActive(list.find(x => x.exerciseId === a?.id) || null);
				}}
				onDragCancel={() => setActive(null)}
				onDragEnd={onDragEnd}
			>
				<SortableContext items={ids} strategy={verticalListSortingStrategy}>
					<div className='space-y-1.5'>
						{list.map((ex, i) => (
							<SortableExerciseRow
								key={ex.exerciseId}
								ex={ex}
								index={i}
								dayId={dayId}
								blockId={block.id}
								onSetField={onSetField}
								onRemove={onRemove}
								onPreviewImg={onPreviewImg}
								t={t}
								locale={locale}
							/>
						))}
					</div>
				</SortableContext>
				{typeof document !== 'undefined' && createPortal(
					<DragOverlay zIndex={1200000} modifiers={[snapCenterToCursor]} dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
						{active ? (
							<div
								className='pointer-events-none flex w-max max-w-[min(420px,88vw)] items-center gap-2 rounded-[12px] border px-3 py-2 shadow-xl'
								style={{ ...tokens, borderColor: 'var(--color-primary-300)', background: 'var(--gm-paper, #fff)', color: 'var(--gm-ink, #0b214d)' }}
							>
								<GripVertical className='size-4 shrink-0 text-(--color-primary-500)' />
								<MultiLangText className='truncate text-[13px] font-bold'>{active.name}</MultiLangText>
							</div>
						) : null}
					</DragOverlay>,
					document.body,
				)}
			</DndContext>
		</div>
	);
});

/* ─────────────────────────── Day card ─────────────────────────── */
const DayCard = memo(function DayCard({
	day, index, dayOptions, duplicate, missingExercises, canDuplicate,
	onDayOfWeek, onDuplicateDay, onRemoveDay, onAdd, onSetField, onRemove, onReorder, onPreviewImg, t, locale,
}) {
	const total = dayExerciseCount(day);
	const filled = PLAN_BLOCKS.filter(b => day[b.key]?.length);
	const empty = PLAN_BLOCKS.filter(b => !day[b.key]?.length);
	const hasError = duplicate || missingExercises;

	return (
		<motion.section
			layout='position'
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.14 } }}
			transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
			className='rounded-2xl border'
			style={{
				borderColor: hasError ? 'color-mix(in srgb, var(--gm-danger) 40%, transparent)' : 'var(--gm-line)',
				background: 'color-mix(in srgb, var(--gm-paper) 52%, transparent)',
			}}
		>
			<header className='flex flex-wrap items-center gap-2.5 border-b border-(--gm-line) px-3.5 py-3 sm:px-4'>
				<span
					className='grid size-8 shrink-0 place-items-center rounded-[10px] font-en text-[12px] font-bold text-white tabular-nums'
					style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				>
					{index + 1}
				</span>
				<FloatingSelect
					className='w-[min(100%,190px)]'
					label={t('builder.dayLabel')}
					options={dayOptions}
					value={day.dayOfWeek}
					onChange={v => onDayOfWeek(day.id, v)}
					error={duplicate ? t('builder.validation.duplicateDay') : undefined}
					icon={<CalendarDays className='size-4' />}
				/>
				<span className='gm-plan__chip font-en tabular-nums'>
					<Dumbbell className='size-3' />
					{total}
				</span>
				<div className='ms-auto flex items-center gap-1.5'>
					<button
						type='button'
						onClick={() => onDuplicateDay(day.id)}
						disabled={!canDuplicate}
						title={t('actions.duplicateDay')}
						className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50'
					>
						<CopyPlus className='size-3.5' />
						<span className='hidden sm:inline'>{t('actions.duplicateDay')}</span>
					</button>
					<button
						type='button'
						onClick={() => onRemoveDay(day.id)}
						aria-label={t('actions.removeDay')}
						title={t('actions.removeDay')}
						className='grid size-9 place-items-center rounded-[10px] border border-[color-mix(in_srgb,var(--gm-danger)_28%,transparent)] text-(--gm-danger) transition-colors hover:bg-[color-mix(in_srgb,var(--gm-danger)_10%,transparent)]'
					>
						<Trash2 className='size-4' />
					</button>
				</div>
			</header>

			<div className='space-y-5 p-3.5 sm:p-4'>
				{filled.map(block => (
					<ExerciseBlock
						key={block.id}
						dayId={day.id}
						block={block}
						list={day[block.key]}
						onSetField={onSetField}
						onRemove={onRemove}
						onReorder={onReorder}
						onAdd={onAdd}
						onPreviewImg={onPreviewImg}
						t={t}
						locale={locale}
					/>
				))}

				{!filled.length && (
					<div className='flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-(--gm-line) px-4 py-6 text-center'>
						<span className='gm-plan__icon size-9! rounded-[11px]!'><Layers className='size-4' /></span>
						<p className='text-[12.5px] font-semibold gm-ink-soft'>{t('builder.noExercisesHint')}</p>
						<p className='text-[11.5px] gm-faint'>{t('builder.pickBlockHint')}</p>
					</div>
				)}

				{empty.length > 0 && (
					<div className='flex flex-wrap gap-2'>
						{empty.map(block => {
							const Icon = block.icon;
							return (
								<button
									key={block.id}
									type='button'
									onClick={() => onAdd(day.id, block.id)}
									className='inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-dashed px-3 text-[12px] font-semibold transition-colors hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]'
									style={{ color: block.tone, borderColor: `color-mix(in srgb, ${block.tone} 40%, transparent)` }}
								>
									<Plus className='size-3.5' />
									<Icon className='size-3.5' />
									{t(BLOCK_LABEL[block.id])}
								</button>
							);
						})}
					</div>
				)}

				{missingExercises && (
					<p className='flex items-center gap-1.5 text-[12px] font-medium text-(--gm-danger)'>
						<AlertCircle className='size-3.5' />
						{t('builder.validation.needExercisePerDay')}
					</p>
				)}
			</div>
		</motion.section>
	);
});

/* ─────────────────────────── Builder ─────────────────────────── */
export function PlanBuilder({ scrollRef, initial, onSubmit, onCancel }) {
	const t = useTranslations('workoutPlans');
	const locale = useLocale();
	const user = useUser();

	const makeDay = useCallback((num, taken = []) => ({
		id: `day_${Date.now()}_${num}`,
		dayOfWeek: WEEK_DAYS.find(d => !taken.includes(d)) || 'saturday',
		nameOfWeek: t('builder.dayNumber', { num }),
		warmupExercises: [],
		exercises: [],
		cardioExercises: [],
	}), [t]);

	const [name, setName] = useState(initial?.name || '');
	const [notes, setNotes] = useState(() => toListRows(initial?.notes));
	const [days, setDays] = useState(() => {
		const src = initial?.days || initial?.program?.days || [];
		const mapped = src.map((x, i) => ({
			id: x.id || `day_${i}`,
			dayOfWeek: (x.day || x.dayOfWeek || '').toLowerCase() || 'saturday',
			nameOfWeek: x.nameOfWeek || x.name || t('builder.dayNumber', { num: i + 1 }),
			warmupExercises: (x.warmupExercises || []).map((e, j) => mapEditorExercise(e, j, false)),
			exercises: (x.exercises || []).map((e, j) => mapEditorExercise(e, j, false)),
			cardioExercises: (x.cardioExercises || []).map((e, j) => mapEditorExercise(e, j, true)),
		}));
		return mapped.length ? mapped : [makeDay(1)];
	});
	const [picker, setPicker] = useState(null);
	const [previewImg, setPreviewImg] = useState(null);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

	const dayOptions = useMemo(() => WEEK_DAYS.map(id => ({ id, label: t(`days.${id}`) })), [t]);
	const duplicates = useMemo(() => {
		const seen = new Map();
		for (const d of days) seen.set(d.dayOfWeek, (seen.get(d.dayOfWeek) || 0) + 1);
		return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
	}, [days]);
	const totalExercises = useMemo(() => days.reduce((sum, d) => sum + dayExerciseCount(d), 0), [days]);
	const canAddDay = days.length < WEEK_DAYS.length;
	const listLabels = useMemo(() => ({ add: t('builder.addNote'), remove: t('builder.removeNote'), empty: t('builder.emptyNotes') }), [t]);

	const onNotesField = useCallback((_, updater) => setNotes(prev => (typeof updater === 'function' ? updater(prev) : updater)), []);

	const patchDay = useCallback((dayId, fn) => setDays(arr => arr.map(d => (d.id === dayId ? fn(d) : d))), []);

	const addDay = useCallback(() => {
		setDays(arr => (arr.length >= WEEK_DAYS.length ? arr : [...arr, makeDay(arr.length + 1, arr.map(d => d.dayOfWeek))]));
		setErrors(e => ({ ...e, days: undefined }));
		scrollToEnd(scrollRef);
	}, [makeDay, scrollRef]);

	const onDuplicateDay = useCallback(id => {
		setDays(arr => {
			const index = arr.findIndex(d => d.id === id);
			if (index === -1 || arr.length >= WEEK_DAYS.length) return arr;
			const source = arr[index];
			const copy = list => (list || []).map((ex, i) => ({ ...ex, order: i + 1 }));
			const next = [...arr];
			next.splice(index + 1, 0, {
				...source,
				id: `day_${Date.now()}_${index + 1}`,
				dayOfWeek: WEEK_DAYS.find(d => !arr.some(x => x.dayOfWeek === d)) || source.dayOfWeek,
				nameOfWeek: `${source.nameOfWeek} ${t('copySuffix')}`,
				warmupExercises: copy(source.warmupExercises),
				exercises: copy(source.exercises),
				cardioExercises: copy(source.cardioExercises),
			});
			return next;
		});
	}, [t]);

	const onRemoveDay = useCallback(id => setDays(arr => arr.filter(d => d.id !== id)), []);
	const onDayOfWeek = useCallback((id, value) => patchDay(id, d => ({ ...d, dayOfWeek: value })), [patchDay]);

	const onSetField = useCallback((dayId, blockId, exerciseId, patch) => {
		const key = blockKeyOf(blockId);
		patchDay(dayId, d => ({ ...d, [key]: d[key].map(e => (e.exerciseId === exerciseId ? { ...e, ...patch } : e)) }));
	}, [patchDay]);

	const onRemoveExercise = useCallback((dayId, blockId, exerciseId) => {
		const key = blockKeyOf(blockId);
		patchDay(dayId, d => ({ ...d, [key]: d[key].filter(e => e.exerciseId !== exerciseId).map((e, i) => ({ ...e, order: i + 1 })) }));
	}, [patchDay]);

	const onReorder = useCallback((dayId, blockId, list) => {
		const key = blockKeyOf(blockId);
		patchDay(dayId, d => ({ ...d, [key]: list.map((e, i) => ({ ...e, order: i + 1 })) }));
	}, [patchDay]);

	const openPicker = useCallback((dayId, block) => setPicker({ dayId, block }), []);
	const closePicker = useCallback(() => setPicker(null), []);
	const closePreview = useCallback(() => setPreviewImg(null), []);

	const pickerInitialSelected = useMemo(() => {
		if (!picker) return [];
		const day = days.find(d => d.id === picker.dayId);
		return (day?.[blockKeyOf(picker.block)] || []).map(ex => ({ id: ex.exerciseId, name: ex.name, category: ex.category || null, img: ex.img }));
	}, [picker, days]);

	const onPickerDone = useCallback(picked => {
		if (!picker) return;
		const { dayId, block } = picker;
		const key = blockKeyOf(block);
		patchDay(dayId, day => {
			const current = day[key] || [];
			const pickedIds = new Set(picked.map(x => x.id));
			const existing = new Set(current.map(ex => ex.exerciseId));
			const kept = current.filter(ex => pickedIds.has(ex.exerciseId));
			const added = picked.filter(x => !existing.has(x.id)).map(x => (block === 'cardio'
				? { exerciseId: x.id, name: x.name, category: x.category || null, img: x.img, durationValue: '', durationUnit: 'min', note: '' }
				: { exerciseId: x.id, name: x.name, category: x.category || null, img: x.img, targetSets: 3, targetReps: 12, tempo: '1/1/1', restSeconds: null, note: '' }));
			return { ...day, [key]: [...kept, ...added].map((ex, i) => ({ ...ex, order: i + 1 })) };
		});
		setPicker(null);
	}, [picker, patchDay]);

	const submit = async () => {
		const next = {};
		if (!name.trim()) next.name = t('builder.validation.nameRequired');
		if (!days.length) next.days = t('builder.validation.needDay');
		const missing = new Set(days.filter(d => !dayExerciseCount(d)).map(d => d.id));
		if (missing.size) next.missing = missing;
		if (duplicates.size) next.duplicate = true;
		setErrors(next);
		if (next.name || next.days || next.missing || next.duplicate) {
			const msg = next.name || next.days || (next.duplicate ? t('notifications.duplicateDay') : t('builder.validation.needExercisePerDay'));
			Notification(msg, 'error');
			return;
		}

		const payload = {
			userId: user?.role == 'admin' ? user?.id : user?.adminId,
			name: name.trim(),
			isActive: true,
			notes: fromListRows(notes),
			program: {
				days: days.map(d => ({
					dayOfWeek: d.dayOfWeek,
					nameOfWeek: d.nameOfWeek,
					warmupExercises: serializeStrength(d.warmupExercises),
					exercises: serializeStrength(d.exercises),
					cardioExercises: (d.cardioExercises || []).map(ex => ({
						order: ex.order,
						exerciseId: ex.exerciseId,
						durationSeconds: toSecondsFromValueAndUnit(ex.durationValue, ex.durationUnit ?? 'min'),
						note: String(ex.note ?? '').trim() || null,
					})),
				})),
			},
		};
		setSaving(true);
		try {
			await onSubmit?.(payload);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className='space-y-4'>
			<FloatingInput
				required
				label={t('builder.nameLabel')}
				value={name}
				onChange={v => { setName(v); if (errors.name) setErrors(e => ({ ...e, name: undefined })); }}
				error={errors.name}
				icon={<NotebookPen className='size-4' />}
			/>

			<GmListEditor
				field='notes'
				rows={notes}
				onField={onNotesField}
				icon={NotebookPen}
				title={t('builder.notesTitle')}
				placeholder={t('builder.notePlaceholder')}
				labels={listLabels}
			/>

			<div className='flex flex-wrap items-center justify-between gap-2 pt-1'>
				<p className='flex items-center gap-2 text-[13px] font-bold gm-ink'>
					<span className='gm-plan__icon size-7! rounded-[9px]!'><CalendarDays className='size-3.5' /></span>
					{t('builder.daysSectionTitle')}
					<span className='gm-plan__chip font-en tabular-nums'>{days.length}/{WEEK_DAYS.length}</span>
				</p>
				<button
					type='button'
					onClick={addDay}
					disabled={!canAddDay}
					className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50'
				>
					<Plus className='size-3.5' />
					{t('actions.addDay')}
				</button>
			</div>

			<div className='space-y-3'>
				<AnimatePresence initial={false}>
					{days.map((d, i) => (
						<DayCard
							key={d.id}
							day={d}
							index={i}
							dayOptions={dayOptions}
							duplicate={duplicates.has(d.dayOfWeek)}
							missingExercises={Boolean(errors.missing?.has(d.id)) && !dayExerciseCount(d)}
							canDuplicate={canAddDay}
							onDayOfWeek={onDayOfWeek}
							onDuplicateDay={onDuplicateDay}
							onRemoveDay={onRemoveDay}
							onAdd={openPicker}
							onSetField={onSetField}
							onRemove={onRemoveExercise}
							onReorder={onReorder}
							onPreviewImg={setPreviewImg}
							t={t}
							locale={locale}
						/>
					))}
				</AnimatePresence>

				{!days.length && (
					<p className='flex items-center gap-1.5 text-[12px] font-medium text-(--gm-danger)'>
						<AlertCircle className='size-3.5' />
						{t('builder.validation.needDay')}
					</p>
				)}

				{canAddDay && (
					<button
						type='button'
						onClick={addDay}
						className='flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-(--gm-line) py-4 text-[13px] font-semibold gm-muted transition-colors hover:border-(--color-primary-300) hover:text-(--color-primary-600)'
					>
						<Plus className='size-4' />
						{t('actions.addDay')}
					</button>
				)}
			</div>

			<div className='sticky bottom-2 z-10 mt-2 flex justify-center px-0.5 pb-1'>
				<div
					role='region'
					aria-label={t('builder.savePlanBtn')}
					className='gm-float flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-3.5 py-2.5'
				>
					<div className='flex min-w-0 flex-wrap items-center gap-1.5'>
						<span className='gm-plan__chip font-en tabular-nums'><CalendarDays className='size-3' />{days.length} {t('builder.daysShort')}</span>
						<span className='gm-plan__chip font-en tabular-nums'><Dumbbell className='size-3' />{totalExercises} {t('preview.exercises')}</span>
					</div>
					<div className='flex w-full flex-wrap items-center gap-2 sm:w-auto'>
						{onCancel && (
							<button type='button' onClick={onCancel} disabled={saving} className='gm-btn-ghost gm-btn-compact inline-flex flex-1 items-center justify-center disabled:opacity-60 sm:flex-none'>
								{t('actions.cancel')}
							</button>
						)}
						<button
							type='button'
							onClick={submit}
							disabled={saving}
							className='gm-btn-primary gm-btn-compact inline-flex flex-1 items-center justify-center gap-1.5 disabled:opacity-70 sm:flex-none'
						>
							{saving ? <span className='size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white' /> : null}
							{t('builder.savePlanBtn')}
						</button>
					</div>
				</div>
			</div>

			<ExercisePicker
				open={!!picker}
				dayId={picker?.dayId}
				initialSelected={pickerInitialSelected}
				onClose={closePicker}
				onDone={onPickerDone}
			/>
			<ImageLightbox src={previewImg} onClose={closePreview} closeLabel={t('actions.close')} />
		</div>
	);
}
