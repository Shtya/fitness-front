'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UtensilsCrossed, Clock, History, Send, Plus, Target, Calendar, TrendingUp, StickyNote, Pill, Inbox, PencilLine, Check, CheckCircle, CircleCheck } from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';

import api from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import { Input } from '@/components/atoms/Input2';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Notification } from '@/config/Notification';
import HistoryViewer from '@/components/pages/dashboard/nutrition/HistoryViewer';

/* =========================================================================
   SMALL UI PRIMITIVES (IN-FILE)
   ========================================================================= */
function BasicButton({ label, onClick, icon: Icon, variant = 'outline', submit = false, loading = false }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium h-9 px-3 transition active:scale-95';
  const theme = variant === 'primary' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700' : variant === 'warning' ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' : variant === 'neutral' ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
  return (
    <button type={submit ? 'submit' : 'button'} onClick={onClick} disabled={loading} className={`${base} ${theme} disabled:opacity-60`}>
      {Icon ? <Icon className='h-4 w-4' /> : null}
      <span>{loading ? '...' : label}</span>
    </button>
  );
}

/** Minimal checkbox visual; no events so the outer container is the single toggle source */
function MiniCheck({ checked, tone = 'indigo', className = '' }) {
  const on = tone === 'emerald' ? 'bg-emerald-600 border-emerald-600' : 'bg-indigo-600 border-indigo-600';
  return (
    <span aria-hidden='true' className={[' flex-none relative inline-flex h-4 w-4 items-center justify-center rounded border transition-all pointer-events-none', checked ? on : 'bg-white border-slate-300', className].join(' ')}>
      {checked ? (
        <svg className='h-3 w-3 text-white' viewBox='0 0 20 20' fill='currentColor'>
          <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z' clipRule='evenodd' />
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

  const [activeDayKey, setActiveDayKey] = useState(null); // 'saturday'...'friday'
  const [history, setHistory] = useState([]); // only for the selected date
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // UI state (hydrated from *selected date* history)
  const [takenMap, setTakenMap] = useState({}); // meal-level: "day:mi" -> bool
  const [itemTakenMap, setItemTakenMap] = useState({}); // item-level: "day:mi:itemKey" -> bool
  const [suppTakenMap, setSuppTakenMap] = useState({}); // supplement: name-scoped key

  const [selectedDateISO, setSelectedDateISO] = useState(null); // 'YYYY-MM-DD' for the active tab

  // ---- simple per-action lock to avoid duplicate API posts (StrictMode / double click)
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

  // ---- fetch plan once
  const fetchPlan = useCallback(async () => {
    const planRes = await api
      .get('/nutrition/my/meal-plan')
      .then(r => r?.data || null)
      .catch(() => null);

    setPlan(planRes);

    // choose initial tab
    if (planRes?.days?.length) {
      const todayKey = weekdayKeySaturdayFirst(new Date()); // 'sunday'...'saturday'
      const hasToday = (planRes.days || []).some(d => (d.day || '').toLowerCase() === todayKey);
      const initialDay = hasToday ? todayKey : planRes.days?.[0]?.day || null;
      setActiveDayKey(initialDay);
      // selected date for initial tab
      const dateISO = dateForDayKeyInCurrentWeek(initialDay, new Date());
      setSelectedDateISO(dateISO);
    } else {
      setActiveDayKey(null);
      setSelectedDateISO(null);
    }
  }, []);

  // ---- fetch logs for a specific date (YYYY-MM-DD)
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

        // Hydrate from *this date's* logs
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

  // Initial load: plan first
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

  // When activeDayKey changes, compute date (current week, Saturday-start) and fetch logs
  useEffect(() => {
    if (!activeDayKey || !plan) return;
    const dateISO = dateForDayKeyInCurrentWeek(activeDayKey, new Date());
    setSelectedDateISO(dateISO);
    fetchLogsForDate(dateISO, activeDayKey, plan);
  }, [activeDayKey, plan, fetchLogsForDate]);

  // Manual refresh
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
  const activeDay = useMemo(() => (plan?.days?.length ? days.find(d => (d.day || '').toLowerCase() === (activeDayKey || '').toLowerCase()) || null : null), [days, activeDayKey, plan]);

  const stats = useMemo(() => {
    if (!activeDay) return { meals: 0, kcal: 0, adherenceAvg: 0, streak: 0 };
    const meals = (activeDay?.meals || []).length;
    const kcal = sumCaloriesDay(activeDay?.meals || []);
    const recent = history.slice(0, 20);
    const adhAvg = recent.length ? Math.round((recent.reduce((a, c) => a + Number(c.adherence || 0), 0) / recent.length) * 10) / 10 : 0;
    const streak = computeStreak(history);
    return { meals, kcal, adherenceAvg: adhAvg, streak };
  }, [activeDay, history]);

  const kMeal = (dayKey, mi) => `${dayKey}:${mi}`;

  // === Mark entire meal done/undone (persist + set all item checkboxes)
  const setMealTaken = async (dayKey, mealIndex, meal, value) => {
    const lockKey = `meal:${dayKey}:${mealIndex}`;
    await runLocked(lockKey, async () => {
      const mealKey = kMeal(dayKey, mealIndex);
      try {
        // optimistic meal toggle
        setTakenMap(prev => ({ ...prev, [mealKey]: value }));

        // optimistic all items
        const optimisticItemKeys = (meal.items || []).map(i => kItemByName(dayKey, mealIndex, i.name));
        setItemTakenMap(prev => {
          const next = { ...prev };
          optimisticItemKeys.forEach(k => (next[k] = value));
          return next;
        });

        // persist
        await api.post('/nutrition/food-logs', {
          planId: plan?.id,
          day: dayKey,
          mealIndex,
          eatenAt: new Date().toISOString(),
          adherence: value ? 5 : 3,
          mealTitle: meal?.title || `Meal ${mealIndex + 1}`,
          items: (meal.items || []).map(i => ({
            name: i.name,
            taken: !!value,
            qty: i.quantity == null ? null : Number(i.quantity),
          })),
          notifyCoach: false,
          extraFoods: [],
          supplementsTaken: [],
        });
      } catch (e) {
        // revert
        setTakenMap(prev => ({ ...prev, [mealKey]: !value }));
        setItemTakenMap(prev => {
          const next = { ...prev };
          (meal.items || []).forEach(i => {
            const key = kItemByName(dayKey, mealIndex, i.name);
            next[key] = !value;
          });
          return next;
        });
        Notification(e?.response?.data?.message || 'Failed to log meal', 'error');
      }
    });
  };

  // === Single item toggle
  const setItemTaken = async (dayKey, mealIndex, item, value) => {
    const lockKey = `item:${dayKey}:${mealIndex}:${normName(item.name)}`;
    await runLocked(lockKey, async () => {
      const key = kItemByName(dayKey, mealIndex, item.name);
      try {
        setItemTakenMap(prev => ({ ...prev, [key]: value }));

        await api.post('/nutrition/food-logs', {
          planId: plan?.id,
          day: dayKey,
          mealIndex,
          eatenAt: new Date().toISOString(),
          adherence: value ? 4 : 3,
          mealTitle: activeDay?.meals?.[mealIndex]?.title || `Meal ${mealIndex + 1}`,
          items: [{ name: item.name, taken: !!value, qty: item.quantity == null ? null : Number(item.quantity) }],
          notifyCoach: false,
          extraFoods: [],
          supplementsTaken: [],
        });

        // sync meal-level toggle based on all item states
        if (!value) {
          setTakenMap(prev => ({ ...prev, [kMeal(dayKey, mealIndex)]: false }));
        } else {
          const meal = activeDay?.meals?.[mealIndex];
          if (meal?.items?.length) {
            const allTrue = meal.items.every(i => {
              const k = kItemByName(dayKey, mealIndex, i.name);
              return k === key ? value : !!itemTakenMap[k];
            });
            setTakenMap(prev => ({ ...prev, [kMeal(dayKey, mealIndex)]: allTrue }));
          }
        }
      } catch (e) {
        setItemTakenMap(prev => ({ ...prev, [key]: !value })); // revert
        Notification(e?.response?.data?.message || 'Failed to update item', 'error');
      }
    });
  };

  // === Supplements toggle (name-based)
  const setSupplementTaken = async (dayKey, scope, idOrIndex, supp, value, mealIndex = null) => {
    const localKey = kSuppByName(dayKey, scope, mealIndex, supp.name);
    const lockKey = `supp:${localKey}`;
    await runLocked(lockKey, async () => {
      try {
        setSuppTakenMap(prev => ({ ...prev, [localKey]: value }));
        await api.post('/nutrition/food-logs', {
          planId: plan?.id,
          day: dayKey,
          mealIndex, // null for day-level
          eatenAt: new Date().toISOString(),
          adherence: 5,
          mealTitle: mealIndex != null ? activeDay?.meals?.[mealIndex]?.title || `Meal ${Number(mealIndex) + 1}` : 'Supplements',
          items: [],
          notifyCoach: false,
          extraFoods: [],
          supplementsTaken: [{ name: supp.name, taken: !!value }], // server persists by name
        });
      } catch (e) {
        setSuppTakenMap(prev => ({ ...prev, [localKey]: !value }));
        Notification(e?.response?.data?.message || 'Failed to update supplement', 'error');
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
          calories: i.calories == null || i.calories === '' ? null : Number(i.calories),
        })),
      });
      refresh();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Failed to save changes', 'error');
    }
  };

  return (
    <div className='space-y-6 max-md:space-y-2 '>
      {/* Header */}
      <div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
        <div className='absolute inset-0 overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
          <div
            className='absolute inset-0 opacity-15'
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              backgroundPosition: '-1px -1px',
            }}
          />
          <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
        </div>

        <div className='relative py-2 p-3 md:p-5 text-white'>
          <div className='flex flex-row items-center justify-between gap-3'>
            <div>
              <h1 className='text-xl md:text-4xl font-semibold'>{plan?.name || 'My Nutrition Plan'}</h1>
              <p className='text-white/85 mt-1 max-md:hidden'>{plan?.desc || 'Quick log meals, view history, and send suggestions to your coach.'}</p>
            </div>

            <div className='flex items-center gap-2'>
              {/* <button onClick={() => setHistoryOpen(true)} className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'>
                <History size={16} />
                <span className='max-md:hidden'>History</span>
              </button> */}

              {hasNotes && (
                <button onClick={() => setNotesOpen(true)} className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'>
                  <StickyNote size={16} />
                  <span className='max-md:hidden'>Notes</span>
                </button>
              )}
            </div>
          </div>

          <div className='grid grid-cols-4 gap-2 max-md:hidden mt-4'>
            <StatCard icon={Target} title='Today Calories' value={`${stats?.kcal || 0}`} />
            <StatCard icon={TrendingUp} title='Meals (Selected Day)' value={stats?.meals} />
            <StatCard icon={Calendar} title='Adherence (day logs)' value={stats?.adherenceAvg || 0} />
            <StatCard icon={History} title='Streak (days)' value={stats?.streak} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='mt-1 md:mt-4 flex items-center justify-between'>
        <TabsPill className='bg-white' tabs={tabs} active={(activeDayKey || '').toLowerCase()} onChange={key => setActiveDayKey(key)} />
      </div>

      {/* Notes */}
      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title='Coach Notes'>
        {hasNotes ? (
          <div className='rounded-lg border border-slate-200 bg-amber-50 p-3'>
            <MultiLangText className='whitespace-pre-wrap text-[13px] leading-6 text-slate-900'>{plan.notes}</MultiLangText>
          </div>
        ) : (
          <div className='text-sm text-slate-600'>—</div>
        )}
      </Modal>

      {/* Content */}
      <div className='md:bg-white md:p-6 overflow-hidden'>{loading ? <SkeletonPanel /> : !plan || !activeDay ? <NotFoundPanel onRefresh={refresh} /> : <DayPanel day={activeDay} takenMap={takenMap} itemTakenMap={itemTakenMap} suppTakenMap={suppTakenMap} setMealTaken={setMealTaken} setItemTaken={setItemTaken} setSupplementTaken={setSupplementTaken} onInlineSave={saveInlineMeal} />}</div>

      {/* History modal */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title='Eating History'>
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
    <div className='p-4 space-y-4'>
      <div className='h-6 w-44 rounded bg-slate-200 animate-pulse' />
      <div className='h-10 w-full rounded bg-slate-100 animate-pulse' />
      <div className='h-28 w-full rounded bg-slate-100 animate-pulse' />
    </div>
  );
}

