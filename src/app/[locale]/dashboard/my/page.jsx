'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Dumbbell,
  Utensils,
  Droplets,
  Calculator,
  History as HistoryIcon,
  Trophy,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  Info,
} from 'lucide-react';

/* ======= STORAGE KEYS (same as your other pages) ======= */
const LS_WORKOUT = 'mw.workout';
const LS_HISTORY = 'mw.history';
const LS_PRS = 'mw.prs';
const LS_SELECTED_DAY = 'mw.selectedDay';

const LS_NUTRITION_STATE = 'mw.nutri.state.v1';
const LS_NUTRITION_UI = 'mw.nutri.ui';

const LS_CALC = 'mw.calorie.calc.v1';

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

/* ======= LITTLE HELPERS ======= */
const spring = { type: 'spring', stiffness: 200, damping: 26 };

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n || 0)));
}
function pctToConic(pct, color = '#4f46e5') {
  // returns style object for a conic progress ring
  return {
    background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(2,6,23,0.08) 0deg)`,
  };
}

/* ======= SHELL / CARD ======= */
function GlassCard({ children, className = '' , glow=false }) {
  return (
    <div
      className={` ${glow && "card-glow"} rounded-3xl border border-white/30 bg-white/60 backdrop-blur-md shadow-[0_10px_30px_rgba(2,6,23,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={18} className="text-slate-700" /> : null}
        <div className="font-semibold text-slate-800">{title}</div>
      </div>
      {action}
    </div>
  );
}

