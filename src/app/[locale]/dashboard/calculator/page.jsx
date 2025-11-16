

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

// ✅ atoms
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';

// ✅ header/cards
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { StatCard } from '@/components/dashboard/ui/UI';

// Icons
import { Flame, Apple, Calculator, Gauge, Ruler, Info, Search, Trash } from 'lucide-react';
import { DEFAULT_FOODS } from './FoodCalorieDB';

/* ===== Storage keys ===== */
const LS = {
  PROFILE: 'dailycal_profile_v3',
  MEAL: 'dailycal_meal_v3',
  CUSTOM_FOODS: 'dailycal_customfoods_v1',
};

/* ===== Activity (clearer wording) ===== */
const ACTIVITY = [
  { id: '1.2', label_ar: 'مكتبي/دراسة (بدون تمرين)', label_en: 'Desk / Study (no exercise)' },
  { id: '1.375', label_ar: 'وظيفة خفيفة + تمرين 1–3x/أسبوع', label_en: 'Light job + 1–3x/week training' },
  { id: '1.55', label_ar: 'بيع/وقوف/تحرّك + تمرين 3–5x/أسبوع', label_en: 'Retail/Standing + 3–5x/week training' },
  { id: '1.725', label_ar: 'مجهود بدني عالي + تمرين 6–7x/أسبوع', label_en: 'Manual labor + 6–7x/week training' },
  { id: '1.9', label_ar: 'شغل بدني ثقيل + تمرين مكثّف/رياضي', label_en: 'Heavy labor + intense/athlete' },
];

/* ===== Goals (labels; live kg/month is computed dynamically) ===== */
const GOALS = [
  { id: '-20', label_ar: 'تشييف -20%', label_en: 'Cutting -20%' },
  { id: '-10', label_ar: 'تشييف خفيف -10%', label_en: 'Light Cutting -10%' },
  { id: '0', label_ar: 'ثبات 0%', label_en: 'Maintenance 0%' },
  { id: '+10', label_ar: 'تضخيم خفيف +10%', label_en: 'Light Bulking +10%' },
  { id: '+20', label_ar: 'تضخيم +20%', label_en: 'Bulking +20%' },
];

// estimate kg/month from TDEE and goal percent
function goalKgPerMonth(tdee, goalStr) {
  const pct = parseFloat(goalStr || '0') / 100;
  if (!tdee || !pct) return 0;
  const dailyDelta = tdee * pct; // kcal/day
  return (dailyDelta * 30) / 7700; // ≈ kg/month
}

