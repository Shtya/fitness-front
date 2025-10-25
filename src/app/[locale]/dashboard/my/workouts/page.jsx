/* /app/[locale]/dashboard/my/workouts/page.js */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabsPill, spring } from '@/components/dashboard/ui/UI';
import { Dumbbell, X, Minus, Plus, Video as VideoIcon, Image as ImageIcon, Headphones, Settings as SettingsIcon, Menu as MenuIcon, Upload, CloudOff, Cloud } from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api from '@/utils/axios';
import weeklyProgram from './exercises';
import { createSessionFromDay } from '@/components/pages/workouts/helpers';
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
const LOCAL_KEY_QUEUE = 'mw.pendingPRs.v1'; // array of items: { userId, date, exerciseName, records, createdAt }

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

function UploadVideoModal({ open, onClose, userId, exercise, onUploaded }) {
	const t = useTranslations('MyWorkouts');
	const [file, setFile] = useState(null);
	const [error, setError] = useState('');
	const [sending, setSending] = useState(false);

	const onPick = e => {
		const f = e.target.files?.[0];
		if (!f) return;
		if (!f.type?.startsWith('video/')) return setError(t('errors.pickVideo'));
		if (f.size > 100 * 1024 * 1024) return setError(t('errors.maxSize'));
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
			setError(t('errors.uploadFailed'));
			console.error(e);
		} finally {
			setSending(false);
		}
	};

	if (!open) return null;

	return (
		<AnimatePresence>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[95] bg-black/40 backdrop-blur-[1px]' onClick={onClose} />
			<motion.div
				initial={{ y: 40, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: 40, opacity: 0 }}
				transition={{ type: 'spring', stiffness: 280, damping: 28 }}
				className='fixed left-1/2 top-[15%] -translate-x-1/2 z-[100] w-[92%] max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200'
			>
				<div className='p-4 border-b border-slate-100 flex items-center justify-between'>
					<div className='font-semibold'>
						{t('uploadFor')}: <span className='text-indigo-700'>{exercise?.name}</span>
					</div>
					<button onClick={onClose} className='p-2 rounded-lg hover:bg-slate-100' aria-label={t('actions.close')}>
						<X size={16} />
					</button>
				</div>
				<div className='p-4 space-y-3'>
					<div className='rounded-lg border border-slate-200 p-3 bg-slate-50'>
						<input id='video-file' type='file' accept='video/*' onChange={onPick} className='hidden' />
						<label htmlFor='video-file' className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer'>
							<Upload size={16} /> {t('actions.chooseVideo')}
						</label>
						{file && <div className='mt-2 text-sm text-slate-700 truncate'>{t('selected')}: {file.name}</div>}
						{!!error && <div className='mt-2 text-sm text-rose-600'>{error}</div>}
					</div>
					<div className='flex items-center justify-end gap-2 pt-2'>
						<button onClick={onClose} className='h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'>
							{t('actions.cancel')}
						</button>
						<ButtonMini name={t('actions.upload')} icon={<Upload size={16} />} onClick={doUpload} loading={sending} disabled={!file} />
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

const SkeletonLoader = () => {
	// Page-specific skeleton
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
};

/* === Normalize Arabic/Eastern digits + comma === */
function normalizeNumericInput(str = '') {
	const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
	return String(str)
		.replace(/[٠-٩۰-۹]/g, d => map[d] || d)
		.replace(',', '.');
}

/* =========================
	 API helpers
========================= */
async function fetchActivePlan(userId) {
	const { data } = await api.get('/plans/active', { params: { userId } });
	// Handle "no plan" response shape described by user
	if (data?.status === 'none' || data?.error) {
		return { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) } };
	}
	if (data?.program?.days?.length) return data;
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
				recordsByExercise[exercise.exerciseName] = exercise.records.map(r => ({
					weight: Number(r.weight) || 0,
					reps: Number(r.reps) || 0,
					done: !!r.done,
					setNumber: Number(r.setNumber) || 1,
				}));
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
	 Component
