// app/(admin)/dashboard/AdminDashboard.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'use-intl';
import api from '@/utils/axios';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import {
  Calendar, Users, FileText, Bell, Image as ImageIcon, Dumbbell, Flag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- preview toggle ----------
const PREVIEW = true; // set to false to use real API

// ---------- mock preview data (uses labelKey so we translate via t) ----------
const MOCK_DATA = {
  kpis: {
    totalClients: 1240,
    activeClients: 892,
    newClients: 86,
    churnedThisRange: 14,
    formsSubmissions: 212,
    unreadNotifications: 7,
    assetsUploaded: 156,
    pendingExerciseVideos: 11,
  },
  series: {
    usersCreatedDaily: [
      { date: '2025-10-26', value: 10 }, { date: '2025-10-27', value: 14 },
      { date: '2025-10-28', value: 11 }, { date: '2025-10-29', value: 18 },
      { date: '2025-10-30', value: 22 }, { date: '2025-10-31', value: 16 },
      { date: '2025-11-01', value: 20 }, { date: '2025-11-02', value: 19 },
      { date: '2025-11-03', value: 23 }, { date: '2025-11-04', value: 21 },
    ],
    exerciseVolumeDaily: [
      { date: '2025-10-26', value: 120 }, { date: '2025-10-27', value: 160 },
      { date: '2025-10-28', value: 150 }, { date: '2025-10-29', value: 180 },
      { date: '2025-10-30', value: 210 }, { date: '2025-10-31', value: 200 },
      { date: '2025-11-01', value: 230 }, { date: '2025-11-02', value: 220 },
      { date: '2025-11-03', value: 260 }, { date: '2025-11-04', value: 240 },
    ],
    mealLogsDaily: [
      { date: '2025-10-26', value: 85 }, { date: '2025-10-27', value: 92 },
      { date: '2025-10-28', value: 88 }, { date: '2025-10-29', value: 110 },
      { date: '2025-10-30', value: 120 }, { date: '2025-10-31', value: 98 },
      { date: '2025-11-01', value: 130 }, { date: '2025-11-02', value: 121 },
      { date: '2025-11-03', value: 136 }, { date: '2025-11-04', value: 129 },
    ],
  },
  breakdowns: {
    membershipCounts: [
      { labelKey: 'membership.basic', value: 420 },
      { labelKey: 'membership.pro', value: 560 },
      { labelKey: 'membership.elite', value: 180 },
      { labelKey: 'membership.trial', value: 80 },
    ],
    userStatusCounts: [
      { labelKey: 'status.active', value: 892 },
      { labelKey: 'status.idle', value: 210 },
      { labelKey: 'status.suspended', value: 45 },
      { labelKey: 'status.churned', value: 93 },
    ],
    messagesPerConversationTop5: [
      { conversationId: 'c1', nameKey: 'conv.nutritionQA', messages: 128 },
      { conversationId: 'c2', nameKey: 'conv.formSubmissions', messages: 96 },
      { conversationId: 'c3', nameKey: 'conv.workoutReviews', messages: 83 },
      { conversationId: 'c4', nameKey: 'conv.general', messages: 74 },
      { conversationId: 'c5', nameKey: 'conv.support', messages: 52 },
    ],
  },
  reviewsQueue: {
    weeklyReportsPending: 9,
    videosPending: 11,
    foodSuggestionsPending: 5,
  },
};

// ---------- motion utils ----------
const cn = (...c) => c.filter(Boolean).join(' ');
const spring = { type: 'spring', stiffness: 120, damping: 16, mass: 0.8 };
const fadeUp = (i = 0) => ({
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.05 * i, ...spring } },
});

// ---------- colors ----------
const INDIGO = '#6366f1';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const ROSE = '#ef4444';
const TEAL = '#06b6d4';
const VIOLET = '#8b5cf6';
const LIME = '#84cc16';
const PIE_COLORS = [INDIGO, EMERALD, AMBER, ROSE, VIOLET, TEAL, LIME];

