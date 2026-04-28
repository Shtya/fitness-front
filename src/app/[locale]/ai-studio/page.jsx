'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, Plus, Trash2, User, Dumbbell, UtensilsCrossed, Check, Loader2, Edit3, ChevronRight, ChevronUp, Eye, EyeOff, RefreshCw, AlertCircle, Zap, Target, Clock, FlameKindling, Apple, X } from 'lucide-react';

import exerciseData from './exercise.json';

/* ─────────────────────────────────────────────
   AI CONFIG — points to mse_ai_api
──────────────────────────────────────────────*/
const AI_BASE_URL = 'http://localhost:7777/v1/chat/completions';
const AI_AUTH = 'Bearer change-secret-key-2026';
const AI_MODEL = 'gpt-4o';

let EXERCISE_DB = exerciseData;

/* ─────────────────────────────────────────────
   MOCK FORM RESPONSES  (replace with real API)
──────────────────────────────────────────────*/
const MOCK_RESPONSES = [
  { id: '1', name: 'Ahmed Al-Rashidi', goal: 'muscle gain', age: 25, weight: 75, height: 178, gender: 'male', experience: 'intermediate', email: 'ahmed@example.com', phone: '+966501234567' },
  { id: '2', name: 'Sara Hassan', goal: 'fat loss', age: 30, weight: 68, height: 165, gender: 'female', experience: 'beginner', email: 'sara@example.com', phone: '+966509876543' },
  { id: '3', name: 'Khalid Nasser', goal: 'endurance', age: 28, weight: 80, height: 182, gender: 'male', experience: 'advanced', email: 'khalid@example.com', phone: '+966507654321' },
];

/* ─────────────────────────────────────────────
   API ENDPOINTS — swap with real ones
──────────────────────────────────────────────*/
const API = {
  createUser: '/api/users/create',
  createWorkout: '/api/workouts/create',
  createNutrition: '/api/nutrition/create',
};

