'use client';

import { useState } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import { MiniField } from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import { apiError, planLength } from './billing-utils';

function toPayload(draft) {
	const count = Math.round(Number(draft.count));
	const base = { name: draft.name.trim(), price: Number(draft.price), description: draft.description.trim() };
	return draft.unit === 'days'
		? { ...base, interval: 'one_time', intervalCount: 1, durationDays: count }
		: { ...base, interval: 'monthly', intervalCount: count, durationDays: null };
}

export default function PackageForm({ plan, onSaved, onCancel }) {
	const t = useTranslations('billing');
	const [draft, setDraft] = useState(() => {
		const length = planLength(plan);
		return {
			name: plan?.name || '',
			price: plan ? String(plan.price) : '',
			unit: length.unit,
			count: String(length.count),
			description: plan?.description || '',
		};
	});
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

	const set = (key, value) => {
		setDraft(d => ({ ...d, [key]: value }));
		if (Object.keys(errors).length) setErrors({});
	};

	const submit = async () => {
		const next = {};
		if (!draft.name.trim()) next.name = t('packages.errors.name');
		if (draft.price === '' || !(Number(draft.price) >= 0)) next.price = t('packages.errors.price');
		if (!(Math.round(Number(draft.count)) >= 1)) next.count = t('packages.errors.length');
		setErrors(next);
		if (Object.keys(next).length) return;

		setSaving(true);
		try {
			const payload = toPayload(draft);
			if (plan?.id) await api.patch(`/billing/plans/${plan.id}`, payload);
			else await api.post('/billing/plans', payload);
			Notification(t('toasts.planSaved'), 'success');
			onSaved();
		} catch (e) {
			Notification(apiError(e, t('errors.save')), 'error');
		} finally {
			setSaving(false);
		}
	};

	const errorText = [errors.name, errors.price, errors.count].filter(Boolean).join(' · ');

	return (
		<div className='space-y-4'>
			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
				<MiniField label={`${t('packages.name')} *`} value={draft.name} onChange={v => set('name', v)} error={Boolean(errors.name)} />
				<MiniField
					numeric
					inputMode='decimal'
					label={`${t('packages.price')} *`}
					suffix={t('currency')}
					value={draft.price}
					onChange={v => set('price', v.replace(/[^\d.]/g, ''))}
					error={Boolean(errors.price)}
				/>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<MiniField
					numeric
					inputMode='numeric'
					className='w-32'
					label={`${t('packages.length')} *`}
					value={draft.count}
					onChange={v => set('count', v.replace(/\D/g, ''))}
					error={Boolean(errors.count)}
				/>
				<span role='group' aria-label={t('packages.length')} className='flex gap-0.5 rounded-xl p-0.5' style={{ background: 'color-mix(in srgb, var(--color-primary-100) 60%, transparent)' }}>
					{['months', 'days'].map(unit => (
						<button
							key={unit}
							type='button'
							aria-pressed={draft.unit === unit}
							onClick={() => set('unit', unit)}
							className={`h-7 rounded-[8px] px-3 text-[11.5px] font-bold transition-colors ${draft.unit === unit ? 'bg-(--gm-paper) text-(--color-primary-700) shadow-sm' : 'gm-muted hover:text-(--color-primary-600)'}`}
						>
							{t(unit === 'months' ? 'packages.unitMonths' : 'packages.unitDays')}
						</button>
					))}
				</span>
			</div>

			<MiniField label={t('packages.description')} value={draft.description} onChange={v => set('description', v)} />

			{errorText && (
				<p className='flex items-center gap-1.5 text-[11.5px] font-medium text-(--gm-danger)'>
					<AlertCircle className='size-3.5 shrink-0' />
					{errorText}
				</p>
			)}

			<div className='gm-modal-foot'>
				<Button color='neutral' name={t('actions.cancel')} onClick={onCancel} disabled={saving} />
				<Button color='primary' name={t('actions.save')} onClick={submit} loading={saving} disabled={saving} icon={<Save className='size-4' />} />
			</div>
		</div>
	);
}
