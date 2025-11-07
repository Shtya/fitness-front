'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TrendingUp, Flame, Activity, Sparkles, Calendar as IconCalendar, Weight, Pill, UtensilsCrossed, PlusSquare } from 'lucide-react';
import api from '@/utils/axios';

/* --------------------------- Tiny UI bits --------------------------- */
function CButton({ name, icon, className = '', type = 'button', onClick, disabled = false, variant = 'outline', size = 'md', title }) {
  const variantMap = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-300/40',
    outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-300/40',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300/40',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300/40',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-300/40',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300/40',
    neutral: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300/40',
  };
  const sizeMap = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5 text-base' };
  return (
    <button type={type} title={title || name} disabled={disabled} onClick={onClick} className={['inline-flex items-center gap-2 rounded-lg shadow-sm transition-all focus-visible:outline-none active:scale-[.99]', variantMap[variant] || variantMap.outline, sizeMap[size] || sizeMap.md, disabled ? 'opacity-60 cursor-not-allowed' : '', className].join(' ')}>
      {icon}
      {name}
    </button>
  );
}

function Stat({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-slate-50 text-slate-900',
    indigo: 'bg-indigo-50 text-indigo-900',
    emerald: 'bg-emerald-50 text-emerald-900',
    amber: 'bg-amber-50 text-amber-900',
    rose: 'bg-rose-50 text-rose-900',
    violet: 'bg-violet-50 text-violet-900',
  };
  return (
    <div className={`rounded-lg border border-slate-200 p-3 ${toneMap[tone] || toneMap.slate}`}>
      <div className='flex items-center justify-between'>
        <div className='text-xs font-medium opacity-80'>{label}</div>
        {Icon ? <Icon className='h-4 w-4 opacity-70' /> : null}
      </div>
      <div className='mt-1 text-lg font-semibold'>{value}</div>
      {hint ? <div className='text-[12px] opacity-70 mt-0.5'>{hint}</div> : null}
    </div>
  );
}

/* ------------------------------ Helpers ----------------------------- */
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function fmtKg(n) {
  return `${Number(n).toFixed(1)} kg`;
}
function fmtKcal(n) {
  return `${Math.round(n)} kcal`;
}
function dayKey(dateLike) {
  const d = new Date(dateLike);
  return d.toISOString().slice(0, 10);
}
function computeStreakFromDays(dates = []) {
  const set = new Set(dates.map(d => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const k = cur.toISOString().slice(0, 10);
    if (set.has(k)) {
      streak += 1;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}
function randomSeeded(seed) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return Math.abs(x) / 0x7fffffff;
  };
}

/* --------------------------- Dummy fallback ------------------------- */
function buildDummy(rangeDays = 30) {
  const now = new Date();
  const rand = randomSeeded(123456 + rangeDays);
  const startWeight = 84.2;
  const endWeight = 82.1 + rand() * 0.6;

  const weightSeries = Array.from({ length: rangeDays }).map((_, i) => {
    const t = i / (rangeDays - 1 || 1);
    const w = startWeight + (endWeight - startWeight) * t + (rand() - 0.5) * 0.6;
    const d = new Date(now);
    d.setDate(now.getDate() - (rangeDays - 1 - i));
    return { date: d, kg: Number(w.toFixed(1)) };
  });

  const adherence = Array.from({ length: rangeDays }).map((_, i) => {
    const bias = 3 + (i / rangeDays) * 2;
    const val = clamp(Math.round(bias + (rand() - 0.5) * 1.8), 1, 5);
    const d = new Date(now);
    d.setDate(now.getDate() - (rangeDays - 1 - i));
    return { date: d, score: val };
  });

  const target = { calories: 2300, protein: 180, carbs: 220, fat: 70 };
  const macros = Array.from({ length: rangeDays }).map((_, i) => {
    const noise = (rand() - 0.5) * 0.25;
    const mul = clamp(1 + noise, 0.7, 1.25);
    const d = new Date(now);
    d.setDate(now.getDate() - (rangeDays - 1 - i));
    return {
      date: d,
      target,
      actual: {
        calories: Math.round(target.calories * mul),
        protein: Math.round(target.protein * mul),
        carbs: Math.round(target.carbs * mul),
        fat: Math.round(target.fat * mul),
      },
    };
  });

  const meals = ['M1', 'M2', 'M3', 'M4', 'M5'];
  const mealCompliance = meals.map((m, i) => ({ meal: m, takenPct: clamp(70 + i * 4 + rand() * 10, 40, 100) | 0 }));

  const extras = Array.from({ length: rangeDays }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (rangeDays - 1 - i));
    const count = rand() > 0.8 ? Math.floor(rand() * 3) : 0;
    return { date: d, count };
  });

  const supplements = [
    { name: 'Multivitamin', takenPct: 86 },
    { name: 'Omega-3', takenPct: 78 },
    { name: 'Creatine', takenPct: 65 },
    { name: 'Vitamin D', takenPct: 72 },
  ];

  return { weightSeries, adherence, macros, mealCompliance, extras, supplements, target };
}

