'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	UtensilsCrossed,
	Clock,
	History,
	Send,
	Plus,
	Target,
	Calendar,
	TrendingUp,
	StickyNote,
	Pill,
	Inbox,
	PencilLine,
	Check,
	CheckCircle,
	CircleCheck,
	Flame,
	Activity,
	Zap,
	Apple,
} from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/utils/axios';
import { Modal, StatCard, StatCardArray, TabsPill } from '@/components/dashboard/ui/UI';
import { Input } from '@/components/atoms/Input2';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Notification } from '@/config/Notification';
import HistoryViewer from '@/components/pages/dashboard/nutrition/HistoryViewer';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { useTheme } from '@/app/[locale]/theme';

/* =========================================================================
	 SMALL UI PRIMITIVES (IN-FILE)
	 ========================================================================= */
function BasicButton({ labelKey, onClick, icon: Icon, variant = 'outline', submit = false, loading = false }) {
	const t = useTranslations('my-nutrition');
	const { colors } = useTheme();

	const base = 'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium h-9 px-3 transition active:scale-95';

	const getVariantStyles = () => {
		switch (variant) {
			case 'primary':
				return `bg-[var(--color-primary-600)] text-white border-[var(--color-primary-700)] hover:bg-[var(--color-primary-700)] shadow-sm`;
			case 'warning':
				return 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm';
			case 'neutral':
				return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
			default:
				return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
		}
	};

	return (
		<button
			type={submit ? 'submit' : 'button'}
			onClick={onClick}
			disabled={loading}
			className={`${base} ${getVariantStyles()} disabled:opacity-60`}
		>
			{Icon ? <Icon className="h-4 w-4" /> : null}
			<span>{loading ? t('common.loading') : t(labelKey)}</span>
		</button>
	);
}

/** Minimal checkbox visual with theme support */
function MiniCheck({ checked, tone = 'primary', className = '' }) {
	const { colors } = useTheme();

	const getCheckStyles = () => {
		if (checked) {
			return tone === 'emerald'
				? 'bg-emerald-600 border-emerald-600'
				: 'bg-[var(--color-primary-600)] border-[var(--color-primary-700)]';
		}
		return 'bg-white border-slate-300';
	};

	return (
		<span
			aria-hidden="true"
			className={`flex-none relative inline-flex h-4 w-4 items-center justify-center rounded border transition-all pointer-events-none ${getCheckStyles()} ${className}`}
		>
			{checked ? (
				<svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
					<path
						fillRule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
						clipRule="evenodd"
					/>
				</svg>
			) : null}
		</span>
	);
}

/* =========================================================================
	 MAIN PAGE
	 ========================================================================= */
