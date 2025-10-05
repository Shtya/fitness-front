/* 
	- issue 
		1. day doenst' take the defulat today and form the localstorage 
		2.  changes are stored locally appear when i load the page 
		3. when click on upload video for caoch open popup 
*/

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, History as HistoryIcon, X, Minus, Plus, Video as VideoIcon, Trophy, TrendingUp, Flame, Save as SaveIcon, ImageIcon, Headphones, Settings as SettingsIcon, Menu as MenuIcon, Clock, Upload } from 'lucide-react';
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
import { useTranslations } from 'next-intl';

export const DEFAULT_SOUNDS = ['/sounds/1.mp3', '/sounds/2.mp3', '/sounds/alert1.mp3', '/sounds/alert2.mp3', '/sounds/alert3.mp3', '/sounds/alert4.mp3', '/sounds/alert5.mp3', '/sounds/alert6.mp3', '/sounds/alert7.mp3', '/sounds/alert8.mp3'];
const LOCAL_KEY_SETTINGS = 'mw.settings.v1';
const LOCAL_KEY_WORKOUT_BUFFER = 'mw.workout.buffer';
const LOCAL_KEY_GYM_TIME = 'mw.gym.time';
const LOCAL_KEY_SELECTED_DAY = 'mw.selected.day';

// Helper functions
const jsDayToId = d => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';

function pickTodayId(availableIds) {
  const todayId = jsDayToId(new Date().getDay());
  if (availableIds.includes(todayId)) return todayId;
  const pref = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return pref.find(x => availableIds.includes(x)) || availableIds[0] || 'monday';
}

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

const WEEK_START = 6;

function isoForThisWeeksDay(dayName, refDate = new Date(), weekStart = WEEK_START) {
  const targetIdx = DAY_INDEX[dayName.toUpperCase()];
  if (targetIdx == null) throw new Error(`Bad dayName: ${dayName}`);

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
    return data?.program?.days?.length ? data : { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) } };
  });
}

async function upsertDailyPR(userId, exerciseName, date, records) {
  const { data } = await api.post('/prs', { exerciseName, date, records }, { params: { userId } });
  apiCache.clear();
  return data;
}

async function fetchAllStats(userId, windowDays = 30, exerciseWindowDays = 90) {
  const cacheKey = `allStats-${userId ?? 'guest'}-${windowDays}-${exerciseWindowDays}`;
  return fetchWithCache(cacheKey, async () => {
    const { data } = await api.get('/prs/all-stats', {
      params: { userId, windowDays, exerciseWindowDays },
    });
    return data;
  });
}

// Simplified version if you don't need the date aggregation
async function fetchLastDayByName(userId, day, onOrBefore) {
  const cacheKey = `lastDay-${userId ?? 'guest'}-${day}-${onOrBefore}`;
  return fetchWithCache(cacheKey, async () => {
    try {
      const plan = await fetchActivePlan(userId);
      const dayProgram = plan?.program?.days?.find(d => String(d.dayOfWeek ?? '').toLowerCase() === day.toLowerCase()) || weeklyProgram[day] || { exercises: [] };

      const exerciseNames = dayProgram.exercises.map(ex => ex.name);

      if (exerciseNames.length === 0) {
        return {
          date: null,
          day: day,
          recordsByExercise: {},
        };
      }

      const { data } = await api.post('/prs/last-workout-sets', {
        userId,
        exercises: exerciseNames,
      });

      const recordsByExercise = {};
      data.exercises.forEach(exercise => {
        if (exercise.records.length > 0) {
          recordsByExercise[exercise.exerciseName] = exercise.records;
        }
      });

      return {
        date: data.exercises.find(ex => ex.date)?.date || null,
        day: day,
        recordsByExercise,
      };
    } catch (error) {
      console.error('Error fetching last workout sets:', error);
      return {
        date: null,
        day: day,
        recordsByExercise: {},
      };
    }
  });
}

// NEW: Video upload function
async function uploadExerciseVideo(userId, exerciseId, videoFile) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('exerciseId', exerciseId);
  formData.append('userId', userId);

  const { data } = await api.post('/exercises/upload-video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

// NEW: Gym time tracking functions
const saveGymTime = (startTime, endTime = null) => {
  const gymTime = { startTime, endTime };
  localStorage.setItem(LOCAL_KEY_GYM_TIME, JSON.stringify(gymTime));
  return gymTime;
};

const getGymTime = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY_GYM_TIME)) || null;
  } catch {
    return null;
  }
};

