'use client';

import { useEffect, useMemo, useState } from 'react';
import { Reorder, motion } from 'framer-motion';
import { Plus, X as XIcon, CalendarDays, Dumbbell, Search, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import { Field } from '@/app/[locale]/dashboard/workouts/plans/page';

// ✅ RHF + Yup
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const MAX_EXERCISES_PER_DAY = 8;

/* -------------------------------------------------------------------------- */
/*                               Validation schema                            */
/* -------------------------------------------------------------------------- */

const ExerciseSchema = yup.object({
  exerciseId: yup.string().trim().required('Select an exercise'),
  _label: yup.string().nullable(), // UI only
});

const DaySchema = yup.object({
  dayOfWeek: yup.mixed().oneOf(DAYS, 'Pick a valid day').required('Pick a day'),
  nameOfWeek: yup
    .string()
    .transform(v => (typeof v === 'string' ? v.trim() : v))
    .required("Write the name of today's exercise"),
  exercises: yup.array().of(ExerciseSchema).min(1, 'Add at least one exercise'),
});

const PlanSchema = yup.object({
  name: yup.string().trim().required('Plan name is required'),
  program: yup.object({
    days: yup.array().of(DaySchema).min(1, 'Add at least one day'),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   PlanForm                                  */
/* -------------------------------------------------------------------------- */
export default function PlanForm({ initial, onSubmit }) {
  // Build default values from your initial shape
  const defaultValues = useMemo(() => {
    const days = (initial?.days || []).map(d => ({
      dayOfWeek: (d.day || d.dayOfWeek || 'saturday').toLowerCase(),
      nameOfWeek: d.name ?? d.nameOfWeek ?? '',
      exercises: (d.exercises || []).map(ex => ({
        exerciseId: ex.exerciseId || ex.id || ex.exercise?.id || '',
        _label: ex.name || ex.exercise?.name || '',
      })),
    }));

    return {
      name: initial?.name || '',
      program: { days },
    };
  }, [initial]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(PlanSchema),
    defaultValues,
    mode: 'onSubmit',
  });

  const {
    fields: dayFields,
    append: appendDay,
    remove: removeDay,
  } = useFieldArray({
    control,
    name: 'program.days',
  });

  const addDay = () =>
    appendDay({
      dayOfWeek: 'saturday',
      nameOfWeek: '',
      exercises: [],
    });

  // Submit: produce the same payload + nameOfWeek
  const onSubmitRHF = values => {
    const payload = {
      name: values.name,
      isActive: true,
      program: {
        days: values.program.days.map((d, dayIndex) => ({
          dayOfWeek: d.dayOfWeek,
          nameOfWeek: d.nameOfWeek, // 👈 send it
          orderIndex: dayIndex, // (ignored on backend; okay to send)
          exercises: d.exercises.map((ex, i) => ({
            order: i + 1,
            exerciseId: ex.exerciseId,
          })),
        })),
      },
    };
    return onSubmit?.({ payload });
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit(onSubmitRHF)}>
      {/* Plan name */}
      <Field>
        <Controller control={control} name='name' render={({ field }) => <Input {...field} placeholder='Plan name' />} />
        {errors?.name?.message ? <div className='mt-1 text-xs text-red-600'>{errors.name.message}</div> : null}
      </Field>

      {/* Days */}
      <div className='rounded-lg border border-slate-200'>
        {dayFields.length === 0 ? (
          <>
            {errors?.program?.days?.message ? <div className='p-2 text-xs text-red-600'>{String(errors.program.days.message)}</div> : null}
            <EmptyDaysState onAdd={addDay} />
          </>
        ) : (
          <div className='space-y-3 p-3'>
            {errors?.program?.days?.message ? <div className='-mt-2 mb-1 text-xs text-red-600'>{String(errors.program.days.message)}</div> : null}

            {dayFields.map((day, idx) => (
              <DayRow key={day.id} control={control} index={idx} removeDay={() => removeDay(idx)} />
            ))}
          </div>
        )}
      </div>

      <button type='button' onClick={addDay} className={`-mt-2 mb-4 justify-end px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50  flex items-center gap-1.5 ${dayFields.length < 1 && 'hidden'} `}>
        <Plus className='w-4 h-4' /> Add Day
      </button>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button type='submit' loading={isSubmitting} name={isSubmitting ? 'Saving…' : 'Save Plan'} />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                        DayRow (owns nested useFieldArray)                   */
/* -------------------------------------------------------------------------- */
function DayRow({ control, index, removeDay }) {
  const dayName = `program.days.${index}`;

  const {
    fields: exFields,
    prepend: exPrepend,
    remove: exRemove,
    replace: exReplace,
  } = useFieldArray({
    control,
    name: `${dayName}.exercises`,
  });

  const addExerciseToDay = ({ id, name }) => {
    const exists = exFields.some(e => e.exerciseId === id);
    if (exists || exFields.length >= MAX_EXERCISES_PER_DAY) return;
    exPrepend({ exerciseId: id, _label: name });
  };

  const onReorder = newList => {
    // newList is array of {exerciseId,_label} in the new order
    exReplace(newList);
  };

  return (
    <div className='rounded-lg border border-slate-200 p-3 bg-white'>
      {/* Day header */}
      <div className='flex items-center gap-2 mb-3'>
        <div className='flex items-center gap-3'>
          <Controller
            control={control}
            name={`${dayName}.dayOfWeek`}
            render={({ field, fieldState }) => (
              <div className='w-[180px] relative'>
                <Select
                  value={field.value}
                  onChange={v => field.onChange(v)}
                  options={DAYS.map(day => ({
                    id: day,
                    label: day.charAt(0).toUpperCase() + day.slice(1),
                  }))}
                  className='w-[180px]'
                />
                {fieldState.error?.message ? <div className='absolute top-full text-nowrap  mt-1 text-xs text-red-600'>{fieldState.error.message}</div> : null}
              </div>
            )}
          />

          <Field>
            <Controller
              control={control}
              name={`${dayName}.nameOfWeek`}
              render={({ field, fieldState }) => (
                <div className='relative'>
                  <Input {...field} placeholder="Name of today's exercise" cnInput='!h-[40px]' />
                  {fieldState?.error?.message ? <div className=' absolute top-full text-nowrap  mt-1 text-xs text-red-600'>{fieldState.error.message}</div> : null}
                </div>
              )}
            />
          </Field>
        </div>

        <div className='ml-auto text-xs text-slate-500'>
          {exFields.length} / {MAX_EXERCISES_PER_DAY}
        </div>
        <button type='button' onClick={removeDay} className='w-9 h-9 grid place-content-center rounded-lg border border-slate-200 hover:bg-slate-50' title='Remove day'>
          <XIcon className='w-4 h-4 text-red-600' />
        </button>
      </div>

      {/* Exercises error (array-level) */}
      <Controller control={control} name={`${dayName}.exercises`} render={({ fieldState }) => (fieldState.error?.message ? <div className='-mt-1 mb-2 text-xs text-red-600'>{fieldState.error.message}</div> : null)} />

      {/* Selected exercises as chips with X */}
      <div className='mb-3'>
        {exFields.length ? (
          <ExerciseChips
            items={exFields}
            onRemove={exRemove} // expects index
            onReorder={onReorder}
            limit={9}
          />
        ) : (
          <EmptyExercisesState />
        )}
      </div>

      {/* Search to add (and create) */}
      <ExerciseSearchInline disabled={exFields.length >= MAX_EXERCISES_PER_DAY} onPick={item => addExerciseToDay(item)} onCreate={created => addExerciseToDay({ id: created.id, name: created.name })} cap={MAX_EXERCISES_PER_DAY} count={exFields.length} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          ExerciseSearchInline (per day)                     */
/* -------------------------------------------------------------------------- */
function ExerciseSearchInline({ disabled, onPick, onCreate, cap, count }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const atCap = disabled;

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!q || q.length < 2) {
        setOpts([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get('/plan-exercises', { params: { page: 1, limit: 12, search: q } });
        const recs = Array.isArray(res.data?.records) ? res.data.records : Array.isArray(res.data) ? res.data : [];
        if (alive) setOpts(recs);
      } catch {
        if (alive) setOpts([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className='relative'>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={atCap}
            placeholder={atCap ? `Reached ${cap} exercises` : 'Search exercise… (min 2 chars)'}
            className={` pr-[30px] h-[40px] w-full pl-10 rounded-lg bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition   ${atCap ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300'} `}
          />
          <X
            size={20}
            onClick={() => {
              setQ('');
              setOpen(false);
            }}
            className=' cursor-pointer absolute top-1/2 -translate-y-1/2 right-2 '
          />
        </div>

        <button type='button' onClick={() => setCreateOpen(true)} disabled={atCap} className={`px-3 rounded-lg border text-sm ${atCap ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-300 bg-white'}`} title='Create new exercise'>
          Create
        </button>
      </div>

      {open && (opts.length || loading) ? (
        <div className='absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow'>
          {loading ? (
            <div className='px-3 py-2 text-sm text-slate-500'>Searching…</div>
          ) : (
            opts.map(o => (
              <button
                key={o.id}
                type='button'
                onClick={() => {
                  if (!atCap) onPick({ id: o.id, name: o.name });
                }}
                className='w-full text-left px-3 py-2 text-sm hover:bg-slate-50'>
                {o.name}
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className='mt-1 text-[11px] text-slate-500'>
        {count}/{cap} selected
      </div>

      {createOpen && (
        <CreateExerciseModal
          onClose={() => setCreateOpen(false)}
          onCreated={created => {
            if (!atCap) onCreate?.(created);
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         CreateExerciseModal (library)                       */
/* -------------------------------------------------------------------------- */
function CreateExerciseModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [targetReps, setTargetReps] = useState(10);
  const [targetSets, setTargetSets] = useState(2);
  const [restSeconds, setRestSeconds] = useState(90);
  const [tempo, setTempo] = useState('1/1/1');
  const [desc, setDesc] = useState('');

  // NEW: file state
  const [imgFile, setImgFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const MAX_IMG_MB = 8;
  const MAX_VIDEO_MB = 200;

  const pickFile = (e, kind) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);

    if (kind === 'img') {
      if (!file.type.startsWith('image/')) {
        setErr('Please choose an image file.');
        return;
      }
      if (sizeMB > MAX_IMG_MB) {
        setErr(`Image too large. Max ${MAX_IMG_MB}MB.`);
        return;
      }
      setErr(null);
      setImgFile(file);
      setImgPreview(URL.createObjectURL(file));
    } else {
      if (!file.type.startsWith('video/')) {
        setErr('Please choose a video file.');
        return;
      }
      if (sizeMB > MAX_VIDEO_MB) {
        setErr(`Video too large. Max ${MAX_VIDEO_MB}MB.`);
        return;
      }
      setErr(null);
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const clearFile = kind => {
    if (kind === 'img') {
      setImgFile(null);
      if (imgPreview) URL.revokeObjectURL(imgPreview);
      setImgPreview('');
    } else {
      setVideoFile(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview('');
    }
  };

  const handleCreate = async () => {
    setErr(null);
    if (!name) {  setErr('Name is required.');  return; }
    if (!imgFile) {  setErr('Image is required.');  return; }
    if (!videoFile) {  setErr('Video is required.');  return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('targetReps', targetReps || '10');
      fd.append('targetSets', targetSets ? String(Number(targetSets)) : '3');
      fd.append('rest', restSeconds ? String(Number(restSeconds)) : '90'); // <-- backend expects "rest"
      if (tempo) fd.append('tempo', tempo);
      if (desc) fd.append('desc', desc);

      // Files — names must be exactly 'img' and 'video' to match your interceptor
      if (imgFile) fd.append('img', imgFile);
      if (videoFile) fd.append('video', videoFile);

      const res = await api.post('/plan-exercises', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // onUploadProgress: (evt) => { /* optional progress bar */ },
      });

      const created = res.data;
      onCreated(created);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='fixed w-[calc(100%+20px)] h-[calc(100%+20px)] top-[-10px] left-[-10px] inset-0 z-40 grid place-items-center backdrop-blur-[100px] rounded-lg  bg-black/50 p-4'>
      <div className='w-full overflow-auto max-w-lg rounded-lg bg-white border border-slate-200 '>
        <div className='flex items-center justify-between mb-2 p-4'>
          <div className='text-base font-semibold'>Create Exercise</div>
          <button onClick={onClose} className='w-9 h-9 grid place-content-center rounded-lg border border-slate-200 hover:bg-slate-50'>
            <XIcon className='w-4 h-4' />
          </button>
        </div>

        <div className='px-4 max-h-[350px] overflow-auto  grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Field label='Name *'>
            <Input value={name} onChange={setName} placeholder='e.g. Machine Flat Chest Press' />
          </Field>

          <Field label='Tempo'>
            <Input value={tempo} onChange={setTempo} placeholder='e.g. 1/1/1' />
          </Field>

          <Field label='Target Reps'>
            <Input value={targetReps} onChange={setTargetReps} placeholder='e.g. 8-12' />
          </Field>

          <Field label='Target Sets'>
            <Input type='number' value={targetSets} onChange={setTargetSets} placeholder='e.g. 3' />
          </Field>

          <div className='col-span-2 grid grid-cols-2 gap-5 ' >
            <Field label='Rest (seconds)'>
              <Input type='number' value={restSeconds} onChange={setRestSeconds} placeholder='e.g. 90' />
            </Field>
           </div>

          {/* Image upload */}
          <Field label='Image'>
            <div className='space-y-2'>
              <label className='block'>
                <input type='file' accept='image/*' onChange={e => pickFile(e, 'img')} className='block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:hover:bg-slate-50 file:cursor-pointer' />
              </label>
              {imgPreview ? (
                <div className='relative'>
                  <img src={imgPreview} alt='preview' className='h-28 w-full object-contain rounded-lg border border-slate-200' />
                  <button type='button' onClick={() => clearFile('img')} className='absolute top-1 right-1 w-7 h-7 grid place-content-center rounded-lg bg-white/90 border  border-slate-200'>
                    <XIcon className='w-4 h-4' />
                  </button>
                </div>
              ) : (
                <div className='text-xs text-slate-500'>PNG/JPG up to {MAX_IMG_MB}MB.</div>
              )}
            </div>
          </Field>

          {/* Video upload */}
          <Field label='Video'>
            <div className='space-y-2'>
              <label className='block'>
                <input type='file' accept='video/*' onChange={e => pickFile(e, 'video')} className='block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:hover:bg-slate-50 file:cursor-pointer' />
              </label>
              {videoPreview ? (
                <div className='relative'>
                  <video src={videoPreview} controls className='h-28 w-full object-contain rounded-lg border  border-slate-200' />
                  <button type='button' onClick={() => clearFile('video')} className='absolute top-1 right-1 w-7 h-7 grid place-content-center rounded-lg bg-white/90 border  border-slate-200'>
                    <XIcon className='w-4 h-4' />
                  </button>
                </div>
              ) : (
                <div className='text-xs text-slate-500'>MP4/MOV up to {MAX_VIDEO_MB}MB.</div>
              )}
            </div>
          </Field>
        </div>

        {err ? <div className='mx-4 mt-2 p-2 rounded bg-red-50 text-red-600 text-sm border border-red-100'>{err}</div> : null}

        <div className='px-4 !pb-6  flex justify-end gap-2 mt-3'>
          <Button onClick={handleCreate} loading={submitting} name={submitting ? 'Saving…' : 'Create'} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   UI bits                                  */
/* -------------------------------------------------------------------------- */

function NumberInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type='number'
      value={value === '' ? '' : value}
      onChange={e => {
        const v = e.target.value;
        onChange(v === '' ? '' : v);
      }}
      placeholder={placeholder}
      className={`h-[40px] w-full px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className='w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30' />;
}

function EmptyDaysState({ onAdd }) {
  return (
    <div className='p-8 rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 text-center'>
      <div className='mx-auto w-14 h-14 rounded-lg bg-indigo-50 text-indigo-600 grid place-content-center shadow-sm'>
        <CalendarDays className='w-7 h-7' />
      </div>

      <h3 className='mt-4 text-lg font-semibold text-slate-900'>No days yet</h3>
      <p className='mt-1 text-sm text-slate-600'>Start building your program by adding a workout day, then pick up to 8 exercises for it.</p>

      <div className='mt-4'>
        <button type='button' onClick={onAdd} className='inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow hover:scale-[.98] transition'>
          <Plus className='w-4 h-4' />
          Add your first day
        </button>
      </div>

      <div className='mt-3 text-[11px] text-slate-500'>Tip: you can add multiple days (Mon–Sun) and up to 8 exercises per day.</div>
    </div>
  );
}

function EmptyExercisesState() {
  return (
    <div className='mt-2 p-6 rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 text-center'>
      <div className='mx-auto w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 grid place-content-center shadow-sm'>
        <Dumbbell className='w-6 h-6' />
      </div>

      <h4 className='mt-3 text-base font-semibold text-slate-900'>No exercises yet</h4>
      <p className='mt-1 text-sm text-slate-600'>
        Add up to <span className='font-semibold'>8 exercises</span> for this day. Pick from the library or create a new one if it’s missing.
      </p>
    </div>
  );
}

/* Chips with reordering; passes back new ordered array */
function ExerciseChips({ items = [], onRemove, onReorder, limit = 9 }) {
  const [expanded, setExpanded] = useState(false);

  // keep a parallel array of indices we can reorder safely
  const [indices, setIndices] = useState(() => items.map((_, i) => i));

  // whenever items change length/order externally, reset indices
  useEffect(() => {
    setIndices(items.map((_, i) => i));
  }, [items]);

  const extraCount = Math.max(0, items.length - limit);

  // the set we *visually* render (first N if collapsed, otherwise all)
  const visible = expanded ? indices : indices.slice(0, Math.min(limit, indices.length));
  const hiddenTail = expanded ? [] : indices.slice(visible.length);

  // when user reorders in the UI
  const handleReorder = newVisible => {
    // stitch back the array: (reordered visible) + (unchanged hidden tail)
    const nextIndices = expanded ? newVisible : [...newVisible, ...hiddenTail];
    setIndices(nextIndices);

    // map indices -> items and bubble up to parent so it can persist the new order
    const nextList = nextIndices.map(i => items[i]);
    onReorder?.(nextList);
  };

  if (!items.length) {
    return (
      <div className='mt-2 p-4 rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 text-center'>
        <div className='mx-auto w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 grid place-content-center shadow-sm'>
          <Dumbbell className='w-5 h-5' />
        </div>
        <div className='mt-2 text-sm text-slate-600'>No exercises added yet.</div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <Reorder.Group axis='x' as='div' values={visible} onReorder={handleReorder} className='flex flex-wrap gap-1.5'>
        {visible.map(originalIdx => {
          const ex = items[originalIdx] || {};
          const label = ex._label || ex.exerciseId || 'Exercise';

          return (
            <Reorder.Item key={`${ex.exerciseId || 'ex'}-${originalIdx}`} value={originalIdx} layout transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }} whileDrag={{ scale: 1.04, boxShadow: '0 12px 28px rgba(2, 6, 23, .18)' }} className='group cursor-grab active:cursor-grabbing inline-flex items-center gap-2 pl-1 pr-1 py-1 rounded-lg text-xs bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow transition'>
              <span className='w-5 h-5 rounded-lg bg-slate-50 border border-slate-200 grid place-content-center text-slate-400 group-hover:text-slate-600' title='Drag to reorder'>
                <GripVertical className='w-3.5 h-3.5' />
              </span>

              <span className='w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 grid place-content-center text-[10px] font-semibold'>{indices.indexOf(originalIdx) + 1}</span>

              <span className='inline-flex items-center gap-1.5 max-w-[240px]'>
                <Dumbbell className='w-3.5 h-3.5 text-indigo-600/90' />
                <span className='truncate' title={label}>
                  {label}
                </span>
              </span>

              <button
                type='button'
                onClick={() => onRemove?.(originalIdx)}
                className='ml-1 inline-flex items-center justify-center w-5 h-5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent group-hover:border-red-200 transition'
                title='Remove'
                aria-label={`Remove ${label}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRemove?.(originalIdx);
                  }
                }}>
                <XIcon className='w-3.5 h-3.5' />
              </button>
            </Reorder.Item>
          );
        })}

        {!expanded && extraCount > 0 ? (
          <motion.button type='button' onClick={() => setExpanded(true)} whileTap={{ scale: 0.97 }} className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 border border-slate-200 hover:bg-slate-50' title='Show more'>
            <ChevronDown className='w-3.5 h-3.5' />+{extraCount} more
          </motion.button>
        ) : null}

        {expanded && items.length > limit ? (
          <motion.button type='button' onClick={() => setExpanded(false)} whileTap={{ scale: 0.97 }} className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 border border-slate-200 hover:bg-slate-50' title='Show less'>
            <ChevronUp className='w-3.5 h-3.5' />
            Show less
          </motion.button>
        ) : null}
      </Reorder.Group>

      <div className='text-[11px] text-slate-500'>Drag chips to reorder. Click ✕ to remove from this day.</div>
    </div>
  );
}
