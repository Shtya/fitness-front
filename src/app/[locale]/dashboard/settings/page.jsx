'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Info, Save, Link2, Loader2, Upload as UploadIcon, Download, Radio, Palette, BellRing, Globe, Sparkles, Check as CheckIcon, ChevronDown, X, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import Textarea from '@/components/atoms/Textarea';
import { Switcher } from '@/components/atoms/Switcher';
import DhikrLoading from '@/components/molecules/DhikrLoading';
import api from '@/utils/axios';

/* --------------------------- UI primitives --------------------------- */
const CardShell = ({ title, desc, right, open, onToggle, children }) => (
  <div className='rounded-lg border border-slate-200 bg-white shadow-inner ring ring-slate-100 overflow-hidden'>
    <button onClick={onToggle} className='w-full grid grid-cols-[1fr_auto] items-center gap-3 p-4 border-b border-slate-100'>
      <div className='text-left rtl:text-right '>
        <h3 className='text-slate-900 font-semibold'>{title}</h3>
        {desc ? <p className='text-slate-500 text-sm mt-0.5'>{desc}</p> : null}
      </div>
      <div className='flex items-center gap-2'>
        {right}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`} />
      </div>
    </button>

    <AnimatePresence initial={false}>
      {open ? (
        <motion.div key='content' initial={{ height: 0, opacity: 0, y: -6 }} animate={{ height: 'auto', opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: 'easeOut' }} className='overflow-hidden'>
          <div className='p-4'>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  </div>
);

const Row = ({ label, hint, children }) => (
  <div className='grid grid-cols-1 md:grid-cols-3 gap-3 py-3 border-b last:border-b-0 border-slate-100'>
    <div>
      <div className='text-sm font-medium text-slate-800'>{label}</div>
      {hint ? <div className='text-xs text-slate-500 mt-0.5'>{hint}</div> : null}
    </div>
    <div className='md:col-span-2'>{children}</div>
  </div>
);

const Button = ({ children, color = 'primary', className = '', ...props }) => {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    neutral: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button {...props} className={['inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition active:scale-[.98]', styles[color] || styles.primary, className].join(' ')}>
      {children}
    </button>
  );
};

const Chip = ({ children }) => <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs border border-slate-200'>{children}</span>;

const Help = ({ children }) => (
  <div className='flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2'>
    <Info className='w-4 h-4 shrink-0 mt-0.5' /> <div>{children}</div>
  </div>
);

/* ----------------------------- Simple Modal ----------------------------- */
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-[60]'>
      <div className='absolute inset-0 bg-slate-900/50' onClick={onClose} />
      <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(880px,96vw)] rounded-lg bg-white shadow-xl border border-slate-200 p-0 overflow-hidden'>
        {children}
        <div className='p-3 text-right border-t border-slate-200'>
          <Button color='neutral' onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------- Upload (enhanced) --------------------------- */
function UploadBox({ file, onFile, previewUrl, onClear, label }) {
  const onDrop = e => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };
  return (
    <div onDragOver={e => e.preventDefault()} onDrop={onDrop} className='rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-300 transition bg-slate-50/60 p-4'>
      {!file ? (
        <label className='flex flex-col items-center gap-2 cursor-pointer'>
          <UploadIcon className='w-5 h-5 text-slate-500' />
          <div className='text-sm text-slate-700'>{label}</div>
          <input type='file' accept='image/*' className='hidden' onChange={e => onFile(e.target.files?.[0] || null)} />
        </label>
      ) : (
        <div className='flex items-center gap-3'>
          {previewUrl ? (
            <div className='w-28 h-20 overflow-hidden rounded-lg border border-slate-200 bg-white'>
              <img src={previewUrl} className='w-full h-full object-cover' alt='preview' />
            </div>
          ) : null}
          <div className='flex-1 min-w-0'>
            <div className='text-sm font-medium text-slate-900 truncate'>{file.name}</div>
            <div className='text-xs text-slate-500'>{Math.round(file.size / 1024)} KB</div>
          </div>
          <Button color='danger' onClick={onClear}>
            <X className='w-4 h-4' />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Color field with palette ----------------------- */
const PRESETS = ['#4f46e5', '#6366f1', '#0ea5e9', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#111827', '#0f172a'];

function ColorTile({ name, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value || '#000000');

  const choose = v => {
    onChange(v);
    setCustom(v);
    setOpen(false);
  };

  return (
    <div className='relative'>
      <button type='button' onClick={() => setOpen(o => !o)} className='w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 transition'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs text-slate-600'>{name}</div>
            <div className='text-sm font-medium text-slate-900'>{value}</div>
          </div>
          <span className='h-6 w-10 rounded-md ring-1 ring-slate-200' style={{ background: value }} />
        </div>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className='absolute z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg'>
            <div className='grid grid-cols-6 gap-2 mb-3'>
              {PRESETS.map(c => (
                <button key={c} onClick={() => choose(c)} className='h-7 w-7 rounded-md ring-1 ring-slate-200' style={{ background: c }} title={c} />
              ))}
            </div>
            <div className='flex items-center gap-2'>
              <input type='color' value={custom} onChange={e => setCustom(e.target.value)} className='h-9 w-14 bg-transparent border border-slate-200 rounded-md' />
              <Input value={custom} onChange={v => setCustom(v)} className='flex-1' placeholder='#000000' />
              <Button color='neutral' onClick={() => choose(custom)}>
                Apply
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- API mapping helpers --------------------------- */
function apiToUi(s) {
  return {
    org: {
      name: s.orgName ?? '',
      defaultLang: s.defaultLang ?? 'ar',
      timezone: s.timezone ?? 'Africa/Cairo',
      homeSlug: s.homeSlug ?? '',
    },
    siteMeta: {
      metaTitle: s.metaTitle ?? '',
      metaDescription: s.metaDescription ?? '',
      metaKeywords: s.metaKeywords ?? '',
      ogImageUrl: s.ogImageUrl ?? '',
      homeTitle: s.homeTitle ?? '',
    },
    loader: {
      enabled: s.loaderEnabled,
      message: s.loaderMessage ?? '',
      durationSec: s.loaderDurationSec ?? 2,
    },
    aiSecretKey: s.aiSecretKey ?? '',
    dhikrEnabled: s.dhikrEnabled,
    dhikrItems: (s.dhikrItems || []).map(d => ({ id: d.id, text: d.text })),
    activeDhikrId: s.activeDhikrId ?? s.dhikrItems?.[0]?.id ?? null,
    theme: { palette: s.themePalette },
    report: {
      enabled: s.reportEnabled,
      day: s.reportDay,
      time: s.reportTime,
      items: {
        weightTrend: s.rptWeightTrend,
        mealAdherence: s.rptMealAdherence,
        workoutCompletion: s.rptWorkoutCompletion,
        waterIntake: s.rptWaterIntake,
        checkinNotes: s.rptCheckinNotes,
        nextFocus: s.rptNextFocus,
        latestPhotos: s.rptLatestPhotos,
      },
      customMessage: s.reportCustomMessage ?? '',
    },
    reminders: (s.reminders || []).map(r => ({ id: String(r.id), title: r.title, time: r.time })),
  };
}

// helper at top of file, near apiToUi/uiToApi
const isUuidLike = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function uiToApi({ org, siteMeta, loader, dhikrEnabled, dhikrItems, activeDhikrId, theme, report, reminders, aiSecretKey }) {
  return {
    organizationKey: null,
    orgName: org.name,
    defaultLang: org.defaultLang,
    timezone: org.timezone,
    homeSlug: org.homeSlug || null,
    aiSecretKey: aiSecretKey || null,
    metaTitle: siteMeta.metaTitle || null,
    metaDescription: siteMeta.metaDescription || null,
    metaKeywords: siteMeta.metaKeywords || null,
    ogImageUrl: siteMeta.ogImageUrl || null,
    homeTitle: siteMeta.homeTitle || null,

    loaderEnabled: !!loader.enabled,
    loaderMessage: loader.message || '',
    loaderDurationSec: Number(loader.durationSec || 0),

    dhikrEnabled: !!dhikrEnabled,
    activeDhikrId: activeDhikrId ?? null,

    // ⬇️ only include id if it looks like a real uuid from backend
    dhikrItems: (dhikrItems || []).map(d => ({
      ...(isUuidLike(d.id) ? { id: d.id } : {}),
      text: d.text,
    })),

    themePalette: theme.palette,

    reportEnabled: !!report.enabled,
    reportDay: report.day,
    reportTime: report.time,
    rptWeightTrend: !!report.items.weightTrend,
    rptMealAdherence: !!report.items.mealAdherence,
    rptWorkoutCompletion: !!report.items.workoutCompletion,
    rptWaterIntake: !!report.items.waterIntake,
    rptCheckinNotes: !!report.items.checkinNotes,
    rptNextFocus: !!report.items.nextFocus,
    rptLatestPhotos: !!report.items.latestPhotos,
    reportCustomMessage: report.customMessage || '',

    reminders: (reminders || []).map(r => ({
      ...(isUuidLike(r.id) ? { id: r.id } : {}),
      title: r.title,
      time: r.time,
    })),
  };
}

/* ------------------------------- Page -------------------------------- */
export default function SettingsPage() {
  const t = useTranslations('settings');
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [aiSecretKey, setAiSecretKey] = useState('');

  /* Accordion control (persisted) */
  const sections = { org: 'org', site: 'site', loader: 'loader', dhikr: 'dhikr', theme: 'theme', reports: 'reports', reminders: 'reminders', ai: 'ai' };
  const [openKey, setOpenKey] = useState(() => {
    if (typeof window === 'undefined') return sections.org;
    return localStorage.getItem('settings.openKey') || sections.org;
  });
  const toggleOpen = key => setOpenKey(k => (k === key ? '' : key));
  const isOpen = key => openKey === key;
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('settings.openKey', openKey || '');
  }, [openKey]);

  /* Org */
  const tzOptions = useMemo(
    () => [
      { id: 'Africa/Cairo', label: 'Africa/Cairo' },
      { id: 'Europe/London', label: 'Europe/London' },
      { id: 'Asia/Dubai', label: 'Asia/Dubai' },
      { id: 'America/New_York', label: 'America/New_York' },
    ],
    [],
  );
  const [org, setOrg] = useState({ name: '', defaultLang: 'ar', timezone: 'Africa/Cairo', homeSlug: '' });

  /* Landing Page SEO + OG */
  const [siteMeta, setSiteMeta] = useState({ metaTitle: '', metaDescription: '', metaKeywords: '', ogImageUrl: '', homeTitle: '' });
  const [ogFile, setOgFile] = useState(null);
  const [ogPreviewUrl, setOgPreviewUrl] = useState('');
  const onOgFile = async file => {
    setOgFile(file);
    if (!file) {
      setOgPreviewUrl('');
      return;
    }
    setOgPreviewUrl(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/settings/og-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.url;
      if (url) setSiteMeta(s => ({ ...s, ogImageUrl: url }));
    } catch (e) {
      console.error('OG upload failed', e);
      setError('Failed to upload image.');
    }
  };
  const clearOg = () => {
    setOgFile(null);
    setOgPreviewUrl('');
    setSiteMeta(s => ({ ...s, ogImageUrl: '' })); // will persist on Save
  };

  /* Loader */
  const [loader, setLoader] = useState({ enabled: true, message: '', durationSec: 2 });
  const [loaderPreviewOpen, setLoaderPreviewOpen] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);

  /* Dhikr */
  const [dhikrEnabled, setDhikrEnabled] = useState(true);
  const [dhikrItems, setDhikrItems] = useState([
    { id: 1, text: 'سُبْحَانَ اللَّهِ' },
    { id: 2, text: 'الْحَمْدُ لِلَّهِ' },
    { id: 3, text: 'اللَّهُ أَكْبَرُ' },
  ]);
  const [activeDhikrId, setActiveDhikrId] = useState(1);

  /* Theme */
  const [theme, setTheme] = useState({
    palette: {
      primary: '#4f46e5',
      secondary: '#6366f1',
      surface: '#ffffff',
      onSurface: '#0f172a',
      background: '#f8fafc',
      onBackground: '#0f172a',
      onPrimary: '#ffffff',
    },
  });

  /* Reports */
  const weekdayOptions = useMemo(() => ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => ({ id: d, label: d })), []);
  const [report, setReport] = useState({
    enabled: true,
    day: 'Sunday',
    time: '09:00',
    items: {
      weightTrend: true,
      mealAdherence: true,
      workoutCompletion: true,
      waterIntake: true,
      checkinNotes: true,
      nextFocus: true,
      latestPhotos: false,
    },
    customMessage: '',
  });

  const templateRef = useRef(null);
  const labelsMap = useMemo(
    () => ({
      weightTrend: t('reportsAuto.contents.items.weightTrend'),
      mealAdherence: t('reportsAuto.contents.items.mealAdherence'),
      workoutCompletion: t('reportsAuto.contents.items.workoutCompletion'),
      waterIntake: t('reportsAuto.contents.items.waterIntake'),
      checkinNotes: t('reportsAuto.contents.items.checkinNotes'),
      nextFocus: t('reportsAuto.contents.items.nextFocus'),
      latestPhotos: t('reportsAuto.contents.items.latestPhotos'),
    }),
    [t],
  );

  // Build template lines from checked items
  const buildTemplateFromItems = useCallback(
    items => {
      const lines = Object.entries(items)
        .filter(([, v]) => v)
        .map(([k]) => `• ${labelsMap[k]}`);
      return lines.join('\n');
    },
    [labelsMap],
  );

  const toggleReportItem = useCallback(
    (key, checked) => {
      setReport(s => {
        const nextItems = { ...s.items, [key]: checked };
        // Keep customMessage in sync by adding/removing the line
        const line = `• ${labelsMap[key]}`;
        const lines = (s.customMessage || '').split('\n').filter(Boolean);
        const idx = lines.findIndex(l => l.trim() === line);
        if (checked && idx === -1) lines.push(line);
        if (!checked && idx !== -1) lines.splice(idx, 1);
        return { ...s, items: nextItems, customMessage: lines.join('\n') };
      });
      if (templateRef.current) {
        const el = templateRef.current;
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = el.value.length;
        });
      }
    },
    [labelsMap],
  );

  /* ------------ CRUD: load on mount, save, export, import ------------ */
  const [reminders, setReminders] = useState([{ id: Date.now().toString(), title: t('reminders.examples.water'), time: '12:00' }]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setInitializing(true);
        const { data } = await api.get('/settings'); // per-user via backend auth
        if (!alive) return;
        const u = apiToUi(data);

        setOrg(u.org);
        setSiteMeta(u.siteMeta);
        setLoader(u.loader);
        setDhikrEnabled(u.dhikrEnabled);
        setDhikrItems(u.dhikrItems);
        setActiveDhikrId(u.activeDhikrId);
        setTheme(u.theme);
        setAiSecretKey(data.aiSecretKey || '');

        // Reports: if customMessage is empty, prefill from checked items so it shows immediately
        const custom = u.report.customMessage?.trim() ? u.report.customMessage : buildTemplateFromItems(u.report.items);
        setReport({ ...u.report, customMessage: custom });

        setReminders(u.reminders.length ? u.reminders : [{ id: Date.now().toString(), title: t('reminders.examples.water'), time: '12:00' }]);
        setError('');
      } catch (e) {
        console.error('GET /settings failed', e);
        setError('Failed to load settings.');
      } finally {
        if (alive) setInitializing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [buildTemplateFromItems, t]);

  const saveAll = async () => {
    setSaving(true);
    try {
      const dto = uiToApi({
        org,
        siteMeta,
        loader,
        dhikrEnabled,
        dhikrItems,
        activeDhikrId,
        theme,
        report,
        reminders,
        aiSecretKey,
      });
      await api.put('/settings', dto); // per-user via backend auth
      setError('');
      // toast success here if you have a notifier
    } catch (e) {
      console.error('PUT /settings failed', e);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  /* Reminders (string IDs) */
  const addReminder = ({ title, time }) => {
    if (!title?.trim() || !time?.trim()) return;
    setReminders(arr => [...arr, { id: Date.now().toString(), title: title.trim(), time }]);
  };
  const updateReminder = (id, patch) => setReminders(arr => arr.map(r => (String(r.id) === String(id) ? { ...r, ...patch } : r)));
  const removeReminder = id => setReminders(arr => arr.filter(r => String(r.id) !== String(id)));

  return (
    <div className='mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-6 pb-28'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-slate-900'>{t('title')}</h1>
          <p className='text-slate-500 text-sm mt-1'>{t('subtitle')}</p>
          {initializing ? <div className='text-xs text-slate-500 mt-1'>{t('loading') || 'Loading…'}</div> : null}
          {error ? <div className='text-xs text-rose-600 mt-1'>{error}</div> : null}
        </div>
      </div>

      {/* Organization & Language & Home Slug */}
      <CardShell
        title={t('org.title')}
        desc={t('org.desc')}
        open={isOpen(sections.org)}
        onToggle={() => toggleOpen(sections.org)}
        right={
          <Chip>
            <Radio className='w-3.5 h-3.5' /> {org.timezone}
          </Chip>
        }>
        <Row label={t('org.name.label')} hint={t('org.name.hint')}>
          <Input value={org.name} onChange={v => setOrg(s => ({ ...s, name: v }))} placeholder={t('org.name.ph')} />
        </Row>

        <Row label={t('org.defaultLang.label')} hint={t('org.defaultLang.hint')}>
          <div className='flex items-center gap-2'>
            <Button type='button' color={org.defaultLang === 'ar' ? 'primary' : 'neutral'} onClick={() => setOrg(s => ({ ...s, defaultLang: 'ar' }))}>
              AR
            </Button>
            <Button type='button' color={org.defaultLang === 'en' ? 'primary' : 'neutral'} onClick={() => setOrg(s => ({ ...s, defaultLang: 'en' }))}>
              EN
            </Button>
          </div>
        </Row>

        <Row label={t('org.timezone.label')}>
          <Select value={org.timezone} onChange={val => setOrg(s => ({ ...s, timezone: val }))} options={tzOptions} placeholder={t('org.timezone.label')} />
        </Row>

        <Row label={t('org.homeSlug.label')} hint={t('org.homeSlug.hint')}>
          <div className='flex gap-2'>
            <Input className='flex-1' value={org.homeSlug} onChange={v => setOrg(s => ({ ...s, homeSlug: v }))} placeholder={t('org.homeSlug.ph')} />
            <Button color='neutral'>
              <Link2 className='w-4 h-4' />
              {t('org.homeSlug.preview')}
            </Button>
          </div>
        </Row>
      </CardShell>

      {/* AI Secret Key */}
      <CardShell title={t('ai.title')} desc={t('ai.desc')} open={isOpen('ai')} onToggle={() => toggleOpen('ai')} right={<Sparkles className='w-4 h-4 text-purple-500' />}>
        <Row label={t('ai.secretKey.label')} hint={t('ai.secretKey.hint')}>
          <div className='space-y-2'>
            <div className='flex gap-2'>
              <Input type={showAiKey ? 'text' : 'password'} value={aiSecretKey} onChange={setAiSecretKey} placeholder={t('ai.secretKey.placeholder')} className='flex-1 font-mono text-sm' />
              <Button color='neutral' onClick={() => setShowAiKey(!showAiKey)} type='button'>
                {showAiKey ? t('ai.secretKey.hide') : t('ai.secretKey.show')}
              </Button>
            </div>

            <Help>
              <div className='space-y-1 text-sm'>
                <p className='font-medium'>{t('ai.steps.title')}</p>

                <ol className='list-decimal list-inside space-y-1 pl-2'>
                  <li>
                    {t('ai.steps.step1')}{' '}
                    <a className='text-blue-800 underline font-bold' href='https://openrouter.ai/settings/keys' target='_blank'>
                      {t('ai.form_here')}
                    </a>
                  </li>
                  <li>{t('ai.steps.step2')}</li>
                  <li>{t('ai.steps.step3')}</li>
                  <li>{t('ai.steps.step4')}</li>
                  <li>{t('ai.steps.step5')}</li>
                  <li>{t('ai.steps.step6')}</li>
                  <li>{t('ai.steps.step7')}</li>
                </ol>

                <p className='text-red-600 font-medium mt-2'>{t('ai.steps.warning')}</p>
              </div>
            </Help>
          </div>
        </Row>
      </CardShell>

      {/* Landing Page SEO */}
      <CardShell title={t('site.title')} desc={t('site.desc')} open={isOpen(sections.site)} onToggle={() => toggleOpen(sections.site)} right={<Globe className='w-4 h-4 text-slate-500' />}>
        <Row label={t('site.metaTitle')}>
          <Input value={siteMeta.metaTitle} onChange={v => setSiteMeta(s => ({ ...s, metaTitle: v }))} placeholder={t('site.metaTitlePh')} />
        </Row>
        <Row label={t('site.metaDescription')}>
          <Textarea value={siteMeta.metaDescription} onChange={e => setSiteMeta(s => ({ ...s, metaDescription: e.target.value }))} placeholder={t('site.metaDescriptionPh')} />
        </Row>
        <Row label={t('site.metaKeywords')}>
          <Input value={siteMeta.metaKeywords} onChange={v => setSiteMeta(s => ({ ...s, metaKeywords: v }))} placeholder={t('site.metaKeywordsPh')} />
        </Row>

        <Row label={t('site.ogImageUpload')} hint={t('site.ogImageHint')}>
          <div className='space-y-2'>
            {(siteMeta.ogImageUrl || ogPreviewUrl) && (
              <div className='flex items-center gap-3'>
                <div className='w-28 h-20 overflow-hidden rounded-lg border border-slate-200 bg-white'>
                  <img src={ogPreviewUrl || siteMeta.ogImageUrl} className='w-full h-full object-cover' alt='og-preview' />
                </div>
                <Button color='danger' onClick={clearOg}>
                  <Trash2 className='w-4 h-4' />
                  {t('remove') || 'Remove'}
                </Button>
              </div>
            )}
            <UploadBox file={ogFile} onFile={onOgFile} previewUrl={ogPreviewUrl} onClear={clearOg} label={t('site.chooseImage')} />
            <input type='hidden' value={siteMeta.ogImageUrl} readOnly />
          </div>
        </Row>

        <Row label={t('site.homeTitle')}>
          <Input value={siteMeta.homeTitle} onChange={v => setSiteMeta(s => ({ ...s, homeTitle: v }))} placeholder={t('site.homeTitlePh')} />
        </Row>
      </CardShell>

      {/* Loader */}
      <CardShell title={t('loader.title')} desc={t('loader.desc')} open={isOpen(sections.loader)} onToggle={() => toggleOpen(sections.loader)}>
        <Row label={t('loader.enabled')}>
          <Switcher checked={loader.enabled} onChange={v => setLoader(s => ({ ...s, enabled: v }))} />
        </Row>
        <Row label={t('loader.message')} hint={t('loader.messageHint')}>
          <div className='flex gap-2'>
            <Input value={loader.message} onChange={v => setLoader(s => ({ ...s, message: v }))} placeholder={t('loader.messagePh')} />
            <Button color='neutral' onClick={() => setLoaderPreviewOpen(true)}>
              {t('loader.previewBtn')}
            </Button>
          </div>
        </Row>
        <Row label={t('loader.durationSec')} hint={t('loader.durationHint')}>
          <Input type='number' value={loader.durationSec} onChange={v => setLoader(s => ({ ...s, durationSec: Number(v || 0) }))} />
        </Row>
      </CardShell>

      {/* Dhikr */}
      <CardShell title={t('dhikr.title')} desc={t('dhikr.desc')} open={isOpen(sections.dhikr)} onToggle={() => toggleOpen(sections.dhikr)} right={<Sparkles className='w-4 h-4 text-amber-500' />}>
        <Row label={t('dhikr.enabled')}>
          <Switcher checked={dhikrEnabled} onChange={setDhikrEnabled} />
        </Row>
        <Row label={t('dhikr.activeOne')} hint={t('dhikr.activeHint')}>
          <div className='space-y-2'>
            {dhikrItems.map(item => (
              <label key={item.id} className='flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <input type='radio' name='activeDhikr' checked={activeDhikrId === item.id} onChange={() => setActiveDhikrId(item.id)} />
                  <Input className='w-[340px]' value={item.text} onChange={v => setDhikrItems(list => list.map(x => (x.id === item.id ? { ...x, text: v } : x)))} />
                </div>
                <Button color='ghost' onClick={() => setDhikrItems(list => list.filter(x => x.id !== item.id))}>
                  ✕
                </Button>
              </label>
            ))}
            <Button color='neutral' onClick={() => setDhikrItems(list => [...list, { id: Date.now(), text: '' }])}>
              + {t('add')}
            </Button>
          </div>
        </Row>
      </CardShell>

      {/* Theme */}
      <CardShell title={t('branding.title')} desc={t('branding.desc')} open={isOpen(sections.theme)} onToggle={() => toggleOpen(sections.theme)} right={<Palette className='w-4 h-4 text-slate-500' />}>
        <Row label={t('branding.palette')}>
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            <ColorTile name='primary' value={theme.palette.primary} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, primary: v } }))} />
            <ColorTile name='secondary' value={theme.palette.secondary} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, secondary: v } }))} />
            <ColorTile name='surface' value={theme.palette.surface} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, surface: v } }))} />
            <ColorTile name='onSurface' value={theme.palette.onSurface} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, onSurface: v } }))} />
            <ColorTile name='background' value={theme.palette.background} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, background: v } }))} />
            <ColorTile name='onBackground' value={theme.palette.onBackground} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, onBackground: v } }))} />
            <ColorTile name='onPrimary' value={theme.palette.onPrimary} onChange={v => setTheme(s => ({ ...s, palette: { ...s.palette, onPrimary: v } }))} />
          </div>
        </Row>

        <Row label={t('branding.previewLabel')} hint={t('branding.previewHint')}>
          <div className='space-y-3'>
            <div
              className='relative overflow-hidden rounded-lg border border-slate-200 shadow-sm'
              style={{
                background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
              }}>
              <div className='p-5 md:p-7 text-white'>
                <h2 className='text-xl md:text-2xl font-semibold'>{t('branding.headerDemo.title')}</h2>
                <p className='text-white/85 mt-1'>{t('branding.headerDemo.desc')}</p>
                <div
                  className='mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm'
                  style={{
                    background: theme.palette.surface,
                    color: theme.palette.onSurface,
                    border: '1px solid rgba(15,23,42,0.08)',
                  }}>
                  {t('branding.headerDemo.badge')}
                </div>
              </div>
            </div>

            <div
              className='rounded-lg p-4 border border-slate-200'
              style={{
                background: theme.palette.background,
                color: theme.palette.onBackground,
              }}>
              <div
                className='rounded-lg px-3 py-2 inline-flex items-center gap-2'
                style={{
                  background: theme.palette.primary,
                  color: theme.palette.onPrimary,
                }}>
                <CheckIcon className='w-4 h-4' />
                {t('branding.previewChip')}
              </div>
            </div>
          </div>
        </Row>
      </CardShell>

      {/* Reports & Automations */}
      <CardShell title={t('reportsAuto.title')} desc={t('reportsAuto.desc')} open={isOpen(sections.reports)} onToggle={() => toggleOpen(sections.reports)} right={<BellRing className='w-4 h-4 text-slate-500' />}>
        <Row label={t('reportsAuto.enabled')}>
          <Switcher checked={report.enabled} onChange={v => setReport(s => ({ ...s, enabled: v }))} />
        </Row>
        <Row label={t('reportsAuto.schedule.label')} hint={t('reportsAuto.schedule.hint')}>
          <div className='grid grid-cols-2 gap-2'>
            <Select value={report.day} onChange={val => setReport(s => ({ ...s, day: val }))} options={weekdayOptions} searchable={false} clearable={false} />
            <Input type='time' value={report.time} onChange={v => setReport(s => ({ ...s, time: v }))} />
          </div>
        </Row>
        <Row label={t('reportsAuto.contents.label')} hint={t('reportsAuto.contents.hint')}>
          <div className='grid sm:grid-cols-2 gap-2'>
            {Object.entries(report.items).map(([key, val]) => (
              <label key={key} className='flex items-center gap-2 rounded-md border border-slate-200 p-2'>
                <input type='checkbox' className='h-4 w-4' checked={!!val} onChange={e => toggleReportItem(key, e.target.checked)} />
                <span className='text-sm text-slate-800'>{labelsMap[key]}</span>
              </label>
            ))}
          </div>
        </Row>
        <Row label={t('reportsAuto.template.label')} hint={t('reportsAuto.template.hint')}>
          <Textarea ref={templateRef} value={report.customMessage} onChange={e => setReport(s => ({ ...s, customMessage: e.target.value }))} />
        </Row>
      </CardShell>

      {/* Reminders */}
      <CardShell title={t('reminders.title')} desc={t('reminders.desc')} open={isOpen(sections.reminders)} onToggle={() => toggleOpen(sections.reminders)}>
        <Row label={t('reminders.list')}>
          <div className='space-y-2'>
            {reminders.map(r => (
              <div key={r.id} className='grid sm:grid-cols-[1fr_160px_36px] gap-2 rounded-lg border border-slate-200 p-2'>
                <Input value={r.title} onChange={v => updateReminder(r.id, { title: v })} placeholder={t('reminders.titlePh')} />
                <Input type='time' value={r.time} onChange={v => updateReminder(r.id, { time: v })} />
                <Button color='ghost' onClick={() => removeReminder(r.id)}>
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </Row>
        <Row label={t('reminders.add')}>
          <AddReminderForm onAdd={addReminder} />
          <Help>{t('reminders.firebaseNote')}</Help>
        </Row>
      </CardShell>

      {/* Sticky Footer actions */}
      <div className='fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70'>
        <div className='mx-auto max-w-7xl px-3 sm:px-6 py-3 flex items-center justify-end gap-2'>
          <Button color='neutral' onClick={() => window.location.reload()}>
            {t('cancel')}
          </Button>
          <Button onClick={saveAll} disabled={saving || initializing}>
            {saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <Save className='w-4 h-4' />}
            {t('save')}
          </Button>
        </div>
      </div>

      {/* Loader Preview Modal */}
      <Modal open={loaderPreviewOpen} onClose={() => setLoaderPreviewOpen(false)}>
        <div className='relative h-[70vh]'>
          <div className='absolute inset-0'>
            <DhikrLoading />
          </div>
          <div className='absolute left-1/2 bottom-6 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 shadow'>
            <div className='text-slate-800 text-sm font-medium'>{loader.message || t('loader.messagePh')}</div>
            <div className='text-slate-500 text-xs text-center'>
              {t('loader.durationHint')}: {loader.durationSec}s
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- Helpers ---------- */
function AddReminderForm({ onAdd }) {
  const t = useTranslations('settings');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Input className='min-w-[240px]' value={title} onChange={setTitle} placeholder={t('reminders.titlePh')} />
      <Input type='time' value={time} onChange={setTime} />
      <Button
        color='neutral'
        onClick={() => {
          onAdd({ title, time });
          setTitle('');
        }}>
        + {t('add')}
      </Button>
    </div>
  );
}
