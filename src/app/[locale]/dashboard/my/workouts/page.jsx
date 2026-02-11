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
	CloudOff,
	Cloud,
	Info,
	StickyNote,
	Check,
	Target,
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
import CardioTimerCard from '@/components/pages/workouts/CardioTimerCard';
import { Repeat, Timer, Clock } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
const LOCAL_KEY_QUEUE = 'mw.pendingPRs.v1';

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
	 Theme helpers (same style)
========================= */
const cx = (...c) => c.filter(Boolean).join(' ');

function ThemeFrame({ children, className = '' }) {
	return (
		<div className={cx('rounded-2xl p-[1px]', className)}>
			<div
				className='rounded-2xl border bg-white/85 backdrop-blur-xl'
				style={{
					borderColor: 'var(--color-primary-200)',
					boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04), 0 18px 40px rgba(15, 23, 42, 0.10)',
				}}
			>
				{children}
			</div>
		</div>
	);
}

function SoftCard({ children, className = '' }) {
	return (
		<div
			className={cx('rounded-2xl border bg-white', className)}
			style={{
				borderColor: 'var(--color-primary-200)',
				boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03), 0 10px 24px rgba(15, 23, 42, 0.06)',
			}}
		>
			{children}
		</div>
	);
}

function Pill({ children, tone = 'primary' }) {
	const tones = {
		primary: {
			border: 'var(--color-primary-200)',
			bg: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
			text: 'var(--color-primary-800)',
		},
		soft: {
			border: '#e2e8f0',
			bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
			text: '#475569',
		},
	};
	const s = tones[tone] || tones.primary;

	return (
		<span
			className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold'
			style={{
				borderColor: s.border,
				background: s.bg,
				color: s.text,
				boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
			}}
		>
			{children}
		</span>
	);
}

function GhostBtn({ children, onClick, disabled, title, className = '' }) {
	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className={cx(
				'inline-flex items-center gap-2 h-10 px-3 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed',
				className,
			)}
			style={{
				borderColor: 'var(--color-primary-200)',
				backgroundColor: 'rgba(255,255,255,0.9)',
				color: 'var(--color-primary-800)',
				boxShadow: '0 12px 24px rgba(15,23,42,0.08)',
				// ring fix
				['--tw-ring-color']: 'var(--color-primary-200)',
			}}
			onMouseEnter={e => {
				if (!disabled) e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
			}}
			onMouseLeave={e => {
				if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)';
			}}
		>
			{children}
		</button>
	);
}

function GradientBtn({ children, onClick, disabled, title, className = '' }) {
	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className={cx(
				'inline-flex items-center gap-2 h-10 px-4 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed',
				className,
			)}
			style={{
				borderColor: 'transparent',
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				color: 'white',
				boxShadow: '0 18px 34px rgba(15,23,42,0.14)',
				// ring fix
				['--tw-ring-color']: 'var(--color-primary-200)',
			}}
		>
			{children}
		</button>
	);
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

