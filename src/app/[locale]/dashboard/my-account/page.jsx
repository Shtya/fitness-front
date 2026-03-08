'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Save, Eye, EyeOff,
  Shield, Crown, Calendar, Info, Sparkles,
  RefreshCw,
} from 'lucide-react';

import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import PhoneField from '@/components/atoms/PhoneField';
import { ToggleGroup } from '@/app/[locale]/dashboard/users/page';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

/* ─── Validation ─────────────────────────────────────────── */
const profileSchema = yup.object({
  name:   yup.string().trim().min(2, 'errors.nameMin').required('errors.nameRequired'),
  phone:  yup.string().matches(/^\+?[\d\s\-\(\)]{10,}$/, 'errors.phoneInvalid').optional().nullable(),
  gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('errors.currentPasswordRequired'),
  newPassword:     yup.string().min(8, 'errors.passwordMin').required('errors.newPasswordRequired'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'errors.passwordsMustMatch')
    .required('errors.confirmPasswordRequired'),
});

const cx = (...c) => c.filter(Boolean).join(' ');
const spring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.9 };

/* ─── Shared primitives ──────────────────────────────────── */

/** Elevated card with optional gradient top accent */
function Card({ children, className = '', accent = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cx('relative overflow-hidden rounded-2xl border bg-white', className)}
      style={{
        borderColor: 'var(--color-primary-100)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05), 0 10px 30px rgba(15,23,42,0.07)',
      }}
    >
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))' }}
        />
      )}
      {children}
    </motion.div>
  );
}

/** Section header with icon box, title, subtitle and optional right slot */
function SectionHead({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))' }}
        >
          {Icon && <Icon className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />}
        </div>
        <div>
          <p className="text-base font-black text-slate-900 sm:text-lg">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** Semantic pill / badge */
function Pill({ icon: Icon, label, value, tone = 'primary' }) {
  const tones = {
    primary: { border: 'var(--color-primary-200)', bg: 'var(--color-primary-50)', text: 'var(--color-primary-800)' },
    amber:   { border: '#fde68a',                  bg: '#fffbeb',                  text: '#92400e' },
  };
  const s = tones[tone] || tones.primary;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: s.border, background: s.bg, color: s.text }}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="opacity-70 font-semibold">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

/** Read-only display field */
function ReadOnlyField({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: 'var(--color-primary-100)',
        background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        <p className="text-sm truncate font-semibold text-slate-900 break-words">{value ?? '—'}</p>
      </div>
    </div>
  );
}

/** Inline hint / info box */
function HintBox({ text }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border p-3"
      style={{
        borderColor: 'var(--color-primary-100)',
        background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
      }}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary-500)' }} />
      <p className="text-xs font-medium text-slate-600">{text}</p>
    </div>
  );
}

/** Subscription date card */
function DateCard({ label, value }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-primary-100)',
        background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

/** Password toggle button */
function VisibilityToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-9 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none rtl:left-3 ltr:right-3"
      tabIndex={-1}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={show ? 'off' : 'on'}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.15 }}
          className="block"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* ─── Loading screen ─────────────────────────────────────── */
