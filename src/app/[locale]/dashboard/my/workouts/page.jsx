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
	Play,
	Pause,
	RotateCcw,
	Headphones,
	StickyNote,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	PencilLine,
	Save,
	Trash2,
	Search,
	Info,
	Youtube,
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
function dayKeyOf(day) {
	return String(day?.dayOfWeek ?? day?.id ?? '').toLowerCase();
}

/** Local sample program. `weeklyProgram` is `{ name, program: { days } }`, not a day map. */
function fallbackPlan() {
	const days = (Array.isArray(weeklyProgram?.program?.days) ? weeklyProgram.program.days : [])
		.map(d => ({ ...d, dayOfWeek: dayKeyOf(d), id: dayKeyOf(d) || d.id }))
		.filter(d => d.dayOfWeek);
	return {
		name: weeklyProgram?.name || 'Workout',
		isActive: true,
		program: { days },
		notes: [],
	};
}

function trainingKeysFor(days) {
	const list = Array.isArray(days) ? days : [];
	const byKey = Object.fromEntries(list.map(d => [dayKeyOf(d), d]).filter(([k]) => k));
	const withWork = key => {
		const dp = byKey[key];
		if (!dp) return false;
		return (normalizeDayProgram(dp).allExercises || []).length > 0;
	};
	const fromWeek = WEEK_ORDER.filter(withWork);
	if (fromWeek.length) return fromWeek;
	const extras = list.map(dayKeyOf).filter(k => k && !WEEK_ORDER.includes(k) && withWork(k));
	if (extras.length) return extras;
	const any = WEEK_ORDER.filter(d => byKey[d]);
	return any.length ? any : [...WEEK_ORDER];
}

