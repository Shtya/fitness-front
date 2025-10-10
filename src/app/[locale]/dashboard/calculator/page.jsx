'use client';

import { useEffect, useMemo, useState } from 'react';

// ⚙️ Use YOUR atoms
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';

const ACTIVITY = [
  { key: 'sed', label: 'Sedentary (desk, little exercise)', mult: 1.2 },
  { key: 'light', label: 'Light (1–3x/week)', mult: 1.375 },
  { key: 'mod', label: 'Moderate (3–5x/week)', mult: 1.55 },
  { key: 'very', label: 'Very Active (6–7x/week)', mult: 1.725 },
  { key: 'ath', label: 'Athlete/2-a-days', mult: 1.9 },
];

const GOALS = [
  { label: 'Cut', delta: -20 },
  { label: 'Recomp', delta: 0 },
  { label: 'Lean Bulk', delta: +10 },
];

const MACRO_PRESETS = [
  { key: 'balanced', label: 'Balanced', p: 30, c: 40, f: 30 },
  { key: 'highp', label: 'High Protein', p: 35, c: 35, f: 30 },
  { key: 'lowc', label: 'Low Carb', p: 35, c: 25, f: 40 },
  { key: 'keto', label: 'Keto-ish', p: 25, c: 5, f: 70 },
  { key: 'custom', label: 'Custom', p: 30, c: 40, f: 30 },
];

function clamp(n, a, b) {
  const v = Number.isFinite(+n) ? +n : 0;
  return Math.min(b, Math.max(a, v));
}

