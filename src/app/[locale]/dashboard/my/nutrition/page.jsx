'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, TabsPill, spring } from '@/components/dashboard/ui/UI';
import { Utensils, Info, Menu as MenuIcon, Plus, Trash2, X, Calculator } from 'lucide-react';

/* ========================= THEME ========================= */
const PALETTE = {
  bg: 'bg-[#f7f9fc]',
  card: 'bg-white shadow-sm border border-slate-200',
  text: 'text-slate-900',
  subtext: 'text-slate-600',
  ring: { base: '#E5E7EB', fill: '#6366F1', ok: '#10B981' },
};
// Arabic font helper (ensure Tajawal/Cairo is loaded globally)
const AR_FONT_CLASS = 'font-ar'; // .font-ar { font-family: "Tajawal", system-ui, -apple-system, "Segoe UI", "Noto Sans Arabic", sans-serif; }

/* ========================= STORAGE KEYS ========================= */
const STORAGE_KEYS = {
  ui: 'mw.nutri.ui.v3',
  dayState: 'mw.nutri.state.v4',
  profile: 'mw.nutri.profile.v3',
  grocery: 'mw.nutri.grocery.v1',
};

const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

/* ========================= BASE MEALS ========================= */
const baseMeals = [
  {
    id: 'm1',
    title: 'Meal 1',
    items: [
      { id: 'm1-eggs', label: '2 whole eggs', kcal: 150 },
      { id: 'm1-toast', label: '2 brown toast', kcal: 160 },
      { id: 'm1-veggies', label: 'Vegetables', kcal: 40 },
    ],
    subs: ['يمكن تبديل 2 brown toast برغيف عيش بلدي.'],
  },
  {
    id: 'm2',
    title: 'Meal 2',
    items: [
      { id: 'm2-oats', label: '50g oats', kcal: 190 },
      { id: 'm2-nuts', label: '10g nuts', kcal: 60 },
      { id: 'm2-banana', label: '150g banana', kcal: 135 },
      { id: 'm2-milk', label: '100ml milk', kcal: 50 },
    ],
    subs: ['الموز ↔ فراولة / تفاح / جوافة / كمثرى.'],
  },
  {
    id: 'm3',
    title: 'Meal 3',
    items: [
      { id: 'm3-protein', label: '150g chicken/fish', kcal: 240 },
      { id: 'm3-rice', label: '150g rice', kcal: 200 },
      { id: 'm3-nuts', label: '10g nuts', kcal: 60 },
      { id: 'm3-veggies', label: 'Vegetables', kcal: 40 },
    ],
    subs: ['كل 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.'],
  },
  {
    id: 'm4',
    title: 'Meal 4',
    items: [
      { id: 'm4-protein', label: '150g chicken/fish', kcal: 240 },
      { id: 'm4-rice', label: '150g rice', kcal: 200 },
      { id: 'm4-nuts', label: '10g nuts', kcal: 60 },
      { id: 'm4-veggies', label: 'Vegetables', kcal: 40 },
    ],
    subs: ['كل 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.'],
  },
  {
    id: 'm5',
    title: 'Meal 5',
    items: [
      { id: 'm5-yog', label: 'Greek yogurt', kcal: 120 },
      { id: 'm5-berry', label: '100g strawberries', kcal: 35 },
    ],
    subs: ['Greek yogurt ↔ سكوب بروتين + 60ml milk.'],
  },
];

const guidelinesAr = ['١) مالتي فيتامين بعد الوجبة الأولى. ٢) أوميجا بعد الثانية. ٣) زنك بعد الأخيرة.', '٤) الملح معتدل. ٥) اشرب ماء كفاية حسب احتياجك.', '٦) مشروبات دايت مسموحة. ٧) وزن الطعام بعد الطبخ.', '٨) ابتعد عن الزيوت المهدرجة/السكر المصنع.', '٩) 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.', '١٠) يمكن دمج الوجبات أو تبديل ترتيبها.'];

/* ========================= HELPERS ========================= */
function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function makeDefaultDayState() {
  const items = {};
  baseMeals.forEach(m =>
    m.items.forEach(it => {
      items[it.id] = false;
    }),
  );
  return { items, mealsDone: baseMeals.reduce((a, m) => ({ ...a, [m.id]: false }), {}) };
}

