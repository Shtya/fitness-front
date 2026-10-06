'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Beef, Camera, ChefHat, Droplets, FileText, Flame, ImagePlus, Lightbulb, Link2, ListChecks, Soup,
	Tag, Utensils, Wheat, X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import GmToggleGroup from '@/components/atoms/GmToggleGroup';
import {
	NUMBER_INPUT, GmListEditor, GmSection, GmTextarea, fromListRows as fromRows, toListRows as toRows, useObjectUrl,
} from '@/components/atoms/GmFormParts';
import { DEFAULT_MEAL_TYPES, SATIETY_LEVELS, mealTypeLabel } from '@/lib/recipe-meta';

const numStr = v => (v === null || v === undefined || v === '' ? '' : String(v));

const MACROS = [
	{ key: 'protein', icon: Beef, color: 'var(--color-primary-500)' },
	{ key: 'carbs', icon: Wheat, color: 'var(--gm-warn)' },
	{ key: 'fat', icon: Droplets, color: 'var(--color-secondary-500)' },
];

const LIST_SECTIONS = [
	{ field: 'ingredients', icon: Utensils, title: 'sections.ingredients', placeholder: 'fields.ingredientPlaceholder' },
	{ field: 'creamIngredients', icon: Soup, title: 'sections.creamIngredients', placeholder: 'fields.ingredientPlaceholder' },
	{ field: 'sauceIngredients', icon: Soup, title: 'sections.sauceIngredients', placeholder: 'fields.ingredientPlaceholder' },
	{ field: 'directions', icon: ListChecks, title: 'sections.directions', placeholder: 'fields.stepPlaceholder', numbered: true },
];

const buildInitial = initial => ({
	title: initial?.title || '',
	satiety: initial?.satiety || 'medium',
	category: initial?.category || '',
	calories: numStr(initial?.calories),
	protein: numStr(initial?.protein),
	carbs: numStr(initial?.carbs),
	fat: numStr(initial?.fat),
	ingredients: toRows(initial?.ingredients, true),
	creamIngredients: toRows(initial?.creamIngredients),
	sauceIngredients: toRows(initial?.sauceIngredients),
	directions: toRows(initial?.directions, true),
	tips: initial?.tips || '',
	videoUrl: initial?.videoUrl || '',
});

/* ─────────────────────────── Photo picker ─────────────────────────── */
function PhotoPicker({ src, hasNewFile, onFile, onReset, t }) {
	const [dragging, setDragging] = useState(false);

	const pick = file => {
		if (file && file.type?.startsWith('image/')) onFile(file);
	};

	return (
		<div className='relative'>
			<label
				onDragOver={e => { e.preventDefault(); setDragging(true); }}
				onDragLeave={() => setDragging(false)}
				onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
				className={`group relative flex aspect-4/3 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-primary-400)_50%,transparent)] ${dragging ? 'border-(--color-primary-500)' : 'border-(--gm-line) hover:border-(--color-primary-400)'}`}
				style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}
			>
				{src ? (
					<>
						<img src={src} alt='' className='h-full w-full object-cover' />
						<span className='absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
							<Camera className='size-5' />
							<span className='text-[12px] font-semibold'>{t('changePhoto')}</span>
						</span>
					</>
				) : (
					<span className='flex flex-col items-center gap-2 px-4 text-center'>
						<span className='gm-plan__icon'><ImagePlus className='size-5' /></span>
						<span className='text-[12.5px] font-semibold gm-ink-soft'>{t('uploadPhoto')}</span>
						<span className='text-[11px] gm-faint'>{t('photoHint')}</span>
					</span>
				)}
				<input
					type='file'
					accept='image/*'
					aria-label={t('uploadPhoto')}
					className='sr-only'
					onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }}
				/>
			</label>
			{hasNewFile && (
				<button
					type='button'
					onClick={onReset}
					aria-label={t('resetPhoto')}
					title={t('resetPhoto')}
					className='absolute end-2 top-2 grid size-7 place-items-center rounded-[9px] border border-white/30 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60'
				>
					<X className='size-3.5' />
				</button>
			)}
		</div>
	);
}

/* ─────────────────────────── Macro preview ─────────────────────────── */
function MacroBar({ form, t }) {
	const values = MACROS.map(m => ({ ...m, grams: Math.max(0, Number(form[m.key]) || 0) }));
	const sum = values.reduce((a, m) => a + m.grams, 0);
	if (!sum) return null;

	return (
		<div className='mt-4 space-y-2'>
			<p className='text-[11.5px] font-semibold gm-muted'>{t('macroPreview')}</p>
			<div className='flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-(--gm-line)'>
				{values.map(m => (
					<span
						key={m.key}
						className='h-full rounded-full transition-[width] duration-300 ease-out'
						style={{ width: `${(m.grams / sum) * 100}%`, background: m.color }}
					/>
				))}
			</div>
			<div className='flex flex-wrap gap-x-4 gap-y-1'>
				{values.map(m => (
					<span key={m.key} className='inline-flex items-center gap-1.5 text-[11.5px] gm-ink-soft'>
						<span className='size-2 rounded-full' style={{ background: m.color }} />
						{t(`fields.${m.key}`)}
						<span className='font-en font-semibold tabular-nums' dir='ltr'>{Math.round((m.grams / sum) * 100)}%</span>
					</span>
				))}
			</div>
		</div>
	);
}