export default function ClientMealPlanPage() {
	const [loading, setLoading] = useState(true);
	const [plan, setPlan] = useState(null);
	const t = useTranslations('my-nutrition');
	const { colors } = useTheme();

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

			const dateISO = dateForDayKeyInCurrentWeek(initialDay, new Date());
			setSelectedDateISO(dateISO);
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
		if (selectedDateISO && activeDayKey) {
			fetchLogsForDate(selectedDateISO, activeDayKey, plan);
		}
	};

	const days = useMemo(() => normalizeWeekOrder(plan?.days || []), [plan]);
	const tabs = useMemo(
		() =>
			(plan?.days?.length ? days : []).map(d => ({
				key: (d.day || '').toLowerCase(),
				label: capitalize(d.name || d.day),
			})),
		[days, plan],
	);
	const activeDay = useMemo(
		() => (plan?.days?.length ? days.find(d => (d.day || '').toLowerCase() === (activeDayKey || '').toLowerCase()) || null : null),
		[days, activeDayKey, plan],
	);

	const stats = useMemo(() => {
		if (!activeDay) return { meals: 0, kcal: 0, adherenceAvg: 0, streak: 0 };
		const meals = (activeDay?.meals || []).length;
		const kcal = sumCaloriesDay(activeDay?.meals || []);
		return { meals, kcal };
	}, [activeDay, history]);

	const kMeal = (dayKey, mi) => `${dayKey}:${mi}`;

	// PESSIMISTIC UPDATE: meal
	const setMealTaken = async (dayKey, mealIndex, meal, value) => {
		const lockKey = `meal:${dayKey}:${mealIndex}`;

		await runLocked(lockKey, async () => {
			const mealKey = kMeal(dayKey, mealIndex);
			const itemKeys = (meal.items || []).map(i => kItemByName(dayKey, mealIndex, i.name));

			const prevMealValue = !!takenMap[mealKey];
			const prevItemValues = {};
			itemKeys.forEach(k => {
				prevItemValues[k] = itemTakenMap[k];
			});

			setTakenMap(prev => ({ ...prev, [mealKey]: value }));
			setItemTakenMap(prev => {
				const next = { ...prev };
				itemKeys.forEach(k => {
					next[k] = value;
				});
				return next;
			});

			try {
				await api.post('/nutrition/food-logs', {
					planId: plan?.id,
					day: dayKey,
					mealIndex,
					eatenAt: new Date().toISOString(),
					adherence: value ? 5 : 3,
					mealTitle: meal?.title || t('nutrition.meal.defaultTitle', { index: mealIndex + 1 }),
					items: (meal.items || []).map(i => ({
						name: i.name,
						taken: !!value,
						qty: i.quantity == null ? null : Number(i.quantity),
						unit: i.unit === 'count' ? 'count' : 'g', // ✅ include unit
					})),
					notifyCoach: false,
					extraFoods: [],
					supplementsTaken: [],
				});
			} catch (e) {
				setTakenMap(prev => ({ ...prev, [mealKey]: prevMealValue }));
				setItemTakenMap(prev => {
					const next = { ...prev };
					itemKeys.forEach(k => {
						next[k] = prevItemValues[k];
					});
					return next;
				});
				Notification(e?.response?.data?.message || t('nutrition.errors.mealLogFailed'), 'error');
			}
		});
	};

	// OPTIMISTIC UPDATE: single item
	const setItemTaken = async (dayKey, mealIndex, item, value) => {
		const lockKey = `item:${dayKey}:${mealIndex}:${normName(item.name)}`;

		await runLocked(lockKey, async () => {
			const key = kItemByName(dayKey, mealIndex, item.name);
			const meal = activeDay?.meals?.[mealIndex];
			const mealKey = kMeal(dayKey, mealIndex);

			const prevItemValue = !!itemTakenMap[key];
			const prevMealValue = !!takenMap[mealKey];

			setItemTakenMap(prev => {
				const next = { ...prev, [key]: value };

				if (meal?.items?.length) {
					const allTrue = meal.items.every(i => {
						const k = kItemByName(dayKey, mealIndex, i.name);
						return !!next[k];
					});

					setTakenMap(prevMeals => ({
						...prevMeals,
						[mealKey]: allTrue,
					}));
				}

				return next;
			});

			try {
				await api.post('/nutrition/food-logs', {
					planId: plan?.id,
					day: dayKey,
					mealIndex,
					eatenAt: new Date().toISOString(),
					adherence: value ? 4 : 3,
					mealTitle: meal?.title || t('nutrition.meal.defaultTitle', { index: mealIndex + 1 }),
					items: [
						{
							name: item.name,
							taken: !!value,
							qty: item.quantity == null ? null : Number(item.quantity),
							unit: item.unit === 'count' ? 'count' : 'g', // ✅ include unit
						},
					],
					notifyCoach: false,
					extraFoods: [],
					supplementsTaken: [],
				});
			} catch (e) {
				setItemTakenMap(prev => ({
					...prev,
					[key]: prevItemValue,
				}));

				setTakenMap(prevMeals => ({
					...prevMeals,
					[mealKey]: prevMealValue,
				}));

				Notification(e?.response?.data?.message || t('nutrition.errors.itemUpdateFailed'), 'error');
			}
		});
	};

	// OPTIMISTIC UPDATE: supplements
	const setSupplementTaken = async (dayKey, scope, idOrIndex, supp, value, mealIndex = null) => {
		const localKey = kSuppByName(dayKey, scope, mealIndex, supp.name);
		const lockKey = `supp:${localKey}`;

		await runLocked(lockKey, async () => {
			const prevValue = !!suppTakenMap[localKey];

			setSuppTakenMap(prev => ({
				...prev,
				[localKey]: value,
			}));

			try {
				await api.post('/nutrition/food-logs', {
					planId: plan?.id,
					day: dayKey,
					mealIndex,
					eatenAt: new Date().toISOString(),
					adherence: 5,
					mealTitle:
						mealIndex != null
							? activeDay?.meals?.[mealIndex]?.title || t('nutrition.meal.defaultTitle', { index: Number(mealIndex) + 1 })
							: t('nutrition.supplements.logTitle'),
					items: [],
					notifyCoach: false,
					extraFoods: [],
					supplementsTaken: [{ name: supp.name, taken: !!value }],
				});
			} catch (e) {
				setSuppTakenMap(prev => ({
					...prev,
					[localKey]: prevValue,
				}));

				Notification(e?.response?.data?.message || t('nutrition.errors.supplementUpdateFailed'), 'error');
			}
		});
	};

	const hasNotes = !!(plan?.notes && String(plan.notes).trim().length);

	const saveInlineMeal = async ({ dayKey, mealIndex, items }) => {
		try {
			await api.post('/nutrition/my/meal-overrides', {
				day: dayKey,
				mealIndex,
				items: (items || []).map(i => ({
					name: (i.name || '').trim(),
					quantity: i.quantity == null || i.quantity === '' ? null : Number(i.quantity),
					unit: i.unit === 'count' ? 'count' : 'g', // ✅ save unit
					calories: i.calories == null || i.calories === '' ? null : Number(i.calories),
				})),
			});
			refresh();
		} catch (e) {
			Notification(e?.response?.data?.message || t('nutrition.errors.inlineSaveFailed'), 'error');
		}
	};

	const user = useUser();

	return (
		<div className="space-y-6 max-md:space-y-3">
			{/* Header with Gradient */}
			<GradientStatsHeader
				loadingStats={loading}
				onClick={() => setNotesOpen(true)}
				btnName={hasNotes && t('nutrition.header.notes')}
				title={<MultiLangText className="max-sm:text-center block text-xl md:text-4xl font-semibold truncate">{plan?.name}</MultiLangText>}
				desc={<MultiLangText className="  block text-white/85 mt-1 max-md:text-sm max-md:line-clamp-2">{plan?.desc}</MultiLangText>}
			>
				<StatCard resPhone={true} icon={Target} title={t('nutrition.header.dailyTarget')} value={user?.caloriesTarget ?? 0} />
				<StatCard resPhone={true} icon={Activity} title={t('nutrition.header.FiberTarget')} value={user?.FiberTarget ?? 0} />
				<StatCard resPhone={true} icon={Flame} title={t('nutrition.header.todayCalories')} value={stats?.kcal ?? 0} />
				<StatCard resPhone={true} icon={TrendingUp} title={t('nutrition.header.mealsSelectedDay')} value={stats?.meals ?? 0} />
			</GradientStatsHeader>

			{/* Enhanced Tabs */}
			<div className="mt-1 md:mt-4 flex items-center justify-between">
				<TabsPill className="bg-white shadow-sm border border-slate-200" tabs={tabs} active={(activeDayKey || '').toLowerCase()} onChange={key => setActiveDayKey(key)} />
			</div>

			{/* Notes Modal */}
			<Modal open={notesOpen} onClose={() => setNotesOpen(false)} title={t('nutrition.notes.modalTitle')}>
				{hasNotes ? (
					<div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-inner">
						<MultiLangText className="whitespace-pre-wrap text-[13px] leading-6 text-slate-900">{plan.notes}</MultiLangText>
					</div>
				) : (
					<div className="text-sm text-slate-600">—</div>
				)}
			</Modal>

			{/* Content */}
			<div className="">
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

			{/* History modal */}
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
	const { colors } = useTheme();

	return (
		<div className="p-6 md:p-8">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 320, damping: 28 }}
				className="mx-auto max-w-xl text-center"
			>
				<div
					className="mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
					style={{
						background: `linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))`,
					}}
				>
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

