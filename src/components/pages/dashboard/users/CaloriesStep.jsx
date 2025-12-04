'use client';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';
import Button from '@/components/atoms/Button';
import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import { useTranslations } from 'next-intl';

// YUP SCHEMA (matches backend rules)
// caloriesTarget > 0, integer
// others >= 0, integer
const caloriesSchema = yup.object({
  caloriesTarget: yup
    .number()
    .typeError('calories.errors.integer') // will be t('calories.errors.integer')
    .integer('calories.errors.integer')
    .positive('calories.errors.positive') // > 0
    .nullable()
    .transform(v => (v === '' || v === null || v === undefined ? null : v)),

  proteinPerDay: yup
    .number()
    .typeError('calories.errors.integer')
    .integer('calories.errors.integer')
    .min(0, 'calories.errors.notNegative') // >= 0
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

  activityLevel: yup.string().oneOf(['sedentary', 'light', 'moderate', 'active', 'athlete']).required('calories.errors.activityRequired'),

  notes: yup
    .string()
    .max(1000, 'calories.errors.notesMax')
    .nullable()
    .transform(v => (v === '' ? null : v)),
});

export default function CaloriesStep({
  userId, // createdUser?.user?.id
  initialValues = {}, // you can pass existing values when editing
  onBack, // () => void
  onNext, // () => void, called after successful save
}) {
  const t = useTranslations('users');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(caloriesSchema),
    mode: 'onBlur',
    defaultValues: {
      caloriesTarget: initialValues.caloriesTarget ?? '',
      proteinPerDay: initialValues.proteinPerDay ?? '',
      carbsPerDay: initialValues.carbsPerDay ?? '',
      fatsPerDay: initialValues.fatsPerDay ?? '',
      activityLevel: initialValues.activityLevel ?? 'moderate',
      notes: initialValues.notes ?? '',
    },
  });

  const onSubmit = async data => {
    try {
      await api.put('/auth/profile', {
        id: userId,
        caloriesTarget: data.caloriesTarget ?? undefined,
        proteinPerDay: data.proteinPerDay ?? undefined,
        carbsPerDay: data.carbsPerDay ?? undefined,
        fatsPerDay: data.fatsPerDay ?? undefined,
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
    <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
        {/* caloriesTarget */}
        <Controller name='caloriesTarget' control={control} render={({ field }) => <Input type='number' label={t('calories.calories')} value={field.value} onChange={field.onChange} placeholder='e.g., 2200' error={errors.caloriesTarget?.message ? t(errors.caloriesTarget.message) : ''} />} />

        {/* proteinPerDay */}
        <Controller name='proteinPerDay' control={control} render={({ field }) => <Input type='number' label={t('calories.protein')} value={field.value} onChange={field.onChange} placeholder='g/day' error={errors.proteinPerDay?.message ? t(errors.proteinPerDay.message) : ''} />} />

        {/* carbsPerDay */}
        <Controller name='carbsPerDay' control={control} render={({ field }) => <Input type='number' label={t('calories.carbs')} value={field.value} onChange={field.onChange} placeholder='g/day' error={errors.carbsPerDay?.message ? t(errors.carbsPerDay.message) : ''} />} />

        {/* fatsPerDay */}
        <Controller name='fatsPerDay' control={control} render={({ field }) => <Input type='number' label={t('calories.fat')} value={field.value} onChange={field.onChange} placeholder='g/day' error={errors.fatsPerDay?.message ? t(errors.fatsPerDay.message) : ''} />} />
      </div>

      {/* activityLevel */}
      <Controller
        name='activityLevel'
        control={control}
        render={({ field }) => (
          <Select
            searchable={false}
            clearable={false}
            label={t('calories.activity')}
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
        )}
      />

      {/* notes */}
      <Controller name='notes' control={control} render={({ field }) => <Input label={t('calories.notes')} value={field.value} onChange={field.onChange} placeholder={t('calories.notesPh')} error={errors.notes?.message ? t(errors.notes.message) : ''} />} />

      <div className='flex justify-end gap-2'>
        <Button color='neutral' type='button' name={t('common.back')} onClick={onBack} />
        <Button color='primary' type='submit' name={t('common.saveAndNext')} loading={isSubmitting} disabled={isSubmitting} />
      </div>
    </form>
  );
}