async function fetchActivePlan(userId) {
	try {
		const { data } = await api.get('/plans/active', { params: { userId } });
		if (data?.status === 'none' || data?.error) return fallbackPlan();
		if (data?.program?.days?.length) return data;
		return fallbackPlan();
	} catch {
		return fallbackPlan();
	}
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
		const dayProgramRaw = plan?.program?.days?.find(d => dayKeyOf(d) === day.toLowerCase()) || { exercises: [] };
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

 
function SectionTabs({ tabs, active, onChange, tone = 'soft' }) {
	if (!tabs || tabs.length <= 1) return null;
	const onPrimary = tone === 'onPrimary';
	return (
		<div className={cx('flex gap-1', onPrimary ? '' : 'rounded-full border border-border bg-muted p-1')}>
			{tabs.map(tab => {
				const isActive = tab.key === active;
				return (
					<button
						key={tab.key}
						type="button"
						onClick={() => onChange(tab.key)}
						className={cx(
							'h-[30px] min-w-12 flex-1 rounded-2xl px-4 text-[11px] font-bold tracking-wide transition active:scale-95',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
							onPrimary
								? (isActive
									? 'border border-white/90 bg-white text-[var(--color-primary-700)] shadow-[2px_4px_7px_rgba(15,34,128,0.4)]'
									: 'border border-white/30 bg-white/10 text-white/65 hover:bg-white/20')
								: (isActive ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'),
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
	 EXERCISE RAIL
	 Same navigation idea as the app: a filmstrip of exercise
	 tiles under the current exercise. Previous / next sit beside
	 the strip on wider screens so a mouse can move without dragging.
───────────────────────────────────────── */
function ExerciseNote({ note }) {
	const [open, setOpen] = useState(false);
	const text = String(note ?? '').trim();
	if (!text) return null;
	const long = text.length > 110;
	const body = (
		<>
			<span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-2xl bg-[#fef3c7] text-[#d97706]">
				<Info size={12} strokeWidth={2} />
			</span>
			<span className={cx('min-w-0 flex-1 text-xs font-medium leading-[18px]', !open && long && 'line-clamp-2')}>{text}</span>
			{long && (
				<ChevronDown size={14} className={cx('mt-0.5 shrink-0 text-[#d97706] transition-transform', open && 'rotate-180')} />
			)}
		</>
	);
	const frame = 'flex w-full items-start gap-2 rounded-2xl border border-white/85 border-b-[#fde68a] border-e-[#fde68a] bg-[#fffbeb] px-3.5 py-3.5 text-start text-[#92400e] shadow-[4px_5px_12px_rgba(100,116,139,0.35)]';
	if (!long) return <div className={frame}>{body}</div>;
	return (
		<button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className={frame}>
			{body}
		</button>
	);
}

export function ExerciseList({ workout, exercisesOverride, currentExId, onPick, t, completedExercises, toggleExerciseCompletion }) {
	const scrollerRef = useRef(null);
	const itemRefs = useRef({});
	const exercises = Array.isArray(exercisesOverride) ? exercisesOverride : Array.isArray(workout?.exercises) ? workout.exercises : [];
	const sets = Array.isArray(workout?.sets) ? workout.sets : [];
	const setsFor = exId => sets.filter(s => s?.exId === exId);
	const activeIndex = Math.max(0, exercises.findIndex(ex => ex?.id === currentExId));

	useEffect(() => {
		const node = itemRefs.current[currentExId];
		if (!node) return;
		node.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
	}, [currentExId, exercises.length]);

	if (!workout || exercises.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-center">
				<div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-400)]">
					<Dumbbell size={20} />
				</div>
				<p className="text-sm font-medium text-muted-foreground">{t('noExercises')}</p>
			</div>
		);
	}

	const go = step => {
		const next = exercises[activeIndex + step];
		if (next) onPick?.(next);
	};

	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				onClick={() => go(-1)}
				disabled={activeIndex <= 0}
				aria-label={t('pagination.prev')}
				className="hidden"
			>
				<ChevronLeft size={16} className="rtl:scale-x-[-1]" />
			</button>
			<div
				ref={scrollerRef}
				className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 pb-4 pt-3 scrollbar-hide"
			>
				{exercises.map((ex, idx) => {
					const exId = ex?.id ?? `idx-${idx}`;
					const list = setsFor(exId);
					const done = list.filter(s => s?.done).length;
					const total = list.length;
					const isActive = currentExId === exId;
					const isCompleted = !!completedExercises?.has?.(exId);
					const badge = total > 0 ? (isCompleted ? String(total) : done > 0 ? `${done}/${total}` : String(total)) : '';
					return (
						<div key={exId} ref={el => { itemRefs.current[exId] = el; }} className={cx('relative shrink-0 pt-2', isActive && 'z-[1] scale-[1.04]', !isActive && !isCompleted && 'opacity-90')}>
							<button
								type="button"
								onClick={() => onPick?.(ex)}
								aria-current={isActive ? 'true' : undefined}
								aria-label={ex?.name || t('exerciseFallback')}
								className="relative grid h-[58px] w-[58px] place-items-center rounded-2xl transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]"
							>
								<span className={cx(
									'absolute inset-0 overflow-hidden rounded-[14px] border-[1.4px] bg-[#eef2f9] shadow-[3px_4px_7px_rgba(100,116,139,0.38)]',
									isActive && 'border-t-white/70 border-s-white/50 border-b-[rgba(37,99,235,0.38)] border-e-[rgba(37,99,235,0.28)] shadow-[3px_5px_10px_rgba(37,99,235,0.42)]',
									isCompleted && !isActive && 'border-t-white/70 border-s-white/50 border-b-emerald-600/40 border-e-emerald-600/30 shadow-[3px_4px_9px_rgba(5,150,105,0.38)]',
									!isActive && !isCompleted && 'border-t-white/95 border-s-white/90 border-b-[rgba(100,116,139,0.2)] border-e-[rgba(100,116,139,0.15)]',
								)}>
									{ex?.img ? (
										<>
											<Img src={ex.img} alt="" className="absolute -inset-1 h-[66px] w-[66px] object-cover opacity-40 blur-[2px]" showBlur={false} />
											<span className={cx('absolute inset-0', isActive ? 'bg-[rgba(15,48,120,0.08)]' : isCompleted ? 'bg-[rgba(5,150,105,0.12)]' : 'bg-[rgba(100,116,139,0.1)]')} />
											<Img src={ex.img} alt="" className={cx('relative h-full w-full object-contain', isActive ? 'opacity-100' : 'opacity-80')} showBlur={false} />
										</>
									) : (
										<span className="grid h-full w-full place-items-center"><Dumbbell size={22} className={isActive ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-primary-300)]'} /></span>
									)}
									{isCompleted && (
										<span className="absolute inset-0 grid place-items-center bg-emerald-500/55">
											<span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-t-white/50 border-b-emerald-900/40 bg-emerald-600 text-white shadow-[1px_2px_4px_rgba(6,95,70,0.35)]">
												<Check size={11} strokeWidth={3} />
											</span>
										</span>
									)}
								</span>
								{badge && (
									<span className={cx(
										'absolute -top-1.5 end-[-6px] z-10 grid h-5 min-w-5 place-items-center rounded-full border border-white/40 px-1 text-[9px] font-bold leading-none text-white shadow-[1px_2px_4px_rgba(15,48,120,0.3)]',
										isCompleted ? 'bg-emerald-600' : isActive ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-primary-400)]',
									)}>
										{badge}
									</span>
								)}
							</button>
							{toggleExerciseCompletion && (isActive || isCompleted) && (
								<button
									type="button"
									aria-pressed={isCompleted}
									aria-label={t('table.done')}
									title={t('table.done')}
									onClick={() => toggleExerciseCompletion(exId)}
									className={cx(
										'absolute -bottom-1 start-[-4px] z-10 grid h-5 w-5 place-items-center rounded-full border shadow',
										isCompleted ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-border bg-card text-muted-foreground',
									)}
								>
									<Check size={10} strokeWidth={3} />
								</button>
							)}
						</div>
					);
				})}
			</div>
			<button
				type="button"
				onClick={() => go(1)}
				disabled={activeIndex >= exercises.length - 1}
				aria-label={t('pagination.next')}
				className="hidden"
			>
				<ChevronRight size={16} className="rtl:scale-x-[-1]" />
			</button>
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

	const weightUnit = t('table.kg');
	const repSingular = t('table.repUnit');
	const repPlural = t('table.repUnitPlural');
	const repUnitFor = raw => {
		const n = Number(raw);
		if (!Number.isFinite(n) || n === 1) return repSingular;
		return repPlural;
	};

	return (
		<div className="rounded-[26px] border border-white/85 bg-[#eef2f9] p-5 text-[#0f172a] shadow-[5px_6px_16px_rgba(100,116,139,0.4)]">
			<div className="mb-3 grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-2.5 px-1 text-[11.5px] font-bold text-[#64748b]">
				<span className="text-center">{t('table.set')}</span>
				<span className="text-center">{t('table.weight')}</span>
				<span className="text-center">{t('table.reps')}</span>
				<span className="text-center">{t('table.done')}</span>
			</div>

			<div className="space-y-3.5">
				{currentSets.map(s => (
					<div
						key={s.id}
						className={cx(
							'grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-2.5 rounded-2xl border p-2.5',
							s.done
								? 'border-b-white/90 border-e-white/85 border-t-[rgba(100,116,139,0.25)] border-s-[rgba(100,116,139,0.2)] bg-[var(--color-primary-100)]'
								: 'border-[rgba(100,116,139,0.18)] bg-[#eef2f9]',
						)}
					>
						<span className={cx(
							'grid h-[26px] w-[26px] place-items-center rounded-full border-[1.2px] text-[11.5px] font-extrabold tabular-nums shadow-[3px_3px_5px_rgba(100,116,139,0.4)]',
							s.done
								? 'border-transparent bg-[var(--color-primary-500)] text-white'
								: 'border-t-white/95 border-b-[rgba(100,116,139,0.2)] bg-[#eef2f9] text-[#64748b]',
						)}>
							{s.set}
						</span>
						<SetInput
							value={getBuffered(s.id, 'weight', s.weight)}
							onChange={raw => handleChange(s.id, 'weight', raw)}
							onBlur={() => handleBlur(s.id, 'weight')}
							onMinus={() => bump(s.id, 'weight', -1)}
							onPlus={() => bump(s.id, 'weight', +1)}
							placeholder="0"
							inputMode="decimal"
							aria={t('table.weight')}
							unit={weightUnit}
						/>
						<SetInput
							value={getBuffered(s.id, 'reps', s.reps)}
							onChange={raw => handleChange(s.id, 'reps', raw)}
							onBlur={() => handleBlur(s.id, 'reps')}
							onMinus={() => bump(s.id, 'reps', -1)}
							onPlus={() => bump(s.id, 'reps', +1)}
							placeholder="0"
							inputMode="numeric"
							aria={t('table.reps')}
							unit={repUnitFor(getBuffered(s.id, 'reps', s.reps))}
						/>
						<button
							type="button"
							role="checkbox"
							aria-checked={s.done}
							onClick={() => toggleDone(s.id)}
							aria-label={t('table.done')}
							className={cx(
								'grid h-[26px] w-[26px] place-items-center rounded-[9px] border-[1.2px] transition active:scale-90',
								s.done
									? 'border-transparent bg-[var(--color-primary-500)] text-white shadow-[3px_3px_5px_rgba(37,99,235,0.5)]'
									: 'border-t-white/95 border-b-[rgba(100,116,139,0.2)] bg-[#eef2f9] text-transparent shadow-[3px_3px_5px_rgba(100,116,139,0.4)]',
							)}
						>
							<Check size={13} strokeWidth={3} className={s.done ? 'text-white' : 'text-transparent'} />
						</button>
					</div>
				))}
			</div>

			<div className="mt-4 flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={addSet}
					className="inline-flex items-center gap-2.5 rounded-full py-1 text-[12.5px] font-bold text-[var(--color-primary-500)] transition active:scale-[0.98]"
				>
					<span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-t-white/40 bg-[var(--color-primary-500)] text-white shadow-[4px_4px_7px_rgba(37,99,235,0.45)]">
						<Plus size={16} strokeWidth={2.6} />
					</span>
					{t('actions.addSet')}
				</button>

				<div className="flex items-center gap-2">
					{lastSyncStatus === 'ok' && (
						<span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
							<Cloud size={11} /> {t('sync.synced')}
						</span>
					)}
					{lastSyncStatus === 'error' && (
						<span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
							<CloudOff size={11} /> {t('sync.someFailed')}
						</span>
					)}
					<TooltipProvider delayDuration={200}>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={removeSet}
									disabled={currentSets.length <= 1}
									aria-label={t('actions.removeSet')}
									className="grid h-[34px] w-[34px] place-items-center rounded-full border-[1.2px] border-t-white/95 border-b-[rgba(100,116,139,0.2)] bg-[#eef2f9] text-[#64748b] shadow-[4px_4px_7px_rgba(100,116,139,0.42)] transition active:scale-95 disabled:opacity-40"
								>
									<Minus size={14} strokeWidth={2.4} />
								</button>
							</TooltipTrigger>
							<TooltipContent><p>{t('actions.removeSet')}</p></TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => trySyncQueue(true)}
									disabled={syncing}
									aria-label={syncing ? t('sync.syncing') : unsaved ? t('sync.syncNow') : t('sync.synced')}
									className="grid h-[34px] w-[34px] place-items-center rounded-full border-[1.2px] border-t-white/95 border-b-[rgba(100,116,139,0.2)] bg-[#eef2f9] shadow-[4px_4px_7px_rgba(100,116,139,0.42)] transition active:scale-95 disabled:opacity-60"
								>
									{syncing ? (
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary-300)] border-t-transparent" />
									) : unsaved ? (
										<CloudOff size={15} className="text-amber-500" />
									) : (
										<Cloud size={15} className="text-muted-foreground" />
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{syncing ? t('sync.syncing') : unsaved ? t('sync.syncNow') : t('sync.synced')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		</div>
	);
}

function SetInput({ value, onChange, onBlur, onMinus, onPlus, placeholder, inputMode, aria, unit }) {
	return (
		<div className="flex min-w-0 items-center gap-1 rounded-full border-[1.2px] border-t-white/95 border-b-[rgba(100,116,139,0.2)] bg-[#eef2f9] px-1.5 py-[5px] shadow-[3px_3px_6px_rgba(100,116,139,0.28)]">
			<button
				type="button"
				onClick={onMinus}
				tabIndex={-1}
				aria-label={aria}
				className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.2px] border-t-white/95 border-b-[rgba(100,116,139,0.2)] bg-[#eef2f9] text-[#64748b] shadow-[3px_3px_5px_rgba(100,116,139,0.4)] transition active:scale-90"
			>
				<Minus size={13} strokeWidth={2.6} />
			</button>
			<div className="min-w-0 flex-1">
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
					className="h-[18px] w-full bg-transparent text-center text-[14.5px] font-extrabold tabular-nums text-[#0f172a] outline-none"
				/>
				{unit ? <p className="-mt-px text-center text-[9px] font-bold leading-none text-[#64748b]">{unit}</p> : null}
			</div>
			<button
				type="button"
				onClick={onPlus}
				tabIndex={-1}
				aria-label={aria}
				className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.2px] border-t-white/35 border-b-[rgba(15,48,120,0.35)] bg-[var(--color-primary-500)] text-white shadow-[3px_3px_5px_rgba(37,99,235,0.5)] transition active:scale-90"
			>
				<Plus size={13} strokeWidth={2.6} />
			</button>
		</div>
	);
}

/* ─────────────────────────────────────────
	 LOADING SKELETON
───────────────────────────────────────── */
function LoadingSkeleton() {
	return (
		<div data-plain-page="1" className="report-phone mx-auto w-full max-w-[440px] animate-pulse space-y-3 bg-white pt-1 dark:bg-[#0b1220]">
			<div
				className="rounded-3xl p-4"
				style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), var(--color-gradient-via))' }}
			>
				<div className="flex items-center gap-3">
					<div className="h-11 w-11 rounded-2xl bg-white/20" />
					<div className="min-w-0 flex-1 space-y-2">
						<div className="h-4 w-36 rounded-full bg-white/80" />
						<div className="h-2.5 w-48 rounded-full bg-white/35" />
					</div>
					<div className="h-11 w-11 rounded-2xl bg-white/15" />
					<div className="h-11 w-11 rounded-2xl bg-white/15" />
				</div>
				<div className="mx-0 my-3 h-px bg-white/20" />
				<div className="flex gap-2">
					{[1, 2, 3, 4].map(i => (
						<div key={i} className="h-[58px] min-w-14 flex-1 rounded-2xl bg-white/15" />
					))}
				</div>
			</div>
			<div className="overflow-hidden rounded-3xl bg-white/70">
				<div className="h-[210px] bg-[var(--color-primary-100)]" />
				<div className="flex gap-2 px-3 py-4">
					{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[58px] w-[58px] shrink-0 rounded-2xl bg-[var(--color-primary-50)]" />)}
				</div>
			</div>
			<div className="h-14 rounded-2xl bg-white/70" />
			<div className="h-56 rounded-[26px] bg-white/70" />
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
				const serverDays = Array.isArray(p?.program?.days) ? p.program.days : [];
				const byKey = Object.fromEntries(serverDays.map(d => [dayKeyOf(d), d]).filter(([k]) => k));
				const dayPool = trainingKeysFor(serverDays);
				const savedDay = typeof window !== 'undefined' && localStorage.getItem(LOCAL_KEY_SELECTED_DAY);
				const initialDayId = (savedDay && dayPool.includes(savedDay) ? savedDay : null) || pickTodayId(dayPool);
				setSelectedDay(initialDayId);
				const dayProgramRaw = byKey[initialDayId] || { id: initialDayId };
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
			const byKey = Object.fromEntries((plan?.program?.days || []).map(d => [dayKeyOf(d), d]).filter(([k]) => k));
			const dayProgramRaw = byKey[dayId] || { id: dayId, name: t('workout') };
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
			const byKey = Object.fromEntries((freshPlan?.program?.days || []).map(d => [dayKeyOf(d), d]).filter(([k]) => k));
			const dayProgramRaw = byKey[selectedDay] || { exercises: [] };
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
		const days = plan?.program?.days || [];
		const byKey = Object.fromEntries(days.map(d => [dayKeyOf(d), d]).filter(([k]) => k));
		const keys = trainingKeysFor(days);
		const dayIdToJs = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
		const today = new Date();
		const todayJs = today.getDay();
		return keys.map(d => {
			const dateObj = new Date(today);
			const targetJs = dayIdToJs[d];
			if (targetJs != null) dateObj.setDate(today.getDate() + (targetJs - todayJs));
			return {
				key: d,
				label: WEEK_ORDER.includes(d) ? t(`days.${d}`) : (byKey[d]?.name || d),
				date: targetJs == null ? null : dateObj.getDate(),
				name: byKey[d]?.name || t(`days.${d}`),
			};
		});
	}, [plan, t]);

	const fiveDayTabs = useMemo(() => {
		if (!dayTabs.length) return dayTabs;
		const idx = dayTabs.findIndex(tb => tb.key === selectedDay);
		const clampedIdx = idx < 0 ? 0 : idx;
		const start = Math.max(0, Math.min(clampedIdx - 2, dayTabs.length - 5));
		return dayTabs.slice(start, start + 5);
	}, [dayTabs, selectedDay]);

	const sectionTabs = useMemo(() => {
		const all = workout?.exercises || [];
		const list = [];
		if (all.some(e => (e.group || 'workout') === 'warmup')) list.push({ key: 'warmup', label: t('sections.warmup') });
		if (all.some(e => (e.group || 'workout') === 'workout')) list.push({ key: 'workout', label: t('sections.workout') });
		if (all.some(e => (e.group || 'workout') === 'cardio')) list.push({ key: 'cardio', label: t('sections.cardio') });
		return list.length ? list : [{ key: 'workout', label: t('sections.workout') }];
	}, [workout?.exercises, t]);

	const pickExercise = (ex) => {
		if (!ex) return;
		setCurrentExId(ex.id);
		setActiveMedia('image');
		setWorkout(w => ensureSetsCountForExercise(w, ex.id, ex?.targetSets ?? 1, normalizeReps(ex?.targetReps) || ex?.targetReps));
		applyLocalQueuedSnapshotIfAny();
	};

	const changeSection = (sect) => {
		setActiveSection(sect);
		const first = (workout?.exercises || []).find(e => (e.group || 'workout') === sect);
		if (first) pickExercise(first);
	};

	const isVideo = !!(currentExercise && (activeMedia === 'video' || activeMedia === 'video2') && currentExercise[activeMedia]);
	const mediaOptions = [
		currentExercise?.img ? { key: 'image', icon: ImageIcon, title: t('showImage') } : null,
		currentExercise?.video ? { key: 'video', icon: /youtu(\.be|be\.com)/i.test(String(currentExercise.video)) ? Youtube : VideoIcon, title: t('showVideo') } : null,
		currentExercise?.video2 ? { key: 'video2', icon: VideoIcon, title: t('showVideoAlt') } : null,
	].filter(Boolean);

	/* ── Render ── */
	if (loading) return <LoadingSkeleton />;

	const hasExercises = !!workout?.exercises?.length;
	const durationLabel = (() => {
		const secs = Number(currentExercise?.durationSeconds ?? 0);
		if (secs >= 60) return `${Math.round(secs / 60)}m`;
		if (secs > 0) return `${Math.round(secs)}s`;
		return null;
	})();

	return (
		<div data-plain-page="1" className="report-phone mx-auto w-full max-w-[440px] space-y-3 bg-white pt-1 dark:bg-[#0b1220]">
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
				dayTabs={fiveDayTabs}
				selectedDay={selectedDay}
				onDayChange={changeDay}
				onAudioClick={() => { !hidden && setAudioOpen(v => !v); setHidden(false); }}
				onNotesClick={() => setNotesOpen(true)}
				sectionTabs={sectionTabs}
				activeSection={activeSection}
				onSectionChange={changeSection}
				t={t}
			/>

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

			{/* ── SESSION ── */}
			<div className="grid items-start gap-3">
				<div className="min-w-0 space-y-3">
					{!hasExercises ? (
						<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
							<div className="mb-4 grid h-[68px] w-[68px] place-items-center rounded-2xl border border-white/85 bg-[#eef2f9] text-[var(--color-primary-300)] shadow-[4px_5px_12px_rgba(100,116,139,0.35)]">
								<Dumbbell size={30} />
							</div>
							<h3 className="text-base font-bold text-[#0f172a]">{t('noExercises')}</h3>
							<p className="mt-1.5 text-[13px] font-medium text-[#64748b]">{t('pickAnotherDay')}</p>
						</div>
					) : (
						<>
							<div className="overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[5px_6px_16px_rgba(100,116,139,0.4)]">
								<div className="relative h-[210px] overflow-hidden bg-[#e8edf5]">
									<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-[#eef2f9] to-[#e8edf5]" />
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_srgb,var(--color-primary-800)_33%,transparent),transparent_70%)]" />
									{isVideo ? (
										<InlineVideo key={`${currentExercise.id}-${activeMedia}`} src={currentExercise[activeMedia]} />
									) : currentExercise?.img ? (
										<>
											<Img
												key={`${currentExercise?.id || 'ex'}-blur`}
												src={currentExercise.img}
												alt=""
												className="absolute -inset-5 h-[calc(100%+40px)] w-[calc(100%+40px)] object-cover blur-xl"
												showBlur={false}
											/>
											<div className="absolute inset-0 bg-[rgba(4,8,15,0.45)]" />
											<Img
												key={`${currentExercise?.id || 'ex'}-image`}
												src={currentExercise.img}
												alt={currentExercise?.name || ''}
												className="relative h-full w-full object-contain"
												showBlur={false}
											/>
										</>
									) : (
										<div className="grid h-full place-items-center text-white/15">
											<Dumbbell size={52} />
										</div>
									)}
									<div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-2 p-3.5">
										<div className="flex min-w-0 flex-1 flex-wrap gap-[7px] pe-2">
											{!isCardio && exReps ? (
												<span className="inline-flex items-center gap-[5px] rounded-full border-[1.3px] border-t-white/40 border-b-[rgba(15,48,120,0.4)] bg-[var(--color-primary-500)] px-[11px] py-[7px] text-xs font-bold text-white shadow-[3px_4px_8px_rgba(15,23,42,0.45)]">
													<Repeat size={11} strokeWidth={2.5} />
													{exReps}
												</span>
											) : null}
											{!isCardio && exTempo ? (
												<span className="inline-flex items-center gap-[5px] rounded-full border-[1.3px] border-t-white/35 border-b-[rgba(5,40,50,0.45)] bg-[var(--color-secondary-700)] px-[11px] py-[7px] text-xs font-bold text-white shadow-[3px_4px_8px_rgba(11,61,74,0.45)]">
													<Timer size={11} strokeWidth={2.5} />
													{exTempo}
												</span>
											) : null}
											{isCardio && durationLabel ? (
												<span className="inline-flex items-center gap-[5px] rounded-full border-[1.3px] border-t-white/40 border-b-emerald-900/45 bg-emerald-600 px-[11px] py-[7px] text-xs font-bold text-white shadow-[3px_4px_8px_rgba(6,95,70,0.45)]">
													<Clock size={11} strokeWidth={2.5} />
													{durationLabel}
												</span>
											) : null}
										</div>
										{mediaOptions.length > 1 && (
											<div className="flex shrink-0 gap-[7px]">
												{mediaOptions.map(m => {
													const on = activeMedia === m.key;
													const Icon = m.icon;
													return (
														<button
															key={m.key}
															type="button"
															onClick={() => setActiveMedia(m.key)}
															aria-pressed={on}
															title={m.title}
															aria-label={m.title}
															className={cx(
																'grid h-8 w-8 place-items-center rounded-full border-[1.3px] text-white shadow-[3px_4px_8px_rgba(15,23,42,0.45)] transition active:scale-95',
																on
																	? 'border-t-white/45 border-b-[rgba(15,48,120,0.4)] bg-[var(--color-primary-500)]'
																	: 'border-t-white/40 border-b-[rgba(15,48,120,0.32)] bg-white/15',
															)}
														>
															<Icon size={14} />
														</button>
													);
												})}
											</div>
										)}
									</div>
									{currentExercise?.name && !isVideo && (
										<h2 className="absolute inset-x-0 bottom-0 z-[2] px-3.5 pb-3.5 pt-12 text-start text-[19px] font-extrabold leading-tight tracking-[-0.2px] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
											{currentExercise.name}
										</h2>
									)}
								</div>
								<ExerciseList
									t={t}
									workout={workout}
									exercisesOverride={exercisesBySection}
									currentExId={currentExercise?.id}
									onPick={pickExercise}
									completedExercises={completedExercises}
									toggleExerciseCompletion={toggleExerciseCompletion}
								/>
							</div>
							{!isCardio && <ExerciseNote note={currentExercise?.note} />}
						</>
					)}
				</div>

				{hasExercises && (
					<div className="min-w-0 space-y-3">
						{isCardio ? (
							<CardioTimerCard durationSeconds={currentExercise?.durationSeconds} note={currentExercise?.note} />
						) : (
							<RestTimerCard
								alerting={alerting}
								setAlerting={setAlerting}
								initialSeconds={Number.isFinite(currentExercise?.restSeconds) ? currentExercise.restSeconds : Number.isFinite(currentExercise?.rest) ? currentExercise.rest : 90}
								audioEl={audioRef}
							/>
						)}
						{!isCardio && (
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
						)}
					</div>
				)}
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
	const btn = 'grid h-11 w-11 place-items-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-b-[rgba(15,48,120,0.35)] border-e-[rgba(15,48,120,0.25)] bg-white/15 text-white shadow-[2px_3px_6px_rgba(15,23,42,0.35)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';
	return (
		<div className="flex shrink-0 items-center gap-2">
			<button type="button" onClick={onAudioClick} title={listenLabel} aria-label={listenLabel} className={btn}>
				<Headphones size={18} strokeWidth={2} />
			</button>
			<button type="button" onClick={onNotesClick} title={notesLabel} aria-label={notesLabel} className={btn}>
				<StickyNote size={18} strokeWidth={2} />
			</button>
		</div>
	);
}

export function WorkoutHeader({
	title,
	subtitle,
	dayTabs = [],
	selectedDay,
	onDayChange,
	onAudioClick,
	onNotesClick,
	sectionTabs = [],
	activeSection,
	onSectionChange,
	t,
}) {
	return (
		<div className="rounded-3xl text-white shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]">
			<div
				className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-b-[rgba(15,34,128,0.45)] border-e-[rgba(15,34,128,0.35)] pb-2"
				style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), var(--color-gradient-via, var(--color-primary-700)))' }}
			>
				<div className="pointer-events-none absolute -top-10 -start-20 h-[280px] w-[280px] rounded-full bg-white/[0.06]" />
				<div className="pointer-events-none absolute -bottom-10 -end-16 h-[200px] w-[200px] rounded-full bg-white/[0.04]" />
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />

				<div className="relative">
					<div className="flex items-center gap-3 px-4 pb-2 pt-4">
						<div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-b-[rgba(15,48,120,0.35)] border-e-[rgba(15,48,120,0.25)] bg-white/15 shadow-[2px_3px_6px_rgba(15,23,42,0.35)]">
							<Dumbbell size={20} strokeWidth={2} />
						</div>
						<div className="min-w-0 flex-1">
							<h1 className="truncate text-xl font-black leading-6 tracking-[-0.3px]">{title}</h1>
							{subtitle ? <p className="mt-0.5 truncate text-[10px] font-medium text-white/55">{subtitle}</p> : null}
						</div>
						<HeaderActions
							onAudioClick={onAudioClick}
							onNotesClick={onNotesClick}
							listenLabel={t('listen')}
							notesLabel={t('notes.show')}
						/>
					</div>

					<div className="mx-4 mb-3 h-px bg-white/20" />

					<div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
						{dayTabs.map(tab => {
							const on = tab.key === selectedDay;
							return (
								<button
									key={tab.key}
									type="button"
									onClick={() => onDayChange(tab.key)}
									aria-pressed={on}
									className={cx(
										'flex h-[58px] min-w-14 shrink-0 flex-col items-center justify-center rounded-2xl px-2 transition active:scale-95',
										on
											? 'scale-[1.02] bg-white text-[var(--color-primary-700)] shadow-[4px_5px_10px_color-mix(in_srgb,var(--color-primary-900)_40%,transparent)]'
											: 'border-[1.3px] border-white/30 bg-white/15 text-white/80',
									)}
								>
									<span className={cx('max-w-full truncate text-[10px] font-bold uppercase tracking-[0.2px]', on ? 'text-[var(--color-primary-700)]' : 'text-white/70')}>
										{tab.label}
									</span>
									<span className={cx('text-lg font-black tabular-nums leading-[22px] tracking-[-0.5px]', on ? 'text-[var(--color-primary-800)]' : 'text-white')}>
										{tab.date ?? '—'}
									</span>
								</button>
							);
						})}
					</div>

					{sectionTabs.length > 1 && (
						<div className="px-4 pb-3">
							<SectionTabs tabs={sectionTabs} active={activeSection} onChange={onSectionChange} tone="onPrimary" />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