function normalizeDayProgram(dayProgram = {}) {
	const warmup = Array.isArray(dayProgram.warmupExercises) ? dayProgram.warmupExercises : [];
	const main = Array.isArray(dayProgram.exercises) ? dayProgram.exercises : [];
	const cardio = Array.isArray(dayProgram.cardioExercises) ? dayProgram.cardioExercises : [];

	const withGroup = (arr, group) =>
		arr.map((x, idx) => ({
			...x,
			group,
			instanceId: `${group}:${x.id}:${idx}`,
			id: `${group}:${x.id}:${idx}`,
			originalExerciseId: x.id,
		}));

	return {
		...dayProgram,
		warmupExercises: warmup,
		exercises: main,
		cardioExercises: cardio,
		allExercises: [...withGroup(warmup, 'warmup'), ...withGroup(main, 'workout'), ...withGroup(cardio, 'cardio')],
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
		if (exerciseNames.length === 0) return { date: null, day, recordsByExercise: {} };

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
	 Notes Modal (theme)
========================= */
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
				className='fixed left-1/2 top-[12%] -translate-x-1/2 z-[125] w-[92%] max-w-lg rounded-3xl bg-white shadow-2xl border overflow-hidden'
				style={{ borderColor: 'var(--color-primary-200)' }}
				onClick={e => e.stopPropagation()}
			>
				<div
					className='p-4 border-b flex items-center justify-between'
					style={{
						borderColor: 'rgba(226,232,240,0.9)',
						background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
					}}
				>
					<div className='min-w-0'>
						<div className='text-xs' style={{ color: 'var(--color-primary-700)' }}>
							{t('notes.modalTitle')}
						</div>
						<div className='text-sm font-extrabold text-slate-900 truncate'>{title || t('notes.fallbackTitle')}</div>
					</div>
					<button
						onClick={onClose}
						className='p-2 rounded-2xl hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4'
						style={{ ['--tw-ring-color']: 'var(--color-primary-200)' }}
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
									className='rounded-2xl border px-3 py-2 text-sm text-slate-800'
									style={{
										borderColor: 'var(--color-primary-200)',
										background: 'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
									}}
								>
									<div className='flex items-start gap-2'>
										<span
											className='mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold'
											style={{
												background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
												color: 'white',
												boxShadow: '0 12px 24px rgba(15,23,42,0.14)',
											}}
										>
											{idx + 1}
										</span>
										<span className='leading-relaxed'>{String(n)}</span>
									</div>
								</li>
							))}
						</ul>
					) : (
						<div
							className='rounded-2xl border bg-white px-3 py-6 text-center text-sm text-slate-500'
							style={{ borderColor: 'var(--color-primary-200)' }}
						>
							{t('notes.empty')}
						</div>
					)}
				</div>

				<div
					className='p-3 border-t flex items-center justify-end bg-white'
					style={{ borderColor: 'rgba(226,232,240,0.9)' }}
				>
					<GhostBtn onClick={onClose} title={t('actions.close')}>
						{t('actions.close')}
					</GhostBtn>
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
		typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY_SELECTED_DAY) || 'monday' : 'monday',
	);

	const [activeSection, setActiveSection] = useState('workout'); // warmup | workout | cardio

	const [workout, setWorkout] = useState(null);
	const [currentExId, setCurrentExId] = useState(undefined);
	const [hidden, setHidden] = useState(false);

	const [activeMedia, setActiveMedia] = useState('image');
	const audioRef = useRef(null);
	const ALERT_SOUND = DEFAULT_SOUNDS[2];
	const [alerting, setAlerting] = useState(false);

	const [audioOpen, setAudioOpen] = useState(false);
	const [unsaved, setUnsaved] = useState(false);

	const [notesOpen, setNotesOpen] = useState(false);

	const lastSavedRef = useRef(new Map());
	const [inputBuffer, setInputBuffer] = useState({});

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

			const queued = loadQueue().find(i => i.userId === USER_ID && i.exerciseName === ex.name && i.date === todayISO());
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
						},
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
		[workout],
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
		[isExerciseCompleted, USER_ID],
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

	const ensureSetsCountForExercise = useCallback(
		(w, exId, desired, fallbackReps) => {
			if (!w || exId == null) return w;

			const exIdStr = String(exId);
			const d = Math.max(1, Math.min(20, Number(desired) || 1));

			const existing = (w.sets || []).filter(s => String(s.exId) === exIdStr);
			const ex = (w.exercises || []).find(e => String(e.id) === exIdStr);

			const keepBySetNumber = new Map();
			existing
				.sort((a, b) => Number(a.set) - Number(b.set))
				.forEach(s => {
					const sn = Number(s.set) || 1;
					if (!keepBySetNumber.has(sn)) keepBySetNumber.set(sn, s);
				});

			const kept = [...keepBySetNumber.values()].slice(0, d);

			let nextSets = (w.sets || []).filter(s => String(s.exId) !== exIdStr);
			nextSets.push(...kept);

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
					restTime: Number.isFinite(ex?.rest ?? ex?.restSeconds) ? ex?.rest ?? ex?.restSeconds : base.restTime,
				});
			}

			return { ...w, sets: nextSets };
		},
		[t],
	);

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

				const dayProgramRaw = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId };
				const dayProgramNorm = normalizeDayProgram(dayProgramRaw);
				const initSection = pickInitialSection(dayProgramNorm);
				setActiveSection(initSection);

				let session = createSessionFromDay(dayProgramNorm);
				const firstInSection = (session.exercises || []).find(x => x.group === initSection) || session.exercises?.[0];

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
						i => i.userId === USER_ID && i.exerciseName === firstEx.name && i.date === todayISO(),
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
									},
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
	}, [USER_ID, preloadMedia, applyInitialRecordsWithDone]); // eslint-disable-line react-hooks/exhaustive-deps

	// Keep "unsaved" badge accurate
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
			try {
				setSelectedDay(dayId);

				const raw = plan?.program?.days || [];
				const byKey = Object.fromEntries(raw.map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
				const dayProgramRaw = byKey[dayId] || weeklyProgram[dayId] || { id: dayId, name: t('workout') };
				const dayProgramNorm = normalizeDayProgram(dayProgramRaw);

				const nextSection = pickInitialSection(dayProgramNorm);
				setActiveSection(nextSection);

				let session = createSessionFromDay(dayProgramNorm);
				const firstInSection = (session.exercises || []).find(x => x.group === nextSection) || session.exercises?.[0];

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
		[plan, preloadMedia, USER_ID, applyInitialRecordsWithDone, applyLocalQueuedSnapshotIfAny, t],
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
		[USER_ID, workout, currentExId, applyRecordsToWorkout],
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


	const isCardio = (currentExercise?.group || activeSection) === 'cardio';


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
		[workout?.sets, currentExercise?.id],
	);

	const exTargetSets = useMemo(() => {
		const n = Number(currentExercise?.targetSets ?? 0);
		if (!Number.isFinite(n) || n <= 0) return Math.max(1, currentSets.length || 1);
		return Math.min(20, Math.max(1, Math.round(n)));
	}, [currentExercise?.targetSets, currentSets.length]);

	const exTempo = useMemo(() => normalizeTempo(currentExercise?.tempo), [currentExercise?.tempo]);
	const exReps = useMemo(() => normalizeReps(currentExercise?.targetReps), [currentExercise?.targetReps]);

	useEffect(() => {
		if (!currentExercise?.id) return;
		setWorkout(w =>
			ensureSetsCountForExercise(w, currentExercise.id, currentExercise?.targetSets ?? 1, exReps || currentExercise?.targetReps),
		);
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
		return list.length ? list : [{ key: 'workout', label: t('sections.workout') }];
	}, [workout?.exercises, t]);

	const Actions = ({ className }) => (
		<div className={cx('flex items-center gap-2', className)}>
			<GhostBtn
				onClick={() => {
					!hidden && setAudioOpen(v => !v);
					setHidden(false);
				}}
				title={t('listen')}
				className='!bg-white/10 !text-white !border-white/30 hover:!bg-white/20'
			>
				<Headphones size={16} />
				<span className='max-md:hidden'>{t('listen')}</span>
			</GhostBtn>

			<GhostBtn
				onClick={() => setNotesOpen(true)}
				title={t('notes.show')}
				className='!bg-white/10 !text-white !border-white/30 hover:!bg-white/20'
			>
				<StickyNote size={16} />
				<span className='max-md:hidden'>{t('notes.show')}</span>
			</GhostBtn>
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
				<div className='rounded-2xl overflow-hidden border' style={{ borderColor: 'var(--color-primary-200)' }}>
					<div
						className='relative p-6 text-white'
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
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
						<div className='rounded-2xl border border-slate-200 bg-white p-4'>
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

			<NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} title={plan?.name} notes={plan?.notes || []} t={t} />

			{/* HEADER */}
			<div
				className='relative overflow-hidden rounded-2xl border bg-white/60 shadow-sm backdrop-blur'
				style={{ borderColor: 'var(--color-primary-200)' }}
			>
				<div className='absolute inset-0 overflow-hidden'>
					<div
						className='absolute inset-0 opacity-95'
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					/>
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
					<div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-white/20 blur-3xl' />
				</div>

				<div className='relative py-2 p-3 md:p-5 text-white'>
					<div className='flex flex-row items-center justify-between gap-3'>
						<div className='min-w-0'>
							<h1 className='text-xl md:text-4xl font-semibold truncate'>{t('title')}</h1>
							<p className='text-white/85 mt-1 max-md:hidden'>{t('subtitle')}</p>

						</div>
						<Actions className='md:!hidden' />
					</div>

					<div className='mt-2 md:mt-4 flex items-center justify-between'>
						<TabsPill className='!rounded-2xl' sliceInPhone={false} id='day-tabs' tabs={dayTabs} active={selectedDay} onChange={changeDay} />
						<Actions className='max-md:!hidden' />
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
					<div className='w-full lg:flex-1 min-w-0'>
						<ThemeFrame>
							<div className={cx('p-3 md:p-4', !hasExercises && 'py-6')}>
								{!hasExercises ? (
									<div className='relative flex flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center'>
										<div
											className='mb-4 grid h-16 w-16 place-items-center rounded-3xl'
											style={{
												background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-secondary-100))',
												boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
											}}
										>
											<Dumbbell size={24} style={{ color: 'var(--color-primary-700)' }} />
										</div>
										<h3 className='text-lg font-extrabold text-slate-900'>{t('noExercises')}</h3>
										<p className='mt-1 text-xs text-slate-500 italic'>{t('pickAnotherDay')}</p>
									</div>
								) : (
									<>


										{/* SECTION TABS - Enhanced */}
										<div className='pt-1'>
											<div
												className='rounded-2xl p-1 inline-flex w-full sm:w-auto border backdrop-blur-md shadow-lg relative overflow-hidden'
												style={{
													borderColor: 'var(--color-primary-200)',
													background: 'linear-gradient(135deg, rgba(255,255,255,0.9), var(--color-primary-50))',
												}}
											>
												{/* Ambient gradient glow */}
												<div
													className='absolute inset-0 opacity-30 blur-2xl pointer-events-none'
													style={{
														background: 'radial-gradient(circle at 50% 50%, var(--color-primary-200), transparent 70%)',
													}}
												/>

												{sectionTabs.map((st, idx) => {
													const active = activeSection === st.key;
													return (
														<button
															key={st.key}
															onClick={() => setActiveSection(st.key)}
															className={cx(
																'relative flex-1 sm:flex-none px-3.5 sm:px-4 py-2 text-xs sm:text-sm rounded-xl transition-all duration-300 font-semibold min-h-[38px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-3 group',
																active
																	? 'text-white scale-[1.02]'
																	: 'text-slate-600 hover:text-slate-800 hover:scale-[1.01] active:scale-[0.98]',
															)}
															style={{
																'--tw-ring-color': 'var(--color-primary-300)',
															}}
															aria-pressed={active}
														>
															<span className='relative z-10 flex items-center justify-center gap-1.5'>
																{st.icon && (
																	<st.icon
																		className={cx(
																			'w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300',
																			active ? 'scale-110' : 'group-hover:scale-105'
																		)}
																	/>
																)}
																<span className='whitespace-nowrap'>{st.label}</span>
															</span>

															{/* Active background with gradient */}
															{active && (
																<>
																	<motion.span
																		layoutId='secTab'
																		className='absolute inset-0 rounded-xl shadow-lg overflow-hidden'
																		style={{
																			background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
																		}}
																		transition={{
																			type: 'spring',
																			stiffness: 400,
																			damping: 30,
																			mass: 0.8,
																		}}
																	/>

																	{/* Shine effect */}
																	<motion.span
																		initial={{ x: '-100%' }}
																		animate={{ x: '100%' }}
																		transition={{
																			duration: 0.6,
																			ease: 'easeInOut',
																			delay: 0.1,
																		}}
																		className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl pointer-events-none'
																		style={{ width: '50%' }}
																	/>

																	{/* Subtle inner glow */}
																	<span
																		className='absolute inset-0 rounded-xl opacity-50 blur-md'
																		style={{
																			background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
																		}}
																	/>
																</>
															)}

															{/* Hover background for inactive tabs */}
															{!active && (
																<span
																	className='absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300'
																	style={{
																		background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.8))',
																	}}
																/>
															)}

															{/* Badge indicator (optional - if you want to show counts) */}
															{st.badge && (
																<span
																	className={cx(
																		'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center transition-all duration-300',
																		active ? 'bg-white text-primary-600 shadow-md' : 'bg-primary-100 text-primary-700'
																	)}
																>
																	{st.badge}
																</span>
															)}
														</button>
													);
												})}
											</div>
										</div>

										{/* Media */}
										<div className='mt-3'>
											<div
												className='relative w-full rounded-2xl overflow-hidden border bg-white'
												style={{ borderColor: 'var(--color-primary-200)' }}
											>
												<div className='max-md:h-[250px] md:aspect-[16/9]'>
													{currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? (
														<InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} />
													) : (
														<Img
															showBlur={false}
															key={currentExercise?.id + '-image'}
															src={currentExercise?.img}
															alt={currentExercise?.name}
															className='w-full h-full object-contain'
															loading='lazy'
														/>
													)}
												</div>

												{/* Media switcher */}
												{(() => {
													const hasImg = !!currentExercise?.img;
													const hasVideo1 = !!currentExercise?.video;
													const hasVideo2 = !!currentExercise?.video2;

													return (
														<div
															className={cx(
																'absolute right-2 md:right-3 flex items-center gap-2',
																activeMedia === 'video' ? 'bottom-[70px]' : 'bottom-2 md:bottom-3',
															)}
														>
															<div className='inline-flex max-md:flex-col items-center gap-1 rounded-2xl bg-white/70 p-1 ring-1 ring-black/5 backdrop-blur-md'>
																<button
																	type='button'
																	aria-pressed={activeMedia === 'image'}
																	disabled={!hasImg}
																	onClick={() => setActiveMedia('image')}
																	className={cx(
																		'relative inline-flex items-center w-[38px] h-[38px] justify-center rounded-2xl outline-none transition focus-visible:ring-4',
																		activeMedia === 'image' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900',
																		!hasImg && 'opacity-50 cursor-not-allowed',
																	)}
																	style={{
																		['--tw-ring-color']: 'var(--color-primary-200)',
																		border: activeMedia === 'image' ? `1px solid var(--color-primary-200)` : '1px solid transparent',
																	}}
																	title={t('showImage')}
																	aria-label={t('showImage')}
																>
																	<ImageIcon size={16} />
																</button>

																<button
																	type='button'
																	aria-pressed={activeMedia === 'video'}
																	disabled={!hasVideo1}
																	onClick={() => setActiveMedia('video')}
																	className={cx(
																		'relative inline-flex items-center w-[38px] h-[38px] justify-center rounded-2xl outline-none transition focus-visible:ring-4',
																		activeMedia === 'video' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900',
																		!hasVideo1 && 'opacity-50 cursor-not-allowed',
																	)}
																	style={{
																		['--tw-ring-color']: 'var(--color-primary-200)',
																		border: activeMedia === 'video' ? `1px solid var(--color-primary-200)` : '1px solid transparent',
																	}}
																	title={t('showVideo')}
																	aria-label={t('showVideo')}
																>
																	<VideoIcon size={16} />
																</button>

																{hasVideo2 && (
																	<button
																		type='button'
																		aria-pressed={activeMedia === 'video2'}
																		onClick={() => setActiveMedia('video2')}
																		className={cx(
																			'relative inline-flex items-center gap-1.5 px-3 h-[38px] justify-center rounded-2xl outline-none transition focus-visible:ring-4',
																			activeMedia === 'video2' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900',
																		)}
																		style={{
																			['--tw-ring-color']: 'var(--color-primary-200)',
																			border: activeMedia === 'video2' ? `1px solid var(--color-primary-200)` : '1px solid transparent',
																		}}
																		title={t('showVideoAlt')}
																		aria-label={t('showVideoAlt')}
																	>
																		<VideoIcon size={16} />
																		<span className='hidden sm:inline'>{t('alt')}</span>
																	</button>
																)}
															</div>
														</div>
													);
												})()}
											</div>

											{/* MOBILE EXERCISE LIST */}
											<div className='pt-3 lg:hidden'>
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

											{!isCardio && (
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
													className='mt-3'
												/>
											)}

										</div>


										{/* Sets table */}
										{isCardio ? (
											<CardioTimerCard
												durationSeconds={currentExercise?.durationSeconds}
												note={currentExercise?.note}
											/>
										) : (
											<>
												<ExerciseNotesBar exercise={currentExercise} t={t} />
												<SoftCard className='mt-3 overflow-hidden shadow-sm'>
													<div className='overflow-x-auto'>
														<table className='w-full text-sm'>
															<thead
																className='sticky top-0 z-10 backdrop-blur-sm'
																style={{
																	background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
																	borderBottom: `1.5px solid var(--color-primary-200)`,
																}}
															>
																<tr className='text-left rtl:text-right'>
																	<th className='max-sm:hidden py-2 px-2 font-bold text-[10px] uppercase tracking-wide' style={{ color: 'var(--color-primary-700)' }}>
																		{t('table.set')}
																	</th>
																	<th className='py-2 px-2 font-bold text-[10px] uppercase tracking-wide' style={{ color: 'var(--color-primary-700)' }}>
																		{t('table.weight')}
																	</th>
																	<th className='py-2 px-2 font-bold text-[10px] uppercase tracking-wide' style={{ color: 'var(--color-primary-700)' }}>
																		{t('table.reps')}
																	</th>
																	<th className='py-2 px-2 font-bold text-[10px] uppercase tracking-wide text-center' style={{ color: 'var(--color-primary-700)' }}>
																		{t('table.done')}
																	</th>
																</tr>
															</thead>

															<tbody className='divide-y' style={{ borderColor: 'var(--color-primary-100)' }}>
																{currentSets.map((s, i) => (
																	<tr
																		key={s.id}
																		className='transition-colors duration-150'
																		style={{
																			backgroundColor: i % 2 === 1 ? 'rgba(248,250,252,0.3)' : 'white',
																		}}
																		onMouseEnter={e => {
																			e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
																		}}
																		onMouseLeave={e => {
																			e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'rgba(248,250,252,0.3)' : 'white';
																		}}
																	>
																		<td className='max-sm:hidden py-2 px-2'>
																			<span
																				className='inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-extrabold'
																				style={{
																					background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
																					color: 'var(--color-primary-700)',
																				}}
																			>
																				{s.set}
																			</span>
																		</td>

																		{/* WEIGHT */}
																		<td className='py-2 px-2'>
																			<div className='relative inline-block'>
																				<input
																					type='text'
																					value={getBufferedValue(s.id, 'weight', s.weight)}
																					onChange={e => {
																						const key = `${s.id}:weight`;
																						let v = normalizeNumericInput(e.target.value);
																						v = v.replace(/[^\d.]/g, '');
																						const parts = v.split('.');
																						if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
																						setInputBuffer(prev => ({ ...prev, [key]: v }));
																					}}
																					onFocus={e => {
																						e.target.select();
																						e.currentTarget.style.boxShadow = `0 0 0 2px var(--color-primary-200)`;
																						e.currentTarget.style.borderColor = 'var(--color-primary-300)';
																					}}
																					onBlur={e => {
																						e.currentTarget.style.boxShadow = 'none';
																						e.currentTarget.style.borderColor = 'var(--color-primary-200)';
																						handleInputBlur(s.id, 'weight');
																					}}
																					onKeyDown={e => {
																						if (e.key === 'Enter') e.currentTarget.blur();
																					}}
																					inputMode='decimal'
																					placeholder='0'
																					aria-label={t('table.weight')}
																					className='text-center h-8 w-[90px] text-sm font-semibold tabular-nums rounded-lg border bg-white outline-none px-[26px] transition-all duration-150'
																					style={{
																						borderColor: 'var(--color-primary-200)',
																					}}
																				/>

																				<button
																					type='button'
																					onClick={() => bump(s.id, 'weight', -1)}
																					title={t('minusOne')}
																					aria-label={t('minusOne')}
																					className='absolute left-[3px] top-1/2 -translate-y-1/2 grid h-[26px] w-[26px] place-items-center rounded-md active:scale-90 transition-all duration-100 hover:scale-105'
																					style={{
																						background: 'linear-gradient(135deg, var(--color-primary-50), white)',
																						border: `1px solid var(--color-primary-200)`,
																						color: 'var(--color-primary-600)',
																					}}
																					tabIndex={-1}
																				>
																					<Minus size={12} strokeWidth={2.5} />
																				</button>

																				<button
																					type='button'
																					onClick={() => bump(s.id, 'weight', +1)}
																					title={t('plusOne')}
																					aria-label={t('plusOne')}
																					className='absolute right-[3px] top-1/2 -translate-y-1/2 grid h-[26px] w-[26px] place-items-center rounded-md active:scale-90 transition-all duration-100 hover:scale-105'
																					style={{
																						background: 'linear-gradient(135deg, var(--color-primary-50), white)',
																						border: `1px solid var(--color-primary-200)`,
																						color: 'var(--color-primary-600)',
																					}}
																					tabIndex={-1}
																				>
																					<Plus size={12} strokeWidth={2.5} />
																				</button>
																			</div>
																		</td>

																		{/* REPS */}
																		<td className='py-2 px-2'>
																			<div className='relative inline-block'>
																				<input
																					type='text'
																					value={getBufferedValue(s.id, 'reps', s.reps)}
																					onChange={e => handleInputChange(s.id, 'reps', e.target.value)}
																					onFocus={e => {
																						e.target.select();
																						e.currentTarget.style.boxShadow = `0 0 0 2px var(--color-primary-200)`;
																						e.currentTarget.style.borderColor = 'var(--color-primary-300)';
																					}}
																					onBlur={e => {
																						e.currentTarget.style.boxShadow = 'none';
																						e.currentTarget.style.borderColor = 'var(--color-primary-200)';
																						handleInputBlur(s.id, 'reps');
																					}}
																					onKeyDown={e => {
																						if (e.key === 'Enter') e.currentTarget.blur();
																					}}
																					inputMode='numeric'
																					placeholder='0'
																					aria-label={t('table.reps')}
																					className='text-center h-8 w-[90px] text-sm font-semibold tabular-nums rounded-lg border bg-white outline-none px-[26px] transition-all duration-150'
																					style={{ borderColor: 'var(--color-primary-200)' }}
																				/>

																				<button
																					type='button'
																					onClick={() => bump(s.id, 'reps', -1)}
																					title={t('minusOne')}
																					aria-label={t('minusOne')}
																					className='absolute left-[3px] top-1/2 -translate-y-1/2 grid h-[26px] w-[26px] place-items-center rounded-md active:scale-90 transition-all duration-100 hover:scale-105'
																					style={{
																						background: 'linear-gradient(135deg, var(--color-primary-50), white)',
																						border: `1px solid var(--color-primary-200)`,
																						color: 'var(--color-primary-600)',
																					}}
																					tabIndex={-1}
																				>
																					<Minus size={12} strokeWidth={2.5} />
																				</button>

																				<button
																					type='button'
																					onClick={() => bump(s.id, 'reps', +1)}
																					title={t('plusOne')}
																					aria-label={t('plusOne')}
																					className='absolute right-[3px] top-1/2 -translate-y-1/2 grid h-[26px] w-[26px] place-items-center rounded-md active:scale-90 transition-all duration-100 hover:scale-105'
																					style={{
																						background: 'linear-gradient(135deg, var(--color-primary-50), white)',
																						border: `1px solid var(--color-primary-200)`,
																						color: 'var(--color-primary-600)',
																					}}
																					tabIndex={-1}
																				>
																					<Plus size={12} strokeWidth={2.5} />
																				</button>
																			</div>
																		</td>

																		{/* DONE CHECKBOX */}
																		<td className='py-2 px-2'>
																			<div className='flex justify-center'>
																				<button
																					type='button'
																					role='checkbox'
																					aria-checked={s.done}
																					onClick={() => toggleDone(s.id)}
																					aria-label={t('table.done')}
																					className='relative cursor-pointer flex h-6 w-6 items-center justify-center rounded-md border transition-all duration-200 active:scale-95'
																					style={{
																						borderColor: s.done ? 'var(--color-primary-500)' : 'var(--color-primary-200)',
																						background: s.done ? 'var(--color-gradient-from)' : 'white',
																					}}
																				>
																					{s.done && (
																						<motion.div
																							initial={{ scale: 0, opacity: 0 }}
																							animate={{ scale: 1, opacity: 1 }}
																							exit={{ scale: 0, opacity: 0 }}
																							transition={{ type: 'spring', stiffness: 500, damping: 30 }}
																						>
																							<Check className='h-3.5 w-3.5 text-white' strokeWidth={3} />
																						</motion.div>
																					)}
																				</button>
																			</div>
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>

													{/* Controls */}


													<div
														className='flex items-center justify-between gap-2 px-3 py-2.5 border-t'
														style={{
															borderColor: 'var(--color-primary-200)',
															background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
															color: 'var(--color-primary-900)',
														}}
													>
														<TooltipProvider delayDuration={300}>
															{/* Left side - Set controls */}
															<div className='flex items-center gap-2'>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<GhostBtn
																			onClick={removeSetFromCurrentExercise}
																			disabled={currentSets.length <= 1}
																			className='!h-9 !w-9 !p-0 flex items-center justify-center'
																		>
																			<Minus size={16} />
																		</GhostBtn>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>{t('actions.removeSet')}</p>
																	</TooltipContent>
																</Tooltip>

																<Tooltip>
																	<TooltipTrigger asChild>
																		<GradientBtn
																			onClick={addSetForCurrentExercise}
																			className='!h-9 !w-9 !p-0 flex items-center justify-center shadow-sm'
																		>
																			<Plus size={16} />
																		</GradientBtn>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>{t('actions.addSet')}</p>
																	</TooltipContent>
																</Tooltip>
															</div>

															{/* Right side - Sync status */}
															<div className='flex items-center gap-2'>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<GhostBtn
																			onClick={() => trySyncQueue(true)}
																			disabled={syncing}
																			className='!h-9 !w-9 !p-0 flex items-center justify-center'
																		>
																			{syncing ? (
																				<span
																					className='inline-block w-4 h-4 border-2 rounded-full animate-spin'
																					style={{
																						borderColor: 'var(--color-primary-300)',
																						borderTopColor: 'transparent'
																					}}
																				/>
																			) : unsaved ? (
																				<CloudOff size={16} style={{ color: '#b45309' }} />
																			) : (
																				<Cloud size={16} style={{ color: '#059669' }} />
																			)}
																		</GhostBtn>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>{syncing ? t('sync.syncing') : unsaved ? t('sync.syncNow') : t('sync.synced')}</p>
																	</TooltipContent>
																</Tooltip>

																{/* Status indicator badges */}
																{lastSyncStatus === 'ok' && (
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<span className='inline-flex items-center justify-center w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700'>
																				<Cloud size={16} />
																			</span>
																		</TooltipTrigger>
																		<TooltipContent>
																			<p>{t('sync.synced')}</p>
																		</TooltipContent>
																	</Tooltip>
																)}

																{lastSyncStatus === 'error' && (
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<span className='inline-flex items-center justify-center w-9 h-9 rounded-md bg-rose-50 border border-rose-200 text-rose-700'>
																				<CloudOff size={16} />
																			</span>
																		</TooltipTrigger>
																		<TooltipContent>
																			<p>{t('sync.someFailed')}</p>
																		</TooltipContent>
																	</Tooltip>
																)}
															</div>
														</TooltipProvider>
													</div>
												</SoftCard>
											</>
										)}
									</>
								)}
							</div>
						</ThemeFrame>
					</div>

					{/* RIGHT */}
					<div className='hidden lg:block w-80'>
						<ThemeFrame>
							<div className='p-4'>
								<div className='mb-3'>
									<div className='text-xs' style={{ color: 'var(--color-primary-700)' }}>
										{t('sections.title')}
									</div>
									<div className='mt-2 flex flex-wrap gap-2'>
										{sectionTabs.map(st => {
											const active = activeSection === st.key;
											return (
												<button
													key={st.key}
													onClick={() => setActiveSection(st.key)}
													className='px-3 h-10 rounded-2xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4'
													style={{
														['--tw-ring-color']: 'var(--color-primary-200)',
														borderColor: 'var(--color-primary-200)',
														background: active
															? 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))'
															: 'rgba(255,255,255,0.9)',
														color: active ? 'var(--color-primary-800)' : '#334155',
													}}
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
						</ThemeFrame>
					</div>
				</div>
			</motion.div>
		</div>
	);
}




function ExerciseNotesBar({ exercise, t }) {
	if (!exercise) return null;

	const reps = normalizeReps(exercise?.targetReps);
	const tempo = normalizeTempo(exercise?.tempo);
	const sets = Math.min(20, Math.max(1, Number(exercise?.targetSets) || 1));

	const rest =
		Number.isFinite(exercise?.restSeconds) ? exercise.restSeconds : Number.isFinite(exercise?.rest) ? exercise.rest : null;

	const note = String(exercise?.note ?? '').trim();

	const items = [
		// { label: t('notes.sets'), value: String(sets), icon: Target },
		{ label: t('notes.reps'), value: reps || '-', icon: Repeat },
		{ label: t('notes.tempo'), value: tempo || '-', icon: Timer },
		// ...(rest != null ? [{ label: t('notes.rest'), value: `${rest}s`, icon: Clock }] : []),
	];

	return (
		<div
			style={{
				background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.8))',
				borderColor: 'var(--color-primary-200)',
			}}
			className='mt-2 rounded-xl  shadow-sm border overflow-hidden'
		>


			{/* Stats Grid */}
			<div className='p-2'>
				<div className='grid grid-cols-2 gap-1.5'>
					{items.map((it, idx) => {
						const Icon = it.icon;
						return (
							<div
								key={idx}
								className='bg-white/50 backdrop-blur-2xl rounded-lg px-2.5 py-2 border shadow-sm transition-all duration-150 hover:shadow-md'
								style={{ borderColor: 'var(--color-primary-100)' }}
							>
								<div className='flex items-center justify-between gap-2'>
									<div className='flex items-center gap-1.5 min-w-0'>
										<div
											className='flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center'
											style={{
												background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
											}}
										>
											<Icon size={11} style={{ color: 'var(--color-primary-600)' }} strokeWidth={2.5} />
										</div>
										<span className='text-[9px] font-bold uppercase tracking-wider truncate' style={{ color: 'var(--color-primary-700)' }}>
											{it.label}
										</span>
									</div>
									<span className='text-sm font-extrabold flex-shrink-0' style={{ color: 'var(--color-primary-900)' }}>
										{it.value}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				{/* Note Section */}
				{note && (
					<div
						className='mt-2 rounded-lg px-2.5 py-2 border'
						style={{
							background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.7))',
							borderColor: 'var(--color-primary-200)',
						}}
					>
						<div className='flex items-start gap-2'>
							<div
								className='flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5'
								style={{
									background: 'linear-gradient(135deg, var(--color-primary-200), var(--color-primary-100))',
								}}
							>
								<StickyNote size={11} style={{ color: 'var(--color-primary-700)' }} strokeWidth={2.5} />
							</div>
							<p className='text-[10px] leading-relaxed font-medium flex-1' style={{ color: 'var(--color-primary-900)' }}>
								{note}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}


