'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, X, Minus, Plus, Video as VideoIcon, Save as SaveIcon, ImageIcon, Headphones, Settings as SettingsIcon, Menu as MenuIcon, Upload } from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api, { baseImg } from '@/utils/axios';
import weeklyProgram from './exercises';
import { createSessionFromDay, applyServerRecords } from '@/components/pages/workouts/helpers';
import { RestTimerCard } from '@/components/pages/workouts/RestTimerCard';
import { SettingsPopup } from '@/components/pages/workouts/SettingsPopup';
import { AudioHubInline } from '@/components/pages/workouts/AudioHub';
import { ExerciseList } from '@/components/pages/workouts/ExerciseList';
import { InlineVideo } from '@/components/pages/workouts/InlineVideo';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import Img from '@/components/atoms/Img';
 
/* =========================
   Constants / tiny helpers
========================= */
export const DEFAULT_SOUNDS = ['/sounds/1.mp3', '/sounds/2.mp3', '/sounds/alert1.mp3', '/sounds/alert2.mp3', '/sounds/alert3.mp3', '/sounds/alert4.mp3', '/sounds/alert5.mp3', '/sounds/alert6.mp3', '/sounds/alert7.mp3', '/sounds/alert8.mp3'];

const LOCAL_KEY_SETTINGS = 'mw.settings.v1';
const LOCAL_KEY_SELECTED_DAY = 'mw.selected.day';

const jsDayToId = d => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';
const todayISO = () => new Date().toISOString().slice(0, 10);

function dateOnlyISO(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DAY_INDEX = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
const WEEK_START = 6; // Saturday

function isoForThisWeeksDay(dayName, refDate = new Date(), weekStart = WEEK_START) {
  const targetIdx = DAY_INDEX[dayName.toUpperCase()];
  const refIdx = refDate.getDay();
  const deltaStart = (refIdx - weekStart + 7) % 7;
  const start = new Date(refDate);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - deltaStart);
  const targetOffset = (targetIdx - weekStart + 7) % 7;
  const target = new Date(start);
  target.setDate(start.getDate() + targetOffset);
  return dateOnlyISO(target);
}

function pickTodayId(availableIds) {
  const todayId = jsDayToId(new Date().getDay());
  if (availableIds.includes(todayId)) return todayId;
  const pref = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return pref.find(x => availableIds.includes(x)) || availableIds[0] || 'monday';
}

function ButtonMini({ name, icon, onClick, loading, disabled, className = '' }) {
  return (
    <button type='button' onClick={onClick} disabled={disabled || loading} className={['inline-flex items-center gap-2 rounded-lg px-3 h-9 text-sm font-medium shadow-sm', 'border border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700', 'active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed', className].join(' ')}>
      {loading ? (
        <span className='relative flex items-center'>
          <span className='mr-1 inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin' />
          {name}
        </span>
      ) : (
        <>
          {icon ? icon : null}
          {name}
        </>
      )}
    </button>
  );
}

function UploadVideoModal({ open, onClose, userId, exercise, onUploaded }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const onPick = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type?.startsWith('video/')) return setError('Please select a valid video file.');
    if (f.size > 100 * 1024 * 1024) return setError('Max size is 100MB.');
    setError('');
    setFile(f);
  };

  const doUpload = async () => {
    if (!file || !exercise) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('exerciseId', exercise.id);
      formData.append('userId', userId);
      const { data } = await api.post('/exercises/upload-video', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded?.(data);
      onClose();
    } catch (e) {
      setError('Upload failed. Try again.');
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[95] bg-black/40 backdrop-blur-[1px]' onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }} className='fixed left-1/2 top-[15%] -translate-x-1/2 z-[100] w-[92%] max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200'>
        <div className='p-4 border-b border-slate-100 flex items-center justify-between'>
          <div className='font-semibold'>
            Upload video for: <span className='text-indigo-700'>{exercise?.name}</span>
          </div>
          <button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100'>
            <X size={16} />
          </button>
        </div>
        <div className='p-4 space-y-3'>
          <div className='rounded-lg border border-slate-200 p-3 bg-slate-50'>
            <input id='video-file' type='file' accept='video/*' onChange={onPick} className='hidden' />
            <label htmlFor='video-file' className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer'>
              <Upload size={16} /> Choose video
            </label>
            {file && <div className='mt-2 text-sm text-slate-700 truncate'>Selected: {file.name}</div>}
            {!!error && <div className='mt-2 text-sm text-rose-600'>{error}</div>}
          </div>
          <div className='flex items-center justify-end gap-2 pt-2'>
            <button onClick={onClose} className='h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'>
              Cancel
            </button>
            <ButtonMini name='Upload' icon={<Upload size={16} />} onClick={doUpload} loading={sending} disabled={!file} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const SkeletonLoader = () => (
  <div className='space-y-5 sm:space-y-6 animate-pulse'>
    <div className='rounded-lg overflow-hidden border border-indigo-200'>
      <div className='relative p-6 bg-gradient text-white'>
        <div className='h-6 bg-white/20 rounded w-56'></div>
        <div className='mt-2 h-4 bg-white/20 rounded w-64'></div>
      </div>
      <div className='px-4 md:px-6 py-3 bg-white'>
        <div className='flex gap-2'>
          {[1, 2, 3].map(i => (
            <div key={i} className='h-8 bg-slate-200 rounded-lg w-20'></div>
          ))}
        </div>
      </div>
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6'>
      <div className='rounded-lg border border-slate-200 bg-white p-4'>
        <div className='h-64 bg-slate-200 rounded-lg'></div>
      </div>
      <div className='hidden lg:block space-y-3'>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className='h-16 bg-slate-200 rounded-lg' />
        ))}
      </div>
    </div>
  </div>
);

