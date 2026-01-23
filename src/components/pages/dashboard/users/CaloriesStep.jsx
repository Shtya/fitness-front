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

// Calculate BMR using Mifflin-St Jeor Equation
const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return null;
  
  // BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + s
  // s = +5 for males, -161 for females
  const s = gender === 'male' ? 5 : -161;
  return Math.round(10 * weight + 6.25 * height - 5 * age + s);
};

// Calculate TDEE (Total Daily Energy Expenditure)
const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr) return null;
  
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  };
  
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
};

// Calculate macros (simple ratio: 30% protein, 40% carbs, 30% fat)
const calculateMacros = (calories) => {
  if (!calories) return { protein: '', carbs: '', fat: '', fiber: '' };
  
  return {
    protein: Math.round((calories * 0.30) / 4), // 4 cal/g
    carbs: Math.round((calories * 0.40) / 4),   // 4 cal/g
    fat: Math.round((calories * 0.30) / 9),     // 9 cal/g
    fiber: Math.round(calories / 80),           // rough estimate: 25-35g for 2000 cal
  };
};

// YUP SCHEMA
const caloriesSchema = yup.object({
  caloriesTarget: yup
    .number()
    .typeError('calories.errors.integer')
    .integer('calories.errors.integer')
    .positive('calories.errors.positive')
    .nullable()
    .transform(v => (v === '' || v === null || v === undefined ? null : v)),

  proteinPerDay: yup
    .number()
    .typeError('calories.errors.integer')
    .integer('calories.errors.integer')
    .min(0, 'calories.errors.notNegative')
    .nullable()
    .transform(v => (v === '' || v === null || v === undefined ? null : v)),

  carbsPerDay: yup
    .number()
    .typeError('calories.errors.integer')
    .integer('calories.errors.integer')
    .min(0, 'calories.errors.notNegative')
    .nullable()
    .transform(v => (v === '' || v === null || v === undefined ? null : v)),

  fatsPerDay: yup
    .number()
    .typeError('calories.errors.integer')
    .integer('calories.errors.integer')
    .min(0, 'calories.errors.notNegative')
    .nullable()
    .transform(v => (v === '' || v === null || v === undefined ? null : v)),

  FiberTarget: yup
    .number()
    .typeError('calories.errors.integer')
    .integer('calories.errors.integer')
    .min(0, 'calories.errors.notNegative')
    .nullable()
    .transform(v => (v === '' || v === null || v === undefined ? null : v)),

  activityLevel: yup
    .string()
    .oneOf(['sedentary', 'light', 'moderate', 'active', 'athlete'])
    .required('calories.errors.activityRequired'),

  notes: yup
    .string()
    .max(1000, 'calories.errors.notesMax')
    .nullable()
    .transform(v => (v === '' ? null : v)),
});

