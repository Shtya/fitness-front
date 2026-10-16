'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Controller, useController, useFieldArray, useForm, useFormState, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
	AlertCircle, AlertTriangle, Beef, CalendarCheck, CalendarCog, CalendarDays, ChefHat, ChevronDown, Clock, Copy, Droplets, FileText, Flame,
	Layers, Leaf, Link2, NotebookPen, Pill, Plus, Replace, Search, Sparkles, Undo2, UtensilsCrossed, Wheat, X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import Badge from '@/components/atoms/GmBadge';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { EmptyBlock, ErrorBox, RowSkeleton } from '@/components/atoms/GmStates';
import { ConfirmRemove, DragHandle, ICON_BTN, RemoveButton, SortableList, useSortableRow } from '@/components/atoms/GmSortable';
import {
	FIELD_BG, FIELD_ERROR, FIELD_SHELL, MINI_LABEL, GmTextarea, MiniField, fromListRows, makeListRow, toListRows,
} from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import useDebounced from '@/hooks/useDebounced';
import FoodNameField from '@/components/pages/dashboard/foods/FoodNameField';
import { QuickFoodPanel } from '@/components/pages/dashboard/foods/FoodForm';
import { defaultUnitFor, foodName, foodRef, itemNutrition, nutritionFor, sumNutrition, unitsForFood } from '@/lib/food-nutrition';
import {
	DAY_KEYS, UNITS, aiMealsToForm, blankAlternative, blankItem, blankMeal, blankSupplement, buildAiPrompt, buildPlanSchema,
	cloneMeals, formToPayload, getErr, kcalOutliers, mealKcal, mealsKcal, parseAiPlan, planToFormValues, toDecimalInput, weekKcal,
} from './mealPlanModel';
import './meal-plan-form.css';

