'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { ListChecks, Droplets, Apple, Utensils, History as HistoryIcon, Info, Check, X, Plus, Minus } from 'lucide-react';

/* =================== CONFIG / SEED DATA =================== */

const STORAGE_KEYS = {
  ui: 'mw.nutri.ui',
  plan: 'mw.nutri.plan', // whole plan (if you ever customize it)
  dayState: 'mw.nutri.state.v1', // daily completion state (per day)
};

const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

// Base meal plan used for all days by default (you can override per day if you want)
const baseMeals = [
  {
    id: 'meal1',
    title: 'Meal 1',
    items: [
      { id: 'm1-eggs', label: '2 whole eggs' },
      { id: 'm1-toast', label: '2 brown toast' },
      { id: 'm1-veggies', label: 'Vegetables' },
    ],
    subs: ['يمكن تبديل كل 2 brown toast برغيف عيش بلدي.'],
  },
  {
    id: 'meal2',
    title: 'Meal 2',
    items: [
      { id: 'm2-oats', label: '50g oats' },
      { id: 'm2-nuts', label: '10g nuts' },
      { id: 'm2-banana', label: '150g bananas' },
      { id: 'm2-milk', label: '100ml milk' },
    ],
    subs: ['يمكن تبديل الموز ب فراولة / تفاح / جوافة / كمثرى.'],
  },
  {
    id: 'meal3',
    title: 'Meal 3',
    items: [
      { id: 'm3-protein', label: '150g chicken أو أي نوع سمك' },
      { id: 'm3-carbs', label: '150g rice' },
      { id: 'm3-nuts', label: '10g nuts' },
      { id: 'm3-veggies', label: 'Vegetables' },
    ],
    subs: ['كل 100g رز = 120g بطاطس/بطاطا أو 100g مكرونة.'],
  },
  {
    id: 'meal4',
    title: 'Meal 4',
    items: [
      { id: 'm4-protein', label: '150g chicken أو أي نوع من السمك' },
      { id: 'm4-carbs', label: '150g rice' },
      { id: 'm4-nuts', label: '10g nuts' },
      { id: 'm4-veggies', label: 'Vegetables' },
    ],
    subs: ['كل 100g رز = 120g بطاطس/بطاطا أو 100g مكرونة.'],
  },
  {
    id: 'meal5',
    title: 'Meal 5',
    items: [
      { id: 'm5-yogurt', label: 'Greek yogurt' },
      { id: 'm5-strawberry', label: '100g strawberries' },
    ],
    subs: ['يمكن تبديل ال Greek yogurt بسكوب بروتين + 60ml milk.'],
  },
];

const arabicGuidelines = ['١) حباية مالتي فيتامين بعد الوجبة الأولى.', '٢) حباية أوميجا بعد الوجبة الثانية.', '٣) حباية زنك بعد الوجبة الأخيرة.', '٤) مسموح بالملح بكمية معتدلة.', '٥) شرب ٤ لتر مياه يوميًا.', '٦) مسموح بالمشروبات الدايت، الشاي والقهوة سادة أو بسكر دايت.', '٧) ميزان الأكل بعد الطبخ / ميزان الأكل مهم.', '٨) ممنوع الزيوت المهدرجة أو السكر المُصنّع (الشيت ميل نتفق عليها مسبقًا).', '٩) كل 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.', '١٠) السلطة بدون جرامات محددة (خيار/طماطم/جزر) ويمكن استبدالها بخضار سوتيه.', '١١) يمكن دمج الوجبات أو تبديل ترتيبها.', '١٢) 2 brown toast ↔ رغيف عيش بلدي.', '١٣) Greek yogurt ↔ سكوب بروتين + 60ml milk.', '١٤) الموز ↔ فراولة / تفاح / جوافة / كمثرى.', '١٥) 3g كرياتين قبل التمرين (اختياري لكنه مفيد).', '١٦) مهم جدًا ضبط الملح ليكون معتدلًا.'];

/* =================== UTILS =================== */

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
  // For each meal item -> false (not done)
  const itemFlags = {};
  baseMeals.forEach(meal => meal.items.forEach(it => (itemFlags[it.id] = false)));
  return {
    items: itemFlags,
    mealsDone: baseMeals.reduce((acc, m) => ({ ...acc, [m.id]: false }), {}),
    waterMl: 0, // track water in ml (target 4000)
    supplements: { multi: false, omega: false, zinc: false, creatine: false },
    notes: '',
  };
}

/* =================== PAGE =================== */