export default function CaloriesStep({
  userId,
  initialValues = {},
  onBack,
  onNext,
}) {
  const t = useTranslations('users');

  // Calculate smart defaults for 25yr, 70kg, 180cm male
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

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(caloriesSchema),
    mode: 'onBlur',
    defaultValues: {
      caloriesTarget: initialValues.caloriesTarget ?? defaults.caloriesTarget,
      proteinPerDay: initialValues.proteinPerDay ?? defaults.proteinPerDay,
      carbsPerDay: initialValues.carbsPerDay ?? defaults.carbsPerDay,
      fatsPerDay: initialValues.fatsPerDay ?? defaults.fatsPerDay,
      FiberTarget: initialValues.FiberTarget ?? defaults.FiberTarget,
      activityLevel: initialValues.activityLevel ?? 'moderate',
      notes: initialValues.notes ?? '',
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

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 "
      onSubmit={handleSubmit(onSubmit)}
    >
 
      {/* Daily Target Calories */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t('calories.calories')}
          </label> 
        </div>

        <Controller
          name="caloriesTarget"
          control={control}
          render={({ field }) => (
            <div className="relative">
              <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
              <input
                type="number"
                {...field}
                placeholder={t('placeholders.calories') || 'e.g., 2200'}
                className={` bg-white h-12 w-full rounded-lg rtl:pr-10 rtl:pl-10 ltr:pl-10 ltr:pr-4 text-sm font-semibold border transition-all ${
                  errors.caloriesTarget
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-300 focus:ring-indigo-200'
                } focus:outline-none focus:ring-2`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                kcal
              </span>
              {errors.caloriesTarget?.message && (
                <p className="mt-1 text-xs text-red-600">{t(errors.caloriesTarget.message)}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Macros Grid */}
      <div> 
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Protein */}
          <Controller
            name="proteinPerDay"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Beef className="w-3.5 h-3.5 text-red-500" />
                  {t('calories.protein')}
                </div>
                <input
                  type="number"
                  {...field}
                  placeholder="150"
                  className={` bg-white h-11 w-full rounded-lg px-3 text-sm font-semibold border transition-all ${
                    errors.proteinPerDay
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                />
                {errors.proteinPerDay?.message && (
                  <p className="text-xs text-red-600">{t(errors.proteinPerDay.message)}</p>
                )}
              </div>
            )}
          />

          {/* Carbs */}
          <Controller
            name="carbsPerDay"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Wheat className="w-3.5 h-3.5 text-amber-500" />
                  {t('calories.carbs')}
                </div>
                <input
                  type="number"
                  {...field}
                  placeholder="200"
                  className={` bg-white h-11 w-full rounded-lg px-3 text-sm font-semibold border transition-all ${
                    errors.carbsPerDay
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                />
                {errors.carbsPerDay?.message && (
                  <p className="text-xs text-red-600">{t(errors.carbsPerDay.message)}</p>
                )}
              </div>
            )}
          />

          {/* Fats */}
          <Controller
            name="fatsPerDay"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  {t('calories.fat')}
                </div>
                <input
                  type="number"
                  {...field}
                  placeholder="60"
                  className={` bg-white h-11 w-full rounded-lg px-3 text-sm font-semibold border transition-all ${
                    errors.fatsPerDay
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                />
                {errors.fatsPerDay?.message && (
                  <p className="text-xs text-red-600">{t(errors.fatsPerDay.message)}</p>
                )}
              </div>
            )}
          />

          {/* Fiber */}
          <Controller
            name="FiberTarget"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Wheat className="w-3.5 h-3.5 text-green-500" />
                  {t('calories.fiber') || 'Fiber'}
                </div>
                <input
                  type="number"
                  {...field}
                  placeholder="28"
                  className={` bg-white h-11 w-full rounded-lg px-3 text-sm font-semibold border transition-all ${
                    errors.FiberTarget
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                />
                {errors.FiberTarget?.message && (
                  <p className="text-xs text-red-600">{t(errors.FiberTarget.message)}</p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Activity Level */}
      <Controller
        name="activityLevel"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Activity className="w-4 h-4" />
              {t('calories.activity')}
            </div>
            <Select
              searchable={false}
              clearable={false}
              options={[
                { id: 'sedentary', label: t('calories.level.sedentary') },
                { id: 'light', label: t('calories.level.light') },
                { id: 'moderate', label: t('calories.level.moderate') },
                { id: 'active', label: t('calories.level.active') },
                { id: 'athlete', label: t('calories.level.athlete') },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={errors.activityLevel?.message ? t(errors.activityLevel.message) : ''}
            />
          </div>
        )}
      />

      {/* Notes */}
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <StickyNote className="w-4 h-4" />
              {t('calories.notes')}
            </div>
            <textarea
              {...field}
              rows={3}
              placeholder={t('calories.notesPh') || 'Add any dietary preferences, allergies, or notes...'}
              className={` bg-white w-full rounded-lg px-3.5 py-2.5 text-sm border transition-all ${
                errors.notes
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-300 focus:ring-indigo-200'
              } focus:outline-none focus:ring-2`}
            />
            {errors.notes?.message && (
              <p className="text-xs text-red-600">{t(errors.notes.message)}</p>
            )}
          </div>
        )}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
        <Button color="neutral" type="button" name={t('common.back')} onClick={onBack} />
        <Button
          color="primary"
          type="submit"
          name={t('common.saveAndNext')}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </div>
    </motion.form>
  );
}