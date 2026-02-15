'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import {
	CalendarDays, Plus, Users as UsersIcon, CheckCircle2, XCircle, Shield,
	ChevronUp, ChevronDown, Eye, Clock, BadgeCheck, PencilLine, PauseCircle,
	PlayCircle, MessageSquare, PhoneCall, ListChecks, Trash2, EyeOff,
	Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, Edit3,
	KeyRound, Copy, User, Mail, Phone, Calendar, Crown, Award, Users,
	ClipboardList, UserCheck, UserCog, UserCircle, ExternalLink, RefreshCw,
	AlertCircle
} from 'lucide-react';

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
import {
	Stepper, PlanPicker, MealPlanPicker, FieldRow, PasswordRow,
	buildWhatsAppLink, SubscriptionPeriodPicker
} from '@/components/pages/dashboard/users/Atoms';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminCoaches } from '@/hooks/useHierarchy';
import { useUser } from '@/hooks/useUser';
import PhoneField from '@/components/atoms/PhoneField';
import CaloriesStep from '@/components/pages/dashboard/users/CaloriesStep';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

/* ---------- helpers ---------- */
const toTitle = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const normRole = r => (['ADMIN', 'COACH', 'CLIENT'].includes(String(r || '').toUpperCase()) ? toTitle(r) : 'Client');

