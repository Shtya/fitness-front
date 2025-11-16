import CheckBox from '@/components/atoms/CheckBox';
import Img from '@/components/atoms/Img';
import { Dumbbell, CheckCircle2, Timer, Activity, ChevronRight } from 'lucide-react';

export function ExerciseList({ workout, currentExId, onPick, t, completedExercises, toggleExerciseCompletion }) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const sets = Array.isArray(workout?.sets) ? workout.sets : [];
  const setsFor = exId => sets.filter(s => s?.exId === exId);

  const pct = (done, total) => {
    const p = Math.round((Number(done || 0) / Math.max(1, Number(total || 0))) * 100);
    return Number.isFinite(p) ? p : 0;
  };

  // Empty state
  if (!workout || exercises.length === 0) {
    return (
      <div className='p-5'>
        <div className='relative flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 text-center shadow-sm'>
          {/* Decorative background */}
          <div className='absolute inset-0 -z-10 opacity-[0.5]'>
            <div className='absolute inset-0 bg-[radial-gradient(800px_400px_at_0%_0%,rgba(59,130,246,0.06),transparent_60%),radial-gradient(600px_300px_at_100%_100%,rgba(16,185,129,0.06),transparent_60%)]' />
            <div className='absolute inset-0 [mask-image:radial-gradient(360px_160px_at_50%_0%,#000,transparent)] bg-[linear-gradient(45deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:12px_12px]' />
          </div>

          {/* Icon */}
          <div className='mb-4 grid h-16 w-16 place-items-center rounded-full bg-white shadow ring-1 ring-slate-200'>
            <Dumbbell size={24} className='text-slate-500' />
          </div>

          {/* Text */}
          <h3 className='text-lg font-semibold text-slate-800'>{t('noExercises') || 'No exercises found for this day'}</h3>
          <p className='mt-1  text-xs text-slate-400 italic  text-nowrap truncate '>{t('pickAnotherDay') || 'Try selecting another day or check your workout plan.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {exercises.map((ex, idx) => {
        const exId = ex?.id ?? `idx-${idx}`;
        const list = setsFor(exId);
        const done = list.filter(s => s?.done).length;
        const total = list.length || 0;
        const progress = pct(done, total);
        const active = currentExId === exId;
        const isCompleted = completedExercises.has(exId);

        return (
          <div key={exId} className='group relative'>
            <button
              type='button'
              onClick={() => onPick?.(ex)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick?.(ex);
                }
              }}
              aria-current={active ? 'true' : 'false'}
              className={['w-full text-left rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ', 'border bg-white backdrop-blur-sm', active ? 'border-indigo-400 shadow-sm ring-1 ring-indigo-100 ' : 'border-slate-200 hover:bg-slate-50/60 hover:shadow-sm'].join(' ')}>
              <div className='p-3 flex items-center gap-3'>
                {/* Thumb */}
                <div className='relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200 shrink-0'>
                  {ex?.img ? (
                    <Img src={ex.img} alt={ex?.name || 'exercise'} className='object-cover w-full h-full' />
                  ) : (
                    <div className='grid place-items-center w-full h-full'>
                      <Dumbbell size={18} className='text-slate-500' />
                    </div>
                  )}
                  {active && <span className='absolute -inset-0.5 rounded-lg ring-2 ring-indigo-300  pointer-events-none' />}
                </div>

                {/* Info */}
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='min-w-0  '>
                      <div title={ex?.name} className={` rtl:text-right font-number text-nowrap truncate font-semibold text-slate-900 ${!active && 'truncate'}`}>
                        {idx + 1}. {ex?.name ?? 'Unnamed exercise'}
                      </div>
                    </div>

                    <div
                      onClick={e => {
                        e.stopPropagation();
                        toggleExerciseCompletion(exId);
                      }}
                      className={`cursor-pointer hover:scale-[1.05] origin-center p-1 rounded-md transition-all ${isCompleted ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-300 hover:bg-slate-50'}`}
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                      title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}>
                      <CheckCircle2 size={16} className={isCompleted ? 'text-white' : 'text-slate-400'} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className='mt-2 h-2 rounded-full bg-slate-200 overflow-hidden'>
                    <div className={['h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600', 'transition-[width] duration-300 ease-out'].join(' ')} style={{ width: `${progress}%` }} />
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
