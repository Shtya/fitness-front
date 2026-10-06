'use client';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import { Flame, Beef, Wheat, Droplets, Leaf, Sparkles } from 'lucide-react';

import FloatingInput from '@/components/atoms/FloatingInput';
import ToggleGroup from '@/components/atoms/GmToggleGroup';
import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import { useTranslations } from 'next-intl';

const calculateMacros = (calories) => {
	if (!calories) return { protein: '', carbs: '', fat: '', fiber: '' };
	return {
		protein: Math.round((calories * 0.30) / 4),
		carbs: Math.round((calories * 0.40) / 4),
		fat: Math.round((calories * 0.30) / 9),
		fiber: Math.round(calories / 80),
	};
};

const caloriesSchema = yup.object({
	caloriesTarget: yup.number().typeError('calories.errors.integer').integer('calories.errors.integer').positive('calories.errors.positive').nullable()
		.transform(v => (v === '' || v === null || v === undefined ? null : v)),
	proteinPerDay: yup.number().typeError('calories.errors.integer').integer('calories.errors.integer').min(0, 'calories.errors.notNegative').nullable()
		.transform(v => (v === '' || v === null || v === undefined ? null : v)),
	carbsPerDay: yup.number().typeError('calories.errors.integer').integer('calories.errors.integer').min(0, 'calories.errors.notNegative').nullable()
		.transform(v => (v === '' || v === null || v === undefined ? null : v)),
	fatsPerDay: yup.number().typeError('calories.errors.integer').integer('calories.errors.integer').min(0, 'calories.errors.notNegative').nullable()
		.transform(v => (v === '' || v === null || v === undefined ? null : v)),
	FiberTarget: yup.number().typeError('calories.errors.integer').integer('calories.errors.integer').min(0, 'calories.errors.notNegative').nullable()
		.transform(v => (v === '' || v === null || v === undefined ? null : v)),
	activityLevel: yup.string().oneOf(['sedentary', 'light', 'moderate', 'active', 'athlete']).nullable()
		.transform(v => (v === '' || v === undefined ? null : v)),
	notes: yup.string().max(1000, 'calories.errors.notesMax').nullable().transform(v => (v === '' ? null : v)),
});

