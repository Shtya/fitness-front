'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Users as UsersIcon, CheckCircle2, XCircle, Shield, ChevronUp, ChevronDown, Eye, Clock, Search, BadgeCheck, PencilLine, PauseCircle, PlayCircle, MessageSquare, PhoneCall, ListChecks, Power, Trash2, Check, EyeOff, Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, Edit3, KeyRound, Copy, User, Mail, Phone, Calendar, Crown, Award, Users, Globe, Languages } from 'lucide-react';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import DataTable from '@/components/dashboard/ui/DataTable';
import api from '@/utils/axios';
import { Modal, PageHeader, StatCard, StatCardArray } from '@/components/dashboard/ui/UI';
import Select from '@/components/atoms/Select';
import ActionsMenu from '@/components/molecules/ActionsMenu';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import { motion, AnimatePresence } from 'framer-motion';
import { useValues } from '@/context/GlobalContext';
import { Stepper, PlanPicker, orderDays, MealPlanPicker, FieldRow, PasswordRow, CopyButton, buildWhatsAppLink, LanguageToggle, SubscriptionPeriodPicker } from '@/components/pages/dashboard/users/Atoms';

/* ---------- helpers ---------- */
const toTitle = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

const normRole = r => (['ADMIN', 'COACH', 'CLIENT'].includes(String(r || '').toUpperCase()) ? toTitle(r) : 'Client');

