
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, History as HistoryIcon, X, Minus, Plus, Video as VideoIcon, Trophy, TrendingUp, Flame, Save as SaveIcon, ImageIcon, Headphones, Settings as SettingsIcon, Menu as MenuIcon } from 'lucide-react';
import Button from '@/components/atoms/Button';
import CheckBox from '@/components/atoms/CheckBox';
import api from '@/utils/axios';
import weeklyProgram from './exercises';
import { KPI, TopList } from '@/components/pages/workouts/UI';
import { createSessionFromDay, applyServerRecords, markUnsaved, persistLocalBuffer, flushLocalBufferForExercise } from '@/components/pages/workouts/helpers';

import { RestTimerCard } from '@/components/pages/workouts/RestTimerCard';
import { SettingsPopup } from '@/components/pages/workouts/SettingsPopup';
import { AudioHubInline } from '@/components/pages/workouts/AudioHub';
import DataTable from '@/components/dashboard/ui/DataTable';
import { ExerciseList } from '@/components/pages/workouts/ExerciseList';
import { InlineVideo } from '@/components/pages/workouts/InlineVideo';
import { useUser } from '@/hooks/useUser';


export const DEFAULT_SOUNDS = ['/sounds/1.mp3', '/sounds/2.mp3', '/sounds/alert1.mp3', '/sounds/alert2.mp3', '/sounds/alert3.mp3', '/sounds/alert4.mp3', '/sounds/alert5.mp3', '/sounds/alert6.mp3', '/sounds/alert7.mp3', '/sounds/alert8.mp3'];
const LOCAL_KEY_SETTINGS = 'mw.settings.v1';

/* =================== HELPERS =================== */
const jsDayToId = d => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';

function pickTodayId(availableIds) {
  const todayId = jsDayToId(new Date().getDay());
  if (availableIds.includes(todayId)) return todayId;
  // Prefer your training order if today isn't available
  const pref = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return pref.find(x => availableIds.includes(x)) || availableIds[0] || 'monday';
}

// Optimized throttle function
const throttle = (fn, wait = 800) => {
  let last = 0,
    timer = null,
    lastArgs,
    lastThis;
  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    lastArgs = args;
    lastThis = this;
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn.apply(lastThis, lastArgs);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  };
};

const epley = (w, r) => Math.round((Number(w) || 0) * (1 + (Number(r) || 0) / 30));
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtVal = v => (v === null || v === undefined ? '—' : typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v));

// returns YYYY-MM-DD
function dateOnlyISO(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DAY_INDEX = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const WEEK_START = 6; // saturday

function isoForThisWeeksDay(dayName, refDate = new Date(), weekStart = WEEK_START) {
  const targetIdx = DAY_INDEX[dayName.toUpperCase()];
  if (targetIdx == null) throw new Error(`Bad dayName: ${dayName}`);

  const refIdx = refDate.getDay(); // 0..6
  // start-of-week date
  const deltaStart = (refIdx - weekStart + 7) % 7;
  const start = new Date(refDate);
  start.setHours(12, 0, 0, 0); // avoid DST edges
  start.setDate(start.getDate() - deltaStart);

  // target day date
  const targetOffset = (targetIdx - weekStart + 7) % 7;
  const target = new Date(start);
  target.setDate(start.getDate() + targetOffset);

  return dateOnlyISO(target);
}

const apiCache = new Map();

async function fetchWithCache(key, fetchFn) {
  if (apiCache.has(key)) {
    return apiCache.get(key);
  }
  const result = await fetchFn();
  apiCache.set(key, result);
  return result;
}

async function fetchActivePlan(userId) {
  const cacheKey = `activePlan-${userId ?? 'guest'}`;
  return fetchWithCache(cacheKey, async () => {
    const { data } = await api.get('/plans/active', { params: { userId } });
    // const data = weeklyProgram;
    return data?.program?.days?.length ? data : { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) } };
  });
}

async function upsertDailyPR(userId, exerciseName, date, records) {
  const { data } = await api.post('/prs', { exerciseName, date, records }, { params: { userId } });
  // Clear relevant cache entries
  apiCache.clear();
  return data;
}

async function fetchOverview(userId, windowDays = 30) {
  const cacheKey = `overview-${userId ?? 'guest'}-${windowDays}`;
  return fetchWithCache(cacheKey, async () => {
    const { data } = await api.get('/prs/stats/overview', { params: { userId, windowDays } });
    return data;
  });
}

