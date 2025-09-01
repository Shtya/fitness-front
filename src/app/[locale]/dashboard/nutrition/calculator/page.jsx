'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader, TabsPill, spring } from '@/components/dashboard/ui/UI';
import { Calculator, Activity, Ruler, Dumbbell, Clipboard, Info, AlertCircle } from 'lucide-react';

/* =================== PERSISTENCE =================== */
const LS_KEY = 'mw.calorie.calc.v1';
const LS_UI = 'mw.calorie.calc.ui';

/* =================== HELPERS =================== */
const kgFromLbs = lbs => lbs * 0.45359237;
const cmFromIn = inches => inches * 2.54;

const round = (n, d = 0) => {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
};

// Mifflin–St Jeor
function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

const ACTIVITY = [
  { key: 'sed', label: 'Sedentary (little/no exercise)', factor: 1.2 },
  { key: 'light', label: 'Light (1–3x/week)', factor: 1.375 },
  { key: 'mod', label: 'Moderate (3–5x/week)', factor: 1.55 },
  { key: 'high', label: 'Very active (6–7x/week)', factor: 1.725 },
  { key: 'ath', label: 'Athlete/physical job', factor: 1.9 },
];

const GOALS = [
  { key: 'cut10', label: 'Cut −10%', adj: -0.1 },
  { key: 'cut15', label: 'Cut −15%', adj: -0.15 },
  // { key: 'cut20', label: 'Cut −20%', adj: -0.2 },
  { key: 'maint', label: 'Maintain', adj: 0.0 },
  { key: 'bulk10', label: 'Bulk +10%', adj: 0.1 },
  { key: 'bulk15', label: 'Bulk +15%', adj: 0.15 },
  // { key: 'bulk20', label: 'Bulk +20%', adj: 0.2 },
];

// kcal per gram
const KCAL = { protein: 4, carbs: 4, fat: 9 };

/* =================== SMALL UI: Hint Tooltip =================== */
function Hint({ text, side = 'top' }) {
  // position classes
  const pos = side === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : side === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <span className='relative inline-flex items-center group'>
      {/* focusable icon for keyboard users */}
      <button type='button' className='ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30' aria-label='Help'>
        <Info size={12} />
      </button>

      {/* tooltip */}
      <div role='tooltip' className={`pointer-events-none absolute ${pos} z-20 w-[220px] rounded-md border border-slate-200 bg-white p-2 text-[11.5px] leading-snug text-slate-700 shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition`}>
        {text}
      </div>
    </span>
  );
}

