'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  LineChart as LineIcon,
  Ruler,
  Image as ImageIcon,
  UploadCloud,
  Plus,
  Trash2,
  Info,
  Flame,
  Dumbbell,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';

// Recharts (already allowed in your stack)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, BarChart, Bar,
} from 'recharts';

/* =================== PERSISTENCE KEYS =================== */
const LS_HISTORY = 'mw.history';                 // sessions history
const LS_NUTRITION = 'mw.nutri.state.v1';        // nutrition day state
const LS_PRS = 'mw.prs';                         // PRs
const LS_CALC = 'mw.calorie.calc.v1';            // calculator snapshot

// New keys for progress page
const LS_PROGRESS_WEIGHTS = 'mw.progress.weights.v1';       // [{date: 'YYYY-MM-DD', kg: number}]
const LS_PROGRESS_MEAS = 'mw.progress.measurements.v1';     // [{date, chest, waist, hips, thigh, arm}]
const LS_PROGRESS_PHOTOS = 'mw.progress.photos.v1';         // [{date, url, note?}]

/* =================== HELPERS =================== */
const spring = { type: 'spring', stiffness: 220, damping: 26 };
function loadLS(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
const fmt = (n, d=1) => (n==null || isNaN(n) ? '—' : Number(n).toFixed(d));
const today = () => new Date().toISOString().slice(0,10);

/* ----- adherence helpers ----- */
const weekOrder = ['saturday','sunday','monday','tuesday','wednesday','thursday'];
function lastNDates(n) {
  const arr = [];
  const now = new Date();
  for (let i=0;i<n;i++){
    const d = new Date(now); d.setDate(now.getDate()-i);
    arr.push(d.toISOString().slice(0,10));
  }
  return arr.reverse();
}
function pct(n, d) { return d ? Math.round((n/d)*100) : 0; }

/* =================== SMALL UI =================== */
function Card({children, className=''}) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>;
}
function Section({icon:Icon, title, action, children}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={18} className="text-slate-700" /> : null}
          <div className="font-semibold">{title}</div>
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}
function Hint({ text }) {
  return (
    <span className="relative inline-flex items-center group ml-1">
      <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" aria-label="Help">
        <Info size={12} />
      </button>
      <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-[240px] rounded-md border border-slate-200 bg-white p-2 text-[11.5px] text-slate-700 shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition">
        {text}
      </div>
    </span>
  );
}

