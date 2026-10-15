'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Database, Save, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import { FIELD_BG, FIELD_SHELL, MINI_LABEL, MiniField } from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import { FOOD_CATEGORIES } from '@/lib/food-nutrition';
import { toDecimalInput } from '@/components/pages/dashboard/nutrition/mealPlanModel';

const NUMERIC_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'pieceGrams'];
const REQUIRED_KEYS = ['kcal', 'protein', 'carbs', 'fat'];
const PER_100_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
const ARABIC = /[\u0600-\u06FF]/;

const toText = v => (v == null ? '' : String(v));
const numOrNull = v => (String(v ?? '').trim() === '' ? null : Number(v));

export function emptyFoodDraft(name = '') {
	const text = String(name || '').trim();
	return {
		nameAr: ARABIC.test(text) ? text : '',
		nameEn: ARABIC.test(text) ? '' : text,
		aliases: '',
		brand: '',
		category: 'other',
		baseUnit: 'g',
		kcal: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '',
		pieceGrams: '', pieceLabelAr: '', pieceLabelEn: '',
	};
}

export function foodToDraft(food) {
	const draft = emptyFoodDraft();
	for (const key of Object.keys(draft)) draft[key] = toText(food?.[key] ?? draft[key]);
	return draft;
}

export function draftToPayload(draft) {
	const text = v => String(v ?? '').trim();
	const payload = {
		nameAr: text(draft.nameAr),
		nameEn: text(draft.nameEn),
		aliases: text(draft.aliases),
		brand: text(draft.brand),
		category: draft.category || 'other',
		baseUnit: draft.baseUnit === 'ml' ? 'ml' : 'g',
		pieceLabelAr: text(draft.pieceLabelAr),
		pieceLabelEn: text(draft.pieceLabelEn),
	};
	for (const key of NUMERIC_KEYS) payload[key] = numOrNull(draft[key]);
	return payload;
}

/** Atwater estimate (4/4/9) used to catch typos in the calories field. */
export const estimateKcal = draft => {
	const p = Number(draft.protein) || 0;
	const c = Number(draft.carbs) || 0;
	const f = Number(draft.fat) || 0;
	return Math.round(p * 4 + c * 4 + f * 9);
};

export function validateFoodDraft(draft, t) {
	const errors = {};
	if (!String(draft.nameAr).trim() && !String(draft.nameEn).trim()) errors.name = t('form.errors.name');
	for (const key of REQUIRED_KEYS) {
		if (String(draft[key] ?? '').trim() === '') errors[key] = t('form.errors.required');
	}
	const macros = (Number(draft.protein) || 0) + (Number(draft.carbs) || 0) + (Number(draft.fat) || 0);
	if (macros > 100.5) errors.macros = t('form.errors.macros_over_100');
	return errors;
}

function UnitToggle({ value, onChange, t }) {
	return (
		<span role='group' aria-label={t('form.base_unit')} className='flex shrink-0 gap-0.5 rounded-xl p-0.5' style={{ background: 'color-mix(in srgb, var(--color-primary-100) 60%, transparent)' }}>
			{['g', 'ml'].map(u => (
				<button
					key={u}
					type='button'
					aria-pressed={value === u}
					onClick={() => onChange(u)}
					className={`h-7 rounded-[8px] px-2.5 text-[11.5px] font-bold transition-colors ${value === u ? 'bg-(--gm-paper) text-(--color-primary-700) shadow-sm' : 'gm-muted hover:text-(--color-primary-600)'}`}
				>
					{t(`form.per_100_${u}`)}
				</button>
			))}
		</span>
	);
}

