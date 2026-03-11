'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Camera, UploadCloud, CheckCircle2, Loader2, Info, X, Images,
  Plus, ClipboardList, Eye, Utensils, Dumbbell, Ruler, ChevronRight,
  ChevronLeft, Star as StarIcon, Sparkles, TrendingUp, Moon
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import Input from '@/components/atoms/Input';
import Textarea from '@/components/atoms/Textarea';
import Select from '@/components/atoms/Select';
import InputDate from '@/components/atoms/InputDate';
import { Switcher } from '@/components/atoms/Switcher';
import Img from '@/components/atoms/Img';
import { Modal } from '@/components/dashboard/ui/UI';
import api from '@/utils/axios';

/* ─────────────────────────── API helpers ─────────────────────────── */
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
  const { data } = await api.post('/profile/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
async function postWeeklyReport(payload) {
  const { data } = await api.post('/weekly-reports', payload);
  return data;
}
async function fetchUnreadFeedbackCount() {
  const { data } = await api.get('/weekly-reports/user/unread-feedback/count');
  return data?.count ?? 0;
}
async function fetchMyReports({ page = 1, limit = 5 } = {}) {
  const { data } = await api.get('/weekly-reports', { params: { page, limit } });
  return {
    items: data?.items || [],
    total: data?.total || 0,
    page: data?.page || page,
    limit: data?.limit || limit,
    hasMore: data?.hasMore ?? false,
  };
}
async function markReportAsRead(id) {
  await api.put(`/weekly-reports/${id}/read`);
}

/* ─────────────────────────── Button ─────────────────────────── */
const Button = ({ children, className = '', disabled, onClick, type = 'button', color = 'primary' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] text-white hover:opacity-90 shadow-md shadow-[var(--color-primary-300)]/40 disabled:opacity-50',
    neutral: 'bg-white border border-[var(--color-primary-200)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-300)] disabled:opacity-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 shadow-sm',
    ghost: 'text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] border border-transparent hover:border-[var(--color-primary-200)]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[.97] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)]/40 focus:ring-offset-1',
        variants[color] || variants.primary,
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
};

/* ─────────────────────────── Section Card ─────────────────────────── */
function Section({ icon: Icon = Info, title, children, extra, accent }) {
  return (
    <section className='rounded-2xl bg-white border border-[var(--color-primary-100)] shadow-sm shadow-[var(--color-primary-100)]/60 overflow-hidden'>
      <header className='px-5 py-4 border-b border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)] to-white flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center shadow-sm'>
            <Icon className='w-4 h-4 text-white' />
          </div>
          <h2 className='font-bold text-slate-800 text-base'>{title}</h2>
        </div>
        {extra || null}
      </header>
      <div className='p-5 space-y-3'>{children}</div>
    </section>
  );
}

/* ─────────────────────────── Switch Row ─────────────────────────── */
function SwitchRow({ label, value, onChange, description }) {
  return (
    <div className='flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-[var(--color-primary-50)]/60 hover:border-[var(--color-primary-100)] transition-all duration-200 group'>
      <div className='flex-1'>
        <div className='text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors'>{label}</div>
        {description && <div className='text-xs text-slate-400 mt-0.5'>{description}</div>}
      </div>
      <Switcher checked={!!value} onChange={onChange} />
    </div>
  );
}

/* ─────────────────────────── Rating Stars ─────────────────────────── */
const sizeMap = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-9 h-9' };

function RatingStars({ label, value = 0, onChange = () => {}, max = 5, size = 'md', readOnly = false, required }) {
  const [hovered, setHovered] = useState(0);
  const items = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);
  const display = hovered || value;

  const labels = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];

  return (
    <div className='space-y-2'>
      {label && (
        <label className='block text-sm font-medium text-slate-700'>
          {label}
          {required && <span className='text-rose-500 ml-1'>*</span>}
        </label>
      )}
      <div className='flex items-center gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-100'>
        <div className='flex items-center gap-1'>
          {items.map(n => (
            <button
              key={n}
              type='button'
              disabled={readOnly}
              onClick={() => !readOnly && onChange(String(n))}
              onMouseEnter={() => !readOnly && setHovered(n)}
              onMouseLeave={() => !readOnly && setHovered(0)}
              className='focus:outline-none transition-transform hover:scale-110 active:scale-95'
            >
              <svg viewBox='0 0 24 24' className={[sizeMap[size], 'transition-all duration-150'].join(' ')}>
                <path
                  d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
                  className={n <= display ? 'fill-amber-400 stroke-amber-400' : 'fill-slate-200 stroke-slate-200'}
                  strokeWidth='0.5'
                />
              </svg>
            </button>
          ))}
        </div>
        {display > 0 && (
          <span className='text-xs font-semibold text-[var(--color-primary-600)] bg-[var(--color-primary-50)] px-2 py-0.5 rounded-full border border-[var(--color-primary-100)]'>
            {labels[display]}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Image Picker ─────────────────────────── */
function ImagePicker({ openPopup, label, file, onPick, pickedUrl, onClearPicked, uploadText }) {
  const inputRef = useRef(null);
  const hasPicked = !!pickedUrl;

  return (
    <div className='rounded-xl border border-[var(--color-primary-100)] bg-white overflow-hidden group'>
      <div className='px-3 py-2 bg-gradient-to-r from-[var(--color-primary-50)] to-white border-b border-[var(--color-primary-100)]'>
        <span className='text-xs font-semibold text-[var(--color-primary-700)]'>{label}</span>
      </div>

      <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={e => onPick((e.target.files && e.target.files[0]) || null)} />

      {hasPicked ? (
        <div className='relative'>
          <Img src={pickedUrl} alt={label} className='w-full h-36 object-cover' />
          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200' />
          <button
            type='button'
            onClick={onClearPicked}
            className='absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors'
          >
            <X className='w-3.5 h-3.5' />
          </button>
          <div className='absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center justify-center gap-1'>
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-500' />
            <span className='text-[11px] font-medium text-emerald-700'>تم الاختيار</span>
          </div>
        </div>
      ) : file ? (
        <div className='relative'>
          <img src={URL.createObjectURL(file)} alt={label} className='w-full h-36 object-cover' />
          <button
            type='button'
            onClick={() => onPick(null)}
            className='absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={openPopup || (() => inputRef.current?.click())}
          className='w-full h-36 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-50 to-white text-slate-400 hover:text-[var(--color-primary-500)] hover:from-[var(--color-primary-50)]/50 hover:to-white border-2 border-dashed border-slate-200 hover:border-[var(--color-primary-200)] transition-all duration-200'
        >
          <div className='w-10 h-10 rounded-full bg-slate-100 group-hover:bg-[var(--color-primary-100)] flex items-center justify-center transition-colors'>
            <Camera className='w-5 h-5' />
          </div>
          <span className='text-[11px] font-medium'>{uploadText}</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── Photo Picker Modal ─────────────────────────── */
function PhotoPickerModal({ onClose, photos, onPick, selected = {}, t }) {
  const sides = ['front', 'back', 'left', 'right'];
  const flat = [];
  (photos || []).forEach(p => {
    const s = p.sides || {};
    sides.forEach(side => {
      if (s[side]) flat.push({ id: `${p.id}-${side}`, side, url: s[side], takenAt: p.takenAt, weight: p.weight ?? null });
    });
  });

  return (
    <div className='fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4'>
      <div className='w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300'>
        <div className='px-5 py-4 border-b border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)] to-white flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center'>
              <Images className='w-4 h-4 text-white' />
            </div>
            <span className='font-bold text-slate-800'>{t('weekly.photos.pickFromHistory.title')}</span>
          </div>
          <button type='button' onClick={onClose} className='w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='p-5 overflow-auto max-h-[65vh]'>
          {flat.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-slate-400'>
              <Camera className='w-12 h-12 mb-3 opacity-30' />
              <p className='text-sm'>{t('weekly.photos.pickFromHistory.empty')}</p>
            </div>
          ) : (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              {flat.map(it => {
                const isActive = selected[it.side] === it.url;
                return (
                  <button
                    type='button'
                    key={it.id}
                    onClick={() => onPick(it.side, it.url)}
                    className={[
                      'group relative rounded-xl overflow-hidden border-2 transition-all duration-200',
                      isActive
                        ? 'border-[var(--color-primary-500)] shadow-lg shadow-[var(--color-primary-200)]/50 scale-[1.02]'
                        : 'border-slate-200 hover:border-[var(--color-primary-300)] hover:shadow-md hover:scale-[1.01]',
                    ].join(' ')}
                  >
                    <Img src={it.url} alt={it.side} className='h-32 w-full object-contain bg-slate-50' />
                    {isActive && (
                      <div className='absolute inset-0 bg-[var(--color-primary-500)]/10 flex items-center justify-center'>
                        <div className='w-8 h-8 rounded-full bg-[var(--color-primary-500)] flex items-center justify-center shadow-lg'>
                          <CheckCircle2 className='w-5 h-5 text-white' />
                        </div>
                      </div>
                    )}
                    <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-1.5'>
                      <div className='font-semibold capitalize'>{it.side}</div>
                      <div className='opacity-80'>{it.takenAt}{it.weight ? ` • ${it.weight}kg` : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className='px-5 py-4 border-t border-[var(--color-primary-100)] bg-slate-50/50 flex justify-end gap-2'>
          <Button type='button' color='neutral' onClick={onClose}>{t('weekly.actions.close')}</Button>
          <Button type='button' onClick={onClose}>{t('weekly.actions.confirm') || 'تأكيد'}</Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Stat Badge ─────────────────────────── */
function StatBadge({ label, value, unit }) {
  return (
    <div className='flex flex-col items-center px-4 py-3 rounded-xl bg-white border border-[var(--color-primary-100)] shadow-sm'>
      <span className='text-[11px] font-medium text-slate-400 uppercase tracking-wide'>{label}</span>
      <span className='text-2xl font-black text-[var(--color-primary-700)] leading-tight'>{value}</span>
      {unit && <span className='text-[11px] text-slate-400'>{unit}</span>}
    </div>
  );
}

/* ─────────────────────────── Progress Ring ─────────────────────────── */
function ProgressRing({ pct, size = 48 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} className='-rotate-90'>
      <circle cx={size / 2} cy={size / 2} r={r} stroke='#e0e7ff' strokeWidth={5} fill='none' />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke='url(#pg)' strokeWidth={5} fill='none'
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap='round' style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <defs>
        <linearGradient id='pg' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='var(--color-gradient-from)' />
          <stop offset='100%' stopColor='var(--color-gradient-to)' />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ══════════════════════════ WeeklyReportPage ══════════════════════════ */
export default function WeeklyReportPage() {
  const t = useTranslations();

  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsHasMore, setReportsHasMore] = useState(false);
  const [showPrevModal, setShowPrevModal] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [leftFile, setLeftFile] = useState(null);
  const [rightFile, setRightFile] = useState(null);

  const [historyRows, setHistoryRows] = useState([]);
  const [photoSelect, setPhotoSelect] = useState('');
  const [showPickModal, setShowPickModal] = useState(false);
  const [pickedSides, setPickedSides] = useState({ front: null, back: null, left: null, right: null });
  const [showAddPhotoForm, setShowAddPhotoForm] = useState(false);
  const [uploadingSet, setUploadingSet] = useState(false);

  const [measureList, setMeasureList] = useState([]);
  const [measureSelect, setMeasureSelect] = useState('');
  const [showAddMeasureForm, setShowAddMeasureForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [serverError, setServerError] = useState('');

  /* ── schema ── */
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
          weight: yup.mixed(), waist: yup.mixed(), chest: yup.mixed(),
          hips: yup.mixed(), arms: yup.mixed(), thighs: yup.mixed(),
        }),
        addPhoto: yup.object({
          date: yup.string().when(['front', 'back', 'left', 'right'], {
            is: (f, b, l, r) => [f, b, l, r].some(Boolean),
            then: s => s.required(t('weekly.errors.required')),
            otherwise: s => s.optional(),
          }),
          weight: yup.mixed(), note: yup.mixed(),
          front: yup.mixed().nullable(true).optional(),
          back: yup.mixed().nullable(true).optional(),
          left: yup.mixed().nullable(true).optional(),
          right: yup.mixed().nullable(true).optional(),
        }),
      }),
    [t],
  );

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      weekOf: '', cardioAdherence: '',
      diet: { hungry: false, mentalComfort: false, wantSpecific: '', foodTooMuch: false, dietDeviation: { hasDeviation: false, times: '', details: '' } },
      training: { intensityOk: false, daysDeviation: { hasDeviation: false, count: '', reason: '' }, shapeChange: false, fitnessChange: false, sleepEnough: false, sleepHours: '', programNotes: '' },
      measurements: { date: '', weight: '', waist: '', chest: '', hips: '', arms: '', thighs: '' },
      addPhoto: { date: '', weight: '', note: '', front: undefined, back: undefined, left: undefined, right: undefined },
    },
    mode: 'onChange',
  });

  const weekOf = watch('weekOf');
  const cardioAdherence = watch('cardioAdherence');
  const m = watch('measurements');
  const addPhotoVals = watch('addPhoto');

  const measurementOptions = useMemo(() => measureList.map(mm => ({ id: mm.id, label: `${mm.date}${mm.weight ? ` • ${mm.weight}kg` : ''}` })), [measureList]);
  const photoSetOptions = useMemo(() => historyRows.map(r => ({ id: r.id, label: `${r.takenAt}${r.weight ? ` • ${r.weight}kg` : ''}` })), [historyRows]);

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

  /* ── effects ── */
  useEffect(() => {
    (async () => {
      try {
        const list = await getMeasurements(180);
        setMeasureList(list || []);
        if (list?.length) { const last = list[list.length - 1]; setMeasureSelect(last.id); hydrateMeasurement(last); }
        else setValue('measurements.date', new Date().toISOString().slice(0, 10));
      } catch {}
      try {
        const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
        setHistoryRows(rows);
      } catch {}
    })();
  }, [setValue]);

  useEffect(() => {
    (async () => {
      try { setUnreadLoading(true); setUnreadFeedbackCount(await fetchUnreadFeedbackCount()); }
      finally { setUnreadLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setReportsError(''); setReportsLoading(true);
        const res = await fetchMyReports({ page: reportsPage, limit: 5 });
        setMyReports(res.items || []); setReportsHasMore(res.hasMore);
      } catch { setReportsError(t('weekly.prevReports.error')); }
      finally { setReportsLoading(false); }
    })();
  }, [reportsPage, t]);

  /* ── helpers ── */
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
    if (found) { hydrateMeasurement(found); setShowAddMeasureForm(false); }
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
    let next = [...measureList];
    const idx = next.findIndex(mm => mm.id === saved.id);
    if (idx >= 0) next[idx] = saved; else next.push(saved);
    next.sort((a, b) => a.date.localeCompare(b.date));
    setMeasureList(next); setMeasureSelect(saved.id); setShowAddMeasureForm(false);
  }

  function applyPhotoSetToPickedSides(setId) {
    const entry = historyRows.find(r => r.id === setId);
    if (!entry) return;
    const s = entry.sides || {};
    setPickedSides({ front: s.front || null, back: s.back || null, left: s.left || null, right: s.right || null });
  }

  const onPickPhotoSet = id => { setPhotoSelect(id); applyPhotoSetToPickedSides(id); setShowAddPhotoForm(false); };

  async function openPickPhotosModal() {
    try { const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' }); setHistoryRows(rows); } catch {}
    setShowPickModal(true);
  }

  const hasAnyPhotoNew = !!(frontFile || backFile || leftFile || rightFile || addPhotoVals.front || addPhotoVals.back || addPhotoVals.left || addPhotoVals.right);

  const uploadNewPhotoSet = async () => {
    try {
      setServerError(''); setUploadingSet(true);
      const addFront = addPhotoVals.front, addBack = addPhotoVals.back, addLeft = addPhotoVals.left, addRight = addPhotoVals.right;
      if (!(addFront || addBack || addLeft || addRight)) { setServerError(t('weekly.photos.errors.noFiles')); return; }
      const fd = new FormData();
      if (addFront) fd.append('front', addFront); if (addBack) fd.append('back', addBack);
      if (addLeft) fd.append('left', addLeft); if (addRight) fd.append('right', addRight);
      const takenAt = addPhotoVals.date || m?.date || weekOf;
      if (!takenAt) { setServerError(t('weekly.photos.errors.dateRequired')); return; }
      fd.append('data', JSON.stringify({ takenAt, weight: addPhotoVals.weight || m?.weight || null, note: addPhotoVals.note || '' }));
      const saved = await uploadProgressPhotos(fd);
      const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
      setHistoryRows(rows); setPhotoSelect(saved?.id || '');
      if (saved?.id) applyPhotoSetToPickedSides(saved.id);
      ['front','back','left','right','date','weight','note'].forEach(k => setValue(`addPhoto.${k}`, k === 'front' || k === 'back' || k === 'left' || k === 'right' ? undefined : ''));
      setShowAddPhotoForm(false); setOk(true);
    } catch (err) { setServerError(err?.message || t('weekly.errors.unknown')); }
    finally { setUploadingSet(false); setTimeout(() => setOk(false), 3000); }
  };

  const handleOpenFeedback = async report => {
    setActiveReport(report); setShowFeedbackModal(true);
    if (report.coachFeedback && !report.isRead) {
      try {
        setMarkingRead(true); await markReportAsRead(report.id);
        setMyReports(prev => prev.map(r => r.id === report.id ? { ...r, isRead: true } : r));
        setActiveReport(prev => prev ? { ...prev, isRead: true } : prev);
        setUnreadFeedbackCount(prev => prev > 0 ? prev - 1 : 0);
      } finally { setMarkingRead(false); }
    }
  };

  const onSubmit = async values => {
    setServerError(''); setOk(false);
    try {
      setSubmitting(true);
      if (values.measurements?.date) await saveMeasurementInline();

      let uploadedSides = { front: null, back: null, left: null, right: null };
      if (hasAnyPhotoNew) {
        const fd = new FormData();
        const af = frontFile || values.addPhoto?.front, ab = backFile || values.addPhoto?.back;
        const al = leftFile || values.addPhoto?.left, ar = rightFile || values.addPhoto?.right;
        if (af) fd.append('front', af); if (ab) fd.append('back', ab);
        if (al) fd.append('left', al); if (ar) fd.append('right', ar);
        const takenAt = values.addPhoto?.date || values.measurements?.date || values.weekOf;
        fd.append('data', JSON.stringify({ takenAt, weight: values.addPhoto?.weight || values.measurements?.weight || null, note: values.addPhoto?.note || values.training?.programNotes || '' }));
        const saved = await uploadProgressPhotos(fd);
        uploadedSides = saved?.sides || uploadedSides;
        try {
          const { rows } = await getPhotosTimeline({ page: 1, limit: 100, sortOrder: 'DESC' });
          setHistoryRows(rows); setPhotoSelect(saved?.id || '');
          if (saved?.id) applyPhotoSetToPickedSides(saved.id); setShowAddPhotoForm(false);
        } catch {}
      }

      const photosPayload = {
        front: pickedSides.front ? { url: pickedSides.front } : uploadedSides.front ? { url: uploadedSides.front } : null,
        back: pickedSides.back ? { url: pickedSides.back } : uploadedSides.back ? { url: uploadedSides.back } : null,
        left: pickedSides.left ? { url: pickedSides.left } : uploadedSides.left ? { url: uploadedSides.left } : null,
        right: pickedSides.right ? { url: pickedSides.right } : uploadedSides.right ? { url: uploadedSides.right } : null,
        extras: [],
      };

      await postWeeklyReport({
        weekOf: values.weekOf,
        diet: {
          hungry: values.diet?.hungry ? 'yes' : 'no',
          mentalComfort: values.diet?.mentalComfort ? 'yes' : 'no',
          wantSpecific: values.diet?.wantSpecific || '',
          foodTooMuch: values.diet?.foodTooMuch ? 'yes' : 'no',
          dietDeviation: { hasDeviation: values.diet?.dietDeviation?.hasDeviation ? 'yes' : 'no', times: values.diet?.dietDeviation?.times || null, details: values.diet?.dietDeviation?.details || null },
        },
        training: {
          intensityOk: values.training?.intensityOk ? 'yes' : 'no',
          daysDeviation: { hasDeviation: values.training?.daysDeviation?.hasDeviation ? 'yes' : 'no', count: values.training?.daysDeviation?.count || null, reason: values.training?.daysDeviation?.reason || null },
          shapeChange: values.training?.shapeChange ? 'yes' : 'no',
          fitnessChange: values.training?.fitnessChange ? 'yes' : 'no',
          sleep: { enough: values.training?.sleepEnough ? 'yes' : 'no', hours: values.training?.sleepHours || null },
          programNotes: values.training?.programNotes || '',
          cardioAdherence: Number(values.cardioAdherence),
        },
        measurements: values.measurements?.date ? {
          date: values.measurements.date,
          weight: values.measurements.weight ? Number(values.measurements.weight) : null,
          waist: values.measurements.waist ? Number(values.measurements.waist) : null,
          chest: values.measurements.chest ? Number(values.measurements.chest) : null,
          hips: values.measurements.hips ? Number(values.measurements.hips) : null,
          arms: values.measurements.arms ? Number(values.measurements.arms) : null,
          thighs: values.measurements.thighs ? Number(values.measurements.thighs) : null,
        } : null,
        photos: photosPayload,
        notifyCoach: true,
      });

      setOk(true);
      try {
        const res = await fetchMyReports({ page: 1, limit: 5 });
        setMyReports(res.items || []); setReportsPage(1); setReportsHasMore(res.hasMore);
      } catch {}
    } catch (e) { setServerError(typeof e === 'string' ? e : e?.message || t('weekly.errors.unknown')); }
    finally { setSubmitting(false); setTimeout(() => setOk(false), 3500); }
  };

  /* ── render ── */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className='relative space-y-5 pb-24'>

      {/* ── Hero Header ── */}
      <div className='rounded-2xl overflow-hidden border border-[var(--color-primary-200)] shadow-lg shadow-[var(--color-primary-100)]/60'>
        {/* gradient top bar */}
        <div className='h-1.5 w-full bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]' />

        <div className='bg-white px-5 py-5'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            {/* left */}
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] flex items-center justify-center shadow-md shadow-[var(--color-primary-300)]/40 shrink-0'>
                <Sparkles className='w-6 h-6 text-white' />
              </div>
              <div>
                <div className='flex items-center gap-2 flex-wrap'>
                  <h1 className='text-xl font-extrabold text-slate-900'>{t('weekly.title')}</h1>
                  {unreadFeedbackCount > 0 && (
                    <span className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200'>
                      <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
                      {unreadLoading ? '...' : t('weekly.unreadFeedback.badge', { count: unreadFeedbackCount })}
                    </span>
                  )}
                </div>
                <p className='mt-0.5 mb-3 text-slate-500 text-sm'>{t('weekly.subtitle')}</p>
								<Button type='button' color='neutral' onClick={() => setShowPrevModal(true)} className='shrink-0'>
                <ClipboardList className='w-4 h-4 text-[var(--color-primary-500)]' />
                <span className=' inline'>{t('weekly.prevReports.goTo')}</span>
              </Button>
              </div>
            </div>
 
          </div>

          {/* Week + Cardio row */}
          <div className='mt-5 grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Controller
                control={control}
                name='weekOf'
                render={({ field }) => (
                  <InputDate
                    label={<span>{t('weekly.weekOf')} <span className='text-rose-500'>*</span></span>}
                    type='date'
                    value={field.value}
                    onChange={v => {
                      if (v instanceof Date && !isNaN(v)) {
                        field.onChange(`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`);
                      } else { field.onChange(v); }
                    }}
                    error={errors.weekOf?.message}
                  />
                )}
              />
            </div>

            <div>
              <Controller
                control={control}
                name='cardioAdherence'
                render={({ field }) => (
                  <RatingStars
                    label={<span>{t('weekly.cardioAdherence')} </span>}
                    value={Number(field.value) || 0}
                    onChange={n => field.onChange(String(n))}
                    size='lg'
                    required
                  />
                )}
              />
              {errors?.cardioAdherence?.message && <div className='text-[11px] text-rose-500 mt-1 flex items-center gap-1'><X className='w-3 h-3' />{errors.cardioAdherence.message}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Diet Section ── */}
      <Section title={t('weekly.diet.title')} icon={Utensils}>
        <div className='space-y-2'>
          <Controller name='diet.hungry' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.hungry')} value={field.value} onChange={field.onChange} />} />
          <Controller name='diet.mentalComfort' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.comfort')} value={field.value} onChange={field.onChange} />} />
          <Controller name='diet.foodTooMuch' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.tooMuch')} value={field.value} onChange={field.onChange} />} />
          <Controller name='diet.dietDeviation.hasDeviation' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.deviation.title')} value={field.value} onChange={field.onChange} />} />
        </div>

        <div className='pt-1'>
          <Controller name='diet.wantSpecific' control={control} render={({ field }) => (
            <Input label={t('weekly.diet.wantSpecific.title')} value={field.value} onChange={field.onChange} placeholder={t('weekly.diet.wantSpecific.ph')} />
          )} />
        </div>

        {watch('diet.dietDeviation.hasDeviation') && (
          <div className='mt-2 p-4 rounded-xl bg-amber-50/60 border border-amber-100 space-y-3'>
            <div className='text-xs font-semibold text-amber-700 flex items-center gap-1.5'>
              <Info className='w-3.5 h-3.5' /> {t('weekly.diet.deviation.title')}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <Controller name='diet.dietDeviation.times' control={control} render={({ field }) => (
                <Input label={t('weekly.diet.deviation.times')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />
              )} />
              <Controller name='diet.dietDeviation.details' control={control} render={({ field }) => (
                <Input label={t('weekly.diet.deviation.details')} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={t('weekly.diet.deviation.ph')} />
              )} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Training Section ── */}
      <Section title={t('weekly.training.title')} icon={Dumbbell}>
        <div className='space-y-2'>
          <Controller name='training.intensityOk' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.intensityOk')} value={field.value} onChange={field.onChange} />} />
          <Controller name='training.daysDeviation.hasDeviation' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.daysDeviation')} value={field.value} onChange={field.onChange} />} />
          <Controller name='training.shapeChange' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.shape')} value={field.value} onChange={field.onChange} />} />
          <Controller name='training.fitnessChange' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.fitness')} value={field.value} onChange={field.onChange} />} />
          <Controller name='training.sleepEnough' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.sleepEnough')} value={field.value} onChange={field.onChange} />} />
        </div>

        {watch('training.daysDeviation.hasDeviation') && (
          <div className='mt-2 p-4 rounded-xl bg-rose-50/50 border border-rose-100 space-y-3'>
            <div className='text-xs font-semibold text-rose-700 flex items-center gap-1.5'>
              <Info className='w-3.5 h-3.5' /> {t('weekly.training.daysDeviation')}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <Controller name='training.daysDeviation.count' control={control} render={({ field }) => (
                <Input label={t('weekly.training.deviation.count')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />
              )} />
              <Controller name='training.daysDeviation.reason' control={control} render={({ field }) => (
                <Input label={t('weekly.training.deviation.reason')} value={field.value} onChange={e => field.onChange(e.target.value)} />
              )} />
            </div>
          </div>
        )}

        <div className='mt-2 grid grid-cols-1 md:grid-cols-2 gap-3'>
          <Controller name='training.sleepHours' control={control} render={({ field }) => (
            <Input label={t('weekly.training.sleepHours')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />
          )} />
          <Controller name='training.programNotes' control={control} render={({ field }) => (
            <Input label={t('weekly.training.notes.title')} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={t('weekly.training.notes.ph')} />
          )} />
        </div>
      </Section>

      {/* ── Measurements Section ── */}
      <Section
        title={t('weekly.measurements.title')}
        icon={Ruler}
        extra={
          <Button type='button' color={showAddMeasureForm ? 'ghost' : 'neutral'} onClick={() => setShowAddMeasureForm(s => !s)} className='!py-1.5 !px-3 text-xs'>
            <Plus className='w-3.5 h-3.5 text-[var(--color-primary-500)]' />
            {showAddMeasureForm ? t('weekly.measurements.hideAdd') : t('weekly.measurements.addNew')}
          </Button>
        }
      >
        <Select
          label={t('weekly.measurements.pick')}
          value={measureSelect}
          onChange={onPickMeasurement}
          options={measurementOptions}
          clearable
        />

        {/* Current measurement preview pills */}
        {measureSelect && !showAddMeasureForm && (
          <div className='flex flex-wrap gap-2 pt-1'>
            {[
              { key: 'weight', label: t('weekly.measurements.weight'), unit: 'kg' },
              { key: 'waist', label: t('weekly.measurements.waist'), unit: 'cm' },
              { key: 'chest', label: t('weekly.measurements.chest'), unit: 'cm' },
              { key: 'hips', label: t('weekly.measurements.hips') || 'أرداف', unit: 'cm' },
              { key: 'arms', label: t('weekly.measurements.arms') || 'ذراعان', unit: 'cm' },
              { key: 'thighs', label: t('weekly.measurements.thighs') || 'أفخاذ', unit: 'cm' },
            ].filter(f => `${m?.[f.key] ?? ''}`.trim() !== '').map(f => (
              <div key={f.key} className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] text-xs font-semibold text-[var(--color-primary-700)]'>
                <TrendingUp className='w-3 h-3' />
                <span>{f.label}:</span>
                <span>{m[f.key]} {f.unit}</span>
              </div>
            ))}
          </div>
        )}

        {showAddMeasureForm && (
          <div className='mt-3 p-4 rounded-xl bg-[var(--color-primary-50)]/50 border border-[var(--color-primary-100)] space-y-4'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <Controller name='measurements.date' control={control} render={({ field }) => (
                <InputDate
                  label={<span>{t('weekly.measurements.date')}{['weight','waist','chest'].some(k => `${m?.[k]??''}`.trim()!=='') ? <span className='text-rose-500'> *</span>:null}</span>}
                  value={field.value}
                  onChange={v => {
                    if (v instanceof Date && !isNaN(v)) {
                      field.onChange(`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`);
                    } else { field.onChange(v); }
                  }}
                  error={errors?.measurements?.date?.message}
                />
              )} />
              <Controller name='measurements.weight' control={control} render={({ field }) => <Input label={t('weekly.measurements.weight')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.waist' control={control} render={({ field }) => <Input label={t('weekly.measurements.waist')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.chest' control={control} render={({ field }) => <Input label={t('weekly.measurements.chest')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.hips' control={control} render={({ field }) => <Input label={t('weekly.measurements.hips') || 'الأرداف'} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.arms' control={control} render={({ field }) => <Input label={t('weekly.measurements.arms') || 'الذراعان'} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.thighs' control={control} render={({ field }) => <Input label={t('weekly.measurements.thighs') || 'الأفخاذ'} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
            </div>
            <div className='flex gap-2'>
              <Button type='button' onClick={saveMeasurementInline}>
                <CheckCircle2 className='w-4 h-4' /> {t('weekly.measurements.save')}
              </Button>
              <Button type='button' color='neutral' onClick={() => setShowAddMeasureForm(false)}>
                {t('weekly.actions.close')}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Photos Section ── */}
      <Section
        title={t('weekly.photos.title')}
        icon={Camera}
        extra={
          <Button type='button' color={showAddPhotoForm ? 'ghost' : 'neutral'} onClick={() => setShowAddPhotoForm(s => !s)} className='!py-1.5 !px-3 text-xs'>
            <Plus className='w-3.5 h-3.5 text-[var(--color-primary-500)]' />
            {showAddPhotoForm ? t('weekly.photos.hideAdd') : t('weekly.photos.addNew')}
          </Button>
        }
      >
        {/* Picker row */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 pb-2'>
          <Select
            label={t('weekly.photos.pickSet')}
            value={photoSelect}
            onChange={onPickPhotoSet}
            options={photoSetOptions}
            clearable
          />
          <div className='flex items-end'>
            <Button type='button' onClick={openPickPhotosModal} color='neutral' className='w-full md:w-auto'>
              <Images className='w-4 h-4 text-[var(--color-primary-500)]' />
              {t('weekly.photos.pickFromHistory.btn')}
            </Button>
          </div>
        </div>

        {/* Upload new photo set form */}
        {showAddPhotoForm && (
          <div className='p-4 rounded-xl bg-[var(--color-primary-50)]/50 border border-[var(--color-primary-100)] space-y-4'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {['front','back','right','left'].map(side => (
                <Controller key={side} name={`addPhoto.${side}`} control={control} render={({ field }) => (
                  <ImagePicker
                    label={t(`weekly.photos.${side}`)}
                    file={field.value}
                    onPick={file => field.onChange(file)}
                    pickedUrl={undefined}
                    onClearPicked={() => field.onChange(undefined)}
                    uploadText={t('weekly.photos.upload')}
                  />
                )} />
              ))}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              <Controller name='addPhoto.date' control={control} render={({ field }) => (
                <InputDate
                  label={<span>{t('weekly.photos.date')}{hasAnyPhotoNew ? <span className='text-rose-500'> *</span> : null}</span>}
                  type='date' value={field.value}
                  onChange={v => field.onChange(typeof v === 'string' ? v : v?.target?.value)}
                  error={errors?.addPhoto?.date?.message}
                />
              )} />
              <Controller name='addPhoto.weight' control={control} render={({ field }) => (
                <Input label={t('weekly.photos.weight')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />
              )} />
              <Controller name='addPhoto.note' control={control} render={({ field }) => (
                <Input label={t('weekly.photos.note')} value={field.value} onChange={e => field.onChange(e.target.value)} />
              )} />
            </div>

            <div className='flex gap-2'>
              <Button type='button' onClick={uploadNewPhotoSet} disabled={uploadingSet}>
                {uploadingSet ? <Loader2 className='w-4 h-4 animate-spin' /> : <UploadCloud className='w-4 h-4' />}
                {t('weekly.photos.uploadSet')}
              </Button>
              <Button type='button' color='neutral' onClick={() => setShowAddPhotoForm(false)}>
                {t('weekly.actions.close')}
              </Button>
            </div>
          </div>
        )}

        {/* Preview picked sides */}
        {!showAddPhotoForm && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-1'>
            {['front','back','right','left'].map(side => (
              <ImagePicker
                key={side}
                label={t(`weekly.photos.${side}`)}
                openPopup={openPickPhotosModal}
                file={side === 'front' ? frontFile : side === 'back' ? backFile : side === 'right' ? rightFile : leftFile}
                onPick={side === 'front' ? setFrontFile : side === 'back' ? setBackFile : side === 'right' ? setRightFile : setLeftFile}
                pickedUrl={pickedSides[side]}
                onClearPicked={() => setPickedSides(p => ({ ...p, [side]: null }))}
                uploadText={t('weekly.photos.upload')}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Status messages ── */}
      {ok && (
        <div className='flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-in slide-in-from-bottom-2 duration-300'>
          <div className='w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0'>
            <CheckCircle2 className='w-4 h-4 text-emerald-600' />
          </div>
          {t('weekly.success')}
        </div>
      )}
      {serverError && (
        <div className='flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium animate-in slide-in-from-bottom-2 duration-300'>
          <div className='w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center shrink-0'>
            <X className='w-4 h-4 text-rose-600' />
          </div>
          {serverError}
        </div>
      )}

      {/* ── Sticky Submit Bar ── */}
      <div className='fixed inset-x-0 bottom-0 z-40 px-3 pb-3'>
        <div className='mx-auto max-w-4xl'>
          <div className='rounded-2xl border border-[var(--color-primary-100)] bg-white/95 backdrop-blur-md shadow-xl shadow-[var(--color-primary-100)]/50 overflow-hidden'>
            {/* progress bar */}
            <div className='h-1 w-full bg-slate-100'>
              <div
                className='h-full bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] transition-[width] duration-500 ease-out'
                style={{ width: `${reqPct}%` }}
              />
            </div>

            <div className='px-4 py-3 flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='hidden sm:flex items-center gap-2'>
                  <div className='w-8 h-8 relative'>
                    <ProgressRing pct={reqPct} size={32} />
                    <span className='absolute inset-0 flex items-center justify-center text-[9px] font-black text-[var(--color-primary-700)]'>{reqPct}%</span>
                  </div>
                </div>
                <div>
                  <div className='text-xs font-semibold text-slate-700'>{t('weekly.submit.hint')}</div>
                  <div className='text-[10px] text-slate-400'>{reqDone}/{reqTotal} {t('weekly.submit.fieldsComplete') || 'حقول مكتملة'}</div>
                </div>
              </div>

              <Button type='submit' disabled={submitting} className='!px-6 !py-2.5'>
                {submitting ? <Loader2 className='w-4 h-4 animate-spin' /> : <UploadCloud className='w-4 h-4' />}
                {submitting ? t('weekly.submit.sending') : t('weekly.submit.cta')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo picker modal ── */}
      {showPickModal && (
        <PhotoPickerModal
          onClose={() => setShowPickModal(false)}
          photos={historyRows}
          selected={pickedSides}
          t={t}
          onPick={(side, url) => setPickedSides(prev => prev[side] === url ? { ...prev, [side]: null } : { ...prev, [side]: url })}
        />
      )}

      {/* ── Previous reports modal ── */}
      <Modal open={showPrevModal} onClose={() => setShowPrevModal(false)} title={t('weekly.prevReports.title')} maxW='max-w-3xl' maxHBody='max-h-[70vh]'>
        {reportsLoading ? (
          <div className='h-32 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm'>
            <Loader2 className='w-6 h-6 animate-spin text-[var(--color-primary-400)]' />
            {t('weekly.prevReports.loading')}
          </div>
        ) : reportsError ? (
          <div className='h-32 flex items-center justify-center text-rose-600 text-sm'>{reportsError}</div>
        ) : myReports.length === 0 ? (
          <div className='h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm'>
            <ClipboardList className='w-8 h-8 opacity-40' />
            {t('weekly.prevReports.empty')}
          </div>
        ) : (
          <>
            <div className='space-y-3'>
              {myReports.map(r => (
                <div key={r.id} className='rounded-xl border border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)]/40 to-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[var(--color-primary-200)] transition-colors'>
                  <div className='space-y-1.5'>
                    <div className='text-sm font-bold text-slate-900'>
                      {t('weekly.prevReports.weekOf')}: <span className='text-[var(--color-primary-700)]'>{r.weekOf}</span>
                    </div>
                    <div className='text-[11px] text-slate-400'>
                      {t('weekly.prevReports.createdAt')}: {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </div>
                    <div>
                      {r.coachFeedback ? (
                        r.isRead ? (
                          <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 border border-emerald-200 text-[11px] font-semibold'>
                            <CheckCircle2 className='w-3.5 h-3.5' /> {t('weekly.prevReports.noteRead')}
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 border border-amber-200 text-[11px] font-semibold'>
                            <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' /> {t('weekly.prevReports.noteUnread')}
                          </span>
                        )
                      ) : (
                        <span className='inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-500 px-2.5 py-1 border border-slate-200 text-[11px]'>
                          <Info className='w-3.5 h-3.5' /> {t('weekly.prevReports.noNote')}
                        </span>
                      )}
                    </div>
                  </div>
                  {r.coachFeedback && (
                    <Button type='button' color={r.isRead ? 'neutral' : 'primary'} className='!px-3 !py-1.5 text-xs shrink-0' onClick={() => handleOpenFeedback(r)}>
                      <Eye className='w-3.5 h-3.5' /> {t('weekly.prevReports.viewNote')}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className='mt-4 flex items-center justify-between'>
              <div className='text-xs text-slate-400'>{t('weekly.prevReports.pagination', { page: reportsPage })}</div>
              <div className='flex items-center gap-2'>
                <Button type='button' color='neutral' className='!px-3 !py-1.5 text-xs' disabled={reportsPage <= 1} onClick={() => setReportsPage(p => Math.max(1, p - 1))}>
                  <ChevronRight className='w-3.5 h-3.5' /> {t('weekly.prevReports.prev')}
                </Button>
                <Button type='button' color='neutral' className='!px-3 !py-1.5 text-xs' disabled={!reportsHasMore} onClick={() => setReportsPage(p => p + 1)}>
                  {t('weekly.prevReports.next')} <ChevronLeft className='w-3.5 h-3.5' />
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Feedback modal ── */}
      {showFeedbackModal && activeReport && (
        <div className='fixed inset-0 z-[9999000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200'>
            <div className='h-1 w-full bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]' />
            <div className='px-5 py-4 border-b border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)] to-white flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center'>
                  <Eye className='w-4 h-4 text-white' />
                </div>
                <span className='font-bold text-slate-800'>{t('weekly.prevReports.noteTitle', { week: activeReport.weekOf })}</span>
              </div>
              <button type='button' onClick={() => setShowFeedbackModal(false)} className='w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors'>
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-5 space-y-3'>
              <div className='text-xs text-slate-400'>
                {t('weekly.prevReports.createdAt')}: {activeReport.created_at ? new Date(activeReport.created_at).toLocaleString() : '—'}
              </div>
              <div className='text-sm font-semibold text-slate-700'>{t('weekly.prevReports.noteLabel')}</div>
              <div className='rounded-xl border border-[var(--color-primary-100)] bg-gradient-to-br from-[var(--color-primary-50)] to-white p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed'>
                {activeReport.coachFeedback || '—'}
              </div>
              {markingRead && (
                <div className='text-[11px] text-slate-400 flex items-center gap-1.5'>
                  <Loader2 className='w-3.5 h-3.5 animate-spin' /> {t('weekly.prevReports.markingRead')}
                </div>
              )}
            </div>

            <div className='px-5 py-4 border-t border-[var(--color-primary-100)] bg-slate-50/50 flex justify-end'>
              <Button type='button' color='neutral' onClick={() => setShowFeedbackModal(false)}>
                {t('weekly.actions.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}