function DayPanel({ day, takenMap, itemTakenMap, suppTakenMap, setMealTaken, setItemTaken, setSupplementTaken, onInlineSave }) {
	const t = useTranslations('my-nutrition');
	const { colors } = useTheme();

	const meals = day?.meals || mapFoodsToMeals(day?.foods || []);
	const daySupps = Array.isArray(day?.supplements) ? day.supplements : [];
	const dayKey = (day.day || '').toLowerCase();

	const [editing, setEditing] = useState({});
	const toggleEdit = mi => {
		const key = `${dayKey}:${mi}`;
		setEditing(prev => ({ ...prev, [key]: !prev[key] }));
	};

	const formatQtyWithUnit = (it) => {
		if (it?.quantity == null || it?.quantity === '' || Number.isNaN(Number(it.quantity))) return null;
		const qty = Number(it.quantity);

		const unit = it?.unit === 'count' ? 'count' : 'g';

		// Keep your existing "gram" translation for g, and fallback for count
		const unitLabel =
			unit === 'g'
				? (t('gram') || 'g')
				: (t('count') || t('nutrition.units.count') || 'count');

		// Example output: "120g" or "2 count"
		return unit === 'g' ? `${qty}${unitLabel}` : `${qty} ${unitLabel}`;
	};

	const timeline = useMemo(() => {
		const toMin = timeVal => {
			if (!timeVal) return 24 * 60 + 1;
			const [h, m = '0'] = String(timeVal).split(':');
			return Number(h) * 60 + Number(m);
		};
		const mealBlocks = (meals || []).map((m, mi) => ({
			type: 'meal',
			time: m.time || '',
			sortKey: toMin(m.time),
			key: `meal-${mi}`,
			meta: { mi, meal: m },
		}));
		const suppBlocks = (daySupps || []).map((s, si) => ({
			type: 'supp',
			time: s.time || '',
			sortKey: toMin(s.time),
			key: `supp-${si}`,
			meta: { si, supp: s },
		}));
		return [...mealBlocks, ...suppBlocks].sort((a, b) => a.sortKey - b.sortKey);
	}, [meals, daySupps]);

	return (
		<div className="relative">
			{/* Timeline line */}
			<div
				className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 opacity-30"
				style={{
					background: `linear-gradient(180deg, var(--color-primary-400), var(--color-secondary-400))`,
				}}
				aria-hidden="true"
			/>

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
									{/* Timeline marker / time (desktop) */}
									<div className={`hidden md:block ${isLeft ? 'order-1 pr-8' : 'order-2 pl-8'} relative`}>
										{!isLeft && (
											<span
												className="absolute rtl:-right-[24px] ltr:-left-[9px] top-4 h-4 w-4 rounded-full shadow-lg ring-4 ring-white"
												style={{
													background: `linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))`,
												}}
											/>
										)}
										{isLeft && (
											<span
												className="absolute rtl:-left-[24px] ltr:-right-[9px] top-4 h-4 w-4 rounded-full shadow-lg ring-4 ring-white"
												style={{
													background: `linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))`,
												}}
											/>
										)}
										<span
											className={`flex flex-col gap-1 absolute  font-en text-xs text-slate-600 whitespace-nowrap font-medium top-[16px] ${isLeft ? 'rtl:left-[-29px] ltr:right-[48px] translate-x-8' : 'rtl:right-[-22px] ltr:left-[48px] -translate-x-8'}`}
										>
											<span className="flex items-center gap-1.5">
												<Clock size={14} className="text-[var(--color-primary-500)]" />
												{time12}
											</span>
										</span>
									</div>

									{/* Mobile bullet/time */}
									<div className="md:hidden relative flex items-center gap-3 px-2 py-2 mb-2">
										<span className="relative flex h-4 w-4">
											<span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: `var(--color-primary-400)` }} />
											<span
												className="relative inline-flex h-4 w-4 rounded-full ring-4 ring-white shadow-md"
												style={{ background: `linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))` }}
											/>
										</span>
										<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
											<Clock size={14} className="text-[var(--color-primary-500)]" />
											{time12}
										</span>
									</div>

									{/* Card */}
									<div className={`${isLeft ? 'md:order-2 md:rtl:pr-8 md:ltr:pl-8' : 'md:order-1 md:rtl:pl-8 md:ltr:pr-8'}`}>
										<motion.div className="rounded-lg relative border border-slate-200 bg-white p-4 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden" whileHover={{ y: -2 }}>
											{/* Gradient accent bar */}
											<div
												className="absolute top-0 left-0 right-0 h-1"
												style={{
													background: `linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))`,
												}}
											/>

											<div className="flex items-start justify-between gap-3 mt-1">
												<div className="min-w-0 w-full">
													<div className="flex justify-between gap-2 items-start">
														{/* TOP: Meal info */}
														<div className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-slate-900">
															<span
																className="inline-flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ring-1"
																style={{
																	background: `linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))`,
																	color: `var(--color-primary-700)`,
																	borderColor: `var(--color-primary-200)`,
																}}
															>
																<UtensilsCrossed size={16} />
															</span>
															<span className="truncate">{t('nutrition.meal.title', { index: idx + 1 })}</span>
															<span
																className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
																style={{
																	background: `var(--color-primary-50)`,
																	color: `var(--color-primary-700)`,
																	border: `1px solid var(--color-primary-200)`,
																}}
															>
																<Flame size={12} className="inline mr-1" />
																{mealCals} {t('nutrition.units.kcal')}
															</span>
														</div>

														{/* Actions */}
														<div className="flex flex-wrap items-center gap-2">
															{!isEditing && (
																<motion.button
																	type="button"
																	onClick={() => setMealTaken(dayKey, mi, meal, !mealTaken)}
																	aria-pressed={mealTaken}
																	whileTap={{ scale: 0.95 }}
																	className={[
																		'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all shadow-sm',
																		'focus-visible:outline-none focus-visible:ring-2',
																		mealTaken ? 'text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 ring-1 ring-slate-200',
																	].join(' ')}
																	style={
																		mealTaken
																			? {
																					background: `linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))`,
																					boxShadow: `0 4px 12px -2px var(--color-primary-400)`,
																			  }
																			: {}
																	}
																>
																	{mealTaken ? (
																		<>
																			<CheckCircle className="flex-none" size={18} />
																			<span className="max-md:hidden">تم</span>
																		</>
																	) : (
																		<>
																			<CircleCheck className="flex-none" size={18} style={{ color: `var(--color-primary-600)` }} />
																			<span className="max-md:hidden">تحديد</span>
																		</>
																	)}
																</motion.button>
															)}
														</div>
													</div>

													{/* VIEW MODE (enhanced chips) */}
													{!isEditing && !!meal.items?.length && (
														<div className="mt-4 flex flex-col gap-2">
															{(meal.items || []).map((it, i) => {
																const id = it?.id || `${it?.name}-${i}`;
																const checked = !!itemTakenMap[kItemByName(dayKey, mi, it.name)];
																const toggle = () => setItemTaken(dayKey, mi, it, !checked);
																const qtyLabel = formatQtyWithUnit(it); // ✅ g vs count

																return (
																	<motion.div
																		key={id}
																		role="checkbox"
																		aria-checked={checked}
																		tabIndex={0}
																		onKeyDown={e => {
																			if (e.key === ' ' || e.key === 'Enter') {
																				e.preventDefault();
																				toggle();
																			}
																		}}
																		onClick={toggle}
																		whileTap={{ scale: 0.98 }}
																		className={[
																			'!p-3 group inline-flex items-center gap-3 rounded-lg border text-sm transition-all cursor-pointer select-none',
																			'focus-visible:outline-none focus-visible:ring-2',
																			checked ? 'border-transparent shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
																		].join(' ')}
																		style={
																			checked
																				? {
																						background: `linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))`,
																						color: `var(--color-primary-900)`,
																						boxShadow: `inset 0 0 0 1px var(--color-primary-200)`,
																				  }
																				: {}
																		}
																	>
																		<MiniCheck checked={checked} tone="primary" />

																		<div dir="rtl" className={`${checked ? 'font-semibold' : 'font-medium'} flex items-center gap-2 leading-none flex-1`}>
																			<span className="flex-1">{it.name}</span>

																			{/* ✅ quantity label now respects unit (g / count) */}
																			{qtyLabel ? <span className="text-xs opacity-75">{qtyLabel}</span> : null}

																			<span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: checked ? `var(--color-primary-700)` : 'inherit' }}>
																				<Flame size={12} />
																				{Number(it.calories)} {t('nutrition.units.kcal')}
																			</span>
																		</div>
																	</motion.div>
																);
															})}
														</div>
													)}

													{/* EDIT MODE */}
													{isEditing && (
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
													)}

													{/* MEAL-LEVEL SUPPLEMENTS */}
													{!!meal.supplements?.length && !isEditing && (
														<div className="mt-4 pt-4 border-t border-slate-100">
															<div className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
																<span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shadow-sm">
																	<Pill size={14} />
																</span>
																{t('nutrition.supplements.title')}
															</div>
															<div className="flex flex-col gap-2">
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
																			onKeyDown={e => {
																				if (e.key === ' ' || e.key === 'Enter') {
																					e.preventDefault();
																					toggle();
																				}
																			}}
																			onClick={toggle}
																			whileTap={{ scale: 0.98 }}
																			className={[
																				'!p-3 group inline-flex items-center justify-between gap-3 rounded-lg border text-sm transition-all',
																				'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60',
																				taken ? 'bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
																			].join(' ')}
																		>
																			<div className="min-w-0 text-slate-700 flex-1">
																				<div className="flex items-center gap-2">
																					<MiniCheck checked={taken} tone="emerald" />
																					<span className="font-medium text-slate-800 truncate">
																						{s.name}
																						{s.time && ` • ${formatTime12(s.time)}`}
																						{s.timing && ` • ${s.timing}`}
																						{s.bestWith && ` • ${t('nutrition.supplements.bestWith', { value: s.bestWith })}`}
																					</span>
																					{taken && <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t('nutrition.supplements.takenTag')}</span>}
																				</div>
																			</div>
																		</motion.div>
																	);
																})}
															</div>
														</div>
													)}
												</div>
											</div>
										</motion.div>
									</div>
								</motion.div>
							);
						}

						// Day-level supplement block
						const { supp } = block.meta;

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
								<div className={`hidden md:block ${idx % 2 === 0 ? 'order-1 pr-8' : 'order-2 pl-8'} relative`}>
									{idx % 2 !== 0 && <span className="absolute -left-[9px] top-4 h-4 w-4 rounded-full shadow-lg ring-4 ring-white" style={{ background: `linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))` }} />}
									{idx % 2 === 0 && <span className="absolute -right-[9px] top-4 h-4 w-4 rounded-full shadow-lg ring-4 ring-white" style={{ background: `linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))` }} />}
									<span className={`absolute top-8 text-xs text-slate-600 whitespace-nowrap font-medium ${idx % 2 === 0 ? 'right-0 translate-x-8' : 'left-0 -translate-x-8'}`}>
										<span className="inline-flex items-center gap-1.5">
											<Clock size={14} className="text-[var(--color-primary-500)]" />
											{block.time ? formatTime12(block.time) : '—'}
										</span>
									</span>
								</div>

								<div className={`${idx % 2 === 0 ? 'md:order-2 md:pl-8' : 'md:order-1 md:pr-8'}`}>
									<motion.div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md hover:shadow-xl transition-all duration-300" whileHover={{ y: -2 }}>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0 flex-1">
												<div className="font-semibold text-slate-900 flex items-center gap-2.5 text-sm">
													<Pill size={18} className="text-emerald-600" />
													<span className="truncate">{supp.name}</span>
												</div>
												<div className="mt-2 text-sm text-slate-600">
													{supp.bestWith ? (
														<>
															{t('nutrition.supplements.bestWithLabel')} <span className="font-medium text-slate-800">{supp.bestWith}</span>
														</>
													) : (
														'—'
													)}
													{supp.timing && <span className="ml-2 text-slate-700">• {supp.timing}</span>}
												</div>
											</div>

											{(() => {
												const takenKey = kSuppByName(dayKey, 'day', null, supp.name);
												const taken = !!suppTakenMap[takenKey];
												const toggle = () => setSupplementTaken(dayKey, 'day', `${supp.id || block.key}`, supp, !taken, null);
												return (
													<motion.div
														role="checkbox"
														aria-checked={taken}
														tabIndex={0}
														onKeyDown={e => {
															if (e.key === ' ' || e.key === 'Enter') {
																e.preventDefault();
																toggle();
															}
														}}
														onClick={toggle}
														whileTap={{ scale: 0.95 }}
														className={[
															'block !p-2.5 !px-4 group inline-flex items-center gap-2 rounded-lg border text-sm font-medium transition-all shadow-sm',
															'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60',
															taken ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
														].join(' ')}
													>
														<MiniCheck checked={taken} tone="emerald" className={!taken ? 'opacity-60' : ''} />
														<span className="leading-none">{taken ? t('nutrition.supplements.takenTag') : t('nutrition.supplements.markTaken')}</span>
													</motion.div>
												);
											})()}
										</div>
									</motion.div>
								</div>

								<div className="md:hidden pl-10 relative mb-2">
									<span className="absolute left-0 top-3 h-4 w-4 rounded-full shadow-md ring-4 ring-white" style={{ background: `linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))` }} />
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
	items: yup
		.array()
		.of(
			yup.object().shape({
				name: yup.string().required('Required'),
				unit: yup.string().oneOf(['g', 'count']).default('g'), // ✅ add unit
				quantity: yup
					.number()
					.nullable()
					.transform(v => (Number.isNaN(v) ? null : v)),
				calories: yup
					.number()
					.nullable()
					.transform(v => (Number.isNaN(v) ? null : v)),
			}),
		)
		.min(1, 'Add at least one item'),
});