/** Field grid shared by the quick-add panel and the foods library modal. */
export function FoodFields({ draft, onChange, errors = {}, compact = false }) {
	const t = useTranslations('foods');
	const set = key => v => onChange(key, NUMERIC_KEYS.includes(key) ? toDecimalInput(v) : v);
	const estimate = estimateKcal(draft);
	const kcal = Number(draft.kcal) || 0;
	const hasMacros = ['protein', 'carbs', 'fat'].some(k => String(draft[k]).trim() !== '');
	const kcalOff = hasMacros && kcal > 0 && estimate > 0 && Math.abs(kcal - estimate) / Math.max(kcal, estimate) > 0.25;
	const unitLabel = t(`form.unit_${draft.baseUnit === 'ml' ? 'ml' : 'g'}`);

	return (
		<div className='space-y-3'>
			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
				<MiniField label={t('form.name_ar')} value={draft.nameAr} onChange={set('nameAr')} error={Boolean(errors.name)} />
				<MiniField label={t('form.name_en')} value={draft.nameEn} onChange={set('nameEn')} error={Boolean(errors.name)} />
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<label className={`relative flex h-9 min-w-[180px] flex-1 items-center px-2.5 ${FIELD_SHELL}`} style={FIELD_BG}>
					<span className={MINI_LABEL}>{t('form.category')}</span>
					<select
						value={draft.category}
						onChange={e => onChange('category', e.target.value)}
						className='w-full min-w-0 bg-transparent text-[12.5px] text-(--gm-ink) outline-none'
					>
						{FOOD_CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
					</select>
				</label>
				<UnitToggle value={draft.baseUnit} onChange={v => onChange('baseUnit', v)} t={t} />
			</div>

			<div>
				<p className='mb-2 text-[11.5px] font-semibold gm-muted'>{t('form.per_100_title', { unit: unitLabel })}</p>
				<div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6'>
					{PER_100_KEYS.map(key => (
						<MiniField
							key={key}
							numeric
							inputMode='decimal'
							label={`${t(`macros.${key}`)}${REQUIRED_KEYS.includes(key) ? ' *' : ''}`}
							suffix={key === 'kcal' ? t('macros.kcal_unit') : t('macros.g_unit')}
							value={draft[key]}
							onChange={set(key)}
							error={Boolean(errors[key] || (errors.macros && ['protein', 'carbs', 'fat'].includes(key)))}
						/>
					))}
				</div>
				{hasMacros && (
					<p className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] ${kcalOff ? 'font-semibold text-amber-600' : 'gm-muted'}`}>
						{kcalOff ? <AlertCircle className='size-3.5' /> : <Sparkles className='size-3.5' />}
						{t(kcalOff ? 'form.kcal_mismatch' : 'form.kcal_estimate', { kcal: estimate })}
						{(kcalOff || !kcal) && estimate > 0 && (
							<button type='button' onClick={() => onChange('kcal', String(estimate))} className='font-bold text-(--color-primary-600) underline-offset-2 hover:underline'>
								{t('form.use_estimate')}
							</button>
						)}
					</p>
				)}
			</div>

			<div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
				<MiniField numeric inputMode='decimal' label={t('form.piece_grams')} suffix={t('macros.g_unit')} value={draft.pieceGrams} onChange={set('pieceGrams')} />
				<MiniField label={t('form.piece_label_ar')} value={draft.pieceLabelAr} onChange={set('pieceLabelAr')} />
				<MiniField label={t('form.piece_label_en')} value={draft.pieceLabelEn} onChange={set('pieceLabelEn')} />
			</div>
			<p className='-mt-1.5 text-[11px] gm-faint'>{t('form.piece_hint')}</p>

			{!compact && (
				<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
					<MiniField label={t('form.aliases')} value={draft.aliases} onChange={set('aliases')} />
					<MiniField label={t('form.brand')} value={draft.brand} onChange={set('brand')} />
				</div>
			)}

			{(errors.name || errors.macros) && (
				<p className='flex items-center gap-1.5 text-[11.5px] font-medium text-(--gm-danger)'>
					<AlertCircle className='size-3.5 shrink-0' />
					{[errors.name, errors.macros].filter(Boolean).join(' · ')}
				</p>
			)}
		</div>
	);
}

/** Save handler shared by the quick panel and the library page. */
export async function saveFood(draft, id, extra) {
	const payload = { ...draftToPayload(draft), ...extra };
	const res = id ? await api.put(`/foods/${id}`, payload) : await api.post('/foods', payload);
	return res?.data;
}

/**
 * Inline "add new food" panel used inside the meal plan editor. It is not a nested
 * modal on purpose: Escape here must not close the plan modal behind it.
 */
export function QuickFoodPanel({ initialName, onCreated, onClose }) {
	const t = useTranslations('foods');
	const [draft, setDraft] = useState(() => emptyFoodDraft(initialName));
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const onKey = e => {
			if (e.key !== 'Escape') return;
			e.stopPropagation();
			onClose();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [onClose]);

	const onChange = (key, value) => {
		setDraft(d => ({ ...d, [key]: value }));
		if (Object.keys(errors).length) setErrors({});
	};

	const submit = async () => {
		const next = validateFoodDraft(draft, t);
		setErrors(next);
		if (Object.keys(next).length) return;
		setSaving(true);
		try {
			const food = await saveFood(draft);
			Notification(t('toasts.created'), 'success');
			onCreated(food);
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.save'), 'error');
		} finally {
			setSaving(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: -6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
			transition={{ duration: 0.18 }}
			className='mt-2 rounded-[14px] border p-3'
			style={{ borderColor: 'color-mix(in srgb, var(--color-primary-400) 35%, transparent)', background: 'color-mix(in srgb, var(--gm-paper) 88%, transparent)' }}
		>
			<div className='mb-3 flex items-center gap-2'>
				<span className='gm-plan__icon size-7! rounded-[9px]!'><Database className='size-3.5' /></span>
				<div className='min-w-0 flex-1'>
					<p className='text-[12.5px] font-bold gm-ink'>{t('quick.title')}</p>
					<p className='text-[11px] gm-muted'>{t('quick.hint')}</p>
				</div>
				<button type='button' onClick={onClose} aria-label={t('actions.close')} title={t('actions.close')} className='grid size-8 shrink-0 place-items-center rounded-[10px] border border-(--gm-line) gm-muted transition-colors hover:text-(--color-primary-600)'>
					<X className='size-4' />
				</button>
			</div>
			<FoodFields draft={draft} onChange={onChange} errors={errors} compact />
			<div className='mt-3 flex justify-end gap-2'>
				<Button color='neutral' name={t('actions.cancel')} onClick={onClose} disabled={saving} />
				<Button color='primary' name={t('quick.save_and_use')} onClick={submit} loading={saving} disabled={saving} icon={<Save className='size-4' />} />
			</div>
		</motion.div>
	);
}
