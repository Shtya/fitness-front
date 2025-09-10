/* 
	- make the video take fixed height 400px and object-contain and click to work it work without take the full screen mode 
	- put icons when click on it show categories about what i need to listen ( اذاعه القران الكريم  as play and pause and list to some podcast i will provide you with some links of podcasts and i can show it in this page)
		يكون موجود اذاعه القران الكريم  , وقائمه يختار منها عاوز يشغل ايه قران ولا بودكاست و اختيارات تانيه 
	- when i change any value in the sets show button to save them not when i write the value and after out focus send request for everything i need when chagne any value show button to save it and if no click on the save, save this data in the localstorage until click on the button and save it
	- and also show icon for the setting when click on it show popup have dropdown to change the sound of the alter with alot of sounded [ /sounds/alert1.mp3 , /sounds/alert2.mp3 , /sounds/alert7.mp3 ]

	- show a big icon above the exercise to when i go to the gym click on it to start the training to know i start the workout form time to this time to know i keep in the gym how min or how hours
	- and make pretty skeleton loading like the ui 
	- and also i see issue bug don't get the all sets and his progress untill i click on the exercise i need get the all progress of the exercise one time and push them 
 
	- and in the mobile the exercise make them in icon show beside the table or in any suitable place when click on it slide teh exercies form the right to choose the current exercise  with pretty why 

	- and also i need enhance this ui more that this make it more awesome and amaizing and add also animation and handle teh responsive
	- and i use js not ts

	*/
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '@/components/dashboard/ui/DataTable';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, History as HistoryIcon, Clock, X, Play, Pause, Minus, Plus, Video as VideoIcon, Images, Shuffle, Trophy, TrendingUp, Flame, Save as SaveIcon, ImageIcon, Edit3, Headphones, Radio, Settings as SettingsIcon, Menu as MenuIcon } from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api from '@/utils/axios';
import weeklyProgram from './exercises';

/* =================== CONSTANTS =================== */
const DEFAULT_SOUNDS = ['/sounds/alert1.mp3', '/sounds/alert2.mp3', '/sounds/alert3.mp3', '/sounds/alert4.mp3', '/sounds/alert5.mp3', '/sounds/alert6.mp3', '/sounds/alert7.mp3'];
const LOCAL_KEY_BUFFER = 'mw.sets.buffer.v1';
const LOCAL_KEY_SETTINGS = 'mw.settings.v1';

/* =================== HELPERS =================== */
const epley = (w, r) => Math.round((Number(w) || 0) * (1 + (Number(r) || 0) / 30));
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtVal = v => (v === null || v === undefined ? '—' : typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v));

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

async function fetchActivePlan(userId) {
  // const { data } = await api.get('/plans/active', { params: { userId } });
  const data = weeklyProgram;
  return data?.program?.days?.length ? data : { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) } };
}
async function fetchDaySets(userId, exerciseName, date) {
  const { data } = await api.get('/prs/day', { params: { userId, exerciseName, date } });
  return data?.records || [];
}
// Try a single endpoint to fetch ALL exercises for the day; fallback to per-exercise if API not available
async function fetchAllDaySets(userId, exerciseNames, date) {
  try {
    const { data } = await api.get('/prs/day/all', { params: { userId, date } });
    // expected: { [exerciseName]: records[] }
    if (data && typeof data === 'object') return data;
  } catch (_) {}
  // fallback: parallel requests
  const entries = await Promise.all(exerciseNames.map(async name => [name, await fetchDaySets(userId, name, date)]));
  return Object.fromEntries(entries);
}
async function upsertDailyPR(userId, exerciseName, date, records) {
  const { data } = await api.post('/prs', { exerciseName, date, records }, { params: { userId } });
  return data;
}
async function upsertAttempt(userId, exerciseName, date, set) {
  const { data } = await api.post('/prs/attempt', { exerciseName, date, set }, { params: { userId } });
  return data;
}
async function fetchOverview(userId, windowDays = 30) {
  const { data } = await api.get('/prs/stats/overview', { params: { userId, windowDays } });
  return data;
}
async function fetchExerciseStats(userId, name, windowDays = 90) {
  const [seriesRes, topRes, histRes] = await Promise.all([api.get('/prs/stats/e1rm-series', { params: { userId, exerciseName: name, bucket: 'week', windowDays } }), api.get('/prs/stats/top-sets', { params: { userId, exerciseName: name, top: 5 } }), api.get('/prs/history', { params: { userId, exerciseName: name } })]);
  return {
    series: seriesRes.data || [],
    topSets: topRes.data || { byWeight: [], byReps: [], byE1rm: [] },
    attempts: histRes.data || [],
  };
}

