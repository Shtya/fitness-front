/* 
	use here useTranslations on the all word 
	and i use js no ts
	- in create account
		- when create role coach account hidden the coach select and the Membership , subscription start,end and the all steps except teh step of send his creadientials 
		- and the role can create it here only the [ client , coach ]
		- make the gender field is check button and alos teh membership

	- in the choose plan remove the seach and show only 6 workout plan and if there exist more show button see more to see more and apply this also on the step of the meal plan
	- and add step to add his details about his calories and more things 
	- and the coach send form to the client to fill it shuold in the 5 step assign his answer to this account to be there related with his questions to see it in any time
	- 
*/

'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import { CalendarDays, Plus, Users as UsersIcon, CheckCircle2, XCircle, Shield, ChevronUp, ChevronDown, Eye, Clock, BadgeCheck, PencilLine, PauseCircle, PlayCircle, MessageSquare, PhoneCall, ListChecks, Trash2, EyeOff, Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, Edit3, KeyRound, Copy, User, Mail, Phone, Calendar, Crown, Award, Users, ClipboardList, UserCheck, UserCog, UserCircle } from 'lucide-react';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import { useLocale, useTranslations } from 'next-intl';

import DataTable from '@/components/dashboard/ui/DataTable';
import api from '@/utils/axios';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import Select from '@/components/atoms/Select';
import ActionsMenu from '@/components/molecules/ActionsMenu';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import { Stepper, PlanPicker, MealPlanPicker, FieldRow, PasswordRow, buildWhatsAppLink, SubscriptionPeriodPicker } from '@/components/pages/dashboard/users/Atoms';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminCoaches } from '@/hooks/useHierarchy';
import { useUser } from '@/hooks/useUser';
/* ---------- helpers ---------- */
const toTitle = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const normRole = r => (['ADMIN', 'COACH', 'CLIENT'].includes(String(r || '').toUpperCase()) ? toTitle(r) : 'Client');