async function fetchActivePlan(userId) {
  // No cache here so dashboard changes reflect immediately
  const { data } = await api.get('/plans/active', { params: { userId } });
  if (data?.program?.days?.length) return data;
  // fallback to local weeklyProgram if server empty
  return { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) } };
}

async function fetchLastDayByName(userId, day, onOrBefore) {
  try {
    const plan = await fetchActivePlan(userId);
    const dayProgram = plan?.program?.days?.find(d => String(d.dayOfWeek ?? '').toLowerCase() === day.toLowerCase()) || weeklyProgram[day] || { exercises: [] };

    const exerciseNames = (dayProgram.exercises || []).map(ex => ex.name);
    if (exerciseNames.length === 0) {
      return { date: null, day, recordsByExercise: {} };
    }

    const { data } = await api.post('/prs/last-workout-sets', { userId, exercises: exerciseNames });
    const recordsByExercise = {};
    data.exercises.forEach(exercise => {
      if (exercise.records.length > 0) {
        recordsByExercise[exercise.exerciseName] = exercise.records;
      }
    });

    return {
      date: data.exercises.find(ex => ex.date)?.date || null,
      day,
      recordsByExercise,
    };
  } catch (error) {
    console.error('Error fetching last workout sets:', error);
    return { date: null, day, recordsByExercise: {} };
  }
}

async function upsertDailyPR(userId, exerciseName, date, records) {
  const { data } = await api.post('/prs', { exerciseName, date, records }, { params: { userId } });
  return data;
}

