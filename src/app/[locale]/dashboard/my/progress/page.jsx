'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, Trophy, TrendingUp, Flame, History as HistoryIcon } from 'lucide-react';
import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';

/* =========================
   Local helpers / UI atoms
========================= */
const LOCAL_PICK_KEY = 'mw.progress.exercisePick.v1';
const LOCAL_WINDOW_KEY = 'mw.progress.windowDays.v1';
const LOCAL_EX_WINDOW_KEY = 'mw.progress.exerciseWindowDays.v1';

const fmt = v => (v === null || v === undefined ? '—' : String(v));
const clampList = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []);

function Card({ className = '', children }) {
  return <div className={['rounded-lg border border-slate-200 bg-white', className].join(' ')}>{children}</div>;
}
function SectionTitle({ children, right }) {
  return (
    <div className='flex items-center justify-between mb-3'>
      <div className='font-semibold'>{children}</div>
      {right}
    </div>
  );
}
function KPI({ title, value, icon: Icon }) {
  return (
    <div className='p-3 rounded-lg border border-slate-200 bg-white flex items-center gap-3'>
      <div className='w-8 h-8 rounded-lg bg-slate-100 grid place-items-center'>
        <Icon size={16} className='text-slate-600' />
      </div>
      <div>
        <div className='text-[12px] text-slate-500'>{title}</div>
        <div className='text-sm font-semibold tabular-nums'>{value}</div>
      </div>
    </div>
  );
}

const Skeleton = () => (
  <div className='space-y-5 sm:space-y-6 animate-pulse'>
    <div className='rounded-lg overflow-hidden border border-indigo-200'>
      <div className='relative p-6 bg-gradient text-white'>
        <div className='h-6 bg-white/20 rounded w-56'></div>
        <div className='mt-2 h-4 bg-white/20 rounded w-64'></div>
      </div>
    </div>
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3'>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className='h-16 rounded-lg bg-slate-200' />
      ))}
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6'>
      <div className='h-72 rounded-lg bg-slate-200' />
      <div className='h-72 rounded-lg bg-slate-200' />
    </div>
    <div className='h-64 rounded-lg bg-slate-200' />
  </div>
);

/* =========================
   Data fetching
========================= */
async function fetchAllStats(userId, windowDays = 30, exerciseWindowDays = 90) {
  const { data } = await api.get('/prs/all-stats', {
    params: { userId, windowDays, exerciseWindowDays },
  });
  return data || null;
}

/* =========================
   Sub-sections (reused logic)
========================= */
function StatsOverview({ overview }) {
  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3'>
      <KPI title='Exercises Tracked' value={fmt(overview?.exercisesTracked)} icon={Dumbbell} />
      <KPI title='Total Attempts' value={fmt(overview?.totalAttempts)} icon={TrendingUp} />
      <KPI title='All-time PRs' value={fmt(overview?.allTimePrs)} icon={Trophy} />
      <KPI title='Current Streak' value={fmt(overview?.currentStreakDays)} icon={Flame} />
    </div>
  );
}

function AllTimeBests({ allTimeBests }) {
  const list = Array.isArray(allTimeBests) ? allTimeBests : [];
  return (
    <Card className='p-4'>
      <SectionTitle right={<div className='text-xs text-slate-500'>From PRs (e1RM)</div>}>All-time Bests</SectionTitle>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
        {list.length ? (
          list.map((best, i) => (
            <div key={i} className='p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between'>
              <div className='text-sm font-medium truncate'>{best.name}</div>
              <div className='text-sm tabular-nums font-semibold'>{best.e1rm} e1RM</div>
            </div>
          ))
        ) : (
          <div className='text-sm text-slate-500'>No personal records yet</div>
        )}
      </div>
    </Card>
  );
}

