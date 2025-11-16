'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, UploadCloud, CheckCircle2, Loader2, Info, X, Images, Plus, RefreshCw } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// UI atoms from your project
import Input from '@/components/atoms/Input';
import Textarea from '@/components/atoms/Textarea';
import Select from '@/components/atoms/Select';
import InputDate from '@/components/atoms/InputDate';
import { Switcher } from '@/components/atoms/Switcher';
import Img from '@/components/atoms/Img';

// Axios API instance
import api from '@/utils/axios';

/* ----------------------------- Local UI bits ----------------------------- */
const Button = ({ name, children, className = '', disabled, onClick, type = 'button', color = 'primary' }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={['inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[.98]', color === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50', color === 'neutral' && 'bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50', color === 'danger' && 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50', className].join(' ')}>
    {children || name}
  </button>
);

function Section({ icon, title, children, extra }) {
  const Icon = icon || Info;
  return (
    <section className='box-3d rounded-lg bg-white/90 backdrop-blur border border-slate-200 '>
      <header className='px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur z-10 rounded-t-lg'>
        <div className='flex items-center gap-2'>
          <Icon className='w-4 h-4 text-indigo-600' />
          <h2 className='font-semibold text-slate-800 text-base sm:text-lg'>{title}</h2>
        </div>
        {extra || null}
      </header>
      <div className='p-3 sm:p-5 space-y-2'>{children}</div>
    </section>
  );
}