function InlineMealEditor({ dayKey, mealIndex, initialItems = [], onCancel, onSave }) {
	const t = useTranslations('my-nutrition');
	const { colors } = useTheme();

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
	} = useForm({
		resolver: yupResolver(inlineSchema),
		mode: 'onChange',
		defaultValues: {
			items: (initialItems || []).map(i => ({
				name: i.name || '',
				unit: i.unit === 'count' ? 'count' : 'g', // ✅ keep incoming unit
				quantity: i.quantity != null ? Number(i.quantity) : null,
				calories: i.calories != null ? Number(i.calories) : null,
			})),
		},
	});

	const { fields, append, remove } = useFieldArray({ control, name: 'items' });

	const submit = async vals => {
		await onSave?.(vals.items);
	};

	return (
		<form
			onSubmit={handleSubmit(submit)}
			className="mt-4 space-y-3 rounded-lg border-2 p-4 shadow-inner"
			style={{
				borderColor: `var(--color-primary-200)`,
				background: `linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))`,
			}}
		>
			{!fields.length ? (
				<div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600 bg-white shadow-sm">{t('nutrition.inline.noItems')}</div>
			) : (
				<div className="space-y-2.5">
					{fields.map((f, idx) => (
						<div key={f.id || idx} className="grid grid-cols-1 md:grid-cols-[1.2fr_.7fr_.6fr_.55fr_auto] gap-2.5 border border-slate-200 rounded-lg p-3 bg-white shadow-sm">
							<Controller
								name={`items.${idx}.name`}
								control={control}
								render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.namePlaceholder')} value={field.value} onChange={field.onChange} error={fieldState?.error?.message} />}
							/>
							<Controller
								name={`items.${idx}.quantity`}
								control={control}
								render={({ field, fieldState }) => (
									<Input
										placeholder={t('nutrition.inline.quantityPlaceholder')}
										type="number"
										value={field.value ?? ''}
										onChange={v => field.onChange(v === '' ? '' : Number(v))}
										error={fieldState?.error?.message}
									/>
								)}
							/>
							<Controller
								name={`items.${idx}.calories`}
								control={control}
								render={({ field, fieldState }) => (
									<Input
										placeholder={t('nutrition.inline.caloriesPlaceholder')}
										type="number"
										value={field.value ?? ''}
										onChange={v => field.onChange(v === '' ? '' : Number(v))}
										error={fieldState?.error?.message}
									/>
								)}
							/>

							{/* ✅ unit editor (g / count) */}
							<Controller
								name={`items.${idx}.unit`}
								control={control}
								render={({ field }) => (
									<select
										value={field.value || 'g'}
										onChange={(e) => field.onChange(e.target.value)}
										className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
									>
										<option value="g">g</option>
										<option value="count">count</option>
									</select>
								)}
							/>

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
					onClick={() => append({ name: '', unit: 'g', quantity: null, calories: null })} // ✅ include unit default
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

// Helper functions
function deriveTakenMapsFromHistory(plan, history) {
	const mealMap = {};
	const itemMap = {};
	const suppMap = {};

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
				const key = kSuppByName(dayKey, scope, mi, s.name);
				suppMap[key] = !!s.taken;
			});
		}
	}

	if (plan?.days?.length) {
		const days = normalizeWeekOrder(plan.days);
		days.forEach(d => {
			const dayKey = (d.day || '').toLowerCase();
			(d.meals || []).forEach((meal, mi) => {
				const items = meal.items || [];
				if (!items.length) return;
				const allTrue = items.every(it => itemMap[kItemByName(dayKey, mi, it.name)]);
				mealMap[`${dayKey}:${mi}`] = allTrue;
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
	h = h % 12;
	if (h === 0) h = 12;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

function capitalize(s) {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function weekdayKeySaturdayFirst(d) {
	const js = d.getDay();
	const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	return map[js];
}

function normalizeWeekOrder(days = []) {
	const order = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
	const byKey = {};
	for (const d of days) byKey[(d.day || '').toLowerCase()] = d;
	return order.map(k => byKey[k]).filter(Boolean);
}

function sumCaloriesDay(meals = []) {
	let total = 0;
	(meals || []).forEach(m =>
		(m.items || []).forEach(it => {
			total += Number(it.calories || 0);
		}),
	);
	return total;
}

function mapFoodsToMeals(foods = []) {
	if (!foods?.length) return [];
	return [
		{
			title: '',
			time: '',
			items: foods.map(f => ({
				name: f.name,
				quantity: Number.isFinite(Number(f.quantity)) ? Number(f.quantity) : null,
				calories: Number.isFinite(Number(f.calories)) ? Number(f.calories) : null,
				unit: f.unit === 'count' ? 'count' : 'g', // ✅ preserve unit
			})),
		},
	];
}

function normName(s) {
	return String(s || '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

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
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}
