'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabsPill, spring } from '@/components/dashboard/ui/UI';
import {
	Dumbbell,
	X,
	Minus,
	Plus,
	Video as VideoIcon,
	Image as ImageIcon,
	Headphones,
	Upload,
	CloudOff,
	Cloud,
	Info,
	StickyNote,
} from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api from '@/utils/axios';
import weeklyProgram from './exercises';
import { createSessionFromDay } from '@/components/pages/workouts/helpers';
import { RestTimerCard } from '@/components/pages/workouts/RestTimerCard';
import { AudioHubInline } from '@/components/pages/workouts/AudioHub';
import { ExerciseList } from '@/components/pages/workouts/ExerciseList';
import { InlineVideo } from '@/components/pages/workouts/InlineVideo';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import Img from '@/components/atoms/Img';

/* =========================
	 Constants / tiny helpers
========================= */
export const DEFAULT_SOUNDS = [
	'/sounds/1.mp3',
	'/sounds/2.mp3',
	'/sounds/sound.wav',
	'/sounds/alert2.mp3',
	'/sounds/alert3.mp3',
	'/sounds/alert4.mp3',
	'/sounds/alert5.mp3',
	'/sounds/alert6.mp3',
	'/sounds/alert7.mp3',
	'/sounds/alert8.mp3',
];

const LOCAL_KEY_SELECTED_DAY = 'mw.selected.day';
const LOCAL_KEY_QUEUE = 'mw.pendingPRs.v1'; // array of items: { userId, date, exerciseName, records, createdAt }

const jsDayToId = d =>
	['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';
const todayISO = () => new Date().toISOString().slice(0, 10);

function dateOnlyISO(d = new Date()) {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function normalizeTempo(raw) {
	const s = String(raw ?? '').trim();
	if (!s) return '1/1/1';
	const cleaned = s.replace(/[.,\s-]+/g, '/').replace(/\/+/g, '/');
	const parts = cleaned.split('/').filter(Boolean);
	if (parts.length !== 3) return '1/1/1';
	const nums = parts.map(x => Number(x));
	if (nums.some(n => !Number.isFinite(n) || n <= 0 || n > 20)) return '1/1/1';
	return `${nums[0]}/${nums[1]}/${nums[2]}`;
}

function normalizeReps(raw) {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	let x = s
		.toLowerCase()
		.replace(/[–—]/g, '-')
		.replace(/\bto\b/g, '-')
		.replace(/إلى/g, '-')
		.replace(/\//g, '-')
		.replace(/\s+/g, '');
	x = x.replace(/[^\d-]/g, '');
	x = x.replace(/-+/g, '-').replace(/^-|-$/g, '');
	if (!x) return '';
	if (x.includes('-')) {
		const [a, b] = x.split('-').filter(Boolean);
		const n1 = Number(a);
		const n2 = Number(b);
		if (Number.isFinite(n1) && Number.isFinite(n2) && n1 > 0 && n2 > 0) {
			const lo = Math.min(n1, n2);
			const hi = Math.max(n1, n2);
			return lo === hi ? String(lo) : `${lo}-${hi}`;
		}
		return '';
	}
	const n = Number(x);
	return Number.isFinite(n) && n > 0 ? String(n) : '';
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

/* === Normalize Arabic/Eastern digits + comma === */
function normalizeNumericInput(str = '') {
	const map = {
		'٠': '0',
		'١': '1',
		'٢': '2',
		'٣': '3',
		'٤': '4',
		'٥': '5',
		'٦': '6',
		'٧': '7',
		'٨': '8',
		'٩': '9',
		'۰': '0',
		'۱': '1',
		'۲': '2',
		'۳': '3',
		'۴': '4',
		'۵': '5',
		'۶': '6',
		'۷': '7',
		'۸': '8',
		'۹': '9',
	};
	return String(str)
		.replace(/[٠-٩۰-۹]/g, d => map[d] || d)
		.replace(',', '.');
}

/* =========================
	 API helpers
========================= */
async function fetchActivePlan(userId) {
	const { data } = await api.get('/plans/active', { params: { userId } });
	if (data?.status === 'none' || data?.error) {
		return { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) }, notes: [] };
	}
	if (data?.program?.days?.length) return data;
	return { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) }, notes: [] };
}

function makeSafeId(str = '') {
	return String(str)
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-_]/g, '');
}

function normalizeDayProgram(dayProgram = {}) {
  const warmup = Array.isArray(dayProgram.warmupExercises) ? dayProgram.warmupExercises : [];
  const main = Array.isArray(dayProgram.exercises) ? dayProgram.exercises : [];
  const cardio = Array.isArray(dayProgram.cardioExercises) ? dayProgram.cardioExercises : [];

  const withGroup = (arr, group) =>
    arr.map((x, idx) => ({
      ...x,
      group,
      // instanceId فريد داخل اليوم حتى لو نفس x.id تكرر
      instanceId: `${group}:${x.id}:${idx}`,
      // مهم جدًا: خلي id اللي تستخدمه في الجلسة هو instanceId
      id: `${group}:${x.id}:${idx}`,
      originalExerciseId: x.id,
    }));

  return {
    ...dayProgram,
    warmupExercises: warmup,
    exercises: main,
    cardioExercises: cardio,
    allExercises: [
      ...withGroup(warmup, "warmup"),
      ...withGroup(main, "workout"),
      ...withGroup(cardio, "cardio"),
    ],
  };
}



function pickInitialSection(dayProgramNorm) {
	const warm = dayProgramNorm?.warmupExercises?.length ? 'warmup' : null;
	const main = dayProgramNorm?.exercises?.length ? 'workout' : null;
	const card = dayProgramNorm?.cardioExercises?.length ? 'cardio' : null;
	return main || warm || card || 'workout';
}