const GRADIENT = { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' };
const fmtNum = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const arrayError = (errors, path) => getErr(errors, `${path}.root`) || getErr(errors, path);

/* ─────────────────────────── Small controls ─────────────────────────── */
function TimeField({ label, value, onChange, onBlur, error, className = '' }) {
	return (
		<label className={`relative flex h-9 min-w-0 items-center gap-1.5 px-2.5 ${FIELD_SHELL} ${error ? FIELD_ERROR : ''} ${className}`} style={FIELD_BG}>
			<span className={`${MINI_LABEL} ${error ? 'text-rose-500!' : ''}`}>{label}</span>
			<Clock className='size-3.5 shrink-0 gm-faint' />
			<input
				type='time'
				dir='ltr'
				value={value || ''}
				aria-invalid={error || undefined}
				onChange={e => onChange(e.target.value)}
				onBlur={onBlur}
				className='w-full min-w-0 bg-transparent font-en text-[12.5px] font-semibold tabular-nums text-(--gm-ink) outline-none [&::-webkit-calendar-picker-indicator]:opacity-60'
			/>
		</label>
	);
}

function QtyUnitControl({ control, path, t, className = '' }) {
	const qty = useController({ control, name: `${path}.quantity` });
	const unit = useController({ control, name: `${path}.unit` });
	const food = useWatch({ control, name: `${path}.food` });
	const current = unit.field.value || 'g';
	const error = Boolean(qty.fieldState.error);
	const units = unitsForFood(food) || UNITS;

	return (
		<div className={`relative flex h-9 min-w-0 items-center gap-1 ps-2.5 pe-1 ${FIELD_SHELL} ${error ? FIELD_ERROR : ''} ${className}`} style={FIELD_BG}>
			<span className={`${MINI_LABEL} ${error ? 'text-rose-500!' : ''}`}>{t('form.qty')}</span>
			<input
				inputMode='decimal'
				dir='ltr'
				aria-label={t('form.qty')}
				value={qty.field.value ?? ''}
				onChange={e => qty.field.onChange(toDecimalInput(e.target.value))}
				onBlur={qty.field.onBlur}
				className='w-full min-w-8 bg-transparent font-en text-[12.5px] font-semibold tabular-nums text-(--gm-ink) outline-none'
			/>
			<span role='group' aria-label={t('form.unit')} className='gm-mp-units flex shrink-0 gap-0.5 rounded-xl p-0.5'>
				{units.map(u => {
					const on = current === u;
					return (
						<button
							key={u}
							type='button'
							aria-pressed={on}
							onClick={() => unit.field.onChange(u)}
							className={`h-6 rounded-[6px] px-1 text-[10.5px] font-bold transition-colors sm:px-1.5 ${on ? 'bg-(--gm-paper) text-(--color-primary-700) shadow-sm' : 'gm-muted hover:text-(--color-primary-600)'}`}
						>
							{t(`unit.${u}`)}
						</button>
					);
				})}
			</span>
		</div>
	);
}

function KcalControl({ control, path, t, className = '' }) {
	const { field, fieldState } = useController({ control, name: `${path}.calories` });
	const food = useWatch({ control, name: `${path}.food` });
	if (food) {
		return (
			<div
				className={`gm-mp-linked relative flex h-9 min-w-0 items-center gap-1.5 px-2.5 ${FIELD_SHELL} ${className}`}
				title={t('form.kcal_auto_hint')}
			>
				<span className={MINI_LABEL}>{t('form.calories')}</span>
				<Link2 className='size-3 shrink-0 text-(--color-primary-500)' aria-hidden />
				<span className='w-full min-w-0 truncate font-en text-[12.5px] font-bold tabular-nums text-(--color-primary-700)' dir='ltr'>{fmtNum(field.value)}</span>
				<span className='shrink-0 text-[10.5px] font-semibold gm-faint'>{t('form.kcal_short')}</span>
			</div>
		);
	}
	return (
		<MiniField
			numeric
			inputMode='decimal'
			className={className}
			label={t('form.calories')}
			suffix={t('form.kcal_short')}
			value={field.value === 0 ? '' : field.value}
			onChange={v => field.onChange(toDecimalInput(v))}
			onBlur={field.onBlur}
			error={Boolean(fieldState.error)}
		/>
	);
}

function FieldErrors({ control, paths }) {
	const { errors } = useFormState({ control, name: paths });
	const messages = [...new Set(paths.map(p => getErr(errors, p)).filter(Boolean))];
	if (!messages.length) return null;
	return (
		<p className='mt-1.5 flex items-center gap-1.5 ps-8 text-[11.5px] font-medium text-(--gm-danger)'>
			<AlertCircle className='size-3.5 shrink-0' />
			{messages.join(' · ')}
		</p>
	);
}

/* ─────────────────────────── Rows ─────────────────────────── */
const DIRTY = { shouldDirty: true };

/**
 * Item name with catalog search. Picking a food links the item (calories become automatic);
 * typing over a linked name unlinks it so a renamed item never keeps another food's macros.
 */
function ItemNameField({ control, path, setValue, onCreateFood, t, className }) {
	const locale = useLocale();
	const { field, fieldState } = useController({ control, name: `${path}.name` });
	const type = useWatch({ control, name: `${path}.type` });
	const food = useWatch({ control, name: `${path}.food` });
	const quantity = useWatch({ control, name: `${path}.quantity` });
	const unit = useWatch({ control, name: `${path}.unit` });

	if (type === 'recipe') {
		return <MiniField className={className} label={t('form.item_name')} value={field.value} error={Boolean(fieldState.error)} onChange={field.onChange} onBlur={field.onBlur} />;
	}

	const unlink = () => {
		for (const key of ['food', 'nutrition', 'id', 'sourceId']) setValue(`${path}.${key}`, null, DIRTY);
	};

	const link = picked => {
		const ref = foodRef(picked);
		const nextUnit = defaultUnitFor(ref);
		const keepQty = nextUnit === unit && Number(quantity) > 0;
		const nextQty = keepQty ? quantity : nextUnit === 'count' ? 1 : 100;
		const n = nutritionFor(ref, nextQty, nextUnit);
		setValue(`${path}.name`, foodName(ref, locale), { ...DIRTY, shouldValidate: true });
		setValue(`${path}.type`, 'food', DIRTY);
		setValue(`${path}.id`, ref.id, DIRTY);
		setValue(`${path}.sourceId`, ref.id, DIRTY);
		setValue(`${path}.food`, ref, DIRTY);
		setValue(`${path}.nutrition`, null, DIRTY);
		setValue(`${path}.unit`, nextUnit, DIRTY);
		setValue(`${path}.quantity`, nextQty, DIRTY);
		setValue(`${path}.calories`, n?.kcal ?? 0, { ...DIRTY, shouldValidate: true });
	};

	return (
		<FoodNameField
			className={className}
			label={t('form.item_name')}
			value={field.value}
			error={Boolean(fieldState.error)}
			linked={Boolean(food)}
			onChange={v => {
				field.onChange(v);
				if (food) unlink();
				else if (String(v).trim().toLowerCase().includes('egg')) setValue(`${path}.unit`, 'count', DIRTY);
			}}
			onBlur={field.onBlur}
			onPick={link}
			onCreate={name => onCreateFood({ name, link })}
			onUnlink={unlink}
		/>
	);
}

const MACRO_CHIPS = [
	{ key: 'protein', Icon: Beef, color: 'var(--color-primary-500)' },
	{ key: 'carbs', Icon: Wheat, color: 'var(--gm-warn)' },
	{ key: 'fat', Icon: Droplets, color: 'var(--color-secondary-500)' },
	{ key: 'fiber', Icon: Leaf, color: 'var(--gm-ok)' },
	{ key: 'sugar', Icon: Sparkles, color: '#ec4899' },
];

function MacroChips({ n, compact = false }) {
	const tf = useTranslations('foods');
	return (
		<span className='inline-flex flex-wrap items-center gap-x-2.5 gap-y-1' dir='ltr'>
			{MACRO_CHIPS.map(({ key, Icon, color }) => (
				<span key={key} className='inline-flex items-center gap-1 font-en text-[11px] font-semibold tabular-nums gm-ink-soft' title={tf(`macros.${key}`)}>
					<Icon className='size-3' style={{ color }} />
					{compact ? null : <span className='font-normal gm-muted'>{tf(`macros.${key}`)}</span>}
					{n[key] == null ? '—' : `${n[key]}g`}
				</span>
			))}
		</span>
	);
}

/** Keeps calories in sync with a linked food and shows the item's macros. */
function ItemNutritionLine({ control, path, setValue, t, className = '' }) {
	const item = useWatch({ control, name: path });
	const food = item?.food;
	const key = food ? `${food.id}|${item?.quantity ?? ''}|${item?.unit ?? ''}` : '';
	const lastKey = useRef(key);

	useEffect(() => {
		if (lastKey.current === key) return;
		lastKey.current = key;
		if (!food) return;
		const n = nutritionFor(food, item?.quantity, item?.unit);
		const kcal = n?.kcal ?? 0;
		if (Number(item?.calories) !== kcal) setValue(`${path}.calories`, kcal, { ...DIRTY, shouldValidate: true });
	}, [key, food, item?.quantity, item?.unit, item?.calories, path, setValue]);

	const n = itemNutrition(item);
	if (!n) {
		if (food && item?.unit === 'count' && !food.pieceGrams) {
			return <p className={`text-[11px] font-medium text-amber-600 ${className}`}>{t('form.piece_unknown')}</p>;
		}
		return null;
	}
	return (
		<p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] ${className}`}>
			<span className='inline-flex items-center gap-1 font-semibold text-(--color-primary-600)'>
				<Link2 className='size-3' />
				<span className='font-en tabular-nums' dir='ltr'>{n.grams}g</span>
			</span>
			<MacroChips n={n} />
		</p>
	);
}

/*
 * Shared column templates: on wide screens every item / alternative / supplement row lines up
 * under one header row per meal. Item and supplement middles add up to the same width.
 */
const ITEM_COLS = 'lg:grid-cols-[1.5rem_minmax(0,1fr)_13.25rem_7rem_4.25rem]';
const SUPP_COLS = 'lg:grid-cols-[1.5rem_minmax(0,1fr)_9rem_11.25rem_4.25rem]';

function ColumnHeads({ cols, labels }) {
	return (
		<div aria-hidden className={`hidden gap-2 px-3 pb-1.5 pt-2.5 text-[11px] font-semibold gm-muted lg:grid ${cols}`}>
			<span />
			{labels.map((label, i) => (
				<span key={i} className='truncate'>{label}</span>
			))}
			<span />
		</div>
	);
}

const ItemRow = memo(function ItemRow({ id, control, path, index, onRemove, setValue, t }) {
	const row = useSortableRow(id);
	const type = useWatch({ control, name: `${path}.type` });
	const alts = useFieldArray({ control, name: `${path}.alternatives` });
	const [creating, setCreating] = useState(null);
	const closeCreate = useCallback(() => setCreating(null), []);

	return (
		<div ref={row.ref} style={row.style} className={`gm-mp-row px-2 py-2.5 sm:px-3 ${row.isDragging ? 'is-dragging' : ''}`}>
			<div className={`gm-mp-grid flex flex-wrap items-center gap-2 lg:grid lg:items-center ${ITEM_COLS}`}>
				<DragHandle handle={row.handle} label={t('builder.drag_handle')} />
				<ItemNameField
					control={control}
					path={path}
					setValue={setValue}
					onCreateFood={setCreating}
					t={t}
					className='min-w-0 flex-1 basis-0 lg:basis-auto'
				/>
				<div className='order-last grid w-full grid-cols-[minmax(0,1fr)_6.25rem] gap-2 sm:ps-8 lg:contents'>
					<QtyUnitControl control={control} path={path} t={t} />
					<KcalControl control={control} path={path} t={t} />
				</div>
				<div className='flex items-center justify-end gap-0.5'>
					<button
						type='button'
						onClick={() => alts.append(blankAlternative())}
						aria-label={t('form.add_alternative')}
						title={t('form.add_alternative')}
						className={`${ICON_BTN} hover:bg-[color-mix(in_srgb,var(--gm-warn)_12%,transparent)] hover:text-(--gm-warn)`}
					>
						<Replace className='size-4' />
					</button>
					<RemoveButton onClick={() => onRemove(index)} label={t('btn.remove_item')} />
				</div>
			</div>

			<div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:ps-8 empty:hidden'>
				{type === 'recipe' && <Badge color='blue' icon={<ChefHat className='size-3' />}>{t('recipes.label')}</Badge>}
				<ItemNutritionLine control={control} path={path} setValue={setValue} t={t} />
			</div>
			<FieldErrors control={control} paths={[`${path}.name`, `${path}.calories`, `${path}.quantity`]} />

			{alts.fields.length > 0 && (
				<div className='mt-2.5 space-y-2 lg:ms-8'>
					{alts.fields.map((a, ai) => {
						const altPath = `${path}.alternatives.${ai}`;
						return (
							<div key={a.id} className='gm-mp-alt px-2 py-2 lg:px-0'>
								<p className='mb-2 flex items-center gap-1.5 ps-1 text-[11px] font-semibold text-(--gm-warn) lg:hidden'>
									<Replace className='size-3' aria-hidden />
									{t('form.alternative_item')}
								</p>
								<div className={`gm-mp-grid flex flex-wrap items-center gap-2 lg:grid lg:items-center lg:grid-cols-[minmax(0,1fr)_13.25rem_7rem_4.25rem] lg:ps-2`}>
									<div className='flex min-w-0 flex-1 basis-0 items-center gap-2 lg:basis-auto'>
										<span
											className='hidden size-6 shrink-0 place-items-center rounded-[7px] text-(--gm-warn) lg:grid'
											style={{ background: 'color-mix(in srgb, var(--gm-warn) 14%, transparent)' }}
											title={t('form.alternative_item')}
										>
											<Replace className='size-3.5' aria-hidden />
										</span>
										<ItemNameField
											control={control}
											path={altPath}
											setValue={setValue}
											onCreateFood={setCreating}
											t={t}
											className='min-w-0 flex-1'
										/>
									</div>
									<div className='order-last grid w-full grid-cols-[minmax(0,1fr)_6.25rem] gap-2 lg:contents'>
										<QtyUnitControl control={control} path={altPath} t={t} />
										<KcalControl control={control} path={altPath} t={t} />
									</div>
									<div className='flex items-center justify-end'>
										<RemoveButton onClick={() => alts.remove(ai)} label={t('btn.remove_alternative')} />
									</div>
								</div>
								<ItemNutritionLine control={control} path={altPath} setValue={setValue} t={t} className='mt-1.5 ps-1 lg:ps-10' />
							</div>
						);
					})}
				</div>
			)}

			<AnimatePresence>
				{creating && (
					<QuickFoodPanel
						key={creating.name}
						initialName={creating.name}
						onClose={closeCreate}
						onCreated={food => {
							creating.link(food);
							setCreating(null);
						}}
					/>
				)}
			</AnimatePresence>
		</div>
	);
});

const SupplementRow = memo(function SupplementRow({ id, control, path, index, onRemove, t }) {
	const row = useSortableRow(id);
	return (
		<div ref={row.ref} style={row.style} className={`gm-mp-row px-2 py-2.5 sm:px-3 ${row.isDragging ? 'is-dragging' : ''}`}>
			<div className={`gm-mp-grid flex flex-wrap items-center gap-2 lg:grid lg:items-center ${SUPP_COLS}`}>
				<DragHandle handle={row.handle} label={t('builder.drag_handle')} />
				<Controller
					name={`${path}.name`}
					control={control}
					render={({ field, fieldState }) => (
						<MiniField className='min-w-0 flex-1 basis-0 lg:basis-auto' label={t('form.supplement_name')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
					)}
				/>
				<div className='order-last grid w-full grid-cols-2 gap-2 sm:ps-8 lg:contents'>
					<Controller
						name={`${path}.time`}
						control={control}
						render={({ field, fieldState }) => (
							<TimeField label={t('details.time')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
						)}
					/>
					<Controller
						name={`${path}.bestWith`}
						control={control}
						render={({ field }) => (
							<MiniField label={t('form.best_with')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
						)}
					/>
				</div>
				<div className='flex items-center justify-end'>
					<RemoveButton onClick={() => onRemove(index)} label={t('btn.remove_supplement')} />
				</div>
			</div>
			<FieldErrors control={control} paths={[`${path}.name`, `${path}.time`]} />
		</div>
	);
});

/* ─────────────────────────── Recipe picker ─────────────────────────── */
function RecipePanel({ onPick, onClose, t }) {
	const [search, setSearch] = useState('');
	const q = useDebounced(search, 300);
	const [state, setState] = useState({ loading: true, items: [], error: null });
	const [nonce, setNonce] = useState(0);

	useEffect(() => {
		const ctrl = new AbortController();
		setState(s => ({ ...s, loading: true, error: null }));
		api.get('/recipes', { params: { search: q.trim() || undefined, limit: 30, page: 1 }, signal: ctrl.signal })
			.then(res => setState({ loading: false, items: res?.data?.items || [], error: null }))
			.catch(e => {
				if (e?.name === 'CanceledError') return;
				setState({ loading: false, items: [], error: e?.response ? e.response.data?.message || t('recipes.load_failed') : t('errors.server_unreachable') });
			});
		return () => ctrl.abort();
	}, [q, nonce, t]);

	useEffect(() => {
		const onKey = e => {
			if (e.key !== 'Escape') return;
			e.stopPropagation();
			onClose();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [onClose]);

	return (
		<motion.div
			initial={{ opacity: 0, y: -6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
			transition={{ duration: 0.18 }}
			className='rounded-[14px] border p-2.5'
			style={{ borderColor: 'color-mix(in srgb, var(--color-primary-400) 35%, transparent)', background: 'color-mix(in srgb, var(--gm-paper) 88%, transparent)' }}
		>
			<div className='mb-2 flex items-center gap-2'>
				<FloatingInput className='flex-1' label={t('recipes.searchPlaceholder')} value={search} onChange={setSearch} icon={<Search className='size-4' />} />
				<button type='button' onClick={onClose} aria-label={t('btn.close')} title={t('btn.close')} className='grid size-11 shrink-0 place-items-center rounded-[11px] border border-(--gm-line) gm-muted transition-colors hover:text-(--color-primary-600)'>
					<X className='size-4' />
				</button>
			</div>
			<div role='listbox' aria-label={t('recipes.pickerTitle')} className='max-h-64 space-y-0.5 overflow-y-auto'>
				{state.loading ? (
					<RowSkeleton rows={3} />
				) : state.error ? (
					<ErrorBox message={state.error} onRetry={() => setNonce(n => n + 1)} retryLabel={t('btn.retry')} />
				) : state.items.length ? (
					state.items.map(r => (
						<button
							key={r.id}
							type='button'
							role='option'
							aria-selected={false}
							onClick={() => onPick(r)}
							className='group flex w-full items-center gap-3 rounded-[12px] px-2 py-1.5 text-start transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]'
						>
							<span className='relative size-10 shrink-0 overflow-hidden rounded-[10px] border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
								{r.image_url ? (
									<Img src={r.image_url} alt='' showBlur={false} className='h-full w-full object-cover' />
								) : (
									<span className='grid h-full place-items-center text-(--color-primary-300)'><ChefHat className='size-4' /></span>
								)}
							</span>
							<MultiLangText className='min-w-0 flex-1 truncate text-[13px] font-bold gm-ink'>{r.title}</MultiLangText>
							<span className='gm-plan__chip font-en tabular-nums'>
								<Flame className='size-3' />
								{fmtNum(r?.nutrition?.calories ?? r?.calories)} {t('form.kcal_short')}
							</span>
							<span className='grid size-7 shrink-0 place-items-center rounded-[9px] text-(--color-primary-600) opacity-60 transition-opacity group-hover:opacity-100'>
								<Plus className='size-4' />
							</span>
						</button>
					))
				) : (
					<EmptyBlock icon={ChefHat} title={t('recipes.empty')} />
				)}
			</div>
		</motion.div>
	);
}

/* ─────────────────────────── Meal ─────────────────────────── */
function AddAction({ icon: Icon, label, onClick, active = false }) {
	return (
		<button
			type='button'
			onClick={onClick}
			aria-pressed={active}
			className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-semibold transition-colors ${
				active
					? 'bg-[color-mix(in_srgb,var(--color-primary-100)_80%,transparent)] text-(--color-primary-700)'
					: 'text-(--color-primary-700) hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)]'
			}`}
		>
			<Icon className='size-4' aria-hidden />
			{label}
		</button>
	);
}

