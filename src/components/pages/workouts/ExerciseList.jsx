import CheckBox from '@/components/atoms/CheckBox';
import Img from '@/components/atoms/Img';
import { Dumbbell, CheckCircle2, Timer, Activity, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

export function ExerciseList({
	workout,
	exercisesOverride,
	currentExId,
	onPick,
	t,
	completedExercises,
	toggleExerciseCompletion,
 }) {
	const exercises = Array.isArray(exercisesOverride)
		? exercisesOverride
		: Array.isArray(workout?.exercises)
		? workout.exercises
		: [];

	const sets = Array.isArray(workout?.sets) ? workout.sets : [];
	const setsFor = exId => sets.filter(s => s?.exId === exId);

	const pct = (done, total) => {
		const p = Math.round((Number(done || 0) / Math.max(1, Number(total || 0))) * 100);
		return Number.isFinite(p) ? p : 0;
	};


	const startedAnyExercise = useMemo(() => {
  return sets.some(s => !!s?.done || Number(s?.weight) > 0 || Number(s?.reps) > 0);
}, [sets]);


	if (!workout || exercises.length === 0) {
		return (
			<div className='p-5'>
				<div className='relative flex flex-col items-center justify-center rounded-lg border border-dashed bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 text-center shadow-sm theme-soft-border'>
					<div className='mb-4 grid h-16 w-16 place-items-center rounded-full bg-white shadow ring-1 ring-slate-200'>
						<Dumbbell size={24} className='text-slate-500' />
					</div>
					<h3 className='text-lg font-semibold text-slate-800'>{t('noExercises') || 'No exercises found for this section'}</h3>
					<p className='mt-1 text-xs text-slate-400 italic text-nowrap truncate'>
						{t('pickAnotherDay') || 'Try selecting another day or check your workout plan.'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className='max-lg:px-1 max-lg:pb-1 max-lg:pt-2 lg:space-y-2 max-lg:overflow-x-auto max-lg:flex max-lg:gap-2'>
			{exercises.map((ex, idx) => {
				const exId = ex?.id ?? `idx-${idx}`;
				const list = setsFor(exId);
				const done = list.filter(s => s?.done).length;
				const total = list.length || 0;
				const progress = pct(done, total);
				const active = currentExId === exId;
				const isCompleted = completedExercises?.has?.(exId);
				const showProgress = !!startedAnyExercise && total > 0 && done > 0;
				const doneLabel = t('progress.setsDone', { done, total });

 
				return (
					<div key={exId} className='group relative'>
						<button
							type='button'
							onClick={() => onPick?.(ex)}
							className={[
								'w-full text-left rounded-lg transition focus:outline-none focus:ring-2',
								'border bg-white backdrop-blur-sm',
								active ? 'scale-[1.05] shadow-sm ring-1' : 'hover:bg-slate-50/60 hover:shadow-sm',
							].join(' ')}
							style={{ 
								borderColor: active ? 'var(--color-primary-200)' : '#ccc',
								'--tw-ring-color': 'var(--color-primary-400)'
							}}
						>
							<div className='max-lg:p-[2px] lg:p-3 flex items-center gap-3'>
								<div className='relative max-lg:w-13 max-lg:h-13 w-12 h-12 rounded-md overflow-hidden lg:bg-slate-100 ring-1 ring-slate-200 shrink-0'>
									{ex?.img ? (
										<Img src={ex.img} alt={ex?.name || 'exercise'} className='object-contain w-full h-full' showBlur={false} />
									) : (
										<div className='grid place-items-center w-full h-full'>
											<Dumbbell size={18} className='text-slate-500' />
										</div>
									)}

									{active && (
										<span 
											className='absolute -inset-0.5 rounded-lg ring-2 pointer-events-none' 
											style={{ '--tw-ring-color': 'var(--color-primary-300)' }}
										/>
									)}

									{showProgress && (
										<>
											<div className='absolute left-0 right-0 bottom-0 h-[5px] bg-black/20'>
												<div 
													className='h-full theme-primary-bg' 
													style={{ width: `${progress}%` }} 
												/>
											</div>
											<div className='absolute top-1 left-1 rounded-md bg-white/90 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-800'>
												{doneLabel}
											</div>
										</>
									)}
 
								</div>

								<div className='max-lg:!hidden min-w-0 flex-1'>
									<div className='flex items-center justify-between gap-2'>
										<div className='min-w-0'>
											<div title={ex?.name} className={`rtl:text-right font-number text-nowrap truncate font-semibold text-slate-900 ${!active && 'truncate'}`}>
												{idx + 1}. {ex?.name ?? 'Unnamed exercise'}
											</div>
										</div>

										<div className='flex items-center gap-2'>
											<div
												onClick={e => {
													e.stopPropagation();
													toggleExerciseCompletion?.(exId);
												}}
												className={`cursor-pointer hover:scale-[1.05] origin-center p-1 rounded-md transition-all ${
													isCompleted 
														? 'theme-primary-bg text-white shadow-lg' 
														: 'bg-white text-slate-400 border border-slate-300 hover:bg-slate-50'
												}`}
												aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
												title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
											>
												<CheckCircle2 size={16} className={isCompleted ? 'text-white' : 'text-slate-400'} />
											</div>
										</div>
									</div>
 
								</div>
							</div>
						</button>
					</div>
				);
			})}
		</div>
	);
}

function CircleProgress({ className, done = 0, total = 0, size = 34, stroke = 4 }) {
	if (done === 0) return null;

	const complete = done >= total;
	if (complete) {
		return (
			<div
				className={`relative grid place-items-center bg-white rounded-full shadow-lg ${className}`}
				style={{ width: size, height: size }}
			>
				<CheckCircle2 size={size * 0.7} style={{ color: 'var(--color-primary-600)' }} />
			</div>
		);
	}

	// Progress ring logic
	const pct = Math.min(100, Math.round((done / total) * 100));
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const offset = c - (pct / 100) * c;

	return (
		<div
			className={`relative grid place-items-center bg-white rounded-full shadow-lg ${className}`}
			style={{ width: size, height: size }}
		>
			<svg width={size} height={size} className="rotate-[-90deg]">
				{/* background */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="rgb(226 232 240)"
					strokeWidth={stroke}
				/>
				{/* progress */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={c}
					strokeDashoffset={offset}
					className="transition-[stroke-dashoffset] duration-300 ease-out"
					style={{ stroke: 'var(--color-primary-600)' }}
				/>
			</svg>

			{/* center label */}
			<div className="absolute inset-0 grid place-items-center">
				<span className="text-[9px] font-bold tabular-nums text-slate-700">
					{done}/{total}
				</span>
			</div>
		</div>
	);
}