========================= */
export default function MyWorkoutsPage() {
	const t = useTranslations('MyWorkouts');
	const user = useUser();
	const USER_ID = user?.id;

	const [loading, setLoading] = useState(true);
	const [plan, setPlan] = useState(null);

	const [selectedDay, setSelectedDay] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY_SELECTED_DAY) || 'monday' : 'monday'));

	const [workout, setWorkout] = useState(null);
	const [currentExId, setCurrentExId] = useState(undefined);
	const [hidden, setHidden] = useState(false);

	// media tab
	const [activeMedia, setActiveMedia] = useState('image');

	// audio + settings
	const audioRef = useRef(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [alertSound, setAlertSound] = useState(DEFAULT_SOUNDS[2]);
	const [alerting, setAlerting] = useState(false);

	// misc
	const [audioOpen, setAudioOpen] = useState(false);
	const [unsaved, setUnsaved] = useState(false); // "queued locally & not synced"
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [dayLoading, setDayLoading] = useState(false);
	const [isPending, startTransition] = useTransition();

	// upload modal
	const [uploadOpen, setUploadOpen] = useState(false);

	// mirrors and buffers
	const lastSavedRef = useRef(new Map()); // setId -> { weight, reps, done }
	const [inputBuffer, setInputBuffer] = useState({}); // key -> string

	// sync status
	const [syncing, setSyncing] = useState(false);
	const [lastSyncStatus, setLastSyncStatus] = useState(''); // '', 'ok', 'error'

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
						serverId: r.id ?? s.serverId, // keep old id if server didn't return it
					};
				}),
			};
			// refresh mirror
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
				};
			});
		});
		return next;
	}, []);

	// ---- persist a snapshot from the computed "next" workout state
	function persistExerciseSnapshot(nextWorkout, exId, userId) {
		if (!nextWorkout || !exId || !userId) return;
		const ex = nextWorkout.exercises?.find(e => e.id === exId);
		if (!ex) return;

		const records = (nextWorkout.sets || [])
			.filter(s => s.exId === exId)
			.map(s => ({
				id: s.serverId, // may be undefined
				weight: Number(s.weight) || 0,
				reps: Number(s.reps) || 0,
				done: !!s.done,
				setNumber: Number(s.set) || 1,
			}));

		const item = { userId: userId, date: todayISO(), exerciseName: ex.name, records };
		upsertQueueItem(item);
	}

	// If there’s a queued snapshot for the current exercise/date, apply it to UI
	const applyLocalQueuedSnapshotIfAny = useCallback(() => {
		setWorkout(prev => {
			if (!prev) return prev;
			const ex = prev.exercises?.find(e => e.id === currentExId);
			if (!ex || !USER_ID) return prev;

			const queued = loadQueue().find(i => i.userId === USER_ID && i.exerciseName === ex.name && i.date === todayISO());
			if (!queued) return prev;

			const bySet = {};
			(queued.records || []).forEach(r => (bySet[Number(r.setNumber) || 1] = r));

			const next = {
				...prev,
				sets: prev.sets.map(s => (s.exName !== ex.name ? s : { ...s, weight: Number(bySet[s.set]?.weight) || 0, reps: Number(bySet[s.set]?.reps) || 0, done: !!bySet[s.set]?.done })),
			};
			// mirror
			lastSavedRef.current.clear();
			next.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

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

				const savedDay = (typeof window !== 'undefined' && localStorage.getItem(LOCAL_KEY_SELECTED_DAY)) || null;
				const initialDayId = savedDay || pickTodayId(allKeys.length ? allKeys : Object.keys(weeklyProgram));
				setSelectedDay(initialDayId);

				const dayProgram = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId, name: t('workout') };
				let session = createSessionFromDay(dayProgram);
				setWorkout(session);
				setCurrentExId(session.exercises[0]?.id);

				if (session?.exercises?.length) preloadMedia(session.exercises);

				lastSavedRef.current.clear();
				session?.sets?.forEach(s => {
					lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done });
				});

				try {
					const s = JSON.parse(localStorage.getItem(LOCAL_KEY_SETTINGS) || 'null');
					if (s?.alertSound) setAlertSound(s.alertSound);
				} catch { }

				// Prefill from server (weight + reps + done)
				const dayISO = isoForThisWeeksDay(initialDayId);
				const { recordsByExercise } = await fetchLastDayByName(USER_ID, initialDayId, dayISO);
				if (!mounted) return;

				session = applyInitialRecordsWithDone(session, recordsByExercise);

				// Apply queued local snapshot for the first exercise (so refresh shows unsynced edits)
				const firstEx = session.exercises?.[0];
				if (firstEx && USER_ID) {
					const queued = loadQueue().find(i => i.userId === USER_ID && i.exerciseName === firstEx.name && i.date === todayISO());
					if (queued) {
						const bySet = {};
						(queued.records || []).forEach(r => (bySet[Number(r.setNumber) || 1] = r));
						session = {
							...session,
							sets: session.sets.map(s => (s.exName !== firstEx.name ? s : { ...s, weight: Number(bySet[s.set]?.weight) || 0, reps: Number(bySet[s.set]?.reps) || 0, done: !!bySet[s.set]?.done })),
						};
						setUnsaved(true);
					}
				}

				setWorkout(session);

				// refresh mirror
				lastSavedRef.current.clear();
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));

				// Try sync any pending queue on start (non-blocking UI)
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
	}, [USER_ID, preloadMedia, applyInitialRecordsWithDone, t]);

	// Keep the "unsaved" badge accurate when workout/exercise changes
	useEffect(() => {
		const exName = workout?.exercises?.find(e => e.id === currentExId)?.name;
		if (!exName || !USER_ID) {
			setUnsaved(false);
			return;
		}
		const hasPending = loadQueue().some(i => i.userId === USER_ID && i.exerciseName === exName && i.date === todayISO());
		setUnsaved(hasPending);
	}, [workout, currentExId, USER_ID]);

	// Change day
	const changeDay = useCallback(
		async dayId => {
			setDayLoading(true);
			startTransition(() => setSelectedDay(dayId));
			try {
				const raw = plan?.program?.days || [];
				const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
				const dayProgram = byKey[dayId] || weeklyProgram[dayId] || { id: dayId, name: t('workout') };
				let session = createSessionFromDay(dayProgram);
				setWorkout(session);
				setCurrentExId(session.exercises[0]?.id);
				if (session.exercises?.length) preloadMedia(session.exercises);

				// reset trackers
				lastSavedRef.current.clear();
				setInputBuffer({});
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
				setUnsaved(false);

				// Prefill last workout with weight+reps+done
				const dayISO = isoForThisWeeksDay(dayId);
				const { recordsByExercise } = await fetchLastDayByName(USER_ID, dayId, dayISO);
				session = applyInitialRecordsWithDone(session, recordsByExercise);
				setWorkout(session);
				lastSavedRef.current.clear();
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));

				// restore selected day
				localStorage.setItem(LOCAL_KEY_SELECTED_DAY, dayId);

				// Apply any queued snapshot for the newly current exercise
				applyLocalQueuedSnapshotIfAny();
			} catch (e) {
				console.error(e);
			} finally {
				setDayLoading(false);
			}
		},
		[plan, preloadMedia, USER_ID, applyInitialRecordsWithDone, applyLocalQueuedSnapshotIfAny, t],
	);

	// === Set mutations (persist AFTER computing "next")
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
		[currentExId, USER_ID],
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
		[currentExId, USER_ID],
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
		[currentExId, USER_ID],
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

	// Try sync entire queue (optionally show status)
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

					// UI update after sync
					const mergedRecords = Array.isArray(data?.records) && data.records.length ? data.records : item.records;
					applyRecordsToWorkout(item.exerciseName, mergedRecords);

					removeQueueItem(item);
				} catch (e) {
					console.error('Sync failed for', item.exerciseName, e);
					anyError = true;
					// keep item for retry
				}
			}
			setSyncing(false);
			if (showStatus) {
				setLastSyncStatus(anyError ? 'error' : 'ok');
				setTimeout(() => setLastSyncStatus(''), 1500);
			}
			// recompute unsaved for current ex/date
			const still = loadQueue();
			const exName = workout?.exercises?.find(e => e.id === currentExId)?.name;
			const hasPendingForCurrent = !!exName && still.some(i => i.userId === USER_ID && i.exerciseName === exName && i.date === todayISO());
			setUnsaved(hasPendingForCurrent);
		},
		[USER_ID, workout, currentExId, applyRecordsToWorkout],
	);

	useEffect(() => {
		// Attempt sync when browser regains focus
		const onFocus = () => trySyncQueue(false);
		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
	}, [trySyncQueue]);

	useEffect(() => {
		const el = audioRef.current;
		if (el) {
			el.src = alertSound;
			el.load();
		}
	}, [alertSound]);

	const hasExercises = !!workout?.exercises?.length;
	const currentExercise = useMemo(() => workout?.exercises?.find(e => e.id === currentExId), [workout?.exercises, currentExId]);
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

	const Actions = ({ className }) => (
		<div className={`flex items-center gap-2 ${className}`}>
			<button
				onClick={() => {
					!hidden && setAudioOpen(v => !v);
					setHidden(false);
				}}
				className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
				aria-label={t('listen')}
			>
				<Headphones size={16} />
				<span className='max-md:hidden'>{t('listen')}</span>
			</button>
			<button
				onClick={() => setSettingsOpen(true)}
				className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition'
				aria-label={t('settings')}
			>
				<SettingsIcon size={16} />
				<span className='max-md:hidden'>{t('settings')}</span>
			</button>
			<div className='lg:hidden'>
				<button
					onClick={() => setDrawerOpen(true)}
					className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/30 h-[37px] max-md:w-[37px] px-2 py-2 text-sm cursor-pointer bg-white/10 hover:bg-white/20'
				>
					<MenuIcon size={16} /> <span className='max-md:hidden'> {t('exercises')} </span>
				</button>
			</div>
		</div>
	);

	/* ===== Buffer helpers (STATE-BASED) ===== */
	const getBufferedValue = (setId, field, numericVal) => {
		const key = `${setId}:${field}`;
		if (Object.prototype.hasOwnProperty.call(inputBuffer, key)) {
			return inputBuffer[key];
		}
		if (Number(numericVal) === 0) return '';
		return String(numericVal ?? '');
	};

	const handleInputChange = (setId, field, raw) => {
		const key = `${setId}:${field}`;
		let v = normalizeNumericInput(raw);
		// allow digits + ONE dot
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

	if (loading) return <SkeletonLoader />;

	return (
		<div className='space-y-5 sm:space-y-6'>
			<audio ref={audioRef} src={alertSound} preload='auto' />

			<div className={'relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur '}>
				<div className='absolute inset-0 overflow-hidden'>
					<div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
					<div
						className='absolute inset-0 opacity-15'
						style={{
							backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
							backgroundSize: '22px 22px',
							backgroundPosition: '-1px -1px',
						}}
					/>
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
						<TabsPill
							isLoading={dayLoading || isPending}
							className='!rounded-lg'
							slice={3}
							id='day-tabs'
							tabs={dayTabs}
							active={selectedDay}
							onChange={changeDay}
						/>
						<Actions className={'max-md:!hidden'} />
					</div>
				</div>

				{/* Day loading overlay */}
				<AnimatePresence>
					{dayLoading && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='absolute inset-0 z-20 grid place-items-center bg-white/50 backdrop-blur-[2px]'>
							<div className='flex items-center gap-2 text-indigo-700 text-sm font-medium'>
								<span className='inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
								{t('loadingExercises')}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<AudioHubInline hidden={hidden} setHidden={setHidden} alerting={alerting} setAlerting={setAlerting} open={audioOpen} onClose={() => setAudioOpen(false)} />

			{/* WORKOUT ONLY */}
			<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
				<div className='flex flex-col lg:flex-row gap-4'>
					{/* LEFT main pane */}
					<div className='md:rounded-lg md:bg-white h-fit md:p-4 md:shadow-sm w-full  lg:flex-1 min-w-0'>
						<div className={`relative md:bg-white/80 backdrop-blur md:rounded-lg md:overflow-hidden ${!hasExercises ? '!border-transparent' : ''}`}>
							{!hasExercises ? (
								/* Empty state */
								<div className='p-5'>
									<div className='relative flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 text-center shadow-sm'>
										<div className='absolute inset-0 -z-10 opacity-[0.5]'>
											<div className='absolute inset-0 bg-[radial-gradient(800px_400px_at_0%_0%,rgba(59,130,246,0.06),transparent_60%),radial-gradient(600px_300px_at_100%_100%,rgba(16,185,129,0.06),transparent_60%)]' />
											<div className='absolute inset-0 [mask-image:radial-gradient(360px_160px_at_50%_0%,#000,transparent)] bg-[linear-gradient(45deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:12px_12px]' />
										</div>

										<div className='mb-4 grid h-16 w-16 place-items-center rounded-full bg-white shadow ring-1 ring-slate-200'>
											<Dumbbell size={24} className='text-slate-500' />
										</div>

										<h3 className='text-lg font-semibold text-slate-800'>{t('noExercises')}</h3>
										<p className='mt-1  text-xs text-slate-400 italic '>{t('pickAnotherDay')}</p>
									</div>
								</div>
							) : (
								<>
									<div className=' '>
										<div className='relative w-full rounded-lg overflow-hidden '>
											<div className='max-md:h-[250px] md:aspect-[16/9] '>
												{currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? (
													<InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} />
												) : (
													<Img key={currentExercise?.id + '-image'} src={currentExercise?.img} alt={currentExercise?.name} className='w-full h-full object-contain ' loading='lazy' />
												)}
											</div>

											{(() => {
												const hasImg = !!currentExercise?.img;
												const hasVideo1 = !!currentExercise?.video;
												const hasVideo2 = !!currentExercise?.video2;

												return (
													<div className={`absolute right-1  md:right-3 flex items-center gap-2 ${activeMedia === 'video' ? 'bottom-[70px] ' : ' bottom-1 md:bottom-3'} duration-500 `}>
														<div className='inline-flex max-md:flex-col   items-center gap-[4px] rounded-xl bg-slate-100/70 p-1 ring-1 ring-black/5 backdrop-blur-md'>
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

									{/* Sets table */}
									<div className='max-md:mb-2 md:mb-5 mt-3 rounded-lg border border-slate-200 overflow-hidden bg-white'>
										<div className='overflow-x-auto'>
											<table className='w-full text-sm'>
												<thead className=' rounded-lg overflow-hidden bg-slate-200 backdrop-blur sticky top-0 z-10'>
													<tr className='text-left rtl:text-right text-slate-600'>
														<th className='py-2.5 px-3 font-semibold'>{t('table.set')}</th>
														<th className='py-2.5 px-3 font-semibold'>{t('table.weight')}</th>
														<th className='py-2.5 px-3 font-semibold'>{t('table.reps')}</th>
														<th className='py-2.5 px-3 font-semibold'>{t('table.done')}</th>
													</tr>
												</thead>
												<tbody className='divide-y divide-slate-100'>
													{currentSets.map((s, i) => (
														<tr key={s.id} className={`transition-colors ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-indigo-50/40`}>
															<td className='py-2.5 px-3'>
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
																		onClick={e => {
																			bump(s.id, 'weight', -1);
																			const el = e.currentTarget;
																			el.classList.add('animate-press');
																			setTimeout(() => el.classList.remove('animate-press'), 250);
																		}}
																		title={t('minusOne')}
																		aria-label={t('minusOne')}
																		className='absolute left-[2px] top-1/2 -translate-y-1/2 grid h-[30px] w-[30px] place-items-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition duration-150 overflow-hidden'
																		tabIndex={-1}
																	>
																		<Minus size={16} />
																	</button>

																	<button
																		type='button'
																		onClick={e => {
																			bump(s.id, 'weight', +1);
																			const el = e.currentTarget;
																			el.classList.add('animate-press');
																			setTimeout(() => el.classList.remove('animate-press'), 250);
																		}}
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
																		onClick={e => {
																			bump(s.id, 'reps', -1);
																			const el = e.currentTarget;
																			el.classList.add('animate-press');
																			setTimeout(() => el.classList.remove('animate-press'), 250);
																		}}
																		title={t('minusOne')}
																		aria-label={t('minusOne')}
																		className='absolute left-[2px] top-1/2 -translate-y-1/2 grid h-[30px] w-[30px] place-items-center rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition duration-150 overflow-hidden'
																		tabIndex={-1}
																	>
																		<Minus size={16} />
																	</button>

																	<button
																		type='button'
																		onClick={e => {
																			bump(s.id, 'reps', +1);
																			const el = e.currentTarget;
																			el.classList.add('animate-press');
																			setTimeout(() => el.classList.remove('animate-press'), 250);
																		}}
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
																	onChange={() => {
																		toggleDone(s.id);
																	}}
																	aria-label={t('table.done')}
																/>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>

										{/* Sync controls */}
										<div className='flex  flex-row items-center justify-between gap-2 px-3 py-2 text-[11px] text-slate-600 bg-slate-50/70 border-t border-slate-200'>
											<div className='flex items-center gap-2'>
												{/* Remove set */}
												<button
													onClick={removeSetFromCurrentExercise}
													disabled={currentSets.length <= 1}
													className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200
      ${currentSets.length <= 1 ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-400 shadow-inner' : 'border border-red-400 text-red-600 bg-white hover:bg-red-50 hover:border-red-500 hover:text-red-700 active:scale-95 shadow-sm'}`}
												>
													<Minus size={14} className='flex-none' />
													{t('actions.removeSet')}
												</button>

												{/* Add set */}
												<button
													onClick={addSetForCurrentExercise}
													className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-400 px-3 py-1.5 text-xs font-medium 
               text-indigo-600 bg-white hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700
               active:scale-95 shadow-sm transition-all duration-200'
												>
													<Plus size={14} className='flex-none' />
													{t('actions.addSet')}
												</button>
											</div>

											<div className='ml-auto flex items-center gap-3'>
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

					{/* RIGHT (exercise list) */}
					<div className='rounded-lg bg-white h-fit p-4 shadow-sm hidden  lg:block w-80'>
						<ExerciseList
							t={t}
							workout={workout}
							currentExId={currentExId}
							onPick={ex => {
								setCurrentExId(ex.id);
								setActiveMedia('image');
								// Apply queued local snapshot after switching exercise
								applyLocalQueuedSnapshotIfAny();
							}}
						/>
					</div>
				</div>
			</motion.div>

			{/* Drawer */}
			<AnimatePresence>
				{drawerOpen && (
					<>
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[75] bg-black/30' onClick={() => setDrawerOpen(false)} />
						<motion.div
							initial={{ x: '100%' }}
							animate={{ x: 0 }}
							exit={{ x: '100%' }}
							transition={{ type: 'spring', stiffness: 260, damping: 32 }}
							className='fixed right-0 top-0 h-full w-[84%] max-w-sm z-[80] bg-white shadow-2xl border-l border-slate-200'
							onClick={e => e.stopPropagation()}
						>
							<div className='p-3 flex items-center justify-between border-b border-slate-100'>
								<div className='font-semibold flex items-center gap-2'>
									<Dumbbell size={18} /> {t('exercises')}
								</div>
								<button onClick={() => setDrawerOpen(false)} className='p-2 rounded-lg hover:bg-slate-100' aria-label={t('actions.close')}>
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
										// Apply queued local snapshot after picking from drawer
										applyLocalQueuedSnapshotIfAny();
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
					} catch { }
				}}
			/>

			{/* Upload Modal */}
			<UploadVideoModal
				open={uploadOpen}
				onClose={() => setUploadOpen(false)}
				userId={USER_ID}
				exercise={currentExercise}
				onUploaded={() => {
					/* optional toast success */
				}}
			/>
		</div>
	);
}