/* ========================= PRIMITIVES ========================= */
function Ring({ size = 84, stroke = 10, value = 0, color = PALETTE.ring.fill, track = PALETTE.ring.base, label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div className='relative' style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill='none' />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill='none' strokeDasharray={`${dash} ${c - dash}`} strokeLinecap='round' transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className='absolute inset-0 grid place-items-center'>
        <div className='text-center'>
          <div className='text-sm font-semibold text-slate-900'>{Math.round(pct)}%</div>
          {label && <div className='text-[10px] text-slate-500'>{label}</div>}
          {sub && <div className='text-[10px] text-slate-500'>{sub}</div>}
        </div>
      </div>
    </div>
  );
}
function StatCard({ children, className = '' }) {
  return <div className={`rounded-2xl ${PALETTE.card} p-4 ${className}`}>{children}</div>;
}
function Mini({ title, value, children }) {
  return (
    <div className='rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-white'>
      <div className='text-[11px]/5'>{title}</div>
      {value !== undefined ? <div className='text-sm font-semibold'>{value}</div> : children}
    </div>
  );
}

/* ========================= FOOD MIXER BOX ========================= */
/* kcal/100g (milk as kcal/100ml). Editable. */
const MIX_DEFAULTS = [
  { id: 'milk', name: 'حليب', grams: 300, per100: 64 },
  { id: 'peanut', name: 'فول سوداني', grams: 90, per100: 567 },
  { id: 'oats', name: 'شوفان', grams: 40, per100: 389 },
  { id: 'sesame', name: 'سمسم', grams: 60, per100: 573 },
  { id: 'choc', name: 'شوكولاتة', grams: 100, per100: 546 },
  { id: 'honey', name: 'عسل', grams: 50, per100: 304 },
];
const MIX_MEAL2 = [
  { id: 'pane', name: 'بانيه', grams: 200, per100: 210 },
  { id: 'rice', name: 'رز', grams: 250, per100: 130 },
  { id: 'rais', name: 'زبيب', grams: 50, per100: 299 },
];

function FoodMixerBox({ value, onChange }) {
  const [list1, setList1] = useState(value?.list1 || MIX_DEFAULTS);
  const [list2, setList2] = useState(value?.list2 || MIX_MEAL2);

  useEffect(() => {
    onChange?.({ list1, list2 });
  }, [list1, list2]);

  const calcK = items => items.reduce((s, i) => s + ((Number(i.per100) || 0) * (Number(i.grams) || 0)) / 100, 0);
  const k1 = Math.round(calcK(list1));
  const k2 = Math.round(calcK(list2));
  const total = k1 + k2;

  const ItemRow = ({ it, onSet }) => (
    <div className='grid grid-cols-12 gap-2 items-center'>
      <div className='col-span-4 text-sm'>{it.name}</div>
      <div className='col-span-4 flex items-center gap-2'>
        <label className='text-xs text-slate-500 hidden sm:block'>g</label>
        <input type='number' className='h-9 !w-[50px] rounded-lg border border-slate-200 px-3 text-sm' value={it.grams} onChange={e => onSet({ ...it, grams: Number(e.target.value || 0) })} aria-label='grams' />
      </div>
      <div className='col-span-4 flex items-center gap-2'>
        <label className='text-xs text-slate-500 hidden sm:block'>kcal/100g</label>
        <input type='number' className='h-9 !w-[50px] rounded-lg border border-slate-200 px-3 text-sm' value={it.per100} onChange={e => onSet({ ...it, per100: Number(e.target.value || 0) })} aria-label='kcal per 100g' />
      </div>
    </div>
  );

  return (
    <>
      <div dir='rtl' className={` font-ar rounded-xl border border-slate-200 bg-white p-3 ${AR_FONT_CLASS}`}>
        <div className='font-semibold mb-2'>خلطة السعرات</div>
        <div className='space-y-2'>
          {list1.map((it, idx) => (
            <ItemRow key={it.id} it={it} onSet={n => setList1(l => l.map((x, i) => (i === idx ? n : x)))} />
          ))}
        </div>
        <div className='mt-3 text-sm text-slate-700'>
          الإجمالي: <span className='font-semibold'>{k1}</span> kcal
        </div>
      </div>

      <div dir='rtl' className={`rounded-xl border border-slate-200 bg-white p-3 ${AR_FONT_CLASS}`}>
        <div className='font-semibold mb-2'>وجبة إضافية</div>
        <div className='space-y-2'>
          {list2.map((it, idx) => (
            <ItemRow key={it.id} it={it} onSet={n => setList2(l => l.map((x, i) => (i === idx ? n : x)))} />
          ))}
        </div>
        <div className='mt-3 text-sm text-slate-700'>
          الإجمالي: <span className='font-semibold'>{k2}</span> kcal
        </div>
      </div>
    </>
  );
}

