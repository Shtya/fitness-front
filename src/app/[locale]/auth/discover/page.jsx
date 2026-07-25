'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Building2, KeyRound, Mail, Loader2 } from 'lucide-react';
import {
  discoverTenantByEmail,
  discoverTenantByLicense,
  useTenantTheme,
} from '@/lib/tenant/TenantThemeProvider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LICENSE_RE = /^SF-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{4}$/i;

export default function DiscoverOrganizationPage() {
  const locale = useLocale();
  const router = useRouter();
  const { setTenantBranding, colors } = useTenantTheme();
  const [mode, setMode] = useState('email'); // email | license
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);

  const t = (ar, en) => (locale === 'ar' ? ar : en);

  const goToLogin = () => {
    const q = mode === 'email' && email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    router.push(`/${locale}/auth${q}`);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'email') {
      const value = email.trim();
      if (!value || !EMAIL_RE.test(value)) {
        toast.error(t('صيغة البريد الإلكتروني غير صحيحة.', 'Please enter a valid email address.'));
        return;
      }
    } else {
      const key = licenseKey.trim().toUpperCase();
      if (!key || !LICENSE_RE.test(key)) {
        toast.error(t('صيغة مفتاح الترخيص غير صحيحة. مثال: SF-XXXXXX-XXXXXX-XXXX', 'Invalid license key format. Example: SF-XXXXXX-XXXXXX-XXXX'));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'email') {
        const data = await discoverTenantByEmail(email.trim());
        if (!data?.found) {
          toast.error(t('هذا البريد غير مسجّل في أي مؤسسة. تأكد من البريد أو تواصل مع مدربك.', 'This email is not registered to any organization. Check the email or contact your coach.'));
          return;
        }
        setTenantBranding(data, data.discoveryToken || null);
        toast.success(t(`تم التعرف على ${data.tenant?.name || 'المؤسسة'}`, `Organization: ${data.tenant?.name}`));
        goToLogin();
        return;
      }

      const data = await discoverTenantByLicense(licenseKey.trim().toUpperCase());
      if (!data?.found) {
        toast.error(t('مفتاح الترخيص غير صالح أو منتهي.', 'This license key is invalid or expired.'));
        return;
      }
      setTenantBranding(data, data.discoveryToken || null);
      toast.success(t(`تم التعرف على ${data.tenant?.name || 'المؤسسة'}`, `Organization: ${data.tenant?.name}`));
      goToLogin();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (mode === 'license' && (status === 401 || status === 403)) {
        toast.error(msg || t('مفتاح الترخيص غير صالح أو منتهي.', 'This license key is invalid or expired.'));
      } else {
        toast.error(msg || t('تعذر التعرف على المؤسسة', 'Could not resolve organization'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: colors.background || '#f8fafc' }}>
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl" style={{ borderColor: colors.border, borderRadius: 16 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl grid place-items-center text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">
              {locale === 'ar' ? 'اربط مساحتك التدريبية' : 'Connect your training space'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {locale === 'ar'
                ? 'أدخل البريد المرتبط بعضويتك، أو مفتاح الترخيص الذي شاركه معك مدربك. المنصة تدعم أي نادي أو مدرب.'
                : 'Enter the email tied to your membership, or the license key your coach shared. The platform works with any gym or coach.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`flex-1 h-10 rounded-xl text-sm font-bold border ${mode === 'email' ? 'text-white' : 'bg-slate-50 text-slate-600'}`}
            style={mode === 'email' ? { background: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }}
          >
            {locale === 'ar' ? 'بالبريد' : 'Email'}
          </button>
          <button
            type="button"
            onClick={() => setMode('license')}
            className={`flex-1 h-10 rounded-xl text-sm font-bold border ${mode === 'license' ? 'text-white' : 'bg-slate-50 text-slate-600'}`}
            style={mode === 'license' ? { background: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }}
          >
            {locale === 'ar' ? 'برمز الترخيص' : 'License code'}
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'email' ? (
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Mail size={12} /> {locale === 'ar' ? 'البريد الإلكتروني' : 'Work email'}
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border text-sm"
                style={{ borderColor: colors.border }}
                placeholder="you@company.com"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <KeyRound size={12} /> {locale === 'ar' ? 'رمز المؤسسة' : 'Organization code'}
              </span>
              <input
                type="text"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border text-sm tracking-wider uppercase"
                style={{ borderColor: colors.border }}
                placeholder="SF-XXXXXX-XXXXXX-XXXX"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            {locale === 'ar' ? 'متابعة' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
