'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import {
  Loader2,
  RefreshCw,
  Save,
  RotateCcw,
  UploadCloud,
  Image as ImageIcon,
  Palette,
  Layers,
  Type,
  AlertTriangle,
  Sparkles,
  Building2,
  PenLine,
  Mail,
  Globe,
  Smartphone,
} from 'lucide-react';
import api from '@/utils/axios';
import { useTenantTheme } from '@/lib/tenant/TenantThemeProvider';
import { useUser } from '@/hooks/useUser';
import PhoneMockup from './PhoneMockup';

const BRAND_FIELDS = [
  ['appName', 'App name', 'اسم التطبيق', Sparkles],
  ['shortName', 'Short name', 'الاسم المختصر', Type],
  ['companyName', 'Company', 'اسم الشركة', Building2],
  ['tagline', 'Tagline', 'الشعار النصي', PenLine],
  ['supportEmail', 'Support email', 'بريد الدعم', Mail],
  ['websiteUrl', 'Website', 'الموقع', Globe],
];

const COLOR_GROUPS = [
  {
    title: 'Brand',
    titleAr: 'العلامة',
    icon: Palette,
    tint: 'indigo',
    fields: [
      ['primaryColor', 'Primary'],
      ['primaryForegroundColor', 'On primary'],
      ['secondaryColor', 'Secondary'],
      ['secondaryForegroundColor', 'On secondary'],
      ['accentColor', 'Accent'],
      ['accentForegroundColor', 'On accent'],
    ],
  },
  {
    title: 'Surface',
    titleAr: 'الأسطح',
    icon: Layers,
    tint: 'sky',
    fields: [
      ['backgroundColor', 'Background'],
      ['surfaceColor', 'Surface'],
      ['cardColor', 'Card'],
      ['borderColor', 'Border'],
      ['dividerColor', 'Divider'],
    ],
  },
  {
    title: 'Text',
    titleAr: 'النص',
    icon: Type,
    tint: 'violet',
    fields: [
      ['textPrimaryColor', 'Text primary'],
      ['textSecondaryColor', 'Text secondary'],
      ['mutedTextColor', 'Muted text'],
    ],
  },
  {
    title: 'Status',
    titleAr: 'الحالة',
    icon: AlertTriangle,
    tint: 'amber',
    fields: [
      ['successColor', 'Success'],
      ['warningColor', 'Warning'],
      ['dangerColor', 'Danger'],
      ['infoColor', 'Info'],
    ],
  },
];

const RADIUS_FIELDS = [
  ['borderRadius', 'Border', 'الحدود', 0, 32],
  ['buttonRadius', 'Button', 'الزر', 0, 32],
  ['cardRadius', 'Card', 'البطاقة', 0, 32],
];

const TINT_CLASSES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
};

function brandingToForm(payload) {
  const b = payload?.branding || {};
  const c = b.colors || {};
  return {
    appName: b.appName || '',
    shortName: b.shortName || '',
    tagline: b.tagline || '',
    companyName: b.companyName || '',
    supportEmail: b.supportEmail || '',
    supportPhone: b.supportPhone || '',
    websiteUrl: b.websiteUrl || '',
    primaryColor: c.primary || '#2563eb',
    primaryForegroundColor: c.primaryForeground || '#ffffff',
    secondaryColor: c.secondary || '#0284c7',
    secondaryForegroundColor: c.secondaryForeground || '#ffffff',
    accentColor: c.accent || '#0ea5e9',
    accentForegroundColor: c.accentForeground || '#ffffff',
    backgroundColor: c.background || '#f8fafc',
    surfaceColor: c.surface || '#ffffff',
    cardColor: c.card || '#ffffff',
    textPrimaryColor: c.textPrimary || '#0f172a',
    textSecondaryColor: c.textSecondary || '#475569',
    mutedTextColor: c.mutedText || '#94a3b8',
    borderColor: c.border || '#e2e8f0',
    dividerColor: c.divider || '#e2e8f0',
    successColor: c.success || '#10b981',
    warningColor: c.warning || '#f59e0b',
    dangerColor: c.danger || '#ef4444',
    infoColor: c.info || '#3b82f6',
    borderRadius: b.radius?.border ?? 10,
    buttonRadius: b.radius?.button ?? 12,
    cardRadius: b.radius?.card ?? 16,
    themeMode: b.themeMode || 'system',
  };
}

