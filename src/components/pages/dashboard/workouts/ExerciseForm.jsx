'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { Loader2, UploadCloud, Wand2, Sparkles, X, ImageIcon, VideoIcon } from 'lucide-react';
import Select from '@/components/atoms/Select';
import api, { baseImg } from '@/utils/axios';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/useUser';
import { Notification } from '@/config/Notification';
import { useTheme } from '@/app/[locale]/theme';

/* ─────────────────────────── helpers ─────────────────────────── */
function parseArrayMaybe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j.filter(Boolean); } catch (_) {}
    return v.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}
const isEmptyish = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
const safeStr = v => (v == null ? '' : String(v));

function resolveUrlMaybe(v) {
  if (!v) return '';
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  try {
    const base = String(baseImg || '').replace(/\/+$/, '');
    return `${base}/${s.replace(/^\/+/, '')}`;
  } catch { return s; }
}

/* ─────────────────────────── Field wrapper ─────────────────────────── */
function Field({ label, hint, required, error, children, highlight }) {
  return (
    <div className={[
      'w-full transition-all duration-300',
      highlight ? 'rounded-lg ring-2 ring-[var(--color-primary-400)]/40 bg-[var(--color-primary-50)]/60 p-1 animate-pulse' : '',
    ].join(' ')}>
      {label && (
        <label className='mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-primary-600)]'>
          {label}
          {required && <span className='ml-0.5 text-rose-500'>*</span>}
        </label>
      )}
      {children}
      {error
        ? <p className='mt-1.5 text-xs font-medium text-rose-500'>{error}</p>
        : hint
          ? <p className='mt-1.5 text-xs text-[var(--color-primary-400)]'>{hint}</p>
          : null}
    </div>
  );
}

/* ─────────────────────────── Input primitives ─────────────────────────── */

/** Shared focus ring injected once */
const INPUT_BASE = [
  'w-full rounded-lg border bg-white text-sm text-[var(--color-primary-900)]',
  'border-[var(--color-primary-200)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
  'outline-none transition-all duration-200 placeholder:text-[var(--color-primary-300)]',
  'focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
].join(' ');

function TextInput({ value, onChange, placeholder, name, required, disabled, rightSlot, className = '', onBlur, onPaste }) {
  return (
    <div className={`relative flex items-center ${disabled ? 'opacity-55 pointer-events-none' : ''} ${className}`}>
      <input
        name={name}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onPaste={onPaste}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${INPUT_BASE} px-3.5 py-2.5 ${rightSlot ? 'ltr:pr-28 rtl:pl-28' : ''}`}
      />
      {rightSlot && (
        <div className='absolute ltr:right-2 rtl:left-2 flex items-center gap-1'>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

function NumberInput({ value, onChange, name, min = 0, step = 1, disabled, placeholder }) {
  return (
    <input
      type='number'
      inputMode='numeric'
      name={name}
      value={safeStr(value)}
      min={min}
      step={step}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
      className={`${INPUT_BASE} px-3.5 py-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  );
}

