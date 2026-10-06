'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Camera, UploadCloud, CheckCircle2, Loader2, Info, X, Images,
  Plus, ClipboardList, Eye, Utensils, Dumbbell, Ruler, ChevronRight,
  ChevronLeft, Star as StarIcon, TrendingUp, History, RefreshCw, Bell
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import Input from '@/components/atoms/Input';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import FloatingTextarea from '@/components/atoms/FloatingTextarea';
import Textarea from '@/components/atoms/Textarea';
import Select from '@/components/atoms/Select';
import InputDate from '@/components/atoms/InputDate';
import Img from '@/components/atoms/Img';
import api from '@/utils/axios';

/* ─────────────────────────── API helpers ─────────────────────────── */
async function getClientReportConfig() {
  try {
    const { data } = await api.get('/weekly-reports/client/report-config');
    return data;
  } catch {
    return null;
  }
}
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
const NEU_FIELD = '!rounded-2xl !border-white/85 !bg-[#eef2f9] !shadow-[3px_3px_6px_rgba(100,116,139,0.22)]';
function PhoneInput(props) {
  return <Input clearable={false} {...props} cnInputParent={NEU_FIELD} />;
}
function PhoneDate(props) {
  return <InputDate {...props} cnInput={`${NEU_FIELD} !h-11`} />;
}

const Button = ({ children, className = '', disabled, onClick, type = 'button', color = 'primary' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-(--color-gradient-from) via-(--color-gradient-via) to-(--color-gradient-to) text-white shadow-[2px_3px_6px_color-mix(in_srgb,var(--color-primary-900)_35%,transparent)] disabled:opacity-55',
    neutral: 'border border-white/85 bg-[#eef2f9] text-slate-600 shadow-[3px_3px_6px_rgba(100,116,139,0.22)] disabled:opacity-50',
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
    <section className='overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.32)]'>
      <header className='flex items-center justify-between gap-2 border-b border-slate-400/15 bg-[rgba(37,99,235,0.06)] px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <div className='grid h-[30px] w-[30px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-(--color-gradient-from) to-(--color-gradient-to) text-white'>
            <Icon size={14} strokeWidth={2.2} />
          </div>
          <h2 className='truncate text-sm font-bold text-slate-800'>{title}</h2>
        </div>
        {extra || null}
      </header>
      <div className='space-y-2 p-4'>{children}</div>
    </section>
  );
}

/* ─────────────────────────── Switch Row ─────────────────────────── */
function SwitchRow({ label, value, onChange, description }) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-[#eef2f9] px-3 py-2.5 shadow-[3px_3px_6px_rgba(100,116,139,0.18)]'>
      <div className='min-w-0 flex-1'>
        <div className='text-[13px] font-medium text-slate-800'>{label}</div>
        {description && <div className='mt-0.5 text-[11px] text-slate-400'>{description}</div>}
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={!!value}
        onClick={() => onChange(!value)}
        className={value
          ? 'relative h-7 w-12 shrink-0 rounded-full bg-(--color-primary-400)'
          : 'relative h-7 w-12 shrink-0 rounded-full bg-[#d1d5db]'}
      >
        <span className={value
          ? 'absolute end-0.5 top-0.5 h-6 w-6 rounded-full bg-(--color-primary-600) shadow'
          : 'absolute start-0.5 top-0.5 h-6 w-6 rounded-full bg-[#f4f4f5] shadow'} />
      </button>
    </div>
  );
}

