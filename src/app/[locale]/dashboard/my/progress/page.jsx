"use client"

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, TrendingUp, CheckCircle2, Clock4, Flame, Calendar, RefreshCw, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Filter, Download, Search } from "lucide-react";
import api from "@/utils/axios";
import { useUser } from "@/hooks/useUser";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

/* =====================================================
   Workouts Progress Dashboard ( /workouts/details ) – JS VERSION
   More powerful UI/UX: filters (date + exercise), moving averages, PR cards,
   export CSV, resilient fallbacks. Tailwind + Framer Motion + Recharts only.
===================================================== */

// ---- Helpers ----
const spring = { type: "spring", stiffness: 260, damping: 26 };
const fmtPct = n => `${Math.round((n ?? 0) * 100)}%`;
const k = n => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const epley1RM = (w, r) => (w && r ? Math.round(w * (1 + r / 30)) : 0);
const trend = (now, prev) => {
  if (!Number.isFinite(prev) || prev === 0) return { up: true, delta: 100 };
  const d = ((now - prev) / Math.max(1, Math.abs(prev))) * 100;
  return { up: d >= 0, delta: Math.abs(d) };
};
const addMA = (arr, key, period = 7) =>
  arr.map((p, i) => ({ ...p, [`${key}MA`]: i + 1 >= period ? Math.round(arr.slice(i - period + 1, i + 1).reduce((a, b) => a + (b[key] || 0), 0) / period) : null }));

// ---- Graceful API with fallbacks ----
async function fetchOverview(userId) {
  try {
    const { data } = await api.get("/prs/overview", { params: { userId } });
    return data;
  } catch {
    return {
      adherenceRate: 0.86,
      weeklyVolume: 20540,
      longestStreak: 11,
      avgSessionDuration: 62,
      topExercises: [
        { name: "Barbell Bench Press", volume: 5600, est1RM: 112 },
        { name: "Back Squat", volume: 7600, est1RM: 165 },
        { name: "Deadlift", volume: 5200, est1RM: 195 },
        { name: "Overhead Press", volume: 3100, est1RM: 60 },
      ],
      muscleRadar: [
        { muscle: "Chest", score: 84 },
        { muscle: "Back", score: 79 },
        { muscle: "Legs", score: 90 },
        { muscle: "Shoulders", score: 73 },
        { muscle: "Arms", score: 70 },
        { muscle: "Core", score: 65 },
      ],
    };
  }
}

async function fetchHistory(userId) {
  try {
    const { data } = await api.get("/prs/history", { params: { userId } });
    return data; // expects { volumeByDay[], sessions[], prs[] }
  } catch {
    const today = new Date();
    const days = [...Array(90)].map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (89 - i));
      const iso = d.toISOString().slice(0, 10);
      const volume = Math.max(0, Math.round(900 + Math.sin(i / 3) * 350 + (i % 5 === 0 ? 1100 : 0)));
      return { date: iso, volume };
    });
    const sessions = days.filter((_, i) => i % 2 === 0).map((d, i) => ({
      date: d.date,
      dayId: ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"][i % 7],
      volume: d.volume,
      durationMin: 48 + (i % 6) * 6,
      completedSets: 14 + (i % 3),
      plannedSets: 16,
      density: d.volume / (48 + (i % 6) * 6),
    }));
    const prs = [
      { exerciseName: "Barbell Bench Press", date: days[85].date, reps: 5, weight: 92 },
      { exerciseName: "Back Squat", date: days[80].date, reps: 3, weight: 145 },
      { exerciseName: "Deadlift", date: days[77].date, reps: 2, weight: 182 },
      { exerciseName: "Overhead Press", date: days[70].date, reps: 5, weight: 52 },
      { exerciseName: "Lat Pulldown", date: days[66].date, reps: 8, weight: 70 },
    ].map(p => ({ ...p, est1RM: epley1RM(p.weight, p.reps) }));
    return { volumeByDay: days, sessions, prs };
  }
}

// ---- Small UI bits ----
function Pill({ children }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">{children}</span>;
}

function Delta({ up, delta }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.round(delta)}%
    </span>
  );
}

