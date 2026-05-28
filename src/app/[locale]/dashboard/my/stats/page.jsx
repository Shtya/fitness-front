'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';
import {
  Dumbbell, Utensils, Bell, TrendingUp, Trophy, Target,
  ArrowUpRight, Flame, Star, Shield, Sparkles, RefreshCw,
  AlertCircle, Heart, Zap, User, CheckCircle2,
  Activity, Weight,
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
const P500 = '#6366f1';
const P600 = '#4f46e5';
const P100 = '#e0e7ff';
const P50  = '#eef2ff';
const S500 = '#a855f7';
const S100 = '#f3e8ff';
const S50  = '#faf5ff';

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
    className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
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
  <div className="flex items-start justify-between gap-3 mb-5">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${iconBg} flex-shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 md: leading-tight">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {right && <div className="flex-shrink-0">{right}</div>}
  </div>
);

const StatBadge = ({ value, label, color = P500 }) => (
  <div className="text-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
    <p className="text-base font-bold md: leading-none tabular-nums" style={{ color }}>{value}</p>
    <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap font-medium">{label}</p>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, sub, accentColor, accentBg, delay = 0 }) => {
  const [ref, inView] = useInView(0.1);
  const count = useCounter(value, 900, inView);
  return (
    <div
      ref={ref}
      className={`
        bg-white rounded-2xl border border-slate-200/80 p-5
        hover:border-slate-300 hover:shadow-md
        transition-all duration-500 cursor-default group
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${accentBg}`}>
          <Icon size={15} style={{ color: accentColor }} />
        </div>
        <ArrowUpRight size={13} className="text-slate-200 group-hover:text-slate-300 transition-colors" />
      </div>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums md: leading-none text-slate-900">{count.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-2">{sub}</p>}
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
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--color-gradient-from) 0%, var(--color-gradient-via) 55%, var(--color-gradient-to) 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(255,255,255,1) 31px,rgba(255,255,255,1) 32px),' +
            'repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,1) 31px,rgba(255,255,255,1) 32px)',
        }}
      />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* Left */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <span className="text-white/60 text-[10px] font-semibold uppercase tracking-[0.2em]">
                {t('liveLabel')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white md: leading-tight tracking-tight">
              {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20">
                <TierIcon size={11} style={{ color: tier.color === '#f59e0b' ? '#fcd34d' : 'white' }} />
                <span className="text-white text-[11px] font-semibold capitalize">
                  {t(`membership.${tier.label}`)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20">
                <Star size={11} className="text-yellow-300" />
                <span className="text-white text-[11px] font-semibold">{user.points} {t('hero.points')}</span>
              </div>
            </div>
            <p className="text-white/50 text-xs mt-2 flex items-center gap-1.5">
              <User size={11} />
              {t('hero.coachLabel')}: {user.coach?.name}
            </p>
          </div>

          {/* Right: ring + pills */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg width="80" height="80" className="-rotate-90 absolute inset-0">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - (filled ? pct : 0) / 100)}
                  style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-lg font-bold md: leading-none">{pct}%</span>
                <span className="text-white/50 text-[9px] mt-0.5 uppercase tracking-wide text-center md: leading-tight">
                  {t('hero.compliance')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {pills.map((p, i) => (
                <div key={i}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors border border-white/10 rounded-xl px-3 py-2 cursor-default"
                >
                  <p.icon size={12} className="text-white/60 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-bold md: leading-none">{p.val}</p>
                    <p className="text-white/50 text-[10px] md: leading-tight mt-0.5">{p.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
        <ResponsiveContainer width="100%" height={230}>
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
        <ResponsiveContainer width="100%" height={190}>
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
        <ResponsiveContainer width="100%" height={200}>
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
  const shades      = ['#f1f5f9', P100, '#a5b4fc', P500, '#3730a3'];

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
  <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 flex flex-col items-center gap-5">
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

  const { overview, timeline } = data || {};

  const metricCards = overview ? [
    { icon: Dumbbell, label: t('kpi.totalSessions'),   value: overview.workout.totalSessions,      sub: t('kpi.periodSub'),    accentColor: P500,       accentBg: 'bg-[var(--color-primary-50)]',   delay: 0   },
    { icon: Trophy,   label: t('kpi.personalRecords'), value: overview.workout.personalRecords,    sub: t('kpi.allTime'),      accentColor: '#f59e0b',  accentBg: 'bg-amber-50',                    delay: 60  },
    { icon: Zap,      label: t('kpi.totalVolume'),     value: overview.workout.totalVolume,        sub: 'kg',                  accentColor: P600,       accentBg: 'bg-[var(--color-primary-50)]',   delay: 120 },
    { icon: Utensils, label: t('kpi.totalMeals'),      value: overview.nutrition.totalMeals,       sub: t('kpi.periodSub'),    accentColor: S500,       accentBg: 'bg-[var(--color-secondary-50)]', delay: 180 },
    { icon: Heart,    label: t('kpi.perfectDays'),     value: overview.nutrition.perfectDays,      sub: t('kpi.nutritionSub'), accentColor: '#10b981',  accentBg: 'bg-emerald-50',                  delay: 240 },
    { icon: Target,   label: t('kpi.compliance'),      value: overview.workout.complianceRate,     sub: '%',                   accentColor: P500,       accentBg: 'bg-[var(--color-primary-50)]',   delay: 300 },
    { icon: Flame,    label: t('kpi.weeklyWorkouts'),  value: overview.weeklySummary.workouts,     sub: t('kpi.thisWeek'),     accentColor: '#f97316',  accentBg: 'bg-orange-50',                   delay: 360 },
    { icon: Star,     label: t('kpi.points'),          value: overview.user.points,                sub: t('kpi.totalPoints'),  accentColor: '#f59e0b',  accentBg: 'bg-amber-50',                    delay: 420 },
  ] : [];

  return (
    <div  className="min-h-screen ">

      

      <div className=" space-y-5">
 
        {/* ERROR */}
        {err && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            <div className="flex items-center gap-2"><AlertCircle size={15} />{err}</div>
            <button onClick={fetchData} className="text-xs font-bold underline underline-offset-2">{t('error.retry')}</button>
          </div>
        )}

        {/* HERO */}
        {overview && <HeroBanner overview={overview} t={t} />}

        {/* 8 KPI CARDS */}
        {overview && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {metricCards.map((c, i) => <MetricCard key={i} {...c} />)}
          </div>
        )}

        {/* ROW 2: Activity chart (2/3) + Workout stats (1/3) */}
        {timeline && overview && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MealLogsBar data={timeline.mealLogsByDay} t={t} locale={locale} />
            <NutritionCard nutrition={overview.nutrition} t={t} />
          </div>
        )}

        {/* ROW 4: Weight chart (2/3) + Plans & measurements (1/3) */}
        {timeline && overview && timeline.weightByDay.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExerciseHeatmap data={timeline.exerciseVolumeByDay} t={t} />
            <RecentWorkouts  data={timeline.recentWorkouts}      t={t} locale={locale} />
          </div>
        )}

      </div>

      {loading && <LoadingOverlay t={t} />}
    </div>
  );
}