/* =================== PAGE =================== */
export default function MyProgressPage() {
  const [hydrated, setHydrated] = useState(false);

  // Source data (read-only)
  const [history, setHistory] = useState([]);
  const [nutri, setNutri] = useState({});
  const [prs, setPRs] = useState({});
  const [calc, setCalc] = useState(null);

  // Progress data (editable)
  const [weights, setWeights] = useState([]);
  const [meas, setMeas] = useState([]);
  const [photos, setPhotos] = useState([]);

  // Form states
  const [wDate, setwDate] = useState(today());
  const [wKg, setwKg] = useState('');

  const [mDate, setmDate] = useState(today());
  const [mVals, setmVals] = useState({ chest:'', waist:'', hips:'', thigh:'', arm:'' });

  const [pDate, setpDate] = useState(today());
  const [pUrl, setpUrl] = useState('');
  const [pNote, setpNote] = useState('');

  useEffect(() => {
    setHydrated(true);
    setHistory(loadLS(LS_HISTORY, []));
    setNutri(loadLS(LS_NUTRITION, {}));
    setPRs(loadLS(LS_PRS, {}));
    setCalc(loadLS(LS_CALC, null));
    setWeights(loadLS(LS_PROGRESS_WEIGHTS, []));
    setMeas(loadLS(LS_PROGRESS_MEAS, []));
    setPhotos(loadLS(LS_PROGRESS_PHOTOS, []));
  }, []);

  useEffect(() => saveLS(LS_PROGRESS_WEIGHTS, weights), [weights]);
  useEffect(() => saveLS(LS_PROGRESS_MEAS, meas), [meas]);
  useEffect(() => saveLS(LS_PROGRESS_PHOTOS, photos), [photos]);

  /* ---------- Derived: Weight trend ---------- */
  const weightSeries = useMemo(() => {
    const sorted = [...weights].sort((a,b)=>a.date.localeCompare(b.date));
    return sorted.map(w => ({ date: w.date, kg: +w.kg }));
  }, [weights]);

  const currWeight = weightSeries.at(-1)?.kg ?? null;
  const wkAgo = weightSeries.slice(-8, -7)[0]?.kg ?? null;
  const moAgo = weightSeries.slice(-31, -30)[0]?.kg ?? null;
  const delta7 = currWeight!=null && wkAgo!=null ? currWeight - wkAgo : null;
  const delta30 = currWeight!=null && moAgo!=null ? currWeight - moAgo : null;

  /* ---------- Derived: Measurements trend (waist as primary) ---------- */
  const measSeries = useMemo(() => {
    const sorted = [...meas].sort((a,b)=>a.date.localeCompare(b.date));
    return sorted.map(m => ({ date: m.date, waist: +m.waist || null, chest: +m.chest || null, hips: +m.hips || null }));
  }, [meas]);
  const currWaist = measSeries.at(-1)?.waist ?? null;
  const waist30 = measSeries.slice(-31, -30)[0]?.waist ?? null;
  const waistDelta30 = (currWaist!=null && waist30!=null) ? currWaist - waist30 : null;

  /* ---------- Derived: Adherence (last 7 & 30 days from nutrition state) ---------- */
  const dates7 = lastNDates(7);
  const dates30 = lastNDates(30);
  function dayKeyFromDate(dStr) {
    // NOTE: nutrition stored by named day; we approximate adherence using the most recent state per day key.
    // If your nutrition page stores per-date, switch to that store. For now we compute using available keys.
    return null; // fallback path below
  }

  function computeAdherence(windowDates) {
    // Try to read per-day items from available named-day buckets
    const buckets = Object.values(nutri || {});
    if (!buckets.length) return { mealsDone:0, mealsTotal:0, pct:0, days:[] };

    // We approximate: for each date, use whichever named day currently selected (*)—or rotate through buckets.
    const days = [];
    let done=0, total=0;
    windowDates.forEach((d, i) => {
      const b = buckets[i % buckets.length]; // rotate as approximation
      const vals = Object.values(b?.items || {});
      const t = vals.length;
      const di = vals.filter(Boolean).length;
      days.push({ date: d, p: t? Math.round((di/t)*100) : 0 });
      done += di; total += t;
    });
    return { mealsDone: done, mealsTotal: total, pct: pct(done,total), days };
  }

  const adh7 = useMemo(()=>computeAdherence(dates7), [nutri]);
  const adh30 = useMemo(()=>computeAdherence(dates30), [nutri]);

  /* ---------- Derived: Training volume trend from history ---------- */
  const volumeSeries = useMemo(() => {
    const sorted = [...history].sort((a,b)=>a.date.localeCompare(b.date));
    return sorted.slice(-12).map(s => ({ date: s.date, volume: +s.volume || 0, sets: s.setsDone || 0 }));
  }, [history]);

  /* ----------------- Actions ----------------- */
  function addWeight() {
    const kg = parseFloat(String(wKg).replace(',','.'));
    if (!kg || !wDate) return;
    const next = [...weights.filter(w=>w.date!==wDate), { date: wDate, kg }];
    next.sort((a,b)=>a.date.localeCompare(b.date));
    setWeights(next);
    setwKg('');
    setwDate(today());
  }
  function delWeight(date) {
    setWeights(weights.filter(w=>w.date!==date));
  }

  function addMeas() {
    const entry = {
      date: mDate,
      chest: +mVals.chest || null,
      waist: +mVals.waist || null,
      hips: +mVals.hips || null,
      thigh: +mVals.thigh || null,
      arm: +mVals.arm || null,
    };
    const next = [...meas.filter(m=>m.date!==mDate), entry].sort((a,b)=>a.date.localeCompare(b.date));
    setMeas(next);
    setmDate(today());
  }
  function delMeas(date) { setMeas(meas.filter(m=>m.date!==date)); }

  function addPhoto() {
    if (!pUrl) return;
    const next = [...photos, { date: pDate, url: pUrl, note: pNote || '' }];
    setPhotos(next);
    setpUrl(''); setpNote(''); setpDate(today());
  }
  function delPhoto(idx) {
    const next = [...photos]; next.splice(idx,1); setPhotos(next);
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Progress</h1>
            <p className="text-sm text-slate-600 mt-1">Track weight, measurements, adherence, and training trends.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {calc?.target ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 flex items-center gap-2">
                <Flame size={16}/> Target {calc.target} kcal
              </div>
            ) : (
              <Link href="/dashboard/tools/calorie-calculator" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50">Set calorie target</Link>
            )}
            <Link href="/dashboard/my/workouts?tab=history" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50">View history</Link>
          </div>
        </div>
      </motion.div>

      {/* GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* LEFT COLUMN */}
        <div className="xl:col-span-2 space-y-4">
          {/* Weight Trend */}
          <Section icon={LineIcon} title={<>Weight Trend <Hint text="أضف وزن جسمك بشكل دوري لمتابعة التغيير (مثلاً 2–3 مرات أسبوعيًا)."/></>} action={
            <div className="text-xs text-slate-500">
              7d Δ {delta7!=null ? `${fmt(delta7,1)} kg` : '—'} • 30d Δ {delta30!=null ? `${fmt(delta30,1)} kg` : '—'}
            </div>
          }>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightSeries} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wgt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                    <RTooltip contentStyle={{ fontSize: 12 }}/>
                    <Area type="monotone" dataKey="kg" stroke="#4f46e5" fill="url(#wgt)" strokeWidth={2} dot={{ r: 2 }}/>
                    {currWeight!=null && <ReferenceLine y={currWeight} stroke="#c7d2fe" strokeDasharray="4 4" />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-sm font-semibold mb-2">Add weight</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={wDate} onChange={e=>setwDate(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <div className="flex gap-1">
                    <input type="number" step="0.1" placeholder="kg" value={wKg} onChange={e=>setwKg(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                    <button onClick={addWeight} className="px-3 rounded-md border border-slate-200 hover:bg-slate-50 text-sm inline-flex items-center gap-1"><Plus size={14}/>Add</button>
                  </div>
                </div>

                {/* recent weights */}
                <div className="mt-2 max-h-28 overflow-auto">
                  {weights.slice(-5).reverse().map(w=>(
                    <div key={w.date} className="text-xs flex items-center justify-between py-1">
                      <span className="text-slate-600">{w.date}</span>
                      <span className="font-medium">{fmt(w.kg,1)} kg</span>
                      <button onClick={()=>delWeight(w.date)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                    </div>
                  ))}
                  {!weights.length && <div className="text-xs text-slate-500">No entries yet.</div>}
                </div>
              </div>
            </div>
          </Section>

          {/* Measurements */}
          <Section icon={Ruler} title={<>Body Measurements <Hint text="محيط الخصر مؤشر مهم للتقدم. سجّل أيضًا الصدر/الورك/الفخذ/الذراع."/></>}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measSeries} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                    <RTooltip contentStyle={{ fontSize: 12 }}/>
                    <Line type="monotone" dataKey="waist" name="Waist" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }}/>
                    <Line type="monotone" dataKey="chest" name="Chest" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }}/>
                    <Line type="monotone" dataKey="hips" name="Hips" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-sm font-semibold mb-2">Add measurements (cm)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={mDate} onChange={e=>setmDate(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <input type="number" step="0.1" placeholder="Waist" value={mVals.waist} onChange={e=>setmVals(v=>({...v,waist:e.target.value}))} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <input type="number" step="0.1" placeholder="Chest" value={mVals.chest} onChange={e=>setmVals(v=>({...v,chest:e.target.value}))} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <input type="number" step="0.1" placeholder="Hips" value={mVals.hips} onChange={e=>setmVals(v=>({...v,hips:e.target.value}))} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <input type="number" step="0.1" placeholder="Thigh" value={mVals.thigh} onChange={e=>setmVals(v=>({...v,thigh:e.target.value}))} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <input type="number" step="0.1" placeholder="Arm" value={mVals.arm} onChange={e=>setmVals(v=>({...v,arm:e.target.value}))} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                  <button onClick={addMeas} className="col-span-2 mt-1 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-sm inline-flex items-center gap-1">
                    <Plus size={14}/> Add
                  </button>
                </div>

                {/* recent rows */}
                <div className="mt-2 max-h-28 overflow-auto text-xs">
                  {meas.slice(-4).reverse().map(m => (
                    <div key={m.date} className="flex items-center justify-between py-1">
                      <div className="text-slate-600">{m.date}</div>
                      <div className="font-medium">W {fmt(m.waist)} • C {fmt(m.chest)} • H {fmt(m.hips)}</div>
                      <button onClick={()=>delMeas(m.date)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                    </div>
                  ))}
                  {!meas.length && <div className="text-slate-500">No entries yet.</div>}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              30d Waist Δ: {waistDelta30!=null ? `${fmt(waistDelta30,1)} cm` : '—'}
            </div>
          </Section>

          {/* Adherence */}
          <Section icon={Activity} title={<>Adherence <Hint text="نسبة إكمال الوجبات والمكملات تقريبية حسب حالة اليوم المحفوظة." /></>}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <div className="text-sm font-semibold mb-2">Last 7 days</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adh7.days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0,100]}/>
                      <RTooltip contentStyle={{ fontSize: 12 }}/>
                      <Bar dataKey="p" fill="#10b981" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-slate-600 mt-2">
                  Meals done: <span className="font-semibold">{adh7.mealsDone}</span> / {adh7.mealsTotal} • Avg {adh7.pct}%
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Last 30 days</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={adh30.days} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0,100]}/>
                      <RTooltip contentStyle={{ fontSize: 12 }}/>
                      <Area type="monotone" dataKey="p" stroke="#10b981" strokeWidth={2} fill="url(#adh)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-slate-600 mt-2">
                  Meals done: <span className="font-semibold">{adh30.mealsDone}</span> / {adh30.mealsTotal} • Avg {adh30.pct}%
                </div>
              </Card>
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Training trend */}
          <Section icon={Dumbbell} title="Training Trend">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeSeries} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                  <RTooltip contentStyle={{ fontSize: 12 }}/>
                  <Line type="monotone" dataKey="volume" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {volumeSeries.length ? (
              <div className="text-xs text-slate-600 mt-2">Last {volumeSeries.length} sessions volume trend</div>
            ) : <div className="text-xs text-slate-500 mt-2">No sessions yet.</div>}
          </Section>

          {/* Progress photos */}
          <Section icon={ImageIcon} title="Progress Photos" action={
            <div className="text-xs text-slate-500">JPG/PNG URL</div>
          }>
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={pDate} onChange={e=>setpDate(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                <input type="url" placeholder="https://…" value={pUrl} onChange={e=>setpUrl(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
                <input type="text" placeholder="Note (optional)" value={pNote} onChange={e=>setpNote(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
              </div>
              <div>
                <button onClick={addPhoto} className="px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-sm inline-flex items-center gap-1">
                  <UploadCloud size={14}/> Add photo
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {photos.slice(-6).reverse().map((p, idx) => (
                  <div key={`${p.url}-${idx}`} className="relative rounded-xl overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.note || p.date} className="w-full h-40 object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-xs p-1.5 flex items-center justify-between">
                      <span className="truncate">{p.date} {p.note ? `• ${p.note}` : ''}</span>
                      <button onClick={()=>delPhoto(photos.length-1-idx)} className="opacity-80 hover:opacity-100">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
                {!photos.length && <div className="text-xs text-slate-500">No photos yet.</div>}
              </div>
            </div>
          </Section>

          {/* Snapshot */}
          <Card>
            <div className="text-sm font-semibold mb-2">Snapshot</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">Current weight</div>
                <div className="font-semibold">{currWeight!=null ? `${fmt(currWeight,1)} kg` : '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">7d Δ</div>
                <div className="font-semibold">{delta7!=null ? `${fmt(delta7,1)} kg` : '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">30d Δ</div>
                <div className="font-semibold">{delta30!=null ? `${fmt(delta30,1)} kg` : '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">Waist (last)</div>
                <div className="font-semibold">{currWaist!=null ? `${fmt(currWaist,1)} cm` : '—'}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