function NotFoundPanel({ onRefresh }) {
  return (
    <div className='p-8'>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className='mx-auto max-w-xl text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200'>
          <Inbox className='h-6 w-6 text-slate-400' />
        </div>
        <h3 className='mt-3 text-lg font-semibold text-slate-900'>Not found</h3>
        <p className='mt-1 text-sm text-slate-600'>No active meal plan is available for your account.</p>
        <div className='mt-4 flex items-center justify-center'>
          <BasicButton label='Refresh' variant='outline' onClick={onRefresh} />
        </div>
      </motion.div>
    </div>
  );
}

function DayPanel({ day, takenMap, itemTakenMap, suppTakenMap, setMealTaken, setItemTaken, setSupplementTaken, onInlineSave }) {
  const meals = day?.meals || mapFoodsToMeals(day?.foods || []);
  const daySupps = Array.isArray(day?.supplements) ? day.supplements : [];
  const dayKey = (day.day || '').toLowerCase();

  const [editing, setEditing] = useState({});
  const toggleEdit = mi => {
    const key = `${dayKey}:${mi}`;
    setEditing(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const timeline = useMemo(() => {
    const toMin = t => {
      if (!t) return 24 * 60 + 1;
      const [h, m = '0'] = String(t).split(':');
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
    <div className='relative'>
      <div className='hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2' aria-hidden='true' />
      <div className='space-y-6'>
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
              <motion.div key={block.key} className='relative md:grid md:grid-cols-2' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                {/* timeline marker / time (desktop) */}
                <div className={`hidden md:block ${isLeft ? 'order-1 pr-6' : 'order-2 pl-6'} relative`}>
                  {!isLeft && <span className='absolute -left-[7px] top-3 h-3.5 w-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100' />}
                  {isLeft && <span className='absolute -right-[7px] top-3 h-3.5 w-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100' />}
                  <span className={`flex flex-col gap-1 absolute top-[9px] text-[11px] text-slate-500 whitespace-nowrap ${isLeft ? 'right-[40px] translate-x-6' : 'left-[40px] -translate-x-6'}`}>
                    <span className='text-sm font-[600] items-center gap-1'>{time12}</span>
                  </span>
                </div>

                {/* mobile bullet/time */}
                <div className='md:hidden relative flex items-center gap-2 px-2 py-1.5 '>
                  <span className='relative flex h-3.5 w-3.5'>
                    <span className='absolute inline-flex h-full w-full rounded-full bg-indigo-600 opacity-75 animate-ping'></span>
                    <span className='relative inline-flex h-3.5 w-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100'></span>
                  </span>
                  <span className='inline-flex items-center gap-1 text-[11px] font-medium text-slate-600'>
                    <Clock size={12} className='text-indigo-500' />
                    {time12}
                  </span>
                </div>

                {/* card */}
                <div className={`${isLeft ? 'md:order-2 md:pl-6' : 'md:order-1 md:pr-6'}`}>
                  <div className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow transition-shadow'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0 w-full'>
                        <div className='flex justify-between gap-2'>
                          {/* TOP: Meal info */}
                          <div className='flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900'>
                            <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200'>
                              <UtensilsCrossed size={14} />
                            </span>
                            <span className='truncate'>{`Meal ${idx + 1}`}</span>
                            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-[12px] text-slate-600'>{mealCals} kcal</span>
                          </div>

                          {/* Actions */}
                          <div className='flex flex-wrap items-center gap-2'>
                            {/* Edit / Close */}
                            {/* <button onClick={() => toggleEdit(mi)} title={isEditing ? 'Close editor' : 'Edit items'} className={['inline-flex h-[34px] items-center gap-1 rounded-md px-3 text-xs font-medium shadow-sm ring-1 ring-inset transition', 'focus-visible:outline-none focus-visible:ring-2', isEditing ? 'bg-rose-600 text-white ring-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300/40' : 'bg-indigo-600 text-white ring-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-300/40'].join(' ')}>
                              <PencilLine size={12} />
                              {isEditing ? 'Close' : 'Edit'}
                            </button> */}

                            {/* Mark done / undo (indigo theme) */}
                            {!isEditing && (
                              <button type='button' onClick={() => setMealTaken(dayKey, mi, meal, !mealTaken)} aria-pressed={mealTaken} className={['inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40', mealTaken ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'].join(' ')}>
                                {mealTaken ? <CheckCircle className='flex-none text-white' size={16} /> : <CircleCheck className='flex-none text-indigo-500' size={16} />}
                                {mealTaken ? 'Done' : 'Mark all done'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* VIEW MODE (chips with per-item check) */}
                        {!isEditing && !!meal.items?.length && (
                          <div className='mt-2 flex flex-col gap-1.5'>
                            {(meal.items || []).map((it, i) => {
                              const id = it?.id || `${it?.name}-${i}`;
                              const checked = !!itemTakenMap[kItemByName(dayKey, mi, it.name)];
                              const toggle = () => setItemTaken(dayKey, mi, it, !checked);

                              return (
                                <div
                                  key={id}
                                  role='checkbox'
                                  aria-checked={checked}
                                  tabIndex={0}
                                  onKeyDown={e => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                      e.preventDefault();
                                      toggle();
                                    }
                                  }}
                                  onClick={toggle}
                                  className={['!p-2 group inline-flex items-center gap-2 rounded-lg border text-[12px] transition', 'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60', checked ? 'bg-indigo-50 text-indigo-900 border-indigo-200 ring-1 ring-indigo-300 shadow-[inset_0_0_0_1px_rgba(79,70,229,.25)]' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'].join(' ')}>
                                  <MiniCheck checked={checked} tone='indigo' />
                                  <span className='leading-none flex items-center gap-2'>
                                    <span className={checked ? 'font-semibold' : ''}>
                                      {it.name}
                                      {it.quantity ? ` • ${Number(it.quantity)}g` : ''}
                                      {it.calories ? ` • ${Number(it.calories)} kcal` : ''}
                                    </span>
                                    {checked && <span className='inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-[1px] text-[10px] font-semibold text-indigo-800'>Done</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* EDIT MODE (inline quick editor) */}
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

                        {/* MEAL-LEVEL SUPPLEMENTS (emerald when taken) */}
                        {!!meal.supplements?.length && !isEditing && (
                          <div className='mt-3'>
                            <div className='text-[12px] font-medium text-slate-800 flex items-center gap-1 mb-1'>
                              <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'>
                                <Pill size={14} className='text-emerald-600' />
                              </span>
                              Supplements
                            </div>
                            <div className='flex flex-col gap-1.5'>
                              {meal.supplements.map((s, si) => {
                                // name-based key (scoped per meal)
                                const key = kSuppByName(dayKey, 'meal', mi, s.name);
                                const taken = !!suppTakenMap[key];
                                const toggle = () => setSupplementTaken(dayKey, 'meal', `${mi}-${s.id || si}`, s, !taken, mi);

                                return (
                                  <div
                                    key={s.id || si}
                                    role='checkbox'
                                    aria-checked={taken}
                                    tabIndex={0}
                                    onKeyDown={e => {
                                      if (e.key === ' ' || e.key === 'Enter') {
                                        e.preventDefault();
                                        toggle();
                                      }
                                    }}
                                    onClick={toggle}
                                    className={[' !p-2 !px-3 group inline-flex items-center justify-between gap-3 rounded-lg border text-[12px] transition', 'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60', taken ? 'bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,.25)]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'].join(' ')}>
                                    <div className='min-w-0 text-slate-700 flex-1'>
                                      <div className='flex items-center gap-2'>
                                        <MiniCheck checked={taken} tone='emerald' />
                                        <span className='font-medium text-slate-800 truncate'>
                                          {s.name}
                                          {s.time ? ` • ${formatTime12(s.time)}` : ''}
                                          {s.timing ? ` • ${s.timing}` : ''}
                                          {s.bestWith ? ` • best with: ${s.bestWith}` : ''}
                                        </span>
                                        {taken && <span className='inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-[1px] text-[10px] font-semibold text-emerald-800'>Taken</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }

          // DAY-LEVEL SUPPLEMENT (emerald when taken)
          const { supp } = block.meta;
          const bulletClass = 'h-3.5 w-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100';

          return (
            <motion.div key={block.key} className='relative md:grid md:grid-cols-2' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
              <div className={`hidden md:block ${idx % 2 === 0 ? 'order-1 pr-6' : 'order-2 pl-6'} relative`}>
                {idx % 2 !== 0 && <span className={`absolute -left-[9px] top-3 ${bulletClass}`} />}
                {idx % 2 === 0 && <span className={`absolute -right-[9px] top-3 ${bulletClass}`} />}
                <span className={`absolute top-7 text-[11px] text-slate-500 whitespace-nowrap ${idx % 2 === 0 ? 'right-0 translate-x-6' : 'left-0 -translate-x-6'}`}>
                  <span className='inline-flex items-center gap-1'>
                    <Clock size={12} /> {block.time ? formatTime12(block.time) : '—'}
                  </span>
                </span>
              </div>

              <div className={`${idx % 2 === 0 ? 'md:order-2 md:pl-6' : 'md:order-1 md:pr-6'}`}>
                <div className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow transition-shadow'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='font-semibold text-slate-900 flex items-center gap-2 text-sm'>
                        <Pill size={16} className='text-indigo-600' />
                        <span className='truncate'>{supp.name}</span>
                      </div>
                      <div className='mt-1 text-[12px] text-slate-600'>
                        {supp.bestWith ? (
                          <>
                            Best with: <span className='font-medium text-slate-800'>{supp.bestWith}</span>
                          </>
                        ) : (
                          '—'
                        )}
                        {supp.timing ? <span className='ml-2 text-slate-700'>• {supp.timing}</span> : null}
                      </div>
                    </div>

                    {/* chip */}
                    {(() => {
                      const takenKey = kSuppByName(dayKey, 'day', null, supp.name);
                      const taken = !!suppTakenMap[takenKey];
                      const toggle = () => setSupplementTaken(dayKey, 'day', `${supp.id || block.key}`, supp, !taken, null);
                      return (
                        <div
                          role='checkbox'
                          aria-checked={taken}
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggle();
                            }
                          }}
                          onClick={toggle}
                          className={['block !p-2 !px-3 group inline-flex items-center gap-2 rounded-lg border text-[12px] transition', 'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60', taken ? 'bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,.25)]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'].join(' ')}>
                          <MiniCheck checked={taken} tone='emerald' />
                          <span className='leading-none'>{taken ? 'Taken' : 'Mark taken'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className='md:hidden pl-10 relative'>
                <span className={`absolute left-0 top-3 ${bulletClass}`} />
                <span className='absolute left-0 top-7 text-[11px] text-slate-500 translate-x-5'>
                  <span className='inline-flex items-center gap-1'>
                    <Clock size={12} /> {block.time ? formatTime12(block.time) : '—'}
                  </span>
                </span>
              </div>
            </motion.div>
          );
        })}
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
    <form onSubmit={handleSubmit(submit)} className='mt-3 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2'>
      {!fields.length ? (
        <div className='rounded border border-slate-200 p-3 text-sm text-slate-600 bg-white'>No items. Add some below.</div>
      ) : (
        <div className='space-y-2'>
          {fields.map((f, idx) => (
            <div key={f.id || idx} className='grid grid-cols-1 md:grid-cols-[1.2fr_.7fr_.6fr_auto] gap-2 border border-slate-200 rounded-md p-2 bg-white'>
              <Controller name={`items.${idx}.name`} control={control} render={({ field, fieldState }) => <Input placeholder='Name' value={field.value} onChange={field.onChange} error={fieldState?.error?.message} />} />
              <Controller name={`items.${idx}.quantity`} control={control} render={({ field, fieldState }) => <Input placeholder='Quantity (g)' type='number' value={field.value ?? ''} onChange={v => field.onChange(v === '' ? '' : Number(v))} error={fieldState?.error?.message} />} />
              <Controller name={`items.${idx}.calories`} control={control} render={({ field, fieldState }) => <Input placeholder='Calories' type='number' value={field.value ?? ''} onChange={v => field.onChange(v === '' ? '' : Number(v))} error={fieldState?.error?.message} />} />
              <button type='button' onClick={() => remove(idx)} className='rounded-md border border-slate-200 px-2 text-sm hover:bg-slate-50 h-9'>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-center justify-between'>
        <button type='button' onClick={() => append({ name: '', quantity: null, calories: null })} className='inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50'>
          <Plus className='h-4 w-4' /> Add item
        </button>

        <div className='flex items-center gap-2'>
          <BasicButton label='Cancel' variant='outline' onClick={onCancel} />
          <BasicButton label='Save' variant='primary' submit loading={isSubmitting} />
        </div>
      </div>
    </form>
  );
}

function deriveTakenMapsFromHistory(plan, history) {
  const mealMap = {};
  const itemMap = {};
  const suppMap = {};

  const sorted = [...(history || [])].sort((a, b) => +new Date(a.eatenAt || a.createdAt) - +new Date(b.eatenAt || b.createdAt));

  for (const log of sorted) {
    const dayKey = (log.day || '').toLowerCase();
    const mi = typeof log.mealIndex === 'number' ? log.mealIndex : null;

    // Items -> name-based
    if (Array.isArray(log.items) && mi != null) {
      for (const it of log.items) {
        if (!it?.name) continue;
        itemMap[kItemByName(dayKey, mi, it.name)] = !!it.taken;
      }
    }

    // Supplements -> **name-based** (ignore per-log ids)
    if (Array.isArray(log.supplementsTaken) && log.supplementsTaken.length) {
      const scope = mi != null ? 'meal' : 'day';
      log.supplementsTaken.forEach(s => {
        if (!s?.name) return;
        const key = kSuppByName(dayKey, scope, mi, s.name);
        suppMap[key] = !!s.taken;
      });
    }
  }

  // Recompute mealMap using name-based item states
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

// Format 24h 'HH:mm' -> 'hh:mm AM/PM'
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
// JS getDay(): 0=Sun..6=Sat. We return 'sunday'...'saturday'
function weekdayKeySaturdayFirst(d) {
  const js = d.getDay(); // 0..6
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[js];
}
// Show week in Sat→Fri order in the UI
function normalizeWeekOrder(days = []) {
  const order = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const byKey = {};
  for (const d of days) byKey[(d.day || '').toLowerCase()] = d;
  return order.map(k => byKey[k]).filter(Boolean);
}
function sumCaloriesDay(meals = []) {
  let total = 0;
  (meals || []).forEach(m => (m.items || []).forEach(it => (total += Number(it.calories || 0))));
  return total;
}
// legacy: convert foods[] shape into a single "Meal"
function mapFoodsToMeals(foods = []) {
  if (!foods?.length) return [];
  return [
    {
      title: 'Meal',
      time: '',
      items: foods.map(f => ({
        name: f.name,
        quantity: Number.isFinite(Number(f.quantity)) ? Number(f.quantity) : null,
        calories: Number.isFinite(Number(f.calories)) ? Number(f.calories) : null,
      })),
    },
  ];
}
function computeStreak(history = []) {
  const daysSet = new Set(
    (history || []).map(h => {
      const d = new Date(h.eatenAt || h.createdAt);
      return d.toISOString().slice(0, 10);
    }),
  );
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (daysSet.has(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function normName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
// items name-based key
const kItemByName = (dayKey, mi, name) => `${dayKey}:${mi}:name::${normName(name)}`;
// supplements name-based (meal- or day-level)
const kSuppByName = (dayKey, scope, mealIndexOrNull, name) => {
  const base = `${dayKey}:${scope}:name::${normName(name)}`;
  return scope === 'meal' ? `${base}@${mealIndexOrNull}` : base; // disambiguate per meal
};

function dateForDayKeyInCurrentWeek(dayKey, now = new Date()) {
  const WEEK = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const idx = WEEK.indexOf((dayKey || '').toLowerCase());
  if (idx === -1) return formatLocalDateYYYYMMDD(now);

  // Find start of week (Saturday) relative to 'now'
  // JS: 0=Sun..6=Sat -> distance back to Saturday is (jsDay+1) % 7
  const jsDay = now.getDay(); // 0..6
  const backToSat = (jsDay + 1) % 7;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - backToSat);

  const target = new Date(weekStart);
  target.setDate(weekStart.getDate() + idx);
  return formatLocalDateYYYYMMDD(target);
}

// Format date as local YYYY-MM-DD (no timezone drift)
function formatLocalDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