async function fetchExerciseStats(userId, name, windowDays = 90) {
  const cacheKey = `exerciseStats-${userId ?? 'guest'}-${name}-${windowDays}`;
  return fetchWithCache(cacheKey, async () => {
    const [seriesRes, topRes, histRes] = await Promise.all([api.get('/prs/stats/e1rm-series', { params: { userId, exerciseName: name, bucket: 'week', windowDays } }), api.get('/prs/stats/top-sets', { params: { userId, exerciseName: name, top: 5 } }), api.get('/prs/history', { params: { userId, exerciseName: name } })]);
    return {
      series: seriesRes.data || [],
      topSets: topRes.data || { byWeight: [], byReps: [], byE1rm: [] },
      attempts: histRes.data || [],
    };
  });
}

async function fetchLastDayByName(userId, day, onOrBefore) {
  const cacheKey = `lastDay-${userId ?? 'guest'}-${day}-${onOrBefore}`;
  return fetchWithCache(cacheKey, async () => {
    const { data } = await api.get('/prs/last-day/by-name', {
      params: { userId, day, onOrBefore },
    });

    const recordsByExercise = Object.fromEntries((data?.exercises || []).map(e => [e.exerciseName, e.records || []]));

    return {
      date: data?.date || null,
      day: data?.day || null,
      recordsByExercise,
    };
  });
}

/* =================== SKELETON COMPONENTS =================== */
const SkeletonLoader = () => (
  <div className='space-y-5 sm:space-y-6 animate-pulse'>
    {/* Header Skeleton */}
    <div className='rounded-lg md:rounded-lg overflow-hidden border border-indigo-200'>
      <div className='relative p-4 md:p-8 bg-gradient text-white'>
        <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
        <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
          <div className='flex-1 max-lg:hidden'>
            <div className='h-8 bg-white/20 rounded w-48'></div>
            <div className='h-4 bg-white/20 rounded w-64 mt-2'></div>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-[37px] w-[37px] bg-white/20 rounded-lg'></div>
            <div className='h-[37px] w-[37px] bg-white/20 rounded-lg'></div>
            <div className='max-md:hidden flex gap-2'>
              <div className='h-[37px] w-24 bg-white/20 rounded-lg'></div>
              <div className='h-[37px] w-24 bg-white/20 rounded-lg'></div>
            </div>
          </div>
        </div>
      </div>
      <div className='px-4 md:px-6 py-3 bg-white'>
        <div className='flex gap-2'>
          {[1, 2, 3].map(i => (
            <div key={i} className='h-8 bg-slate-200 rounded-lg w-20'></div>
          ))}
        </div>
      </div>
    </div>

    {/* Main Content Skeleton */}
    <div className='grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6'>
      {/* Left Panel Skeleton */}
      <div className='space-y-4'>
        <div className='rounded-lg border border-slate-200 bg-white p-4'>
          <div className='h-64 bg-slate-200 rounded-lg mb-4'></div>
          <div className='space-y-3'>
            <div className='h-12 bg-slate-200 rounded-lg'></div>
            <div className='h-12 bg-slate-200 rounded-lg'></div>
            <div className='h-12 bg-slate-200 rounded-lg'></div>
          </div>
        </div>
      </div>

      {/* Right Panel Skeleton */}
      <div className='hidden lg:block space-y-3'>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className='h-16 bg-slate-200 rounded-lg'></div>
        ))}
      </div>
    </div>
  </div>
);

