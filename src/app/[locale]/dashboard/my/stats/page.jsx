'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';
import {
  Dumbbell, Utensils, TrendingUp, Trophy, Target,
  Flame, Star, Shield, Sparkles, RefreshCw,
  AlertCircle, Zap, User, CheckCircle2, Award, Calendar,
  Activity, Weight, BarChart3,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════
   PREVIEW DATA  — maps to both API responses
════════════════════════════════════════════════════════ */
const PREVIEW_DATA = {
  overview: {
    user: {
      name: 'Ahmed Abdelrahman',
      membership: 'gold',
      points: 153,
      coach: { name: 'Ahmed Coach' },
      activeMealPlan:     { name: '4800 Calorie Professional Athlete' },
      activeExercisePlan: { name: 'Push Pull Legs' },
    },
    workout: {
      totalSessions: 4,
      totalVolume: 3421,
      avgVolumePerSession: 855,
      complianceRate: 13,
      personalRecords: 5,
    },
    nutrition: {
      totalMeals: 4,
      avgAdherence: 3.25,
      perfectDays: 1,
    },
    measurements: {
      hasEnoughData: true,
      latest: { weight: '80.00', date: '2025-12-07' },
      changes: { weight: -20, waist: null, chest: null },
    },
    weeklySummary: {
      workouts: 6,
      meals: 3,
      weeklyReportSubmitted: true,
    },
  },
  timeline: {
    exerciseVolumeByDay: [
      { date: '2026-02-28', value: 2  }, { date: '2026-03-01', value: 5  },
      { date: '2026-03-02', value: 8  }, { date: '2026-03-03', value: 4  },
      { date: '2026-03-04', value: 11 }, { date: '2026-03-05', value: 7  },
      { date: '2026-03-06', value: 9  }, { date: '2026-03-07', value: 14 },
      { date: '2026-03-08', value: 6  }, { date: '2026-03-09', value: 10 },
      { date: '2026-03-10', value: 8  }, { date: '2026-03-11', value: 16 },
      { date: '2026-03-12', value: 5  },
    ],
    mealLogsByDay: [
      { date: '2026-02-28', value: 0 }, { date: '2026-03-01', value: 1 },
      { date: '2026-03-02', value: 0 }, { date: '2026-03-03', value: 5 },
      { date: '2026-03-04', value: 7 }, { date: '2026-03-05', value: 1 },
      { date: '2026-03-06', value: 1 }, { date: '2026-03-07', value: 3 },
      { date: '2026-03-08', value: 0 }, { date: '2026-03-09', value: 0 },
      { date: '2026-03-10', value: 3 }, { date: '2026-03-11', value: 4 },
      { date: '2026-03-12', value: 0 },
    ],
    weightByDay: [
      { date: '2025-10-20', value: 74  },
      { date: '2025-10-26', value: 80  },
      { date: '2025-11-17', value: 50  },
      { date: '2025-11-20', value: 100 },
      { date: '2025-12-07', value: 80  },
    ],
    recentWorkouts: [
      { exerciseName: 'Bench Press',               date: '2026-03-11', totalVolume: 450,  isPersonalRecord: false },
      { exerciseName: 'Cable Seated Wide-grip Row', date: '2026-03-11', totalVolume: 160,  isPersonalRecord: true  },
      { exerciseName: 'Smith Decline Bench Press',  date: '2026-03-10', totalVolume: 425,  isPersonalRecord: true  },
      { exerciseName: 'Sled 45° Leg Press',         date: '2025-11-17', totalVolume: 1470, isPersonalRecord: false },
      { exerciseName: 'Dumbbell Bench Press',       date: '2026-01-11', totalVolume: 560,  isPersonalRecord: true  },
    ],
  },
};

/* ════════════════════════════════════════════════════════
   UTILS
════════════════════════════════════════════════════════ */
const n = (v) => Number(v) || 0;

const fmtDate = (d, locale) =>
  new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short', day: 'numeric',
  });

