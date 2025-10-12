import Img from '@/components/atoms/Img';
import { Dumbbell, CheckCircle2, Timer, Activity, ChevronRight } from 'lucide-react';

export function ExerciseList({ workout, currentExId, onPick }) {
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
      <div className='p-4 ltr:pl-0 rtl:pr-0 h-full'>
        <div className='flex h-full flex-col items-center justify-center p-8 border border-dashed border-slate-300 rounded-lg bg-gradient-to-br from-slate-50 via-white to-slate-50 text-center'>
          <div className='w-14 h-14 rounded-full bg-white shadow grid place-items-center mb-3 ring-1 ring-slate-200'>
            <Dumbbell size={20} className='text-slate-400' />
          </div>
          <h3 className='text-base font-semibold text-slate-800'>Not found Exercise for this day</h3>
          <p className='text-sm text-slate-500 mt-1'>Pick another day from the tabs above.</p>
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

        return (
          <button
            key={exId}
            type='button'
            onClick={() => onPick?.(ex)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick?.(ex);
              }
            }}
            aria-current={active ? 'true' : 'false'}
            className={['group w-full text-left rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ', 'border bg-white backdrop-blur-sm', active ? 'border-indigo-400 shadow-sm ring-1 ring-indigo-100 ' : 'border-slate-200 hover:bg-slate-50/60 hover:shadow-sm'].join(' ')}>
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
                  <div className='min-w-0'>
                    <div title={ex?.name} className={`font-semibold text-slate-900 ${!active && "truncate"}`}>
                      {idx + 1}. {ex?.name ?? 'Unnamed exercise'}
                    </div>
                   </div>

                  {/* Chevron */}
                  <ChevronRight size={16} className={['shrink-0 text-slate-400 transition-transform', active ? 'translate-x-0' : 'group-hover:translate-x-0.5'].join(' ')} />
                </div>

                {/* Progress bar */}
                <div className='mt-2 h-2 rounded-full bg-slate-200 overflow-hidden'>
                  <div className={['h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600', 'transition-[width] duration-300 ease-out'].join(' ')} style={{ width: `${progress}%` }} />
                </div>

                {/* Micro helper line */}
                <div className='mt-1.5 text-[10px] text-slate-500'>{progress === 100 ? 'Completed' : progress === 0 ? 'Not started yet' : `${progress}% done`}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