export default function CaloriesStep({ userId, initialValues = {}, onBack, onNext }) {
	const t = useTranslations('users');

	const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
		resolver: yupResolver(caloriesSchema),
		mode: 'onBlur',
		defaultValues: {
			caloriesTarget: initialValues.caloriesTarget ?? '',
			proteinPerDay: initialValues.proteinPerDay ?? '',
			carbsPerDay: initialValues.carbsPerDay ?? '',
			fatsPerDay: initialValues.fatsPerDay ?? '',
			FiberTarget: initialValues.FiberTarget ?? '',
			activityLevel: initialValues.activityLevel ?? '',
			notes: initialValues.notes ?? '',
		},
	});

	const caloriesTarget = Number(watch('caloriesTarget') || 0);
	const protein = Number(watch('proteinPerDay') || 0);
	const carbs = Number(watch('carbsPerDay') || 0);
	const fat = Number(watch('fatsPerDay') || 0);
	const pk = protein * 4;
	const ck = carbs * 4;
	const fk = fat * 9;
	const fromMacros = Math.round(pk + ck + fk);
	const splitTotal = fromMacros || 1;

	const autoFillMacros = () => {
		const macros = calculateMacros(caloriesTarget);
		setValue('proteinPerDay', macros.protein);
		setValue('carbsPerDay', macros.carbs);
		setValue('fatsPerDay', macros.fat);
		setValue('FiberTarget', macros.fiber);
		Notification(t('alerts.macrosCalculated') || 'Macros calculated!', 'success');
	};

	const onSubmit = async (data) => {
		try {
			await api.put('/auth/profile', {
				id: userId,
				caloriesTarget: data.caloriesTarget ?? undefined,
				proteinPerDay: data.proteinPerDay ?? undefined,
				carbsPerDay: data.carbsPerDay ?? undefined,
				fatsPerDay: data.fatsPerDay ?? undefined,
				FiberTarget: data.FiberTarget ?? undefined,
				activityLevel: data.activityLevel,
				notes: data.notes ?? undefined,
			});
			Notification(t('alerts.saveCaloriesSuccess'), 'success');
			onNext?.();
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.saveCaloriesFailed'), 'error');
		}
	};

	const macroCards = [
		{ name: 'proteinPerDay', icon: Beef, color: '#ef4444', label: t('calories.protein'), unit: 'g' },
		{ name: 'carbsPerDay', icon: Wheat, color: '#f59e0b', label: t('calories.carbs'), unit: 'g' },
		{ name: 'fatsPerDay', icon: Droplets, color: '#3b82f6', label: t('calories.fat'), unit: 'g' },
		{ name: 'FiberTarget', icon: Leaf, color: '#22c55e', label: t('calories.fiber') || 'Fiber', unit: 'g' },
	];

	return (
		<motion.form
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className='space-y-4'
			onSubmit={handleSubmit(onSubmit)}
		>
			<p className='text-[12.5px] leading-relaxed gm-muted'>{t('wizard.fuelHint')}</p>

			<div className='gm-fuel'>
				<div className='gm-fuel__top'>
					<div className='gm-fuel__readout' aria-hidden={!caloriesTarget}>
						<div className='gm-fuel__num'>{caloriesTarget || '—'}</div>
						<div className='gm-fuel__unit'>{t('wizard.kcalDay')}</div>
					</div>
					<div className='gm-fuel__kcal'>
						<Controller
							name='caloriesTarget'
							control={control}
							render={({ field }) => (
								<FloatingInput
									label={t('calories.calories')}
									type='number'
									value={field.value ?? ''}
									onChange={field.onChange}
									error={errors.caloriesTarget?.message ? t(errors.caloriesTarget.message) : ''}
									icon={<Flame className='size-4' />}
									suffix={<span className='text-[11px] font-semibold gm-muted'>kcal</span>}
									clearable={false}
								/>
							)}
						/>
					</div>
					<button
						type='button'
						onClick={autoFillMacros}
						disabled={!caloriesTarget}
						className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-40'
					>
						<Sparkles className='size-3.5' />
						{t('calories.autoFill')}
					</button>
				</div>

				<div className='gm-fuel__split' aria-hidden>
					<span className='gm-fuel__seg' style={{ flexGrow: pk / splitTotal, background: '#ef4444' }} />
					<span className='gm-fuel__seg' style={{ flexGrow: ck / splitTotal, background: '#f59e0b' }} />
					<span className='gm-fuel__seg' style={{ flexGrow: fk / splitTotal, background: '#3b82f6' }} />
				</div>
				<div className='gm-fuel__legend'>
					<span><i className='gm-fuel__dot' style={{ background: '#ef4444' }} />{t('calories.protein')} {protein || 0}g</span>
					<span><i className='gm-fuel__dot' style={{ background: '#f59e0b' }} />{t('calories.carbs')} {carbs || 0}g</span>
					<span><i className='gm-fuel__dot' style={{ background: '#3b82f6' }} />{t('calories.fat')} {fat || 0}g</span>
					<span className='gm-faint'>
						{fromMacros > 0
							? t('wizard.fromMacros', { kcal: fromMacros })
							: t('wizard.splitHint')}
					</span>
				</div>
			</div>

			<div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
				{macroCards.map(card => {
					const Icon = card.icon;
					return (
						<Controller
							key={card.name}
							name={card.name}
							control={control}
							render={({ field }) => (
								<FloatingInput
									label={card.label}
									type='number'
									value={field.value ?? ''}
									onChange={field.onChange}
									error={errors[card.name]?.message ? t(errors[card.name].message) : ''}
									icon={<Icon className='size-3.5' style={{ color: card.color }} />}
									suffix={<span className='text-[11px] font-semibold gm-muted'>{card.unit}</span>}
									clearable={false}
								/>
							)}
						/>
					);
				})}
			</div>

			<Controller
				name='activityLevel'
				control={control}
				render={({ field }) => (
					<ToggleGroup
						label={t('calories.activity')}
						value={field.value}
						onChange={field.onChange}
						options={[
							{ id: 'sedentary', label: t('calories.level.sedentary') },
							{ id: 'light', label: t('calories.level.light') },
							{ id: 'moderate', label: t('calories.level.moderate') },
							{ id: 'active', label: t('calories.level.active') },
							{ id: 'athlete', label: t('calories.level.athlete') },
						]}
						error={errors.activityLevel?.message ? t(errors.activityLevel.message) : ''}
					/>
				)}
			/>

			<Controller
				name='notes'
				control={control}
				render={({ field }) => (
					<div className='relative'>
						<textarea
							{...field}
							rows={3}
							placeholder=' '
							className='peer w-full rounded-[11px] border bg-[color-mix(in_srgb,var(--gm-paper)_62%,transparent)] px-3.5 pb-3 pt-5 text-[13px] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]'
							style={{ borderColor: errors.notes ? '#fca5a5' : 'var(--gm-line)', color: 'var(--gm-ink)' }}
						/>
						<span className='pointer-events-none absolute start-3 top-0 -translate-y-1/2 rounded-md bg-(--gm-paper) px-1 text-[11px] font-medium gm-muted'>
							{t('calories.notes') || t('calories.notesPh')}
						</span>
						{errors.notes?.message && (
							<p className='mt-1 text-xs text-rose-500'>{t(errors.notes.message)}</p>
						)}
					</div>
				)}
			/>

			<div className='gm-modal-foot'>
				<button type='button' onClick={onBack} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>{t('common.back')}</button>
				<button type='button' onClick={onNext} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>{t('common.skip')}</button>
				<button type='submit' disabled={isSubmitting} className='gm-btn-primary disabled:opacity-50'>
					{t('common.saveAndNext')}
				</button>
			</div>
		</motion.form>
	);
}
