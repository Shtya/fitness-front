'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';

// ✅ atoms
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';

// ✅ header/cards
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { StatCard } from '@/components/dashboard/ui/UI';

// Icons
import {
  Flame,
  Apple,
  Calculator,
  Gauge,
  Ruler,
  Info,
  Search,
  Trash,
  Sparkles,
  BadgeCheck,
  RefreshCcw,
} from 'lucide-react';

import { DEFAULT_FOODS } from './FoodCalorieDB';

/* ---------------------------------------------
  STORAGE
---------------------------------------------- */
const LS = {
  PROFILE: 'dailycal_profile_v4', // includes bodyFat
  MEAL: 'dailycal_meal_v3',
  CUSTOM_FOODS: 'dailycal_customfoods_v1',
};

/* ---------------------------------------------
  OPTIONS
---------------------------------------------- */
const ACTIVITY = [
  { id: '1.2', label_ar: 'خامل / بدون تمرين', label_en: 'Sedentary (No Exercise)' },
  { id: '1.375', label_ar: 'نشاط خفيف + تمرين بسيط', label_en: 'Light Activity + Light Training' },
  { id: '1.55', label_ar: 'نشاط متوسط + تمرين منتظم', label_en: 'Moderate Activity + Regular Training' },
  { id: '1.725', label_ar: 'نشاط عالي + تمرين يومي', label_en: 'High Activity + Daily Training' },
  { id: '1.9', label_ar: 'نشاط شديد + رياضي/مجهود عالي', label_en: 'Very High Activity / Athlete' },
];

const GOALS = [
  { id: '-20', label_ar: 'خفض قوي -20%', label_en: 'Aggressive Cut -20%' },
  { id: '-10', label_ar: 'خفض خفيف -10%', label_en: 'Light Cut -10%' },
  { id: '0', label_ar: 'ثبات 0%', label_en: 'Maintenance 0%' },
  { id: '+10', label_ar: 'زيادة خفيفة +10%', label_en: 'Lean Bulk +10%' },
  { id: '+20', label_ar: 'زيادة قوية +20%', label_en: 'Aggressive Bulk +20%' },
];

/* ---------------------------------------------
  MATH HELPERS
---------------------------------------------- */
function goalKgPerMonth(tdee, goalStr) {
  const pct = parseFloat(goalStr || '0') / 100;
  if (!tdee || !pct) return 0;
  const dailyDelta = tdee * pct;
  return (dailyDelta * 30) / 7700;
}

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