function Badge({ children, color = 'slate' }) {
  const map = {
    // ----- STATUS -----
    green: 'bg-green-100 text-green-700 ring-green-600/10', // Active
    amber: 'bg-amber-100 text-amber-800 ring-amber-600/10', // Pending
    red: 'bg-red-100 text-red-700 ring-red-600/10', // Suspended

    // ----- ROLE -----
    violet: 'bg-violet-100 text-violet-700 ring-violet-600/10', // Admin
    blue: 'bg-blue-100 text-blue-700 ring-blue-600/10', // Coach
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-600/10', // Client

    // ----- GENDER -----
    sky: 'bg-sky-100 text-sky-700 ring-sky-600/10', // Male
    pink: 'bg-pink-100 text-pink-700 ring-pink-600/10', // Female

    // ----- FALLBACK -----
    slate: 'bg-slate-100 text-slate-700 ring-slate-600/10', // Default/unknown
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/10', // Optional variant
  };

  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color] || map.slate}`}>{children}</span>;
}
const COLOR_MAP = {
  // ----- STATUS -----
  active: 'green',
  pending: 'amber',
  suspended: 'red',

  // ----- ROLE -----
  admin: 'violet',
  coach: 'blue',
  client: 'emerald',

  // ----- GENDER -----
  male: 'sky',
  female: 'pink',
};
const normStatus = s => (s ? String(s).trim().toLowerCase() : 'pending');

const StatusPill = ({ status }) => {
  const s = normStatus(status);
  const color = COLOR_MAP[s] || 'gray';
  const isPositive = ['active', 'coach', 'client', 'admin', 'male', 'female'].includes(s);

  return (
    <Badge color={color}>
      {isPositive ? <CheckCircle2 className='w-3 h-3' /> : <XCircle className='w-3 h-3' />} {s.charAt(0).toUpperCase() + s.slice(1)}
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
  name: yup.string().trim().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  email: yup.string().trim().email('Invalid email address').required('Email is required'),
  phone: yup.string().matches(phoneRegex, 'Invalid phone number format').optional().nullable(),
  role: yup.mixed().oneOf(['Client', 'Coach', 'Admin']).required('Role is required'),
  gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
  membership: yup.mixed().oneOf(['basic', 'gold', 'platinum']).required('Membership is required'),
  password: yup
    .string()
    .trim()
    .required('Password is required')
    .test('pwLen', 'Password must be at least 8 characters', v => v && v.length >= 8),
  coachId: yup
    .string()
    .nullable()
    .when('role', { is: 'Client', then: s => s.required('Coach is required'), otherwise: s => s.nullable().optional() }),
  subscriptionStart: yup.string().required('Start date is required'),
  subscriptionEnd: yup
    .string()
    .required('End date is required')
    .test('end-after-start', 'End date must be on/after start date', function (end) {
      const start = this.parent.subscriptionStart;
      if (!start || !end) return true;
      return new Date(end) >= new Date(start);
    }),
});

const editUserSchema = yup.object({
  name: yup.string().trim().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  email: yup.string().trim().email('Invalid email address').required('Email is required'),
  phone: yup.string().matches(phoneRegex, 'Invalid phone number format').optional().nullable(),
  role: yup.mixed().oneOf(['Client', 'Coach', 'Admin']).required('Role is required'),
  gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
  membership: yup.mixed().oneOf(['basic', 'gold', 'platinum']).required('Membership is required'),
  status: yup.mixed().oneOf(['Active', 'Pending', 'Suspended']).required('Status is required'),
  coachId: yup
    .string()
    .nullable()
    .when('role', { is: 'Client', then: s => s.required('Coach is required'), otherwise: s => s.nullable().optional() }),
  password: yup
    .string()
    .trim()
    .notRequired()
    .transform(v => (v === '' ? undefined : v))
    .test('pwLen', 'Password must be at least 8 characters', v => v === undefined || (v && v.length >= 8)),
  subscriptionStart: yup.string().required('Start date is required'),
  subscriptionEnd: yup
    .string()
    .required('End date is required')
    .test('end-after-start', 'End date must be on/after start date', function (end) {
      const start = this.parent.subscriptionStart;
      if (!start || !end) return true;
      return new Date(end) >= new Date(start);
    }),
});

/* ========================= PLAN PICKERS ========================= */
// function PlanPickerModal({ open, onClose, title, icon: Icon, fetchUrl, assignUrl, userId, onAssigned }) {
//   const [plans, setPlans] = useState([]);
//   const [selectedId, setSelectedId] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (!open) return;
//     (async () => {
//       setLoading(true);
//       try {
//         const res = await api.get(fetchUrl, { params: { limit: 200 } });
//         const arr = Array.isArray(res?.data?.records) ? res.data.records : Array.isArray(res?.data) ? res.data : [];
//         setPlans(arr.map(p => ({ id: p.id, label: p.name || `Plan ${p.id}` })));
//       } catch (e) {
//         Notification('Failed to load plans', 'error');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [open, fetchUrl]);

//   const assign = async () => {
//     if (!selectedId || !userId) return;
//     setSaving(true);
//     try {
//       await api.post(assignUrl, { userId, planId: selectedId });
//       Notification('Plan assigned successfully', 'success');
//       onAssigned();
//       onClose();
//     } catch (e) {
//       Notification(e?.response?.data?.message || 'Failed to assign plan', 'error');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <Modal open={open} onClose={onClose} title={title}>
//       <div className='space-y-4'>
//         <div className='flex items-center gap-2 text-slate-600'>
//           {Icon ? <Icon className='w-4 h-4' /> : null}
//           <span>Select one plan to assign</span>
//         </div>
//         <Select placeholder={loading ? 'Loading…' : 'Select a plan'} options={plans} value={selectedId} onChange={setSelectedId} disabled={loading} />
//         <div className='flex justify-end gap-2'>
//           <Button color='neutral' name='Cancel' onClick={onClose} />
//           <Button color='primary' name='Assign Plan' onClick={assign} loading={saving} disabled={!selectedId || saving} />
//         </div>
//       </div>
//     </Modal>
//   );
// }
function PlanPickerModal({ open, onClose, title, icon: Icon, fetchUrl, assignUrl, userId, onAssigned }) {
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // --- normalize any backend shape into what PlanPicker expects
  const normalizePlans = raw => {
    const arr = Array.isArray(raw?.records) ? raw.records : Array.isArray(raw) ? raw : [];

    return arr.map(p => {
      // name/title fallbacks
      const name = p.name || p.title || `Plan ${p.id}`;

      // "days" can be p.days / p.planDays / p.items; normalize to [{id, day, name}]
      const rawDays = p.days || p.planDays || p.items || [];
      const days = (rawDays || []).map((d, i) => ({
        id: d.id ?? `${p.id}-d${i + 1}`,
        day: d.day || d.weekday || d.label || (typeof d.dayNumber === 'number' ? `day ${d.dayNumber}` : `day ${i + 1}`),
        name: d.name || d.title || d.description || '—',
      }));

      // assignments count if present
      const assignments = p.assignments || p.activeUsers || [];
      return { id: p.id, name, days, assignments };
    });
  };

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(fetchUrl, { params: { limit: 200 } });
        setPlans(normalizePlans(res?.data));
      } catch (e) {
        Notification('Failed to load plans', 'error');
        setPlans([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, fetchUrl]);

  const assign = async planId => {
    if (!planId || !userId) return;
    setAssigning(true);
    try {
      if (assignUrl == '/plans/assign') {
        await api.post(`/plans/${planId}/assign`, {
          athleteIds: [userId],
          confirm: 'yes',
          isActive: true,
        });
      }

      if (assignUrl == '/nutrition/meal-plans/assign') {
        await api.post(`nutrition/meal-plans/${planId}/assign`, { userId: userId });
      }
      // await api.post(assignUrl, { userId, planId });
      Notification('Plan assigned successfully', 'success');
      onAssigned?.();
      onClose?.();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to assign plan', 'error');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-600'>
          {Icon ? <Icon className='w-4 h-4' /> : null}
          <span>Select one plan to assign</span>
        </div>

        {loading ? (
          // simple skeleton while loading
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='h-28 rounded-lg border border-slate-200 bg-slate-50 animate-pulse' />
            ))}
          </div>
        ) : (
          <PlanPicker buttonName='Assign' plans={plans} defaultSelectedId={selectedId} onSelect={setSelectedId} onAssign={assign} onSkip={onClose} assigning={assigning} />
        )}
      </div>
    </Modal>
  );
}

/* ========================= EDIT USER MODAL ========================= */
function EditUserModal({ open, onClose, user, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
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
      // added to mirror create step 1
      password: '', // blank means "do not change"
      subscriptionStart: user?.subscriptionStart || new Date().toISOString().slice(0, 10),
      subscriptionEnd: user?.subscriptionEnd || new Date().toISOString().slice(0, 10),
    },
    resolver: yupResolver(editUserSchema),
    mode: 'onBlur',
  });

  const roleValue = watch('role');

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
        defaultRestSeconds: user.defaultRestSeconds || 90,
        password: '',
        subscriptionStart: user.subscriptionStart || new Date().toISOString().slice(0, 10),
        subscriptionEnd: user.subscriptionEnd || new Date().toISOString().slice(0, 10),
      });
      loadCoaches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const loadCoaches = async () => {
    setLoadingCoaches(true);
    try {
      const res = await api.get('/auth/coaches/select');
      setCoaches(res.data.map(c => ({ id: c.id, label: c.label })));
    } catch {
      Notification('Failed to load coaches', 'error');
    } finally {
      setLoadingCoaches(false);
    }
  };

  const generatePassword = e => {
    e?.preventDefault?.();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let p = '';
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setValue('password', p);
    trigger('password');
    Notification('Generated a strong password', 'info');
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
        defaultRestSeconds: data.defaultRestSeconds ?? 90,
        // only send password if provided
        ...(data.password ? { password: data.password } : {}),
        // subscription fields
        subscriptionStart: data.subscriptionStart,
        subscriptionEnd: data.subscriptionEnd,
      });
      Notification('User updated successfully', 'success');
      onSaved?.();
      onClose?.();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit User • ${user?.name ?? ''}`}>
      <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Controller name='name' control={control} render={({ field }) => <Input label='Full Name' placeholder='John Doe' error={errors.name?.message} icon={<User className='w-4 h-4' />} {...field} />} />

          <Controller name='phone' control={control} render={({ field }) => <Input label='Phone' placeholder='+20 1X XXX XXXX' error={errors.phone?.message} icon={<Phone className='w-4 h-4' />} {...field} value={field.value || ''} />} />

          <Controller name='email' control={control} render={({ field }) => <Input label='Email' type='email' placeholder='name@example.com' error={errors.email?.message} icon={<Mail className='w-4 h-4' />} {...field} />} />

          {/* Password with eye + generator (blank = keep current) */}
          <div className='relative'>
            <Controller name='password' control={control} render={({ field }) => <CutomInput label='Password (leave blank to keep)' type={showPassword ? 'text' : 'password'} placeholder='••••••••' value={field.value || ''} onChange={field.onChange} error={errors.password?.message} />} />
            <div className='absolute right-2 top-9 flex items-center gap-1'>
              <Button color='neutral' className='!px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPassword(v => !v)} name='' icon={showPassword ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
              <Button color='neutral' className='!px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
            </div>
          </div>

          <Controller
            name='gender'
            control={control}
            render={({ field }) => (
              <div>
                <Select
                  label='Gender'
                  placeholder='Select gender'
                  options={[
                    { id: 'male', label: 'Male' },
                    { id: 'female', label: 'Female' },
                    { id: null, label: 'Not specified' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<Calendar className='w-4 h-4' />}
                />
                {errors.gender?.message && <p className='text-xs text-rose-600 mt-1'>{errors.gender.message}</p>}
              </div>
            )}
          />

          <Controller
            name='membership'
            control={control}
            render={({ field }) => (
              <div>
                <Select
                  label='Membership'
                  placeholder='Select membership'
                  options={[
                    { id: 'basic', label: 'Basic' },
                    { id: 'gold', label: 'Gold' },
                    { id: 'platinum', label: 'Platinum' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<Crown className='w-4 h-4' />}
                />
                {errors.membership?.message && <p className='text-xs text-rose-600 mt-1'>{errors.membership.message}</p>}
              </div>
            )}
          />

          <Controller
            name='role'
            control={control}
            render={({ field }) => (
              <div className='sm:col-span-1'>
                <Select
                  label='Role'
                  placeholder='Select role'
                  options={[
                    { id: 'Admin', label: 'Admin' },
                    { id: 'Coach', label: 'Coach' },
                    { id: 'Client', label: 'Client' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<Shield className='w-4 h-4' />}
                />
                {errors.role?.message && <p className='text-xs text-rose-600 mt-1'>{errors.role.message}</p>}
              </div>
            )}
          />

          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <div>
                <Select
                  label='Status'
                  placeholder='Select status'
                  options={[
                    { id: 'Active', label: 'Active' },
                    { id: 'Pending', label: 'Pending' },
                    { id: 'Suspended', label: 'Suspended' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<CheckCircle2 className='w-4 h-4' />}
                />
                {errors.status?.message && <p className='text-xs text-rose-600 mt-1'>{errors.status.message}</p>}
              </div>
            )}
          />

          <Controller
            name='coachId'
            control={control}
            render={({ field }) => (
              <div className='sm:col-span-1'>
                <Select label={`Coach${roleValue === 'Client' ? ' *' : ''}`} placeholder='Select coach' options={[{ id: null, label: 'No Coach' }, ...coaches]} value={field.value} onChange={field.onChange} disabled={loadingCoaches} icon={<Award className='w-4 h-4' />} />
                {errors.coachId?.message && <p className='text-xs text-rose-600 mt-1'>{errors.coachId.message}</p>}
              </div>
            )}
          />

          {/* Subscription Period Picker (same as create step 1) */}
          <div className='sm:col-span-2'>
            <Controller
              name='subscriptionStart'
              control={control}
              render={({ field }) => {
                const start = field.value;
                return <Controller name='subscriptionEnd' control={control} render={({ field: fieldEnd }) => <SubscriptionPeriodPicker startValue={start} endValue={fieldEnd.value || ''} onStartChange={v => field.onChange(v)} onEndChange={v => fieldEnd.onChange(v)} errorStart={errors.subscriptionStart?.message} errorEnd={errors.subscriptionEnd?.message} />} />;
              }}
            />
          </div>
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-slate-200'>
          <Button color='neutral' name='Cancel' onClick={onClose} />
          <Button color='primary' type='submit' name='Save Changes' loading={saving} disabled={!isDirty || saving} />
        </div>
      </form>
    </Modal>
  );
}

/* ========================= CREATE CLIENT WIZARD ========================= */
const MEMBERSHIPS = ['Basic', 'Gold', 'Platinum'].map(m => ({ id: m.toLowerCase(), label: m }));
const ROLE_OPTIONS = [
  { id: 'Client', label: 'Client' },
  { id: 'Coach', label: 'Coach' },
  { id: 'Admin', label: 'Admin' },
];
const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

function CreateClientWizard({ open, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [assigningW, setAssigningW] = useState(false);
  const [assigningM, setAssigningM] = useState(false);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [summaryPhone, setSummaryPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { usersByRole, fetchUsers } = useValues();
  useEffect(() => {
    fetchUsers('coach');
  }, []);
  const optionsCoach = usersByRole['coach'] || [];

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', email: '', phone: '', role: 'Client', gender: 'male', membership: 'basic', password: '', coachId: null },
    resolver: yupResolver(accountSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) {
      setStep(1);
      setCreatedUser(null);
      setSelectedMeal(null);
      setSelectedWorkout(null);
      setShowPassword(false);
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (open && step === 2) {
      (async () => {
        try {
          const res = await api.get('/plans', { params: { limit: 200 } });
          setWorkoutPlans(res.data.records);
        } catch {
          Notification('Failed to load workout plans', 'error');
        }
      })();
    }
    if (open && step === 3) {
      (async () => {
        try {
          const res = await api.get('/nutrition/meal-plans', { params: { limit: 200 } });
          setMealPlans(res?.data?.records);
        } catch {
          Notification('Failed to load meal plans', 'error');
        }
      })();
    }
  }, [open, step, workoutPlans.length, mealPlans.length]);

  const generatePassword = e => {
    e?.preventDefault?.();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let p = '';
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setValue('password', p);
    trigger('password');
    Notification('Generated a strong password', 'info');
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
        membership: data.membership,
        password: data.password || undefined,
        coachId: data.coachId || null,
        subscriptionStart: data.subscriptionStart,
        subscriptionEnd: data.subscriptionEnd,
      };
      const res = await api.post('/auth/admin/users', body);
      const user = res?.data || {};
      setCreatedUser(user);
      setSummaryPhone(data.phone || '');

      if (data.role !== 'Client') {
        setStep(4);
        Notification('Account created', 'success');
        onDone?.();
        return;
      }

      setStep(2);
      Notification('Account created', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Create failed', 'error');
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
      setStep(3);
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to assign workout plan', 'error');
    } finally {
      setAssigningW(false);
    }
  };

  const handleAssign = async mealPlanId => {
    setAssigningM(true);
    try {
      if (mealPlanId) {
        await api.post(`nutrition/meal-plans/${mealPlanId}/assign`, { userId: createdUser.user.id });
      }
      setStep(4);
      onDone?.();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to assign meal plan', 'error');
    } finally {
      setAssigningM(false);
    }
  };

  const stepTitle = step === 1 ? 'Create Account' : step === 2 ? 'Choose a workout plan (optional)' : step === 3 ? 'Choose a meal plan (optional)' : 'Account Created Successfully';
  const [lang, setLang] = useState('en'); // 'en' | 'ar'

  const email = createdUser?.email || getValues('email');
  const pwd = getValues('password');
  const role = getValues('role');

  const handleSend = () => {
    const link = buildWhatsAppLink({
      phone: summaryPhone,
      email,
      password: pwd,
      role,
      lang,
    });
    if (!link) return Notification('Enter a phone number to send via WhatsApp', 'warning');
    window.open(link, '_blank');
  };

  return (
    <Modal open={open} onClose={onClose} title={`New User • ${stepTitle}`}>
      <Stepper step={step} steps={4} />
      {step === 1 && (
        <form className='space-y-3' onSubmit={handleSubmit(onSubmitAccount)}>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <Controller name='name' control={control} render={({ field }) => <Input label='Full Name' placeholder='John Doe' error={errors.name?.message} {...field} />} />
            <Controller name='phone' control={control} render={({ field }) => <Input label='Phone' placeholder='+20 1X XXX XXXX' error={errors.phone?.message} {...field} value={field.value || ''} />} />

            <Controller name='email' control={control} render={({ field }) => <Input label='Email' type='email' placeholder='name@example.com' error={errors.email?.message} {...field} />} />
            <div className='relative'>
              <Controller
                name='password'
                control={control}
                render={
                  ({ field }) => (
                    // <CutomInput />
                    <CutomInput label='Password' type={showPassword ? 'text' : 'password'} placeholder='••••••••' value={field.value} onChange={field.onChange} error={errors.password?.message} />
                  )
                  // <Input label='Password' type={showPassword ? 'text' : 'password'} placeholder='••••••••' value={field.value} onChange={field.onChange} error={errors.password?.message} />
                }
              />
              <div className='absolute right-2 top-9 flex items-center gap-1'>
                <Button color='neutral' className='!px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPassword(v => !v)} name='' icon={showPassword ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
                <Button color='neutral' className='!px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
              </div>
            </div>

            <Controller
              name='gender'
              control={control}
              render={({ field }) => (
                <div>
                  <Select label='Gender' placeholder='Select gender' options={GENDER_OPTIONS} value={field.value} onChange={field.onChange} />
                  {errors.gender?.message && <p className='text-xs text-rose-600 mt-1'>{errors.gender.message}</p>}
                </div>
              )}
            />

            <Controller
              name='membership'
              control={control}
              render={({ field }) => (
                <div>
                  <Select label='Membership' placeholder='Select membership' options={MEMBERSHIPS} value={field.value} onChange={field.onChange} />
                  {errors.membership?.message && <p className='text-xs text-rose-600 mt-1'>{errors.membership.message}</p>}
                </div>
              )}
            />

            <Controller
              name='role'
              control={control}
              render={({ field }) => (
                <div>
                  <Select label='Role' placeholder='Select role' options={ROLE_OPTIONS} value={field.value} onChange={field.onChange} />
                  {errors.role?.message && <p className='text-xs text-rose-600 mt-1'>{errors.role.message}</p>}
                </div>
              )}
            />
            <Controller
              name='coachId'
              control={control}
              render={({ field }) => (
                <div>
                  <Select
                    label='Coach'
                    placeholder={'Select Coach'}
                    options={optionsCoach} // expects [{ id, label }]
                    value={field.value}
                    onChange={field.onChange}
                    icon={<Award className='w-4 h-4' />}
                  />
                  {errors.coachId?.message && <p className='text-xs text-rose-600 mt-1'>{errors.coachId.message}</p>}
                </div>
              )}
            />

            <div className='sm:col-span-2'>
              <Controller
                name='subscriptionStart'
                control={control}
                defaultValue={new Date().toISOString().slice(0, 10)} // YYYY-MM-DD
                render={({ field }) => {
                  const start = field.value;
                  return <Controller name='subscriptionEnd' control={control} render={({ field: fieldEnd }) => <SubscriptionPeriodPicker startValue={start} endValue={fieldEnd.value || ''} onStartChange={v => field.onChange(v)} onEndChange={v => fieldEnd.onChange(v)} errorStart={errors.subscriptionStart?.message} errorEnd={errors.subscriptionEnd?.message} />} />;
                }}
              />
            </div>
          </div>

          <button type='submit' disabled={creating || isSubmitting} className={` flex ml-auto rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700`}>
            {creating || isSubmitting ? 'Creating…' : 'Create & Next'}
          </button>
        </form>
      )}
      {step === 2 && (
        <div className='space-y-3'>
          <PlanPicker plans={workoutPlans} defaultSelectedId={selectedWorkout} onSelect={setSelectedWorkout} onSkip={() => setStep(3)} onAssign={() => assignWorkout(selectedWorkout)} assigning={assigningW} />
        </div>
      )}
      {step === 3 && (
        <div className='space-y-3'>
          <MealPlanPicker
            meals={mealPlans}
            onBack={() => setStep(2)}
            onSkip={() => {
              setStep(4);
              onDone?.();
            }}
            onAssign={handleAssign}
            assigning={assigningM}
          />
        </div>
      )}
      {step === 4 && (
        <div className='space-y-4'>
          {/* Success Banner */}
          <div className='flex-1'>
            <p className='text-sm text-emerald-700/80'>Credentials are ready. You can copy & share via WhatsApp below.</p>

            <div className='mt-3 grid gap-2'>
              <FieldRow icon={<Mail className='h-4 w-4' />} label='Email' value={createdUser?.email || getValues('email')} canCopy />

              <PasswordRow label='Password' value={getValues('password') ? getValues('password') : 'sent to email (or set by admin)'} canCopy={Boolean(getValues('password'))} />
            </div>
          </div>

          {/* WhatsApp Share */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <Input label='Phone (for WhatsApp)' value={summaryPhone} onChange={setSummaryPhone} placeholder='e.g., 2012xxxxxxx' />

            <div className='sm:col-span-2 flex items-end justify-end gap-2'>
              <LanguageToggle value={lang} onChange={setLang} />
              <Button color='green' className='!w-fit text-base' name={'Send via WhatsApp'} icon={<MessageCircle size={16} />} onClick={handleSend} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ========================= MAIN PAGE ========================= */
export default function UsersList() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [myRole, setMyRole] = useState('Client');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, pendingUsers: 0, suspendedUsers: 0, admins: 0, coaches: 0, clients: 0, withPlans: 0, withoutPlans: 0 });
  const [searchText, setSearchText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [hasPlanFilter, setHasPlanFilter] = useState('All');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pickerWorkout, setPickerWorkout] = useState({ open: false, user: null });
  const [pickerMeal, setPickerMeal] = useState({ open: false, user: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchText.trim()), 350);
    return () => clearTimeout(t);
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
        defaultRestSeconds: u.defaultRestSeconds || 90,
        gender: u.gender || null,
      }));

      setRows(mapped);
      setTotal(totalRecords);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load users');
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
  }, [page, sortBy, sortOrder, debounced]);

  const filtered = useMemo(
    () =>
      rows
        .filter(r => (roleFilter === 'All' ? true : r.role === roleFilter))
        .filter(r => (statusFilter === 'All' ? true : r.status === statusFilter))
        .filter(r => (hasPlanFilter === 'All' ? true : hasPlanFilter === 'With plan' ? !!r.activePlanId : !r.activePlanId)),
    [rows, roleFilter, statusFilter, hasPlanFilter],
  );

  const setStatusApi = async (userId, statusLower) => {
    try {
      await api.put(`/auth/status/${userId}`, { status: statusLower });
      fetchUsers();
      fetchStats();
      Notification(`Status updated to ${toTitle(statusLower)}`, 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const toggleActive = row => {
    const s = String(row.status).toLowerCase();
    return setStatusApi(row.id, s === 'active' ? 'suspended' : 'active');
  };

  const approveUser = row => setStatusApi(row.id, 'active');
  const suspendUser = row => setStatusApi(row.id, 'suspended');

  const deleteUser = async row => {
    if (!confirm(`Are you sure you want to delete ${row.name}? This action cannot be undone.`)) return;

    try {
      await api.delete(`/auth/user/${row.id}`);
      fetchUsers();
      fetchStats();
      Notification('User deleted successfully', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const buildRowActions = row => {
    const viewer = String(myRole || '').toLowerCase();
    const isAdmin = viewer === 'admin';
    const canCoachManage = viewer === 'coach';
    const canManage = isAdmin || canCoachManage;

    const I = (Icon, cls = '') => <Icon className={`h-4 w-4 ${cls}`} />;

    const opts = [
      {
        icon: I(Eye, 'text-slate-600'),
        label: 'Open Profile',
        onClick: () => (window.location.href = `/dashboard/users/${row.id}`),
        className: 'hover:text-slate-800',
      },
      {
        icon: I(PencilLine, 'text-indigo-600'),
        label: 'Edit Details',
        onClick: () => {
          setSelectedUser(row);
          setEditUserOpen(true);
        },
        className: 'hover:text-indigo-700',
      },
    ];

    if (canManage) {
      opts.push(
        {
          icon: I(Dumbbell, 'text-violet-600'),
          label: 'Assign Workout',
          onClick: () => setPickerWorkout({ open: true, user: row }),
          className: 'hover:text-violet-700',
        },
        {
          icon: I(Utensils, 'text-amber-600'),
          label: 'Assign Meal',
          onClick: () => setPickerMeal({ open: true, user: row }),
          className: 'hover:text-amber-700',
        },
      );

      const s = String(row.status || '').toLowerCase();
      if (s === 'pending') {
        opts.push({
          icon: I(CheckCircle2, 'text-emerald-600'),
          label: 'Approve Member',
          onClick: () => approveUser(row),
          className: 'hover:text-emerald-700',
        });
      }

      if (s === 'active') {
        opts.push({
          icon: I(PauseCircle, 'text-amber-600'),
          label: 'Suspend Account',
          onClick: () => suspendUser(row),
          className: 'hover:text-amber-700',
        });
      } else if (s === 'suspended') {
        opts.push({
          icon: I(PlayCircle, 'text-emerald-600'),
          label: 'Activate Account',
          onClick: () => approveUser(row),
          className: 'hover:text-emerald-700',
        });
      }
    }

    if (isAdmin) {
      opts.push(
        {
          icon: I(PhoneCall, 'text-green-600'),
          label: 'WhatsApp Chat',
          onClick: () => {
            const phone = String(row.phone || '').replace(/[^0-9]/g, '');
            if (!phone) return Notification('No valid phone number found for this user', 'error');
            window.open(`https://wa.me/${phone}`, '_blank');
          },
          className: 'hover:text-green-700',
        },
        {
          icon: I(MessageSquare, 'text-sky-600'),
          label: 'Direct Chat',
          onClick: () => window.open(`/dashboard/chat?userId=${row.id}`, '_blank'),
          className: 'hover:text-sky-700',
        },
        {
          icon: I(Trash2, 'text-rose-600'),
          label: 'Delete Member',
          onClick: () => deleteUser(row),
          className: 'text-rose-600 hover:text-rose-700',
        },
      );
    }

    return opts;
  };

  const columns = [
    { header: 'Name', accessor: 'name', className: 'text-nowrap' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role', cell: r => <RolePill role={r.role} /> },
    { header: 'Gender', accessor: 'gender', cell: r => <StatusPill status={r.gender} /> },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Membership', accessor: 'membership' },
    { header: 'Exercise Plan', accessor: 'planName' },
    { header: 'Meal Plan', accessor: 'planMealName' },
    {
      header: 'Coach',
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
    { header: 'Join Date', accessor: 'joinDate', className: 'text-nowrap' },
    { header: 'Status', accessor: 'status', cell: r => <StatusPill status={r.status} /> },
    {
      header: 'Days Left',
      accessor: 'daysLeft',
      cell: r => {
        if (!r.subscriptionStart || !r.subscriptionEnd) return <span className='text-slate-400'>—</span>;

        const today = new Date();
        const end = new Date(r.subscriptionEnd);
        const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24)); // convert ms to days

        if (diff < 0) return <span className='text-red-500 font-medium'>Expired</span>;

        return <span className={`font-medium ${diff <= 3 ? 'text-red-500' : diff <= 7 ? 'text-orange-500' : 'text-emerald-600'}`}>{diff || '0'} days</span>;
      },
    },
    {
      header: 'Actions',
      accessor: '_actions',
      cell: r => <ActionsMenu options={buildRowActions(r)} align='right' />,
    },
  ];

  const toggleSort = field => {
    if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const toSelectOptions = arr => arr.map(o => ({ id: o.id, label: o.name }));

  const FILTER_ROLE_OPTIONS = [
    { id: 'All', name: 'All roles' },
    { id: 'Admin', name: 'Admin' },
    { id: 'Coach', name: 'Coach' },
    { id: 'Client', name: 'Client' },
  ];

  const FILTER_STATUS_OPTIONS = [
    { id: 'All', name: 'All statuses' },
    { id: 'Active', name: 'Active' },
    { id: 'Pending', name: 'Pending' },
    { id: 'Suspended', name: 'Suspended' },
  ];

  const FILTER_PLAN_OPTIONS = [
    { id: 'All', name: 'All plans' },
    { id: 'With plan', name: 'With plan' },
    { id: 'No plan', name: 'No plan' },
  ];

  return (
    <div className='space-y-6'>
      <div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
        {/* Background Decorations */}
        <div className='absolute inset-0'>
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
          <div className='absolute inset-0 opacity-15' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)', backgroundSize: '22px 22px', backgroundPosition: '-1px -1px' }} />
          <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
        </div>

        <div className='relative p-6 sm:p-8  text-white'>
          {/* Header Section */}
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 '>
            <div>
              <h1 className='text-2xl md:text-4xl font-semibold'>User Management</h1>
              <p className='text-white/85 mt-1'>Manage clients, coaches and admins with full control.</p>
            </div>

            <button onClick={() => setWizardOpen(true)} className='group relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm  font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30 transition-transform active:scale-[.98]'>
              <Plus size={16} />
              <span>Create New User</span>
            </button>
          </div>

          {/* Stats Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-3'>
            {/* <StatCard icon={Users} title='Total Users' value={stats.totalUsers} /> */}
            <StatCardArray icon={Users} title={['Total Users', 'Active', 'Suspended']} value={[stats.totalUsers, stats.activeUsers, stats.suspendedUsers]} />
            <StatCardArray icon={Shield} title={['Admins', 'Coaches', 'Clients']} value={[stats.admins, stats.coaches, stats.clients]} />
            <StatCardArray icon={ListChecks} title={['With Exercise Plan', 'Without Exercise Plans']} value={[stats.withPlans, stats.withoutPlans]} />
            <StatCardArray icon={ListChecks} title={['With Meals Plans', 'Without Meals Plans']} value={[stats.withMealPlans || 0, stats.withoutMealPlans || 0]} />
          </motion.div>
        </div>
      </div>

      {/* Filters + search */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='flex-1'>
          <div className='relative w-full md:w-60'>
            <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder='Search name, email, phone...'
              className='h-[40px] w-full pl-10 pr-3 rounded-lg bg-white text-black border border-slate-300 font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition'
            />
          </div>
        </div>

        <Select
          className='!max-w-[150px] !w-full'
          placeholder='Role'
          options={toSelectOptions(FILTER_ROLE_OPTIONS)}
          value={roleFilter}
          onChange={id => {
            setRoleFilter(id);
            setPage(1);
          }}
        /> 
        <Select
          className='!max-w-[150px] !w-full'
          placeholder='Plan'
          options={toSelectOptions(FILTER_PLAN_OPTIONS)}
          value={hasPlanFilter}
          onChange={id => {
            setHasPlanFilter(id);
            setPage(1);
          }}
        />
        <button onClick={() => toggleSort('created_at')} className='bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-lg text-black border border-slate-300 font-medium text-sm hover:border-indigo-400 transition'>
          <Clock size={16} />
          <span>Newest</span>
          {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null}
        </button>
      </div>

      {/* Table */}
      <div className='space-y-4'>
        {err && <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div>}
        <div className='card-glow overflow-hidden'>
          <DataTable columns={columns} data={filtered} loading={loading} itemsPerPage={limit} pagination selectable={false} serverPagination page={page} onPageChange={setPage} totalRows={total} />
        </div>
      </div>

      {/* Modals */}
      <CreateClientWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onDone={() => {
          fetchUsers();
          fetchStats();
        }}
      />

      <EditUserModal
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
        title={`Assign Workout Plan${pickerWorkout.user ? ` • ${pickerWorkout.user.name}` : ''}`}
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
        title={`Assign Meal Plan${pickerMeal.user ? ` • ${pickerMeal.user.name}` : ''}`}
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

// rough Input example
export function CutomInput({ value, onChange, onBlur, name, inputRef, className, cnInput, ...rest }) {
  return (
    <div className={`w-full relative ${className}`}>
      {rest.label && <label className='mb-1.5 block text-sm font-medium text-slate-700'>{rest.label}</label>}
      <div className='border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 relative flex items-center rounded-lg border bg-white focus-within:ring-4 focus-within:ring-indigo-100 transition-colors'>
        <input {...rest} ref={inputRef} name={name} value={value} onChange={onChange} onBlur={onBlur} className={`${cnInput} h-[43px] w-full rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-gray-400`} />
      </div>
      {rest.error && <p className='mt-1 text-xs text-red-600'>{rest.error}</p>}
    </div>
  );
}