export default function Page() {
  // Inputs
  const [unit, setUnit] = useState('metric'); // metric | imperial
  const [sex, setSex] = useState('male'); // male | female
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(178); // cm or inches
  const [weight, setWeight] = useState(78); // kg or lb
  const [bf, setBf] = useState(15); // %
  const [activity, setActivity] = useState('mod');
  const [goalDelta, setGoalDelta] = useState(0);
  const [macroPreset, setMacroPreset] = useState('balanced');
  const [macrosPct, setMacrosPct] = useState({ p: 30, c: 40, f: 30 });

  // Sync macro preset → percentages
  useEffect(() => {
    const p = MACRO_PRESETS.find(m => m.key === macroPreset);
    if (!p || p.key === 'custom') return;
    setMacrosPct({ p: p.p, c: p.c, f: p.f });
  }, [macroPreset]);

  // Metric conversions
  const { kg, cm } = useMemo(() => {
    if (unit === 'metric') return { kg: +weight || 0, cm: +height || 0 };
    return { kg: (Number(weight) || 0) * 0.45359237, cm: (Number(height) || 0) * 2.54 };
  }, [unit, weight, height]);

  const lbm = useMemo(() => {
    const bodyFat = clamp(bf, 0, 60) / 100;
    return kg * (1 - bodyFat);
  }, [kg, bf]);

  // BMR
  const bmr = useMemo(() => {
    const s = sex === 'male' ? 1 : 0;
    const mifflin = 10 * kg + 6.25 * cm - 5 * age + (s ? 5 : -161);
    const harris = s ? 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age : 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age;
    const katch = 370 + 21.6 * lbm;
    const cunningham = 500 + 22 * lbm;
    return {
      mifflin: Math.max(0, Math.round(mifflin)),
      harris: Math.max(0, Math.round(harris)),
      katch: Math.max(0, Math.round(katch)),
      cunningham: Math.max(0, Math.round(cunningham)),
    };
  }, [kg, cm, age, sex, lbm]);

  const activityMult = useMemo(() => ACTIVITY.find(a => a.key === activity)?.mult || 1.55, [activity]);

  const tdee = useMemo(() => {
    const avgBmr = (bmr.mifflin + bmr.harris + bmr.katch + bmr.cunningham) / 4;
    return Math.round(avgBmr * activityMult);
  }, [bmr, activityMult]);

  const targetCalories = useMemo(() => {
    const delta = clamp(goalDelta, -40, 40);
    return Math.max(0, Math.round(tdee * (1 + delta / 100)));
  }, [tdee, goalDelta]);

  // Macros
  const macroGrams = useMemo(() => {
    const p = clamp(macrosPct.p, 0, 100);
    const c = clamp(macrosPct.c, 0, 100);
    let f = clamp(macrosPct.f, 0, 100);
    const sum = p + c + f;
    if (sum !== 100) f = clamp(100 - (p + c), 0, 100);

    const pCal = (p / 100) * targetCalories;
    const cCal = (c / 100) * targetCalories;
    const fCal = (f / 100) * targetCalories;

    return {
      pct: { p, c, f },
      g: {
        p: Math.round(pCal / 4),
        c: Math.round(cCal / 4),
        f: Math.round(fCal / 9),
      },
    };
  }, [macrosPct, targetCalories]);

  // Helpers
  const resetAll = () => {
    setUnit('metric');
    setSex('male');
    setAge(28);
    setHeight(178);
    setWeight(78);
    setBf(15);
    setActivity('mod');
    setGoalDelta(0);
    setMacroPreset('balanced');
    setMacrosPct({ p: 30, c: 40, f: 30 });
  };

  const copySummary = async () => {
    const lines = [`Calorie & Macro Summary`, `-----------------------`, `Sex: ${sex} | Age: ${age} | Height: ${height}${unit === 'metric' ? 'cm' : 'in'} | Weight: ${weight}${unit === 'metric' ? 'kg' : 'lb'} | BF%: ${bf}%`, `Activity: ${ACTIVITY.find(a => a.key === activity)?.label}`, ``, `BMR (kcal/day):`, `  - Mifflin-St Jeor: ${bmr.mifflin}`, `  - Harris-Benedict: ${bmr.harris}`, `  - Katch-McArdle:   ${bmr.katch}`, `  - Cunningham:      ${bmr.cunningham}`, ``, `TDEE (avg BMR × activity): ${tdee} kcal`, `Goal: ${goalDelta}% → Target: ${targetCalories} kcal`, ``, `Macros (${macroPreset}):`, `  Protein: ${macroGrams.pct.p}% → ${macroGrams.g.p} g`, `  Carbs:   ${macroGrams.pct.c}% → ${macroGrams.g.c} g`, `  Fat:     ${macroGrams.pct.f}% → ${macroGrams.g.f} g`].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      alert('Copied to clipboard!');
    } catch {
      alert('Copy failed. (Clipboard permission?)');
    }
  };

  // 🔁 options for YOUR Select (expects {id,label})
  const unitOptions = [
    { id: 'metric', label: 'Metric (kg/cm)' },
    { id: 'imperial', label: 'Imperial (lb/in)' },
  ];
  const sexOptions = [
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
  ];
  const activityOptions = ACTIVITY.map(a => ({ id: a.key, label: a.label }));

  return (
    <div className='min-h-screen '>
      <div className='container !px-0 py-8'>
        {/* Header */}
        <div className='rounded-lg overflow-hidden border border-indigo-200 shadow-sm'>
          <div className='relative p-6 md:p-10 bg-gradient-to-r from-indigo-600 to-violet-600 text-white'>
            <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
            <div className='relative z-10'>
              <h1 className='text-2xl md:text-3xl font-bold'>Coach Calorie & Macro Calculator</h1>
              <p className='text-white/90 mt-1'>Fast planning for trainees—BMR, TDEE, goals, and macros with one clean worksheet.</p>
              <div className='mt-4 flex flex-wrap gap-2'>
                <Button color='subtle' className='!w-fit bg-white/95 text-indigo-700' name='Copy Summary' onClick={copySummary} />
                <Button color='outline' className='!w-fit !text-white !border-white/60 hover:!bg-white/20' name='Print' onClick={() => window.print()} />
                <Button color='outline' className='!w-fit !text-white !border-white/60 hover:!bg-white/20' name='Reset' onClick={resetAll} />
              </div>
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className='mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
          {/* Inputs */}
          <div className='lg:col-span-2 space-y-4'>
            {/* Profile */}
            <Card title='Trainee Profile'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                <Select label='Units' options={unitOptions} value={unit} onChange={setUnit} />
                <Select label='Sex' options={sexOptions} value={sex} onChange={setSex} />
                <Input label='Age (yrs)' type='number' value={String(age)} onChange={v => setAge(clamp(v, 10, 90))} />
                <Select label='Activity' options={activityOptions} value={activity} onChange={setActivity} />
              </div>

              <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-3'>
                <Input label={unit === 'metric' ? 'Height (cm)' : 'Height (in)'} type='number' value={String(height)} onChange={v => setHeight(clamp(v, unit === 'metric' ? 100 : 40, unit === 'metric' ? 230 : 100))} />
                <Input label={unit === 'metric' ? 'Weight (kg)' : 'Weight (lb)'} type='number' value={String(weight)} onChange={v => setWeight(clamp(v, unit === 'metric' ? 35 : 80, unit === 'metric' ? 250 : 550))} />
                <Input label='Body Fat (%)' type='number' value={String(bf)} onChange={v => setBf(clamp(v, 0, 60))} />
                <ReadOnly label='Lean Mass (kg)' value={lbm.toFixed(1)} />
              </div>
            </Card>

            {/* Goals */}
            <Card title='Goal & Calories'>
              <div className='flex flex-wrap items-center gap-2'>
                {GOALS.map(g => (
                  <Button key={g.label} color={goalDelta === g.delta ? 'primary' : 'outline'} className='!w-fit' name={`${g.label} (${g.delta > 0 ? '+' : ''}${g.delta}%)`} onClick={() => setGoalDelta(g.delta)} />
                ))}
                <div className='ml-auto text-sm text-slate-500'>Adjust:</div>
                <input type='range' min={-40} max={40} step={1} value={goalDelta} onChange={e => setGoalDelta(parseInt(e.target.value, 10))} className='w-40' />
                <span className='px-2 py-1 rounded-lg bg-slate-100 text-sm'>
                  {goalDelta > 0 ? '+' : ''}
                  {goalDelta}%
                </span>
              </div>

              <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-4'>
                <ReadOnly label='Average BMR (4 formulas)' value={Math.round((bmr.mifflin + bmr.harris + bmr.katch + bmr.cunningham) / 4)} />
                <ReadOnly label='Activity Multiplier' value={activityMult.toFixed(3)} />
                <ReadOnly label='TDEE (kcal)' value={tdee} />
                <ReadOnly label='Target (kcal)' value={targetCalories} />
              </div>

              <div className='mt-3'>
                <BmrTable bmr={bmr} />
              </div>
            </Card>

            {/* Macros */}
            <Card title='Macros'>
              <div className='flex flex-wrap items-center gap-2'>
                {MACRO_PRESETS.map(p => (
                  <Button key={p.key} color={macroPreset === p.key ? 'green' : 'outline'} className='!w-fit' name={p.label} onClick={() => setMacroPreset(p.key)} />
                ))}
              </div>

              <div className='grid grid-cols-3 gap-3 mt-4'>
                <PctInput
                  label='Protein %'
                  value={macrosPct.p}
                  onChange={v => {
                    setMacrosPct(m => ({ ...m, p: clamp(v, 0, 100) }));
                    setMacroPreset('custom');
                  }}
                />
                <PctInput
                  label='Carbs %'
                  value={macrosPct.c}
                  onChange={v => {
                    setMacrosPct(m => ({ ...m, c: clamp(v, 0, 100) }));
                    setMacroPreset('custom');
                  }}
                />
                <PctInput
                  label='Fat %'
                  value={macrosPct.f}
                  onChange={v => {
                    setMacrosPct(m => ({ ...m, f: clamp(v, 0, 100) }));
                    setMacroPreset('custom');
                  }}
                />
              </div>

              <div className='mt-3'>
                <MacroBar pct={macroGrams.pct} />
                <div className='grid grid-cols-3 gap-3 mt-3'>
                  <ReadOnly label='Protein (g)' value={macroGrams.g.p} />
                  <ReadOnly label='Carbs (g)' value={macroGrams.g.c} />
                  <ReadOnly label='Fat (g)' value={macroGrams.g.f} />
                </div>
              </div>
            </Card>
          </div>

          {/* Summary */}
          <div className='space-y-4'>
            <Card title='Coach Summary'>
              <div className='space-y-3'>
                <SummaryRow label='Target Calories' value={`${targetCalories} kcal`} big />
                <div className='grid grid-cols-3 gap-2'>
                  <Pill title='Protein' value={`${macroGrams.g.p} g`} sub={`${macroGrams.pct.p}%`} color='indigo' />
                  <Pill title='Carbs' value={`${macroGrams.g.c} g`} sub={`${macroGrams.pct.c}%`} color='blue' />
                  <Pill title='Fat' value={`${macroGrams.g.f} g`} sub={`${macroGrams.pct.f}%`} color='amber' />
                </div>

                <div className='mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm'>
                  <div className='font-medium mb-1'>Notes</div>
                  <ul className='list-disc pl-5 space-y-1 text-slate-600'>
                    <li>TDEE = average(BMR formulas) × activity level</li>
                    <li>Goals adjust calories by −40% to +40%</li>
                    <li>Macros automatically balance to 100%</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card title='Quick Conversions'>
              <div className='grid grid-cols-2 gap-3'>
                <ReadOnly label='Weight (lb)' value={unit === 'imperial' ? weight : Math.round(weight * 2.20462)} />
                <ReadOnly label='Weight (kg)' value={unit === 'metric' ? weight : Math.round(weight * 0.453592)} />
                <ReadOnly label='Height (in)' value={unit === 'imperial' ? height : Math.round(height / 2.54)} />
                <ReadOnly label='Height (cm)' value={unit === 'metric' ? height : Math.round(height * 2.54)} />
              </div>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

/* ===== UI bits (including SummaryRow) ===== */

function Card({ title, children }) {
  return (
    <div className='bg-white rounded-lg border border-slate-200 shadow-sm'>
      <div className='px-4 sm:px-5 py-4 border-b border-slate-100'>
        <h3 className='font-semibold'>{title}</h3>
      </div>
      <div className='p-4 sm:p-5'>{children}</div>
    </div>
  );
}

// ✅ Your Input already handles type=number; we wrap to keep styling consistent for % inputs
function PctInput({ label, value, onChange }) {
  return (
    <div>
      <Input label={label} type='number' value={String(value)} onChange={v => onChange(parseFloat(v || 0))} cnInput='pr-12' />
      <div className='text-[11px] text-slate-500 mt-1'>0–100%</div>
    </div>
  );
}

// Small read-only display box
function ReadOnly({ label, value }) {
  return (
    <label className='block'>
      <div className='text-sm text-slate-600 mb-1'>{label}</div>
      <div className='w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 grid place-items-center text-slate-800'>{value}</div>
    </label>
  );
}

// 🌟 NEW: SummaryRow for left label + right value (big variant)
function SummaryRow({ label, value, big = false }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border ${big ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'} px-3 py-2`}>
      <div className={`font-medium ${big ? 'text-indigo-800' : 'text-slate-700'}`}>{label}</div>
      <div className={`${big ? 'text-2xl font-bold text-indigo-700' : 'text-sm text-slate-700'}`}>{value}</div>
    </div>
  );
}

function MacroBar({ pct }) {
  const seg = (val, color) => <div className={`h-3 rounded-full ${color}`} style={{ width: `${clamp(val, 0, 100)}%` }} />;
  return (
    <div>
      <div className='h-3 w-full rounded-full bg-slate-100 overflow-hidden flex'>
        {seg(pct.p, 'bg-indigo-500')}
        {seg(pct.c, 'bg-blue-500')}
        {seg(pct.f, 'bg-amber-500')}
      </div>
      <div className='mt-1 text-[11px] text-slate-500'>Protein / Carbs / Fat</div>
    </div>
  );
}

function Pill({ title, value, sub, color = 'indigo' }) {
  const palette = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }[color];
  return (
    <div className={`p-3 rounded-lg border ${palette}`}>
      <div className='text-xs'>{title}</div>
      <div className='text-lg font-semibold leading-none'>{value}</div>
      <div className='text-[11px] mt-0.5'>{sub}</div>
    </div>
  );
}

function BmrTable({ bmr }) {
  const rows = [
    ['Mifflin-St Jeor', bmr.mifflin],
    ['Harris-Benedict', bmr.harris],
    ['Katch-McArdle', bmr.katch],
    ['Cunningham', bmr.cunningham],
  ];
  return (
    <div className='overflow-hidden rounded-lg border border-slate-200'>
      <table className='w-full text-sm'>
        <thead className='bg-slate-50'>
          <tr>
            <th className='text-left px-3 py-2'>Formula</th>
            <th className='text-left px-3 py-2'>BMR (kcal/day)</th>
          </tr>
        </thead>
        <tbody className='bg-white'>
          {rows.map(r => (
            <tr key={r[0]} className='border-t border-slate-100'>
              <td className='px-3 py-2'>{r[0]}</td>
              <td className='px-3 py-2 font-medium'>{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Footer() {
  return <div className='mt-10 text-center text-xs text-slate-500'>Tip: For strength athletes, keep protein ~1.6–2.2 g/kg LBM and adjust carbs based on training volume.</div>;
}