/* ─────────────────────────── Rating Stars ─────────────────────────── */
function RatingStars({ label, value = 0, onChange = () => {}, max = 5, readOnly = false, required }) {
  const tStars = useTranslations('weekly.stars');
  const [hovered, setHovered] = useState(0);
  const items = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);
  const display = hovered || value;
  const labels = ['', tStars('1'), tStars('2'), tStars('3'), tStars('4'), tStars('5')];

  return (
    <div className='space-y-2'>
      {label && (
        <label className='block text-[13px] font-medium text-slate-600'>
          {label}
          {required && <span className='text-rose-500 ml-1'>*</span>}
        </label>
      )}
      <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-white/80 bg-[#eef2f9] p-3 shadow-[3px_3px_6px_rgba(100,116,139,0.18)]'>
        <div className='flex items-center gap-1.5'>
          {items.map(n => (
            <button
              key={n}
              type='button'
              disabled={readOnly}
              onClick={() => !readOnly && onChange(String(n))}
              onMouseEnter={() => !readOnly && setHovered(n)}
              onMouseLeave={() => !readOnly && setHovered(0)}
              className='focus:outline-none'
            >
              <StarIcon size={28} strokeWidth={1.6} className={n <= display ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'} />
            </button>
          ))}
        </div>
        {display > 0 && (
          <span className='text-xs font-medium text-(--color-primary-600)'>
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
    <div className='group overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[4px_4px_8px_rgba(100,116,139,0.22)]'>
      <div className='border-b border-slate-400/15 px-3 py-2'>
        <span className='text-xs font-bold text-slate-600'>{label}</span>
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
          className='flex h-36 w-full flex-col items-center justify-center gap-2 bg-[#eef2f9] text-slate-400'
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
      <span className='text-2xl font-black text-[var(--color-primary-700)] md: leading-tight'>{value}</span>
      {unit && <span className='text-[11px] text-slate-400'>{unit}</span>}
    </div>
  );
}

/* ─────────────────────────── Custom Field Renderer ─────────────────────────── */
function CustomFieldInput({ field, value, onChange }) {
  const { type, label, placeholder, options, required } = field;
  const fieldLabel = label || 'سؤال';

  if (type === 'boolean') {
    return (
      <div className='flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-[#eef2f9] px-3 py-2.5 shadow-[3px_3px_6px_rgba(100,116,139,0.18)]'>
        <span className='text-[13px] font-medium text-slate-800'>{label}{required && <span className='text-rose-500 ms-1'>*</span>}</span>
        <button
          type='button'
          role='switch'
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          className={value ? 'relative h-7 w-12 shrink-0 rounded-full bg-(--color-primary-400)' : 'relative h-7 w-12 shrink-0 rounded-full bg-[#d1d5db]'}
        >
          <span className={value ? 'absolute end-0.5 top-0.5 h-6 w-6 rounded-full bg-(--color-primary-600) shadow' : 'absolute start-0.5 top-0.5 h-6 w-6 rounded-full bg-[#f4f4f5] shadow'} />
        </button>
      </div>
    );
  }

  if (type === 'rating') {
    return (
      <div className='space-y-1'>
        <span className='block text-sm font-medium text-slate-700'>{fieldLabel}{required && <span className='text-rose-500 ms-1'>*</span>}</span>
        <div className='flex items-center gap-1 p-3 rounded-xl bg-slate-50/80 border border-slate-100'>
          {[1,2,3,4,5].map(n => (
            <button key={n} type='button' onClick={() => onChange(n)}
              className='focus:outline-none transition-transform hover:scale-110 active:scale-95'>
              <svg viewBox='0 0 24 24' className='w-7 h-7'>
                <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
                  className={n <= (value || 0) ? 'fill-amber-400 stroke-amber-400' : 'fill-slate-200 stroke-slate-200'} strokeWidth='0.5' />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <FloatingTextarea label={fieldLabel} required={required} value={value || ''} onChange={onChange} placeholder={placeholder || ''} rows={3} />
    );
  }

  if (type === 'select' && options?.length) {
    return (
      <FloatingSelect
        label={fieldLabel}
        required={required}
        value={value || null}
        onChange={onChange}
        options={options.map((opt) => ({ id: opt, label: opt }))}
      />
    );
  }

  if (type === 'number') {
    return <PhoneInput type='number' label={fieldLabel} required={required} value={value ?? ''} onChange={onChange} placeholder={placeholder || ''} />;
  }

  return <PhoneInput label={fieldLabel} required={required} value={value || ''} onChange={onChange} placeholder={placeholder || ''} />;
}

/* ─────────────────────────── Custom Section ─────────────────────────── */
function CustomGroupSection({ group, answers, onChange }) {
  const fields = group.fields || [];
  if (!group.enabled || !fields.length) return null;
  return (
    <Section icon={ClipboardList} title={group.label || 'قسم مخصص'}>
      <div className='space-y-3'>
        {fields.filter(f => f.enabled !== false).map(f => (
          <CustomFieldInput key={f.id} field={f} value={answers[`grp_${group.id}_${f.id}`]} onChange={v => onChange(`grp_${group.id}_${f.id}`, v)} />
        ))}
      </div>
    </Section>
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
  const [tab, setTab] = useState('new');
  const [refreshing, setRefreshing] = useState(false);
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

  /* ── Report config (loaded from admin/coach) ── */
  const [reportConfig, setReportConfig] = useState(null);
  const [customAnswers, setCustomAnswers] = useState({});

  /* ── Config helpers ── */
  const isSecEnabled = useCallback((sectionKey) => {
    return reportConfig?.sections?.[sectionKey]?.enabled ?? true;
  }, [reportConfig]);

  const isFieldEnabled = useCallback((sectionKey, fieldKey) => {
    if (!isSecEnabled(sectionKey)) return false;
    return reportConfig?.sections?.[sectionKey]?.fields?.[fieldKey]?.enabled ?? true;
  }, [reportConfig, isSecEnabled]);

  const isFieldRequired = useCallback((sectionKey, fieldKey) => {
    return reportConfig?.sections?.[sectionKey]?.fields?.[fieldKey]?.required ?? false;
  }, [reportConfig]);

  const getCustomFields = useCallback((sectionKey) => {
    return reportConfig?.sections?.[sectionKey]?.customFields ?? [];
  }, [reportConfig]);

  const customGroups = useMemo(() => reportConfig?.customGroups ?? [], [reportConfig]);

  const setCustomAnswer = useCallback((key, value) => {
    setCustomAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

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
  const m = watch('measurements');
  const addPhotoVals = watch('addPhoto');

  const measurementOptions = useMemo(() => measureList.map(mm => ({ id: mm.id, label: `${mm.date}${mm.weight ? ` • ${mm.weight}kg` : ''}` })), [measureList]);
  const photoSetOptions = useMemo(() => historyRows.map(r => ({ id: r.id, label: `${r.takenAt}${r.weight ? ` • ${r.weight}kg` : ''}` })), [historyRows]);

  /* ── effects ── */
  useEffect(() => {
    const pane = document.querySelector('[data-dashboard-content]');
    if (!pane) return undefined;
    pane.dataset.plainPage = '1';
    return () => { delete pane.dataset.plainPage; };
  }, []);

  useEffect(() => {
    getClientReportConfig().then(cfg => { if (cfg) setReportConfig(cfg); });
  }, []);

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

  async function onRefresh() {
    setRefreshing(true);
    try {
      const [cfg, count] = await Promise.all([getClientReportConfig(), fetchUnreadFeedbackCount()]);
      if (cfg) setReportConfig(cfg);
      setUnreadFeedbackCount(count);
      const res = await fetchMyReports({ page: reportsPage, limit: 5 });
      setMyReports(res.items || []);
      setReportsHasMore(res.hasMore);
    } catch { /* keep current data */ }
    finally { setRefreshing(false); }
  }

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
        customAnswers: Object.keys(customAnswers).length ? customAnswers : null,
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
    <div data-plain-page="1" className='report-phone -mx-[var(--app-gutter)] min-h-full bg-white px-[var(--app-gutter)] pt-1 dark:bg-[#0b1220]'>
    <div className='mx-auto w-full max-w-[440px]'>
      <div className='m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]'>
        <div
          className='relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)]'
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), #1a3fbf)' }}
        >
          <div className='pointer-events-none absolute -top-24 -start-16 h-[280px] w-[280px] rounded-full bg-white/5' />
          <div className='pointer-events-none absolute -bottom-16 -end-12 h-[200px] w-[200px] rounded-full bg-white/[0.04]' />
          <div className='relative flex items-center gap-3 p-4'>
            <div className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/40 bg-white/15 text-white'>
              <ClipboardList size={20} strokeWidth={1.8} />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='truncate text-xl font-black leading-6 tracking-[-0.3px] text-white'>{t('weekly.title')}</h1>
                {unreadFeedbackCount > 0 && (
                  <span className='inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800'>
                    <Bell size={11} strokeWidth={2.4} />
                    {unreadLoading ? '...' : t('weekly.unreadFeedback.badge', { count: unreadFeedbackCount })}
                  </span>
                )}
              </div>
              <p className='mt-0.5 line-clamp-2 text-[10px] font-medium text-white/55'>{t('weekly.subtitle')}</p>
            </div>
            <button type='button' onClick={onRefresh} className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white'>
              <RefreshCw size={18} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className='flex gap-2 px-4 pb-4'>
            {[
              { key: 'new', label: t('weekly.tabs.new'), Icon: Plus },
              { key: 'history', label: t('weekly.tabs.history'), Icon: History },
            ].map(item => {
              const active = tab === item.key;
              const Icon = item.Icon;
              return (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => setTab(item.key)}
                  className={active
                    ? 'flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white bg-white py-2.5 text-[13px] font-bold text-(--color-primary-700) shadow-[2px_3px_6px_rgba(15,34,128,0.25)]'
                    : 'flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/15 py-2.5 text-[13px] font-bold text-white/90'}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === 'history' && (
        <div className='space-y-3 px-3 pt-3'>
          {reportsLoading ? (
            <div className='flex h-32 flex-col items-center justify-center gap-2 text-sm text-slate-500'>
              <Loader2 className='h-6 w-6 animate-spin text-(--color-primary-400)' />
              {t('weekly.prevReports.loading')}
            </div>
          ) : reportsError ? (
            <div className='flex h-32 items-center justify-center text-sm text-rose-600'>{reportsError}</div>
          ) : myReports.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-400'>
              <div className='grid h-[72px] w-[72px] place-items-center rounded-full border border-white/85 bg-[#eef2f9] shadow-[4px_4px_8px_rgba(100,116,139,0.28)]'>
                <History size={32} />
              </div>
              {t('weekly.prevReports.empty')}
            </div>
          ) : (
            <>
              {myReports.map(r => (
                <div key={r.id} className='rounded-3xl border border-white/85 bg-[#eef2f9] p-4 shadow-[5px_5px_8px_rgba(100,116,139,0.32)]'>
                  <div className='text-sm font-bold text-slate-800'>{t('weekly.prevReports.weekOf')}: {r.weekOf}</div>
                  <div className='mt-1 text-[11px] text-slate-400'>
                    {t('weekly.prevReports.createdAt')}: {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                  </div>
                  <div className='mt-2 flex items-center justify-between gap-2'>
                    {r.coachFeedback ? (
                      r.isRead ? (
                        <span className='rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700'>{t('weekly.prevReports.noteRead')}</span>
                      ) : (
                        <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700'>{t('weekly.prevReports.noteUnread')}</span>
                      )
                    ) : (
                      <span className='rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500'>{t('weekly.prevReports.noNote')}</span>
                    )}
                    {r.coachFeedback && (
                      <button type='button' onClick={() => handleOpenFeedback(r)} className='inline-flex items-center gap-1.5 rounded-2xl border border-t-white/35 border-b-[rgba(15,48,120,0.3)] bg-(--color-primary-600) px-3 py-2 text-[11px] font-bold text-white'>
                        <Eye size={14} /> {t('weekly.prevReports.viewNote')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className='flex items-center justify-between pt-1'>
                <div className='text-xs text-slate-400'>{t('weekly.prevReports.pagination', { page: reportsPage })}</div>
                <div className='flex items-center gap-2'>
                  <Button type='button' color='neutral' className='!px-3 !py-1.5 text-xs' disabled={reportsPage <= 1} onClick={() => setReportsPage(p => Math.max(1, p - 1))}>
                    <ChevronRight className='h-3.5 w-3.5' /> {t('weekly.prevReports.prev')}
                  </Button>
                  <Button type='button' color='neutral' className='!px-3 !py-1.5 text-xs' disabled={!reportsHasMore} onClick={() => setReportsPage(p => p + 1)}>
                    {t('weekly.prevReports.next')} <ChevronLeft className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    <form onSubmit={handleSubmit(onSubmit)} className={tab === 'history' ? 'hidden' : 'space-y-4 px-3 pt-3'}>
          <Section title={t('weekly.basics')} icon={ClipboardList}>
          <div className='grid grid-cols-1 gap-4'>
            <div className='space-y-1.5'>
              <Controller
                control={control}
                name='weekOf'
                render={({ field }) => (
                  <PhoneDate
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
          </Section>

      {/* ── Diet Section ── */}
      {isSecEnabled('diet') && (
      <Section title={t('weekly.diet.title')} icon={Utensils}>
        <div className='space-y-2'>
          {isFieldEnabled('diet','hungry') && <Controller name='diet.hungry' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.hungry')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('diet','mentalComfort') && <Controller name='diet.mentalComfort' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.comfort')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('diet','foodTooMuch') && <Controller name='diet.foodTooMuch' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.tooMuch')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('diet','dietDeviation') && <Controller name='diet.dietDeviation.hasDeviation' control={control} render={({ field }) => <SwitchRow label={t('weekly.diet.deviation.title')} value={field.value} onChange={field.onChange} />} />}
        </div>

        {isFieldEnabled('diet','wantSpecific') && (
        <div className='pt-1'>
          <Controller name='diet.wantSpecific' control={control} render={({ field }) => (
            <PhoneInput label={t('weekly.diet.wantSpecific.title')} value={field.value} onChange={field.onChange} placeholder={t('weekly.diet.wantSpecific.ph')} />
          )} />
        </div>
        )}

        {watch('diet.dietDeviation.hasDeviation') && isFieldEnabled('diet','dietDeviation') && (
          <div className='mt-2 space-y-3'>
            <div className='grid grid-cols-1 grid-cols-1 gap-3'>
              <Controller name='diet.dietDeviation.times' control={control} render={({ field }) => (
                <PhoneInput label={t('weekly.diet.deviation.times')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />
              )} />
              <Controller name='diet.dietDeviation.details' control={control} render={({ field }) => (
                <PhoneInput label={t('weekly.diet.deviation.details')} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={t('weekly.diet.deviation.ph')} />
              )} />
            </div>
          </div>
        )}

        {/* Custom fields for diet section */}
        {getCustomFields('diet').filter(f => f.enabled !== false).map(f => (
          <CustomFieldInput key={f.id} field={f} value={customAnswers[`diet_${f.id}`]} onChange={v => setCustomAnswer(`diet_${f.id}`, v)} />
        ))}
      </Section>
      )}

      {/* ── Training Section ── */}
      {isSecEnabled('training') && (
      <Section title={t('weekly.training.title')} icon={Dumbbell}>
        <div className='space-y-2'>
          {isFieldEnabled('training','intensityOk') && <Controller name='training.intensityOk' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.intensityOk')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('training','daysDeviation') && <Controller name='training.daysDeviation.hasDeviation' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.daysDeviation')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('training','shapeChange') && <Controller name='training.shapeChange' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.shape')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('training','fitnessChange') && <Controller name='training.fitnessChange' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.fitness')} value={field.value} onChange={field.onChange} />} />}
          {isFieldEnabled('training','sleepEnough') && <Controller name='training.sleepEnough' control={control} render={({ field }) => <SwitchRow label={t('weekly.training.sleepEnough')} value={field.value} onChange={field.onChange} />} />}
        </div>

        {watch('training.daysDeviation.hasDeviation') && isFieldEnabled('training','daysDeviation') && (
          <div className='mt-2 space-y-3'>
            <div className='grid grid-cols-1 grid-cols-1 gap-3'>
              <Controller name='training.daysDeviation.count' control={control} render={({ field }) => (
                <PhoneInput label={t('weekly.training.deviation.count')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />
              )} />
              <Controller name='training.daysDeviation.reason' control={control} render={({ field }) => (
                <PhoneInput label={t('weekly.training.deviation.reason')} value={field.value} onChange={e => field.onChange(e.target.value)} />
              )} />
            </div>
          </div>
        )}

        <div className='mt-2 grid grid-cols-1 grid-cols-1 gap-3'>
          {isFieldEnabled('training','sleepHours') && <Controller name='training.sleepHours' control={control} render={({ field }) => (
            <PhoneInput label={t('weekly.training.sleepHours')} type='number' inputMode='numeric' value={field.value} onChange={val => field.onChange(String(val))} />
          )} />}
          {isFieldEnabled('training','programNotes') && <Controller name='training.programNotes' control={control} render={({ field }) => (
            <PhoneInput label={t('weekly.training.notes.title')} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={t('weekly.training.notes.ph')} />
          )} />}
        </div>

        {/* Custom fields for training section */}
        {getCustomFields('training').filter(f => f.enabled !== false).map(f => (
          <CustomFieldInput key={f.id} field={f} value={customAnswers[`training_${f.id}`]} onChange={v => setCustomAnswer(`training_${f.id}`, v)} />
        ))}
      </Section>
      )}

      {/* ── Measurements Section ── */}
      {isSecEnabled('measurements') && (
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
          <div className='mt-3 space-y-4 rounded-3xl border border-white/80 bg-[#eef2f9] p-4 shadow-[3px_3px_6px_rgba(100,116,139,0.18)]'>
            <div className='grid grid-cols-2 grid-cols-2 gap-3'>
              <Controller name='measurements.date' control={control} render={({ field }) => (
                <PhoneDate
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
              <Controller name='measurements.weight' control={control} render={({ field }) => <PhoneInput label={t('weekly.measurements.weight')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.waist' control={control} render={({ field }) => <PhoneInput label={t('weekly.measurements.waist')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.chest' control={control} render={({ field }) => <PhoneInput label={t('weekly.measurements.chest')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.hips' control={control} render={({ field }) => <PhoneInput label={t('weekly.measurements.hips') || 'الأرداف'} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.arms' control={control} render={({ field }) => <PhoneInput label={t('weekly.measurements.arms') || 'الذراعان'} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
              <Controller name='measurements.thighs' control={control} render={({ field }) => <PhoneInput label={t('weekly.measurements.thighs') || 'الأفخاذ'} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />} />
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
      )}

      {/* ── Photos Section ── */}
      {isSecEnabled('photos') && (
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
        <div className='grid grid-cols-1 grid-cols-1 gap-3 pb-2'>
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
          <div className='space-y-4 rounded-3xl border border-white/80 bg-[#eef2f9] p-4 shadow-[3px_3px_6px_rgba(100,116,139,0.18)]'>
            <div className='grid grid-cols-2 grid-cols-2 gap-3'>
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

            <div className='grid grid-cols-1 grid-cols-1 gap-3'>
              <Controller name='addPhoto.date' control={control} render={({ field }) => (
                <PhoneDate
                  label={<span>{t('weekly.photos.date')}{hasAnyPhotoNew ? <span className='text-rose-500'> *</span> : null}</span>}
                  type='date' value={field.value}
                  onChange={v => field.onChange(typeof v === 'string' ? v : v?.target?.value)}
                  error={errors?.addPhoto?.date?.message}
                />
              )} />
              <Controller name='addPhoto.weight' control={control} render={({ field }) => (
                <PhoneInput label={t('weekly.photos.weight')} type='number' inputMode='decimal' value={field.value} onChange={val => field.onChange(String(val))} />
              )} />
              <Controller name='addPhoto.note' control={control} render={({ field }) => (
                <PhoneInput label={t('weekly.photos.note')} value={field.value} onChange={e => field.onChange(e.target.value)} />
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
          <div className='grid grid-cols-2 grid-cols-2 gap-3 mt-1'>
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
      )}

      {/* ── Custom Groups (from coach/admin config) ── */}
      {customGroups.map(group => (
        <CustomGroupSection key={group.id} group={group} answers={customAnswers} onChange={setCustomAnswer} />
      ))}

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

      <button
        type='submit'
        disabled={submitting}
        className='flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-(--color-gradient-from) via-(--color-gradient-via) to-(--color-gradient-to) py-3.5 text-[15px] font-bold text-white shadow-[3px_5px_10px_color-mix(in_srgb,var(--color-primary-900)_40%,transparent)] disabled:opacity-55'
      >
        {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : <ClipboardList size={18} strokeWidth={2.2} />}
        {submitting ? t('weekly.submit.sending') : t('weekly.submit.cta')}
      </button>

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

    </form>

      {/* ── Feedback modal ── */}
      {showFeedbackModal && activeReport && (
        <div className='fixed inset-0 z-[9999000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/85 bg-[#f8fafc] shadow-[0_16px_40px_rgba(100,116,139,0.35)]'>
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
              <div className='rounded-xl border border-[var(--color-primary-100)] bg-gradient-to-br from-[var(--color-primary-50)] to-white p-4 text-sm text-slate-800 whitespace-pre-wrap md: leading-relaxed'>
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
    </div>
    </div>
  );
}