/* ========================= GROCERY DRAWER (ENGLISH) ========================= */
function GroceryDrawer({ open, onClose }) {
  const [items, setItems] = useState(() =>
    loadLS(STORAGE_KEYS.grocery, [
      { id: 'gr-1', label: 'Chicken breast', checked: false },
      { id: 'gr-2', label: 'Rice', checked: false },
      { id: 'gr-3', label: 'Oats', checked: false },
      { id: 'gr-4', label: 'Milk', checked: false },
    ]),
  );
  const [newText, setNewText] = useState('');

  useEffect(() => saveLS(STORAGE_KEYS.grocery, items), [items]);

  const addItem = () => {
    const t = newText.trim();
    if (!t) return;
    setItems(prev => [...prev, { id: `gr-${Date.now()}`, label: t, checked: false }]);
    setNewText('');
  };
  const toggle = id => setItems(prev => prev.map(x => (x.id === id ? { ...x, checked: !x.checked } : x)));
  const remove = id => setItems(prev => prev.filter(x => x.id !== id));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[75] bg-black/30' onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }} className='fixed right-0 top-0 h-full w-[88%] max-w-sm z-[80] bg-white shadow-2xl border-l border-slate-200' onClick={e => e.stopPropagation()}>
            <div className='p-3 flex items-center justify-between border-b border-slate-100'>
              <div className='font-semibold flex items-center gap-2'>Grocery List</div>
              <button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100'>
                <X size={16} />
              </button>
            </div>

            <div className=' font-ar p-3 space-y-3'>
              <div className='grid grid-cols-12 gap-2'>
                <input className='col-span-10 rounded-lg border border-slate-200 h-10 px-3 text-sm' value={newText} onChange={e => setNewText(e.target.value)} placeholder='Add an item…' />
                <button onClick={addItem} className=' cursor-pointer col-span-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm'>
                  <Plus size={16} className='inline-block mr-1' />
                </button>
              </div>

              <div dir='rtl' className=' font-ar divide-y divide-slate-200'>
                {items.map(it => (
                  <label key={it.id} className='py-2 flex items-center gap-3'>
                    <input type='checkbox' checked={!!it.checked} onChange={() => toggle(it.id)} className='h-4 w-4' />
                    <div className='flex-1 text-sm'>{it.label}</div>
                    <button onClick={() => remove(it.id)} className='h-8 w-8 grid place-items-center rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'>
                      <Trash2 size={14} />
                    </button>
                  </label>
                ))}
                {!items.length && <div className='text-sm text-slate-500 py-2'>Your list is empty.</div>}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ========================= CALC POPUP (clear labels + kg/week) ========================= */
function CalcPopup({ open, onClose, onSave, initial }) {
  const [sex, setSex] = useState(initial?.sex || 'male');
  const [age, setAge] = useState(initial?.age || 28);
  const [height, setHeight] = useState(initial?.height || 175); // cm
  const [weight, setWeight] = useState(initial?.weight || 75); // kg
  const [activity, setActivity] = useState(initial?.activity || 1.55); // multiplier
  // Desired weekly change in kg (positive = gain, negative = loss)
  const [kgPerWeek, setKgPerWeek] = useState(initial?.kgPerWeek ?? 0);

  const kcalFromKgPerWeek = Math.round(((Number(kgPerWeek) || 0) * 7700) / 7); // ~1100 per kg/day

  const calc = () => {
    const s = sex === 'male' ? 5 : -161; // Mifflin-St Jeor
    const BMR = Math.round(10 * weight + 6.25 * height - 5 * age + s);
    const TDEE = Math.round(BMR * Number(activity));
    const target = Math.max(1200, TDEE + kcalFromKgPerWeek);
    return { BMR, TDEE, target };
  };

  const { BMR, TDEE, target } = calc();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[85] bg-black/30' onClick={onClose} />
          <motion.div initial={{ scale: 0.98, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 8 }} className='fixed inset-0 z-[90] grid place-items-center p-4' onClick={onClose}>
            <div className='w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl' onClick={e => e.stopPropagation()}>
              <div className='p-4 border-b border-slate-100 flex items-center justify-between'>
                <div className='font-semibold flex items-center gap-2'>
                  <Calculator size={16} /> Calculate Calories
                </div>
                <button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100'>
                  <X size={16} />
                </button>
              </div>

              <div className='p-4 space-y-4'>
                <div className='grid grid-cols-2 gap-2'>
                  <label className='text-xs text-slate-600'>
                    Sex
                    <select value={sex} onChange={e => setSex(e.target.value)} className='mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm'>
                      <option value='male'>Male</option>
                      <option value='female'>Female</option>
                    </select>
                  </label>

                  <label className='text-xs text-slate-600'>
                    Age (years)
                    <input type='number' value={age} onChange={e => setAge(+e.target.value)} className='mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm' placeholder='Age' />
                  </label>

                  <label className='text-xs text-slate-600'>
                    Height (cm)
                    <input type='number' value={height} onChange={e => setHeight(+e.target.value)} className='mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm' placeholder='Height' />
                  </label>

                  <label className='text-xs text-slate-600'>
                    Weight (kg)
                    <input type='number' value={weight} onChange={e => setWeight(+e.target.value)} className='mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm' placeholder='Weight' />
                  </label>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <label className='text-xs text-slate-600'>
                    Activity
                    <select value={activity} onChange={e => setActivity(+e.target.value)} className='mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm'>
                      <option value={1.2}>Sedentary (1.2)</option>
                      <option value={1.375}>Light (1.375)</option>
                      <option value={1.55}>Moderate (1.55)</option>
                      <option value={1.725}>Active (1.725)</option>
                      <option value={1.9}>Very active (1.9)</option>
                    </select>
                  </label>

                  <label className='text-xs text-slate-600'>
                    Desired change (kg/week)
                    <input type='number' step='0.1' value={kgPerWeek} onChange={e => setKgPerWeek(e.target.value)} className='mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm' placeholder='e.g., -0.5 to cut or 0.3 to bulk' />
                    <div className='text-[11px] text-slate-500 mt-1'>
                      ≈ {kcalFromKgPerWeek > 0 ? '+' : ''}
                      {kcalFromKgPerWeek} kcal/day adjustment
                    </div>
                  </label>
                </div>

                <div className='rounded-xl border border-slate-200 p-3 grid grid-cols-3 gap-2 text-sm'>
                  <div title='Calories your body burns at rest'>
                    <div className='text-[11px] text-slate-600 leading-4'>
                      Basal Metabolic Rate <span className='opacity-70'>(BMR)</span>
                    </div>
                    <span className='font-semibold text-slate-900'>{BMR}</span>
                  </div>

                  <div title='BMR × activity level'>
                    <div className='text-[11px] text-slate-600 leading-4'>
                      Maintenance Calories <span className='opacity-70'>(TDEE)</span>
                    </div>
                    <span className='font-semibold text-slate-900'>{TDEE}</span>
                  </div>

                  <div title='TDEE ± goal/adjustment'>
                    <div className='text-[11px] text-slate-600 leading-4'>Daily Target Calories</div>
                    <span className='font-semibold text-slate-900'>{target}</span>
                  </div>
                </div>
              </div>

              <div className='p-4 border-t border-slate-100 flex items-center justify-end gap-2'>
                <button onClick={onClose} className='px-3 py-1.5 rounded-lg border border-slate-200 text-sm'>
                  Cancel
                </button>
                <button onClick={() => onSave?.({ sex, age, height, weight, activity, kgPerWeek: Number(kgPerWeek) || 0, targetKcal: target })} className='px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100'>
                  Save target
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ========================= PAGE ========================= */
export default function NutritionPage() {
  const [tab, setTab] = useState('meals'); // meals | guidelines
  const [selectedDay, setSelectedDay] = useState('saturday');
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // profile: no Client card anymore; keep only targetKcal
  const [profile, setProfile] = useState(() => loadLS(STORAGE_KEYS.profile, { targetKcal: 2200, calc: null }));

  const [dayState, setDayState] = useState(() => {
    const saved = loadLS(STORAGE_KEYS.dayState, {});
    const filled = { ...saved };
    weekOrder.forEach(d => {
      if (!filled[d]) filled[d] = makeDefaultDayState();
    });
    return filled;
  });

  /* Persist UI state */
  useEffect(() => {
    const ui = loadLS(STORAGE_KEYS.ui, { tab, selectedDay });
    setTab(ui.tab || 'meals');
    setSelectedDay(ui.selectedDay || 'saturday');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    saveLS(STORAGE_KEYS.ui, { tab, selectedDay });
  }, [tab, selectedDay]);
  useEffect(() => {
    saveLS(STORAGE_KEYS.profile, profile);
  }, [profile]);
  useEffect(() => {
    saveLS(STORAGE_KEYS.dayState, dayState);
  }, [dayState]);

  const todays = dayState[selectedDay] || makeDefaultDayState();

  /* Completion % and kcal from “base meals” only */
  const totalItems = baseMeals.reduce((s, m) => s + m.items.length, 0);
  const totalDone = Object.values(todays.items).filter(Boolean).length;
  const completionPct = (totalDone / Math.max(1, totalItems)) * 100;

  const mealStats = useMemo(() => {
    return baseMeals.map(m => {
      const done = m.items.filter(it => todays.items[it.id]);
      const kcalTotal = m.items.reduce((s, i) => s + (i.kcal || 0), 0);
      const kcalDone = done.reduce((s, i) => s + (i.kcal || 0), 0);
      return { id: m.id, title: m.title, doneCount: done.length, total: m.items.length, kcalDone, kcalTotal };
    });
  }, [todays]);

  const kcalMealsDone = mealStats.reduce((s, m) => s + m.kcalDone, 0);

  // FoodMixer totals
  const [mixerState, setMixerState] = useState({ list1: MIX_DEFAULTS, list2: MIX_MEAL2 });
  const mixerK1 = Math.round(mixerState.list1.reduce((s, i) => s + (i.per100 * i.grams) / 100, 0));
  const mixerK2 = Math.round(mixerState.list2.reduce((s, i) => s + (i.per100 * i.grams) / 100, 0));
  const kcalToday = kcalMealsDone + mixerK1 + mixerK2;

  const toggleItem = id => setDayState(p => ({ ...p, [selectedDay]: { ...p[selectedDay], items: { ...p[selectedDay].items, [id]: !p[selectedDay].items[id] } } }));
  const markMeal = (mealId, val) =>
    setDayState(p => {
      const meal = baseMeals.find(m => m.id === mealId);
      if (!meal) return p;
      const next = { ...p[selectedDay].items };
      meal.items.forEach(i => (next[i.id] = val));
      return { ...p, [selectedDay]: { ...p[selectedDay], items: next, mealsDone: { ...p[selectedDay].mealsDone, [mealId]: val } } };
    });

  const dayTabs = weekOrder.map(d => ({ key: d, label: d, name: d[0].toUpperCase() + d.slice(1) }));

  /* ========================= RENDER ========================= */
  return (
    <div className={`${PALETTE.bg} min-h-[100dvh] ${PALETTE.text}`}>
      <div className=' space-y-6'>
        {/* Banner */}
        <div className=' rounded-none max-md:w-[calc(100%+30px)] max-md:ltr:ml-[-15px] max-md:rtl:mr-[-15px] max-md:mt-[-15px]  md:rounded-3xl overflow-hidden border border-indigo-200'>
          <div className='relative p-4 md:p-8 bg-gradient-to-tr from-indigo-500 to-sky-400 text-white'>
            <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
            <div className='relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between'>
              <PageHeader icon={Utensils} title='Nutrition' subtitle='Track meals • mix calories • quick actions' />
              <div className='grid grid-cols-2 md:grid-cols-2 gap-3'>
                <Mini title='Today kcal' value={`${kcalToday}`} />
                <Mini title='Target kcal'>
                  <div className='flex  items-center gap-2'>
                    <input type='number' value={profile.targetKcal} onChange={e => setProfile(p => ({ ...p, targetKcal: Number(e.target.value || 0) }))} className='w-full rounded-lg bg-white/20 border border-white/30 px-2 py-1 text-sm text-white outline-none placeholder:text-white/80' placeholder='2200' />
                    <button onClick={() => setCalcOpen(true)} className='inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2 py-1  h-[30px] text-xs hover:bg-white/20'>
                      <Calculator size={16} /> <span className='max-md:hidden' >Calc</span>
                    </button>
                  </div>
                </Mini>
              </div>
            </div>
          </div>

          {/* Secondary bar: Days Tabs + Actions */}
          <div className='px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white'>
            <div className='flex-1'>
              <TabsPill className={'!rounded-xl'} slice={3} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={setSelectedDay} />
            </div>

            <div className='flex items-center gap-2'>
              <button onClick={() => setGroceryOpen(true)} className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
                <MenuIcon size={16} /> Grocery
              </button>

              <TabsPill
                id='nutri-tabs'
                tabs={[
                  { key: 'meals', label: 'Meals', icon: Utensils },
                  { key: 'guidelines', label: 'Guidelines', icon: Info },
                ]}
                active={tab}
                onChange={setTab}
              />
            </div>
          </div>
        </div>

        {/* Summary Row: Completion + FoodMixerBox */}
        <div className='grid lg:grid-cols-3 gap-4'>
          <StatCard className='lg:col-span-1'>
            <div className='flex items-center gap-4'>
              <Ring value={completionPct} label='Completed' sub={`${totalDone}/${totalItems}`} />
              <div>
                <div className='text-sm text-slate-500'>Meals progress</div>
                <div className='text-2xl font-semibold'>Completion</div>
                <div className='text-slate-500 text-sm mt-1'>Check items to fill the ring</div>
              </div>
            </div>
          </StatCard>
        </div>

        {/* TABS (exclusive) */}
        {tab === 'meals' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-6'>
            {/* Meals grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              <FoodMixerBox value={mixerState} onChange={setMixerState} />
              {baseMeals.map(m => {
                const doneCount = m.items.filter(i => todays.items[i.id]).length;
                const allDone = doneCount === m.items.length;
                const kcalTotal = m.items.reduce((s, i) => s + (i.kcal || 0), 0);
                const kcalDone = m.items.filter(i => todays.items[i.id]).reduce((s, i) => s + (i.kcal || 0), 0);

                return (
                  <div key={m.id} className={`rounded-2xl ${PALETTE.card} p-4`}>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-semibold'>{m.title}</div>
                        <div className='text-xs text-slate-500'>
                          {doneCount}/{m.items.length} • {kcalDone}/{kcalTotal} kcal
                        </div>
                      </div>
                      <button onClick={() => markMeal(m.id, !allDone)} className={`px-3 py-1.5 text-xs rounded-lg border ${allDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        {allDone ? 'Unmark' : 'Mark meal'}
                      </button>
                    </div>

                    <div className='mt-3 space-y-2'>
                      {m.items.map(i => {
                        const checked = !!todays.items[i.id];
                        return (
                          <label key={i.id} className='flex items-center gap-3'>
                            <input type='checkbox' checked={checked} onChange={() => toggleItem(i.id)} className='h-4 w-4 rounded border-slate-300' />
                            <div className='flex-1 flex items-center justify-between'>
                              <span className={`text-sm ${checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>{i.label}</span>
                              <span className='text-xs text-slate-500'>{i.kcal} kcal</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {m.subs?.length ? (
                      <div className={`mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 ${AR_FONT_CLASS}`}>
                        <div className='text-xs text-slate-700 mb-1'>بدائل ذكية</div>
                        <ul className='list-disc pl-5 text-xs text-slate-600 space-y-1'>
                          {m.subs.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === 'guidelines' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={`rounded-2xl ${PALETTE.card} p-5 ${AR_FONT_CLASS}`}>
            <div className='font-semibold mb-2 flex items-center gap-2'>
              <Info size={16} /> الإرشادات
            </div>
            <ul className='space-y-2 text-sm text-slate-800 leading-6'>
              {guidelinesAr.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Drawers / Popups */}
      <GroceryDrawer open={groceryOpen} onClose={() => setGroceryOpen(false)} />
      <CalcPopup
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        initial={profile.calc || undefined}
        onSave={data => {
          setCalcOpen(false);
          setProfile(p => ({ ...p, targetKcal: data.targetKcal, calc: data }));
        }}
      />
    </div>
  );
}
