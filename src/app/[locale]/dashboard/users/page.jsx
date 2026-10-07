'use client';

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
	Plus, CheckCircle2, XCircle, Shield, Eye, PencilLine, MessageSquare, PhoneCall, ListChecks, Trash2, EyeOff, Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, User, Mail, Award, ExternalLink, RefreshCw, AlertCircle, RotateCcw, Flame, Clock,
} from 'lucide-react';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import ActionsMenu from '@/components/molecules/ActionsMenu';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import {
	Stepper, PlanPicker, MealPlanPicker, FieldRow, PasswordRow,
	buildWhatsAppLink, buildWhatsAppMessage, CopyButton, SubscriptionPeriodPicker, formatISO, parseISO
} from '@/components/pages/dashboard/users/Atoms';
import { motion, AnimatePresence } from 'framer-motion';
import RosterSummary from '@/components/pages/dashboard/users/roster/RosterSummary';
import RosterToolbar from '@/components/pages/dashboard/users/roster/RosterToolbar';
import { MemberCell, RoleTag, TierTag, ProgramCell, CoachCell, GenderCell, StatusCell } from '@/components/pages/dashboard/users/roster/RosterCells';
import '@/components/pages/dashboard/users/roster/roster.css';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { useAdminCoaches } from '@/hooks/useHierarchy';
import { useUser } from '@/hooks/useUser';
import PhoneField from '@/components/atoms/PhoneField';
import CaloriesStep from '@/components/pages/dashboard/users/CaloriesStep';
import { ageFromBirth } from '@/lib/calorie-engine';
import { Modal } from '@/components/dashboard/ui/UI';
import DataTable from '@/components/atoms/Datatable';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import FloatingDate from '@/components/atoms/FloatingDate';
import { getStoredPerPage, setStoredPerPage } from '@/lib/table-prefs';
import ToggleGroup from '@/components/atoms/GmToggleGroup';

export { ToggleGroup };

const GM_MODAL = 'gm-modal';
const IS_DEV = process.env.NODE_ENV === 'development';

/* ---------- helpers ---------- */
const toTitle = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const normRole = r => (['ADMIN', 'COACH', 'CLIENT'].includes(String(r || '').toUpperCase()) ? toTitle(r) : 'Client');

const ARABIC_TO_LATIN = {
	ا: 'a', أ: 'a', إ: 'e', آ: 'aa', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
	د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
	ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
	ي: 'y', ى: 'a', ة: 'h', ؤ: 'w', ئ: 'y',
};

function transliterateArabicToLatin(text = '') {
	return String(text)
		.split('')
		.map((ch) => ARABIC_TO_LATIN[ch] ?? ch)
		.join('')
		.normalize('NFKD')
		.replace(/[\u064B-\u065F]/g, '');
}

function buildEmailFromName(name = '') {
	const latin = transliterateArabicToLatin(name);
	const local = latin
		.toLowerCase()
		.replace(/[^a-z0-9\s_]/g, ' ')
		.trim()
		.replace(/\s+/g, '_')
		.replace(/_+/g, '_');
	const safeLocal = local || 'user';
	return `${safeLocal}@example.com`;
}