function SectionHeader({ icon: Icon, tint, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${TINT_CLASSES[tint] || 'bg-slate-100 text-slate-600'}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm leading-tight">{title}</div>
        {subtitle && <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

function ColorField({ value, label, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 transition-colors hover:border-slate-300 hover:bg-white">
      <div className="relative shrink-0 w-9 h-9">
        <div
          className="w-9 h-9 rounded-full ring-4 ring-white shadow-sm border border-black/5"
          style={{ background: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 h-9 w-9 cursor-pointer opacity-0"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-700 truncate">{label}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[11px] font-mono uppercase text-slate-400 outline-none"
        />
      </div>
    </div>
  );
}

function RadiusSlider({ label, value, min, max, color, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-[11px] font-mono text-slate-400">{value}px</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: color }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white pointer-events-none transition-[left]"
          style={{ left: `${pct}%`, boxShadow: `0 0 0 2px ${color}, 0 2px 4px rgba(15,23,42,0.18)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute -top-1.5 inset-x-0 h-4 w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

export default function BrandingSettingsPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  // useUser() returns the user object directly (undefined while hydrating, null if logged out)
  const user = useUser();
  const { setTenantBranding, refreshBranding } = useTenantTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const snapshotRef = useRef(null);

  const hydrating = user === undefined;
  const allowed = useMemo(() => {
    if (hydrating) return false;
    const role = String(user?.role || '').toLowerCase();
    return role === 'admin' || role === 'super_admin';
  }, [user, hydrating]);

  useEffect(() => {
    if (hydrating) return;
    if (!allowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/tenant/branding');
        if (cancelled) return;
        const nextForm = brandingToForm(data);
        setForm(nextForm);
        snapshotRef.current = JSON.stringify(nextForm);
        setLogoUrl(data?.branding?.logoLightUrl || null);
        setTenantBranding(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.response?.data?.message || (isAr ? 'فشل التحميل' : 'Failed to load'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, hydrating, isAr, setTenantBranding]);

  const isDirty = form ? JSON.stringify(form) !== snapshotRef.current : false;

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/tenant/branding', form);
      setTenantBranding(data);
      snapshotRef.current = JSON.stringify(form);
      toast.success(isAr ? 'تم حفظ الهوية' : 'Branding saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || (isAr ? 'فشل الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (!confirm(isAr ? 'إعادة الهوية للافتراضي؟' : 'Reset branding to defaults?')) return;
    setSaving(true);
    try {
      const { data } = await api.post('/tenant/branding/reset');
      const nextForm = brandingToForm(data);
      setForm(nextForm);
      snapshotRef.current = JSON.stringify(nextForm);
      setLogoUrl(data?.branding?.logoLightUrl || null);
      setTenantBranding(data);
      toast.success(isAr ? 'تمت إعادة التعيين' : 'Reset done');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const onUploadLogo = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('assetType', 'logoLight');
    try {
      const { data } = await api.post('/tenant/branding/assets', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(data?.branding?.logoLightUrl || null);
      setTenantBranding(data);
      toast.success(isAr ? 'تم رفع الشعار' : 'Logo uploaded');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    }
  };

  if (hydrating || loading) {
    return (
      <div className="p-16 grid place-items-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-8 text-center text-slate-500">
        {isAr ? 'هذه الصفحة متاحة للمسؤول فقط' : 'Admins only'}
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-16 grid place-items-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const gradient = `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl grid place-items-center text-white shadow-sm shrink-0"
            style={{ background: gradient }}
          >
            <Palette size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {isAr ? 'الهوية والمظهر' : 'Theme & Branding'}
            </h1>
            <p className="text-sm text-slate-500">
              {isAr ? 'تخصيص اسم التطبيق والألوان والشعار دون إصدار جديد' : 'Customize app name, colors, and logo without a new release'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {isAr ? 'تغييرات غير محفوظة' : 'Unsaved changes'}
            </span>
          )}
          <button
            onClick={() => refreshBranding()}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2 transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={14} /> {isAr ? 'تحديث' : 'Refresh'}
          </button>
          <button
            onClick={onReset}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2 transition-colors hover:bg-slate-50"
          >
            <RotateCcw size={14} /> {isAr ? 'افتراضي' : 'Reset'}
          </button>
          <button
            onClick={onSave}
            disabled={saving || !isDirty}
            className="h-10 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: gradient }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isAr ? 'حفظ' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 xl:grid-cols-[1fr_1fr_340px] gap-6 items-start">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 space-y-5">
          <SectionHeader
            icon={Sparkles}
            tint="indigo"
            title={isAr ? 'بيانات العلامة' : 'Brand details'}
            subtitle={isAr ? 'الاسم والشعار النصي وبيانات التواصل' : 'Name, tagline, and contact info'}
          />

          <div className="space-y-4">
            {BRAND_FIELDS.map(([key, label, labelAr, Icon]) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-slate-500">{isAr ? labelAr : label}</span>
                <div className="relative mt-1.5">
                  <Icon size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm outline-none transition-colors focus:border-slate-400"
                    value={form[key] || ''}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </div>
              </label>
            ))}

            <div>
              <span className="text-xs font-semibold text-slate-500">{isAr ? 'الشعار' : 'Logo'}</span>
              <label className="mt-1.5 flex items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-4 cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50/60">
                <div className="w-14 h-14 shrink-0 rounded-2xl border border-slate-200 bg-white grid place-items-center overflow-hidden">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={18} className="text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UploadCloud size={13} /> {isAr ? 'رفع شعار جديد' : 'Upload new logo'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {isAr ? 'PNG أو JPG أو WEBP، حتى 2 ميجابايت' : 'PNG, JPG or WEBP, up to 2MB'}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => onUploadLogo(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 space-y-6">
          <SectionHeader
            icon={Palette}
            tint="indigo"
            title={isAr ? 'الألوان' : 'Colors'}
            subtitle={isAr ? 'انقر على أي دائرة لاختيار لون' : 'Click any swatch to pick a color'}
          />

          {COLOR_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-2.5">
                <group.icon size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {isAr ? group.titleAr : group.title}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {group.fields.map(([key, label]) => (
                  <ColorField key={key} label={label} value={form[key]} onChange={(v) => setField(key, v)} />
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={13} className="text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {isAr ? 'الاستدارة' : 'Radius'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {RADIUS_FIELDS.map(([key, label, labelAr, min, max]) => (
                <RadiusSlider
                  key={key}
                  label={isAr ? labelAr : label}
                  value={form[key]}
                  min={min}
                  max={max}
                  color={form.primaryColor}
                  onChange={(v) => setField(key, v)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 space-y-5 xl:sticky xl:top-6">
          <SectionHeader
            icon={Smartphone}
            tint="violet"
            title={isAr ? 'معاينة الهاتف المباشرة' : 'Live phone preview'}
            subtitle={isAr ? 'تتحدث فوريًا مع كل تغيير قبل الحفظ' : 'Updates instantly as you edit, before saving'}
          />
          <PhoneMockup form={form} logoUrl={logoUrl} isAr={isAr} />
        </section>
      </div>
    </div>
  );
}