function Card({ title, icon, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">{icon} {title}</div>
        <div>{right}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ---- Export helpers ----
function exportCSV(filename, rows) {
  const headers = Object.keys(rows[0] || {});
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ProgressDetailsPage() {
  const t = useTranslations("MyWorkouts");
  const user = useUser();
  const USER_ID = user?.id;

  // Data
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState(null);

  // Filters
  const [range, setRange] = useState(28); // days: 7, 28, 90
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [ov, hi] = await Promise.all([fetchOverview(USER_ID), fetchHistory(USER_ID)]);
      if (!mounted) return;
      setOverview(ov);
      setHistory(hi);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [USER_ID]);

  // Derived data
  const volSeriesFull = useMemo(() => (history?.volumeByDay || []), [history]);
  const volSeries = useMemo(() => addMA(volSeriesFull.slice(-range), "volume", 7), [volSeriesFull, range]);

  const sessionsFull = useMemo(() => history?.sessions || [], [history]);
  const sessions = useMemo(() => sessionsFull.slice(-Math.min(sessionsFull.length, Math.ceil(range / 2))), [sessionsFull, range]);

  const prsFull = useMemo(() => (history?.prs || []).map(p => ({ ...p, est1RM: p.est1RM ?? epley1RM(p.weight, p.reps) })), [history]);
  const prsFiltered = useMemo(() => (exerciseQuery ? prsFull.filter(p => p.exerciseName.toLowerCase().includes(exerciseQuery.toLowerCase())) : prsFull), [prsFull, exerciseQuery]);

  // Weekly trend calc (last 7 vs previous 7)
  const weekNow = useMemo(() => volSeriesFull.slice(-7), [volSeriesFull]);
  const weekPrev = useMemo(() => volSeriesFull.slice(-14, -7), [volSeriesFull]);
  const volNow = useMemo(() => weekNow.reduce((a, b) => a + (b.volume || 0), 0), [weekNow]);
  const volPrev = useMemo(() => weekPrev.reduce((a, b) => a + (b.volume || 0), 0), [weekPrev]);
  const volTrend = useMemo(() => trend(volNow, volPrev), [volNow, volPrev]);

  const topExerciseNames = useMemo(() => (overview?.topExercises || []).map(e => e.name), [overview]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100/70 bg-white/60 shadow-sm">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95" />
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)", backgroundSize: "22px 22px", backgroundPosition: "-1px -1px" }} />
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl" />
        </div>
        <div className="relative px-4 py-5 md:px-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-4xl font-semibold">Progress Dashboard</h1>
              <p className="text-white/85 mt-1">Track your strength, volume, and adherence over time.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] px-2 md:px-3 text-sm shadow">
                <Calendar size={16} />
                <button onClick={() => setRange(7)} className={`px-2 py-1 rounded-md ${range===7?"bg-white/20":"hover:bg-white/10"}`}>7d</button>
                <button onClick={() => setRange(28)} className={`px-2 py-1 rounded-md ${range===28?"bg-white/20":"hover:bg-white/10"}`}>28d</button>
                <button onClick={() => setRange(90)} className={`px-2 py-1 rounded-md ${range===90?"bg-white/20":"hover:bg-white/10"}`}>90d</button>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] px-2 md:px-3 text-sm shadow">
                <Search size={16} />
                <input value={exerciseQuery} onChange={e=>setExerciseQuery(e.target.value)} placeholder="Filter PRs by exercise" className="bg-transparent outline-none placeholder:text-white/70 w-36 md:w-56" />
              </div>
              <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] px-3 text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition">
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Adherence" icon={<CheckCircle2 size={16} className="text-emerald-600" />} right={<Pill>{fmtPct(overview?.adherenceRate)}</Pill>}>
          <div className="text-sm text-slate-600">Sessions completed vs. planned.</div>
          <div className="mt-3 h-24">
            <ResponsiveContainer>
              <AreaChart data={(history?.sessions || []).slice(-Math.max(14, Math.round(range/2))).map(s => ({ date: s.date, v: s.completedSets / Math.max(1, s.plannedSets) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAdh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 1]} />
                <Tooltip formatter={(v) => fmtPct(v)} />
                <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#gradAdh)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Weekly Volume" icon={<Flame size={16} className="text-orange-500" />} right={<Delta up={volTrend.up} delta={volTrend.delta} />}>
          <div className="text-2xl font-semibold text-slate-800">{k(volNow)} kg⋅reps</div>
          <div className="h-24 mt-2">
            <ResponsiveContainer>
              <BarChart data={[{ k: "Prev", val: volPrev }, { k: "Now", val: volNow }]}> 
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="k" />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="val" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Longest Streak" icon={<TrendingUp size={16} className="text-indigo-600" />} right={<Pill>{overview?.longestStreak ?? 0} days</Pill>}>
          <div className="text-sm text-slate-600">Most consecutive training days.</div>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {(history?.sessions || []).slice(-50).map((s, i) => (
              <div key={s.date + i} title={`${s.date} – ${s.completedSets>0?"trained":"rest"}`} className={`h-2.5 rounded ${s.completedSets>0?"bg-indigo-500":"bg-slate-200"}`}></div>
            ))}
          </div>
        </Card>

        <Card title="Avg. Session" icon={<Clock4 size={16} className="text-slate-600" />} right={<Pill>{overview?.avgSessionDuration ?? 0} min</Pill>}>
          <div className="text-sm text-slate-600">Typical time spent per session.</div>
          <div className="mt-3 h-24">
            <ResponsiveContainer>
              <LineChart data={(history?.sessions || []).slice(-Math.max(14, Math.round(range/2)))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="durationMin" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Volume Trend" icon={<Flame size={16} className="text-orange-500" />} right={<Pill>{range} days</Pill>}>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={volSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" fill="url(#gradVol)" strokeWidth={2} />
                <Line type="monotone" dataKey="volumeMA" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Muscle Group Balance" icon={<Dumbbell size={16} className="text-slate-700" />} right={<Pill>Score</Pill>}>
          <div className="h-64">
            <ResponsiveContainer>
              <RadarChart data={overview?.muscleRadar || []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="muscle" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Load" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Exercises" icon={<TrendingUp size={16} className="text-indigo-600" />} right={<Pill>By volume</Pill>}>
          <div className="space-y-3">
            {(overview?.topExercises || []).map(e => (
              <div key={e.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className="font-medium text-slate-800">{e.name}</div>
                <div className="text-sm text-slate-600 flex items-center gap-3">
                  <span className="font-semibold">{k(e.volume)}</span>
                  {e.est1RM ? <Pill>1RM ~ {e.est1RM} kg</Pill> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Personal Records – Cards + Table */}
      <Card title="Recent Personal Records" icon={<TrophyIcon />} right={
        <button onClick={() => exportCSV("prs.csv", prsFiltered)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
          <Download size={14} /> Export CSV
        </button>
      }>
        {/* PR cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {prsFiltered.slice(-6).reverse().map((p, i) => (
            <div key={p.exerciseName + p.date + i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">{p.date}</div>
              <div className="mt-1 font-semibold text-slate-800">{p.exerciseName}</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <div>Weight: <span className="font-medium">{p.weight ?? "-"} kg</span> × <span className="font-medium">{p.reps ?? "-"}</span></div>
                <Pill>1RM ~ {p.est1RM || "-"} kg</Pill>
              </div>
            </div>
          ))}
        </div>

        {/* PR table */}
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Exercise</th>
                <th className="py-2.5 px-3 font-semibold">Weight</th>
                <th className="py-2.5 px-3 font-semibold">Reps</th>
                <th className="py-2.5 px-3 font-semibold">Est. 1RM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prsFiltered.slice(-30).reverse().map((p, i) => (
                <tr key={p.exerciseName + p.date + i} className={i % 2 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="py-2.5 px-3">{p.date}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{p.exerciseName}</td>
                  <td className="py-2.5 px-3">{p.weight ?? "-"} kg</td>
                  <td className="py-2.5 px-3">{p.reps ?? "-"}</td>
                  <td className="py-2.5 px-3">{p.est1RM ? `${p.est1RM} kg` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Sessions */}
      <Card title="Recent Sessions" icon={<Calendar size={16} className="text-slate-700" />} right={
        <button onClick={() => setExpanded(v => !v)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? "Collapse" : "Expand"}
        </button>
      }>
        <AnimatePresence initial={false}>
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Day</th>
                    <th className="py-2.5 px-3 font-semibold">Volume</th>
                    <th className="py-2.5 px-3 font-semibold">Completed</th>
                    <th className="py-2.5 px-3 font-semibold">Duration</th>
                    <th className="py-2.5 px-3 font-semibold">Density</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.slice(-24).reverse().map((s, i) => (
                    <tr key={s.date + i} className={i % 2 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="py-2.5 px-3">{s.date}</td>
                      <td className="py-2.5 px-3">{s.dayId ?? "-"}</td>
                      <td className="py-2.5 px-3 font-medium">{k(s.volume)}</td>
                      <td className="py-2.5 px-3">{s.completedSets}/{s.plannedSets}</td>
                      <td className="py-2.5 px-3">{s.durationMin} min</td>
                      <td className="py-2.5 px-3">{s.density ? s.density.toFixed(1) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-white/40 backdrop-blur-sm grid place-items-center">
            <div className="inline-flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 border border-slate-200 shadow">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span className="text-slate-700 text-sm font-medium">Loading progress…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-500">
      <path d="M8 21h8M12 17c2.761 0 5-2.239 5-5V4H7v8c0 2.761 2.239 5 5 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