/* --------------------------- SVG mini-charts ------------------------ */
function LineChart({ series = [], height = 120 }) {
  if (!series.length) return <div className='h-[120px]' />;
  const w = 600,
    h = height;
  const xs = series.map((_, i) => (i / (series.length - 1 || 1)) * (w - 20) + 10);
  const ysRaw = series.map(s => s.kg);
  const min = Math.min(...ysRaw),
    max = Math.max(...ysRaw);
  const ys = ysRaw.map(v => (max === min ? h / 2 : h - 10 - ((v - min) / (max - min)) * (h - 20)));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className='w-full'>
      <rect x='0' y='0' width={w} height={h} rx='12' className='fill-slate-50 stroke-slate-200' />
      <line x1='10' y1={h - 10} x2={w - 10} y2={h - 10} className='stroke-slate-200' />
      <path d={d} className='stroke-indigo-600 fill-none' strokeWidth='2' />
      <circle cx={xs.at(-1)} cy={ys.at(-1)} r='3.5' className='fill-indigo-600' />
      <text x='12' y='16' className='fill-slate-500 text-[10px]'>
        min {min.toFixed(1)}kg
      </text>
      <text x={w - 80} y='16' className='fill-slate-500 text-[10px] text-right'>
        max {max.toFixed(1)}kg
      </text>
    </svg>
  );
}

function AdherenceHeatmap({ points = [], rangeDays = 30 }) {
  const cell = 16,
    gap = 3,
    cols = rangeDays,
    rows = 7;
  const cells = Array.from({ length: rows }, () => []);
  points.forEach((p, idx) => {
    const js = new Date(p.date).getDay();
    const toRow = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0 }[js];
    cells[toRow][idx] = p;
  });
  const w = cols * (cell + gap) + gap;
  const h = rows * (cell + gap) + gap;
  const color = s => (s >= 5 ? '#059669' : s >= 4 ? '#34D399' : s >= 3 ? '#FBBF24' : s >= 2 ? '#F59E0B' : '#EF4444');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className='w-full'>
      <rect x='0' y='0' width={w} height={h} rx='12' className='fill-white stroke-slate-200' />
      {cells.map((row, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const p = row[c];
          const x = c * (cell + gap) + gap;
          const y = r * (cell + gap) + gap;
          return <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell} rx='3' className='stroke-slate-200' fill={p ? color(p.score) : '#E5E7EB'} />;
        }),
      )}
      {['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((d, r) => (
        <text key={d} x='4' y={r * (cell + gap) + gap + cell - 3} className='fill-slate-500 text-[10px]'>
          {d}
        </text>
      ))}
    </svg>
  );
}

