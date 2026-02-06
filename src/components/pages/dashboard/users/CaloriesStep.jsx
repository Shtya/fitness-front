'use client';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import { Flame, Beef, Wheat, Droplets, Activity, StickyNote, Sparkles } from 'lucide-react';

import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';
import Button from '@/components/atoms/Button';
import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import { useTranslations } from 'next-intl';

/* ---------- BMR / TDEE / Macros helpers ---------- */
const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return null;
  const s = gender === 'male' ? 5 : -161;
  return Math.round(10 * weight + 6.25 * height - 5 * age + s);
};

const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr) return null;
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
};

const calculateMacros = (calories) => {
  if (!calories) return { protein: '', carbs: '', fat: '', fiber: '' };
  return {
    protein: Math.round((calories * 0.30) / 4),
    carbs:   Math.round((calories * 0.40) / 4),
    fat:     Math.round((calories * 0.30) / 9),
    fiber:   Math.round(calories / 80),
  };
};

/* ---------- Validation ---------- */
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
  activityLevel: yup.string().oneOf(['sedentary', 'light', 'moderate', 'active', 'athlete']).required('calories.errors.activityRequired'),
  notes: yup.string().max(1000, 'calories.errors.notesMax').nullable().transform(v => (v === '' ? null : v)),
});

/* ---------- Shared themed input focus/blur helpers ---------- */
const applyFocus = (el) => {
  if (!el) return;
  el.style.borderColor = 'var(--color-primary-500)';
  el.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 15%, transparent)';
};
const removeFocus = (el, hasError) => {
  if (!el) return;
  el.style.borderColor = hasError ? '#fca5a5' : '#cbd5e1';
  el.style.boxShadow = 'none';
};

