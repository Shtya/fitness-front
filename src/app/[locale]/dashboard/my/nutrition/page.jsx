'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Utensils, Clock, Plus, Target, Pill, Inbox, Flame, BookOpen, BookMarked, Lightbulb, PlayCircle, Eye, X, History, Salad, Check, Circle, ListChecks, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
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
import { useLocale, useTranslations } from 'next-intl';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import { useTheme } from '@/app/[locale]/theme';
import NutritionGuideModal from './Nutritionguidemodal';

/* =========================================================================
	 SMALL UI PRIMITIVES
	 ========================================================================= */
function BasicButton({ labelKey, onClick, icon: Icon, variant = 'outline', submit = false, loading = false }) {
  const t = useTranslations('my-nutrition');

  const base = 'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium h-9 px-3 transition active:scale-95';

  const variants = {
    primary: 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-700)] hover:bg-[var(--color-primary-700)] shadow-sm',
    warning: 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm',
    neutral: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
    outline: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
  };

  return (
    <button type={submit ? 'submit' : 'button'} onClick={onClick} disabled={loading} className={`${base} ${variants[variant] ?? variants.outline} disabled:opacity-60`}>
      {Icon ? <Icon className='h-4 w-4' /> : null}
      <span>{loading ? t('common.loading') : t(labelKey)}</span>
    </button>
  );
}

/* =========================================================================
	 RECIPE DETAIL SHEET (same UX as my/recipes RecipeModal)
	 ========================================================================= */
const cn = (...c) => c.filter(Boolean).join(' ');

