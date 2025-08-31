'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader, ToolbarButton, EmptyState, RingProgress, StatCard, ProgressBar, spring } from '@/components/dashboard/ui/UI';
import { LayoutDashboard, Play, ClipboardList, Salad, Droplets, CheckCircle2, Dumbbell, AlarmClock, Plus } from 'lucide-react';

/* ===== Mock “today” data (swap with your API) ===== */
const mockWorkout = {
  name: 'Upper Body Push (Week 3 • Day 2)',
  startAt: '18:00',
  exercises: [
    { id: 'ex1', name: 'Barbell Bench Press', sets: 4, reps: '6–8', done: [false, false, false, false] },
    { id: 'ex2', name: 'Incline DB Press', sets: 3, reps: '10', done: [false, false, false] },
    { id: 'ex3', name: 'Cable Flys', sets: 3, reps: '12', done: [false, false, false] },
    { id: 'ex4', name: 'Triceps Rope Pushdowns', sets: 3, reps: '12', done: [false, false, false] },
  ],
};

const mockNutrition = {
  calories: { target: 2400, consumed: 1560 },
  macros: [
    { key: 'Protein', grams: 130, target: 180 },
    { key: 'Carbs', grams: 190, target: 260 },
    { key: 'Fat', grams: 48, target: 70 },
  ],
  waterML: 1800,
  waterTarget: 3000,
};

const mockTasks = [
  { id: 't1', title: 'Check-in form (weekly)', due: 'today', type: 'habit', done: false },
  { id: 't2', title: 'Log lunch', due: 'today', type: 'nutrition', done: false },
  { id: 't3', title: 'Pay invoice #4213', due: 'today', type: 'billing', done: false },
  { id: 't4', title: 'Stretch 10 minutes', due: 'today', type: 'recovery', done: true },
];

