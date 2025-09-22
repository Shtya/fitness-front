'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '@/components/dashboard/ui/DataTable';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, History as HistoryIcon, Clock, X, Play, Pause, Minus, Plus, Video as VideoIcon, Images, Shuffle, Trophy, TrendingUp, Flame, Save as SaveIcon, ImageIcon, Edit3, Headphones, Radio, Settings as SettingsIcon, Menu as MenuIcon, Volume2, VolumeX, RotateCw, Square, Activity, EyeOff, Eye } from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api from '@/utils/axios';
import weeklyProgram from './exercises';
import Button from '@/components/atoms/Button';

/* =================== CONSTANTS =================== */
const DEFAULT_SOUNDS = ['/sounds/1.mp3', '/sounds/2.mp3', '/sounds/alert1.mp3', '/sounds/alert2.mp3', '/sounds/alert3.mp3', '/sounds/alert4.mp3', '/sounds/alert5.mp3', '/sounds/alert6.mp3', '/sounds/alert7.mp3', '/sounds/alert8.mp3'];
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
  // const { data } = await api.get('/plans/active',
  //  { params: { userId } });
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

// ADD: fetch the last occurrence of a weekday and normalize to { [exerciseName]: records[] }
async function fetchLastDayByName(userId, day, onOrBefore) {
  const { data } = await api.get('/prs/last-day/by-name', {
    params: { userId, day, onOrBefore }, // e.g. day='sunday'
  });

  const recordsByExercise = Object.fromEntries((data?.exercises || []).map(e => [e.exerciseName, e.records || []]));

  return {
    date: data?.date || null, 
    day: data?.day || null, 
    recordsByExercise, 
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

/* =================== REST TIMER CARD =================== */
function RestTimerCard({ alerting, setAlerting, initialSeconds, audioEl, className = '' }) {
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();
  const [seconds, setSeconds] = useState(Number(initialSeconds || 0) || 90);
  const [showInput, setShowInput] = useState(false);

  const inputRef = useRef(null);
  const holdRef = useRef(null);

  const alertTimeoutRef = useRef(null);
  const hasAlertFiredRef = useRef(false); // <— prevents re-firing at 0s

  useEffect(() => setSeconds(Number(initialSeconds || 0) || 90), [initialSeconds]);

  // Stop alert helper
  const stopAlert = () => {
    try {
      const el = audioEl?.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
        el.loop = false;
      }
    } catch {}
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setAlerting(false);
  };

  useEffect(() => {
    if (!running && duration > 0 && remaining === 0 && !hasAlertFiredRef.current) {
      const el = audioEl?.current;
      if (!el) return;
      try {
        el.currentTime = 0;
        el.loop = true;
        el.play();
        setAlerting(true);
        hasAlertFiredRef.current = true; // block re-trigger until next start
        alertTimeoutRef.current = setTimeout(() => {
          stopAlert();
        }, 30000);
      } catch {}
    }
    return () => {
      if (alertTimeoutRef.current && alerting) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [running, remaining, duration, audioEl]);

  // Haptics (mobile)
  const haptic = (ms = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator)
      try {
        navigator.vibrate(ms);
      } catch {}
  };

  // Time controls
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
    // Reset finish guard for a fresh countdown
    hasAlertFiredRef.current = false;
    stopAlert(); // in case an old alert is still looping
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
        {/* Left: tiny ring (stop also silences alert) */}
        <button
          onClick={() => {
            if (running) {
              stop();
              stopAlert();
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

        {/* Stop sound (only while alert is looping) */}
        {alerting && (
          <button onClick={stopAlert} className='inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 px-2.5 py-1 text-xs hover:bg-red-100' title='Stop alert sound'>
            <X size={12} /> Stop sound
          </button>
        )}

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
                    stopAlert();
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
                    stopAlert();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50'
                  title='Stop'>
                  <X size={12} /> Stop
                </button>
              </>
            )}

            {/* +/- tiny controls (only when idle) */}
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
  const [playingUrl, setPlayingUrl] = useState(null); // which sound is currently playing
  const audioRef = useRef(null);

  useEffect(() => {
    setSel(currentSound || sounds[0]);
  }, [currentSound, sounds]);

  // Cleanup audio on unmount/close
  useEffect(() => {
    if (!open) stopAudio();
    return () => stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    setPlayingUrl(null);
  };

  const playAudio = async url => {
    // if clicking the currently playing item => stop it
    if (playingUrl === url) {
      stopAudio();
      return;
    }
    // stop any previous sound
    stopAudio();
    // start new sound
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingUrl(null);
    try {
      await audio.play();
      setPlayingUrl(url);
    } catch {
      // autoplay blocked or other error
      setPlayingUrl(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[80] bg-black/30'>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className='mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl' role='dialog' aria-modal='true' aria-label='Settings'>
            {/* Header */}
            <div className='p-3 border-b border-slate-100 flex items-center justify-between'>
              <div className='font-semibold flex items-center gap-2'>
                <SettingsIcon size={18} /> Settings
              </div>
              <button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100' aria-label='Close'>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className='p-4 space-y-3'>
              <div className='text-sm font-medium'>Alert sound</div>

              {/* Scrollable list: fixed height 300px with overflow */}
              <div className='h-[300px] overflow-auto rounded-xl border border-slate-200'>
                <ul className='divide-y divide-slate-200'>
                  {sounds.map((url, i) => {
                    const isSelected = sel === url;
                    const isPlaying = playingUrl === url;
                    return (
                      <li
                        key={url}
                        className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer
                          ${isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'}`}
                        onClick={() => setSel(url)}
                        aria-selected={isSelected}>
                        <div className='flex items-center gap-2'>
                          <span className={`inline-block h-2 w-2 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                          <span className='text-sm'>{`Sound ${i + 1}`}</span>
                          {isSelected && <span className='ml-1 text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700'>Selected</span>}
                          {isPlaying && <span className='ml-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700'>Playing</span>}
                        </div>

                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation();
                            playAudio(url);
                          }}
                          className='p-2 rounded-lg hover:bg-slate-100'
                          aria-label={isPlaying ? 'Stop preview' : 'Play preview'}>
                          {isPlaying ? <Square size={16} /> : <Play size={16} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Footer */}
              <div className='flex items-center justify-end gap-2 pt-2'>
                <button
                  onClick={() => {
                    stopAudio();
                    onClose();
                  }}
                  className='px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50'>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    stopAudio();
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
  const [hidden, setHidden] = useState(false); // for hidden tap Quran 

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

  // audio hub
  const [audioOpen, setAudioOpen] = useState(false);
  const podcasts = [
    { title: 'Sunnah Bytes', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Health & Resilience', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  ];

  const [activeMedia, setActiveMedia] = useState('image');
  const [unsaved, setUnsaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastSavedRef = useRef(new Map());
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
        // const exNames = (dayProgram.exercises || []).map(e => e.name);
        // const recordsByEx = await fetchAllDaySets(USER_ID, exNames, todayISO());
        // applyServerRecords(session, recordsByEx, setWorkout, lastSavedRef);

        const { recordsByExercise } = await fetchLastDayByName(USER_ID, initialDayId, todayISO());
        applyServerRecords(session, recordsByExercise, setWorkout, lastSavedRef);
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
        const { recordsByExercise } = await fetchLastDayByName(
          USER_ID,
          dayId, // the tab you clicked: 'sunday', 'monday', etc.
          todayISO(),
        );
        applyServerRecords(session, recordsByExercise, setWorkout, lastSavedRef);
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

  const [loadingSaveDays, setLoadingSaveDays] = useState(false);
  async function saveDayToServer() {
    const ex = workout?.exercises.find(e => e.id === currentExId);
    if (!ex) return;
    const payload = buildDailyPRPayload(ex.name);
    try {
      setLoadingSaveDays(true);
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

    setLoadingSaveDays(false);
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

      {/* ========================= WORKOUTS HEADER (Nutrition-style) ========================= */}
      <div className='  rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
        {/* Primary banner */}
        <div className='relative p-4 md:p-8  bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            {/* Title */}
            <PageHeader className='max-lg:!hidden' icon={Dumbbell} title='My Workouts' subtitle='Log sets and track PRs automatically.' />

            {/* Actions (right) */}
            <div className='flex items-center gap-2'>
              {/* Listen (like Nutrition's Grocery button) */}
              <button onClick={() => { !hidden && setAudioOpen(v => !v); setHidden(false) }} className='px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition' aria-label='Listen'>
                <Headphones size={16} />
                <span className='max-md:hidden'>Listen</span>
              </button>

              {/* Settings (like Nutrition's Calc button) */}
              <button onClick={() => setSettingsOpen(true)} className='px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition' aria-label='Settings'>
                <SettingsIcon size={16} />
                <span className='max-md:hidden'>Settings</span>
              </button>

              {/* Mobile tab toggles (icons only) */}
              <button onClick={() => setTab('workout')} className={`md:hidden px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium hover:bg-white/20 active:scale-95 transition ${tab === 'workout' ? 'ring-1 ring-white/50' : ''}`} aria-label='Workout tab'>
                <Dumbbell size={16} />
              </button>
              <button onClick={() => setTab('history')} className={`md:hidden px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium hover:bg-white/20 active:scale-95 transition ${tab === 'history' ? 'ring-1 ring-white/50' : ''}`} aria-label='History tab'>
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
              <button onClick={() => setDrawerOpen(true)} className=' inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:opacity-80 '>
                <MenuIcon size={16} /> Exercises
              </button>
            </div>
          </div>
        </div>

        {/* Secondary bar: right-aligned Exercises drawer on mobile */}
        <div className='px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white'>
          {tab === 'workout' && (
            <div className='flex-1'>
              <TabsPill className={'!rounded-xl'} slice={3} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />
            </div>
          )}
        </div>
      </div>

      <AudioHubInline hidden={hidden} setHidden={setHidden} alerting={alerting} setAlerting={setAlerting} open={audioOpen} onClose={() => setAudioOpen(false)} podcasts={podcasts} />

      {/* WORKOUT */}
      {tab === 'workout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          {loading ? (
            <div className='grid grid-cols-[1fr_300px] max-md:grid-cols-1  gap-3 '>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className='space-y-4'>
                <div className='space-y-3'>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={`relative h-16 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 shimmer`} />
                  ))}
                </div>

                {/* Media panel shimmer (400px area to match video/image region) */}
                <div className='relative h-[200px] md:h-[275px] rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 shimmer' />
              </motion.div>

              <div className='rounded-2xl h-fit  bg-white '>
                <div className='flex flex-wrap flex-col gap-2'>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className='relative h-8 w-full rounded-xl border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 shimmer' />
                  ))}
                </div>
              </div>
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
                            <div className='w-full relative rounded-[10px_10px_0_0] overflow-hidden md:!h-[275px] ' style={{ height: 200 }}>
                              {currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? <InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} /> : <img key={currentExercise?.id + '-image'} src={currentExercise?.img} alt={currentExercise?.name} className='w-full h-full object-contain bg-white ' />}

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
                            <RestTimerCard alerting={alerting} setAlerting={setAlerting} initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise?.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise?.rest : 90} audioEl={audioRef} className='mt-1' />

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
                                <Button color='secondary' loading={loadingSaveDays} icon={<SaveIcon size={14} />} name={'Save'} onClick={saveDayToServer} className=' !px-2 !text-sm  !py-1 !w-fit' />
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
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className='fixed bottom-4 w-[90%] max-w-fit  text-nowrap truncate left-1/2 -translate-x-1/2 z-40 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs flex justify-center text-center px-3 py-1.5 shadow'>
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

function AudioHubInline({ open, onClose, alerting , hidden, setHidden }) {
  const audioRef = useRef(null);
  const wasPlayingBeforeAlertRef = useRef(false);

  // --- Stations ---
  const DEFAULT_STATIONS = useMemo(
    () => [
      { name: 'Qur’an Radio (Mix)', url: 'https://qurango.net/radio/mix', tag: 'General' },
      { name: 'Abdulbasit (Murattal)', url: 'https://qurango.net/radio/abdulbasit_abdulsamad', tag: 'Recitation' },
      { name: 'Husary (Murattal)', url: 'https://qurango.net/radio/mahmoud_khalil_alhussary', tag: 'Recitation' },
      { name: 'Saad Al-Ghamdi', url: 'https://qurango.net/radio/saad_alghamdi', tag: 'Recitation' },
      { name: 'Shuraim', url: 'https://qurango.net/radio/saud_alshuraim', tag: 'Recitation' },
    ],
    [],
  );

  const podcastsSeed = [
		"https://www.youtube.com/watch?v=kEEpRIMK6Y0&t=1597s",
		"https://www.youtube.com/watch?v=_v05Yc7AdOQ",
		"https://www.youtube.com/watch?v=-W6ijtUgXiU" ,
		"https://www.youtube.com/watch?v=agFMbV32JIc&t=1516s",
		"https://www.youtube.com/watch?v=_85D3CqkoxA",
		"https://www.youtube.com/watch?v=DdxrQV_bkkY",
		"https://www.youtube.com/watch?v=f8croUJLd3Y&t=152s&pp=0gcJCeAJAYcqIYzv",
		"https://www.youtube.com/watch?v=c6cJ9bbEQa0",
		"https://www.youtube.com/watch?v=2faCQ0oQCG4",
		"https://www.youtube.com/watch?v=63_AOCldyXo&t=3036s",
		"https://www.youtube.com/watch?v=nkil1U1GxdA",
		"https://www.youtube.com/watch?v=zaA_bsanOWw",
		"https://www.youtube.com/watch?v=RvZLqmV9_SI&t=309s&pp=0gcJCeAJAYcqIYzv",
		"https://www.youtube.com/watch?v=yiDqY3YB9RU",
		"https://www.youtube.com/watch?v=5F6sCVhg0uc",
		"https://www.youtube.com/watch?v=b8O3yLCbwTg",
		"https://www.youtube.com/watch?v=bGW1NecvGGc",
		'https://www.youtube.com/watch?v=PEu6zGl7qN4', 
		'https://www.youtube.com/watch?v=dxYI6cluroI', 
		'https://www.youtube.com/watch?v=y2ShgKJn1NA', 
		'https://www.youtube.com/watch?v=RFRLVUb2GUM'
	];
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [podcastList, setPodcastList] = useState([]);
  const [currentPodcastIdx, setCurrentPodcastIdx] = useState(0);

  // ===== Helpers =====
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
      const id = getId(item) || `yt_${idx}`;
      return {
        id,
        url: item,
        title: `Podcast ${idx + 1}`,
        embed: id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : '',
        thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
      };
    });
  };

  useEffect(() => {
    setPodcastsLoading(true);
    const t = setTimeout(() => {
      setPodcastList(normalizeYouTube(podcastsSeed));
      setPodcastsLoading(false);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI
  const [tab, setTab] = useState((typeof window !== 'undefined' && localStorage.getItem('audio.tab')) || 'stations');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [watchdog, setWatchdog] = useState(null);

  const [stations] = useState(DEFAULT_STATIONS);
  const [currentStationUrl, setCurrentStationUrl] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_STATIONS[0]?.url || '';
    return localStorage.getItem('audio.station') || DEFAULT_STATIONS[0]?.url || '';
  });

  const [volume, setVolume] = useState(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('audio.volume') : null;
    return v ? Number(v) : 0.9;
  });
  const [muted, setMuted] = useState(() => typeof window !== 'undefined' && localStorage.getItem('audio.muted') === '1');

  // Persist simple state
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('audio.tab', tab);
  }, [tab]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio.volume', String(volume));
      localStorage.setItem('audio.muted', muted ? '1' : '0');
    }
  }, [volume, muted]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('audio.station', currentStationUrl);
  }, [currentStationUrl]);

  // Apply volume/mute to element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Media events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoadStart = () => {
      setErrorMsg(null);
      setLoading(true);
      armWatchdog();
    };
    const onWaiting = () => {
      setLoading(true);
      armWatchdog();
    };
    const onStalled = () => {
      setLoading(true);
      armWatchdog();
    };
    const onCanPlay = () => {
      clearWatchdog();
      setLoading(false);
    };
    const onCanPlayThrough = () => {
      clearWatchdog();
      setLoading(false);
    };
    const onLoadedData = () => {
      clearWatchdog();
      setLoading(false);
    };
    const onPlaying = () => {
      clearWatchdog();
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => {
      clearWatchdog();
      setPlaying(false);
      setLoading(false);
    };
    const onEnded = () => {
      clearWatchdog();
      setPlaying(false);
      setLoading(false);
    };
    const onError = () => {
      clearWatchdog();
      setLoading(false);
      setPlaying(false);
      setErrorMsg('Stream error. Try another station.');
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
      clearWatchdog();
    };
  }, [currentStationUrl]);

  // Keep src in sync (don’t autoplay here; chooseStation handles it)
  useEffect(() => {
    if (!audioRef.current) return;
    try {
      audioRef.current.pause();
    } catch {}
    audioRef.current.load();
    setLoading(false);
    setErrorMsg(null);
  }, [currentStationUrl]);

  // Close = STOP audio
  useEffect(() => {
    if (!open) {
      try {
        audioRef.current?.pause();
      } catch {}
      setPlaying(false);
      setLoading(false);
      setErrorMsg(null);
    }
  }, [open]);

  // Alerting: pause when true, resume when false if it was playing
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (alerting) {
      wasPlayingBeforeAlertRef.current = playing;
      try {
        el.pause();
      } catch {}
      setPlaying(false);
    } else if (wasPlayingBeforeAlertRef.current) {
      (async () => {
        try {
          setLoading(true);
          await el.play();
          setPlaying(true);
        } catch {
          setPlaying(false);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [alerting]); // eslint-disable-line

  // Watchdog
  const armWatchdog = () => {
    clearWatchdog();
    const id = setTimeout(() => {
      setLoading(false);
      setErrorMsg('Taking too long to buffer. Try again or switch station.');
    }, 8000);
    setWatchdog(id);
  };
  const clearWatchdog = () => {
    if (watchdog) {
      clearTimeout(watchdog);
      setWatchdog(null);
    }
  };

  // === Controls ===
  // Always AUTOPLAY when you change the station
  const chooseStation = async url => {
    setErrorMsg(null);
    const el = audioRef.current;
    if (!el) return;

    try {
      el.pause();
    } catch {}
    setPlaying(false);
    setLoading(true);

    setCurrentStationUrl(url); // triggers load()

    try {
      el.load();
      await el.play(); // force play new station
      setPlaying(true);
    } catch {
      setPlaying(false);
    } finally {
      setLoading(false);
      clearWatchdog();
    }
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    setErrorMsg(null);

    if (playing) {
      try {
        el.pause();
        setPlaying(false);
        setLoading(false);
      } catch {}
      return;
    }
    try {
      setLoading(true);
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setErrorMsg('Autoplay blocked or stream busy. Click Play again.');
    } finally {
      setLoading(false);
      clearWatchdog();
    }
  };

  if (!open) return null;
  const activeStation = stations.find(s => s.url === currentStationUrl);

  return (
    <AnimatePresence >
      <motion.div   initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={`w-full ${hidden && "hidden"} `}>
        <div className='mt-2 -mb-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
          {/* Header */}
          <div className='px-3 py-2 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white'>
            <div className='flex items-center gap-2 font-semibold text-sm text-slate-800'>
              <Headphones size={16} className={`transition ${playing ? 'text-emerald-600 animate-pulse' : 'text-indigo-600'}`} />
              <span>Audio</span>
              {playing && (
                <span className='ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700'>
                  <Activity size={12} className='animate-pulse' /> Live
                </span>
              )}
              {alerting && (
                <span className='ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700'>
                  <Pause size={12} /> Alert active
                </span>
              )}
            </div>

            <div className='flex items-center gap-1'>
              {/* Hide = keep playing */}
              <button onClick={() => setHidden(h => !h)} className='p-1.5 rounded-lg hover:bg-slate-100' title={hidden ? 'Show panel' : 'Hide panel (keep playing)'} aria-label={hidden ? 'Show panel' : 'Hide panel'}>
                {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {/* Close = stop + close */}
              <button
                onClick={() => {
                  try {
                    audioRef.current?.pause();
                  } catch {}
                  setPlaying(false);
                  onClose?.();
                }}
                className='p-1.5 rounded-lg hover:bg-slate-100'
                aria-label='Close'
                title='Close'>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body (minimized vs full) */}
          { (
            <>
              {/* Tabs */}
              <div className='px-3 pt-2'>
                <div className='inline-flex rounded-lg bg-slate-100 p-1'>
                  {[
                    {
                      key: 'stations',
                      label: 'Stations',
                      rightAdornment:
                        playing && tab !== 'stations' ? (
                          <span className='ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700'>
                            <Activity size={12} className='animate-pulse' />
                            Live
                          </span>
                        ) : null,
                    },
                    { key: 'podcasts', label: 'Podcasts' },
                  ].map(t => {
                    const active = tab === t.key;
                    return (
                      <button key={t.key} onClick={() => setTab(t.key)} className={`relative px-2.5 py-1 text-xs rounded-md transition flex items-center ${active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`} aria-pressed={active}>
                        {t.label}
                        {t.rightAdornment}
                        {active && <motion.span layoutId='audTab' className='absolute inset-0 -z-10 rounded-md bg-white shadow' transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stations (blue gradient) */}
              {tab === 'stations' && (
                <div className='p-3 pb-0 space-y-2'>
                  <div className='rounded-xl overflow-hidden border border-indigo-100'>
                    <div className='bg-gradient-to-br from-indigo-50 via-white to-indigo-50/60 p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <div className='text-sm font-semibold text-slate-800'>Qur’an Stations</div>
                        <div className='flex items-center gap-1 text-[11px] text-slate-600'>
                          <span className='inline-flex items-center gap-1'>
                            <Headphones size={12} /> {playing ? 'Playing' : 'Idle'}
                          </span>
                          <span>•</span>
                          <span className='inline-flex items-center gap-1'>
                            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />} {muted ? 'Muted' : `${Math.round(volume * 100)}%`}
                          </span>
                        </div>
                      </div>

                      <div className='grid grid-cols-3 md:grid-cols-5 gap-1.5'>
                        {stations.map(s => {
                          const active = currentStationUrl === s.url;
                          return (
                            <button key={s.url} onClick={() => chooseStation(s.url)} className={`relative text-left p-2 rounded-lg border transition group ${active ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title={s.name}>
                              {active && (
                                <span className='absolute right-2 top-2 inline-flex items-center gap-1 text-[10px] text-indigo-700'>
                                  <Radio size={12} className='text-indigo-600' /> Live
                                </span>
                              )}
                              <div className='text-xs font-medium truncate flex items-center gap-1 pr-8'>{s.name}</div>
                              <div className='text-[10px] text-slate-500 truncate'>{s.tag || 'Station'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2'>
                    <div className='max-md:hidden text-[11px] flex items-center gap-2 min-w-0'>
                      <span className='font-medium shrink-0'>Now:</span>
                      <div className='relative w-full overflow-hidden'>
                        <div className='whitespace-nowrap animate-[marquee_10s_linear_infinite]'>{activeStation?.name || 'Station'}</div>
                      </div>
                      <div className='flex items-end gap-[2px] h-3 w-3 ml-1' aria-hidden>
                        {[0, 1, 2].map(i => (
                          <span key={i} className={`w-[2px] ${playing ? 'bg-emerald-600' : 'bg-slate-300'} ${playing ? 'animate-[bounce_0.6s_ease-in-out_infinite]' : ''}`} style={{ height: playing ? (i === 1 ? '12px' : '8px') : '2px', animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    </div>

                    <div className='flex items-center gap-1.5 max-md:justify-end max-md:w-full '>
                      <button onClick={togglePlay} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs min-w-[92px] justify-center ${loading ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 hover:bg-slate-50'}`} aria-busy={loading ? 'true' : 'false'} aria-label={loading ? 'Loading' : playing ? 'Pause' : 'Play'}>
                        {loading ? (
                          <motion.span className='inline-block h-3 w-3 rounded-full border border-slate-400 border-t-transparent' animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
                        ) : playing ? (
                          <>
                            <Pause size={12} /> Pause
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Play
                          </>
                        )}
                      </button>

                      <button onClick={() => setMuted(m => !m)} className='inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs border-slate-200 hover:bg-slate-50' aria-label={muted ? 'Unmute' : 'Mute'}>
                        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>

                      <input type='range' min='0' max='1' step='0.01' value={muted ? 0 : volume} onChange={e => setVolume(Number(e.target.value))} className='w-20 accent-indigo-600' title='Volume' />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className='max-md:hidden flex items-center justify-between rounded-md bg-rose-50 border border-rose-200 px-2 py-1.5 text-[11px] text-rose-700'>
                      <span className='truncate'>{errorMsg}</span>
                      <button
                        onClick={() => {
                          setErrorMsg(null);
                          setRetryKey(k => k + 1);
                          togglePlay();
                        }}
                        className='inline-flex items-center gap-1 text-rose-700 hover:underline'>
                        <RotateCw size={12} /> Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ===== Podcasts (stations keep playing in background) ===== */}
              {tab === 'podcasts' && (
                <div className='space-y-2'>
                  {podcastsLoading ? (
                    <>
                      <div className='aspect-video w-[calc(100%+40px)] max-md:-mt-2 -ml-[20px] md:w-[calc(100%+20px)] md:-ml-[10px] rounded-lg overflow-hidden border border-slate-200'>
                        <div className='h-full w-full animate-pulse bg-slate-100' />
                      </div>
                      <div className='flex gap-1.5 pb-1'>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className='min-w-[60px] max-w-[60px] rounded-md border border-slate-200 overflow-hidden'>
                            <div className='h-[45px] w-full animate-pulse bg-slate-100' />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : podcastList.length > 0 ? (
                    <>
                      <div className='aspect-video w-[calc(100%+40px)] max-md:-mt-2 -ml-[20px] md:w-[calc(100%+20px)] md:-ml-[10px] rounded-lg overflow-hidden border border-slate-200'>
                        <iframe key={podcastList[currentPodcastIdx].id} src={podcastList[currentPodcastIdx].embed} className='w-full h-full' title={podcastList[currentPodcastIdx].title} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' referrerPolicy='strict-origin-when-cross-origin' loading='lazy' allowFullScreen />
                      </div>

                      <div className='flex gap-1.5 overflow-x-auto pb-1'>
                        {podcastList.map((p, i) => (
                          <button key={p.id} onClick={() => setCurrentPodcastIdx(i)} className={`min-w-[60px] max-w-[60px] rounded-md border overflow-hidden text-left ${i === currentPodcastIdx ? 'border-indigo-300' : 'border-slate-200 hover:border-slate-300'}`} title={p.title} aria-pressed={i === currentPodcastIdx}>
                            <img src={p.thumb} alt='' className='w-full h-full object-cover' />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className='text-xs text-slate-500'>No YouTube links yet.</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* IMPORTANT: keep <audio> ALWAYS mounted, even when hidden */}
          <audio key={retryKey} ref={audioRef} src={currentStationUrl} preload='none' crossOrigin='anonymous' />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
/* =================== SMALL COMPONENTS & HELPERS =================== */

function InlineVideo({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  return <video muted ref={ref} src={src} className='w-full h-full object-contain bg-black' playsInline controls onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} style={{ maxHeight: 400 }} />;
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