async function fetchLastDayByName(userId, day, onOrBefore) {
	try {
		const plan = await fetchActivePlan(userId);
		const dayProgramRaw =
			plan?.program?.days?.find(d => String(d.dayOfWeek ?? '').toLowerCase() === day.toLowerCase()) ||
			weeklyProgram[day] ||
			{ exercises: [] };

		const dayProgram = normalizeDayProgram(dayProgramRaw);

		const exerciseNames = (dayProgram.allExercises || []).map(ex => ex.name).filter(Boolean);
		if (exerciseNames.length === 0) {
			return { date: null, day, recordsByExercise: {} };
		}

		const { data } = await api.post('/prs/last-workout-sets', { userId, exercises: exerciseNames });
		const recordsByExercise = {};
		(data?.exercises || []).forEach(exercise => {
			if (exercise?.records?.length > 0) {
				recordsByExercise[exercise.exerciseName] = exercise.records.map(r => ({
					weight: Number(r.weight) || 0,
					reps: Number(r.reps) || 0,
					done: !!r.done,
					setNumber: Number(r.setNumber) || 1,
					id: r.id,
				}));
			}
		});

		return {
			date: (data?.exercises || []).find(ex => ex.date)?.date || null,
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

/* =========================
	 Local queue helpers
========================= */
function loadQueue() {
	try {
		const arr = JSON.parse(localStorage.getItem(LOCAL_KEY_QUEUE) || '[]');
		return Array.isArray(arr) ? arr : [];
	} catch {
		return [];
	}
}
function saveQueue(arr) {
	try {
		localStorage.setItem(LOCAL_KEY_QUEUE, JSON.stringify(arr));
	} catch { }
}
function queueKey(item) {
	return `${item.userId}__${item.date}__${item.exerciseName}`.toLowerCase();
}
function upsertQueueItem(item) {
	const q = loadQueue();
	const key = queueKey(item);
	const idx = q.findIndex(x => queueKey(x) === key);
	if (idx >= 0) q[idx] = { ...q[idx], ...item, createdAt: q[idx].createdAt || item.createdAt || Date.now() };
	else q.push({ ...item, createdAt: Date.now() });
	saveQueue(q);
}
function removeQueueItem(item) {
	const q = loadQueue();
	const key = queueKey(item);
	saveQueue(q.filter(x => queueKey(x) !== key));
}

/* =========================
	 Small UI helpers
========================= */
function ButtonMini({ name, icon, onClick, loading, disabled, className = '' }) {
	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled || loading}
			className={[
				'inline-flex items-center gap-2 rounded-lg px-3 h-9 text-sm font-medium shadow-sm',
				'border border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700',
				'active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed',
				className,
			].join(' ')}
		>
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

function NotesModal({ open, onClose, title, notes = [], t }) {
	if (!open) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className='fixed inset-0 z-[120] bg-black/45 backdrop-blur-[1px]'
				onClick={onClose}
			/>
			<motion.div
				initial={{ y: 22, opacity: 0, scale: 0.98 }}
				animate={{ y: 0, opacity: 1, scale: 1 }}
				exit={{ y: 22, opacity: 0, scale: 0.98 }}
				transition={{ type: 'spring', stiffness: 260, damping: 26 }}
				className='fixed left-1/2 top-[12%] -translate-x-1/2 z-[125] w-[92%] max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden'
				onClick={e => e.stopPropagation()}
			>
				<div className='p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white'>
					<div className='min-w-0'>
						<div className='text-xs text-slate-500'>{t('notes.modalTitle')}</div>
						<div className='text-sm font-semibold text-slate-900 truncate'>{title || t('notes.fallbackTitle')}</div>
					</div>
					<button
						onClick={onClose}
						className='p-2 rounded-xl hover:bg-slate-100'
						aria-label={t('actions.close')}
						title={t('actions.close')}
					>
						<X size={16} />
					</button>
				</div>

				<div className='p-4'>
					{Array.isArray(notes) && notes.length ? (
						<ul className='space-y-2'>
							{notes.map((n, idx) => (
								<li
									key={idx}
									className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800'
								>
									<div className='flex items-start gap-2'>
										<span className='mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-semibold'>
											{idx + 1}
										</span>
										<span className='leading-relaxed'>{String(n)}</span>
									</div>
								</li>
							))}
						</ul>
					) : (
						<div className='rounded-xl border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500'>
							{t('notes.empty')}
						</div>
					)}
				</div>

				<div className='p-3 border-t border-slate-100 flex items-center justify-end bg-white'>
					<button
						onClick={onClose}
						className='h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm'
					>
						{t('actions.close')}
					</button>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

/* =========================
	 Component
========================= */
export default function MyWorkoutsPage() {
	const t = useTranslations('MyWorkouts');
	const user = useUser();
	const USER_ID = user?.id;

	const [loading, setLoading] = useState(true);
	const [plan, setPlan] = useState(null);

	const [selectedDay, setSelectedDay] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY_SELECTED_DAY) || 'monday' : 'monday'
	);

	const [activeSection, setActiveSection] = useState('workout'); // warmup | workout | cardio

	const [workout, setWorkout] = useState(null);
	const [currentExId, setCurrentExId] = useState(undefined);
	const [hidden, setHidden] = useState(false);

	// media tab
	const [activeMedia, setActiveMedia] = useState('image');
	const audioRef = useRef(null);
	const ALERT_SOUND = DEFAULT_SOUNDS[2];
	const [alerting, setAlerting] = useState(false);

	// misc
	const [audioOpen, setAudioOpen] = useState(false);
	const [unsaved, setUnsaved] = useState(false);

	// notes modal
	const [notesOpen, setNotesOpen] = useState(false);

	// mirrors and buffers
	const lastSavedRef = useRef(new Map()); // setId -> { weight, reps, done }
	const [inputBuffer, setInputBuffer] = useState({}); // key -> string

	// sync status
	const [syncing, setSyncing] = useState(false);
	const [lastSyncStatus, setLastSyncStatus] = useState('');
	const [completedExercises, setCompletedExercises] = useState(new Set());

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

	// merge helper — **THIS updates the table after sync**
	const applyRecordsToWorkout = useCallback((exerciseName, records) => {
		if (!records || !records.length) return;
		setWorkout(prev => {
			if (!prev) return prev;
			const bySet = {};
			records.forEach(r => {
				bySet[Number(r.setNumber) || 1] = r;
			});
			const next = {
				...prev,
				sets: prev.sets.map(s => {
					if (s.exName !== exerciseName) return s;
					const r = bySet[Number(s.set) || 1];
					if (!r) return s;
					return {
						...s,
						weight: Number(r.weight) || 0,
						reps: Number(r.reps) || 0,
						done: !!r.done,
						serverId: r.id ?? s.serverId,
					};
				}),
			};
			lastSavedRef.current.clear();
			next.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
			return next;
		});
	}, []);

	// apply initial PRs weight+reps+done (from server)
	const applyInitialRecordsWithDone = useCallback((session, recordsByExercise) => {
		if (!session?.sets?.length) return session;
		const next = { ...session, sets: session.sets.map(s => ({ ...s })) };
		Object.entries(recordsByExercise || {}).forEach(([exName, recs]) => {
			const bySet = {};
			recs.forEach(r => (bySet[Number(r.setNumber) || 1] = r));
			next.sets = next.sets.map(s => {
				if (s.exName !== exName) return s;
				const r = bySet[Number(s.set) || 1];
				if (!r) return s;
				return {
					...s,
					weight: Number(r.weight) || 0,
					reps: Number(r.reps) || 0,
					done: !!r.done,
					serverId: r.id ?? s.serverId,
				};
			});
		});
		return next;
	}, []);

	function persistExerciseSnapshot(nextWorkout, exId, userId) {
		if (!nextWorkout || !exId || !userId) return;
		const ex = nextWorkout.exercises?.find(e => e.id === exId);
		if (!ex) return;

		const records = (nextWorkout.sets || [])
			.filter(s => s.exId === exId)
			.map(s => ({
				id: s.serverId,
				weight: Number(s.weight) || 0,
				reps: Number(s.reps) || 0,
				done: !!s.done,
				setNumber: Number(s.set) || 1,
			}));

		const item = { userId: userId, date: todayISO(), exerciseName: ex.name, records };
		upsertQueueItem(item);
	}

	const applyLocalQueuedSnapshotIfAny = useCallback(() => {
		setWorkout(prev => {
			if (!prev) return prev;
			const ex = prev.exercises?.find(e => e.id === currentExId);
			if (!ex || !USER_ID) return prev;

			const queued = loadQueue().find(
				i => i.userId === USER_ID && i.exerciseName === ex.name && i.date === todayISO()
			);
			if (!queued) return prev;

			const bySet = {};
			(queued.records || []).forEach(r => (bySet[Number(r.setNumber) || 1] = r));

			const next = {
				...prev,
				sets: prev.sets.map(s =>
					s.exName !== ex.name
						? s
						: {
							...s,
							weight: Number(bySet[s.set]?.weight) || 0,
							reps: Number(bySet[s.set]?.reps) || 0,
							done: !!bySet[s.set]?.done,
						}
				),
			};

			lastSavedRef.current.clear();
			next.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	const isExerciseCompleted = useCallback(
		exerciseId => {
			if (!workout?.sets) return false;
			const exerciseSets = workout.sets.filter(s => s.exId === exerciseId);
			return exerciseSets.length > 0 && exerciseSets.every(set => set.done);
		},
		[workout]
	);

	const toggleExerciseCompletion = useCallback(
		exerciseId => {
			const isCompleted = isExerciseCompleted(exerciseId);

			setWorkout(prev => {
				if (!prev) return prev;

				const next = {
					...prev,
					sets: prev.sets.map(s => (s.exId === exerciseId ? { ...s, done: !isCompleted } : s)),
				};

				persistExerciseSnapshot(next, exerciseId, USER_ID);
				setUnsaved(true);

				setCompletedExercises(prevSet => {
					const newSet = new Set(prevSet);
					if (!isCompleted) newSet.add(exerciseId);
					else newSet.delete(exerciseId);
					return newSet;
				});

				return next;
			});
		},
		[isExerciseCompleted, USER_ID]
	);

	useEffect(() => {
		if (workout?.exercises) {
			const newCompleted = new Set();
			workout.exercises.forEach(exercise => {
				if (isExerciseCompleted(exercise.id)) newCompleted.add(exercise.id);
			});
			setCompletedExercises(newCompleted);
		}
	}, [workout, isExerciseCompleted]);

	// Initial load
	useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				setLoading(true);

				const p = await fetchActivePlan(USER_ID);
				if (!mounted) return;
				setPlan(p);

				const rawServerDays = Array.isArray(p?.program?.days) ? p.program.days : [];
				const serverDays = rawServerDays.map(d => ({ ...d, _key: String(d.dayOfWeek ?? '').toLowerCase() }));
				const byKey = Object.fromEntries(serverDays.map(d => [d._key, d]));
				const allKeys = serverDays.map(d => d._key);

				const savedDay =
					(typeof window !== 'undefined' && localStorage.getItem(LOCAL_KEY_SELECTED_DAY)) || null;
				const initialDayId = savedDay || pickTodayId(allKeys.length ? allKeys : Object.keys(weeklyProgram));
				setSelectedDay(initialDayId);

				const dayProgramRaw = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId };
				const dayProgramNorm = normalizeDayProgram(dayProgramRaw);
				const initSection = pickInitialSection(dayProgramNorm);
				setActiveSection(initSection);

				let session = createSessionFromDay(dayProgramNorm); // uses allExercises now
				const firstInSection =
					(session.exercises || []).find(x => x.group === initSection) || session.exercises?.[0];

				const firstId = firstInSection?.id;
				setCurrentExId(firstId);

				setWorkout(session);
				if (session?.exercises?.length) preloadMedia(session.exercises);

				lastSavedRef.current.clear();
				session?.sets?.forEach(s => {
					lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
				});

				const dayISO = isoForThisWeeksDay(initialDayId);
				const { recordsByExercise } = await fetchLastDayByName(USER_ID, initialDayId, dayISO);
				if (!mounted) return;

				session = applyInitialRecordsWithDone(session, recordsByExercise);

				// Apply queued snapshot for first exercise
				const firstEx = firstInSection;
				if (firstEx && USER_ID) {
					const queued = loadQueue().find(
						i => i.userId === USER_ID && i.exerciseName === firstEx.name && i.date === todayISO()
					);
					if (queued) {
						const bySet = {};
						(queued.records || []).forEach(r => (bySet[Number(r.setNumber) || 1] = r));
						session = {
							...session,
							sets: session.sets.map(s =>
								s.exName !== firstEx.name
									? s
									: {
										...s,
										weight: Number(bySet[s.set]?.weight) || 0,
										reps: Number(bySet[s.set]?.reps) || 0,
										done: !!bySet[s.set]?.done,
									}
							),
						};
						setUnsaved(true);
					}
				}

				setWorkout(session);

				lastSavedRef.current.clear();
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));

				trySyncQueue(false);
			} catch (e) {
				console.error('Initial load error:', e);
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [USER_ID, preloadMedia, applyInitialRecordsWithDone]);

	// Keep "unsaved" badge accurate
	useEffect(() => {
		const exName = workout?.exercises?.find(e => e.id === currentExId)?.name;
		if (!exName || !USER_ID) {
			setUnsaved(false);
			return;
		}
		const hasPending = loadQueue().some(
			i => i.userId === USER_ID && i.exerciseName === exName && i.date === todayISO()
		);
		setUnsaved(hasPending);
	}, [workout, currentExId, USER_ID]);

	const ensureSetsCountForExercise = useCallback((w, exId, desired, fallbackReps) => {
		if (!w || exId == null) return w;

		const exIdStr = String(exId);
		const d = Math.max(1, Math.min(20, Number(desired) || 1));

		const existing = (w.sets || []).filter(s => String(s.exId) === exIdStr);
		const ex = (w.exercises || []).find(e => String(e.id) === exIdStr);

		// احذف أي sets زيادة + نظّف التكرارات لو موجودة
		const keepBySetNumber = new Map();
		existing
			.sort((a, b) => Number(a.set) - Number(b.set))
			.forEach(s => {
				const sn = Number(s.set) || 1;
				if (!keepBySetNumber.has(sn)) keepBySetNumber.set(sn, s); // أول واحد فقط
			});

		const kept = [...keepBySetNumber.values()].slice(0, d);

		// خلي باقي sets للتمارين الأخرى كما هي
		let nextSets = (w.sets || []).filter(s => String(s.exId) !== exIdStr);

		// أضف الموجود
		nextSets.push(...kept);

		// كمّل الناقص
		const base = kept[kept.length - 1] || { targetReps: fallbackReps || ex?.targetReps || '10', restTime: 90 };
		for (let i = kept.length + 1; i <= d; i++) {
			nextSets.push({
				id: `${exIdStr}-set${i}`,
				exId: exIdStr,
				exName: ex?.name || t('exerciseFallback'),
				set: i,
				targetReps: fallbackReps || ex?.targetReps || base.targetReps,
				weight: 0,
				reps: 0,
				effort: null,
				done: false,
				pr: false,
				restTime: Number.isFinite(ex?.rest ?? ex?.restSeconds) ? (ex?.rest ?? ex?.restSeconds) : base.restTime,
			});
		}

		return { ...w, sets: nextSets };
	}, [t]);


	// Change day (✅ FIX: setSelectedDay)
	const changeDay = useCallback(
		async dayId => {
			try {
				setSelectedDay(dayId); // ✅ this is the main fix for TabsPill

				const raw = plan?.program?.days || [];
				const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
				const dayProgramRaw = byKey[dayId] || weeklyProgram[dayId] || { id: dayId, name: t('workout') };
				const dayProgramNorm = normalizeDayProgram(dayProgramRaw);

				const nextSection = pickInitialSection(dayProgramNorm);
				setActiveSection(nextSection);

				let session = createSessionFromDay(dayProgramNorm);
				const firstInSection =
					(session.exercises || []).find(x => x.group === nextSection) || session.exercises?.[0];

				setWorkout(session);
				setCurrentExId(firstInSection?.id != null ? String(firstInSection.id) : undefined);

				setActiveMedia('image');

				if (session.exercises?.length) preloadMedia(session.exercises);

				lastSavedRef.current.clear();
				setInputBuffer({});
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
				setUnsaved(false);

				const dayISO = isoForThisWeeksDay(dayId);
				const { recordsByExercise } = await fetchLastDayByName(USER_ID, dayId, dayISO);
				session = applyInitialRecordsWithDone(session, recordsByExercise);
				setWorkout(session);

				lastSavedRef.current.clear();
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));

				localStorage.setItem(LOCAL_KEY_SELECTED_DAY, dayId);

				applyLocalQueuedSnapshotIfAny();
			} catch (e) {
				console.error(e);
			}
		},
		[plan, preloadMedia, USER_ID, applyInitialRecordsWithDone, applyLocalQueuedSnapshotIfAny, t]
	);

	// === Set mutations
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
				exName: ex?.name || t('exerciseFallback'),
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
			persistExerciseSnapshot(next, currentExId, USER_ID);
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID, t]);

	const removeSetFromCurrentExercise = useCallback(() => {
		setWorkout(w => {
			if (!w) return w;
			const exSets = w.sets.filter(s => s.exId === currentExId);
			if (exSets.length <= 1) return w;

			const lastSetId = exSets[exSets.length - 1].id;
			const next = { ...w, sets: w.sets.filter(s => s.id !== lastSetId) };

			lastSavedRef.current.delete(lastSetId);
			setInputBuffer(prev => {
				const n = { ...prev };
				delete n[`${lastSetId}:weight`];
				delete n[`${lastSetId}:reps`];
				return n;
			});

			persistExerciseSnapshot(next, currentExId, USER_ID);
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	const toggleDone = useCallback(
		setId => {
			setWorkout(w => {
				if (!w) return w;
				const next = { ...w, sets: w.sets.map(s => (s.id === setId ? { ...s, done: !s.done } : s)) };
				persistExerciseSnapshot(next, currentExId, USER_ID);
				setUnsaved(true);
				return next;
			});
		},
		[currentExId, USER_ID]
	);

	const bump = useCallback(
		(setId, field, delta) => {
			setInputBuffer(prev => {
				const n = { ...prev };
				delete n[`${setId}:${field}`];
				return n;
			});

			setWorkout(w => {
				if (!w) return w;

				let next = {
					...w,
					sets: w.sets.map(s => (s.id === setId ? { ...s, [field]: Math.max(0, Number(s[field] || 0) + delta) } : s)),
				};

				const u = next.sets.find(s => s.id === setId);
				if (u && Number(u.weight) > 0 && Number(u.reps) > 0) {
					next = { ...next, sets: next.sets.map(s => (s.id === setId ? { ...s, done: true } : s)) };
				}

				persistExerciseSnapshot(next, currentExId, USER_ID);
				setUnsaved(true);
				return next;
			});
		},
		[currentExId, USER_ID]
	);

	const setValue = useCallback(
		(setId, field, value) => {
			const val = Number(value);
			setWorkout(w => {
				if (!w) return w;

				let next = {
					...w,
					sets: w.sets.map(s => (s.id === setId ? { ...s, [field]: Number.isFinite(val) ? val : 0 } : s)),
				};

				const u = next.sets.find(s => s.id === setId);
				if (u && Number(u.weight) > 0 && Number(u.reps) > 0) {
					next = { ...next, sets: next.sets.map(s => (s.id === setId ? { ...s, done: true } : s)) };
				}

				persistExerciseSnapshot(next, currentExId, USER_ID);
				setUnsaved(true);
				return next;
			});
		},
		[currentExId, USER_ID]
	);

	// Try sync entire queue
	const trySyncQueue = useCallback(
		async (showStatus = true) => {
			const qStart = loadQueue();
			if (!qStart.length) {
				if (showStatus) {
					setLastSyncStatus('ok');
					setTimeout(() => setLastSyncStatus(''), 1200);
				}
				setUnsaved(false);
				return;
			}

			setSyncing(true);
			let anyError = false;
			for (const item of qStart) {
				try {
					const data = await upsertDailyPR(item.userId, item.exerciseName, item.date, item.records);
					const mergedRecords = Array.isArray(data?.records) && data.records.length ? data.records : item.records;
					applyRecordsToWorkout(item.exerciseName, mergedRecords);
					removeQueueItem(item);
				} catch (e) {
					console.error('Sync failed for', item.exerciseName, e);
					anyError = true;
				}
			}
			setSyncing(false);

			if (showStatus) {
				setLastSyncStatus(anyError ? 'error' : 'ok');
				setTimeout(() => setLastSyncStatus(''), 1500);
			}

			const still = loadQueue();
			const exName = workout?.exercises?.find(e => e.id === currentExId)?.name;
			const hasPendingForCurrent =
				!!exName && still.some(i => i.userId === USER_ID && i.exerciseName === exName && i.date === todayISO());
			setUnsaved(hasPendingForCurrent);
		},
		[USER_ID, workout, currentExId, applyRecordsToWorkout]
	);

	useEffect(() => {
		const onFocus = () => trySyncQueue(false);
		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
	}, [trySyncQueue]);

	const hasExercises = !!workout?.exercises?.length;

	const exercisesBySection = useMemo(() => {
		const all = Array.isArray(workout?.exercises) ? workout.exercises : [];
		return all.filter(ex => (ex.group || 'workout') === activeSection);
	}, [workout?.exercises, activeSection]);

	const currentExercise = useMemo(() => {
		const all = workout?.exercises || [];
		let ex = all.find(e => e.id === currentExId);
		if (!ex) ex = exercisesBySection[0];
		return ex;
	}, [workout?.exercises, currentExId, exercisesBySection]);

	// keep currentExId valid when switching section
	useEffect(() => {
		if (!exercisesBySection.length) return;
		const exists = exercisesBySection.some(e => e.id === currentExId);
		if (!exists) {
			setCurrentExId(exercisesBySection[0].id);
			setActiveMedia('image');
		}
	}, [activeSection, exercisesBySection, currentExId]);

	const currentSets = useMemo(
		() => (workout?.sets || []).filter(s => s.exId === currentExercise?.id),
		[workout?.sets, currentExercise?.id]
	);

	const exTargetSets = useMemo(() => {
		const n = Number(currentExercise?.targetSets ?? 0);
		if (!Number.isFinite(n) || n <= 0) return Math.max(1, currentSets.length || 1);
		return Math.min(20, Math.max(1, Math.round(n)));
	}, [currentExercise?.targetSets, currentSets.length]);

	const exTempo = useMemo(() => normalizeTempo(currentExercise?.tempo), [currentExercise?.tempo]);
	const exReps = useMemo(() => normalizeReps(currentExercise?.targetReps), [currentExercise?.targetReps]);

	// Ensure sets count matches targetSets when exercise changes
	useEffect(() => {
		if (!currentExercise?.id) return;
		setWorkout(w => ensureSetsCountForExercise(w, currentExercise.id, currentExercise?.targetSets ?? 1, exReps || currentExercise?.targetReps));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentExercise?.id]);

	const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

	const dayTabs = useMemo(() => {
		const raw = plan?.program?.days || [];
		const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
		return weekOrder
			.filter(d => byKey[d] || weeklyProgram[d])
			.map(d => ({
				key: d,
				label: t(`days.${d}`),
				name: byKey[d]?.name || weeklyProgram[d]?.name || t(`days.${d}`),
			}));
	}, [plan, t]);

	const sectionTabs = useMemo(() => {
		const all = workout?.exercises || [];
		const hasWarmup = all.some(e => (e.group || 'workout') === 'warmup');
		const hasWorkout = all.some(e => (e.group || 'workout') === 'workout');
		const hasCardio = all.some(e => (e.group || 'workout') === 'cardio');

		const list = [];
		if (hasWarmup) list.push({ key: 'warmup', label: t('sections.warmup') });
		if (hasWorkout) list.push({ key: 'workout', label: t('sections.workout') });
		if (hasCardio) list.push({ key: 'cardio', label: t('sections.cardio') });

		// fallback if empty
		return list.length ? list : [{ key: 'workout', label: t('sections.workout') }];
	}, [workout?.exercises, t]);

	const Actions = ({ className }) => (
		<div className={`flex items-center gap-2 ${className}`}>
			<button
				onClick={() => {
					!hidden && setAudioOpen(v => !v);
					setHidden(false);
				}}
				className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
				aria-label={t('listen')}
				title={t('listen')}
			>
				<Headphones size={16} />
				<span className='max-md:hidden'>{t('listen')}</span>
			</button>

			<button
				onClick={() => setNotesOpen(true)}
				className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
				aria-label={t('notes.show')}
				title={t('notes.show')}
			>
				<StickyNote size={16} />
				<span className='max-md:hidden'>{t('notes.show')}</span>
			</button>
		</div>
	);

	/* ===== Buffer helpers ===== */
	const getBufferedValue = (setId, field, numericVal) => {
		const key = `${setId}:${field}`;
		if (Object.prototype.hasOwnProperty.call(inputBuffer, key)) return inputBuffer[key];
		if (Number(numericVal) === 0) return '';
		return String(numericVal ?? '');
	};

	const handleInputChange = (setId, field, raw) => {
		const key = `${setId}:${field}`;
		let v = normalizeNumericInput(raw);
		v = v.replace(/[^\d.]/g, '');
		const parts = v.split('.');
		if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
		setInputBuffer(prev => ({ ...prev, [key]: v }));
	};

	const handleInputBlur = (setId, field) => {
		const key = `${setId}:${field}`;
		const raw = inputBuffer[key];
		setInputBuffer(prev => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
		const num = raw === '' || raw == null ? 0 : Number(raw);
		setValue(setId, field, Number.isFinite(num) ? num : 0);
	};

	if (loading) {
		return (
			<div className='space-y-5 sm:space-y-6 animate-pulse'>
				<div className='rounded-lg overflow-hidden border border-indigo-200'>
					<div className='relative p-6 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white'>
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
					<div className='space-y-4'>
						<div className='rounded-lg border border-slate-200 bg-white p-4'>
							<div className='h-64 bg-slate-200 rounded-lg'></div>
						</div>
					</div>
					<div className='hidden lg:block space-y-3'>
						{[1, 2, 3, 4].map(i => (
							<div key={i} className='h-16 bg-slate-200 rounded-lg' />
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-5 sm:space-y-6'>
			<audio ref={audioRef} src={ALERT_SOUND} preload='auto' />

			{/* NOTES MODAL */}
			<NotesModal
				open={notesOpen}
				onClose={() => setNotesOpen(false)}
				title={plan?.name}
				notes={plan?.notes || []}
				t={t}
			/>

			{/* HEADER */}
			<div className={'relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur '}>
				<div className='absolute inset-0 overflow-hidden'>
					<div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
					<div
						className='absolute inset-0 opacity-15'
						style={{
							backgroundImage:
								'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
							backgroundSize: '22px 22px',
							backgroundPosition: '-1px -1px',
						}}
					/>
					<div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
					<div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
				</div>

				<div className='relative py-2 p-3 md:p-5 text-white'>
					<div className='flex  flex-row  items-center justify-between gap-3 '>
						<div className='min-w-0'>
							<h1 className='text-xl md:text-4xl font-semibold truncate'>
								{t('title')}
 							</h1>
							<p className='text-white/85 mt-1 max-md:hidden '>{t('subtitle')}</p>
						</div>
						<Actions className={' md:!hidden'} />
					</div>

					<div className=' mt-2 md:mt-4 flex items-center justify-between '>
						<TabsPill
							className='!rounded-lg'
							sliceInPhone={false}
							id='day-tabs'
							tabs={dayTabs}
							active={selectedDay}
							onChange={changeDay}
						/>
						<Actions className={'max-md:!hidden'} />
					</div>
				</div>
			</div>

			<AudioHubInline
				t={t}
				hidden={hidden}
				setHidden={setHidden}
				alerting={alerting}
				setAlerting={setAlerting}
				open={audioOpen}
				onClose={() => setAudioOpen(false)}
				key='audio-hub'
			/>

			{/* WORKOUT */}
			<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
				<div className='flex flex-col lg:flex-row gap-4'>
					{/* LEFT */}
					<div className='md:rounded-lg md:bg-white h-fit md:p-4 md:shadow-sm w-full  lg:flex-1 min-w-0'>
						<div className={`relative md:bg-white/80 backdrop-blur md:rounded-lg md:overflow-hidden ${!hasExercises ? '!border-transparent' : ''}`}>
							{!hasExercises ? (
								<div className='p-5'>
									<div className='relative flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 text-center shadow-sm'>
										<div className='mb-4 grid h-16 w-16 place-items-center rounded-full bg-white shadow ring-1 ring-slate-200'>
											<Dumbbell size={24} className='text-slate-500' />
										</div>
										<h3 className='text-lg font-semibold text-slate-800'>{t('noExercises')}</h3>
										<p className='mt-1  text-xs text-slate-400 italic '>{t('pickAnotherDay')}</p>
									</div>
								</div>
							) : (
								<>
									{/* SECTION TABS */}
									<div className='px-1 pt-2'>
										<div className='rounded-xl border border-slate-200 bg-white/70 p-1 inline-flex w-full sm:w-auto'>
											{sectionTabs.map(st => {
												const active = activeSection === st.key;
												return (
													<button
														key={st.key}
														onClick={() => setActiveSection(st.key)}
														className={[
															'relative flex-1 sm:flex-none px-3 py-2 text-xs rounded-xl transition font-medium min-h-[40px]',
															active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800',
														].join(' ')}
														aria-pressed={active}
													>
														{st.label}
														{active && (
															<motion.span
																layoutId='secTab'
																className='absolute inset-0 -z-10 rounded-xl bg-indigo-50 shadow-sm border border-indigo-100'
																transition={{ type: 'spring', stiffness: 420, damping: 34 }}
															/>
														)}
													</button>
												);
											})}
										</div>
									</div>

									<div className='mt-2'>
										<div className='relative w-full rounded-lg overflow-hidden '>
											<div className='max-md:h-[250px] md:aspect-[16/9] '>
												{currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? (
													<InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} />
												) : (
													<Img
														showBlur={false}
														key={currentExercise?.id + '-image'}
														src={currentExercise?.img}
														alt={currentExercise?.name}
														className='w-full h-full object-contain '
														loading='lazy'
													/>
												)}
											</div>

											{(() => {
												const hasImg = !!currentExercise?.img;
												const hasVideo1 = !!currentExercise?.video;
												const hasVideo2 = !!currentExercise?.video2;

												return (
													<div className={`absolute right-1  md:right-3 flex items-center gap-2 ${activeMedia === 'video' ? 'bottom-[70px] ' : ' bottom-1 md:bottom-3'} duration-500 `}>
														<div className='inline-flex max-md:flex-col items-center gap-[4px] rounded-lg bg-slate-100/70 p-1 ring-1 ring-black/5 backdrop-blur-md'>
															<button
																type='button'
																aria-pressed={activeMedia === 'image'}
																disabled={!hasImg}
																onClick={() => setActiveMedia('image')}
																className={[
																	'relative inline-flex items-center gap-1.5 w-[35px] h-[35px] justify-center text-xs sm:text-sm rounded-lg outline-none transition',
																	activeMedia === 'image' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900',
																	!hasImg ? 'opacity-50 cursor-not-allowed' : '',
																	'focus-visible:ring-2 focus-visible:ring-indigo-400/40',
																].join(' ')}
																title={t('showImage')}
																aria-label={t('showImage')}
															>
																<ImageIcon size={14} />
																{activeMedia === 'image' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
															</button>

															<button
																type='button'
																aria-pressed={activeMedia === 'video'}
																disabled={!hasVideo1}
																onClick={() => setActiveMedia('video')}
																className={[
																	'relative inline-flex items-center gap-1.5 w-[35px] h-[35px] justify-center text-xs sm:text-sm rounded-lg outline-none transition',
																	activeMedia === 'video' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900',
																	!hasVideo1 ? 'opacity-50 cursor-not-allowed' : '',
																	'focus-visible:ring-2 focus-visible:ring-indigo-400/40',
																].join(' ')}
																title={t('showVideo')}
																aria-label={t('showVideo')}
															>
																<VideoIcon size={14} />
																{activeMedia === 'video' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
															</button>

															{hasVideo2 && (
																<button
																	type='button'
																	aria-pressed={activeMedia === 'video2'}
																	onClick={() => setActiveMedia('video2')}
																	className={[
																		'relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg outline-none transition',
																		activeMedia === 'video2' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900',
																		'focus-visible:ring-2 focus-visible:ring-indigo-400/40',
																	].join(' ')}
																	title={t('showVideoAlt')}
																	aria-label={t('showVideoAlt')}
																>
																	<VideoIcon size={14} />
																	<span className='hidden sm:inline'>{t('alt')}</span>
																	{activeMedia === 'video2' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
																</button>
															)}
														</div>
													</div>
												);
											})()}
										</div>

										{/* MOBILE EXERCISE LIST */}
										<div className='pt-2 lg:hidden'>
											<ExerciseList
												t={t}
												workout={workout}
												exercisesOverride={exercisesBySection}
												currentExId={currentExercise?.id}
												onPick={ex => {
													setCurrentExId(ex.id);
													setActiveMedia('image');
													setWorkout(w => ensureSetsCountForExercise(w, ex.id, ex?.targetSets ?? 1, exReps || ex?.targetReps));
													applyLocalQueuedSnapshotIfAny();
												}}
												completedExercises={completedExercises}
												toggleExerciseCompletion={toggleExerciseCompletion}
											/>
										</div>

										<RestTimerCard
											alerting={alerting}
											setAlerting={setAlerting}
											initialSeconds={
												Number.isFinite(currentExercise?.restSeconds)
													? currentExercise?.restSeconds
													: Number.isFinite(currentExercise?.rest)
														? currentExercise?.rest
														: 90
											}
											audioEl={audioRef}
											className=' mt-2 '
										/>
									</div>

									{/* Exercise Meta */}
									<div className='relative z-[100] mt-3 mb-2 flex flex-wrap items-center gap-2'>
										<span className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700'>
											<span className='font-semibold'>{t('Sets')}:</span>
											<span className='tabular-nums'>{exTargetSets}</span>
										</span>

										<span className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700'>
											<span className='font-semibold'>{t('Reps')}:</span>
											<span className='tabular-nums'>{exReps || '—'}</span>
										</span>

										<span className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700'>
											<span className='font-semibold'>{t('Tempo')}:</span>
											<span className='tabular-nums'>{exTempo}</span>

											<span className='relative group inline-flex'>
												<Info size={14} className='text-slate-500' />
												<span className='pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition'>
													{t('tempoHelp')}
												</span>
											</span>
										</span>
									</div>

									{/* Sets table */}
									<div className='max-md:mb-2 md:mb-5 mt-3 rounded-lg border border-slate-200 overflow-hidden bg-white'>
										<div className='overflow-x-auto'>
											<table className='w-full text-sm'>
												<thead className=' rounded-lg overflow-hidden bg-slate-200 backdrop-blur sticky top-0 z-10'>
													<tr className='text-left rtl:text-right text-slate-600'>
														<th className=' max-sm:hidden py-2.5 px-3 font-semibold'>{t('table.set')}</th>
														<th className='py-2.5 px-3 font-semibold'>{t('table.weight')}</th>
														<th className='py-2.5 px-3 font-semibold'>{t('table.reps')}</th>
														<th className='py-2.5 px-3 font-semibold'>{t('table.done')}</th>
													</tr>
												</thead>

												<tbody className='divide-y divide-slate-100'>
													{currentSets.map((s, i) => (
														<tr
															key={s.id}
															className={`transition-colors ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-indigo-50/40`}
														>
															<td className=' max-sm:hidden py-2.5 px-3'>
																<span className='inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-slate-100  border border-slate-200 text-slate-700 font-medium'>
																	{s.set}
																</span>
															</td>

															{/* WEIGHT */}
															<td className='py-2.5 px-3'>
																<div className='relative inline-block'>
																	<input
																		type='text'
																		value={getBufferedValue(s.id, 'weight', s.weight)}
																		onChange={e => handleInputChange(s.id, 'weight', e.target.value)}
																		onFocus={e => e.target.select()}
																		onBlur={() => handleInputBlur(s.id, 'weight')}
																		onKeyDown={e => {
																			if (e.key === 'Enter') e.currentTarget.blur();
																		}}
																		inputMode='decimal'
																		placeholder='0'
																		aria-label={t('table.weight')}
																		className='text-center h-9 w-[100px] !text-[16px] tabular-nums rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-[26px] transition-shadow duration-200'
																	/>

																	<button
																		type='button'
																		onClick={() => bump(s.id, 'weight', -1)}
																		title={t('minusOne')}
																		aria-label={t('minusOne')}
																		className='absolute left-[2px] top-1/2 -translate-y-1/2 grid h-[30px] w-[30px] place-items-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition duration-150 overflow-hidden'
																		tabIndex={-1}
																	>
																		<Minus size={16} />
																	</button>

																	<button
																		type='button'
																		onClick={() => bump(s.id, 'weight', +1)}
																		title={t('plusOne')}
																		aria-label={t('plusOne')}
																		className='absolute right-[2px] top-1/2 -translate-y-1/2 grid h-[30px] w-[30px] place-items-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition duration-150 overflow-hidden'
																		tabIndex={-1}
																	>
																		<Plus size={16} />
																	</button>
																</div>
															</td>

															{/* REPS */}
															<td className='py-2.5 px-3'>
																<div className='relative inline-block'>
																	<input
																		type='text'
																		value={getBufferedValue(s.id, 'reps', s.reps)}
																		onChange={e => handleInputChange(s.id, 'reps', e.target.value)}
																		onFocus={e => e.target.select()}
																		onBlur={() => handleInputBlur(s.id, 'reps')}
																		onKeyDown={e => {
																			if (e.key === 'Enter') e.currentTarget.blur();
																		}}
																		inputMode='numeric'
																		placeholder='0'
																		aria-label={t('table.reps')}
																		className='text-center h-9 w-[100px] !text-[16px] tabular-nums rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-[26px]'
																	/>

																	<button
																		type='button'
																		onClick={() => bump(s.id, 'reps', -1)}
																		title={t('minusOne')}
																		aria-label={t('minusOne')}
																		className='absolute left-[2px] top-1/2 -translate-y-1/2 grid h-[30px] w-[30px] place-items-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition duration-150 overflow-hidden'
																		tabIndex={-1}
																	>
																		<Minus size={16} />
																	</button>

																	<button
																		type='button'
																		onClick={() => bump(s.id, 'reps', +1)}
																		title={t('plusOne')}
																		aria-label={t('plusOne')}
																		className='absolute right-[2px] top-1/2 -translate-y-1/2 grid h-[30px] w-[30px] place-items-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition duration-150 overflow-hidden'
																		tabIndex={-1}
																	>
																		<Plus size={16} />
																	</button>
																</div>
															</td>

															<td className='py-2.5 px-3'>
																<CheckBox
																	initialChecked={s.done}
																	onChange={() => toggleDone(s.id)}
																	aria-label={t('table.done')}
																/>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>

										{/* Sync controls */}
										<div className='flex flex-row items-center justify-between gap-2 px-3 py-2 text-[11px] text-slate-600 bg-slate-50/70 border-t border-slate-200'>
											<div className='flex items-center gap-2'>
												<button
													onClick={removeSetFromCurrentExercise}
													disabled={currentSets.length <= 1}
													className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${currentSets.length <= 1
															? 'cursor-not-allowed border border-slate-200 bg-white text-slate-400 shadow-inner'
															: 'border border-red-400 text-red-600 bg-white hover:bg-red-50 hover:border-red-500 hover:text-red-700 active:scale-95 shadow-sm'
														}`}
												>
													{t('actions.removeSet')}
												</button>

												<button
													onClick={addSetForCurrentExercise}
													className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-400 px-3 py-1.5 text-xs font-medium 
													   text-indigo-600 bg-white hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700
													   active:scale-95 shadow-sm transition-all duration-200'
												>
													{t('actions.addSet')}
												</button>
											</div>

											<div className=' rtl:mr-auto ltr:ml-auto flex items-center gap-3'>
												<button
													type='button'
													onClick={() => trySyncQueue(true)}
													disabled={syncing}
													className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50'
												>
													{syncing ? (
														<span className='inline-block w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
													) : unsaved ? (
														<CloudOff size={14} className='text-amber-600' />
													) : (
														<Cloud size={14} className='text-emerald-600' />
													)}
													{syncing ? t('sync.syncing') : unsaved ? t('sync.syncNow') : t('sync.synced')}
												</button>

												{lastSyncStatus === 'ok' && <span className='text-emerald-600'>{t('sync.synced')}</span>}
												{lastSyncStatus === 'error' && <span className='text-rose-600'>{t('sync.someFailed')}</span>}
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					</div>

					{/* RIGHT */}
					<div className='rounded-lg bg-white h-fit p-4 shadow-sm hidden lg:block w-80'>
						<div className='mb-3'>
							<div className='text-xs text-slate-500'>{t('sections.title')}</div>
							<div className='mt-1 flex flex-wrap gap-2'>
								{sectionTabs.map(st => {
									const active = activeSection === st.key;
									return (
										<button
											key={st.key}
											onClick={() => setActiveSection(st.key)}
											className={[
												'px-3 h-9 rounded-xl border text-sm font-medium transition',
												active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
											].join(' ')}
										>
											{st.label}
										</button>
									);
								})}
							</div>
						</div>

						<ExerciseList
							t={t}
							workout={workout}
							exercisesOverride={exercisesBySection}
							currentExId={currentExercise?.id}
							onPick={ex => {
								setCurrentExId(ex.id);
								setActiveMedia('image');
								setWorkout(w => ensureSetsCountForExercise(w, ex.id, ex?.targetSets ?? 1, exReps || ex?.targetReps));
								applyLocalQueuedSnapshotIfAny();
							}}
							completedExercises={completedExercises}
							toggleExerciseCompletion={toggleExerciseCompletion}
						/>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