function TextArea({ value, onChange, rows = 3, placeholder, disabled }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${INPUT_BASE} resize-y px-3.5 py-2.5`}
    />
  );
}

/* ─────────────────────────── Tags field ─────────────────────────── */
function TagsField({ value = [], onChange, placeholder = 'Type and press Enter', maxTags = 20 }) {
  const [input, setInput] = useState('');

  const addTag = tag => {
    const t = tag.trim();
    if (!t) return;
    onChange(Array.from(new Set([...(value || []), t])).slice(0, maxTags));
    setInput('');
  };
  const removeTag = idx => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className={[
      'rounded-lg border bg-white px-3 py-2 transition-all duration-200',
      'border-[var(--color-primary-200)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
      'focus-within:border-[var(--color-primary-500)] focus-within:ring-2 focus-within:ring-[var(--color-primary-200)]',
    ].join(' ')}>
      <div className='flex flex-wrap gap-1.5'>
        {(value || []).map((t, i) => (
          <span
            key={`${t}-${i}`}
            className='inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-700)]'>
            {t}
            <button
              type='button'
              onClick={() => removeTag(i)}
              aria-label='Remove tag'
              className='ml-0.5 opacity-50 hover:opacity-100 transition-opacity'>
              <X className='h-3 w-3' />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(input); } }}
          placeholder={(value || []).length === 0 ? placeholder : ''}
          className='min-w-[140px] flex-1 bg-transparent py-0.5 px-1 text-sm text-[var(--color-primary-900)] outline-none placeholder:text-[var(--color-primary-300)]'
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Media preview ─────────────────────────── */
function MediaPreview({ type = 'image', url }) {
  if (!url) return null;
  return (
    <div className='mt-2 overflow-hidden rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)]'>
      {type === 'video'
        ? <video src={url} controls className='h-40 w-full object-contain' />
        : <img src={url} alt='' className='h-40 w-full object-contain' />}
    </div>
  );
}

/* ─────────────────────────── Upload button ─────────────────────────── */
function UploadButton({ accept, onChange, ariaLabel }) {
  return (
    <label className={[
      'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5',
      'border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-500)]',
      'hover:bg-[var(--color-primary-100)] hover:text-[var(--color-primary-700)]',
      'transition-all duration-150 active:scale-95',
    ].join(' ')}>
      <UploadCloud className='h-4 w-4' />
      <input type='file' accept={accept} className='hidden' onChange={onChange} aria-label={ariaLabel} />
    </label>
  );
}

/* ─────────────────────────── AI button ─────────────────────────── */
function AiChip({ onClick, label }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white',
        'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]',
        'shadow-sm hover:opacity-90 active:scale-95 transition-all duration-150',
      ].join(' ')}>
      <Wand2 className='h-3 w-3' />
      {label}
    </button>
  );
}

/* ─────────────────────────── Submit / CTA button ─────────────────────────── */
function PrimaryButton({ children, type = 'button', onClick, disabled, loading, fullWidth }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'relative inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white',
        'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]',
        'shadow-md hover:opacity-95 active:scale-[0.97]',
        'transition-all duration-150',
        disabled || loading ? 'opacity-60 cursor-not-allowed' : '',
        fullWidth ? 'w-full' : '',
      ].join(' ')}>
      {loading && <Loader2 className='h-4 w-4 animate-spin' />}
      {children}
    </button>
  );
}

 

/* ─────────────────────────── Main form ─────────────────────────── */
export function ExerciseForm({ initial, onSubmit, categories }) {
  const t    = useTranslations('workouts');
  const user = useUser();
  const { colors } = useTheme();

  const schema = useMemo(() =>
    yup.object({
      name:                   yup.string().trim().min(2, t('val.nameMin')).required(t('val.nameReq')),
      targetReps:             yup.string().trim().matches(/^\d+(-\d+)?$/, t('val.repsFmt')).required(t('val.repsReq')),
      targetSets:             yup.number().typeError(t('val.setsNum')).integer(t('val.setsInt')).min(0, t('val.setsMin')).max(30, t('val.setsMax')).required(t('val.setsReq')),
      rest:                   yup.number().typeError(t('val.restNum')).min(0, t('val.restMin')).max(1200, t('val.restMax')),
      tempo:                  yup.string().trim().matches(/^\d+\/\d+\/\d+$/, t('val.tempoFmt')).nullable().transform(v => (v === '' ? null : v)),
      category:               yup.string().trim().required(t('val.categoryReq')),
      details:                yup.string().max(2000, t('val.detailsMax')).nullable(),
      primaryMusclesWorked:   yup.array(yup.string().trim()).max(20, t('val.tagsMax')),
      secondaryMusclesWorked: yup.array(yup.string().trim()).max(20, t('val.tagsMax')),
      hasImgFile:             yup.boolean().default(false),
      hasVideoFile:           yup.boolean().default(false),
      imgUrl:                 yup.string().when('hasImgFile', { is: true, then: s => s.notRequired(), otherwise: s => s.required(t('val.imgReq')) }),
      videoUrl:               yup.string().required(t('val.videoReq')),
    }),
  [t]);

  const [imgFile,   setImgFile]   = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const [aiLoading,    setAiLoading]    = useState(false);
  const [showAiButton, setShowAiButton] = useState(false);
  const [aiHighlight,  setAiHighlight]  = useState({});
  const [setting,      setSetting]      = useState();
  const inFlight = useRef(null);

  const flashField = name => {
    if (!name) return;
    setAiHighlight(prev => ({ ...prev, [name]: true }));
    setTimeout(() => setAiHighlight(prev => ({ ...prev, [name]: false })), 900);
  };

  const categoryOptions = useMemo(() => (categories || []).map(c => ({ id: c, label: c })), [categories]);

  const defaultValues = useMemo(() => ({
    name:                   initial?.name || '',
    details:                initial?.details || '',
    category:               initial?.category || '',
    primaryMusclesWorked:   parseArrayMaybe(initial?.primaryMusclesWorked),
    secondaryMusclesWorked: parseArrayMaybe(initial?.secondaryMusclesWorked),
    targetReps:             safeStr(initial?.targetReps || 10),
    targetSets:             initial?.targetSets === 0 ? 0 : initial?.targetSets ?? 3,
    rest:                   initial?.rest   === 0 ? 0 : initial?.rest   ?? 90,
    tempo:                  safeStr(initial?.tempo || '1/1/1'),
    imgUrl:                 initial?.img   || '',
    videoUrl:               initial?.video || '',
    hasImgFile:  false,
    hasVideoFile: false,
  }), [initial]);

  const { control, handleSubmit, formState: { isSubmitting }, setValue, getValues, watch, reset, trigger } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur',
    defaultValues,
  });

  useEffect(() => { reset(defaultValues); setImgFile(null); setVideoFile(null); setAiHighlight({}); }, [initial, reset]);

  useEffect(() => {
    api.get(user?.role === 'admin' ? '/settings' : `/settings?user_id=${user?.adminId}`)
      .then(res => setSetting(res.data));
  }, [user?.adminId, user?.role]);

  useEffect(() => {
    if (!initial) return;
    setValue('imgUrl',   resolveUrlMaybe(initial?.img));
    setValue('videoUrl', resolveUrlMaybe(initial?.video));
  }, [initial, setValue]);

  const nameVal = watch('name');
  useEffect(() => setShowAiButton(Boolean(nameVal && nameVal.trim().length >= 2)), [nameVal]);

  /* ── AI ── */
  async function suggestFromAI(exName) {
    const API_KEY = setting?.aiSecretKey;
    if (!API_KEY || !exName || exName.trim().length < 2) return null;
    if (inFlight.current) inFlight.current.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setAiLoading(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo',
          temperature: 0.2,
          max_tokens: 150,
          messages: [
            { role: 'system', content: 'You output ONLY compact JSON matching: { "details": string, "category": string, "primary": string[], "secondary": string[], "targetReps": string, "targetSets": number, "rest": number, "tempo": string, "image"?: string, "video"?: string }.' },
            { role: 'user',   content: `Suggest default values for exercise "${exName}". Keep category simple (e.g., "Back","Chest","Legs","Shoulders","Arms","Core","Full Body").` },
            { role: 'user',   content: String.raw`Tempo must match ^\d+\/\d+\/\d+$ (e.g., "2/1/2").` },
          ],
          signal: ctrl.signal,
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      let parsed = null;
      try { const m = content.match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : content); } catch {}
      return parsed;
    } catch {
      Notification(t('errors.apiKeyExpired'), 'error');
      return null;
    } finally {
      setAiLoading(false);
      if (inFlight.current === ctrl) inFlight.current = null;
    }
  }

  async function applyAISuggestions() {
    const exName = getValues('name');
    if (!exName || exName.trim().length < 2) return;
    const s = await suggestFromAI(exName);
    if (!s) return;

    const patch = (field, val, cond = true) => {
      if (cond && val) { setValue(field, val, { shouldValidate: true }); flashField(field); }
    };

    patch('details',  s.details);
    patch('category', s.category);
    patch('primaryMusclesWorked',   Array.isArray(s.primary)   ? s.primary.filter(Boolean).slice(0, 20)   : null, isEmptyish(getValues('primaryMusclesWorked')));
    patch('secondaryMusclesWorked', Array.isArray(s.secondary) ? s.secondary.filter(Boolean).slice(0, 20) : null, isEmptyish(getValues('secondaryMusclesWorked')));
    patch('targetReps', safeStr(s.targetReps), isEmptyish(getValues('targetReps')) && typeof s.targetReps === 'string');
    patch('targetSets', s.targetSets,          (getValues('targetSets') == null || getValues('targetSets') === '') && typeof s.targetSets === 'number');
    patch('rest',       s.rest,                (getValues('rest')       == null || getValues('rest')       === '') && typeof s.rest       === 'number');
    if (typeof s.tempo === 'string' && s.tempo.trim()) patch('tempo', safeStr(s.tempo.trim()));
    patch('imgUrl',   s.image, isEmptyish(getValues('imgUrl'))   && typeof s.image === 'string');
    patch('videoUrl', s.video, isEmptyish(getValues('videoUrl')) && typeof s.video === 'string');
  }

  const onValidSubmit = handleSubmit(async values => {
    await onSubmit?.({
      name:                   values.name,
      details:                values.details || '',
      category:               values.category?.trim() || null,
      primaryMusclesWorked:   values.primaryMusclesWorked || [],
      secondaryMusclesWorked: values.secondaryMusclesWorked || [],
      targetReps:             safeStr(values.targetReps || '10'),
      targetSets:             values.targetSets ?? 3,
      rest:                   values.rest ?? 90,
      tempo:                  safeStr(values.tempo || ''),
      imgUrl:                 imgFile   ? undefined : values.imgUrl   || '',
      videoUrl:               videoFile ? undefined : values.videoUrl || '',
      imgFile:                imgFile   || undefined,
      videoFile:              videoFile || undefined,
      userId:                 user?.role === 'admin' ? user?.id : user?.adminId,
    });
  });

  return (
    <form onSubmit={onValidSubmit} className='relative space-y-5'>

      {/* AI loading overlay */}
      {aiLoading && (
        <div className='absolute inset-0 z-10 grid place-items-center rounded-lg backdrop-blur-sm bg-white/75'>
          <div className='flex items-center gap-2.5 rounded-lg border border-[var(--color-primary-200)] bg-white px-5 py-3 shadow-lg'>
            <Loader2 className='h-4 w-4 animate-spin text-[var(--color-primary-500)]' />
            <span className='text-sm font-medium text-[var(--color-primary-700)]'>{t('ai.fetching')}</span>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2'>
 

        {/* Name */}
        <Controller name='name' control={control} render={({ field, fieldState }) => (
          <Field label={t('labels.name')} required hint={showAiButton ? t('hints.nameAi') : undefined} error={fieldState.error?.message} highlight={aiHighlight.name}>
            <TextInput
              name='name'
              value={field.value}
              onChange={field.onChange}
              placeholder={t('placeholders.name')}
              rightSlot={showAiButton && setting?.aiSecretKey
                ? <AiChip onClick={applyAISuggestions} label={t('actions.getAi')} />
                : null}
            />
          </Field>
        )} />

        {/* Category */}
        <Controller name='category' control={control} render={({ field, fieldState }) => (
          <Field label={t('labels.category')} required error={fieldState.error?.message} highlight={aiHighlight.category}>
            <Select
              searchable={false}
              clearable={false}
              className='!w-full'
              placeholder={t('placeholders.category')}
              options={categoryOptions}
              value={field.value}
              onChange={val => field.onChange(val)}
              allowCustom={true}
              createHint={t('hints.createCategory')}
            />
          </Field>
        )} />

        {/* Details — full width */}
        <Controller name='details' control={control} render={({ field, fieldState }) => (
          <div className='sm:col-span-2'>
            <Field label={t('labels.details')} error={fieldState.error?.message} highlight={aiHighlight.details}>
              <TextArea rows={2} value={field.value} onChange={field.onChange} placeholder={t('placeholders.details')} />
            </Field>
          </div>
        )} />
 
        {/* Reps + Sets */}
        <div className='grid grid-cols-2 gap-3'>
          <Controller name='targetReps' control={control} render={({ field, fieldState }) => (
            <Field label={t('labels.targetReps')} error={fieldState.error?.message} highlight={aiHighlight.targetReps}>
              <TextInput name='targetReps' value={field.value} onChange={field.onChange} placeholder={t('placeholders.reps')} />
            </Field>
          )} />
          <Controller name='targetSets' control={control} render={({ field, fieldState }) => (
            <Field label={t('labels.targetSets')} error={fieldState.error?.message} highlight={aiHighlight.targetSets}>
              <NumberInput name='targetSets' value={field.value} onChange={field.onChange} min={0} step={1} placeholder={t('placeholders.sets')} />
            </Field>
          )} />
        </div>

        {/* Rest + Tempo */}
        <div className='grid grid-cols-2 gap-3'>
          <Controller name='rest' control={control} render={({ field, fieldState }) => (
            <Field label={t('labels.rest')} error={fieldState.error?.message} highlight={aiHighlight.rest}>
              <NumberInput name='rest' value={field.value} onChange={field.onChange} min={0} step={5} placeholder={t('placeholders.rest')} />
            </Field>
          )} />
          <Controller name='tempo' control={control} render={({ field, fieldState }) => (
            <Field label={t('labels.tempo')} error={fieldState.error?.message} highlight={aiHighlight.tempo}>
              <TextInput name='tempo' value={safeStr(field.value)} onChange={field.onChange} placeholder={t('placeholders.tempo')} />
            </Field>
          )} />
        </div>
 
        {/* Primary */}
        <Controller name='primaryMusclesWorked' control={control} render={({ field, fieldState }) => (
          <Field label={t('labels.primary')} error={fieldState.error?.message} highlight={aiHighlight.primaryMusclesWorked}>
            <TagsField value={field.value} onChange={field.onChange} placeholder={t('placeholders.tag')} maxTags={20} />
          </Field>
        )} />

        {/* Secondary */}
        <Controller name='secondaryMusclesWorked' control={control} render={({ field, fieldState }) => (
          <Field label={t('labels.secondary')} error={fieldState.error?.message} highlight={aiHighlight.secondaryMusclesWorked}>
            <TagsField value={field.value} onChange={field.onChange} placeholder={t('placeholders.tag')} maxTags={20} />
          </Field>
        )} />

 
        {/* Hidden RHF fields */}
        <Controller name='hasImgFile'   control={control} render={() => null} />
        <Controller name='hasVideoFile' control={control} render={() => null} />

        {/* Image */}
        <Controller name='imgUrl' control={control} render={({ field, fieldState }) => (
          <Field label={t('labels.image')} required error={fieldState.error?.message} highlight={aiHighlight.imgUrl}>
            <div className='flex items-center gap-2'>
              <TextInput
                name='imgUrl'
                value={field.value}
                onChange={val => field.onChange(val)}
                placeholder={t('placeholders.mediaUrl')}
                className='flex-1'
                onPaste={e => {
                  const items = e.clipboardData?.items;
                  if (items) {
                    for (const item of items) {
                      if (item.kind === 'file' && item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                          e.preventDefault();
                          setImgFile(file);
                          setValue('hasImgFile', true, { shouldValidate: true });
                          setValue('imgUrl', file.name || '', { shouldValidate: true });
                          trigger('imgUrl');
                          return;
                        }
                      }
                    }
                  }
                  const txt = e.clipboardData?.getData('text/plain')?.trim();
                  if (txt && /^(https?:|data:|blob:)/i.test(txt)) {
                    setImgFile(null);
                    setValue('hasImgFile', false, { shouldValidate: true });
                    field.onChange(txt);
                    trigger('imgUrl');
                  }
                }}
              />
              <UploadButton
                accept='image/*'
                ariaLabel={t('actions.uploadImage')}
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setImgFile(f);
                  setValue('hasImgFile', !!f, { shouldValidate: true });
                  setValue('imgUrl', f?.name || '');
                  trigger('imgUrl');
                }}
              />
            </div>
            <MediaPreview type='image' url={imgFile ? URL.createObjectURL(imgFile) : field.value} />
          </Field>
        )} />

        {/* Video */}
        <Controller name='videoUrl' control={control} render={({ field, fieldState }) => (
          <Field label={t('labels.video')} required error={fieldState.error?.message} highlight={aiHighlight.videoUrl}>
            <div className='flex items-center gap-2'>
              <TextInput
                name='videoUrl'
                value={field.value}
                onChange={val => field.onChange(val)}
                placeholder={t('placeholders.mediaUrlVideo')}
                className='flex-1'
              />
              <UploadButton
                accept='video/*'
                ariaLabel={t('actions.uploadVideo')}
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setVideoFile(f);
                  setValue('hasVideoFile', !!f, { shouldValidate: true });
                  setValue('videoUrl', f?.name || '');
                  trigger('videoUrl');
                }}
              />
            </div>
            <MediaPreview type='video' url={videoFile ? URL.createObjectURL(videoFile) : field.value} />
          </Field>
        )} />

        {/* MuscleWiki tip */}
        <div className='sm:col-span-2 rounded-lg border border-dashed border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-4 py-3 text-[11px] md: leading-relaxed text-[var(--color-primary-600)]'>
          <strong className='font-semibold text-[var(--color-primary-700)]'>{t('notes.muscleWikiTipLabel')}</strong>
          {t('notes.muscleWikiTipPrefix')}
          <a
            href='https://musclewiki.com/'
            target='_blank'
            rel='noreferrer'
            className='font-semibold underline underline-offset-2 text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)] transition-colors'>
            musclewiki.com
          </a>
          {t('notes.muscleWikiTipSuffix')}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className='flex items-center justify-end gap-2.5 border-t border-[var(--color-primary-100)] pt-4'>
        {setting?.aiSecretKey && (
          <PrimaryButton
            type='button'
            onClick={applyAISuggestions}
            loading={aiLoading}
            disabled={!nameVal || nameVal.trim().length < 2}>
            <Sparkles className='h-4 w-4' />
            {t('actions.fillWithAi')}
          </PrimaryButton>
        )}
        <PrimaryButton type='submit' loading={isSubmitting}>
          {t('actions.save')}
        </PrimaryButton>
      </div>
    </form>
  );
}