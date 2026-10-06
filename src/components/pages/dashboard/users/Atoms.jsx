'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Plus, Users as UsersIcon, CheckCircle2, XCircle, Shield, ChevronUp, ChevronDown, Eye, Clock, Search, BadgeCheck, ListChecks, Power, Trash2, Check, EyeOff, Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, Edit3, KeyRound, Copy, User, Mail, Phone, Calendar, Crown, Award, Users, Globe, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import MultiLangText from '@/components/atoms/MultiLangText';
import FloatingDate from '@/components/atoms/FloatingDate';
import FloatingInput from '@/components/atoms/FloatingInput';
import 'flatpickr/dist/themes/airbnb.css';

/* ===========================
	 Stepper
=========================== */
export function Stepper({ step = 1, steps = 4, items, onStepSelect }) {
	const t = useTranslations('Stepper');
	const list = Array.isArray(items) && items.length
		? items
		: Array.from({ length: steps }, (_, i) => ({ key: i + 1, label: String(i + 1) }));

	const total = list.length;
	const progress = total > 1 ? Math.min(Math.max((step - 1) / (total - 1), 0), 1) : 1;

	return (
		<div
			className='gm-stepper mb-5'
			style={{ '--n': total, '--p': progress }}
			role='progressbar'
			aria-label={t('progress')}
			aria-valuemin={1}
			aria-valuemax={total}
			aria-valuenow={step}>
			<span className='gm-stepper__track' aria-hidden>
				<span className='gm-stepper__fill' />
			</span>
			{list.map((item, i) => {
				const idx = i + 1;
				const done = step > idx;
				const active = step === idx;
				const Icon = item.icon;
				const clickable = Boolean(onStepSelect) && (done || active);
				return (
					<button
						key={item.key || idx}
						type='button'
						disabled={!clickable}
						onClick={() => clickable && onStepSelect?.(idx)}
						className={`gm-stepper__item ${done ? 'is-done' : ''} ${active ? 'is-active' : ''} ${clickable ? 'is-clickable' : ''}`}
						aria-current={active ? 'step' : undefined}
					>
						<span className='gm-stepper__dot'>
							{done ? <Check className='size-4' strokeWidth={2.8} /> : Icon ? <Icon className='size-4' strokeWidth={2} /> : idx}
						</span>
						<span className='gm-stepper__label'>{item.label}</span>
						<span className='gm-stepper__sub'>{t('stepOf', { current: idx, total })}</span>
					</button>
				);
			})}
		</div>
	);
}

