'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';
import {
  Users, UserPlus, Bell, FileText, Activity, Utensils,
  MessageSquare, Clock, Award, Zap, BarChart2, RefreshCw,
  AlertCircle, TrendingUp, Dumbbell, CheckCircle2, XCircle,
  ChevronRight, Sparkles, Target, ArrowUpRight, Flame, Star, Shield,
} from 'lucide-react';
import { PageHeader } from '@/components/molecules/PageHeader';

/* ════════════════════════════════════════════════════════
   PREVIEW DATA
════════════════════════════════════════════════════════ */
const PREVIEW_DATA = {
  kpis: {
    totalClients: 38, activeClients: 38, newClients: 1,
    churnedThisRange: 0, formsSubmissions: 4, unreadNotifications: 129,
    assetsUploaded: 0, pendingExerciseVideos: 0,
  },
  series: {
    usersCreatedDaily: [
      { date: '2026-02-28', value: 0 }, { date: '2026-03-01', value: 0 },
      { date: '2026-03-02', value: 0 }, { date: '2026-03-03', value: 0 },
      { date: '2026-03-04', value: 0 }, { date: '2026-03-05', value: 0 },
      { date: '2026-03-06', value: 0 }, { date: '2026-03-07', value: 0 },
      { date: '2026-03-08', value: 0 }, { date: '2026-03-09', value: 0 },
      { date: '2026-03-10', value: 0 }, { date: '2026-03-11', value: 1 },
      { date: '2026-03-12', value: 0 },
    ],
    exerciseVolumeDaily: [
      { date: '2026-02-28', value: 2 }, { date: '2026-03-01', value: 5 },
      { date: '2026-03-02', value: 8 }, { date: '2026-03-03', value: 4 },
      { date: '2026-03-04', value: 11 }, { date: '2026-03-05', value: 7 },
      { date: '2026-03-06', value: 9 }, { date: '2026-03-07', value: 14 },
      { date: '2026-03-08', value: 6 }, { date: '2026-03-09', value: 10 },
      { date: '2026-03-10', value: 8 }, { date: '2026-03-11', value: 16 },
      { date: '2026-03-12', value: 5 },
    ],
    mealLogsDaily: [
      { date: '2026-02-28', value: 0 }, { date: '2026-03-01', value: 1 },
      { date: '2026-03-02', value: 0 }, { date: '2026-03-03', value: 5 },
      { date: '2026-03-04', value: 7 }, { date: '2026-03-05', value: 1 },
      { date: '2026-03-06', value: 1 }, { date: '2026-03-07', value: 3 },
      { date: '2026-03-08', value: 0 }, { date: '2026-03-09', value: 0 },
      { date: '2026-03-10', value: 3 }, { date: '2026-03-11', value: 4 },
      { date: '2026-03-12', value: 0 },
    ],
  },
  breakdowns: {
    membershipCounts: [
      { label: 'basic', value: 34 },
      { label: 'gold', value: 2 },
      { label: 'platinum', value: 2 },
    ],
    messagesPerConversationTop5: [
      { conversationId: '1', name: null, messages: 70 },
      { conversationId: '2', name: null, messages: 29 },
      { conversationId: '3', name: null, messages: 17 },
      { conversationId: '4', name: null, messages: 7 },
      { conversationId: '5', name: null, messages: 7 },
    ],
  },
  reviewsQueue: { weeklyReportsPending: 1, videosPending: 0, foodSuggestionsPending: 0 },
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
    if (!active || target === 0) { setVal(target === 0 ? 0 : val); return; }
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
   DESIGN TOKENS  (matches your CSS variables)
════════════════════════════════════════════════════════ */
const P500 = '#6366f1';   // primary-500
const P600 = '#4f46e5';   // primary-600
const P100 = '#e0e7ff';   // primary-100
const P50  = '#eef2ff';   // primary-50
const S500 = '#a855f7';   // secondary-500
const S100 = '#f3e8ff';   // secondary-100
const S50  = '#faf5ff';   // secondary-50

/* ════════════════════════════════════════════════════════
   TOOLTIP
════════════════════════════════════════════════════════ */
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
          <span className="font-bold text-slate-800 ml-auto ps-3 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   CARD — base surface
════════════════════════════════════════════════════════ */
const Card = ({ children, className = '', style = {} }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
    style={style}
  >
    {children}
  </div>
);

/* ════════════════════════════════════════════════════════
   CARD HEADER
════════════════════════════════════════════════════════ */
const CardHeader = ({ icon: Icon, title, subtitle, iconBg = 'bg-[var(--color-primary-50)]', iconColor = 'text-[var(--color-primary-500)]', right }) => (
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

/* ════════════════════════════════════════════════════════
   STAT BADGE — small inline number badge
════════════════════════════════════════════════════════ */
const StatBadge = ({ value, label, color = P500 }) => (
  <div className="text-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
    <p className="text-base font-bold md: leading-none tabular-nums" style={{ color }}>{value}</p>
    <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap font-medium">{label}</p>
  </div>
);

/* ════════════════════════════════════════════════════════
   METRIC ROW — used in KPI grid  
════════════════════════════════════════════════════════ */
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
        <ArrowUpRight
          size={13}
          className="text-slate-200 group-hover:text-slate-300 transition-colors"
        />
      </div>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums md: leading-none text-slate-900">{count.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-2">{sub}</p>}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   ACTIVITY CHART
════════════════════════════════════════════════════════ */
const ActivityChart = ({ usersData, mealData, exerciseData, t, locale }) => {
  const [ref, inView] = useInView(0.05);
  const uKey = t('charts.newUsers');
  const mKey = t('charts.mealLogs');
  const eKey = t('charts.exerciseVolume');

  const combined = usersData.map((d, i) => ({
    date: d.date,
    [uKey]: n(d.value),
    [mKey]: n(mealData[i]?.value),
    [eKey]: n(exerciseData[i]?.value),
  }));

  const series = [
    { key: uKey, color: P500, grad: 'gU' },
    { key: mKey, color: S500, grad: 'gM' },
    { key: eKey, color: '#10b981', grad: 'gE' },
  ];

  const totalMeals = mealData.reduce((s, d) => s + n(d.value), 0);
  const totalEx = exerciseData.reduce((s, d) => s + n(d.value), 0);
  const peakMeal = Math.max(...mealData.map(d => n(d.value)));

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
              <StatBadge value={totalMeals} label={t('charts.mealLogs')} color={S500} />
              <StatBadge value={totalEx} label={t('charts.exerciseVolume')} color="#10b981" />
              <StatBadge value={peakMeal} label={t('charts.peakDay')} color={P500} />
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={combined} margin={{ top: 4, right: 2, bottom: 0, left: -22 }}>
            <defs>
              {series.map(s => (
                <linearGradient key={s.grad} id={s.grad} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
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
   MEMBERSHIP CARD — redesigned with type-led layout
════════════════════════════════════════════════════════ */
const MembershipCard = ({ data, t }) => {
  const [ref, inView] = useInView(0.1);
  const total = data.reduce((s, d) => s + d.value, 0);

  const tiers = [
    { key: 'basic',    color: P500,      bg: P50,      icon: Shield  },
    { key: 'gold',     color: '#f59e0b', bg: '#fffbeb', icon: Star   },
    { key: 'platinum', color: S500,      bg: S50,      icon: Sparkles },
  ];

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Award} title={t('charts.membershipTiers')} subtitle={t('charts.membershipSub')}
          right={
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800 tabular-nums md: leading-none">{total}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{t('kpi.totalClients')}</p>
            </div>
          }
        />

        <div className="space-y-4">
          {data.map((d, i) => {
            const tier = tiers[i];
            const pct = Math.round((d.value / total) * 100);
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md" style={{ background: tier.bg }}>
                      <tier.icon size={11} style={{ color: tier.color }} />
                    </div>
                    <span className="text-sm text-slate-600 font-medium capitalize">
                      {t(`membership.${d.label}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 tabular-nums">{d.value}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white tabular-nums"
                      style={{ background: tier.color }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: inView ? `${pct}%` : '0%',
                      background: tier.color,
                      transitionDelay: `${250 + i * 120}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          {data.map((d, i) => {
            const tier = tiers[i];
            const pct = Math.round((d.value / total) * 100);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                <span className="text-[11px] text-slate-400">{t(`membership.${d.label}`)} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MEAL LOGS BAR CHART
════════════════════════════════════════════════════════ */
const MealLogsBar = ({ data, t, locale }) => {
  const [ref, inView] = useInView(0.05);
  const logsKey = t('charts.logs');
  const formatted = data.map(d => ({ date: d.date, [logsKey]: n(d.value) }));
  const total = data.reduce((s, d) => s + n(d.value), 0);
  const avg = (total / data.length).toFixed(1);
  const peak = Math.max(...data.map(d => n(d.value)));

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
              <StatBadge value={total} label={t('charts.total')} color={S500} />
              <StatBadge value={avg} label={t('charts.dailyAvg')} color={P500} />
              <StatBadge value={peak} label={t('charts.peak')} color="#10b981" />
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={formatted} margin={{ top: 4, right: 2, bottom: 0, left: -22 }} barSize={18}>
            <defs>
              <linearGradient id="mlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={S500} stopOpacity={1} />
                <stop offset="100%" stopColor={P500} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, locale)}
              tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip locale={locale} />} />
            <Bar dataKey={logsKey} fill="url(#mlGrad)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   EXERCISE HEATMAP + STATS
════════════════════════════════════════════════════════ */
const ExerciseCard = ({ data, t }) => {
  const [ref, inView] = useInView(0.1);
  const total = data.reduce((s, d) => s + n(d.value), 0);
  const peak = Math.max(...data.map(d => n(d.value)));
  const activeDays = data.filter(d => n(d.value) > 0).length;
  const consistency = Math.round((activeDays / data.length) * 100);

  // SVG ring animation
  const [ringPct, setRingPct] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setTimeout(() => setRingPct(consistency), 400);
    return () => clearTimeout(id);
  }, [inView, consistency]);

  const R = 30;
  const circ = 2 * Math.PI * R;

  // Heatmap shades — using your primary color range
  const heatShades = ['#f1f5f9', P100, '#a5b4fc', '#6366f1', '#4338ca'];

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Dumbbell}
          title={t('charts.exerciseVolume')}
          subtitle={t('charts.exerciseVolumeSub')}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* 3-up stats row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { val: total, label: t('charts.totalSessions'), color: P500 },
            { val: peak, label: t('charts.peakDay'), color: '#10b981' },
            { val: `${consistency}%`, label: t('charts.consistency'), color: S500 },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xl font-bold tabular-nums md: leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium md: leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
            {t('charts.last13Days')}
          </p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
            {data.map((d, i) => {
              const v = n(d.value);
              const lvl = v === 0 ? 0 : v < 5 ? 1 : v < 10 ? 2 : v < 14 ? 3 : 4;
              return (
                <div
                  key={i}
                  title={`${d.date}: ${v}`}
                  className="aspect-square rounded-sm cursor-default transition-transform hover:scale-110"
                  style={{ background: heatShades[lvl] }}
                />
              );
            })}
          </div>
          {/* legend */}
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[10px] text-slate-300 me-0.5">↔</span>
            {heatShades.map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   REVIEW QUEUE
════════════════════════════════════════════════════════ */
const ReviewQueue = ({ data, t }) => {
  const [ref, inView] = useInView(0.1);
  const items = [
    { label: t('charts.weeklyReports'),  val: data.weeklyReportsPending,   icon: FileText,  color: P500,      bg: P50     },
    { label: t('charts.pendingVideos'),  val: data.videosPending,          icon: Activity,  color: S500,      bg: S50     },
    { label: t('charts.foodSuggestions'),val: data.foodSuggestionsPending, icon: Utensils,  color: '#10b981', bg: '#ecfdf5' },
  ];
  const anyPending = items.some(i => i.val > 0);

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={Clock}
          title={t('charts.reviewQueue')}
          subtitle={t('charts.reviewQueueSub')}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          right={
            anyPending ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Flame size={10} />
                {t('status.requiresAttention')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 size={10} />
                {t('status.allClear')}
              </span>
            )
          }
        />
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-transparent hover:border-slate-200 hover:bg-white transition-all group cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg" style={{ background: item.bg }}>
                  <item.icon size={13} style={{ color: item.color }} />
                </div>
                <span className="text-sm text-slate-600 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.val > 0
                  ? <span className="text-xl font-bold tabular-nums" style={{ color: item.color }}>{item.val}</span>
                  : <CheckCircle2 size={18} className="text-emerald-400" />
                }
                <ChevronRight size={13} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   TOP CONVERSATIONS
════════════════════════════════════════════════════════ */
const TopConversations = ({ data, t }) => {
  const [ref, inView] = useInView(0.1);
  const max = Math.max(...data.map(d => d.messages));
  const palette = [P500, '#7c3aed', S500, '#c084fc', '#ddd6fe'];
  const totalMsgs = data.reduce((s, d) => s + d.messages, 0);

  return (
    <div ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <Card className="p-5 h-full">
        <CardHeader
          icon={MessageSquare}
          title={t('charts.topConversations')}
          subtitle={t('charts.topConversationsSub')}
          right={
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums md: leading-none" style={{ color: P500 }}>{totalMsgs}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('charts.totalMessages')}</p>
            </div>
          }
        />
        <div className="space-y-3.5">
          {data.map((d, i) => (
            <div key={i} className="cursor-default">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: palette[i] }}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-600 font-medium">
                    {d.name || `${t('charts.conversation')} ${i + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold tabular-nums" style={{ color: palette[i] }}>{d.messages}</span>
                  <span className="text-[11px] text-slate-400">{t('charts.messages')}</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: inView ? `${(d.messages / max) * 100}%` : '0%',
                    background: palette[i],
                    transitionDelay: `${180 + i * 100}ms`,
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
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function DashboardPage({ PREVIEW = true, api: apiClient }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [data, setData] = useState(PREVIEW ? PREVIEW_DATA : null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [from] = useState('2026-02-28');
  const [to] = useState('2026-03-12');

  const fetchStats = useCallback(async () => {
    if (PREVIEW) return;
    setLoading(true); setErr('');
    try {
      const res = await apiClient.get('/admin/stats', { params: { from, to } });
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || t('error.loadFailed'));
      setData(null);
    } finally { setLoading(false); }
  }, [PREVIEW, apiClient, from, to, t]);

  useEffect(() => { if (!PREVIEW) fetchStats(); }, []);

  const { kpis, series, breakdowns, reviewsQueue } = data || {};

  /* KPI grid definition */
  const metricCards = kpis ? [
    { icon: Users,    label: t('kpi.totalClients'),     value: kpis.totalClients,          sub: t('kpi.totalClientsSub'),    accentColor: P500,       accentBg: 'bg-[var(--color-primary-50)]',   delay: 0   },
    { icon: Zap,      label: t('kpi.activeClients'),    value: kpis.activeClients,         sub: t('kpi.activeClientsSub'),   accentColor: '#10b981',  accentBg: 'bg-emerald-50',                  delay: 60  },
    { icon: UserPlus, label: t('kpi.newClients'),       value: kpis.newClients,            sub: t('kpi.newClientsSub'),      accentColor: S500,       accentBg: 'bg-[var(--color-secondary-50)]', delay: 120 },
    { icon: Bell,     label: t('kpi.notifications'),    value: kpis.unreadNotifications,   sub: t('kpi.notificationsSub'),   accentColor: '#f59e0b',  accentBg: 'bg-amber-50',                    delay: 180 },
    { icon: FileText, label: t('kpi.formSubmissions'),  value: kpis.formsSubmissions,      sub: t('kpi.formSubmissionsSub'), accentColor: '#0ea5e9',  accentBg: 'bg-sky-50',                      delay: 240 },
    { icon: XCircle,  label: t('kpi.churned'),          value: kpis.churnedThisRange,      sub: t('kpi.churnedSub'),         accentColor: '#ef4444',  accentBg: 'bg-rose-50',                     delay: 300 },
    { icon: BarChart2, label: t('kpi.assetsUploaded'),  value: kpis.assetsUploaded,        sub: t('kpi.assetsUploadedSub'), accentColor: '#8b5cf6',  accentBg: 'bg-violet-50',                   delay: 360 },
    { icon: Activity, label: t('kpi.pendingVideos'),    value: kpis.pendingExerciseVideos, sub: t('kpi.pendingVideosSub'),   accentColor: '#f97316',  accentBg: 'bg-orange-50',                   delay: 420 },
  ] : [];

  return (
    <div className="min-h-screen ">
 
      <div className="  space-y-5">
 
        {err && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            <div className="flex items-center gap-2"><AlertCircle size={15} />{err}</div>
            <button onClick={fetchStats} className="text-xs font-bold underline underline-offset-2">{t('error.retry')}</button>
          </div>
        )}

        {/* Page header — same PageHeader used across dashboard pages */}
        {kpis && (
          <PageHeader
            title={t('title')}
            desc={t('subtitle')}
            icon={Activity}
            stats={[
              { label: t('kpi.newClients'), value: kpis.newClients, icon: UserPlus },
              { label: t('kpi.notifications'), value: kpis.unreadNotifications, icon: Bell },
              { label: t('kpi.formSubmissions'), value: kpis.formsSubmissions, icon: FileText },
              { label: t('kpi.churned'), value: kpis.churnedThisRange, icon: XCircle },
            ]}
            actions={
              <button
                onClick={fetchStats}
                disabled={loading || PREVIEW}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: 'rgba(255,255,255,0.22)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3),0 4px 16px rgba(0,0,0,0.1)',
                }}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </button>
            }
          />
        )}

        {/* KPI grid — 4 cols on lg, 2 on sm */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {metricCards.map((c, i) => (
              <div key={i} className="lg:col-span-1 sm:col-span-1">
                <MetricCard {...c} />
              </div>
            ))}
          </div>
        )}

        {/* Row 2: Activity chart (2/3) + Membership (1/3) */}
        {series && breakdowns && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ActivityChart
              usersData={series.usersCreatedDaily}
              mealData={series.mealLogsDaily}
              exerciseData={series.exerciseVolumeDaily}
              t={t} locale={locale}
            />
            <MembershipCard data={breakdowns.membershipCounts} t={t} />
          </div>
        )}

        {/* Row 3: Meal bar (2/3) + Review queue (1/3) */}
        {series && reviewsQueue && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MealLogsBar data={series.mealLogsDaily} t={t} locale={locale} />
            <ReviewQueue data={reviewsQueue} t={t} />
          </div>
        )}

        {/* Row 4: Exercise heatmap + Conversations */}
        {series && breakdowns && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExerciseCard data={series.exerciseVolumeDaily} t={t} />
            <TopConversations data={breakdowns.messagesPerConversationTop5} t={t} />
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary-500)] animate-spin" />
              <div className="absolute inset-[5px] rounded-full border-2 border-transparent border-t-[var(--color-secondary-400)] animate-spin" style={{ animationDuration: '0.65s', animationDirection: 'reverse' }} />
            </div>
            <p className="text-slate-500 text-sm font-medium">{t('loading')}</p>
          </div>
        </div>
      )}
    </div>
  );
}