/* =================== TIMER HOOK =================== */
function useCountdown() {
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

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

/* =================== CIRCULAR TIMER =================== */
function CircularTimer({ duration, remaining, running, paused, onPause, onResume, onStop }) {
  const R = 34; // radius
  const C = 2 * Math.PI * R;
  const pct = duration > 0 ? remaining / duration : 0;
  const dash = C * pct;
  return (
    <div className='flex items-center gap-3 p-2 sm:p-3'>
      <svg width='84' height='84' viewBox='0 0 96 96' className='shrink-0'>
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

/* =================== REST TIMER CARD =================== */
function RestTimerCard({ initialSeconds, audioEl, className = '' }) {
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();
  const [seconds, setSeconds] = useState(Number(initialSeconds || 0) || 90);
  const [showInput, setShowInput] = useState(false);

  const inputRef = useRef(null);
  const holdRef = useRef(null);

  useEffect(() => setSeconds(Number(initialSeconds || 0) || 90), [initialSeconds]);

  // Play alert when finished
  useEffect(() => {
    if (!running && duration > 0 && remaining === 0) {
      const el = audioEl?.current;
      if (!el) return;
      try {
        el.currentTime = 0;
        el.loop = true;
        el.play();
        const t = setTimeout(() => {
          try {
            el.pause();
            el.currentTime = 0;
            el.loop = false;
          } catch {}
        }, 30000);
        return () => clearTimeout(t);
      } catch {}
    }
  }, [running, remaining, duration, audioEl]);

  const haptic = (ms = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator)
      try {
        navigator.vibrate(ms);
      } catch {}
  };

  const step = delta => setSeconds(s => Math.max(0, s + delta));
  const dec = () => {
    step(-15);
    haptic();
  };
  const inc = () => {
    step(+15);
    haptic();
  };

  // long-press for faster ramping
  const startHold = delta => {
    step(delta);
    holdRef.current = setInterval(() => step(delta), 150);
  };
  const endHold = () => clearInterval(holdRef.current);

  const handleStart = () => {
    start(seconds);
    haptic(20);
  };
  const toggleEdit = () => {
    setShowInput(v => !v);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const commitInput = e => {
    setSeconds(mmssToSeconds(e.target.value));
    setShowInput(false);
  };

  // Compact circular timer (44px)
  const R = 17;
  const C = 2 * Math.PI * R;
  const pct = duration > 0 ? remaining / duration : 0;
  const dash = C * pct;

  return (
    <div className={`px-2 pt-2 pb-2 ${className}`}>
      <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2'>
        {/* Left: tiny ring & label */}
        <button
          onClick={() => {
            if (running) {
              stop();
              haptic(20);
            }
          }}
          className='relative shrink-0 grid place-items-center rounded-full'
          title={running ? 'Stop' : 'Timer'}
          style={{ width: 44, height: 44 }}>
          <svg width='44' height='44' viewBox='0 0 44 44'>
            <circle cx='22' cy='22' r={R} stroke='#e5e7eb' strokeWidth='6' fill='none' />
            <circle cx='22' cy='22' r={R} stroke='currentColor' strokeWidth='6' fill='none' strokeDasharray={C} strokeDashoffset={C - dash} className={`transition-[stroke-dashoffset] duration-300 ease-linear ${running ? 'text-indigo-600' : 'text-slate-300'}`} transform='rotate(-90 22 22)' />
          </svg>
          <span className='absolute text-[10px] font-semibold text-slate-700 tabular-nums'>{toMMSS(running ? remaining : seconds)}</span>
        </button>

        {/* Middle: controls */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1.5'>
            {!running ? (
              <button onClick={handleStart} className='inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs hover:bg-indigo-100' title='Start'>
                <Clock size={12} /> Start
              </button>
            ) : paused ? (
              <>
                <button
                  onClick={() => {
                    resume();
                    haptic();
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs hover:bg-emerald-100'
                  title='Resume'>
                  <Play size={12} /> Resume
                </button>
                <button
                  onClick={() => {
                    stop();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50'
                  title='Stop'>
                  <X size={12} /> Stop
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    pause();
                    haptic();
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50'
                  title='Pause'>
                  <Pause size={12} /> Pause
                </button>
                <button
                  onClick={() => {
                    stop();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50'
                  title='Stop'>
                  <X size={12} /> Stop
                </button>
              </>
            )}

            {/* +/- tiny controls */}
            {!running && (
              <div className='ml-auto inline-flex rounded-lg overflow-hidden border border-slate-200'>
                <button onMouseDown={() => startHold(-5)} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={() => startHold(-5)} onTouchEnd={endHold} onClick={dec} className='px-2 py-1.5 text-xs hover:bg-slate-50' title='-15s (hold for -5/s)'>
                  <Minus size={12} />
                </button>
                <button onMouseDown={() => startHold(+5)} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={() => startHold(+5)} onTouchEnd={endHold} onClick={inc} className='px-2 py-1.5 text-xs hover:bg-slate-50 border-l border-slate-200' title='+15s (hold for +5/s)'>
                  <Plus size={12} />
                </button>
                <button onClick={toggleEdit} className='px-2 py-1.5 text-xs hover:bg-slate-50 border-l border-slate-200' title='Edit mm:ss'>
                  <Edit3 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Presets (only when idle) */}
          {!running && (
            <div className='mt-1 flex items-center gap-1.5'>
              {[45, 60, 90, 120].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setSeconds(p);
                    haptic();
                  }}
                  className={`px-2 py-0.5 rounded-md border text-[10px] ${seconds === p ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  title={`${p}s`}>
                  {p}s
                </button>
              ))}

              {showInput && (
                <div className='relative ml-auto'>
                  <input ref={inputRef} type='text' defaultValue={toMMSS(seconds)} onBlur={commitInput} onKeyDown={e => e.key === 'Enter' && commitInput(e)} className='h-7 w-[76px] rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 tabular-nums' placeholder='mm:ss' />
                  <span className='absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 select-none'>mm:ss</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================== SETTINGS POPUP (alert sound picker) =================== */
function SettingsPopup({ open, onClose, currentSound, onChange, sounds = DEFAULT_SOUNDS }) {
  const [sel, setSel] = useState(currentSound || sounds[0]);
  useEffect(() => setSel(currentSound || sounds[0]), [currentSound]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[80] bg-black/30'>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className='mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl'>
            <div className='p-3 border-b border-slate-100 flex items-center justify-between'>
              <div className='font-semibold flex items-center gap-2'>
                <SettingsIcon size={18} /> Settings
              </div>
              <button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100'>
                <X size={16} />
              </button>
            </div>
            <div className='p-4 space-y-3'>
              <div className='text-sm font-medium'>Alert sound</div>
              <select value={sel} onChange={e => setSel(e.target.value)} className='w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm'>
                {sounds.map((s, i) => (
                  <option key={i} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className='flex items-center justify-end gap-2 pt-2'>
                <button onClick={onClose} className='px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50'>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onChange(sel);
                    onClose();
                  }}
                  className='px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100'>
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =================== MAIN PAGE =================== */
export default function MyWorkoutsPage() {
  const USER_ID = '36eae674-a063-4287-b378-e3cab0364b91';

  const [tab, setTab] = useState('workout');
  const [loading, setLoading] = useState(true);
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

  // audio + settings
  const audioRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSound, setAlertSound] = useState(DEFAULT_SOUNDS[2]);

  // audio hub
  const [audioOpen, setAudioOpen] = useState(false);
  const podcasts = [
    { title: 'Sunnah Bytes', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Health & Resilience', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  ];

  // media view state
  const [activeMedia, setActiveMedia] = useState('image');

  // local buffer control
  const [unsaved, setUnsaved] = useState(false);

  // mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // session timer ("Start Workout" big icon)
  const [sessionStart, setSessionStart] = useState(null);
  const elapsed = useElapsed(sessionStart);

  // last-saved values per set
  const lastSavedRef = useRef(new Map());

  // weekday mapping
  const jsDayToId = d => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';
  function pickTodayId(availableIds) {
    const todayId = jsDayToId(new Date().getDay());
    if (availableIds.includes(todayId)) return todayId;
    const pref = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    return pref.find(x => availableIds.includes(x)) || availableIds[0] || 'monday';
  }

  // ===== INIT: plan + session + prefetch ALL progress =====
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await fetchActivePlan(USER_ID);
        setPlan(p);
        const serverDays = p?.program?.days || [];
        const byId = Object.fromEntries(serverDays.map(d => [d.id, d]));
        const allIds = serverDays.map(d => d.id);
        const initialDayId = pickTodayId(allIds.length ? allIds : Object.keys(weeklyProgram));
        setSelectedDay(initialDayId);
        const dayProgram = byId[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: 'Workout', exercises: [] };
        const session = createSessionFromDay(dayProgram);
        setWorkout(session);
        setCurrentExId(session.exercises[0]?.id);
        setActiveMedia('image');
        // init lastSaved mirror
        const map = new Map();
        session.sets.forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
        lastSavedRef.current = map;
        // settings from localStorage
        const s = JSON.parse(localStorage.getItem(LOCAL_KEY_SETTINGS) || 'null');
        if (s?.alertSound) setAlertSound(s.alertSound);
        // prefetch ALL exercises progress for today (bug fix)
        const exNames = (dayProgram.exercises || []).map(e => e.name);
        const recordsByEx = await fetchAllDaySets(USER_ID, exNames, todayISO());
        applyServerRecords(session, recordsByEx, setWorkout, lastSavedRef);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // keep audio src in sync with settings
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.src = alertSound;
  }, [alertSound]);

  // change day
  function changeDay(dayId) {
    setSelectedDay(dayId);
    const byId = Object.fromEntries((plan?.program?.days || []).map(d => [d.id, d]));
    const dayProgram = byId[dayId] || weeklyProgram[dayId] || { id: dayId, name: 'Workout', exercises: [] };
    const session = createSessionFromDay(dayProgram);
    setWorkout(session);
    setCurrentExId(session.exercises[0]?.id);
    setActiveMedia('image');
    const map = new Map();
    session.sets.forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
    lastSavedRef.current = map;
    // also prefetch all records for that day
    (async () => {
      try {
        const exNames = (dayProgram.exercises || []).map(e => e.name);
        const recordsByEx = await fetchAllDaySets(USER_ID, exNames, todayISO());
        applyServerRecords(session, recordsByEx, setWorkout, lastSavedRef);
      } catch {}
    })();
  }

  // add/remove set
  function addSetForCurrentExercise() {
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
      // track unsaved buffer
      markUnsaved(next, setUnsaved);
      // mirror base
      const map = new Map(lastSavedRef.current);
      map.set(newSet.id, { weight: 0, reps: 0, done: false });
      lastSavedRef.current = map;
      return next;
    });
  }
  function removeSetFromCurrentExercise() {
    setWorkout(w => {
      const exSets = w.sets.filter(s => s.exId === currentExId);
      if (exSets.length <= 1) return w;
      const lastSetId = exSets[exSets.length - 1].id;
      const next = { ...w, sets: w.sets.filter(s => s.id !== lastSetId) };
      markUnsaved(next, setUnsaved);
      const map = new Map(lastSavedRef.current);
      map.delete(lastSetId);
      lastSavedRef.current = map;
      return next;
    });
  }

  // mark done + PR compute (local)
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
      markUnsaved(next, setUnsaved);
      return next;
    });
  }

  // save: day or single set
  function buildDailyPRPayload(exName) {
    const records = (workout?.sets || []).filter(s => s.exName === exName).map(s => ({ id: s.serverId, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, done: !!s.done, setNumber: Number(s.set) || 1 }));
    return { exerciseName: exName, date: todayISO(), records };
  }

  async function saveDayToServer() {
    const ex = workout?.exercises.find(e => e.id === currentExId);
    if (!ex) return;
    const payload = buildDailyPRPayload(ex.name);
    try {
      const data = await upsertDailyPR(USER_ID, payload.exerciseName, payload.date, payload.records);
      const serverRecords = data?.records || [];
      setWorkout(w => ({
        ...w,
        sets: w.sets.map(s => (s.exId === currentExId ? (serverRecords.find(r => Number(r.setNumber) === Number(s.set)) ? { ...s, serverId: serverRecords.find(r => Number(r.setNumber) === Number(s.set)).id } : s) : s)),
      }));
      await Promise.all([loadOverview(30), loadExerciseStats(ex.name, 90)]);
      // clear buffer after successful save
      flushLocalBufferForExercise(ex.name);
      setUnsaved(false);
    } catch (err) {
      console.error('Save day failed', err);
      // keep buffer in localStorage
      persistLocalBuffer(workout);
    }
  }

  async function maybeSaveSetOnBlur(setObj) {
    // NO auto-save; just detect changes to show Save button & buffer locally
    const prev = lastSavedRef.current.get(setObj.id) || { weight: 0, reps: 0, done: false };
    const changed = Number(prev.weight) !== Number(setObj.weight) || Number(prev.reps) !== Number(setObj.reps) || Boolean(prev.done) !== Boolean(setObj.done);
    if (changed) {
      setUnsaved(true);
      persistLocalBuffer({ ...workout });
    }
  }

  // stats loaders
  async function loadOverview(windowDays = 30) {
    const data = await fetchOverview(USER_ID, windowDays);
    setOverview(data || null);
    setHistory(Array.isArray(data?.history) ? data.history : []);
  }
  async function loadExerciseStats(name, windowDays = 90) {
    const { series, topSets, attempts } = await fetchExerciseStats(USER_ID, name, windowDays);
    setSeries(series);
    setTopSets(topSets);
    setAttempts(attempts);
  }

  // helpers
  const hasExercises = !!workout?.exercises?.length;
  const currentExercise = workout?.exercises.find(e => e.id === currentExId);
  const currentSets = (workout?.sets || []).filter(s => s.exId === currentExId);

  const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  const dayTabs = weekOrder.filter(d => (plan?.program?.days || []).some(x => x.id === d) || weeklyProgram[d]).map(d => ({ key: d, label: d, name: (plan?.program?.days || []).find(x => x.id === d)?.name || weeklyProgram[d].name }));

  return (
    <div className='space-y-5 sm:space-y-6'>
      {/* alert sound audio */}
      <audio ref={audioRef} src={alertSound} preload='auto' />

      <div className='flex items-center justify-between flex-wrap gap-2 sm:gap-3'>
        <PageHeader className='max-md:!hidden' icon={Dumbbell} title='My Workouts' subtitle='Log sets and track PRs automatically.' />
        <div className='flex items-center gap-2 w-full'>
          <button onClick={() => setAudioOpen(v => !v)} className=' px-2 inline-flex items-center gap-2 rounded-xl   bg-indigo-500 cursor-pointer text-white h-[37px] max-md:w-[37px]  justify-center text-sm font-medium  shadow hover:bg-indigo-700 active:scale-95 transition'>
            <Headphones size={16} /> <span className='max-md:hidden'> Listen </span>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className='cursor-pointer px-2 inline-flex items-center gap-2 rounded-xl 
                 bg-slate-100 text-slate-800 h-[37px] max-md:w-[37px]  justify-center text-sm font-medium
                 shadow hover:bg-slate-200 active:scale-95 transition'>
            <SettingsIcon size={16} /> <span className='max-md:hidden'> Settings </span>
          </button>

          <button onClick={() => setTab('workout')} className={`md:hidden cursor-pointer px-2 inline-flex items-center gap-2 rounded-xl bg-slate-100 text-slate-800 h-[37px] max-md:w-[37px]  justify-center text-sm font-medium shadow hover:bg-slate-200 active:scale-95 transition ${tab == 'workout' && 'bg-main'} `}>
            <Dumbbell size={16} />
          </button>
          <button onClick={() => setTab('history')} className={`md:hidden cursor-pointer px-2 inline-flex items-center gap-2 rounded-xl bg-slate-100 text-slate-800 h-[37px] max-md:w-[37px]  justify-center text-sm font-medium shadow hover:bg-slate-200 active:scale-95 transition ${tab == 'history' && 'bg-main'} `}>
            <HistoryIcon size={16} />
          </button>

          <TabsPill
            className={'max-md:hidden'}
            id='my-workouts-tabs'
            tabs={[
              { key: 'workout', label: 'Workout', icon: Dumbbell },
              { key: 'history', label: 'History', icon: HistoryIcon },
            ]}
            active={tab}
            onChange={k => setTab(k)}
          />

          <div className='flex items-center gap-2 flex-1 w-full justify-end  '>
            <button onClick={() => setDrawerOpen(true)} className='md:hidden inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50'>
              <MenuIcon size={16} /> Exercises
            </button>
          </div>
        </div>
      </div>

      <AudioHubInline open={audioOpen} onClose={() => setAudioOpen(false)} podcasts={podcasts} />

      {/* top bar: day selector + start workout big icon + session time */}
      {tab === 'workout' && (
        <div className='rounded-2xl sm:border sm:border-slate-200 sm:bg-white  sm:p-3'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex-1'>
              <TabsPill className={'!rounded-xl'} slice={3} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />
            </div>
          </div>
        </div>
      )}

      {/* WORKOUT */}
      {tab === 'workout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          {loading ? (
            <div className='space-y-3'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='h-16 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse' />
              ))}
            </div>
          ) : (
            <div className='space-y-5 sm:space-y-6'>
              <div className='rounded-2xl md:border md:border-slate-200 bg-white md:p-2 sm:p-4'>
                {workout && (
                  <div className='flex flex-col lg:flex-row gap-4'>
                    {/* LEFT */}
                    <div className='w-full lg:flex-1 min-w-0'>
                      <div className='rounded-xl border border-slate-200 bg-white overflow-hidden'>
                        {!hasExercises && (
                          <div className='p-6'>
                            <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
                              <div className='mx-auto mb-3 w-12 h-12 rounded-full bg-white shadow grid place-items-center'>
                                <Dumbbell size={18} className='text-slate-500' />
                              </div>
                              <div className='text-base font-semibold text-slate-700'>Not found for this day</div>
                              <div className='text-sm text-slate-500 mt-1'>Pick another day from the tabs above.</div>
                            </div>
                          </div>
                        )}
                        {hasExercises && (
                          <>
                            {/* Media area: fixed height 400px, object-contain videos, inline playback */}
                            <div className='w-full bg-black relative rounded-[10px_10px_0_0] overflow-hidden' style={{ height: 200 }}>
                              {currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? <InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} /> : <img key={currentExercise?.id + '-image'} src={currentExercise?.img} alt={currentExercise?.name || 'Exercise'} className='w-full h-full object-contain bg-white ' />}
                              <div className='absolute bottom-2 right-2 flex items-center gap-2 bg-black/40 backdrop-blur px-2 py-1 rounded-lg'>
                                <button onClick={() => setActiveMedia('image')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'image' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show image'>
                                  <ImageIcon size={14} />
                                </button>
                                <button onClick={() => setActiveMedia('video')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'video' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show video' disabled={!currentExercise?.video}>
                                  <VideoIcon size={14} />
                                </button>
                                {currentExercise?.video2 && (
                                  <button onClick={() => setActiveMedia('video2')} className={`text-xs px-2 py-1 rounded ${activeMedia === 'video2' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`} title='Show video 2' disabled={!currentExercise?.video2}>
                                    <VideoIcon size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Rest timer */}
                            <RestTimerCard initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise?.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise?.rest : 90} audioEl={audioRef} className='mt-1' />

                            {/* SETS TABLE */}
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
                                          <input type='string' value={s.weight} onChange={e => setWorkout(w => ({ ...w, sets: w.sets.map(x => (x.id === s.id ? { ...x, weight: +e.target.value } : x)) }))} onBlur={() => maybeSaveSetOnBlur({ ...s, weight: Number(s.weight) })} className='h-9 w-[72px] !text-[16px] rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition' placeholder='0' inputMode='numeric' />
                                        </td>
                                        <td className='py-2.5 px-3'>
                                          <input type='string' value={s.reps} onChange={e => setWorkout(w => ({ ...w, sets: w.sets.map(x => (x.id === s.id ? { ...x, reps: +e.target.value } : x)) }))} onBlur={() => maybeSaveSetOnBlur({ ...s, reps: Number(s.reps) })} className='h-9 w-[72px] !text-[16px] rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition' placeholder='0' inputMode='numeric' />
                                        </td>
                                        <td className='py-2.5 px-3'>
                                          <CheckBox
                                            initialChecked={s.done}
                                            onChange={() => {
                                              toggleDone(s.id);
                                              setUnsaved(true);
                                              persistLocalBuffer({ ...workout });
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
                                  <button onClick={removeSetFromCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50' disabled={currentSets.length <= 1}>
                                    <Minus size={14} />
                                  </button>
                                  <button onClick={addSetForCurrentExercise} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <div className='flex items-center gap-2'>
                                  {unsaved && <span className='text-xs text-amber-600'>Unsaved changes buffered locally</span>}
                                  <button onClick={saveDayToServer} className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 hover:bg-indigo-100' title='Save/Upsert this exercise day'>
                                    <SaveIcon size={14} /> Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Exercise list */}
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
          )}
        </motion.div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-4'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3'>
            <KPI title='Exercises Tracked' value={fmtVal(overview?.totals?.exercisesTracked)} icon={Dumbbell} />
            <KPI title='Total Attempts' value={fmtVal(overview?.totals?.attempts)} icon={TrendingUp} />
            <KPI title='All-time PRs' value={fmtVal(overview?.totals?.allTimePrs)} icon={Trophy} />
            <KPI title='Current Streak (days)' value={fmtVal(overview?.totals?.currentStreakDays)} icon={Flame} />
          </div>
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

      {/* floating unsaved hint on mobile */}
      <AnimatePresence>
        {unsaved && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className='fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-1.5 shadow'>
            Changes are stored locally until you press Save.
          </motion.div>
        )}
      </AnimatePresence>

      {/* mobile slide-out drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[75] bg-black/30' onClick={() => setDrawerOpen(false)} />
            {/* Drawer panel */}
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

      {/* Settings popup (alert sound selector) */}
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

function AudioHubInline({ open, onClose }) {
  const audioRef = useRef(null);

  // ---- Demo podcasts (YouTube) ----
  const podcasts = ['https://www.youtube.com/watch?v=RFRLVUb2GUM', 'https://www.youtube.com/watch?v=RFRLVUb2GUM'];

  const [tab, setTab] = useState('stations'); // 'stations' | 'podcasts'
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);

  // IMPORTANT: use HTTPS streams to avoid mixed-content blocking on HTTPS pages
  const DEFAULT_STATIONS = [
    { name: 'Qur’an Radio (Mix)', url: 'https://qurango.net/radio/mix', tag: 'Qur’an' },
    { name: 'Hadith Radio', url: 'https://qurango.net/radio/ahadeeth', tag: 'Hadith' },
    { name: 'Tafsir / Lectures', url: 'https://qurango.net/radio/tafsir', tag: 'Lectures' },
    { name: 'Dua & Supplications', url: 'https://qurango.net/radio/dua', tag: 'Dua' },
  ];
  const [stations] = useState(DEFAULT_STATIONS);
  const [currentStationUrl, setCurrentStationUrl] = useState(stations[0]?.url || '');

  // ---- Normalize YouTube list ----
  const normalizeYouTube = arr => {
    const getId = u => {
      try {
        const url = new URL(u);
        if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
        if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
      } catch {}
      return null;
    };
    return (arr || []).map((item, idx) => {
      const url = typeof item === 'string' ? item : item?.url || '';
      const id = getId(url) || `yt_${idx}`;
      return {
        id,
        url,
        title: typeof item === 'string' ? `YouTube Video ${idx + 1}` : item?.title || `YouTube Video ${idx + 1}`,
        embed: id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : '',
        thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
      };
    });
  };
  const podcastList = normalizeYouTube(podcasts);
  const [currentPodcastIdx, setCurrentPodcastIdx] = useState(0);

  // Derived src
  const src = tab === 'stations' ? currentStationUrl : undefined;

  // Volume/mute wire-up
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Pause when closing the box
  useEffect(() => {
    if (!open) {
      try {
        audioRef.current?.pause();
      } catch {}
      setPlaying(false);
      setLoading(false);
    }
  }, [open]);

  // Audio event handlers (robust)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoadStart = () => setLoading(true);
    const onWaiting = () => setLoading(true);
    const onStalled = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onCanPlayThrough = () => setLoading(false);
    const onLoadedData = () => setLoading(false);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onError = () => {
      setLoading(false);
      setPlaying(false);
    };

    el.addEventListener('loadstart', onLoadStart);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('stalled', onStalled);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('canplaythrough', onCanPlayThrough);
    el.addEventListener('loadeddata', onLoadedData);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);

    return () => {
      el.removeEventListener('loadstart', onLoadStart);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('stalled', onStalled);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('canplaythrough', onCanPlayThrough);
      el.removeEventListener('loadeddata', onLoadedData);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
    };
  }, [src]);

  // Choose station (don’t hard-disable play if autoplay is blocked)
  const chooseStation = async url => {
    setPlaying(false);
    if (url === currentStationUrl) return;
    setLoading(true);
    setCurrentStationUrl(url);
    try {
      await audioRef.current?.play();
    } catch {
      // clear loading so user can click Play manually
      setLoading(false);
    }
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      try {
        el.pause();
        setPlaying(false);
      } catch {}
    } else {
      try {
        setLoading(true);
        await el.play(); // if user gesture present, should succeed
        // playing event will clear loading
      } catch {
        // if it fails, stop spinner
        setLoading(false);
      }
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className='w-full'>
        <div className='mt-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
          {/* Header */}
          <div className='px-3 py-2 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white'>
            <div className='flex items-center gap-2 font-semibold text-sm text-slate-800'>
              <Headphones size={16} className='text-indigo-600' />
              Audio
            </div>
            <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-slate-100'>
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className='px-3 pt-2'>
            <div className='inline-flex rounded-lg bg-slate-100 p-1'>
              {[
                { key: 'stations', label: 'Stations' },
                { key: 'podcasts', label: 'Podcasts' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`relative px-2.5 py-1 text-xs rounded-md transition ${tab === t.key ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}>
                  {t.label}
                  {tab === t.key && <motion.span layoutId='audTab' className='absolute inset-0 -z-10 rounded-md bg-white shadow' transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className='p-3 space-y-2'>
            {/* Stations */}
            {tab === 'stations' && (
              <>
                <div className='grid  grid-cols-4 gap-1.5'>
                  {stations.map((s, i) => {
                    const active = currentStationUrl === s.url;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          chooseStation(s.url);
                        }}
                        className={`text-left p-2 rounded-lg border transition group
                          ${active ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:bg-slate-50'}
                        `}
                        title={s.name}>
                        <div className='text-xs font-medium truncate'>{s.name}</div>
                        <div className='text-[10px] text-slate-500 truncate'>{s.tag || 'Station'}</div>
                      </button>
                    );
                  })}
                </div>

                <div className='flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2'>
                  <div className='text-[11px] truncate'>
                    <span className='font-medium'>Now:</span> {stations.find(s => s.url === currentStationUrl)?.name || 'Station'}
                  </div>

                  <div className='flex items-center gap-1.5'>
                    <button onClick={togglePlay} className='inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs border-slate-200 hover:bg-slate-50 min-w-[88px] justify-center' aria-busy={loading ? 'true' : 'false'} title={loading ? 'Loading…' : playing ? 'Pause' : 'Play'}>
                      {playing ? (
                        <>
                          <Pause size={12} /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={12} /> Play
                        </>
                      )}
                    </button>

                    <button onClick={() => setMuted(m => !m)} className='inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs border-slate-200 hover:bg-slate-50' title={muted ? 'Unmute' : 'Mute'}>
                      {muted ? '🔇' : '🔊'}
                    </button>

                    <input type='range' min='0' max='1' step='0.01' value={muted ? 0 : volume} onChange={e => setVolume(Number(e.target.value))} className='w-20 accent-indigo-600' title='Volume' />
                  </div>
                </div>
              </>
            )}

            {/* Podcasts (YouTube) */}
            {tab === 'podcasts' && (
              <div className='space-y-2'>
                {podcastList.length > 0 ? (
                  <div className='aspect-video w-full rounded-lg overflow-hidden border border-slate-200'>
                    <iframe key={podcastList[currentPodcastIdx].id} src={podcastList[currentPodcastIdx].embed} className='w-full h-full' title={podcastList[currentPodcastIdx].title} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' referrerPolicy='strict-origin-when-cross-origin' loading='lazy' allowFullScreen />
                  </div>
                ) : (
                  <div className='text-xs text-slate-500'>No YouTube links yet.</div>
                )}

                <div className='flex gap-1.5 overflow-x-auto pb-1'>
                  {podcastList.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentPodcastIdx(i)}
                      className={`min-w-[120px] max-w-[120px] rounded-md border overflow-hidden text-left
                        ${i === currentPodcastIdx ? 'border-indigo-300' : 'border-slate-200 hover:border-slate-300'}
                      `}
                      title={p.title}>
                      <img src={p.thumb} alt='' className='w-full h-[68px] object-cover' />
                      <div className='px-2 py-1'>
                        <div className='text-[10px] font-medium line-clamp-2'>{p.title}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Audio element (keep crossorigin to help some streams) */}
            <audio ref={audioRef} src={src} preload='none' crossOrigin='anonymous' />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* =================== SMALL COMPONENTS & HELPERS =================== */

// Inline video: fixed 400px height, object-contain, inline playback (no fullscreen push)
function InlineVideo({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        await el.play();
        setPlaying(true);
      }
    } catch {}
  };

  return (
    <div className='w-full h-full grid place-items-center'>
      <video muted ref={ref} src={src} className='w-full h-full object-contain bg-black' playsInline controls onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} style={{ maxHeight: 400 }} />
      {/* Click overlay for quick play/pause on mobile if you want:
      <button onClick={toggle} className='absolute inset-0' aria-label='toggle' />
      */}
    </div>
  );
}

// Exercise list (used on the right pane and mobile drawer)
function ExerciseList({ workout, currentExId, onPick }) {
  const setsFor = exId => (workout?.sets || []).filter(s => s.exId === exId);
  if (!workout?.exercises?.length) {
    return <div className='text-sm text-slate-500'>Nothing here yet.</div>;
  }
  return (
    <div className='space-y-2'>
      {workout.exercises.map((ex, idx) => {
        const done = setsFor(ex.id).filter(s => s.done).length;
        const total = setsFor(ex.id).length;
        const active = currentExId === ex.id;
        return (
          <button key={ex.id} onClick={() => onPick?.(ex)} className={`w-full text-left p-3 rounded-xl border transition ${active ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 overflow-hidden rounded-lg bg-slate-100 grid place-items-center'>{ex.img ? <img src={ex.img} alt='' className='object-cover w-full h-full' /> : <Dumbbell size={16} className='text-slate-500' />}</div>
              <div className='min-w-0 flex-1'>
                <div className='font-medium truncate'>
                  {idx + 1}. {ex.name}
                </div>
                <div className='text-xs opacity-70'>
                  {total} × {ex.targetReps} • Rest {Number.isFinite(ex.rest ?? ex.restSeconds) ? ex.rest ?? ex.restSeconds : 90}s
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
  );
}

// Create a session object from a day program (2 starter sets per exercise)
function createSessionFromDay(dayProgram) {
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
        restTime: Number.isFinite(ex.rest ?? ex.restSeconds) ? ex.rest ?? ex.restSeconds : 90,
      })),
    ),
    exercises: (dayProgram.exercises || []).map(e => ({ ...e })),
  };
}

// Prefill all sets from server records in a single pass (bug fix you wanted)
function applyServerRecords(session, recordsByEx, setWorkout, lastSavedRef) {
  const nextSets = (session.sets || []).map(s => {
    const rr = (recordsByEx?.[s.exName] || []).find(r => Number(r.setNumber) === Number(s.set));
    if (!rr) return s;
    return {
      ...s,
      serverId: rr.id,
      weight: Number(rr.weight) || 0,
      reps: Number(rr.reps) || 0,
      done: !!rr.done,
      pr: !!rr.isPr,
    };
  });
  const next = { ...session, sets: nextSets };
  setWorkout(next);
  // refresh last-saved mirror
  const map = new Map();
  nextSets.forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
  lastSavedRef.current = map;
}

// Lightweight elapsed hook for the session timer
function useElapsed(startTs) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startTs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startTs]);
  return startTs ? now - startTs : 0;
}
function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

// Unsaved handling: mark + persist local buffer
function markUnsaved(workout, setUnsaved) {
  try {
    persistLocalBuffer(workout);
  } catch {}
  setUnsaved(true);
}
function persistLocalBuffer(workout) {
  if (!workout) return;
  // Store minimal buffer: by exercise -> array of {set, weight, reps, done}
  const buf = {};
  (workout.exercises || []).forEach(ex => {
    buf[ex.name] = (workout.sets || []).filter(s => s.exName === ex.name).map(s => ({ set: s.set, weight: s.weight, reps: s.reps, done: !!s.done }));
  });
  localStorage.setItem(LOCAL_KEY_BUFFER, JSON.stringify({ date: todayISO(), data: buf }));
}
function flushLocalBufferForExercise(exName) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_BUFFER);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return;
    delete parsed.data[exName];
    localStorage.setItem(LOCAL_KEY_BUFFER, JSON.stringify(parsed));
  } catch {}
}

/* =================== KPI & TopList (already used above) =================== */
function KPI({ title, value, icon: Icon }) {
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
