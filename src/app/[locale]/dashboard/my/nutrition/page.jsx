'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	UtensilsCrossed,
	Clock,
	Send,
	Plus,
	Target,
	TrendingUp,
	Pill,
	Inbox,
	CheckCircle,
	CircleCheck,
	Flame,
	Activity,
	Apple,
	BookOpen,
	Eye,
	X,
} from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import { Input } from '@/components/atoms/Input2';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Notification } from '@/config/Notification';
import HistoryViewer from '@/components/pages/dashboard/nutrition/HistoryViewer';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/app/[locale]/theme';
import { TabsPill } from '../workouts/page';

/* =========================================================================
	 SMALL UI PRIMITIVES
	 ========================================================================= */
function BasicButton({ labelKey, onClick, icon: Icon, variant = 'outline', submit = false, loading = false }) {
	const t = useTranslations('my-nutrition');

	const base =
		'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium h-9 px-3 transition active:scale-95';

	const variants = {
		primary: 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-700)] hover:bg-[var(--color-primary-700)] shadow-sm',
		warning: 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm',
		neutral: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
		outline: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
	};

	return (
		<button
			type={submit ? 'submit' : 'button'}
			onClick={onClick}
			disabled={loading}
			className={`${base} ${variants[variant] ?? variants.outline} disabled:opacity-60`}
		>
			{Icon ? <Icon className="h-4 w-4" /> : null}
			<span>{loading ? t('common.loading') : t(labelKey)}</span>
		</button>
	);
}

function AnimatedCheckPath({ visible }) {
	return (
		<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ display: 'block' }}>
			<motion.path
				d="M1.5 5l2.5 2.5 4.5-5"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{ pathLength: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
				transition={{ duration: 0.25, ease: 'easeOut' }}
			/>
		</svg>
	);
}

function SparkleBurst({ active }) {
	const angles = [0, 45, 90, 135, 180, 225, 270, 315];
	return (
		<AnimatePresence>
			{active &&
				angles.map((deg, i) => (
					<motion.span
						key={deg}
						initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
						animate={{
							opacity: 0,
							x: Math.cos((deg * Math.PI) / 180) * 16,
							y: Math.sin((deg * Math.PI) / 180) * 16,
							scale: 1,
						}}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.45, delay: i * 0.015, ease: 'easeOut' }}
						className="absolute w-[3px] h-[3px] rounded-full pointer-events-none z-10"
						style={{
							background: `hsl(${210 + i * 18}, 80%, 55%)`,
						}}
					/>
				))}
		</AnimatePresence>
	);
}

function MiniCheck({ checked, tone = 'primary', className = '' }) {
	const [justChecked, setJustChecked] = useState(false);
	const prevChecked = useRef(checked);

	useEffect(() => {
		if (!prevChecked.current && checked) {
			setJustChecked(true);
			const t = setTimeout(() => setJustChecked(false), 500);
			return () => clearTimeout(t);
		}
		prevChecked.current = checked;
	}, [checked]);

	const isEmerald = tone === 'emerald';

	return (
		<span
			aria-hidden="true"
			className={[
				'flex-none relative inline-flex h-[22px] w-[22px] items-center justify-center rounded-lg transition-all pointer-events-none',
				checked
					? isEmerald
						? 'bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.35)] border-0'
						: 'bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-500)] shadow-[0_2px_8px_rgba(99,102,241,0.3)] border-0'
					: 'bg-white border border-slate-300',
				'text-white',
				className,
			].join(' ')}
		>
			<AnimatedCheckPath visible={checked} />
			<SparkleBurst active={justChecked} />
		</span>
	);
}

/* =========================================================================
	 STAT PILL — matches RecipePage header stats
	 ========================================================================= */
function HeaderStatPill({ label, value, icon: Icon, delay = 0 }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
			className="relative overflow-hidden rounded-lg sm:rounded-lg p-2 sm:p-4 bg-white/[0.13] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
		>
			<div className="flex items-start justify-between gap-1 mb-1 sm:mb-2">
				<p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] text-white/55 leading-tight">
					{label}
				</p>
				{Icon && <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-white/35 shrink-0" />}
			</div>
			<p className="text-base sm:text-2xl font-black text-white leading-none tabular-nums">
				{value ?? 0}
			</p>
		</motion.div>
	);
}

/* =========================================================================
	 MAIN PAGE
	 ========================================================================= */
