'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Controller, useController, useFieldArray, useForm, useFormState, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
	AlertCircle, CalendarCog, CalendarDays, ChefHat, ChevronDown, Clock, FileText, Flame,
	Layers, NotebookPen, Pill, Plus, Replace, Search, Sparkles, UtensilsCrossed, X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import Badge from '@/components/atoms/GmBadge';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { EmptyBlock, ErrorBox, RowSkeleton } from '@/components/atoms/GmStates';
import { ConfirmRemove, DragHandle, ICON_BTN, RemoveButton, SortableList, useSortableRow } from '@/components/atoms/GmSortable';
import {
	FIELD_BG, FIELD_ERROR, FIELD_SHELL, MINI_LABEL, GmListEditor, GmSection, GmTextarea, MiniField, fromListRows, toListRows,
} from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import useDebounced from '@/hooks/useDebounced';
import {
	DAY_KEYS, UNITS, aiMealsToForm, blankAlternative, blankItem, blankMeal, blankSupplement, buildAiPrompt, buildPlanSchema,
	formToPayload, getErr, mealKcal, mealsKcal, parseAiPlan, planToFormValues, toDecimalInput,
} from './mealPlanModel';

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
	const current = unit.field.value || 'g';
	const error = Boolean(qty.fieldState.error);

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
				className='w-full min-w-0 bg-transparent font-en text-[12.5px] font-semibold tabular-nums text-(--gm-ink) outline-none'
			/>
			<span role='group' aria-label={t('form.unit')} className='flex shrink-0 gap-0.5 rounded-xl p-0.5' style={{ background: 'color-mix(in srgb, var(--color-primary-100) 60%, transparent)' }}>
				{UNITS.map(u => {
					const on = current === u;
					return (
						<button
							key={u}
							type='button'
							aria-pressed={on}
							onClick={() => unit.field.onChange(u)}
							className={`h-6 rounded-[6px] px-1.5 text-[10.5px] font-bold transition-colors ${on ? 'bg-(--gm-paper) text-(--color-primary-700) shadow-sm' : 'gm-muted hover:text-(--color-primary-600)'}`}
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
const ROW_CLASS = 'rounded-[14px] border p-1.5 pe-2 transition-[box-shadow,border-color]';
const rowStyle = (row, extra) => ({
	...row.style,
	borderColor: row.isDragging ? 'var(--color-primary-300)' : 'var(--gm-line)',
	background: 'color-mix(in srgb, var(--gm-paper) 80%, transparent)',
	...extra,
});

const ItemRow = memo(function ItemRow({ id, control, path, index, onRemove, setValue, t }) {
	const row = useSortableRow(id);
	const type = useWatch({ control, name: `${path}.type` });
	const alts = useFieldArray({ control, name: `${path}.alternatives` });

	return (
		<div ref={row.ref} style={rowStyle(row)} className={`${ROW_CLASS} ${row.isDragging ? 'opacity-80 shadow-lg' : 'hover:border-[color-mix(in_srgb,var(--color-primary-400)_35%,transparent)]'}`}>
			<div className='flex flex-wrap items-center gap-1.5 lg:flex-nowrap'>
				<DragHandle handle={row.handle} label={t('builder.drag_handle')} />
				<Controller
					name={`${path}.name`}
					control={control}
					render={({ field, fieldState }) => (
						<MiniField
							className='min-w-0 flex-1 basis-[calc(100%-6rem)] lg:basis-auto'
							label={t('form.item_name')}
							value={field.value}
							error={Boolean(fieldState.error)}
							onChange={v => {
								field.onChange(v);
								if (String(v).trim().toLowerCase().includes('egg')) setValue(`${path}.unit`, 'count', { shouldDirty: true });
							}}
							onBlur={field.onBlur}
						/>
					)}
				/>
				{type === 'recipe' && (
					<span className='hidden lg:inline-flex'>
						<Badge color='blue' icon={<ChefHat className='size-3' />}>{t('recipes.label')}</Badge>
					</span>
				)}
				<div className='order-last grid w-full grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-1.5 ps-7 lg:order-0 lg:flex lg:w-auto lg:ps-0'>
					<QtyUnitControl control={control} path={path} t={t} className='lg:w-[172px]' />
					<KcalControl control={control} path={path} t={t} className='lg:w-[104px]' />
				</div>
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

			<FieldErrors control={control} paths={[`${path}.name`, `${path}.calories`, `${path}.quantity`]} />

			{alts.fields.length > 0 && (
				<div className='ms-7 mt-2 space-y-1.5 border-s-2 ps-3' style={{ borderColor: 'color-mix(in srgb, var(--gm-warn) 45%, transparent)' }}>
					<p className='flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide' style={{ color: 'var(--gm-warn)' }}>
						<Replace className='size-3' />
						{t('form.alternative_item')}
					</p>
					{alts.fields.map((a, ai) => (
						<div key={a.id} className='flex flex-wrap items-center gap-1.5 lg:flex-nowrap'>
							<Controller
								name={`${path}.alternatives.${ai}.name`}
								control={control}
								render={({ field }) => (
									<MiniField className='min-w-0 flex-1 basis-[calc(100%-3rem)] lg:basis-auto' label={t('form.item_name')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
								)}
							/>
							<div className='order-last grid w-full grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-1.5 lg:order-0 lg:flex lg:w-auto'>
								<QtyUnitControl control={control} path={`${path}.alternatives.${ai}`} t={t} className='lg:w-[172px]' />
								<KcalControl control={control} path={`${path}.alternatives.${ai}`} t={t} className='lg:w-[104px]' />
							</div>
							<RemoveButton onClick={() => alts.remove(ai)} label={t('btn.remove_alternative')} />
						</div>
					))}
				</div>
			)}
		</div>
	);
});

const SupplementRow = memo(function SupplementRow({ id, control, path, index, onRemove, t }) {
	const row = useSortableRow(id);
	return (
		<div ref={row.ref} style={rowStyle(row)} className={`${ROW_CLASS} ${row.isDragging ? 'opacity-80 shadow-lg' : ''}`}>
			<div className='flex flex-wrap items-center gap-1.5 lg:flex-nowrap'>
				<DragHandle handle={row.handle} label={t('builder.drag_handle')} />
				<span className='grid size-7 shrink-0 place-items-center rounded-[9px]' style={{ color: 'var(--color-secondary-600)', background: 'color-mix(in srgb, var(--color-secondary-500) 12%, transparent)' }}>
					<Pill className='size-3.5' />
				</span>
				<Controller
					name={`${path}.name`}
					control={control}
					render={({ field, fieldState }) => (
						<MiniField className='min-w-0 flex-1 basis-[calc(100%-8rem)] lg:basis-auto' label={t('form.supplement_name')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
					)}
				/>
				<div className='order-last grid w-full grid-cols-2 gap-1.5 ps-7 lg:order-0 lg:flex lg:w-auto lg:ps-0'>
					<Controller
						name={`${path}.time`}
						control={control}
						render={({ field, fieldState }) => (
							<TimeField className='lg:w-[120px]' label={t('details.time')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
						)}
					/>
					<Controller
						name={`${path}.bestWith`}
						control={control}
						render={({ field }) => (
							<MiniField className='lg:w-[180px]' label={t('form.best_with')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
						)}
					/>
				</div>
				<RemoveButton onClick={() => onRemove(index)} label={t('btn.remove_supplement')} />
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
function AddChip({ icon: Icon, label, onClick, active = false }) {
	return (
		<button
			type='button'
			onClick={onClick}
			aria-pressed={active}
			className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-dashed px-2.5 text-[12px] font-semibold transition-colors ${active ? 'border-(--color-primary-400) text-(--color-primary-700)' : 'border-(--gm-line) gm-muted hover:border-(--color-primary-300) hover:text-(--color-primary-600)'}`}
		>
			<Plus className='size-3.5' />
			<Icon className='size-3.5' />
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
		<div className='space-y-3'>
			{items.fields.length > 0 && (
				<SortableList ids={itemIds} onMove={items.move}>
					<div className='space-y-1.5'>
						{items.fields.map((f, i) => (
							<ItemRow key={f.id} id={f.id} control={control} path={`${basePath}.items.${i}`} index={i} onRemove={items.remove} setValue={setValue} t={t} />
						))}
					</div>
				</SortableList>
			)}

			{itemsError && (
				<p className='flex items-center gap-1.5 text-[12px] font-medium text-(--gm-danger)'>
					<AlertCircle className='size-3.5' />
					{itemsError}
				</p>
			)}

			{supps.fields.length > 0 && (
				<div className='space-y-1.5'>
					<p className='flex items-center gap-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide gm-muted'>
						<Pill className='size-3' />
						{t('details.supplements')}
					</p>
					<SortableList ids={suppIds} onMove={supps.move}>
						<div className='space-y-1.5'>
							{supps.fields.map((f, i) => (
								<SupplementRow key={f.id} id={f.id} control={control} path={`${basePath}.supplements.${i}`} index={i} onRemove={supps.remove} t={t} />
							))}
						</div>
					</SortableList>
				</div>
			)}

			<div className='flex flex-wrap gap-2'>
				<AddChip icon={UtensilsCrossed} label={t('btn.add_item')} onClick={() => items.append(blankItem())} />
				<AddChip icon={ChefHat} label={t('btn.add_recipe')} active={recipesOpen} onClick={() => setRecipesOpen(o => !o)} />
				<AddChip icon={Pill} label={t('btn.add_supplement')} onClick={() => supps.append(blankSupplement())} />
			</div>

			<AnimatePresence>
				{recipesOpen && <RecipePanel onPick={pickRecipe} onClose={closeRecipes} t={t} />}
			</AnimatePresence>
		</div>
	);
});

function MealStats({ control, path, t }) {
	const items = useWatch({ control, name: `${path}.items` });
	return (
		<span className='gm-plan__chip font-en tabular-nums'>
			<Flame className='size-3' />
			{fmtNum(mealKcal({ items }))} {t('form.kcal_short')}
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
		<div
			ref={row.ref}
			style={{
				...row.style,
				borderColor: row.isDragging ? 'var(--color-primary-300)' : hasError ? 'color-mix(in srgb, var(--gm-danger) 40%, transparent)' : 'var(--gm-line)',
				background: 'color-mix(in srgb, var(--gm-paper) 52%, transparent)',
			}}
			className={`rounded-2xl border transition-shadow ${row.isDragging ? 'shadow-xl' : ''}`}
		>
			<header className={`flex flex-wrap items-center gap-2 px-2 py-2.5 sm:px-3 ${expanded ? 'border-b border-(--gm-line)' : ''}`}>
				<DragHandle handle={row.handle} label={t('builder.drag_handle')} />
				<span className='grid size-7 shrink-0 place-items-center rounded-[9px] font-en text-[11px] font-bold text-white tabular-nums' style={GRADIENT}>
					{index + 1}
				</span>
				<Controller
					name={`${path}.title`}
					control={control}
					render={({ field, fieldState }) => (
						<MiniField className='min-w-0 flex-1 basis-[calc(100%-7rem)] sm:max-w-[260px] sm:basis-auto' label={t('form.meal_name')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
					)}
				/>
				<Controller
					name={`${path}.time`}
					control={control}
					render={({ field, fieldState }) => (
						<TimeField className='w-[124px] ms-8 sm:ms-0' label={t('details.time')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
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
			{expanded && (
				<div className='p-2.5 sm:p-3'>
					<MealBlocks control={control} basePath={path} setValue={setValue} t={t} />
				</div>
			)}
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
				className='flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed border-(--gm-line) px-4 py-6 text-center transition-colors hover:border-(--color-primary-300)'
			>
				<span className='gm-plan__icon size-9! rounded-[11px]!'><UtensilsCrossed className='size-4' /></span>
				<span className='text-[12.5px] font-semibold gm-ink-soft'>{t('empty.no_meals_hint')}</span>
			</button>
		);
	}
	return (
		<SortableList ids={ids} onMove={move}>
			<div className='space-y-3'>
				{fields.map((f, i) => (
					<MealCard key={f.id} id={f.id} control={control} path={`${name}.${i}`} index={i} onRemove={remove} setValue={setValue} t={t} />
				))}
			</div>
		</SortableList>
	);
});

/* ─────────────────────────── Day overrides ─────────────────────────── */
function DayOverrideBlock({ dayKey, control, setValue, open, onToggle, t }) {
	const name = `dayOverrides.${dayKey}`;
	const { fields, append, remove, move } = useFieldArray({ control, name });
	const { errors } = useFormState({ control, name });
	const hasError = Boolean(errors?.dayOverrides?.[dayKey]);
	const expanded = open || hasError;
	const addMeal = () => append(blankMeal(t('form.meal_n', { n: fields.length + 1 })));

	return (
		<section
			className='overflow-hidden rounded-2xl border'
			style={{ borderColor: hasError ? 'color-mix(in srgb, var(--gm-danger) 40%, transparent)' : 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 40%, transparent)' }}
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
				{fields.length > 0 && <Badge color='primary' icon={<UtensilsCrossed className='size-3' />}>{t('form.meals_count', { count: fields.length })}</Badge>}
				<ChevronDown className={`size-4 shrink-0 gm-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
			</button>
			{expanded && (
				<div className='space-y-3 border-t border-(--gm-line) p-2.5 sm:p-3'>
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
function PlanSummary({ control, t }) {
	const meals = useWatch({ control, name: 'baseMeals' });
	const list = meals || [];
	const items = list.reduce((sum, m) => sum + (m?.items?.length || 0), 0);
	return (
		<div className='flex flex-wrap items-center gap-1.5'>
			<span className='gm-plan__chip font-en tabular-nums'><UtensilsCrossed className='size-3' />{t('form.meals_count', { count: list.length })}</span>
			<span className='gm-plan__chip font-en tabular-nums'><Layers className='size-3' />{t('form.items_count', { count: items })}</span>
			<span className='gm-plan__chip font-en tabular-nums text-(--color-primary-700)!'><Flame className='size-3' />{fmtNum(mealsKcal(list))} {t('form.kcal_per_day')}</span>
		</div>
	);
}

/* ─────────────────────────── Form ─────────────────────────── */
export function MealPlanForm({ initialPlan, onSubmitPayload, submitLabel, onCancel }) {
	const t = useTranslations('nutrition');
	const schema = useMemo(() => buildPlanSchema(t), [t]);
	const defaultTitle = t('form.meal_n', { n: 1 });
	const defaults = useMemo(() => planToFormValues(initialPlan, defaultTitle), [initialPlan, defaultTitle]);

	const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
		resolver: yupResolver(schema),
		defaultValues: defaults,
		mode: 'onBlur',
	});
	const base = useFieldArray({ control, name: 'baseMeals' });
	const customizeDays = useWatch({ control, name: 'customizeDays' });

	const [notes, setNotes] = useState(() => toListRows(defaults.notesList));
	const [openDays, setOpenDays] = useState({});
	const [aiOpen, setAiOpen] = useState(false);
	const [aiText, setAiText] = useState(() => t('ai.default_prompt'));
	const [aiLoading, setAiLoading] = useState(false);

	const noteLabels = useMemo(() => ({ add: t('notes.add'), remove: t('notes.remove'), empty: t('notes.empty') }), [t]);
	const onNotesField = useCallback((_, updater) => setNotes(prev => (typeof updater === 'function' ? updater(prev) : updater)), []);
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

	const onValid = async data => {
		await onSubmitPayload(formToPayload(data, fromListRows(notes)));
	};
	const onInvalid = () => Notification(t('validation.fix_errors'), 'error');

	const blockEnterSubmit = e => {
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
	};

	return (
		<form className='space-y-4' onSubmit={handleSubmit(onValid, onInvalid)} onKeyDown={blockEnterSubmit} noValidate>
			<GmSection icon={FileText} title={t('form.basics')}>
				<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
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
			</GmSection>

			<GmListEditor
				field='notes'
				rows={notes}
				onField={onNotesField}
				icon={NotebookPen}
				title={t('details.notes')}
				placeholder={t('notes.placeholder')}
				labels={noteLabels}
			/>

			<div className='space-y-3'>
				<div className='flex flex-wrap items-center justify-between gap-2 pt-1'>
					<div className='min-w-0'>
						<p className='flex items-center gap-2 text-[13px] font-bold gm-ink'>
							<span className='gm-plan__icon size-7! rounded-[9px]!'><UtensilsCrossed className='size-3.5' /></span>
							{t('form.base_day_title')}
							<span className='gm-plan__chip font-en tabular-nums'>{base.fields.length}</span>
						</p>
						<p className='mt-1 ps-9 text-[11.5px] gm-muted'>{t('form.base_day_hint')}</p>
					</div>
					<button type='button' onClick={addBaseMeal} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'>
						<Plus className='size-3.5' />
						{t('btn.add_meal')}
					</button>
				</div>

				<MealsEditor fields={base.fields} move={base.move} remove={base.remove} name='baseMeals' control={control} setValue={setValue} onAdd={addBaseMeal} t={t} />

				{baseError && (
					<p className='flex items-center gap-1.5 text-[12px] font-medium text-(--gm-danger)'>
						<AlertCircle className='size-3.5' />
						{baseError}
					</p>
				)}
			</div>

			<Controller
				name='customizeDays'
				control={control}
				render={({ field }) => (
					<div className='rounded-2xl border p-3 sm:p-3.5' style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 48%, transparent)' }}>
						<div className='flex items-center gap-3'>
							<span className='gm-plan__icon size-9! shrink-0 rounded-[11px]!'><CalendarCog className='size-4' /></span>
							<div className='min-w-0 flex-1'>
								<p className='text-[13px] font-bold gm-ink'>{t('form.customize_days')}</p>
								<p className='text-[11.5px] gm-muted'>{t('form.customize_days_hint')}</p>
							</div>
							<button
								type='button'
								role='switch'
								aria-checked={!!field.value}
								aria-label={t('form.customize_days')}
								onClick={() => field.onChange(!field.value)}
								className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary-300) ${field.value ? '' : 'bg-[color-mix(in_srgb,var(--color-primary-200)_70%,transparent)]'}`}
								style={field.value ? GRADIENT : undefined}
							>
								<span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-200 ${field.value ? 'start-[22px]' : 'start-0.5'}`} />
							</button>
						</div>
						<AnimatePresence initial={false}>
							{customizeDays && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
									className='overflow-hidden'
								>
									<div className='space-y-2 pt-3.5'>
										{DAY_KEYS.map(key => (
											<DayOverrideBlock key={key} dayKey={key} control={control} setValue={setValue} open={!!openDays[key]} onToggle={toggleDay} t={t} />
										))}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
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
						<GmSection
							icon={Sparkles}
							title={t('ai.title')}
							className='border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]!'
							action={(
								<button type='button' onClick={() => setAiOpen(false)} aria-label={t('btn.close')} className={`${ICON_BTN} hover:text-(--color-primary-600)`}>
									<X className='size-4' />
								</button>
							)}
						>
							<GmTextarea label={t('ai.prompt_label')} value={aiText} onChange={setAiText} rows={3} />
							<p className='mt-1.5 ps-1 text-[11px] gm-faint'>{t('ai.hint')}</p>
							<div className='mt-3 flex justify-end gap-2'>
								<Button color='neutral' name={t('btn.cancel')} onClick={() => setAiOpen(false)} disabled={aiLoading} />
								<Button color='primary' name={t('btn.generate')} onClick={runAi} loading={aiLoading} disabled={aiLoading || !aiText.trim()} icon={<Sparkles className='size-4' />} />
							</div>
						</GmSection>
					</motion.div>
				)}
			</AnimatePresence>

			<div
				className='sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t px-1 pb-1 pt-3 backdrop-blur-md'
				style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 90%, transparent)' }}
			>
				<div className='flex flex-wrap items-center gap-2'>
					<button
						type='button'
						onClick={() => setAiOpen(o => !o)}
						aria-pressed={aiOpen}
						className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'
					>
						<Sparkles className='size-3.5' />
						{t('btn.ai_assist')}
					</button>
					<PlanSummary control={control} t={t} />
				</div>
				<div className='flex flex-wrap items-center gap-2.5'>
					{onCancel && <Button color='neutral' name={t('btn.cancel')} onClick={onCancel} disabled={isSubmitting} />}
					<Button color='primary' type='submit' name={submitLabel} loading={isSubmitting} disabled={isSubmitting} />
				</div>
			</div>
		</form>
	);
}
