'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Save, Eye, EyeOff,
  Shield, Crown, Calendar, Info, KeyRound,
  RefreshCw, Copy, Check, RotateCcw,
} from 'lucide-react';

import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import PhoneField from '@/components/atoms/PhoneField';
import { ToggleGroup } from '@/app/[locale]/dashboard/users/page';
import { IntakeHero } from '@/components/pages/dashboard/intake/IntakeChrome';
import GmStatCard from '@/components/molecules/GmStatCard';
import '@/components/pages/dashboard/users/roster/roster.css';
import './account-scope.css';

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
      className={cx('relative overflow-hidden rounded-[18px] border border-(--gm-line) bg-(--gm-paper)', className)}
      style={{
        boxShadow: '0 1px 2px color-mix(in srgb, var(--gm-ink) 6%, transparent)',
      }}
    >
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, var(--color-primary-500), var(--color-primary-600))' }}
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
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-(--gm-line)"
          style={{ background: 'color-mix(in srgb, var(--color-primary-500) 12%, var(--gm-paper))' }}
        >
          {Icon && <Icon className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />}
        </div>
        <div>
          <p className="text-base font-black text-(--gm-ink) sm:text-lg">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-(--gm-muted)">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** Identity avatar — gradient circle with initials */
function Avatar({ name, size = 56 }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: 'linear-gradient(180deg, var(--color-primary-500), var(--color-primary-600))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 8px 16px -10px color-mix(in srgb, var(--color-primary-600) 70%, transparent)',
      }}
    >
      {initials}
    </div>
  );
}

/** Avatar + name/email + role/membership pills, used atop the profile form */
function IdentityStrip({ name, email, role, membership }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-(--gm-ink)">{name || '—'}</p>
        <p className="truncate text-xs font-medium text-(--gm-muted)">{email || '—'}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {role && <Pill icon={Shield} label="" value={role} />}
        {membership && <Pill icon={Crown} label="" value={membership} tone="amber" />}
      </div>
    </div>
  );
}

/** Semantic pill / badge */
function Pill({ icon: Icon, label, value, tone = 'primary' }) {
  const tones = {
    primary: { border: 'var(--color-primary-200)', bg: 'var(--color-primary-50)', text: 'var(--color-primary-800)' },
    amber:   { border: 'color-mix(in srgb, var(--gm-warn) 40%, transparent)', bg: 'color-mix(in srgb, var(--gm-warn) 14%, var(--gm-paper))', text: 'var(--gm-warn)' },
  };
  const s = tones[tone] || tones.primary;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: s.border, background: s.bg, color: s.text }}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label && <span className="opacity-70 font-semibold">{label}:</span>}
      <span>{value}</span>
    </span>
  );
}

/** Inline hint / info box */
function HintBox({ text }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border p-3"
      style={{
        borderColor: 'var(--gm-line)',
        background: 'color-mix(in srgb, var(--color-primary-500) 6%, var(--gm-paper))',
      }}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary-500)' }} />
      <p className="text-xs font-medium text-(--gm-ink-soft)">{text}</p>
    </div>
  );
}

/** Subscription date card */
function DateCard({ label, value }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: 'var(--gm-line)',
        background: 'color-mix(in srgb, var(--gm-ink) 4%, var(--gm-paper))',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-(--gm-muted) mb-2">{label}</p>
      <p className="text-lg font-black text-(--gm-ink)">{value}</p>
    </div>
  );
}