// ---------- UI ----------
export function GlowCard({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:opacity-0 hover:before:opacity-100',
        'before:transition-opacity before:duration-300',
        'before:[box-shadow:inset_0_0_0_1px_rgba(99,102,241,.10),inset_0_40px_120px_-60px_rgba(99,102,241,.25)]',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function KPI({ icon, label, value, i = 0 }) {
  return (
    <GlowCard className="p-5">
      <motion.div variants={fadeUp(i)} initial="hidden" animate="show" className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center">
            {icon}
          </div>
          <div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-2xl font-semibold text-slate-900">{value}</div>
          </div>
        </div>
      </motion.div>
    </GlowCard>
  );
}

// ---------- page ----------
export default function AdminDashboard() {
  const t = useTranslations("dashboard");

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);

  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(iso(today));
  const [adminId, setAdminId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchStats = async () => {
    if (PREVIEW) {
      setData(MOCK_DATA);
      setErr('');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const params = { from, to };
      if (adminId.trim()) params.adminId = adminId.trim();
      const res = await api.get('/admin/stats', { params });
      setData(res.data);
    } catch (e) {
      setData(MOCK_DATA);
      setErr(t('error.previewFallback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // merge two daily series for bars
  const duoSeries = useMemo(() => {
    const ex = data?.series?.exerciseVolumeDaily || [];
    const meals = data?.series?.mealLogsDaily || [];
    const map = new Map();
    ex.forEach((p) => map.set(p.date, { date: p.date, exerciseVolume: p.value, mealLogs: 0 }));
    meals.forEach((p) => {
      const r = map.get(p.date) || { date: p.date, exerciseVolume: 0, mealLogs: 0 };
      r.mealLogs = p.value;
      map.set(p.date, r);
    });
    return Array.from(map.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [data]);

  // pies from breakdowns -> build translated names
  const membershipPie = useMemo(() => {
    const raw = data?.breakdowns?.membershipCounts || [];
    return raw.map((x, i) => ({
      name: x.labelKey ? t(x.labelKey) : (x.label ?? ''),
      value: x.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [data, t]);

  const statusPie = useMemo(() => {
    const raw = data?.breakdowns?.userStatusCounts || [];
    return raw.map((x, i) => ({
      name: x.labelKey ? t(x.labelKey) : (x.label ?? ''),
      value: x.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [data, t]);

  // radial gauge % active
  const activePct = useMemo(() => {
    const total = Number(data?.kpis?.totalClients || 0);
    const active = Number(data?.kpis?.activeClients || 0);
    return total ? Math.round((active / total) * 100) : 0;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-6">
      {/* Filters */}
      <GlowCard>
        <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('filters.from')}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label={t('filters.from')}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('filters.to')}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label={t('filters.to')}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('filters.adminOptional')}</label>
            <input
              type="text"
              placeholder={t('filters.adminPlaceholder')}
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64"
              aria-label={t('filters.adminOptional')}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={fetchStats}
            className="ms-auto rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700"
          >
            {PREVIEW ? t('filters.reloadPreview') : t('filters.apply')}
          </motion.button>
        </motion.div>
        <AnimatePresence>
          {err ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs text-rose-600 mt-2"
            >
              {err}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </GlowCard>

      {/* KPIs */}
      <motion.div initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI i={0} icon={<Users className="h-5 w-5 text-slate-700" />} label={t('kpi.totalClients')} value={data?.kpis?.totalClients ?? '—'} />
        <KPI i={1} icon={<Users className="h-5 w-5 text-emerald-600" />} label={t('kpi.activeClients')} value={data?.kpis?.activeClients ?? '—'} />
        <KPI i={2} icon={<Calendar className="h-5 w-5 text-indigo-600" />} label={t('kpi.newInRange')} value={data?.kpis?.newClients ?? '—'} />
        <KPI i={3} icon={<Flag className="h-5 w-5 text-rose-600" />} label={t('kpi.churned')} value={data?.kpis?.churnedThisRange ?? '—'} />
        <KPI i={4} icon={<FileText className="h-5 w-5 text-slate-700" />} label={t('kpi.formSubmissions')} value={data?.kpis?.formsSubmissions ?? '—'} />
        <KPI i={5} icon={<Bell className="h-5 w-5 text-amber-500" />} label={t('kpi.unreadNotices')} value={data?.kpis?.unreadNotifications ?? '—'} />
        <KPI i={6} icon={<ImageIcon className="h-5 w-5 text-slate-700" />} label={t('kpi.assetsUploaded')} value={data?.kpis?.assetsUploaded ?? '—'} />
        <KPI i={7} icon={<Dumbbell className="h-5 w-5 text-slate-700" />} label={t('kpi.pendingVideos')} value={data?.kpis?.pendingExerciseVideos ?? '—'} />
      </motion.div>

      {/* Existing Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-3 text-sm font-medium text-slate-800">
            {t('charts.usersCreatedDaily.title')}
          </motion.div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={data?.series?.usersCreatedDaily ?? []}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopOpacity={0.3} />
                    <stop offset="95%" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke={INDIGO} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlowCard>

        <GlowCard>
          <motion.div variants={fadeUp(1)} initial="hidden" animate="show" className="mb-3 text-sm font-medium text-slate-800">
            {t('charts.duo.title')}
          </motion.div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={duoSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="exerciseVolume" name={t('charts.duo.exerciseVolume')} radius={[8, 8, 0, 0]} fill={INDIGO} />
                <Bar dataKey="mealLogs" name={t('charts.duo.mealLogs')} radius={[8, 8, 0, 0]} fill={EMERALD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlowCard>
      </div>

      {/* CIRCULAR CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Donut: Memberships */}
        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-2 text-sm font-medium text-slate-800">
            {t('donuts.memberships.title')}
          </motion.div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={membershipPie}
                  innerRadius={60}
                  outerRadius={82}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={6}
                >
                  {membershipPie.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {membershipPie.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                  <span className="text-slate-600">{m.name}</span>
                </div>
                <span className="font-medium">{m.value}</span>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Donut: User Status */}
        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-2 text-sm font-medium text-slate-800">
            {t('donuts.status.title')}
          </motion.div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusPie}
                  innerRadius={60}
                  outerRadius={82}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={6}
                >
                  {statusPie.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {statusPie.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                  <span className="text-slate-600">{m.name}</span>
                </div>
                <span className="font-medium">{m.value}</span>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Radial Gauge: Active Clients % */}
        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-2 text-sm font-medium text-slate-800">
            {t('gauge.activeRate.title')}
          </motion.div>
          <div className="h-56">
            <ResponsiveContainer>
              <RadialBarChart
                innerRadius="68%"
                outerRadius="100%"
                data={[{ name: t('gauge.activeRate.tooltip'), value: activePct, fill: EMERALD }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={8} />
                <Tooltip formatter={(v) => [`${v}%`, t('gauge.activeRate.tooltip')]} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-12">
            <div className="text-2xl font-semibold text-slate-900">{activePct}%</div>
            <div className="text-xs text-slate-500">{t('gauge.activeRate.caption')}</div>
          </div>
        </GlowCard>
      </div>

      {/* Text breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-2 text-sm font-medium text-slate-800">
            {t('list.memberships.title')}
          </motion.div>
          <ul className="space-y-1">
            {(data?.breakdowns?.membershipCounts ?? []).map((x, i) => (
              <motion.li key={i} variants={fadeUp(i)} initial="hidden" animate="show" className="flex justify-between text-sm">
                <span className="text-slate-700">{x.labelKey ? t(x.labelKey) : (x.label ?? '')}</span>
                <span className="font-semibold text-slate-900">{x.value}</span>
              </motion.li>
            ))}
          </ul>
        </GlowCard>

        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-2 text-sm font-medium text-slate-800">
            {t('list.status.title')}
          </motion.div>
          <ul className="space-y-1">
            {(data?.breakdowns?.userStatusCounts ?? []).map((x, i) => (
              <motion.li key={i} variants={fadeUp(i)} initial="hidden" animate="show" className="flex justify-between text-sm">
                <span className="text-slate-700">{x.labelKey ? t(x.labelKey) : (x.label ?? '')}</span>
                <span className="font-semibold text-slate-900">{x.value}</span>
              </motion.li>
            ))}
          </ul>
        </GlowCard>

        <GlowCard>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="mb-2 text-sm font-medium text-slate-800">
            {t('list.topConversations.title')}
          </motion.div>
          <ul className="space-y-1">
            {(data?.breakdowns?.messagesPerConversationTop5 ?? []).map((c, i) => (
              <motion.li key={c.conversationId} variants={fadeUp(i)} initial="hidden" animate="show" className="flex justify-between text-sm">
                <span className="text-slate-700 truncate">{c.nameKey ? t(c.nameKey) : (c.name ?? c.conversationId)}</span>
                <span className="font-semibold text-slate-900">{c.messages}</span>
              </motion.li>
            ))}
          </ul>
        </GlowCard>
      </div>

      {/* Review Queue */}
      <GlowCard>
        <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="text-sm font-medium text-slate-800 mb-2">
          {t('review.title')}
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: t('review.weeklyReports'), value: data?.reviewsQueue?.weeklyReportsPending ?? '—' },
            { label: t('review.videos'), value: data?.reviewsQueue?.videosPending ?? '—' },
            { label: t('review.foodSuggestions'), value: data?.reviewsQueue?.foodSuggestionsPending ?? '—' },
          ].map((q, i) => (
            <motion.div key={q.label} variants={fadeUp(i)} initial="hidden" animate="show" className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs text-slate-500">{q.label}</div>
              <div className="text-2xl font-semibold text-slate-900">{q.value}</div>
            </motion.div>
          ))}
        </div>
      </GlowCard>

      {/* Overlay loader */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/50 backdrop-blur grid place-items-center z-50"
          >
            <motion.div
              className="h-6 w-6 border-2 border-slate-300 border-t-indigo-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
