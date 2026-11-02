'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CalendarPlus, Dumbbell, Flame, HeartPulse, Minus, PencilRuler, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { ExercisePicker } from '@/components/pages/dashboard/plans/ExercisePicker';
import { Notification } from '@/config/Notification';

const WEEK = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const BLOCKS = [
	{ id: 'warmup', key: 'warmupExercises', icon: Flame, label: 'builder.blocks.warmup' },
	{ id: 'main', key: 'exercises', icon: Dumbbell, label: 'builder.blocks.workout' },
	{ id: 'cardio', key: 'cardioExercises', icon: HeartPulse, label: 'builder.blocks.cardio' },
];
const GRADIENT = 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))';

const dayCount = day => BLOCKS.reduce((n, b) => n + (day?.[b.key]?.length || 0), 0);

function toEditorItem(ex) {
	return {
		exerciseId: String(ex.exerciseId ?? ex.id),
		name: ex.name,
		img: ex.img ?? null,
		category: ex.category ?? null,
		targetSets: ex.targetSets ?? 3,
		targetReps: ex.targetReps ?? '10',
		tempo: ex.tempo ?? null,
		restSeconds: ex.restSeconds ?? ex.rest ?? null,
		durationSeconds: ex.durationSeconds ?? null,
		note: ex.note ?? null,
	};
}

function toEditorDays(plan) {
	return (plan?.program?.days || [])
		.map(d => ({
			dayOfWeek: String(d.dayOfWeek || d.id || '').toLowerCase(),
			name: d.name || d.nameOfWeek || '',
			warmupExercises: (d.warmupExercises || []).map(toEditorItem),
			exercises: (d.exercises || []).map(toEditorItem),
			cardioExercises: (d.cardioExercises || []).map(toEditorItem),
		}))
		.filter(d => WEEK.includes(d.dayOfWeek))
		.sort((a, b) => WEEK.indexOf(a.dayOfWeek) - WEEK.indexOf(b.dayOfWeek));
}

function toPayload(days) {
	const strength = list =>
		list.map((ex, i) => ({
			exerciseId: ex.exerciseId,
			order: i + 1,
			targetSets: Math.max(1, Number(ex.targetSets) || 3),
			targetReps: String(ex.targetReps || '10').trim() || '10',
			tempo: ex.tempo,
			restSeconds: ex.restSeconds,
			note: ex.note,
		}));
	return {
		program: {
			days: days.map(d => ({
				dayOfWeek: d.dayOfWeek,
				nameOfWeek: d.name || d.dayOfWeek,
				warmupExercises: strength(d.warmupExercises),
				exercises: strength(d.exercises),
				cardioExercises: d.cardioExercises.map((ex, i) => ({
					exerciseId: ex.exerciseId,
					order: i + 1,
					durationSeconds: ex.durationSeconds,
					note: ex.note,
				})),
			})),
		},
	};
}

