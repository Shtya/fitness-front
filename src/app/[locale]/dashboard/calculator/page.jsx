'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import {
  Flame,
  Calculator,
  Info,
  Search,
  RefreshCw,
  User,
  Scale,
  TrendingUp,
  BarChart3,
  Dumbbell,
  Target,
  Zap,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  Leaf,
  X,
  ChevronDown,
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

const CARD = 'overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.32)]';

function PhoneCard({ icon: Icon, title, subtitle, accent = '#2563eb', children, action }) {
  return (
    <section className={CARD}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border"
          style={{ backgroundColor: `${accent}14`, borderColor: `${accent}28`, color: accent }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </section>
  );
}

function PhoneSheet({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45" onClick={onClose}>
      <div
        className="flex max-h-[88dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] border border-white/90 bg-[#eef2f9] pb-8 shadow-[0_-8px_24px_rgba(100,116,139,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3">
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-500" aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const FIELD_LABEL = 'mb-1.5 block text-[11px] font-bold tracking-wide text-slate-500';

function NeuField({ label, icon: Icon, value, onChange }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className={FIELD_LABEL}>{label}</span>
      <span className="flex h-[46px] items-center gap-2 rounded-2xl border border-slate-200/80 bg-[#e4eaf3] px-3 shadow-[inset_2px_2px_5px_rgba(100,116,139,0.22)]">
        {Icon ? <Icon size={13} className="shrink-0 text-slate-400" /> : null}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="h-full w-full bg-transparent text-sm text-slate-800 outline-none"
        />
      </span>
    </label>
  );
}

function NeuSelect({ label, icon: Icon, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <div>
      <p className={FIELD_LABEL}>{label}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[46px] w-full items-center gap-2 rounded-2xl border border-white/85 bg-[#eef2f9] px-3 text-start shadow-[4px_4px_8px_rgba(100,116,139,0.28)]"
      >
        <Icon size={13} className={selected ? 'shrink-0 text-(--color-primary-500)' : 'shrink-0 text-slate-400'} />
        <span className={cx('min-w-0 flex-1 truncate text-sm', selected ? 'text-slate-800' : 'text-slate-400')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>
      <PhoneSheet open={open} title={label} onClose={() => setOpen(false)}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); setOpen(false); }}
            className={cx(
              'block w-full border-b border-slate-200/70 px-5 py-3.5 text-start text-sm',
              o.id === value ? 'bg-white font-bold text-(--color-primary-700)' : 'text-slate-700',
            )}
          >
            {o.label}
          </button>
        ))}
      </PhoneSheet>
    </div>
  );
}