export default function MyWorkoutsPage() {
  const t = useTranslations('MyWorkouts');
  const user = useUser();
  const USER_ID = user?.id;

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);

  // ONLY persist the selected day
  const [selectedDay, setSelectedDay] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY_SELECTED_DAY) || 'monday' : 'monday'));

  const [workout, setWorkout] = useState(null);
  const [currentExId, setCurrentExId] = useState(undefined);
  const [hidden, setHidden] = useState(false);

  // audio + settings
  const audioRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSound, setAlertSound] = useState(DEFAULT_SOUNDS[2]);
  const [alerting, setAlerting] = useState(false);

  // misc
  const [audioOpen, setAudioOpen] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dayLoading, setDayLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // upload modal
  const [uploadOpen, setUploadOpen] = useState(false);

  const lastSavedRef = useRef(new Map());

  useEffect(() => {
    if (selectedDay) localStorage.setItem(LOCAL_KEY_SELECTED_DAY, selectedDay);
  }, [selectedDay]);

  const preloadMedia = useCallback(exercises => {
    exercises?.forEach(exercise => {
      if (exercise?.img) {
        const img = new Image();
        img.src = exercise.img;
      }
    });
  }, []);

  // Initial load (no use of mw.workout.buffer at all)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        // 1) Fetch plan fresh (reflect dashboard changes)
        const p = await fetchActivePlan(USER_ID);
        if (!mounted) return;
        setPlan(p);

        const rawServerDays = Array.isArray(p?.program?.days) ? p.program.days : [];
        const serverDays = rawServerDays.map(d => ({ ...d, _key: String(d.dayOfWeek ?? '').toLowerCase() }));
        const byKey = Object.fromEntries(serverDays.map(d => [d._key, d]));
        const allKeys = serverDays.map(d => d._key);

        // 2) Determine initial day
        const savedDay = (typeof window !== 'undefined' && localStorage.getItem(LOCAL_KEY_SELECTED_DAY)) || null;
        const initialDayId = savedDay || pickTodayId(allKeys.length ? allKeys : Object.keys(weeklyProgram));
        setSelectedDay(initialDayId);

        // 3) Create session from server day
        const dayProgram = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: 'Workout', exercises: [] };
        const session = createSessionFromDay(dayProgram);
        setWorkout(session);
        setCurrentExId(session.exercises[0]?.id);

        // 4) Preload media
        if (session?.exercises?.length) preloadMedia(session.exercises);

        // 5) Mirror last saved values (for unsaved detection only)
        lastSavedRef.current.clear();
        session?.sets?.forEach(s => {
          lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
        });

        // 6) Load settings
        try {
          const s = JSON.parse(localStorage.getItem(LOCAL_KEY_SETTINGS) || 'null');
          if (s?.alertSound) setAlertSound(s.alertSound);
        } catch {}

        // 7) Apply last server records (no local buffer usage)
        const dayISO = isoForThisWeeksDay(initialDayId);
        const { recordsByExercise } = await fetchLastDayByName(USER_ID, initialDayId, dayISO);
        if (mounted && session) {
          applyServerRecords(session, recordsByExercise, next => setWorkout(next), lastSavedRef);
        }
      } catch (e) {
        console.error('Initial load error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [USER_ID, preloadMedia]);

  // Change day
  const changeDay = useCallback(
    async dayId => {
      setDayLoading(true);
      startTransition(() => setSelectedDay(dayId));
      try {
        const raw = plan?.program?.days || [];
        const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
        const dayProgram = byKey[dayId] || weeklyProgram[dayId] || { id: dayId, name: 'Workout', exercises: [] };
        const session = createSessionFromDay(dayProgram);
        setWorkout(session);
        setCurrentExId(session.exercises[0]?.id);
        if (session.exercises?.length) preloadMedia(session.exercises);

        // reset mirror
        lastSavedRef.current.clear();
        session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));

        // pull last server records for this day
        const dayISO = isoForThisWeeksDay(dayId);
        const { recordsByExercise } = await fetchLastDayByName(USER_ID, dayId, dayISO);
        applyServerRecords(session, recordsByExercise, next => setWorkout(next), lastSavedRef);

        // persist only the chosen day
        localStorage.setItem(LOCAL_KEY_SELECTED_DAY, dayId);
        setUnsaved(false);
      } catch (e) {
        console.error(e);
      } finally {
        setDayLoading(false);
      }
    },
    [plan, preloadMedia, USER_ID],
  );

  const addSetForCurrentExercise = useCallback(() => {
    setWorkout(w => {
      if (!w) return w;
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
      lastSavedRef.current.set(newSet.id, { weight: 0, reps: 0, done: false });
      setUnsaved(true);
      return next;
    });
  }, [currentExId]);

  const removeSetFromCurrentExercise = useCallback(() => {
    setWorkout(w => {
      if (!w) return w;
      const exSets = w.sets.filter(s => s.exId === currentExId);
      if (exSets.length <= 1) return w;
      const lastSetId = exSets[exSets.length - 1].id;
      const next = { ...w, sets: w.sets.filter(s => s.id !== lastSetId) };
      lastSavedRef.current.delete(lastSetId);
      setUnsaved(true);
      return next;
    });
  }, [currentExId]);

  const toggleDone = useCallback(setId => {
    setWorkout(w => {
      if (!w) return w;
      const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, done: !s.done } : s)) };
      setUnsaved(true);
      return next;
    });
  }, []);

  const bump = useCallback((setId, field, delta) => {
    setWorkout(w => {
      if (!w) return w;
      const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, [field]: Math.max(0, Number(s[field] || 0) + delta) } : s)) };
      // auto-check done if both > 0
      const u = next.sets.find(s => s.id === setId);
      if (u && Number(u.weight) > 0 && Number(u.reps) > 0) {
        next.sets = next.sets.map(s => (s.id === setId ? { ...s, done: true } : s));
      }
      setUnsaved(true);
      return next;
    });
  }, []);

  const setValue = useCallback((setId, field, value) => {
    setWorkout(w => {
      if (!w) return w;
      const val = Number(value);
      const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, [field]: Number.isFinite(val) ? val : 0 } : s)) };
      const u = next.sets.find(s => s.id === setId);
      if (u && Number(u.weight) > 0 && Number(u.reps) > 0) {
        next.sets = next.sets.map(s => (s.id === setId ? { ...s, done: true } : s));
      }
      setUnsaved(true);
      return next;
    });
  }, []);

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

  const [saving, setSaving] = useState(false);

  const saveDayToServer = useCallback(async () => {
    const ex = workout?.exercises.find(e => e.id === currentExId);
    if (!ex) return;
    const payload = buildDailyPRPayload(ex.name);
    try {
      setSaving(true);
      const data = await upsertDailyPR(USER_ID, payload.exerciseName, payload.date, payload.records);
      // sync server ids back
      setWorkout(w => {
        if (!w) return w;
        const mapped = w.sets.map(s => {
          if (s.exId !== currentExId) return s;
          const match = data?.records?.find(r => Number(r.setNumber) === Number(s.set));
          return match ? { ...s, serverId: match.id } : s;
        });
        return { ...w, sets: mapped };
      });
      setUnsaved(false);
    } catch (err) {
      console.error('Save failed', err);
      // keep unsaved true
    } finally {
      setSaving(false);
    }
  }, [workout?.exercises, currentExId, buildDailyPRPayload, USER_ID]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.src = alertSound;
      el.load();
    }
  }, [alertSound]);

  const hasExercises = !!workout?.exercises?.length;
  const currentExercise = useMemo(() => workout?.exercises.find(e => e.id === currentExId), [workout?.exercises, currentExId]);
  const currentSets = useMemo(() => (workout?.sets || []).filter(s => s.exId === currentExId), [workout?.sets, currentExId]);

  const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayTabs = useMemo(() => {
    const raw = plan?.program?.days || [];
    const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
    return weekOrder
      .filter(d => byKey[d] || weeklyProgram[d])
      .map(d => ({
        key: d,
        label: d,
        name: byKey[d]?.name || weeklyProgram[d]?.name || d,
      }));
  }, [plan]);

  const [activeMedia, setActiveMedia] = useState('image');

  // if (loading) return <SkeletonLoader />;

  const Actions = ({ className }) => (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => {
          !hidden && setAudioOpen(v => !v);
          setHidden(false);
        }}
        className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
        aria-label={t('listen')}>
        <Headphones size={16} />
        <span className='max-md:hidden'>{t('listen')}</span>
      </button>
      <button onClick={() => setSettingsOpen(true)} className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition' aria-label={t('settings')}>
        <SettingsIcon size={16} />
        <span className='max-md:hidden'>{t('settings')}</span>
      </button>
      <div className='lg:hidden'>
        <button onClick={() => setDrawerOpen(true)} className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/30 h-[37px] max-md:w-[37px] px-2 py-2 text-sm cursor-pointer bg-white/10 hover:bg-white/20'>
          <MenuIcon size={16} /> <span className='max-md:hidden'> {t('exercises')} </span>
        </button>
      </div>
    </div>
  );
 
  return (
    <div className='space-y-5 sm:space-y-6'>
      <audio ref={audioRef} src={alertSound} preload='auto' />

      <div className={'relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur '}>
        <div className='absolute inset-0'>
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
          <div className='absolute inset-0 opacity-15' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)', backgroundSize: '22px 22px', backgroundPosition: '-1px -1px' }} />
          <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
        </div>

        <div className='relative py-2 p-3 md:p-5 text-white'>
          <div className='flex  flex-row  items-center justify-between gap-3 '>
            <div>
              <h1 className='text-xl md:text-4xl font-semibold'>{t('title')}</h1>
              <p className='text-white/85 mt-1 max-md:hidden '>{t('subtitle')}</p>
            </div>

            <Actions className={' md:!hidden'} />
          </div>

          <div className=' mt-2 md:mt-4 flex items-center justify-between '>
            <TabsPill className='!rounded-lg' slice={3} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />

            <Actions className={'max-md:!hidden'} />
          </div>
        </div>
      </div>

      <AudioHubInline hidden={hidden} setHidden={setHidden} alerting={alerting} setAlerting={setAlerting} open={audioOpen} onClose={() => setAudioOpen(false)} />

      {/* WORKOUT ONLY */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className='flex flex-col lg:flex-row gap-4'>
          {/* LEFT main pane (enhanced) */}
          <div className='md:rounded-lg md:bg-white h-fit md:p-4 md:shadow-sm w-full  lg:flex-1 min-w-0'>
            <div className={`relative md:bg-white/80 backdrop-blur md:rounded-lg md:overflow-hidden ${!hasExercises ? '!border-transparent' : ''}`}>
              {!hasExercises ? (
                /* Empty state */
                <div className='p-10'>
                  <div className='rounded-2xl border border-dashed border-slate-300/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-10 text-center shadow-sm'>
                    <div className='mx-auto mb-4 w-14 h-14 rounded-full bg-white shadow grid place-items-center ring-1 ring-slate-200'>
                      <Dumbbell size={20} className='text-slate-500' />
                    </div>
                    <div className='text-lg font-semibold text-slate-800'>{t('noExercises')}</div>
                    <div className='text-sm text-slate-500 mt-1'>{t('pickAnotherDay')}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className='relative w-full rounded-lg overflow-hidden '>
                    <div className='aspect-video md:aspect-[16/9] '>{
										currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] 
										? <InlineVideo key={currentExercise.id + '-video'} src={ currentExercise[activeMedia]} /> 
										: <Img key={currentExercise?.id + '-image'} src={ currentExercise?.img} alt={currentExercise?.name} className='w-full h-full object-contain ' loading='lazy' />
										}</div>

                    {(() => {
                      const hasImg = !!currentExercise?.img;
                      const hasVideo1 = !!currentExercise?.video;
                      const hasVideo2 = !!currentExercise?.video2;

                      return (
                        <div className={`absolute  right-3 flex items-center gap-2 ${activeMedia === 'video' ? 'bottom-[70px] ' : 'bottom-3'} duration-500 `}>
                          <div className='inline-flex items-center gap-[4px] rounded-xl bg-slate-100/70 p-1 ring-1 ring-black/5 backdrop-blur-md'>
                            <button type='button' onClick={() => setUploadOpen(true)} className='inline-flex items-center gap-1  px-2 h-[35px] max-md:w-[35px] justify-center rounded-lg text-[11px] font-medium  bg-white/95 text-indigo-700 hover:bg-white shadow-sm ring-1 ring-indigo-200  transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40' aria-label='Upload video for coach' title='Upload video for coach'>
                              <Upload size={14} />
                              <span className='hidden sm:inline'>Upload</span>
                            </button>
                            {/* Image tab */}
                            <button type='button' aria-pressed={activeMedia === 'image'} disabled={!hasImg} onClick={() => setActiveMedia('image')} className={['relative inline-flex items-center gap-1.5 w-[35px] h-[35px] justify-center text-xs sm:text-sm rounded-lg outline-none transition', activeMedia === 'image' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900', !hasImg ? 'opacity-50 cursor-not-allowed' : '', 'focus-visible:ring-2 focus-visible:ring-indigo-400/40'].join(' ')} title='Show image'>
                              <ImageIcon size={14} />
                              {activeMedia === 'image' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
                            </button>

                            {/* Video tab */}
                            <button type='button' aria-pressed={activeMedia === 'video'} disabled={!hasVideo1} onClick={() => setActiveMedia('video')} className={['relative inline-flex items-center gap-1.5 w-[35px] h-[35px] justify-center text-xs sm:text-sm rounded-lg outline-none transition', activeMedia === 'video' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900', !hasVideo1 ? 'opacity-50 cursor-not-allowed' : '', 'focus-visible:ring-2 focus-visible:ring-indigo-400/40'].join(' ')} title='Show video'>
                              <VideoIcon size={14} />
                              {activeMedia === 'video' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
                            </button>

                            {/* Alt video tab (only if provided) */}
                            {hasVideo2 && (
                              <button type='button' aria-pressed={activeMedia === 'video2'} onClick={() => setActiveMedia('video2')} className={['relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg outline-none transition', activeMedia === 'video2' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900', 'focus-visible:ring-2 focus-visible:ring-indigo-400/40'].join(' ')} title='Show video 2'>
                                <VideoIcon size={14} />
                                <span className='hidden sm:inline'>Alt</span>
                                {activeMedia === 'video2' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Rest timer */}
                  <RestTimerCard alerting={alerting} setAlerting={setAlerting} initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise?.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise?.rest : 90} audioEl={audioRef} className='mt-2 ' />

                  {/* Sets table */}
                  <div className='max-md:mb-2 md:mb-5 mt-3 rounded-lg border border-slate-200 overflow-hidden bg-white'>
                    <div className='overflow-x-auto'>
                      <table className='w-full text-sm'>
                        <thead className=' rounded-lg overflow-hidden bg-slate-200 backdrop-blur sticky top-0 z-10'>
                          <tr className='text-left text-slate-600'>
                            <th className='py-2.5 px-3 font-semibold'>Set</th>
                            <th className='py-2.5 px-3 font-semibold'>Weight</th>
                            <th className='py-2.5 px-3 font-semibold'>Reps</th>
                            <th className='py-2.5 px-3 font-semibold'>Done</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-100'>
                          {currentSets.map((s, i) => (
                            <tr key={s.id} className={`transition-colors ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-indigo-50/40`}>
                              <td className='py-2.5 px-3'>
                                <span className='inline-flex h-6 min-w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-medium'>{s.set}</span>
                              </td>
                              <td className='py-2.5 px-3'>
                                <div className='relative inline-block'>
                                  <input type='number' value={s.weight ?? 0} onChange={e => setValue(s.id, 'weight', e.target.value)} placeholder='0' className=' text-center h-9 w-[90px] !text-[16px] tabular-nums  rounded-lg border border-slate-200 bg-white  outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-[26px]' />

                                  <button type='button' onClick={() => bump(s.id, 'weight', -1)} title='-1' aria-label='Decrease weight' className='absolute left-[4px] top-1/2 -translate-y-1/2 h-[25px] w-[25px] flex items-center justify-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-50 active:scale-[.98] transition' tabIndex={-1}>
                                    <Plus size={16} />
                                  </button>

                                  <button type='button' onClick={() => bump(s.id, 'weight', +1)} title='+1' aria-label='Increase weight' className='absolute right-[4px] top-1/2 -translate-y-1/2  h-[25px] w-[25px] flex items-center justify-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-50 active:scale-[.98] transition' tabIndex={-1}>
                                    <Minus size={16} />
                                  </button>
                                </div>
                              </td>
                              <td className='py-2.5 px-3'>
                                <div className='relative inline-block'>
                                  <input type='number' value={s.reps ?? 0} onChange={e => setValue(s.id, 'reps', e.target.value)} placeholder='0' inputMode='numeric' step='1' className='text-center h-9 w-[90px] !text-[16px] tabular-nums rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-[26px]' />

                                  <button type='button' onClick={() => bump(s.id, 'reps', -1)} title='-1' aria-label='Decrease reps' className='absolute left-[4px] top-1/2 -translate-y-1/2 h-[25px] w-[25px] flex items-center justify-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-50 active:scale-[.98] transition' tabIndex={-1}>
                                    <Plus size={16} />
                                  </button>

                                  <button type='button' onClick={() => bump(s.id, 'reps', +1)} title='+1' aria-label='Increase reps' className='absolute right-[4px] top-1/2 -translate-y-1/2  h-[25px] w-[25px] flex items-center justify-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-50 active:scale-[.98] transition' tabIndex={-1}>
                                    <Minus size={16} />
                                  </button>
                                </div>
                              </td>
                              <td className='py-2.5 px-3'>
                                <CheckBox
                                  initialChecked={s.done}
                                  onChange={() => {
                                    toggleDone(s.id);
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer toolbar */}
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-2 text-[11px] text-slate-600 bg-slate-50/70 border-t border-slate-200'>
                      <div className='flex items-center gap-2'>
                        <button onClick={removeSetFromCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50' disabled={currentSets.length <= 1}>
                          <Minus size={14} /> Remove set
                        </button>
                        <button onClick={addSetForCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50'>
                          <Plus size={14} /> Add set
                        </button>
                      </div>

                      <ButtonMini loading={saving} icon={<SaveIcon size={14} />} name={t('save')} onClick={saveDayToServer} className='!px-3 !text-sm !py-1.5 !w-fit md:self-end' />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT (exercise list) */}
          <div className='rounded-lg bg-white h-fit p-4 shadow-sm hidden  lg:block w-80'>
            <ExerciseList
              workout={workout}
              currentExId={currentExId}
              onPick={ex => {
                setCurrentExId(ex.id);
                setActiveMedia('image');
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Unsaved hint */}
      <AnimatePresence>
        {unsaved && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className='fixed bottom-4 w-[90%] max-w-fit text-nowrap truncate left-1/2 -translate-x-1/2 z-40 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs flex justify-center text-center px-3 py-1.5 shadow'>
            {t('changesStored')}
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
                  <Dumbbell size={18} /> {t('exercises')}
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

      {/* Upload Modal */}
      <UploadVideoModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        userId={USER_ID}
        exercise={currentExercise}
        onUploaded={() => {
          /* you can toast success here if you want */
        }}
      />
    </div>
  );
}