export function PlanPicker({
	workoutPlans,
	visibleWorkouts,
	setVisibleWorkouts,
	buttonName,
	plans = [],
	defaultSelectedId = null,
	onSelect,
	onAssign,
	onSkip,
	onBack,
	assigning = false,
	loading = false,
	hideSearch = false,
}) {
	const t = useTranslations('Plans');
	const tu = useTranslations('users');
	const tc = useTranslations('Common');
	const common = useTranslations('common');

	const [selectedId, setSelectedId] = useState(defaultSelectedId);
	const [query, setQuery] = useState('');

	const handleSelect = id => {
		setSelectedId(id);
		onSelect?.(id);
	};

	const source = (workoutPlans?.length ? workoutPlans : plans) || [];
	const q = query.trim().toLowerCase();
	const matched = !q ? source : source.filter((p) => {
		const name = String(p.name || p.title || '').toLowerCase();
		const desc = String(p.description || p.desc || '').toLowerCase();
		return name.includes(q) || desc.includes(q);
	});
	const visiblePlans = q ? matched : matched.slice(0, visibleWorkouts || matched.length);
	const showEmpty = !loading && source.length === 0;
	const showMiss = !loading && source.length > 0 && visiblePlans.length === 0;
	const selected = source.find((p) => p.id === selectedId);
	const showSkip = Boolean(onSkip) && !buttonName;

	const renderSkeletonCard = (_, i) => (
		<motion.div
			key={`skeleton-${i}`}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
			className='rounded-[14px] border animate-pulse p-4'
			style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 70%, transparent)' }}>
			<div className='flex items-center gap-3 mb-3'>
				<div className='h-9 w-9 rounded-[11px]' style={{ backgroundColor: 'var(--color-primary-200)' }} />
				<div className='flex-1 space-y-2'>
					<div className='h-3 w-2/3 rounded' style={{ background: 'color-mix(in srgb, var(--gm-ink) 10%, transparent)' }} />
					<div className='h-2.5 w-1/3 rounded' style={{ background: 'color-mix(in srgb, var(--gm-ink) 6%, transparent)' }} />
				</div>
			</div>
		</motion.div>
	);

	return (
		<div className='space-y-3.5'>
			{!hideSearch && !loading && source.length > 0 && (
				<FloatingInput
					label={tu('wizard.searchPlans')}
					value={query}
					onChange={setQuery}
					icon={<Search className='size-4' />}
				/>
			)}

			{selected ? (
				<div className='gm-pick-selected'>
					<span className='gm-pick-selected__k'>{tu('wizard.selectedPlan')}</span>
					<MultiLangText className='min-w-0 flex-1'>{selected.name || t('untitled')}</MultiLangText>
					<button type='button' className='gm-pick-selected__clear' onClick={() => handleSelect(null)}>
						{tu('common.clearSelection')}
					</button>
				</div>
			) : null}

			<AnimatePresence mode='popLayout'>
				{loading ? (
					<motion.div key='loading' layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{Array.from({ length: 6 }).map(renderSkeletonCard)}
					</motion.div>
				) : showEmpty || showMiss ? (
					<motion.div key='empty' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='gm-pick-empty'>
						<span className='gm-pick-empty__icon'><Dumbbell className='size-5' /></span>
						<div className='gm-pick-empty__title'>{showMiss ? tu('wizard.noneMatch') : tu('wizard.noPlansTitle')}</div>
						<p className='gm-pick-empty__hint'>{showMiss ? t('empty') : tu('wizard.noPlansHint')}</p>
					</motion.div>
				) : (
					<motion.div key='plans' layout role='radiogroup' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{visiblePlans.map((plan, i) => {
							const isSelected = selectedId === plan.id;
							const rawDays = plan.program?.days || plan.days || [];
							const activeDays = new Set(
								rawDays.map(d => String(d.day || d.dayOfWeek || '').toLowerCase()).filter(d => WEEK_ORDER.includes(d)),
							);

							return (
								<motion.button
									key={plan.id}
									layout
									type='button'
									role='radio'
									aria-checked={isSelected}
									onClick={() => handleSelect(plan.id)}
									onDoubleClick={() => { handleSelect(plan.id); onAssign?.(plan.id); }}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }}
									className={`gm-plan ${isSelected ? 'is-on' : ''}`}>
									<PlanCardHead icon={Dumbbell} isSelected={isSelected} />
									<MultiLangText className='mt-3 text-[13.5px] font-semibold leading-snug gm-ink line-clamp-2'>
										{plan.name || t('untitled')}
									</MultiLangText>
									{plan.description || plan.desc ? (
										<p className='gm-plan__desc'>{String(plan.description || plan.desc)}</p>
									) : null}

									<div className='mt-auto flex items-center justify-between gap-2 pt-3'>
										<span className='inline-flex items-center gap-1.5 text-[11.5px] font-medium gm-muted'>
											<CalendarDays className='size-3.5' />
											{t('daysCount', { count: rawDays.length })}
											{Number(plan.clientsUsingCount) > 0 ? (
												<>
													<span className='gm-faint'>·</span>
													<Users className='size-3.5' />
													{Number(plan.clientsUsingCount)}
												</>
											) : null}
										</span>
										{activeDays.size > 0 && (
											<span className='gm-week' aria-hidden>
												{WEEK_ORDER.map(day => (
													<span key={day} title={common(day)} className={activeDays.has(day) ? 'is-on' : ''} />
												))}
											</span>
										)}
									</div>
								</motion.button>
							);
						})}
					</motion.div>
				)}
			</AnimatePresence>

			{!q && source.length > (visibleWorkouts || 0) && typeof setVisibleWorkouts === 'function' ? (
				<button type='button' onClick={() => setVisibleWorkouts(v => Number(v || 0) + 6)} className='gm-btn-ghost gm-btn-compact'>
					{tc('seeMore')}
				</button>
			) : null}

			<div className='gm-modal-foot'>
				{onBack ? (
					<button type='button' onClick={onBack} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>
						{tc('back')}
					</button>
				) : null}
				<div className='ms-auto flex gap-2'>
					{showSkip ? (
						<button type='button' onClick={onSkip} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>
							{tc('skip')}
						</button>
					) : null}
					<button
						type='button'
						onClick={() => onAssign?.(selectedId)}
						disabled={!selectedId || assigning}
						className='gm-btn-primary disabled:opacity-60 disabled:cursor-not-allowed'
					>
						{assigning ? tc('assigning') : buttonName || tc('assignNext')}
					</button>
				</div>
			</div>
		</div>
	);
}