/* ════════════════════════════════════════════════════════
   HOOKS
════════════════════════════════════════════════════════ */
function useInView(threshold = 0.08) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCounter(target, duration = 1100, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (target === 0) { setVal(0); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setVal(Math.floor(ease * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return val;
}

/* ════════════════════════════════════════════════════════
   DESIGN TOKENS — exact match to admin dashboard
════════════════════════════════════════════════════════ */
const P500 = 'var(--color-primary-500)';
const P600 = 'var(--color-primary-600)';
const P100 = 'var(--color-primary-100)';
const P50  = 'var(--color-primary-50)';
const S500 = 'var(--color-secondary-500)';
const S100 = 'var(--color-secondary-100)';
const S50  = 'var(--color-secondary-50)';

const TIER_CFG = {
  basic:    { color: P500,      bg: P50,       label: 'basic',    Icon: Shield   },
  gold:     { color: '#f59e0b', bg: '#fffbeb', label: 'gold',     Icon: Star     },
  platinum: { color: S500,      bg: S50,       label: 'platinum', Icon: Sparkles },
};

/* ════════════════════════════════════════════════════════
   SHARED PRIMITIVES — identical API to admin dashboard
════════════════════════════════════════════════════════ */
const Card = ({ children, className = '', style = {} }) => (
  <div
    className={`rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.32)] ${className}`}
    style={style}
  >
    {children}
  </div>
);

const CardHeader = ({
  icon: Icon, title, subtitle,
  iconBg    = 'bg-[var(--color-primary-50)]',
  iconColor = 'text-[var(--color-primary-500)]',
  right,
}) => (
  <div className="mb-4">
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/80 bg-[#eef2f9] text-(--color-primary-600) shadow-[3px_3px_6px_rgba(100,116,139,0.18)]">
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight text-slate-800">{title}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {right && <div className="mt-3 [&>div]:grid [&>div]:w-full [&>div]:grid-cols-3 [&>div]:gap-2">{right}</div>}
  </div>
);

const StatBadge = ({ value, label, color = P500 }) => (
  <div className="rounded-2xl border border-white/80 bg-[#eef2f9] px-2 py-2 text-center shadow-[3px_3px_6px_rgba(100,116,139,0.18)]">
    <p className="text-base font-bold md: leading-none tabular-nums" style={{ color }}>{value}</p>
    <p className="mt-1 line-clamp-2 text-[9px] font-medium text-slate-400">{label}</p>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, sub, accentColor, accentBg, delay = 0 }) => {
  const [ref, inView] = useInView(0.1);
  const count = useCounter(value, 900, inView);
  return (
    <div
      ref={ref}
      className={`flex flex-col items-center rounded-2xl border border-white/85 bg-[#eef2f9] px-1.5 py-3 text-center shadow-[3px_3px_6px_rgba(100,116,139,0.22)] ${inView ? 'opacity-100' : 'opacity-0'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`mb-1.5 grid h-[30px] w-[30px] place-items-center rounded-xl ${accentBg}`}>
        <Icon size={14} style={{ color: accentColor }} />
      </div>
      <p className="text-sm font-black tabular-nums leading-none" style={{ color: accentColor }}>
        {sub === '%' ? `${count}%` : count.toLocaleString()}
      </p>
      <p className="mt-1 line-clamp-2 text-[8px] font-medium text-slate-400">{label}</p>
    </div>
  );
};

const ChartTooltip = ({ active, payload, label, locale }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xl shadow-slate-200/60 text-xs">
      <p className="text-slate-400 font-medium mb-2 pb-1.5 border-b border-slate-100">
        {fmtDate(label, locale)}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-bold text-slate-800 ms-auto ps-3 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   HERO BANNER
════════════════════════════════════════════════════════ */
const HeroBanner = ({ overview, t }) => {
  const { user, workout, weeklySummary } = overview;
  const tier     = TIER_CFG[user.membership] || TIER_CFG.basic;
  const TierIcon = tier.Icon;
  const pct      = Math.min(n(workout.complianceRate), 100);

  const [filled, setFilled] = useState(false);
  useEffect(() => { const id = setTimeout(() => setFilled(true), 500); return () => clearTimeout(id); }, []);
  const circ = 2 * Math.PI * 34;

  const pills = [
    { icon: Dumbbell,     val: weeklySummary.workouts,                          label: t('hero.weeklyWorkouts')  },
    { icon: Utensils,     val: weeklySummary.meals,                             label: t('hero.weeklyMeals')     },
    { icon: Trophy,       val: workout.personalRecords,                          label: t('hero.personalRecords') },
    { icon: CheckCircle2, val: weeklySummary.weeklyReportSubmitted ? '✓' : '✗', label: t('hero.weeklyReport')    },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)] shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]"
      style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700), var(--color-primary-800))' }}
    >
      <div className="pointer-events-none absolute -end-12 -top-16 h-[220px] w-[220px] rounded-full bg-white/5" />
      <div className="relative p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">{t('liveLabel')}</span>
            </div>
            <h1 className="truncate text-2xl font-black leading-7 text-white">{user.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2.5 py-1">
                <TierIcon size={10} className="text-white" />
                <span className="text-[10px] font-semibold text-white">{t(`membership.${tier.label}`)}</span>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2.5 py-1">
                <Star size={10} className="fill-amber-200 text-amber-200" />
                <span className="text-[10px] font-semibold text-white">{user.points} {t('hero.points')}</span>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-white/45">
              <User size={10} />
              {t('hero.coachLabel')}: {user.coach?.name}
            </p>
          </div>
          <div className="relative h-[88px] w-[88px] shrink-0">
            <svg width="88" height="88" className="-rotate-90">
              <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
              <circle
                cx="44" cy="44" r="34" fill="none" stroke="white" strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - (filled ? pct : 0) / 100)}
                style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-black leading-none text-white">{pct}%</span>
              <span className="mt-0.5 text-center text-[7px] font-semibold uppercase tracking-wide text-white/50">{t('hero.compliance')}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {pills.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-1 py-3">
              <p.icon size={12} className="text-white/65" />
              <p className="text-[13px] font-bold leading-none text-white">{p.val}</p>
              <p className="line-clamp-2 text-center text-[8px] text-white/45">{p.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   ACTIVITY CHART
════════════════════════════════════════════════════════ */
const ActivityChart = ({ exerciseData, mealData, t, locale }) => {
  const [ref, inView] = useInView(0.05);
  const eKey = t('charts.exerciseVolume');
  const mKey = t('charts.mealLogs');

  const combined = exerciseData.map((d, i) => ({
    date: d.date,
    [eKey]: n(d.value),
    [mKey]: n(mealData[i]?.value),
  }));

  const series = [
    { key: eKey, color: P500, grad: 'cliE' },
    { key: mKey, color: S500, grad: 'cliM' },
  ];

  const totalEx    = exerciseData.reduce((s, d) => s + n(d.value), 0);
  const totalMeals = mealData.reduce((s, d) => s + n(d.value), 0);
  const peakEx     = Math.max(...exerciseData.map(d => n(d.value)));

  return (
    <div ref={ref}
      className={`transition-all duration-700 lg:col-span-2 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={TrendingUp}
          title={t('charts.activityTrends')}
          subtitle={t('charts.activityTrendsSub')}
          right={
            <div className="flex items-center gap-2">
              <StatBadge value={totalEx}    label={t('charts.exerciseVolume')} color={P500}    />
              <StatBadge value={totalMeals} label={t('charts.mealLogs')}       color={S500}    />
              <StatBadge value={peakEx}     label={t('charts.peakDay')}        color="#10b981" />
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={combined} margin={{ top: 4, right: 2, bottom: 0, left: -22 }}>
            <defs>
              {series.map(s => (
                <linearGradient key={s.grad} id={s.grad} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, locale)}
              tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip locale={locale} />} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 11 }}
              formatter={(v) => <span style={{ color: '#94a3b8', fontWeight: 500 }}>{v}</span>}
            />
            {series.map(s => (
              <Area key={s.key} type="monotone" dataKey={s.key}
                stroke={s.color} strokeWidth={2} fill={`url(#${s.grad})`}
                dot={false} activeDot={{ r: 4, fill: s.color, stroke: '#fff', strokeWidth: 2 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   WORKOUT STATS CARD
════════════════════════════════════════════════════════ */
const WorkoutStatsCard = ({ workout, t }) => {
  const [ref, inView] = useInView(0.1);
  const rows = [
    { label: t('workout.totalSessions'),   val: workout.totalSessions,                          color: P500      },
    { label: t('workout.totalVolume'),      val: `${n(workout.totalVolume).toLocaleString()} kg`, color: P600      },
    { label: t('workout.avgVolume'),        val: `${workout.avgVolumePerSession} kg`,             color: S500      },
    { label: t('workout.personalRecords'), val: workout.personalRecords,                         color: '#f59e0b' },
    { label: t('workout.compliance'),      val: `${workout.complianceRate}%`,                    color: '#10b981' },
  ];

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader icon={Dumbbell} title={t('workout.title')} subtitle={t('workout.subtitle')} />
        <div>
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500 font-medium">{row.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: row.color }}>{row.val}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MEAL LOGS BAR — same pattern as admin MealLogsBar
════════════════════════════════════════════════════════ */
const MealLogsBar = ({ data, t, locale }) => {
  const [ref, inView] = useInView(0.05);
  const logsKey   = t('charts.logs');
  const formatted = data.map(d => ({ date: d.date, [logsKey]: n(d.value) }));
  const total = data.reduce((s, d) => s + n(d.value), 0);
  const avg   = (total / data.length).toFixed(1);
  const peak  = Math.max(...data.map(d => n(d.value)));

  return (
    <div ref={ref}
      className={`transition-all duration-700 lg:col-span-2 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Utensils}
          title={t('charts.mealLogsTitle')}
          subtitle={t('charts.mealLogsSub')}
          iconBg="bg-[var(--color-secondary-50)]"
          iconColor="text-[var(--color-secondary-500)]"
          right={
            <div className="flex items-center gap-2">
              <StatBadge value={total} label={t('charts.total')}    color={S500}    />
              <StatBadge value={avg}   label={t('charts.dailyAvg')} color={P500}    />
              <StatBadge value={peak}  label={t('charts.peak')}     color="#10b981" />
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={formatted} margin={{ top: 4, right: 2, bottom: 0, left: -22 }} barSize={18}>
            <defs>
              <linearGradient id="cliMlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={S500} />
                <stop offset="100%" stopColor={P500} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, locale)}
              tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip locale={locale} />} />
            <Bar dataKey={logsKey} fill="url(#cliMlGrad)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   NUTRITION CARD
════════════════════════════════════════════════════════ */
const NutritionCard = ({ nutrition, t }) => {
  const [ref, inView] = useInView(0.1);
  const adherencePct = Math.round((nutrition.avgAdherence / 5) * 100);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (inView) { const id = setTimeout(() => setFilled(true), 300); return () => clearTimeout(id); }
  }, [inView]);
  const R = 32, stroke = 5, circ = 2 * Math.PI * R;

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Utensils}
          title={t('nutrition.title')}
          subtitle={t('nutrition.subtitle')}
          iconBg="bg-[var(--color-secondary-50)]"
          iconColor="text-[var(--color-secondary-500)]"
        />
        <div className="flex items-center gap-5 mb-5">
          <div className="relative flex-shrink-0" style={{ width: 74, height: 74 }}>
            <svg width="74" height="74" className="-rotate-90 absolute inset-0">
              <circle cx="37" cy="37" r={R} fill="none" stroke={S100} strokeWidth={stroke} />
              <circle cx="37" cy="37" r={R} fill="none" stroke={S500} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - (filled ? adherencePct : 0) / 100)}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold" style={{ color: S500 }}>{adherencePct}%</span>
              <span className="text-[9px] text-slate-400 text-center md: leading-tight px-1">{t('nutrition.adherence')}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              { label: t('nutrition.totalMeals'),   val: nutrition.totalMeals,                    color: S500      },
              { label: t('nutrition.perfectDays'),  val: nutrition.perfectDays,                   color: '#10b981' },
              { label: t('nutrition.avgAdherence'), val: `${nutrition.avgAdherence.toFixed(1)}/5`, color: P500      },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
            <span>{t('nutrition.adherenceLabel')}</span>
            <span>{adherencePct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: inView ? `${adherencePct}%` : '0%', background: S500, transitionDelay: '400ms' }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   WEIGHT LINE CHART
════════════════════════════════════════════════════════ */
const WeightChart = ({ data, measurements, t, locale }) => {
  const [ref, inView] = useInView(0.05);
  const wKey      = t('weight.label');
  const chartData = data.map(d => ({ date: d.date, [wKey]: n(d.value) }));
  const change    = measurements.changes?.weight;
  const vals      = data.map(d => n(d.value));
  const minW      = Math.min(...vals) - 5;
  const maxW      = Math.max(...vals) + 5;
  const avg       = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);

  return (
    <div ref={ref}
      className={`transition-all duration-700 lg:col-span-2 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Activity}
          title={t('weight.title')}
          subtitle={t('weight.subtitle')}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          right={
            <div className="flex items-center gap-2">
              <StatBadge value={`${measurements.latest?.weight} kg`} label={t('weight.current')} color="#10b981" />
              <StatBadge value={`${avg} kg`}                         label={t('weight.avg')}     color={P500}    />
              {change !== null && change !== undefined && (
                <StatBadge
                  value={`${change > 0 ? '+' : ''}${change} kg`}
                  label={t('weight.change')}
                  color={change <= 0 ? '#10b981' : '#ef4444'}
                />
              )}
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, locale)}
              tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis domain={[minW, maxW]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip locale={locale} />} />
            <Line type="monotone" dataKey={wKey} stroke="#10b981" strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   EXERCISE HEATMAP
════════════════════════════════════════════════════════ */
const ExerciseHeatmap = ({ data, t }) => {
  const [ref, inView] = useInView(0.1);
  const total       = data.reduce((s, d) => s + n(d.value), 0);
  const peak        = Math.max(...data.map(d => n(d.value)));
  const activeDays  = data.filter(d => n(d.value) > 0).length;
  const consistency = Math.round((activeDays / data.length) * 100);
  const shades      = ['#f1f5f9', P100, '#93c5fd', P500, '#1e3a8a'];

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader icon={Dumbbell} title={t('charts.exerciseVolume')} subtitle={t('charts.exerciseVolumeSub')} />

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { val: total,             label: t('charts.totalSessions'), color: P500      },
            { val: peak,              label: t('charts.peakDay'),       color: '#10b981' },
            { val: `${consistency}%`, label: t('charts.consistency'),   color: S500      },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xl font-bold tabular-nums md: leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium md: leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
          {t('charts.last13Days')}
        </p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
          {data.map((d, i) => {
            const v   = n(d.value);
            const lvl = v === 0 ? 0 : v < 5 ? 1 : v < 10 ? 2 : v < 14 ? 3 : 4;
            return (
              <div key={i} title={`${d.date}: ${v}`}
                className="aspect-square rounded-sm cursor-default transition-transform hover:scale-110"
                style={{ background: shades[lvl] }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-400">{t('charts.last13Days')}</span>
          <div className="flex items-center gap-1">
            {shades.map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />)}
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   RECENT WORKOUTS — same style as admin TopConversations
════════════════════════════════════════════════════════ */
const RecentWorkouts = ({ data, t, locale }) => {
  const [ref, inView] = useInView(0.1);
  const maxVol  = Math.max(...data.map(d => n(d.totalVolume)), 1);
  const palette = [P500, '#7c3aed', S500, '#c084fc', '#ddd6fe'];
  const prCount = data.filter(d => d.isPersonalRecord).length;

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Trophy}
          title={t('workout.recentTitle')}
          subtitle={t('workout.recentSub')}
          right={
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums md: leading-none" style={{ color: P500 }}>{prCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{t('workout.prs')}</p>
            </div>
          }
        />
        <div className="space-y-4">
          {data.map((d, i) => (
            <div key={i} className="cursor-default">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: palette[i] }}
                  >{i + 1}</span>
                  <div className="min-w-0">
                    <span className="text-sm text-slate-600 font-medium md: leading-tight block truncate">{d.exerciseName}</span>
                    <span className="text-[10px] text-slate-400">{fmtDate(d.date, locale)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                  {d.isPersonalRecord && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                      PR
                    </span>
                  )}
                  <span className="text-sm font-bold tabular-nums" style={{ color: palette[i] }}>
                    {n(d.totalVolume).toLocaleString()} kg
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: inView ? `${(n(d.totalVolume) / maxVol) * 100}%` : '0%',
                    background: palette[i],
                    transitionDelay: `${180 + i * 80}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   PLANS & MEASUREMENTS CARD
════════════════════════════════════════════════════════ */
const PlansCard = ({ user, measurements, t }) => {
  const [ref, inView] = useInView(0.1);

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader icon={Target} title={t('plans.title')} subtitle={t('plans.subtitle')} />

        <div className="space-y-2.5 mb-5">
          {[
            { icon: Dumbbell, label: t('plans.exercisePlan'), val: user.activeExercisePlan?.name, color: P500, bg: P50  },
            { icon: Utensils, label: t('plans.mealPlan'),     val: user.activeMealPlan?.name,     color: S500, bg: S50  },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: item.bg }}>
                <item.icon size={13} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate" title={item.val}>
                  {item.val || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            {t('measurements.title')}
          </p>
          {[
            { label: t('measurements.weight'), val: measurements.latest?.weight ? `${measurements.latest.weight} kg` : '—', color: '#10b981' },
            {
              label: t('measurements.change'),
              val:   measurements.changes?.weight != null
                ? `${measurements.changes.weight > 0 ? '+' : ''}${measurements.changes.weight} kg`
                : '—',
              color: measurements.changes?.weight <= 0 ? '#10b981' : '#ef4444',
            },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500 font-medium">{row.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: row.color }}>{row.val}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
              <Star size={12} style={{ color: '#f59e0b' }} />{t('plans.points')}
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: '#f59e0b' }}>{user.points}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   PAGE HEADER
════════════════════════════════════════════════════════ */
const PageHeader = ({ loading, onRefresh, isPreview, t }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold text-[var(--color-primary-500)] uppercase tracking-widest">
          {t('overview')}
        </span>
        <span className="text-slate-300 text-xs">·</span>
        <span className="text-xs text-slate-500 font-medium">{t('subtitle')}</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
    </div>
    <button
      onClick={onRefresh}
      disabled={loading || isPreview}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
    >
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
      {t('refresh')}
    </button>
  </div>
);

/* ════════════════════════════════════════════════════════
   LOADING OVERLAY
════════════════════════════════════════════════════════ */
const LoadingOverlay = ({ t }) => (
  <div className="flex items-center justify-center py-16">
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/85 bg-[#eef2f9] px-8 py-8 shadow-[5px_5px_8px_rgba(100,116,139,0.28)]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] animate-spin"
          style={{ borderColor: `${P500} transparent transparent transparent` }} />
        <div className="absolute inset-1 rounded-full border-[3px] animate-spin"
          style={{ borderColor: `transparent ${S500} transparent transparent`, animationDirection: 'reverse', animationDuration: '0.7s' }} />
      </div>
      <p className="text-slate-500 text-sm font-medium">{t('loading')}</p>
    </div>
  </div>
);

function StreakBanner({ overview, t }) {
  const workouts = Math.min(n(overview.weeklySummary?.workouts), 7);
  const total = n(overview.workout?.totalSessions);
  return (
    <div className="rounded-3xl border border-white/85 bg-gradient-to-br from-[var(--color-primary-50)] via-[#fff7ed] to-[#fffbeb] p-4 shadow-[5px_5px_8px_rgba(100,116,139,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/80 bg-[#fff7ed] shadow-[3px_3px_6px_rgba(100,116,139,0.18)]">
            <Flame size={22} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-amber-800">{t('streak.thisWeek')}</p>
            <p className="text-[26px] font-black leading-[30px] text-amber-600">
              {workouts} <span className="text-[13px] font-medium text-amber-700">{t('streak.sessions')}</span>
            </p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-[10px] font-medium text-amber-800">{t('streak.allTime')}</p>
          <p className="text-[30px] font-black leading-none text-(--color-primary-600)">{total}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
            <Award size={10} />
            {t('streak.totalSessions')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < workouts ? 'bg-amber-500' : 'bg-amber-200'}`} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-medium text-amber-800">
        <span>{t('streak.weekStart')}</span>
        <span>{t('streak.weekEnd')}</span>
      </div>
    </div>
  );
}

function MiniRing({ pct, color, label, sub, icon: Icon }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative h-[88px] w-[88px]">
        <svg width="88" height="88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
          <circle
            cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 100) / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
          <span className="text-sm font-black leading-none" style={{ color }}>{Math.round(pct)}%</span>
          <span className="mt-1 line-clamp-2 text-center text-[8px] text-slate-400">{label}</span>
        </div>
      </div>
      <p className="flex items-center gap-1 text-center text-[9px] text-slate-500">
        <Icon size={10} style={{ color }} />
        {sub}
      </p>
    </div>
  );
}

function DualProgress({ overview, t }) {
  const workoutPct = Math.min(n(overview.workout?.complianceRate), 100);
  const nutritionPct = Math.round((n(overview.nutrition?.avgAdherence) / 5) * 100);
  const weeklyPct = Math.min(n(overview.weeklySummary?.workouts) * 14.3, 100);
  return (
    <Card className="p-5">
      <CardHeader icon={Target} title={t('progressRings')} subtitle={t('progressRingsSub')} />
      <div className="flex items-start justify-between gap-1">
        <MiniRing pct={workoutPct} color={P500} label={t('workout.title')} icon={Dumbbell} sub={`${overview.workout?.totalSessions || 0} ${t('kpi.totalSessions')}`} />
        <MiniRing pct={nutritionPct} color={S500} label={t('nutrition.title')} icon={Utensils} sub={`${overview.nutrition?.totalMeals || 0} ${t('charts.mealLogs')}`} />
        <MiniRing pct={weeklyPct} color="#10b981" label={t('hero.weeklyWorkouts')} icon={Calendar} sub={t('kpi.thisWeek')} />
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function ClientDashboardPage({ PREVIEW_MODE = true, api: apiClient }) {
  const t      = useTranslations('clientDashboard');
  const locale = useLocale();
  const isRtl  = locale === 'ar';

  const [data,    setData]    = useState(PREVIEW_MODE ? PREVIEW_DATA : null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const fetchData = useCallback(async () => {
    if (PREVIEW_MODE) return;
    setLoading(true); setErr('');
    try {
      const [ovRes, tlRes] = await Promise.all([
        apiClient.get(`/api/v1/stats/my/overview?lang=${locale}`),
        apiClient.get(`/api/v1/stats/my/progress-timeline?months=6&lang=${locale}`),
      ]);

      const exMap = {}, mealMap = {};
      (tlRes.data.workouts  || []).forEach(w => { exMap[w.date]                  = (exMap[w.date]                  || 0) + 1; });
      (tlRes.data.nutrition || []).forEach(m => { const d = m.date.slice(0, 10); mealMap[d] = (mealMap[d] || 0) + 1; });

      const days = Array.from({ length: 13 }, (_, i) => {
        const dt = new Date(); dt.setDate(dt.getDate() - (12 - i));
        return dt.toISOString().slice(0, 10);
      });

      const ov = ovRes.data;
      setData({
        overview: {
          user:          ov.user,
          workout:       ov.overview.workout,
          nutrition:     ov.overview.nutrition,
          measurements:  ov.overview.measurements,
          weeklySummary: ov.weeklySummary,
        },
        timeline: {
          exerciseVolumeByDay: days.map(d => ({ date: d, value: exMap[d]   || 0 })),
          mealLogsByDay:       days.map(d => ({ date: d, value: mealMap[d] || 0 })),
          weightByDay: (tlRes.data.measurements || []).map(m => ({
            date:  m.date,
            value: parseFloat(m.data.weight),
          })),
          recentWorkouts: (tlRes.data.workouts || []).slice(0, 5).map(w => ({
            exerciseName:     w.data.exerciseName,
            date:             w.date,
            totalVolume:      w.data.totalVolume,
            isPersonalRecord: w.data.isPersonalRecord,
          })),
        },
      });
    } catch (e) {
      setErr(e?.response?.data?.message || t('error.loadFailed'));
    } finally { setLoading(false); }
  }, [PREVIEW_MODE, apiClient, locale, t]);

  useEffect(() => { if (!PREVIEW_MODE) fetchData(); }, []);

  useEffect(() => {
    const shell = document.querySelector('.dashboard-icy');
    const body = document.getElementById('body');
    const dark = document.documentElement.classList.contains('dark')
      || document.documentElement.getAttribute('data-theme-mode') === 'dark';
    const color = dark ? '#0b1220' : '#ffffff';
    shell?.style.setProperty('--gm-bg-image', 'none', 'important');
    shell?.style.setProperty('background-image', 'none', 'important');
    shell?.style.setProperty('background-color', color, 'important');
    body?.style.setProperty('background-image', 'none', 'important');
    body?.style.setProperty('background-color', color, 'important');
    return () => {
      shell?.style.removeProperty('--gm-bg-image');
      shell?.style.removeProperty('background-image');
      shell?.style.removeProperty('background-color');
      body?.style.removeProperty('background-image');
      body?.style.removeProperty('background-color');
    };
  }, []);

  const { overview, timeline } = data || {};

  const metricCards = overview ? [
    { icon: Dumbbell, label: t('kpi.totalSessions'),   value: overview.workout.totalSessions,   accentColor: P500,      accentBg: 'bg-[var(--color-primary-50)]' },
    { icon: Trophy,   label: t('kpi.personalRecords'), value: overview.workout.personalRecords, accentColor: '#d97706', accentBg: 'bg-amber-50' },
    { icon: Target,   label: t('kpi.compliance'),      value: overview.workout.complianceRate,  sub: '%', accentColor: '#10b981', accentBg: 'bg-emerald-50' },
    { icon: Zap,      label: 'kg',                     value: overview.workout.totalVolume,     accentColor: S500,      accentBg: 'bg-[var(--color-secondary-50)]' },
  ] : [];

  return (
    <div data-plain-page="1" className="report-phone -mx-[var(--app-gutter)] min-h-full bg-white px-[var(--app-gutter)] pt-1 dark:bg-[#0b1220]">
      <div className="mx-auto w-full max-w-[440px] space-y-4">
        <div className="m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]">
          <div
            className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)]"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), var(--color-gradient-via))' }}
          >
            <div className="pointer-events-none absolute -start-16 -top-10 h-[280px] w-[280px] rounded-full bg-white/[0.06]" />
            <div className="pointer-events-none absolute -end-12 -bottom-10 h-[200px] w-[200px] rounded-full bg-white/[0.04]" />
            <div className="relative flex items-center gap-3 p-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white">
                <BarChart3 size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black leading-6 tracking-[-0.3px] text-white">{t('title')}</h1>
                <p className="mt-0.5 truncate text-[10px] font-medium text-white/55">{t('subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading || PREVIEW_MODE}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white disabled:opacity-55"
              >
                <RefreshCw size={18} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
 
        {/* ERROR */}
        {err && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            <div className="flex items-center gap-2"><AlertCircle size={15} />{err}</div>
            <button onClick={fetchData} className="text-xs font-bold underline underline-offset-2">{t('error.retry')}</button>
          </div>
        )}

        {/* HERO */}
        {overview && <HeroBanner overview={overview} t={t} />}

        {overview && (
          <div className="grid grid-cols-4 gap-2">
            {metricCards.map((c, i) => <MetricCard key={i} {...c} />)}
          </div>
        )}

        {overview && <StreakBanner overview={overview} t={t} />}
        {overview && <DualProgress overview={overview} t={t} />}

        {/* ROW 2: Activity chart (2/3) + Workout stats (1/3) */}
        {timeline && overview && (
          <div className="flex flex-col gap-4">
            <ActivityChart
              exerciseData={timeline.exerciseVolumeByDay}
              mealData={timeline.mealLogsByDay}
              t={t} locale={locale}
            />
            <WorkoutStatsCard workout={overview.workout} t={t} />
          </div>
        )}

        {/* ROW 3: Meal logs bar (2/3) + Nutrition card (1/3) */}
        {timeline && overview && (
          <div className="flex flex-col gap-4">
            <MealLogsBar data={timeline.mealLogsByDay} t={t} locale={locale} />
            <NutritionCard nutrition={overview.nutrition} t={t} />
          </div>
        )}

        {/* ROW 4: Weight chart (2/3) + Plans & measurements (1/3) */}
        {timeline && overview && timeline.weightByDay.length > 0 && (
          <div className="flex flex-col gap-4">
            <WeightChart
              data={timeline.weightByDay}
              measurements={overview.measurements}
              t={t} locale={locale}
            />
            <PlansCard user={overview.user} measurements={overview.measurements} t={t} />
          </div>
        )}

        {/* ROW 5: Exercise heatmap (1/2) + Recent workouts (1/2) */}
        {timeline && (
          <div className="flex flex-col gap-4">
            <ExerciseHeatmap data={timeline.exerciseVolumeByDay} t={t} />
            <RecentWorkouts  data={timeline.recentWorkouts}      t={t} locale={locale} />
          </div>
        )}

      </div>

      {loading && <LoadingOverlay t={t} />}
    </div>
  );
}