/** Password toggle button */
function VisibilityToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-3.5 text-(--gm-muted) transition-colors hover:text-(--gm-ink) focus:outline-none rtl:left-3 ltr:right-3"
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
        className="h-8 w-8 animate-spin rounded-full border-2 border-(--gm-line)"
        style={{ borderTopColor: 'var(--color-primary-500)' }}
      />
      <p className="text-sm font-medium text-(--gm-muted)">{t('common.loading')}</p>
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

  const [license, setLicense]               = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseRotating, setLicenseRotating] = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [showLicense, setShowLicense]       = useState(true);

  useEffect(() => {
    document.documentElement.dataset.gmUsers = '1';
    return () => { delete document.documentElement.dataset.gmUsers; };
  }, []);

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

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
    || String(user?.role || '').toLowerCase() === 'super_admin';

  const fetchLicense = async () => {
    setLicenseLoading(true);
    try {
      const { data } = await api.get('/tenant/license');
      setLicense(data);
    } catch (e) {
      // Non-admins / tenants without org — ignore quietly
      setLicense(null);
    } finally {
      setLicenseLoading(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: me }   = await api.get('/auth/me');
      const { data }       = await api.get(`/auth/profile/${me.id}`);
      setUser(data);
      resetProfile({ name: data.name || '', phone: data.phone || '', gender: data.gender || null });
      const role = String(data?.role || '').toLowerCase();
      if (role === 'admin' || role === 'super_admin') {
        fetchLicense();
      } else {
        setLicense(null);
      }
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLicense = async () => {
    if (!license?.licenseKey) return;
    try {
      await navigator.clipboard.writeText(license.licenseKey);
      setCopied(true);
      Notification(t('license.copied'), 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      Notification(t('license.copyFailed'), 'error');
    }
  };

  const rotateLicense = async () => {
    if (!confirm(t('license.rotateConfirm'))) return;
    setLicenseRotating(true);
    try {
      const { data } = await api.post('/tenant/license/rotate');
      setLicense(data);
      setShowLicense(true);
      Notification(t('license.rotated'), 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || t('license.rotateFailed'), 'error');
    } finally {
      setLicenseRotating(false);
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
    email:      user?.email || '—',
  }), [user?.role, user?.membership, user?.email, t]);

  if (loading) return <LoadingScreen t={t} />;

  const accountStats = [
    { key: 'name', title: t('header.name'), value: user?.name || '—', icon: User, tone: 'gm-chip', stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)', seed: 0.3, max: 1 },
    { key: 'role', title: t('header.role'), value: headerStats.role, icon: Shield, tone: 'gm-chip-secondary', stroke: 'var(--color-primary-400)', fill: 'var(--color-primary-300)', seed: 0.7, max: 1 },
    { key: 'plan', title: t('header.membership'), value: headerStats.membership, icon: Crown, tone: 'gm-chip-warn', stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)', seed: 1.1, max: 1 },
    { key: 'mail', title: t('fields.email'), value: headerStats.email, icon: Mail, tone: 'gm-chip-ok', stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 1.5, max: 1 },
  ];

  return (
    <div className="acct-scope gm-surface rs-scope app-stack space-y-6 pb-10">

      <div className="rs-summary">
        <IntakeHero
          icon={User}
          title={t('header.title')}
          subtitle={t('header.desc')}
          extra={(
            <button type="button" onClick={fetchProfile} className="rs-btn">
              <RefreshCw className="size-4" />
              <span>{t('buttons.refresh')}</span>
            </button>
          )}
        />
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {accountStats.map((card, index) => <GmStatCard key={card.key} card={card} index={index} />)}
        </section>
      </div>

      {/* ── Admin org license (share with new users) ── */}
      {isAdmin && (
        <Card accent>
          <div className="p-5 sm:p-6">
            <SectionHead
              icon={KeyRound}
              title={t('license.title')}
              subtitle={t('license.subtitle')}
              right={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchLicense}
                    disabled={licenseLoading}
                    className="rs-btn"
                  >
                    <RefreshCw className={cx('h-3.5 w-3.5', licenseLoading && 'animate-spin')} />
                    {t('buttons.refresh')}
                  </button>
                </div>
              }
            />

            <div className="mt-4">
              <HintBox text={t('license.hint')} />
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-(--gm-muted)">
                {t('license.keyLabel')}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div
                  className="flex min-h-11 flex-1 items-center rounded-[12px] border border-(--gm-line) bg-(--gm-paper) px-3 font-mono text-sm font-semibold tracking-wide text-(--gm-ink)"
                >
                  {licenseLoading
                    ? '…'
                    : showLicense
                      ? (license?.licenseKey || '—')
                      : '••••••••••••••••••••'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLicense(v => !v)}
                    className="rs-btn"
                  >
                    {showLicense ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showLicense ? t('license.hide') : t('license.show')}
                  </button>
                  <button
                    type="button"
                    onClick={copyLicense}
                    disabled={!license?.licenseKey}
                    className="rs-cta"
                    style={{ width: 'auto' }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('license.copiedShort') : t('license.copy')}
                  </button>
                  <button
                    type="button"
                    onClick={rotateLicense}
                    disabled={licenseRotating}
                    className="rs-btn"
                    style={{ color: 'var(--gm-warn)', borderColor: 'color-mix(in srgb, var(--gm-warn) 40%, var(--gm-line))' }}
                  >
                    <RotateCcw className={cx('h-3.5 w-3.5', licenseRotating && 'animate-spin')} />
                    {t('license.rotate')}
                  </button>
                </div>
              </div>
              {license?.tenantName && (
                <p className="text-xs font-medium text-(--gm-muted)">
                  {t('license.org')}: <span className="font-bold text-(--gm-ink)">{license.tenantName}</span>
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Two-column: Profile + Security ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Profile card ── */}
        <Card accent>
          <div className="p-5 sm:p-6">
            <SectionHead
              icon={User}
              title={t('sections.personalInfo.title')}
              subtitle={t('sections.personalInfo.subtitle')}
            />

            <div className="mt-5">
              <IdentityStrip
                name={user?.name}
                email={user?.email}
                role={user?.role ? headerStats.role : ''}
                membership={user?.membership || ''}
              />
            </div>

            {/* Divider */}
            <div
              className="mt-5 h-px"
              style={{ background: 'var(--gm-line)' }}
            />

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
                style={{ background: 'var(--gm-line)' }}
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
                    clearable={false}
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
                      clearable={false}
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
                      clearable={false}
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
                style={{ background: 'var(--gm-line)' }}
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