function PlanCardHead({ icon: Icon, isSelected }) {
	return (
		<div className='flex items-start justify-between gap-2'>
			<span className='gm-plan__icon' aria-hidden>
				<Icon className='size-[18px]' strokeWidth={1.9} />
			</span>
			<span className='gm-radio' aria-hidden>
				{isSelected ? <Check className='size-3' strokeWidth={3} /> : null}
			</span>
		</div>
	);
}

const WEEK_ORDER = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export function orderDays(days) {
	const map = Object.fromEntries(WEEK_ORDER.map((d, i) => [d, i]));
	return [...days].sort((a, b) => (map[a.day] ?? 99) - (map[b.day] ?? 99));
}

export function MealPlanPicker({
	loading,
	mealPlans = [],
	visibleMeals,
	setVisibleMeals,
	meals = [],
	defaultSelectedId = null,
	assigning = false,
	buttonName,
	onSelect,
	onBack,
	onSkip,
	onAssign,
}) {
	const t = useTranslations('Meals');
	const tu = useTranslations('users');
	const tc = useTranslations('Common');

	const [selectedId, setSelectedId] = useState(defaultSelectedId);
	const [query, setQuery] = useState('');

	const handleSelect = id => {
		setSelectedId(id);
		onSelect?.(id);
	};

	const source = (mealPlans?.length ? mealPlans : meals) || [];
	const q = query.trim().toLowerCase();
	const matched = !q ? source : source.filter((p) => {
		const name = String(p.name || p.title || '').toLowerCase();
		const desc = String(p.description || p.desc || '').toLowerCase();
		return name.includes(q) || desc.includes(q);
	});
	const visible = q ? matched : matched.slice(0, visibleMeals || matched.length);
	const showEmpty = !loading && source.length === 0;
	const showMiss = !loading && source.length > 0 && visible.length === 0;
	const selected = source.find((p) => p.id === selectedId);

	const renderSkeletonCard = (_, i) => (
		<motion.div
			key={`meal-skeleton-${i}`}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
			className='rounded-[14px] border animate-pulse p-4'
			style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 70%, transparent)' }}>
			<div className='h-9 w-9 rounded-[11px]' style={{ backgroundColor: 'var(--color-primary-200)' }} />
			<div className='mt-3 h-3 w-2/3 rounded' style={{ background: 'color-mix(in srgb, var(--gm-ink) 10%, transparent)' }} />
		</motion.div>
	);

	return (
		<div className='space-y-3.5'>
			{!loading && source.length > 0 && (
				<FloatingInput
					label={tu('wizard.searchPlans')}
					value={query}
					onChange={setQuery}
					icon={<Search className='size-4' />}
				/>
			)}

			{selected ? (
				<div className='gm-pick-selected'>
					<span className='gm-pick-selected__k'>{tu('wizard.selectedPlan')}</span>
					<MultiLangText className='min-w-0 flex-1'>{selected.name || t('untitled')}</MultiLangText>
					<button type='button' className='gm-pick-selected__clear' onClick={() => handleSelect(null)}>
						{tu('common.clearSelection')}
					</button>
				</div>
			) : null}

			<AnimatePresence mode='popLayout'>
				{loading ? (
					<motion.div key='loading' layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{Array.from({ length: 6 }).map(renderSkeletonCard)}
					</motion.div>
				) : showEmpty || showMiss ? (
					<motion.div key='empty' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='gm-pick-empty'>
						<span className='gm-pick-empty__icon'><Utensils className='size-5' /></span>
						<div className='gm-pick-empty__title'>{showMiss ? tu('wizard.noneMatch') : tu('wizard.noMealsTitle')}</div>
						<p className='gm-pick-empty__hint'>{showMiss ? t('empty') : tu('wizard.noMealsHint')}</p>
					</motion.div>
				) : (
					<motion.div key='meals' layout role='radiogroup' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{visible.map((plan, i) => {
							const isSelected = selectedId === plan.id;
							return (
								<motion.button
									key={plan.id}
									layout
									type='button'
									role='radio'
									aria-checked={isSelected}
									onClick={() => handleSelect(plan.id)}
									onDoubleClick={() => { handleSelect(plan.id); onAssign?.(plan.id); }}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }}
									className={`gm-plan ${isSelected ? 'is-on' : ''}`}>
									<PlanCardHead icon={Utensils} isSelected={isSelected} />
									<MultiLangText className='mt-3 text-[13.5px] font-semibold leading-snug gm-ink line-clamp-2'>
										{plan.name || t('untitled')}
									</MultiLangText>
									{plan.description || plan.desc ? (
										<p className='gm-plan__desc'>{String(plan.description || plan.desc)}</p>
									) : null}
									<div className='mt-auto flex items-center justify-between gap-2 pt-3'>
										<span className='inline-flex items-center gap-1 text-[11.5px] font-medium gm-muted'>
											<Users className='size-3.5' />
											{t('clientsCount', { count: Number(plan.clientsUsingCount) || 0 })}
										</span>
										<span className='gm-plan__chip'>
											{plan.customizeDays ? tu('wizard.customDays') : tu('wizard.sameEveryDay')}
										</span>
									</div>
								</motion.button>
							);
						})}
					</motion.div>
				)}
			</AnimatePresence>

			{!q && source.length > (visibleMeals || 0) && typeof setVisibleMeals === 'function' ? (
				<button type='button' onClick={() => setVisibleMeals(v => Number(v || 0) + 6)} className='gm-btn-ghost gm-btn-compact'>
					{tc('seeMore')}
				</button>
			) : null}

			<div className='gm-modal-foot'>
				{onBack ? (
					<button type='button' onClick={onBack} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>
						{tc('back')}
					</button>
				) : null}
				<div className='ms-auto flex gap-2'>
					{onSkip ? (
						<button type='button' onClick={onSkip} className='gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium'>
							{tc('skip')}
						</button>
					) : null}
					<button
						type='button'
						onClick={() => onAssign?.(selectedId)}
						disabled={!selectedId || assigning}
						className='gm-btn-primary disabled:opacity-60 disabled:cursor-not-allowed'
					>
						{assigning ? tc('assigning') : buttonName || (onSkip ? tc('assignNext') : tc('assignFinish'))}
					</button>
				</div>
			</div>
		</div>
	);
}