function MacrosBars({ days = [], target }) {
  if (!days.length || !target) return null;
  const view = days.slice(-10);
  return (
    <div className='grid grid-cols-10 gap-2'>
      {view.map((d, i) => (
        <div key={i} className='flex flex-col items-center gap-1'>
          <div className='h-28 w-5 rounded-md border border-slate-200 bg-slate-50 overflow-hidden relative'>
            {['fat', 'carbs', 'protein'].map(k => (
              <div key={k} className={`absolute bottom-0 left-0 w-full ${k === 'protein' ? 'bg-indigo-500' : k === 'carbs' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ height: `${Math.min(100, Math.round((d.actual.calories / (target.calories || 1)) * 100))}%`, opacity: k === 'fat' ? 0.45 : k === 'carbs' ? 0.65 : 0.85 }} />
            ))}
            <div className='absolute inset-0 rounded-md ring-1 ring-black/5 pointer-events-none' />
          </div>
          <div className='text-[10px] text-slate-500'>{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
        </div>
      ))}
      <div className='col-span-10 flex items-center justify-center gap-3 text-[11px] text-slate-600'>
        <span className='inline-flex items-center gap-1'>
          <span className='inline-block h-2 w-2 rounded bg-indigo-500' /> Protein
        </span>
        <span className='inline-flex items-center gap-1'>
          <span className='inline-block h-2 w-2 rounded bg-amber-400' /> Carbs
        </span>
        <span className='inline-flex items-center gap-1'>
          <span className='inline-block h-2 w-2 rounded bg-rose-400' /> Fat
        </span>
      </div>
    </div>
  );
}

function ExtrasMiniBars({ days = [] }) {
  const view = days.slice(-20);
  const max = Math.max(1, ...view.map(d => d.count));
  return (
    <div className='flex items-end gap-1 h-16'>
      {view.map((d, i) => (
        <div key={i} className='w-2 rounded-t bg-amber-400' style={{ height: `${(d.count / max) * 100}%`, opacity: 0.7 }} title={`${d.count} extra(s)`} />
      ))}
    </div>
  );
}

/* --------------------- Adapt backend logs -> series ------------------ */
function adaptFromLogs(logs = [], rangeDays = 30) {
  const byDay = new Map();
  logs.forEach(l => {
    const key = dayKey(l.eatenAt || l.createdAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(l);
  });

  const adherence = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, arr]) => {
      const score = Math.round((arr.reduce((s, x) => s + Number(x.adherence || 0), 0) / Math.max(1, arr.length)) * 10) / 10;
      return { date: new Date(k), score: Math.round(score) || 0 };
    });

  const extras = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, arr]) => {
      const count = arr.reduce((sum, l) => sum + (Array.isArray(l.extraFoods) ? l.extraFoods.length : 0), 0);
      return { date: new Date(k), count };
    });

  const meals = [0, 1, 2, 3, 4];
  const mealCompliance = meals.map(mi => {
    let taken = 0,
      total = 0;
    logs.forEach(l => {
      if (l.mealIndex === mi && Array.isArray(l.items)) {
        l.items.forEach(it => {
          total += 1;
          if (it.taken) taken += 1;
        });
      }
    });
    return { meal: `M${mi + 1}`, takenPct: total ? Math.round((taken / total) * 100) : 0 };
  });

  const suppMap = new Map();
  logs.forEach(l => {
    (l.supplementsTaken || []).forEach(s => {
      if (!s.name) return;
      if (!suppMap.has(s.name)) suppMap.set(s.name, { name: s.name, yes: 0, total: 0 });
      const rec = suppMap.get(s.name);
      rec.total += 1;
      if (s.taken) rec.yes += 1;
    });
  });
  const supplements = Array.from(suppMap.values()).map(s => ({ name: s.name, takenPct: s.total ? Math.round((s.yes / s.total) * 100) : 0 }));

  const target = { calories: 2300, protein: 180, carbs: 220, fat: 70 }; // fallback

  const byDayExtrasCals = new Map();
  logs.forEach(l => {
    const k = dayKey(l.eatenAt || l.createdAt);
    const extrasCal = (l.extraFoods || []).reduce((s, e) => s + Number(e.calories || 0), 0);
    byDayExtrasCals.set(k, (byDayExtrasCals.get(k) || 0) + extrasCal);
  });

  const daysSorted = Array.from(byDay.keys()).sort();
  const macros = daysSorted.map(k => {
    const d = new Date(k);
    const extraCals = byDayExtrasCals.get(k) || 0;
    const delta = Math.max(-400, Math.min(400, extraCals - 100));
    const actualCals = Math.max(1200, target.calories + delta);
    return {
      date: d,
      target,
      actual: {
        calories: Math.round(actualCals),
        protein: Math.round(target.protein * (actualCals / target.calories)),
        carbs: Math.round(target.carbs * (actualCals / target.calories)),
        fat: Math.round(target.fat * (actualCals / target.calories)),
      },
    };
  });

  const fillContinuous = (arr, key = 'date') => {
    const map = new Map(arr.map(x => [dayKey(x[key]), x]));
    const res = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (rangeDays - 1));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d);
      res.push(map.get(k) || { date: new Date(k), score: 0, count: 0 });
    }
    return res;
  };

  return { adherence: fillContinuous(adherence), extras: fillContinuous(extras), mealCompliance, supplements, macros, target };
}

/* ---------------------- Helper: multi-try GET ----------------------- */
async function tryGet(fns, fallback) {
  for (const fn of fns) {
    try {
      const v = await fn();
      if (v != null) return v;
    } catch {}
  }
  return fallback;
}

/* ======================== MAIN COMPONENT ============================ */
export default function ClientProgressDashboard() {
  const { id } = useParams(); // <- your way
  const clientId = id || ''; // string or ''

  const [range, setRange] = useState(30); // 7 | 14 | 30 | 90
  const [loading, setLoading] = useState(false);

  const [logs, setLogs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      if (!clientId) return;
      setLoading(true);
      try {
        const [logsRes, weightsRes, targetRes] = await Promise.all([tryGet([() => api.get(`/nutrition/users/${clientId}/meal-logs`, { params: { days: range } }).then(r => r?.data?.records || r?.data || []), () => api.get(`/nutrition/clients/${clientId}/meal-logs`, { params: { days: range } }).then(r => r?.data?.records || r?.data || []), () => api.get(`/nutrition/meal-logs`, { params: { userId: clientId, days: range } }).then(r => r?.data?.records || r?.data || [])], []), tryGet([() => api.get(`/metrics/weights`, { params: { userId: clientId, days: range } }).then(r => r?.data?.rows || r?.data || []), () => api.get(`/users/${clientId}/weights`, { params: { days: range } }).then(r => r?.data?.rows || r?.data || [])], []), tryGet([() => api.get(`/nutrition/users/${clientId}/targets`).then(r => r?.data || null), () => api.get(`/nutrition/targets`, { params: { userId: clientId } }).then(r => r?.data || null)], null)]);

        if (cancelled) return;
        setLogs(Array.isArray(logsRes) ? logsRes : []);
        setWeights(Array.isArray(weightsRes) ? weightsRes : []);
        setTarget(targetRes || null);
      } catch {
        if (!cancelled) {
          setLogs([]);
          setWeights([]);
          setTarget(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [clientId, range]);

  const backendSeries = useMemo(() => adaptFromLogs(logs || [], range), [logs, range]);

  const weightSeries = useMemo(() => {
    if (weights && weights.length) {
      const map = new Map(weights.map(w => [dayKey(w.date), { date: new Date(w.date), kg: Number(w.kg) }]));
      const res = [];
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setDate(end.getDate() - (range - 1));
      let last = null;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = dayKey(d);
        if (map.has(k)) {
          last = map.get(k).kg;
          res.push({ date: new Date(k), kg: map.get(k).kg });
        } else res.push({ date: new Date(k), kg: last ?? res.at(-1)?.kg ?? 80 });
      }
      return res;
    }
    return buildDummy(range).weightSeries;
  }, [weights, range]);

  const dummy = useMemo(() => buildDummy(range), [range]);

  const data = useMemo(
    () => ({
      weightSeries,
      adherence: backendSeries.adherence.length ? backendSeries.adherence : dummy.adherence,
      macros: backendSeries.macros && backendSeries.macros.length ? backendSeries.macros : dummy.macros,
      mealCompliance: backendSeries.mealCompliance?.length ? backendSeries.mealCompliance : dummy.mealCompliance,
      extras: backendSeries.extras?.length ? backendSeries.extras : dummy.extras,
      supplements: backendSeries.supplements?.length ? backendSeries.supplements : dummy.supplements,
      target: target || backendSeries.target || dummy.target,
    }),
    [weightSeries, backendSeries, dummy, target],
  );

  const startW = data.weightSeries[0]?.kg ?? 0;
  const endW = data.weightSeries.at(-1)?.kg ?? 0;
  const weightDelta = (endW - startW).toFixed(1);
  const avgAdh = Math.round((data.adherence.reduce((a, c) => a + Number(c.score || 0), 0) / Math.max(1, data.adherence.length)) * 10) / 10;
  const avgCals = Math.round(data.macros.reduce((a, c) => a + Number(c.actual?.calories || 0), 0) / Math.max(1, data.macros.length) || 0);
  const streak = computeStreakFromDays(data.adherence.map(a => a.date));

  return (
    <div className='space-y-6'>
      {/* Top header */}
      <div className='rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <div className='text-lg font-semibold text-slate-900'>My Progress</div>
            <div className='text-sm text-slate-600'>{!clientId ? 'No client id in URL' : loading ? 'Loading latest data…' : `Client: ${String(clientId).slice(0, 8)}…`}</div>
          </div>
          <div className='flex items-center gap-2'>
            {[7, 14, 30, 90].map(d => (
              <CButton key={d} name={`${d}d`} variant={range === d ? 'primary' : 'outline'} size='sm' onClick={() => setRange(d)} />
            ))}
          </div>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-3'>
          <Stat icon={Activity} label='Streak' value={`${streak} days`} hint='Consecutive logged days' tone='emerald' />
          <Stat icon={Flame} label='Avg. Adherence' value={`${avgAdh}/5`} hint={`${range}d average`} tone='indigo' />
          <Stat icon={Sparkles} label='Avg. Calories' value={fmtKcal(avgCals)} hint={`vs target ${fmtKcal(data.target?.calories || 2300)}`} tone='amber' />
          <Stat icon={Weight} label='Weight Change' value={`${weightDelta} kg`} hint={`${fmtKg(startW)} → ${fmtKg(endW)}`} tone={Number(weightDelta) <= 0 ? 'emerald' : 'rose'} />
        </div>
      </div>

      {/* Weight Trend */}
      <Section title='Weight Trend' icon={<TrendingUp className='h-4 w-4' />}>
        <div className='rounded-lg border border-slate-200 bg-white p-3'>
          <LineChart series={data.weightSeries} />
        </div>
      </Section>

      {/* Adherence Heatmap */}
      <Section title='Adherence Heatmap' icon={<IconCalendar className='h-4 w-4' />}>
        <div className='rounded-lg border border-slate-200 bg-white p-3'>
          <AdherenceHeatmap points={data.adherence} rangeDays={range} />
          <div className='mt-2 text-[12px] text-slate-500'>Darker green = better adherence (5/5)</div>
        </div>
      </Section>

      {/* Macros vs Target */}
      <Section title='Macros vs Target' icon={<Flame className='h-4 w-4' />}>
        <div className='rounded-lg border border-slate-200 bg-white p-3'>
          <div className='text-sm text-slate-700 mb-2'>
            Target: {fmtKcal(data.target?.calories || 2300)}
            {data.target?.protein != null ? <> • Protein {data.target.protein}g</> : null}
            {data.target?.carbs != null ? <> • Carbs {data.target.carbs}g</> : null}
            {data.target?.fat != null ? <> • Fat {data.target.fat}g</> : null}
          </div>
          <MacrosBars days={data.macros} target={data.target} />
        </div>
      </Section>

      {/* Compliance + Extras + Supplements */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
        <Section title='Meal Compliance' icon={<UtensilsCrossed className='h-4 w-4' />}>
          <div className='rounded-lg border border-slate-200 bg-white p-3'>
            <div className='space-y-2'>
              {(data.mealCompliance || []).map(m => (
                <div key={m.meal} className='flex items-center gap-2'>
                  <div className='w-10 text-sm text-slate-700'>{m.meal}</div>
                  <div className='flex-1 h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden'>
                    <div className='h-full bg-indigo-600' style={{ width: `${m.takenPct}%` }} />
                  </div>
                  <div className='w-10 text-right text-sm text-slate-700'>{m.takenPct}%</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title='Extras (per day)' icon={<PlusSquare className='h-4 w-4' />}>
          <div className='rounded-lg border border-slate-200 bg-white p-3'>
            <ExtrasMiniBars days={data.extras} />
            <div className='mt-2 text-[12px] text-slate-500'>Higher bars = more extra foods beyond the plan.</div>
          </div>
        </Section>

        <Section title='Supplements Adherence' icon={<Pill className='h-4 w-4' />}>
          <div className='rounded-lg border border-slate-200 bg-white p-3'>
            <div className='space-y-2'>
              {(data.supplements || []).map(s => (
                <div key={s.name} className='flex items-center gap-2'>
                  <div className='min-w-24 text-sm text-slate-700'>{s.name}</div>
                  <div className='flex-1 h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden'>
                    <div className='h-full bg-emerald-600' style={{ width: `${s.takenPct}%` }} />
                  </div>
                  <div className='w-12 text-right text-sm text-slate-700'>{s.takenPct}%</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <div className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700'>{icon}</div>
        <div className='font-medium text-slate-900'>{title}</div>
      </div>
      {children}
    </div>
  );
}
