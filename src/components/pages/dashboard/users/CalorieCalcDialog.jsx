'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import { ACTIVITY_MULTIPLIERS, targetsFromProfile } from '@/lib/calorie-engine';

const GOALS = [
	{ id: '-20', key: 'cut20' },
	{ id: '-10', key: 'cut10' },
	{ id: '0', key: 'keep' },
	{ id: '+10', key: 'bulk10' },
	{ id: '+20', key: 'bulk20' },
];

const EMPTY = { sex: 'male', age: '', height: '', weight: '', bodyFat: '', activity: '1.55', goal: '0' };
const MENU_Z = 1500000;

export default function CalorieCalcDialog({ open, initial, onClose, onSave }) {
	const t = useTranslations('users');
	const [form, setForm] = useState(EMPTY);
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);
	const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

	useEffect(() => {
		if (!open) return;
		setForm({ ...EMPTY, ...(initial || {}) });
		setName(initial?.name || '');
		setSaving(false);
	}, [open, initial]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			event.stopImmediatePropagation();
			const openMenu = document.querySelector('[aria-expanded="true"][aria-haspopup="listbox"]');
			if (openMenu) {
				openMenu.click();
				return;
			}
			onClose?.();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [open, onClose]);

	const targets = useMemo(() => targetsFromProfile(form), [form]);

	if (!open || typeof document === 'undefined') return null;

	const save = async () => {
		if (!targets || saving) return;
		setSaving(true);
		try {
			await onSave?.({ profile: form, targets, name: name.trim() });
		} finally {
			setSaving(false);
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-[1400000] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={onClose}>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={t('calories.calcTitle')}
				className="flex max-h-[min(88vh,760px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]"
				style={{ background: 'var(--gm-paper, #fff)', borderColor: 'var(--gm-line, rgba(15,23,42,0.08))', color: 'var(--gm-ink, #0b214d)' }}
				onMouseDown={event => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--gm-line, rgba(15,23,42,0.08))' }}>
					<div className="flex min-w-0 items-center gap-3">
						<span className="grid size-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}>
							<Calculator className="size-4" />
						</span>
						<div className="min-w-0">
							<h3 className="text-[15px] font-semibold">{t('calories.calcTitle')}</h3>
							<p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--gm-muted, #64748b)' }}>{t('calories.calcHint')}</p>
						</div>
					</div>
					<button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full" style={{ color: 'var(--gm-muted, #64748b)' }} aria-label={t('common.cancel')}>
						<X className="size-4" />
					</button>
				</div>

				<div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<FloatingInput label={t('calories.calcName')} value={name} onChange={setName} clearable={false} />
					</div>
					<FloatingSelect
						label={t('fields.gender')}
						value={form.sex}
						onChange={value => set('sex', value)}
						menuZIndex={MENU_Z}
						options={[
							{ id: 'male', label: t('gender.male') },
							{ id: 'female', label: t('gender.female') },
						]}
					/>
					<FloatingInput label={t('calories.age')} type="number" value={form.age} onChange={value => set('age', value)} clearable={false} />
					<FloatingInput label={t('calories.height')} type="number" value={form.height} onChange={value => set('height', value)} clearable={false} />
					<FloatingInput label={t('calories.weight')} type="number" value={form.weight} onChange={value => set('weight', value)} clearable={false} />
					<FloatingInput label={t('calories.bodyFat')} type="number" value={form.bodyFat} onChange={value => set('bodyFat', value)} clearable={false} />
					<FloatingSelect
						label={t('calories.activity')}
						value={form.activity}
						onChange={value => set('activity', value)}
						menuZIndex={MENU_Z}
						options={ACTIVITY_MULTIPLIERS.map(row => ({ id: row.id, label: t(`calories.level.${row.level}`) }))}
					/>
					<div className="sm:col-span-2">
						<FloatingSelect
							label={t('calories.goal')}
							value={form.goal}
							onChange={value => set('goal', value)}
							menuZIndex={MENU_Z}
							options={GOALS.map(goal => ({ id: goal.id, label: t(`calories.goals.${goal.key}`) }))}
						/>
					</div>
				</div>

				<div className="border-t px-5 py-4" style={{ borderColor: 'var(--gm-line, rgba(15,23,42,0.08))' }}>
					<div className="mb-3 rounded-2xl px-3 py-3 text-[13px]" style={{ background: 'color-mix(in srgb, var(--color-primary-500, #0d9488) 8%, transparent)' }}>
						{targets ? (
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{[
									[`${targets.caloriesTarget}`, 'kcal'],
									[`${targets.proteinPerDay}g`, t('calories.protein')],
									[`${targets.carbsPerDay}g`, t('calories.carbs')],
									[`${targets.fatsPerDay}g`, t('calories.fat')],
								].map(([value, label]) => (
									<div key={label} className="text-center">
										<div className="text-sm font-semibold">{value}</div>
										<div className="text-[11px]" style={{ color: 'var(--gm-muted, #64748b)' }}>{label}</div>
									</div>
								))}
							</div>
						) : t('calories.calcNeed')}
					</div>
					<div className="flex gap-2">
						<button type="button" onClick={onClose} className="h-11 flex-1 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--gm-line, rgba(15,23,42,0.12))' }}>{t('common.cancel')}</button>
						<button type="button" onClick={save} disabled={!targets || saving} className="gm-btn-primary h-11 flex-1 disabled:opacity-40">{t('calories.calcSave')}</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
