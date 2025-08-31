"use client";

// app/dashboard/nutrition/calculator/page.jsx
// Calorie Calculator tab: estimates TDEE + daily target to reach a goal weight, with macro split.

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingDown, TrendingUp, CalendarDays, Scale, FlameKindling } from 'lucide-react';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

const ACTIVITY = [
  { key: 'sed', label: 'Sedentary (office, little exercise)', factor: 1.2 },
  { key: 'light', label: 'Light (1–3x/week)', factor: 1.375 },
  { key: 'mod', label: 'Moderate (3–5x/week)', factor: 1.55 },
  { key: 'high', label: 'High (6–7x/week)', factor: 1.725 },
  { key: 'ath', label: 'Athlete (2x/day)', factor: 1.9 },
];

export default function CalorieCalculatorPage(){
  const [tab, setTab] = useState('planner'); // planner | macros | notes
  const [unit, setUnit] = useState('metric'); // metric | imperial
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(175); // cm or inches
  const [weight, setWeight] = useState(80); // kg or lb
  const [goalWeight, setGoalWeight] = useState(72);
  const [bodyFat, setBodyFat] = useState(''); // optional %
  const [activity, setActivity] = useState('mod');
  const [rateType, setRateType] = useState('pct'); // pct | kg
  const [rate, setRate] = useState(0.7); // % of bodyweight per week (0.25 - 1.0 typical) OR kg/week
  const [useKatch, setUseKatch] = useState(false);

  // ======== Derived numbers ========
  const state = useMemo(() => {
    // normalize to metric for math
    const wKg = unit === 'metric' ? Number(weight) : Number(weight) * 0.45359237;
    const hCm = unit === 'metric' ? Number(height) : Number(height) * 2.54;
    const gKg = unit === 'metric' ? Number(goalWeight) : Number(goalWeight) * 0.45359237;

    const bf = Number(bodyFat);

    // BMR: Mifflin St-Jeor (default)
    let BMR = 10 * wKg + 6.25 * hCm - 5 * Number(age) + (sex === 'male' ? 5 : -161);
    // Katch-McArdle (optional, needs BF%)
    if (useKatch && bf > 0 && bf < 60) {
      const LBM = wKg * (1 - bf / 100);
      BMR = 370 + 21.6 * LBM;
    }

    const act = ACTIVITY.find(a => a.key === activity)?.factor ?? 1.55;
    const TDEE = BMR * act;

    const changeDir = gKg < wKg ? -1 : gKg > wKg ? 1 : 0; // -1 cut, 1 bulk

    // weekly change target
    const weeklyKg = rateType === 'pct' ? (Number(rate)/100) * wKg * (changeDir || -1) : Number(rate) * (changeDir || -1);

    // kcal per kg ~ 7700 (approx)
    const dailyDelta = (weeklyKg * 7700) / 7; // negative for fat loss

    const targetCalories = Math.round(TDEE + dailyDelta);

    // weeks to goal
    const totalDeltaKg = Math.abs(gKg - wKg);
    const weeklyAbs = Math.max(0.05, Math.abs(weeklyKg));
    const weeks = weeklyAbs > 0 ? Math.ceil(totalDeltaKg / weeklyAbs) : 0;
    const targetDate = addDays(new Date(), weeks * 7);

    // macros — simple defaults
    const proteinPerKg = changeDir <= 0 ? 2.0 : 1.8; // cut a bit higher
    const fatPerKg = 0.8; // g/kg
    const p = Math.round(proteinPerKg * gKg);
    const f = Math.round(fatPerKg * gKg);
    const kcalFromPF = p * 4 + f * 9;
    const c = Math.max(0, Math.round((targetCalories - kcalFromPF) / 4));

    return {
      wKg, hCm, gKg, BMR: Math.round(BMR), TDEE: Math.round(TDEE),
      changeDir, weeklyKg, dailyDelta: Math.round(dailyDelta), targetCalories,
      weeks, targetDate, macros: { protein: p, fat: f, carbs: c }
    };
  }, [unit, sex, age, height, weight, goalWeight, bodyFat, activity, rateType, rate, useKatch]);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-sm text-slate-500">Nutrition</div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calorie Calculator</h1>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {['planner','macros','notes'].map(k => (
            <button key={k} onClick={()=> setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm ${tab===k? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>{label(k)}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Your details">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Unit" value={unit} onChange={setUnit} options={[{v:'metric',l:'Metric (kg, cm)'},{v:'imperial',l:'Imperial (lb, in)'}]} />
              <Select label="Sex" value={sex} onChange={setSex} options={[{v:'male',l:'Male'},{v:'female',l:'Female'}]} />
              <Number label="Age" value={age} onChange={setAge} min={12} max={90} />
              <Number label={`Height (${unit==='metric'?'cm':'in'})`} value={height} onChange={setHeight} min={100} max={250} step={unit==='metric'?1:0.5} />
              <Number label={`Current weight (${unit==='metric'?'kg':'lb'})`} value={weight} onChange={setWeight} min={30} max={300} step={unit==='metric'?0.1:0.5} />
              <Number label={`Goal weight (${unit==='metric'?'kg':'lb'})`} value={goalWeight} onChange={setGoalWeight} min={30} max={300} step={unit==='metric'?0.1:0.5} />
              <Select label="Activity" value={activity} onChange={setActivity} options={ACTIVITY.map(a=>({v:a.key,l:a.label}))} />
              <div className="grid grid-cols-2 gap-2">
                <Checkbox label="Use Katch‑McArdle (with body fat %)" checked={useKatch} onChange={setUseKatch} />
                <Number label="Body fat % (optional)" value={bodyFat} onChange={setBodyFat} min={5} max={60} step={0.5} disabled={!useKatch} />
              </div>
            </div>
          </Card>

          <Card title="Goal & rate">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Rate type" value={rateType} onChange={setRateType} options={[{v:'pct',l:'% body weight / week'},{v:'kg',l:`${unit==='metric'?'kg':'lb'} per week`}]}/>
              <Number label={rateType==='pct'? 'Rate (%/wk)' : `Rate (${unit==='metric'?'kg':'lb'}/wk)`} value={rate} onChange={setRate} min={rateType==='pct'?0.25:0.1} max={rateType==='pct'?1.0:(unit==='metric'?1.5:3.0)} step={rateType==='pct'?0.05:(unit==='metric'?0.1:0.5)} />
              <Note>Typical safe loss is 0.5–1.0% / week. For lean bulks, 0.25–0.5% / week.</Note>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 space-y-4">
          <Summary state={state} unit={unit} />

          <AnimatePresence mode="wait">
            {tab === 'planner' && (
              <motion.div key="planner" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <PlannerCard state={state} />
              </motion.div>
            )}
            {tab === 'macros' && (
              <motion.div key="macros" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <MacrosCard state={state} />
              </motion.div>
            )}
            {tab === 'notes' && (
              <motion.div key="notes" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <NotesCard />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ===================== Cards & UI bits ===================== */
function Summary({ state, unit }){
  const dir = state.changeDir;
  const status = dir<0 ? {label:'Cutting', cls:'bg-rose-50 text-rose-700 ring-rose-100', Icon:TrendingDown} : dir>0 ? {label:'Bulking', cls:'bg-emerald-50 text-emerald-700 ring-emerald-100', Icon:TrendingUp} : {label:'Maintain', cls:'bg-slate-50 text-slate-700 ring-slate-100', Icon:FlameKindling};
  const Ico = status.Icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${status.cls}`}>
            <Ico className="w-3.5 h-3.5"/>{status.label}
          </span>
          <div className="text-sm text-slate-600">BMR <b>{state.BMR}</b> • TDEE <b>{state.TDEE}</b> kcal</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold leading-tight">{state.targetCalories} kcal</div>
          <div className="text-xs text-slate-500">Daily target</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Stat label="Protein" value={`${state.macros.protein} g`} />
        <Stat label="Carbs" value={`${state.macros.carbs} g`} />
        <Stat label="Fat" value={`${state.macros.fat} g`} />
        <Stat label="Δ kcal/day" value={`${state.dailyDelta>0?'+':''}${state.dailyDelta}`} />
      </div>
    </div>
  );
}

function PlannerCard({ state }){
  const weeks = state.weeks;
  const dateStr = state.targetDate.toLocaleDateString();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold"><CalendarDays className="w-5 h-5"/> Timeline</div>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <Box label="Weeks to goal" value={weeks ? `${weeks} wk` : '—'} />
        <Box label="ETA" value={weeks ? dateStr : '—'} />
        <Box label="Weekly change" value={`${Math.abs(state.weeklyKg).toFixed(2)} kg/wk`} />
      </div>
      <p className="mt-3 text-xs text-slate-500">* Estimates use 7,700 kcal ≈ 1 kg. Real‑world changes vary with water, NEAT, and adherence.</p>
    </div>
  );
}

function MacrosCard({ state }){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold"><Scale className="w-5 h-5"/> Macro split</div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <Box label="Protein" value={`${state.macros.protein} g`} sub={`${state.macros.protein*4} kcal`} />
        <Box label="Carbs" value={`${state.macros.carbs} g`} sub={`${state.macros.carbs*4} kcal`} />
        <Box label="Fat" value={`${state.macros.fat} g`} sub={`${state.macros.fat*9} kcal`} />
      </div>
      <p className="mt-3 text-xs text-slate-500">Protein set ~1.8–2.0 g/kg target weight; fat ~0.8 g/kg; carbs fill remaining calories.</p>
    </div>
  );
}

function NotesCard(){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold"><Calculator className="w-5 h-5"/> Notes</div>
      <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
        <li>Re‑calculate when your weight changes by ~5% or your activity changes.</li>
        <li>Keep protein high on a cut; for bulks, increase carbs first.</li>
        <li>Aim for 80–90% adherence weekly; plan one maintenance day if needed.</li>
      </ul>
    </div>
  );
}

function Stat({ label, value }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Box({ label, value, sub }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Card({ title, children }){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {title && <div className="font-semibold text-slate-800 mb-3">{title}</div>}
      {children}
    </div>
  );
}

function Select({ label, value, onChange, options }){
  return (
    <label className="text-sm">
      <div className="text-slate-600 mb-1">{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        {options.map(o=> <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

function Number({ label, value, onChange, ...rest }){
  return (
    <label className="text-sm">
      <div className="text-slate-600 mb-1">{label}</div>
      <input type="number" value={value} onChange={e=>onChange(Number(e.target.value))} {...rest} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </label>
  );
}

function Checkbox({ label, checked, onChange, disabled }){
  return (
    <label className={`text-sm inline-flex items-center gap-2 ${disabled? 'opacity-50': ''}`}>
      <input type="checkbox" className="rounded border-slate-300" checked={checked} onChange={e=>onChange(e.target.checked)} disabled={disabled} />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

function Note({ children }){
  return <div className="col-span-2 text-xs text-slate-500">{children}</div>;
}

function addDays(date, days){ const d = new Date(date); d.setDate(d.getDate()+days); return d; }

function label(k){ return k==='planner' ? 'Planner' : k==='macros' ? 'Macros' : 'Notes'; }