export default function MyWorkoutsPage() {
  // core UI state
  const user = useUser();
  const USER_ID = user?.id;
  const [tab, setTab] = useState('workout');
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [workout, setWorkout] = useState(null);
  const [currentExId, setCurrentExId] = useState(undefined);
  const [hidden, setHidden] = useState(false);

  // stats
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState({});
  const [overview, setOverview] = useState(null);
  const [exercisePick, setExercisePick] = useState('Bench Press');
  const [series, setSeries] = useState([]);
  const [topSets, setTopSets] = useState({ byWeight: [], byReps: [], byE1rm: [] });
  const [attempts, setAttempts] = useState([]);

  // audio + settings
  const audioRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSound, setAlertSound] = useState(DEFAULT_SOUNDS[2]);
  const [alerting, setAlerting] = useState(false);

  // misc
  const [audioOpen, setAudioOpen] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastSavedRef = useRef(new Map());
  const [isPending, startTransition] = useTransition();

  // Preload images and videos for better UX
  const preloadMedia = useCallback(exercises => {
    exercises.forEach(exercise => {
      if (exercise.img) {
        const img = new Image();
        img.src = exercise.img;
      }
    });
  }, []);

  // one throttled writer shared across handlers
  const persistBufferThrottled = useMemo(() => throttle(w => persistLocalBuffer(w), 800), []);

  /* ---------- optimized initial load ---------- */
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load critical data first
        const p = await fetchActivePlan(USER_ID);
        if (!mounted) return;
        setPlan(p);

        const rawServerDays = Array.isArray(p?.program?.days) ? p.program.days : [];
        const serverDays = rawServerDays.map(d => ({
          ...d,
          _key: String(d.dayOfWeek ?? '').toLowerCase(), // normalize weekday key
        }));
        const byKey = Object.fromEntries(serverDays.map(d => [d._key, d]));
        const allKeys = serverDays.map(d => d._key);
        const initialDayId = pickTodayId(allKeys.length ? allKeys : Object.keys(weeklyProgram));

        setSelectedDay(initialDayId);

        const dayProgram = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: 'Workout', exercises: [] };

        const session = createSessionFromDay(dayProgram);
        setWorkout(session);
        setCurrentExId(session.exercises[0]?.id);

        // const serverDays = p?.program?.days || [];
        // const byId = Object.fromEntries(serverDays.map(d => [d.id, d]));
        // const allIds = serverDays.map(d => d.id);
        // const initialDayId = pickTodayId(allIds.length ? allIds : Object.keys(weeklyProgram));

        // setSelectedDay(initialDayId);

        // const dayProgram = byId[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: 'Workout', exercises: [] };

        // const session = createSessionFromDay(dayProgram);
        // setWorkout(session);
        // setCurrentExId(session.exercises[0]?.id);

        // Preload media for better UX
        if (session.exercises?.length) {
          preloadMedia(session.exercises);
        }

        // Initialize lastSaved mirror
        const mirror = lastSavedRef.current;
        mirror.clear();
        for (let i = 0; i < session.sets.length; i++) {
          const s = session.sets[i];
          mirror.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
        }

        // Load settings
        try {
          const s = JSON.parse(localStorage.getItem(LOCAL_KEY_SETTINGS) || 'null');
          if (s?.alertSound) setAlertSound(s.alertSound);
        } catch {}

        // Load server records in background
        const dayISO = isoForThisWeeksDay(initialDayId);
        fetchLastDayByName(USER_ID, initialDayId, dayISO)
          .then(({ recordsByExercise }) => {
            if (mounted) {
              applyServerRecords(session, recordsByExercise, setWorkout, lastSavedRef);
            }
          })
          .catch(console.error);

        // Load overview data in background
        fetchOverview(USER_ID, 30)
          .then(data => {
            if (mounted) {
              setOverview(data || null);
              setHistory(Array.isArray(data?.history) ? data.history : []);
            }
          })
          .catch(console.error);
      } catch (error) {
        console.error('Initial load error:', error);
      } finally {
        // Small delay to show skeleton and prevent flash
        timeoutId = setTimeout(() => {
          if (mounted) setLoading(false);
        }, 300);
      }
    };

    loadData();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      // Cleanup cache on unmount to prevent memory leaks
      apiCache.clear();
    };
  }, [preloadMedia, USER_ID]);

  // Keep audio element in sync
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.src = alertSound;
      el.load(); // Preload audio
    }
  }, [alertSound]);

  /* ---------- derived data with memoization ---------- */
  const hasExercises = !!workout?.exercises?.length;
  const currentExercise = useMemo(() => workout?.exercises.find(e => e.id === currentExId), [workout?.exercises, currentExId]);

  const currentSets = useMemo(() => (workout?.sets || []).filter(s => s.exId === currentExId), [workout?.sets, currentExId]);