function MacroSplit({ protein, carbs, fat }) {
  const total = protein + carbs + fat || 1;
  const pC = Math.round((carbs / total) * 100);
  const pP = Math.round((protein / total) * 100);
  const pF = Math.max(0, 100 - pC - pP);
  const parts = [
    ['#f59e0b', 'C', pC],
    ['var(--color-primary-500)', 'P', pP],
    ['#ec4899', 'F', pF],
  ];
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
        <span style={{ width: `${pC}%`, background: '#f59e0b' }} />
        <span style={{ width: `${pP}%`, background: 'var(--color-primary-500)' }} />
        <span style={{ width: `${pF}%`, background: '#ec4899' }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-500">
        {parts.map(([color, letter, pct]) => (
          <span key={letter} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {letter} {pct}%
          </span>
        ))}
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
  const [query, setQuery] = useState('');
  const q = norm(query);

  const results = useMemo(() => {
    if (!q) return [];
    return foods.filter((f) => norm(f.name).includes(q) || norm(f.name_en).includes(q)).slice(0, 40);
  }, [foods, q, norm]);

  const labelOf = (f) => (isEn ? f.name_en || f.name : f.name || f.name_en || '');
  const close = () => { setQuery(''); setOpen(false); };
  const pick = (item) => {
    onPick?.(item);
    onChange?.(labelOf(item));
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[46px] w-full items-center gap-2 rounded-2xl border border-white/85 bg-[#eef2f9] px-3 text-start shadow-[4px_4px_8px_rgba(100,116,139,0.28)]"
      >
        <Search size={15} className={value ? 'shrink-0 text-(--color-primary-500)' : 'shrink-0 text-slate-400'} />
        <span className={cx('min-w-0 flex-1 truncate text-sm', value ? 'text-slate-800' : 'text-slate-400')}>
          {value || placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange?.(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange?.(''); } }}
            className="grid h-6 w-6 place-items-center text-slate-400"
          >
            <X size={14} />
          </span>
        ) : (
          <ChevronDown size={14} className="shrink-0 text-slate-400" />
        )}
      </button>
      <PhoneSheet open={open} title={placeholder} onClose={close}>
        <div className="mx-4 mt-3 flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 bg-[#e4eaf3] px-3 shadow-[inset_2px_2px_5px_rgba(100,116,139,0.18)]">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? 'Type a food name...' : 'اسم الطعام...'}
            className="h-full w-full bg-transparent text-sm text-slate-800 outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="text-slate-400"><X size={14} /></button>
          ) : null}
        </div>
        {!query ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-300">
            <Search size={36} strokeWidth={1.5} />
            <p className="text-sm text-slate-400">{isEn ? 'Type to search for a food' : 'اكتب للبحث...'}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-300">
            <UtensilsCrossed size={36} strokeWidth={1.5} />
            <p className="text-sm text-slate-400">{isEn ? 'No results' : 'لا توجد نتائج'}</p>
          </div>
        ) : (
          <div className="mt-2">
            {results.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pick(f)}
                className="flex w-full items-center gap-3 border-b border-slate-200/70 px-5 py-3 text-start"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-(--color-primary-50) text-(--color-primary-600)">
                  <Leaf size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{labelOf(f)}</span>
                  <span className="text-[11px] text-slate-400">{f.per}{f.unit} · {f.kcal} kcal · P{f.p}g C{f.c}g F{f.f}g</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </PhoneSheet>
    </>
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
  const [tab, setTab] = useState('profile');
  const [validationMsg, setValidationMsg] = useState('');

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
    setValidationMsg('');
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
    setQty('');
  };

  const updateQty = (id, newQty) =>
    setMealItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, qty: clamp(toNumber(newQty, 0), 0, 100000) } : m)),
    );

  const removeItem = (id) => setMealItems((prev) => prev.filter((m) => m.id !== id));

  const generateSummary = () => {
    setValidationMsg('');
    const missing = [];
    if (!ageN) missing.push(t('labels.ageYears'));
    if (!heightN) missing.push(t('labels.heightCm'));
    if (!weightN) missing.push(t('labels.weightKg'));
    if (!activity) missing.push(t('labels.activity'));
    if (!goal) missing.push(t('labels.goal'));
    if (missing.length) {
      setValidationMsg(isEn ? `Please fill in: ${missing.join(', ')}` : `يرجى إدخال: ${missing.join('، ')}`);
      return;
    }

    setShowSummary(false);
    setIsGenerating(true);
    setProgress(0);

    const steps = [12, 35, 62, 84, 100];
    let i = 0;
    const tick = () => {
      setProgress(steps[i]);
      i += 1;
      if (i < steps.length) setTimeout(tick, 220);
      else {
        setIsGenerating(false);
        setShowSummary(true);
      }
    };
    setTimeout(tick, 160);
  };

  useEffect(() => {
    const shell = document.querySelector('.dashboard-icy');
    const body = document.getElementById('body');
    const dark = document.documentElement.classList.contains('dark')
      || document.documentElement.getAttribute('data-theme-mode') === 'dark';
    const color = dark ? '#0b1220' : '#ffffff';
    const pane = document.querySelector('[data-dashboard-content]');
    shell?.style.setProperty('--gm-bg-image', 'none', 'important');
    shell?.style.setProperty('background', color, 'important');
    body?.style.setProperty('background', color, 'important');
    pane?.style.setProperty('background', color, 'important');
    return () => {
      shell?.style.removeProperty('--gm-bg-image');
      const pane = document.querySelector('[data-dashboard-content]');
      shell?.style.removeProperty('background');
      body?.style.removeProperty('background');
      pane?.style.removeProperty('background');
    };
  }, []);

  const mealLabel = mealItems.length ? `${t('tabs.meal')} (${mealItems.length})` : t('tabs.meal');

  return (
    <div data-plain-page="1" className="report-phone -mx-[var(--app-gutter)] min-h-full bg-white px-[var(--app-gutter)] pt-1 dark:bg-[#0b1220]">
      <div className="mx-auto w-full max-w-[440px] space-y-4">
        <div className="m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]">
          <div
            className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)] pb-3"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), #1a3fbf)' }}
          >
            <div className="pointer-events-none absolute -start-16 -top-10 h-[280px] w-[280px] rounded-full bg-white/[0.06]" />
            <div className="pointer-events-none absolute -end-12 -bottom-10 h-[200px] w-[200px] rounded-full bg-white/[0.04]" />
            <div className="relative flex items-center gap-3 p-4 pb-2">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white">
                <Calculator size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black leading-6 tracking-[-0.3px] text-white">{t('header.title')}</h1>
                <p className="mt-0.5 truncate text-[10px] font-medium text-white/55">{t('header.desc')}</p>
              </div>
              <button
                type="button"
                onClick={resetAll}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white"
                aria-label={t('actions.reset')}
              >
                <RefreshCw size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="mx-4 mb-2 h-px bg-white/20" />
            <div className="flex gap-2 px-4 pb-1">
              {[
                ['profile', t('tabs.profile')],
                ['meal', mealLabel],
              ].map(([key, label]) => {
                const on = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cx(
                      'h-9 flex-1 rounded-2xl text-xs font-bold',
                      on
                        ? 'border border-white/90 bg-white text-(--color-primary-700) shadow-[2px_4px_7px_rgba(30,58,138,0.35)]'
                        : 'border border-white/30 bg-white/10 text-white/65',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {tab === 'profile' && (
          <div className="space-y-3">
            <PhoneCard icon={Scale} title={t('phone.bodyData')} subtitle={t('phone.bodyDataSub')}>
              <div>
                <p className={FIELD_LABEL}>{t('labels.sex')}</p>
                <div className="flex overflow-hidden rounded-2xl border border-slate-200/70 bg-[#e4eaf3] shadow-[inset_2px_2px_5px_rgba(100,116,139,0.2)]">
                  {sexOptions.map((opt) => {
                    const on = sex === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSex(opt.id)}
                        className={cx(
                          'm-[3px] flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold',
                          on ? 'bg-(--color-primary-600) text-white shadow-[3px_3px_6px_rgba(37,99,235,0.35)]' : 'text-slate-500',
                        )}
                      >
                        <User size={13} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <NeuField label={t('labels.ageYears')} icon={User} value={age} onChange={setAge} />
                <NeuField label={t('labels.heightCm')} icon={TrendingUp} value={height} onChange={setHeight} />
              </div>
              <div className="flex gap-3">
                <NeuField label={t('labels.weightKg')} icon={Scale} value={weight} onChange={setWeight} />
                <NeuField label={t('phone.bodyFat')} icon={BarChart3} value={bodyFat} onChange={setBodyFat} />
              </div>
              <NeuSelect label={t('labels.activity')} icon={Dumbbell} value={activity} onChange={setActivity} options={activityOptions} placeholder={t('phone.select')} />
              <NeuSelect label={t('labels.goal')} icon={Target} value={goal} onChange={setGoal} options={goalOptions} placeholder={t('phone.select')} />
              {validationMsg ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  <span>{validationMsg}</span>
                </div>
              ) : null}
              <button
                type="button"
                onClick={generateSummary}
                className="mt-1 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-(--color-primary-600) text-sm font-bold text-white shadow-[0_8px_20px_rgba(67,56,202,0.35)]"
              >
                <Calculator size={16} />
                {t('phone.calculate')}
              </button>
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-(--color-primary-600) transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{progress}%</span>
                </div>
              ) : null}
            </PhoneCard>

            {showSummary && (
              <div className="space-y-3">
                <div className={`${CARD} flex items-center justify-between px-5 py-4`}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-(--color-primary-600)/20 bg-(--color-primary-600)/10 text-(--color-primary-600)">
                      <Flame size={20} />
                    </div>
                    <p className="text-[13px] font-medium text-slate-500">{t('phone.dailyTarget')}</p>
                  </div>
                  <div className="flex items-end gap-1">
                    <p className="text-4xl font-black tracking-tight text-(--color-primary-700)">{Math.round(targetCalories || 0)}</p>
                    <div className="pb-1 text-end">
                      <p className="text-sm font-bold text-(--color-primary-600)">kcal</p>
                      <p className="text-[11px] text-slate-400">/ {t('phone.day')}</p>
                    </div>
                  </div>
                </div>

                <PhoneCard icon={BarChart3} title={t('phone.macros')} subtitle={t('phone.macrosSub')} accent="#10b981">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      [t('labels.protein'), `${Math.round(proteinG || 0)}g`, '#3b82f6'],
                      [t('labels.carbs'), `${Math.round(carbsG || 0)}g`, '#f59e0b'],
                      [t('labels.fat'), `${Math.round(fatG || 0)}g`, '#ec4899'],
                    ].map(([label, value, color]) => (
                      <div key={label} className="rounded-2xl border px-2 py-2.5 text-center" style={{ borderColor: `${color}30`, background: `${color}0d` }}>
                        <p className="text-sm font-bold" style={{ color }}>{value}</p>
                        <p className="mt-1 text-[10px] font-medium" style={{ color }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <MacroSplit protein={proteinG} carbs={carbsG} fat={fatG} />
                </PhoneCard>

                <PhoneCard icon={Info} title={t('phone.details')} accent="#f97316">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['BMR', `${Math.round(bmr || 0)} kcal`, Flame, '#f97316'],
                      ['TDEE', `${Math.round(tdee || 0)} kcal`, Zap, '#8b5cf6'],
                    ].map(([label, value, Icon, color]) => (
                      <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-white/80 bg-white/70 px-2 py-3 text-center">
                        <Icon size={14} style={{ color }} />
                        <p className="text-sm font-bold text-slate-800">{value}</p>
                        <p className="text-[10px] text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                  {(leanMassKg > 0 || bodyFatN > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        [t('phone.bodyFat'), bodyFat ? `${round(bodyFatN, 1)}%` : '—', BarChart3, '#ec4899'],
                        [t('phone.leanMass'), leanMassKg ? `${round(leanMassKg, 1)} kg` : '—', Scale, '#10b981'],
                      ].map(([label, value, Icon, color]) => (
                        <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-white/80 bg-white/70 px-2 py-3 text-center">
                          <Icon size={14} style={{ color }} />
                          <p className="text-sm font-bold text-slate-800">{value}</p>
                          <p className="text-[10px] text-slate-400">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    <span>{t('phone.tip')}</span>
                  </div>
                </PhoneCard>
              </div>
            )}
          </div>
        )}

        {tab === 'meal' && (
          <div className="space-y-3">
            <PhoneCard icon={Search} title={t('phone.addFood')} subtitle={t('phone.addFoodSub')} accent="#10b981">
              <FoodSearch
                foods={mergedFoods}
                value={foodSearch}
                onChange={(v) => { setFoodSearch(v); if (!v) { setFoodId(''); setQty(''); } }}
                onPick={(f) => {
                  setFoodId(f.id);
                  setFoodSearch(displayName(f));
                  if (f.unit === 'piece' && (!qty || toNumber(qty, 0) <= 0)) setQty('1');
                }}
                placeholder={t('labels.searchFood')}
              />
              {selectedFood ? (
                <div className="space-y-3 rounded-2xl border border-white/80 bg-white/60 p-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      [quickFoodTotals.kcal, 'kcal', '#f97316'],
                      [`${quickFoodTotals.p}g`, 'P', '#3b82f6'],
                      [`${quickFoodTotals.c}g`, 'C', '#f59e0b'],
                      [`${quickFoodTotals.f}g`, 'F', '#ec4899'],
                    ].map(([value, label, color]) => (
                      <div key={label} className="rounded-xl border px-1 py-2 text-center" style={{ borderColor: `${color}30`, background: `${color}0d` }}>
                        <p className="text-xs font-bold" style={{ color }}>{value}</p>
                        <p className="text-[9px]" style={{ color }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder={qtyPlaceholder}
                      className="h-11 min-w-0 flex-1 rounded-2xl border border-white/80 bg-[#e8edf2] px-3 text-center text-sm shadow-[inset_2px_2px_5px_rgba(100,116,139,0.16)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!selectedFood || qtyN <= 0}
                      className="inline-flex h-11 items-center gap-1 rounded-2xl bg-(--color-primary-600) px-4 text-sm font-bold text-white disabled:opacity-45"
                    >
                      <Plus size={15} />
                      {t('phone.add')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-400">
                  <UtensilsCrossed size={28} strokeWidth={1.5} />
                  <p className="text-xs">{t('phone.searchHint')}</p>
                </div>
              )}
            </PhoneCard>

            <PhoneCard
              icon={UtensilsCrossed}
              title={`${t('tabs.meal')}${mealItems.length ? ` (${mealItems.length})` : ''}`}
              action={mealItems.length ? (
                <button type="button" onClick={() => setMealItems([])} className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500">
                  <Trash2 size={12} />
                  {t('phone.clearAll')}
                </button>
              ) : null}
            >
              {mealItems.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8 text-center">
                  <UtensilsCrossed size={36} className="text-slate-300" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-slate-700">{t('phone.noFoods')}</p>
                  <p className="text-xs text-slate-400">{t('phone.noFoodsSub')}</p>
                </div>
              ) : (
                <>
                  {mealItems.map((it) => {
                    const food = findFood(it.id);
                    if (!food) return null;
                    const qtyNow = toNumber(it.qty, 0);
                    const factor = food.per > 0 ? qtyNow / food.per : 0;
                    const step = food.unit === 'piece' ? 1 : 10;
                    const unitLabel = food.unit === 'piece' ? (isEn ? 'pcs' : 'عدد') : food.unit;
                    const chips = [
                      [round(food.kcal * factor), 'kcal', '#f97316'],
                      [`${round(food.p * factor, 1)}g`, 'P', '#3b82f6'],
                      [`${round(food.c * factor, 1)}g`, 'C', '#f59e0b'],
                      [`${round(food.f * factor, 1)}g`, 'F', '#ec4899'],
                    ];
                    return (
                      <div key={it.id} className="rounded-2xl border border-white/80 bg-white/70 p-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-(--color-primary-50) text-(--color-primary-600)">
                            <Leaf size={13} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{displayName(food)}</p>
                            <p className="text-[10px] text-slate-400">{food.per}{unitLabel} · {food.kcal} kcal</p>
                          </div>
                          <button type="button" onClick={() => removeItem(it.id)} className="grid h-8 w-8 place-items-center text-red-500" aria-label={t('actions.remove')}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center overflow-hidden rounded-xl border border-white/80 bg-[#eef2f9]">
                            <button type="button" className="grid h-8 w-8 place-items-center text-(--color-primary-600)" onClick={() => updateQty(it.id, Math.max(0, qtyNow - step))}>
                              <Minus size={13} />
                            </button>
                            <input
                              value={it.qty ?? ''}
                              onChange={(e) => updateQty(it.id, e.target.value)}
                              className="h-8 w-12 bg-transparent text-center text-xs font-bold outline-none"
                            />
                            <button type="button" className="grid h-8 w-8 place-items-center bg-(--color-primary-600) text-white" onClick={() => updateQty(it.id, qtyNow + step)}>
                              <Plus size={13} />
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {chips.map(([value, label, color]) => (
                              <span key={label} className="rounded-lg border px-1.5 py-1 text-center" style={{ borderColor: `${color}25`, background: `${color}10` }}>
                                <span className="block text-[10px] font-bold leading-none" style={{ color }}>{value}</span>
                                <span className="text-[8px]" style={{ color }}>{label}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="rounded-2xl bg-(--color-primary-50) p-3">
                    <p className="mb-2 text-xs font-bold text-slate-700">{t('labels.total')}</p>
                    <div className="mb-3 grid grid-cols-4 gap-1.5">
                      {[
                        [mealTotals.kcal, 'kcal', '#f97316'],
                        [`${mealTotals.p}g`, t('labels.protein'), '#3b82f6'],
                        [`${mealTotals.c}g`, t('labels.carbs'), '#f59e0b'],
                        [`${mealTotals.f}g`, t('labels.fat'), '#ec4899'],
                      ].map(([value, label, color]) => (
                        <div key={label} className="rounded-xl border border-white/70 bg-white px-1 py-2 text-center">
                          <p className="text-xs font-bold" style={{ color }}>{value}</p>
                          <span className="mx-auto mt-1 block h-0.5 w-6 rounded-full" style={{ background: color }} />
                          <p className="mt-1 text-[9px] text-slate-400">{label}</p>
                        </div>
                      ))}
                    </div>
                    <MacroSplit protein={mealTotals.p} carbs={mealTotals.c} fat={mealTotals.f} />
                  </div>
                </>
              )}
            </PhoneCard>
          </div>
        )}
      </div>
    </div>
  );
}