/* ─────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────*/
function genPass(len = 12) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  return Array.from({ length: len }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

const DAYS_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
──────────────────────────────────────────────*/

function SectionCard({ icon: Icon, title, subtitle, children, collapsible = false, defaultOpen = true, accent = 'blue' }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-violet-500 to-purple-600',
  };
  return (
    <div className='rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden'>
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 ${collapsible ? 'cursor-pointer select-none' : ''}`} onClick={() => collapsible && setOpen(o => !o)}>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${colors[accent]} text-white shadow-sm flex-shrink-0`}>
          <Icon className='h-4.5 w-4.5' size={18} />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-semibold text-slate-900'>{title}</p>
          {subtitle && <p className='text-xs text-slate-500 truncate'>{subtitle}</p>}
        </div>
        {collapsible && (
          <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className='h-4 w-4 text-slate-400' />
          </motion.div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div key='body' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className='overflow-hidden'>
            <div className='p-5'>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className='block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className='w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition' />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className='block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'>{label}</label>
      <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={rows} className='w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition resize-none' />
    </div>
  );
}

function Badge({ children, color = 'slate' }) {
  const c = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red: 'bg-rose-50 text-rose-700 border border-rose-200',
    purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c[color] || c.slate}`}>{children}</span>;
}

/* ─────────────────────────────────────────────
   USER CARD EDITOR
──────────────────────────────────────────────*/
function UserEditor({ user, setUser, t, locale }) {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
      <Field label={t('fields.name')} value={user.name} onChange={v => setUser(u => ({ ...u, name: v }))} />
      <Field label={t('fields.email')} value={user.email} onChange={v => setUser(u => ({ ...u, email: v }))} type='email' />
      <div className='relative'>
        <Field label={t('fields.password')} value={user.password} onChange={v => setUser(u => ({ ...u, password: v }))} type={showPass ? 'text' : 'password'} />
        <div className='absolute right-2 top-[26px] flex gap-1'>
          <button type='button' onClick={() => setShowPass(s => !s)} className='h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition'>
            {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button type='button' onClick={() => setUser(u => ({ ...u, password: genPass() }))} title='Generate' className='h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition'>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
      <Field label={t('fields.phone')} value={user.phone} onChange={v => setUser(u => ({ ...u, phone: v }))} />
      <Field label={t('fields.age')} value={user.age} onChange={v => setUser(u => ({ ...u, age: v }))} type='number' />
      <Field label={t('fields.weight')} value={user.weight} onChange={v => setUser(u => ({ ...u, weight: v }))} />
      <div>
        <label className='block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'>{t('fields.goal')}</label>
        <select value={user.goal ?? ''} onChange={e => setUser(u => ({ ...u, goal: e.target.value }))} className='w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition'>
          {['muscle gain', 'fat loss', 'endurance', 'maintenance', 'flexibility'].map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className='block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'>{t('fields.membership')}</label>
        <select value={user.membership ?? 'basic'} onChange={e => setUser(u => ({ ...u, membership: e.target.value }))} className='w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition'>
          {['basic', 'gold', 'platinum'].map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WORKOUT PLAN EDITOR
──────────────────────────────────────────────*/
function WorkoutEditor({ plan, setPlan, t, locale }) {
  const isRTL = locale === 'ar';
  const DAYS = isRTL ? DAYS_AR : DAYS_EN;
  const [openDays, setOpenDays] = useState({});
  const toggle = i => setOpenDays(s => ({ ...s, [i]: !s[i] }));

  const addDay = () => {
    setPlan(p => [...(p || []), { day: DAYS_EN[p?.length % 7] || 'Saturday', exercises: [] }]);
  };

  const removeDay = i => setPlan(p => p.filter((_, idx) => idx !== i));

  const addExercise = dayIdx => {
    const ex = EXERCISE_DB[Math.floor(Math.random() * Math.max(1, EXERCISE_DB.length))] || {};
    setPlan(p =>
      p.map((d, i) =>
        i !== dayIdx
          ? d
          : {
              ...d,
              exercises: [
                ...(d.exercises || []),
                {
                  id: ex.id || crypto.randomUUID(),
                  name: ex.name || 'New Exercise',
                  img: ex.img || null,
                  sets: ex.targetSets || 3,
                  reps: ex.targetReps || '10-12',
                  rest: ex.rest || 60,
                },
              ],
            },
      ),
    );
  };

  const removeExercise = (dayIdx, exIdx) => {
    setPlan(p =>
      p.map((d, i) =>
        i !== dayIdx
          ? d
          : {
              ...d,
              exercises: d.exercises.filter((_, j) => j !== exIdx),
            },
      ),
    );
  };

  const updateExField = (dayIdx, exIdx, key, val) => {
    setPlan(p =>
      p.map((d, i) =>
        i !== dayIdx
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e, j) => (j !== exIdx ? e : { ...e, [key]: val })),
            },
      ),
    );
  };

  return (
    <div className='space-y-3'>
      {(plan || []).map((day, di) => (
        <div key={di} className='rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden'>
          <div className='flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100/60 transition' onClick={() => toggle(di)}>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg h-6 w-6 flex items-center justify-center'>{di + 1}</span>
              <select
                value={day.day}
                onChange={e => {
                  e.stopPropagation();
                  setPlan(p => p.map((d, i) => (i !== di ? d : { ...d, day: e.target.value })));
                }}
                onClick={e => e.stopPropagation()}
                className='bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer'>
                {DAYS_EN.map((d, di_) => (
                  <option key={d} value={d}>
                    {isRTL ? DAYS_AR[di_] : d}
                  </option>
                ))}
              </select>
              <Badge color='blue'>
                {day.exercises?.length || 0} {t('workout.exercises')}
              </Badge>
            </div>
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={e => {
                  e.stopPropagation();
                  removeDay(di);
                }}
                className='h-7 w-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition'>
                <Trash2 size={13} />
              </button>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openDays[di] ? 'rotate-180' : ''}`} />
            </div>
          </div>
          <AnimatePresence>
            {openDays[di] && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className='overflow-hidden'>
                <div className='px-4 pb-4 space-y-2.5 pt-1'>
                  {(day.exercises || []).map((ex, ei) => (
                    <div key={ei} className='flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3'>
                      {ex.img && <img src={ex.img} alt={ex.name} className='h-12 w-12 rounded-lg object-contain bg-slate-50 flex-shrink-0' />}
                      <div className='flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 min-w-0'>
                        <div className='col-span-2 md:col-span-1'>
                          <input value={ex.name} onChange={e => updateExField(di, ei, 'name', e.target.value)} className='w-full text-xs font-semibold text-slate-800 bg-transparent border-b border-slate-200 pb-0.5 outline-none focus:border-blue-400' />
                        </div>
                        {[
                          ['sets', t('workout.sets')],
                          ['reps', t('workout.reps')],
                          ['rest', t('workout.rest')],
                        ].map(([k, lbl]) => (
                          <div key={k}>
                            <span className='text-[10px] text-slate-400 font-medium block'>{lbl}</span>
                            <input value={ex[k] ?? ''} onChange={e => updateExField(di, ei, k, e.target.value)} className='w-full text-xs text-slate-700 bg-transparent border-b border-slate-200 pb-0.5 outline-none focus:border-blue-400' />
                          </div>
                        ))}
                      </div>
                      <button type='button' onClick={() => removeExercise(di, ei)} className='h-7 w-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition flex-shrink-0'>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button type='button' onClick={() => addExercise(di)} className='flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-700 mt-1 transition'>
                    <Plus size={13} /> {t('workout.addExercise')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      <button type='button' onClick={addDay} className='flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition'>
        <Plus size={14} /> {t('workout.addDay')}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NUTRITION PLAN EDITOR
──────────────────────────────────────────────*/
function NutritionEditor({ plan, setPlan, t }) {
  const [openMeals, setOpenMeals] = useState({});
  const toggle = i => setOpenMeals(s => ({ ...s, [i]: !s[i] }));

  const addMeal = () => {
    setPlan(p => [...(p || []), { title: `Meal ${(p?.length || 0) + 1}`, calories: 500, protein: 40, carbs: 50, fat: 15, items: [] }]);
  };

  const removeMeal = i => setPlan(p => p.filter((_, idx) => idx !== i));

  const updateMeal = (i, key, val) => {
    setPlan(p => p.map((m, idx) => (idx !== i ? m : { ...m, [key]: val })));
  };

  const addItem = i => {
    setPlan(p =>
      p.map((m, idx) =>
        idx !== i
          ? m
          : {
              ...m,
              items: [...(m.items || []), { name: '', quantity: '', calories: 0 }],
            },
      ),
    );
  };

  const updateItem = (mi, ii, key, val) => {
    setPlan(p =>
      p.map((m, idx) =>
        idx !== mi
          ? m
          : {
              ...m,
              items: m.items.map((it, j) => (j !== ii ? it : { ...it, [key]: val })),
            },
      ),
    );
  };

  const removeItem = (mi, ii) => {
    setPlan(p => p.map((m, idx) => (idx !== mi ? m : { ...m, items: m.items.filter((_, j) => j !== ii) })));
  };

  const totalCals = (plan || []).reduce((s, m) => s + Number(m.calories || 0), 0);

  return (
    <div className='space-y-3'>
      {/* Totals row */}
      <div className='flex flex-wrap gap-2 pb-2 border-b border-slate-100'>
        {[
          { label: t('nutrition.totalCalories'), value: totalCals, icon: FlameKindling, color: 'amber' },
          { label: t('nutrition.meals'), value: plan?.length || 0, icon: UtensilsCrossed, color: 'green' },
        ].map(({ label, value, icon: Ic, color }) => (
          <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold bg-${color === 'amber' ? 'amber' : 'emerald'}-50 text-${color === 'amber' ? 'amber' : 'emerald'}-700 border border-${color === 'amber' ? 'amber' : 'emerald'}-200`}>
            <Ic size={13} /> {label}: <span className='font-bold'>{value}</span>
          </div>
        ))}
      </div>

      {(plan || []).map((meal, mi) => (
        <div key={mi} className='rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden'>
          <div className='flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100/60 transition' onClick={() => toggle(mi)}>
            <div className='flex items-center gap-2 min-w-0'>
              <span className='text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg h-6 w-6 flex items-center justify-center flex-shrink-0'>{mi + 1}</span>
              <input
                value={meal.title}
                onChange={e => {
                  e.stopPropagation();
                  updateMeal(mi, 'title', e.target.value);
                }}
                onClick={e => e.stopPropagation()}
                className='text-sm font-semibold text-slate-800 bg-transparent outline-none w-36 truncate'
              />
              <Badge color='green'>{meal.calories} kcal</Badge>
            </div>
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={e => {
                  e.stopPropagation();
                  removeMeal(mi);
                }}
                className='h-7 w-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition'>
                <Trash2 size={13} />
              </button>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openMeals[mi] ? 'rotate-180' : ''}`} />
            </div>
          </div>
          <AnimatePresence>
            {openMeals[mi] && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className='overflow-hidden'>
                <div className='px-4 pb-4 pt-1 space-y-3'>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                    {[
                      ['calories', t('nutrition.calories')],
                      ['protein', t('nutrition.protein')],
                      ['carbs', t('nutrition.carbs')],
                      ['fat', t('nutrition.fat')],
                    ].map(([k, lbl]) => (
                      <div key={k}>
                        <label className='block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1'>{lbl}</label>
                        <input type='number' value={meal[k] ?? ''} onChange={e => updateMeal(mi, k, e.target.value)} className='w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition' />
                      </div>
                    ))}
                  </div>
                  <div className='space-y-1.5'>
                    {(meal.items || []).map((it, ii) => (
                      <div key={ii} className='flex items-center gap-2'>
                        <input value={it.name} onChange={e => updateItem(mi, ii, 'name', e.target.value)} placeholder={t('nutrition.itemName')} className='flex-1 text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-emerald-400 transition' />
                        <input value={it.quantity} onChange={e => updateItem(mi, ii, 'quantity', e.target.value)} placeholder={t('nutrition.quantity')} className='w-20 text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-emerald-400 transition' />
                        <input value={it.calories} onChange={e => updateItem(mi, ii, 'calories', e.target.value)} placeholder='kcal' className='w-16 text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-emerald-400 transition' />
                        <button type='button' onClick={() => removeItem(mi, ii)} className='h-7 w-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition flex-shrink-0'>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button type='button' onClick={() => addItem(mi)} className='flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700 mt-1 transition'>
                      <Plus size={12} /> {t('nutrition.addItem')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      <button type='button' onClick={addMeal} className='flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition'>
        <Plus size={14} /> {t('nutrition.addMeal')}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BUILD AI PROMPT
──────────────────────────────────────────────*/
function buildPrompt(response, exerciseList) {
  const exSample = exerciseList
    .slice(0, 30)
    .map(e => `{"id":"${e.id}","name":"${e.name}","category":"${e.category}","sets":${e.targetSets},"reps":"${e.targetReps}","rest":${e.rest}}`)
    .join(',');
  return `You are an expert fitness coach. Based on this client data, generate a complete plan.

Client data:
${JSON.stringify(response, null, 2)}

Available exercises (sample):
[${exSample}]

Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:
{
  "user": {
    "name": "string",
    "email": "string (generate from name if missing)",
    "phone": "string",
    "age": number,
    "weight": number,
    "goal": "string",
    "membership": "basic|gold|platinum",
    "notes": "string"
  },
  "workoutPlan": [
    {
      "day": "Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday",
      "exercises": [
        { "id": "exercise_id_from_list", "name": "string", "img": "url_or_null", "sets": number, "reps": "string", "rest": number }
      ]
    }
  ],
  "nutritionPlan": [
    {
      "title": "Meal name",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "items": [
        { "name": "food name", "quantity": "amount with unit", "calories": number }
      ]
    }
  ]
}

Rules:
- Create 3-5 workout days appropriate for the goal
- Create 4-6 meals appropriate for the goal and weight
- Use exercises from the provided list
- Make nutritional values realistic
- If name/email missing, generate sensible defaults`;
}

/* ─────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────*/
export default function AIStudioPage() {
  const t = useTranslations('aiStudio');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // State
  const [responses] = useState(MOCK_RESPONSES);
  const [selectedId, setSelectedId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');

  const [userData, setUserData] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [nutritionPlan, setNutritionPlan] = useState(null);

  const hasData = userData && workoutPlan && nutritionPlan;

  const selectedResponse = responses.find(r => r.id === selectedId);

  /* ── GENERATE ── */
  const handleGenerate = async () => {
    if (!selectedResponse) return;
    setGenerating(true);
    setAiError('');
    setError('');
    setSavedOk(false);

    const prompt = buildPrompt(selectedResponse, EXERCISE_DB);

    try {
      const res = await fetch(AI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AI_AUTH },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`AI API error: ${res.status}`);
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content;

      if (!raw) {
        throw new Error('AI returned empty content');
      }

      let parsed;

      if (typeof raw === 'string') {
        const clean = raw
          .replace(/```json|```/g, '')
          .replace(/\n/g, ' ') // 🔥 مهم
          .replace(/\r/g, '')
          .trim();

        parsed = JSON.parse(clean);
      } else if (typeof raw === 'object') {
        parsed = raw;
      } else {
        throw new Error('Unexpected AI response format');
      }

      if (!parsed?.user) {
        throw new Error('Missing user object in AI response');
      }

      setUserData({ ...parsed.user, password: genPass() });
      setWorkoutPlan(Array.isArray(parsed.workoutPlan) ? parsed.workoutPlan : []);
      setNutritionPlan(Array.isArray(parsed.nutritionPlan) ? parsed.nutritionPlan : []);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : t('errors.aiError'));
      setAiError(e.message || t('errors.aiError'));
    } finally {
      setGenerating(false);
    }
  };

  /* ── APPROVE / SAVE ── */
  const handleApprove = async () => {
    if (!hasData) return;
    setSaving(true);
    setError('');
    try {
      // Create user
      const uRes = await fetch(API.createUser, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!uRes.ok) {
        // Non-blocking demo: just log
        console.warn('User API not connected yet. Payload:', userData);
      }

      // Create workout
      const wRes = await fetch(API.createWorkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData?.id, plan: workoutPlan }),
      });
      if (!wRes.ok) console.warn('Workout API not connected yet. Payload:', workoutPlan);

      // Create nutrition
      const nRes = await fetch(API.createNutrition, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData?.id, plan: nutritionPlan }),
      });
      if (!nRes.ok) console.warn('Nutrition API not connected yet. Payload:', nutritionPlan);

      setSavedOk(true);
    } catch (e) {
      // In demo mode, treat network errors as success (APIs not yet wired)
      setSavedOk(true);
      console.warn('API not connected, demo mode. Data ready to send:', { userData, workoutPlan, nutritionPlan });
    } finally {
      setSaving(false);
    }
  };

  /* ── RENDER ── */
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className='mx-auto max-w-5xl px-4 py-8 space-y-6'>
        {/* ── HEADER ── */}
        <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'>
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-slate-900 tracking-tight'>{t('title')}</h1>
                <p className='text-sm text-slate-500'>{t('subtitle')}</p>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge color='blue'>{t('badges.beta')}</Badge>
            <Badge color='purple'>{t('badges.ai')}</Badge>
          </div>
        </div>

        {/* ── RESPONSE SELECTOR + GENERATE ── */}
        <div className='rounded-2xl border border-slate-200/70 bg-white shadow-sm p-5'>
          <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3'>{t('selector.label')}</p>
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='relative flex-1'>
              <select
                value={selectedId}
                onChange={e => {
                  setSelectedId(e.target.value);
                  setUserData(null);
                  setWorkoutPlan(null);
                  setNutritionPlan(null);
                  setSavedOk(false);
                  setAiError('');
                }}
                className='w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition cursor-pointer'>
                <option value=''>{t('selector.placeholder')}</option>
                {responses.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name || `Response #${r.id}`} — {r.goal}
                  </option>
                ))}
              </select>
              <ChevronDown className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            </div>
            <motion.button type='button' disabled={!selectedId || generating} onClick={handleGenerate} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className='flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition'>
              {generating ? <Loader2 size={16} className='animate-spin' /> : <Zap size={16} />}
              {generating ? t('btn.generating') : t('btn.generate')}
            </motion.button>
          </div>

          {/* Selected response preview */}
          {selectedResponse && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className='mt-4 flex flex-wrap gap-2'>
              {Object.entries(selectedResponse)
                .filter(([k]) => k !== 'id')
                .map(([k, v]) => (
                  <span key={k} className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'>
                    <span className='text-slate-400'>{k}:</span> {String(v)}
                  </span>
                ))}
            </motion.div>
          )}

          {aiError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700'>
              <AlertCircle size={15} className='flex-shrink-0' /> {aiError}
            </motion.div>
          )}
        </div>

        {/* ── LOADING SKELETONS ── */}
        {generating && (
          <div className='space-y-4'>
            {[1, 2, 3].map(i => (
              <div key={i} className='rounded-2xl border border-slate-200 bg-white p-5 animate-pulse'>
                <div className='h-4 w-1/4 bg-slate-100 rounded-full mb-4' />
                <div className='grid grid-cols-2 gap-3'>
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className='h-9 bg-slate-100 rounded-lg' />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DATA SECTIONS ── */}
        <AnimatePresence>
          {hasData && !generating && (
            <motion.div key='data' initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className='space-y-4'>
              {/* User Card */}
              <SectionCard icon={User} title={t('sections.user')} subtitle={userData?.name} accent='blue' collapsible defaultOpen>
                <UserEditor user={userData} setUser={setUserData} t={t} locale={locale} />
              </SectionCard>

              {/* Workout Plan */}
              <SectionCard icon={Dumbbell} title={t('sections.workout')} subtitle={`${workoutPlan?.length || 0} ${t('workout.days')}`} accent='purple' collapsible defaultOpen>
                <WorkoutEditor plan={workoutPlan} setPlan={setWorkoutPlan} t={t} locale={locale} />
              </SectionCard>

              {/* Nutrition Plan */}
              <SectionCard icon={UtensilsCrossed} title={t('sections.nutrition')} subtitle={`${nutritionPlan?.length || 0} ${t('nutrition.meals')}`} accent='green' collapsible defaultOpen>
                <NutritionEditor plan={nutritionPlan} setPlan={setNutritionPlan} t={t} />
              </SectionCard>

              {/* APPROVE CTA */}
              <div className='flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5'>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-slate-800'>{t('approve.title')}</p>
                  <p className='text-xs text-slate-500 mt-0.5'>{t('approve.subtitle')}</p>
                </div>
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    onClick={() => {
                      setUserData(null);
                      setWorkoutPlan(null);
                      setNutritionPlan(null);
                      setSavedOk(false);
                    }}
                    className='flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition'>
                    <X size={14} /> {t('btn.discard')}
                  </button>
                  <motion.button type='button' onClick={handleApprove} disabled={saving || savedOk} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className='flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed transition'>
                    {saving ? <Loader2 size={15} className='animate-spin' /> : savedOk ? <Check size={15} /> : <Check size={15} />}
                    {saving ? t('btn.saving') : savedOk ? t('btn.saved') : t('btn.approve')}
                  </motion.button>
                </div>
              </div>

              {savedOk && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className='flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium'>
                  <Check size={15} className='flex-shrink-0' /> {t('success.message')}
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700'>
                  <AlertCircle size={15} /> {error}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!hasData && !generating && (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 mb-4'>
              <Sparkles size={32} className='text-blue-500' />
            </div>
            <p className='text-base font-semibold text-slate-700'>{t('empty.title')}</p>
            <p className='text-sm text-slate-400 mt-1 max-w-xs'>{t('empty.subtitle')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