const ExerciseRow = memo(function ExerciseRow({ ex, cardio, onChange, onRemove, t }) {
	const minutes = ex.durationSeconds ? Math.round(ex.durationSeconds / 60) : '';
	return (
		<div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2 pe-2.5 dark:border-white/10 dark:bg-white/[0.04]">
			<span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
				{ex.img ? (
					<Img src={ex.img} alt="" showBlur={false} className="h-full w-full object-cover" />
				) : (
					<span className="grid h-full place-items-center text-slate-300"><Dumbbell size={18} /></span>
				)}
			</span>
			<div className="min-w-0 flex-1">
				<MultiLangText className="block truncate text-[13px] font-bold text-slate-800 dark:text-white">{ex.name}</MultiLangText>
				{cardio ? (
					<label className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[11.5px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
						<input
							type="number"
							inputMode="numeric"
							min={1}
							value={minutes}
							onChange={e => onChange({ durationSeconds: e.target.value ? Math.max(1, Number(e.target.value)) * 60 : null })}
							className="w-9 bg-transparent text-center font-en font-bold text-slate-800 outline-none dark:text-white"
							dir="ltr"
						/>
						{t('minutes')}
					</label>
				) : (
					<div className="mt-1.5 flex items-center gap-1.5" dir="ltr">
						<div className="flex h-7 items-center rounded-lg bg-slate-100 dark:bg-white/10">
							<button
								type="button"
								onClick={() => onChange({ targetSets: Math.max(1, (Number(ex.targetSets) || 1) - 1) })}
								aria-label="-1"
								className="grid h-7 w-6 place-items-center text-slate-500 active:scale-90"
							>
								<Minus size={12} strokeWidth={2.75} />
							</button>
							<span className="min-w-[2.6rem] text-center font-en text-[11.5px] font-bold tabular-nums text-slate-800 dark:text-white">
								{ex.targetSets} {t('setsShort')}
							</span>
							<button
								type="button"
								onClick={() => onChange({ targetSets: Math.min(12, (Number(ex.targetSets) || 0) + 1) })}
								aria-label="+1"
								className="grid h-7 w-6 place-items-center text-slate-500 active:scale-90"
							>
								<Plus size={12} strokeWidth={2.75} />
							</button>
						</div>
						<span className="text-[11px] font-bold text-slate-400">×</span>
						<label className="flex h-7 items-center rounded-lg bg-slate-100 px-2 dark:bg-white/10">
							<input
								value={ex.targetReps ?? ''}
								onChange={e => onChange({ targetReps: e.target.value.slice(0, 12) })}
								className="w-11 bg-transparent text-center font-en text-[11.5px] font-bold text-slate-800 outline-none dark:text-white"
								aria-label={t('reps')}
							/>
							<span className="text-[10.5px] font-semibold text-slate-400">{t('repsShort')}</span>
						</label>
					</div>
				)}
			</div>
			<button
				type="button"
				onClick={onRemove}
				aria-label={t('removeExercise')}
				title={t('removeExercise')}
				className="grid size-9 shrink-0 place-items-center rounded-xl text-rose-400 transition hover:bg-rose-50 active:scale-90 dark:hover:bg-rose-500/10"
			>
				<Trash2 size={16} />
			</button>
		</div>
	);
});

/**
 * "Edit my plan" sheet on My Workouts. The client edits their own copy (the server makes one on
 * the first save, the coach's plan is never touched) and can reset back to the coach's plan.
 */
export default function MyPlanEditor({ open, onClose, onSaved, initialDay }) {
	const t = useTranslations('myPlanEditor');
	const tp = useTranslations('workoutPlans');
	const [loading, setLoading] = useState(false);
	const [state, setState] = useState(null);
	const [days, setDays] = useState([]);
	const [baseline, setBaseline] = useState('');
	const [dayKey, setDayKey] = useState(null);
	const [block, setBlock] = useState('main');
	const [adding, setAdding] = useState(false);
	const [picker, setPicker] = useState(false);
	const [confirm, setConfirm] = useState(null);
	const [busy, setBusy] = useState(false);

	const adopt = useCallback((data, preferredDay) => {
		const next = toEditorDays(data?.plan);
		setState(data);
		setDays(next);
		setBaseline(JSON.stringify(toPayload(next)));
		setDayKey(next.find(d => d.dayOfWeek === preferredDay)?.dayOfWeek || next[0]?.dayOfWeek || null);
	}, []);

	useEffect(() => {
		if (!open) return;
		setConfirm(null);
		setAdding(false);
		setBlock('main');
		setLoading(true);
		api.get('/plans/mine')
			.then(({ data }) => adopt(data, initialDay))
			.catch(e => {
				Notification(e?.response?.data?.message || t('loadFailed'), 'error');
				onClose?.();
			})
			.finally(() => setLoading(false));
	}, [open]); // eslint-disable-line react-hooks/exhaustive-deps

	const day = days.find(d => d.dayOfWeek === dayKey) || null;
	const blockDef = BLOCKS.find(b => b.id === block);
	const list = day?.[blockDef.key] || [];
	const dirty = useMemo(() => JSON.stringify(toPayload(days)) !== baseline, [days, baseline]);
	const emptyDays = days.filter(d => !dayCount(d));
	const freeDays = WEEK.filter(w => !days.some(d => d.dayOfWeek === w));

	const patchDay = useCallback((key, fn) => setDays(all => all.map(d => (d.dayOfWeek === key ? fn(d) : d))), []);

	const changeItem = (index, patch) =>
		patchDay(dayKey, d => ({ ...d, [blockDef.key]: d[blockDef.key].map((ex, i) => (i === index ? { ...ex, ...patch } : ex)) }));
	const removeItem = index => patchDay(dayKey, d => ({ ...d, [blockDef.key]: d[blockDef.key].filter((_, i) => i !== index) }));

	const addDay = key => {
		setDays(all => [...all, { dayOfWeek: key, name: tp(`days.${key}`), warmupExercises: [], exercises: [], cardioExercises: [] }]
			.sort((a, b) => WEEK.indexOf(a.dayOfWeek) - WEEK.indexOf(b.dayOfWeek)));
		setDayKey(key);
		setBlock('main');
		setAdding(false);
	};

	const removeDay = () => {
		if (days.length <= 1) return;
		const index = days.findIndex(d => d.dayOfWeek === dayKey);
		const next = days.filter(d => d.dayOfWeek !== dayKey);
		setDays(next);
		setDayKey(next[Math.max(0, index - 1)]?.dayOfWeek || null);
		setConfirm(null);
	};

	const pickerSelected = useMemo(
		() => list.map(ex => ({ id: ex.exerciseId, name: ex.name, img: ex.img, category: ex.category })),
		[list],
	);
	const onPicked = useCallback(picked => {
		patchDay(dayKey, d => {
			const current = d[blockDef.key];
			const keep = new Set(picked.map(p => String(p.id)));
			const existing = new Set(current.map(ex => ex.exerciseId));
			const kept = current.filter(ex => keep.has(ex.exerciseId));
			const added = picked
				.filter(p => !existing.has(String(p.id)))
				.map(p => toEditorItem({ ...p, durationSeconds: block === 'cardio' ? 600 : null }));
			return { ...d, [blockDef.key]: [...kept, ...added] };
		});
		setPicker(false);
	}, [patchDay, dayKey, blockDef, block]);

	const save = async () => {
		if (emptyDays.length) {
			setDayKey(emptyDays[0].dayOfWeek);
			Notification(t('dayNeedsExercise'), 'error');
			return;
		}
		setBusy(true);
		try {
			const { data } = await api.put('/plans/mine', toPayload(days));
			adopt(data, dayKey);
			Notification(t('saved'), 'success');
			onSaved?.(data);
			onClose?.();
		} catch (e) {
			Notification(e?.response?.data?.message || t('saveFailed'), 'error');
		} finally {
			setBusy(false);
		}
	};

	const reset = async () => {
		setBusy(true);
		try {
			const { data } = await api.post('/plans/mine/reset');
			adopt(data, dayKey);
			setConfirm(null);
			Notification(t('resetDone'), 'success');
			onSaved?.(data);
		} catch (e) {
			Notification(e?.response?.data?.message || t('saveFailed'), 'error');
		} finally {
			setBusy(false);
		}
	};

	const requestClose = () => {
		if (dirty && !busy) setConfirm('discard');
		else onClose?.();
	};

	if (typeof document === 'undefined') return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					key="my-plan-editor"
					className="fixed inset-0 z-[1000000] flex items-end justify-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<button type="button" aria-label={t('close')} onClick={requestClose} className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]" />
					<motion.div
						role="dialog"
						aria-modal="true"
						aria-label={t('title')}
						className="relative flex max-h-[92dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] bg-[#f4f6fb] shadow-2xl dark:bg-[#0b1220]"
						initial={{ y: 40 }}
						animate={{ y: 0 }}
						exit={{ y: 40 }}
						transition={{ type: 'spring', stiffness: 380, damping: 34 }}
					>
						<div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/20" />

						{/* Header */}
						<div className="flex items-center gap-3 px-4 pb-3 pt-2.5">
							<span className="grid size-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: GRADIENT }}>
								<PencilRuler size={18} />
							</span>
							<div className="min-w-0 flex-1">
								<h2 className="truncate text-[16px] font-extrabold text-slate-900 dark:text-white">{t('title')}</h2>
								<p className="truncate text-[11.5px] font-medium text-slate-500">
									{state?.isPersonal ? t('personalHint') : t('coachHint')}
								</p>
							</div>
							<button type="button" onClick={requestClose} aria-label={t('close')} className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm active:scale-95 dark:bg-white/10 dark:text-slate-200">
								<X size={17} />
							</button>
						</div>

						{loading || !state ? (
							<div className="space-y-2 px-4 pb-6">
								{[0, 1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10" />)}
							</div>
						) : (
							<>
								{/* Days */}
								<div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none]">
									{days.map(d => {
										const on = d.dayOfWeek === dayKey;
										const empty = !dayCount(d);
										return (
											<button
												key={d.dayOfWeek}
												type="button"
												onClick={() => { setDayKey(d.dayOfWeek); setAdding(false); setConfirm(null); }}
												aria-pressed={on}
												className={`relative flex h-11 shrink-0 flex-col items-center justify-center rounded-2xl px-3.5 text-[12px] font-bold transition active:scale-95 ${on ? 'text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.8)]' : 'bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200'}`}
												style={on ? { background: GRADIENT } : undefined}
											>
												{tp(`days.${d.dayOfWeek}`)}
												<span className={`font-en text-[10px] font-semibold ${on ? 'text-white/75' : 'text-slate-400'}`}>{dayCount(d)}</span>
												{empty && <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full bg-rose-500 ring-2 ring-[#f4f6fb] dark:ring-[#0b1220]" />}
											</button>
										);
									})}
									{freeDays.length > 0 && (
										<button
											type="button"
											onClick={() => setAdding(v => !v)}
											aria-expanded={adding}
											className="flex h-11 shrink-0 items-center gap-1 rounded-2xl border-2 border-dashed border-[var(--color-primary-300)] px-3 text-[12px] font-bold text-[var(--color-primary-600)] active:scale-95"
										>
											<CalendarPlus size={15} />
											{t('addDay')}
										</button>
									)}
								</div>

								{adding && (
									<div className="mx-4 mb-2.5 flex flex-wrap gap-1.5 rounded-2xl bg-white p-2 shadow-sm dark:bg-white/10">
										<span className="w-full px-1 text-[11px] font-semibold text-slate-400">{t('pickDay')}</span>
										{freeDays.map(key => (
											<button key={key} type="button" onClick={() => addDay(key)} className="h-8 rounded-xl bg-[var(--color-primary-50)] px-3 text-[12px] font-bold text-[var(--color-primary-700)] active:scale-95 dark:bg-white/10 dark:text-white">
												{tp(`days.${key}`)}
											</button>
										))}
									</div>
								)}

								{/* Block tabs + delete day */}
								<div className="flex items-center gap-2 px-4 pb-2.5">
									<div className="flex flex-1 rounded-2xl bg-slate-200/70 p-1 dark:bg-white/10">
										{BLOCKS.map(b => {
											const on = b.id === block;
											const Icon = b.icon;
											return (
												<button
													key={b.id}
													type="button"
													onClick={() => setBlock(b.id)}
													aria-pressed={on}
													className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-xl text-[11.5px] font-bold transition ${on ? 'bg-white text-[var(--color-primary-700)] shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500'}`}
												>
													<Icon size={13} />
													{tp(b.label)}
													<span className="font-en text-[10px] text-slate-400">{day?.[b.key]?.length || 0}</span>
												</button>
											);
										})}
									</div>
									<button
										type="button"
										onClick={() => setConfirm('day')}
										disabled={days.length <= 1}
										aria-label={t('deleteDay')}
										title={days.length <= 1 ? t('lastDay') : t('deleteDay')}
										className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-rose-500 shadow-sm transition active:scale-95 disabled:opacity-35 dark:bg-white/10"
									>
										<Trash2 size={16} />
									</button>
								</div>

								{/* Exercises */}
								<div className="min-h-[160px] flex-1 space-y-2 overflow-y-auto px-4 pb-3">
									{list.map((ex, i) => (
										<ExerciseRow
											key={`${ex.exerciseId}-${i}`}
											ex={ex}
											cardio={block === 'cardio'}
											onChange={patch => changeItem(i, patch)}
											onRemove={() => removeItem(i)}
											t={t}
										/>
									))}
									{!list.length && (
										<p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-[12px] font-medium text-slate-400 dark:border-white/15">
											{t('emptyBlock')}
										</p>
									)}
									<button
										type="button"
										onClick={() => setPicker(true)}
										className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-primary-300)] bg-white/60 text-[13px] font-bold text-[var(--color-primary-600)] active:scale-[0.99] dark:bg-white/5"
									>
										<Plus size={16} strokeWidth={2.5} />
										{t('addExercise')}
									</button>
									{day && !dayCount(day) && (
										<p className="flex items-center gap-1.5 px-1 text-[11.5px] font-semibold text-rose-500">
											<AlertCircle size={13} />
											{t('dayNeedsExercise')}
										</p>
									)}
								</div>

								{/* Footer */}
								<div className="border-t border-slate-200/80 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 dark:border-white/10 dark:bg-[#0f172a]">
									{confirm ? (
										<div className="flex items-center gap-2">
											<p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-slate-700 dark:text-slate-200">
												{confirm === 'reset' ? t('confirmReset') : confirm === 'day' ? t('confirmDeleteDay', { day: tp(`days.${dayKey}`) }) : t('confirmDiscard')}
											</p>
											<button type="button" onClick={() => setConfirm(null)} className="h-10 shrink-0 rounded-xl bg-slate-100 px-3.5 text-[12.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
												{t('cancel')}
											</button>
											<button
												type="button"
												disabled={busy}
												onClick={confirm === 'reset' ? reset : confirm === 'day' ? removeDay : () => { setConfirm(null); onClose?.(); }}
												className="h-10 shrink-0 rounded-xl bg-rose-500 px-3.5 text-[12.5px] font-bold text-white disabled:opacity-60"
											>
												{confirm === 'reset' ? t('reset') : confirm === 'day' ? t('deleteDay') : t('discard')}
											</button>
										</div>
									) : (
										<div className="flex items-center gap-2">
											{state.canReset && (
												<button
													type="button"
													onClick={() => setConfirm('reset')}
													className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 text-[12.5px] font-bold text-slate-600 active:scale-95 dark:bg-white/10 dark:text-slate-200"
												>
													<RotateCcw size={15} />
													{t('resetShort')}
												</button>
											)}
											<button
												type="button"
												onClick={save}
												disabled={!dirty || busy}
												className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(37,99,235,0.9)] transition active:scale-[0.99] disabled:opacity-50"
												style={{ background: GRADIENT }}
											>
												{busy && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
												{t('save')}
											</button>
										</div>
									)}
								</div>
							</>
						)}
					</motion.div>
				</motion.div>
			)}
			<ExercisePicker
				key="my-plan-picker"
				open={picker}
				dayId={`${dayKey}-${block}`}
				initialSelected={pickerSelected}
				onClose={() => setPicker(false)}
				onDone={onPicked}
			/>
		</AnimatePresence>,
		document.body,
	);
}