const calculateTimeInGym = (startTime, endTime) => {
  if (!startTime) return null;
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const SkeletonLoader = () => (
  <div className='space-y-5 sm:space-y-6 animate-pulse'>
    <div className='rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
      <div className='relative p-4 md:p-8 bg-gradient text-white'>
        <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
        <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
          <div className='flex-1 max-lg:hidden'>
            <div className='h-8 bg-white/20 rounded w-48'></div>
            <div className='h-4 bg-white/20 rounded w-64 mt-2'></div>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-[37px] w-[37px] bg-white/20 rounded-xl'></div>
            <div className='h-[37px] w-[37px] bg-white/20 rounded-xl'></div>
            <div className='max-md:hidden flex gap-2'>
              <div className='h-[37px] w-24 bg-white/20 rounded-xl'></div>
              <div className='h-[37px] w-24 bg-white/20 rounded-xl'></div>
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

    <div className='grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6'>
      <div className='space-y-4'>
        <div className='rounded-2xl border border-slate-200 bg-white p-4'>
          <div className='h-64 bg-slate-200 rounded-lg mb-4'></div>
          <div className='space-y-3'>
            <div className='h-12 bg-slate-200 rounded-lg'></div>
            <div className='h-12 bg-slate-200 rounded-lg'></div>
            <div className='h-12 bg-slate-200 rounded-lg'></div>
          </div>
        </div>
      </div>

      <div className='hidden lg:block space-y-3'>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className='h-16 bg-slate-200 rounded-lg'></div>
        ))}
      </div>
    </div>
  </div>
);

// NEW: Video Upload Component
const VideoUploadButton = ({ exercise, userId, onVideoUpload }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleVideoUpload = async event => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('Video file must be less than 100MB');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadExerciseVideo(userId, exercise.id, file);
      onVideoUpload?.(result);
      alert('Video uploaded successfully!');
    } catch (error) {
      console.error('Video upload failed:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className='mt-3'>
      <input type='file' ref={fileInputRef} onChange={handleVideoUpload} accept='video/*' className='hidden' id={`video-upload-${exercise.id}`} />
      <label htmlFor={`video-upload-${exercise.id}`} className='inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors text-sm'>
        <Upload size={16} />
        {uploading ? 'Uploading...' : 'Upload Video for Coach'}
      </label>
    </div>
  );
};

// NEW: Compact Gym Clock Component
const GymClock = () => {
  const t = useTranslations('MyWorkouts');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gymTime, setGymTime] = useState(getGymTime());
  const [isTraining, setIsTraining] = useState(!!gymTime?.startTime && !gymTime?.endTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartTraining = () => {
    const startTime = new Date().toISOString();
    const newGymTime = saveGymTime(startTime);
    setGymTime(newGymTime);
    setIsTraining(true);
  };

  const handleEndTraining = () => {
    const endTime = new Date().toISOString();
    const newGymTime = saveGymTime(gymTime.startTime, endTime);
    setGymTime(newGymTime);
    setIsTraining(false);

    // Show time spent in gym
    const timeSpent = calculateTimeInGym(gymTime.startTime, endTime);
    alert(`You spent ${timeSpent} in the gym!`);
  };

  const timeInGym = gymTime ? calculateTimeInGym(gymTime.startTime, gymTime.endTime) : null;

  return (
    <div className='bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30 mb-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Clock className='text-white' size={18} />
          <div className='text-white'>
            <div className='text-xs opacity-80'>{t('clock.timeInGym')}</div>
            <div className='text-sm font-semibold'>{timeInGym || '0h 0m'}</div>
          </div>
        </div>
        {!isTraining ? (
          <button onClick={handleStartTraining} className='px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium'>
            {t('clock.startTraining')}
          </button>
        ) : (
          <button onClick={handleEndTraining} className='px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium'>
            {t('clock.endTraining')}
          </button>
        )}
      </div>
    </div>
  );
};

// NEW: Simplified History Tab Components
const StatsOverview = ({ overview }) => (
  <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3'>
    <KPI title='Exercises Tracked' value={fmtVal(overview?.exercisesTracked)} icon={Dumbbell} />
    <KPI title='Total Attempts' value={fmtVal(overview?.totalAttempts)} icon={TrendingUp} />
    <KPI title='All-time PRs' value={fmtVal(overview?.allTimePrs)} icon={Trophy} />
    <KPI title='Current Streak' value={fmtVal(overview?.currentStreakDays)} icon={Flame} />
  </div>
);

