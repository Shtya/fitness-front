'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { Loader2, UploadCloud, Wand2, Sparkles, X } from 'lucide-react';
import Select from '@/components/atoms/Select';
import { baseImg } from '@/utils/axios';

/* -------------------- helpers -------------------- */
function parseArrayMaybe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.filter(Boolean);
    } catch (_) {}
    return v
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}
const isEmptyish = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
const safeStr = v => (v == null ? '' : String(v));

function resolveUrlMaybe(v) {
  if (!v) return '';
  // If it's a File (upload), caller will make an object URL; leave as-is
  if (typeof v !== 'string') return v;

  const s = v.trim();
  // already absolute → use it as-is
  if (/^(https?:|data:|blob:)/i.test(s)) return s;

  // make absolute using baseImg
  try {
    const base = String(baseImg || '').replace(/\/+$/, '');
    const rel = s.replace(/^\/+/, '');
    return `${base}/${rel}`;
  } catch {
    return s; // fail-safe: return original string
  }
}

/* ================================================
   Custom UI Primitives (Inputs / Buttons)
================================================ */
function Field({ label, hint, required, error, children }) {
  return (
    <div className='w-full'>
      {label ? (
        <label className='mb-1.5 block text-sm font-medium text-slate-700'>
          {label} {required ? <span className='text-rose-500'>*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className='mt-1 text-xs text-rose-600'>{error}</p> : hint ? <p className='mt-1 text-xs text-slate-500'>{hint}</p> : null}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, name, required, disabled, rightSlot, className = '', onBlur }) {
  return (
    <div className={'relative flex items-center rounded-lg border ' + (disabled ? 'opacity-60 ' : '') + className + ' border-slate-200 bg-white shadow-sm'}>
      <input name={name} value={value ?? ''} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} required={required} disabled={disabled} className='peer w-full rounded-lg bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400' />
      {rightSlot ? <div className='absolute right-1.5 flex items-center gap-1'>{rightSlot}</div> : null}
    </div>
  );
}

function NumberInput({ value, onChange, name, min = 0, step = 1, disabled, placeholder }) {
  return (
    <div className='relative'>
      <input type='number' inputMode='numeric' name={name} value={safeStr(value)} min={min} step={step} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} placeholder={placeholder} disabled={disabled} className='w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-400/20' />
    </div>
  );
}

function TextArea({ value, onChange, rows = 3, placeholder, disabled }) {
  return <textarea rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className='w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-400/20' />;
}