export default function ClientMealPlanPage() {
	const [loading, setLoading] = useState(true);
	const [plan, setPlan] = useState(null);
	const t = useTranslations('my-nutrition');

	const [activeDayKey, setActiveDayKey] = useState(null);
	const [history, setHistory] = useState([]);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [notesOpen, setNotesOpen] = useState(false);

	const [takenMap, setTakenMap] = useState({});
	const [itemTakenMap, setItemTakenMap] = useState({});
	const [suppTakenMap, setSuppTakenMap] = useState({});

	const [selectedDateISO, setSelectedDateISO] = useState(null);

	const pendingRef = useRef(new Set());
	const runLocked = useCallback(async (key, fn) => {
		if (pendingRef.current.has(key)) return;
		pendingRef.current.add(key);
		try {
			await fn();
		} finally {
			pendingRef.current.delete(key);
		}
	}, []);

	const fetchPlan = useCallback(async () => {
		const planRes = await api
			.get('/nutrition/my/meal-plan')
			.then(r => r?.data || null)
			.catch(() => null);
		setPlan(planRes);

		if (planRes?.days?.length) {
			const todayKey = weekdayKeySaturdayFirst(new Date());
			const hasToday = (planRes.days || []).some(d => (d.day || '').toLowerCase() === todayKey);
			const initialDay = hasToday ? todayKey : planRes.days?.[0]?.day || null;
			setActiveDayKey(initialDay);
			setSelectedDateISO(dateForDayKeyInCurrentWeek(initialDay, new Date()));
		} else {
			setActiveDayKey(null);
			setSelectedDateISO(null);
		}
	}, []);

	const fetchLogsForDate = useCallback(
		async (dateISO, dayKey, planRef) => {
			if (!dateISO || !dayKey) {
				setHistory([]);
				setTakenMap({});
				setItemTakenMap({});
				setSuppTakenMap({});
				return;
			}
			try {
				setLoading(true);
				const logs = await api
					.get('/nutrition/my/meal-logs', { params: { date: dateISO } })
					.then(r => r?.data || [])
					.catch(() => []);
				setHistory(logs);
				const hydrated = deriveTakenMapsFromHistory(planRef || plan, logs);
				setTakenMap(hydrated.mealMap);
				setItemTakenMap(hydrated.itemMap);
				setSuppTakenMap(hydrated.suppMap);
			} finally {
				setLoading(false);
			}
		},
		[plan],
	);

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				await fetchPlan();
			} finally {
				setLoading(false);
			}
		})();
	}, [fetchPlan]);

	useEffect(() => {
		if (!activeDayKey || !plan) return;
		const dateISO = dateForDayKeyInCurrentWeek(activeDayKey, new Date());
		setSelectedDateISO(dateISO);
		fetchLogsForDate(dateISO, activeDayKey, plan);
	}, [activeDayKey, plan, fetchLogsForDate]);

	const refresh = () => {
		if (selectedDateISO && activeDayKey) fetchLogsForDate(selectedDateISO, activeDayKey, plan);
	};

	const days = useMemo(() => normalizeWeekOrder(plan?.days || []), [plan]);
	const tabs = useMemo(
		() =>
			(plan?.days?.length ? days : []).map(d => ({
				key: (d.day || '').toLowerCase(),
				label: t(d.day),
			})),
		[days, plan],
	);
	const activeDay = useMemo(
		() =>
			plan?.days?.length
				? days.find(d => (d.day || '').toLowerCase() === (activeDayKey || '').toLowerCase()) || null
				: null,
		[days, activeDayKey, plan],
	);

	const stats = useMemo(() => {
		if (!activeDay) return { meals: 0, kcal: 0 };
		return {
			meals: (activeDay?.meals || []).length,
			kcal: sumCaloriesDay(activeDay?.meals || []),
		};
	}, [activeDay]);

	const user = useUser();
	const hasNotes = !!(plan?.notes && String(plan.notes).trim().length);

	/* taken handlers (unchanged logic) */
	const setMealTaken = async (dayKey, mealIndex, meal, value) => {
		const lockKey = `meal:${dayKey}:${mealIndex}`;
		await runLocked(lockKey, async () => {
			const mealKey = `${dayKey}:${mealIndex}`;
			const itemKeys = (meal.items || []).map(i => kItemByName(dayKey, mealIndex, i.name));
			const prevMealValue = !!takenMap[mealKey];
			const prevItemValues = {};
			itemKeys.forEach(k => { prevItemValues[k] = itemTakenMap[k]; });
			setTakenMap(prev => ({ ...prev, [mealKey]: value }));
			setItemTakenMap(prev => {
				const next = { ...prev };
				itemKeys.forEach(k => { next[k] = value; });
				return next;
			});
			try {
				await api.post('/nutrition/food-logs', {
					planId: plan?.id, day: dayKey, mealIndex,
					eatenAt: new Date().toISOString(), adherence: value ? 5 : 3,
					mealTitle: meal?.title || t('nutrition.meal.defaultTitle', { index: mealIndex + 1 }),
					items: (meal.items || []).map(i => ({
						name: i.name, taken: !!value,
						qty: i.quantity == null ? null : Number(i.quantity),
						unit: i.unit === 'count' ? 'count' : 'g',
					})),
					notifyCoach: false, extraFoods: [], supplementsTaken: [],
				});
			} catch (e) {
				setTakenMap(prev => ({ ...prev, [mealKey]: prevMealValue }));
				setItemTakenMap(prev => {
					const next = { ...prev };
					itemKeys.forEach(k => { next[k] = prevItemValues[k]; });
					return next;
				});
				Notification(e?.response?.data?.message || t('nutrition.errors.mealLogFailed'), 'error');
			}
		});
	};

	const setItemTaken = async (dayKey, mealIndex, item, value) => {
		const lockKey = `item:${dayKey}:${mealIndex}:${normName(item.name)}`;
		await runLocked(lockKey, async () => {
			const key = kItemByName(dayKey, mealIndex, item.name);
			const meal = activeDay?.meals?.[mealIndex];
			const mealKey = `${dayKey}:${mealIndex}`;
			const prevItemValue = !!itemTakenMap[key];
			const prevMealValue = !!takenMap[mealKey];
			setItemTakenMap(prev => {
				const next = { ...prev, [key]: value };
				if (meal?.items?.length) {
					const allTrue = meal.items.every(i => !!next[kItemByName(dayKey, mealIndex, i.name)]);
					setTakenMap(prevMeals => ({ ...prevMeals, [mealKey]: allTrue }));
				}
				return next;
			});
			try {
				await api.post('/nutrition/food-logs', {
					planId: plan?.id, day: dayKey, mealIndex,
					eatenAt: new Date().toISOString(), adherence: value ? 4 : 3,
					mealTitle: meal?.title || t('nutrition.meal.defaultTitle', { index: mealIndex + 1 }),
					items: [{ name: item.name, taken: !!value, qty: item.quantity == null ? null : Number(item.quantity), unit: item.unit === 'count' ? 'count' : 'g' }],
					notifyCoach: false, extraFoods: [], supplementsTaken: [],
				});
			} catch (e) {
				setItemTakenMap(prev => ({ ...prev, [key]: prevItemValue }));
				setTakenMap(prevMeals => ({ ...prevMeals, [mealKey]: prevMealValue }));
				Notification(e?.response?.data?.message || t('nutrition.errors.itemUpdateFailed'), 'error');
			}
		});
	};

	const setSupplementTaken = async (dayKey, scope, idOrIndex, supp, value, mealIndex = null) => {
		const localKey = kSuppByName(dayKey, scope, mealIndex, supp.name);
		const lockKey = `supp:${localKey}`;
		await runLocked(lockKey, async () => {
			const prevValue = !!suppTakenMap[localKey];
			setSuppTakenMap(prev => ({ ...prev, [localKey]: value }));
			try {
				await api.post('/nutrition/food-logs', {
					planId: plan?.id, day: dayKey, mealIndex,
					eatenAt: new Date().toISOString(), adherence: 5,
					mealTitle: mealIndex != null
						? activeDay?.meals?.[mealIndex]?.title || t('nutrition.meal.defaultTitle', { index: Number(mealIndex) + 1 })
						: t('nutrition.supplements.logTitle'),
					items: [], notifyCoach: false, extraFoods: [],
					supplementsTaken: [{ name: supp.name, taken: !!value }],
				});
			} catch (e) {
				setSuppTakenMap(prev => ({ ...prev, [localKey]: prevValue }));
				Notification(e?.response?.data?.message || t('nutrition.errors.supplementUpdateFailed'), 'error');
			}
		});
	};

	const saveInlineMeal = async ({ dayKey, mealIndex, items }) => {
		try {
			await api.post('/nutrition/my/meal-overrides', {
				day: dayKey, mealIndex,
				items: (items || []).map(i => ({
					name: (i.name || '').trim(),
					quantity: i.quantity == null || i.quantity === '' ? null : Number(i.quantity),
					unit: i.unit === 'count' ? 'count' : 'g',
					calories: i.calories == null || i.calories === '' ? null : Number(i.calories),
				})),
			});
			refresh();
		} catch (e) {
			Notification(e?.response?.data?.message || t('nutrition.errors.inlineSaveFailed'), 'error');
		}
	};

	return (
		<div className="  min-h-screen flex  overflow-x-hidden flex-col ">


			<div className="  rounded-lg relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-800)] via-[var(--color-primary-700)] to-[var(--color-secondary-600)]">

				{/* noise overlay */}
				<div
					className="absolute inset-0 opacity-[0.055] pointer-events-none mix-blend-overlay"
					style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
				/>
				{/* glow blobs */}
				<div className="absolute w-72 h-72 rounded-full blur-[60px] -top-36 -start-20 pointer-events-none bg-white/[0.07]" />
				<div className="absolute w-56 h-56 rounded-full blur-[50px] -bottom-20 -end-12 pointer-events-none bg-white/[0.05]" />
				{/* edge fades */}
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
				<div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
				{/* decorative rings */}
				<div className="absolute -top-8 -end-8 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
				<div className="absolute -top-3 -end-3 w-20 h-20 rounded-full border border-white/[0.07] pointer-events-none" />

				<div className="relative z-10 px-3 sm:px-6 pt-4 sm:pt-5 pb-0">

					{/* ── Title row ── */}
					<div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
						<div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
							<motion.div
								whileHover={{ scale: 1.06, rotate: 4 }}
								transition={{ type: 'spring', stiffness: 380, damping: 20 }}
								className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-lg grid place-items-center shrink-0 bg-white/[0.16] backdrop-blur-[16px] shadow-[0_6px_24px_-4px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.35)]"
							>
								<UtensilsCrossed className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
							</motion.div>
							<div className="min-w-0 flex-1">
								<MultiLangText className="block text-base sm:text-2xl font-black text-white leading-tight tracking-tight truncate">
									{plan?.name || t('nutrition.header.defaultTitle')}
								</MultiLangText>
								<MultiLangText className="block text-[9px] sm:text-xs text-white/55 mt-0.5 font-medium line-clamp-1">
									{plan?.desc || ''}
								</MultiLangText>
							</div>
						</div>

						{/* Notes button */}
						{hasNotes && (
							<motion.button
								whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
								onClick={() => setNotesOpen(true)}
								className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.14] backdrop-blur-sm border border-white/20 text-white text-[10px] sm:text-xs font-bold transition-all hover:bg-white/[0.22]"
							>
								<BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
								<span className="hidden sm:inline">{t('nutrition.header.notes')}</span>
							</motion.button>
						)}
					</div>

					{/* ── Stats grid (4-col) ── */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 mb-4 sm:mb-5">
						<HeaderStatPill label={t('nutrition.header.dailyTarget')} value={user?.caloriesTarget ?? 0} icon={Target} delay={0.05} />
						<HeaderStatPill label={t('nutrition.header.FiberTarget')} value={user?.FiberTarget ?? 0} icon={Activity} delay={0.11} />
						<HeaderStatPill label={t('nutrition.header.todayCalories')} value={stats?.kcal ?? 0} icon={Flame} delay={0.17} />
						<HeaderStatPill label={t('nutrition.header.mealsSelectedDay')} value={stats?.meals ?? 0} icon={TrendingUp} delay={0.23} />
					</div>

					{/* ── Day Tabs ── */}
					<div className="pb-4">
						<TabsPill
							id="nutrition-day-tabs"
							tabs={tabs}
							active={(activeDayKey || '').toLowerCase()}
							onChange={setActiveDayKey}
							sliceInPhone={false}
							hiddenArrow={false}
						/>
					</div>

				</div>
			</div>

			<div className="flex-1 pt-4 sm:pt-6 pb-24">

				{loading ? (
					<SkeletonPanel />
				) : !plan || !activeDay ? (
					<NotFoundPanel onRefresh={refresh} />
				) : (
					<DayPanel
						day={activeDay}
						takenMap={takenMap}
						itemTakenMap={itemTakenMap}
						suppTakenMap={suppTakenMap}
						setMealTaken={setMealTaken}
						setItemTaken={setItemTaken}
						setSupplementTaken={setSupplementTaken}
						onInlineSave={saveInlineMeal}
					/>
				)}
			</div>

			{/* Notes Modal */}
			<Modal open={notesOpen} onClose={() => setNotesOpen(false)} title={t('nutrition.notes.modalTitle')}>
				{hasNotes ? (
					<div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-inner">
						<MultiLangText className="whitespace-pre-wrap text-[13px] leading-6 text-slate-900">
							{plan.notes}
						</MultiLangText>
					</div>
				) : (
					<div className="text-sm text-slate-600">—</div>
				)}
			</Modal>

			{/* History Modal */}
			<Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('nutrition.history.modalTitle')}>
				<HistoryViewer history={history} />
			</Modal>
		</div>
	);
}