const MealBlocks = memo(function MealBlocks({ control, basePath, setValue, t }) {
	const items = useFieldArray({ control, name: `${basePath}.items` });
	const supps = useFieldArray({ control, name: `${basePath}.supplements` });
	const { errors } = useFormState({ control, name: `${basePath}.items` });
	const [recipesOpen, setRecipesOpen] = useState(false);
	const itemIds = useMemo(() => items.fields.map(f => f.id), [items.fields]);
	const suppIds = useMemo(() => supps.fields.map(f => f.id), [supps.fields]);
	const itemsError = arrayError(errors, `${basePath}.items`);
	const closeRecipes = useCallback(() => setRecipesOpen(false), []);
	const { append: appendItem } = items;

	const pickRecipe = useCallback(r => {
		appendItem({
			...blankItem(),
			name: r.title,
			type: 'recipe',
			id: r.id,
			sourceId: r.id,
			unit: 'count',
			calories: Number(r?.nutrition?.calories || r?.calories || 0),
		}, { shouldFocus: false });
		setRecipesOpen(false);
	}, [appendItem]);

	return (
		<div className='gm-mp-cols'>
			{items.fields.length > 0 ? (
				<>
					<ColumnHeads cols={ITEM_COLS} labels={[t('form.item_name'), t('form.qty'), t('form.calories')]} />
					<SortableList ids={itemIds} onMove={items.move}>
						<div className='divide-y divide-(--gm-line)'>
							{items.fields.map((f, i) => (
								<ItemRow key={f.id} id={f.id} control={control} path={`${basePath}.items.${i}`} index={i} onRemove={items.remove} setValue={setValue} t={t} />
							))}
						</div>
					</SortableList>
				</>
			) : (
				<p className='px-4 py-5 text-center text-[12.5px] gm-muted'>{t('empty.no_items')}</p>
			)}

			{itemsError && (
				<p className='flex items-center gap-1.5 px-4 pb-2 text-[12px] font-medium text-(--gm-danger)'>
					<AlertCircle className='size-3.5' />
					{itemsError}
				</p>
			)}

			{supps.fields.length > 0 && (
				<div className='border-t border-(--gm-line)'>
					<div className='gm-mp-subhead flex items-center gap-2 px-4 py-2'>
						<Pill className='size-3.5 text-(--color-secondary-600)' aria-hidden />
						<span className='text-[12px] font-bold gm-ink-soft'>{t('details.supplements')}</span>
						<span className='gm-plan__chip font-en tabular-nums'>{supps.fields.length}</span>
					</div>
					<ColumnHeads cols={SUPP_COLS} labels={[t('form.supplement_name'), t('details.time'), t('form.best_with')]} />
					<SortableList ids={suppIds} onMove={supps.move}>
						<div className='divide-y divide-(--gm-line)'>
							{supps.fields.map((f, i) => (
								<SupplementRow key={f.id} id={f.id} control={control} path={`${basePath}.supplements.${i}`} index={i} onRemove={supps.remove} t={t} />
							))}
						</div>
					</SortableList>
				</div>
			)}

			<AnimatePresence>
				{recipesOpen && (
					<div className='border-t border-(--gm-line) p-3'>
						<RecipePanel onPick={pickRecipe} onClose={closeRecipes} t={t} />
					</div>
				)}
			</AnimatePresence>

			<div className='flex flex-wrap items-center gap-1 border-t border-(--gm-line) px-2 py-2 sm:px-3'>
				<AddAction icon={UtensilsCrossed} label={t('btn.add_item')} onClick={() => items.append(blankItem())} />
				<AddAction icon={ChefHat} label={t('btn.add_recipe')} active={recipesOpen} onClick={() => setRecipesOpen(o => !o)} />
				<AddAction icon={Pill} label={t('btn.add_supplement')} onClick={() => supps.append(blankSupplement())} />
			</div>
		</div>
	);
});