/* ========================= THEME-AWARE BADGE ========================= */
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
		// theme-primary badge uses CSS vars
		primary: '',
	};

	const style = color === 'primary' ? {
		backgroundColor: 'color-mix(in srgb, var(--color-primary-500) 12%, white)',
		color: 'var(--color-primary-700)',
		boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-primary-500) 18%, transparent)',
	} : {};

	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${color === 'primary' ? 'ring-transparent' : (map[color] || map.slate)}`}
			style={style}
		>
			{children}
		</span>
	);
}

const COLOR_MAP = {
	active: 'green', pending: 'amber', suspended: 'red',
	admin: 'violet', coach: 'blue', client: 'emerald',
	male: 'sky', female: 'pink'
};
const normStatus = s => (s ? String(s).trim().toLowerCase() : 'pending');

const StatusPill = ({ status, viewerRole }) => {
	const s = normStatus(status);
	const color = COLOR_MAP[s] || 'slate';
	const ok = ['active', 'coach', 'client', 'admin', 'male', 'female'].includes(s);

	let label = s.charAt(0).toUpperCase() + s.slice(1);
	if (viewerRole && viewerRole.toLowerCase() === 'coach' && s === 'pending') {
		// For coaches, make "pending" clearer as an approval state
		label = 'Under review';
	}

	return (
		<Badge color={color}>
			{ok ? <CheckCircle2 className='w-3 h-3' /> : <XCircle className='w-3 h-3' />}
			{label}
		</Badge>
	);
};

const RolePill = ({ role }) => {
	const r = normRole(role);
	// Admin uses theme primary color
	if (r === 'Admin') {
		return (
			<Badge color='primary'>
				<Shield className='w-3 h-3' /> {r}
			</Badge>
		);
	}
	const color = r === 'Coach' ? 'violet' : 'slate';
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
	membership: yup.mixed().oneOf(['basic', 'gold', 'platinum']).when('role', {
		is: 'Client',
		then: s => s.required('errors.membershipRequired'),
		otherwise: s => s.optional().nullable(),
	}),
	password: yup.string().trim().required('errors.passwordRequired')
		.test('pwLen', 'errors.passwordMin', v => v && v.length >= 8),
	coachId: yup.string().nullable().when('role', {
		is: 'Client',
		then: s => s.required('errors.coachRequired'),
		otherwise: s => s.nullable().optional()
	}),
	subscriptionStart: yup.string().when('role', {
		is: 'Client',
		then: s => s.required('errors.startRequired'),
		otherwise: s => s.optional().nullable(),
	}),
	subscriptionEnd: yup.string()
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
	status: yup.mixed().required('errors.statusRequired'),
	coachId: yup.string().nullable().when('role', {
		is: 'Client',
		then: s => s.required('errors.coachRequired'),
		otherwise: s => s.nullable().optional()
	}),
	password: yup.string().trim().notRequired()
		.transform(v => (v === '' ? undefined : v))
		.test('pwLen', 'errors.passwordMin', v => v === undefined || (v && v.length >= 8)),
	subscriptionStart: yup.string().required('errors.startRequired'),
	subscriptionEnd: yup.string().required('errors.endRequired')
		.test('end-after-start', 'errors.endAfterStart', function (end) {
			const start = this.parent.subscriptionStart;
			if (!start || !end) return true;
			return new Date(end) >= new Date(start);
		}),
});

/* ========================= SHARED MINI UI ========================= */

/* Theme-aware ToggleGroup */
export function ToggleGroup({ label, options = [], value, onChange, error, className = '' }) {
	const handleKey = useCallback(e => {
		if (!options.length) return;
		const idx = Math.max(0, options.findIndex(o => o.id === value));
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			onChange?.(options[(idx + 1) % options.length].id);
		}
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			onChange?.(options[(idx - 1 + options.length) % options.length].id);
		}
	}, [options, value, onChange]);

	// Active style uses theme CSS vars
	const activeStyle = {
		background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
		boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 35%, transparent)',
	};
	const activeRingStyle = {
		boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-primary-400) 50%, transparent)',
	};

	return (
		<div className={className}>
			{label && <label className='mb-2 block text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>{label}</label>}

			<motion.div
				role='radiogroup'
				aria-label={typeof label === 'string' ? label : undefined}
				onKeyDown={handleKey}
				initial={{ opacity: 0, y: 4 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, ease: 'easeOut' }}
				className='relative flex flex-wrap gap-2'
			>
				{options.map(opt => {
					const active = value === opt.id;
					return (
						<motion.button
							key={opt.id ?? 'none'}
							type='button'
							role='radio'
							aria-checked={active}
							onClick={() => onChange?.(opt.id)}
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.96 }}
							transition={{ type: 'spring', stiffness: 400, damping: 30 }}
							className='relative px-4 py-[7px] rounded-lg text-sm select-none focus:outline-none transition-all duration-200'
							style={active ? {
								...activeStyle,
								color: '#fff',
								border: '1px solid transparent',
							} : {
								background: '#fff',
								color: '#475569',
								border: '1px solid #cbd5e1',
							}}
						>
							{/* Glow layer for active */}
							<AnimatePresence>
								{active && (
									<motion.span
										layoutId='toggleGlow'
										className='absolute inset-0 rounded-lg'
										style={activeRingStyle}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.18 }}
									/>
								)}
							</AnimatePresence>

							{/* Hover state for inactive */}
							{!active && (
								<span
									className='absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200'
									style={{ background: 'color-mix(in srgb, var(--color-primary-500) 6%, white)', border: '1px solid color-mix(in srgb, var(--color-primary-500) 40%, transparent)' }}
								/>
							)}

							<span className='relative z-10 font-semibold'>{opt.label}</span>
						</motion.button>
					);
				})}
			</motion.div>

			<AnimatePresence>
				{error && (
					<motion.p key='error' className='text-xs text-rose-500 mt-1.5 flex items-center gap-1' initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
						<XCircle className='w-3 h-3' /> {error}
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ========================= PLAN PICKER MODAL ========================= */
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

	const loadPlans = async () => {
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
	};

	useEffect(() => {
		if (!open) return;
		setSelectedId(null);
		setVisible(6);
		loadPlans();
	}, [open, fetchUrl]);

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
	const isWorkout = assignUrl === '/plans/assign';
	const createUrl = isWorkout ? '/workouts/plans' : '/nutrition/meal-plans/create';

	return (
		<Modal open={open} onClose={onClose} title={title}>
			<div className='space-y-4'>
				{/* Header row: description + action buttons */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2 text-slate-500'>
						{Icon && <Icon className='w-4 h-4' />}
						<span className='text-sm'>{t('pickers.selectOne')}</span>
					</div>
					<div className='flex items-center gap-2'>
						{/* Refresh button */}
						<button
							type='button'
							onClick={loadPlans}
							disabled={loading}
							className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200 disabled:opacity-50'
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
							{t('common.refresh') || 'Refresh'}
						</button>
						{/* Create new plan button */}
						<button
							type='button'
							onClick={() => window.open(createUrl, '_blank')}
							className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-sm'
							style={{
								background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
								boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
							}}
						>
							<Plus className='w-3.5 h-3.5' />
							{isWorkout ? (t('pickers.createWorkout') || 'New Workout') : (t('pickers.createMeal') || 'New Meal Plan')}
							<ExternalLink className='w-3 h-3 opacity-70' />
						</button>
					</div>
				</div>

				{loading ? (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className='h-28 rounded-lg border border-slate-200 bg-slate-50 animate-pulse' />
						))}
					</div>
				) : (
					<>
						<PlanPicker
							buttonName={t('common.assign')}
							plans={shown}
							defaultSelectedId={selectedId}
							onSelect={setSelectedId}
							onAssign={() => assign(selectedId)}
							onSkip={onClose}
							assigning={assigning}
							hideSearch
						/>
						{canMore && (
							<div className='flex justify-center'>
								<Button name={t('common.seeMore')} color='neutral' onClick={() => setVisible(v => v + 6)} />
							</div>
						)}
					</>
				)}
			</div>
		</Modal>
	);
}

/* ========================= EDIT USER MODAL ========================= */
function EditUserModal({ open, onClose, user, onSaved, optionsCoach }) {
	const t = useTranslations('users');
	const viewer = useUser();
	const viewerRole = String(viewer?.role || 'Client').toLowerCase();
	const isCoachViewer = viewerRole === 'coach';
	const [saving, setSaving] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const { control, handleSubmit, formState: { errors, isDirty }, reset, setValue, trigger, watch, setError, clearErrors } = useForm({
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
	}, [open, user, reset]);

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
				name: data.name, email: data.email, phone: data.phone || null,
				gender: data.gender ?? null, membership: data.membership,
				status: data.status.toLowerCase(), role: data.role.toLowerCase(),
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

	const subscriptionStart = watch('subscriptionStart');
	const subscriptionEnd = watch('subscriptionEnd');

	return (
		<Modal open={open} onClose={onClose} title={`${t('editUser')} • ${user?.name ?? ''}`}>
			<form className='space-y-5' onSubmit={handleSubmit(onSubmit)}>
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
					<Controller name='name' control={control} render={({ field }) => <Input label={t('fields.fullName')} placeholder={t('placeholders.fullName')} error={t(errors.name?.message)} icon={<User className='w-4 h-4' />} {...field} />} />
					<Controller name='phone' control={control} render={({ field }) => (
						<PhoneField label={t('fields.phone')} value={field.value || ''} onChange={field.onChange}
							error={errors.phone?.message ? t(errors.phone.message) : ''} name={field.name}
							setError={setError} clearErrors={clearErrors} t={t} />
					)} />
					<Controller name='email' control={control} render={({ field }) => <Input label={t('fields.email')} type='email' placeholder={t('placeholders.email')} error={errors.email && t(errors.email?.message)} icon={<Mail className='w-4 h-4' />} {...field} />} />

					{/* Password field */}
					<div className='relative'>
						<Controller name='password' control={control} render={({ field }) => (
							<CutomInput label={t('fields.passwordEdit')} type={showPassword ? 'text' : 'password'} placeholder='••••••••'
								value={field.value || ''} onChange={field.onChange}
								error={errors.password?.message ? t(errors.password.message) : undefined} />
						)} />
						<div className='absolute rtl:left-2 ltr:right-2 top-9 flex items-center gap-1'>
							<Button color='neutral' className='!min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPassword(v => !v)} name='' icon={showPassword ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
							<Button color='neutral' className='!min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
						</div>
					</div>

					<Controller name='gender' control={control} render={({ field }) => (
						<ToggleGroup label={t('fields.gender')} value={field.value} onChange={field.onChange}
							options={[{ id: 'male', label: t('gender.male') }, { id: 'female', label: t('gender.female') }]}
							error={errors.gender?.message ? t(errors.gender.message) : undefined} />
					)} />

					<Controller name='membership' control={control} render={({ field }) => (
						<ToggleGroup label={t('fields.membership')} value={field.value} onChange={field.onChange}
							options={[{ id: 'basic', label: t('membership.basic') }, { id: 'gold', label: t('membership.gold') }, { id: 'platinum', label: t('membership.platinum') }]}
							error={errors.membership?.message ? t(errors.membership.message) : undefined} />
					)} />

					{!isCoachViewer && (
						<Controller name='role' control={control} render={({ field }) => (
							<div className='sm:col-span-1'>
								<Select
									label={t('fields.role')}
									placeholder={t('placeholders.role')}
									searchable={false}
									clearable={false}
									options={[
										{ id: 'Admin', label: t('roles.admin') },
										{ id: 'Coach', label: t('roles.coach') },
										{ id: 'Client', label: t('roles.client') },
									]}
									value={field.value}
									onChange={field.onChange}
									icon={<Shield className='w-4 h-4' />}
								/>
								{errors.role?.message && <p className='text-xs text-rose-500 mt-1'>{t(errors.role.message)}</p>}
							</div>
						)} />
					)}

					<Controller name='status' control={control} render={({ field }) => (
						<div>
							<Select label={t('fields.status')} placeholder={t('placeholders.status')} searchable={false} clearable={false}
								options={[{ id: 'Active', label: t('status.active') }, { id: 'Pending', label: t('status.pending') }, { id: 'Suspended', label: t('status.suspended') }]}
								value={field.value} onChange={field.onChange} icon={<CheckCircle2 className='w-4 h-4' />} />
							{errors.status?.message && <p className='text-xs text-rose-500 mt-1'>{t(errors.status.message)}</p>}
						</div>
					)} />

					<Controller name='coachId' control={control} render={({ field }) => (
						<div className='sm:col-span-1'>
							<Select label={t('fields.coach')} placeholder={t('placeholders.coach')} options={optionsCoach}
								value={field.value} onChange={field.onChange} icon={<Award className='w-4 h-4' />} />
							{errors.coachId?.message && <p className='text-xs text-rose-500 mt-1'>{t(errors.coachId.message)}</p>}
						</div>
					)} />

					<div className='sm:col-span-2'>
						<SubscriptionPeriodPicker startValue={subscriptionStart} endValue={subscriptionEnd} setValue={setValue}
							errorStart={errors.subscriptionStart?.message ? t(errors.subscriptionStart.message) : undefined}
							errorEnd={errors.subscriptionEnd?.message ? t(errors.subscriptionEnd.message) : undefined} />
					</div>
				</div>

				<div className='flex justify-end gap-2.5 pt-5 border-t border-slate-100'>
					<Button color='neutral' name={t('common.cancel')} onClick={onClose} />
					<Button color='primary' type='submit' name={t('common.saveChanges')} loading={saving} disabled={saving} />
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
	const viewer = useUser();
	const viewerRole = String(viewer?.role || 'Client').toLowerCase();
	const isCoachViewer = viewerRole === 'coach';

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
	const [loadingWorkouts, setLoadingWorkouts] = useState(false);
	const [loadingMeals, setLoadingMeals] = useState(false);

	const stepsClient = ['account', 'workout', 'meal', 'calories', 'send'];
	const stepsCoach = ['account', 'send'];
	const steps = roleAtCreation === 'Coach' ? stepsCoach : stepsClient;
	const currentStep = steps[stepIndex];

	const today = new Date();
	const defaultStart = today.toISOString().slice(0, 10);
	const plus3 = new Date(today);
	plus3.setMonth(plus3.getMonth() + 3);
	const defaultEnd = plus3.toISOString().slice(0, 10);

	const { control, handleSubmit, setValue, getValues, reset, trigger, watch, formState: { errors, isSubmitting }, setError, clearErrors } = useForm({
		defaultValues: {
			name: '', email: '', phone: '', role: 'Client', gender: 'male',
			membership: 'basic', password: '', coachId: null,
			subscriptionStart: defaultStart, subscriptionEnd: defaultEnd,
		},
		resolver: yupResolver(accountSchema),
		mode: 'onBlur',
	});

	const roleWatch = watch('role');
	useEffect(() => {
		if (isCoachViewer) {
			// Coaches can only create clients
			setRoleAtCreation('Client');
		} else {
			setRoleAtCreation(roleWatch);
		}
	}, [roleWatch, isCoachViewer]);

	useEffect(() => {
		if (!open) {
			setStepIndex(0); setCreatedUser(null); setSelectedWorkout(null);
			setVisibleWorkouts(6); setVisibleMeals(6); setShowPassword(false);
			reset();
		}
	}, [open, reset]);

	/* ---------- Fetch workout plans ---------- */
	const fetchWorkoutPlans = async () => {
		setLoadingWorkouts(true);
		try {
			const res = await api.get('/plans', { params: { limit: 200 } });
			setWorkoutPlans(res.data.records || []);
		} catch {
			Notification(t('alerts.loadWorkoutFailed'), 'error');
		} finally {
			setLoadingWorkouts(false);
		}
	};

	/* ---------- Fetch meal plans ---------- */
	const fetchMealPlans = async () => {
		setLoadingMeals(true);
		try {
			const res = await api.get('/nutrition/meal-plans', { params: { limit: 200 } });
			setMealPlans(res?.data?.records || []);
		} catch {
			Notification(t('alerts.loadMealFailed'), 'error');
		} finally {
			setLoadingMeals(false);
		}
	};

	useEffect(() => {
		if (!open) return;
		if (currentStep === 'workout') fetchWorkoutPlans();
		if (currentStep === 'meal') fetchMealPlans();
	}, [open, currentStep]);

	const generatePassword = e => {
		e?.preventDefault?.();
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
		let p = '';
		for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
		setValue('password', p); trigger('password');
		Notification(t('alerts.passwordGenerated'), 'info');
	};

	const onSubmitAccount = async data => {
		setCreating(true);
		try {
			const effectiveRole = isCoachViewer ? 'Client' : (data.role || 'Client');
			const isClient = effectiveRole === 'Client';

			const body = {
				name: data.name,
				email: data.email,
				phone: data.phone || undefined,
				gender: data.gender || undefined,
				role: effectiveRole.toLowerCase(),
				membership: isClient ? data.membership : undefined,
				password: data.password || undefined,
				coachId: isClient
					? (isCoachViewer ? viewer?.id || null : data.coachId || null)
					: null,
				subscriptionStart: isClient ? data.subscriptionStart : undefined,
				subscriptionEnd: isClient ? data.subscriptionEnd : undefined,
			};

			const url = isCoachViewer ? '/auth/coach/users' : '/auth/admin/users';
			const res = await api.post(url, body);
			const user = res?.data || {};
			setCreatedUser(user);
			setSummaryPhone(data.phone || '');
			Notification(t('alerts.accountCreated'), 'success');

			if (!isCoachViewer && roleAtCreation === 'Coach') {
				setStepIndex(steps.indexOf('send'));
				onDone?.();
				return;
			}
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
				await api.post(`/plans/${selectedWorkout}/assign`, { athleteIds: [createdUser?.user?.id], confirm: 'yes', isActive: true });
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

			{/* ===== ACCOUNT STEP ===== */}
			{currentStep === 'account' && (
				<form className='space-y-4' onSubmit={handleSubmit(onSubmitAccount)}>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<Controller name='name' control={control} render={({ field }) => <Input label={t('fields.fullName')} placeholder={t('placeholders.fullName')} error={t(errors?.name?.message || '')} {...field} />} />
						<Controller name='phone' control={control} render={({ field }) => (
							<PhoneField label={t('fields.phone')} value={field.value || ''} onChange={field.onChange}
								error={errors?.phone?.message ? t(errors.phone.message) : ''} required={false}
								name={field.name} setError={setError} clearErrors={clearErrors} t={t} />
						)} />
						<Controller name='email' control={control} render={({ field }) => <Input label={t('fields.email')} type='email' placeholder={t('placeholders.email')} error={t(errors?.email?.message)} {...field} />} />

						<div className='relative'>
							<Controller name='password' control={control} render={({ field }) => (
								<CutomInput label={t('fields.password')} type={showPassword ? 'text' : 'password'} placeholder='••••••••'
									value={field.value} onChange={field.onChange}
									error={errors.password?.message ? t(errors.password.message) : undefined} />
							)} />
							<div className='absolute rtl:left-2 ltr:right-2 top-9 flex items-center gap-1'>
								<Button color='neutral' className='!min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPassword(v => !v)} name='' icon={showPassword ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
								<Button color='neutral' className='!min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
							</div>
						</div>

						<Controller name='gender' control={control} render={({ field }) => (
							<ToggleGroup label={t('fields.gender')} value={field.value} onChange={field.onChange}
								options={GENDER_OPTIONS.map(o => ({ id: o.id, label: t(o.label) }))}
								error={errors.gender?.message ? t(errors.gender.message) : undefined} />
						)} />

						<Controller name='role' control={control} render={({ field }) => (
							<ToggleGroup label={t('fields.role')} value={field.value} onChange={field.onChange}
								options={ROLE_OPTIONS_WIZARD.map(o => ({ id: o.id, label: t(o.label) }))}
								error={errors.role?.message ? t(errors.role.message) : undefined} />
						)} />

						{roleAtCreation === 'Client' && (
							<Controller name='coachId' control={control} render={({ field }) => (
								<div>
									<Select searchable={false} label={`${t('fields.coach')} *`} placeholder={t('placeholders.coach')}
										options={optionsCoach} value={field.value} onChange={field.onChange} icon={<Award className='w-4 h-4' />} />
									{errors.coachId?.message && <p className='text-xs text-rose-500 mt-1'>{t(errors.coachId.message)}</p>}
								</div>
							)} />
						)}

						{roleAtCreation === 'Client' && (
							<Controller name='membership' control={control} render={({ field }) => (
								<ToggleGroup label={t('fields.membership')} value={field.value} onChange={field.onChange}
									options={MEMBERSHIP_OPTIONS.map(o => ({ id: o.id, label: t(o.label) }))}
									error={errors.membership?.message ? t(errors.membership.message) : undefined} />
							)} />
						)}

						{roleAtCreation === 'Client' && (
							<div className='sm:col-span-2'>
								<Controller name='subscriptionStart' control={control} render={({ field }) => {
									const start = field.value;
									return (
										<Controller name='subscriptionEnd' control={control} render={({ field: fieldEnd }) => (
											<SubscriptionPeriodPicker setValue={setValue} startValue={start} endValue={fieldEnd.value || ''}
												onStartChange={v => field.onChange(v)} onEndChange={v => fieldEnd.onChange(v)}
												errorStart={errors.subscriptionStart?.message ? t(errors.subscriptionStart.message) : undefined}
												errorEnd={errors.subscriptionEnd?.message ? t(errors.subscriptionEnd.message) : undefined} t={t} />
										)} />
									);
								}} />
							</div>
						)}
					</div>

					<div className='flex justify-end pt-2'>
						<button
							type='submit'
							disabled={creating || isSubmitting}
							className='inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 shadow-md'
							style={{
								background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
								boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 35%, transparent)',
							}}
						>
							{(creating || isSubmitting) && <RefreshCw className='w-4 h-4 animate-spin' />}
							{creating || isSubmitting ? t('common.creating') : t('wizard.createAndNext')}
						</button>
					</div>
				</form>
			)}

			{/* ===== WORKOUT STEP ===== */}
			{currentStep === 'workout' && (
				<div className='space-y-4'>
					{/* Action bar: create + refresh */}
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2 text-slate-500'>
							<Dumbbell className='w-4 h-4' />
							<span className='text-sm font-medium'>{t('pickers.selectOne')}</span>
						</div>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={fetchWorkoutPlans}
								disabled={loadingWorkouts}
								className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200 disabled:opacity-50'
							>
								<RefreshCw className={`w-3.5 h-3.5 ${loadingWorkouts ? 'animate-spin' : ''}`} />
								{t('common.refresh') || 'Refresh'}
							</button>
							<button
								type='button'
								onClick={() => window.open('/dashboard/workouts/plans', '_blank')}
								className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-sm'
								style={{
									background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
									boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
								}}
							>
								<Plus className='w-3.5 h-3.5' />
								{t('pickers.createWorkout') || 'New Workout'}
								<ExternalLink className='w-3 h-3 opacity-70' />
							</button>
						</div>
					</div>

					<PlanPicker
						loading={loadingWorkouts}
						workoutPlans={workoutPlans}
						visibleWorkouts={visibleWorkouts}
						setVisibleWorkouts={() => setVisibleWorkouts(v => v + 6)}
						plans={workoutPlans.slice(0, visibleWorkouts)}
						defaultSelectedId={selectedWorkout}
						onSelect={setSelectedWorkout}
						onSkip={() => setStepIndex(steps.indexOf('meal'))}
						onAssign={() => assignWorkout(selectedWorkout)}
						assigning={assigningW}
						hideSearch
					/>
				</div>
			)}

			{/* ===== MEAL STEP ===== */}
			{currentStep === 'meal' && (
				<div className='space-y-4'>
					{/* Action bar: create + refresh */}
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2 text-slate-500'>
							<Utensils className='w-4 h-4' />
							<span className='text-sm font-medium'>{t('pickers.selectOne')}</span>
						</div>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={fetchMealPlans}
								disabled={loadingMeals}
								className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200 disabled:opacity-50'
							>
								<RefreshCw className={`w-3.5 h-3.5 ${loadingMeals ? 'animate-spin' : ''}`} />
								{t('common.refresh') || 'Refresh'}
							</button>
							<button
								type='button'
								onClick={() => window.open('/dashboard/nutrition', '_blank')}
								className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-sm'
								style={{
									background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
									boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
								}}
							>
								<Plus className='w-3.5 h-3.5' />
								{t('pickers.createMeal') || 'New Meal Plan'}
								<ExternalLink className='w-3 h-3 opacity-70' />
							</button>
						</div>
					</div>

					<MealPlanPicker
						loading={loadingMeals}
						mealPlans={mealPlans}
						visibleMeals={visibleMeals}
						setVisibleMeals={setVisibleMeals}
						meals={mealPlans.slice(0, visibleMeals)}
						onBack={() => setStepIndex(steps.indexOf('workout'))}
						onSkip={() => setStepIndex(steps.indexOf('calories'))}
						onAssign={handleAssignMeal}
						assigning={assigningM}
						hideSearch
					/>
				</div>
			)}

			{/* ===== CALORIES STEP ===== */}
			{currentStep === 'calories' && (
				<CaloriesStep
					userId={createdUser?.user?.id}
					initialValues={{
						caloriesTarget: createdUser?.user?.caloriesTarget,
						proteinPerDay: createdUser?.user?.proteinPerDay,
						carbsPerDay: createdUser?.user?.carbsPerDay,
						fatsPerDay: createdUser?.user?.fatsPerDay,
						activityLevel: createdUser?.user?.activityLevel,
						notes: createdUser?.user?.notes,
					}}
					onBack={() => setStepIndex(steps.indexOf('meal'))}
					onNext={() => setStepIndex(steps.indexOf('send'))}
				/>
			)}

			{/* ===== SEND CREDENTIALS STEP ===== */}
			{currentStep === 'send' && (
				<div className='space-y-5'>
					{/* Success banner */}
					<div className='flex items-center gap-3 p-4 rounded-lg border' style={{ background: 'color-mix(in srgb, var(--color-primary-500) 6%, white)', borderColor: 'color-mix(in srgb, var(--color-primary-500) 20%, transparent)' }}>
						<div className='mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center' style={{ background: 'color-mix(in srgb, var(--color-primary-500) 15%, white)' }}>
							<CheckCircle2 className='w-5 h-5' style={{ color: 'var(--color-primary-600)' }} />
						</div>
						<div>
							<p className='text-sm font-semibold' style={{ color: 'var(--color-primary-700)' }}>{t('wizard.credsReady')}</p>
							{/* <p className='text-xs text-slate-500 mt-0.5'>{t('wizard.credsReadyDesc') || 'Share the credentials below with your new user.'}</p> */}
						</div>
					</div>

					<div className='space-y-2.5'>
						<FieldRow icon={<Mail className='h-4 w-4' />} label={t('fields.email')} value={createdUser?.email || getValues('email')} canCopy />
						<PasswordRow label={t('fields.password')} value={getValues('password') ? getValues('password') : t('wizard.passwordByEmail')} canCopy={Boolean(getValues('password'))} />
					</div>

					<div className='flex justify-end pt-2'>
						<Button color='green' className='!w-fit text-sm' name={t('common.sendWhatsapp')} icon={<MessageCircle size={16} />} onClick={handleSendCreds} />
					</div>
				</div>
			)}
		</Modal>
	);
}

/* ========================= MAIN PAGE ========================= */
export default function UsersList() {
	const t = useTranslations('users');
	const t_ = useTranslations('users.admin');

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
	const [pendingModal, setPendingModal] = useState({ open: false, items: [], loading: false });

	const lang = useLocale();
	const [shareCredsModal, setShareCredsModal] = useState({ open: false, row: null, phone: '', saving: false });

	const openShareCredsModal = (row) => {
		setShareCredsModal({ open: true, row, phone: row?.phone || '', saving: false });
	};
	const closeShareCredsModal = () => {
		setShareCredsModal({ open: false, row: null, phone: '', saving: false });
	};

	const savePhoneIfChanged = async (row, phone) => {
		const current = String(row?.phone || '').trim();
		const next = String(phone || '').trim();
		if (next && next !== current) {
			await api.put(`/auth/user/${row.id}`, { phone: next });
		}
	};

	const sendCredsWhatsapp = async () => {
		const row = shareCredsModal.row;
		const phoneRaw = shareCredsModal.phone;
		if (!row) return;
		const phone = String(phoneRaw || '').replace(/[^0-9]/g, '');
		if (!phone) return Notification(t('alerts.noPhone'), 'error');

		try {
			setShareCredsModal(s => ({ ...s, saving: true }));
			await savePhoneIfChanged(row, phoneRaw);
			const res = await api.post(`/auth/admin/users/${row.id}/credentials`);
			const { email, tempPassword } = res.data || {};
			const link = buildWhatsAppLink({ phone, email: email || row.email, password: tempPassword, role: row.role, lang });
			if (!link) return Notification(t('alerts.enterPhoneWhatsapp'), 'warning');
			window.open(link, '_blank');
			Notification(t('alerts.credsSent'), 'success');
			closeShareCredsModal();
			fetchUsers();
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.sendFailed'), 'error');
		} finally {
			setShareCredsModal(s => ({ ...s, saving: false }));
		}
	};

	useEffect(() => {
		const tOut = setTimeout(() => setDebounced(searchText.trim()), 350);
		return () => clearTimeout(tOut);
	}, [searchText]);

	async function fetchMe() {
		try {
			const r = await api.get('/auth/me');
			setMyRole(r?.data?.role);
		} catch { }
	}

	async function fetchUsers() {
		setLoading(true);
		setErr(null);
		try {
			const params = { page, limit, sortBy, sortOrder };
			if (debounced) params.search = debounced;
			if (roleFilter !== 'All') params.role = roleFilter.toLowerCase();
			if (hasPlanFilter === 'With plan') params.hasPlan = true;
			else if (hasPlanFilter === 'No plan') params.hasPlan = false;

			const res = user.role == 'admin'
				? await api.get('/auth/users', { params })
				: await api.get(`/auth/coaches/${user.id}/clients`, { params });
			const data = res.data || {};

			const mapped = data?.users.map(u => ({
				id: u.id, name: u.name, email: u.email, role: normRole(u.role),
				status: normStatus(u.status), phone: u.phone || '',
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
			setTotal(data?.total);
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
		} catch { }
	}

	async function fetchPendingForReview() {
		setPendingModal(s => ({ ...s, loading: true }));
		try {
			const params = { page: 1, limit: 100, sortBy, sortOrder, status: 'pending' };
			const res = await api.get('/auth/users', { params });
			const data = res.data || {};
			const mapped = (data.users || []).map(u => ({
				id: u.id,
				name: u.name,
				email: u.email,
				role: normRole(u.role),
				status: normStatus(u.status),
				coachName: u.coach?.name || u.coachName || null,
				createdAt: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
			}));
			setPendingModal({ open: true, items: mapped, loading: false });
		} catch (e) {
			setPendingModal(s => ({ ...s, loading: false }));
			Notification(e?.response?.data?.message || t('alerts.loadUsersFailed'), 'error');
		}
	}

	useEffect(() => { fetchMe(); fetchStats(); }, []);
	useEffect(() => { fetchUsers(); }, [page, sortBy, sortOrder, debounced, roleFilter, hasPlanFilter]);

	const deleteUser = async row => {
		if (!confirm(t('dialogs.deleteUserConfirm', { name: row.name }))) return;
		try {
			await api.delete(`/auth/user/${row.id}`);
			fetchUsers(); fetchStats();
			Notification(t('alerts.userDeleted'), 'success');
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.deleteFailed'), 'error');
		}
	};

	const I = (Icon, cls = '') => <Icon className={`h-4 w-4 ${cls}`} />;

	const updateUserStatus = async (row, status) => {
		try {
			await api.put(`/auth/status/${row.id}`, { status });
			fetchUsers();
			fetchStats();
			Notification(status === 'active' ? 'User approved' : 'User rejected', 'success');
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.updateFailed'), 'error');
		}
	};

	const buildRowActions = row => {
		const viewer = String(myRole || '').toLowerCase();
		const isAdmin = viewer === 'admin';
		const canCoachManage = viewer === 'coach';
		const canManage = isAdmin || canCoachManage;

		const opts = [
			{ icon: I(Eye, 'text-slate-600'), label: t('actions.openProfile'), onClick: () => (window.location.href = `/dashboard/users/${row.id}`), className: 'hover:text-slate-800' },
		];

		if (canManage) {
			opts.push(
				{ icon: I(Dumbbell, 'text-violet-600'), label: t('actions.assignWorkout'), onClick: () => setPickerWorkout({ open: true, user: row }), className: 'hover:text-violet-700' },
				{ icon: I(Utensils, 'text-amber-600'), label: t('actions.assignMeal'), onClick: () => setPickerMeal({ open: true, user: row }), className: 'hover:text-amber-700' }
			);
		}

		if (isAdmin && row.status === 'pending') {
			opts.push(
				{
					icon: I(CheckCircle2, 'text-emerald-600'),
					label: 'Approve user',
					onClick: () => updateUserStatus(row, 'active'),
					className: 'hover:text-emerald-700',
				},
				{
					icon: I(XCircle, 'text-rose-600'),
					label: 'Reject user',
					onClick: () => updateUserStatus(row, 'suspended'),
					className: 'hover:text-rose-700',
				},
			);
		}

		if (isAdmin) {
			opts.push(
				{ icon: I(PencilLine, 'text-indigo-600'), label: t('actions.editDetails'), onClick: () => { setSelectedUser(row); setEditUserOpen(true); }, className: 'hover:text-indigo-700' },
				{ icon: I(Trash2, 'text-rose-600'), label: t('actions.delete'), onClick: () => deleteUser(row), className: 'text-rose-600 hover:text-rose-700' }
			);
		}

		opts.push(
			{ icon: I(MessageCircle, 'text-emerald-600'), label: t('actions.shareCredsWhatsapp'), onClick: () => openShareCredsModal(row), className: 'hover:text-emerald-700' },
			{ icon: I(PhoneCall, 'text-green-600'), label: t('actions.whatsapp'), onClick: () => { const phone = String(row.phone || '').replace(/[^0-9]/g, ''); if (!phone) return Notification(t('alerts.noPhone'), 'error'); window.open(`https://wa.me/${phone}`, '_blank'); }, className: 'hover:text-green-700' },
			{ icon: I(MessageSquare, 'text-sky-600'), label: t('actions.directChat'), onClick: () => window.open(`/dashboard/chat?userId=${row.id}`, '_blank'), className: 'hover:text-sky-700' }
		);
		return opts;
	};

	const columns = [
		{ header: t('table.name'), accessor: 'name', cell: r => <div className='flex items-center gap-2.5'><div className='w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold' style={{ background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))' }}>{r.name?.[0]?.toUpperCase() || '?'}</div><span className='font-semibold text-slate-800'>{r.name}</span></div>, className: 'font-number' },
		{ header: t('table.email'), accessor: 'email', cell: r => <span className='text-slate-500 text-sm'>{r.email}</span>, className: 'font-number' },
		{ header: t('table.role'), accessor: 'role', cell: r => <RolePill role={r.role} />, className: 'font-number' },
		{ header: t('table.gender'), accessor: 'gender', cell: r => <StatusPill status={r.gender} />, className: 'font-number' },
		{ header: t('table.membership'), accessor: 'membership', cell: r => <span className='text-sm font-medium text-slate-600 capitalize'>{r.membership}</span>, className: 'font-number' },
		{ header: t('table.exercisePlan'), accessor: 'planName', cell: r => <span className={`text-sm ${r.planName === '-' ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>{r.planName}</span> },
		{ header: t('table.mealPlan'), accessor: 'planMealName', cell: r => <span className={`text-sm ${r.planMealName === '-' ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>{r.planMealName}</span> },
		{
			header: t('table.coach'), accessor: 'coachName',
			cell: r => r.coachName
				? <Badge color='violet'><Shield className='w-3 h-3' /> {r.coachName}</Badge>
				: <span className='text-slate-400 text-sm'>—</span>,
			className: 'font-number'
		},
		{ header: t('table.joinDate'), accessor: 'joinDate', cell: r => <span className='text-sm text-slate-500'>{r.joinDate}</span>, className: 'font-number text-nowrap' },
		{ header: t('table.status'), accessor: 'status', cell: r => <StatusPill status={r.status} viewerRole={myRole} />, className: 'font-number' },
		{
			header: t('table.daysLeft'), accessor: 'daysLeft',
			cell: r => {
				if (!r.subscriptionStart || !r.subscriptionEnd || r.subscriptionEnd === '-') return <span className='text-slate-400 text-sm'>—</span>;
				const today = new Date();
				const end = new Date(r.subscriptionEnd);
				const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
				if (diff < 0) return <span className='text-red-500 font-semibold text-sm'>{t('common.expired')}</span>;
				return (
					<span className={`font-semibold text-sm ${diff <= 3 ? 'text-red-500' : diff <= 7 ? 'text-orange-500' : 'text-emerald-600'}`}>
						{diff || '0'} {t('common.days')}
					</span>
				);
			}
		},
		{ header: t('table.actions'), accessor: '_actions', cell: r => <ActionsMenu options={buildRowActions(r)} align='right' /> },
	];

	const toggleSort = field => {
		if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
		else { setSortBy(field); setSortOrder('ASC'); }
	};

	const FILTER_ROLE_OPTIONS = [
		{ id: 'All', name: t('filters.allRoles') },
		{ id: 'Coach', name: t('roles.coach') },
		{ id: 'Client', name: t('roles.client') },
	];

	const toSelectOptions = arr => arr.map(o => ({ id: o.id, label: o.name }));

	const user = useUser();
	const coaches = useAdminCoaches(user?.id, { page: 1, limit: 100, search: '' });

	const optionsCoach = useMemo(() => {
		const list = [];
		if (user) list.push({ id: user.id, label: 'To Me' });
		if (coaches?.items?.length) {
			for (const coach of coaches.items) {
				list.push({ id: coach.id, label: coach.name || coach.email || 'Unnamed Coach' });
			}
		}
		return list;
	}, [user, coaches?.items]);

	const viewerRole = String(user?.role || myRole || '').toLowerCase();

	return (
		<div className='space-y-6'>

			{/* ===== STATS HEADER ===== */}
			<GradientStatsHeader
				onClick={() => setWizardOpen(true)}
				btnName={['admin', 'coach'].includes(viewerRole) ? t('header.createNewUser') : null}
				title={t('header.title')}
				desc={t('header.subtitle')}
				loadingStats={loading}
			>
				{String(myRole || '').toLowerCase() === 'admin' && (
					<>
						<StatCard icon={Users} title={t('stats.totalUsers')} value={stats.totalUsers} />
						<StatCard icon={UserCheck} title={t('stats.active')} value={stats.activeUsers} />
						<StatCard icon={UserCog} title={t('stats.coaches')} value={stats.coaches} />
						<StatCard icon={UserCircle} title={t('stats.clients')} value={stats.clients} />
					</>
				)}
			</GradientStatsHeader>

			{/* ===== FILTERS BAR ===== */}
			<div className='flex items-center gap-2.5 mt-8 flex-wrap'>
				{/* Search */}
				<div className='flex-1'>
					<div className='relative w-full md:w-64'>
						<svg className='absolute ltr:left-3 rtl:right-3 z-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' viewBox='0 0 24 24' fill='none'>
							<path d='M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
						</svg>
						<input
							value={searchText}
							onChange={e => { setSearchText(e.target.value); setPage(1); }}
							placeholder={t('placeholders.search')}
							className='h-[42px] w-full ltr:pl-9 rtl:pr-9 rounded-lg bg-white text-slate-800 border border-slate-200 font-medium text-sm shadow-sm focus:outline-none transition-all duration-200'
							style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
							onFocus={e => { e.target.style.borderColor = 'var(--color-primary-400)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 15%, transparent)'; }}
							onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
						/>
					</div>
				</div>

				{/* Role filter */}
				<Select
					searchable={false} clearable={false}
					className='!max-w-[180px] !w-full'
					placeholder={t('filters.role')}
					options={toSelectOptions(FILTER_ROLE_OPTIONS)}
					value={roleFilter}
					onChange={id => { setRoleFilter(id); setPage(1); }}
				/>

				{/* Sort button */}
				<button
					onClick={() => toggleSort('created_at')}
					className='bg-white inline-flex items-center h-[42px] gap-2 px-4 py-2 rounded-lg border border-slate-200 font-semibold text-sm text-slate-600 shadow-sm transition-all duration-200 hover:shadow-md'
					style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
					onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-400)'; }}
					onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
				>
					<Clock size={15} className='text-slate-400' />
					<span>{t('filters.newest')}</span>
					{sortBy === 'created_at' ? (sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-slate-400' /> : <ChevronDown className='w-4 h-4 text-slate-400' />) : null}
				</button>

				{/* Pending review button (admin only) */}
				{viewerRole === 'admin' && (
					<button
						type='button'
						onClick={fetchPendingForReview}
						className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-semibold shadow-sm hover:bg-amber-100 transition-colors'
					>
						<BadgeCheck className='w-4 h-4' />
						<span>{t_('stats.pending') || 'Pending accounts'}</span>
						<span className='inline-flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-xs font-bold border border-amber-200'>
							{stats.pendingUsers ?? 0}
						</span>
					</button>
				)}
			</div>

			{/* ===== TABLE ===== */}
			<div className='space-y-3'>
				{err && (
					<div className='p-3.5 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm flex items-center gap-2'>
						<XCircle className='w-4 h-4 flex-shrink-0' /> {err}
					</div>
				)}
				<div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm' style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
					<DataTable
						columns={columns} data={rows} loading={loading} itemsPerPage={limit}
						pagination selectable={false} serverPagination page={page}
						onPageChange={setPage} totalRows={total}
					/>
				</div>
			</div>

			{/* ===== MODALS ===== */}
			<CreateClientWizard
				optionsCoach={optionsCoach} open={wizardOpen}
				onClose={() => setWizardOpen(false)}
				onDone={() => { fetchUsers(); fetchStats(); }}
			/>

			<EditUserModal
				optionsCoach={optionsCoach} open={editUserOpen}
				onClose={() => { setEditUserOpen(false); setSelectedUser(null); }}
				user={selectedUser}
				onSaved={() => { fetchUsers(); fetchStats(); }}
			/>

			<PlanPickerModal
				open={pickerWorkout.open}
				onClose={() => setPickerWorkout({ open: false, user: null })}
				title={`${t('pickers.assignWorkout')}${pickerWorkout.user ? ` • ${pickerWorkout.user.name}` : ''}`}
				icon={Dumbbell}
				fetchUrl={user?.role == 'admin' ? '/plans' : `/plans?user_id=${user?.adminId}`}
				assignUrl='/plans/assign'
				userId={pickerWorkout.user?.id}
				onAssigned={() => { setPickerWorkout({ open: false, user: null }); fetchUsers(); }}
			/>

			<PlanPickerModal
				open={pickerMeal.open}
				onClose={() => setPickerMeal({ open: false, user: null })}
				title={`${t('pickers.assignMeal')}${pickerMeal.user ? ` • ${pickerMeal.user.name}` : ''}`}
				icon={Utensils}
				fetchUrl={user?.role == 'admin' ? '/nutrition/meal-plans' : `/nutrition/meal-plans?user_id=${user?.adminId}`}
				assignUrl='/nutrition/meal-plans/assign'
				userId={pickerMeal.user?.id}
				onAssigned={() => { setPickerMeal({ open: false, user: null }); fetchUsers(); }}
			/>

			{/* Share Creds Modal */}
			<Modal
				open={shareCredsModal.open}
				onClose={closeShareCredsModal}
				title={`${t('actions.shareCredsWhatsapp')}${shareCredsModal.row ? ` • ${shareCredsModal.row.name}` : ''}`}
			>
				<div className='space-y-4'>
					<PhoneField
						label={t('fields.phone')}
						placeholder={t('placeholders.phone')}
						value={shareCredsModal.phone}
						onChange={(value) => setShareCredsModal(s => ({ ...s, phone: value }))}
					/>
					<div className='flex justify-end gap-2.5 pt-3 border-t border-slate-100'>
						<Button color='neutral' name={t('common.cancel')} onClick={closeShareCredsModal} />
						<Button color='green' name={t('common.sendWhatsapp')} onClick={sendCredsWhatsapp}
							loading={shareCredsModal.saving} disabled={shareCredsModal.saving} icon={<MessageCircle size={16} />} />
					</div>
				</div>
			</Modal>


			{viewerRole === 'admin' && (
				<EnhancedPendingModal
					open={pendingModal.open}
					onClose={() => setPendingModal(s => ({ ...s, open: false }))}
					pendingModal={pendingModal}
					updateUserStatus={updateUserStatus}
					fetchPendingForReview={fetchPendingForReview}
					t_={t_}
					viewerRole={viewerRole}
				/>
			)}

		</div>
	);
}

/* ========================= CUSTOM INPUT (theme-aware) ========================= */
export function CutomInput({ value, onChange, onBlur, name, inputRef, className, cnInput, ...rest }) {
	return (
		<div className={`w-full relative ${className || ''}`}>
			{rest.label && <label className='mb-1.5 block text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>{rest.label}</label>}
			<div
				className='relative flex items-center rounded-lg border bg-white transition-all duration-200'
				style={{ borderColor: '#cbd5e1' }}
				onFocus={e => {
					const wrapper = e.currentTarget;
					wrapper.style.borderColor = 'var(--color-primary-400)';
					wrapper.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 15%, transparent)';
				}}
				onBlur={e => {
					const wrapper = e.currentTarget;
					wrapper.style.borderColor = '#cbd5e1';
					wrapper.style.boxShadow = 'none';
				}}
			>
				<input
					{...rest}
					ref={inputRef}
					name={name}
					value={value}
					onChange={onChange}
					onBlur={onBlur}
					className={`${cnInput || ''} h-[43px] w-full rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400`}
				/>
			</div>
			{rest.error && <p className='mt-1.5 text-xs text-rose-500 flex items-center gap-1'><XCircle className='w-3 h-3' />{rest.error}</p>}
		</div>
	);
}



function EnhancedPendingModal({
	open,
	onClose,
	pendingModal,
	updateUserStatus,
	fetchPendingForReview,
	t_,
	viewerRole
}) {
	const [processingRow, setProcessingRow] = useState(null);

	if (viewerRole !== 'admin') return null;

	const handleUpdateStatus = async (row, status) => {
		setProcessingRow({ id: row.id, action: status });
		try {
			await updateUserStatus(row, status);
			onClose()
		} finally {
			setProcessingRow(null);
		}
	};

	const isProcessing = (rowId, action) => {
		return processingRow?.id === rowId && processingRow?.action === action;
	};

	const isRowDisabled = (rowId) => {
		return processingRow?.id === rowId;
	};

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={
				<div className="flex items-center justify-between w-full">
					<span>{t_('stats.pending')}</span> 
				</div>
			}
			maxW="max-w-[900px]"
		>
			<AnimatePresence mode="wait">
				{/* Loading State */}
				{pendingModal.loading && (
					<motion.div
						key="loading"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex flex-col items-center justify-center py-12 space-y-3"
					>
						<RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
						<p className="text-sm text-slate-500 font-medium">
							{t_('common.loadingPendingAccounts')}
						</p>
					</motion.div>
				)}

				{/* Empty State */}
				{!pendingModal.loading && pendingModal.items.length === 0 && (
					<motion.div
						key="empty"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="flex flex-col items-center justify-center py-12 space-y-3"
					>
						<div
							className="w-16 h-16 rounded-full flex items-center justify-center"
							style={{
								background: 'color-mix(in srgb, var(--color-primary-500) 10%, white)',
							}}
						>
							<CheckCircle2 className="w-8 h-8 text-[var(--color-primary-600)]" />
						</div>
						<div className="text-center">
							<p className="text-sm font-semibold text-slate-700">
								{t_('common.noPendingAccounts')}
							</p>
							<p className="text-xs text-slate-500 mt-1">
								{t_('common.allAccountsReviewed')}
							</p>
						</div>
					</motion.div>
				)}

				{/* Table with Pending Items */}
				{!pendingModal.loading && pendingModal.items.length > 0 && (
					<motion.div
						key="table"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="space-y-3"
					>
						{/* Info banner */}
						<div
							className="flex items-start gap-3 p-3 rounded-lg border"
							style={{
								background: 'color-mix(in srgb, var(--color-primary-500) 6%, white)',
								borderColor: 'color-mix(in srgb, var(--color-primary-500) 20%, transparent)',
							}}
						>
							<AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary-600)' }} />
							<div className="flex-1">
								<p className="text-xs font-semibold" style={{ color: 'var(--color-primary-700)' }}>
									{t_('pending.bannerTitle', {
										count: pendingModal.items.length,
										text: pendingModal.items.length === 1
											? t_('pending.accountSingular')
											: t_('pending.accountPlural')
									})}
								</p>
								<p className="text-xs text-slate-600 mt-0.5">
									{t_('pending.bannerDescription')}
								</p>
							</div>
						</div>

						{/* Scrollable table */}
						<div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
							<table className="min-w-full text-sm">
								<thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
									<tr>
										<th className="px-3 py-2.5 text-left rtl:text-right font-semibold text-xs uppercase tracking-wider">
											{t_('table.name')}
										</th>
										<th className="px-3 py-2.5 text-left rtl:text-right font-semibold text-xs uppercase tracking-wider">
											{t_('table.email')}
										</th>
										<th className="px-3 py-2.5 text-left rtl:text-right font-semibold text-xs uppercase tracking-wider">
											{t_('table.role')}
										</th>
										<th className="px-3 py-2.5 text-left rtl:text-right font-semibold text-xs uppercase tracking-wider">
											{t_('table.from')}
										</th>
										<th className="px-3 py-2.5 text-left rtl:text-right font-semibold text-xs uppercase tracking-wider">
											{t_('table.created')}
										</th>
										<th className="px-3 py-2.5 text-left rtl:text-right font-semibold text-xs uppercase tracking-wider">
											{t_('table.actions')}
										</th>
									</tr>
								</thead>

								<tbody>
									<AnimatePresence mode="popLayout">
										{pendingModal.items.map((row, index) => (
											<motion.tr
												key={row.id}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: 20, height: 0 }}
												transition={{ delay: index * 0.05 }}
												className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
											>
												<td className="text-nowrap px-3 py-3 font-semibold text-slate-800">
													{row.name}
												</td>
												<td className="px-3 py-3 text-slate-600">
													{row.email}
												</td>
												<td className="px-3 py-3">
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
														{t_(`roles.${row.role}`)}
													</span>
												</td>
												<td className="px-3 text-nowrap py-3 text-slate-600">
													{row.coachName ? (
														<span className="inline-flex items-center gap-1">
															<span className="text-xs">{t_('pending.from')}</span>
															<span className="font-semibold">{row.coachName}</span>
														</span>
													) : (
														<span className="text-xs italic text-slate-400">
															{t_('pending.selfSignup')}
														</span>
													)}
												</td>
												<td className="px-3 text-nowrap py-3 text-slate-500 text-xs">
													{row.createdAt}
												</td>
												<td className="px-3 py-3">
													<div className="flex items-center gap-2">
														{/* Approve Button */}
														<motion.button
															type="button"
															onClick={() => handleUpdateStatus(row, 'active')}
															disabled={isRowDisabled(row.id)}
															whileHover={!isRowDisabled(row.id) ? { scale: 1.05 } : {}}
															whileTap={!isRowDisabled(row.id) ? { scale: 0.95 } : {}}
															className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] justify-center"
														>
															{isProcessing(row.id, 'active') ? (
																<>
																	<RefreshCw className="w-3 h-3 animate-spin" />
																	<span>{t_('actions.approving')}</span>
																</>
															) : (
																<>
																	<CheckCircle2 className="w-3 h-3" />
																	<span>{t_('actions.approve')}</span>
																</>
															)}
														</motion.button>

														{/* Reject Button */}
														<motion.button
															type="button"
															onClick={() => handleUpdateStatus(row, 'suspended')}
															disabled={isRowDisabled(row.id)}
															whileHover={!isRowDisabled(row.id) ? { scale: 1.05 } : {}}
															whileTap={!isRowDisabled(row.id) ? { scale: 0.95 } : {}}
															className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 hover:bg-rose-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] justify-center"
														>
															{isProcessing(row.id, 'suspended') ? (
																<>
																	<RefreshCw className="w-3 h-3 animate-spin" />
																	<span>{t_('actions.rejecting')}</span>
																</>
															) : (
																<>
																	<XCircle className="w-3 h-3" />
																	<span>{t_('actions.reject')}</span>
																</>
															)}
														</motion.button>
													</div>
												</td>
											</motion.tr>
										))}
									</AnimatePresence>
								</tbody>
							</table>
						</div>

						{/* Footer info */}
						<div className="flex items-center justify-between pt-1 text-xs text-slate-500">
							<span>
								{t_('pending.footerShowing', {
									count: pendingModal.items.length,
									text: pendingModal.items.length === 1
										? t_('pending.accountSingular')
										: t_('pending.accountPlural')
								})}
							</span>
							<span className="text-slate-400">
								{t_('pending.footerReview')}
							</span>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</Modal>
	);
}

