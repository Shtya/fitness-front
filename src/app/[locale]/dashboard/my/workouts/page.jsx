'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import DataTable from '@/components/dashboard/ui/DataTable';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, History as HistoryIcon, Clock, Image, Video, X, Play, Pause, Settings } from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';

import { Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { Images, Shuffle } from 'lucide-react';

const TIMER_FINISH_SOUND = '/sounds/alert7.mp3';

/* =================================== SEED =================================== */
const weeklyProgram = {
  saturday: {
    id: 'saturday',
    name: 'Push Day 1 (Chest & Triceps)',
    exercises: [
      { id: 'ex1', name: 'Machine Flat Chest Press', targetSets: 3, targetReps: '8', rest: 90, img: '/uploads/20/container/img-1.png', video: '/uploads/20/container/vid-1.mp4', desc: 'Flat chest press on the machine.' },
      { id: 'ex2', name: 'Cable Crossover Press', targetSets: 3, targetReps: '15', rest: 75, img: '/uploads/55/container/img-1.png', video: '/uploads/55/container/vid-1.mp4', desc: 'Cable machine crossover press.' },
      { id: 'ex3', name: 'Machine Incline Chest Press', targetSets: 3, targetReps: '12', rest: 90, img: '/uploads/27/container/img-1.png', video: '/uploads/27/container/vid-1.mp4', desc: 'Incline chest press on the machine.' },
      { id: 'ex4', name: 'Dumbbell Lateral Raises', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/79/container/img-1.png', video: '/uploads/79/container/vid-1.mp4', desc: 'Dumbbell lateral raises.' },
      { id: 'ex5', name: 'Tricep Pushdown Rope', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/56/container/img-1.png', video: '/uploads/56/container/vid-1.mp4', desc: 'Tricep pushdown using rope attachment.' },
      { id: 'ex6', name: 'Tricep Extension V Bar', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/154/container/img-1.png', video: '/uploads/154/container/vid-1.mp4', desc: 'Tricep extension with V bar.' },
    ],
  },
  sunday: {
    id: 'sunday',
    name: 'Pull Day 1 (Back & Biceps)',
    exercises: [
      { id: 'ex7', name: 'Machine Wide Grip Row', targetSets: 3, targetReps: '8', rest: 90, img: '/uploads/118/container/img-1.png', video: '/uploads/118/container/vid-1.mp4', desc: 'Wide grip row on machine.' },
      { id: 'ex8', name: 'Seated Row Close Grip', targetSets: 3, targetReps: '12', rest: 90, img: '/uploads/118/container/img-1.png', video: '/uploads/118/container/vid-1.mp4', desc: 'Seated row with close grip.' },
      { id: 'ex9', name: 'Lat Pulldown', targetSets: 3, targetReps: '15', rest: 90, img: '/uploads/117/container/img-1.png', video: '/uploads/117/container/vid-1.mp4', desc: 'Lat pulldown on machine.' },
      { id: 'ex10', name: 'Reverse Fly Machine', targetSets: 3, targetReps: '15', rest: 90, img: '/uploads/216/container/img-1.png', video: '/uploads/216/container/vid-1.mp4', desc: 'Reverse fly machine.' },
      { id: 'ex11', name: 'Cable Biceps Curl', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/156/container/img-1.png', video: '/uploads/156/container/vid-1.mp4', desc: 'Cable bicep curls.' },
      { id: 'ex12', name: 'Wide Grip Barbell Shrugs', targetSets: 2, targetReps: '15', rest: 60, img: '/uploads/38/container/img-1.png', video: '/uploads/38/container/vid-1.mp4', desc: 'Wide grip barbell shrugs.' },
      { id: 'ex13', name: 'Back Extension', targetSets: 4, targetReps: '20', rest: 90, img: '/fitness/back-extension.jpg', video: 'https://example.com/back-extension', desc: 'Back extension on machine.' },
    ],
  },
  monday: { id: 'monday', name: 'Rest Day', exercises: [] },
  tuesday: {
    id: 'tuesday',
    name: 'Leg Day',
    exercises: [
      { id: 'ex14', name: 'Leg Extension', targetSets: 3, targetReps: '20', rest: 90, img: '/uploads/116/container/img-1.png', video: '/uploads/116/container/vid-1.mp4', desc: 'Leg extension machine.' },
      { id: 'ex15', name: 'Leg Curl', targetSets: 3, targetReps: '20', rest: 90, img: '/uploads/115/container/img-1.png', video: '/uploads/115/container/vid-1.mp4', desc: 'Leg curl machine.' },
      { id: 'ex16', name: 'Leg Press', targetSets: 3, targetReps: '15', rest: 90, img: '/uploads/213/container/img-1.png', video: '/uploads/213/container/vid-1.mp4', desc: 'Leg press machine.' },
      { id: 'ex17', name: 'Standing Calf Raises', targetSets: 3, targetReps: '20', rest: 60, img: '/uploads/119/container/img-1.png', video: '/uploads/119/container/vid-1.mp4', desc: 'Standing calf raises.' },
      { id: 'ex18', name: 'Seated Calf Raises', targetSets: 3, targetReps: '10', rest: 60, img: '/uploads/218/container/img-1.png', video: '/uploads/218/container/vid-1.mp4', desc: 'Seated calf raises.' },
      { id: 'ex19', name: 'Cable Crunches', targetSets: 3, targetReps: '20', rest: 60, img: '/uploads/162/container/img-1.png', video: '/uploads/162/container/vid-1.mp4', desc: 'Cable crunches.' },
    ],
  },
  wednesday: {
    id: 'wednesday',
    name: 'Push Day 2 (Chest, Shoulders & Triceps)',
    exercises: [
      { id: 'ex20', name: 'Smith Machine Flat Chest Press', targetSets: 3, targetReps: '10', rest: 90, img: '/uploads/227/container/img-1.png', video: '/uploads/227/container/vid-1.mp4', desc: 'Smith machine flat chest press.' },
      { id: 'ex21', name: 'Dips Machine', targetSets: 3, targetReps: '10', rest: 90, img: '/uploads/39/container/img-1.png', video: '/uploads/39/container/vid-1.mp4', desc: 'Dips machine.' },
      { id: 'ex22', name: 'Smith Machine Incline Bench Press', targetSets: 3, targetReps: '10', rest: 90, img: '/uploads/27/container/img-1.png', video: '/uploads/27/container/vid-1.mp4', desc: 'Smith machine incline bench press.' },
      { id: 'ex23', name: 'Rope Front Raises', targetSets: 3, targetReps: '15', rest: 60, img: '/fitness/rope-front-raise.jpg', video: 'https://example.com/rope-front-raise', desc: 'Rope front raises.' },
      { id: 'ex24', name: 'One Hand Cable Lateral Raises', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/159/container/img-1.png', video: '/uploads/159/container/vid-1.mp4', desc: 'One hand cable lateral raises.' },
      { id: 'ex25', name: 'One Hand Tricep Pushdown', targetSets: 3, targetReps: '10', rest: 60, img: '/uploads/166/container/img-1.png', video: '/uploads/166/container/vid-1.mp4', desc: 'One hand tricep pushdown.' },
      { id: 'ex26', name: 'Plank', targetSets: 3, targetReps: '1 minute', rest: 60, img: '/uploads/98/container/img-1.png', video: '/uploads/98/container/vid-1.mp4', desc: 'Plank for core strengthening.' },
    ],
  },
  thursday: {
    id: 'thursday',
    name: 'Pull Day 2 (Back & Biceps)',
    exercises: [
      { id: 'ex27', name: 'Reverse Grip Seated Row', targetSets: 3, targetReps: '10', rest: 90, img: '/uploads/118/container/img-1.png', video: '/uploads/118/container/vid-1.mp4', desc: 'Reverse grip seated row.' },
      { id: 'ex28', name: 'Lat Pulldown Close Grip', targetSets: 3, targetReps: '10', rest: 90, img: '/uploads/221/container/img-1.png', video: '/uploads/221/container/vid-1.mp4', desc: 'Close grip lat pulldown.' },
      { id: 'ex29', name: 'One Arm Cable Row', targetSets: 3, targetReps: '10', rest: 90, img: '/uploads/90/container/img-1.png', video: '/uploads/90/container/vid-1.mp4', desc: 'One arm cable row.' },
      { id: 'ex30', name: 'Face Pull', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/161/container/img-1.png', video: '/uploads/161/container/vid-1.mp4', desc: 'Face pull using cable machine.' },
      { id: 'ex31', name: 'Bicep Spider Curl', targetSets: 3, targetReps: '15', rest: 60, img: '/fitness/bicep-spider-curl.jpg', video: 'https://example.com/bicep-spider-curl', desc: 'Spider curl for biceps.' },
      { id: 'ex32', name: 'Hammer Curl', targetSets: 3, targetReps: '15', rest: 60, img: '/uploads/76/container/img-1.png', video: '/uploads/76/container/vid-1.mp4', desc: 'Hammer curl with dumbbells.' },
      { id: 'ex33', name: 'Russian Twist', targetSets: 3, targetReps: '25', rest: 60, img: '/uploads/107/container/img-1.png', video: '/uploads/107/container/vid-1.mp4', desc: 'Russian twist for core.' },
    ],
  },
};

const seedPlanToday = weeklyProgram.monday;
const seedHistory = [
  { id: 'S-1', date: '2025-08-27', name: 'Upper Push (W3•D2)', volume: 13240, duration: '00:48', setsDone: 13, setsTotal: 13 },
  { id: 'S-2', date: '2025-08-25', name: 'Lower Body (W3•D1)', volume: 18760, duration: '00:55', setsDone: 15, setsTotal: 15 },
];

/* =================== HELPERS =================== */
const epley = (w, r) => Math.round(w * (1 + r / 30));
const today = () => new Date().toISOString().slice(0, 10);

const STORAGE_KEYS = {
  workout: 'mw.workout',
  history: 'mw.history',
  prs: 'mw.prs',
  selectedDay: 'mw.selectedDay',
  ui: 'mw.ui',
  restDefault: 'mw.restDefault',
};

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

/* =================== PAGE =================== */
export default function MyWorkoutsPage() {
  const [tab, setTab] = useState('workout'); // fixed: valid default
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [currentExId, setCurrentExId] = useState(seedPlanToday.exercises[0]?.id);

  const [workout, setWorkout] = useState(null);
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState({});
  const [activeTimers, setActiveTimers] = useState({}); // { [setId]: { remaining, interval, duration } }

  // Global rest default (seconds)
  const [defaultRest, setDefaultRest] = useState(90);
  const [customRestInput, setCustomRestInput] = useState('1:30');

  // Settings panel toggle
  const [showSettings, setShowSettings] = useState(false);

  // Sound
  const audioRef = useRef(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  function playAlert() {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => setIsPlayingSound(true)).catch(() => {});
      } else {
        setIsPlayingSound(true);
      }
    } catch {}
  }

  function stopSound() {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setIsPlayingSound(false);
  }

  /* ---------- INIT ---------- */
  useEffect(() => {
    setLoading(true);

    const savedWorkout = loadLS(STORAGE_KEYS.workout, null);
    const savedHistory = loadLS(STORAGE_KEYS.history, seedHistory);
    const savedPRs = loadLS(STORAGE_KEYS.prs, {});
    const savedSelectedDay = loadLS(STORAGE_KEYS.selectedDay, 'monday');
    const savedUI = loadLS(STORAGE_KEYS.ui, { tab: 'workout', currentExId: seedPlanToday.exercises[0]?.id });
    const savedRest = loadLS(STORAGE_KEYS.restDefault, 90);

    setDefaultRest(savedRest);
    setCustomRestInput(toMMSS(savedRest));

    if (savedWorkout?.exercises?.length) {
      setWorkout(savedWorkout);
      setSelectedDay(savedSelectedDay);
      setHistory(savedHistory);
      setPRs(savedPRs);
      setTab(savedUI.tab || 'workout');
      setCurrentExId(savedUI.currentExId || savedWorkout.exercises[0]?.id);
      setLoading(false);
    } else {
      const session = createSessionFromDay(weeklyProgram[savedSelectedDay] || seedPlanToday, savedRest);
      setWorkout(session);
      setHistory(savedHistory);
      setPRs(savedPRs);
      setSelectedDay(savedSelectedDay);
      setCurrentExId(session.exercises[0]?.id);
      setLoading(false);
    }
  }, []);

  /* ---------- Persist ---------- */
  useEffect(() => {
    if (!workout) return;
    const id = setTimeout(() => saveLS(STORAGE_KEYS.workout, workout), 150);
    return () => clearTimeout(id);
  }, [workout]);

  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.history, history), 250);
    return () => clearTimeout(id);
  }, [history]);

  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.prs, prs), 250);
    return () => clearTimeout(id);
  }, [prs]);

  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.selectedDay, selectedDay), 150);
    return () => clearTimeout(id);
  }, [selectedDay]);

  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.ui, { tab, currentExId }), 150);
    return () => clearTimeout(id);
  }, [tab, currentExId]);

  useEffect(() => {
    const id = setTimeout(() => saveLS(STORAGE_KEYS.restDefault, defaultRest), 150);
    return () => clearTimeout(id);
  }, [defaultRest]);

  /* ---------- Cleanup on unmount ---------- */
  useEffect(() => {
    return () => {
      Object.values(activeTimers).forEach(t => t?.interval && clearInterval(t.interval));
    };
  }, [activeTimers]);

  /* ---------- Utilities ---------- */
  const setsFor = exId => workout?.sets.filter(s => s.exId === exId) || [];

  function startTimer(setId, duration) {
    // stop previous timers
    Object.values(activeTimers).forEach(t => t?.interval && clearInterval(t.interval));
    setActiveTimers({});
    setIsPlayingSound(false); // hide stop-sound if previous was playing

    const newTimer = {
      remaining: Math.max(0, Number(duration) || 0),
      duration: Math.max(0, Number(duration) || 0),
      startedAt: Date.now(),
      interval: null,
    };

    const interval = setInterval(() => {
      setActiveTimers(curr => {
        const t = curr[setId];
        if (!t) return curr;
        if (t.remaining <= 1) {
          clearInterval(t.interval);
          // finish actions
          try {
            playAlert();
          } catch {}
          if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
            window.navigator.vibrate(200);
          }
          // mark inactive
          setWorkout(w => ({
            ...w,
            sets: w.sets.map(s => (s.id === setId ? { ...s, timerActive: false, timerPaused: true } : s)),
          }));
          const copy = { ...curr };
          delete copy[setId];
          return copy;
        }
        // tick
        return { ...curr, [setId]: { ...t, remaining: t.remaining - 1 } };
      });
    }, 1000);

    newTimer.interval = interval;
    setActiveTimers({ [setId]: newTimer });

    setWorkout(w => ({
      ...w,
      sets: w.sets.map(s => (s.id === setId ? { ...s, timerActive: true, timerPaused: false } : { ...s, timerActive: false, timerPaused: true })),
    }));
  }

  function pauseTimer(setId) {
    setActiveTimers(curr => {
      const t = curr[setId];
      if (!t) return curr;
      if (t.interval) clearInterval(t.interval);
      return { ...curr, [setId]: { ...t, interval: null } };
    });
    setWorkout(w => ({ ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, timerPaused: true } : s)) }));
  }

  function resumeTimer(setId) {
    setActiveTimers(curr => {
      const t = curr[setId];
      if (!t) return curr;
      if (t.interval) return curr; // already running
      const interval = setInterval(() => {
        setActiveTimers(curr2 => {
          const tt = curr2[setId];
          if (!tt) return curr2;
          if (tt.remaining <= 1) {
            clearInterval(tt.interval);
            try {
              playAlert();
            } catch {}
            if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
              window.navigator.vibrate(200);
            }
            setWorkout(w => ({
              ...w,
              sets: w.sets.map(s => (s.id === setId ? { ...s, timerActive: false, timerPaused: true } : s)),
            }));
            const copy = { ...curr2 };
            delete copy[setId];
            return copy;
          }
          return { ...curr2, [setId]: { ...tt, remaining: tt.remaining - 1 } };
        });
      }, 1000);
      return { ...curr, [setId]: { ...t, interval } };
    });
    setWorkout(w => ({ ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, timerPaused: false } : s)) }));
  }

  function stopTimer(setId) {
    setActiveTimers(curr => {
      const t = curr[setId];
      if (t?.interval) clearInterval(t.interval);
      const copy = { ...curr };
      delete copy[setId];
      return copy;
    });
    setWorkout(w => ({ ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, timerActive: false, timerPaused: true } : s)) }));
  }

  function setField(setId, field, value) {
    setWorkout(w => ({ ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, [field]: value } : s)) }));
  }

  function toggleDone(setId) {
    setWorkout(w => {
      const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, done: !s.done } : s)) };
      const s = next.sets.find(x => x.id === setId);
      if (s && !s.pr && s.done && s.weight > 0 && s.reps > 0) {
        const e1rm = epley(s.weight, s.reps);
        setPRs(prev => {
          const prevPR = prev[s.exName];
          const isPR = !prevPR || e1rm > prevPR.e1rm;
          if (isPR) {
            next.sets = next.sets.map(x => (x.id === setId ? { ...x, pr: true } : x));
            return { ...prev, [s.exName]: { e1rm, weight: s.weight, reps: s.reps, date: today() } };
          }
          return prev;
        });
      }
      return next;
    });
  }

  function createSessionFromDay(dayProgram, restDefaultSeconds) {
    return {
      ...dayProgram,
      startedAt: null,
      sets: dayProgram.exercises.flatMap(ex =>
        Array.from({ length: ex.targetSets }).map((_, i) => ({
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
          restTime: Number.isFinite(ex.rest) ? ex.rest : restDefaultSeconds,
          timerActive: false,
          timerPaused: true,
        })),
      ),
    };
  }

  function changeDay(dayId) {
    // clear any active timers
    Object.values(activeTimers).forEach(t => t?.interval && clearInterval(t.interval));
    setActiveTimers({});

    setSelectedDay(dayId);
    const dayProgram = weeklyProgram[dayId];
    const session = createSessionFromDay(dayProgram, defaultRest);
    setWorkout(session);
    setCurrentExId(session.exercises[0]?.id);
  }

  // Apply default rest to sets helpers
  function applyDefaultRestToAll() {
    setWorkout(w => ({
      ...w,
      sets: w.sets.map(s => ({ ...s, restTime: defaultRest })),
    }));
  }
  function applyDefaultRestToCurrentExercise() {
    setWorkout(w => ({
      ...w,
      sets: w.sets.map(s => (s.exId === currentExId ? { ...s, restTime: defaultRest } : s)),
    }));
  }

  /* ---------- UI data ---------- */
  const currentExercise = workout?.exercises.find(e => e.id === currentExId);
  const histCols = [
    { header: 'Date', accessor: 'date' },
    { header: 'Workout', accessor: 'name' },
    { header: 'Volume', accessor: 'volume', cell: r => <span className='tabular-nums'>{r.volume.toLocaleString()} kg·reps</span> },
    { header: 'Duration', accessor: 'duration' },
    {
      header: 'Sets',
      accessor: 'setsDone',
      cell: r => (
        <span className='tabular-nums'>
          {r.setsDone}/{r.setsTotal}
        </span>
      ),
    },
  ];
  const formatTime = s => toMMSS(s);

  // Week starting from Saturday:
  const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  const dayTabs = weekOrder.map(d => ({
    key: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
    name: weeklyProgram[d].name,
  }));

  return (
    <div className='space-y-6'>
      {/* Prefer multiple sources if you add them; mp3 is fine if your target browsers support it */}
      <audio ref={audioRef} src={TIMER_FINISH_SOUND} preload='auto' />

      <div className='flex items-center justify-between flex-wrap gap-3'>
        <PageHeader icon={Dumbbell} title='My Workouts' subtitle='Log sets with RPE/RIR and track PRs automatically.' />
        <div className='flex items-center gap-2'>
          <TabsPill
            id='my-workouts-tabs'
            tabs={[
              { key: 'workout', label: 'Workout', icon: Dumbbell },
              { key: 'history', label: 'History', icon: HistoryIcon },
            ]}
            active={tab}
            onChange={setTab}
          />
          {/* Settings toggle */}
          <button onClick={() => setShowSettings(s => !s)} className='inline-flex items-center gap-1.5 !rounded-2xl before:!rounded-2xl border border-slate-200 px-3 py-[10px] text-sm text-slate-700 hover:bg-slate-50 bg-main cursor-pointer' aria-label='Settings' title='Settings'>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ===== GLOBAL REST TIMER CONTROL (shown only when settings opened) ===== */}
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
              <div className='mt-1 text-xs text-slate-500'>Used when a set has no specific rest. Saved for future sessions.</div>
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
              {/* Day Selection */}
              <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                <div className='grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2'>
                  {dayTabs.map(day => (
                    <button
                      key={day.key}
                      onClick={() => changeDay(day.key)}
                      className={`cursor-pointer p-2  md:p-3 rounded-lg text-left transition-all border
                        ${selectedDay === day.key ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className='text-sm font-semibold'>{day.label}</div>
                      <div className='text-[11px] mt-1 truncate opacity-70'>{day.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise Panels */}
              <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                {workout && (
                  <div className='flex flex-col md:flex-row gap-4'>
                    {/* LEFT: Current exercise – media/alternatives */}
                    <div className='w-full md:flex-1 min-w-0'>
                      <div className='rounded-2xl border border-slate-200 bg-white overflow-hidden'>
                        {/* media + bullets */}
                        <ExerciseMedia exercise={currentExercise} items={[...(currentExercise?.video ? [{ type: 'video', src: currentExercise.video }] : []), ...(currentExercise?.img ? [{ type: 'img', src: currentExercise.img }] : []), ...(currentExercise?.gallery || [])]} />

                        <ExerciseSubTabs exercise={currentExercise} allExercises={workout.exercises} currentExId={currentExId} onPickAlternative={ex => setCurrentExId(ex.id)} />

                        {/* SETS TABLE */}
                        <div className='mx-2 mb-4  border border-slate-200  rounded-2xl overflow-hidden '>
                          <div className='overflow-x-auto border border-slate-200  rounded-2xl overflow-hidden'>
                            <table className='w-full text-sm overflow-hidden rounded-2xl border border-slate-200 '>
                              <thead className='bg-slate-50/80 backdrop-blur sticky top-0 z-10'>
                                <tr className='text-left text-slate-500'>
                                  <th className='py-3 px-3 font-semibold'>Set</th>
                                  <th className='py-3 px-3 font-semibold'>Weight</th>
                                  <th className='py-3 px-3 font-semibold'>Reps</th>
                                  <th className='py-3 px-3 font-semibold'>Timer</th>
                                  <th className='py-3 px-3 font-semibold'>Done</th>
                                </tr>
                              </thead>

                              <tbody className='divide-y divide-slate-100'>
                                {setsFor(currentExId).map((s, i) => {
                                  const t = activeTimers[s.id];
                                  const v = t ? t.remaining : s.restTime;
                                  const isActive = s.timerActive && !s.timerPaused;
                                  const isPaused = s.timerActive && s.timerPaused;

                                  return (
                                    <tr key={s.id} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                                      <td className='py-3 px-3'>
                                        <span className='inline-flex h-6 min-w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-medium'>{s.set}</span>
                                      </td>

                                      {/* Weight */}
                                      <td className='py-3 px-3'>
                                        <div className='relative'>
                                          <input type='number' min={0} value={s.weight} onChange={e => setField(s.id, 'weight', +e.target.value)} className='h-9 w-24 rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition' placeholder='0' inputMode='numeric' />
                                          <span className='absolute left-[calc(6rem-18px)] top-1/2 -translate-y-1/2 text-[11px] text-slate-400 select-none'>kg</span>
                                        </div>
                                      </td>

                                      {/* Reps */}
                                      <td className='py-3 px-3'>
                                        <input type='number' min={0} value={s.reps} onChange={e => setField(s.id, 'reps', +e.target.value)} className='h-9 w-20 rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition' placeholder='0' inputMode='numeric' />
                                      </td>

                                      {/* Timer */}
                                      <td className='py-3 px-3'>
                                        <div className='flex items-center gap-2 flex-wrap'>
                                          {isActive || isPaused ? (
                                            <>
                                              <span className='min-w-[3.25rem] tabular-nums font-semibold text-slate-800'>{formatTime(v)}</span>

                                              {isActive ? (
                                                <button onClick={() => pauseTimer(s.id)} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50' aria-label='Pause'>
                                                  <Pause size={14} /> Pause
                                                </button>
                                              ) : (
                                                <button onClick={() => resumeTimer(s.id)} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50' aria-label='Resume'>
                                                  <Play size={14} /> Resume
                                                </button>
                                              )}

                                              <button onClick={() => stopTimer(s.id)} className='inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50' aria-label='Stop'>
                                                <X size={14} /> Stop
                                              </button>
                                            </>
                                          ) : (
                                            <div className='flex items-center gap-2'>
                                              <button onClick={() => startTimer(s.id, s.restTime)} className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
                                                <Clock size={14} /> {formatTime(s.restTime)}
                                              </button>

                                              {/* quick +/- 15s adjust */}
                                              <div className='inline-flex rounded-lg overflow-hidden border border-slate-200'>
                                                <button onClick={() => setField(s.id, 'restTime', Math.max(0, (s.restTime || 0) - 15))} className='px-2 text-xs hover:bg-slate-50' title='-15s'>
                                                  −15s
                                                </button>
                                                <button onClick={() => setField(s.id, 'restTime', (s.restTime || 0) + 15)} className='px-2 text-xs hover:bg-slate-50 border-l border-slate-200' title='+15s'>
                                                  +15s
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      <td className='py-3 px-3'>
                                        <CheckBox checked={s.done} onChange={() => toggleDone(s.id)} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            <div className='px-3 py-2 text-[11px] text-slate-500 bg-slate-50/60'>
                              Tip: Start the timer after each set. Adjust per-set with ±15s. Open <Settings className='inline -mt-0.5' size={12} /> to change defaults.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Exercise list */}
                    <div className='w-full md:w-80'>
                      <div className='w-full h-full max-h-[475px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4'>
                        <h3 className='text-base font-semibold mb-3'>Exercises</h3>
                        <div className='space-y-2'>
                          {workout.exercises.map((ex, idx) => {
                            const done = setsFor(ex.id).filter(s => s.done).length;
                            const total = setsFor(ex.id).length;
                            const active = currentExId === ex.id;
                            return (
                              <button key={ex.id} onClick={() => setCurrentExId(ex.id)} className={`w-full text-left p-3 rounded-xl border transition ${active ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <div className='flex items-center gap-3'>
                                  <div className='w-10 h-10 overflow-hidden rounded-lg bg-slate-100 grid place-items-center'>
                                    <img src={ex.img} alt='' className='object-cover w-full h-full' />
                                  </div>
                                  <div className='min-w-0 flex-1'>
                                    <div className='font-medium truncate'>
                                      {idx + 1}. {ex.name}
                                    </div>
                                    <div className='text-xs opacity-70'>
                                      {ex.targetSets} × {ex.targetReps} • Rest {Number.isFinite(ex.rest) ? ex.rest : defaultRest}s
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
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ===== HISTORY ===== */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='flex items-center justify-between mb-4'>
            <div className='font-semibold'>Session History</div>
            <div className='text-sm text-slate-500'>{history.length} workouts completed</div>
          </div>
          <div className='mt-3'>
            <DataTable columns={histCols} data={history} loading={loading} pagination itemsPerPage={8} />
            {!loading && !history.length && <EmptyState title='No sessions yet' subtitle='Log your first workout to see history here.' icon={HistoryIcon} />}
          </div>
        </motion.div>
      )}

      {/* Floating Stop Sound button */}
      {isPlayingSound && (
        <button onClick={stopSound} className='fixed bottom-4 right-4 z-50 rounded-full border border-red-200 bg-white shadow px-4 py-2 text-sm text-red-600 hover:bg-red-50' title='Stop alert sound'>
          <X size={14} className='inline -mt-0.5 mr-1' /> Stop sound
        </button>
      )}

      {/* Exercise Detail Modal */}
      {showExerciseDetail && currentExercise && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className='bg-white rounded-2xl max-w-md w-full p-4 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='font-bold text-lg'>{currentExercise.name}</h3>
              <button onClick={() => setShowExerciseDetail(false)} className='p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100'>
                <X size={20} />
              </button>
            </div>
            <div className='aspect-video bg-slate-200 rounded-lg mb-4 grid place-items-center overflow-hidden'>{currentExercise.img ? <img src={currentExercise.img} alt={currentExercise.name} className='w-full h-full object-cover' /> : <Image size={48} className='text-slate-400' />}</div>
            <div className='mb-4'>
              <div className='font-medium mb-2'>Description</div>
              <p className='text-slate-700'>{currentExercise.desc}</p>
            </div>
            {currentExercise.video && (
              <a href={currentExercise.video} target='_blank' rel='noreferrer' className='inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 py-2'>
                <Video size={18} /> Watch tutorial
              </a>
            )}
            <button onClick={() => setShowExerciseDetail(false)} className='w-full mt-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700'>
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* =================== MEDIA =================== */
function ExerciseMedia({ exercise, items }) {
  const [idx, setIdx] = useState(0);

  const media = useMemo(() => {
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    return arr.map(m => {
      if (typeof m === 'string') return { type: 'img', src: m };
      return { type: m?.type === 'video' ? 'video' : 'img', src: m?.src };
    });
  }, [items]);

  const active = media[idx];
  const pickSrc = src => (Array.isArray(src) ? src.find(Boolean) : src);
  const videoUrl = active?.type === 'video' ? pickSrc(active.src) : undefined;
  const imageUrl = active?.type === 'img' ? pickSrc(active.src) : undefined;

  return (
    <div className='relative'>
      {/* Main viewer */}
      <motion.div key={idx + (pickSrc(active?.src) || '')} initial={{ opacity: 0.4, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} className='aspect-video bg-slate-900 grid place-items-center overflow-hidden shadow-lg relative rounded-2xl'>
        {videoUrl ? (
          <div className='relative w-full h-full group'>
            <video src={videoUrl} controls playsInline className='w-full h-full object-cover transition-transform duration-300' poster={exercise?.img} />
            <div className='absolute pointer-events-none inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20' />
            <div className='absolute pointer-events-none inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition'>
              <div className='bg-black/50 p-4 rounded-full backdrop-blur-sm'>
                <Play size={36} className='text-white' />
              </div>
            </div>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={exercise?.name || 'exercise'} className='w-full h-full object-cover' loading='lazy' />
        ) : (
          <ImageIcon size={48} className='text-slate-400' />
        )}
      </motion.div>

      {/* Header + thumbnails */}
      <div className='relative py-2 px-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='font-semibold text-lg'>{exercise?.name}</h3>
          <p className='text-xs text-slate-500'>
            Target: {exercise?.targetSets} × {exercise?.targetReps} • Rest {Number.isFinite(exercise?.rest) ? exercise.rest : '—'}s
          </p>
        </div>

        {media.length > 1 && (
          <div className='flex items-center gap-2 '>
            {media.map((m, i) => {
              const thumb = pickSrc(m.src);
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={` cursor-pointer w-14 h-12 flex-none rounded-md overflow-hidden border-2 transition-all shrink-0
                    ${i === idx ? 'border-indigo-600 shadow-md scale-105' : 'border-transparent opacity-75 hover:opacity-100'}`}
                  title={`Media ${i + 1}`}>
                  {m.type === 'img' && thumb ? (
                    <img src={thumb} alt={`thumb-${i}`} className='w-full h-full object-cover' />
                  ) : m.type === 'video' && thumb ? (
                    <div className='relative w-full h-full bg-black'>
                      <video src={thumb} className='w-full h-full object-cover' muted playsInline />
                      <div className='absolute inset-0 bg-black/40 flex items-center justify-center'>
                        <VideoIcon size={18} className='text-white' />
                      </div>
                    </div>
                  ) : (
                    <div className='w-full h-full grid place-items-center bg-slate-200'>
                      <ImageIcon size={18} className='text-slate-400' />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* =================== SUB TABS =================== */
function ExerciseSubTabs({ exercise, allExercises, currentExId, onPickAlternative, initialTab = 'media' }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    { key: 'media', label: 'Media', icon: Images },
    { key: 'alternatives', label: 'Alternatives', icon: Shuffle },
  ];

  const alternatives = useMemo(() => (allExercises || []).filter(e => e.id !== exercise?.id).slice(0, 6), [allExercises, exercise?.id]);

  return (
    <div className='px-2 pt-3'>
      {/* Tabs header */}
      <div className='relative mb-2'>
        <div className='flex items-center gap-2 rounded-xl bg-slate-100 p-1.5'>
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`cursor-pointer relative flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition
                  ${active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}
                aria-selected={active}
                role='tab'>
                <Icon size={16} />
                {label}
                {active && <motion.span layoutId='tabActivePill' className='absolute inset-0 -z-10 rounded-lg bg-white shadow' transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              </button>
            );
          })}
          <div className='ml-auto text-xs text-slate-500 select-none'>
            {exercise?.targetSets} sets • {exercise?.targetReps} reps
          </div>
        </div>
      </div>

      {/* Panels */}
      <div role='tabpanel' className='py-3'>
        {tab === 'alternatives' && (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {alternatives.map(alt => (
              <motion.div key={alt.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} className='group p-3 border border-slate-200 rounded-2xl bg-white hover:shadow-md transition'>
                <div className='flex items-center gap-3'>
                  <div className='w-14 h-14 rounded-xl bg-slate-100 grid place-items-center overflow-hidden border border-slate-200'>{alt.img ? <img src={alt.img} alt={alt.name} className='w-full h-full object-cover group-hover:scale-105 transition' /> : <Dumbbell size={18} className='text-slate-500' />}</div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-medium truncate'>{alt.name}</div>
                    <div className='text-xs text-slate-500'>
                      Target: {alt.targetSets} × {alt.targetReps} • Rest {alt.rest ?? '—'}s
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
                    <ImageIcon size={16} className='text-slate-500' />
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