/* ===== Utils ===== */
function toNumber(v, d = 0) {
  if (v === '' || v === null || typeof v === 'undefined') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function round(n, p = 0) {
  const k = 10 ** p;
  return Math.round(n * k) / k;
}

/* ===== BMR (Mifflin–St Jeor) ===== */
function bmrMifflin({ sex, weightKg, heightCm, age }) {
  if (!sex || !weightKg || !heightCm || !age) return 0;
  const s = sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

/* ===== Tooltip ===== */
function Tooltip({ label, children }) {
  return (
    <span className='relative inline-flex items-center group cursor-help'>
      {children}
      <span className='pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rtl:left-auto rtl:right-0 rtl:translate-x-0 whitespace-pre rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20'>{label}</span>
    </span>
  );
}
function InfoBadge({ title }) {
  return (
    <Tooltip label={title}>
      <Info className='w-3.5 h-3.5 text-slate-400 ml-1' />
    </Tooltip>
  );
}

/* ===== Small UI bits ===== */
function ReadStat({ title, value }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
      <div className='text-[11px] text-slate-500'>{title}</div>
      <div className='text-slate-800 font-semibold'>{value}</div>
    </div>
  );
}
function SmallStat({ title, value }) {
  return (
    <div>
      <div className='text-[11px] text-slate-500 mb-0.5'>{title}</div>
      <div className='text-slate-800 font-medium'>{value}</div>
    </div>
  );
}
function SummaryRow({ label, value, big = false }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border ${big ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'} px-3 py-2`}>
      <div className={`font-medium ${big ? 'text-indigo-800' : 'text-slate-700'}`}>{label}</div>
      <div className={`${big ? 'text-xl md:text-2xl font-bold text-indigo-700' : 'text-sm text-slate-700'}`}>{value}</div>
    </div>
  );
}
function Pill({ title, value, sub, color = 'indigo' }) {
  const palette =
    {
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
    }[color] || 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <div className={`p-3 rounded-lg border ${palette}`}>
      <div className='flex items-center flex-wrap justify-between gap-1'>
        <div className='text-xs'>{title}</div>
        <div className='flex items-baseline gap-1 text-sm font-semibold leading-none'>
          {value}
          {sub ? <div className='text-[10px] rtl:order-[-2]'>{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* ===== Food Search (typeahead, AR/EN) ===== */
function FoodSearch({ foods, value, onChange, onPick, placeholder }) {
  const locale = useLocale();
  const isEn = (locale || '').toLowerCase().startsWith('en');
  const [open, setOpen] = useState(false);

  const norm = s => (s || '').toString().toLowerCase().trim();
  const results = useMemo(() => {
    const q = norm(value);
    return foods.filter(f => norm(f.name).includes(q) || norm(f.name_en).includes(q));
  }, [value, foods]);

  const labelOf = f => (isEn ? f.name_en || f.name : f.name || f.name_en || '');

  const pick = item => {
    onPick?.(item);
    setOpen(false);
  };

  const onBlurSafeClose = () => setTimeout(() => setOpen(false), 120);

  return (
    <div className='relative z-[100] '>
      <div className='relative'>
        <Search className='absolute top-1/2 -translate-y-1/2 rtl:left-3 ltr:left-3 w-4 h-4 text-slate-400 pointer-events-none' />
        <input
          className='w-full h-11 pl-9 pr-3 rounded-lg border border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-sm bg-white'
          placeholder={placeholder}
          value={value}
          inputMode='search'
          onChange={e => {
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={onBlurSafeClose}
        />
      </div>

      {open && (
        <div className='absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-[280px] overflow-auto overscroll-contain'>
          {results.length === 0 ? (
            <div className='p-3 text-sm text-slate-500'>لا توجد نتائج / No results</div>
          ) : (
            results.map(f => (
              <button key={f.id} type='button' onMouseDown={e => e.preventDefault()} onClick={() => pick(f)} className='w-full text-left px-3 py-3 text-[15px] hover:bg-indigo-50 focus:bg-indigo-50'>
                <div className='rtl:text-right font-medium text-slate-800 line-clamp-1'>{labelOf(f)}</div>
                <div className='rtl:text-right text-xs text-slate-500'>
                  {f.per} {f.unit} • {f.kcal} kcal • P {f.p} / C {f.c} / F {f.f}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function CaloriesDailyPage({ foods = DEFAULT_FOODS }) {
  const t = useTranslations('calorie');
  const locale = useLocale();
  const isEn = (locale || '').toLowerCase().startsWith('en');

  /* ===== Inputs (NO default values) ===== */
  const [sex, setSex] = useState(''); // '' | 'male' | 'female'
  const [age, setAge] = useState(''); // number string or ''
  const [height, setHeight] = useState(''); // cm
  const [weight, setWeight] = useState(''); // kg
  const [activity, setActivity] = useState(''); // multiplier string
  const [goal, setGoal] = useState(''); // delta string like '+10'

  /* ===== Foods (merge built-ins + custom if you add later) ===== */
  const [customFoods, setCustomFoods] = useState([]);
  const mergedFoods = useMemo(() => [...foods, ...customFoods], [foods, customFoods]);

  /* ===== Food calc + meal ===== */
  const [foodId, setFoodId] = useState(''); // selected id
  const [qty, setQty] = useState(''); // amount in selectedFood.unit
  const [mealItems, setMealItems] = useState([]); // { id, qty }

  /* ===== Food search value ===== */
  const [foodSearch, setFoodSearch] = useState('');

  /* ===== Generate summary flow ===== */
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ===== Persist / Load ===== */
  useEffect(() => {
    try {
      const prof = JSON.parse(localStorage.getItem(LS.PROFILE) || 'null');
      if (prof) {
        setSex(prof.sex ?? '');
        setAge(prof.age ?? '');
        setHeight(prof.height ?? '');
        setWeight(prof.weight ?? '');
        setActivity(prof.activity ?? '');
        setGoal(prof.goal ?? '');
      }
      const savedMeal = JSON.parse(localStorage.getItem(LS.MEAL) || 'null');
      if (savedMeal && Array.isArray(savedMeal)) setMealItems(savedMeal);
      const savedFoods = JSON.parse(localStorage.getItem(LS.CUSTOM_FOODS) || 'null');
      if (savedFoods && Array.isArray(savedFoods)) setCustomFoods(savedFoods);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(LS.PROFILE, JSON.stringify({ sex, age, height, weight, activity, goal }));
  }, [sex, age, height, weight, activity, goal]);
  useEffect(() => {
    localStorage.setItem(LS.MEAL, JSON.stringify(mealItems));
  }, [mealItems]);

  /* ===== Numbers for math (0 if empty) ===== */
  const ageN = toNumber(age, 0);
  const heightN = toNumber(height, 0);
  const weightN = toNumber(weight, 0);
  const actMult = activity ? parseFloat(activity) : 0;
  const goalPct = goal ? parseFloat(goal) / 100 : 0;

  /* ===== Calculations ===== */
  const bmr = useMemo(() => bmrMifflin({ sex, weightKg: weightN, heightCm: heightN, age: ageN }), [sex, weightN, heightN, ageN]);
  const tdee = useMemo(() => (bmr && actMult ? bmr * actMult : 0), [bmr, actMult]);
  const targetCalories = useMemo(() => (tdee ? tdee * (1 + goalPct) : 0), [tdee, goalPct]);

  // Macro suggestion when weight provided
  const proteinG = useMemo(() => (weightN ? clamp(2 * weightN, 80, 250) : 0), [weightN]);
  const fatG = useMemo(() => (weightN ? clamp(0.9 * weightN, 40, 140) : 0), [weightN]);
  const carbsG = useMemo(() => {
    if (!targetCalories) return 0;
    const pCal = proteinG * 4;
    const fCal = fatG * 9;
    return Math.max(0, (targetCalories - pCal - fCal) / 4);
  }, [targetCalories, proteinG, fatG]);

  const macroPct = useMemo(() => {
    const pCal = proteinG * 4;
    const fCal = fatG * 9;
    const cCal = carbsG * 4;
    const sum = pCal + fCal + cCal || 1;
    return {
      p: Math.round((pCal / sum) * 100),
      c: Math.round((cCal / sum) * 100),
      f: Math.round((fCal / sum) * 100),
    };
  }, [proteinG, fatG, carbsG]);

  // Locale-aware food name
  const displayName = f => (isEn ? f.name_en || f.name : f.name || f.name_en || '');

  // Filter for search dropdown
  const filteredFoods = useMemo(() => {
    const q = (foodSearch || '').toLowerCase().trim();
    if (!q) return mergedFoods;
    return mergedFoods.filter(f => {
      const a = (f.name || '').toLowerCase();
      const b = (f.name_en || '').toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [mergedFoods, foodSearch]);

  // Selected food by id
  const selectedFood = useMemo(() => mergedFoods.find(f => f.id === foodId) || null, [mergedFoods, foodId]);

  // Quick single item totals
  const qtyN = toNumber(qty, 0);
  const quickFoodTotals = useMemo(() => {
    if (!selectedFood || !qtyN) return { kcal: 0, p: 0, c: 0, f: 0, unit: selectedFood?.unit || '' };
    const factor = qtyN / selectedFood.per;
    return {
      kcal: round(selectedFood.kcal * factor),
      p: round(selectedFood.p * factor, 1),
      c: round(selectedFood.c * factor, 1),
      f: round(selectedFood.f * factor, 1),
      unit: selectedFood.unit,
    };
  }, [selectedFood, qtyN]);

  // Meal totals
  const findFood = id => mergedFoods.find(f => f.id === id);
  const mealTotals = useMemo(() => {
    let kcal = 0,
      p = 0,
      c = 0,
      f = 0;
    for (const it of mealItems) {
      const food = findFood(it.id);
      const q = toNumber(it.qty, 0);
      if (!food || !q) continue;
      const factor = q / food.per;
      kcal += food.kcal * factor;
      p += food.p * factor;
      c += food.c * factor;
      f += food.f * factor;
    }
    return { kcal: round(kcal), p: round(p, 1), c: round(c, 1), f: round(f, 1) };
  }, [mealItems]);

  // Header stats
  const headerStats = {
    bmr: Math.round(bmr || 0),
    tdee: Math.round(tdee || 0),
    target: Math.round(targetCalories || 0),
    protein: Math.round(proteinG || 0),
    carbs: Math.round(carbsG || 0),
    fat: Math.round(fatG || 0),
  };

  /* ===== Options (locale-aware) ===== */
  const sexOptions = [
    { id: 'male', label: t('sex.male') },
    { id: 'female', label: t('sex.female') },
  ];
  const activityOptions = ACTIVITY.map(a => ({
    id: a.id,
    label: isEn ? a.label_en : a.label_ar,
  }));

  // goal label + live kg/month badge (always computed so user sees the value)
  const goalOptions = GOALS.map(g => {
    const kg = goalKgPerMonth(tdee, g.id);
    const kgAbs = Math.abs(kg).toFixed(2);
    const isCut = parseFloat(g.id) < 0;
    const isBulk = parseFloat(g.id) > 0;

    const labelAR = isCut ? `${g.label_ar} → نقص ≈ ${kgAbs} كجم/الشهر` : isBulk ? `${g.label_ar} → زيادة ≈ ${kgAbs} كجم/الشهر` : `${g.label_ar} → بدون تغيير`;

    const labelEN = isCut ? `${g.label_en} → ≈ ${kgAbs} kg/month loss` : isBulk ? `${g.label_en} → ≈ ${kgAbs} kg/month gain` : `${g.label_en} → no change`;

    return {
      id: g.id,
      label: isEn ? labelEN : labelAR,
    };
  });

  /* ===== Actions ===== */
  const resetAll = () => {
    setSex('');
    setAge('');
    setHeight('');
    setWeight('');
    setActivity('');
    setGoal('');
    setFoodSearch('');
    setFoodId('');
    setQty('');
    setMealItems([]);
    setShowSummary(false);
    setIsGenerating(false);
    setProgress(0);
  };

  const addItem = () => {
    if (!selectedFood) return;
    const q = qtyN;
    if (q <= 0) return;
    const exists = mealItems.find(m => m.id === selectedFood.id);
    if (exists) setMealItems(prev => prev.map(m => (m.id === selectedFood.id ? { ...m, qty: toNumber(m.qty, 0) + q } : m)));
    else setMealItems(prev => [...prev, { id: selectedFood.id, qty: q }]);
  };
  const updateQty = (id, newQty) => setMealItems(prev => prev.map(m => (m.id === id ? { ...m, qty: clamp(toNumber(newQty, 0), 0, 100000) } : m)));
  const removeItem = id => setMealItems(prev => prev.filter(m => m.id !== id));

  const generateSummary = () => {
    setShowSummary(false);
    setIsGenerating(true);
    setProgress(0);
    const steps = [12, 35, 62, 84, 100];
    let i = 0;
    const tick = () => {
      setProgress(steps[i]);
      i++;
      if (i < steps.length) setTimeout(tick, 240);
      else {
        setIsGenerating(false);
        setShowSummary(true);
      }
    };
    setTimeout(tick, 220);
  };

  /* ===================== RENDER ===================== */
  return (
    <div className=' '>
      {/* Header — compact on mobile */}
      <GradientStatsHeader hiddenStats onClick={resetAll} btnName={t('actions.reset')} title={t('header.title')} desc={t('header.desc')} loadingStats={false}>
        <StatCard icon={Flame} title='BMR' value={headerStats.bmr} />
        <StatCard icon={Gauge} title='TDEE' value={headerStats.tdee} />
        <StatCard icon={Calculator} title={t('labels.targetKcal')} value={headerStats.target} />
      </GradientStatsHeader>

      {/* Content */}
      <div className=' py-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
        {/* BOX 1: Daily Need + Summary */}
        <section className='box-3d overflow-hidden rounded-lg sm:rounded-lg bg-white/90 backdrop-blur border border-slate-200 shadow-sm'>
          <header className='px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur z-10'>
            <Ruler className='w-4 h-4 text-indigo-600 shrink-0' />
            <h2 className='font-semibold text-slate-800 text-base sm:text-lg'>{t('sections.dailyNeed')}</h2>
          </header>

          <div className='p-3 sm:p-5 space-y-3 sm:space-y-4'>
            {/* Inputs (no defaults) */}
            <div className='grid grid-cols-2 gap-2 sm:gap-3'>
              <Select searchable={false} label={t('labels.sex')} options={sexOptions} value={sex} onChange={setSex} />
              <Input label={t('labels.ageYears')} type='number' inputMode='numeric' value={age} onChange={setAge} placeholder='—' />
              <Input label={t('labels.heightCm')} type='number' inputMode='numeric' value={height} onChange={setHeight} placeholder='—' />
              <Input label={t('labels.weightKg')} type='number' inputMode='numeric' value={weight} onChange={setWeight} placeholder='—' />
            </div>

            <div className='grid grid-cols-1 gap-2 sm:gap-3'>
              <Select searchable={false} label={t('labels.activity')} options={activityOptions} value={activity} onChange={setActivity} />
              <Select searchable={false} label={t('labels.goal')} options={goalOptions} value={goal} onChange={setGoal} />
            </div>

            {/* Generate Summary + Loader */}
            <div className='pt-1'>
              <Button name={t('actions.generateSummary')} onClick={generateSummary} className='!w-full sm:!w-fit' />
              {isGenerating && (
                <div className='mt-3'>
                  <div className='relative h-3 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200'>
                    <div
                      className='h-full transition-all duration-300'
                      style={{
                        width: `${progress}%`,
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(99,102,241,0.95) 0, rgba(99,102,241,0.95) 12px, rgba(165,180,252,0.95) 12px, rgba(165,180,252,0.95) 24px)',
                      }}
                    />
                  </div>
                  <div className='mt-1 flex items-center justify-between text-[11px] text-slate-500'>
                    <span>{t('loader.generating')}</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {showSummary && (
              <div className='mt-2 sm:mt-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 sm:p-4'>
                <div className='flex items-center gap-2 mb-2 sm:mb-3'>
                  <Calculator className='w-4 h-4 text-violet-600' />
                  <div className='font-semibold text-slate-800 text-sm sm:text-base'>{t('sections.summary')}</div>
                </div>

                <SummaryRow label={t('labels.targetCalories')} value={`${Math.round(targetCalories || 0)} kcal`} big />
                <div className='grid grid-cols-3 gap-2 mt-2'>
                  <Pill title={t('labels.protein')} value={`${Math.round(proteinG || 0)} g`} sub={`${macroPct.p}%`} color='indigo' />
                  <Pill title={t('labels.carbs')} value={`${Math.round(carbsG || 0)} g`} sub={`${macroPct.c}%`} color='blue' />
                  <Pill title={t('labels.fat')} value={`${Math.round(fatG || 0)} g`} sub={`${macroPct.f}%`} color='amber' />
                </div>

                <div className='grid grid-cols-2 gap-2 sm:gap-3 mt-3'>
                  <ReadStat
                    title={
                      <span>
                        BMR <InfoBadge title={t('tips.bmr')} />
                      </span>
                    }
                    value={`${Math.round(bmr || 0)} kcal`}
                  />
                  <ReadStat
                    title={
                      <span>
                        TDEE <InfoBadge title={t('tips.tdee')} />
                      </span>
                    }
                    value={`${Math.round(tdee || 0)} kcal`}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BOX 2: Food Calculator + Meal */}
        <section className='box-3d overflow-hidden rounded-lg sm:rounded-lg bg-white/90 backdrop-blur border border-slate-200 shadow-sm'>
          <header className='px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur z-10'>
            <Apple className='w-4 h-4 text-emerald-600 shrink-0' />
            <h2 className='font-semibold text-slate-800 text-base sm:text-lg'>{t('sections.foodCalc')}</h2>
          </header>

          <div className='p-3 sm:p-5 space-y-3 sm:space-y-4'>
            {/* Search + qty (wrap on mobile) */}
            <div className='grid  grid-cols-[1fr_100px] gap-2 sm:gap-3 items-stretch'>
              <FoodSearch
                foods={filteredFoods}
                value={foodSearch}
                onChange={setFoodSearch}
                onPick={f => {
                  setFoodId(f.id);
                  setFoodSearch(displayName(f));
                }}
                placeholder={t('labels.searchFood')}
              />
              <Input placeholder={`${t('labels.amount')}${selectedFood?.unit ? ` (${selectedFood.unit})` : ''}`} type='number' inputMode='numeric' value={qty} onChange={setQty} className='[&>input]:text-base sm:[&>input]:text-sm' />
            </div>

            {/* Sticky action bar on mobile for quick Add/Clear */}
            <div className='sm:hidden sticky bottom-2 z-20'>
              <div className={`rounded-lg shadow-lg border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 flex items-center gap-2`}>
                <div className='flex-1 min-w-0'>
                  <div className='text-[12px] text-slate-500'>{t('labels.item')}</div>
                  <div className='text-sm font-medium text-slate-800 truncate'>{selectedFood ? displayName(selectedFood) : t('labels.pickFoodHint')}</div>
                </div>
                <Button name={t('actions.addItem')} disabled={!selectedFood || !qty} onClick={addItem} className='!px-3 !py-2 !text-sm' />
                <Button name={t('actions.clearMeal')} color='neutral' onClick={() => setMealItems([])} className='!px-3 !py-2 !text-sm' />
              </div>
            </div>

            {/* Quick single calc */}
            <div className={`${!selectedFood && "flex items-center justify-between"}  rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3`}>
              {!selectedFood ? (
                <div className='text-sm text-slate-500'>{t('labels.pickFoodHint')}</div>
              ) : (
                <div className='grid grid-cols-2 sm:grid-cols-[1fr_90px_90px_90px_90px] gap-3 text-sm'>
                  <SmallStat title={t('labels.item')} value={displayName(selectedFood)} />
                  <SmallStat title={t('labels.kcal')} value={`${quickFoodTotals.kcal} kcal`} />
                  <SmallStat title={t('labels.protein')} value={`${quickFoodTotals.p} g`} />
                  <SmallStat title={t('labels.carbs')} value={`${quickFoodTotals.c} g`} />
                  <SmallStat title={t('labels.fat')} value={`${quickFoodTotals.f} g`} />
                </div>
              )}

              {/* Desktop add/clear (mobile has sticky bar) */}
              <div className={`${selectedFood && " mt-3"} hidden sm:flex items-center gap-2`}>
                <Button name={t('actions.addItem')} onClick={addItem} />
                <Button name={t('actions.clearMeal')} color='neutral' onClick={() => setMealItems([])} />
              </div>
            </div>

            {/* Meal list — cards on mobile, table on md+ */}
            {mealItems.length === 0 ? (
              <div className='text-sm text-slate-500'>{t('labels.mealEmpty')}</div>
            ) : (
              <>
                <div className=' overflow-auto rounded-lg border border-slate-200'>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50/80 sticky top-0'>
                      <tr className='text-slate-600'>
                        <th className='text-left px-3 py-2'>{t('labels.item')}</th>
                        <th className='text-right px-3 py-2'>{t('labels.qty')}</th>
                        <th className='text-right px-3 py-2'>{t('labels.kcal')}</th>
                        <th className='text-right px-3 py-2'>{t('labels.p')}</th>
                        <th className='text-right px-3 py-2'>{t('labels.c')}</th>
                        <th className='text-right px-3 py-2'>{t('labels.f')}</th>
                        <th className='px-3 py-2'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealItems.map(it => {
                        const f = findFood(it.id);
                        if (!f) return null;
                        const factor = (toNumber(it.qty, 0) || 0) / f.per;
                        return (
                          <tr key={it.id} className='odd:bg-white even:bg-slate-50/50 border-t border-slate-100'>
                            <td className='px-3 py-2'>{displayName(f)}</td>
                            <td className='px-3 py-2 text-right'>
                              <input type='number' className='w-[80px] text-right border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 hover:border-slate-400 transition-colors' value={it.qty ?? ''} onChange={e => updateQty(it.id, e.target.value)} placeholder='0' inputMode='numeric' />
                            </td>
                            <td className='px-3 py-2 text-right'>{round(f.kcal * factor)}</td>
                            <td className='px-3 py-2 text-right'>{round(f.p * factor, 1)}g</td>
                            <td className='px-3 py-2 text-right'>{round(f.c * factor, 1)}g</td>
                            <td className='px-3 py-2 text-right'>{round(f.f * factor, 1)}g</td>
                            <td className='px-3 py-2 text-right'>
                              <Button icon={<Trash size={16} />} color='danger' className='!py-1 !px-3 !text-sm' onClick={() => removeItem(it.id)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className='bg-slate-50 border-t border-slate-200'>
                        <td className='px-3 py-2 font-medium'>{t('labels.total')}</td>
                        <td className='px-3 py-2'></td>
                        <td className='px-3 py-2 text-right font-semibold'>{mealTotals.kcal}</td>
                        <td className='px-3 py-2 text-right font-semibold'>{mealTotals.p}g</td>
                        <td className='px-3 py-2 text-right font-semibold'>{mealTotals.c}g</td>
                        <td className='px-3 py-2 text-right font-semibold'>{mealTotals.f}g</td>
                        <td className='px-3 py-2'></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
