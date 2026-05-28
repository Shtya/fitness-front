'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
	Dumbbell,
	X,
	Minus,
	Plus,
	Video as VideoIcon,
	Image as ImageIcon,
	CloudOff,
	Cloud,
	Check,
	Repeat,
	Timer,
	Clock,
	CheckCircle2,
	Play,
	Pause,
	RotateCcw,
	Headphones,
	StickyNote,
	ChevronLeft,
	ChevronRight,
	PencilLine,
	Save,
	Trash2,
	Search,
} from 'lucide-react';
import { Notification } from '@/config/Notification';
import api from '@/utils/axios';
import weeklyProgram from './exercises';
import { createSessionFromDay } from '@/components/pages/workouts/helpers';
import { RestTimerCard } from '@/components/pages/workouts/RestTimerCard';
import { AudioHubInline } from '@/components/pages/workouts/AudioHub';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import Img from '@/components/atoms/Img';
import { useCountdown } from '@/hooks/workouts/useCountdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/* ─────────────────────────────────────────
	 CONSTANTS
───────────────────────────────────────── */
export const DEFAULT_SOUNDS = [
	'/sounds/1.mp3', '/sounds/2.mp3', '/sounds/sound.wav',
	'/sounds/alert2.mp3', '/sounds/alert3.mp3', '/sounds/alert4.mp3',
	'/sounds/alert5.mp3', '/sounds/alert6.mp3', '/sounds/alert7.mp3', '/sounds/alert8.mp3',
];
const LOCAL_KEY_SELECTED_DAY = 'mw.selected.day';
const LOCAL_KEY_QUEUE = 'mw.pendingPRs.v1';
const WEEK_ORDER = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_INDEX = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
const WEEK_START = 6;

/* ─────────────────────────────────────────
	 UTILS
───────────────────────────────────────── */
const cx = (...c) => c.filter(Boolean).join(' ');

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
	let x = s.toLowerCase()
		.replace(/[–—]/g, '-').replace(/\bto\b/g, '-').replace(/إلى/g, '-')
		.replace(/\//g, '-').replace(/\s+/g, '');
	x = x.replace(/[^\d-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
	if (!x) return '';
	if (x.includes('-')) {
		const [a, b] = x.split('-').filter(Boolean);
		const n1 = Number(a), n2 = Number(b);
		if (Number.isFinite(n1) && Number.isFinite(n2) && n1 > 0 && n2 > 0) {
			const lo = Math.min(n1, n2), hi = Math.max(n1, n2);
			return lo === hi ? String(lo) : `${lo}-${hi}`;
		}
		return '';
	}
	const n = Number(x);
	return Number.isFinite(n) && n > 0 ? String(n) : '';
}

function normalizeNumericInput(str = '') {
	const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
	return String(str).replace(/[٠-٩۰-۹]/g, d => map[d] || d).replace(',', '.');
}

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

function toMMSS(seconds) {
	const s = Math.max(0, Math.round(Number(seconds) || 0));
	const m = Math.floor(s / 60), ss = s % 60;
	return `${m}:${ss < 10 ? '0' : ''}${ss}`;
}

/* ─────────────────────────────────────────
	 API HELPERS
───────────────────────────────────────── */
async function fetchActivePlan(userId) {
	const { data } = await api.get('/plans/active', { params: { userId } });
	if (data?.status === 'none' || data?.error) return { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) }, notes: [] };
	if (data?.program?.days?.length) return data;
	return { program: { days: Object.keys(weeklyProgram).map(k => weeklyProgram[k]) }, notes: [] };
}

function normalizeDayProgram(dayProgram = {}) {
	const warmup = Array.isArray(dayProgram.warmupExercises) ? dayProgram.warmupExercises : [];
	const main = Array.isArray(dayProgram.exercises) ? dayProgram.exercises : [];
	const cardio = Array.isArray(dayProgram.cardioExercises) ? dayProgram.cardioExercises : [];
	const withGroup = (arr, group) =>
		arr.map((x, idx) => ({ ...x, group, instanceId: `${group}:${x.id}:${idx}`, id: `${group}:${x.id}:${idx}`, originalExerciseId: x.id }));
	return {
		...dayProgram, warmupExercises: warmup, exercises: main, cardioExercises: cardio,
		allExercises: [...withGroup(warmup, 'warmup'), ...withGroup(main, 'workout'), ...withGroup(cardio, 'cardio')]
	};
}

function pickInitialSection(dayProgramNorm) {
	if (dayProgramNorm?.warmupExercises?.length) return 'warmup';
	if (dayProgramNorm?.exercises?.length) return 'workout';
	if (dayProgramNorm?.cardioExercises?.length) return 'cardio';
	return 'workout';
}

async function fetchLastDayByName(userId, day, onOrBefore) {
	try {
		const plan = await fetchActivePlan(userId);
		const dayProgramRaw = plan?.program?.days?.find(d => String(d.dayOfWeek ?? '').toLowerCase() === day.toLowerCase()) || weeklyProgram[day] || { exercises: [] };
		const dayProgram = normalizeDayProgram(dayProgramRaw);
		const exerciseNames = (dayProgram.allExercises || []).map(ex => ex.name).filter(Boolean);
		if (!exerciseNames.length) return { date: null, day, recordsByExercise: {} };
		const { data } = await api.post('/prs/last-workout-sets', { userId, exercises: exerciseNames });
		const recordsByExercise = {};
		(data?.exercises || []).forEach(exercise => {
			if (exercise?.records?.length > 0) {
				recordsByExercise[exercise.exerciseName] = exercise.records.map(r => ({
					weight: Number(r.weight) || 0, reps: Number(r.reps) || 0,
					done: !!r.done, setNumber: Number(r.setNumber) || 1, id: r.id,
				}));
			}
		});
		return { date: (data?.exercises || []).find(ex => ex.date)?.date || null, day, recordsByExercise };
	} catch (error) {
		console.error('Error fetching last workout sets:', error);
		return { date: null, day, recordsByExercise: {} };
	}
}

async function upsertDailyPR(userId, exerciseName, date, records) {
	const { data } = await api.post('/prs', { exerciseName, date, records }, { params: { userId } });
	return data;
}

/* ─────────────────────────────────────────
	 LOCAL QUEUE
───────────────────────────────────────── */
function loadQueue() { try { const arr = JSON.parse(localStorage.getItem(LOCAL_KEY_QUEUE) || '[]'); return Array.isArray(arr) ? arr : []; } catch { return []; } }
function saveQueue(arr) { try { localStorage.setItem(LOCAL_KEY_QUEUE, JSON.stringify(arr)); } catch { } }
function queueKey(item) { return `${item.userId}__${item.date}__${item.exerciseName}`.toLowerCase(); }
function upsertQueueItem(item) {
	const q = loadQueue(), key = queueKey(item), idx = q.findIndex(x => queueKey(x) === key);
	if (idx >= 0) q[idx] = { ...q[idx], ...item, createdAt: q[idx].createdAt || item.createdAt || Date.now() };
	else q.push({ ...item, createdAt: Date.now() });
	saveQueue(q);
}
function removeQueueItem(item) { saveQueue(loadQueue().filter(x => queueKey(x) !== queueKey(item))); }

/* ─────────────────────────────────────────
	 PRIMITIVE COMPONENTS
───────────────────────────────────────── */

export function InlineVideo({ src }) {
	const ref = useRef(null);
	return <video muted ref={ref} src={src} className="w-full h-full object-contain bg-white" playsInline controls />;
}

/** Minimal icon button — ghost style */
function IconBtn({ children, onClick, disabled, title, className = '', active = false }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className={cx(
				'inline-flex items-center justify-center rounded-lg border transition-all duration-150',
				'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
				'disabled:opacity-50 disabled:cursor-not-allowed',
				active
					? 'bg-[var(--color-primary-600)] border-[var(--color-primary-600)] text-white shadow-md'
					: 'bg-white border-[var(--color-primary-200)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-50)]',
				className,
			)}
		>
			{children}
		</button>
	);
}

/** Solid gradient CTA */
function PrimaryBtn({ children, onClick, disabled, title, className = '' }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className={cx(
				'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent',
				'bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]',
				'text-white font-semibold text-sm shadow-lg shadow-[var(--color-primary-200)]',
				'transition-all duration-150 active:scale-95',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
				'disabled:opacity-50 disabled:cursor-not-allowed',
				className,
			)}
		>
			{children}
		</button>
	);
}

