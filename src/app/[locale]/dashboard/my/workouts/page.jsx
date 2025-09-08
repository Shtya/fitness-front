'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import DataTable from '@/components/dashboard/ui/DataTable';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, History as HistoryIcon, Clock, X, Play, Pause, Settings, Minus, Plus, Upload, Video as VideoIcon, Images, Shuffle, Trash2, Trophy, TrendingUp, Flame, Save as SaveIcon, ImageIcon } from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api, { baseImg } from '@/utils/axios';
import weeklyProgram from './exercises';

const TIMER_FINISH_SOUND = '/sounds/alert7.mp3';

 

/* =================== HELPERS =================== */
const epley = (w, r) => Math.round((Number(w) || 0) * (1 + (Number(r) || 0) / 30));
const todayISO = () => new Date().toISOString().slice(0, 10);

function toMMSS(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? '0' : ''}${ss}`;
}
function mmssToSeconds(str) {
  if (!str) return 0;
  if (/^\d+$/.test(String(str))) return Number(str);
  const parts = String(str).split(':');
  if (parts.length === 1) return Number(parts[0]) || 0;
  const m = Number(parts[0]) || 0;
  const s = Number(parts[1]) || 0;
  return m * 60 + s;
}
const fmtVal = v => (v === null || v === undefined ? '—' : typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v));

/* =================== API helpers (JS) =================== */
async function fetchActivePlan(userId) {
  // const { data } = await api.get('/plans/active', { params: { userId } });
  return weeklyProgram;  
}
async function upsertDailyPR(exerciseName, date, records) {
  const { data } = await api.post('/prs', { exerciseName, date, records });
  return data; // returns daily record with records[]
}
async function upsertAttempt(exerciseName, date, set) {
  const { data } = await api.post('/prs/attempt', { exerciseName, date, set });
  return data; // returns daily record with records[]
}

/* =================== TIMER (logic) =================== */
function useCountdown() {
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const start = seconds => {
    const sec = Math.max(0, Math.round(Number(seconds) || 0));
    setDuration(sec);
    setRemaining(sec);
    setRunning(true);
    setPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    if (!running) return;
    setPaused(true);
    clearInterval(intervalRef.current);
  };
  const resume = () => {
    if (!running || !paused) return;
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const stop = () => {
    setRunning(false);
    setPaused(false);
    clearInterval(intervalRef.current);
    setRemaining(0);
  };

  return { duration, remaining, running, paused, start, pause, resume, stop };
}

/* =================== CIRCULAR PROGRESS TIMER (UI) =================== */
function CircularTimer({ duration, remaining, running, paused, onPause, onResume, onStop }) {
  const R = 38; // radius
  const C = 2 * Math.PI * R;
  const pct = duration > 0 ? remaining / duration : 0;
  const dash = C * pct;

  return (
    <div className='flex items-center gap-3 p-2'>
      <svg width='96' height='96' viewBox='0 0 96 96' className='shrink-0'>
        <circle cx='48' cy='48' r={R} stroke='#e5e7eb' strokeWidth='8' fill='none' />
        <circle cx='48' cy='48' r={R} stroke='currentColor' strokeWidth='8' fill='none' strokeDasharray={C} strokeDashoffset={C - dash} className='text-indigo-600 transition-[stroke-dashoffset] duration-1000 ease-linear' transform='rotate(-90 48 48)' />
        <text x='50%' y='50%' dominantBaseline='middle' textAnchor='middle' className='fill-slate-700 text-sm font-semibold'>
          {toMMSS(remaining)}
        </text>
      </svg>

      <div className='flex items-center gap-2'>
        {running && !paused && (
          <button onClick={onPause} className='px-3 py-2 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5'>
            <Pause size={14} /> Pause
          </button>
        )}
        {running && paused && (
          <button onClick={onResume} className='px-3 py-2 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5'>
            <Play size={14} /> Resume
          </button>
        )}
        {running && (
          <button onClick={onStop} className='px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5'>
            <X size={14} /> Stop
          </button>
        )}
      </div>
    </div>
  );
}

function RestTimerCard({ defaultRest, exerciseRest }) {
  const { remaining, running, paused, start, pause, resume, stop } = useCountdown();
  const [localDefaultRest, setLocalDefaultRest] = useState(defaultRest);
  const handleStart = () => start(Number.isFinite(exerciseRest) ? exerciseRest : localDefaultRest);

  useEffect(() => {
    setLocalDefaultRest(defaultRest);
  }, [defaultRest]);

  return (
    <div className='px-2 pt-2 pb-3'>
      <div className='flex items-center flex-wrap gap-2 rounded-lg border border-slate-200 p-2.5 bg-white'>
        <div className='text-sm font-semibold mr-2'>Rest Timer</div>
        {!running ? (
          <>
            <button onClick={handleStart} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
              <Clock size={14} /> {toMMSS(Number.isFinite(exerciseRest) ? exerciseRest : localDefaultRest)}
            </button>
            <div className='inline-flex rounded-lg overflow-hidden border border-slate-200'>
              <button onClick={() => setLocalDefaultRest(Math.max(0, localDefaultRest - 15))} className='px-2 py-2 text-xs hover:bg-slate-50' title='-15s'>
                <Minus size={14} />
              </button>
              <button onClick={() => setLocalDefaultRest(localDefaultRest + 15)} className='px-2 py-2 text-xs hover:bg-slate-50 border-l border-slate-200' title='+15s'>
                <Plus size={14} />
              </button>
            </div>
            <span className='text-[11px] text-slate-500 ml-1'>Default: {toMMSS(localDefaultRest)}</span>
          </>
        ) : (
          <CircularTimer duration={Number.isFinite(exerciseRest) ? exerciseRest : localDefaultRest} remaining={remaining} running={running} paused={paused} onPause={pause} onResume={resume} onStop={stop} />
        )}
      </div>
    </div>
  );
}

/* =================== VIDEO UPLOAD POPUP =================== */
function VideoUploadPopup({ exercise, isOpen, onClose, onUpload }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);

  if (!isOpen) return null;

  const handleFileSelect = e => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (videoFile && onUpload) {
      onUpload(videoFile, { startTime, endTime });
      onClose();
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-semibold'>Upload Video for {exercise?.name}</h3>
          <button onClick={onClose} className='text-slate-500 hover:text-slate-700'>
            <X size={20} />
          </button>
        </div>

        <div className='mb-4'>
          {videoPreview ? (
            <div className='relative'>
              <video src={videoPreview} controls className='w-full h-48 object-contain bg-black rounded-lg' />
              {editing && (
                <div className='absolute bottom-2 left-2 right-2 bg-black/70 p-2 rounded'>
                  <div className='flex items-center justify-between text-white text-xs mb-1'>
                    <span>Start: {startTime}s</span>
                    <span>End: {endTime}s</span>
                  </div>
                  <div className='relative'>
                    <input type='range' min='0' max='60' value={startTime} onChange={e => setStartTime(parseInt(e.target.value))} className='absolute w-full opacity-0 z-10' style={{ height: '16px' }} />
                    <input type='range' min='0' max='60' value={endTime} onChange={e => setEndTime(parseInt(e.target.value))} className='absolute w-full opacity-0 z-10' style={{ height: '16px', top: '8px' }} />
                    <div className='relative h-4 bg-gray-600 rounded'>
                      <div className='absolute h-full bg-indigo-500' style={{ left: `${(startTime / 60) * 100}%`, width: `${((endTime - startTime) / 60) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className='w-full h-48 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center'>
              <div className='text-center'>
                <VideoIcon size={32} className='mx-auto text-slate-400 mb-2' />
                <p className='text-slate-500'>No video selected</p>
              </div>
            </div>
          )}
        </div>

        <div className='flex flex-col gap-3'>
          <label className='cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg text-center'>
            <Upload size={16} className='inline mr-2' />
            Select Video File
            <input type='file' accept='video/*' className='hidden' onChange={handleFileSelect} />
          </label>

          {videoFile && (
            <>
              <button onClick={() => setEditing(!editing)} className='bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg'>
                {editing ? 'Done Editing' : 'Edit Video'}
              </button>

              <button onClick={handleUpload} className='bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg'>
                Upload Video
              </button>
            </>
          )}

          <button onClick={onClose} className='border border-slate-200 hover:bg-slate-100 text-slate-700 py-2 px-4 rounded-lg'>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* =================== PAGE =================== */