function normalizeRecipeImageUrl(url) {
  if (!url) return '';
  const s = String(url);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${process.env.NEXT_PUBLIC_BASE_URL}${s}`;
}

const SAT = {
  LOW: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  MEDIUM: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  HIGH: { dot: 'bg-rose-400', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};
const satMeta = v => SAT[String(v || '').toUpperCase()] ?? SAT.MEDIUM;

const MEAL_EMOJI = {
  savory_breakfast: '🍳',
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🌿',
  sweet: '🍰',
  salad: '🥗',
  soup: '🍲',
  drink: '🥤',
  dessert: '🍮',
  default: '🏷️',
};
const mealEmoji = v => MEAL_EMOJI[v] ?? MEAL_EMOJI.default;

function MacroBarNutrition({ protein, carbs, fat }) {
  const total = Number(protein) + Number(carbs) + Number(fat) || 1;
  const bars = [
    { v: carbs, c: '#f59e0b' },
    { v: protein, c: '#3b82f6' },
    { v: fat, c: '#ec4899' },
  ];
  return (
    <div className='flex h-1.5 overflow-hidden rounded-full gap-px'>
      {bars.map(({ v, c }, i) => (
        <div key={i} className='h-full rounded-full transition-all duration-700' style={{ width: `${(Number(v) / total) * 100}%`, background: c }} />
      ))}
    </div>
  );
}

/** Maps meal-plan API `item.recipe` to the same shape as recipes `mapRecipe()` */
function mapMealItemRecipeToModalRecipe(hydrated, fallbackName) {
  if (!hydrated) return null;
  const rawImg = hydrated.imageUrl ?? hydrated.image;
  return {
    id: hydrated.id,
    title: String(hydrated.title || fallbackName || '').trim() || String(fallbackName || ''),
    satiety: String(hydrated.satiety || hydrated.satietyIndex || 'MEDIUM')
      .replace(/\s+/g, '_')
      .toUpperCase(),
    category: hydrated.mealType || 'default',
    calories: Number(hydrated.calories ?? 0),
    protein: Number(hydrated.proteinG ?? hydrated.protein ?? 0),
    carbs: Number(hydrated.carbsG ?? hydrated.carbs ?? 0),
    fat: Number(hydrated.fatG ?? hydrated.fat ?? 0),
    ingredients: Array.isArray(hydrated.ingredients) ? hydrated.ingredients : [],
    creamIngredients: Array.isArray(hydrated.creamIngredients) ? hydrated.creamIngredients : [],
    sauceIngredients: Array.isArray(hydrated.sauceIngredients) ? hydrated.sauceIngredients : [],
    directions: Array.isArray(hydrated.directions) ? hydrated.directions : [],
    tips: Array.isArray(hydrated.tips) ? hydrated.tips.map(x => (typeof x === 'string' ? x : x?.text)).filter(Boolean) : [],
    videoUrl: hydrated.videoUrl || '',
    imageUrl: normalizeRecipeImageUrl(rawImg),
  };
}

function NutritionRecipeSheet({ recipe, onClose }) {
  const t = useTranslations('recipesPage');
  const tMt = useTranslations('recipesPage.mealTypes');
  const tNu = useTranslations('my-nutrition');

  useEffect(() => {
    if (recipe) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [recipe]);

  if (!recipe) return null;

  const sat = satMeta(recipe.satiety);

  let catLabel = recipe.category;
  try {
    catLabel = mealEmoji(recipe.category) + ' ' + tMt(recipe.category);
  } catch {
    catLabel = mealEmoji(recipe.category) + ' ' + recipe.category;
  }

  return createPortal(
    <AnimatePresence>
      {recipe && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[80] bg-black/75 backdrop-blur-md' onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 38 }} className='fixed inset-x-0 bottom-0 top-[4%] z-[81] flex flex-col bg-white rounded-t-3xl overflow-hidden sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-[3%] sm:bottom-[3%] sm:w-[min(680px,94vw)] sm:rounded-3xl' style={{ boxShadow: '0 -24px 80px rgba(99,102,241,0.22), 0 40px 120px rgba(0,0,0,0.4)' }}>
            <div className='sm:hidden absolute top-2 inset-x-0 flex justify-center z-10'>
              <div className='h-1 w-10 rounded-full bg-[var(--color-primary-200)]' />
            </div>

            <div className='relative h-fit shrink-0 overflow-hidden bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)]'>
              {recipe.imageUrl ? (
                <img src={recipe.imageUrl} alt={recipe.title} className='w-full h-full max-h-[min(48vh,360px)] object-contain' />
              ) : (
                <div className='aspect-[16/9] max-h-[min(48vh,360px)] flex items-center justify-center'>
                  <BookMarked className='h-14 w-14 opacity-10 text-[var(--color-primary-400)]' />
                </div>
              )}
              <div className='absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-transparent' />

              <div className='absolute top-4 start-4 flex items-center gap-2 flex-wrap'>
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/40 text-white backdrop-blur-sm'>{catLabel}</span>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm', sat.bg, sat.text, sat.border)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', sat.dot)} />
                  {t(`satiety.${String(recipe.satiety).toLowerCase()}`)}
                </span>
              </div>

              <button type='button' onClick={onClose} aria-label={tNu('nutrition.closeRecipeDetails')} className='absolute top-3 end-3 w-8 h-8 rounded-xl flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors border-none cursor-pointer'>
                <X className='h-3.5 w-3.5' />
              </button>

              <div className='absolute bottom-3 start-4 end-14'>
                <h2 className='text-lg sm:text-2xl font-black text-white md: leading-tight'>{recipe.title}</h2>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-5' style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}>
              <div className='rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-4'>
                <p className='text-[8px] font-black uppercase tracking-[0.16em] mb-3 text-[var(--color-primary-500)]'>{t('card.nutrition')}</p>
                <div className='flex items-end justify-between flex-wrap gap-3'>
                  <div>
                    <p className='text-4xl sm:text-5xl font-black md: leading-none tabular-nums text-[var(--color-primary-700)]'>{recipe.calories}</p>
                    <p className='text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-1'>{t('card.calories')}</p>
                  </div>
                  <div className='flex gap-5 sm:gap-6'>
                    {[
                      [t('card.protein'), recipe.protein, '#3b82f6'],
                      [t('card.carbs'), recipe.carbs, '#f59e0b'],
                      [t('card.fat'), recipe.fat, '#ec4899'],
                    ].map(([l, v, c]) => (
                      <div key={String(l)} className='text-center'>
                        <p className='text-lg sm:text-xl font-black tabular-nums text-slate-800'>{v}g</p>
                        <div className='w-6 h-1.5 rounded-full mx-auto my-1.5' style={{ background: String(c) }} />
                        <p className='text-[8px] font-bold text-slate-400 uppercase'>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className='mt-3.5'>
                  <MacroBarNutrition protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-4'>
                  {recipe.ingredients?.length > 0 && (
                    <div>
                      <p className='text-[8px] font-black uppercase tracking-[0.14em] mb-2.5 text-[var(--color-primary-600)]'>{t('card.ingredients')}</p>
                      <ul className='space-y-2'>
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i} className='flex items-start gap-2 text-xs text-slate-600'>
                            <span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary-400)]' />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recipe.creamIngredients?.length > 0 && (
                    <div>
                      <p className='text-[8px] font-black uppercase tracking-[0.14em] mb-2 text-slate-400'>{t('card.creamIngredients')}</p>
                      <ul className='space-y-1.5'>
                        {recipe.creamIngredients.map((ing, i) => (
                          <li key={i} className='flex items-start gap-2 text-[11px] text-slate-500'>
                            <span className='mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300' />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recipe.sauceIngredients?.length > 0 && (
                    <div>
                      <p className='text-[8px] font-black uppercase tracking-[0.14em] mb-2 text-slate-400'>{t('card.sauceIngredients')}</p>
                      <ul className='space-y-1.5'>
                        {recipe.sauceIngredients.map((ing, i) => (
                          <li key={i} className='flex items-start gap-2 text-[11px] text-slate-500'>
                            <span className='mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300' />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {recipe.directions?.length > 0 && (
                  <div>
                    <p className='text-[8px] font-black uppercase tracking-[0.14em] mb-2.5 text-[var(--color-primary-600)]'>{t('card.directions')}</p>
                    <ol className='space-y-2.5'>
                      {recipe.directions.map((step, i) => (
                        <li key={i} className='flex gap-2.5 text-xs text-slate-600'>
                          <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[8px] font-black text-white mt-0.5 bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]'>{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {recipe.tips?.length > 0 && (
                <div className='flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4'>
                  <Lightbulb className='h-4 w-4 shrink-0 text-amber-500 mt-0.5' />
                  <ul className='space-y-1.5'>
                    {recipe.tips.map((tip, i) => (
                      <li key={i} className='text-[11px] sm:text-xs text-amber-800 font-medium md: leading-relaxed'>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipe.videoUrl && (
                <a href={recipe.videoUrl} target='_blank' rel='noreferrer' className='flex items-center gap-2.5 rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4 text-sm font-bold transition-all hover:bg-[var(--color-primary-100)] active:scale-[0.98] text-[var(--color-primary-700)] no-underline'>
                  <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center text-white shrink-0'>
                    <PlayCircle className='h-4 w-4' />
                  </div>
                  {t('card.watchVideo')}
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* =========================================================================
	 STAT PILL — matches RecipePage header stats
	 ========================================================================= */
function HeaderStatPill({ label, value, icon: Icon }) {
  return (
    <div className='flex min-h-[46px] min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-2.5 py-2 text-white'>
      <span className='grid h-7 w-7 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15'>
        {Icon ? <Icon size={14} strokeWidth={2} /> : null}
      </span>
      <span className='min-w-0'>
        <span className='block truncate text-[15px] font-black leading-[18px] tabular-nums'>{value ?? 0}</span>
        <span className='block truncate text-[9px] font-bold leading-[11px] text-white/70'>{label}</span>
      </span>
    </div>
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
  const [guideOpen, setGuideOpen] = useState(false);

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
  const activeDay = useMemo(() => (plan?.days?.length ? days.find(d => (d.day || '').toLowerCase() === (activeDayKey || '').toLowerCase()) || null : null), [days, activeDayKey, plan]);

  const stats = useMemo(() => {
    if (!activeDay) return { meals: 0, kcal: 0 };
    return {
      meals: (activeDay?.meals || []).length,
      kcal: sumCaloriesDay(activeDay?.meals || []),
    };
  }, [activeDay]);

  const user = useUser();
  const nav = useTranslations('nav.labels');
  const hasNotes = !!(plan?.notes && String(plan.notes).trim().length);
  const takenMeals = useMemo(() => {
    if (!activeDayKey) return 0;
    const prefix = `${String(activeDayKey).toLowerCase()}:`;
    return Object.entries(takenMap).filter(([key, value]) => value && key.startsWith(prefix)).length;
  }, [takenMap, activeDayKey]);
  const fiveDayTabs = useMemo(() => {
    const dayIdToJs = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const today = new Date();
    const todayJs = today.getDay();
    const withDate = tabs.map(tab => {
      const targetJs = dayIdToJs[tab.key];
      const dateObj = new Date(today);
      if (targetJs != null) dateObj.setDate(today.getDate() + (targetJs - todayJs));
      return { ...tab, date: targetJs == null ? null : dateObj.getDate() };
    });
    if (withDate.length <= 5) return withDate;
    const idx = withDate.findIndex(tb => tb.key === String(activeDayKey || '').toLowerCase());
    const clamped = idx < 0 ? 0 : idx;
    const start = Math.max(0, Math.min(clamped - 2, withDate.length - 5));
    return withDate.slice(start, start + 5);
  }, [tabs, activeDayKey]);
  const headerBtn = 'grid h-11 w-11 place-items-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-b-[rgba(15,48,120,0.35)] border-e-[rgba(15,48,120,0.25)] bg-white/15 text-white shadow-[2px_3px_6px_rgba(15,23,42,0.35)] transition active:scale-95';

  /* taken handlers (unchanged logic) */
  const setMealTaken = async (dayKey, mealIndex, meal, value) => {
    const lockKey = `meal:${dayKey}:${mealIndex}`;
    await runLocked(lockKey, async () => {
      const mealKey = `${dayKey}:${mealIndex}`;
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
            unit: i.unit === 'count' ? 'count' : 'g',
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
          planId: plan?.id,
          day: dayKey,
          mealIndex,
          eatenAt: new Date().toISOString(),
          adherence: value ? 4 : 3,
          mealTitle: meal?.title || t('nutrition.meal.defaultTitle', { index: mealIndex + 1 }),
          items: [{ name: item.name, taken: !!value, qty: item.quantity == null ? null : Number(item.quantity), unit: item.unit === 'count' ? 'count' : 'g' }],
          notifyCoach: false,
          extraFoods: [],
          supplementsTaken: [],
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
          planId: plan?.id,
          day: dayKey,
          mealIndex,
          eatenAt: new Date().toISOString(),
          adherence: 5,
          mealTitle: mealIndex != null ? activeDay?.meals?.[mealIndex]?.title || t('nutrition.meal.defaultTitle', { index: Number(mealIndex) + 1 }) : t('nutrition.supplements.logTitle'),
          items: [],
          notifyCoach: false,
          extraFoods: [],
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
        day: dayKey,
        mealIndex,
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
    <div data-plain-page="1" className='report-phone mx-auto w-full max-w-[440px] bg-white pt-1 dark:bg-[#0b1220]'>
      <div className='rounded-3xl text-white shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]'>
        <div
          className='relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-b-[rgba(15,34,128,0.45)] pb-2'
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), var(--color-gradient-via))' }}
        >
          <div className='pointer-events-none absolute -top-10 -start-20 h-[280px] w-[280px] rounded-full bg-white/[0.06]' />
          <div className='pointer-events-none absolute -bottom-10 -end-16 h-[200px] w-[200px] rounded-full bg-white/[0.04]' />
          <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30' />

          <div className='relative'>
            <div className='flex items-center gap-3 px-4 pb-2 pt-4'>
              <div className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-b-[rgba(15,48,120,0.35)] border-e-[rgba(15,48,120,0.25)] bg-white/15 shadow-[2px_3px_6px_rgba(15,23,42,0.35)]'>
                <Salad size={20} strokeWidth={2} />
              </div>
              <div className='min-w-0 flex-1'>
                <h1 className='truncate text-xl font-black leading-6 tracking-[-0.3px]'>{nav('myNutrition')}</h1>
                <p className='mt-0.5 truncate text-[10px] font-medium text-white/55'>
                  {takenMeals > 0
                    ? `${takenMeals}/${stats.meals} ${t('nutrition.meal.mealsCompleted')}`
                    : `${stats.kcal} ${t('nutrition.units.kcalShort')}`}
                </p>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                {hasNotes ? (
                  <button type='button' onClick={() => setNotesOpen(true)} className={headerBtn} aria-label={t('nutrition.header.notes')}>
                    <BookOpen size={18} strokeWidth={2} />
                  </button>
                ) : null}
                <button type='button' onClick={() => setHistoryOpen(true)} className={headerBtn} aria-label={t('nutrition.header.history')}>
                  <History size={18} strokeWidth={2} />
                </button>
                <button type='button' onClick={() => setGuideOpen(true)} className={headerBtn} aria-label={t('guide.buttonLabel')}>
                  <BookMarked size={18} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className='mx-4 mb-3 h-px bg-white/20' />

            <div className='mb-3 flex gap-1.5 px-4'>
              <HeaderStatPill label={t('nutrition.header.dailyTarget')} value={user?.caloriesTarget ?? 0} icon={Target} />
              <HeaderStatPill label={t('nutrition.header.todayCalories')} value={stats?.kcal ?? 0} icon={Flame} />
              <HeaderStatPill label={t('nutrition.header.mealsSelectedDay')} value={stats?.meals ?? 0} icon={Utensils} />
            </div>

            <div className='flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide'>
              {fiveDayTabs.map(tab => {
                const on = tab.key === String(activeDayKey || '').toLowerCase();
                return (
                  <button
                    key={tab.key}
                    type='button'
                    onClick={() => setActiveDayKey(tab.key)}
                    aria-pressed={on}
                    className={`flex h-[58px] min-w-14 shrink-0 flex-col items-center justify-center rounded-2xl px-2 transition active:scale-95 ${on ? 'scale-[1.02] bg-white text-[var(--color-primary-700)] shadow-[4px_5px_10px_rgba(15,23,42,0.18)]' : 'border border-white/30 bg-white/15 text-white/80'}`}
                  >
                    <span className={`max-w-full truncate text-[10px] font-bold uppercase tracking-wide ${on ? 'text-[var(--color-primary-700)]' : 'text-white/70'}`}>{tab.label}</span>
                    <span className={`text-lg font-black tabular-nums leading-[22px] ${on ? 'text-[var(--color-primary-800)]' : 'text-white'}`}>{tab.date ?? '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className='pt-3'>{loading ? <SkeletonPanel /> : !plan || !activeDay ? <NotFoundPanel onRefresh={refresh} /> : <DayPanel day={activeDay} itemTakenMap={itemTakenMap} suppTakenMap={suppTakenMap} setMealTaken={setMealTaken} setItemTaken={setItemTaken} setSupplementTaken={setSupplementTaken} onInlineSave={saveInlineMeal} />}</div>
      <NutritionGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Notes Modal */}
      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title={t('nutrition.notes.modalTitle')}>
        {hasNotes ? (
          <div className='rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-inner'>
            <MultiLangText className='whitespace-pre-wrap text-[13px] md: leading-6 text-slate-900'>{plan.notes}</MultiLangText>
          </div>
        ) : (
          <div className='text-sm text-slate-600'>—</div>
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
    <div className='space-y-3'>
      {[0, 1, 2].map(i => (
        <div key={i} className='overflow-hidden rounded-3xl border border-white/80 bg-[#f2f6fc] shadow-[5px_6px_14px_rgba(100,116,139,0.18)]'>
          <div className='h-[5px] w-2/3 bg-[var(--color-primary-200)]' />
          <div className='flex items-center gap-2 p-4'>
            <div className='h-11 w-11 rounded-2xl bg-[var(--color-primary-100)]' />
            <div className='min-w-0 flex-1 space-y-2'>
              <div className='h-4 w-28 rounded-full bg-slate-200' />
              <div className='h-3 w-36 rounded-full bg-slate-100' />
            </div>
            <div className='h-8 w-24 rounded-full bg-[var(--color-primary-200)]' />
          </div>
          <div className='space-y-1 px-4 pb-4'>
            <div className='h-10 rounded-2xl bg-[#e8eef8]' />
            <div className='h-10 rounded-2xl bg-[#e8eef8]' />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotFoundPanel({ onRefresh }) {
  const t = useTranslations('my-nutrition');
  return (
    <div className='p-6 md:p-8'>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className='mx-auto max-w-xl text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-secondary-500)]'>
          <Inbox className='h-8 w-8 text-white' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-900'>{t('nutrition.notFound.title')}</h3>
        <p className='mt-2 text-sm text-slate-600'>{t('nutrition.notFound.description')}</p>
        <div className='mt-6 flex items-center justify-center'>
          <BasicButton labelKey='nutrition.notFound.refresh' variant='primary' onClick={onRefresh} />
        </div>
      </motion.div>
    </div>
  );
}

/* =========================================================================
	 FOOD ITEM ROW
	 ========================================================================= */
function FoodItemRow({ it, checked, onToggle, qtyLabel, t }) {
  const [recipeDetailOpen, setRecipeDetailOpen] = useState(false);

  return (
    <>
      <motion.div
        role='checkbox'
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onToggle();
          }
        }}
        onClick={onToggle}
        whileTap={{ scale: 0.985 }}
        className={['flex w-full cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-start select-none', checked ? 'border-emerald-300/40 bg-emerald-50' : 'border-[rgba(100,116,139,0.18)] bg-[#e8eef8]'].join(' ')}>
        <span className='grid h-[22px] w-[22px] shrink-0 place-items-center'>
          {checked ? (
            <span className='grid h-[22px] w-[22px] place-items-center rounded-full bg-emerald-500 text-white shadow-[2px_2px_5px_rgba(16,185,129,0.45)]'>
              <Check size={12} strokeWidth={3} />
            </span>
          ) : (
            <span className='grid h-[22px] w-[22px] place-items-center rounded-full border border-white/80 bg-[#f2f6fc] shadow-[2px_2px_4px_rgba(100,116,139,0.25)]'>
              <Circle size={14} className='text-slate-400' strokeWidth={1.5} />
            </span>
          )}
        </span>
        <span className={['min-w-0 flex-1 truncate text-[13px] font-bold leading-[18px]', checked ? 'text-slate-400 line-through' : 'text-slate-800'].join(' ')}>{it.name}</span>
        <span className='flex shrink-0 items-center gap-1'>
          {qtyLabel ? <span className={['rounded-full bg-[#f2f6fc] px-2 py-0.5 text-[10px] font-bold shadow-sm', checked ? 'text-emerald-600' : 'text-[var(--color-primary-700)]'].join(' ')}>{qtyLabel}</span> : null}
          {it?.calories != null ? (
            <span className='inline-flex items-center gap-0.5 rounded-full bg-[var(--color-primary-500)] px-1.5 py-0.5 text-[10px] font-bold text-white'>
              <Flame size={10} strokeWidth={2.5} />
              {Number(it.calories || 0)}
            </span>
          ) : null}
          {it.itemType === 'recipe' && it.recipe ? (
            <button
              type='button'
              onClick={e => {
                e.stopPropagation();
                setRecipeDetailOpen(true);
              }}
              className='grid h-6 w-6 place-items-center rounded-full bg-white text-[var(--color-primary-700)] shadow-sm'
              aria-label={t('nutrition.showRecipeDetails')}>
              <Eye size={13} />
            </button>
          ) : null}
        </span>
      </motion.div>

          <AnimatePresence>
            {((Array.isArray(it.alternatives) && it.alternatives.length > 0) || (it.alternativeName != null && String(it.alternativeName || '').trim())) && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 5 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.2 }} className='overflow-hidden'>
                <div className='space-y-1'>
                  {(Array.isArray(it.alternatives)
                    ? it.alternatives
                    : [
                        {
                          name: it.alternativeName,
                          quantity: it.alternativeQuantity,
                          unit: it.alternativeUnit,
                          calories: it.alternativeCalories,
                        },
                      ]
                  )
                    .filter(a => String(a?.name || '').trim())
                    .map((alt, i) => (
                      <div key={i} className='flex items-center gap-1.5 flex-wrap'>
                        <span className='inline-flex items-center rounded px-1.5 py-px text-[10px] font-bold tracking-wider uppercase bg-amber-100 border border-amber-200 text-amber-800'>{t('nutrition.alternative', { default: 'Or' })}</span>
                        <span className='text-xs font-medium text-amber-800'>
                          {alt.name}
                          {alt.type === 'recipe' ? ` (${t('nutrition.recipe', { default: 'Recipe' })})` : ''}
                        </span>
                        {(alt.quantity != null || alt.calories != null) && (
                          <span className='text-xs text-amber-700/80'>
                            · {alt.quantity ?? '—'}
                            {alt.unit === 'count' ? ' ' + (t('count') || '') : alt.unit === 'mg' ? 'mg' : 'g'} · {alt.calories ?? '—'} {t('nutrition.units.kcalShort')}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      {recipeDetailOpen && it.recipe && <NutritionRecipeSheet recipe={mapMealItemRecipeToModalRecipe(it.recipe, it.name)} onClose={() => setRecipeDetailOpen(false)} />}
    </>
  );
}

/* =========================================================================
	 DAY PANEL
	 ========================================================================= */
function DayPanel({ day, itemTakenMap, suppTakenMap, setMealTaken, setItemTaken, setSupplementTaken, onInlineSave }) {
  const t = useTranslations('my-nutrition');

  const meals = day?.meals || mapFoodsToMeals(day?.foods || []);
  const daySupps = Array.isArray(day?.supplements) ? day.supplements : [];
  const dayKey = (day.day || '').toLowerCase();

  const [editing, setEditing] = useState({});
  const [suppOpen, setSuppOpen] = useState({});
  const toggleEdit = mi => {
    const key = `${dayKey}:${mi}`;
    setEditing(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatQtyWithUnit = it => {
    if (it?.quantity == null || it?.quantity === '' || Number.isNaN(Number(it.quantity))) return null;
    const qty = Number(it.quantity);
    const unit = it?.unit === 'count' ? 'count' : it?.unit === 'mg' ? 'mg' : 'g';
    const unitLabel = unit === 'g' ? t('gram') || 'g' : unit === 'mg' ? 'mg' : t('count') || t('nutrition.units.count') || 'count';
    return unit === 'g' || unit === 'mg' ? `${qty}${unitLabel}` : `${qty} ${unitLabel}`;
  };

  const timeline = useMemo(() => {
    const toMin = v => {
      if (!v) return 24 * 60 + 1;
      const [h, m = '0'] = String(v).split(':');
      return Number(h) * 60 + Number(m);
    };
    const mealBlocks = (meals || []).map((m, mi) => ({ type: 'meal', time: m.time || '', sortKey: toMin(m.time), key: `meal-${mi}`, meta: { mi, meal: m } }));
    const suppBlocks = (daySupps || []).map((s, si) => ({ type: 'supp', time: s.time || '', sortKey: toMin(s.time), key: `supp-${si}`, meta: { si, supp: s } }));
    return [...mealBlocks, ...suppBlocks].sort((a, b) => a.sortKey - b.sortKey);
  }, [meals, daySupps]);

  return (
    <div className='space-y-3'>
      <AnimatePresence mode='popLayout'>
        {timeline.map((block, idx) => {
          const time12 = block.time ? formatTime12(block.time) : '—';

          if (block.type === 'meal') {
            const { mi, meal } = block.meta;
            const mealKey = `${dayKey}:${mi}`;
            const mealCals = (meal.items || []).reduce((a, it) => a + Number(it.calories || 0), 0);
            const editKey = mealKey;
            const isEditing = !!editing[editKey];
            const itemCount = (meal.items || []).length;
            const takenItems = (meal.items || []).filter(it => itemTakenMap[kItemByName(dayKey, mi, it.name)]).length;
            const progress = itemCount > 0 ? takenItems / itemCount : 0;
            const allDone = itemCount > 0 && takenItems === itemCount;
            const suppsOpen = suppOpen[mealKey] !== false;

            return (
              <motion.div key={block.key} layout className={['overflow-hidden rounded-3xl border bg-[#f2f6fc] shadow-[5px_6px_14px_rgba(100,116,139,0.28)]', allDone ? 'border-emerald-300/40' : 'border-white/80'].join(' ')}>
                {progress > 0 ? (
                  <div className={allDone ? 'h-[5px] w-full bg-emerald-100' : 'h-[5px] w-full bg-[rgba(37,99,235,0.12)]'}>
                    <div className={allDone ? 'h-full bg-emerald-500' : 'h-full bg-[var(--color-primary-500)]'} style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                ) : null}
                <div className='relative p-4'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex min-w-0 flex-1 items-center gap-2'>
                            <div className={['grid h-11 w-11 shrink-0 place-items-center rounded-2xl border shadow-[3px_3px_8px_rgba(100,116,139,0.22)]', allDone ? 'border-emerald-300/40 bg-[#ecfdf5] text-emerald-500' : 'border-white/80 bg-[#f2f6fc] text-[var(--color-primary-800)]'].join(' ')}>
                              {allDone ? <CheckCircle2 size={22} strokeWidth={2.2} /> : <Utensils size={19} strokeWidth={2} />}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <span className='block truncate text-[15px] font-black leading-5 text-slate-900'>{meal?.title || t('nutrition.meal.title', { index: mi + 1 })}</span>
                              <span className='mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold'>
                                <span className='inline-flex items-center gap-1 text-slate-500'><Clock size={11} strokeWidth={2} />{time12}</span>
                                <span className='text-slate-400'>·</span>
                                <span className='inline-flex items-center gap-1 text-[var(--color-primary-700)]'><Flame size={11} strokeWidth={2.5} />{mealCals} {t('nutrition.units.kcalShort')}</span>
                              </span>
                            </div>
                          </div>
                          {!isEditing && (
                            <button type='button' onClick={() => setMealTaken(dayKey, mi, meal, !allDone)} aria-pressed={allDone} className={['inline-flex shrink-0 items-center gap-[5px] rounded-full border border-white/30 px-3 py-[7px] text-[11px] font-bold text-white shadow-[2px_3px_6px_rgba(15,23,42,0.25)]', allDone ? 'bg-emerald-500' : 'bg-[var(--color-primary-500)]'].join(' ')}>
                              {allDone ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <ListChecks size={13} strokeWidth={2} />}
                              <span>{allDone ? t('nutrition.meal.allMarked') : t('nutrition.meal.markAll')}</span>
                            </button>
                          )}
                        </div>

                        {/* ── Food items ── */}
                        {!isEditing && !!meal.items?.length && (
                          <div className='mt-2 flex flex-col gap-1'>
                            {(meal.items || []).map((it, i) => {
                              const id = it?.id || `${it?.name}-${i}`;
                              const checked = !!itemTakenMap[kItemByName(dayKey, mi, it.name)];
                              return (
                                <motion.div key={id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.25 }}>
                                  <FoodItemRow it={it} checked={checked} onToggle={() => setItemTaken(dayKey, mi, it, !checked)} qtyLabel={formatQtyWithUnit(it)} t={t} />
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {/* ── Edit mode ── */}
                        {isEditing && (
                          <div className='mt-4'>
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
                          <div className='mt-3'>
                            <button type='button' onClick={() => setSuppOpen(prev => ({ ...prev, [mealKey]: !suppsOpen }))} className='mb-2 flex w-full items-center justify-between text-[11px] font-bold text-slate-500'>
                              <span className='inline-flex items-center gap-2'>
                                <Pill size={12} className='text-emerald-500' strokeWidth={2} />
                                {t('nutrition.supplements.title')} · {meal.supplements.length}
                              </span>
                              {suppsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {suppsOpen ? (
                              <div className='flex flex-col'>
                                {meal.supplements.map((s, si) => {
                                  const key = kSuppByName(dayKey, 'meal', mi, s.name);
                                  const taken = !!suppTakenMap[key];
                                  const toggle = () => setSupplementTaken(dayKey, 'meal', `${mi}-${s.id || si}`, s, !taken, mi);
                                  return (
                                    <button
                                      key={s.id || si}
                                      type='button'
                                      onClick={toggle}
                                      className={['mb-1.5 flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-start', taken ? 'border-emerald-300/40 bg-[#ecfdf5]' : 'border-[rgba(100,116,139,0.18)] bg-[#e8eef8]'].join(' ')}>
                                      <span className='grid h-[30px] w-[30px] shrink-0 place-items-center rounded-xl border border-white/80 bg-[#f2f6fc] text-emerald-500 shadow-[2px_2px_5px_rgba(100,116,139,0.22)]'>
                                        <Pill size={14} strokeWidth={2} />
                                      </span>
                                      <span className='min-w-0 flex-1'>
                                        <span className={['block truncate text-xs font-bold leading-4', taken ? 'text-emerald-600' : 'text-slate-800'].join(' ')}>{s.name}</span>
                                        {(s.time || s.timing) && (
                                          <span className='mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600'>
                                            <Clock size={9} strokeWidth={2} />
                                            {[s.time && formatTime12(s.time), s.timing].filter(Boolean).join(' · ')}
                                          </span>
                                        )}
                                      </span>
                                      {taken ? (
                                        <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white'>
                                          <Check size={9} strokeWidth={3} />
                                          {t('nutrition.supplements.takenShort')}
                                        </span>
                                      ) : (
                                        <span className='grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/80 bg-[#f2f6fc] shadow-sm'>
                                          <Circle size={10} className='text-slate-400' strokeWidth={1.5} />
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        )}
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
              <motion.div key={block.key} layout className={['rounded-3xl border bg-[#f2f6fc] p-4 shadow-[5px_6px_14px_rgba(100,116,139,0.28)]', taken ? 'border-emerald-300/40' : 'border-white/80'].join(' ')}>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex min-w-0 flex-1 items-center gap-3'>
                    <span className='grid h-[42px] w-[42px] shrink-0 place-items-center rounded-2xl border border-white/80 bg-[#f2f6fc] text-emerald-500 shadow-[3px_3px_8px_rgba(100,116,139,0.22)]'>
                      <Pill size={18} strokeWidth={2} />
                    </span>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-bold text-slate-900'>{supp.name}</div>
                      <div className='mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600'>
                        <Clock size={10} strokeWidth={2} />
                        <span>
                          {time12}
                          {supp.timing ? ` · ${supp.timing}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button type='button' onClick={toggle} className={['inline-flex shrink-0 items-center gap-[5px] rounded-2xl border px-3 py-2 text-[11px] font-bold', taken ? 'border-white/30 bg-emerald-500 text-white shadow-[2px_3px_6px_rgba(16,185,129,0.4)]' : 'border-white/80 bg-[#f2f6fc] text-emerald-600 shadow-[2px_3px_6px_rgba(100,116,139,0.22)]'].join(' ')}>
                    {taken ? <Check size={13} strokeWidth={3} /> : <Circle size={13} strokeWidth={2} />}
                    {taken ? t('nutrition.supplements.takenShort') : t('nutrition.supplements.markTakenShort')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
        unit: yup.string().oneOf(['g', 'count']).default('g'),
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
  const locale = useLocale();
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
        unit: i.unit === 'count' ? 'count' : 'g',
        quantity: i.quantity != null ? Number(i.quantity) : null,
        calories: i.calories != null ? Number(i.calories) : null,
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <form
      onSubmit={handleSubmit(async vals => {
        await onSave?.(vals.items);
      })}
      className='mt-4 space-y-3 rounded-lg border-2 border-[var(--color-primary-200)] p-4 shadow-inner bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)]'>
      {!fields.length ? (
        <div className='rounded-lg border border-slate-200 p-4 text-sm text-slate-600 bg-white shadow-sm'>{t('nutrition.inline.noItems')}</div>
      ) : (
        <div className='space-y-2.5'>
          {fields.map((f, idx) => (
            <div key={f.id || idx} className='grid grid-cols-1 md:grid-cols-[1.2fr_.7fr_.6fr_.55fr_auto] gap-2.5 border border-slate-200 rounded-lg p-3 bg-white shadow-sm'>
              <Controller name={`items.${idx}.name`} control={control} render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.namePlaceholder')} value={field.value} onChange={field.onChange} error={fieldState?.error?.message} />} />
              <Controller name={`items.${idx}.quantity`} control={control} render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.quantityPlaceholder')} type='number' value={field.value ?? ''} onChange={v => field.onChange(v === '' ? '' : Number(v))} error={fieldState?.error?.message} />} />
              <Controller name={`items.${idx}.calories`} control={control} render={({ field, fieldState }) => <Input placeholder={t('nutrition.inline.caloriesPlaceholder')} type='number' value={field.value ?? ''} onChange={v => field.onChange(v === '' ? '' : Number(v))} error={fieldState?.error?.message} />} />
              <Controller
                name={`items.${idx}.unit`}
                control={control}
                render={({ field }) => (
                  <FloatingSelect
                    label={locale === 'ar' ? 'الوحدة' : 'Unit'}
                    value={field.value || 'g'}
                    onChange={field.onChange}
                    options={[
                      { id: 'g', label: 'g' },
                      { id: 'mg', label: 'mg' },
                      { id: 'count', label: t('nutrition.units.count') },
                    ]}
                  />
                )}
              />
              <button type='button' onClick={() => remove(idx)} className='rounded-lg border border-slate-300 px-3 text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600 h-9 font-medium transition-colors'>
                {t('nutrition.inline.remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='flex flex-col md:flex-row items-center justify-between gap-3 pt-2'>
        <button type='button' onClick={() => append({ name: '', unit: 'g', quantity: null, calories: null })} className='inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors'>
          <Plus className='h-4 w-4' /> {t('nutrition.inline.addItem')}
        </button>
        <div className='flex items-center gap-2.5'>
          <BasicButton labelKey='common.cancel' variant='neutral' onClick={onCancel} />
          <BasicButton labelKey='common.save' variant='primary' submit loading={isSubmitting} />
        </div>
      </div>
    </form>
  );
}

/* =========================================================================
	 HELPERS
	 ========================================================================= */
function deriveTakenMapsFromHistory(plan, history) {
  const mealMap = {},
    itemMap = {},
    suppMap = {};
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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

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
        itemType: f.itemType === 'recipe' ? 'recipe' : 'food',
        sourceId: f.sourceId ?? null,
        recipe: f.recipe ?? null,
        quantity: Number.isFinite(Number(f.quantity)) ? Number(f.quantity) : null,
        calories: Number.isFinite(Number(f.calories)) ? Number(f.calories) : null,
        unit: f.unit === 'mg' ? 'mg' : f.unit === 'count' ? 'count' : 'g',
        alternatives: Array.isArray(f.alternatives) ? f.alternatives : [],
        alternativeName: f.alternativeName ?? null,
        alternativeQuantity: f.alternativeQuantity ?? null,
        alternativeUnit: f.alternativeUnit ?? null,
        alternativeCalories: f.alternativeCalories ?? null,
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