/* ===========================
	 FieldRow
=========================== */
export function FieldRow({ icon, label, value, canCopy }) {
	return (
		<div className='gm-cred'>
			<div className='flex min-w-0 items-center gap-2.5'>
				<div className='gm-cred__icon'>{icon}</div>
				<div className='min-w-0'>
					<div className='gm-cred__label'>{label}</div>
					<div className='gm-cred__value truncate'>{value || '—'}</div>
				</div>
			</div>
			{canCopy && <CopyButton text={String(value ?? '')} />}
		</div>
	);
}

/* ===========================
	 PasswordRow
=========================== */
export function PasswordRow({ label, value, canCopy }) {
	const [show, setShow] = useState(false);
	const isMasked = !show && value && value !== 'sent to email (or set by admin)';
	const masked = isMasked ? '•'.repeat(Math.min(String(value).length, 12) || 8) : value;
	const t = useTranslations('Common');

	return (
		<div className='gm-cred'>
			<div className='flex min-w-0 items-center gap-2.5'>
				<div className='gm-cred__icon'>
					<KeyRound className='size-4' />
				</div>
				<div className='min-w-0'>
					<div className='gm-cred__label'>{label}</div>
					<div className='gm-cred__value truncate'>{masked || '—'}</div>
				</div>
			</div>

			<div className='flex items-center gap-1'>
				{isMasked && (
					<button
						type='button'
						onClick={() => setShow(true)}
						className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs gm-muted hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]'
						aria-label={t('showPassword')}
						title={t('showPassword')}>
						<Eye className='size-3.5' /> {t('show')}
					</button>
				)}
				{!isMasked && value && value !== 'sent to email (or set by admin)' && (
					<button
						type='button'
						onClick={() => setShow(false)}
						className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs gm-muted hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]'
						aria-label={t('hidePassword')}
						title={t('hidePassword')}>
						<EyeOff className='size-3.5' /> {t('hide')}
					</button>
				)}
				{canCopy && value && value !== 'sent to email (or set by admin)' && <CopyButton text={String(value)} />}
			</div>
		</div>
	);
}