function ExerciseDrilldown({ drilldownMap, pick, onPickChange }) {
  const keys = useMemo(() => Object.keys(drilldownMap || {}), [drilldownMap]);
  const drill = pick && drilldownMap ? drilldownMap[pick] : null;
  const hasData = !!(drill && drill.hasData);

  return (
    <Card className='p-4'>
      <div className='flex items-center justify-between gap-2 mb-3'>
        <div className='font-semibold'>Exercise Progress</div>
        <select className='h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm' value={pick} onChange={e => onPickChange(e.target.value)}>
          {keys.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {!hasData ? (
        <EmptyState title='No data yet' subtitle='Log your first workout to see progress here.' icon={<TrendingUp />} />
      ) : (
        <div className='space-y-4'>
          {/* Summary tiles */}
          <div className='grid grid-cols-3 gap-3'>
            <div className='text-center p-3 rounded-lg bg-slate-50 border border-slate-200'>
              <div className='text-xs text-slate-500'>Best Weight</div>
              <div className='text-lg font-bold'>{drill.topSets?.byWeight?.[0]?.weight || 0} kg</div>
            </div>
            <div className='text-center p-3 rounded-lg bg-slate-50 border border-slate-200'>
              <div className='text-xs text-slate-500'>Best Reps</div>
              <div className='text-lg font-bold'>{drill.topSets?.byReps?.[0]?.reps || 0}</div>
            </div>
            <div className='text-center p-3 rounded-lg bg-slate-50 border border-slate-200'>
              <div className='text-xs text-slate-500'>Best e1RM</div>
              <div className='text-lg font-bold'>{drill.topSets?.byE1rm?.[0]?.e1rm || 0}</div>
            </div>
          </div>

          {/* Recent attempts */}
          {!!drill.attempts?.length && (
            <div>
              <div className='text-sm font-medium mb-2'>Recent Attempts</div>
              <div className='space-y-2 max-h-64 overflow-y-auto'>
                {clampList(drill.attempts, 10).map((a, i) => (
                  <div key={i} className='flex items-center justify-between p-2 rounded-lg border border-slate-200'>
                    <div className='text-sm'>{a.date}</div>
                    <div className='text-sm font-medium'>
                      {a.weight}kg × {a.reps}
                    </div>
                    {a.isPr && <span className='text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded'>PR</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SessionHistory({ history }) {
  const workouts = history?.workouts || [];
  return (
    <Card className='p-4'>
      <div className='flex items-center justify-between mb-3'>
        <div className='font-semibold'>Workout History</div>
        <div className='text-sm text-slate-500'>{history?.totalWorkouts || 0} workouts completed</div>
      </div>
      {workouts.length ? (
        <div className='space-y-3'>
          {clampList(workouts, 12).map((w, i) => (
            <div key={i} className='p-3 rounded-lg border border-slate-200 bg-white'>
              <div className='flex items-center justify-between mb-1.5'>
                <div className='font-medium text-sm'>{w.date}</div>
                <div className='text-xs text-slate-500'>
                  {w.setsDone}/{w.setsTotal} sets
                </div>
              </div>
              <div className='text-sm text-slate-700 mb-1'>{w.name}</div>
              {w.volume != null && <div className='text-xs text-slate-500'>Volume: {Number(w.volume).toLocaleString()} kg·reps</div>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title='No workouts yet' subtitle='Complete your first workout to see history here.' icon={<HistoryIcon />} />
      )}
    </Card>
  );
}

/* =========================
   Page
========================= */
export default function ProgressPage() {
  const t = useTranslations('MyWorkouts'); // reuse existing namespace strings if you have them
  const user = useUser();
  const USER_ID = user?.id;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Persisted user picks
  const [windowDays, setWindowDays] = useState(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem(LOCAL_WINDOW_KEY) || 30);
    return 30;
  });
  const [exerciseWindowDays, setExerciseWindowDays] = useState(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem(LOCAL_EX_WINDOW_KEY) || 90);
    return 90;
  });
  const [exercisePick, setExercisePick] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(LOCAL_PICK_KEY) || '';
    return '';
  });

  // live flag (only show when visible)
  const [live, setLive] = useState(true);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    if (!USER_ID) return;
    const data = await fetchAllStats(USER_ID, windowDays, exerciseWindowDays);
    setStats(data);

    // set default pick if empty
    if (!exercisePick && data?.exerciseDrilldown) {
      const first = Object.keys(data.exerciseDrilldown)[0];
      if (first) setExercisePick(first);
    }
  }, [USER_ID, windowDays, exerciseWindowDays, exercisePick]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  // Auto-refresh every second when tab visible
  useEffect(() => {
    const tick = () => load();
    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(tick, 1000);
      setLive(true);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLive(false);
    };

    // Page Visibility API
    const visHandler = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', visHandler);
    if (!document.hidden) start();

    return () => {
      document.removeEventListener('visibilitychange', visHandler);
      stop();
    };
  }, [load]);

  // Persist user picks
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LOCAL_PICK_KEY, exercisePick || '');
  }, [exercisePick]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LOCAL_WINDOW_KEY, String(windowDays));
  }, [windowDays]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LOCAL_EX_WINDOW_KEY, String(exerciseWindowDays));
  }, [exerciseWindowDays]);

  const drilldown = stats?.exerciseDrilldown || {};

  if (loading) return <Skeleton />;

  return (
    <div className='space-y-5 sm:space-y-6'>
      {/* Header */}
      <div className='rounded-lg overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 justify-between'>
            <PageHeader title='Progress' subtitle='Track PRs, attempts, and history across your plans.' />
            <div className='flex items-center gap-2'>
              <div className={['text-xs px-3 py-1 rounded-full', live ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'].join(' ')}>
                {live ? (
                  <span className='inline-flex items-center gap-2'>
                    <span className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></span> Live: 1s
                  </span>
                ) : (
                  'Paused'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className='px-4 md:px-6 py-3 bg-white border-t border-indigo-100/60'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='text-xs text-slate-600 mr-2'>Overview window:</div>
            <div className='flex items-center gap-2'>
              {[7, 30, 90].map(v => (
                <button key={v} onClick={() => setWindowDays(v)} className={['h-8 px-3 rounded-lg border text-sm', windowDays === v ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'].join(' ')}>
                  {v}d
                </button>
              ))}
            </div>

            <div className='text-xs text-slate-600 ml-4 mr-2'>Exercise window:</div>
            <div className='flex items-center gap-2'>
              {[30, 90, 180].map(v => (
                <button key={v} onClick={() => setExerciseWindowDays(v)} className={['h-8 px-3 rounded-lg border text-sm', exerciseWindowDays === v ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'].join(' ')}>
                  {v}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overview KPIs */}
      <StatsOverview overview={stats?.overview} />

      {/* Main grid */}
      <div className='grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6'>
        {/* Left: Exercise drilldown */}
        <ExerciseDrilldown drilldownMap={drilldown} pick={exercisePick || Object.keys(drilldown)[0]} onPickChange={setExercisePick} />

        {/* Right: All-time bests */}
        <AllTimeBests allTimeBests={stats?.allTimeBests} />
      </div>

      {/* History list */}
      <SessionHistory history={stats?.sessionHistory} />
    </div>
  );
}