/* ========================= COMPONENT ========================= */
export default function CaloriesStep({ userId, initialValues = {}, onBack, onNext }) {
  const t = useTranslations('users');

  const smartDefaults = () => {
    const bmr = calculateBMR(70, 180, 25, 'male');
    const tdee = calculateTDEE(bmr, 'moderate');
    const macros = calculateMacros(tdee);
    return {
      caloriesTarget: tdee || 2200,
      proteinPerDay: macros.protein || 165,
      carbsPerDay: macros.carbs || 220,
      fatsPerDay: macros.fat || 73,
      FiberTarget: macros.fiber || 28,
    };
  };

  const defaults = smartDefaults();

  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(caloriesSchema),
    mode: 'onBlur',
    defaultValues: {
      caloriesTarget: initialValues.caloriesTarget ?? defaults.caloriesTarget,
      proteinPerDay:  initialValues.proteinPerDay  ?? defaults.proteinPerDay,
      carbsPerDay:    initialValues.carbsPerDay    ?? defaults.carbsPerDay,
      fatsPerDay:     initialValues.fatsPerDay     ?? defaults.fatsPerDay,
      FiberTarget:    initialValues.FiberTarget    ?? defaults.FiberTarget,
      activityLevel:  initialValues.activityLevel  ?? 'moderate',
      notes:          initialValues.notes          ?? '',
    },
  });

  const caloriesTarget = watch('caloriesTarget');

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
        proteinPerDay:  data.proteinPerDay  ?? undefined,
        carbsPerDay:    data.carbsPerDay    ?? undefined,
        fatsPerDay:     data.fatsPerDay     ?? undefined,
        FiberTarget:    data.FiberTarget    ?? undefined,
        activityLevel:  data.activityLevel,
        notes:          data.notes          ?? undefined,
      });
      Notification(t('alerts.saveCaloriesSuccess'), 'success');
      onNext?.();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.saveCaloriesFailed'), 'error');
    }
  };

  /* ---------- Macro card config ---------- */
  const macroCards = [
    { name: 'proteinPerDay', icon: Beef,     iconColor: '#ef4444', label: t('calories.protein'), placeholder: '150', unit: 'g' },
    { name: 'carbsPerDay',   icon: Wheat,    iconColor: '#f59e0b', label: t('calories.carbs'),   placeholder: '200', unit: 'g' },
    { name: 'fatsPerDay',    icon: Droplets, iconColor: '#3b82f6', label: t('calories.fat'),     placeholder: '60',  unit: 'g' },
    { name: 'FiberTarget',   icon: Wheat,    iconColor: '#22c55e', label: t('calories.fiber') || 'Fiber', placeholder: '28', unit: 'g' },
  ];

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='space-y-6'
      onSubmit={handleSubmit(onSubmit)}
    >

      {/* ===== CALORIES TARGET ===== */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <label className='text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
            {t('calories.calories')}
          </label>
          {/* Auto-fill macros button */}
          <button
            type='button'
            onClick={autoFillMacros}
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200'
          >
            <Sparkles className='w-3 h-3' style={{ color: 'var(--color-primary-500)' }} />
            {t('calories.autoFill') || 'Auto-fill macros'}
          </button>
        </div>

        <Controller
          name='caloriesTarget'
          control={control}
          render={({ field }) => (
            <div className='relative'>
              <Flame className='absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none' style={{ width: '18px', height: '18px' }} />
              <input
                type='number'
                {...field}
                placeholder={t('placeholders.calories') || '2200'}
                className='bg-white h-[48px] w-full rounded-xl ltr:pl-10 rtl:pr-10 ltr:pr-16 rtl:pl-16 text-sm font-semibold border transition-all duration-200 outline-none'
                style={{ borderColor: errors.caloriesTarget ? '#fca5a5' : '#cbd5e1' }}
                onFocus={e => applyFocus(e.target)}
                onBlur={e => removeFocus(e.target, !!errors.caloriesTarget)}
              />
              <span className='absolute rtl:left-3.5 ltr:right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md'>
                kcal
              </span>
              {errors.caloriesTarget?.message && (
                <p className='mt-1.5 text-xs text-rose-500'>{t(errors.caloriesTarget.message)}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* ===== MACROS GRID ===== */}
      <div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {macroCards.map(card => {
            const Icon = card.icon;
            return (
              <Controller
                key={card.name}
                name={card.name}
                control={control}
                render={({ field }) => (
                  <div className='space-y-1.5'>
                    {/* Label */}
                    <div className='flex items-center gap-1.5'>
                      <Icon className='w-3.5 h-3.5' style={{ color: card.iconColor }} />
                      <span className='font-semibold text-slate-500 tracking-wide uppercase' style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        {card.label}
                      </span>
                    </div>
                    {/* Input */}
                    <div className='relative'>
                      <input
                        type='number'
                        {...field}
                        placeholder={card.placeholder}
                        className='bg-white h-[44px] w-full rounded-xl ltr:pl-3 rtl:pr-3 ltr:pr-10 rtl:pl-10 text-sm font-semibold border transition-all duration-200 outline-none'
                        style={{ borderColor: errors[card.name] ? '#fca5a5' : '#cbd5e1' }}
                        onFocus={e => applyFocus(e.target)}
                        onBlur={e => removeFocus(e.target, !!errors[card.name])}
                      />
                      <span className='absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold'>
                        {card.unit}
                      </span>
                    </div>
                    {errors[card.name]?.message && (
                      <p className='text-xs text-rose-500'>{t(errors[card.name].message)}</p>
                    )}
                  </div>
                )}
              />
            );
          })}
        </div>
      </div>

      {/* ===== ACTIVITY LEVEL ===== */}
      <Controller
        name='activityLevel'
        control={control}
        render={({ field }) => (
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Activity className='w-4 h-4 text-slate-500' />
              <label className='text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
                {t('calories.activity')}
              </label>
            </div>
            <Select
              searchable={false}
              clearable={false}
              options={[
                { id: 'sedentary', label: t('calories.level.sedentary') },
                { id: 'light',     label: t('calories.level.light') },
                { id: 'moderate',  label: t('calories.level.moderate') },
                { id: 'active',    label: t('calories.level.active') },
                { id: 'athlete',   label: t('calories.level.athlete') },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={errors.activityLevel?.message ? t(errors.activityLevel.message) : ''}
            />
          </div>
        )}
      />

      {/* ===== NOTES ===== */}
      <Controller
        name='notes'
        control={control}
        render={({ field }) => (
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <StickyNote className='w-4 h-4 text-slate-500' />
              <label className='text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
                {t('calories.notes')}
              </label>
            </div>
            <textarea
              {...field}
              rows={3}
              placeholder={t('calories.notesPh') || 'Add any dietary preferences, allergies, or notes...'}
              className='bg-white w-full rounded-xl px-3.5 py-3 text-sm border transition-all duration-200 outline-none resize-none'
              style={{ borderColor: errors.notes ? '#fca5a5' : '#cbd5e1' }}
              onFocus={e => applyFocus(e.target)}
              onBlur={e => removeFocus(e.target, !!errors.notes)}
            />
            {errors.notes?.message && (
              <p className='text-xs text-rose-500'>{t(errors.notes.message)}</p>
            )}
          </div>
        )}
      />

      {/* ===== ACTIONS ===== */}
      <div className='flex justify-end gap-2.5 pt-5 border-t border-slate-100'>
        <Button color='neutral' type='button' name={t('common.back')} onClick={onBack} />
        <Button color='primary' type='submit' name={t('common.saveAndNext')} loading={isSubmitting} disabled={isSubmitting} />
      </div>
    </motion.form>
  );
}