const AllTimeBests = ({ allTimeBests }) => (
  <div className='rounded-2xl border border-slate-200 bg-white p-4'>
    <div className='flex items-center justify-between mb-3'>
      <div className='font-semibold'>All-time Bests</div>
      <div className='text-xs text-slate-500'>From PRs (computed e1RM)</div>
    </div>
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
      {allTimeBests?.map((best, i) => (
        <div key={i} className='p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between'>
          <div className='text-sm font-medium truncate'>{best.name}</div>
          <div className='text-sm tabular-nums font-semibold'>{best.e1rm} e1RM</div>
        </div>
      ))}
      {!allTimeBests?.length && <div className='text-sm text-slate-500'>No personal records yet</div>}
    </div>
  </div>
);

const ExerciseDrilldown = ({ exerciseDrilldown, exercisePick, onExerciseChange }) => {
  const drilldown = exerciseDrilldown?.[exercisePick];

  if (!drilldown || !drilldown.hasData) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='flex items-center justify-between gap-2 mb-3'>
          <div className='font-semibold'>Exercise Progress</div>
          <select className='h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm' value={exercisePick} onChange={e => onExerciseChange(e.target.value)}>
            {Object.keys(exerciseDrilldown || {}).map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <EmptyState title='No data yet' subtitle='Log your first workout to see progress here.' icon={<TrendingUp />} />
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4'>
      <div className='flex items-center justify-between gap-2 mb-4'>
        <div className='font-semibold'>{exercisePick} Progress</div>
        <select className='h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm' value={exercisePick} onChange={e => onExerciseChange(e.target.value)}>
          {Object.keys(exerciseDrilldown || {}).map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Recent Performance */}
      <div className='mb-4'>
        <div className='text-sm font-medium mb-2'>Recent Performance</div>
        <div className='grid grid-cols-3 gap-3'>
          <div className='text-center p-3 rounded-lg bg-slate-50 border border-slate-200'>
            <div className='text-xs text-slate-500'>Best Weight</div>
            <div className='text-lg font-bold'>{drilldown.topSets.byWeight[0]?.weight || 0} kg</div>
          </div>
          <div className='text-center p-3 rounded-lg bg-slate-50 border border-slate-200'>
            <div className='text-xs text-slate-500'>Best Reps</div>
            <div className='text-lg font-bold'>{drilldown.topSets.byReps[0]?.reps || 0}</div>
          </div>
          <div className='text-center p-3 rounded-lg bg-slate-50 border border-slate-200'>
            <div className='text-xs text-slate-500'>Best e1RM</div>
            <div className='text-lg font-bold'>{drilldown.topSets.byE1rm[0]?.e1rm || 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Attempts */}
      {drilldown.attempts.length > 0 && (
        <div>
          <div className='text-sm font-medium mb-2'>Recent Attempts</div>
          <div className='space-y-2 max-h-60 overflow-y-auto'>
            {drilldown.attempts.slice(0, 5).map((attempt, i) => (
              <div key={i} className='flex items-center justify-between p-2 rounded-lg border border-slate-200'>
                <div className='text-sm'>{attempt.date}</div>
                <div className='text-sm font-medium'>
                  {attempt.weight}kg × {attempt.reps}
                </div>
                {attempt.isPr && <span className='text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded'>PR</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SessionHistory = ({ sessionHistory }) => (
  <div className='rounded-2xl border border-slate-200 bg-white p-4'>
    <div className='flex items-center justify-between mb-4'>
      <div className='font-semibold'>Workout History</div>
      <div className='text-sm text-slate-500'>{sessionHistory?.totalWorkouts || 0} workouts completed</div>
    </div>

    {sessionHistory?.workouts?.length > 0 ? (
      <div className='space-y-3'>
        {sessionHistory.workouts.slice(0, 5).map((workout, i) => (
          <div key={i} className='p-3 rounded-lg border border-slate-200 bg-white'>
            <div className='flex items-center justify-between mb-2'>
              <div className='font-medium text-sm'>{workout.date}</div>
              <div className='text-xs text-slate-500'>
                {workout.setsDone}/{workout.setsTotal} sets
              </div>
            </div>
            <div className='text-sm text-slate-600 mb-1'>{workout.name}</div>
            <div className='text-xs text-slate-500'>Volume: {workout.volume?.toLocaleString()} kg·reps</div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState title='No workouts yet' subtitle='Complete your first workout to see history here.' icon={<HistoryIcon />} />
    )}
  </div>
);

export default function MyWorkoutsPage() {
  const t = useTranslations('MyWorkouts');
  const user = useUser();
  const USER_ID = user?.id;
  const [tab, setTab] = useState('workout');
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);

  // NEW: Get selected day from localStorage or default to today
  const [selectedDay, setSelectedDay] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_KEY_SELECTED_DAY) || 'monday';
    }
    return 'monday';
  });

  const [workout, setWorkout] = useState(null);
  const [currentExId, setCurrentExId] = useState(undefined);
  const [hidden, setHidden] = useState(false);

  // NEW: Single state for all stats
  const [allStats, setAllStats] = useState(null);
  const [exercisePick, setExercisePick] = useState('Bench Press');

  // audio + settings
  const audioRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSound, setAlertSound] = useState(DEFAULT_SOUNDS[2]);
  const [alerting, setAlerting] = useState(false);

  // misc
  const [audioOpen, setAudioOpen] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dayLoading, setDayLoading] = useState(false); // NEW: Separate loading for day changes
  const lastSavedRef = useRef(new Map());
  const [isPending, startTransition] = useTransition();

  // NEW: Save selected day to localStorage whenever it changes
  useEffect(() => {
    if (selectedDay) {
      localStorage.setItem(LOCAL_KEY_SELECTED_DAY, selectedDay);
    }
  }, [selectedDay]);

  // NEW: Load from localStorage on initial load
  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY_WORKOUT_BUFFER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.workout && parsed.selectedDay) {
          setWorkout(parsed.workout);
          setSelectedDay(parsed.selectedDay);
          setCurrentExId(parsed.currentExId);
          setUnsaved(true);

          // Restore lastSavedRef
          lastSavedRef.current.clear();
          if (parsed.workout?.sets) {
            parsed.workout.sets.forEach(s => {
              lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
            });
          }
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  }, []);

  const preloadMedia = useCallback(exercises => {
    exercises.forEach(exercise => {
      if (exercise.img) {
        const img = new Image();
        img.src = exercise.img;
      }
    });
  }, []);

  const persistBufferThrottled = useMemo(() => throttle(w => persistLocalBuffer(w), 800), []);

  // NEW: Enhanced persist function that includes all state
  const persistAllToLocalStorage = useCallback((workoutData, selectedDay, currentExId) => {
    const stateToSave = {
      workout: workoutData,
      selectedDay,
      currentExId,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_KEY_WORKOUT_BUFFER, JSON.stringify(stateToSave));
  }, []);

  // NEW: Enhanced workout setter that auto-saves to localStorage
  const setWorkoutWithPersistence = useCallback(
    updater => {
      setWorkout(prevWorkout => {
        const newWorkout = typeof updater === 'function' ? updater(prevWorkout) : updater;

        if (newWorkout) {
          persistAllToLocalStorage(newWorkout, selectedDay, currentExId);
        }

        return newWorkout;
      });
    },
    [selectedDay, currentExId, persistAllToLocalStorage],
  );

  // NEW: Load all stats in one call
  const loadAllStats = useCallback(async () => {
    if (!USER_ID) return;

    try {
      const stats = await fetchAllStats(USER_ID, 30, 90);
      setAllStats(stats);

      // Set default exercise pick from available exercises
      if (stats?.exerciseDrilldown && Object.keys(stats.exerciseDrilldown).length > 0) {
        setExercisePick(Object.keys(stats.exerciseDrilldown)[0]);
      }
    } catch (error) {
      console.error('Error loading all stats:', error);
    }
  }, [USER_ID]);

  // NEW: Auto-refresh stats every second when on history tab
  useEffect(() => {
    if (tab !== 'history') return;

    loadAllStats();

    // Set up interval for auto-refresh
    const intervalId = setInterval(() => {
      loadAllStats();
    }, 1000); // Refresh every second

    return () => clearInterval(intervalId); // Cleanup on unmount or tab change
  }, [tab, loadAllStats]);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load critical data first - active plan
        const p = await fetchActivePlan(USER_ID);
        if (!mounted) return;
        setPlan(p);

        const rawServerDays = Array.isArray(p?.program?.days) ? p.program.days : [];
        const serverDays = rawServerDays.map(d => ({
          ...d,
          _key: String(d.dayOfWeek ?? '').toLowerCase(),
        }));
        const byKey = Object.fromEntries(serverDays.map(d => [d._key, d]));
        const allKeys = serverDays.map(d => d._key);

        // Use saved day or today's day
        const savedDay = localStorage.getItem(LOCAL_KEY_SELECTED_DAY);
        const initialDayId = savedDay || pickTodayId(allKeys.length ? allKeys : Object.keys(weeklyProgram));

        // Check if we have localStorage data first
        const localStorageData = loadFromLocalStorage();

        let session;
        let finalDayId = initialDayId;

        if (localStorageData && localStorageData.workout) {
          // Use localStorage data if available
          session = localStorageData.workout;
          finalDayId = localStorageData.selectedDay || initialDayId;
          setSelectedDay(finalDayId);
          setWorkoutWithPersistence(session);
          setCurrentExId(localStorageData.currentExId || session.exercises[0]?.id);
          setUnsaved(true);
        } else {
          // Use server data
          setSelectedDay(initialDayId);
          const dayProgram = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: 'Workout', exercises: [] };
          session = createSessionFromDay(dayProgram);
          setWorkoutWithPersistence(session);
          setCurrentExId(session.exercises[0]?.id);
        }

        if (session?.exercises?.length) {
          preloadMedia(session.exercises);
        }

        // Initialize lastSaved mirror
        const mirror = lastSavedRef.current;
        mirror.clear();
        if (session.sets) {
          for (let i = 0; i < session.sets.length; i++) {
            const s = session.sets[i];
            mirror.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
          }
        }

        // Load settings
        try {
          const s = JSON.parse(localStorage.getItem(LOCAL_KEY_SETTINGS) || 'null');
          if (s?.alertSound) setAlertSound(s.alertSound);
        } catch {}

        // Load server records in background ONLY if not using localStorage
        if (!localStorageData?.workout) {
          const dayISO = isoForThisWeeksDay(finalDayId);
          fetchLastDayByName(USER_ID, finalDayId, dayISO)
            .then(({ recordsByExercise }) => {
              if (mounted && session) {
                applyServerRecords(session, recordsByExercise, setWorkoutWithPersistence, lastSavedRef);
              }
            })
            .catch(console.error);
        }

        // Load all stats in background
        loadAllStats();
      } catch (error) {
        console.error('Initial load error:', error);
      } finally {
        timeoutId = setTimeout(() => {
          if (mounted) setLoading(false);
        }, 300);
      }
    };

    loadData();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      apiCache.clear();
    };
  }, [preloadMedia, USER_ID]);

  // NEW: Enhanced changeDay with separate loading state
  const changeDay = useCallback(
    async dayId => {
      setDayLoading(true);
      startTransition(() => setSelectedDay(dayId));

      try {
        const raw = plan?.program?.days || [];
        const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));

        const dayProgram = byKey[dayId] || weeklyProgram[dayId] || { id: dayId, name: 'Workout', exercises: [] };

        const session = createSessionFromDay(dayProgram);
        setWorkoutWithPersistence(session);
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
        await fetchLastDayByName(USER_ID, dayId, dayISO)
          .then(({ recordsByExercise }) => applyServerRecords(session, recordsByExercise, setWorkoutWithPersistence, lastSavedRef))
          .catch(console.error);
      } finally {
        setDayLoading(false);
      }
    },
    [plan, preloadMedia, USER_ID, setWorkoutWithPersistence],
  );

  const addSetForCurrentExercise = useCallback(() => {
    setWorkoutWithPersistence(w => {
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
      lastSavedRef.current.set(newSet.id, { weight: 0, reps: 0, done: false });
      persistBufferThrottled(next);
      return next;
    });
  }, [currentExId, persistBufferThrottled, setWorkoutWithPersistence]);

  const removeSetFromCurrentExercise = useCallback(() => {
    setWorkoutWithPersistence(w => {
      const exSets = w.sets.filter(s => s.exId === currentExId);
      if (exSets.length <= 1) return w;
      const lastSetId = exSets[exSets.length - 1].id;
      const next = { ...w, sets: w.sets.filter(s => s.id !== lastSetId) };
      markUnsaved(next, setUnsaved);
      lastSavedRef.current.delete(lastSetId);
      persistBufferThrottled(next);
      return next;
    });
  }, [currentExId, persistBufferThrottled, setWorkoutWithPersistence]);

  const toggleDone = useCallback(
    setId => {
      setWorkoutWithPersistence(w => {
        const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, done: !s.done } : s)) };
        const s = next.sets.find(x => x.id === setId);
        if (s && !s.pr && s.done && s.weight > 0 && s.reps > 0) {
          const e1rmVal = epley(s.weight, s.reps);
          // Update PRs logic here if needed
        }
        markUnsaved(next, setUnsaved);
        persistBufferThrottled(next);
        return next;
      });
    },
    [persistBufferThrottled, setWorkoutWithPersistence],
  );

  const handleSetValueChange = useCallback(
    (setId, field, value) => {
      setWorkoutWithPersistence(w => {
        const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, [field]: value } : s)) };

        // Auto-check done if both weight and reps have values
        const updatedSet = next.sets.find(s => s.id === setId);
        if (updatedSet && Number(updatedSet.weight) > 0 && Number(updatedSet.reps) > 0) {
          next.sets = next.sets.map(s => (s.id === setId ? { ...s, done: true } : s));
        }

        markUnsaved(next, setUnsaved);
        return next;
      });
    },
    [setWorkoutWithPersistence],
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

      setWorkoutWithPersistence(w => ({
        ...w,
        sets: w.sets.map(s =>
          s.exId === currentExId
            ? (() => {
                const match = data?.records?.find(r => Number(r.setNumber) === Number(s.set));
                return match ? { ...s, serverId: match.id } : s;
              })()
            : s,
        ),
      }));

      // Reload stats after save
      loadAllStats();

      // NEW: Clear localStorage after successful save
      localStorage.removeItem(LOCAL_KEY_WORKOUT_BUFFER);
      flushLocalBufferForExercise(ex.name);
      setUnsaved(false);
    } catch (err) {
      console.error('Save day failed', err);
      persistLocalBuffer(workout);
    } finally {
      setLoadingSaveOnly(false);
      setLoadingSaveDays(false);
    }
  }, [workout?.exercises, currentExId, buildDailyPRPayload, USER_ID, setWorkoutWithPersistence, loadAllStats]);

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

  // NEW: Handle video upload
  const handleVideoUpload = useCallback(result => {
    console.log('Video uploaded successfully:', result);
  }, []);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className='space-y-5 sm:space-y-6'>
      <audio ref={audioRef} src={alertSound} preload='auto' />

      {/* HEADER */}
      <div className='rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
 
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            <PageHeader className='max-lg:!hidden'  title={t('title')} subtitle={t('subtitle')} />
            <div className='flex items-center gap-2'>
              <button
                onClick={() => {
                  !hidden && setAudioOpen(v => !v);
                  setHidden(false);
                }}
                className='px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
                aria-label={t('listen')}>
                <Headphones size={16} />
                <span className='max-md:hidden'>{t('listen')}</span>
              </button>
              <button onClick={() => setSettingsOpen(true)} className='px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition' aria-label={t('settings')}>
                <SettingsIcon size={16} />
                <span className='max-md:hidden'>{t('settings')}</span>
              </button>
              <button onClick={() => setTab('workout')} className={`md:hidden px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium hover:bg-white/20 active:scale-95 transition ${tab === 'workout' ? 'ring-1 ring-white/50' : ''}`} aria-label={t('workout')}>
                <Dumbbell size={16} />
              </button>
              <button onClick={() => setTab('history')} className={`md:hidden px-2 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium hover:bg-white/20 active:scale-95 transition ${tab === 'history' ? 'ring-1 ring-white/50' : ''}`} aria-label={t('history')}>
                <HistoryIcon size={16} />
              </button>
              <TabsPill
                className='max-md:hidden'
                id='my-workouts-tabs'
                tabs={[
                  { key: 'workout', label: t('workout'), icon: Dumbbell },
                  { key: 'history', label: t('history'), icon: HistoryIcon },
                ]}
                active={tab}
                onChange={k => setTab(k)}
              />
            </div>

            <div className='flex items-center gap-2 lg:hidden'>
              <button onClick={() => setDrawerOpen(true)} className='inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:opacity-80 '>
                <MenuIcon size={16} /> {t('exercises')}
              </button>
            </div>
          </div>
        </div>

        <div className='px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white'>
          {tab === 'workout' && (
            <div className='flex-1 relative'>
              {dayLoading && (
                <div className='absolute inset-0 bg-white/80 z-10 flex items-center justify-center'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600'></div>
                </div>
              )}
              <TabsPill className='!rounded-xl' slice={3} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />
            </div>
          )}
        </div>
      </div>

      <AudioHubInline hidden={hidden} setHidden={setHidden} alerting={alerting} setAlerting={setAlerting} open={audioOpen} onClose={() => setAudioOpen(false)} />

      {/* WORKOUT TAB - Unchanged */}
      {tab === 'workout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div className='space-y-5 sm:space-y-6'>
            <div className='rounded-2xl md:border md:border-slate-200 bg-white md:p-2 sm:p-4'>
              <div className='flex flex-col lg:flex-row gap-4'>
                {/* LEFT */}
                <div className='w-full h-full lg:flex-1 min-w-0'>
                  <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${!hasExercises && '!border-transparent'}`}>
                    {!hasExercises ? (
                      <div className='p-6 h-full'>
                        <div className='rounded-2xl h-full border border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
                          <div className='mx-auto mb-3 w-12 h-12 rounded-full bg-white shadow grid place-items-center'>
                            <Dumbbell size={18} className='text-slate-500' />
                          </div>
                          <div className='text-base font-semibold text-slate-700'>{t('noExercises')}</div>
                          <div className='text-sm text-slate-500 mt-1'>{t('pickAnotherDay')}</div>
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

                        {/* Video Upload Button */}
                        {currentExercise && (
                          <div className='px-4 pt-3'>
                            <VideoUploadButton exercise={currentExercise} userId={USER_ID} onVideoUpload={handleVideoUpload} />
                          </div>
                        )}

                        {/* Rest timer */}
                        <RestTimerCard alerting={alerting} setAlerting={setAlerting} initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise?.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise?.rest : 90} audioEl={audioRef} className='mt-1' />

                        {/* Sets table */}
                        <div className='max-md:mb-2 mx-2 md:mb-4 border border-slate-200 rounded-lg overflow-hidden'>
                          <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                              <thead className='bg-slate-50/80 backdrop-blur sticky top-0 z-10'>
                                <tr className='text-left text-slate-500'>
                                  <th className='py-2.5 px-3 font-semibold'>{t('set')}</th>
                                  <th className='py-2.5 px-3 font-semibold'>{t('weight')}</th>
                                  <th className='py-2.5 px-3 font-semibold'>{t('reps')}</th>
                                  <th className='py-2.5 px-3 font-semibold'>{t('done')}</th>
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
                                          handleSetValueChange(s.id, 'weight', Number.isFinite(val) ? val : 0);
                                        }}
                                        onBlur={() => maybeSaveSetOnBlur({ ...s, weight: Number(s.weight) })}
                                        className='h-9 w-[80px] !text-[16px] rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition'
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
                                          handleSetValueChange(s.id, 'reps', Number.isFinite(val) ? val : 0);
                                        }}
                                        onBlur={() => maybeSaveSetOnBlur({ ...s, reps: Number(s.reps) })}
                                        className='h-9 w-[80px] !text-[16px] rounded-md border border-slate-200 bg-white px-3 text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition'
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
                            <Button loading={loadingSaveOnly} icon={<SaveIcon size={14} />} name={t('save')} onClick={saveDayToServer} className='!px-2 !text-sm !py-1 !w-fit' />
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
            </div>
          </div>
        </motion.div>
      )}

      {/* HISTORY TAB - Simplified with new components and auto-refresh indicator */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-4'>
          {/* Auto-refresh indicator */}
          <div className='flex items-center justify-center'>
            <div className='flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs'>
              <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
              Live updates every second
            </div>
          </div>

          <StatsOverview overview={allStats?.overview} />
          <AllTimeBests allTimeBests={allStats?.allTimeBests} />
          <ExerciseDrilldown exerciseDrilldown={allStats?.exerciseDrilldown} exercisePick={exercisePick} onExerciseChange={setExercisePick} />
          <SessionHistory sessionHistory={allStats?.sessionHistory} />
        </motion.div>
      )}

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