/* Tags input */
function TagsField({ value = [], onChange, placeholder = 'Type and press Enter', maxTags = 20 }) {
  const [input, setInput] = useState('');

  function addTag(tag) {
    const t = tag.trim();
    if (!t) return;
    const next = Array.from(new Set([...(value || []), t])).slice(0, maxTags);
    onChange(next);
    setInput('');
  }
  function removeTag(idx) {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className='rounded-lg border border-slate-200 bg-white p-2 shadow-sm'>
      <div className='flex flex-wrap gap-2'>
        {(value || []).map((t, i) => (
          <span key={`${t}-${i}`} className='group inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700'>
            {t}
            <button type='button' onClick={() => removeTag(i)} className='opacity-60 hover:opacity-100'>
              <X className='h-3.5 w-3.5' />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder={placeholder}
          className='min-w-[160px] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400'
        />
      </div>
    </div>
  );
}

function MediaPreview({ type = 'image', url }) {
  if (!url) return null;
  return <div className='overflow-hidden rounded-lg border border-slate-200'>{type === 'video' ? <video src={url} controls className='h-44 w-full object-contain' /> : <img src={url} alt='' className='h-44 w-full object-contain' />}</div>;
}

function PrimaryButton({ children, type = 'button', onClick, disabled, loading, fullWidth }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={'relative inline-flex items-center justify-center overflow-hidden rounded-lg px-4 py-2.5 text-sm font-semibold ' + 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/50 ' + (fullWidth ? 'w-full ' : '') + (disabled || loading ? 'opacity-70 cursor-not-allowed ' : '')}>
      {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
      {children}
    </button>
  );
}

/* ================================================
   Validation Schema (Yup)
   (Use hidden booleans hasImgFile / hasVideoFile to avoid timing issues)
================================================ */
const schema = yup.object({
  name: yup.string().trim().min(2, 'Name must be at least 2 chars').required('Name is required'),
  targetReps: yup
    .string()
    .trim()
    .matches(/^\d+(-\d+)?$/, 'Use e.g. "10" or "8-12"')
    .required('Target reps is required'),
  targetSets: yup.number().typeError('Sets must be a number').integer('Sets must be an integer').min(0, 'Min 0').max(30, 'Too many sets').required('Target sets is required'),
  rest: yup.number().typeError('Rest must be a number').min(0, 'Min 0s').max(1200, 'Max 1200s'),
  tempo: yup
    .string()
    .trim()
    .matches(/^\d+\/\d+\/\d+$/, 'Use format "2/1/2"')
    .nullable()
    .transform(v => (v === '' ? null : v)),

  category: yup.string().trim().required('Category is required'),

  details: yup.string().max(2000, 'Keep details under 2000 chars').nullable(),
  primaryMusclesWorked: yup.array(yup.string().trim()).max(20, 'Max 20 tags'),
  secondaryMusclesWorked: yup.array(yup.string().trim()).max(20, 'Max 20 tags'),

  // Hidden flags set by RHF when files chosen
  hasImgFile: yup.boolean().default(false),
  hasVideoFile: yup.boolean().default(false),

  imgUrl: yup.string().required('Image URL is required'),
  videoUrl: yup.string().required('Video URL is required'),
});

/* ================================================
   The Form
================================================ */
export function ExerciseForm({ initial, onSubmit, categories }) {
  // local file objects for preview/upload
  const [imgFile, setImgFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiButton, setShowAiButton] = useState(false);
  const inFlight = useRef(null);

  const categoryOptions = useMemo(() => (categories || []).map(c => ({ id: c, label: c })), [categories]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    watch,
    reset,
    trigger,
    clearErrors,
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: initial?.name || '',
      details: initial?.details || '',
      category: initial?.category || '',
      primaryMusclesWorked: parseArrayMaybe(initial?.primaryMusclesWorked),
      secondaryMusclesWorked: parseArrayMaybe(initial?.secondaryMusclesWorked),
      targetReps: safeStr(initial?.targetReps),
      targetSets: initial?.targetSets === 0 ? 0 : initial?.targetSets ?? 3,
      rest: initial?.rest === 0 ? 0 : initial?.rest ?? 90,
      tempo: safeStr(initial?.tempo),
      imgUrl: initial?.img || '',
      videoUrl: initial?.video || '',
      hasImgFile: false,
      hasVideoFile: false,
    },
  });

  // when initial changes → reset form + clear files
  useEffect(() => {
    reset({
      name: initial?.name || '',
      details: initial?.details || '',
      category: initial?.category || '',
      primaryMusclesWorked: parseArrayMaybe(initial?.primaryMusclesWorked),
      secondaryMusclesWorked: parseArrayMaybe(initial?.secondaryMusclesWorked),
      targetReps: safeStr(initial?.targetReps),
      targetSets: initial?.targetSets === 0 ? 0 : initial?.targetSets ?? 3,
      rest: initial?.rest === 0 ? 0 : initial?.rest ?? 90,
      tempo: safeStr(initial?.tempo),
      imgUrl: initial?.img || '',
      videoUrl: initial?.video || '',
      hasImgFile: false,
      hasVideoFile: false,
    });
    setImgFile(null);
    setVideoFile(null);
  }, [initial, reset]);

  useEffect(() => {
    if (!initial) return;

    // keep *stored* values human-readable (what you already have in initial)
    // but set them to safely-resolved absolute URLs only if they’re relative
    const img = resolveUrlMaybe(initial?.img);
    const vid = resolveUrlMaybe(initial?.video);

    setValue('imgUrl', img);
    setValue('videoUrl', vid);
  }, [initial, setValue]);

  // show AI button after name length >= 2
  const nameVal = watch('name');
  useEffect(() => setShowAiButton(Boolean(nameVal && nameVal.trim().length >= 2)), [nameVal]);

  // ---------- AI (uses setValue) ----------
  async function suggestFromAI(exName) {
    const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY; // avoid exposing in prod
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
            { role: 'system', content: 'You output ONLY compact JSON matching this schema: { "details": string, "category": string, "primary": string[], "secondary": string[], "targetReps": string, "targetSets": number, "rest": number, "tempo": string, "image"?: string, "video"?: string }.' },
            { role: 'user', content: `Suggest default values for exercise "${exName}". Keep category simple (e.g., "Back","Chest","Legs","Shoulders","Arms","Core","Full Body").` },
            { role: 'user', content: String.raw`Tempo must match ^\d+\/\d+\/\d+$ (e.g., "2/1/2").` },
          ],
          signal: ctrl.signal,
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      let parsed = null;
      try {
        const m = content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(m ? m[0] : content);
      } catch {}
      return parsed;
    } catch (_) {
      return null;
    } finally {
      setAiLoading(false);
      if (inFlight.current === ctrl) inFlight.current = null;
    }
  }

  function emptyishForAI() {
    const vals = getValues();
    return isEmptyish(vals.details) && isEmptyish(vals.category) && isEmptyish(vals.primaryMusclesWorked) && isEmptyish(vals.secondaryMusclesWorked) && isEmptyish(vals.tempo);
  }

  async function applyAISuggestions() {
    const exName = getValues('name');
    if (!exName || exName.trim().length < 2) return;
    const s = await suggestFromAI(exName);
    if (!s) return;

    const vals = getValues();
    if (isEmptyish(vals.details) && typeof s.details === 'string') setValue('details', s.details.slice(0, 1200), { shouldValidate: true });
    if (isEmptyish(vals.category) && typeof s.category === 'string') setValue('category', s.category, { shouldValidate: true });
    if (isEmptyish(vals.primaryMusclesWorked) && Array.isArray(s.primary)) setValue('primaryMusclesWorked', s.primary.filter(Boolean).slice(0, 20), { shouldValidate: true });
    if (isEmptyish(vals.secondaryMusclesWorked) && Array.isArray(s.secondary)) setValue('secondaryMusclesWorked', s.secondary.filter(Boolean).slice(0, 20), { shouldValidate: true });
    if (isEmptyish(vals.targetReps) && typeof s.targetReps === 'string') setValue('targetReps', safeStr(s.targetReps), { shouldValidate: true });
    if ((vals.targetSets == null || vals.targetSets === '') && typeof s.targetSets === 'number') setValue('targetSets', s.targetSets, { shouldValidate: true });
    if ((vals.rest == null || vals.rest === '') && typeof s.rest === 'number') setValue('rest', s.rest, { shouldValidate: true });
    if (typeof s.tempo === 'string' && s.tempo.trim()) setValue('tempo', safeStr(s.tempo.trim()), { shouldValidate: true });
    if (isEmptyish(vals.imgUrl) && typeof s.image === 'string') setValue('imgUrl', s.image);
    if (isEmptyish(vals.videoUrl) && typeof s.video === 'string') setValue('videoUrl', s.video);
  }

  async function handleNameBlur() {
    if (!emptyishForAI()) return;
    await applyAISuggestions();
  }

  // ---------- submit ----------
  const onValidSubmit = handleSubmit(async values => {
    const payload = {
      name: values.name,
      details: values.details || '',
      category: values.category?.trim() || null,
      primaryMusclesWorked: values.primaryMusclesWorked || [],
      secondaryMusclesWorked: values.secondaryMusclesWorked || [],
      targetReps: safeStr(values.targetReps || '10'),
      targetSets: values.targetSets ?? 3,
      rest: values.rest ?? 90,
      tempo: safeStr(values.tempo || ''),
      imgUrl: imgFile ? undefined : values.imgUrl || '',
      videoUrl: videoFile ? undefined : values.videoUrl || '',
      imgFile: imgFile || undefined,
      videoFile: videoFile || undefined,
    };
    await onSubmit?.(payload);
  });

  return (
    <form onSubmit={onValidSubmit} className='relative space-y-4'>
      {/* Loading overlay while AI is fetching */}
      {aiLoading && (
        <div className='absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70 backdrop-blur-sm'>
          <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span className='text-sm text-slate-700'>Fetching AI suggestions…</span>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {/* Name with inline AI button */}
        <Controller
          name='name'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Name' required hint={showAiButton ? 'Type a name, then use AI to auto-fill fields.' : undefined} error={fieldState.error?.message}>
              <TextInput
                name='name'
                value={field.value}
                onChange={field.onChange}
                onBlur={async () => {
                  field.onBlur();
                  await handleNameBlur();
                }}
                placeholder='e.g., Wide-Grip Seated Row'
                rightSlot={
                  showAiButton ? (
                    <button type='button' onClick={applyAISuggestions} className='mr-1 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/50'>
                      <Wand2 className='h-3.5 w-3.5' />
                      Get AI
                    </button>
                  ) : null
                }
              />
            </Field>
          )}
        />

        <Controller
          name='targetReps'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Target Reps' error={fieldState.error?.message}>
              <TextInput name='targetReps' value={field.value} onChange={field.onChange} placeholder='10 or 8-12' />
            </Field>
          )}
        />

        <Controller
          name='targetSets'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Target Sets' error={fieldState.error?.message}>
              <NumberInput name='targetSets' value={field.value} onChange={field.onChange} min={0} step={1} />
            </Field>
          )}
        />

        <Controller
          name='rest'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Rest (sec)' error={fieldState.error?.message}>
              <NumberInput name='rest' value={field.value} onChange={field.onChange} min={0} step={5} />
            </Field>
          )}
        />

        <Controller
          name='tempo'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Tempo' hint='Format "x/y/z", 2/1/2' error={fieldState.error?.message}>
              <TextInput name='tempo' value={safeStr(field.value)} onChange={field.onChange} placeholder='2/1/2' />
            </Field>
          )}
        />

        <Controller
          name='category'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Category' required error={fieldState.error?.message}>
              <Select className='!w-full' placeholder='Select category' options={categoryOptions} value={field.value} onChange={val => field.onChange(val)} allowCustom={true} createHint='Write a new category…' />
            </Field>
          )}
        />

        <Controller
          name='details'
          control={control}
          render={({ field, fieldState }) => (
            <div className='sm:col-span-2'>
              <Field label='Details' error={fieldState.error?.message}>
                <TextArea rows={2} value={field.value} onChange={field.onChange} placeholder='Form cues, setup, and targeted stimulus...' />
              </Field>
            </div>
          )}
        />

        <Controller
          name='primaryMusclesWorked'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Primary Muscles' error={fieldState.error?.message}>
              <TagsField value={field.value} onChange={field.onChange} placeholder='Write a muscle and press Enter' maxTags={20} />
            </Field>
          )}
        />

        <Controller
          name='secondaryMusclesWorked'
          control={control}
          render={({ field, fieldState }) => (
            <Field label='Secondary Muscles' error={fieldState.error?.message}>
              <TagsField value={field.value} onChange={field.onChange} placeholder='Write a muscle and press Enter' maxTags={20} />
            </Field>
          )}
        />

        {/* Media – URL or Upload */}
        <div className='sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {/* Hidden flags to drive validation */}
          <Controller name='hasImgFile' control={control} render={() => null} />
          <Controller name='hasVideoFile' control={control} render={() => null} />

          <Controller
            name='imgUrl'
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <Field label='Image' required error={fieldState.error?.message}>
                  <div className='flex items-center gap-2'>
                    <TextInput
                      name='imgUrl'
                      value={field.value}
                      onChange={val => {
                        field.onChange(val);
                      }}
                      placeholder='https://… or /uploads/…'
                      className='flex-1'
                    />
                    <label className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-[10px] text-sm'>
                      <UploadCloud className='h-4 w-4' />
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={e => {
                          const f = e.target.files?.[0] || null;
                          setImgFile(f);
                          setValue('hasImgFile', !!f, { shouldValidate: true });
                          setValue('imgUrl', f.name);
                          trigger('imgUrl');
                        }}
                      />
                    </label>
                  </div>
                  <div className='mt-2'>
                    <MediaPreview type='image' url={imgFile ? URL.createObjectURL(imgFile) : field.value} />
                  </div>
                </Field>
              </div>
            )}
          />

          <Controller
            name='videoUrl'
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <Field label='Video' required error={fieldState.error?.message}>
                  <div className='flex items-center gap-2'>
                    <TextInput
                      name='videoUrl'
                      value={field.value}
                      onChange={val => {
                        field.onChange(val);
                      }}
                      placeholder='https://… or /uploads/…'
                      className='flex-1'
                    />
                    <label className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-[10px] text-sm'>
                      <UploadCloud className='h-4 w-4' />
                      <input
                        type='file'
                        accept='video/*'
                        className='hidden'
                        onChange={e => {
                          const f = e.target.files?.[0] || null;
                          setVideoFile(f);
                          setValue('hasVideoFile', !!f, { shouldValidate: true });
                          setValue('videoUrl', f.name);
                          trigger('videoUrl');
                        }}
                      />
                    </label>
                  </div>
                  <div className='mt-2'>
                    <MediaPreview type='video' url={videoFile ? URL.createObjectURL(videoFile) : field.value} />
                  </div>
                </Field>
              </div>
            )}
          />
        </div>
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <PrimaryButton type='button' onClick={applyAISuggestions} loading={aiLoading} disabled={!nameVal || nameVal.trim().length < 2}>
          <Sparkles className='mr-1.5 h-4 w-4' />
          Fill with AI
        </PrimaryButton>

        {/* Save with RHF submitting state */}
        <PrimaryButton type='submit' loading={isSubmitting}>
          Save
        </PrimaryButton>
      </div>
    </form>
  );
}