export default function MyDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const [nutrition, setNutrition] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setWorkout(mockWorkout);
      setNutrition(mockNutrition);
      setTasks(mockTasks);
      setLoading(false);
    }, 500);
  }, []);

  const workoutPct = useMemo(() => {
    if (!workout) return 0;
    const total = workout.exercises.reduce((a, e) => a + e.sets, 0);
    const done = workout.exercises.reduce((a, e) => a + e.done.filter(Boolean).length, 0);
    return Math.round((done / Math.max(1, total)) * 100);
  }, [workout]);

  const kcalPct = useMemo(() => Math.round(((nutrition?.calories.consumed || 0) / Math.max(1, nutrition?.calories.target || 1)) * 100), [nutrition]);
  const waterPct = useMemo(() => Math.round(((nutrition?.waterML || 0) / Math.max(1, nutrition?.waterTarget || 1)) * 100), [nutrition]);

  function toggleSet(exId, i) {
    setWorkout(w => ({
      ...w,
      exercises: w.exercises.map(ex => (ex.id === exId ? { ...ex, done: ex.done.map((d, idx) => (idx === i ? !d : d)) } : ex)),
    }));
  }

  function toggleTask(id) {
    setTasks(list => list.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function addWater(ml = 250) {
    setNutrition(n => ({ ...n, waterML: Math.min(n.waterTarget, n.waterML + ml) }));
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        icon={LayoutDashboard}
        title='My Dashboard'
        subtitle='Your day at a glance: workout, calories, and tasks.'
        actions={
          <div className='flex items-center gap-2'>
            <ToolbarButton icon={ClipboardList} variant='secondary'>
              Check-in
            </ToolbarButton>
            <ToolbarButton icon={Salad} variant='secondary'>
              Log meal
            </ToolbarButton>
            <ToolbarButton icon={Play}>Start workout</ToolbarButton>
          </div>
        }
      />

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3'>
          <RingProgress value={workoutPct}>
            <div className='text-center'>
              <div className='text-xs text-slate-500'>Workout</div>
              <div className='text-lg font-semibold'>{workoutPct}%</div>
            </div>
          </RingProgress>
          <div className='ml-3 min-w-0'>
            <div className='text-sm text-slate-500'>Today</div>
            <div className='font-semibold truncate'>{workout?.name || '—'}</div>
          </div>
        </div>
        <StatCard title='Calories consumed' value={`${nutrition?.calories.consumed || 0} / ${nutrition?.calories.target || 0} kcal`} delta={kcalPct - 50} icon={Salad} />
        <StatCard title='Water' value={`${nutrition?.waterML || 0} / ${nutrition?.waterTarget || 0} ml`} delta={waterPct - 60} icon={Droplets} />
        <StatCard title='Tasks today' value={`${tasks.filter(t => t.done).length} / ${tasks.length}`} icon={CheckCircle2} />
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* ===== Today's Workout ===== */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='flex items-center justify-between'>
            <div className='font-semibold flex items-center gap-2'>
              <Dumbbell className='w-4 h-4' /> Today’s Workout
            </div>
            {workout?.startAt && (
              <div className='text-sm text-slate-500 flex items-center gap-1'>
                <AlarmClock className='w-4 h-4' /> {workout.startAt}
              </div>
            )}
          </div>

          {loading ? (
            <div className='mt-3 space-y-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='h-14 rounded-xl bg-slate-100 animate-pulse' />
              ))}
            </div>
          ) : workout ? (
            <div className='mt-3 space-y-3'>
              {workout.exercises.map(ex => (
                <div key={ex.id} className='rounded-xl border border-slate-200 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='font-medium'>{ex.name}</div>
                    <div className='text-xs text-slate-500'>
                      {ex.reps} reps · {ex.sets} sets
                    </div>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {ex.done.map((d, i) => (
                      <button key={i} onClick={() => toggleSet(ex.id, i)} className={`px-3 py-1 rounded-lg border text-sm ${d ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        Set {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className='text-sm text-slate-500'>
                Progress: <span className='font-semibold'>{workoutPct}%</span>
              </div>
            </div>
          ) : (
            <EmptyState title='No workout scheduled' subtitle='Ask your coach to assign a program or add a custom workout.' />
          )}
        </motion.div>

        {/* ===== Calories & Macros ===== */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='font-semibold'>Calories & Macros</div>
          {loading ? (
            <div className='mt-3 space-y-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='h-6 rounded bg-slate-100 animate-pulse' />
              ))}
            </div>
          ) : nutrition ? (
            <>
              <div className='mt-3 flex items-center gap-3'>
                <RingProgress value={kcalPct} size={88}>
                  <div className='text-center'>
                    <div className='text-[10px] text-slate-500'>kcal</div>
                    <div className='text-sm font-semibold'>{kcalPct}%</div>
                  </div>
                </RingProgress>
                <div className='text-sm text-slate-600'>
                  <div>
                    <span className='font-semibold'>{nutrition.calories.consumed}</span> / {nutrition.calories.target} kcal
                  </div>
                  <div className='text-xs'>Remaining: {Math.max(0, nutrition.calories.target - nutrition.calories.consumed)} kcal</div>
                  <div className='mt-2'>
                    <button className='px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white hover:bg-slate-50'>Log meal</button>
                  </div>
                </div>
              </div>
              <div className='mt-4 space-y-3'>
                {nutrition.macros.map(m => {
                  const pct = Math.round((m.grams / Math.max(1, m.target)) * 100);
                  return (
                    <div key={m.key}>
                      <div className='flex items-center justify-between text-sm'>
                        <div className='text-slate-600'>{m.key}</div>
                        <div className='text-slate-700 font-medium'>
                          {m.grams} / {m.target} g
                        </div>
                      </div>
                      <div className='mt-1'>
                        <ProgressBar value={m.grams} max={m.target} />
                      </div>
                      <div className='text-xs text-slate-500 mt-1'>{pct}%</div>
                    </div>
                  );
                })}
              </div>
              <div className='mt-4 rounded-xl border border-slate-200 p-3'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm text-slate-600 flex items-center gap-2'>
                    <Droplets className='w-4 h-4' /> Water
                  </div>
                  <div className='text-sm font-medium'>
                    {nutrition.waterML} / {nutrition.waterTarget} ml
                  </div>
                </div>
                <div className='mt-2'>
                  <ProgressBar value={nutrition.waterML} max={nutrition.waterTarget} />
                </div>
                <div className='mt-2 flex items-center gap-2'>
                  {[250, 500].map(ml => (
                    <button key={ml} onClick={() => addWater(ml)} className='px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white hover:bg-slate-50'>
                      +{ml} ml
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState title='No nutrition targets' subtitle='Set daily calories and macros to track.' />
          )}
        </motion.div>
      </div>

      {/* ===== Tasks ===== */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='flex items-center justify-between'>
          <div className='font-semibold'>Today’s Tasks</div>
          <button className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 text-sm'>
            <Plus className='w-4 h-4' /> Add task
          </button>
        </div>
        {loading ? (
          <div className='mt-3 space-y-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='h-10 rounded bg-slate-100 animate-pulse' />
            ))}
          </div>
        ) : tasks.length ? (
          <ul className='mt-3 divide-y divide-slate-100'>
            {tasks.map(t => (
              <li key={t.id} className='py-2 flex items-center gap-3'>
                <input type='checkbox' checked={t.done} onChange={() => toggleTask(t.id)} className='w-4 h-4 rounded border-slate-300' />
                <span className={`text-sm ${t.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</span>
                <span className='ml-auto text-xs text-slate-500'>{t.due}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title='No tasks for today' subtitle='Create a task or enable automations to generate them.' />
        )}
      </motion.div>

      {/* local safety styles if not global */}
      <style jsx>{`
        .btn-primary {
          @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white;
        }
      `}</style>
    </div>
  );
}