function Badge({ children, color = 'slate' }) {
  const map = {
    green: 'bg-green-100 text-green-700 ring-green-600/10',
    amber: 'bg-amber-100 text-amber-800 ring-amber-600/10',
    red: 'bg-red-100 text-red-700 ring-red-600/10',
    violet: 'bg-violet-100 text-violet-700 ring-violet-600/10',
    blue: 'bg-blue-100 text-blue-700 ring-blue-600/10',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-600/10',
    sky: 'bg-sky-100 text-sky-700 ring-sky-600/10',
    pink: 'bg-pink-100 text-pink-700 ring-pink-600/10',
    slate: 'bg-slate-100 text-slate-700 ring-slate-600/10',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/10',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color] || map.slate}`}>{children}</span>;
}
const COLOR_MAP = { active: 'green', pending: 'amber', suspended: 'red', admin: 'violet', coach: 'blue', client: 'emerald', male: 'sky', female: 'pink' };
const normStatus = s => (s ? String(s).trim().toLowerCase() : 'pending');

const StatusPill = ({ status }) => {
  const s = normStatus(status);
  const color = COLOR_MAP[s] || 'gray';
  const ok = ['active', 'coach', 'client', 'admin', 'male', 'female'].includes(s);
  return (
    <Badge color={color}>
      {ok ? <CheckCircle2 className='w-3 h-3' /> : <XCircle className='w-3 h-3' />} {s.charAt(0).toUpperCase() + s.slice(1)}
    </Badge>
  );
};

const RolePill = ({ role }) => {
  const r = normRole(role);
  const color = r === 'Admin' ? 'indigo' : r === 'Coach' ? 'violet' : 'slate';
  return (
    <Badge color={color}>
      <Shield className='w-3 h-3' /> {r}
    </Badge>
  );
};

/* ========================= VALIDATION SCHEMAS ========================= */
const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;

const accountSchema = yup.object({
  name: yup.string().trim().min(2, 'errors.nameMin').required('errors.nameRequired'),
  email: yup.string().trim().email('errors.emailInvalid').required('errors.emailRequired'),
  phone: yup.string().matches(phoneRegex, 'errors.phoneInvalid').optional().nullable(),
  role: yup.mixed().oneOf(['Client', 'Coach']).required('errors.roleRequired'),
  gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
  membership: yup
    .mixed()
    .oneOf(['basic', 'gold', 'platinum'])
    .when('role', {
      is: 'Client',
      then: s => s.required('errors.membershipRequired'),
      otherwise: s => s.optional().nullable(),
    }),
  password: yup
    .string()
    .trim()
    .required('errors.passwordRequired')
    .test('pwLen', 'errors.passwordMin', v => v && v.length >= 8),
  coachId: yup
    .string()
    .nullable()
    .when('role', { is: 'Client', then: s => s.required('errors.coachRequired'), otherwise: s => s.nullable().optional() }),
  subscriptionStart: yup.string().when('role', {
    is: 'Client',
    then: s => s.required('errors.startRequired'),
    otherwise: s => s.optional().nullable(),
  }),
  subscriptionEnd: yup
    .string()
    .when('role', { is: 'Client', then: s => s.required('errors.endRequired'), otherwise: s => s.optional().nullable() })
    .test('end-after-start', 'errors.endAfterStart', function (end) {
      const start = this.parent.subscriptionStart;
      if (!start || !end) return true;
      return new Date(end) >= new Date(start);
    }),
});

const editUserSchema = yup.object({
  name: yup.string().trim().min(2, 'errors.nameMin').required('errors.nameRequired'),
  email: yup.string().trim().email('errors.emailInvalid').required('errors.emailRequired'),
  phone: yup.string().matches(phoneRegex, 'errors.phoneInvalid').optional().nullable(),
  role: yup.mixed().oneOf(['Client', 'Coach', 'Admin']).required('errors.roleRequired'),
  gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
  membership: yup.mixed().oneOf(['basic', 'gold', 'platinum']).required('errors.membershipRequired'),
  status: yup.mixed().oneOf(['Active', 'Pending', 'Suspended']).required('errors.statusRequired'),
  coachId: yup
    .string()
    .nullable()
    .when('role', { is: 'Client', then: s => s.required('errors.coachRequired'), otherwise: s => s.nullable().optional() }),
  password: yup
    .string()
    .trim()
    .notRequired()
    .transform(v => (v === '' ? undefined : v))
    .test('pwLen', 'errors.passwordMin', v => v === undefined || (v && v.length >= 8)),
  subscriptionStart: yup.string().required('errors.startRequired'),
  subscriptionEnd: yup
    .string()
    .required('errors.endRequired')
    .test('end-after-start', 'errors.endAfterStart', function (end) {
      const start = this.parent.subscriptionStart;
      if (!start || !end) return true;
      return new Date(end) >= new Date(start);
    }),
});

/* ========================= SHARED MINI UI ========================= */
export function ToggleGroup({ label, options = [], value, onChange, error, className = '' }) {
  const handleKey = useCallback(
    e => {
      if (!options.length) return;
      const idx = Math.max(
        0,
        options.findIndex(o => o.id === value),
      );
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = options[(idx + 1) % options.length];
        onChange?.(next.id);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = options[(idx - 1 + options.length) % options.length];
        onChange?.(prev.id);
      }
    },
    [options, value, onChange],
  );

  return (
    <div className={className}>
      {label ? <label className='mb-1.5 block text-sm font-medium text-slate-700'>{label}</label> : null}

      <motion.div role='radiogroup' aria-label={typeof label === 'string' ? label : undefined} onKeyDown={handleKey} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className='relative flex flex-wrap gap-2'>
        {options.map(opt => {
          const active = value === opt.id;
          return (
            <motion.button key={opt.id ?? 'none'} type='button' role='radio' aria-checked={active} onClick={() => onChange?.(opt.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className={['relative px-4 py-[6px] rounded-lg text-sm border select-none focus:outline-none', 'transition-colors ease-out', active ? ['bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600', 'text-white border-transparent shadow-lg shadow-indigo-500/20', 'ring-2 ring-indigo-400/50'].join(' ') : ['bg-white text-slate-700 border-slate-300', 'hover:border-indigo-400 hover:bg-indigo-50', 'focus:ring-2 focus:ring-indigo-300/60'].join(' ')].join(' ')}>
              <AnimatePresence>{active && <motion.span layoutId='toggleGlow' className='absolute inset-0 rounded-lg' style={{ boxShadow: '0 0 0.75rem 0.15rem rgba(99,102,241,0.25)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />}</AnimatePresence>

              <span className='relative z-10 font-medium'>{opt.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p key='error' className='text-xs text-rose-600 mt-1' initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================= PLAN PICKER MODAL (no search, 6 + see more) ========================= */
function PlanPickerModal({ open, onClose, title, icon: Icon, fetchUrl, assignUrl, userId, onAssigned }) {
  const t = useTranslations('users');
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [visible, setVisible] = useState(6);

  const normalizePlans = raw => {
    const arr = Array.isArray(raw?.records) ? raw.records : Array.isArray(raw) ? raw : [];
    return arr.map(p => ({
      id: p.id,
      name: p.name || p.title || `#${p.id}`,
      days: (p.days || p.planDays || p.items || []).map((d, i) => ({
        id: d.id ?? `${p.id}-d${i + 1}`,
        day: d.day || d.weekday || d.label || (typeof d.dayNumber === 'number' ? `day ${d.dayNumber}` : `day ${i + 1}`),
        name: d.name || d.title || d.description || '—',
      })),
      assignments: p.assignments || p.activeUsers || [],
    }));
  };

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setVisible(6);
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(fetchUrl, { params: { limit: 200 } });
        setPlans(normalizePlans(res?.data));
      } catch {
        Notification(t('alerts.loadPlansFailed'), 'error');
        setPlans([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, fetchUrl, t]);

  const assign = async planId => {
    if (!planId || !userId) return;
    setAssigning(true);
    try {
      if (assignUrl === '/plans/assign') {
        await api.post(`/plans/${planId}/assign`, { athleteIds: [userId], confirm: 'yes', isActive: true });
      } else if (assignUrl === '/nutrition/meal-plans/assign') {
        await api.post(`nutrition/meal-plans/${planId}/assign`, { userId });
      }
      Notification(t('alerts.planAssigned'), 'success');
      onAssigned?.();
      onClose?.();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.assignFailed'), 'error');
    } finally {
      setAssigning(false);
    }
  };

  const shown = plans.slice(0, visible);
  const canMore = plans.length > visible;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-600'>
          {Icon ? <Icon className='w-4 h-4' /> : null}
          <span>{t('pickers.selectOne')}</span>
        </div>

        {loading ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='h-28 rounded-lg border border-slate-200 bg-slate-50 animate-pulse' />
            ))}
          </div>
        ) : (
          <>
            <PlanPicker buttonName={t('common.assign')} plans={shown} defaultSelectedId={selectedId} onSelect={setSelectedId} onAssign={() => assign(selectedId)} onSkip={onClose} assigning={assigning} hideSearch />
            {canMore ? (
              <div className='flex justify-center'>
                <Button name={t('common.seeMore')} color='neutral' onClick={() => setVisible(v => v + 6)} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ========================= EDIT USER MODAL (localized) ========================= */
function EditUserModal({ open, onClose, user, onSaved, optionsCoach }) {
  const t = useTranslations('users');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    trigger,
    watch,
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || 'Client',
      gender: user?.gender || null,
      membership: user?.membership?.toLowerCase() || 'basic',
      status: user?.status || 'Active',
      coachId: user?.coachId ?? null,
      password: '',
      subscriptionStart: user?.subscriptionStart || new Date().toISOString().slice(0, 10),
      subscriptionEnd: user?.subscriptionEnd || new Date().toISOString().slice(0, 10),
    },
    resolver: yupResolver(editUserSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open && user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'Client',
        gender: user.gender || null,
        membership: user.membership?.toLowerCase() || 'basic',
        status: user.status || 'Active',
        coachId: user.coachId ?? null,
        password: '',
        subscriptionStart: user.subscriptionStart || new Date().toISOString().slice(0, 10),
        subscriptionEnd: user.subscriptionEnd || new Date().toISOString().slice(0, 10),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const generatePassword = e => {
    e?.preventDefault?.();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let p = '';
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setValue('password', p);
    trigger('password');
    Notification(t('alerts.passwordGenerated'), 'info');
    return p;
  };

  const onSubmit = async data => {
    setSaving(true);
    try {
      await api.put(`/auth/user/${user.id}`, {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        gender: data.gender ?? null,
        membership: data.membership,
        status: data.status.toLowerCase(),
        role: data.role.toLowerCase(),
        coachId: data.coachId ?? null,
        ...(data.password ? { password: data.password } : {}),
        subscriptionStart: data.subscriptionStart,
        subscriptionEnd: data.subscriptionEnd,
      });
      Notification(t('alerts.userUpdated'), 'success');
      onSaved?.();
      onClose?.();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.updateFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t('editUser')} • ${user?.name ?? ''}`}>
      <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Controller name='name' control={control} render={({ field }) => <Input label={t('fields.fullName')} placeholder={t('placeholders.fullName')} error={t(errors.name?.message)} icon={<User className='w-4 h-4' />} {...field} />} />
          <Controller name='phone' control={control} render={({ field }) => <Input label={t('fields.phone')} placeholder={t('placeholders.phone')} error={(errors.phone && t(errors.phone?.message)) || ''} icon={<Phone className='w-4 h-4' />} {...field} value={field.value} />} />
          <Controller name='email' control={control} render={({ field }) => <Input label={t('fields.email')} type='email' placeholder={t('placeholders.email')} error={errors.email && t(errors.email?.message)} icon={<Mail className='w-4 h-4' />} {...field} />} />

          {/* Password (leave blank to keep) */}
          <div className='relative'>
            <Controller name='password' control={control} render={({ field }) => <CutomInput label={t('fields.passwordEdit')} type={showPassword ? 'text' : 'password'} placeholder='••••••••' value={field.value || ''} onChange={field.onChange} error={errors.password?.message ? t(errors.password.message) : undefined} />} />
            <div className='absolute rtl:left-2 ltr:right-2 top-9 flex items-center gap-1'>
              <Button color='neutral' className=' !min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPassword(v => !v)} name='' icon={showPassword ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
              <Button color='neutral' className=' !min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
            </div>
          </div>

          <Controller
            name='gender'
            control={control}
            render={({ field }) => (
              <ToggleGroup
                label={t('fields.gender')}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { id: 'male', label: t('gender.male') },
                  { id: 'female', label: t('gender.female') },
                  { id: null, label: t('gender.notSpecified') },
                ]}
                error={errors.gender?.message ? t(errors.gender.message) : undefined}
              />
            )}
          />

          <Controller
            name='membership'
            control={control}
            render={({ field }) => (
              <ToggleGroup
                label={t('fields.membership')}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { id: 'basic', label: t('membership.basic') },
                  { id: 'gold', label: t('membership.gold') },
                  { id: 'platinum', label: t('membership.platinum') },
                ]}
                error={errors.membership?.message ? t(errors.membership.message) : undefined}
              />
            )}
          />

          <Controller
            name='role'
            control={control}
            render={({ field }) => (
              <div className='sm:col-span-1'>
                <Select
                  label={t('fields.role')}
                  placeholder={t('placeholders.role')}
                  options={[
                    { id: 'Admin', label: t('roles.admin') },
                    { id: 'Coach', label: t('roles.coach') },
                    { id: 'Client', label: t('roles.client') },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<Shield className='w-4 h-4' />}
                />
                {errors.role?.message && <p className='text-xs text-rose-600 mt-1'>{t(errors.role.message)}</p>}
              </div>
            )}
          />

          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <div>
                <Select
                  label={t('fields.status')}
                  placeholder={t('placeholders.status')}
                  options={[
                    { id: 'Active', label: t('status.active') },
                    { id: 'Pending', label: t('status.pending') },
                    { id: 'Suspended', label: t('status.suspended') },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<CheckCircle2 className='w-4 h-4' />}
                />
                {errors.status?.message && <p className='text-xs text-rose-600 mt-1'>{t(errors.status.message)}</p>}
              </div>
            )}
          />

          <Controller
            name='coachId'
            control={control}
            render={({ field }) => (
              <div className='sm:col-span-1'>
                <Select label={t('fields.coach')} placeholder={t('placeholders.coach')} options={optionsCoach} value={field.value} onChange={field.onChange} icon={<Award className='w-4 h-4' />} />
                {errors.coachId?.message && <p className='text-xs text-rose-600 mt-1'>{t(errors.coachId.message)}</p>}
              </div>
            )}
          />

          {/* Subscription period */}
          <div className='sm:col-span-2'>
            <Controller
              name='subscriptionStart'
              control={control}
              render={({ field }) => {
                const start = field.value;
                return <Controller name='subscriptionEnd' control={control} render={({ field: fieldEnd }) => <SubscriptionPeriodPicker startValue={start} endValue={fieldEnd.value || ''} onStartChange={v => field.onChange(v)} onEndChange={v => fieldEnd.onChange(v)} errorStart={errors.subscriptionStart?.message ? t(errors.subscriptionStart.message) : undefined} errorEnd={errors.subscriptionEnd?.message ? t(errors.subscriptionEnd.message) : undefined} t={t} />} />;
              }}
            />
          </div>
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-slate-200'>
          <Button color='neutral' name={t('common.cancel')} onClick={onClose} />
          <Button color='primary' type='submit' name={t('common.saveChanges')} loading={saving} disabled={!isDirty || saving} />
        </div>
      </form>
    </Modal>
  );
}

/* ========================= CREATE CLIENT/COACH WIZARD ========================= */
const GENDER_OPTIONS = [
  { id: 'male', label: 'gender.male' },
  { id: 'female', label: 'gender.female' },
];
const MEMBERSHIP_OPTIONS = [
  { id: 'basic', label: 'membership.basic' },
  { id: 'gold', label: 'membership.gold' },
  { id: 'platinum', label: 'membership.platinum' },
];
const ROLE_OPTIONS_WIZARD = [
  { id: 'Client', label: 'roles.client' },
  { id: 'Coach', label: 'roles.coach' },
];

function CreateClientWizard({ open, onClose, onDone, optionsCoach }) {
  const t = useTranslations('users');

  const [roleAtCreation, setRoleAtCreation] = useState('Client');

  const [stepIndex, setStepIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [assigningW, setAssigningW] = useState(false);
  const [assigningM, setAssigningM] = useState(false);

  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [visibleWorkouts, setVisibleWorkouts] = useState(6);
  const [visibleMeals, setVisibleMeals] = useState(6);

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [summaryPhone, setSummaryPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [caloriesForm, setCaloriesForm] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    activity: 'moderate',
    notes: '',
  });

  const stepsClient = ['account', 'workout', 'meal', 'calories', 'send'];
  const stepsCoach = ['account', 'send'];
  const steps = roleAtCreation === 'Coach' ? stepsCoach : stepsClient;
  const currentStep = steps[stepIndex];

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'Client',
      gender: 'male',
      membership: 'basic',
      password: '',
      coachId: null,
      subscriptionStart: new Date().toISOString().slice(0, 10),
      subscriptionEnd: new Date().toISOString().slice(0, 10),
    },
    resolver: yupResolver(accountSchema),
    mode: 'onBlur',
  });

  const roleWatch = watch('role');

  useEffect(() => {
    setRoleAtCreation(roleWatch);
  }, [roleWatch]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setCreatedUser(null);
      setSelectedWorkout(null);
      setVisibleWorkouts(6);
      setVisibleMeals(6);
      setShowPassword(false);
      setCaloriesForm({ calories: '', protein: '', carbs: '', fat: '', activity: 'moderate', notes: '' });
      reset();
      return;
    }
  }, [open, reset]);

  // load plans when hitting those steps
  useEffect(() => {
    if (!open) return;

    if (currentStep === 'workout') {
      (async () => {
        try {
          const res = await api.get('/plans', { params: { limit: 200 } });
          setWorkoutPlans(res.data.records || []);
        } catch {
          Notification(t('alerts.loadWorkoutFailed'), 'error');
        }
      })();
    }

    if (currentStep === 'meal') {
      (async () => {
        try {
          const res = await api.get('/nutrition/meal-plans', { params: { limit: 200 } });
          setMealPlans(res?.data?.records || []);
        } catch {
          Notification(t('alerts.loadMealFailed'), 'error');
        }
      })();
    }
  }, [open, currentStep, t]);

  const generatePassword = e => {
    e?.preventDefault?.();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let p = '';
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setValue('password', p);
    trigger('password');
    Notification(t('alerts.passwordGenerated'), 'info');
    return p;
  };

  const onSubmitAccount = async data => {
    setCreating(true);
    try {
      const body = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        gender: data.gender || undefined,
        role: (data.role || 'Client').toLowerCase(),
        membership: data.role === 'Client' ? data.membership : undefined,
        password: data.password || undefined,
        coachId: data.role === 'Client' ? data.coachId || null : null,
        subscriptionStart: data.role === 'Client' ? data.subscriptionStart : undefined,
        subscriptionEnd: data.role === 'Client' ? data.subscriptionEnd : undefined,
      };
      const res = await api.post('/auth/admin/users', body);
      const user = res?.data || {};
      setCreatedUser(user);
      setSummaryPhone(data.phone || '');

      Notification(t('alerts.accountCreated'), 'success');

      // next step routing
      if (roleAtCreation === 'Coach') {
        // skip to send step (index of 'send' in stepsCoach is 1)
        setStepIndex(steps.indexOf('send'));
        onDone?.();
        return;
      }
      // Client flow -> go to workout
      setStepIndex(steps.indexOf('workout'));
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.createFailed'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const assignWorkout = async () => {
    setAssigningW(true);
    try {
      if (selectedWorkout) {
        await api.post(`/plans/${selectedWorkout}/assign`, {
          athleteIds: [createdUser?.user?.id],
          confirm: 'yes',
          isActive: true,
        });
      }
      setStepIndex(steps.indexOf('meal'));
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.assignWorkoutFailed'), 'error');
    } finally {
      setAssigningW(false);
    }
  };

  const handleAssignMeal = async mealPlanId => {
    setAssigningM(true);
    try {
      if (mealPlanId) {
        await api.post(`nutrition/meal-plans/${mealPlanId}/assign`, { userId: createdUser.user.id });
      }
      setStepIndex(steps.indexOf('calories'));
      onDone?.();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.assignMealFailed'), 'error');
    } finally {
      setAssigningM(false);
    }
  };

  const saveCalories = async () => {
    try {
      await api.put('/auth/profile', {
        id: createdUser?.user?.id,
        caloriesTarget: caloriesForm?.calories,
        proteinPerDay: caloriesForm?.protein,
        carbsPerDay: caloriesForm?.carbs,
        fatsPerDay: caloriesForm?.fat,
        activityLevel: caloriesForm?.activity,
        notes: caloriesForm?.notes,
      });
      setStepIndex(steps.indexOf('send'));
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.saveCaloriesFailed'), 'error');
    }
  };

  const lang = useLocale();
  const email = createdUser?.email || getValues('email');
  const pwd = getValues('password');
  const role = getValues('role');

  const handleSendCreds = () => {
    const link = buildWhatsAppLink({ phone: summaryPhone, email, password: pwd, role, lang });
    if (!link) return Notification(t('alerts.enterPhoneWhatsapp'), 'warning');
    window.open(link, '_blank');
  };

  const stepTitleMap = {
    account: t('wizard.createAccount'),
    workout: t('wizard.chooseWorkout'),
    meal: t('wizard.chooseMeal'),
    calories: t('wizard.caloriesDetails'),
    send: t('wizard.credentialsAndForm'),
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t('wizard.newUser')} • ${stepTitleMap[currentStep]}`}>
      <Stepper step={stepIndex + 1} steps={steps.length} />

      {/* Step: Account */}
      {currentStep === 'account' && (
        <form className='space-y-3' onSubmit={handleSubmit(onSubmitAccount)}>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <Controller name='name' control={control} render={({ field }) => <Input label={t('fields.fullName')} placeholder={t('placeholders.fullName')} error={t(errors?.name?.message || '')} {...field} />} />
            <Controller name='phone' control={control} render={({ field }) => <Input label={t('fields.phone')} placeholder={t('placeholders.phone')} error={t(errors?.phone?.message || '')} {...field} value={field.value || ''} />} />

            <Controller name='email' control={control} render={({ field }) => <Input label={t('fields.email')} type='email' placeholder={t('placeholders.email')} error={t(errors?.email?.message)} {...field} />} />

            {/* Password + toggles */}
            <div className='relative'>
              <Controller name='password' control={control} render={({ field }) => <CutomInput label={t('fields.password')} type={showPassword ? 'text' : 'password'} placeholder='••••••••' value={field.value} onChange={field.onChange} error={errors.password?.message ? t(errors.password.message) : undefined} />} />
              <div className='absolute rtl:left-2 ltr:right-2 top-9 flex items-center gap-1'>
                <Button color='neutral' className=' !min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPassword(v => !v)} name='' icon={showPassword ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
                <Button color='neutral' className=' !min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
              </div>
            </div>

            {/* Gender -> check buttons */}
            <Controller name='gender' control={control} render={({ field }) => <ToggleGroup label={t('fields.gender')} value={field.value} onChange={field.onChange} options={GENDER_OPTIONS.map(o => ({ id: o.id, label: t(o.label) }))} error={errors.gender?.message ? t(errors.gender.message) : undefined} />} />

            {/* Role -> only Client/Coach */}
            <Controller
              name='role'
              control={control}
              render={({ field }) => (
                <div>
                  <ToggleGroup label={t('fields.role')} value={field.value} onChange={field.onChange} options={ROLE_OPTIONS_WIZARD.map(o => ({ id: o.id, label: t(o.label) }))} error={errors.role?.message ? t(errors.role.message) : undefined} />
                </div>
              )}
            />

            {/* Coach select (hidden if role === Coach) */}
            {roleAtCreation === 'Client' && (
              <Controller
                name='coachId'
                control={control}
                render={({ field }) => (
                  <div>
                    <Select label={`${t('fields.coach')} *`} placeholder={t('placeholders.coach')} options={optionsCoach} value={field.value} onChange={field.onChange} icon={<Award className='w-4 h-4' />} />
                    {errors.coachId?.message && <p className='text-xs text-rose-600 mt-1'>{t(errors.coachId.message)}</p>}
                  </div>
                )}
              />
            )}

            {/* Membership check buttons (hidden if role === Coach) */}
            {roleAtCreation === 'Client' && <Controller name='membership' control={control} render={({ field }) => <ToggleGroup label={t('fields.membership')} value={field.value} onChange={field.onChange} options={MEMBERSHIP_OPTIONS.map(o => ({ id: o.id, label: t(o.label) }))} error={errors.membership?.message ? t(errors.membership.message) : undefined} />} />}

            {/* Subscription period (hidden if role === Coach) */}
            {roleAtCreation === 'Client' && (
              <div className='sm:col-span-2'>
                <Controller
                  name='subscriptionStart'
                  control={control}
                  render={({ field }) => {
                    const start = field.value;
                    return <Controller name='subscriptionEnd' control={control} render={({ field: fieldEnd }) => <SubscriptionPeriodPicker startValue={start} endValue={fieldEnd.value || ''} onStartChange={v => field.onChange(v)} onEndChange={v => fieldEnd.onChange(v)} errorStart={errors.subscriptionStart?.message ? t(errors.subscriptionStart.message) : undefined} errorEnd={errors.subscriptionEnd?.message ? t(errors.subscriptionEnd.message) : undefined} t={t} />} />;
                  }}
                />
              </div>
            )}
          </div>

          <button type='submit' disabled={creating || isSubmitting} className='flex ml-auto rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700'>
            {creating || isSubmitting ? t('common.creating') : t('wizard.createAndNext')}
          </button>
        </form>
      )}

      {/* Step: Workout (no search, 6 then See more) */}
      {currentStep === 'workout' && (
        <div className='space-y-3'>
          <PlanPicker plans={workoutPlans.slice(0, visibleWorkouts)} defaultSelectedId={selectedWorkout} onSelect={setSelectedWorkout} onSkip={() => setStepIndex(steps.indexOf('meal'))} onAssign={() => assignWorkout(selectedWorkout)} assigning={assigningW} hideSearch />
          {workoutPlans.length > visibleWorkouts ? (
            <div className='flex justify-center'>
              <Button name={t('common.seeMore')} color='neutral' onClick={() => setVisibleWorkouts(v => v + 6)} />
            </div>
          ) : null}
        </div>
      )}

      {/* Step: Meal (no search, 6 then See more) */}
      {currentStep === 'meal' && (
        <div className='space-y-3'>
          <MealPlanPicker meals={mealPlans.slice(0, visibleMeals)} onBack={() => setStepIndex(steps.indexOf('workout'))} onSkip={() => setStepIndex(steps.indexOf('calories'))} onAssign={handleAssignMeal} assigning={assigningM} hideSearch />
          {mealPlans.length > visibleMeals ? (
            <div className='flex justify-center'>
              <Button name={t('common.seeMore')} color='neutral' onClick={() => setVisibleMeals(v => v + 6)} />
            </div>
          ) : null}
        </div>
      )}

      {/* Step: Calories & Details */}
      {currentStep === 'calories' && (
        <div className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
            <Input type='number' label={t('calories.calories')} value={caloriesForm.calories} onChange={v => setCaloriesForm(s => ({ ...s, calories: v }))} placeholder='e.g., 2200' />
            <Input type='number' label={t('calories.protein')} value={caloriesForm.protein} onChange={v => setCaloriesForm(s => ({ ...s, protein: v }))} placeholder='g/day' />
            <Input type='number' label={t('calories.carbs')} value={caloriesForm.carbs} onChange={v => setCaloriesForm(s => ({ ...s, carbs: v }))} placeholder='g/day' />
            <Input type='number' label={t('calories.fat')} value={caloriesForm.fat} onChange={v => setCaloriesForm(s => ({ ...s, fat: v }))} placeholder='g/day' />
          </div>
          <Select
            label={t('calories.activity')}
            options={[
              { id: 'sedentary', label: t('calories.level.sedentary') },
              { id: 'light', label: t('calories.level.light') },
              { id: 'moderate', label: t('calories.level.moderate') },
              { id: 'active', label: t('calories.level.active') },
              { id: 'athlete', label: t('calories.level.athlete') },
            ]}
            value={caloriesForm.activity}
            onChange={v => setCaloriesForm(s => ({ ...s, activity: v }))}
          />
          <Input label={t('calories.notes')} value={caloriesForm.notes} onChange={v => setCaloriesForm(s => ({ ...s, notes: v }))} placeholder={t('calories.notesPh')} />

          <div className='flex justify-end gap-2'>
            <Button color='neutral' name={t('common.back')} onClick={() => setStepIndex(steps.indexOf('meal'))} />
            <Button color='primary' name={t('common.saveAndNext')} onClick={saveCalories} />
          </div>
        </div>
      )}

      {/* Step: Send Credentials (+ Coach sends form) */}
      {currentStep === 'send' && (
        <div className='space-y-6'>
          <div className='flex-1  '>
            <p className='text-sm text-emerald-700/80'>{t('wizard.credsReady')}</p>
            <div className='mt-3 grid gap-2'>
              <FieldRow icon={<Mail className='h-4 w-4' />} label={t('fields.email')} value={createdUser?.email || getValues('email')} canCopy />
              <PasswordRow label={t('fields.password')} value={getValues('password') ? getValues('password') : t('wizard.passwordByEmail')} canCopy={Boolean(getValues('password'))} />
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <Input value={summaryPhone} onChange={setSummaryPhone} placeholder={t('placeholders.whatsapp')} />
            <div className='sm:col-span-2 flex items-end justify-end gap-2'>
              <Button color='green' className='!w-fit text-base' name={t('common.sendWhatsapp')} icon={<MessageCircle size={16} />} onClick={handleSendCreds} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ========================= MAIN PAGE ========================= */
export default function UsersList() {
  const t = useTranslations('users');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [myRole, setMyRole] = useState('Client');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, pendingUsers: 0, suspendedUsers: 0, admins: 0, coaches: 0, clients: 0, withPlans: 0, withoutPlans: 0, withMealPlans: 0, withoutMealPlans: 0 });

  const [searchText, setSearchText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [hasPlanFilter, setHasPlanFilter] = useState('All');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pickerWorkout, setPickerWorkout] = useState({ open: false, user: null });
  const [pickerMeal, setPickerMeal] = useState({ open: false, user: null });

  useEffect(() => {
    const tOut = setTimeout(() => setDebounced(searchText.trim()), 350);
    return () => clearTimeout(tOut);
  }, [searchText]);

  async function fetchMe() {
    try {
      const r = await api.get('/auth/me');
      setMyRole(r?.data?.role);
    } catch {}
  }

  async function fetchUsers() {
    setLoading(true);
    setErr(null);
    try {
      const params = { page, limit, sortBy, sortOrder };
      if (debounced) params.search = debounced;
      const res = await api.get('/auth/users', { params });
      const data = res.data || {};
      const totalRecords = data?.total;

      const mapped = data?.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: normRole(u.role),
        status: normStatus(u.status),
        phone: u.phone || '',
        membership: u.membership || '-',
        subscriptionStart: u.subscriptionStart || '-',
        subscriptionEnd: u.subscriptionEnd || '-',
        joinDate: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
        activePlanId: u.activePlanId ?? u.planId ?? null,
        planName: u.activePlan?.name || '-',
        planMealName: u.activeMealPlan?.name || '-',
        coachId: u.coachId ?? u.assignedCoachId ?? null,
        coachName: u.coach?.name || u.coachName || u.assignedCoachName || null,
        gender: u.gender || null,
      }));

      setRows(mapped);
      setTotal(totalRecords);
    } catch (e) {
      setErr(e?.response?.data?.message || t('alerts.loadUsersFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const { data } = await api.get('/auth/stats');
      setStats(s => ({ ...s, ...(data || {}) }));
    } catch {}
  }

  useEffect(() => {
    fetchMe();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, sortBy, sortOrder, debounced]); // eslint-disable-line

  const filtered = useMemo(() => rows.filter(r => (roleFilter === 'All' ? true : r.role === roleFilter)).filter(r => (hasPlanFilter === 'All' ? true : hasPlanFilter === 'With plan' ? !!r.activePlanId : !r.activePlanId)), [rows, roleFilter, hasPlanFilter]);

  const setStatusApi = async (userId, statusLower) => {
    try {
      await api.put(`/auth/status/${userId}`, { status: statusLower });
      fetchUsers();
      fetchStats();
      Notification(t('alerts.statusUpdated', { status: toTitle(statusLower) }), 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.updateFailed'), 'error');
    }
  };

  const approveUser = row => setStatusApi(row.id, 'active');
  const suspendUser = row => setStatusApi(row.id, 'suspended');

  const deleteUser = async row => {
    if (!confirm(t('dialogs.deleteUserConfirm', { name: row.name }))) return;
    try {
      await api.delete(`/auth/user/${row.id}`);
      fetchUsers();
      fetchStats();
      Notification(t('alerts.userDeleted'), 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.deleteFailed'), 'error');
    }
  };

  const I = (Icon, cls = '') => <Icon className={`h-4 w-4 ${cls}`} />;
  const buildRowActions = row => {
    const viewer = String(myRole || '').toLowerCase();
    const isAdmin = viewer === 'admin';
    const canCoachManage = viewer === 'coach';
    const canManage = isAdmin || canCoachManage;

    const opts = [
      { icon: I(Eye, 'text-slate-600'), label: t('actions.openProfile'), onClick: () => (window.location.href = `/dashboard/users/${row.id}`), className: 'hover:text-slate-800' },
      {
        icon: I(PencilLine, 'text-indigo-600'),
        label: t('actions.editDetails'),
        onClick: () => {
          setSelectedUser(row);
          setEditUserOpen(true);
        },
        className: 'hover:text-indigo-700',
      },
    ];

    if (canManage) {
      opts.push({ icon: I(Dumbbell, 'text-violet-600'), label: t('actions.assignWorkout'), onClick: () => setPickerWorkout({ open: true, user: row }), className: 'hover:text-violet-700' }, { icon: I(Utensils, 'text-amber-600'), label: t('actions.assignMeal'), onClick: () => setPickerMeal({ open: true, user: row }), className: 'hover:text-amber-700' });
      const s = String(row.status || '').toLowerCase();
      if (s === 'pending') opts.push({ icon: I(CheckCircle2, 'text-emerald-600'), label: t('actions.approve'), onClick: () => approveUser(row), className: 'hover:text-emerald-700' });
      if (s === 'active') {
        opts.push({ icon: I(PauseCircle, 'text-amber-600'), label: t('actions.suspend'), onClick: () => suspendUser(row), className: 'hover:text-amber-700' });
      } else if (s === 'suspended') {
        opts.push({ icon: I(PlayCircle, 'text-emerald-600'), label: t('actions.activate'), onClick: () => approveUser(row), className: 'hover:text-emerald-700' });
      }
    }

    if (isAdmin) {
      opts.push(
        {
          icon: I(PhoneCall, 'text-green-600'),
          label: t('actions.whatsapp'),
          onClick: () => {
            const phone = String(row.phone || '').replace(/[^0-9]/g, '');
            if (!phone) return Notification(t('alerts.noPhone'), 'error');
            window.open(`https://wa.me/${phone}`, '_blank');
          },
          className: 'hover:text-green-700',
        },
        { icon: I(MessageSquare, 'text-sky-600'), label: t('actions.directChat'), onClick: () => window.open(`/dashboard/chat?userId=${row.id}`, '_blank'), className: 'hover:text-sky-700' },
        { icon: I(Trash2, 'text-rose-600'), label: t('actions.delete'), onClick: () => deleteUser(row), className: 'text-rose-600 hover:text-rose-700' },
      );
    }
    return opts;
  };

  const columns = [
    {
      header: t('table.name'),
      accessor: 'name',
      className: 'text-nowrap',
      cell: r => (
        <div className='flex items-center gap-2'>
          <span>{r.name}</span>
        </div>
      ),
    },
    { header: t('table.email'), accessor: 'email' },
    { header: t('table.role'), accessor: 'role', cell: r => <RolePill role={r.role} /> },
    { header: t('table.gender'), accessor: 'gender', cell: r => <StatusPill status={r.gender} /> },
    // { header: t('table.phone'), accessor: 'phone' },
    { header: t('table.membership'), accessor: 'membership' },
    { header: t('table.exercisePlan'), accessor: 'planName' },
    { header: t('table.mealPlan'), accessor: 'planMealName' },
    {
      header: t('table.coach'),
      accessor: 'coachName',
      cell: r =>
        r.coachName ? (
          <Badge color='violet'>
            <Shield className='w-3 h-3' /> {r.coachName}
          </Badge>
        ) : (
          <span className='text-slate-400'>—</span>
        ),
    },
    { header: t('table.joinDate'), accessor: 'joinDate', className: 'text-nowrap' },
    { header: t('table.status'), accessor: 'status', cell: r => <StatusPill status={r.status} /> },
    {
      header: t('table.daysLeft'),
      accessor: 'daysLeft',
      cell: r => {
        if (!r.subscriptionStart || !r.subscriptionEnd) return <span className='text-slate-400'>—</span>;
        const today = new Date();
        const end = new Date(r.subscriptionEnd);
        const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return <span className='text-red-500 font-medium'>{t('common.expired')}</span>;
        return (
          <span className={`font-medium ${diff <= 3 ? 'text-red-500' : diff <= 7 ? 'text-orange-500' : 'text-emerald-600'}`}>
            {diff || '0'} {t('common.days')}
          </span>
        );
      },
    },
    { header: t('table.actions'), accessor: '_actions', cell: r => <ActionsMenu options={buildRowActions(r)} align='right' /> },
  ];

  const toggleSort = field => {
    if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const FILTER_ROLE_OPTIONS = [
    { id: 'All', name: t('filters.allRoles') },
    { id: 'Coach', name: t('roles.coach') },
    { id: 'Client', name: t('roles.client') },
  ];
  const FILTER_PLAN_OPTIONS = [
    { id: 'All', name: t('filters.allPlans') },
    { id: 'With plan', name: t('filters.withPlan') },
    { id: 'No plan', name: t('filters.noPlan') },
  ];
  const toSelectOptions = arr => arr.map(o => ({ id: o.id, label: o.name }));

  const user = useUser();
  const coaches = useAdminCoaches(user?.id, { page: 1, limit: 100, search: '' });

  const optionsCoach = useMemo(() => {
    const list = [];
    if (user) {
      list.push({
        id: user.id,
        label: 'To Me',
      });
    }

    if (coaches?.items?.length) {
      for (const coach of coaches.items) {
        list.push({
          id: coach.id,
          label: coach.name || coach.email || 'Unnamed Coach',
        });
      }
    }

    return list;
  }, [user, coaches?.items]);

  return (
    <div className='space-y-6'>
      {/* Gradient header */}
      <div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
        <div className='absolute inset-0 overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
          <div className='absolute inset-0 opacity-15' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)', backgroundSize: '22px 22px', backgroundPosition: '-1px -1px' }} />
          <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
        </div>

        <div className='relative p-6 sm:p-8 text-white'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
            <div>
              <h1 className='text-2xl md:text-4xl font-semibold'>{t('header.title')}</h1>
              <p className='text-white/85 mt-1'>{t('header.subtitle')}</p>
            </div>

            <button onClick={() => setWizardOpen(true)} className=' w-fit group relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30 transition-transform active:scale-[.98]'>
              <Plus size={16} />
              <span>{t('header.createNewUser')}</span>
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-3'>
            {/* Simple stat badges */}
            <StatCard icon={Users} title={t('stats.totalUsers')} value={stats.totalUsers} />
            <StatCard icon={UserCheck} title={t('stats.active')} value={stats.activeUsers} />
            <StatCard icon={UserCog} title={t('stats.coaches')} value={stats.coaches} />
            <StatCard icon={UserCircle} title={t('stats.clients')} value={stats.clients} />
          </motion.div>
        </div>
      </div>

      {/* Filters + search */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='flex-1'>
          <div className='relative w-full md:w-60'>
            <svg className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' viewBox='0 0 24 24' fill='none'>
              <path d='M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            <input
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder={t('placeholders.search')}
              className='h-[40px] w-full pl-10 pr-3 rounded-lg bg-white text-black border border-slate-300 font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition'
            />
          </div>
        </div>

        <Select
          className='!max-w-[180px] !w-full'
          placeholder={t('filters.role')}
          options={toSelectOptions(FILTER_ROLE_OPTIONS)}
          value={roleFilter}
          onChange={id => {
            setRoleFilter(id);
            setPage(1);
          }}
        />
        <Select
          className='!max-w-[180px] !w-full'
          placeholder={t('filters.plan')}
          options={toSelectOptions(FILTER_PLAN_OPTIONS)}
          value={hasPlanFilter}
          onChange={id => {
            setHasPlanFilter(id);
            setPage(1);
          }}
        />
        <button onClick={() => toggleSort('created_at')} className='bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-lg text-black border border-slate-300 font-medium text-sm hover:border-indigo-400 transition'>
          <Clock size={16} />
          <span>{t('filters.newest')}</span>
          {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null}
        </button>
      </div>

      {/* Table */}
      <div className='space-y-4'>
        {err && <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div>}
        <div className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
          <DataTable columns={columns} data={filtered} loading={loading} itemsPerPage={limit} pagination selectable={false} serverPagination page={page} onPageChange={setPage} totalRows={total} />
        </div>
      </div>

      {/* Modals */}
      <CreateClientWizard
        optionsCoach={optionsCoach}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onDone={() => {
          fetchUsers();
          fetchStats();
        }}
      />

      <EditUserModal
        optionsCoach={optionsCoach}
        open={editUserOpen}
        onClose={() => {
          setEditUserOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSaved={() => {
          fetchUsers();
          fetchStats();
        }}
      />

      <PlanPickerModal
        open={pickerWorkout.open}
        onClose={() => setPickerWorkout({ open: false, user: null })}
        title={`${t('pickers.assignWorkout')}${pickerWorkout.user ? ` • ${pickerWorkout.user.name}` : ''}`}
        icon={Dumbbell}
        fetchUrl='/plans'
        assignUrl='/plans/assign'
        userId={pickerWorkout.user?.id}
        onAssigned={() => {
          setPickerWorkout({ open: false, user: null });
          fetchUsers();
        }}
      />

      <PlanPickerModal
        open={pickerMeal.open}
        onClose={() => setPickerMeal({ open: false, user: null })}
        title={`${t('pickers.assignMeal')}${pickerMeal.user ? ` • ${pickerMeal.user.name}` : ''}`}
        icon={Utensils}
        fetchUrl='/nutrition/meal-plans'
        assignUrl='/nutrition/meal-plans/assign'
        userId={pickerMeal.user?.id}
        onAssigned={() => {
          setPickerMeal({ open: false, user: null });
          fetchUsers();
        }}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className='rounded-lg bg-white/70 backdrop-blur-[100px] text-slate-800 border border-white/90 shadow-sm px-4 py-3'>
      <div className='text-xs text-slate-900'>{label}</div>
      <div className='text-xl font-semibold mt-1'>{value ?? 0}</div>
    </div>
  );
}

// simple input wrapper (kept)
export function CutomInput({ value, onChange, onBlur, name, inputRef, className, cnInput, ...rest }) {
  return (
    <div className={`w-full relative ${className || ''}`}>
      {rest.label && <label className='mb-1.5 block text-sm font-medium text-slate-700'>{rest.label}</label>}
      <div className='border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 relative flex items-center rounded-lg border bg-white focus-within:ring-4 focus-within:ring-indigo-100 transition-colors'>
        <input {...rest} ref={inputRef} name={name} value={value} onChange={onChange} onBlur={onBlur} className={`${cnInput || ''} h-[43px] w-full rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-gray-400`} />
      </div>
      {rest.error && <p className='mt-1 text-xs text-red-600'>{rest.error}</p>}
    </div>
  );
}