/* ─────────────────────────── Main form ─────────────────────────── */
export function RecipeForm({ initial, mealTypes = [], saving = false, onSubmit, onCancel }) {
	const t = useTranslations('recipeLibrary.slidePanel');
	const tLib = useTranslations('recipeLibrary');

	const [form, setForm] = useState(() => buildInitial(initial));
	const [imageFile, setImageFile] = useState(null);
	const [errors, setErrors] = useState({});
	const fileUrl = useObjectUrl(imageFile);

	useEffect(() => {
		setForm(buildInitial(initial));
		setImageFile(null);
		setErrors({});
	}, [initial]);

	const setField = useCallback((key, value) => {
		setForm(f => ({ ...f, [key]: typeof value === 'function' ? value(f[key]) : value }));
	}, []);

	const categoryOptions = useMemo(() => {
		const list = mealTypes.length ? mealTypes : DEFAULT_MEAL_TYPES;
		return list.map(type => ({ id: type, label: mealTypeLabel(type, tLib) }));
	}, [mealTypes, tLib]);

	const satietyOptions = useMemo(() => SATIETY_LEVELS.map(id => ({ id, label: t(`satietyOptions.${id}`) })), [t]);
	const listLabels = useMemo(() => ({ add: t('addItem'), remove: t('removeItem'), empty: t('emptyList') }), [t]);

	const numberField = key => v => setField(key, v === '' ? '' : String(Math.max(0, Number(v) || 0)));

	const submit = e => {
		e.preventDefault();
		const next = {};
		if (!form.title.trim()) next.title = t('validation.titleRequired');
		const video = form.videoUrl.trim();
		if (video && !/^https?:\/\//i.test(video)) next.videoUrl = t('validation.invalidUrl');
		setErrors(next);
		if (Object.keys(next).length) return;

		onSubmit?.({
			title: form.title.trim(),
			satiety: form.satiety,
			category: form.category,
			calories: form.calories,
			protein: form.protein,
			carbs: form.carbs,
			fat: form.fat,
			ingredients: fromRows(form.ingredients),
			creamIngredients: fromRows(form.creamIngredients),
			sauceIngredients: fromRows(form.sauceIngredients),
			directions: fromRows(form.directions),
			tips: form.tips,
			videoUrl: video,
			imageFile,
		});
	};

	return (
		<form onSubmit={submit} className='space-y-4' noValidate>
			<div className='grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,220px)_1fr]'>
				<PhotoPicker
					src={fileUrl || initial?.imageUrl || ''}
					hasNewFile={!!imageFile}
					onFile={setImageFile}
					onReset={() => setImageFile(null)}
					t={t}
				/>

				<div className='flex flex-col gap-4'>
					<FloatingInput
						name='title'
						required
						label={t('fields.recipeName')}
						value={form.title}
						onChange={v => { setField('title', v); if (errors.title) setErrors(p => ({ ...p, title: undefined })); }}
						error={errors.title}
						icon={<ChefHat className='size-4' />}
					/>
					<FloatingSelect
						creatable
						createPlaceholder={t('createCategory')}
						label={t('fields.category')}
						options={categoryOptions}
						value={form.category}
						onChange={v => setField('category', v ?? '')}
						icon={<Tag className='size-4' />}
					/>
					<GmToggleGroup
						label={t('fields.satiety')}
						options={satietyOptions}
						value={form.satiety}
						onChange={v => setField('satiety', v)}
					/>
				</div>
			</div>

			<GmSection icon={Flame} title={t('sections.nutrition')}>
				<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
					<FloatingInput
						type='number'
						inputMode='decimal'
						label={t('fields.calories')}
						value={form.calories}
						onChange={numberField('calories')}
						icon={<Flame className='size-4' />}
						inputClassName={NUMBER_INPUT}
						suffix={<span className='pe-1 text-[11px] font-semibold gm-faint'>{t('fields.kcal')}</span>}
					/>
					{MACROS.map(({ key, icon: Icon, color }) => (
						<FloatingInput
							key={key}
							type='number'
							inputMode='decimal'
							label={t(`fields.${key}`)}
							value={form[key]}
							onChange={numberField(key)}
							icon={<Icon className='size-4' style={{ color }} />}
							inputClassName={NUMBER_INPUT}
							suffix={<span className='pe-1 text-[11px] font-semibold gm-faint'>{t('fields.gramsShort')}</span>}
						/>
					))}
				</div>
				<MacroBar form={form} t={t} />
			</GmSection>

			{LIST_SECTIONS.map(s => (
				<GmListEditor
					key={s.field}
					field={s.field}
					rows={form[s.field]}
					onField={setField}
					icon={s.icon}
					title={t(s.title)}
					placeholder={t(s.placeholder)}
					numbered={s.numbered}
					labels={listLabels}
				/>
			))}

			<GmSection icon={Lightbulb} title={t('sections.tips')}>
				<GmTextarea
					label={t('sections.tips')}
					placeholder={t('fields.tipsPlaceholder')}
					value={form.tips}
					onChange={v => setField('tips', v)}
					rows={3}
				/>
			</GmSection>

			<GmSection icon={Link2} title={t('sections.video')}>
				<FloatingInput
					type='url'
					inputMode='url'
					label={t('fields.videoPlaceholder')}
					value={form.videoUrl}
					onChange={v => { setField('videoUrl', v); if (errors.videoUrl) setErrors(p => ({ ...p, videoUrl: undefined })); }}
					error={errors.videoUrl}
					icon={<Link2 className='size-4' />}
				/>
			</GmSection>

			<div className='gm-modal-foot justify-between!'>
				<p className='flex items-center gap-1.5 text-[11.5px] gm-faint'>
					<FileText className='size-3.5' />
					{t('enterHint')}
				</p>
				<div className='flex flex-wrap items-center gap-2.5'>
					{onCancel && <Button color='neutral' name={t('cancel')} onClick={onCancel} disabled={saving} />}
					<Button
						color='primary'
						type='submit'
						name={saving ? t('saving') : initial ? t('save') : t('add')}
						loading={saving}
						disabled={saving}
					/>
				</div>
			</div>
		</form>
	);
}