/* ─────────────────────────────────────────
	 NOTES MODAL
───────────────────────────────────────── */
function NotesModal({ open, onClose, title, notes = [], t }) {
	if (!open) return null;
	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
				className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<motion.div
				initial={{ y: 32, opacity: 0, scale: 0.96 }}
				animate={{ y: 0, opacity: 1, scale: 1 }}
				exit={{ y: 24, opacity: 0, scale: 0.97 }}
				transition={{ type: 'spring', stiffness: 300, damping: 28 }}
				className="fixed left-1/2 top-[10%] -translate-x-1/2 z-[125] w-[92%] max-w-md rounded-lg bg-white shadow-2xl border border-[var(--color-primary-200)] overflow-hidden"
				onClick={e => e.stopPropagation()}
			>
				<div className="p-4 border-b border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)] to-white flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary-500)]">{t('notes.modalTitle')}</p>
						<h3 className="text-sm font-bold text-slate-900 truncate">{title || t('notes.fallbackTitle')}</h3>
					</div>
					<IconBtn onClick={onClose} title={t('actions.close')} className="w-8 h-8 shrink-0">
						<X size={14} />
					</IconBtn>
				</div>

				<div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
					{Array.isArray(notes) && notes.length ? notes.map((n, idx) => (
						<div key={idx} className="flex items-start gap-3 rounded-lg border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-3">
							<span className="shrink-0 w-5 h-5 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
								{idx + 1}
							</span>
							<span className="text-sm text-slate-700 md: leading-relaxed">{String(n)}</span>
						</div>
					)) : (
						<div className="text-center py-8 text-sm text-slate-400">{t('notes.empty')}</div>
					)}
				</div>

				<div className="p-3 border-t border-slate-100 bg-white">
					<button onClick={onClose} className="w-full h-10 rounded-lg border border-[var(--color-primary-200)] text-sm font-semibold text-[var(--color-primary-700)] hover:bg-[var(--color-primary-50)] transition-colors">
						{t('actions.close')}
					</button>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

 
function SectionTabs({ tabs, active, onChange }) {
	if (tabs.length <= 1) return null;
	return (
		<div className="flex gap-1.5 p-1 rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-100)]">
			{tabs.map(tab => {
				const isActive = tab.key === active;
				return (
					<button
						key={tab.key}
						onClick={() => onChange(tab.key)}
						className={cx(
							'flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
							isActive
								? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-sm'
								: 'text-slate-500 hover:text-slate-700 hover:bg-white/60',
						)}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}

/* ─────────────────────────────────────────
	 EXERCISE LIST (sidebar + mobile scroll)
───────────────────────────────────────── */
function ProgressRing({ done, total, size = 44, isCompleted = false }) {
	const R = (size / 2) - 4;
	const C = 2 * Math.PI * R;
	const pct = total > 0 ? Math.min(1, done / total) : 0;
	const dash = C * pct;
	const isFullDone = done > 0 && done >= total;

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="shrink-0 -rotate-90"
			aria-hidden
		>
			<defs>
				<linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="var(--color-gradient-from)" />
					<stop offset="100%" stopColor="var(--color-gradient-to)" />
				</linearGradient>
			</defs>
			{/* Track */}
			<circle
				cx={size / 2} cy={size / 2} r={R}
				fill="none"
				stroke={isCompleted ? '#d1fae5' : '#e2e8f0'}
				strokeWidth="3"
			/>
			{/* Fill */}
			{pct > 0 && (
				<circle
					cx={size / 2} cy={size / 2} r={R}
					fill="none"
					stroke={isCompleted ? '#10b981' : 'url(#ring-grad)'}
					strokeWidth="3"
					strokeLinecap="round"
					strokeDasharray={C}
					strokeDashoffset={C - dash}
					className="transition-all duration-500 ease-out"
				/>
			)}
		</svg>
	);
}

/* ─────────────────────────────────────────
	 SET DOTS ROW
	 Small dot per set — filled when done.
───────────────────────────────────────── */
function SetDots({ done, total, isCompleted }) {
	if (total === 0) return null;
	return (
		<div className="flex items-center gap-[3px] flex-wrap">
			{Array.from({ length: total }).map((_, i) => {
				const isDone = i < done;
				return (
					<motion.span
						key={i}
						initial={{ scale: 0.6, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 22 }}
						className={cx(
							'rounded-full transition-all duration-300',
							isDone
								? isCompleted
									? 'w-2 h-2 bg-emerald-400 shadow-sm shadow-emerald-200'
									: 'w-2 h-2 bg-[var(--color-primary-500)] shadow-sm shadow-[var(--color-primary-200)]'
								: 'w-1.5 h-1.5 bg-slate-200',
						)}
					/>
				);
			})}
		</div>
	);
}

export function ExerciseList({ workout, exercisesOverride, currentExId, onPick, t, completedExercises, toggleExerciseCompletion }) {
	const exercises = Array.isArray(exercisesOverride) ? exercisesOverride : Array.isArray(workout?.exercises) ? workout.exercises : [];
	const sets = Array.isArray(workout?.sets) ? workout.sets : [];
	const setsFor = exId => sets.filter(s => s?.exId === exId);
	const startedAny = useMemo(() => sets.some(s => !!s?.done || Number(s?.weight) > 0 || Number(s?.reps) > 0), [sets]);

	if (!workout || exercises.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<div className="w-12 h-12 rounded-lg bg-[var(--color-primary-50)] flex items-center justify-center mb-3">
					<Dumbbell size={20} className="text-[var(--color-primary-400)]" />
				</div>
				<p className="text-sm font-medium text-slate-500">{t('noExercises')}</p>
			</div>
		);
	}

	return (
		<div className="lg:space-y-1.5 max-lg:flex max-lg:gap-2 max-lg:overflow-x-auto max-lg:pb-1 max-lg:px-1 scrollbar-hide">
			{exercises.map((ex, idx) => {
				const exId = ex?.id ?? `idx-${idx}`;
				const list = setsFor(exId);
				const done = list.filter(s => s?.done).length;
				const total = list.length;
				const isActive = currentExId === exId;
				const isCompleted = completedExercises?.has?.(exId);
				const hasStarted = startedAny && total > 0 && done > 0;
				const isFullDone = total > 0 && done >= total;

				return (
					<motion.div
						key={exId}
						className="relative max-lg:shrink-0"
						layout
						transition={{ type: 'spring', stiffness: 300, damping: 28 }}
					>
						<button
							type="button"
							onClick={() => onPick?.(ex)}
							className={cx(
								'w-full text-left rounded-lg border transition-all duration-200 overflow-hidden',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
								isCompleted
									? 'border-emerald-200 bg-emerald-50/60'
									: isActive
										? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] shadow-md shadow-[var(--color-primary-100)]'
										: 'border-slate-200 bg-white hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/40',
							)}
						>

							{/* ── MOBILE CARD ── */}
							<div className="lg:hidden p-.5">
								<div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
									{ex?.img
										? <Img src={ex.img} alt={ex?.name || 'exercise'} className="object-contain w-full h-full" showBlur={false} />
										: <div className="grid place-items-center w-full h-full"><Dumbbell size={16} className="text-slate-400" /></div>
									}

									{/* Active ring overlay */}
									{isActive && !isCompleted && (
										<div className="absolute inset-0 ring-2 ring-[var(--color-primary-400)] ring-inset rounded-lg" />
									)}

									{/* Completed overlay */}
									<AnimatePresence>
										{isCompleted && (
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												className="absolute inset-0 bg-emerald-500/25 flex items-center justify-center rounded-lg"
											>
												<div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
													<Check size={12} strokeWidth={3} className="text-white" />
												</div>
											</motion.div>
										)}
									</AnimatePresence>

									{/* Progress ring overlaid bottom-right */}
									{hasStarted && !isCompleted && (
										<div className="absolute bottom-1 right-1">
											<div className="relative w-7 h-7 bg-white rounded-full shadow-sm flex items-center justify-center">
												<ProgressRing done={done} total={total} size={28} isCompleted={isCompleted} />
												<span className="absolute text-[8px] font-black text-[var(--color-primary-700)] rotate-90">
													{done}
												</span>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* ── DESKTOP LIST ITEM ── */}
							<div className="hidden lg:flex items-center gap-3 px-3 py-2.5">

								{/* Thumbnail + ring wrapper */}
								<div className="relative shrink-0">
									<div className={cx(
										'w-11 h-11 rounded-lg overflow-hidden bg-slate-100',
										isCompleted && 'opacity-80',
									)}>
										{ex?.img
											? <Img src={ex.img} alt={ex?.name || 'exercise'} className="object-contain w-full h-full" showBlur={false} />
											: <div className="grid place-items-center w-full h-full"><Dumbbell size={14} className="text-slate-400" /></div>
										}
										{/* Completed check overlay */}
										<AnimatePresence>
											{isCompleted && (
												<motion.div
													initial={{ opacity: 0, scale: 0.7 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.7 }}
													transition={{ type: 'spring', stiffness: 400, damping: 22 }}
													className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center rounded-lg"
												>
													<div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
														<Check size={10} strokeWidth={3} className="text-white" />
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>

									{/* SVG ring sits flush around the thumbnail */}
									{(hasStarted || isCompleted) && (
										<div className="absolute -inset-[3px] pointer-events-none">
											<ProgressRing
												done={isCompleted ? total || 1 : done}
												total={total || 1}
												size={50}
												isCompleted={isCompleted}
											/>
										</div>
									)}
								</div>

								{/* Text */}
								<div className="flex-1 min-w-0">
									<p className={cx(
										'text-sm font-semibold truncate md: leading-tight',
										isCompleted ? 'text-emerald-700' : isActive ? 'text-[var(--color-primary-700)]' : 'text-slate-800',
									)}>
										{idx + 1}. {ex?.name ?? 'Exercise'}
									</p>

									{/* Set dots + count */}
									<div className="mt-1 flex items-center gap-2">
										{total > 0 ? (
											<>
												<SetDots done={isCompleted ? total : done} total={total} isCompleted={isCompleted} />
												{hasStarted && (
													<span className={cx(
														'text-[10px] font-bold tabular-nums',
														isCompleted ? 'text-emerald-500' : 'text-[var(--color-primary-500)]',
													)}>
														{isCompleted ? total : done}/{total}
													</span>
												)}
											</>
										) : (
											<span className="text-[10px] text-slate-300">—</span>
										)}
									</div>
								</div>

								{/* Complete toggle button */}
								<button
									type="button"
									onClick={e => { e.stopPropagation(); toggleExerciseCompletion?.(exId); }}
									className={cx(
										'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]',
										'active:scale-90',
										isCompleted
											? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
											: 'border border-slate-200 text-slate-300 hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)]',
									)}
									aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
								>
									<AnimatePresence mode="wait" initial={false}>
										{isCompleted ? (
											<motion.span
												key="done"
												initial={{ scale: 0, rotate: -30 }}
												animate={{ scale: 1, rotate: 0 }}
												exit={{ scale: 0 }}
												transition={{ type: 'spring', stiffness: 500, damping: 25 }}
											>
												<Check size={14} strokeWidth={3} />
											</motion.span>
										) : (
											<motion.span
												key="undone"
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												exit={{ scale: 0 }}
											>
												<CheckCircle2 size={14} />
											</motion.span>
										)}
									</AnimatePresence>
								</button>
							</div>
						</button>
					</motion.div>
				);
			})}
		</div>
	);
}

/* ─────────────────────────────────────────
	 STAT CHIP (below media)
───────────────────────────────────────── */
function StatChip({ icon: Icon, label, value, accent = false }) {
	return (
		<div className={cx(
			'flex items-center gap-2 flex-1 min-w-0 px-3 py-2.5 rounded-lg border',
			accent ? 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-via)] border-transparent' : 'bg-white border-[var(--color-primary-100)]',
		)}>
			<div className={cx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', accent ? 'bg-white/20' : 'bg-[var(--color-primary-50)]')}>
				<Icon size={14} className={accent ? 'text-white' : 'text-[var(--color-primary-600)]'} strokeWidth={2.5} />
			</div>
			<div className="min-w-0">
				<p className={cx('text-[10px] font-medium uppercase tracking-wide truncate', accent ? 'text-white/70' : 'text-slate-400')}>{label}</p>
				<p className={cx('text-sm font-bold truncate md: leading-tight', accent ? 'text-white' : 'text-slate-800')}>{value || '—'}</p>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────
	 SETS TABLE
───────────────────────────────────────── */
function SetsTable({
	currentSets, currentExercise, workout, t,
	currentExId, USER_ID,
	inputBuffer, setInputBuffer,
	bump, toggleDone, setValue,
	addSet, removeSet,
	trySyncQueue, syncing, unsaved, lastSyncStatus,
}) {
	const getBuffered = (setId, field, num) => {
		const key = `${setId}:${field}`;
		if (Object.prototype.hasOwnProperty.call(inputBuffer, key)) return inputBuffer[key];
		return Number(num) === 0 ? '' : String(num ?? '');
	};

	const handleChange = (setId, field, raw) => {
		const key = `${setId}:${field}`;
		let v = normalizeNumericInput(raw).replace(/[^\d.]/g, '');
		const parts = v.split('.');
		if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
		setInputBuffer(prev => ({ ...prev, [key]: v }));
	};

	const handleBlur = (setId, field) => {
		const key = `${setId}:${field}`;
		const raw = inputBuffer[key];
		setInputBuffer(prev => { const n = { ...prev }; delete n[key]; return n; });
		const num = raw === '' || raw == null ? 0 : Number(raw);
		setValue(setId, field, Number.isFinite(num) ? num : 0);
	};

	return (
		<div className="mt-3 rounded-lg border border-[var(--color-primary-100)] bg-white overflow-hidden shadow-sm">
			{/* Header */}
			<div className="grid grid-cols-[auto_1fr_1fr_auto] gap-0 border-b border-[var(--color-primary-100)] bg-[var(--color-primary-50)]">
				{['#', t('table.weight'), t('table.reps'), t('table.done')].map((h, i) => (
					<div key={i} className={cx('py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-500)]', i === 3 && 'text-center')}>
						{h}
					</div>
				))}
			</div>

			{/* Rows */}
			{currentSets.map((s, i) => (
				<div
					key={s.id}
					className={cx(
						'grid grid-cols-[auto_1fr_1fr_auto] gap-0 items-center border-b border-[var(--color-primary-50)] last:border-0 transition-colors',
						s.done ? 'bg-emerald-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40',
					)}
				>
					{/* Set number */}
					<div className="py-3 px-3">
						<span className="w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-xs font-bold">
							{s.set}
						</span>
					</div>

					{/* Weight */}
					<div className="py-2 px-2">
						<SetInput
							value={getBuffered(s.id, 'weight', s.weight)}
							onChange={raw => handleChange(s.id, 'weight', raw)}
							onBlur={() => handleBlur(s.id, 'weight')}
							onMinus={() => bump(s.id, 'weight', -1)}
							onPlus={() => bump(s.id, 'weight', +1)}
							placeholder="0"
							inputMode="decimal"
							aria={t('table.weight')}
						/>
					</div>

					{/* Reps */}
					<div className="py-2 px-2">
						<SetInput
							value={getBuffered(s.id, 'reps', s.reps)}
							onChange={raw => handleChange(s.id, 'reps', raw)}
							onBlur={() => handleBlur(s.id, 'reps')}
							onMinus={() => bump(s.id, 'reps', -1)}
							onPlus={() => bump(s.id, 'reps', +1)}
							placeholder="0"
							inputMode="numeric"
							aria={t('table.reps')}
						/>
					</div>

					{/* Done */}
					<div className="py-3 px-3 flex justify-center">
						<button
							type="button"
							role="checkbox"
							aria-checked={s.done}
							onClick={() => toggleDone(s.id)}
							aria-label={t('table.done')}
							className={cx(
								'w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 active:scale-90',
								s.done
									? 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] border-transparent shadow-sm'
									: 'border-[var(--color-primary-200)] bg-white hover:border-[var(--color-primary-400)]',
							)}
						>
							{s.done && (
								<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
									<Check size={13} strokeWidth={3} className="text-white" />
								</motion.div>
							)}
						</button>
					</div>
				</div>
			))}

			{/* Footer controls */}
			<div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[var(--color-primary-50)]/50 border-t border-[var(--color-primary-100)]">
				<div className="flex items-center gap-2">
					<TooltipProvider delayDuration={200}>
						<Tooltip>
							<TooltipTrigger asChild>
								<IconBtn onClick={removeSet} disabled={currentSets.length <= 1} className="w-9 h-9">
									<Minus size={14} />
								</IconBtn>
							</TooltipTrigger>
							<TooltipContent><p>{t('actions.removeSet')}</p></TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<PrimaryBtn onClick={addSet} className="w-9 h-9">
									<Plus size={14} />
								</PrimaryBtn>
							</TooltipTrigger>
							<TooltipContent><p>{t('actions.addSet')}</p></TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				<TooltipProvider delayDuration={200}>
					<div className="flex items-center gap-2">
						{lastSyncStatus === 'ok' && (
							<span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
								<Cloud size={13} /> {t('sync.synced')}
							</span>
						)}
						{lastSyncStatus === 'error' && (
							<span className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
								<CloudOff size={13} /> {t('sync.someFailed')}
							</span>
						)}
						<Tooltip>
							<TooltipTrigger asChild>
								<IconBtn onClick={() => trySyncQueue(true)} disabled={syncing} className="w-9 h-9">
									{syncing ? (
										<span className="w-4 h-4 border-2 border-[var(--color-primary-300)] border-t-transparent rounded-full animate-spin" />
									) : unsaved ? (
										<CloudOff size={15} className="text-amber-500" />
									) : (
										<Cloud size={15} className="text-emerald-500" />
									)}
								</IconBtn>
							</TooltipTrigger>
							<TooltipContent>
								<p>{syncing ? t('sync.syncing') : unsaved ? t('sync.syncNow') : t('sync.synced')}</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</TooltipProvider>
			</div>
		</div>
	);
}

/** Compact +/- input used in the sets table */
function SetInput({ value, onChange, onBlur, onMinus, onPlus, placeholder, inputMode, aria }) {
	return (
		<div className="relative flex items-center">
			<button
				type="button"
				onClick={onMinus}
				tabIndex={-1}
				className="absolute left-1 w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] text-[var(--color-primary-600)] active:scale-90 hover:bg-[var(--color-primary-100)] transition-all z-10"
			>
				<Minus size={11} strokeWidth={2.5} />
			</button>
			<input
				type="text"
				value={value}
				onChange={e => onChange(e.target.value)}
				onFocus={e => e.target.select()}
				onBlur={onBlur}
				onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
				inputMode={inputMode}
				placeholder={placeholder}
				aria-label={aria}
				className="w-full h-9 text-center text-base font-bold tabular-nums rounded-lg border border-[var(--color-primary-200)] bg-white outline-none px-8 focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] transition-all"
			/>
			<button
				type="button"
				onClick={onPlus}
				tabIndex={-1}
				className="absolute right-1 w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white active:scale-90 hover:opacity-90 transition-all z-10"
			>
				<Plus size={11} strokeWidth={2.5} />
			</button>
		</div>
	);
}

/* ─────────────────────────────────────────
	 CARDIO TIMER CARD
───────────────────────────────────────── */
function CardioTimerCard({ durationSeconds = 0, note, className = '' }) {
	const t = useTranslations('cardioTimer');
	const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();
	const initial = Math.max(0, Math.round(Number(durationSeconds) || 0));
	const [seconds, setSeconds] = useState(initial);
	const holdRef = useRef(null);
	const prevInitial = useRef(initial);

	useEffect(() => {
		if (prevInitial.current !== initial) { setSeconds(initial); prevInitial.current = initial; }
	}, [initial]);

	const haptic = useCallback((ms = 10) => {
		if (typeof window === 'undefined') return;
		try { window.navigator?.vibrate?.(ms); } catch { }
	}, []);

	const step = useCallback(delta => setSeconds(s => Math.max(0, s + delta)), []);
	const startHold = useCallback(d => { step(d); holdRef.current = setInterval(() => step(d), 120); }, [step]);
	const endHold = useCallback(() => { if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; } }, []);
	useEffect(() => () => { if (holdRef.current) clearInterval(holdRef.current); }, []);

	const handleStart = () => { start(seconds); haptic(20); };
	const handleReset = () => { stop(); setSeconds(initial); haptic(15); };

	const ring = useMemo(() => {
		const R = 28, C = 2 * Math.PI * R;
		const pct = duration > 0 ? remaining / duration : 0;
		return { R, C, dash: C * pct };
	}, [remaining, duration]);

	const timeLabel = useMemo(() => toMMSS(running ? remaining : seconds), [running, remaining, seconds]);
	const isWarning = running && remaining <= 10 && remaining > 0;
	const isComplete = !running && duration > 0 && remaining === 0;

	return (
		<div className={cx('mt-3 rounded-lg border border-[var(--color-primary-100)] bg-white overflow-hidden shadow-sm', className)}>
			<div className="flex items-center gap-4 p-4">
				{/* Ring */}
				<div className="relative shrink-0 w-16 h-16 flex items-center justify-center">
					<svg width="64" height="64" viewBox="0 0 64 64">
						<circle cx="32" cy="32" r={ring.R} stroke="#e5e7eb" strokeWidth="5" fill="none" />
						<circle
							cx="32" cy="32" r={ring.R}
							stroke={isWarning ? '#f97316' : isComplete ? '#10b981' : 'url(#cardioGrad)'}
							strokeWidth="5" fill="none" strokeLinecap="round"
							strokeDasharray={ring.C} strokeDashoffset={ring.C - ring.dash}
							className="transition-all duration-300 ease-linear"
							transform="rotate(-90 32 32)"
						/>
						<defs>
							<linearGradient id="cardioGrad" x1="0" y1="0" x2="1" y2="1">
								<stop offset="0%" stopColor="var(--color-gradient-from)" />
								<stop offset="100%" stopColor="var(--color-gradient-to)" />
							</linearGradient>
						</defs>
					</svg>
					<span className={cx('absolute text-sm font-black tabular-nums', isWarning ? 'text-orange-500' : isComplete ? 'text-emerald-500' : 'text-slate-800')}>
						{timeLabel}
					</span>
				</div>

				{/* Controls */}
				<div className="flex-1 space-y-2">
					{!running && (
						<div className="flex items-center gap-1.5">
							<button onMouseDown={() => startHold(-15)} onMouseUp={endHold} onMouseLeave={endHold}
								onTouchStart={() => startHold(-15)} onTouchEnd={endHold}
								onClick={() => { step(-15); haptic(); }}
								className="w-8 h-8 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center active:scale-90 transition-all"
							><Minus size={13} /></button>
							<div className="flex-1 text-center text-sm font-bold text-[var(--color-primary-700)] bg-[var(--color-primary-50)] rounded-lg py-1.5 border border-[var(--color-primary-100)]">
								{toMMSS(seconds)}
							</div>
							<button onMouseDown={() => startHold(15)} onMouseUp={endHold} onMouseLeave={endHold}
								onTouchStart={() => startHold(15)} onTouchEnd={endHold}
								onClick={() => { step(15); haptic(); }}
								className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white flex items-center justify-center active:scale-90 transition-all"
							><Plus size={13} /></button>
							{seconds !== initial && (
								<button onClick={handleReset} className="w-8 h-8 rounded-lg border border-[var(--color-primary-200)] bg-white text-[var(--color-primary-500)] flex items-center justify-center active:scale-90 transition-all">
									<RotateCcw size={12} />
								</button>
							)}
						</div>
					)}

					<div className="flex items-center gap-2">
						{!running ? (
							<PrimaryBtn onClick={handleStart} className="flex-1 h-9 text-sm font-bold gap-1.5">
								<Play size={13} fill="currentColor" /> {t('actions.start')}
							</PrimaryBtn>
						) : paused ? (
							<>
								<button onClick={() => { resume(); haptic(); }}
									className="flex-1 h-9 rounded-lg text-sm font-bold text-[var(--color-primary-700)] bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
									<Play size={13} fill="currentColor" /> {t('actions.resume')}
								</button>
								<IconBtn onClick={() => { stop(); haptic(20); }} className="w-9 h-9 !border-rose-200 !text-rose-500 hover:!bg-rose-50">
									<X size={14} />
								</IconBtn>
							</>
						) : (
							<>
								<button onClick={() => { pause(); haptic(); }}
									className="flex-1 h-9 rounded-lg text-sm font-bold text-[var(--color-primary-700)] bg-white border border-[var(--color-primary-200)] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
									<Pause size={13} /> {t('actions.pause')}
								</button>
								<IconBtn onClick={() => { stop(); haptic(20); }} className="w-9 h-9 !border-rose-200 !text-rose-500 hover:!bg-rose-50">
									<X size={14} />
								</IconBtn>
							</>
						)}
					</div>
				</div>
			</div>

			{!!note && (
				<div className="px-4 pb-4">
					<div className="rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] px-3 py-2.5 text-xs text-slate-600">
						<span className="font-semibold text-[var(--color-primary-700)]">{t('note')}:</span> {String(note)}
					</div>
				</div>
			)}
		</div>
	);
}

/* ─────────────────────────────────────────
	 LOADING SKELETON
───────────────────────────────────────── */
function LoadingSkeleton() {
	return (
		<div className="space-y-4 animate-pulse p-4">
			<div className="h-28 rounded-lg bg-gradient-to-r from-[var(--color-primary-100)] to-[var(--color-primary-50)]" />
			<div className="flex gap-2">
				{[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-14 rounded-lg bg-slate-200" />)}
			</div>
			<div className="aspect-video rounded-lg bg-slate-200" />
			<div className="flex gap-3">
				<div className="h-14 flex-1 rounded-lg bg-slate-100" />
				<div className="h-14 flex-1 rounded-lg bg-slate-100" />
			</div>
			<div className="h-40 rounded-lg bg-slate-100" />
		</div>
	);
}

/* ─────────────────────────────────────────
	 MAIN PAGE
───────────────────────────────────────── */
/* ─────────────────────────────────────────
	 ADD EXERCISE MODAL
───────────────────────────────────────── */
const PAGE_SIZE = 12;

function AddExerciseModal({ open, section, onClose, onAdd, t }) {
	const [query, setQuery] = useState('');
	const [activeCategory, setActiveCategory] = useState('');
	const [categories, setCategories] = useState([]);
	const [results, setResults] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [catLoading, setCatLoading] = useState(false);
	const timerRef = useRef(null);
	const listRef = useRef(null);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	/* fetch categories once on open */
	useEffect(() => {
		if (!open) {
			setQuery('');
			setActiveCategory('');
			setPage(1);
			setResults([]);
			setTotal(0);
			return;
		}
		setCatLoading(true);
		api.get('/plan-exercises/categories')
			.then(r => setCategories(Array.isArray(r.data) ? r.data : []))
			.catch(() => setCategories([]))
			.finally(() => setCatLoading(false));
	}, [open]);

	/* fetch exercises whenever page / category / query change */
	const fetchExercises = useCallback(async (q, cat, pg) => {
		setLoading(true);
		try {
			const res = await api.get('/plan-exercises', {
				params: { search: q || undefined, category: cat || undefined, page: pg, limit: PAGE_SIZE },
			});
			setResults(Array.isArray(res.data?.records) ? res.data.records : []);
			setTotal(Number(res.data?.total_records) || 0);
		} catch {
			setResults([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, []);

	/* run on mount and whenever page/category change (not search — search debounced below) */
	useEffect(() => {
		if (!open) return;
		fetchExercises(query, activeCategory, page);
		listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
	}, [open, page, activeCategory]); // eslint-disable-line

	/* debounce search */
	const handleSearch = e => {
		const q = e.target.value;
		setQuery(q);
		setPage(1);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => fetchExercises(q, activeCategory, 1), 400);
	};

	const handleCategory = cat => {
		setActiveCategory(cat);
		setPage(1);
	};

	if (!open) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
				className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<motion.div
				initial={{ y: 40, opacity: 0, scale: 0.96 }}
				animate={{ y: 0, opacity: 1, scale: 1 }}
				exit={{ y: 24, opacity: 0, scale: 0.97 }}
				transition={{ type: 'spring', stiffness: 300, damping: 28 }}
				className="fixed left-1/2 top-[4%] -translate-x-1/2 z-[205] w-[96%] max-w-2xl rounded-xl bg-white shadow-2xl border border-[var(--color-primary-100)] overflow-hidden flex flex-col"
				style={{ maxHeight: '90vh' }}
				onClick={e => e.stopPropagation()}
			>
				{/* ── Header ── */}
				<div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-bold text-slate-800">{t('actions.selectExercise')}</h3>
						{total > 0 && !loading && (
							<p className="text-xs text-slate-400 mt-0.5">{total} {t('exercises')}</p>
						)}
					</div>
					<button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
						<X size={16} />
					</button>
				</div>

				{/* ── Search ── */}
				<div className="shrink-0 px-4 py-3 border-b border-slate-100">
					<div className="relative">
						<Search size={14} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<input
							autoFocus
							value={query}
							onChange={handleSearch}
							placeholder={t('actions.searchExercises')}
							className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-3 rtl:pl-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-shadow bg-slate-50"
						/>
					</div>
				</div>

				{/* ── Category tabs ── */}
				{(catLoading || categories.length > 0) && (
					<div className="shrink-0 px-4 py-2 border-b border-slate-100 overflow-x-auto scrollbar-hide">
						<div className="flex items-center gap-1.5 w-max">
							<button
								type="button"
								onClick={() => handleCategory('')}
								className={cx(
									'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
									activeCategory === ''
										? 'text-white shadow-sm'
										: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
								)}
								style={activeCategory === '' ? { background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))' } : {}}
							>
								{t('actions.allCategories') || 'All'}
							</button>
							{catLoading
								? Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="h-6 w-16 rounded-full bg-slate-100 animate-pulse" />
								))
								: categories.map(cat => (
									<button
										key={cat}
										type="button"
										onClick={() => handleCategory(cat)}
										className={cx(
											'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
											activeCategory === cat
												? 'text-white shadow-sm'
												: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
										)}
										style={activeCategory === cat ? { background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))' } : {}}
									>
										{cat}
									</button>
								))
							}
						</div>
					</div>
				)}

				{/* ── Exercise list ── */}
				<div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
					{loading ? (
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{Array.from({ length: PAGE_SIZE }).map((_, i) => (
								<div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" />
							))}
						</div>
					) : results.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
							<Dumbbell size={28} className="opacity-40" />
							<span className="text-sm">{t('actions.noExercisesFound')}</span>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{results.map(ex => (
								<button
									key={ex.id}
									type="button"
									onClick={() => onAdd(section, ex)}
									className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] transition-all text-center group active:scale-95"
								>
									<div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
										{ex.img
											? <img src={ex.img} alt="" className="w-full h-full object-contain" />
											: <Dumbbell size={18} className="text-slate-300 group-hover:text-[var(--color-primary-400)] transition-colors" />
										}
									</div>
									<div className="w-full min-w-0">
										<p className="text-xs font-semibold text-slate-800 line-clamp-2 md: leading-tight">{ex.name}</p>
										{ex.category && (
											<p className="text-[10px] text-slate-400 mt-0.5 truncate">{ex.category}</p>
										)}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				{/* ── Pagination ── */}
				{!loading && totalPages > 1 && (
					<div className="shrink-0 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
						<button
							type="button"
							disabled={page <= 1}
							onClick={() => setPage(p => p - 1)}
							className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLeft className='rtl:scale-x-[-1]' size={13} />
							{t('pagination.prev') || 'Prev'}
						</button>

						<span className="text-xs text-slate-500 font-medium">
							{page} / {totalPages}
						</span>

						<button
							type="button"
							disabled={page >= totalPages}
							onClick={() => setPage(p => p + 1)}
							className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
						>
							{t('pagination.next') || 'Next'}
							<ChevronRight className='rtl:scale-x-[-1]' size={13} />
						</button>
					</div>
				)}
			</motion.div>
		</AnimatePresence>
	);
}

/* ─────────────────────────────────────────
	 EDIT PLAN PANEL
───────────────────────────────────────── */
function EditPlanPanel({ editDayExercises, onUpdate, onDelete, onAddClick, onSave, onExit, saving, t }) {
	const sections = [
		{ key: 'warmupExercises', label: t('sections.warmup') },
		{ key: 'exercises', label: t('sections.workout') },
		{ key: 'cardioExercises', label: t('sections.cardio') },
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 8 }}
			className="rounded-xl border border-[var(--color-primary-200)] bg-white shadow-lg overflow-hidden"
		>
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[var(--color-primary-50)] to-white border-b border-[var(--color-primary-100)]">
				<div className="flex items-center gap-2">
					<PencilLine size={15} className="text-[var(--color-primary-600)]" />
					<span className="text-sm font-bold text-slate-800">{t('actions.editPlan')}</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onExit}
						disabled={saving}
						className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
					>
						{t('actions.exitEdit')}
					</button>
					<button
						type="button"
						onClick={onSave}
						disabled={saving}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
						style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))' }}
					>
						{saving ? <RotateCcw size={12} className="animate-spin" /> : <Save size={12} />}
						{saving ? t('actions.saving') : t('actions.savePlan')}
					</button>
				</div>
			</div>

			{/* Sections */}
			<div className="divide-y divide-slate-100">
				{sections.map(({ key, label }) => {
					const exercises = editDayExercises[key] || [];
					return (
						<div key={key} className="px-4 py-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
								<button
									type="button"
									onClick={() => onAddClick(key)}
									className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--color-primary-700)] bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] transition-colors border border-[var(--color-primary-200)]"
								>
									<Plus size={11} /> {t('actions.addExercise')}
								</button>
							</div>
							{exercises.length === 0 && (
								<p className="text-xs text-slate-400 py-2">{t('noExercises')}</p>
							)}
							{exercises.map((ex, idx) => (
								<div key={`${ex.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
									<div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
										{ex.img ? <img src={ex.img} alt="" className="w-full h-full object-contain" /> : <Dumbbell size={12} className="text-slate-400" />}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-semibold text-slate-800 truncate">{ex.name}</p>
										<div className="flex items-center gap-2 mt-1">
											<label className="text-[10px] text-slate-500">{t('actions.sets')}</label>
											<input
												type="number" min="1" max="20"
												value={ex.targetSets ?? 3}
												onChange={e => onUpdate(key, ex.id, 'targetSets', Math.max(1, parseInt(e.target.value) || 1))}
												className="w-12 text-center text-xs border border-slate-200 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-300)]"
											/>
											<label className="text-[10px] text-slate-500">{t('actions.reps')}</label>
											<input
												type="text"
												value={ex.targetReps ?? '10'}
												onChange={e => onUpdate(key, ex.id, 'targetReps', e.target.value)}
												className="w-16 text-center text-xs border border-slate-200 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-300)]"
											/>
										</div>
									</div>
									<button
										type="button"
										onClick={() => onDelete(key, ex.id)}
										className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
										title={t('actions.deleteExercise')}
									>
										<Trash2 size={13} />
									</button>
								</div>
							))}
						</div>
					);
				})}
			</div>
		</motion.div>
	);
}

export default function MyWorkoutsPage() {
	const t = useTranslations('MyWorkouts');
	const user = useUser();
	const USER_ID = user?.id;

	/* ── State ── */
	const [loading, setLoading] = useState(true);
	const [plan, setPlan] = useState(null);
	const [selectedDay, setSelectedDay] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY_SELECTED_DAY) || 'monday' : 'monday',
	);
	const [activeSection, setActiveSection] = useState('workout');
	const [workout, setWorkout] = useState(null);
	const [currentExId, setCurrentExId] = useState(undefined);
	const [activeMedia, setActiveMedia] = useState('image');
	const audioRef = useRef(null);
	const [alerting, setAlerting] = useState(false);
	const [audioOpen, setAudioOpen] = useState(false);
	const [hidden, setHidden] = useState(false);
	const [notesOpen, setNotesOpen] = useState(false);
	const [unsaved, setUnsaved] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [lastSyncStatus, setLastSyncStatus] = useState('');
	const [inputBuffer, setInputBuffer] = useState({});
	const [completedExercises, setCompletedExercises] = useState(new Set());
	const lastSavedRef = useRef(new Map());

	/* ── Edit mode ── */
	const [canEditWorkout, setCanEditWorkout] = useState(!!user?.canEditWorkout);
	const [editMode, setEditMode] = useState(false);
	const [editDayExercises, setEditDayExercises] = useState({ warmupExercises: [], exercises: [], cardioExercises: [] });
	const [addExModal, setAddExModal] = useState(null);
	const [savingPlan, setSavingPlan] = useState(false);

	useEffect(() => {
		if (selectedDay) localStorage.setItem(LOCAL_KEY_SELECTED_DAY, selectedDay);
	}, [selectedDay]);

	/* ── Media preload ── */
	const preloadMedia = useCallback(exercises => {
		exercises?.forEach(ex => { if (ex?.img) { const img = new Image(); img.src = ex.img; } });
	}, []);

	/* ── Record helpers ── */
	const applyRecordsToWorkout = useCallback((exerciseName, records) => {
		if (!records?.length) return;
		setWorkout(prev => {
			if (!prev) return prev;
			const bySet = {};
			records.forEach(r => { bySet[Number(r.setNumber) || 1] = r; });
			const next = {
				...prev, sets: prev.sets.map(s => {
					if (s.exName !== exerciseName) return s;
					const r = bySet[Number(s.set) || 1];
					if (!r) return s;
					return { ...s, weight: Number(r.weight) || 0, reps: Number(r.reps) || 0, done: !!r.done, serverId: r.id ?? s.serverId };
				})
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
				return { ...s, weight: Number(r.weight) || 0, reps: Number(r.reps) || 0, done: !!r.done, serverId: r.id ?? s.serverId };
			});
		});
		return next;
	}, []);

	function persistExerciseSnapshot(nextWorkout, exId, userId) {
		if (!nextWorkout || !exId || !userId) return;
		const ex = nextWorkout.exercises?.find(e => e.id === exId);
		if (!ex) return;
		const records = (nextWorkout.sets || []).filter(s => s.exId === exId).map(s => ({
			id: s.serverId, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, done: !!s.done, setNumber: Number(s.set) || 1,
		}));
		upsertQueueItem({ userId, date: todayISO(), exerciseName: ex.name, records });
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
				...prev, sets: prev.sets.map(s =>
					s.exName !== ex.name ? s : {
						...s,
						weight: Number(bySet[s.set]?.weight) || 0,
						reps: Number(bySet[s.set]?.reps) || 0,
						done: !!bySet[s.set]?.done,
					}
				)
			};
			lastSavedRef.current.clear();
			next.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	/* ── Completion ── */
	const isExerciseCompleted = useCallback(exId => {
		if (!workout?.sets) return false;
		const exSets = workout.sets.filter(s => s.exId === exId);
		return exSets.length > 0 && exSets.every(s => s.done);
	}, [workout]);

	const toggleExerciseCompletion = useCallback(exId => {
		const isCompleted = isExerciseCompleted(exId);
		setWorkout(prev => {
			if (!prev) return prev;
			const next = { ...prev, sets: prev.sets.map(s => s.exId === exId ? { ...s, done: !isCompleted } : s) };
			persistExerciseSnapshot(next, exId, USER_ID);
			setUnsaved(true);
			setCompletedExercises(p => { const n = new Set(p); if (!isCompleted) n.add(exId); else n.delete(exId); return n; });
			return next;
		});
	}, [isExerciseCompleted, USER_ID]);

	useEffect(() => {
		if (workout?.exercises) {
			const s = new Set();
			workout.exercises.forEach(ex => { if (isExerciseCompleted(ex.id)) s.add(ex.id); });
			setCompletedExercises(s);
		}
	}, [workout, isExerciseCompleted]);

	/* ── ensureSetsCount ── */
	const ensureSetsCountForExercise = useCallback((w, exId, desired, fallbackReps) => {
		if (!w || exId == null) return w;
		const exIdStr = String(exId);
		const d = Math.max(1, Math.min(20, Number(desired) || 1));
		const existing = (w.sets || []).filter(s => String(s.exId) === exIdStr);
		const ex = (w.exercises || []).find(e => String(e.id) === exIdStr);
		const keepBySetNumber = new Map();
		existing.sort((a, b) => Number(a.set) - Number(b.set)).forEach(s => {
			const sn = Number(s.set) || 1;
			if (!keepBySetNumber.has(sn)) keepBySetNumber.set(sn, s);
		});
		const kept = [...keepBySetNumber.values()].slice(0, d);
		let nextSets = (w.sets || []).filter(s => String(s.exId) !== exIdStr);
		nextSets.push(...kept);
		const base = kept[kept.length - 1] || { targetReps: fallbackReps || ex?.targetReps || '10', restTime: 90 };
		for (let i = kept.length + 1; i <= d; i++) {
			nextSets.push({
				id: `${exIdStr}-set${i}`, exId: exIdStr, exName: ex?.name || t('exerciseFallback'),
				set: i, targetReps: fallbackReps || ex?.targetReps || base.targetReps,
				weight: 0, reps: 0, effort: null, done: false, pr: false,
				restTime: Number.isFinite(ex?.rest ?? ex?.restSeconds) ? ex?.rest ?? ex?.restSeconds : base.restTime,
			});
		}
		return { ...w, sets: nextSets };
	}, [t]);

	/* ── Initial load ── */
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				setLoading(true);
				const [p, meRes] = await Promise.all([
					fetchActivePlan(USER_ID),
					api.get('/auth/me').catch(() => null),
				]);
				if (!mounted) return;
				setPlan(p);
				if (meRes?.data) {
					const freshUser = meRes.data;
					setCanEditWorkout(!!freshUser.canEditWorkout);
					try {
						const stored = JSON.parse(localStorage.getItem('user') || '{}');
						localStorage.setItem('user', JSON.stringify({ ...stored, canEditWorkout: !!freshUser.canEditWorkout }));
					} catch { }
				}
				const serverDays = (Array.isArray(p?.program?.days) ? p.program.days : []).map(d => ({ ...d, _key: String(d.dayOfWeek ?? '').toLowerCase() }));
				const byKey = Object.fromEntries(serverDays.map(d => [d._key, d]));
				const allKeys = serverDays.map(d => d._key);
				const savedDay = typeof window !== 'undefined' && localStorage.getItem(LOCAL_KEY_SELECTED_DAY);
				const initialDayId = savedDay || pickTodayId(allKeys.length ? allKeys : Object.keys(weeklyProgram));
				setSelectedDay(initialDayId);
				const dayProgramRaw = byKey[initialDayId] || weeklyProgram[initialDayId] || { id: initialDayId };
				const dayProgramNorm = normalizeDayProgram(dayProgramRaw);
				const initSection = pickInitialSection(dayProgramNorm);
				setActiveSection(initSection);
				let session = createSessionFromDay(dayProgramNorm);
				const firstInSection = (session.exercises || []).find(x => x.group === initSection) || session.exercises?.[0];
				setCurrentExId(firstInSection?.id);
				setWorkout(session);
				if (session?.exercises?.length) preloadMedia(session.exercises);
				lastSavedRef.current.clear();
				session?.sets?.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
				const dayISO = isoForThisWeeksDay(initialDayId);
				const { recordsByExercise } = await fetchLastDayByName(USER_ID, initialDayId, dayISO);
				if (!mounted) return;
				session = applyInitialRecordsWithDone(session, recordsByExercise);
				const firstEx = firstInSection;
				if (firstEx && USER_ID) {
					const queued = loadQueue().find(i => i.userId === USER_ID && i.exerciseName === firstEx.name && i.date === todayISO());
					if (queued) {
						const bySet = {};
						(queued.records || []).forEach(r => (bySet[Number(r.setNumber) || 1] = r));
						session = {
							...session, sets: session.sets.map(s =>
								s.exName !== firstEx.name ? s : {
									...s,
									weight: Number(bySet[s.set]?.weight) || 0,
									reps: Number(bySet[s.set]?.reps) || 0,
									done: !!bySet[s.set]?.done,
								}
							)
						};
						setUnsaved(true);
					}
				}
				setWorkout(session);
				lastSavedRef.current.clear();
				session.sets.forEach(s => lastSavedRef.current.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
				trySyncQueue(false);
			} catch (e) { console.error('Initial load error:', e); }
			finally { if (mounted) setLoading(false); }
		})();
		return () => { mounted = false; };
	}, [USER_ID, preloadMedia, applyInitialRecordsWithDone]); // eslint-disable-line

	/* ── unsaved badge ── */
	useEffect(() => {
		const exName = workout?.exercises?.find(e => e.id === currentExId)?.name;
		if (!exName || !USER_ID) { setUnsaved(false); return; }
		setUnsaved(loadQueue().some(i => i.userId === USER_ID && i.exerciseName === exName && i.date === todayISO()));
	}, [workout, currentExId, USER_ID]);

	/* ── Change day ── */
	const changeDay = useCallback(async dayId => {
		try {
			setSelectedDay(dayId);
			const byKey = Object.fromEntries((plan?.program?.days || []).map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
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
		} catch (e) { console.error(e); }
	}, [plan, preloadMedia, USER_ID, applyInitialRecordsWithDone, applyLocalQueuedSnapshotIfAny, t]);

	/* ── Set mutations ── */
	const addSetForCurrentExercise = useCallback(() => {
		setWorkout(w => {
			if (!w) return w;
			const exSets = w.sets.filter(s => s.exId === currentExId);
			const nextIndex = exSets.length + 1;
			const base = exSets[exSets.length - 1] || { targetReps: '10', restTime: 90 };
			const ex = w.exercises.find(e => e.id === currentExId);
			const newSet = {
				id: `${currentExId}-set${nextIndex}`, exId: currentExId, exName: ex?.name || t('exerciseFallback'),
				set: nextIndex, targetReps: ex?.targetReps ?? base.targetReps,
				weight: 0, reps: 0, effort: null, done: false, pr: false,
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
			setInputBuffer(prev => { const n = { ...prev }; delete n[`${lastSetId}:weight`]; delete n[`${lastSetId}:reps`]; return n; });
			persistExerciseSnapshot(next, currentExId, USER_ID);
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	const toggleDone = useCallback(setId => {
		setWorkout(w => {
			if (!w) return w;
			const next = { ...w, sets: w.sets.map(s => s.id === setId ? { ...s, done: !s.done } : s) };
			persistExerciseSnapshot(next, currentExId, USER_ID);
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	const bump = useCallback((setId, field, delta) => {
		setInputBuffer(prev => { const n = { ...prev }; delete n[`${setId}:${field}`]; return n; });
		setWorkout(w => {
			if (!w) return w;
			let next = { ...w, sets: w.sets.map(s => s.id === setId ? { ...s, [field]: Math.max(0, Number(s[field] || 0) + delta) } : s) };
			const u = next.sets.find(s => s.id === setId);
			if (u && Number(u.weight) > 0 && Number(u.reps) > 0)
				next = { ...next, sets: next.sets.map(s => s.id === setId ? { ...s, done: true } : s) };
			persistExerciseSnapshot(next, currentExId, USER_ID);
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	const setValue = useCallback((setId, field, value) => {
		const val = Number(value);
		setWorkout(w => {
			if (!w) return w;
			let next = { ...w, sets: w.sets.map(s => s.id === setId ? { ...s, [field]: Number.isFinite(val) ? val : 0 } : s) };
			const u = next.sets.find(s => s.id === setId);
			if (u && Number(u.weight) > 0 && Number(u.reps) > 0)
				next = { ...next, sets: next.sets.map(s => s.id === setId ? { ...s, done: true } : s) };
			persistExerciseSnapshot(next, currentExId, USER_ID);
			setUnsaved(true);
			return next;
		});
	}, [currentExId, USER_ID]);

	/* ── Sync ── */
	const trySyncQueue = useCallback(async (showStatus = true) => {
		const qStart = loadQueue();
		if (!qStart.length) {
			if (showStatus) { setLastSyncStatus('ok'); setTimeout(() => setLastSyncStatus(''), 1200); }
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
			} catch (e) { console.error('Sync failed for', item.exerciseName, e); anyError = true; }
		}
		setSyncing(false);
		if (showStatus) { setLastSyncStatus(anyError ? 'error' : 'ok'); setTimeout(() => setLastSyncStatus(''), 1500); }
		const still = loadQueue();
		const exName = workout?.exercises?.find(e => e.id === currentExId)?.name;
		setUnsaved(!!exName && still.some(i => i.userId === USER_ID && i.exerciseName === exName && i.date === todayISO()));
	}, [USER_ID, workout, currentExId, applyRecordsToWorkout]);

	useEffect(() => {
		const onFocus = () => trySyncQueue(false);
		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
	}, [trySyncQueue]);

	/* ── Edit plan helpers ── */
	const enterEditMode = useCallback(() => {
		const dayData = (plan?.program?.days || []).find(d => String(d.dayOfWeek ?? '').toLowerCase() === selectedDay) || {};
		setEditDayExercises({
			warmupExercises: [...(dayData.warmupExercises || [])],
			exercises: [...(dayData.exercises || [])],
			cardioExercises: [...(dayData.cardioExercises || [])],
		});
		setEditMode(true);
	}, [plan, selectedDay]);

	const exitEditMode = useCallback(() => {
		setEditMode(false);
		setEditDayExercises({ warmupExercises: [], exercises: [], cardioExercises: [] });
		setAddExModal(null);
	}, []);

	const savePlanChanges = useCallback(async () => {
		const planId = plan?.id;
		if (!planId) return;
		const dayData = (plan?.program?.days || []).find(d => String(d.dayOfWeek ?? '').toLowerCase() === selectedDay);
		setSavingPlan(true);
		try {
			const toRef = arr => arr.map(ex => ({ id: ex.id, targetSets: Number(ex.targetSets) || 3, targetReps: String(ex.targetReps || '10') }));
			await api.put(`/plans/${planId}`, {
				program: {
					days: [{
						dayOfWeek: selectedDay,
						name: dayData?.name || selectedDay,
						warmupExercises: toRef(editDayExercises.warmupExercises),
						exercises: toRef(editDayExercises.exercises),
						cardioExercises: toRef(editDayExercises.cardioExercises),
					}],
				},
			});
			const freshPlan = await fetchActivePlan(USER_ID);
			setPlan(freshPlan);
			exitEditMode();
			const byKey = Object.fromEntries((freshPlan?.program?.days || []).map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
			const dayProgramRaw = byKey[selectedDay] || weeklyProgram[selectedDay] || { exercises: [] };
			const dayProgramNorm = normalizeDayProgram(dayProgramRaw);
			const session = createSessionFromDay(dayProgramNorm);
			setWorkout(session);
			const firstEx = session.exercises?.[0];
			setCurrentExId(firstEx?.id != null ? String(firstEx.id) : undefined);
			Notification(t('editPlan.saved'), 'success');
		} catch (e) {
			Notification(e?.response?.data?.message || t('editPlan.saveFailed'), 'error');
		} finally {
			setSavingPlan(false);
		}
	}, [plan, selectedDay, editDayExercises, exitEditMode, USER_ID, t]);

	const deleteExerciseFromEdit = useCallback((section, exerciseId) => {
		setEditDayExercises(prev => ({ ...prev, [section]: prev[section].filter(ex => ex.id !== exerciseId) }));
	}, []);

	const updateExerciseInEdit = useCallback((section, exerciseId, field, value) => {
		setEditDayExercises(prev => ({
			...prev,
			[section]: prev[section].map(ex => ex.id === exerciseId ? { ...ex, [field]: value } : ex),
		}));
	}, []);

	const addExerciseToEdit = useCallback((section, exercise) => {
		setEditDayExercises(prev => ({
			...prev,
			[section]: [...prev[section], { id: exercise.id, name: exercise.name, targetSets: exercise.targetSets || 3, targetReps: exercise.targetReps || '10', img: exercise.img || null }],
		}));
		setAddExModal(null);
	}, []);

	/* ── Derived ── */
	const exercisesBySection = useMemo(() => (workout?.exercises || []).filter(ex => (ex.group || 'workout') === activeSection), [workout?.exercises, activeSection]);

	const currentExercise = useMemo(() => {
		const all = workout?.exercises || [];
		return all.find(e => e.id === currentExId) || exercisesBySection[0];
	}, [workout?.exercises, currentExId, exercisesBySection]);

	const isCardio = (currentExercise?.group || activeSection) === 'cardio';

	useEffect(() => {
		if (!exercisesBySection.length) return;
		if (!exercisesBySection.some(e => e.id === currentExId)) {
			setCurrentExId(exercisesBySection[0].id);
			setActiveMedia('image');
		}
	}, [activeSection, exercisesBySection, currentExId]);

	const currentSets = useMemo(() => (workout?.sets || []).filter(s => s.exId === currentExercise?.id), [workout?.sets, currentExercise?.id]);

	const exReps = useMemo(() => normalizeReps(currentExercise?.targetReps), [currentExercise?.targetReps]);
	const exTempo = useMemo(() => normalizeTempo(currentExercise?.tempo), [currentExercise?.tempo]);

	useEffect(() => {
		if (!currentExercise?.id) return;
		setWorkout(w => ensureSetsCountForExercise(w, currentExercise.id, currentExercise?.targetSets ?? 1, exReps || currentExercise?.targetReps));
	}, [currentExercise?.id]); // eslint-disable-line

	const dayTabs = useMemo(() => {
		const byKey = Object.fromEntries((plan?.program?.days || []).map(d => [String(d.dayOfWeek ?? '').toLowerCase(), d]));
		return WEEK_ORDER
			.filter(d => byKey[d] || weeklyProgram[d])
			.map(d => ({ key: d, label: t(`days.${d}`), name: byKey[d]?.name || weeklyProgram[d]?.name || t(`days.${d}`) }));
	}, [plan, t]);

	const sectionTabs = useMemo(() => {
		const all = workout?.exercises || [];
		const list = [];
		if (all.some(e => (e.group || 'workout') === 'warmup')) list.push({ key: 'warmup', label: t('sections.warmup') });
		if (all.some(e => (e.group || 'workout') === 'workout')) list.push({ key: 'workout', label: t('sections.workout') });
		if (all.some(e => (e.group || 'workout') === 'cardio')) list.push({ key: 'cardio', label: t('sections.cardio') });
		return list.length ? list : [{ key: 'workout', label: t('sections.workout') }];
	}, [workout?.exercises, t]);

	const completedCount = useMemo(() => exercisesBySection.filter(ex => completedExercises.has(ex.id)).length, [exercisesBySection, completedExercises]);
	const totalCount = exercisesBySection.length;

	/* ── Render ── */
	if (loading) return <LoadingSkeleton />;

	const hasExercises = !!workout?.exercises?.length;
	const durationLabel = (() => {
		const secs = Number(currentExercise?.durationSeconds ?? 0);
		if (secs >= 60) return `${Math.round(secs / 60)} min`;
		if (secs > 0) return `${Math.round(secs)} sec`;
		return null;
	})();

	return (
		<div className="   space-y-2  bg-slate-50">
			<audio ref={audioRef} src={DEFAULT_SOUNDS[2]} preload="auto" />
			<NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} title={plan?.name} notes={plan?.notes || []} t={t} />

			{/* Add exercise modal */}
			<AddExerciseModal
				open={!!addExModal}
				section={addExModal}
				onClose={() => setAddExModal(null)}
				onAdd={addExerciseToEdit}
				t={t}
			/>

			{/* ── HEADER ── */}
			<WorkoutHeader
				title={t('title')}
				subtitle={t('subtitle')}
				planName={plan?.name || null}
				dayTabs={dayTabs}
				selectedDay={selectedDay}
				onDayChange={changeDay}
				onAudioClick={() => { !hidden && setAudioOpen(v => !v); setHidden(false); }}
				onNotesClick={() => setNotesOpen(true)}
				t={t}
			/>

			{/* Edit plan button — only shown if user has permission and not already editing */}
			{canEditWorkout && !editMode && (
				<div className="flex justify-end px-1">
					<button
						type="button"
						onClick={enterEditMode}
						className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
						style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))' }}
					>
						<PencilLine size={15} />
						{t('actions.editPlan')}
					</button>
				</div>
			)}

			{/* Edit plan panel — shown when editing */}
			{editMode && (
				<EditPlanPanel
					editDayExercises={editDayExercises}
					onUpdate={updateExerciseInEdit}
					onDelete={deleteExerciseFromEdit}
					onAddClick={setAddExModal}
					onSave={savePlanChanges}
					onExit={exitEditMode}
					saving={savingPlan}
					t={t}
				/>
			)}

			{/* Audio hub */}
			<AudioHubInline
				t={t} hidden={hidden} setHidden={setHidden}
				alerting={alerting} setAlerting={setAlerting}
				open={audioOpen} onClose={() => setAudioOpen(false)}
				key="audio-hub"
			/>

			{/* ── MAIN CONTENT ── */}
			<div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:pt-6 lg:items-start">

				{/* ── LEFT / MAIN ── */}
				<div className="space-y-0 lg:space-y-4">
					{!hasExercises ? (
						<div className="flex flex-col items-center justify-center py-20 px-6 text-center">
							<div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)] flex items-center justify-center mb-4 shadow-sm">
								<Dumbbell size={28} className="text-[var(--color-primary-400)]" />
							</div>
							<h3 className="text-base font-bold text-slate-700">{t('noExercises')}</h3>
							<p className="text-sm text-slate-400 mt-1">{t('pickAnotherDay')}</p>
						</div>
					) : (
						<>
							{/* Section tabs */}
							{sectionTabs.length > 1 && (
								<div className=" pt-4 pb-0 lg:px-0 lg:pt-0">
									<SectionTabs tabs={sectionTabs} active={activeSection} onChange={setActiveSection} />
								</div>
							)}




							{/* Media card */}
							<div className="  pt-3 pb-1">
								<div className="rounded-lg border border-[var(--color-primary-100)] bg-white overflow-hidden shadow-sm">
									{/* Image / Video */}
									<div className="relative aspect-video bg-slate-50">
										{currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia] ? (
											<InlineVideo key={currentExercise.id + '-video'} src={currentExercise[activeMedia]} />
										) : (
											<Img
												showBlur={false}
												key={currentExercise?.id + '-image'}
												src={currentExercise?.img}
												alt={currentExercise?.name}
												className="w-full h-full object-contain"
												loading="lazy"
											/>
										)}

										{/* Exercise name overlay */}
										{currentExercise?.name && (
											<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-2">
												<h2 className="text-white font-bold text-sm md: leading-tight">{currentExercise.name}</h2>
											</div>
										)}

										{/* Media switcher */}
										<div className="absolute top-2 right-2">
											<div className="flex flex-col gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-white/60 shadow-sm">
												{[
													{ key: 'image', icon: ImageIcon, title: t('showImage'), disabled: !currentExercise?.img },
													{ key: 'video', icon: VideoIcon, title: t('showVideo'), disabled: !currentExercise?.video },
													...(currentExercise?.video2 ? [{ key: 'video2', icon: VideoIcon, title: t('showVideoAlt'), disabled: false }] : []),
												].map(m => (
													<button
														key={m.key}
														onClick={() => !m.disabled && setActiveMedia(m.key)}
														disabled={m.disabled}
														aria-pressed={activeMedia === m.key}
														className={cx(
															'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
															activeMedia === m.key ? 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100',
															m.disabled && 'opacity-30 cursor-not-allowed',
														)}
														title={m.title}
														aria-label={m.title}
													>
														<m.icon size={14} />
													</button>
												))}
											</div>
										</div>
									</div>

									{/* Exercise list (mobile horizontal scroll) */}
									<div className=" lg:hidden pt-3">
										<ExerciseList
											t={t} workout={workout} exercisesOverride={exercisesBySection}
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

									{/* Stats row */}
									<div className="p-3 flex gap-2">
										<StatChip
											icon={isCardio ? Clock : Repeat}
											label={isCardio ? t('notes.duration', { default: 'Duration' }) : t('notes.reps')}
											value={isCardio ? (durationLabel || '—') : (exReps || '—')}
											accent
										/>
										<StatChip
											icon={isCardio ? StickyNote : Timer}
											label={isCardio ? t('notes.note', { default: 'Note' }) : t('notes.tempo')}
											value={isCardio ? (String(currentExercise?.note ?? '').trim() || '—') : (exTempo || '—')}
										/>
									</div>

									{/* Note (non-cardio) */}
									{!isCardio && String(currentExercise?.note ?? '').trim() && (
										<div className="px-3 pb-3">
											<div className="rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] px-3 py-2.5 text-xs text-slate-600">
												<span className="font-semibold text-[var(--color-primary-700)]">{t('notes.note', { default: 'Note' })}:</span>
												{String(currentExercise.note).trim()}
											</div>
										</div>
									)}
								</div>
							</div>



							{/* Rest timer / Cardio timer */}
							<div className=" ">
								{isCardio ? (
									<CardioTimerCard durationSeconds={currentExercise?.durationSeconds} note={currentExercise?.note} />
								) : (
									<RestTimerCard
										alerting={alerting} setAlerting={setAlerting}
										initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise.rest : 90}
										audioEl={audioRef}
										className="mt-3"
									/>
								)}
							</div>

							{/* Sets table */}
							{!isCardio && (
								<div className=" pb-6 lg:pb-0">
									<SetsTable
										currentSets={currentSets}
										currentExercise={currentExercise}
										workout={workout}
										t={t}
										currentExId={currentExId}
										USER_ID={USER_ID}
										inputBuffer={inputBuffer}
										setInputBuffer={setInputBuffer}
										bump={bump}
										toggleDone={toggleDone}
										setValue={setValue}
										addSet={addSetForCurrentExercise}
										removeSet={removeSetFromCurrentExercise}
										trySyncQueue={trySyncQueue}
										syncing={syncing}
										unsaved={unsaved}
										lastSyncStatus={lastSyncStatus}
									/>
								</div>
							)}
						</>
					)}
				</div>

				{/* ── RIGHT SIDEBAR (desktop only) ── */}
				<div className="hidden lg:block">
					<div className="rounded-lg border border-[var(--color-primary-100)] bg-white p-4 shadow-sm sticky top-6">
						{sectionTabs.length > 1 && (
							<div className="mb-4">
								<SectionTabs tabs={sectionTabs} active={activeSection} onChange={setActiveSection} />
							</div>
						)}
						<ExerciseList
							t={t} workout={workout} exercisesOverride={exercisesBySection}
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
			</div>
		</div>
	);
}




export function TabsPill({
	tabs = [],
	active,
	onChange,
	id = 'ui-tabs-pill',
	sliceInPhone = true,
	hiddenArrow = false,
	isLoading = false,
	skeletonCount = 5,
	outerCn = '',
	className = '',
}) {
	const scrollerRef = useRef(null);
	const tabRefs = useRef({});

	const activeIndex = useMemo(
		() => Math.max(0, tabs.findIndex(t => t.key === active)),
		[tabs, active],
	);

	const hasPrev = !isLoading && activeIndex > 0;
	const hasNext = !isLoading && activeIndex < tabs.length - 1;

	const goPrev = () => hasPrev && onChange(tabs[activeIndex - 1]?.key);
	const goNext = () => hasNext && onChange(tabs[activeIndex + 1]?.key);



	/* Keyboard nav */
	useEffect(() => {
		const el = scrollerRef.current;
		if (!el) return;
		const onKey = e => {
			if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
			if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
		};
		el.addEventListener('keydown', onKey);
		return () => el.removeEventListener('keydown', onKey);
	}, [activeIndex, tabs]); // eslint-disable-line

	/* Arrow button — desktop only */
	const ArrowBtn = ({ label, onClick, disabled, Icon }) => (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			disabled={disabled}
			className={cx(
				'max-md:hidden shrink-0 inline-flex items-center justify-center',
				'w-8 h-8 rounded-lg border transition-all duration-150',
				'bg-white/10 border-white/20 text-white',
				'hover:bg-white/20 hover:border-white/40',
				'disabled:opacity-30 disabled:cursor-not-allowed',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
				'active:scale-90',
			)}
		>
			<Icon className="w-4 h-4 rtl:scale-x-[-1]" />
		</button>
	);

	return (
		<div className={cx('w-full overflow-x-auto overflow-y-hidden scrollbar-hide', outerCn)}>
			<div className="w-fit flex items-center gap-2">
				{!hiddenArrow && (
					<ArrowBtn label="Previous tab" onClick={goPrev} disabled={!hasPrev} Icon={ChevronLeft} />
				)}

				{/* Scrollable pill strip */}
				<div
					ref={scrollerRef}
					tabIndex={0}
					className="outline-none"
				>
					<LayoutGroup id={id}>
						<div
							className={cx(
								'inline-flex p-1 rounded-lg',
 								'bg-white/10 border border-white/20 backdrop-blur-sm',
								isLoading ? 'gap-1.5' : 'gap-1',
								className,
							)}
						>
							{isLoading
								? /* ── Skeleton ── */
								Array.from({ length: skeletonCount }).map((_, i) => {
									const widths = [56, 72, 60, 80, 64, 76, 68];
									return (
										<div
											key={`skel-${i}`}
											aria-hidden
											className="h-8 rounded-lg bg-white/20 animate-pulse"
											style={{ width: widths[i % widths.length] }}
										/>
									);
								})
								: /* ── Tabs ── */
								tabs.map(tab => {
									const isActive = active === tab.key;
									return (
										<motion.button
											key={tab.key}
											type="button"
											ref={el => (tabRefs.current[tab.key] = el)}
											onClick={() => onChange(tab.key)}
											className={cx(
												'relative select-none rounded-lg max-md:px-2 px-3 py-1.5 outline-none',
												'focus-visible:ring-2 focus-visible:ring-white/50',
												'transition-colors duration-150',
												isActive ? 'text-[var(--color-primary-700)]' : 'text-white/80 hover:text-white',
											)}
											whileHover={{ y: -1 }}
											whileTap={{ scale: 0.96 }}
											transition={{ type: 'spring', stiffness: 400, damping: 30 }}
										>
											{/* Sliding active background */}
											{isActive && (
												<motion.span
													layoutId="tabs-pill-bg"
													className={cx(
														'absolute inset-0 rounded-lg',
														'bg-white shadow-md',
													)}
													transition={{ type: 'spring', stiffness: 380, damping: 32 }}
												/>
											)}

											{/* Label */}
											<span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
												{tab.icon && (
													<tab.icon className="hidden md:inline w-3.5 h-3.5 shrink-0" />
												)}
												{/* Mobile: 3-char slice (only if sliceInPhone) */}
												{sliceInPhone && (
													<span className="md:hidden text-xs font-bold uppercase tracking-wide">
														{tab.label?.slice(0, 3)}
													</span>
												)}
												{/* Full label */}
												<span
													className={cx(
														'text-xs max-md:text-[10px] font-bold uppercase tracking-wide',
														sliceInPhone ? 'hidden md:inline' : 'inline',
													)}
												>
													{tab.label}
												</span>
											</span>
										</motion.button>
									);
								})
							}
						</div>
					</LayoutGroup>
				</div>

				{!hiddenArrow && (
					<ArrowBtn label="Next tab" onClick={goNext} disabled={!hasNext} Icon={ChevronRight} />
				)}
			</div>
		</div>
	);
}


export function HeaderActions({ onAudioClick, onNotesClick, listenLabel, notesLabel }) {
	return (
		<div className="flex items-center gap-2 shrink-0">
			{/* Audio / Listen */}
			<button
				type="button"
				onClick={onAudioClick}
				title={listenLabel}
				aria-label={listenLabel}
				className={cx(
					'inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10',
					'h-9 px-3',
					'text-white text-xs font-semibold',
					'transition-all duration-150 hover:bg-white/20 hover:border-white/40',
					'active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
				)}
			>
				<Headphones size={15} className="shrink-0" />
				<span className="hidden md:inline">{listenLabel}</span>
			</button>

			{/* Notes */}
			<button
				type="button"
				onClick={onNotesClick}
				title={notesLabel}
				aria-label={notesLabel}
				className={cx(
					'inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10',
					'h-9 px-3',
					'text-white text-xs font-semibold',
					'transition-all duration-150 hover:bg-white/20 hover:border-white/40',
					'active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
				)}
			>
				<StickyNote size={15} className="shrink-0" />
				<span className="hidden md:inline">{notesLabel}</span>
			</button>
		</div>
	);
}


export function WorkoutHeader({
	title,
	subtitle,
	planName,
	dayTabs = [],
	selectedDay,
	onDayChange,
	onAudioClick,
	onNotesClick,
	t,
}) {
	return (
		<div className="relative overflow-hidden rounded-lg">
			{/* ── Gradient background layer ── */}
			<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]" />

			{/* ── Subtle dot-grid texture ── */}
			<div
				className="absolute inset-0 opacity-[0.07]"
				style={{
					/* Pure CSS radial-dot grid — no inline background color, just a pattern */
					backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
					backgroundSize: '18px 18px',
				}}
			/>

			{/* ── Ambient glow orbs ── */}
			<div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
			<div className="absolute -bottom-8 -right-6 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />

			{/* ── Content ── */}
			<div className="relative z-10">
				{/* Top row: title + actions */}
				<div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
					<div className="min-w-0">
						<h1 className="text-xl md:text-3xl font-black text-white md: leading-tight truncate">
							{title}
						</h1>
						{/* Subtitle — desktop only */}
						{subtitle && (
							<p className="hidden md:block text-sm text-white/70 mt-0.5 truncate">
								{subtitle}
							</p>
						)}

					</div>

					{/* Actions — always visible, responsive labels */}
					<HeaderActions
						onAudioClick={onAudioClick}
						onNotesClick={onNotesClick}
						listenLabel={t('listen')}
						notesLabel={t('notes.show')}
					/>
				</div>

				{/* Bottom row: day tabs */}
				<div className="px-3 pb-3 pt-1">
					<TabsPill
						id="day-tabs"
						tabs={dayTabs}
						active={selectedDay}
						onChange={onDayChange}
						sliceInPhone={false}
						hiddenArrow={false}
					/>
				</div>
			</div>
		</div>
	);
}