const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const dayTabs = useMemo(() => {
  const raw = plan?.program?.days || [];
  const byKey = Object.fromEntries(
    raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d])
  );

  return weekOrder
    .filter(d => byKey[d] || weeklyProgram[d])
    .map(d => ({
      key: d,
      label: d,
      name: byKey[d]?.name || weeklyProgram[d]?.name || d,
    }));
}, [plan]);


  const attemptsColumns = useMemo(
    () => [
      { header: 'Date', accessor: 'date' },
      { header: 'Weight', accessor: 'weight', cell: r => <span className='tabular-nums'>{Number(r?.weight) || 0}</span> },
      { header: 'Reps', accessor: 'reps', cell: r => <span className='tabular-nums'>{Number(r?.reps) || 0}</span> },
      { header: 'e1RM', accessor: 'e1rm', cell: r => <span className='tabular-nums'>{Math.round(Number(r?.e1rm) || 0)}</span> },
      { header: 'Set', accessor: 'setIndex', cell: r => <span className='tabular-nums'>{r?.setIndex != null ? String(r.setIndex) : '—'}</span> },
      { header: 'PR', accessor: 'isPr', cell: r => (r?.isPr ? <span className='text-amber-600 font-semibold'>PR</span> : '') },
    ],
    [],
  );

  /* ---------- optimized handlers ---------- */
  const changeDay = useCallback(
  dayId => {
    startTransition(() => setSelectedDay(dayId));

    const raw = plan?.program?.days || [];
    const byKey = Object.fromEntries(
      raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d])
    );

    const dayProgram =
      byKey[dayId] ||
      weeklyProgram[dayId] ||
      { id: dayId, name: 'Workout', exercises: [] };

    const session = createSessionFromDay(dayProgram);
    setWorkout(session);
    setCurrentExId(session.exercises[0]?.id);

    if (session.exercises?.length) preloadMedia(session.exercises);

    setActiveMediaRef.current('image');

    const mirror = lastSavedRef.current;
    mirror.clear();
    for (let i = 0; i < session.sets.length; i++) {
      const s = session.sets[i];
      mirror.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
    }

    const dayISO = isoForThisWeeksDay(dayId);
    fetchLastDayByName(USER_ID, dayId, dayISO)
      .then(({ recordsByExercise }) =>
        applyServerRecords(session, recordsByExercise, setWorkout, lastSavedRef)
      )
      .catch(console.error);
  },
  [plan, preloadMedia, USER_ID],
);


  const addSetForCurrentExercise = useCallback(() => {
    setWorkout(w => {
      const exSets = w.sets.filter(s => s.exId === currentExId);
      const nextIndex = exSets.length + 1;
      const base = exSets[exSets.length - 1] || { targetReps: '10', restTime: 90 };
      const ex = w.exercises.find(e => e.id === currentExId);
      const newSet = {
        id: `${currentExId}-set${nextIndex}`,
        exId: currentExId,
        exName: ex?.name || 'Exercise',
        set: nextIndex,
        targetReps: ex?.targetReps ?? base.targetReps,
        weight: 0,
        reps: 0,
        effort: null,
        done: false,
        pr: false,
        restTime: Number.isFinite(ex?.rest ?? ex?.restSeconds) ? ex?.rest ?? ex?.restSeconds : base.restTime,
      };
      const next = { ...w, sets: [...w.sets, newSet] };
      markUnsaved(next, setUnsaved);
      // mirror
      lastSavedRef.current.set(newSet.id, { weight: 0, reps: 0, done: false });
      // write buffer throttled
      persistBufferThrottled(next);
      return next;
    });
  }, [currentExId, persistBufferThrottled]);

  const removeSetFromCurrentExercise = useCallback(() => {
    setWorkout(w => {
      const exSets = w.sets.filter(s => s.exId === currentExId);
      if (exSets.length <= 1) return w;
      const lastSetId = exSets[exSets.length - 1].id;
      const next = { ...w, sets: w.sets.filter(s => s.id !== lastSetId) };
      markUnsaved(next, setUnsaved);
      lastSavedRef.current.delete(lastSetId);
      persistBufferThrottled(next);
      return next;
    });
  }, [currentExId, persistBufferThrottled]);

  const toggleDone = useCallback(
    setId => {
      setWorkout(w => {
        const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, done: !s.done } : s)) };
        const s = next.sets.find(x => x.id === setId);
        if (s && !s.pr && s.done && s.weight > 0 && s.reps > 0) {
          const e1rmVal = epley(s.weight, s.reps);
          setPRs(prev => {
            const prevPR = prev[s.exName];
            const isPR = !prevPR || e1rmVal > prevPR.e1rm;
            if (isPR) {
              next.sets = next.sets.map(x => (x.id === s.id ? { ...x, pr: true } : x));
              return { ...prev, [s.exName]: { e1rm: e1rmVal, weight: s.weight, reps: s.reps, date: todayISO() } };
            }
            return prev;
          });
        }
        markUnsaved(next, setUnsaved);
        persistBufferThrottled(next);
        return next;
      });
    },
    [persistBufferThrottled],
  );

  const buildDailyPRPayload = useCallback(
    exName => {
      const records = (workout?.sets || [])
        .filter(s => s.exName === exName)
        .map(s => ({
          id: s.serverId,
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          done: !!s.done,
          setNumber: Number(s.set) || 1,
        }));
      return { exerciseName: exName, date: todayISO(), records };
    },
    [workout?.sets],
  );

  const [loadingSaveDays, setLoadingSaveDays] = useState(false);
  const [loadingSaveOnly, setLoadingSaveOnly] = useState(false);

  const saveDayToServer = useCallback(async () => {
    const ex = workout?.exercises.find(e => e.id === currentExId);
    if (!ex) return;
    const payload = buildDailyPRPayload(ex.name);
    try {
      setLoadingSaveDays(true);
      setLoadingSaveOnly(true);

      const data = await upsertDailyPR(USER_ID, payload.exerciseName, payload.date, payload.records);

      const serverRecords = data?.records || [];
      setWorkout(w => ({
        ...w,
        sets: w.sets.map(s =>
          s.exId === currentExId
            ? (() => {
                const match = serverRecords.find(r => Number(r.setNumber) === Number(s.set));
                return match ? { ...s, serverId: match.id } : s;
              })()
            : s,
        ),
      }));

      // Parallel loading for better performance
      await Promise.all([loadOverview(30), loadExerciseStats(ex.name, 90)]);

      flushLocalBufferForExercise(ex.name);
      setUnsaved(false);
    } catch (err) {
      console.error('Save day failed', err);
      persistLocalBuffer(workout);
    } finally {
      setLoadingSaveOnly(false);
      setLoadingSaveDays(false);
    }
  }, [workout?.exercises, currentExId, buildDailyPRPayload, USER_ID]);

  const maybeSaveSetOnBlur = useCallback(
    setObj => {
      const prev = lastSavedRef.current.get(setObj.id) || { weight: 0, reps: 0, done: false };
      const changed = Number(prev.weight) !== Number(setObj.weight) || Number(prev.reps) !== Number(setObj.reps) || Boolean(prev.done) !== Boolean(setObj.done);
      if (changed) {
        setUnsaved(true);
        persistBufferThrottled({ ...workout });
      }
    },
    [workout, persistBufferThrottled],
  );

  const loadOverview = useCallback(
    async (windowDays = 30) => {
      const data = await fetchOverview(USER_ID, windowDays);
      setOverview(data || null);
      setHistory(Array.isArray(data?.history) ? data.history : []);
    },
    [USER_ID],
  );

  const loadExerciseStats = useCallback(
    async (name, windowDays = 90) => {
      const { series, topSets, attempts } = await fetchExerciseStats(USER_ID, name, windowDays);
      setSeries(series);
      setTopSets(topSets);
      setAttempts(attempts);
    },
    [USER_ID],
  );

  /* ---------- media state management ---------- */
  const [activeMedia, _setActiveMedia] = useState('image');
  const activeMediaRef = useRef('image');
  const setActiveMedia = useCallback(m => {
    activeMediaRef.current = m;
    _setActiveMedia(m);
  }, []);
  const setActiveMediaRef = useRef(setActiveMedia);
  useEffect(() => {
    setActiveMediaRef.current = setActiveMedia;
  }, [setActiveMedia]);

  // Show skeleton while loading
  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className='space-y-5 sm:space-y-6'>
      {/* alert sound audio */}
      <audio ref={audioRef} src={alertSound} preload='auto' />

      {/* HEADER */}
      <div className='rounded-lg md:rounded-lg overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            <PageHeader className='max-lg:!hidden' icon={Dumbbell} title='My Workouts' subtitle='Log sets and track PRs automatically.' />
            <div className='flex items-center gap-2'>
              <button
                onClick={() => {
                  !hidden && setAudioOpen(v => !v);
                  setHidden(false);
                }}
                className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
                aria-label='Listen'>
                <Headphones size={16} />
                <span className='max-md:hidden'>Listen</span>
              </button>
              <button onClick={() => setSettingsOpen(true)} className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition' aria-label='Settings'>
                <SettingsIcon size={16} />
                <span className='max-md:hidden'>Settings</span>
              </button>
              {/* Mobile tabs */}
              <button onClick={() => setTab('workout')} className={`md:hidden px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium hover:bg-white/20 active:scale-95 transition ${tab === 'workout' ? 'ring-1 ring-white/50' : ''}`} aria-label='Workout tab'>
                <Dumbbell size={16} />
              </button>
              <button onClick={() => setTab('history')} className={`md:hidden px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium hover:bg-white/20 active:scale-95 transition ${tab === 'history' ? 'ring-1 ring-white/50' : ''}`} aria-label='History tab'>
                <HistoryIcon size={16} />
              </button>
              {/* Desktop tabs */}
              <TabsPill
                className='max-md:hidden'
                id='my-workouts-tabs'
                tabs={[
                  { key: 'workout', label: 'Workout', icon: Dumbbell },
                  { key: 'history', label: 'History', icon: HistoryIcon },
                ]}
                active={tab}
                onChange={k => setTab(k)}
              />
            </div>

            <div className='flex items-center gap-2 lg:hidden'>
              <button onClick={() => setDrawerOpen(true)} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:opacity-80 '>
                <MenuIcon size={16} /> Exercises
              </button>
            </div>
          </div>
        </div>

        <div className='px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white'>
          {tab === 'workout' && (
            <div className='flex-1'>
              <TabsPill className='!rounded-lg' slice={3} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />
            </div>
          )}
        </div>
      </div>

      <AudioHubInline hidden={hidden} setHidden={setHidden} alerting={alerting} setAlerting={setAlerting} open={audioOpen} onClose={() => setAudioOpen(false)} />

      {/* WORKOUT */}
      {tab === 'workout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div className='space-y-5 sm:space-y-6'>
            <div className='rounded-lg md:border md:border-slate-200 bg-white md:p-2 sm:p-4'>
              {workout && (
                <div className='flex flex-col lg:flex-row gap-4'>
                  {/* LEFT */}
                  <div className='w-full lg:flex-1 min-w-0'>
                    <div className='rounded-lg border border-slate-200 bg-white overflow-hidden'>
                      {!hasExercises ? (
                        <div className='p-6'>
                          <div className='rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
                            <div className='mx-auto mb-3 w-12 h-12 rounded-full bg-white shadow grid place-items-center'>
                              <Dumbbell size={18} className='text-slate-500' />
                            </div>
                            <div className='text-base font-semibold text-slate-700'>Not found for this day</div>
                            <div className='text-sm text-slate-500 mt-1'>Pick another day from the tabs above.</div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Media area */}
                          <div className='w-full relative rounded-[10px_10px_0_0] overflow-hidden md:!h-[275px]' style={{ height: 200 }}>
                            {currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? <InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} /> : <img key={currentExercise?.id + '-image'} src={currentExercise?.img} alt={currentExercise?.name} className='w-full h-full object-contain bg-white' loading='lazy' />}
                            <div className='absolute bottom-2 right-2 flex items-center gap-2 bg-black/40 backdrop-blur px-2 py-1 rounded-lg'>
                              <button onClick={() => setActiveMedia('image')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'image' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show image'>
                                <ImageIcon size={14} />
                              </button>
                              <button onClick={() => setActiveMedia('video')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'video' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show video' disabled={!currentExercise?.video}>
                                <VideoIcon size={14} />
                              </button>
                              {!!currentExercise?.video2 && (
                                <button onClick={() => setActiveMedia('video2')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'video2' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show video 2'>
                                  <VideoIcon size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Rest timer */}
                          <RestTimerCard alerting={alerting} setAlerting={setAlerting} initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise?.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise?.rest : 90} audioEl={audioRef} className='mt-1' />

                          {/* Sets table */}
                          <div className='max-md:mb-2 mx-2 md:mb-4 border border-slate-200 rounded-lg overflow-hidden'>
                            <div className='overflow-x-auto'>
                              <table className='w-full text-sm'>
                                <thead className='bg-slate-50/80 backdrop-blur sticky top-0 z-10'>
                                  <tr className='text-left text-slate-500'>
                                    <th className='py-2.5 px-3 font-semibold'>Set</th>
                                    <th className='py-2.5 px-3 font-semibold'>Weight</th>
                                    <th className='py-2.5 px-3 font-semibold'>Reps</th>
                                    <th className='py-2.5 px-3 font-semibold'>Done</th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y divide-slate-100'>
                                  {currentSets.map((s, i) => (
                                    <tr key={s.id} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                                      <td className='py-2.5 px-3'>
                                        <span className='inline-flex h-6 min-w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-medium'>{s.set}</span>
                                      </td>
                                      <td className='py-2.5 px-3'>
                                        <input
                                          type='number'
                                          value={s.weight ?? 0}
                                          onChange={e => {
                                            const val = Number(e.target.value);
                                            setWorkout(w => ({ ...w, sets: w.sets.map(x => (x.id === s.id ? { ...x, weight: Number.isFinite(val) ? val : 0 } : x)) }));
                                          }}
                                          onBlur={() => maybeSaveSetOnBlur({ ...s, weight: Number(s.weight) })}
                                          className='h-9 w-[80px] !text-[16px] rounded-lg border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition'
                                          placeholder='0'
                                          inputMode='numeric'
                                        />
                                      </td>
                                      <td className='py-2.5 px-3'>
                                        <input
                                          type='number'
                                          value={s.reps ?? 0}
                                          onChange={e => {
                                            const val = Number(e.target.value);
                                            setWorkout(w => ({ ...w, sets: w.sets.map(x => (x.id === s.id ? { ...x, reps: Number.isFinite(val) ? val : 0 } : x)) }));
                                          }}
                                          onBlur={() => maybeSaveSetOnBlur({ ...s, reps: Number(s.reps) })}
                                          className='h-9 w-[80px] !text-[16px] rounded-lg border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition'
                                          placeholder='0'
                                          inputMode='numeric'
                                        />
                                      </td>
                                      <td className='py-2.5 px-3'>
                                        <CheckBox
                                          initialChecked={s.done}
                                          onChange={() => {
                                            toggleDone(s.id);
                                            setUnsaved(true);
                                            persistBufferThrottled({ ...workout });
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className='flex items-center justify-between px-3 py-2 text-[11px] text-slate-500 bg-slate-50/60'>
                              <div className='flex items-center gap-2'>
                                <button onClick={removeSetFromCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50' disabled={currentSets.length <= 1}>
                                  <Minus size={14} />
                                </button>
                                <button onClick={addSetForCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
                                  <Plus size={14} />
                                </button>
                              </div>
                              <Button loading={loadingSaveOnly} icon={<SaveIcon size={14} />} name={'Save'} onClick={saveDayToServer} className='!px-2 !text-sm !py-1 !w-fit' />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className='hidden lg:block w-80'>
                    <ExerciseList
                      workout={workout}
                      currentExId={currentExId}
                      onPick={ex => {
                        setCurrentExId(ex.id);
                        setExercisePick(ex.name);
                        setActiveMedia('image');
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-4'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3'>
            <KPI title='Exercises Tracked' value={fmtVal(overview?.totals?.exercisesTracked)} icon={Dumbbell} />
            <KPI title='Total Attempts' value={fmtVal(overview?.totals?.attempts)} icon={TrendingUp} />
            <KPI title='All-time PRs' value={fmtVal(overview?.totals?.allTimePrs)} icon={Trophy} />
            <KPI title='Current Streak (days)' value={fmtVal(overview?.totals?.currentStreakDays)} icon={Flame} />
          </div>

          <div className='rounded-lg border border-slate-200 bg-white p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='font-semibold'>All-time Bests</div>
              <div className='text-xs text-slate-500'>From PRs (computed e1RM if needed)</div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
              {(overview?.bests || []).map((b, i) => {
                const repSafe = Number(b?.reps) || 0;
                const wSafe = Number(b?.weight) || 0;
                const bestE1rm = Math.round(Number(b?.e1rm) || wSafe * (1 + repSafe / 30) || 0);
                return (
                  <div key={i} className='p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between'>
                    <div className='text-sm font-medium truncate'>{String(b?.name ?? '—')}</div>
                    <div className='text-sm tabular-nums font-semibold'>{bestE1rm} e1RM</div>
                  </div>
                );
              })}
              {!overview?.bests?.length && <div className='text-sm text-slate-500'>No bests yet.</div>}
            </div>
          </div>

          <div className='rounded-lg border border-slate-200 bg-white p-4'>
            <div className='flex items-center justify-between gap-2 mb-3'>
              <div className='font-semibold'>Exercise Drilldown</div>
              <select className='h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm' value={exercisePick} onChange={e => setExercisePick(e.target.value)}>
                {Array.from(new Set([exercisePick, 'Bench Press', 'Deadlift', 'Squat', 'Lat Pulldown', 'Leg Press'])).map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className='mb-4'>
              <div className='text-xs text-slate-500 mb-1'>e1RM (weekly max) – last 90 days</div>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'>
                {series.map((p, i) => (
                  <div key={i} className='p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between'>
                    <span className='truncate'>{String(p?.bucket ?? '').slice(0, 10) || '—'}</span>
                    <span className='tabular-nums font-semibold'>{Math.round(Number(p?.e1rm) || 0)}</span>
                  </div>
                ))}
                {!series.length && <div className='text-sm text-slate-500'>No data.</div>}
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              <TopList title='Top by Weight' items={topSets.byWeight || []} fmt={x => `${Number(x?.weight) || 0}×${Number(x?.reps) || 0}`} />
              <TopList title='Top by Reps' items={topSets.byReps || []} fmt={x => `${Number(x?.reps) || 0} @ ${Number(x?.weight) || 0}`} />
              <TopList title='Top by e1RM' items={topSets.byE1rm || []} fmt={x => `${Math.round(Number(x?.e1rm) || 0)} e1RM`} />
            </div>

            <div className='mt-4'>
              <div className='font-medium mb-2'>Attempts</div>
              <div className='overflow-x-auto'>
                <DataTable columns={attemptsColumns} data={Array.isArray(attempts) ? attempts : []} loading={!!loading} pagination itemsPerPage={8} />
                {!loading && (!attempts || !attempts.length) && <EmptyState title='No attempts yet' subtitle='Log your first workout to see attempts here.' icon={<HistoryIcon />} />}
              </div>
            </div>
          </div>

          <div className='rounded-lg border border-slate-200 bg-white p-4'>
            <div className='flex items-center justify-between mb-4'>
              <div className='font-semibold'>Session History</div>
              <div className='text-sm text-slate-500'>{Number(history?.length || 0)} workouts completed</div>
            </div>
            <div className='mt-3'>
              <DataTable
                columns={[
                  { header: 'Date', accessor: 'date' },
                  { header: 'Workout', accessor: 'name' },
                  { header: 'Volume', accessor: 'volume', cell: r => <span className='tabular-nums'>{Number(r?.volume || 0).toLocaleString()} kg·reps</span> },
                  { header: 'Duration', accessor: 'duration', cell: r => <span>{fmtVal(r?.duration)}</span> },
                  {
                    header: 'Sets',
                    accessor: 'setsDone',
                    cell: r => (
                      <span className='tabular-nums'>
                        {Number(r?.setsDone || 0)}/{Number(r?.setsTotal || 0)}
                      </span>
                    ),
                  },
                ]}
                data={Array.isArray(history) ? history : []}
                loading={!!loading}
                pagination
                itemsPerPage={8}
              />
              {!loading && (!history || !history.length) && <EmptyState title='No sessions yet' subtitle='Log your first workout to see history here.' icon={<HistoryIcon />} />}
            </div>
          </div>
        </motion.div>
      )}

      {/* Unsaved hint */}
      <AnimatePresence>
        {unsaved && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className='fixed bottom-4 w-[90%] max-w-fit text-nowrap truncate left-1/2 -translate-x-1/2 z-40 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs flex justify-center text-center px-3 py-1.5 shadow'>
            Changes are stored locally until you press Save.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[75] bg-black/30' onClick={() => setDrawerOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }} className='fixed right-0 top-0 h-full w-[84%] max-w-sm z-[80] bg-white shadow-2xl border-l border-slate-200' onClick={e => e.stopPropagation()}>
              <div className='p-3 flex items-center justify-between border-b border-slate-100'>
                <div className='font-semibold flex items-center gap-2'>
                  <Dumbbell size={18} /> Exercises
                </div>
                <button onClick={() => setDrawerOpen(false)} className='p-2 rounded-lg hover:bg-slate-100'>
                  <X size={16} />
                </button>
              </div>
              <div className='p-3'>
                <ExerciseList
                  workout={workout}
                  currentExId={currentExId}
                  onPick={ex => {
                    setCurrentExId(ex.id);
                    setExercisePick(ex.name);
                    setActiveMedia('image');
                    setDrawerOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings */}
      <SettingsPopup
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentSound={alertSound}
        onChange={s => {
          setAlertSound(s);
          try {
            localStorage.setItem(LOCAL_KEY_SETTINGS, JSON.stringify({ alertSound: s }));
          } catch {}
        }}
      />
    </div>
  );
}
