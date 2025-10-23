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
  Target,
  TrendingUp,
  Users,
  Award,
	Activity,
} from 'lucide-react';
import api from '@/utils/axios';

/* ======= STORAGE KEYS ======= */
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
  return {
    background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(2,6,23,0.08) 0deg)`,
  };
}

/* ======= SHELL / CARD ======= */
function GlassCard({ children, className = '' , glow=false }) {
  return (
    <div
      className={` ${glow && "card-glow"} rounded-lg border border-white/30 bg-white/60 backdrop-blur-md shadow-[0_10px_30px_rgba(2,6,23,0.06)] ${className}`}
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
export default function ClientDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Local storage states
  const [workout, setWorkout] = useState(null);
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState({});
  const [selectedDay, setSelectedDay] = useState('monday');
  const [nutriState, setNutriState] = useState({});
  const [nutriUI, setNutriUI] = useState({ day: 'saturday' });
  const [calc, setCalc] = useState(null);

  // API states
  const [clientStats, setClientStats] = useState(null);
  const [workoutStats, setWorkoutStats] = useState(null);
  const [nutritionStats, setNutritionStats] = useState(null);
  const [progressStats, setProgressStats] = useState(null);
  const [recentPRs, setRecentPRs] = useState([]);

  useEffect(() => {
    setHydrated(true);
    // Load local storage
    setWorkout(loadLS(LS_WORKOUT, null));
    setHistory(loadLS(LS_HISTORY, []));
    setPRs(loadLS(LS_PRS, {}));
    setSelectedDay(loadLS(LS_SELECTED_DAY, 'monday'));
    setNutriState(loadLS(LS_NUTRITION_STATE, {}));
    setNutriUI(loadLS(LS_NUTRITION_UI, { day: 'saturday' }));
    setCalc(loadLS(LS_CALC, null));

    // Fetch API data
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [overviewResponse, detailedResponse, prsResponse] = await Promise.all([
        api.get('/stats/my/overview'),
        api.get('/stats/my/detailed?timeframe=7d'),
        api.get('/prs/all-stats?windowDays=30')
      ]);

      setClientStats(overviewResponse.data);
      setWorkoutStats(detailedResponse.data?.workout || {});
      setNutritionStats(detailedResponse.data?.nutrition || {});
      setProgressStats(overviewResponse.data?.overview?.progress || {});
      setRecentPRs(prsResponse.data?.allTimeBests || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Workout derived ---------- */
  const workoutSummary = useMemo(() => {
    if (!workout?.sets?.length || !workout?.exercises?.length) {
      return { 
        name: 'Today', 
        total: 0, 
        done: 0, 
        pct: 0, 
        nextEx: null,
        apiStats: workoutStats
      };
    }
    const sets = workout.sets;
    const total = sets.length;
    const done = sets.filter(s => s.done).length;
    const pct = total ? (done / total) * 100 : 0;
    const next = sets.find(s => !s.done);
    const nextEx = next ? workout.exercises.find(e => e.id === next.exId) : null;
    
    return { 
      name: workout.name || selectedDay, 
      total, 
      done, 
      pct, 
      nextEx,
      apiStats: workoutStats
    };
  }, [workout, selectedDay, workoutStats]);

  /* ---------- Nutrition derived ---------- */
  const nutri = useMemo(() => {
    const day = nutriUI?.day || 'saturday';
    const state = nutriState[day];
    if (!state) {
      return {
        day,
        itemsDone: 0,
        itemsTotal: 0,
        pct: 0,
        waterPct: 0,
        supp: { multi: false, omega: false, zinc: false, creatine: false },
        apiStats: nutritionStats
      };
    }
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
      apiStats: nutritionStats
    };
  }, [nutriState, nutriUI, nutritionStats]);

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

  /* ---------- API Progress Stats ---------- */
  const progressRings = useMemo(() => {
    if (!clientStats) return [];
    
    const workoutCompliance = clientStats.overview?.workout?.complianceRate || 0;
    const nutritionAdherence = clientStats.overview?.nutrition?.avgAdherence || 0;
    const progressScore = progressStats?.consistencyScore || 0;
    const streakDays = clientStats.overview?.progress?.currentStreak || 0;

    return [
      { 
        title: "Workout", 
        value: `${workoutCompliance}%`, 
        pct: workoutCompliance, 
        color: "#4f46e5",
        subtitle: `${clientStats.overview?.workout?.totalSessions || 0} sessions`
      },
      { 
        title: "Nutrition", 
        value: `${Math.round(nutritionAdherence * 20)}%`, 
        pct: nutritionAdherence * 20, 
        color: "#10b981",
        subtitle: `${clientStats.overview?.nutrition?.totalMeals || 0} meals`
      },
      { 
        title: "Progress", 
        value: `${progressScore}%`, 
        pct: progressScore, 
        color: "#f59e0b",
        subtitle: "Consistency score"
      },
      { 
        title: "Streak", 
        value: `${streakDays}d`, 
        pct: Math.min(streakDays * 10, 100), 
        color: "#ef4444",
        subtitle: "Current streak"
      },
    ];
  }, [clientStats, progressStats]);

  /* ---------- Recent Activity ---------- */
  const recentActivity = useMemo(() => {
    const activities = [];
    
    // Add workout activities
    if (workoutStats?.recentSessions) {
      workoutStats.recentSessions.slice(0, 2).forEach(session => {
        activities.push({
          type: 'workout',
          title: session.name,
          subtitle: `${session.setsDone}/${session.setsTotal} sets • ${session.volume} vol`,
          date: session.date,
          icon: Dumbbell
        });
      });
    }
    
    // Add nutrition activities
    if (nutritionStats?.recentMeals) {
      nutritionStats.recentMeals.slice(0, 2).forEach(meal => {
        activities.push({
          type: 'nutrition',
          title: `Meal logged`,
          subtitle: `Adherence: ${meal.adherence}/5`,
          date: meal.date,
          icon: Utensils
        });
      });
    }
    
    // Add PR activities
    if (recentPRs.length > 0) {
      recentPRs.slice(0, 2).forEach(pr => {
        activities.push({
          type: 'pr',
          title: `New PR: ${pr.name}`,
          subtitle: `${pr.weight}kg × ${pr.reps} • e1RM: ${pr.e1rm}`,
          date: pr.date,
          icon: Trophy
        });
      });
    }
    
    return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  }, [workoutStats, nutritionStats, recentPRs]);

  if (loading && !clientStats) {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 -top-16 -z-10 h-[320px] md:h-[360px] bg-gradient-to-b from-slate-50 to-white" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse rounded-lg bg-slate-200 h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="animate-pulse rounded-lg bg-slate-200 h-48"></div>
            <div className="animate-pulse rounded-lg bg-slate-200 h-48"></div>
          </div>
          <div className="space-y-4">
            <div className="animate-pulse rounded-lg bg-slate-200 h-48"></div>
            <div className="animate-pulse rounded-lg bg-slate-200 h-48"></div>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Welcome back{clientStats?.user?.name ? `, ${clientStats.user.name}` : ''}!
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {clientStats?.weeklySummary ? 
                `This week: ${clientStats.weeklySummary.workouts} workouts, ${clientStats.weeklySummary.meals} meals logged` :
                'Today at a glance — workout, meals, water, and targets.'
              }
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
        {progressRings.map((ring, index) => (
          <GlassCard glow className="p-4" key={ring.title}>
            <Ring 
              title={ring.title} 
              value={ring.value} 
              pct={clampPct(ring.pct)} 
              color={ring.color} 
            />
            <div className="mt-2 text-xs text-slate-600">
              {ring.subtitle}
            </div>
          </GlassCard>
        ))}
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
                title="Workout Progress"
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
                    {workoutSummary.apiStats ? (
                      <>
                        <span className="font-semibold">{workoutSummary.apiStats.totalSessions || 0}</span> sessions •{' '}
                        <span className="font-semibold">{workoutSummary.apiStats.totalVolume?.toLocaleString() || 0}</span> total volume
                      </>
                    ) : (
                      `Sets: ${workoutSummary.done} / ${workoutSummary.total}`
                    )}
                  </div>
                  {workoutSummary.nextEx ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Next: <span className="font-medium">{workoutSummary.nextEx.name}</span>
                    </div>
                  ) : workoutSummary.apiStats?.personalRecords ? (
                    <div className="mt-1 text-xs text-slate-500">
                      <span className="font-medium">{workoutSummary.apiStats.personalRecords}</span> PRs this period
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">Start your workout to see progress</div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <TrendingUp size={14} /> Stats
                  </div>
                  <div className="font-semibold text-slate-800">
                    {workoutSummary.apiStats?.complianceRate || 0}% Compliance
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {workoutSummary.apiStats?.avgVolumePerSession || 0} avg volume/session
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* NUTRITION */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle
                icon={Utensils}
                title="Nutrition Tracking"
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
                    {nutri.apiStats ? (
                      <>
                        <span className="font-semibold">{nutri.apiStats.totalMeals || 0}</span> meals •{' '}
                        <span className="font-semibold">{nutri.apiStats.avgAdherence || 0}/5</span> avg adherence
                      </>
                    ) : (
                      `Meals completed: ${nutri.itemsDone} / ${nutri.itemsTotal || 0}`
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {nutri.apiStats?.perfectDays ? (
                      <span>{nutri.apiStats.perfectDays} perfect days this period</span>
                    ) : (
                      <span>Day: <span className="font-medium capitalize">{nutri.day}</span></span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat icon={Droplets} label="Water" value={`${clampPct(nutri.waterPct)}%`} tone="blue" />
                  <MiniSupp supp={nutri.supp} />
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* RECENT ACTIVITY */}
          {recentActivity.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              <GlassCard className="p-5">
                <SectionTitle
                  icon={Activity}
                  title="Recent Activity"
                  action={
                    <Link className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" href="/dashboard/my/workouts?tab=history">
                      View all <ChevronRight size={16} />
                    </Link>
                  }
                />
                <div className="mt-3 space-y-2">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white/60 p-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'workout' ? 'bg-indigo-50 text-indigo-600' :
                        activity.type === 'nutrition' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        <activity.icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-slate-800">{activity.title}</div>
                        <div className="text-xs text-slate-500">{activity.subtitle}</div>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(activity.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* RIGHT: calories + PRs + coach info */}
        <div className="space-y-4">
          {/* CALORIES */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle
                icon={Flame}
                title="Nutrition Targets"
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
                  <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-3">
                    <div className="text-xs text-slate-500 mb-1">Per-meal (×{targets.meals ?? 4})</div>
                    <div className="text-sm font-medium">{targets.perMeal ?? '—'} kcal each</div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">No calorie targets yet.</div>
              )}
            </GlassCard>
          </motion.div>

          {/* PERSONAL RECORDS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <GlassCard className="p-5">
              <SectionTitle 
                icon={Trophy} 
                title="Personal Records" 
                action={
                  <Link className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" href="/dashboard/my/prs">
                    View all <ChevronRight size={16} />
                  </Link>
                }
              />
              {recentPRs.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {recentPRs.slice(0, 4).map((pr, index) => (
                    <div key={index} className="rounded-lg border border-slate-200/70 bg-white/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate text-slate-800">{pr.name}</div>
                          <div className="text-xs text-slate-500">
                            {pr.weight}kg × {pr.reps} • e1RM: {pr.e1rm} on {new Date(pr.date).toLocaleDateString()}
                          </div>
                        </div>
                        <Award className="text-amber-500" size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">PRs will appear as you log records.</div>
              )}
            </GlassCard>
          </motion.div>

          {/* COACH INFO */}
          {clientStats?.user?.coach && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              <GlassCard className="p-5">
                <SectionTitle icon={Users} title="Your Coach" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {clientStats.user.coach.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{clientStats.user.coach.name}</div>
                    <div className="text-sm text-slate-600">Your fitness coach</div>
                    <div className="text-xs text-slate-500 mt-1">Available for guidance and support</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
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
    <div className={`rounded-lg border p-3 ${tones[tone] || tones.slate}`}>
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
    <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
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
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${tones[tone] || tones.slate}`}>
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
      className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/70 px-4 py-2 text-sm text-slate-800 hover:shadow-md hover:-translate-y-0.5 transition shadow-[0_6px_20px_rgba(2,6,23,0.05)]"
    >
      <div className="w-8 h-8 rounded-lg grid place-items-center bg-slate-100 border border-slate-200">
        <Icon size={16} className="text-slate-700" />
      </div>
      <span className="font-medium">{label}</span>
      <ChevronRight size={16} className="opacity-70" />
    </Link>
  );
}