/* ======= PAGE ======= */
export default function HomeDashboardPretty() {
  const [hydrated, setHydrated] = useState(false);

  const [workout, setWorkout] = useState(null);
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState({});
  const [selectedDay, setSelectedDay] = useState('monday');

  const [nutriState, setNutriState] = useState({});
  const [nutriUI, setNutriUI] = useState({ day: 'saturday' });

  const [calc, setCalc] = useState(null);

  useEffect(() => {
    setHydrated(true);
    setWorkout(loadLS(LS_WORKOUT, null));
    setHistory(loadLS(LS_HISTORY, []));
    setPRs(loadLS(LS_PRS, {}));
    setSelectedDay(loadLS(LS_SELECTED_DAY, 'monday'));
    setNutriState(loadLS(LS_NUTRITION_STATE, {}));
    setNutriUI(loadLS(LS_NUTRITION_UI, { day: 'saturday' }));
    setCalc(loadLS(LS_CALC, null));
  }, []);

  /* ---------- Workout derived ---------- */
  const workoutSummary = useMemo(() => {
    if (!workout?.sets?.length || !workout?.exercises?.length)
      return { name: 'Today', total: 0, done: 0, pct: 0, nextEx: null };
    const sets = workout.sets;
    const total = sets.length;
    const done = sets.filter(s => s.done).length;
    const pct = total ? (done / total) * 100 : 0;
    const next = sets.find(s => !s.done);
    const nextEx = next ? workout.exercises.find(e => e.id === next.exId) : null;
    return { name: workout.name || selectedDay, total, done, pct, nextEx };
  }, [workout, selectedDay]);

  /* ---------- Nutrition derived ---------- */
  const nutri = useMemo(() => {
    const day = nutriUI?.day || 'saturday';
    const state = nutriState[day];
    if (!state)
      return {
        day,
        itemsDone: 0,
        itemsTotal: 0,
        pct: 0,
        waterPct: 0,
        supp: { multi: false, omega: false, zinc: false, creatine: false },
      };
    const vals = Object.values(state.items || {});
    const total = vals.length;
    const done = vals.filter(Boolean).length;
    const pct = total ? (done / total) * 100 : 0;
    const waterPct = clampPct(((state.waterMl || 0) / 4000) * 100);
    return {
      day,
      itemsDone: done,
      itemsTotal: total,
      pct,
      waterPct,
      supp: state.supplements || { multi: false, omega: false, zinc: false, creatine: false },
    };
  }, [nutriState, nutriUI]);

  /* ---------- Calorie derived ---------- */
  const targets = useMemo(() => {
    if (!calc) return null;
    return {
      kcal: calc?.target ?? null,
      p: calc?.proteinG ?? null,
      c: calc?.carbsG ?? null,
      f: calc?.fatG ?? null,
      meals: calc?.mealsPerDay ?? 4,
      perMeal: calc?.perMeal?.kcal ?? null,
      tdee: calc?.tdee ?? null,
      bmr: calc?.baseBMR ?? null,
    };
  }, [calc]);

  return (
    <div className="relative">
      {/* BACKDROP GRADIENT */}
      <div
        className="absolute inset-x-0 -top-16 -z-10 h-[320px] md:h-[360px]"
        aria-hidden
        style={{
          background:
            'radial-gradient(1200px 300px at 10% 0%, rgba(79,70,229,0.25), transparent 55%), radial-gradient(1200px 300px at 90% 5%, rgba(16,185,129,0.25), transparent 55%), linear-gradient(180deg, #f8fafc 0%, #ffffff 45%)',
        }}
      />

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mb-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">
              Today at a glance — workout, meals, water, and targets.
            </p>
          </div>

          {/* Quick actions */}
          <div className="hidden md:flex gap-2">
            <CTA href="/dashboard/my/workouts" icon={Dumbbell} label="Workouts" />
            <CTA href="/dashboard/nutrition" icon={Utensils} label="Nutrition" />
            <CTA href="/dashboard/tools/calorie-calculator" icon={Calculator} label="Calculator" />
          </div>
        </div>
      </motion.div>

      {/* RINGS STRIP */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
      >
        <GlassCard glow className="p-4">
          <Ring title="Workout" value={`${clampPct(workoutSummary.pct)}%`} pct={clampPct(workoutSummary.pct)} color="#4f46e5" />
          <div className="mt-2 text-xs text-slate-600">
            {workoutSummary.done}/{workoutSummary.total} sets
          </div>
        </GlassCard>

        <GlassCard glow className="p-4">
          <Ring title="Meals" value={`${nutri.itemsDone}/${nutri.itemsTotal}`} pct={clampPct(nutri.pct)} color="#10b981" />
          <div className="mt-2 text-xs text-slate-600">Completion</div>
        </GlassCard>

        <GlassCard glow className="p-4">
          <Ring title="Water" value={`${clampPct(nutri.waterPct)}%`} pct={clampPct(nutri.waterPct)} color="#0ea5e9" />
          <div className="mt-2 text-xs text-slate-600">4L daily target</div>
        </GlassCard>

        <GlassCard glow className="p-4">
          <Ring title="Target kcal" value={targets?.kcal ? `${targets.kcal}` : '—'} pct={targets?.kcal ? 100 : 0} color="#f59e0b" />
          <div className="mt-2 text-xs text-slate-600">From calculator</div>
        </GlassCard>
      </motion.div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: workout + nutrition */}
        <div className="lg:col-span-2 space-y-4">
          {/* WORKOUT */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle
                icon={Dumbbell}
                title="Today’s Workout"
                action={
                  <Link className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" href="/dashboard/my/workouts">
                    Open <ChevronRight size={16} />
                  </Link>
                }
              />
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-indigo-600"
                      style={{ width: `${clampPct(workoutSummary.pct)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    Sets: <span className="font-semibold">{workoutSummary.done}</span> / {workoutSummary.total}
                  </div>
                  {workoutSummary.nextEx ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Next: <span className="font-medium">{workoutSummary.nextEx.name}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">All sets completed 🎉</div>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <CalendarDays size={14} /> Day
                  </div>
                  <div className="font-semibold capitalize text-slate-800 truncate">{workout?.name || selectedDay}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Tap open to continue logging.</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* NUTRITION */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle
                icon={Utensils}
                title="Today’s Nutrition"
                action={
                  <Link className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" href="/dashboard/nutrition">
                    Open <ChevronRight size={16} />
                  </Link>
                }
              />
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${clampPct(nutri.pct)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    Meals completed: <span className="font-semibold">{nutri.itemsDone}</span> / {nutri.itemsTotal || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Day: <span className="font-medium capitalize">{nutri.day}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat icon={Droplets} label="Water" value={`${clampPct(nutri.waterPct)}%`} tone="blue" />
                  <MiniSupp supp={nutri.supp} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* RIGHT: calories + history + PRs */}
        <div className="space-y-4">
          {/* CALORIES */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle
                icon={Flame}
                title="Calories & Macros"
                action={
                  <Link className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" href="/dashboard/tools/calorie-calculator">
                    Edit targets <ChevronRight size={16} />
                  </Link>
                }
              />
              {targets ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Pill label="Target kcal" value={targets.kcal ?? '—'} tone="amber" icon={Flame} />
                    <Pill label="TDEE" value={targets.tdee ?? '—'} icon={Info} />
                    <Pill label="BMR" value={targets.bmr ?? '—'} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Pill label="Protein" value={`${targets.p ?? '—'} g`} tone="indigo" />
                    <Pill label="Carbs" value={`${targets.c ?? '—'} g`} tone="blue" />
                    <Pill label="Fat" value={`${targets.f ?? '—'} g`} tone="rose" />
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3">
                    <div className="text-xs text-slate-500 mb-1">Per-meal (×{targets.meals ?? 4})</div>
                    <div className="text-sm font-medium">{targets.perMeal ?? '—'} kcal each</div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">No calorie targets yet.</div>
              )}
            </GlassCard>
          </motion.div>

          {/* HISTORY */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle
                icon={HistoryIcon}
                title="Recent Sessions"
                action={
                  <Link className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" href="/dashboard/my/workouts?tab=history">
                    All history <ChevronRight size={16} />
                  </Link>
                }
              />
              {hydrated && history?.length ? (
                <div className="mt-3 space-y-2">
                  {history.slice(0, 3).map(h => (
                    <div key={h.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-3">
                      <CheckCircle2 className="text-emerald-600" size={18} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-slate-800">{h.name}</div>
                        <div className="text-xs text-slate-500">
                          {h.date} • {h.duration} • {h.setsDone}/{h.setsTotal} sets
                        </div>
                      </div>
                      <div className="text-xs font-semibold tabular-nums text-slate-700">{(h.volume || 0).toLocaleString()} vol</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">No sessions yet.</div>
              )}
            </GlassCard>
          </motion.div>

          {/* PRs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle icon={Trophy} title="Personal Records" />
              {prs && Object.keys(prs).length ? (
                <div className="mt-3 space-y-2">
                  {Object.entries(prs).slice(0, 5).map(([ex, pr]) => (
                    <div key={ex} className="rounded-2xl border border-slate-200/70 bg-white/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate text-slate-800">{ex}</div>
                          <div className="text-xs text-slate-500">e1RM {pr.e1rm} • {pr.weight}×{pr.reps} on {pr.date}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(prs).length > 5 && (
                    <div className="text-xs text-slate-500">+{Object.keys(prs).length - 5} more…</div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">PRs will appear as you log records.</div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* MOBILE QUICK ACTIONS */}
      <div className="mt-5 md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <CTA href="/dashboard/my/workouts" icon={Dumbbell} label="Workouts" />
          <CTA href="/dashboard/nutrition" icon={Utensils} label="Nutrition" />
          <CTA href="/dashboard/tools/calorie-calculator" icon={Calculator} label="Calculator" />
        </div>
      </div>
    </div>
  );
}

/* ======= UI PARTS ======= */

function Ring({ title, value, pct = 0, color = '#4f46e5' }) {
  const p = clampPct(pct);
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full" style={pctToConic(p, color)} />
        <div className="absolute inset-[6px] bg-white rounded-full grid place-items-center text-xs font-semibold text-slate-800">
          {p}%
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-800 border-slate-200/70',
    blue: 'bg-sky-50 text-sky-800 border-sky-200/70',
  };
  return (
    <div className={`rounded-2xl border p-3 ${tones[tone] || tones.slate}`}>
      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
        <Icon size={14} /> {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function MiniSupp({ supp }) {
  const items = [
    { k: 'multi', label: 'Multi' },
    { k: 'omega', label: 'Omega' },
    { k: 'zinc', label: 'Zinc' },
    { k: 'creatine', label: 'Creatine' },
  ];
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3">
      <div className="text-xs text-slate-500 mb-1">Supplements</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(i => (
          <span
            key={i.k}
            className={`px-2 py-1 rounded-lg text-[11px] border ${
              supp?.[i.k] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Pill({ label, value, tone = 'slate', icon: Icon }) {
  const tones = {
    slate: 'border-slate-200/70 bg-white/70 text-slate-800',
    amber: 'border-amber-200/70 bg-amber-50 text-amber-800',
    indigo: 'border-indigo-200/70 bg-indigo-50 text-indigo-800',
    blue: 'border-sky-200/70 bg-sky-50 text-sky-800',
    rose: 'border-rose-200/70 bg-rose-50 text-rose-800',
  };
  return (
    <div className={`rounded-2xl border px-3 py-2 flex items-center gap-2 ${tones[tone] || tones.slate}`}>
      {Icon ? <Icon size={16} /> : null}
      <div className="text-xs">{label}</div>
      <div className="ml-auto text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function CTA({ href, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/70 px-4 py-2 text-sm text-slate-800 hover:shadow-md hover:-translate-y-0.5 transition shadow-[0_6px_20px_rgba(2,6,23,0.05)]"
    >
      <div className="w-8 h-8 rounded-xl grid place-items-center bg-slate-100 border border-slate-200">
        <Icon size={16} className="text-slate-700" />
      </div>
      <span className="font-medium">{label}</span>
      <ChevronRight size={16} className="opacity-70" />
    </Link>
  );
}