/* ----------------------------- Helpers (API) ----------------------------- */
async function getMeasurements(days = 180) {
  const { data } = await api.get('/profile/measurements', { params: { days } });
  return Array.isArray(data) ? data : [];
}
async function postMeasurement(payload) {
  const { data } = await api.post('/profile/measurements', payload);
  return data;
}
async function getPhotosTimeline({ page = 1, limit = 50, sortOrder = 'DESC' } = {}) {
  const { data } = await api.get('/profile/photos/timeline', { params: { page, limit, sortOrder } });
  return { rows: data?.records || data?.data || [], meta: data?.meta || null };
}
async function uploadProgressPhotos(formData) {
  const { data } = await api.post('/profile/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data; // { id, sides:{front,..}, takenAt, weight, note }
}
async function postWeeklyReport(payload) {
  // INTEGRATED to your backend controller: POST /weekly-reports
  const { data } = await api.post('/weekly-reports', payload);
  return data;
}

/* ------------------------- Image Picker + Modal -------------------------- */
function ImagePicker({ openPopup, label, file, onPick, pickedUrl, onClearPicked, uploadText, replaceText }) {
  const hasPicked = !!pickedUrl;
  const inputRef = useRef(null);

  const triggerFile = () => inputRef.current && inputRef.current.click();

  return (
    <div className='rounded-lg border border-slate-200 bg-slate-50 p-2'>
      <div className='text-[12px] text-slate-700 mb-2'>{label}</div>

      <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={e => onPick((e.target.files && e.target.files[0]) || null)} />

      {hasPicked ? (
        <div className='relative'>
          <Img src={pickedUrl} alt={label} className='w-full h-32 object-cover rounded-lg border border-slate-200' />
          <div className='absolute top-1 left-1 flex gap-1'>
            <Button type='button' color='danger' className='!px-2 !py-1' onClick={onClearPicked}>
              <X className='w-4 h-4' />
            </Button>
          </div>
        </div>
      ) : file ? (
        <div className='relative'>
          <img src={URL.createObjectURL(file)} alt={label} className='w-full h-32 object-cover rounded-lg border border-slate-200' />
          <Button type='button' color='danger' className='absolute -top-2 -left-2 rounded-full p-1 shadow' onClick={() => onPick(null)} aria-label='remove'>
            <X className='w-4 h-4' />
          </Button>
        </div>
      ) : (
        <div onClick={openPopup || triggerFile} className='h-32 rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'>
          <Camera className='w-5 h-5' />
          <button type='button' className='text-[12px] underline'>
            {uploadText}
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoPickerModal({ onClose, photos, onPick, selected = { front: null, back: null, left: null, right: null }, t }) {
  const sides = ['front', 'back', 'left', 'right'];
  const flat = [];
  (photos || []).forEach(p => {
    const s = p.sides || {};
    sides.forEach(side => {
      if (s[side]) flat.push({ id: `${p.id}-${side}`, side, url: s[side], takenAt: p.takenAt, weight: p.weight ?? null });
    });
  });

  return (
    <div className='fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3'>
      <div className='w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-slate-200'>
          <div className='font-semibold text-slate-800'>{t('weekly.photos.pickFromHistory.title')}</div>
          <button type='button' onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-4 overflow-auto max-h-[70vh] '>
          {flat.length === 0 ? (
            <div className='text-sm text-slate-600'>{t('weekly.photos.pickFromHistory.empty')}</div>
          ) : (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              {flat.map(it => {
                const isActive = selected[it.side] === it.url;
                return (
                  <button type='button' key={it.id} onClick={() => onPick(it.side, it.url)} className={['group relative rounded-lg overflow-hidden border transition', isActive ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-200 hover:border-indigo-400'].join(' ')}>
                    <Img src={it.url} alt={it.side} className='h-32 w-full object-contain' />
                    {isActive && <div className='absolute inset-0 bg-indigo-500/10 pointer-events-none' />}
                    <div className='absolute inset-x-0 bottom-0 bg-black/40 text-white text-[11px] px-2 py-1 flex items-center justify-between'>
                      <span>{t(`weekly.photos.${it.side}`)}</span>
                      <span>
                        {it.takenAt}
                        {it.weight ? ` • ${it.weight}kg` : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className='px-4 py-3 border-t border-slate-200 flex justify-end'>
          <Button type='button' name={t('weekly.actions.close')} onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Rating Stars ----------------------------- */
function Star({ filled, className }) {
  return (
    <svg viewBox='0 0 24 24' className={className} aria-hidden='true' role='img'>
      <path d='M12 3.6l2.62 5.31 5.86.85-4.24 4.13 1 5.83L12 17.9l-5.24 2.76 1-5.83L3.5 9.76l5.86-.85L12 3.6z' className={filled ? 'fill-amber-500' : 'fill-slate-300'} />
    </svg>
  );
}
const sizeMap = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-9 w-9', xl: 'h-12 w-12' };
function RatingStars({ label, value = 0, onChange = () => {}, allowZero = false, max = 5, size = 'md', readOnly = false, className = '', dir = 'auto', name = 'rating', required }) {
  const items = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);
  function handleSelect(n) {
    if (readOnly) return;
    const next = n === 0 && allowZero ? 0 : n;
    onChange(next);
  }
  return (
    <div className={['space-y-1', className].join(' ')} dir={dir}>
      {!!label && (
        <label className='block text-sm font-medium text-slate-700'>
          {label}
          {required ? <span className='text-rose-600 ml-1'>*</span> : null}
        </label>
      )}
      <div className={['inline-flex items-center gap-2 rounded-lg px-2 py-1', readOnly ? 'opacity-80' : 'hover:bg-slate-50'].join(' ')} role='radiogroup' aria-label={typeof label === 'string' ? label : 'rating'}>
        {items.map(n => {
          const filled = n <= value;
          return (
            <button key={n} type='button' role='radio' aria-checked={value === n} onClick={() => handleSelect(n)} disabled={readOnly} className={['grid place-items-center rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2', !readOnly && 'cursor-pointer'].join(' ')}>
              <Star filled={filled} className={sizeMap[size] || sizeMap.md} />
              <span className='sr-only'>{n}</span>
              <input name={name} value={n} type='radio' className='hidden' readOnly checked={value === n} tabIndex={-1} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== Weekly Report ============================= */
export default function WeeklyReportPage() {
  const t = useTranslations();

  // Photos (new uploads quick pick)
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [leftFile, setLeftFile] = useState(null);
  const [rightFile, setRightFile] = useState(null);

  // Photos (from history / dropdown)
  const [historyRows, setHistoryRows] = useState([]);
  const [photoSelect, setPhotoSelect] = useState('');
  const [showPickModal, setShowPickModal] = useState(false);
  const [pickedSides, setPickedSides] = useState({ front: null, back: null, left: null, right: null });
  const [showAddPhotoForm, setShowAddPhotoForm] = useState(false);
  const [uploadingSet, setUploadingSet] = useState(false);

  // Measurements history
  const [measureList, setMeasureList] = useState([]);
  const [measureSelect, setMeasureSelect] = useState('');
  const [showAddMeasureForm, setShowAddMeasureForm] = useState(false);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [serverError, setServerError] = useState('');

  // RHF + Yup
  const schema = useMemo(
    () =>
      yup.object({
        weekOf: yup.string().required(t('weekly.errors.required')),
        cardioAdherence: yup.number().typeError(t('weekly.errors.required')).required(t('weekly.errors.required')).min(1).max(5),
        measurements: yup.object({
          date: yup.string().when(['weight', 'waist', 'chest', 'hips', 'arms', 'thighs'], {
            is: (w, wa, c, h, a, th) => [w, wa, c, h, a, th].some(v => v !== '' && v != null),
            then: s => s.required(t('weekly.errors.required')),
            otherwise: s => s.optional(),
          }),
          weight: yup.mixed(),
          waist: yup.mixed(),
          chest: yup.mixed(),
          hips: yup.mixed(),
          arms: yup.mixed(),
          thighs: yup.mixed(),
        }),
        addPhoto: yup.object({
          date: yup.string().when(['front', 'back', 'left', 'right'], {
            is: (f, b, l, r) => [f, b, l, r].some(Boolean),
            then: s => s.required(t('weekly.errors.required')),
            otherwise: s => s.optional(),
          }),
          weight: yup.mixed(),
          note: yup.mixed(),
          front: yup.mixed().nullable(true).optional(),
          back: yup.mixed().nullable(true).optional(),
          left: yup.mixed().nullable(true).optional(),
          right: yup.mixed().nullable(true).optional(),
        }),
      }),
    [t],
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      weekOf: '',
      cardioAdherence: '',
      diet: {
        hungry: false,
        mentalComfort: false,
        wantSpecific: '',
        foodTooMuch: false,
        dietDeviation: { hasDeviation: false, times: '', details: '' },
      },
      training: {
        intensityOk: false,
        daysDeviation: { hasDeviation: false, count: '', reason: '' },
        shapeChange: false,
        fitnessChange: false,
        sleepEnough: false,
        sleepHours: '',
        programNotes: '',
      },
      measurements: { date: '', weight: '', waist: '', chest: '', hips: '', arms: '', thighs: '' },
      addPhoto: { date: '', weight: '', note: '', front: undefined, back: undefined, left: undefined, right: undefined },
    },
    mode: 'onChange',
  });

  const weekOf = watch('weekOf');
  const cardioAdherence = watch('cardioAdherence');
  const m = watch('measurements');
  const addPhotoVals = watch('addPhoto');

  /* ---------------------------- Derived / Options ---------------------------- */
  const measurementOptions = useMemo(() => measureList.map(mm => ({ id: mm.id, label: `${mm.date}${mm.weight ? ` • ${mm.weight}kg` : ''}` })), [measureList]);
  const photoSetOptions = useMemo(() => historyRows.map(r => ({ id: r.id, label: `${r.takenAt}${r.weight ? ` • ${r.weight}kg` : ''}` })), [historyRows]);

  // progress calculations (for header bar & sticky bar)
  const reqTotal = useMemo(() => {
    const anyMeas = ['weight', 'waist', 'chest', 'hips', 'arms', 'thighs'].some(k => `${m?.[k] ?? ''}`.trim() !== '');
    return 2 + (anyMeas ? 1 : 0);
  }, [m]);

  const reqDone = useMemo(() => {
    const base = (weekOf ? 1 : 0) + (cardioAdherence ? 1 : 0);
    const anyMeas = ['weight', 'waist', 'chest', 'hips', 'arms', 'thighs'].some(k => `${m?.[k] ?? ''}`.trim() !== '');
    return base + (anyMeas && m?.date ? 1 : 0);
  }, [weekOf, cardioAdherence, m]);

  const reqPct = Math.round((reqDone / reqTotal) * 100) || 0;

  /* -------------------------------- Lifecycle -------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const list = await getMeasurements(180);
        setMeasureList(list || []);
        if (list?.length) {
          const last = list[list.length - 1];
          setMeasureSelect(last.id);
          hydrateMeasurement(last);
        } else {
          setValue('measurements.date', new Date().toISOString().slice(0, 10));
        }
      } catch {}

      try {
        const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
        setHistoryRows(rows);
      } catch {}
    })();
  }, [setValue]);

  function hydrateMeasurement(mm) {
    setValue('measurements.date', mm?.date || '');
    setValue('measurements.weight', mm?.weight ?? '');
    setValue('measurements.waist', mm?.waist ?? '');
    setValue('measurements.chest', mm?.chest ?? '');
    setValue('measurements.hips', mm?.hips ?? '');
    setValue('measurements.arms', mm?.arms ?? '');
    setValue('measurements.thighs', mm?.thighs ?? '');
  }

  const onPickMeasurement = id => {
    setMeasureSelect(id);
    const found = measureList.find(mm => mm.id === id);
    if (found) {
      hydrateMeasurement(found);
      setShowAddMeasureForm(false);
    }
  };

  async function saveMeasurementInline() {
    const dto = {
      date: m?.date,
      weight: m?.weight !== '' ? Number(m.weight) : null,
      waist: m?.waist !== '' ? Number(m.waist) : null,
      chest: m?.chest !== '' ? Number(m.chest) : null,
      hips: m?.hips !== '' ? Number(m.hips) : null,
      arms: m?.arms !== '' ? Number(m.arms) : null,
      thighs: m?.thighs !== '' ? Number(m.thighs) : null,
    };
    const saved = await postMeasurement(dto);
    const existsIdx = measureList.findIndex(mm => mm.id === saved.id);
    let next = [...measureList];
    if (existsIdx >= 0) next[existsIdx] = saved;
    else next.push(saved);
    next.sort((a, b) => a.date.localeCompare(b.date));
    setMeasureList(next);
    setMeasureSelect(saved.id);
    setShowAddMeasureForm(false);
  }

  function applyPhotoSetToPickedSides(setId) {
    const entry = historyRows.find(r => r.id === setId);
    if (!entry) return;
    const s = entry.sides || {};
    setPickedSides({
      front: s.front || null,
      back: s.back || null,
      left: s.left || null,
      right: s.right || null,
    });
  }

  const onPickPhotoSet = id => {
    setPhotoSelect(id);
    applyPhotoSetToPickedSides(id);
    setShowAddPhotoForm(false);
  };

  async function openPickPhotosModal() {
    try {
      const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
      setHistoryRows(rows);
    } catch {}
    setShowPickModal(true);
  }

  const hasAnyPhotoNew = !!(frontFile || backFile || leftFile || rightFile || addPhotoVals.front || addPhotoVals.back || addPhotoVals.left || addPhotoVals.right);

  /* ----------- Upload-only flow for "Add new photo set" (separate button) ----------- */
  const uploadNewPhotoSet = async () => {
    try {
      setServerError('');
      setUploadingSet(true);

      const fd = new FormData();
      const addFront = addPhotoVals.front;
      const addBack = addPhotoVals.back;
      const addLeft = addPhotoVals.left;
      const addRight = addPhotoVals.right;

      if (!(addFront || addBack || addLeft || addRight)) {
        setServerError(t('weekly.photos.errors.noFiles'));
        setUploadingSet(false);
        return;
      }

      if (addFront) fd.append('front', addFront);
      if (addBack) fd.append('back', addBack);
      if (addLeft) fd.append('left', addLeft);
      if (addRight) fd.append('right', addRight);

      const takenAt = addPhotoVals.date || m?.date || weekOf;
      if (!takenAt) {
        setServerError(t('weekly.photos.errors.dateRequired'));
        setUploadingSet(false);
        return;
      }

      const dataObj = {
        takenAt,
        weight: addPhotoVals.weight || m?.weight || null,
        note: addPhotoVals.note || '',
      };
      fd.append('data', JSON.stringify(dataObj));

      const saved = await uploadProgressPhotos(fd);

      // refresh & select
      const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
      setHistoryRows(rows);
      setPhotoSelect(saved?.id || '');
      if (saved?.id) applyPhotoSetToPickedSides(saved.id);

      // clear addPhoto inputs
      setValue('addPhoto.front', undefined);
      setValue('addPhoto.back', undefined);
      setValue('addPhoto.left', undefined);
      setValue('addPhoto.right', undefined);
      setValue('addPhoto.date', '');
      setValue('addPhoto.weight', '');
      setValue('addPhoto.note', '');

      setShowAddPhotoForm(false);
      setOk(true);
    } catch (err) {
      setServerError(err?.message || t('weekly.errors.unknown'));
    } finally {
      setUploadingSet(false);
      setTimeout(() => setOk(false), 3000);
    }
  };

  /* --------------------------------- Submit (full report) --------------------------------- */
  const onSubmit = async values => {
    setServerError('');
    setOk(false);

    try {
      setSubmitting(true);

      // 1) Save measurement if present/changed
      if (values.measurements?.date) {
        await saveMeasurementInline();
      }

      // 2) Upload NEW photos if provided (either quick pickers or addPhoto form)
      let uploadedSides = { front: null, back: null, left: null, right: null };
      if (hasAnyPhotoNew) {
        const fd = new FormData();
        const addFront = frontFile || values.addPhoto?.front;
        const addBack = backFile || values.addPhoto?.back;
        const addLeft = leftFile || values.addPhoto?.left;
        const addRight = rightFile || values.addPhoto?.right;

        if (addFront) fd.append('front', addFront);
        if (addBack) fd.append('back', addBack);
        if (addLeft) fd.append('left', addLeft);
        if (addRight) fd.append('right', addRight);

        const takenAt = values.addPhoto?.date || values.measurements?.date || values.weekOf;
        const dataObj = {
          takenAt,
          weight: values.addPhoto?.weight || values.measurements?.weight || null,
          note: values.addPhoto?.note || values.training?.programNotes || '',
        };
        fd.append('data', JSON.stringify(dataObj));

        const saved = await uploadProgressPhotos(fd);
        uploadedSides = saved?.sides || uploadedSides;

        try {
          const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
          setHistoryRows(rows);
          setPhotoSelect(saved?.id || '');
          if (saved?.id) applyPhotoSetToPickedSides(saved.id);
          setShowAddPhotoForm(false);
        } catch {}
      }

      // 3) Compose photos payload from picked or uploaded
      const photosPayload = {
        front: pickedSides.front ? { url: pickedSides.front } : uploadedSides.front ? { url: uploadedSides.front } : null,
        back: pickedSides.back ? { url: pickedSides.back } : uploadedSides.back ? { url: uploadedSides.back } : null,
        left: pickedSides.left ? { url: pickedSides.left } : uploadedSides.left ? { url: uploadedSides.left } : null,
        right: pickedSides.right ? { url: pickedSides.right } : uploadedSides.right ? { url: uploadedSides.right } : null,
        extras: [],
      };

      // 4) Send weekly report (matches CreateWeeklyReportDto)
      const payload = {
        weekOf: values.weekOf,
        diet: {
          hungry: values.diet?.hungry ? 'yes' : 'no',
          mentalComfort: values.diet?.mentalComfort ? 'yes' : 'no',
          wantSpecific: values.diet?.wantSpecific || '',
          foodTooMuch: values.diet?.foodTooMuch ? 'yes' : 'no',
          dietDeviation: {
            hasDeviation: values.diet?.dietDeviation?.hasDeviation ? 'yes' : 'no',
            times: values.diet?.dietDeviation?.times || null,
            details: values.diet?.dietDeviation?.details || null,
          },
        },
        training: {
          intensityOk: values.training?.intensityOk ? 'yes' : 'no',
          daysDeviation: {
            hasDeviation: values.training?.daysDeviation?.hasDeviation ? 'yes' : 'no',
            count: values.training?.daysDeviation?.count || null,
            reason: values.training?.daysDeviation?.reason || null,
          },
          shapeChange: values.training?.shapeChange ? 'yes' : 'no',
          fitnessChange: values.training?.fitnessChange ? 'yes' : 'no',
          sleep: {
            enough: values.training?.sleepEnough ? 'yes' : 'no',
            hours: values.training?.sleepHours || null,
          },
          programNotes: values.training?.programNotes || '',
          cardioAdherence: Number(values.cardioAdherence),
        },
        measurements: values.measurements?.date
          ? {
              date: values.measurements.date,
              weight: values.measurements.weight ? Number(values.measurements.weight) : null,
              waist: values.measurements.waist ? Number(values.measurements.waist) : null,
              chest: values.measurements.chest ? Number(values.measurements.chest) : null,
              hips: values.measurements.hips ? Number(values.measurements.hips) : null,
              arms: values.measurements.arms ? Number(values.measurements.arms) : null,
              thighs: values.measurements.thighs ? Number(values.measurements.thighs) : null,
            }
          : null,
        photos: photosPayload,
        notifyCoach: true,
      };

      await postWeeklyReport(payload);
      setOk(true);
    } catch (e) {
      setServerError(typeof e === 'string' ? e : e?.message || t('weekly.errors.unknown'));
    } finally {
      setSubmitting(false);
      setTimeout(() => setOk(false), 3500);
    }
  };

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className=' relative !px-0 space-y-4 sm:space-y-5'>
      {/* Header */}
      <div className='box-3d rounded-lg border border-slate-200 bg-white/90 backdrop-blur p-4 sm:p-6 shadow-sm'>
        <h1 className='text-xl sm:text-2xl font-bold text-slate-900'>{t('weekly.title')}</h1>
        <p className='mt-1 text-slate-600 text-sm'>{t('weekly.subtitle')}</p>

        {/* Week & Cardio */}
        <div className='mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr] gap-3 lg:gap-4'>
          <Controller
            control={control}
            name='weekOf'
            render={({ field }) => (
              <InputDate
                label={
                  <span>
                    {t('weekly.weekOf')} <span className='text-rose-600'>*</span>
                  </span>
                }
                type='date'
                value={field.value}
                onChange={v => {
                  if (v instanceof Date && !isNaN(v)) {
                    const month = v.getMonth() + 1;
                    const day = String(v.getDate()).padStart(2, '0');
                    const formatted = `${v.getFullYear()}-${String(month).padStart(2, '0')}-${day}`;
                    field.onChange(formatted);
                  } else {
                    field.onChange(v);
                  }
                }}
                error={errors.weekOf?.message}
              />
            )}
          />

          <Controller
            control={control}
            name='cardioAdherence'
            render={({ field }) => (
              <RatingStars
                label={
                  <span>
                    {t('weekly.cardioAdherence')} <span className='text-rose-600'>*</span>
                  </span>
                }
                value={Number(field.value) || 0}
                onChange={n => field.onChange(String(n))}
                allowZero={true}
                size='lg'
              />
            )}
          />
          {errors.cardioAdherence?.message ? <div className='text-[12px] text-rose-600'>{errors.cardioAdherence.message}</div> : null}
        </div>
      </div>

      {/* Diet */}
      <Section title={t('weekly.diet.title')} icon={Info}>
        <Controller name='diet.hungry' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.hungry')} value={field.value} onChange={field.onChange} />} />
        <Controller name='diet.mentalComfort' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.comfort')} value={field.value} onChange={field.onChange} />} />

        <Controller name='diet.wantSpecific' control={control} render={({ field }) => <Input className='!flex max-md:flex-col md:items-center md:gap-4' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.diet.wantSpecific.title')} value={field.value} onChange={field.onChange} placeholder={t('weekly.diet.wantSpecific.ph')} />} />

        <Controller name='diet.foodTooMuch' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.tooMuch')} value={field.value} onChange={field.onChange} />} />

        <Controller name='diet.dietDeviation.hasDeviation' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.deviation.title')} value={field.value} onChange={field.onChange} />} />

        {watch('diet.dietDeviation.hasDeviation') && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4'>
            <Controller name='diet.dietDeviation.times' control={control} render={({ field }) => <Input label={t('weekly.diet.deviation.times')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />} />
            <Controller name='diet.dietDeviation.details' control={control} render={({ field }) => <Input label={t('weekly.diet.deviation.details')} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={t('weekly.diet.deviation.ph')} />} />
          </div>
        )}
      </Section>

      {/* Training */}
      <Section title={t('weekly.training.title')} icon={Info}>
        <Controller name='training.intensityOk' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.intensityOk')} value={field.value} onChange={field.onChange} />} />

        <Controller name='training.daysDeviation.hasDeviation' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.daysDeviation')} value={field.value} onChange={field.onChange} />} />

        {watch('training.daysDeviation.hasDeviation') && (
          <>
            <Controller name='training.daysDeviation.count' control={control} render={({ field }) => <Input className='!flex max-md:flex-col md:items-center md:gap-4' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.training.deviation.count')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />} />
            <Controller name='training.daysDeviation.reason' control={control} render={({ field }) => <Input className='!flex max-md:flex-col md:items-center md:gap-4' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.training.deviation.reason')} value={field.value} onChange={e => field.onChange(e.target.value)} />} />
          </>
        )}

        <Controller name='training.shapeChange' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.shape')} value={field.value} onChange={field.onChange} />} />
        <Controller name='training.fitnessChange' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.fitness')} value={field.value} onChange={field.onChange} />} />
        <Controller name='training.sleepEnough' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.sleepEnough')} value={field.value} onChange={field.onChange} />} />
        <Controller name='training.sleepHours' control={control} render={({ field }) => <Input className='!flex max-md:flex-col md:items-center md:gap-4' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.training.sleepHours')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />} />

        <Controller name='training.programNotes' control={control} render={({ field }) => <Input className='!flex max-md:flex-col md:items-center md:gap-4' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.training.notes.title')} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={t('weekly.training.notes.ph')} />} />
      </Section>

      {/* Measurements */}
      <Section
        title={t('weekly.measurements.title')}
        icon={Info}
        extra={
          <div className='flex items-center gap-2'>
            <Button type='button' color='neutral' onClick={() => setShowAddMeasureForm(s => !s)}>
              <Plus className='w-4 h-4 mr-1' /> {showAddMeasureForm ? t('weekly.measurements.hideAdd') : t('weekly.measurements.addNew')}
            </Button>
          </div>
        }>
        <Select className='!flex  items-center  gap-4 w-full' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.measurements.pick')} value={measureSelect} onChange={onPickMeasurement} options={measurementOptions} clearable />

        {showAddMeasureForm && (
          <div className='mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 '>
            <Controller
              name='measurements.date'
              control={control}
              render={({ field }) => (
                <InputDate
                  label={
                    <span>
                      {t('weekly.measurements.date')}
                      {['weight', 'waist', 'chest'].some(k => `${m?.[k] ?? ''}`.trim() !== '') ? <span className='text-rose-600'> *</span> : null}
                    </span>
                  }
                  value={field.value}
                  onChange={v => {
                    if (v instanceof Date && !isNaN(v)) {
                      const month = v.getMonth() + 1;
                      const day = String(v.getDate()).padStart(2, '0');
                      const formatted = `${v.getFullYear()}-${String(month).padStart(2, '0')}-${day}`;
                      field.onChange(formatted);
                    } else {
                      field.onChange(v);
                    }
                  }}
                  error={errors?.measurements?.date?.message}
                />
              )}
            />
            <Controller name='measurements.weight' control={control} render={({ field }) => <Input label={t('weekly.measurements.weight')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
            <Controller name='measurements.waist' control={control} render={({ field }) => <Input label={t('weekly.measurements.waist')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
            <Controller name='measurements.chest' control={control} render={({ field }) => <Input label={t('weekly.measurements.chest')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />

            <div className='md:col-span-4 col-span-2 flex gap-2'>
              <Button type='button' name={t('weekly.measurements.save')} onClick={saveMeasurementInline} />
              <Button type='button' color='neutral' onClick={() => setShowAddMeasureForm(false)}>
                {t('weekly.actions.close')}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* Photos */}
      <Section
        title={t('weekly.photos.title')}
        icon={Camera}
        extra={
          <div className='flex items-center gap-2'>
            <Button type='button' color='neutral' onClick={() => setShowAddPhotoForm(s => !s)}>
              <Plus className='w-4 h-4 mr-1' /> {showAddPhotoForm ? t('weekly.photos.hideAdd') : t('weekly.photos.addNew')}
            </Button>
          </div>
        }>
        {/* Choose existing set from dropdown */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4'>
          <Select className='!flex  items-center  gap-4' cnInputParent=' md:max-w-[300px] rtl:md:mr-auto ltr:md:ml-auto flex-1' label={t('weekly.photos.pickSet')} value={photoSelect} onChange={onPickPhotoSet} options={photoSetOptions} clearable />
          <div className='flex items-end'>
            <Button type='button' name={t('weekly.photos.pickFromHistory.btn')} onClick={openPickPhotosModal}>
              <Images className='w-4 h-4 mr-2' /> {t('weekly.photos.pickFromHistory.btn')}
            </Button>
          </div>
        </div>

        {/* Add new set inline (with its own upload button) */}
        {showAddPhotoForm && (
          <div className='mt-3 space-y-3'>
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 lg:gap-4'>
              <Controller name='addPhoto.front' control={control} render={({ field }) => <ImagePicker label={t('weekly.photos.front')} file={field.value} onPick={file => field.onChange(file)} pickedUrl={undefined} onClearPicked={() => field.onChange(undefined)} uploadText={t('weekly.photos.upload')} />} />
              <Controller name='addPhoto.back' control={control} render={({ field }) => <ImagePicker label={t('weekly.photos.back')} file={field.value} onPick={file => field.onChange(file)} pickedUrl={undefined} onClearPicked={() => field.onChange(undefined)} uploadText={t('weekly.photos.upload')} />} />
              <Controller name='addPhoto.right' control={control} render={({ field }) => <ImagePicker label={t('weekly.photos.right')} file={field.value} onPick={file => field.onChange(file)} pickedUrl={undefined} onClearPicked={() => field.onChange(undefined)} uploadText={t('weekly.photos.upload')} />} />
              <Controller name='addPhoto.left' control={control} render={({ field }) => <ImagePicker label={t('weekly.photos.left')} file={field.value} onPick={file => field.onChange(file)} pickedUrl={undefined} onClearPicked={() => field.onChange(undefined)} uploadText={t('weekly.photos.upload')} />} />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-4'>
              <Controller
                name='addPhoto.date'
                control={control}
                render={({ field }) => (
                  <InputDate
                    label={
                      <span>
                        {t('weekly.photos.date')}
                        {hasAnyPhotoNew ? <span className='text-rose-600'> *</span> : null}
                      </span>
                    }
                    type='date'
                    value={field.value}
                    onChange={v => field.onChange(typeof v === 'string' ? v : v?.target?.value)}
                    error={errors?.addPhoto?.date?.message}
                  />
                )}
              />
              <Controller name='addPhoto.weight' control={control} render={({ field }) => <Input label={t('weekly.photos.weight')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='addPhoto.note' control={control} render={({ field }) => <Input label={t('weekly.photos.note')} value={field.value} onChange={e => field.onChange(e.target.value)} />} />
            </div>

            <div className='flex gap-2'>
              <Button type='button' onClick={uploadNewPhotoSet} disabled={uploadingSet}>
                {uploadingSet ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : <UploadCloud className='w-4 h-4 mr-2' />}
                {t('weekly.photos.uploadSet')}
              </Button>
              <Button type='button' color='neutral' onClick={() => setShowAddPhotoForm(false)}>
                {t('weekly.actions.close')}
              </Button>
            </div>
          </div>
        )}

        {/* Per-side quick pickers (or show selected) */}
        {!showAddPhotoForm && (
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 lg:gap-4 mt-2'>
            <ImagePicker label={t('weekly.photos.front')} openPopup={openPickPhotosModal} file={frontFile} onPick={setFrontFile} pickedUrl={pickedSides.front} onClearPicked={() => setPickedSides(p => ({ ...p, front: null }))} uploadText={t('weekly.photos.upload')} />
            <ImagePicker label={t('weekly.photos.back')} openPopup={openPickPhotosModal} file={backFile} onPick={setBackFile} pickedUrl={pickedSides.back} onClearPicked={() => setPickedSides(p => ({ ...p, back: null }))} uploadText={t('weekly.photos.upload')} />
            <ImagePicker label={t('weekly.photos.right')} openPopup={openPickPhotosModal} file={rightFile} onPick={setRightFile} pickedUrl={pickedSides.right} onClearPicked={() => setPickedSides(p => ({ ...p, right: null }))} uploadText={t('weekly.photos.upload')} />
            <ImagePicker label={t('weekly.photos.left')} openPopup={openPickPhotosModal} file={leftFile} onPick={setLeftFile} pickedUrl={pickedSides.left} onClearPicked={() => setPickedSides(p => ({ ...p, left: null }))} uploadText={t('weekly.photos.upload')} />
          </div>
        )}
      </Section>

      {/* Errors / success */}
      {ok ? (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-sm inline-flex items-center gap-2'>
          <CheckCircle2 className='w-4 h-4' />
          {t('weekly.success')}
        </div>
      ) : null}

      {/* Sticky submit bar with inline progress */}
      <div className='h-16' />
      <div className='fixed inset-x-0 bottom-0 z-40 px-3 sm:px-5 pb-3'>
        <div className='mx-auto max-w-3xl rounded-lg overflow-hidden border border-slate-200 bg-white/95 backdrop-blur shadow-lg p-2 flex items-center gap-2'>
          <div className='absolute bottom-0 left-0 h-[2px] w-full overflow-hidden bg-slate-100'>
            <div className='h-full bg-gradient-to-r from-indigo-600 via-indigo-500/90 to-blue-600 transition-[width] duration-500' style={{ width: `${reqPct}%` }} />
          </div>

          <div className='flex-1 text-[12px] text-slate-600 flex items-center gap-2'>
            <span>{t('weekly.submit.hint')}</span>
          </div>
          <Button type='submit' name={submitting ? t('weekly.submit.sending') : t('weekly.submit.cta')} disabled={submitting} className='!px-4 !py-2'>
            {submitting ? <Loader2 className='w-4 h-4 animate-spin' /> : <UploadCloud className='w-4 h-4' />}
            <span className='ml-2'>{t('weekly.submit.cta')}</span>
          </Button>
        </div>
      </div>

      {showPickModal && (
        <PhotoPickerModal
          onClose={() => setShowPickModal(false)}
          photos={historyRows}
          selected={pickedSides}
          t={t}
          onPick={(side, url) => {
            setPickedSides(prev => (prev[side] === url ? { ...prev, [side]: null } : { ...prev, [side]: url }));
          }}
        />
      )}
    </form>
  );
}

/* -------------------------------- Subcomponents ------------------------------- */
function SwitchRow({ label, value, onChange }) {
  return (
    <div className='flex items-center justify-between gap-3 py-1'>
      <div className='text-sm text-slate-700'>{label}</div>
      <Switcher checked={!!value} onChange={onChange} />
    </div>
  );
}