/* =================== PAGE =================== */
export default function CalorieCalculatorPage() {
  const [tab, setTab] = useState('calculator'); // calculator | about
  const [unit, setUnit] = useState('metric'); // metric | imperial
  const [form, setForm] = useState(() => {
    // sensible defaults
    const saved = loadLS(LS_KEY, null);
    return (
      saved || {
        sex: 'male',
        age: 25,
        height: { cm: 175, in: 69 },
        weight: { kg: 75, lbs: 165 },
        activity: 'mod',
        goal: 'maint',
        proteinGperKg: 1.8, // 1.6–2.2 typical
        fatGperKg: 0.8, // 0.5–1.2 typical
        mealsPerDay: 4,
      }
    );
  });

  useEffect(() => saveLS(LS_KEY, form), [form]);
  useEffect(() => {
    const savedUI = loadLS(LS_UI, { tab: 'calculator', unit: 'metric' });
    setTab(savedUI.tab);
    setUnit(savedUI.unit);
  }, []);
  useEffect(() => saveLS(LS_UI, { tab, unit }), [tab, unit]);

  // unify weight/height based on unit inputs
  function setWeight(value) {
    if (unit === 'metric') {
      const kg = Math.max(0, +value || 0);
      setForm(f => ({ ...f, weight: { kg, lbs: round(kg / 0.45359237, 1) } }));
    } else {
      const lbs = Math.max(0, +value || 0);
      setForm(f => ({ ...f, weight: { lbs, kg: round(kgFromLbs(lbs), 1) } }));
    }
  }
  function setHeight(value) {
    if (unit === 'metric') {
      const cm = Math.max(0, +value || 0);
      setForm(f => ({ ...f, height: { cm, in: round(cm / 2.54, 1) } }));
    } else {
      const inches = Math.max(0, +value || 0);
      setForm(f => ({ ...f, height: { in: inches, cm: round(cmFromIn(inches), 1) } }));
    }
  }

  const activity = ACTIVITY.find(a => a.key === form.activity) || ACTIVITY[2];
  const goal = GOALS.find(g => g.key === form.goal) || GOALS[3];

  const calc = useMemo(() => {
    const weightKg = form.weight.kg || 0;
    const heightCm = form.height.cm || 0;
    const age = Math.max(0, +form.age || 0);

    const baseBMR = bmr({ sex: form.sex, weightKg, heightCm, age });
    const tdee = baseBMR * activity.factor;
    const target = tdee * (1 + goal.adj);

    // macros
    const proteinG = Math.max(0, round(weightKg * form.proteinGperKg));
    const fatG = Math.max(0, round(weightKg * form.fatGperKg));
    const caloriesAfterPF = target - (proteinG * KCAL.protein + fatG * KCAL.fat);
    const carbsG = Math.max(0, Math.floor(caloriesAfterPF / KCAL.carbs));

    // per-meal split
    const meals = Math.max(1, Math.min(8, form.mealsPerDay || 4));
    const perMeal = {
      kcal: Math.round(target / meals),
      p: Math.round(proteinG / meals),
      c: Math.round(carbsG / meals),
      f: Math.round(fatG / meals),
    };

    return {
      baseBMR: Math.round(baseBMR),
      tdee: Math.round(tdee),
      target: Math.round(target),
      proteinG,
      fatG,
      carbsG,
      perMeal,
    };
  }, [form, activity.factor, goal.adj]);

  const warnLow = form.fatGperKg < 0.5 || form.proteinGperKg < 1.4;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <PageHeader icon={Calculator} title='Calorie Calculator' subtitle='Estimate BMR, TDEE, target calories, and smart macros.' />
        <TabsPill
          id='calorie-tabs'
          tabs={[
            { key: 'calculator', label: 'Calculator', icon: Calculator },
            { key: 'about', label: 'About', icon: Info },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* Unit toggle */}
      <div className='rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='flex items-center gap-2'>
          <Ruler size={16} className='text-slate-700' />
          <span className='text-sm font-medium flex items-center gap-1'>
            Units:
            <Hint text='بدّل بين النظام المتري (kg/cm) أو الإمبراطوري (lb/in). الحقول تُحدَّث تلقائيًا.' />
          </span>
          <div className='ml-2 inline-flex rounded-lg border border-slate-200 overflow-hidden'>
            <button onClick={() => setUnit('metric')} className={`px-3 py-1.5 text-sm ${unit === 'metric' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
              Metric (kg / cm)
            </button>
            <button onClick={() => setUnit('imperial')} className={`px-3 py-1.5 text-sm ${unit === 'imperial' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
              Imperial (lb / in)
            </button>
          </div>
        </div>
      </div>

      {tab === 'calculator' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Left: Inputs */}
          <div className='rounded-2xl border border-slate-200 bg-white p-4 space-y-4'>
            <div className='grid grid-cols-2 gap-5'>
              {/* Sex */}
              <div className='col-span-2 '>
                <label className='text-sm rtl:ml-2 ltr:mr-2 font-medium'>Sex</label>
                <div className='mt-1 inline-flex rounded-lg border border-slate-200 overflow-hidden'>
                  <button onClick={() => setForm(f => ({ ...f, sex: 'male' }))} className={`px-3 py-1.5 text-sm ${form.sex === 'male' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
                    Male
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, sex: 'female' }))} className={`px-3 py-1.5 text-sm ${form.sex === 'female' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
                    Female
                  </button>
                </div>
              </div>

              {/* Age */}
              <div>
                <label className='text-sm font-medium'>Age</label>
                <input type='number' min={0} value={form.age} onChange={e => setForm(f => ({ ...f, age: +e.target.value }))} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' placeholder='Age' />
              </div>

              {/* Height */}
              <div>
                <label className='text-sm font-medium'>Height ({unit === 'metric' ? 'cm' : 'in'})</label>
                <input type='number' min={0} value={unit === 'metric' ? form.height.cm : form.height.in} onChange={e => setHeight(e.target.value)} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' placeholder={unit === 'metric' ? 'cm' : 'in'} />
              </div>

              {/* Weight */}
              <div className=''>
                <label className='text-sm font-medium'>Weight ({unit === 'metric' ? 'kg' : 'lb'})</label>
                <input type='number' min={0} value={unit === 'metric' ? form.weight.kg : form.weight.lbs} onChange={e => setWeight(e.target.value)} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' placeholder={unit === 'metric' ? 'kg' : 'lb'} />
              </div>

              {/* Activity */}
              <div className=''>
                <label className='text-sm font-medium flex items-center gap-2'>
                  <Activity size={16} /> Activity level
                  <Hint text='معامل يضاعف BMR ليعكس حركة يومك (عمل، تمرين، خطوات). اختر الأقرب لروتينك.' />
                </label>
                <select className='mt-2 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}>
                  {ACTIVITY.map(a => (
                    <option key={a.key} value={a.key}>
                      {a.label} (×{a.factor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Goal */}
              <div className='col-span-2'>
                <label className='text-sm font-medium flex items-center gap-1'>
                  Goal
                  <Hint text='Cut = عجز سعرات (نزول وزن). Maintain = ثبات. Bulk = فائض (زيادة كتلة). النِسب تضبط مقدار العجز/الفائض.' />
                </label>
                <div className='mt-1 grid grid-cols-3 gap-2'>
                  {GOALS.map(g => (
                    <button key={g.key} onClick={() => setForm(f => ({ ...f, goal: g.key }))} className={`px-3 py-2 rounded-lg border text-sm ${form.goal === g.key ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Macros knobs */}
              <div className='col-span-2 grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-sm font-medium flex items-center gap-1'>
                    Protein (g/kg)
                    <Hint text='جرامات البروتين لكل كجم من وزن الجسم يوميًا. شائع 1.6–2.2 g/kg للحفاظ/زيادة العضلات.' />
                  </label>
                  <input type='number' step='0.1' min={0.8} max={3} value={form.proteinGperKg} onChange={e => setForm(f => ({ ...f, proteinGperKg: +e.target.value }))} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
                  <div className='text-[11px] text-slate-500 mt-1'>Typical 1.6–2.2 g/kg</div>
                </div>
                <div>
                  <label className='text-sm font-medium flex items-center gap-1'>
                    Fat (g/kg)
                    <Hint text='جرامات الدهون لكل كجم يوميًا. عادة 0.5–1.2 g/kg؛ أقل من 0.5 قد يؤثر على الهرمونات.' />
                  </label>
                  <input type='number' step='0.1' min={0.4} max={2} value={form.fatGperKg} onChange={e => setForm(f => ({ ...f, fatGperKg: +e.target.value }))} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
                  <div className='text-[11px] text-slate-500 mt-1'>Typical 0.5–1.2 g/kg</div>
                </div>
              </div>

              {/* Meals per day */}
              <div className='col-span-2'>
                <label className='text-sm font-medium flex items-center gap-1'>
                  Meals per day
                  <Hint text='يستخدم لتقسيم السعرات والماكروز بالتساوي على وجباتك اليومية.' />
                </label>
                <input type='number' min={1} max={8} value={form.mealsPerDay} onChange={e => setForm(f => ({ ...f, mealsPerDay: Math.max(1, Math.min(8, +e.target.value || 1)) }))} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
              </div>
            </div>

            {warnLow && (
              <div className='flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800'>
                <AlertCircle size={16} className='mt-0.5' />
                <div className='text-sm'>
                  Protein or fat target looks low. Common healthy ranges are <b>protein 1.6–2.2 g/kg</b> and <b>fat 0.5–1.2 g/kg</b>.
                </div>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4 space-y-4'>
            <div className='grid grid-cols-2 gap-3'>
              <Stat title='BMR' value={`${calc.baseBMR} kcal`} help='Basal Metabolic Rate — السعرات التي يحرقها جسمك في الراحة التامة.' />
              <Stat title='TDEE' value={`${calc.tdee} kcal`} help='Total Daily Energy Expenditure = BMR × عامل النشاط (إجمالي احتياجك اليومي).' />
              <Stat title='Target Calories' value={`${calc.target} kcal`} highlight help='السعرات بعد تطبيق هدفك (عجز للنزول أو فائض للزيادة).' />
              <Stat title='Activity ×' value={activity.factor} help='المعامل المستخدم لتحويل BMR إلى TDEE حسب مستوى نشاطك.' />
            </div>

            <div className='rounded-xl border border-slate-200 p-3'>
              <div className='font-semibold mb-2 flex items-center gap-2'>
                <Dumbbell size={16} /> Macros (per day)
                <Hint text='نحسب البروتين والدهون حسب g/kg، ثم نملأ الباقي بالكربوهيدرات ضمن السعرات المستهدفة.' />
              </div>
              <div className='grid grid-cols-3 gap-3'>
                <Macro title='Protein' grams={calc.proteinG} kcal={calc.proteinG * KCAL.protein} />
                <Macro title='Carbs' grams={calc.carbsG} kcal={calc.carbsG * KCAL.carbs} />
                <Macro title='Fat' grams={calc.fatG} kcal={calc.fatG * KCAL.fat} />
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 p-3'>
              <div className='font-semibold mb-2 flex items-center gap-1'>
                Per-meal split (×{Math.max(1, form.mealsPerDay)})
                <Hint text='تقسيم تقريبي بالتساوي على عدد الوجبات المحدد. يمكنك تعديله في صفحة التغذية.' />
              </div>
              <div className='grid grid-cols-4 gap-3 text-sm'>
                <div className='card-glow rounded-lg bg-slate-50 p-3'>
                  <div className='text-slate-500'>Calories</div>
                  <div className='font-semibold'>{calc.perMeal.kcal} kcal</div>
                </div>
                <div className='card-glow rounded-lg bg-slate-50 p-3'>
                  <div className='text-slate-500'>Protein</div>
                  <div className='font-semibold'>{calc.perMeal.p} g</div>
                </div>
                <div className='card-glow rounded-lg bg-slate-50 p-3'>
                  <div className='text-slate-500'>Carbs</div>
                  <div className='font-semibold'>{calc.perMeal.c} g</div>
                </div>
                <div className='card-glow rounded-lg bg-slate-50 p-3'>
                  <div className='text-slate-500'>Fat</div>
                  <div className='font-semibold'>{calc.perMeal.f} g</div>
                </div>
              </div>
            </div>

            <SummaryBlock form={form} activity={activity} goal={goal} calc={calc} />
          </motion.div>
        </motion.div>
      )}

      {tab === 'about' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-sm leading-relaxed'>
          <p>
            Formulas: <b>Mifflin-St Jeor</b> for BMR:
            <br />
            Male: <code>10×kg + 6.25×cm − 5×age + 5</code>; Female: <code>10×kg + 6.25×cm − 5×age − 161</code>.
          </p>
          <p>
            TDEE = BMR × activity factor. Target calories apply your selected goal (% deficit/surplus). Macros default to protein <b>1.8 g/kg</b> and fat <b>0.8 g/kg</b> (editable). Carbs fill remaining calories.
          </p>
          <p className='text-slate-500'>Note: This gives estimates, not medical advice. Adjust based on progress (e.g., ±100–200 kcal every 2–3 weeks).</p>
        </motion.div>
      )}
    </div>
  );
}

/* =================== SMALL COMPONENTS =================== */

function Stat({ title, value, highlight = false, help }) {
  return (
    <div className={` card-glow rounded-xl p-3 border ${highlight ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className='flex items-center gap-1'>
        <div className='text-xs text-slate-600'>{title}</div>
        {help ? <Hint text={help} /> : null}
      </div>
      <div className='text-lg font-semibold tabular-nums'>{value}</div>
    </div>
  );
}

function Macro({ title, grams, kcal }) {
  return (
    <div className='card-glow rounded-lg bg-slate-50 p-3'>
      <div className='text-slate-500 text-sm'>{title}</div>
      <div className='font-semibold'>{grams} g</div>
      <div className='text-xs text-slate-500'>{kcal} kcal</div>
    </div>
  );
}

function SummaryBlock({ form, activity, goal, calc }) {
  const [copied, setCopied] = useState(false);
  const text = `BMR: ${calc.baseBMR} kcal
TDEE: ${calc.tdee} kcal
Target: ${calc.target} kcal (${goal.label}, activity ×${activity.factor})
Macros: P ${calc.proteinG} g • C ${calc.carbsG} g • F ${calc.fatG} g
Per meal (x${form.mealsPerDay}): ${calc.perMeal.kcal} kcal | P ${calc.perMeal.p}g • C ${calc.perMeal.c}g • F ${calc.perMeal.f}g`;

  function copy() {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  }

  return (
    <div className='card-glow rounded-xl border border-slate-200 p-3'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold'>Summary</div>
        <button onClick={copy} className={`text-xs px-3 py-1.5 rounded-lg border ${copied ? 'border-green-200 text-green-700 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className='mt-2 text-xs whitespace-pre-wrap text-slate-700'>{text}</pre>
    </div>
  );
}

/* =================== STORAGE =================== */
function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