export default function NutritionPage() {
  const [selectedDay, setSelectedDay] = useState('saturday');
  const [tab, setTab] = useState('meals'); // meals | guidelines | history
  const [dayState, setDayState] = useState(() => {
    const saved = loadLS(STORAGE_KEYS.dayState, {});
    // ensure all days exist
    const filled = { ...saved };
    weekOrder.forEach(d => {
      if (!filled[d]) filled[d] = makeDefaultDayState();
    });
    return filled;
  });

  // hydrate UI tab/day
  useEffect(() => {
    const savedUI = loadLS(STORAGE_KEYS.ui, { tab: 'meals', day: 'saturday' });
    setTab(savedUI.tab || 'meals');
    setSelectedDay(savedUI.day || 'saturday');
  }, []);

  // persist day state & UI
  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.dayState, dayState), 200);
    return () => clearTimeout(id);
  }, [dayState]);

  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.ui, { tab, day: selectedDay }), 120);
    return () => clearTimeout(id);
  }, [tab, selectedDay]);

  const targetWaterMl = 4000;
  const cups = 8; // 8 x 500ml
  const cupSize = targetWaterMl / cups;

  const todays = dayState[selectedDay] || makeDefaultDayState();

  // Derived stats
  const mealsProgress = useMemo(() => {
    const perMealCompletion = baseMeals.map(meal => {
      const doneCount = meal.items.filter(it => todays.items[it.id]).length;
      return { id: meal.id, count: doneCount, total: meal.items.length };
    });
    const totalDone = perMealCompletion.reduce((s, m) => s + m.count, 0);
    const totalItems = baseMeals.reduce((s, m) => s + m.items.length, 0);
    return { perMealCompletion, totalDone, totalItems };
  }, [todays]);

  const waterPct = Math.min(100, Math.round((todays.waterMl / targetWaterMl) * 100));

  // Grocery list (auto) — items not completed
  const grocery = useMemo(() => {
    const list = [];
    baseMeals.forEach(meal =>
      meal.items.forEach(it => {
        if (!todays.items[it.id]) list.push(it.label);
      }),
    );
    return list;
  }, [todays]);

  function toggleItem(id) {
    setDayState(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        items: { ...prev[selectedDay].items, [id]: !prev[selectedDay].items[id] },
      },
    }));
  }

  function markMealDone(mealId, value) {
    // set all items in meal to the value, and meal flag
    const meal = baseMeals.find(m => m.id === mealId);
    if (!meal) return;
    setDayState(prev => {
      const nextItems = { ...prev[selectedDay].items };
      meal.items.forEach(it => (nextItems[it.id] = value));
      return {
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay],
          items: nextItems,
          mealsDone: { ...prev[selectedDay].mealsDone, [mealId]: value },
        },
      };
    });
  }

  function adjustWater(deltaMl) {
    setDayState(prev => {
      const cur = prev[selectedDay].waterMl;
      const next = Math.max(0, Math.min(targetWaterMl, cur + deltaMl));
      return { ...prev, [selectedDay]: { ...prev[selectedDay], waterMl: next } };
    });
  }

  function setSupplement(key, val) {
    setDayState(prev => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], supplements: { ...prev[selectedDay].supplements, [key]: val } },
    }));
  }

  function setNotes(text) {
    setDayState(prev => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], notes: text.slice(0, 1000) },
    }));
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <PageHeader icon={Utensils} title='Nutrition Plan' subtitle='Track meals, water, and supplements—smart swaps included.' />
        <TabsPill
          id='nutrition-tabs'
          tabs={[
            { key: 'meals', label: 'Meals', icon: ListChecks },
            { key: 'guidelines', label: 'Guidelines', icon: Info },
            { key: 'history', label: 'History', icon: HistoryIcon }, // placeholder for future
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* Day picker */}
      <div className='rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2'>
          {weekOrder.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`cursor-pointer p-2 md:p-3 rounded-lg text-left transition-all border
                ${selectedDay === d ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
              <div className='text-sm font-semibold'>{d[0].toUpperCase() + d.slice(1)}</div>
              <div className='text-[11px] mt-1 truncate opacity-70'>Daily meal plan</div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='flex flex-col md:flex-row gap-4 items-center md:items-stretch'>
          <div className='flex-1'>
            <div className='text-sm text-slate-600 mb-1'>Today’s completion</div>
            <div className='w-full h-2 rounded-full bg-slate-200 overflow-hidden'>
              <div className='h-2 bg-indigo-600 rounded-full' style={{ width: `${Math.round((mealsProgress.totalDone / Math.max(1, mealsProgress.totalItems)) * 100)}%` }} />
            </div>
            <div className='text-xs text-slate-500 mt-1'>
              {mealsProgress.totalDone}/{mealsProgress.totalItems} items done
            </div>
          </div>

          <div className='w-px bg-slate-200 hidden md:block' />

          {/* Water widget */}
          <div className='flex-1'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 font-medium'>
                <Droplets size={16} /> Water (target 4L)
              </div>
              <div className='text-sm tabular-nums'>{Math.round(todays.waterMl / 100) / 10} L</div>
            </div>
            <div className='mt-2 w-full h-2 rounded-full bg-slate-200 overflow-hidden'>
              <div className='h-2 bg-indigo-600 rounded-full' style={{ width: `${waterPct}%` }} />
            </div>
            <div className='mt-2 flex items-center gap-2 flex-wrap'>
              {/* Quick 500ml cup buttons */}
              {[...Array(8)].map((_, i) => {
                const threshold = (i + 1) * cupSize;
                const filled = todays.waterMl >= threshold;
                return <button key={i} onClick={() => adjustWater(filled ? -cupSize : cupSize)} className={`w-6 h-6 rounded-md border ${filled ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title='Toggle 500ml' aria-label='Toggle 500ml' />;
              })}
              <div className='ml-auto flex items-center gap-2'>
                <button onClick={() => adjustWater(250)} className='px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50'>
                  +250ml
                </button>
                <button onClick={() => adjustWater(-250)} className='px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50'>
                  -250ml
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      {tab === 'meals' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-6'>
          {/* Meals grid */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {baseMeals.map(meal => {
              const doneCount = meal.items.filter(it => todays.items[it.id]).length;
              const allDone = doneCount === meal.items.length;
              return (
                <motion.div key={meal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} className='rounded-2xl border border-slate-200 bg-white overflow-hidden'>
                  <div className='p-4 border-b border-slate-100 flex items-center justify-between'>
                    <div>
                      <div className='font-semibold'>{meal.title}</div>
                      <div className='text-xs text-slate-500'>
                        {doneCount}/{meal.items.length} completed
                      </div>
                    </div>
                    <button onClick={() => markMealDone(meal.id, !allDone)} className={`text-xs px-3 py-1.5 rounded-lg border ${allDone ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      {allDone ? 'Unmark meal' : 'Mark meal done'}
                    </button>
                  </div>

                  <div className='p-4 space-y-3'>
                    {meal.items.map(it => {
                      const checked = !!todays.items[it.id];
                      return (
                        <label key={it.id} className='flex items-center gap-3 cursor-pointer'>
                          <input type='checkbox' className='h-4 w-4 rounded border-slate-300' checked={checked} onChange={() => toggleItem(it.id)} />
                          <span className={`text-sm ${checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>{it.label}</span>
                        </label>
                      );
                    })}

                    {meal.subs?.length ? (
                      <div className='mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3'>
                        <div className='text-xs font-medium text-slate-700 mb-1'>Smart swaps</div>
                        <ul className='list-disc pl-5 text-xs text-slate-600 space-y-1'>
                          {meal.subs.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Notes for this day (shared across meals) */}
                    <div className='pt-2'>
                      <div className='text-xs text-slate-500 mb-1'>Notes for today</div>
                      <textarea value={todays.notes} onChange={e => setNotes(e.target.value)} placeholder='Anything to remember for meals/shopping…' className='w-full min-h-[72px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Supplements */}
          <div className='rounded-2xl border border-slate-200 bg-white p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='font-semibold'>Supplements</div>
              <div className='text-xs text-slate-500'>Tick when taken</div>
            </div>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <SuppTile label='Multi-vitamin بعد الوجبة الأولى' checked={todays.supplements.multi} onChange={v => setSupplement('multi', v)} />
              <SuppTile label='Omega بعد الوجبة الثانية' checked={todays.supplements.omega} onChange={v => setSupplement('omega', v)} />
              <SuppTile label='Zinc بعد الوجبة الأخيرة' checked={todays.supplements.zinc} onChange={v => setSupplement('zinc', v)} />
              <SuppTile label='Creatine 3g قبل التمرين (اختياري)' checked={todays.supplements.creatine} onChange={v => setSupplement('creatine', v)} />
            </div>
          </div>

          {/* Grocery list (auto from unchecked) */}
          <div className='rounded-2xl border border-slate-200 bg-white p-4'>
            <div className='flex items-center justify-between'>
              <div className='font-semibold'>Grocery list (auto)</div>
              <div className='text-xs text-slate-500'>{grocery.length} items</div>
            </div>
            {grocery.length ? (
              <ul className='mt-2 list-square pl-5 space-y-1 text-sm'>
                {grocery.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            ) : (
              <div className='mt-2 text-sm text-slate-500'>All set! Nothing pending for today.</div>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'guidelines' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='font-semibold mb-2 flex items-center gap-2'>
            <Info size={16} /> الإرشادات
          </div>
          <ul className='list-decimal pl-6 space-y-2 text-sm leading-relaxed'>
            {arabicGuidelines.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {tab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
          <EmptyState title='Nutrition history coming soon' subtitle='You’ll be able to review past adherence by day.' icon={HistoryIcon} />
        </motion.div>
      )}
    </div>
  );
}

/* =================== SMALL COMPONENTS =================== */

function SuppTile({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`text-left p-3 rounded-xl border transition flex items-start gap-2
        ${checked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
      <div className={`mt-0.5 h-4 w-4 rounded border ${checked ? 'bg-green-600 border-green-600' : 'border-slate-300 bg-white'}`} />
      <div className='text-sm'>
        <div className='font-medium'>{label}</div>
        <div className='text-[11px] text-slate-500 mt-0.5'>Tap to toggle</div>
      </div>
    </button>
  );
}
 