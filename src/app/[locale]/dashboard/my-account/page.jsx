'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Save,
  Eye,
  EyeOff,
  Shield,
  Crown,
  Calendar,
  Info,
  Sparkles,
} from 'lucide-react';

import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import PhoneField from '@/components/atoms/PhoneField';
import { ToggleGroup } from '@/app/[locale]/dashboard/users/page';

import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { StatCard } from '@/components/dashboard/ui/UI';

const spring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.9 };

/* ----------------- Validation schemas ------------------ */
const profileSchema = yup.object({
  name: yup.string().trim().min(2, 'errors.nameMin').required('errors.nameRequired'),
  phone: yup
    .string()
    .matches(/^\+?[\d\s\-\(\)]{10,}$/, 'errors.phoneInvalid')
    .optional()
    .nullable(),
  gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('errors.currentPasswordRequired'),
  newPassword: yup.string().min(8, 'errors.passwordMin').required('errors.newPasswordRequired'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'errors.passwordsMustMatch')
    .required('errors.confirmPasswordRequired'),
});

const cx = (...c) => c.filter(Boolean).join(' ');

/* ----------------- Theme UI helpers ------------------ */

function ThemeFrame({ children, className = '' }) {
  return (
    <div className={cx('rounded-3xl p-[1px]', className)}>
      <div
        className="rounded-3xl border bg-white/85 backdrop-blur-xl"
        style={{
          borderColor: 'var(--color-primary-200)',
          boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04), 0 18px 44px rgba(15, 23, 42, 0.10)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SoftCard({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cx('rounded-3xl border bg-white/90 backdrop-blur-xl', className)}
      style={{
        borderColor: 'var(--color-primary-200)',
        boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03), 0 12px 28px rgba(15, 23, 42, 0.08)',
      }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className="grid place-items-center rounded-2xl"
          style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
          }}
        >
          {Icon ? <Icon className="w-5 h-5" style={{ color: 'var(--color-primary-800)' }} /> : null}
        </div>

        <div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900">{title}</div>
          {subtitle ? <div className="text-sm text-slate-600 mt-0.5">{subtitle}</div> : null}
        </div>
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Pill({ icon: Icon, label, value, tone = 'primary' }) {
  const tones = {
    primary: {
      border: 'var(--color-primary-200)',
      bg: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
      text: 'var(--color-primary-800)',
    },
    amber: {
      border: '#fde68a',
      bg: 'linear-gradient(135deg, #fffbeb, #fff7ed)',
      text: '#92400e',
    },
  };
  const s = tones[tone] || tones.primary;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold"
      style={{
        borderColor: s.border,
        background: s.bg,
        color: s.text,
        boxShadow: '0 10px 22px rgba(15,23,42,0.08)',
      }}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      <span className="opacity-80 font-semibold">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

function ReadOnlyField({ label, value, icon }) {
  const Icon = icon;
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor: 'var(--color-primary-200)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
      }}
    >
      <div className="text-xs text-slate-500 font-semibold">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        {Icon ? <Icon className="w-4 h-4 text-slate-400" /> : null}
        <div className="text-sm font-extrabold text-slate-900 break-words">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function HintBox({ text }) {
  return (
    <div
      className="flex items-start gap-2 rounded-2xl border p-3"
      style={{
        borderColor: 'var(--color-primary-200)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
      }}
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-primary-700)' }} />
      <p className="text-xs text-slate-700">{text}</p>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function ProfilePage() {
  const t = useTranslations('myProfile');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form
  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
    setError: setProfileError,
    clearErrors: clearProfileErrors,
  } = useForm({
    resolver: yupResolver(profileSchema),
    mode: 'onBlur',
  });

  // Password form
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm({
    resolver: yupResolver(passwordSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: meData } = await api.get('/auth/me');
      const userId = meData.id;

      const { data } = await api.get(`/auth/profile/${userId}`);
      setUser(data);

      resetProfile({
        name: data.name || '',
        phone: data.phone || '',
        gender: data.gender || null,
      });
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async data => {
    setSaving(true);
    try {
      await api.put(`/auth/profile/${user.id}`, {
        name: data.name,
        phone: data.phone || null,
        gender: data.gender || null,
      });

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
      await api.put(`/auth/profile/${user.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      Notification(t('alerts.passwordChanged'), 'success');
      resetPassword();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.passwordChangeFailed'), 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const headerStats = useMemo(() => {
    return {
      role: user?.role ? t(`roles.${user.role}`) : '—',
      membership: user?.membership || '—',
    };
  }, [user?.role, user?.membership, t]);

  if (loading) {
    return (
      <div
        className="min-h-[420px] grid place-content-center"
        style={{
          background:
            'radial-gradient(1200px 600px at 15% 10%, var(--color-primary-100), transparent 55%),' +
            'radial-gradient(900px 500px at 85% 18%, var(--color-secondary-100), transparent 55%),' +
            'linear-gradient(180deg, #ffffff, #f8fafc)',
        }}
      >
        <div className="inline-flex items-center gap-3 text-slate-600">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300"
            style={{ borderTopColor: 'var(--color-primary-600)' }}
          />
          <span className="font-medium">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Theme header */}
      <GradientStatsHeader
        title={t('header.title')}
        desc={t('header.desc')}
        icon={Sparkles}
        hiddenStats={false}
        btnName={t('buttons.refresh')}
        onClick={fetchProfile}
      >

           <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur p-4">
            <div className="text-xs text-white/80">{t('header.name')}</div>
            <div className="text-lg font-extrabold text-white truncate">{user?.name || '—'}</div>
            <div className="mt-1 text-xs text-white/80 truncate">{user?.email || '—'}</div>
          </div>

          <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur p-4">
            <div className="text-xs text-white/80">{t('header.role')}</div>
            <div className="text-lg font-extrabold text-white">{headerStats.role}</div>
          </div>

          <div className="hidden md:block rounded-2xl border border-white/25 bg-white/10 backdrop-blur p-4">
            <div className="text-xs text-white/80">{t('header.membership')}</div>
            <div className="text-lg font-extrabold text-white">{headerStats.membership}</div>
          </div>
       </GradientStatsHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <ThemeFrame>
          <SoftCard className="p-5 sm:p-6">
            <SectionHead
              icon={User}
              title={t('sections.personalInfo.title')}
              subtitle={t('sections.personalInfo.subtitle')}
              right={
                <div className="hidden sm:flex items-center gap-2">
                  <Pill icon={Shield} label={t('header.role')} value={headerStats.role} />
                  <Pill icon={Crown} label={t('header.membership')} value={headerStats.membership} tone="amber" />
                </div>
              }
            />

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReadOnlyField label={t('fields.email')} value={user?.email} icon={Mail} />
              <ReadOnlyField label={t('header.membership')} value={user?.membership || '—'} icon={Crown} />
            </div>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="name"
                  control={profileControl}
                  render={({ field }) => (
                    <Input
                      label={t('fields.name')}
                      placeholder={t('placeholders.name')}
                      error={profileErrors.name?.message ? t(profileErrors.name.message) : ''}
                      icon={<User className="w-4 h-4" />}
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="phone"
                  control={profileControl}
                  render={({ field }) => (
                    <PhoneField
                      label={t('fields.phone')}
                      value={field.value || ''}
                      onChange={field.onChange}
                      error={profileErrors.phone?.message ? t(profileErrors.phone.message) : ''}
                      name={field.name}
                      setError={setProfileError}
                      clearErrors={clearProfileErrors}
                      t={t}
                    />
                  )}
                />

                <Controller
                  name="gender"
                  control={profileControl}
                  render={({ field }) => (
                    <ToggleGroup
                      label={t('fields.gender')}
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { id: 'male', label: t('gender.male') },
                        { id: 'female', label: t('gender.female') },
                      ]}
                      error={profileErrors.gender?.message ? t(profileErrors.gender.message) : ''}
                    />
                  )}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  name={t('buttons.saveChanges')}
                  icon={<Save className="w-4 h-4" />}
                  loading={saving}
                  disabled={saving}
                />
              </div>
            </form>
          </SoftCard>
        </ThemeFrame>

        {/* Security */}
        <ThemeFrame>
          <SoftCard className="p-5 sm:p-6">
            <SectionHead icon={Lock} title={t('sections.security.title')} subtitle={t('sections.security.subtitle')} />

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="mt-5 space-y-4">
              <Controller
                name="currentPassword"
                control={passwordControl}
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      label={t('fields.currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      error={passwordErrors.currentPassword?.message ? t(passwordErrors.currentPassword.message) : ''}
                      icon={<Lock className="w-4 h-4" />}
                      {...field}
                    />

                    {/* ✅ RTL/LTR fixed */}
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(v => !v)}
                      className="absolute top-9 text-slate-400 hover:text-slate-700 rtl:left-3 ltr:right-3"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="newPassword"
                  control={passwordControl}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        label={t('fields.newPassword')}
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        error={passwordErrors.newPassword?.message ? t(passwordErrors.newPassword.message) : ''}
                        icon={<Lock className="w-4 h-4" />}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(v => !v)}
                        className="absolute top-9 text-slate-400 hover:text-slate-700 rtl:left-3 ltr:right-3"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={passwordControl}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        label={t('fields.confirmPassword')}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        error={passwordErrors.confirmPassword?.message ? t(passwordErrors.confirmPassword.message) : ''}
                        icon={<Lock className="w-4 h-4" />}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        className="absolute top-9 text-slate-400 hover:text-slate-700 rtl:left-3 ltr:right-3"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                />
              </div>

              <HintBox text={t('sections.security.hint')} />

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  name={t('buttons.changePassword')}
                  icon={<Lock className="w-4 h-4" />}
                  loading={changingPassword}
                  disabled={changingPassword}
                />
              </div>
            </form>
          </SoftCard>
        </ThemeFrame>
      </div>

      {/* Subscription */}
      {user?.subscriptionStart && user?.subscriptionEnd ? (
        <ThemeFrame>
          <SoftCard className="p-5 sm:p-6">
            <SectionHead icon={Calendar} title={t('sections.subscription.title')} subtitle={t('sections.subscription.subtitle')} />

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: 'var(--color-primary-200)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
                }}
              >
                <div className="text-xs text-slate-600 mb-1">{t('subscription.start')}</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {new Date(user.subscriptionStart).toLocaleDateString()}
                </div>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: 'var(--color-primary-200)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
                }}
              >
                <div className="text-xs text-slate-600 mb-1">{t('subscription.end')}</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {new Date(user.subscriptionEnd).toLocaleDateString()}
                </div>
              </div>
            </div>
          </SoftCard>
        </ThemeFrame>
      ) : null}
    </div>
  );
}