function MealStats({ control, path, t }) {
	const items = useWatch({ control, name: `${path}.items` });
	const totals = sumNutrition(items);
	return (
		<span className='flex min-w-0 flex-wrap items-center gap-2'>
			<span className='inline-flex items-center gap-1 rounded-full bg-(--gm-paper) px-2.5 py-1 gm-mp-accent font-en text-[12px] font-bold tabular-nums text-(--color-primary-700) ring-1 ring-(--gm-line)'>
				<Flame className='size-3.5' aria-hidden />
				{fmtNum(mealKcal({ items }))}
				<span className='font-semibold gm-muted'>{t('form.kcal_short')}</span>
			</span>
			{totals.linked > 0 && (
				<span className='hidden items-center xl:inline-flex' title={totals.linked < (items?.length || 0) ? t('form.macros_partial') : undefined}>
					<MacroChips n={totals} compact />
				</span>
			)}
		</span>
	);
}

const MealCard = memo(function MealCard({ id, control, path, index, onRemove, setValue, t }) {
	const row = useSortableRow(id);
	const [open, setOpen] = useState(true);
	const { errors } = useFormState({ control, name: path });
	const hasError = Boolean(path.split('.').reduce((cur, k) => cur?.[k], errors));
	const expanded = open || hasError;

	return (
		<div ref={row.ref} style={row.style} className={`gm-mp-meal ${row.isDragging ? 'is-dragging' : ''} ${hasError ? 'has-error' : ''}`}>
			<header className={`gm-mp-meal__head flex flex-wrap items-center gap-2 px-2 py-2.5 sm:gap-2.5 sm:px-3 ${expanded ? 'border-b border-(--gm-line)' : 'is-collapsed'}`}>
				<DragHandle handle={row.handle} label={t('builder.drag_handle')} />
				<span className='grid size-8 shrink-0 place-items-center rounded-[10px] font-en text-[12px] font-bold text-white tabular-nums' style={GRADIENT}>
					{index + 1}
				</span>
				<Controller
					name={`${path}.title`}
					control={control}
					render={({ field, fieldState }) => (
						<MiniField className='min-w-0 flex-1 basis-[calc(100%-8rem)] sm:max-w-[280px] sm:basis-auto' label={t('form.meal_name')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
					)}
				/>
				<Controller
					name={`${path}.time`}
					control={control}
					render={({ field, fieldState }) => (
						<TimeField className='ms-8 w-[132px] sm:ms-0' label={t('details.time')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
					)}
				/>
				<MealStats control={control} path={path} t={t} />
				<div className='ms-auto flex items-center gap-0.5'>
					<button
						type='button'
						onClick={() => setOpen(o => !o)}
						aria-expanded={expanded}
						aria-label={expanded ? t('btn.collapse') : t('btn.expand')}
						title={expanded ? t('btn.collapse') : t('btn.expand')}
						className={`${ICON_BTN} hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] hover:text-(--color-primary-600)`}
					>
						<ChevronDown className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
					</button>
					<ConfirmRemove onConfirm={() => onRemove(index)} label={t('btn.remove_meal')} confirmLabel={t('clickAgainToConfirm')} />
				</div>
			</header>
			{expanded && <MealBlocks control={control} basePath={path} setValue={setValue} t={t} />}
		</div>
	);
});

const MealsEditor = memo(function MealsEditor({ fields, move, remove, name, control, setValue, onAdd, t }) {
	const ids = useMemo(() => fields.map(f => f.id), [fields]);
	if (!fields.length) {
		return (
			<button
				type='button'
				onClick={onAdd}
				className='flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-(--gm-line) px-4 py-8 text-center transition-colors hover:border-(--color-primary-300) hover:bg-[color-mix(in_srgb,var(--color-primary-50)_50%,transparent)]'
			>
				<span className='gm-plan__icon size-10! rounded-[12px]!'><UtensilsCrossed className='size-4' /></span>
				<span className='text-[13px] font-semibold gm-ink-soft'>{t('empty.no_meals_hint')}</span>
			</button>
		);
	}
	return (
		<SortableList ids={ids} onMove={move}>
			<div className='space-y-3.5'>
				{fields.map((f, i) => (
					<MealCard key={f.id} id={f.id} control={control} path={`${name}.${i}`} index={i} onRemove={remove} setValue={setValue} t={t} />
				))}
			</div>
		</SortableList>
	);
});

/* ─────────────────────────── Sections ─────────────────────────── */
function Section({ icon: Icon, title, count, hint, action, children, className = '' }) {
	return (
		<section className={`gm-mp-section ${className}`}>
			<header className='flex flex-wrap items-start justify-between gap-3'>
				<div className='flex min-w-0 items-start gap-3'>
					<span className='gm-plan__icon size-9! shrink-0 rounded-[11px]!'><Icon className='size-4' aria-hidden /></span>
					<div className='min-w-0 pt-0.5'>
						<h4 className='flex items-center gap-2 text-[14px] font-bold leading-tight gm-ink'>
							{title}
							{count != null && <span className='gm-plan__chip font-en tabular-nums'>{count}</span>}
						</h4>
						{hint ? <p className='mt-1 text-[12px] leading-snug gm-muted'>{hint}</p> : null}
					</div>
				</div>
				{action}
			</header>
			{children ? <div className='mt-4'>{children}</div> : null}
		</section>
	);
}

const NOTES_PREVIEW = 4;

/** Plan notes: one compact line each. Enter adds a line below, Backspace on an empty line removes it. */
function NotesSection({ rows, setRows, t }) {
	const inputs = useRef(new Map());
	const focusId = useRef(null);
	const [showAll, setShowAll] = useState(rows.length <= NOTES_PREVIEW + 1);

	useEffect(() => {
		if (focusId.current == null) return;
		inputs.current.get(focusId.current)?.focus();
		focusId.current = null;
	}, [rows]);

	const add = afterIndex => {
		const next = makeListRow();
		focusId.current = next.id;
		setShowAll(true);
		setRows(prev => {
			const copy = [...prev];
			copy.splice(afterIndex == null ? copy.length : afterIndex + 1, 0, next);
			return copy;
		});
	};
	const update = (id, value) => setRows(prev => prev.map(r => (r.id === id ? { ...r, value } : r)));
	const remove = id => setRows(prev => prev.filter(r => r.id !== id));
	const onKeyDown = (e, r, i) => {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
			e.preventDefault();
			add(i);
		} else if (e.key === 'Backspace' && !r.value && rows.length > 1) {
			e.preventDefault();
			focusId.current = (rows[i - 1] || rows[i + 1])?.id ?? null;
			remove(r.id);
		}
	};

	const filled = rows.filter(r => r.value.trim()).length;
	const visible = showAll ? rows : rows.slice(0, NOTES_PREVIEW);
	const hidden = rows.length - visible.length;

	return (
		<Section
			icon={NotebookPen}
			title={t('details.notes')}
			count={filled || null}
			action={(
				<button type='button' onClick={() => add()} className='gm-btn-ghost gm-btn-compact inline-flex shrink-0 items-center gap-1.5'>
					<Plus className='size-3.5' />
					{t('notes.add')}
				</button>
			)}
		>
			{rows.length ? (
				<>
					<ul className='overflow-hidden rounded-[14px] border border-(--gm-line) bg-(--gm-paper)'>
						{visible.map((r, i) => (
							<li key={r.id} className='group flex items-center gap-2 border-b border-(--gm-line) ps-3 pe-1 last:border-b-0 focus-within:bg-[color-mix(in_srgb,var(--color-primary-50)_55%,transparent)]'>
								<span className='size-1.5 shrink-0 rounded-full bg-(--color-primary-400)' aria-hidden />
								<input
									ref={el => (el ? inputs.current.set(r.id, el) : inputs.current.delete(r.id))}
									dir='auto'
									value={r.value}
									placeholder={t('notes.placeholder')}
									aria-label={`${t('details.notes')} ${i + 1}`}
									onChange={e => update(r.id, e.target.value)}
									onKeyDown={e => onKeyDown(e, r, i)}
									className='h-10 min-w-0 flex-1 bg-transparent text-start text-[13px] text-(--gm-ink) outline-none placeholder:text-(--gm-faint)'
								/>
								<button
									type='button'
									onClick={() => remove(r.id)}
									aria-label={t('notes.remove')}
									title={t('notes.remove')}
									className='grid size-8 shrink-0 place-items-center rounded-[9px] gm-faint opacity-60 transition hover:bg-[color-mix(in_srgb,var(--gm-danger)_10%,transparent)] hover:text-(--gm-danger) hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100'
								>
									<X className='size-4' />
								</button>
							</li>
						))}
					</ul>
					{hidden > 0 || (showAll && rows.length > NOTES_PREVIEW + 1) ? (
						<button
							type='button'
							onClick={() => setShowAll(v => !v)}
							aria-expanded={showAll}
							className='mt-2 inline-flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-semibold text-(--color-primary-700) transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)]'
						>
							<ChevronDown className={`size-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden />
							{showAll ? t('notes.show_less') : t('notes.show_all', { count: rows.length })}
						</button>
					) : null}
				</>
			) : (
				<button
					type='button'
					onClick={() => add()}
					className='flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-(--gm-line) py-4 text-[12.5px] font-medium gm-muted transition-colors hover:border-(--color-primary-300) hover:text-(--color-primary-600)'
				>
					<Plus className='size-4' />
					{t('notes.empty')}
				</button>
			)}
		</Section>
	);
}

/* ─────────────────────────── Day overrides ─────────────────────────── */
const WARN_TEXT = 'text-amber-600';
const WARN_SURFACE = { borderColor: 'color-mix(in srgb, #f59e0b 45%, transparent)', background: 'color-mix(in srgb, #f59e0b 8%, transparent)' };

function ApplyToAllButton({ onConfirm, t }) {
	const [armed, setArmed] = useState(false);
	useEffect(() => {
		if (!armed) return undefined;
		const id = setTimeout(() => setArmed(false), 3000);
		return () => clearTimeout(id);
	}, [armed]);
	return (
		<button
			type='button'
			onClick={() => (armed ? onConfirm() : setArmed(true))}
			onBlur={() => setArmed(false)}
			className={`gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 ${armed ? WARN_TEXT : ''}`}
		>
			{armed ? <AlertTriangle className='size-3.5' /> : <CalendarCheck className='size-3.5' />}
			{armed ? t('clickAgainToConfirm') : t('form.apply_to_all')}
		</button>
	);
}

function DayOverrideBlock({ dayKey, control, setValue, getBaseMeals, onApplyToAll, kcal, flagged, open, onToggle, t }) {
	const name = `dayOverrides.${dayKey}`;
	const { fields, append, remove, move, replace } = useFieldArray({ control, name });
	const { errors } = useFormState({ control, name });
	const hasError = Boolean(errors?.dayOverrides?.[dayKey]);
	const expanded = open || hasError;
	const addMeal = () => append(blankMeal(t('form.meal_n', { n: fields.length + 1 })));
	const copyBase = () => replace(cloneMeals(getBaseMeals()));

	return (
		<section
			className='overflow-hidden rounded-2xl border'
			style={{
				borderColor: hasError ? 'color-mix(in srgb, var(--gm-danger) 40%, transparent)' : flagged ? WARN_SURFACE.borderColor : 'var(--gm-line)',
				background: 'color-mix(in srgb, var(--gm-paper) 40%, transparent)',
			}}
		>
			<button
				type='button'
				onClick={() => onToggle(dayKey)}
				aria-expanded={expanded}
				className='flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)] sm:px-3.5'
			>
				<span className='gm-plan__icon size-8! shrink-0 rounded-[10px]!'><CalendarDays className='size-4' /></span>
				<span className='min-w-0 flex-1'>
					<span className='block text-[13px] font-bold gm-ink'>{t(`days.${dayKey}`)}</span>
					<span className='block truncate text-[11.5px] gm-muted'>{fields.length ? t('form.day_custom_hint') : t('form.day_uses_base')}</span>
				</span>
				<span className={`gm-plan__chip shrink-0 font-en tabular-nums ${flagged ? 'text-amber-600!' : ''}`}>
					{flagged ? <AlertTriangle className='size-3' /> : <Flame className='size-3' />}
					{fmtNum(kcal)} {t('form.kcal_short')}
				</span>
				{fields.length > 0 && <Badge color='primary' icon={<UtensilsCrossed className='size-3' />}>{t('form.meals_count', { count: fields.length })}</Badge>}
				<ChevronDown className={`size-4 shrink-0 gm-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
			</button>
			{expanded && (
				<div className='space-y-3 border-t border-(--gm-line) p-2.5 sm:p-3'>
					<div className='flex flex-wrap items-center gap-2'>
						{fields.length ? (
							<>
								<ApplyToAllButton onConfirm={() => onApplyToAll(dayKey)} t={t} />
								<button type='button' onClick={() => replace([])} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'>
									<Undo2 className='size-3.5' />
									{t('form.reset_to_base')}
								</button>
							</>
						) : (
							<button type='button' onClick={copyBase} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'>
								<Copy className='size-3.5' />
								{t('form.copy_base')}
							</button>
						)}
					</div>
					<MealsEditor fields={fields} move={move} remove={remove} name={name} control={control} setValue={setValue} onAdd={addMeal} t={t} />
					{fields.length > 0 && (
						<button type='button' onClick={addMeal} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'>
							<Plus className='size-3.5' />
							{t('btn.add_meal')}
						</button>
					)}
				</div>
			)}
		</section>
	);
}

/* ─────────────────────────── Summary ─────────────────────────── */
function PlanSummary({ control, week, warn, t }) {
	const meals = useWatch({ control, name: 'baseMeals' });
	const list = meals || [];
	const items = list.reduce((sum, m) => sum + (m?.items?.length || 0), 0);
	const values = week.map(d => d.kcal);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const kcalLabel = Math.round(min) === Math.round(max) ? fmtNum(max) : `${fmtNum(min)}–${fmtNum(max)}`;
	const totals = sumNutrition(list.flatMap(m => m?.items || []));
	return (
		<div className='flex flex-wrap items-center gap-1.5'>
			<span className='gm-plan__chip font-en tabular-nums'><UtensilsCrossed className='size-3' />{t('form.meals_count', { count: list.length })}</span>
			<span className='gm-plan__chip font-en tabular-nums'><Layers className='size-3' />{t('form.items_count', { count: items })}</span>
			<span className={`gm-plan__chip font-en tabular-nums ${warn ? 'text-amber-600!' : 'gm-mp-accent text-(--color-primary-700)!'}`}>
				{warn ? <AlertTriangle className='size-3' /> : <Flame className='size-3' />}
				<span dir='ltr'>{kcalLabel}</span> {t('form.kcal_per_day')}
			</span>
			{totals.linked > 0 && (
				<span className='hidden items-center rounded-xl border px-2 py-1 md:inline-flex' style={{ borderColor: 'var(--gm-line)' }} title={t('form.base_macros_hint')}>
					<MacroChips n={totals} compact />
				</span>
			)}
		</div>
	);
}

/** Per-day calories as the client will receive them, with a warning when one day drifts from the rest. */
function WeekKcalStrip({ week, flagged, t }) {
	return (
		<div className='space-y-2'>
			<p className='text-[11.5px] font-semibold gm-muted'>{t('form.week_title')}</p>
			<div className='flex flex-wrap gap-1.5'>
				{week.map(d => {
					const isFlagged = flagged.has(d.key);
					return (
						<span
							key={d.key}
							className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[11.5px] ${isFlagged ? 'font-semibold text-amber-600' : 'gm-ink-soft'}`}
							style={isFlagged ? WARN_SURFACE : { borderColor: 'var(--gm-line)' }}
						>
							<span>{t(`days.${d.key}`)}</span>
							<span className='font-en tabular-nums'>{fmtNum(d.kcal)}</span>
							{d.custom ? <CalendarCog className='size-3 opacity-70' aria-label={t('form.day_custom_hint')} /> : null}
						</span>
					);
				})}
			</div>
		</div>
	);
}

function KcalGapNotice({ outliers, confirming, t }) {
	if (!outliers.length) return null;
	const days = outliers.map(d => `${t(`days.${d.key}`)} (${fmtNum(d.kcal)})`).join('، ');
	return (
		<div role='alert' className='flex items-start gap-2.5 rounded-2xl border p-3' style={WARN_SURFACE}>
			<AlertTriangle className='mt-0.5 size-4 shrink-0 text-amber-600' />
			<div className='min-w-0 space-y-0.5'>
				<p className='text-[12.5px] font-bold text-amber-600'>{t('form.kcal_gap_title')}</p>
				<p className='text-[12px] leading-relaxed gm-ink-soft'>{t('form.kcal_gap_hint', { days })}</p>
				{confirming ? <p className='text-[12px] font-semibold gm-ink'>{t('form.kcal_gap_confirm_hint')}</p> : null}
			</div>
		</div>
	);
}

/* ─────────────────────────── Form ─────────────────────────── */
export function MealPlanForm({ initialPlan, onSubmitPayload, submitLabel, onCancel }) {
	const t = useTranslations('nutrition');
	const schema = useMemo(() => buildPlanSchema(t), [t]);
	const defaultTitle = t('form.meal_n', { n: 1 });
	const defaults = useMemo(() => planToFormValues(initialPlan, defaultTitle), [initialPlan, defaultTitle]);

	const { control, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm({
		resolver: yupResolver(schema),
		defaultValues: defaults,
		mode: 'onBlur',
	});
	const base = useFieldArray({ control, name: 'baseMeals' });
	const customizeDays = useWatch({ control, name: 'customizeDays' });
	const watchedBase = useWatch({ control, name: 'baseMeals' });
	const watchedOverrides = useWatch({ control, name: 'dayOverrides' });
	const week = useMemo(
		() => weekKcal({ baseMeals: watchedBase, customizeDays, dayOverrides: watchedOverrides }),
		[watchedBase, customizeDays, watchedOverrides],
	);
	const outliers = useMemo(() => kcalOutliers(week), [week]);
	const flaggedDays = useMemo(() => new Set(outliers.map(d => d.key)), [outliers]);
	const weekSignature = week.map(d => `${d.key}:${Math.round(d.kcal)}`).join('|');
	const [confirmedSignature, setConfirmedSignature] = useState(null);
	const confirming = outliers.length > 0 && confirmedSignature === weekSignature;
	const getBaseMeals = useCallback(() => getValues('baseMeals') || [], [getValues]);

	const [notes, setNotes] = useState(() => toListRows(defaults.notesList));
	const [openDays, setOpenDays] = useState({});
	const [aiOpen, setAiOpen] = useState(false);
	const [aiText, setAiText] = useState(() => t('ai.default_prompt'));
	const [aiLoading, setAiLoading] = useState(false);

	const toggleDay = useCallback(key => setOpenDays(s => ({ ...s, [key]: !s[key] })), []);
	const baseError = arrayError(errors, 'baseMeals');

	const { append: appendBase, fields: baseFields } = base;
	const addBaseMeal = useCallback(() => {
		appendBase(blankMeal(t('form.meal_n', { n: baseFields.length + 1 })));
	}, [appendBase, baseFields.length, t]);

	const runAi = async () => {
		if (!aiText.trim() || aiLoading) return;
		setAiLoading(true);
		try {
			const { data } = await api.post('/nutrition/ai/generate', { prompt: buildAiPrompt(aiText) });
			const parsed = parseAiPlan(data);
			const meals = aiMealsToForm(parsed?.meals, '').map((m, i) => ({ ...m, title: m.title || t('form.meal_n', { n: i + 1 }) }));
			if (!meals.length) throw new Error(t('toast.ai_failed'));
			base.replace(meals);
			if (parsed?.name) setValue('name', String(parsed.name), { shouldDirty: true, shouldValidate: true });
			if (parsed?.description) setValue('description', String(parsed.description), { shouldDirty: true });
			const aiNotes = Array.isArray(parsed?.notes) ? parsed.notes.map(String) : typeof parsed?.notes === 'string' ? parsed.notes.split('\n') : null;
			if (aiNotes) setNotes(toListRows(aiNotes));
			Notification(t('toast.ai_filled'), 'success');
			setAiOpen(false);
			setAiText('');
		} catch (e) {
			Notification(e?.response?.data?.message || e?.message || t('toast.ai_failed'), 'error');
		} finally {
			setAiLoading(false);
		}
	};

	const applyDayToAll = useCallback(dayKey => {
		const meals = cloneMeals(getValues(`dayOverrides.${dayKey}`) || []);
		if (!meals.length) return;
		base.replace(meals);
		for (const k of DAY_KEYS) setValue(`dayOverrides.${k}`, [], { shouldDirty: true });
		setValue('customizeDays', false, { shouldDirty: true });
		setOpenDays({});
		Notification(t('form.applied_to_all', { day: t(`days.${dayKey}`) }), 'success');
	}, [base, getValues, setValue, t]);

	const onValid = async data => {
		const gaps = kcalOutliers(weekKcal(data));
		if (gaps.length) {
			const signature = weekKcal(data).map(d => `${d.key}:${Math.round(d.kcal)}`).join('|');
			if (confirmedSignature !== signature) {
				setConfirmedSignature(signature);
				Notification(t('form.kcal_gap_toast'), 'warning');
				return;
			}
		}
		await onSubmitPayload(formToPayload(data, fromListRows(notes)));
	};
	const onInvalid = () => Notification(t('validation.fix_errors'), 'error');

	const blockEnterSubmit = e => {
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
	};

	return (
		<form className='gm-mp space-y-5' onSubmit={handleSubmit(onValid, onInvalid)} onKeyDown={blockEnterSubmit} noValidate>
			<Section icon={FileText} title={t('form.basics')}>
				<div className='grid grid-cols-1 gap-3.5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
					<Controller
						name='name'
						control={control}
						render={({ field, fieldState }) => (
							<FloatingInput required label={t('form.plan_name')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} icon={<UtensilsCrossed className='size-4' />} />
						)}
					/>
					<Controller
						name='description'
						control={control}
						render={({ field }) => (
							<FloatingInput label={t('form.description')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} icon={<FileText className='size-4' />} />
						)}
					/>
				</div>
			</Section>

			<NotesSection rows={notes} setRows={setNotes} t={t} />

			<Section
				icon={UtensilsCrossed}
				title={t('form.base_day_title')}
				count={base.fields.length}
				hint={t('form.base_day_hint')}
				action={(
					<button type='button' onClick={addBaseMeal} className='gm-btn-ghost gm-btn-compact inline-flex shrink-0 items-center gap-1.5'>
						<Plus className='size-3.5' />
						{t('btn.add_meal')}
					</button>
				)}
			>
				<MealsEditor fields={base.fields} move={base.move} remove={base.remove} name='baseMeals' control={control} setValue={setValue} onAdd={addBaseMeal} t={t} />
				{baseError && (
					<p className='mt-3 flex items-center gap-1.5 text-[12px] font-medium text-(--gm-danger)'>
						<AlertCircle className='size-3.5' />
						{baseError}
					</p>
				)}
				{base.fields.length > 0 && (
					<button
						type='button'
						onClick={addBaseMeal}
						className='mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-(--gm-line) text-[13px] font-semibold text-(--color-primary-700) transition-colors hover:border-(--color-primary-300) hover:bg-[color-mix(in_srgb,var(--color-primary-50)_55%,transparent)]'
					>
						<Plus className='size-4' />
						{t('btn.add_meal')}
					</button>
				)}
			</Section>

			<Controller
				name='customizeDays'
				control={control}
				render={({ field }) => (
					<Section
						icon={CalendarCog}
						title={t('form.customize_days')}
						hint={t('form.customize_days_hint')}
						action={(
							<button
								type='button'
								role='switch'
								aria-checked={!!field.value}
								aria-label={t('form.customize_days')}
								onClick={() => field.onChange(!field.value)}
								className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary-300) ${field.value ? '' : 'bg-[color-mix(in_srgb,var(--color-primary-200)_70%,transparent)]'}`}
								style={field.value ? GRADIENT : undefined}
							>
								<span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-200 ${field.value ? 'start-[22px]' : 'start-0.5'}`} />
							</button>
						)}
					>
						<AnimatePresence initial={false}>
							{customizeDays && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
									className='overflow-hidden'
								>
									<div className='space-y-2.5'>
										<WeekKcalStrip week={week} flagged={flaggedDays} t={t} />
										{DAY_KEYS.map((key, i) => (
											<DayOverrideBlock
												key={key}
												dayKey={key}
												control={control}
												setValue={setValue}
												getBaseMeals={getBaseMeals}
												onApplyToAll={applyDayToAll}
												kcal={week[i].kcal}
												flagged={flaggedDays.has(key)}
												open={!!openDays[key]}
												onToggle={toggleDay}
												t={t}
											/>
										))}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</Section>
				)}
			/>

			<AnimatePresence>
				{aiOpen && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
						transition={{ duration: 0.2 }}
					>
						<Section
							icon={Sparkles}
							title={t('ai.title')}
							className='border-[color-mix(in_srgb,var(--color-primary-400)_45%,transparent)]!'
							action={(
								<button type='button' onClick={() => setAiOpen(false)} aria-label={t('btn.close')} className={`${ICON_BTN} hover:text-(--color-primary-600)`}>
									<X className='size-4' />
								</button>
							)}
						>
							<GmTextarea label={t('ai.prompt_label')} value={aiText} onChange={setAiText} rows={3} />
							<p className='mt-1.5 ps-1 text-[11.5px] gm-muted'>{t('ai.hint')}</p>
							<div className='mt-3 flex justify-end gap-2'>
								<Button color='neutral' name={t('btn.cancel')} onClick={() => setAiOpen(false)} disabled={aiLoading} />
								<Button color='primary' name={t('btn.generate')} onClick={runAi} loading={aiLoading} disabled={aiLoading || !aiText.trim()} icon={<Sparkles className='size-4' />} />
							</div>
						</Section>
					</motion.div>
				)}
			</AnimatePresence>

			<KcalGapNotice outliers={outliers} confirming={confirming} t={t} />

			<div className='gm-mp-foot'>
				<div className='flex min-w-0 items-center gap-2 sm:flex-wrap'>
					<button
						type='button'
						onClick={() => setAiOpen(o => !o)}
						aria-pressed={aiOpen}
						aria-label={t('btn.ai_assist')}
						className={`gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 max-sm:size-11! max-sm:justify-center max-sm:p-0! ${aiOpen ? 'text-(--color-primary-700)!' : ''}`}
					>
						<Sparkles className='size-4 sm:size-3.5' />
						<span className='max-sm:sr-only'>{t('btn.ai_assist')}</span>
					</button>
					<span className='max-sm:hidden'>
						<PlanSummary control={control} week={week} warn={outliers.length > 0} t={t} />
					</span>
				</div>
				<div className='flex items-center gap-2.5 max-sm:flex-1 max-sm:[&>*]:flex-1'>
					{onCancel && <Button color='neutral' name={t('btn.cancel')} onClick={onCancel} disabled={isSubmitting} />}
					<Button color='primary' type='submit' name={confirming ? t('form.kcal_gap_save_anyway') : submitLabel} loading={isSubmitting} disabled={isSubmitting} />
				</div>
			</div>
		</form>
	);
}