function LoadingScreen({ t }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200"
        style={{ borderTopColor: 'var(--color-primary-500)' }}
      />
      <p className="text-sm font-medium text-slate-400">{t('common.loading')}</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ProfilePage() {
  const t = useTranslations('myProfile');

  const [loading, setLoading]               = useState(true);
  const [user, setUser]                     = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrent, setShowCurrent]       = useState(false);
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  /* Profile form */
  const {
    control: pCtrl,
    handleSubmit: handleProfile,
    formState: { errors: pErr },
    reset: resetProfile,
    setError: setPErr,
    clearErrors: clearPErr,
  } = useForm({ resolver: yupResolver(profileSchema), mode: 'onBlur' });

  /* Password form */
  const {
    control: pwCtrl,
    handleSubmit: handlePw,
    formState: { errors: pwErr },
    reset: resetPw,
  } = useForm({ resolver: yupResolver(passwordSchema), mode: 'onBlur' });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: me }   = await api.get('/auth/me');
      const { data }       = await api.get(`/auth/profile/${me.id}`);
      setUser(data);
      resetProfile({ name: data.name || '', phone: data.phone || '', gender: data.gender || null });
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async data => {
    setSaving(true);
    try {
      await api.put(`/auth/profile/${user.id}`, { name: data.name, phone: data.phone || null, gender: data.gender || null });
      Notification(t('alerts.profileUpdated'), 'success');
      fetchProfile();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.updateFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async data => {
    setChangingPassword(true);
    try {
      await api.put(`/auth/profile/${user.id}/password`, { currentPassword: data.currentPassword, newPassword: data.newPassword });
      Notification(t('alerts.passwordChanged'), 'success');
      resetPw();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.passwordChangeFailed'), 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const headerStats = useMemo(() => ({
    role:       user?.role       ? t(`roles.${user.role}`) : '—',
    membership: user?.membership || '—',
  }), [user?.role, user?.membership, t]);

  if (loading) return <LoadingScreen t={t} />;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <GradientStatsHeader
        title={t('header.title')}
        desc={t('header.desc')}
        icon={Sparkles}
        btnName={t('buttons.refresh')}
        onClick={fetchProfile}
      >
        {/* Name / email mini card */}
        <div className="rounded-xl border border-white/25 bg-white/10 p-4 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t('header.name')}</p>
          <p className="mt-1 truncate text-base font-black text-white">{user?.name || '—'}</p>
          <p className="mt-0.5 truncate text-xs text-white/70">{user?.email || '—'}</p>
        </div>

        {/* Role */}
        <div className="rounded-xl border border-white/25 bg-white/10 p-4 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t('header.role')}</p>
          <p className="mt-1 text-base font-black text-white">{headerStats.role}</p>
        </div>

        {/* Membership */}
        <div className="hidden rounded-xl border border-white/25 bg-white/10 p-4 backdrop-blur md:block">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t('header.membership')}</p>
          <p className="mt-1 text-base font-black text-white">{headerStats.membership}</p>
        </div>
      </GradientStatsHeader>

      {/* ── Two-column: Profile + Security ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Profile card ── */}
        <Card accent>
          <div className="p-5 sm:p-6">
            <SectionHead
              icon={User}
              title={t('sections.personalInfo.title')}
              subtitle={t('sections.personalInfo.subtitle')}
              right={
                <div className="hidden items-center gap-2 sm:flex">
                  <Pill icon={Shield} label={t('header.role')}       value={headerStats.role} />
                  <Pill icon={Crown}  label={t('header.membership')} value={headerStats.membership} tone="amber" />
                </div>
              }
            />

            {/* Read-only fields */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReadOnlyField label={t('fields.email')}      value={user?.email}              icon={Mail} />
              <ReadOnlyField label={t('header.membership')} value={user?.membership || '—'}  icon={Crown} />
            </div>

            {/* Editable form */}
            <form onSubmit={handleProfile(onProfileSubmit)} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller name="name" control={pCtrl} render={({ field }) => (
                  <Input
                    label={t('fields.name')}
                    placeholder={t('placeholders.name')}
                    error={pErr.name?.message ? t(pErr.name.message) : ''}
                    icon={<User className="h-4 w-4" />}
                    {...field}
                  />
                )} />

                <Controller name="phone" control={pCtrl} render={({ field }) => (
                  <PhoneField
                    label={t('fields.phone')}
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={pErr.phone?.message ? t(pErr.phone.message) : ''}
                    name={field.name}
                    setError={setPErr}
                    clearErrors={clearPErr}
                    t={t}
                  />
                )} />

                <Controller name="gender" control={pCtrl} render={({ field }) => (
                  <ToggleGroup
                    label={t('fields.gender')}
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { id: 'male',   label: t('gender.male') },
                      { id: 'female', label: t('gender.female') },
                    ]}
                    error={pErr.gender?.message ? t(pErr.gender.message) : ''}
                  />
                )} />
              </div>

              {/* Divider */}
              <div
                className="h-px"
                style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary-100), transparent)' }}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  name={t('buttons.saveChanges')}
                  icon={<Save className="h-4 w-4" />}
                  loading={saving}
                  disabled={saving}
                />
              </div>
            </form>
          </div>
        </Card>

        {/* ── Security card ── */}
        <Card accent>
          <div className="p-5 sm:p-6">
            <SectionHead
              icon={Lock}
              title={t('sections.security.title')}
              subtitle={t('sections.security.subtitle')}
            />

            <form onSubmit={handlePw(onPasswordSubmit)} className="mt-5 space-y-4">
              {/* Current password */}
              <div className="relative">
                <Controller name="currentPassword" control={pwCtrl} render={({ field }) => (
                  <Input
                    label={t('fields.currentPassword')}
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={pwErr.currentPassword?.message ? t(pwErr.currentPassword.message) : ''}
                    icon={<Lock className="h-4 w-4" />}
                    {...field}
                  />
                )} />
                <VisibilityToggle show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
              </div>

              {/* New + Confirm */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="relative">
                  <Controller name="newPassword" control={pwCtrl} render={({ field }) => (
                    <Input
                      label={t('fields.newPassword')}
                      type={showNew ? 'text' : 'password'}
                      placeholder="••••••••"
                      error={pwErr.newPassword?.message ? t(pwErr.newPassword.message) : ''}
                      icon={<Lock className="h-4 w-4" />}
                      {...field}
                    />
                  )} />
                  <VisibilityToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
                </div>

                <div className="relative">
                  <Controller name="confirmPassword" control={pwCtrl} render={({ field }) => (
                    <Input
                      label={t('fields.confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      error={pwErr.confirmPassword?.message ? t(pwErr.confirmPassword.message) : ''}
                      icon={<Lock className="h-4 w-4" />}
                      {...field}
                    />
                  )} />
                  <VisibilityToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                </div>
              </div>

              <HintBox text={t('sections.security.hint')} />

              {/* Divider */}
              <div
                className="h-px"
                style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary-100), transparent)' }}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  name={t('buttons.changePassword')}
                  icon={<Lock className="h-4 w-4" />}
                  loading={changingPassword}
                  disabled={changingPassword}
                />
              </div>
            </form>
          </div>
        </Card>
      </div>

      {/* ── Subscription card (conditional) ── */}
      {user?.subscriptionStart && user?.subscriptionEnd && (
        <Card accent>
          <div className="p-5 sm:p-6">
            <SectionHead
              icon={Calendar}
              title={t('sections.subscription.title')}
              subtitle={t('sections.subscription.subtitle')}
            />

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <DateCard
                label={t('subscription.start')}
                value={new Date(user.subscriptionStart).toLocaleDateString()}
              />
              <DateCard
                label={t('subscription.end')}
                value={new Date(user.subscriptionEnd).toLocaleDateString()}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}