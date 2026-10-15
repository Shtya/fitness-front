'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CalendarCheck, Save, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import FloatingDate from '@/components/atoms/FloatingDate';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import { GmSwitch, MiniField } from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import { PAYMENT_METHODS, apiError, formatDate, formatMoney, periodEnd, suggestPeriod, todayYmd } from './billing-utils';
import 'flatpickr/dist/themes/airbnb.css';

function ChoiceChip({ active, onClick, children }) {
	return (
		<button
			type='button'
			aria-pressed={active}
			onClick={onClick}
			className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12px] font-semibold transition-colors ${active ? 'border-(--color-primary-500) text-(--color-primary-700)' : 'border-(--gm-line) gm-muted hover:text-(--color-primary-600)'}`}
			style={active ? { background: 'color-mix(in srgb, var(--color-primary-500) 10%, var(--gm-paper))' } : undefined}
		>
			{children}
		</button>
	);
}

function CurrentSubscription({ client, t, locale }) {
	if (!client) return null;
	const end = client.subscriptionEnd;
	const text = !end
		? t('form.currentNone')
		: client.subscriptionStatus === 'expired'
			? t('form.currentExpired', { date: formatDate(end, locale) })
			: t('form.current', { date: formatDate(end, locale) });
	return (
		<p className='flex items-center gap-1.5 text-[11.5px] gm-muted'>
			<CalendarCheck className='size-3.5 shrink-0' />
			{client.membership ? <strong className='font-semibold gm-ink-soft'>{client.membership}</strong> : null}
			{client.membership ? <span className='gm-faint'>·</span> : null}
			{text}
		</p>
	);
}

/** Records one received payment; optionally extends the client's subscription. */
export default function RecordPaymentForm({ clients, plans, initialClientId, onSaved, onCancel }) {
	const t = useTranslations('billing');
	const locale = useLocale();
	const [form, setForm] = useState(() => {
		const initialClient = clients.find(c => c.id === initialClientId);
		const period = suggestPeriod(null, initialClient?.subscriptionEnd);
		return {
			userId: initialClientId || null,
			planId: null,
			amount: '',
			method: 'cash',
			paidAt: todayYmd(),
			extend: true,
			periodFrom: period.start,
			periodTo: period.end,
			notes: '',
		};
	});
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

	const client = useMemo(() => clients.find(c => c.id === form.userId) || null, [clients, form.userId]);
	const plan = useMemo(() => plans.find(p => p.id === form.planId) || null, [plans, form.planId]);
	const clientOptions = useMemo(
		() => clients.map(c => ({ id: c.id, label: c.phone ? `${c.name} · ${c.phone}` : c.name })),
		[clients],
	);

	const set = (key, value) => {
		setForm(f => ({ ...f, [key]: value }));
		if (errors[key] || errors.period) setErrors({});
	};

	const applyPeriod = (nextPlan, nextClient, extend) => {
		if (!extend) return { periodFrom: '', periodTo: '' };
		const p = suggestPeriod(nextPlan, nextClient?.subscriptionEnd);
		return { periodFrom: p.start, periodTo: p.end };
	};

	const pickClient = id => {
		const next = clients.find(c => c.id === id) || null;
		setForm(f => ({ ...f, userId: id, ...applyPeriod(plan, next, f.extend) }));
		setErrors({});
	};

	const pickPlan = id => {
		const next = plans.find(p => p.id === id) || null;
		setForm(f => {
			const prevPrice = plan ? String(plan.price) : '';
			const amount = next && (f.amount === '' || f.amount === prevPrice) ? String(next.price) : f.amount;
			const extend = Boolean(next) || f.extend;
			return { ...f, planId: id, amount, extend, ...applyPeriod(next, client, extend) };
		});
		setErrors({});
	};

	const toggleExtend = on => {
		setForm(f => ({ ...f, extend: on, ...applyPeriod(plan, client, on) }));
		setErrors({});
	};

	const pickPeriodFrom = start => {
		if (!start) return;
		setForm(f => ({ ...f, periodFrom: start, periodTo: periodEnd(start, plan) }));
		setErrors({});
	};

	const validate = () => {
		const next = {};
		if (!form.userId) next.userId = t('form.errors.client');
		if (!(Number(form.amount) > 0)) next.amount = t('form.errors.amount');
		if (form.extend) {
			if (!form.periodFrom || !form.periodTo) next.period = t('form.errors.period');
			else if (form.periodTo < form.periodFrom) next.period = t('form.errors.periodOrder');
		}
		setErrors(next);
		return !Object.keys(next).length;
	};

	const submit = async () => {
		if (!validate()) return;
		setSaving(true);
		try {
			const payload = {
				userId: form.userId,
				amount: Number(form.amount),
				method: form.method,
				paidAt: form.paidAt || undefined,
				planId: form.planId || undefined,
				notes: form.notes.trim() || undefined,
			};
			if (form.extend) {
				payload.periodFrom = form.periodFrom;
				payload.periodTo = form.periodTo;
			}
			const { data } = await api.post('/billing/payments/record', payload);
			Notification(
				data?.periodTo ? t('toasts.recordedExtended', { date: formatDate(data.periodTo, locale) }) : t('toasts.recorded'),
				'success',
			);
			onSaved(data);
		} catch (e) {
			Notification(apiError(e, t('errors.save')), 'error');
		} finally {
			setSaving(false);
		}
	};

	const errorText = [errors.userId, errors.amount, errors.period].filter(Boolean).join(' · ');

	return (
		<div className='space-y-4'>
			<div className='space-y-1.5'>
				<FloatingSelect
					label={t('form.client')}
					required
					searchable
					icon={<User className='size-4' />}
					options={clientOptions}
					value={form.userId}
					onChange={pickClient}
					error={errors.userId}
				/>
				<CurrentSubscription client={client} t={t} locale={locale} />
			</div>

			<div>
				<p className='mb-2 text-[11.5px] font-semibold gm-muted'>{t('form.package')}</p>
				<div className='flex flex-wrap gap-2'>
					<ChoiceChip active={!form.planId} onClick={() => pickPlan(null)}>{t('form.noPackage')}</ChoiceChip>
					{plans.map(p => (
						<ChoiceChip key={p.id} active={form.planId === p.id} onClick={() => pickPlan(p.id)}>
							<span dir='auto'>{p.name}</span>
							<span className='font-en text-[11px] tabular-nums gm-faint'>{formatMoney(p.price)}</span>
						</ChoiceChip>
					))}
				</div>
				{!plans.length && <p className='mt-1.5 text-[11px] gm-faint'>{t('form.noPackagesHint')}</p>}
			</div>

			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
				<MiniField
					numeric
					inputMode='decimal'
					label={`${t('form.amount')} *`}
					suffix={t('currency')}
					value={form.amount}
					onChange={v => set('amount', v.replace(/[^\d.]/g, ''))}
					error={Boolean(errors.amount)}
				/>
				<FloatingDate
					size='sm'
					label={t('form.paidAt')}
					value={form.paidAt}
					maxDate={todayYmd()}
					onChange={v => v && set('paidAt', v)}
				/>
			</div>

			<div>
				<p className='mb-2 text-[11.5px] font-semibold gm-muted'>{t('form.method')}</p>
				<div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
					{PAYMENT_METHODS.map(({ id, icon: Icon }) => (
						<ChoiceChip key={id} active={form.method === id} onClick={() => set('method', id)}>
							<Icon className='size-4' />
							{t(`methods.${id}`)}
						</ChoiceChip>
					))}
				</div>
			</div>

			<div className='rounded-[14px] border border-(--gm-line) p-3'>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<div className='min-w-0'>
						<p className='text-[12.5px] font-bold gm-ink'>{t('form.extend')}</p>
						<p className='text-[11px] gm-muted'>{t('form.extendHint')}</p>
					</div>
					<GmSwitch checked={form.extend} onChange={toggleExtend} label={t('form.extend')} hideLabel />
				</div>
				{form.extend && (
					<div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'>
						<FloatingDate
							size='sm'
							label={t('form.from')}
							value={form.periodFrom}
							onChange={pickPeriodFrom}
							error={Boolean(errors.period)}
						/>
						<FloatingDate
							size='sm'
							label={t('form.to')}
							value={form.periodTo}
							minDate={form.periodFrom || undefined}
							onChange={v => v && set('periodTo', v)}
							error={Boolean(errors.period)}
						/>
						{form.periodTo && !errors.period ? (
							<p className='text-[11.5px] font-semibold text-(--gm-ok) sm:col-span-2'>
								{t('form.newEnd', { date: formatDate(form.periodTo, locale) })}
							</p>
						) : null}
					</div>
				)}
			</div>

			<MiniField label={t('form.notes')} value={form.notes} onChange={v => set('notes', v)} />

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