const normStatus = s => (s ? String(s).trim().toLowerCase() : 'pending');

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
	birthDate: yup.string().nullable().optional(),
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
		<Modal cn="gm-modal-root" panelClassName={GM_MODAL} open={open} onClose={onClose} title={title}>
			<div className='space-y-4'>
				<div className='gm-wizard-toolbar'>
					<div className='flex items-center gap-2.5'>
						{Icon ? (
							<span className='gm-plan__icon size-8!'>
								<Icon className='size-4' />
							</span>
						) : null}
						<span className='text-[13px] font-semibold gm-ink'>{t('pickers.selectOne')}</span>
					</div>
					<div className='flex items-center gap-2'>
						<button
							type='button'
							onClick={loadPlans}
							disabled={loading}
							className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-50'
						>
							<RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
							{t('common.refresh')}
						</button>
						<button
							type='button'
							onClick={() => window.open(createUrl, '_blank')}
							className='gm-btn-primary gm-btn-compact'
						>
							<Plus className='size-3.5' />
							{isWorkout ? t('pickers.createWorkout') : t('pickers.createMeal')}
							<ExternalLink className='size-3 opacity-70' />
						</button>
					</div>
				</div>

				{loading ? (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className='h-28 animate-pulse rounded-[14px] border' style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 55%, transparent)' }} />
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

		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

		let password = '';
		for (let i = 0; i < 12; i++) {
			password += chars[Math.floor(Math.random() * chars.length)];
		}

		setValue('password', password);
		trigger('password');

		Notification(t('alerts.passwordGenerated'), 'info');
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
		<Modal cn="gm-modal-root" panelClassName={GM_MODAL} open={open} onClose={onClose} title={`${t('editUser')} • ${user?.name ?? ''}`}>
			<form className='space-y-3.5' onSubmit={handleSubmit(onSubmit)}>
				<section className='gm-wizard-block'>
					<h3 className='gm-wizard-block__title'>{t('wizard.sectionProfile')}</h3>
					<Controller name='name' control={control} render={({ field }) => (
						<FloatingInput label={t('fields.fullName')} value={field.value} onChange={field.onChange} error={errors.name?.message ? t(errors.name.message) : undefined} icon={<User className='size-4' />} />
					)} />
					<Controller name='phone' control={control} render={({ field }) => (
						<PhoneField label={t('fields.phone')} value={field.value || ''} onChange={field.onChange}
							error={errors.phone?.message ? t(errors.phone.message) : ''} name={field.name}
							setError={setError} clearErrors={clearErrors} t={t} />
					)} />
					<Controller name='email' control={control} render={({ field }) => (
						<FloatingInput label={t('fields.email')} type='email' value={field.value} onChange={field.onChange} error={errors.email?.message ? t(errors.email.message) : undefined} icon={<Mail className='size-4' />} />
					)} />
					<Controller name='gender' control={control} render={({ field }) => (
						<ToggleGroup label={t('fields.gender')} value={field.value} onChange={field.onChange}
							options={[{ id: 'male', label: t('gender.male') }, { id: 'female', label: t('gender.female') }]}
							error={errors.gender?.message ? t(errors.gender.message) : undefined} />
					)} />
				</section>

				<section className='gm-wizard-block'>
					<h3 className='gm-wizard-block__title'>{t('wizard.sectionAccess')}</h3>
					<Controller name='password' control={control} render={({ field }) => (
						<FloatingInput
							className='sm:col-span-2'
							label={t('fields.passwordEdit')}
							type={showPassword ? 'text' : 'password'}
							value={field.value || ''}
							onChange={field.onChange}
							error={errors.password?.message ? t(errors.password.message) : undefined}
							clearable={false}
							suffix={(
								<>
									<button type='button' onClick={() => setShowPassword(v => !v)} className='grid size-7 place-items-center rounded-md text-[var(--gm-muted)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]'>
										{showPassword ? <EyeOff className='size-3.5' /> : <EyeIcon className='size-3.5' />}
									</button>
									<button type='button' onClick={generatePassword} className='grid size-7 place-items-center rounded-md text-[var(--gm-muted)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]'>
										<Sparkles className='size-3.5' />
									</button>
								</>
							)}
						/>
					)} />
					{!isCoachViewer && (
						<Controller name='role' control={control} render={({ field }) => (
							<FloatingSelect
								label={t('fields.role')}
								options={[
									{ id: 'Admin', label: t('roles.admin') },
									{ id: 'Coach', label: t('roles.coach') },
									{ id: 'Client', label: t('roles.client') },
								]}
								value={field.value}
								onChange={field.onChange}
								icon={<Shield className='size-4' />}
								error={errors.role?.message ? t(errors.role.message) : undefined}
							/>
						)} />
					)}
					<Controller name='status' control={control} render={({ field }) => (
						<FloatingSelect
							label={t('fields.status')}
							options={[{ id: 'Active', label: t('status.active') }, { id: 'Pending', label: t('status.pending') }, { id: 'Suspended', label: t('status.suspended') }]}
							value={field.value}
							onChange={field.onChange}
							icon={<CheckCircle2 className='size-4' />}
							error={errors.status?.message ? t(errors.status.message) : undefined}
						/>
					)} />
				</section>

				<section className='gm-wizard-block'>
					<h3 className='gm-wizard-block__title'>{t('wizard.sectionMembership')}</h3>
					<Controller name='membership' control={control} render={({ field }) => (
						<ToggleGroup label={t('fields.membership')} value={field.value} onChange={field.onChange}
							options={[{ id: 'basic', label: t('membership.basic') }, { id: 'gold', label: t('membership.gold') }, { id: 'platinum', label: t('membership.platinum') }]}
							error={errors.membership?.message ? t(errors.membership.message) : undefined} />
					)} />
					<Controller name='coachId' control={control} render={({ field }) => (
						<FloatingSelect
							label={t('fields.coach')}
							options={optionsCoach}
							value={field.value}
							onChange={field.onChange}
							icon={<Award className='size-4' />}
							error={errors.coachId?.message ? t(errors.coachId.message) : undefined}
						/>
					)} />
					<div className='sm:col-span-2'>
						<SubscriptionPeriodPicker startValue={subscriptionStart} endValue={subscriptionEnd} setValue={setValue}
							errorStart={errors.subscriptionStart?.message ? t(errors.subscriptionStart.message) : undefined}
							errorEnd={errors.subscriptionEnd?.message ? t(errors.subscriptionEnd.message) : undefined} />
					</div>
				</section>

				<div className='gm-modal-foot'>
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
	const [emailAutoLocked, setEmailAutoLocked] = useState(false);
	const lastAutoEmailRef = useRef('');
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
			name: '', email: '', phone: '', role: 'Client', gender: null,
			membership: 'basic', password: '', coachId: null, birthDate: '',
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
			setEmailAutoLocked(false);
			lastAutoEmailRef.current = '';
			reset();
		}
	}, [open, reset]);

	const watchedName = watch('name');
	useEffect(() => {
		if (!open) return;
		const trimmed = String(watchedName || '').trim();
		if (!trimmed) {
			if (!emailAutoLocked) {
				setValue('email', '', { shouldValidate: false });
				lastAutoEmailRef.current = '';
			}
			return;
		}
		const nextEmail = buildEmailFromName(trimmed);
		const currentEmail = String(getValues('email') || '').trim().toLowerCase();
		const canAutofill = !emailAutoLocked || !currentEmail || currentEmail === lastAutoEmailRef.current;
		if (!canAutofill) return;
		setValue('email', nextEmail, { shouldValidate: true });
		lastAutoEmailRef.current = nextEmail.toLowerCase();
	}, [watchedName, open, emailAutoLocked, getValues, setValue]);

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

		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

		let password = '';
		for (let i = 0; i < 12; i++) {
			password += chars[Math.floor(Math.random() * chars.length)];
		}

		setValue('password', password);
		trigger('password');

		Notification(t('alerts.passwordGenerated'), 'info');
	};

	const onSubmitAccount = async data => {
		setCreating(true);
		try {
			const effectiveRole = isCoachViewer ? 'Client' : (data.role || 'Client');
			const isClient = effectiveRole === 'Client';

			const rawPhone = String(data.phone || '').trim();
			const phone = /^\+\d{1,4}$/.test(rawPhone) ? undefined : (rawPhone || undefined);
			const body = {
				name: data.name,
				email: data.email,
				phone,
				gender: data.gender || undefined,
				birthDate: data.birthDate || undefined,
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

	const stepMeta = {
		account: { label: t('wizard.stepAccount'), icon: User },
		workout: { label: t('wizard.stepWorkout'), icon: Dumbbell },
		meal: { label: t('wizard.stepMeal'), icon: Utensils },
		calories: { label: t('wizard.stepCalories'), icon: Flame },
		send: { label: t('wizard.stepSend'), icon: MessageCircle },
	};

	return (
		<Modal cn="gm-modal-root" panelClassName={`${GM_MODAL} !max-w-3xl`} open={open} onClose={onClose} title={t('wizard.newUser')}>
			<Stepper
				step={stepIndex + 1}
				steps={steps.length}
				items={steps.map((key) => stepMeta[key])}
				onStepSelect={(n) => {
					const next = n - 1;
					if (next < stepIndex) setStepIndex(next);
				}}
			/>
			<p className='gm-wizard-kicker'>
				<span className='gm-wizard-kicker__idx'>{String(stepIndex + 1).padStart(2, '0')}</span>
				<span className='gm-wizard-kicker__title'>{stepTitleMap[currentStep]}</span>
			</p>

			{IS_DEV && (
				<div className='mb-4 flex flex-wrap items-center gap-1.5 rounded-[12px] border border-dashed border-amber-400/70 bg-amber-50/60 px-2 py-1.5 text-[11px]'>
					<span className='rounded-md bg-amber-400 px-1.5 py-0.5 font-bold tracking-wide text-amber-950'>DEV</span>
					<button
						type='button'
						disabled={stepIndex === 0}
						onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
						className='rounded-md px-2 py-1 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40'
					>
						‹ Prev
					</button>
					{steps.map((key, i) => (
						<button
							key={key}
							type='button'
							onClick={() => setStepIndex(i)}
							className={`rounded-md px-2 py-1 font-semibold ${i === stepIndex ? 'bg-amber-400 text-amber-950' : 'text-amber-900 hover:bg-amber-100'}`}
						>
							{key}
						</button>
					))}
					<button
						type='button'
						disabled={stepIndex === steps.length - 1}
						onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
						className='rounded-md px-2 py-1 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40'
					>
						Next ›
					</button>
					{!createdUser && <span className='ms-auto text-amber-800/80'>no user created — saves will fail</span>}
				</div>
			)}

			{/* ===== ACCOUNT STEP ===== */}
			{currentStep === 'account' && (
				<form className='space-y-3.5' onSubmit={handleSubmit(onSubmitAccount)}>
					<section className='gm-wizard-block'>
						<h3 className='gm-wizard-block__title'>{t('wizard.sectionProfile')}</h3>
						<Controller name='name' control={control} render={({ field }) => (
							<FloatingInput label={t('fields.fullName')} value={field.value} onChange={field.onChange} error={errors?.name?.message ? t(errors.name.message) : undefined} icon={<User className='size-4' />} required />
						)} />
						<Controller name='phone' control={control} render={({ field }) => (
							<PhoneField label={t('fields.phone')} value={field.value || ''} onChange={field.onChange}
								error={errors?.phone?.message ? t(errors.phone.message) : ''} required={false}
								name={field.name} setError={setError} clearErrors={clearErrors} t={t} />
						)} />
						<Controller
							name='email'
							control={control}
							render={({ field }) => (
								<FloatingInput
									label={t('fields.email')}
									type='email'
									value={field.value}
									error={errors?.email?.message ? t(errors.email.message) : undefined}
									icon={<Mail className='size-4' />}
									required
									onChange={(v) => {
										const next = String(v || '').trim().toLowerCase();
										const lastAuto = String(lastAutoEmailRef.current || '').trim().toLowerCase();
										if (!next) setEmailAutoLocked(false);
										else if (lastAuto && next !== lastAuto) setEmailAutoLocked(true);
										field.onChange(next);
									}}
								/>
							)}
						/>
						<Controller
							name='birthDate'
							control={control}
							render={({ field }) => (
								<FloatingDate
									label={t('fields.birthDate')}
									value={field.value || ''}
									onChange={field.onChange}
									maxDate='today'
								/>
							)}
						/>
						<Controller name='gender' control={control} render={({ field }) => (
							<ToggleGroup label={t('fields.gender')} value={field.value} onChange={field.onChange}
								options={GENDER_OPTIONS.map(o => ({ id: o.id, label: t(o.label) }))}
								error={errors.gender?.message ? t(errors.gender.message) : undefined} />
						)} />
						{!isCoachViewer && (
							<Controller name='role' control={control} render={({ field }) => (
								<ToggleGroup label={t('fields.role')} value={field.value} onChange={field.onChange}
									options={ROLE_OPTIONS_WIZARD.map(o => ({ id: o.id, label: t(o.label) }))}
									error={errors.role?.message ? t(errors.role.message) : undefined} />
							)} />
						)}
					</section>

					<section className='gm-wizard-block'>
						<h3 className='gm-wizard-block__title'>{t('wizard.sectionAccess')}</h3>
						<Controller name='password' control={control} render={({ field }) => (
							<FloatingInput
								className='sm:col-span-2'
								label={t('fields.password')}
								type={showPassword ? 'text' : 'password'}
								value={field.value}
								onChange={field.onChange}
								error={errors.password?.message ? t(errors.password.message) : undefined}
								clearable={false}
								required
								suffix={(
									<>
										<button type='button' onClick={() => setShowPassword((v) => !v)} className='grid size-7 place-items-center rounded-md text-[var(--gm-muted)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]'>
											{showPassword ? <EyeOff className='size-3.5' /> : <EyeIcon className='size-3.5' />}
										</button>
										<button type='button' onClick={generatePassword} className='grid size-7 place-items-center rounded-md text-[var(--gm-muted)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]'>
											<Sparkles className='size-3.5' />
										</button>
									</>
								)}
							/>
						)} />
					</section>

					{roleAtCreation === 'Client' && (
						<section className='gm-wizard-block'>
							<h3 className='gm-wizard-block__title'>{t('wizard.sectionMembership')}</h3>
							<Controller name='coachId' control={control} render={({ field }) => (
								<FloatingSelect
									label={`${t('fields.coach')}`}
									required
									options={optionsCoach}
									value={field.value}
									onChange={field.onChange}
									icon={<Award className='size-4' />}
									error={errors.coachId?.message ? t(errors.coachId.message) : undefined}
								/>
							)} />
							<Controller name='membership' control={control} render={({ field }) => (
								<ToggleGroup label={t('fields.membership')} value={field.value} onChange={field.onChange}
									options={MEMBERSHIP_OPTIONS.map(o => ({ id: o.id, label: t(o.label) }))}
									error={errors.membership?.message ? t(errors.membership.message) : undefined} />
							)} />
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
						</section>
					)}

					<div className='gm-modal-foot'>
						<button type='submit' disabled={creating || isSubmitting} className='gm-btn-primary disabled:cursor-not-allowed disabled:opacity-50'>
							{(creating || isSubmitting) && <RefreshCw className='size-4 animate-spin' />}
							{creating || isSubmitting ? t('common.creating') : t('wizard.createAndNext')}
						</button>
					</div>
				</form>
			)}

			{/* ===== WORKOUT STEP ===== */}
			{currentStep === 'workout' && (
				<div className='space-y-4'>
					<div className='gm-wizard-toolbar'>
						<div className='flex items-center gap-2.5'>
							<span className='gm-plan__icon size-8!'>
								<Dumbbell className='size-4' />
							</span>
							<span className='text-[13px] font-semibold gm-ink'>{t('pickers.selectOne')}</span>
							{!loadingWorkouts && workoutPlans.length > 0 && <span className='gm-plan__chip'>{workoutPlans.length}</span>}
						</div>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={fetchWorkoutPlans}
								disabled={loadingWorkouts}
								className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-50'
							>
								<RefreshCw className={`size-3.5 ${loadingWorkouts ? 'animate-spin' : ''}`} />
								{t('common.refresh')}
							</button>
							<button
								type='button'
								onClick={() => window.open('/dashboard/workouts/plans', '_blank')}
								className='gm-btn-primary gm-btn-compact'
							>
								<Plus className='size-3.5' />
								{t('pickers.createWorkout')}
								<ExternalLink className='size-3 opacity-70' />
							</button>
						</div>
					</div>

					<PlanPicker
						loading={loadingWorkouts}
						workoutPlans={workoutPlans}
						visibleWorkouts={visibleWorkouts}
						setVisibleWorkouts={setVisibleWorkouts}
						plans={workoutPlans}
						defaultSelectedId={selectedWorkout}
						onSelect={setSelectedWorkout}
						onBack={() => setStepIndex(steps.indexOf('account'))}
						onSkip={() => setStepIndex(steps.indexOf('meal'))}
						onAssign={() => assignWorkout(selectedWorkout)}
						assigning={assigningW}
					/>
				</div>
			)}

			{/* ===== MEAL STEP ===== */}
			{currentStep === 'meal' && (
				<div className='space-y-4'>
					<div className='gm-wizard-toolbar'>
						<div className='flex items-center gap-2.5'>
							<span className='gm-plan__icon size-8!'>
								<Utensils className='size-4' />
							</span>
							<span className='text-[13px] font-semibold gm-ink'>{t('pickers.selectOne')}</span>
							{!loadingMeals && mealPlans.length > 0 && <span className='gm-plan__chip'>{mealPlans.length}</span>}
						</div>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={fetchMealPlans}
								disabled={loadingMeals}
								className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-50'
							>
								<RefreshCw className={`size-3.5 ${loadingMeals ? 'animate-spin' : ''}`} />
								{t('common.refresh')}
							</button>
							<button
								type='button'
								onClick={() => window.open('/dashboard/nutrition', '_blank')}
								className='gm-btn-primary gm-btn-compact'
							>
								<Plus className='size-3.5' />
								{t('pickers.createMeal')}
								<ExternalLink className='size-3 opacity-70' />
							</button>
						</div>
					</div>

					<MealPlanPicker
						loading={loadingMeals}
						mealPlans={mealPlans}
						visibleMeals={visibleMeals}
						setVisibleMeals={setVisibleMeals}
						meals={mealPlans}
						onBack={() => setStepIndex(steps.indexOf('workout'))}
						onSkip={() => setStepIndex(steps.indexOf('calories'))}
						onAssign={handleAssignMeal}
						assigning={assigningM}
					/>
				</div>
			)}

			{/* ===== CALORIES STEP ===== */}
			{currentStep === 'calories' && (
				<CaloriesStep
					userId={createdUser?.user?.id}
					initialValues={{}}
					clientSeed={{
						name: getValues('name'),
						email: createdUser?.email || getValues('email') || '',
						sex: getValues('gender') || '',
						age: ageFromBirth(getValues('birthDate')),
					}}
					onBack={() => setStepIndex(steps.indexOf('meal'))}
					onNext={() => setStepIndex(steps.indexOf('send'))}
				/>
			)}

			{/* ===== SEND CREDENTIALS STEP ===== */}
			{currentStep === 'send' && (
				<div className='space-y-4'>
					<div className='gm-share-hero'>
						<div className='gm-cred__icon'>
							<CheckCircle2 className='size-4' />
						</div>
						<div className='min-w-0'>
							<h3>{t('wizard.shareTitle')}{getValues('name') ? ` · ${getValues('name')}` : ''}</h3>
							<p>{t('wizard.shareBody')}</p>
						</div>
					</div>

					<div className='space-y-2.5'>
						<FieldRow icon={<Mail className='size-4' />} label={t('fields.email')} value={createdUser?.email || getValues('email')} canCopy />
						<PasswordRow label={t('fields.password')} value={getValues('password') ? getValues('password') : t('wizard.passwordByEmail')} canCopy={Boolean(getValues('password'))} />
						<PhoneField
							label={t('wizard.phoneForWhatsapp')}
							value={summaryPhone || ''}
							onChange={setSummaryPhone}
						/>
					</div>

					<div className='flex items-center justify-between gap-2'>
						<span className='text-[11px] font-extrabold uppercase tracking-wide gm-muted'>{t('wizard.messagePreview')}</span>
						<CopyButton
							label={t('wizard.copyAll')}
							text={buildWhatsAppMessage({
								email: createdUser?.email || getValues('email'),
								password: getValues('password'),
								lang,
							})}
						/>
					</div>
					<pre className='gm-share-preview'>
						{buildWhatsAppMessage({
							email: createdUser?.email || getValues('email'),
							password: getValues('password'),
							lang,
						})}
					</pre>

					<div className='gm-modal-foot'>
						<button type='button' onClick={onClose} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>
							{t('common.done')}
						</button>
						<button
							type='button'
							onClick={handleSendCreds}
							disabled={!String(summaryPhone || '').replace(/[^0-9]/g, '')}
							className='gm-btn-primary disabled:cursor-not-allowed disabled:opacity-50'
						>
							<MessageCircle className='size-4' />
							{t('common.sendWhatsapp')}
						</button>
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
	const user = useUser();
	const [renewModal, setRenewModal] = useState({ open: false, user: null });
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
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

	useEffect(() => {
		setLimit(getStoredPerPage(10));
	}, []);

	async function fetchMe() {
		try {
			const r = await api.get('/auth/me');
			setMyRole(r?.data?.role);
		} catch { }
	}

	async function fetchUsers() {
		if (user === undefined) return; // wait for client hydration of localStorage
		if (!user?.id) {
			setLoading(false);
			setErr(t('alerts.loadUsersFailed'));
			return;
		}
		setLoading(true);
		setErr(null);
		try {
			const params = { page, limit, sortBy, sortOrder };
			if (debounced) params.search = debounced;
			if (roleFilter !== 'All') params.role = roleFilter.toLowerCase();
			if (hasPlanFilter === 'With plan') params.hasPlan = true;
			else if (hasPlanFilter === 'No plan') params.hasPlan = false;

			const role = String(user.role || myRole || '').toLowerCase();
			const isAdmin = role === 'admin' || role === 'super_admin';
			const res = isAdmin
				? await api.get('/auth/users', { params })
				: await api.get(`/auth/coaches/${user.id}/clients`, { params });
			const data = res.data || {};
			const list = Array.isArray(data.users)
				? data.users
				: Array.isArray(data.clients)
					? data.clients
					: Array.isArray(data)
						? data
						: [];

			const mapped = list.map(u => ({
				id: u.id, name: u.name, email: u.email, role: normRole(u.role),
				status: normStatus(u.status), phone: u.phone || '',
				membership: u.membership || '-',
				birthDate: u.birthDate || '-',
				subscriptionStart: u.subscriptionStart || '-',
				subscriptionEnd: u.subscriptionEnd || '-',
				joinDate: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
				activePlanId: u.activePlanId ?? u.planId ?? null,
				planName: u.activePlan?.name || '-',
				planMealName: u.activeMealPlan?.name || '-',
				coachId: u.coachId ?? u.assignedCoachId ?? null,
				coachName: u.coach?.name || u.coachName || u.assignedCoachName || null,
				gender: u.gender || null,
				canEditWorkout: u.canEditWorkout || null,
				lastLogin: u.lastLogin || null,
			}));

			setRows(mapped);
			setTotal(Number(data?.total ?? mapped.length) || 0);
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
	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);
	const listRole = String(user?.role || myRole || '').toLowerCase();
	useEffect(() => {
		fetchUsers();
		// listRole collapses user.role and /auth/me so the list is not requested twice for the same role.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, limit, sortBy, sortOrder, debounced, roleFilter, hasPlanFilter, user?.id, listRole]);

	const [confirmDelete, setConfirmDelete] = useState(null);
	const [deletingUser, setDeletingUser] = useState(false);
	const deleteUser = row => setConfirmDelete(row);
	const confirmDeleteUser = async () => {
		const row = confirmDelete;
		if (!row) return;
		setDeletingUser(true);
		try {
			await api.delete(`/auth/user/${row.id}`);
			fetchUsers(); fetchStats();
			Notification(t('alerts.userDeleted'), 'success');
			setConfirmDelete(null);
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.deleteFailed'), 'error');
		} finally {
			setDeletingUser(false);
		}
	};

	const [bulkDeleting, setBulkDeleting] = useState(false);
	const deleteSelectedUsers = async (ids) => {
		if (!ids?.length) return;
		setBulkDeleting(true);
		try {
			const results = await Promise.allSettled(ids.map(id => api.delete(`/auth/user/${id}`)));
			const failed = results.filter(r => r.status === 'rejected').length;
			fetchUsers(); fetchStats();
			if (failed === 0) {
				Notification(t('alerts.usersDeleted', { count: ids.length }), 'success');
			} else {
				Notification(t('alerts.deleteFailed'), 'error');
			}
		} finally {
			setBulkDeleting(false);
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

	const toggleWorkoutEdit = async (row) => {
		const next = !row.canEditWorkout;
		try {
			await api.put(`/auth/admin/users/${row.id}/workout-edit-toggle`, { canEditWorkout: next });
			fetchUsers();
			Notification(
				t('workoutEdit.toggleSuccess', { status: next ? t('workoutEdit.enabled') : t('workoutEdit.disabled'), name: row.name }),
				'success'
			);
		} catch (e) {
			Notification(e?.response?.data?.message || t('workoutEdit.toggleFailed'), 'error');
		}
	};

	const buildRowActions = row => {
		const viewer = String(myRole || '').toLowerCase();
		const isAdmin = viewer === 'admin';
		const canManage = isAdmin || viewer === 'coach';
		const openWhatsApp = () => {
			const phone = String(row.phone || '').replace(/[^0-9]/g, '');
			if (!phone) return Notification(t('alerts.noPhone'), 'error');
			window.open(`https://wa.me/${phone}`, '_blank');
		};

		const opts = [
			{ key: 'profile', group: 'view', icon: I(Eye), label: t('actions.openProfile'), onClick: () => (window.location.href = `/dashboard/users/${row.id}`) },
		];

		if (isAdmin && row.status === 'pending') {
			opts.push(
				{ key: 'approve', group: 'review', icon: I(CheckCircle2), label: 'Approve user', onClick: () => updateUserStatus(row, 'active') },
				{ key: 'reject', group: 'review', icon: I(XCircle), label: 'Reject user', onClick: () => updateUserStatus(row, 'suspended') },
			);
		}

		if (canManage) {
			opts.push(
				{ key: 'renew', group: 'program', icon: I(RotateCcw), label: t('actions.renewSubscription'), onClick: () => setRenewModal({ open: true, user: row }) },
				{ key: 'workout', group: 'program', icon: I(Dumbbell), label: t('actions.assignWorkout'), onClick: () => setPickerWorkout({ open: true, user: row }) },
				{ key: 'meal', group: 'program', icon: I(Utensils), label: t('actions.assignMeal'), onClick: () => setPickerMeal({ open: true, user: row }) },
			);
		}

		if (isAdmin) {
			opts.push(
				{ key: 'edit', group: 'account', icon: I(PencilLine), label: t('actions.editDetails'), onClick: () => { setSelectedUser(row); setEditUserOpen(true); } },
				{
					key: 'workoutEdit',
					group: 'account',
					icon: I(ListChecks),
					label: row.canEditWorkout ? t('actions.disableWorkoutEdit') : t('actions.enableWorkoutEdit'),
					onClick: () => toggleWorkoutEdit(row),
				},
			);
		}

		opts.push(
			{ key: 'shareCreds', group: 'contact', icon: I(MessageCircle), label: t('actions.shareCredsWhatsapp'), onClick: () => openShareCredsModal(row) },
			{ key: 'whatsapp', group: 'contact', icon: I(PhoneCall), label: t('actions.whatsapp'), onClick: openWhatsApp },
			{ key: 'chat', group: 'contact', icon: I(MessageSquare), label: t('actions.directChat'), onClick: () => window.open(`/dashboard/chat?userId=${row.id}`, '_blank') },
		);

		if (isAdmin) {
			opts.push({ key: 'delete', group: 'danger', icon: I(Trash2), label: t('actions.delete'), onClick: () => deleteUser(row), danger: true });
		}

		return opts;
	};

	const columns = [
		{
			key: 'name',
			header: t('table.name'),
			headClassName: 'min-w-[240px]',
			cell: (r) => <MemberCell row={r} />,
		},
		{
			key: 'role',
			header: t('table.role'),
			cell: (r) => <RoleTag role={r.role} />,
		},
		{
			key: 'membership',
			header: t('table.membership'),
			cell: (r) => <TierTag membership={r.membership} />,
		},
		{
			key: 'program',
			header: t('roster.program'),
			headClassName: 'min-w-[180px]',
			className: 'max-w-[240px]',
			cell: (r) => <ProgramCell workout={r.planName} meal={r.planMealName} />,
		},
		{
			key: 'coachName',
			header: t('table.coach'),
			className: 'max-w-[200px]',
			cell: (r) => <CoachCell name={r.coachName} />,
		},
		{
			key: 'gender',
			header: t('table.gender'),
			cell: (r) => <GenderCell gender={r.gender} />,
		},
		{
			key: 'status',
			header: t('table.status'),
			cell: (r) => <StatusCell row={r} />,
		},
		{
			key: 'lastLogin',
			header: t('table.lastLogin'),
			cell: (r) => {
				const when = r.lastLogin ? new Date(r.lastLogin) : null;
				const label = when && !Number.isNaN(when.getTime())
					? when.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
						day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
					})
					: t('table.never');
				return (
					<span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-[var(--gm-muted)]">
						<Clock className="size-3.5 shrink-0" aria-hidden />
						{label}
					</span>
				);
			},
		},
		{
			key: 'actions',
			header: t('table.actions'),
			cell: (r) => (
				<ActionsMenu
					options={buildRowActions(r)}
					align='right'
					ariaLabel={t('table.actions')}
					buttonClassName='rs-row-action'
					header={(
						<>
							<span className='am-head__title'>{r.name}</span>
							{r.email && <span className='am-head__sub'>{r.email}</span>}
						</>
					)}
				/>
			),
		},
	];

	const toggleSort = field => {
		if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
		else { setSortBy(field); setSortOrder('ASC'); }
	};

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

	const FILTER_PLAN_OPTIONS = [
		{ id: 'All', name: t('filters.allPlans') || 'All plans' },
		{ id: 'With plan', name: t('filters.withPlan') || 'With plan' },
		{ id: 'No plan', name: t('filters.noPlan') || 'No plan' },
	];

	const clearFilters = () => {
		setSearchText('');
		setRoleFilter('All');
		setHasPlanFilter('All');
		setPage(1);
	};

	const changeSearch = (value) => { setSearchText(value); setPage(1); };
	const changeRole = (id) => { setRoleFilter(id || 'All'); setPage(1); };
	const changePlan = (id) => { setHasPlanFilter(id || 'All'); setPage(1); };
	const roleSegments = [
		{ id: 'All', name: t('filters.allRoles'), short: t('roster.all') },
		{ id: 'Coach', name: t('roles.coach') },
		{ id: 'Client', name: t('roles.client') },
	];

	return (
		<div className='gm-surface rs-scope app-stack pb-4'>
			<RosterSummary
				stats={stats}
				showMetrics={String(myRole || '').toLowerCase() === 'admin'}
				canCreate={['admin', 'coach'].includes(viewerRole)}
				onCreate={() => setWizardOpen(true)}
				onReviewPending={fetchPendingForReview}
			/>

			{err && (
				<div role='alert' className='flex items-center gap-2 rounded-[14px] border border-rose-200/70 bg-rose-50/80 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'>
					<XCircle className='size-4 shrink-0' /> {err}
				</div>
			)}

			<DataTable
				hideToolbar
				toolbar={(
					<RosterToolbar
						search={searchText}
						onSearch={changeSearch}
						searching={searchText.trim() !== debounced || (loading && Boolean(debounced))}
						role={roleFilter}
						onRole={changeRole}
						plan={hasPlanFilter}
						onPlan={changePlan}
						onClearAll={clearFilters}
						total={total}
						roleOptions={roleSegments}
						planOptions={FILTER_PLAN_OPTIONS}
					/>
				)}
				compact
				columns={columns}
				data={rows}
				isLoading={loading}
				labels={{
					emptyTitle: t('common.noResults'),
					emptySubtitle: t('common.tryAdjusting'),
					preview: t('common.preview'),
					selectedCount: t.raw('common.selectedCount'),
					clearSelection: t('common.clearSelection'),
				}}
				pagination={{
					current_page: page,
					per_page: limit,
					total_records: total,
				}}
				onPageChange={({ page: nextPage, per_page }) => {
					const nextLimit = Number(per_page ?? limit);
					setStoredPerPage(nextLimit);
					setLimit(nextLimit);
					setPage(Number(nextPage ?? 1));
				}}
				perPageOptions={[10, 20, 30, 50]}
				hoverable
				selectable={viewerRole === 'admin'}
				bulkActions={viewerRole === 'admin' ? [
					{
						key: 'delete',
						label: t('actions.deleteSelected'),
						icon: <Trash2 />,
						variant: 'red',
						loading: bulkDeleting,
						confirm: { message: (count) => t('dialogs.deleteMultipleUsersConfirm', { count }) },
						onClick: (ids) => deleteSelectedUsers(ids),
					},
				] : []}
			/>

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
			<Modal cn="gm-modal-root" panelClassName={GM_MODAL}
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
					<div className='gm-modal-foot'>
						<Button color='neutral' name={t('common.cancel')} onClick={closeShareCredsModal} />
						<Button color='green' name={t('common.sendWhatsapp')} onClick={sendCredsWhatsapp}
							loading={shareCredsModal.saving} disabled={shareCredsModal.saving} icon={<MessageCircle size={16} />} />
					</div>
				</div>
			</Modal>


			<RenewSubscriptionModal
				open={renewModal.open}
				onClose={() => setRenewModal({ open: false, user: null })}
				user={renewModal.user}
				onSaved={() => {
					setRenewModal({ open: false, user: null });
					fetchUsers();
					fetchStats();
				}}
			/>


			<Modal cn="gm-modal-root" panelClassName={GM_MODAL} open={Boolean(confirmDelete)} onClose={() => !deletingUser && setConfirmDelete(null)} title={t('actions.delete')}>
				<p className='text-sm leading-relaxed gm-ink-soft'>
					{confirmDelete ? t('dialogs.deleteUserConfirm', { name: confirmDelete.name }) : ''}
				</p>
				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('common.cancel')} onClick={() => setConfirmDelete(null)} disabled={deletingUser} />
					<Button color='red' name={t('actions.delete')} onClick={confirmDeleteUser} loading={deletingUser} disabled={deletingUser} icon={<Trash2 className='size-4' />} />
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
			{rest.label && <label className='mb-1.5 block ps-1 text-[12px] font-medium gm-muted'>{rest.label}</label>}
			<div
				className='relative flex items-center rounded-[10px] border bg-[color-mix(in_srgb,var(--gm-paper)_55%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-200'
				style={{ borderColor: 'var(--gm-line)' }}
				onFocus={e => {
					const wrapper = e.currentTarget;
					wrapper.style.borderColor = 'var(--color-primary-500)';
					wrapper.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 12%, transparent)';
				}}
				onBlur={e => {
					const wrapper = e.currentTarget;
					wrapper.style.borderColor = 'var(--gm-line)';
					wrapper.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.72)';
				}}
			>
				<input
					{...rest}
					ref={inputRef}
					name={name}
					value={value}
					onChange={onChange}
					onBlur={onBlur}
					className={`${cnInput || ''} h-[39px] w-full rounded-[10px] bg-transparent px-3 py-2 text-[13px] gm-ink-soft outline-none placeholder:text-[var(--gm-faint)]`}
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
		<Modal cn="gm-modal-root" panelClassName={GM_MODAL}
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
						<RefreshCw className="size-8 animate-spin gm-muted" />
						<p className="text-sm font-medium gm-muted">
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
							<p className="text-sm font-semibold gm-ink">
								{t_('common.noPendingAccounts')}
							</p>
							<p className="mt-1 text-xs gm-muted">
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
								<p className="mt-0.5 text-xs gm-muted">
									{t_('pending.bannerDescription')}
								</p>
							</div>
						</div>

						{/* Scrollable table */}
						<div className="max-h-[420px] overflow-y-auto rounded-[14px] border bg-[color-mix(in_srgb,var(--gm-paper)_40%,transparent)] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent" style={{ borderColor: 'var(--gm-line)' }}>
							<table className="min-w-full text-sm">
								<thead className="sticky top-0 z-10 gm-ink-soft" style={{ background: 'color-mix(in srgb, var(--color-primary-50) 80%, transparent)' }}>
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
												className="border-t transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_50%,transparent)]"
												style={{ borderColor: 'var(--gm-line)' }}
											>
												<td className="text-nowrap px-3 py-3 font-semibold gm-ink">
													{row.name}
												</td>
												<td className="px-3 py-3 gm-ink-soft">
													{row.email}
												</td>
												<td className="px-3 py-3">
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
														{t_(`roles.${row.role}`)}
													</span>
												</td>
												<td className="px-3 text-nowrap py-3 gm-ink-soft">
													{row.coachName ? (
														<span className="inline-flex items-center gap-1">
															<span className="text-xs">{t_('pending.from')}</span>
															<span className="font-semibold">{row.coachName}</span>
														</span>
													) : (
														<span className="text-xs italic gm-faint">
															{t_('pending.selfSignup')}
														</span>
													)}
												</td>
												<td className="px-3 text-nowrap py-3 text-xs gm-muted">
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
						<div className="flex items-center justify-between pt-1 text-xs gm-muted">
							<span>
								{t_('pending.footerShowing', {
									count: pendingModal.items.length,
									text: pendingModal.items.length === 1
										? t_('pending.accountSingular')
										: t_('pending.accountPlural')
								})}
							</span>
							<span className="gm-faint">
								{t_('pending.footerReview')}
							</span>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</Modal>
	);
}




function RenewSubscriptionModal({ open, onClose, user, onSaved }) {
	const t = useTranslations('users');
	const [saving, setSaving] = useState(false);

	const { handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
		defaultValues: {
			subscriptionStart: user?.subscriptionStart && user.subscriptionStart !== '-' ? user.subscriptionStart : new Date().toISOString().slice(0, 10),
			subscriptionEnd: user?.subscriptionEnd && user.subscriptionEnd !== '-' ? user.subscriptionEnd : new Date().toISOString().slice(0, 10),
		},
		resolver: yupResolver(
			yup.object({
				subscriptionStart: yup.string().required('errors.startRequired'),
				subscriptionEnd: yup.string()
					.required('errors.endRequired')
					.test('end-after-start', 'errors.endAfterStart', function (end) {
						const start = this.parent.subscriptionStart;
						if (!start || !end) return true;
						return new Date(end) >= new Date(start);
					}),
			})
		),
		mode: 'onBlur',
	});

	useEffect(() => {
		if (open && user) {
			reset({
				subscriptionStart:
					user?.subscriptionStart && user.subscriptionStart !== '-'
						? user.subscriptionStart
						: new Date().toISOString().slice(0, 10),
				subscriptionEnd:
					user?.subscriptionEnd && user.subscriptionEnd !== '-'
						? user.subscriptionEnd
						: new Date().toISOString().slice(0, 10),
			});
		}
	}, [open, user, reset]);

	const subscriptionStart = watch('subscriptionStart');
	const subscriptionEnd = watch('subscriptionEnd');

	const onSubmit = async data => {
		if (!user?.id) return;

		setSaving(true);
		try {
			await api.put(`/auth/user/${user.id}`, {
				subscriptionStart: data.subscriptionStart,
				subscriptionEnd: data.subscriptionEnd,
			});

			Notification(t('alerts.subscriptionRenewed'), 'success');
			onSaved?.();
			onClose?.();
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.renewSubscriptionFailed'), 'error');
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal cn="gm-modal-root" panelClassName={GM_MODAL}
			open={open}
			onClose={onClose}
			title={`${t('actions.renewSubscription')}${user?.name ? ` • ${user.name}` : ''}`}
		>
			<form className='space-y-5' onSubmit={handleSubmit(onSubmit)}>
				<div className='gm-wizard-banner'>
					<div>
						<div className='text-[13px] font-semibold gm-ink'>{t('renewSubscription.currentData')}</div>
						<div className='mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 text-[13px]'>
							<div>
								<div className='gm-muted'>{t('fields.fullName')}</div>
								<div className='font-semibold gm-ink'>{user?.name || '—'}</div>
							</div>
							<div>
								<div className='gm-muted'>{t('fields.email')}</div>
								<div className='font-semibold gm-ink'>{user?.email || '—'}</div>
							</div>
						</div>
					</div>
				</div>

				<SubscriptionPeriodPicker
					startValue={subscriptionStart}
					endValue={subscriptionEnd}
					setValue={setValue}
					errorStart={errors.subscriptionStart?.message ? t(errors.subscriptionStart.message) : undefined}
					errorEnd={errors.subscriptionEnd?.message ? t(errors.subscriptionEnd.message) : undefined}
				/>

				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('common.cancel')} onClick={onClose} />
					<Button
						color='primary'
						type='submit'
						name={t('actions.renewSubscription')}
						loading={saving}
						disabled={saving}
						icon={<RotateCcw className='w-4 h-4' />}
					/>
				</div>
			</form>
		</Modal>
	);
}