export default function MyWorkoutsPage() {
  const USER_ID = '36eae674-a063-4287-b378-e3cab0364b91';

  const [tab, setTab] = useState('workout');
  const [loading, setLoading] = useState(true);

  // backend plan + UI selections
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [workout, setWorkout] = useState(null);
  const [currentExId, setCurrentExId] = useState(undefined);

  // stats
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState({});

  const [overview, setOverview] = useState(null);
  const [exercisePick, setExercisePick] = useState('Bench Press');
  const [series, setSeries] = useState([]);
  const [topSets, setTopSets] = useState({ byWeight: [], byReps: [], byE1rm: [] });
  const [attempts, setAttempts] = useState([]);

  // rest timer
  const [defaultRest, setDefaultRest] = useState(90);
  const [customRestInput, setCustomRestInput] = useState('1:30');

  // settings / audio / video
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [selectedExerciseForVideo, setSelectedExerciseForVideo] = useState(null);

  // media view state
  const [activeMedia, setActiveMedia] = useState('image');

  // last-saved values per set
  const lastSavedRef = useRef(new Map());

  // Map JS weekday -> your IDs (Cairo local): 0 Sun...6 Sat
  const jsDayToId = d => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';

  function pickTodayId(availableIds) {
    const todayId = jsDayToId(new Date().getDay());
    if (availableIds.includes(todayId)) return todayId;
    const pref = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    return pref.find(x => availableIds.includes(x)) || availableIds[0] || 'monday';
  }

  /* ---------- INIT: Load active plan from backend ---------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let p = null;
        try {
          p = await fetchActivePlan(USER_ID);
        } catch (e) {
          console.error('Active plan fetch failed; falling back to seed', e);
        }
        setPlan(p);

        // choose initial day = today if exists
        const serverDays = p?.program?.days || [];
        const byId = Object.fromEntries(serverDays.map(d => [d.id, d]));
        const allIds = serverDays.map(d => d.id);
        const initialDayId = pickTodayId(allIds.length ? allIds : Object.keys(weeklyProgram));
        setSelectedDay(initialDayId);

        const dayProgram = byId[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: 'Workout', exercises: [] };

        const session = createSessionFromDay(dayProgram, 90);
        setWorkout(session);
        setCurrentExId(session.exercises[0]?.id);
        setActiveMedia('image');

        // init lastSaved mirror
        const map = new Map();
        session.sets.forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
        lastSavedRef.current = map;
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  /* ---------- Stats loaders ---------- */
  async function loadOverview(windowDays = 30) {
    // const { data } = await api.get('/prs/stats/overview', { params: { windowDays } });
    // setOverview(data || null);

  }
  async function loadExerciseStats(name, windowDays = 90) {
    const [seriesRes, topRes, histRes] = await Promise.all([api.get('/prs/stats/e1rm-series', { params: { exerciseName: name, bucket: 'week', windowDays } }), api.get('/prs/stats/top-sets', { params: { exerciseName: name, top: 5 } }), api.get('/prs/history', { params: { exerciseName: name } })]);
    setSeries(seriesRes.data || []);
    setTopSets(topRes.data || { byWeight: [], byReps: [], byE1rm: [] });
    setAttempts(histRes.data || []);
  }

  useEffect(() => {
    if (tab !== 'history') return;
    (async () => {
      try {
        await loadOverview(30);
        await loadExerciseStats(exercisePick, 90);
      } catch (err) {
        console.error('Stats load failed', err);
      }
    })();
  }, [tab]); // eslint-disable-line

  useEffect(() => {
    if (tab !== 'history') return;
    (async () => {
      try {
        await loadExerciseStats(exercisePick, 90);
      } catch (err) {
        console.error('Exercise stats load failed', err);
      }
    })();
  }, [exercisePick, tab]);

  /* ---------- Utilities ---------- */
  const setsFor = exId => workout?.sets.filter(s => s.exId === exId) || [];

  function createSessionFromDay(dayProgram, restDefaultSeconds) {
    return {
      ...dayProgram,
      startedAt: null,
      sets: (dayProgram.exercises || []).flatMap(ex =>
        Array.from({ length: 2 }).map((_, i) => ({
          id: `${ex.id}-set${i + 1}`,
          exId: ex.id,
          exName: ex.name,
          set: i + 1,
          targetReps: ex.targetReps,
          weight: 0,
          reps: 0,
          effort: null,
          done: false,
          pr: false,
          restTime: Number.isFinite(ex.rest ?? ex.restSeconds) ? ex.rest ?? ex.restSeconds : restDefaultSeconds,
        })),
      ),
    };
  }

  function changeDay(dayId) {
    setSelectedDay(dayId);
    const byId = Object.fromEntries((plan?.program?.days || []).map(d => [d.id, d]));
    const dayProgram = byId[dayId] || weeklyProgram[dayId] || { id: dayId, name: 'Workout', exercises: [] };
    const session = createSessionFromDay(dayProgram, defaultRest);
    setWorkout(session);
    setCurrentExId(session.exercises[0]?.id);
    setActiveMedia('image');

    const map = new Map();
    session.sets.forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
    lastSavedRef.current = map;
  }

  // Apply default rest
  function applyDefaultRestToAll() {
    setWorkout(w => ({ ...w, sets: w.sets.map(s => ({ ...s, restTime: defaultRest })) }));
  }
  function applyDefaultRestToCurrentExercise() {
    setWorkout(w => ({ ...w, sets: w.sets.map(s => (s.exId === currentExId ? { ...s, restTime: defaultRest } : s)) }));
  }

  // Add set for current exercise
  function addSetForCurrentExercise() {
    setWorkout(w => {
      const exSets = w.sets.filter(s => s.exId === currentExId);
      const nextIndex = exSets.length + 1;
      const base = exSets[exSets.length - 1] || { targetReps: '10', restTime: defaultRest };
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

      const map = new Map(lastSavedRef.current);
      map.set(newSet.id, { weight: 0, reps: 0, done: false });
      lastSavedRef.current = map;
      return next;
    });
  }

  // Remove set for current exercise
  function removeSetFromCurrentExercise() {
    setWorkout(w => {
      const exSets = w.sets.filter(s => s.exId === currentExId);
      if (exSets.length <= 1) return w; // Keep at least one set

      const lastSetId = exSets[exSets.length - 1].id;
      const next = { ...w, sets: w.sets.filter(s => s.id !== lastSetId) };

      const map = new Map(lastSavedRef.current);
      map.delete(lastSetId);
      lastSavedRef.current = map;
      return next;
    });
  }

  // Mark done toggling + PR detection (local)
  function toggleDone(setId) {
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
      return next;
    });
  }

  // Remove set locally
  function removeSet(setId) {
    setWorkout(w => ({ ...w, sets: w.sets.filter(s => s.id !== setId) }));
    const map = new Map(lastSavedRef.current);
    map.delete(setId);
    lastSavedRef.current = map;
  }

  // ====== BACKEND INTEGRATION ======
  const currentExercise = workout?.exercises.find(e => e.id === currentExId);
  const currentSets = setsFor(currentExId);

  function buildDailyPRPayload(exName) {
    const day = todayISO();
    const records = setsFor(currentExId)
      .filter(s => s.exName === exName)
      .map(s => ({
        id: s.serverId,
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 0,
        done: !!s.done,
        setNumber: Number(s.set) || 1,
      }));
    return { exerciseName: exName, date: day, records };
  }

  async function saveDayToServer() {
    if (!currentExercise) return;
    const payload = buildDailyPRPayload(currentExercise.name);
    try {
      const data = await upsertDailyPR(payload.exerciseName, payload.date, payload.records);
      const serverRecords = data?.records || [];
      setWorkout(w => ({
        ...w,
        sets: w.sets.map(s => {
          if (s.exId !== currentExId) return s;
          const match = serverRecords.find(r => Number(r.setNumber) === Number(s.set));
          return match ? { ...s, serverId: match.id } : s;
        }),
      }));
      await loadOverview(30);
      await loadExerciseStats(currentExercise.name, 90);

      const map = new Map(lastSavedRef.current);
      setsFor(currentExId).forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
      lastSavedRef.current = map;
      alert('Saved day to server.');
    } catch (err) {
      console.error('Save day failed', err);
      alert('Failed to save day.');
    }
  }

  // Explicit save handler (button in row)
  async function saveSingleSet(setObj) {
    if (!currentExercise) return;
    const payload = {exerciseName: currentExercise.name,date: todayISO(),set: {id: setObj.serverId,weight: Number(setObj.weight) || 0,reps: Number(setObj.reps) || 0,done: !!setObj.done,setNumber: Number(setObj.set) || 1,},};
    try {
			console.log(payload);
      const data = await upsertAttempt(payload.exerciseName, payload.date, payload.set);
      const serverRecords = data?.records || [];
      setWorkout(w => ({
        ...w,
        sets: w.sets.map(s => {
          if (s.id !== setObj.id) return s;
          const m = serverRecords.find(r => Number(r.setNumber) === Number(setObj.set));
          return m ? { ...s, serverId: m.id } : s;
        }),
      }));
      await loadOverview(30);
      await loadExerciseStats(currentExercise.name, 90);

      const nextBase = new Map(lastSavedRef.current);
      nextBase.set(setObj.id, {
        weight: Number(setObj.weight) || 0,
        reps: Number(setObj.reps) || 0,
        done: !!setObj.done,
      });
      lastSavedRef.current = nextBase;
    } catch (err) {
      console.error('Save set failed', err);
      // alert('Failed to save this set.');
    }
  }

  // Auto-save on blur (kept, but button is the primary explicit action)
  async function maybeSaveSetOnBlur(setObj) {
    const prev = lastSavedRef.current.get(setObj.id) || { weight: 0, reps: 0, done: false };
    const changed = Number(prev.weight) !== Number(setObj.weight) || Number(prev.reps) !== Number(setObj.reps) || Boolean(prev.done) !== Boolean(setObj.done);
    if (!changed) return;
    await saveSingleSet(setObj);
  }

  // Get day tabs with current day as active
  const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  const dayTabs = weekOrder
    .filter(d => (plan?.program?.days || []).some(x => x.id === d) || weeklyProgram[d])
    .map(d => ({
      key: d,
      label: d,
      name: (plan?.program?.days || []).find(x => x.id === d)?.name || weeklyProgram[d].name,
    }));

  // Set initial day to current day if needed
  useEffect(() => {
    if (dayTabs.length > 0 && !selectedDay) {
      const todayId = jsDayToId(new Date().getDay());
      const todayTab = dayTabs.find(tab => tab.key === todayId);
      if (todayTab) {
        setSelectedDay(todayId);
        changeDay(todayId);
      } else if (dayTabs.length > 0) {
        setSelectedDay(dayTabs[0].key);
        changeDay(dayTabs[0].key);
      }
    }
  }, [dayTabs]); // eslint-disable-line

  // Render helpers
  const hasExercises = !!workout?.exercises?.length;

  /* =================== RENDER =================== */
  return (
    <div className='space-y-6'>
      <audio ref={audioRef} src={TIMER_FINISH_SOUND} preload='auto' />

      <div className='flex items-center justify-between flex-wrap gap-3'>
        <PageHeader
          icon={ Dumbbell  }  
          title='My Workouts'
          subtitle='Log sets with RPE/RIR and track PRs automatically.'
        />
        <div className='flex items-center gap-2'>
          <TabsPill
            id='my-workouts-tabs'
            tabs={[
              { key: 'workout', label: 'Workout', icon: Dumbbell },
              { key: 'history', label: 'History', icon: HistoryIcon },
            ]}
            active={tab}
            onChange={k => {
              setTab(k);
            }}
          />
          <button onClick={() => setShowSettings(s => !s)} className='inline-flex items-center gap-1.5 !rounded-2xl before:!rounded-2xl border border-slate-200 px-3 py-[10px] text-sm text-slate-700 hover:bg-slate-50 bg-main cursor-pointer' aria-label='Settings' title='Settings'>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ===== Days bullets ===== */}
      {tab === 'workout' && (
        <div className='rounded-2xl border border-slate-200 bg-white p-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex-1'>
              <TabsPill id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />
            </div>
            <div className='text-xs text-slate-500 hidden md:block'>
              {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} — {(plan?.program?.days || []).find(x => x.id === selectedDay)?.name || weeklyProgram[selectedDay]?.name || ''}
            </div>
          </div>
        </div>
      )}

      {/* ===== GLOBAL REST TIMER CONTROL ===== */}
      {tab === 'workout' && showSettings && (
        <div className='rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='flex flex-col md:flex-row md:items-end gap-3'>
            <div className='flex-1'>
              <div className='text-sm font-semibold mb-1'>Default Rest Timer</div>
              <div className='flex items-center gap-2 flex-wrap'>
                <div className='relative'>
                  <input
                    type='text'
                    value={customRestInput}
                    onChange={e => setCustomRestInput(e.target.value)}
                    onBlur={() => {
                      const sec = mmssToSeconds(customRestInput);
                      setDefaultRest(sec || 0);
                      setCustomRestInput(toMMSS(sec || 0));
                    }}
                    className='h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition tabular-nums'
                    placeholder='mm:ss'
                  />
                  <span className='absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 select-none'>mm:ss</span>
                </div>

                <div className='flex items-center gap-2'>
                  {[60, 90, 120].map(preset => (
                    <button
                      key={preset}
                      onClick={() => {
                        setDefaultRest(preset);
                        setCustomRestInput(toMMSS(preset));
                      }}
                      className={`h-10 px-3 rounded-lg border text-sm transition ${defaultRest === preset ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                      {toMMSS(preset)}
                    </button>
                  ))}
                </div>
              </div>
              <div className='mt-1 text-xs text-slate-500'>Used when a set has no specific rest.</div>
            </div>

            <div className='flex items-center gap-2'>
              <button onClick={applyDefaultRestToCurrentExercise} className='h-10 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm' title='Apply to current exercise sets'>
                Apply to current exercise
              </button>
              <button onClick={applyDefaultRestToAll} className='h-10 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm' title='Apply to all sets in workout'>
                Apply to all sets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== WORKOUT ===== */}
      {tab === 'workout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          {loading ? (
            <div className='space-y-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='h-14 rounded-xl bg-slate-100 animate-pulse' />
              ))}
            </div>
          ) : (
            <div className='space-y-6'>
              <div className='rounded-2xl border border-slate-200 bg-white lg:p-4'>
                {workout && (
                  <div className='flex flex-col md:flex-row gap-4'>
                    {/* LEFT */}
                    <div className='w-full md:flex-1 min-w-0'>
                      <div className='rounded-lg lg:rounded-2xl lg:border border-slate-200 bg-white overflow-hidden'>
                        {/* If no exercises for the day */}
                        {!hasExercises && (
                          <div className='p-6'>
                            <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
                              <div className='mx-auto mb-3 w-12 h-12 rounded-full bg-white shadow grid place-items-center'>
                                <Dumbbell size={18} className='text-slate-500' />
                              </div>
                              <div className='text-base font-semibold text-slate-700'>Not found for this day</div>
                              <div className='text-sm text-slate-500 mt-1'>Pick another day from the tabs above or add exercises to this program.</div>
                            </div>
                          </div>
                        )}

                        {/* If exercises exist */}
                        {hasExercises && (
                          <>
                            {/* Banner media (switchable) */}
                            <div className='aspect-video bg-slate-900 grid place-items-center overflow-hidden shadow-lg relative rounded-[10px_10px_0_0]'>
                              {currentExercise && (activeMedia === 'video' || activeMedia == "video2") && currentExercise.video ? <video key={currentExercise.id + '-video'} src={ currentExercise[activeMedia]} controls className='w-full h-full object-contain bg-black' /> : <img key={currentExercise?.id + '-image'} src={currentExercise.img} alt={currentExercise?.name || 'Exercise'} className='w-full h-full object-cover' />}
                               {/* Simple media toggle pill */}
                              <div className='absolute bottom-2 right-2 flex items-center gap-2 bg-black/40 backdrop-blur px-2 py-1 rounded-lg'>
                                <button onClick={() => setActiveMedia('image')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'image' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show image'>
                                  <ImageIcon />
                                </button>
                                <button onClick={() => setActiveMedia('video')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'video' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show video' disabled={!currentExercise?.video}>
                                  <VideoIcon />
                                </button>
                                {currentExercise?.video2 && <button onClick={() => setActiveMedia('video2')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'video2' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show video' disabled={!currentExercise?.video2}>
                                  <VideoIcon />
                                </button>}
                              </div>
                            </div>

                            {/* Rest timer */}
                            <RestTimerCard defaultRest={defaultRest} exerciseRest={Number.isFinite(currentExercise?.restSeconds) ? currentExercise?.restSeconds : currentExercise?.rest} />

                            {/* Alternatives / media tabs */}
                            {/* <ExerciseSubTabs
                              exercise={currentExercise}
                              allExercises={workout.exercises}
                              currentExId={currentExId}
                              onPickAlternative={ex => {
                                setCurrentExId(ex.id);
                                setActiveMedia('image');
                              }}
                            /> */}

                            {/* SETS TABLE */}
                            <div className='lg:mx-2 mb-4 border border-slate-200 md:rounded-lg overflow-hidden'>
                              <div className='overflow-x-auto'>
                                <table className='w-full text-sm overflow-hidden rounded-2xl border border-slate-200'>
                                  <thead className='bg-slate-50/80 backdrop-blur sticky top-0 z-10'>
                                    <tr className='text-left text-slate-500'>
                                      <th className='py-3 px-3 font-semibold'>Set</th>
                                      <th className='py-3 px-3 font-semibold'>Weight</th>
                                      <th className='py-3 px-3 font-semibold'>Reps</th>
                                      <th className='py-3 px-3 font-semibold'>Done</th>
                                      <th className='py-3 px-3 font-semibold'>Actions</th>
                                    </tr>
                                  </thead>

                                  <tbody className='divide-y divide-slate-100'>
                                    {currentSets.map((s, i) => (
                                      <tr key={s.id} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                                        <td className='py-3 px-3'>
                                          <span className='inline-flex h-6 min-w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-medium'>{s.set}</span>
                                        </td>
                                        <td className='py-3 px-3'>
                                          <input type='number' min={0} value={s.weight} onChange={e => setWorkout(w => ({ ...w, sets: w.sets.map(x => (x.id === s.id ? { ...x, weight: +e.target.value } : x)) }))} onBlur={() => maybeSaveSetOnBlur({ ...s, weight: Number(s.weight) })} className='h-9 w-[70px] !text-[16px] rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition' placeholder='0' inputMode='numeric' />
                                        </td>
                                        <td className='py-3 px-3'>
                                          <input type='number' min={0} value={s.reps} onChange={e => setWorkout(w => ({ ...w, sets: w.sets.map(x => (x.id === s.id ? { ...x, reps: +e.target.value } : x)) }))} onBlur={() => maybeSaveSetOnBlur({ ...s, reps: Number(s.reps) })} className='h-9 w-[70px] !text-[16px] rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition' placeholder='0' inputMode='numeric' />
                                        </td>
                                        <td className='py-3 px-3'>
                                          <CheckBox
                                            checked={s.done}
                                            onChange={() => {
                                              toggleDone(s.id);
                                              setTimeout(() => maybeSaveSetOnBlur({ ...s, done: !s.done }), 0);
                                            }}
                                          />
                                        </td>
                                        <td className='py-3 px-3 flex items-center gap-2'>
                                          <button onClick={() => removeSet(s.id)} className='cursor-pointer text-red-500 hover:text-red-700' title='Remove set'>
                                            <Trash2 size={16} />
                                          </button>
                                          <button onClick={() => saveSingleSet(s)} className='cursor-pointer inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700' title='Save this set to server'>
                                            <SaveIcon size={16} />
                                            <span className='text-xs'>Save</span>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className='flex items-center justify-between px-3 py-2 text-[11px] text-slate-500 bg-slate-50/60'>
                                <button
                                  onClick={() => {
                                    setSelectedExerciseForVideo(currentExercise);
                                    setShowVideoUpload(true);
                                  }}
                                  className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
                                  <VideoIcon size={14} /> Upload Video
                                </button>
                                <div className='flex items-center gap-2'>
                                  <div className='flex items-center gap-1'>
                                    <button onClick={removeSetFromCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50' disabled={currentSets.length <= 1}>
                                      <Minus size={14} />
                                    </button>
                                    <button onClick={addSetForCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                  <button onClick={saveDayToServer} className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 hover:bg-indigo-100' title='Save/Upsert this exercise day'>
                                    Save day
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Exercise list */}
                    <div className='w-full md:w-80'>
                      <div className='w-full h-full max-h-[475px] overflow-y-auto rounded-2xl lg:border border-slate-200 bg-white max-lg:px-2 lg:p-4'>
                        <h3 className='text-base font-semibold mb-3'>Exercises</h3>
                        {!hasExercises ? (
                          <div className='text-sm text-slate-500'>Nothing here yet.</div>
                        ) : (
                          <div className='space-y-2'>
                            {workout.exercises.map((ex, idx) => {
                              const done = setsFor(ex.id).filter(s => s.done).length;
                              const total = setsFor(ex.id).length;
                              const active = currentExId === ex.id;
                              return (
                                <button
                                  key={ex.id}
                                  onClick={() => {
                                    setCurrentExId(ex.id);
                                    setExercisePick(ex.name);
                                    setActiveMedia('image');
                                  }}
                                  className={`w-full text-left p-3 rounded-xl border transition ${active ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                  <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 overflow-hidden rounded-lg bg-slate-100 grid place-items-center'>{ex.img ? <img src={ ex.img} alt='' className='object-cover w-full h-full' /> : <Dumbbell size={16} className='text-slate-500' />}</div>
                                    <div className='min-w-0 flex-1'>
                                      <div className=' font-medium truncate'>
                                        {idx + 1}. {ex.name}
                                      </div>
                                      <div className='text-xs opacity-70'>
                                        {total} × {ex.targetReps} • Rest {Number.isFinite(ex.rest ?? ex.restSeconds) ? ex.rest ?? ex.restSeconds : defaultRest}s
                                      </div>
                                      <div className='mt-1 h-1.5 rounded-full bg-slate-200'>
                                        <div className='h-1.5 rounded-full bg-indigo-600' style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ===== HISTORY + STATS ===== */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-4'>
          {/* KPI Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            <KPI title='Exercises Tracked' value={fmtVal(overview?.totals?.exercisesTracked)} icon={Dumbbell} />
            <KPI title='Total Attempts' value={fmtVal(overview?.totals?.attempts)} icon={TrendingUp} />
            <KPI title='All-time PRs' value={fmtVal(overview?.totals?.allTimePrs)} icon={Trophy} />
            <KPI title='Current Streak (days)' value={fmtVal(overview?.totals?.currentStreakDays)} icon={Flame} />
          </div>

          {/* All-time Bests */}
          <div className='rounded-2xl border border-slate-200 bg-white p-4'>
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
                  <div key={i} className='p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between'>
                    <div className='text-sm font-medium truncate'>{String(b?.name ?? '—')}</div>
                    <div className='text-sm tabular-nums font-semibold'>{bestE1rm} e1RM</div>
                  </div>
                );
              })}
              {!overview?.bests?.length && <div className='text-sm text-slate-500'>No bests yet.</div>}
            </div>
          </div>

          {/* Exercise picker + drilldown */}
          <div className='rounded-2xl border border-slate-200 bg-white p-4'>
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

            {/* e1RM Series (simple list) */}
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

            {/* Top sets */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              <TopList title='Top by Weight' items={topSets.byWeight || []} fmt={x => `${Number(x?.weight) || 0}×${Number(x?.reps) || 0}`} />
              <TopList title='Top by Reps' items={topSets.byReps || []} fmt={x => `${Number(x?.reps) || 0} @ ${Number(x?.weight) || 0}`} />
              <TopList title='Top by e1RM' items={topSets.byE1rm || []} fmt={x => `${Math.round(Number(x?.e1rm) || 0)} e1RM`} />
            </div>

            {/* Raw Attempts */}
            <div className='mt-4'>
              <div className='font-medium mb-2'>Attempts</div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm rounded-xl border border-slate-200'>
                  <thead className='bg-slate-50/60'>
                    <tr className='text-left text-slate-600'>
                      <th className='py-2 px-3'>Date</th>
                      <th className='py-2 px-3'>Weight</th>
                      <th className='py-2 px-3'>Reps</th>
                      <th className='py-2 px-3'>e1RM</th>
                      <th className='py-2 px-3'>Set</th>
                      <th className='py-2 px-3'>PR</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {(attempts || []).map((a, i) => (
                      <tr key={i}>
                        <td className='py-2 px-3'>{String(a?.date ?? '—')}</td>
                        <td className='py-2 px-3 tabular-nums'>{Number(a?.weight) || 0}</td>
                        <td className='py-2 px-3 tabular-nums'>{Number(a?.reps) || 0}</td>
                        <td className='py-2 px-3 tabular-nums'>{Math.round(Number(a?.e1rm) || 0)}</td>
                        <td className='py-2 px-3 tabular-nums'>{a?.setIndex != null ? String(a.setIndex) : '—'}</td>
                        <td className='py-2 px-3'>{a?.isPr ? <span className='text-amber-600 font-semibold'>PR</span> : ''}</td>
                      </tr>
                    ))}
                    {!attempts?.length && (
                      <tr>
                        <td colSpan={6} className='py-3 px-3 text-sm text-slate-500'>
                          No attempts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Session history table */}
          <div className='rounded-2xl border border-slate-200 bg-white p-4'>
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

      {/* Video Upload Popup */}
      <VideoUploadPopup exercise={selectedExerciseForVideo} isOpen={showVideoUpload} onClose={() => setShowVideoUpload(false)} onUpload={(file, editOptions) => console.log('Upload video', selectedExerciseForVideo?.id, file, editOptions)} />

      {/* Floating Stop Sound button (hooked into your alert sound if you add it) */}
      {isPlayingSound && (
        <button
          onClick={() => {
            const el = audioRef.current;
            if (el) {
              el.pause();
              el.currentTime = 0;
            }
            setIsPlayingSound(false);
          }}
          className='fixed bottom-4 right-4 z-50 rounded-full border border-red-200 bg-white shadow px-4 py-2 text-sm text-red-600 hover:bg-red-50'
          title='Stop alert sound'>
          <X size={14} className='inline -mt-0.5 mr-1' /> Stop sound
        </button>
      )}
    </div>
  );
}

/* =================== SUB TABS =================== */
function ExerciseSubTabs({ exercise, allExercises, onPickAlternative, initialTab = 'media' }) {
  const [tab, setTab] = useState(initialTab);
  const tabs = [
    { key: 'media', label: 'Media', icon: Images },
    { key: 'alternatives', label: 'Alternatives', icon: Shuffle },
  ];
  const alternatives = useMemo(() => (allExercises || []).filter(e => e.id !== exercise?.id).slice(0, 6), [allExercises, exercise?.id]);

  return (
    <div className='px-2 pt-3'>
      <div className='relative mb-2'>
        <div className='flex items-center gap-2 rounded-xl bg-slate-100 p-1.5'>
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} className={`cursor-pointer relative flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition ${active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`} aria-selected={active} role='tab'>
                <Icon size={16} />
                {label}
                {active && <motion.span layoutId='tabActivePill' className='absolute inset-0 -z-10 rounded-lg bg-white shadow' transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              </button>
            );
          })}
          <div className='ml-auto text-xs text-slate-500 select-none'>2 sets • {exercise?.targetReps} reps</div>
        </div>
      </div>

      <div role='tabpanel' className='py-3'>
        {tab === 'alternatives' && (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {alternatives.map(alt => (
              <motion.div key={alt.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} className='group p-3 border border-slate-200 rounded-2xl bg-white hover:shadow-md transition'>
                <div className='flex items-center gap-3'>
                  <div className='w-14 h-14 rounded-xl bg-slate-100 grid place-items-center overflow-hidden border border-slate-200'>{alt.img ? <img src={ alt.img} alt={alt.name} className='w-full h-full object-cover group-hover:scale-105 transition' /> : <Dumbbell size={18} className='text-slate-500' />}</div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-medium truncate'>{alt.name}</div>
                    <div className='text-xs text-slate-500'>
                      Target: 2 × {alt.targetReps} • Rest {alt.rest ?? '—'}s
                    </div>
                  </div>
                  <button onClick={() => onPickAlternative(alt)} className='text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50'>
                    Use
                  </button>
                </div>
              </motion.div>
            ))}
            {!alternatives.length && (
              <div className='col-span-full'>
                <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500'>
                  <div className='mx-auto mb-2 w-10 h-10 rounded-full bg-slate-100 grid place-items-center'>
                    <Images size={16} className='text-slate-500' />
                  </div>
                  <div className='text-sm'>No alternatives configured for this day.</div>
                  <div className='mt-2 text-xs'>Add some in your plan to see them here.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =================== SMALL UI PARTS =================== */
function KPI({ title, value, icon: Icon }) {
  // we still accept a component type and render it properly
  return (
    <div className='p-4 rounded-2xl border border-slate-200 bg-white flex items-center gap-3'>
      <div className='w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 grid place-items-center'>
        <Icon size={18} />
      </div>
      <div className='min-w-0'>
        <div className='text-xs text-slate-500'>{title}</div>
        <div className='text-base font-semibold tabular-nums truncate'>{value}</div>
      </div>
    </div>
  );
}

function TopList({ title, items, fmt }) {
  return (
    <div className='rounded-xl border border-slate-200 p-3'>
      <div className='font-medium mb-2'>{title}</div>
      <div className='space-y-1'>
        {items.map((x, i) => (
          <div key={i} className='flex items-center justify-between text-sm'>
            <span className='truncate text-slate-700'>{x.date}</span>
            <span className='tabular-nums font-semibold'>{fmt(x)}</span>
          </div>
        ))}
        {!items.length && <div className='text-sm text-slate-500'>No data.</div>}
      </div>
    </div>
  );
}