/* =========================================================================
	 PANELS
	 ========================================================================= */
function SkeletonPanel() {
	return (
		<div className="p-4 space-y-4">
			<div className="h-6 w-44 rounded bg-slate-200 animate-pulse" />
			<div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
			<div className="h-28 w-full rounded bg-slate-100 animate-pulse" />
		</div>
	);
}

function NotFoundPanel({ onRefresh }) {
	const t = useTranslations('my-nutrition');
	return (
		<div className="p-6 md:p-8">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 320, damping: 28 }}
				className="mx-auto max-w-xl text-center"
			>
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-secondary-500)]">
					<Inbox className="h-8 w-8 text-white" />
				</div>
				<h3 className="mt-4 text-lg font-semibold text-slate-900">{t('nutrition.notFound.title')}</h3>
				<p className="mt-2 text-sm text-slate-600">{t('nutrition.notFound.description')}</p>
				<div className="mt-6 flex items-center justify-center">
					<BasicButton labelKey="nutrition.notFound.refresh" variant="primary" onClick={onRefresh} />
				</div>
			</motion.div>
		</div>
	);
}

/* =========================================================================
	 FOOD ITEM ROW
	 ========================================================================= */
function FoodItemRow({ it, checked, onToggle, qtyLabel, t }) {
	const [justChecked, setJustChecked] = useState(false);
	const prevRef = useRef(checked);

	useEffect(() => {
		if (!prevRef.current && checked) {
			setJustChecked(true);
			const timer = setTimeout(() => setJustChecked(false), 600);
			return () => clearTimeout(timer);
		}
		prevRef.current = checked;
	}, [checked]);

	return (
		<motion.div
			role="checkbox"
			aria-checked={checked}
			tabIndex={0}
			onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); } }}
			onClick={onToggle}
			whileHover={{ y: -1 }}
			whileTap={{ scale: 0.98 }}
			className={[
				'group relative inline-flex w-full items-start gap-3 rounded-lg p-3 text-sm cursor-pointer select-none',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]',
				'border-[1.5px] transition-all duration-200 overflow-hidden',
				checked
					? 'bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] border-[var(--color-primary-200)] shadow-[inset_0_0_0_1px_var(--color-primary-100),0_4px_12px_-2px_rgba(99,102,241,0.1)]'
					: 'bg-slate-50 border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]',
			].join(' ')}
		>
			{/* Shimmer sweep */}
			<AnimatePresence>
				{justChecked && (
					<motion.div
						initial={{ x: '-100%', opacity: 0.5 }}
						animate={{ x: '200%', opacity: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5, ease: 'easeOut' }}
						className="absolute inset-0 bg-gradient-to-r from-transparent via-white/65 to-transparent pointer-events-none z-[5]"
					/>
				)}
			</AnimatePresence>

			<div className="pt-0.5 shrink-0">
				<MiniCheck checked={checked} tone="primary" />
			</div>

			<div className="flex-1 min-w-0">
				<div dir="rtl" className="flex items-center gap-2 flex-wrap">
					<span
						className={[
							'flex-1 truncate leading-none text-[13.5px] tracking-[-0.01em] transition-all duration-150',
							checked ? 'font-[650] text-[var(--color-primary-900)]' : 'font-medium text-slate-700',
						].join(' ')}
					>
						{it.name}
					</span>

					{qtyLabel && (
						<span className="text-xs text-slate-400 font-medium shrink-0 tracking-[0.02em]">
							{qtyLabel}
						</span>
					)}

					<motion.span
						layout
						className={[
							'inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-[0.02em] border transition-all duration-200',
							checked
								? 'bg-[rgba(var(--color-primary-rgb,99,102,241),0.12)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]'
								: 'bg-slate-100/60 text-slate-500 border-slate-200/50',
						].join(' ')}
					>
						<motion.span
							animate={checked ? { rotate: [0, -15, 10, 0] } : { rotate: 0 }}
							transition={{ duration: 0.4 }}
							className="flex"
						>
							<Flame size={11} />
						</motion.span>
						{Number(it.calories)} {t('nutrition.units.kcal')}
					</motion.span>
				</div>

				<AnimatePresence>
					{it.alternativeName != null && String(it.alternativeName || '').trim() && (
						<motion.div
							initial={{ opacity: 0, height: 0, marginTop: 0 }}
							animate={{ opacity: 1, height: 'auto', marginTop: 5 }}
							exit={{ opacity: 0, height: 0, marginTop: 0 }}
							transition={{ duration: 0.2 }}
							className="overflow-hidden"
						>
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-bold tracking-wider uppercase bg-amber-100 border border-amber-200 text-amber-800">
									{t('nutrition.alternative', { default: 'Or' })}
								</span>
								<span className="text-xs font-medium text-amber-800">{it.alternativeName}</span>
								{(it.alternativeQuantity != null || it.alternativeCalories != null) && (
									<span className="text-xs text-amber-700/80">
										· {it.alternativeQuantity ?? '—'}
										{it.alternativeUnit === 'count' ? ' ' + (t('count') || '') : 'g'}
										{' '}· {it.alternativeCalories ?? '—'} kcal
									</span>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

/* =========================================================================
	 DAY PANEL
	 ========================================================================= */
function DayPanel({ day, takenMap, itemTakenMap, suppTakenMap, setMealTaken, setItemTaken, setSupplementTaken, onInlineSave }) {
	const t = useTranslations('my-nutrition');

	const meals = day?.meals || mapFoodsToMeals(day?.foods || []);
	const daySupps = Array.isArray(day?.supplements) ? day.supplements : [];
	const dayKey = (day.day || '').toLowerCase();

	const [editing, setEditing] = useState({});
	const toggleEdit = mi => {
		const key = `${dayKey}:${mi}`;
		setEditing(prev => ({ ...prev, [key]: !prev[key] }));
	};

	const formatQtyWithUnit = it => {
		if (it?.quantity == null || it?.quantity === '' || Number.isNaN(Number(it.quantity))) return null;
		const qty = Number(it.quantity);
		const unit = it?.unit === 'count' ? 'count' : 'g';
		const unitLabel = unit === 'g' ? (t('gram') || 'g') : (t('count') || t('nutrition.units.count') || 'count');
		return unit === 'g' ? `${qty}${unitLabel}` : `${qty} ${unitLabel}`;
	};

	const timeline = useMemo(() => {
		const toMin = v => { if (!v) return 24 * 60 + 1; const [h, m = '0'] = String(v).split(':'); return Number(h) * 60 + Number(m); };
		const mealBlocks = (meals || []).map((m, mi) => ({ type: 'meal', time: m.time || '', sortKey: toMin(m.time), key: `meal-${mi}`, meta: { mi, meal: m } }));
		const suppBlocks = (daySupps || []).map((s, si) => ({ type: 'supp', time: s.time || '', sortKey: toMin(s.time), key: `supp-${si}`, meta: { si, supp: s } }));
		return [...mealBlocks, ...suppBlocks].sort((a, b) => a.sortKey - b.sortKey);
	}, [meals, daySupps]);

	return (
		<div className="relative">
			{/* Timeline centre line */}
			<div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 opacity-30 bg-gradient-to-b from-[var(--color-primary-400)] to-[var(--color-secondary-400)]" aria-hidden="true" />

			<div className="space-y-8">
				<AnimatePresence mode="popLayout">
					{timeline.map((block, idx) => {
						const time12 = block.time ? formatTime12(block.time) : '—';
						const isLeft = idx % 2 === 0;

						if (block.type === 'meal') {
							const { mi, meal } = block.meta;
							const mealKey = `${dayKey}:${mi}`;
							const mealTaken = !!takenMap[mealKey];
							const mealCals = (meal.items || []).reduce((a, it) => a + Number(it.calories || 0), 0);
							const editKey = mealKey;
							const isEditing = !!editing[editKey];

							return (
								<motion.div
									key={block.key}
									className="relative md:grid md:grid-cols-2 md:gap-8"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ type: 'spring', stiffness: 300, damping: 30 }}
									layout
								>
									{/* Time column (desktop) */}
									<div className={`hidden md:block relative ${isLeft ? 'order-1 pr-8' : 'order-2 pl-8'}`}>
										<span className={[
											'absolute top-4 h-4 w-4 rounded-full shadow-lg ring-4 ring-white bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-800)]',
											isLeft ? 'rtl:-left-[24px] ltr:-right-[9px]' : 'rtl:-right-[24px] ltr:-left-[9px]',
										].join(' ')} />
										<span className={[
											'flex flex-col gap-1 absolute font-en text-xs text-slate-600 whitespace-nowrap font-medium top-[16px]',
											isLeft ? 'rtl:left-[-29px] ltr:right-[48px] translate-x-8' : 'rtl:right-[-22px] ltr:left-[48px] -translate-x-8',
										].join(' ')}>
											<span className="flex items-center gap-1.5">
												<Clock size={14} className="text-[var(--color-primary-500)]" />
												{time12}
											</span>
										</span>
									</div>

									{/* Mobile time */}
									<div className="md:hidden flex items-center gap-3 px-2 py-2 mb-0">
										<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
											<Clock size={12} className="text-[var(--color-primary-600)]" />
											{time12}
										</span>
									</div>

									{/* Card */}
									<div className={`${isLeft ? 'md:order-2 md:rtl:pr-8 md:ltr:pl-8' : 'md:order-1 md:rtl:pl-8 md:ltr:pr-8'}`}>
										<motion.div
											whileHover={{ y: -3, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.12)' }}
											transition={{ type: 'spring', stiffness: 320, damping: 24 }}
											className="rounded-lg relative border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden"
										>
											{/* Top gradient accent bar */}
											<div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]" />

											{/* Subtle radial glow top-right */}
											<div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--color-primary-100)] opacity-20 blur-3xl pointer-events-none" />

											<div className="p-5 pt-5 relative">
												{/* ── Header row ── */}
												<div className="flex justify-between gap-3 items-start">
													{/* Left: icon + title + calorie badge */}
													<div className="flex items-center gap-3 flex-wrap min-w-0">
														{/* Icon */}
														<div className="relative flex-none">
															<div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)] text-[var(--color-primary-700)] shadow-sm ring-1 ring-[var(--color-primary-200)]">
																<UtensilsCrossed size={17} />
															</div>
															{mealTaken && (
																<motion.div
																	initial={{ scale: 0 }}
																	animate={{ scale: 1 }}
																	className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)] flex items-center justify-center shadow-md"
																>
																	<CheckCircle size={11} className="text-white" />
																</motion.div>
															)}
														</div>

														{/* Title + badge */}
														<div className="flex flex-col gap-1 min-w-0">
															<span className="text-sm font-black text-slate-900 leading-tight truncate">
																{t('nutrition.meal.title', { index: idx + 1 })}
															</span>
															<span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 border border-orange-100 w-fit">
																<Flame size={10} className="text-orange-500 flex-none" />
																{mealCals} {t('nutrition.units.kcal')}
															</span>
														</div>
													</div>

													{/* Mark taken button */}
													{!isEditing && (
														<motion.button
															type="button"
															onClick={() => setMealTaken(dayKey, mi, meal, !mealTaken)}
															aria-pressed={mealTaken}
															whileTap={{ scale: 0.93 }}
															whileHover={{ scale: 1.03 }}
															className={[
																'flex-none inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2',
																mealTaken
																	? 'text-white bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] shadow-[0_4px_14px_-2px_var(--color-primary-400)]'
																	: 'bg-slate-50 text-slate-600 hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] ring-1 ring-slate-200 hover:ring-[var(--color-primary-200)]',
															].join(' ')}
														>
															{mealTaken ? (
																<><CheckCircle size={15} className="flex-none" /><span className="max-md:hidden">تم</span></>
															) : (
																<><CircleCheck size={15} className="flex-none" /><span className="max-md:hidden">تحديد</span></>
															)}
														</motion.button>
													)}
												</div>

												{/* ── Food items ── */}
												{!isEditing && !!meal.items?.length && (
													<div className="mt-4 flex flex-col gap-1.5">
														{(meal.items || []).map((it, i) => {
															const id = it?.id || `${it?.name}-${i}`;
															const checked = !!itemTakenMap[kItemByName(dayKey, mi, it.name)];
															return (
																<motion.div
																	key={id}
																	initial={{ opacity: 0, x: -6 }}
																	animate={{ opacity: 1, x: 0 }}
																	transition={{ delay: i * 0.04, duration: 0.25 }}
																>
																	<FoodItemRow
																		it={it}
																		checked={checked}
																		onToggle={() => setItemTaken(dayKey, mi, it, !checked)}
																		qtyLabel={formatQtyWithUnit(it)}
																		t={t}
																	/>
																</motion.div>
															);
														})}
													</div>
												)}

												{/* ── Edit mode ── */}
												{isEditing && (
													<div className="mt-4">
														<InlineMealEditor
															dayKey={dayKey}
															mealIndex={mi}
															initialItems={meal.items || []}
															onCancel={() => toggleEdit(mi)}
															onSave={async items => {
																await onInlineSave?.({ dayKey, mealIndex: mi, items });
																setEditing(prev => ({ ...prev, [editKey]: false }));
															}}
														/>
													</div>
												)}

												{/* ── Supplements ── */}
												{!!meal.supplements?.length && !isEditing && (
													<div className="mt-4 pt-4 border-t border-dashed border-slate-100">
														{/* Section header */}
														<div className="flex items-center gap-2 mb-3">
															<div className="h-6 w-6 flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 ring-1 ring-emerald-200 shadow-sm flex-none">
																<Pill size={12} />
															</div>
															<span className="text-xs font-black text-slate-700 uppercase tracking-wider">
																{t('nutrition.supplements.title')}
															</span>
															<div className="flex-1 h-px bg-gradient-to-r from-emerald-100 to-transparent" />
														</div>

														<div className="flex flex-col gap-1.5">
															{meal.supplements.map((s, si) => {
																const key = kSuppByName(dayKey, 'meal', mi, s.name);
																const taken = !!suppTakenMap[key];
																const toggle = () => setSupplementTaken(dayKey, 'meal', `${mi}-${s.id || si}`, s, !taken, mi);
																return (
																	<motion.div
																		key={s.id || si}
																		role="checkbox"
																		aria-checked={taken}
																		tabIndex={0}
																		onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }}
																		onClick={toggle}
																		whileTap={{ scale: 0.985 }}
																		initial={{ opacity: 0, y: 4 }}
																		animate={{ opacity: 1, y: 0 }}
																		transition={{ delay: si * 0.05, duration: 0.22 }}
																		className={[
																			'inline-flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
																			'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60',
																			taken
																				? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border-emerald-200 shadow-sm'
																				: 'bg-slate-50/60 text-slate-700 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm',
																		].join(' ')}
																	>
																		<div className="flex items-center gap-2.5 min-w-0 flex-1">
																			<MiniCheck checked={taken} tone="emerald" />
																			<div className="min-w-0 flex-1">
																				<span className={`font-semibold truncate block text-xs leading-tight ${taken ? 'text-emerald-800' : 'text-slate-800'}`}>
																					{s.name}
																				</span>
																				{(s.time || s.timing || s.bestWith) && (
																					<span className="text-[10px] text-slate-400 truncate block mt-0.5">
																						{[
																							s.time && formatTime12(s.time),
																							s.timing,
																							s.bestWith && t('nutrition.supplements.bestWith', { value: s.bestWith }),
																						].filter(Boolean).join(' · ')}
																					</span>
																				)}
																			</div>
																			{taken && (
																				<span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-wide flex-none">
																					{t('nutrition.supplements.takenTag')}
																				</span>
																			)}
																		</div>
																	</motion.div>
																);
															})}
														</div>
													</div>
												)}
											</div>

											{/* Bottom shimmer when taken */}
											{mealTaken && (
												<motion.div
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]"
												/>
											)}
										</motion.div>
									</div>
								</motion.div>
							);
						}

						/* Day-level supplement block */
						const { supp } = block.meta;
						const takenKey = kSuppByName(dayKey, 'day', null, supp.name);
						const taken = !!suppTakenMap[takenKey];
						const toggle = () => setSupplementTaken(dayKey, 'day', `${supp.id || block.key}`, supp, !taken, null);

						return (
							<motion.div
								key={block.key}
								className="relative md:grid md:grid-cols-2 md:gap-8"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ type: 'spring', stiffness: 300, damping: 30 }}
								layout
							>
								<div className={`hidden md:block relative ${idx % 2 === 0 ? 'order-1 pr-8' : 'order-2 pl-8'}`}>
									<span className={[
										'absolute top-4 h-4 w-4 rounded-full shadow-lg ring-4 ring-white bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-secondary-500)]',
										idx % 2 !== 0 ? '-left-[9px]' : '-right-[9px]',
									].join(' ')} />
									<span className={`absolute top-8 text-xs text-slate-600 whitespace-nowrap font-medium ${idx % 2 === 0 ? 'right-0 translate-x-8' : 'left-0 -translate-x-8'}`}>
										<span className="inline-flex items-center gap-1.5">
											<Clock size={14} className="text-[var(--color-primary-500)]" />
											{block.time ? formatTime12(block.time) : '—'}
										</span>
									</span>
								</div>

								<div className={`${idx % 2 === 0 ? 'md:order-2 md:pl-8' : 'md:order-1 md:pr-8'}`}>
									<motion.div
										whileHover={{ y: -2 }}
										className="rounded-lg border border-slate-200 bg-white p-4 shadow-md hover:shadow-xl transition-all duration-300"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0 flex-1">
												<div className="font-semibold text-slate-900 flex items-center gap-2.5 text-sm">
													<Pill size={18} className="text-emerald-600" />
													<span className="truncate">{supp.name}</span>
												</div>
												<div className="mt-2 text-sm text-slate-600">
													{supp.bestWith ? (
														<>
															{t('nutrition.supplements.bestWithLabel')}
															<span className="font-medium text-slate-800 ml-1">{supp.bestWith}</span>
														</>
													) : '—'}
													{supp.timing && <span className="ml-2 text-slate-700">• {supp.timing}</span>}
												</div>
											</div>

											<motion.div
												role="checkbox"
												aria-checked={taken}
												tabIndex={0}
												onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }}
												onClick={toggle}
												whileTap={{ scale: 0.95 }}
												className={[
													'p-2.5 px-4 inline-flex items-center gap-2 rounded-lg border text-sm font-medium transition-all shadow-sm',
													'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60',
													taken
														? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
														: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
												].join(' ')}
											>
												<MiniCheck checked={taken} tone="emerald" className={!taken ? 'opacity-60' : ''} />
												<span className="leading-none">
													{taken ? t('nutrition.supplements.takenTag') : t('nutrition.supplements.markTaken')}
												</span>
											</motion.div>
										</div>
									</motion.div>
								</div>

								{/* Mobile bullet */}
								<div className="md:hidden pl-10 relative mb-2">
									<span className="absolute left-0 top-3 h-4 w-4 rounded-full shadow-md ring-4 ring-white bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-secondary-500)]" />
									<span className="absolute left-0 top-8 text-xs text-slate-600 translate-x-6 font-medium">
										<span className="inline-flex items-center gap-1.5">
											<Clock size={14} className="text-[var(--color-primary-500)]" />
											{block.time ? formatTime12(block.time) : '—'}
										</span>
									</span>
								</div>
							</motion.div>
						);
					})}
				</AnimatePresence>
			</div>
		</div>
	);
}