function bmrMifflin({ sex, weightKg, heightCm, age }) {
  if (!sex || !weightKg || !heightCm || !age) return 0;
  const s = sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

/* ---------------------------------------------
  SMALL UI ATOMS (theme-first)
---------------------------------------------- */
const cx = (...a) => a.filter(Boolean).join(' ');

function Surface({ className = '', children }) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-xl shadow-sm',
        className,
      )}
      style={{
        borderColor: 'var(--color-primary-200)',
      }}
    >
      {/* soft top glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background:
            'linear-gradient(180deg, var(--color-primary-50) 0%, rgba(255,255,255,0) 75%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6"
      style={{
        borderColor: 'rgba(226,232,240,0.9)',
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-2xl border shadow-sm"
          style={{
            borderColor: 'var(--color-primary-200)',
            background:
              'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
          }}
        >
          <Icon className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
            <Sparkles className="h-4 w-4" style={{ color: 'var(--color-secondary-400)' }} />
          </div>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Tooltip({ label, children }) {
  return (
    <span className="relative inline-flex items-center group cursor-help">
      {children}
      <span
        className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rtl:left-auto rtl:right-0 rtl:translate-x-0 whitespace-pre rounded-xl border bg-white px-2.5 py-1.5 text-[11px] text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30"
        style={{ borderColor: 'var(--color-primary-200)' }}
      >
        {label}
      </span>
    </span>
  );
}

function InfoBadge({ title }) {
  return (
    <Tooltip label={title}>
      <Info className="w-3.5 h-3.5 ml-1" style={{ color: 'var(--color-primary-300)' }} />
    </Tooltip>
  );
}

function StatPill({ title, value, hint, tone = 'primary' }) {
  const toneStyles =
    tone === 'primary'
      ? {
          background:
            'linear-gradient(135deg, var(--color-primary-50) 0%, rgba(255,255,255,0.7) 100%)',
          borderColor: 'var(--color-primary-200)',
          color: 'var(--color-primary-800)',
        }
      : tone === 'secondary'
      ? {
          background:
            'linear-gradient(135deg, var(--color-secondary-50) 0%, rgba(255,255,255,0.7) 100%)',
          borderColor: 'var(--color-secondary-200)',
          color: 'var(--color-secondary-800)',
        }
      : {
          background: 'linear-gradient(135deg, #fff7ed 0%, rgba(255,255,255,0.7) 100%)',
          borderColor: '#fed7aa',
          color: '#9a3412',
        };

  return (
    <div className="rounded-2xl border p-3.5" style={toneStyles}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium opacity-80">{title}</div>
        {hint ? (
          <div className="text-[10px] opacity-70 whitespace-nowrap rtl:order-[-1]">{hint}</div>
        ) : null}
      </div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl border px-4 py-3"
      style={{
        borderColor: 'var(--color-primary-200)',
        background:
          'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
      }}
    >
      <div className="font-semibold" style={{ color: 'var(--color-primary-800)' }}>
        {label}
      </div>
      <div className="text-xl font-black" style={{ color: 'var(--color-primary-700)' }}>
        {value}
      </div>
    </div>
  );
}

/* ---------------------------------------------
  FIXED FoodSearch
  ✅ FIX #1: RTL icon position was wrong (was rtl:left)
  ✅ FIX #2: Avoid showing ALL foods when input is empty
  ✅ FIX #3: Better keyboard/blur handling & max results
---------------------------------------------- */
function FoodSearch({ foods, value, onChange, onPick, placeholder }) {
  const locale = useLocale();
  const isEn = (locale || '').toLowerCase().startsWith('en');
  const [open, setOpen] = useState(false);

  const norm = useCallback((s) => (s || '').toString().toLowerCase().trim(), []);
  const q = norm(value);

  const results = useMemo(() => {
    // ✅ don’t dump the whole DB when empty (this was a UX “issue there exist here”)
    if (!q) return [];
    const filtered = foods.filter((f) => {
      const a = norm(f.name);
      const b = norm(f.name_en);
      return a.includes(q) || b.includes(q);
    });
    return filtered.slice(0, 30);
  }, [foods, q, norm]);

  const labelOf = (f) => (isEn ? f.name_en || f.name : f.name || f.name_en || '');
  const pick = (item) => {
    onPick?.(item);
    setOpen(false);
  };

  const onBlurSafeClose = () => setTimeout(() => setOpen(false), 140);

  return (
    <div className="relative z-[60]">
      <div className="relative">
 
        <style jsx>{`
          .foodSearchIcon {
            left: 12px;
          }
          [dir='rtl'] .foodSearchIcon {
            left: auto;
            right: 12px;
          }
          .foodSearchInput {
            padding-left: 40px;
            padding-right: 12px;
          }
          [dir='rtl'] .foodSearchInput {
            padding-left: 12px;
            padding-right: 40px;
          }
        `}</style>

 
        <input
          className={cx(
            'foodSearchInput w-full h-11 rounded-xl border outline-none text-sm bg-white transition',
            'focus:ring-4',
          )}
          style={{
            borderColor: 'rgba(148,163,184,0.8)',
            boxShadow: 'none',
          }}
          placeholder={placeholder}
          value={value}
          inputMode="search"
          onChange={(e) => {
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={onBlurSafeClose}
        />
      </div>

      {open && q && (
        <div
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border bg-white shadow-xl"
          style={{ borderColor: 'var(--color-primary-200)' }}
        >
          <div className="max-h-[300px] overflow-auto overscroll-contain">
            {results.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">لا توجد نتائج / No results</div>
            ) : (
              results.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(f)}
                  className="w-full px-4 py-3 text-left rtl:text-right transition"
                  style={{
                    borderBottom: '1px solid rgba(226,232,240,0.8)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div className="font-semibold text-slate-800 line-clamp-1">{labelOf(f)}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {f.per} {f.unit} • {f.kcal} kcal • P {f.p} / C {f.c} / F {f.f}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------
  PAGE
---------------------------------------------- */
export default function CaloriesDailyPage({ foods = DEFAULT_FOODS }) {
  const t = useTranslations('calorie');
  const locale = useLocale();
  const isEn = (locale || '').toLowerCase().startsWith('en');

  // profile
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [activity, setActivity] = useState('');
  const [goal, setGoal] = useState('');

  // foods
  const [customFoods, setCustomFoods] = useState([]);
  const mergedFoods = useMemo(() => [...foods, ...customFoods], [foods, customFoods]);

  // meal
  const [foodId, setFoodId] = useState('');
  const [qty, setQty] = useState('');
  const [mealItems, setMealItems] = useState([]);

  // search
  const [foodSearch, setFoodSearch] = useState('');

  // summary loader
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [progress, setProgress] = useState(0);

  /* load */
  useEffect(() => {
    try {
      const prof = JSON.parse(localStorage.getItem(LS.PROFILE) || 'null');
      if (prof) {
        setSex(prof.sex ?? 'male');
        setAge(prof.age ?? '');
        setHeight(prof.height ?? '');
        setWeight(prof.weight ?? '');
        setBodyFat(prof.bodyFat ?? '');
        setActivity(prof.activity ?? '');
        setGoal(prof.goal ?? '');
      }
      const savedMeal = JSON.parse(localStorage.getItem(LS.MEAL) || 'null');
      if (savedMeal && Array.isArray(savedMeal)) setMealItems(savedMeal);

      const savedFoods = JSON.parse(localStorage.getItem(LS.CUSTOM_FOODS) || 'null');
      if (savedFoods && Array.isArray(savedFoods)) setCustomFoods(savedFoods);
    } catch {}
  }, []);

  /* persist */
  useEffect(() => {
    localStorage.setItem(LS.PROFILE, JSON.stringify({ sex, age, height, weight, bodyFat, activity, goal }));
  }, [sex, age, height, weight, bodyFat, activity, goal]);

  useEffect(() => {
    localStorage.setItem(LS.MEAL, JSON.stringify(mealItems));
  }, [mealItems]);

  /* numbers */
  const ageN = toNumber(age, 0);
  const heightN = toNumber(height, 0);
  const weightN = toNumber(weight, 0);
  const bodyFatN = clamp(toNumber(bodyFat, 0), 0, 70);
  const actMult = activity ? parseFloat(activity) : 0;
  const goalPct = goal ? parseFloat(goal) / 100 : 0;

  const leanMassKg = useMemo(() => {
    if (!weightN) return 0;
    if (!bodyFatN) return weightN;
    return weightN * (1 - bodyFatN / 100);
  }, [weightN, bodyFatN]);

  const bmr = useMemo(() => bmrMifflin({ sex, weightKg: weightN, heightCm: heightN, age: ageN }), [sex, weightN, heightN, ageN]);
  const tdee = useMemo(() => (bmr && actMult ? bmr * actMult : 0), [bmr, actMult]);
  const targetCalories = useMemo(() => (tdee ? tdee * (1 + goalPct) : 0), [tdee, goalPct]);

  // macros (lean mass preferred)
  const proteinG = useMemo(() => {
    const base = leanMassKg || weightN;
    return base ? clamp(2.2 * base, 80, 250) : 0;
  }, [leanMassKg, weightN]);

  const fatG = useMemo(() => {
    const base = leanMassKg || weightN;
    return base ? clamp(0.9 * base, 40, 140) : 0;
  }, [leanMassKg, weightN]);

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

  const sexOptions = [
    { id: 'male', label: t('sex.male') },
    { id: 'female', label: t('sex.female') },
  ];

  const activityOptions = ACTIVITY.map((a) => ({ id: a.id, label: isEn ? a.label_en : a.label_ar }));

  const goalOptions = GOALS.map((g) => {
    const kg = goalKgPerMonth(tdee, g.id);
    const kgAbs = Math.abs(kg).toFixed(2);
    const isCut = parseFloat(g.id) < 0;
    const isBulk = parseFloat(g.id) > 0;

    const labelAR = isCut
      ? `${g.label_ar} → نقص ≈ ${kgAbs} كجم/الشهر`
      : isBulk
      ? `${g.label_ar} → زيادة ≈ ${kgAbs} كجم/الشهر`
      : `${g.label_ar} → بدون تغيير`;

    const labelEN = isCut
      ? `${g.label_en} → ≈ ${kgAbs} kg/month loss`
      : isBulk
      ? `${g.label_en} → ≈ ${kgAbs} kg/month gain`
      : `${g.label_en} → no change`;

    return { id: g.id, label: isEn ? labelEN : labelAR };
  });

  const displayName = (f) => (isEn ? f.name_en || f.name : f.name || f.name_en || '');

  const selectedFood = useMemo(() => mergedFoods.find((f) => f.id === foodId) || null, [mergedFoods, foodId]);
  const qtyN = toNumber(qty, 0);

  // piece/ml/g UX
  const qtyMeta = useMemo(() => {
    const u = selectedFood?.unit || '';
    const isPiece = u === 'piece';
    const isMl = u === 'ml';
    const isG = u === 'g';
    const unitLabel = isEn ? (isPiece ? 'count' : isMl ? 'ml' : isG ? 'g' : u) : isPiece ? 'عدد' : isMl ? 'مل' : isG ? 'جرام' : u;
    const step = isPiece ? 1 : 0.1;
    const inputMode = 'numeric';
    return { unitLabel, step, isPiece, inputMode };
  }, [selectedFood, isEn]);

  const qtyPlaceholder = useMemo(() => {
    const base = t('labels.amount');
    const u = qtyMeta.unitLabel ? ` (${qtyMeta.unitLabel})` : '';
    return `${base}${u}`;
  }, [t, qtyMeta.unitLabel]);

  const quickFoodTotals = useMemo(() => {
    if (!selectedFood || !qtyN) return { kcal: 0, p: 0, c: 0, f: 0 };
    const factor = qtyN / selectedFood.per;
    return {
      kcal: round(selectedFood.kcal * factor),
      p: round(selectedFood.p * factor, 1),
      c: round(selectedFood.c * factor, 1),
      f: round(selectedFood.f * factor, 1),
    };
  }, [selectedFood, qtyN]);

  const findFood = (id) => mergedFoods.find((f) => f.id === id);

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
  }, [mealItems, mergedFoods]);

  const headerStats = {
    bmr: Math.round(bmr || 0),
    tdee: Math.round(tdee || 0),
    target: Math.round(targetCalories || 0),
  };

  const resetAll = () => {
    setSex('male');
    setAge('');
    setHeight('');
    setWeight('');
    setBodyFat('');
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

    const exists = mealItems.find((m) => m.id === selectedFood.id);
    if (exists) {
      setMealItems((prev) =>
        prev.map((m) => (m.id === selectedFood.id ? { ...m, qty: toNumber(m.qty, 0) + q } : m)),
      );
    } else {
      setMealItems((prev) => [...prev, { id: selectedFood.id, qty: q }]);
    }
  };

  const updateQty = (id, newQty) =>
    setMealItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, qty: clamp(toNumber(newQty, 0), 0, 100000) } : m)),
    );

  const removeItem = (id) => setMealItems((prev) => prev.filter((m) => m.id !== id));

  const generateSummary = () => {
    setShowSummary(false);
    setIsGenerating(true);
    setProgress(0);

    const steps = [12, 35, 62, 84, 100];
    let i = 0;

    const tick = () => {
      setProgress(steps[i]);
      i++;
      if (i < steps.length) setTimeout(tick, 220);
      else {
        setIsGenerating(false);
        setShowSummary(true);
      }
    };
    setTimeout(tick, 160);
  };

  return (
    <div className="space-y-4">
      {/* ✅ Themed Header (your component already uses theme vars) */}
      <GradientStatsHeader
        hiddenStats
        onClick={resetAll}
        btnName={t('actions.reset')}
        title={t('header.title')}
        desc={t('header.desc')}
        loadingStats={false}
        icon={Flame}
      >
        <StatCard icon={Flame} title="BMR" value={headerStats.bmr} />
        <StatCard icon={Gauge} title="TDEE" value={headerStats.tdee} />
        <StatCard icon={Calculator} title={t('labels.targetKcal')} value={headerStats.target} />
      </GradientStatsHeader>

      {/* ✅ Redesigned layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: profile + summary */}
        <Surface>
          <SectionHeader
            icon={Ruler}
            title={t('sections.dailyNeed')}
            subtitle={isEn ? 'Your body data → calories & macros' : 'بيانات الجسم → السعرات والماكروز'}
          />

          <div className="p-4 sm:p-6 space-y-4">
            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select searchable={false} label={t('labels.sex')} options={sexOptions} value={sex} onChange={setSex} />

              <Input label={t('labels.ageYears')} type="number" inputMode="numeric" value={age} onChange={setAge} placeholder="—" />

              <Input label={t('labels.heightCm')} type="number" inputMode="numeric" value={height} onChange={setHeight} placeholder="—" />

              <Input label={t('labels.weightKg')} type="number" inputMode="numeric" value={weight} onChange={setWeight} placeholder="—" />

              <Input
                label={isEn ? 'Body Fat %' : 'نسبة الدهون %'}
                type="number"
                inputMode="numeric"
                value={bodyFat}
                onChange={setBodyFat}
                placeholder="—"
              />

              <div className="hidden sm:block" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Select searchable={false} label={t('labels.activity')} options={activityOptions} value={activity} onChange={setActivity} />
              <Select searchable={false} label={t('labels.goal')} options={goalOptions} value={goal} onChange={setGoal} />
            </div>

            {/* Actions row */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={generateSummary}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border font-semibold transition active:scale-[0.98]"
                  style={{
                    borderColor: 'transparent',
                    color: 'white',
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    boxShadow: '0 10px 25px rgba(99,102,241,0.18)',
                  }}
                >
                  <BadgeCheck className="h-4 w-4" />
                  {t('actions.generateSummary')}
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border font-semibold transition active:scale-[0.98]"
                  style={{
                    borderColor: 'var(--color-primary-200)',
                    background: 'white',
                    color: 'var(--color-primary-700)',
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t('actions.reset')}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                {isEn ? 'Tip: add body fat for better macros' : 'نصيحة: أدخل نسبة الدهون لنتائج ماكروز أدق'}
              </div>
            </div>

            {/* Loader */}
            {isGenerating && (
              <div className="mt-2">
                <div
                  className="relative h-3 w-full overflow-hidden rounded-full border"
                  style={{ background: 'rgba(241,245,249,1)', borderColor: 'rgba(226,232,240,1)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      backgroundImage:
                        'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{t('loader.generating')}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}

            {/* Summary */}
            {showSummary && (
              <div
                className="rounded-2xl border p-4 sm:p-5"
                style={{
                  borderColor: 'var(--color-primary-200)',
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, var(--color-primary-50) 55%, var(--color-secondary-50) 100%)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-2xl border"
                    style={{
                      borderColor: 'var(--color-primary-200)',
                      background: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <Calculator className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900">{t('sections.summary')}</div>
                    <div className="text-xs text-slate-600">
                      {isEn ? 'Calories + macros based on your data' : 'السعرات والماكروز حسب بياناتك'}
                    </div>
                  </div>
                </div>

                <SummaryRow label={t('labels.targetCalories')} value={`${Math.round(targetCalories || 0)} kcal`} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <StatPill title={t('labels.protein')} value={`${Math.round(proteinG || 0)} g`} hint={`${macroPct.p}%`} tone="primary" />
                  <StatPill title={t('labels.carbs')} value={`${Math.round(carbsG || 0)} g`} hint={`${macroPct.c}%`} tone="secondary" />
                  <StatPill title={t('labels.fat')} value={`${Math.round(fatG || 0)} g`} hint={`${macroPct.f}%`} tone="amber" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.7)' }}
                  >
                    <div className="text-xs text-slate-500">{isEn ? 'Body Fat' : 'نسبة الدهون'}</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{bodyFat ? `${round(bodyFatN, 1)}%` : '—'}</div>
                  </div>

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.7)' }}
                  >
                    <div className="text-xs text-slate-500">{isEn ? 'Lean Mass' : 'الكتلة الخالية من الدهون'}</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{leanMassKg ? `${round(leanMassKg, 1)} kg` : '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.7)' }}
                  >
                    <div className="text-xs text-slate-500">
                      BMR <InfoBadge title={t('tips.bmr')} />
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{Math.round(bmr || 0)} kcal</div>
                  </div>

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.7)' }}
                  >
                    <div className="text-xs text-slate-500">
                      TDEE <InfoBadge title={t('tips.tdee')} />
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{Math.round(tdee || 0)} kcal</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Surface>

        {/* RIGHT: food builder */}
        <Surface>
          <SectionHeader
            icon={Apple}
            title={t('sections.foodCalc')}
            subtitle={isEn ? 'Search food → add to meal → totals' : 'ابحث عن الطعام → أضفه للوجبة → الإجمالي'}
          />

          <div className="p-4 sm:p-6 space-y-4">
            {/* Search + Qty */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3 items-start">
              <FoodSearch
                foods={mergedFoods}
                value={foodSearch}
                onChange={setFoodSearch}
                onPick={(f) => {
                  setFoodId(f.id);
                  setFoodSearch(displayName(f));
                  // default piece => 1
                  if (f.unit === 'piece' && (!qty || toNumber(qty, 0) <= 0)) setQty('1');
                }}
                placeholder={t('labels.searchFood')}
              />

              <Input
                placeholder={qtyPlaceholder}
                type="number"
                inputMode={qtyMeta.inputMode}
                value={qty}
                onChange={setQty}
                step={qtyMeta.step}
              />
            </div>

            {/* Selected food preview */}
            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: 'rgba(226,232,240,0.9)',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.85) 100%)',
              }}
            >
              {!selectedFood ? (
                <div className="text-sm text-slate-500">{t('labels.pickFoodHint')}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_repeat(4,110px)] gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">{t('labels.item')}</div>
                    <div className="mt-1 font-semibold text-slate-900 truncate">{displayName(selectedFood)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedFood.per} {selectedFood.unit} • {selectedFood.kcal} kcal
                    </div>
                  </div>

                  <StatPill title={t('labels.kcal')} value={`${quickFoodTotals.kcal}`} hint="kcal" tone="primary" />
                  <StatPill title={t('labels.protein')} value={`${quickFoodTotals.p}`} hint="g" tone="secondary" />
                  <StatPill title={t('labels.carbs')} value={`${quickFoodTotals.c}`} hint="g" tone="secondary" />
                  <StatPill title={t('labels.fat')} value={`${quickFoodTotals.f}`} hint="g" tone="amber" />
                </div>
              )}

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!selectedFood || qtyN <= 0}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    color: 'white',
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    boxShadow: '0 10px 25px rgba(99,102,241,0.18)',
                  }}
                >
                  <BadgeCheck className="h-4 w-4" />
                  {t('actions.addItem')}
                </button>

                <button
                  type="button"
                  onClick={() => setMealItems([])}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border font-semibold transition active:scale-[0.98]"
                  style={{
                    borderColor: 'rgba(226,232,240,0.9)',
                    background: 'white',
                    color: 'rgb(51,65,85)',
                  }}
                >
                  <Trash className="h-4 w-4" />
                  {t('actions.clearMeal')}
                </button>
              </div>
            </div>

            {/* Meal table */}
            {mealItems.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-8 text-center"
                style={{ borderColor: 'rgba(148,163,184,0.6)', background: 'rgba(248,250,252,0.8)' }}
              >
                <Apple className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-primary-300)' }} />
                <div className="font-semibold text-slate-900">{t('labels.mealEmpty')}</div>
                <div className="mt-1 text-sm text-slate-600">{isEn ? 'Search a food and add it to your meal.' : 'ابحث عن طعام وأضفه للوجبة.'}</div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(226,232,240,0.9)' }}>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-slate-600"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(248,250,252,0.95) 0%, rgba(255,255,255,0.95) 100%)',
                          borderBottom: '1px solid rgba(226,232,240,0.9)',
                        }}
                      >
                        <th className="text-left rtl:text-right px-4 py-3">{t('labels.item')}</th>
                        <th className="text-right px-4 py-3">{t('labels.qty')}</th>
                        <th className="text-right px-4 py-3">{t('labels.kcal')}</th>
                        <th className="text-right px-4 py-3">{t('labels.p')}</th>
                        <th className="text-right px-4 py-3">{t('labels.c')}</th>
                        <th className="text-right px-4 py-3">{t('labels.f')}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {mealItems.map((it) => {
                        const f = findFood(it.id);
                        if (!f) return null;

                        const factor = (toNumber(it.qty, 0) || 0) / f.per;
                        const isPiece = f.unit === 'piece';
                        const step = isPiece ? 1 : 0.1;

                        const unitLabel = isEn
                          ? f.unit
                          : f.unit === 'piece'
                          ? 'عدد'
                          : f.unit === 'g'
                          ? 'جرام'
                          : f.unit === 'ml'
                          ? 'مل'
                          : f.unit;

                        return (
                          <tr
                            key={it.id}
                            className="transition"
                            style={{
                              borderTop: '1px solid rgba(241,245,249,1)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,250,252,0.85)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{displayName(f)}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {f.per} {unitLabel} • {f.kcal} kcal
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <input
                                  type="number"
                                  step={step}
                                  value={it.qty ?? ''}
                                  onChange={(e) => updateQty(it.id, e.target.value)}
                                  placeholder="0"
                                  inputMode="numeric"
                                  className="w-[110px] text-right rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4"
                                  style={{
                                    borderColor: 'rgba(148,163,184,0.75)',
                                  }}
                                />
                                <span className="text-xs text-slate-500 whitespace-nowrap">{unitLabel}</span>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{round(f.kcal * factor)}</td>
                            <td className="px-4 py-3 text-right text-slate-700">{round(f.p * factor, 1)}g</td>
                            <td className="px-4 py-3 text-right text-slate-700">{round(f.c * factor, 1)}g</td>
                            <td className="px-4 py-3 text-right text-slate-700">{round(f.f * factor, 1)}g</td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeItem(it.id)}
                                className="inline-flex items-center justify-center h-10 w-10 rounded-2xl border transition active:scale-[0.98]"
                                style={{
                                  borderColor: 'rgba(254,202,202,1)',
                                  background: 'rgba(255,241,242,0.9)',
                                  color: 'rgb(225,29,72)',
                                }}
                                title={t('actions.remove')}
                                aria-label={t('actions.remove')}
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr
                        style={{
                          background:
                            'linear-gradient(135deg, var(--color-primary-50) 0%, rgba(255,255,255,0.9) 100%)',
                          borderTop: '1px solid rgba(226,232,240,0.9)',
                        }}
                      >
                        <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-primary-800)' }}>
                          {t('labels.total')}
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right font-black" style={{ color: 'var(--color-primary-700)' }}>
                          {mealTotals.kcal}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{mealTotals.p}g</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{mealTotals.c}g</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{mealTotals.f}g</td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}