/* ===========================
	 CopyButton
=========================== */
export function CopyButton({ text, label }) {
	const t = useTranslations('Common');
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Handle error silently or show toast
		}
	};

	return (
		<button
			type='button'
			onClick={handleCopy}
			className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors'
			style={{
				color: copied ? 'var(--color-primary-600)' : '#64748b',
				backgroundColor: copied ? 'var(--color-primary-50)' : 'transparent',
			}}
			aria-label={t('copyToClipboard')}
			title={t('copy')}>
			{copied ? (
				<>
					<Check className='h-4 w-4' /> {t('copied')}
				</>
			) : (
				<>
					<Copy className='h-4 w-4' /> {label || t('copy')}
				</>
			)}
		</button>
	);
}

/* ===========================
	 WhatsApp Link (kept bilingual logic)
=========================== */
export function buildWhatsAppMessage({ email, password, lang = 'en' }) {
	const hasPwd = Boolean(password);
	const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://so7bafit.com';
	const loginUrl = `${baseUrl}/en/auth`;
	const urlLine = lang === 'ar' ? `رابط تسجيل الدخول: ${loginUrl}` : `Login here: ${loginUrl}`;
	const linesEN = [
		'Your account is ready!',
		email ? `• Email: ${email}` : null,
		hasPwd ? `• Password: ${password}` : '• Password: (sent to email / set by admin)',
		urlLine,
		'',
		"You can sign in right away. If you didn't request this, ignore this message.",
	].filter(Boolean);
	const linesAR = [
		'تم إنشاء حسابك بنجاح!',
		email ? `• البريد الإلكتروني: ${email}` : null,
		hasPwd ? `• كلمة المرور: ${password}` : '• كلمة المرور: (أُرسلت على الإيميل / يحددها المشرف)',
		urlLine,
		'',
		'تقدر تسجّل دخولك مباشرة. إذا ما طلبتش إنشاء الحساب، تجاهل الرسالة.',
	].filter(Boolean);
	return lang === 'ar' ? linesAR.join('\n') : linesEN.join('\n');
}

export function buildWhatsAppLink({ phone, email, password, role, lang = 'en' }) {
	const to = String(phone || '').replace(/[^0-9]/g, '');
	if (!to) return null;
	return `https://wa.me/${to}?text=${encodeURIComponent(buildWhatsAppMessage({ email, password, lang }))}`;
}
/* ===========================
	 SubscriptionPeriodPicker
=========================== */
export function SubscriptionPeriodPicker({
	startValue,
	endValue,
	setValue,
	errorStart,
	errorEnd,
}) {
	const t = useTranslations('date');
	const threeMonthsFrom = date => formatISO(addMonths(date, 3), { representation: 'date' });

	const invalidRange = useMemo(() => {
		if (!startValue || !endValue) return false;
		return isBefore(parseISO(endValue), parseISO(startValue));
	}, [startValue, endValue]);

	return (
		<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2'>
			<FloatingDate
				label={t('startLabel')}
				value={startValue || ''}
				onChange={(iso) => {
					if (!iso) return;
					setValue('subscriptionStart', iso, { shouldValidate: true });
					if (endValue && isBefore(parseISO(endValue), parseISO(iso))) {
						setValue('subscriptionEnd', threeMonthsFrom(parseISO(iso)), { shouldValidate: true });
					}
				}}
				error={errorStart}
			/>
			<FloatingDate
				label={t('endLabel')}
				value={endValue || ''}
				minDate={startValue || undefined}
				onChange={(iso) => {
					if (!iso) return;
					setValue('subscriptionEnd', iso, { shouldValidate: true });
				}}
				error={errorEnd || (invalidRange ? t('endAfterStart') : '')}
			/>
		</motion.div>
	);
}

/* ---------- helpers ---------- */
export function formatISO(date, { representation = 'date' } = {}) {
	const d = new Date(date);
	if (representation === 'date') {
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}
	return d.toISOString();
}

export function parseISO(s) {
	return new Date(`${s}T00:00:00`);
}

export function addMonths(date, months, inclusiveMinusOneDay = false) {
	const d = new Date(date);
	const day = d.getDate();
	d.setMonth(d.getMonth() + months);
	if (d.getDate() < day) d.setDate(0);
	if (inclusiveMinusOneDay) d.setDate(d.getDate() - 1);
	return d;
}

export function isBefore(a, b) {
	return a.getTime() < b.getTime();
}