/* =========================================================================
	 INLINE MEAL EDITOR
	 ========================================================================= */
const inlineSchema = yup.object().shape({
	items: yup.array().of(
		yup.object().shape({
			name: yup.string().required('Required'),
			unit: yup.string().oneOf(['g', 'count']).default('g'),
			quantity: yup.number().nullable().transform(v => (Number.isNaN(v) ? null : v)),
			calories: yup.number().nullable().transform(v => (Number.isNaN(v) ? null : v)),
		}),
	).min(1, 'Add at least one item'),
});

function InlineMealEditor({ dayKey, mealIndex, initialItems = [], onCancel, onSave }) {
	const t = useTranslations('my-nutrition');
	const { control, handleSubmit, formState: { isSubmitting } } = useForm({
		resolver: yupResolver(inlineSchema),
		mode: 'onChange',
		defaultValues: {
			items: (initialItems || []).map(i => ({
				name: i.name || '',
				unit: i.unit === 'count' ? 'count' : 'g',
				quantity: i.quantity != null ? Number(i.quantity) : null,
				calories: i.calories != null ? Number(i.calories) : null,
			})),
		},
	});
	const { fields, append, remove } = useFieldArray({ control, name: 'items' });

	return (
		<form
			onSubmit={handleSubmit(async vals => { await onSave?.(vals.items); })}
			className="mt-4 space-y-3 rounded-lg border-2 border-[var(--color-primary-200)] p-4 shadow-inner bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)]"
		>
			{!fields.length ? (
				<div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600 bg-white shadow-sm">
					{t('nutrition.inline.noItems')}
				</div>
			) : (
				<div className="space-y-2.5">
					{fields.map((f, idx) => (
						<div key={f.id || idx} className="grid grid-cols-1 md:grid-cols-[1.2fr_.7fr_.6fr_.55fr_auto] gap-2.5 border border-slate-200 rounded-lg p-3 bg-white shadow-sm">
							<Controller name={`items.${idx}.name`} control={control} render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.namePlaceholder')} value={field.value} onChange={field.onChange} error={fieldState?.error?.message} />} />
							<Controller name={`items.${idx}.quantity`} control={control} render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.quantityPlaceholder')} type="number" value={field.value ?? ''} onChange={v => field.onChange(v === '' ? '' : Number(v))} error={fieldState?.error?.message} />} />
							<Controller name={`items.${idx}.calories`} control={control} render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.caloriesPlaceholder')} type="number" value={field.value ?? ''} onChange={v => field.onChange(v === '' ? '' : Number(v))} error={fieldState?.error?.message} />} />
							<Controller name={`items.${idx}.unit`} control={control} render={({ field }) => (
								<select value={field.value || 'g'} onChange={e => field.onChange(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
									<option value="g">g</option>
									<option value="count">count</option>
								</select>
							)} />
							<button type="button" onClick={() => remove(idx)} className="rounded-lg border border-slate-300 px-3 text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600 h-9 font-medium transition-colors">
								{t('nutrition.inline.remove')}
							</button>
						</div>
					))}
				</div>
			)}

			<div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
				<button
					type="button"
					onClick={() => append({ name: '', unit: 'g', quantity: null, calories: null })}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors"
				>
					<Plus className="h-4 w-4" /> {t('nutrition.inline.addItem')}
				</button>
				<div className="flex items-center gap-2.5">
					<BasicButton labelKey="common.cancel" variant="neutral" onClick={onCancel} />
					<BasicButton labelKey="common.save" variant="primary" submit loading={isSubmitting} />
				</div>
			</div>
		</form>
	);
}

/* =========================================================================
	 HELPERS
	 ========================================================================= */
function deriveTakenMapsFromHistory(plan, history) {
	const mealMap = {}, itemMap = {}, suppMap = {};
	const sorted = [...(history || [])].sort((a, b) => +new Date(a.eatenAt || a.createdAt) - +new Date(b.eatenAt || b.createdAt));
	for (const log of sorted) {
		const dayKey = (log.day || '').toLowerCase();
		const mi = typeof log.mealIndex === 'number' ? log.mealIndex : null;
		if (Array.isArray(log.items) && mi != null) {
			for (const it of log.items) {
				if (!it?.name) continue;
				itemMap[kItemByName(dayKey, mi, it.name)] = !!it.taken;
			}
		}
		if (Array.isArray(log.supplementsTaken) && log.supplementsTaken.length) {
			const scope = mi != null ? 'meal' : 'day';
			log.supplementsTaken.forEach(s => {
				if (!s?.name) return;
				suppMap[kSuppByName(dayKey, scope, mi, s.name)] = !!s.taken;
			});
		}
	}
	if (plan?.days?.length) {
		normalizeWeekOrder(plan.days).forEach(d => {
			const dayKey = (d.day || '').toLowerCase();
			(d.meals || []).forEach((meal, mi) => {
				const items = meal.items || [];
				if (!items.length) return;
				mealMap[`${dayKey}:${mi}`] = items.every(it => itemMap[kItemByName(dayKey, mi, it.name)]);
			});
		});
	}
	return { mealMap, itemMap, suppMap };
}

function formatTime12(hhmm) {
	if (!hhmm) return '—';
	const [hStr, mStr = '00'] = String(hhmm).split(':');
	let h = Number(hStr);
	const m = Number(mStr);
	const ap = h >= 12 ? 'PM' : 'AM';
	h = h % 12 || 12;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function weekdayKeySaturdayFirst(d) {
	const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	return map[d.getDay()];
}

function normalizeWeekOrder(days = []) {
	const order = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
	const byKey = {};
	for (const d of days) byKey[(d.day || '').toLowerCase()] = d;
	return order.map(k => byKey[k]).filter(Boolean);
}

function sumCaloriesDay(meals = []) {
	let total = 0;
	(meals || []).forEach(m => (m.items || []).forEach(it => { total += Number(it.calories || 0); }));
	return total;
}

function mapFoodsToMeals(foods = []) {
	if (!foods?.length) return [];
	return [{ title: '', time: '', items: foods.map(f => ({ name: f.name, quantity: Number.isFinite(Number(f.quantity)) ? Number(f.quantity) : null, calories: Number.isFinite(Number(f.calories)) ? Number(f.calories) : null, unit: f.unit === 'count' ? 'count' : 'g' })) }];
}

function normName(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
const kItemByName = (dayKey, mi, name) => `${dayKey}:${mi}:name::${normName(name)}`;
const kSuppByName = (dayKey, scope, mealIndexOrNull, name) => {
	const base = `${dayKey}:${scope}:name::${normName(name)}`;
	return scope === 'meal' ? `${base}@${mealIndexOrNull}` : base;
};

function dateForDayKeyInCurrentWeek(dayKey, now = new Date()) {
	const WEEK = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
	const idx = WEEK.indexOf((dayKey || '').toLowerCase());
	if (idx === -1) return formatLocalDateYYYYMMDD(now);
	const jsDay = now.getDay();
	const backToSat = (jsDay + 1) % 7;
	const weekStart = new Date(now);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - backToSat);
	const target = new Date(weekStart);
	target.setDate(weekStart.getDate() + idx);
	return formatLocalDateYYYYMMDD(target);
}

function formatLocalDateYYYYMMDD(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}