import { Dumbbell } from 'lucide-react';

export function ExerciseList({ workout, currentExId, onPick }) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const sets = Array.isArray(workout?.sets) ? workout.sets : [];

  const setsFor = exId => sets.filter(s => s?.exId === exId);

  // Empty state
  if (!workout || exercises.length === 0) {
    return (
      <div className='p-6 ltr:pl-0 h-full rtl:pr-0 ' >
        <div className='flex h-full flex-col items-center justify-center p-10 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center'>
          <div className='w-12 h-12 rounded-full bg-white shadow flex items-center justify-center mb-3'>
            <Dumbbell size={20} className='text-slate-400' />
          </div>
          <h3 className='text-base font-medium text-slate-700'>Not found Exercise for this day</h3>
          {/* <p className='text-sm text-slate-500'>Pick another day from the tabs above.</p> */}
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
        const active = currentExId === exId;

        return (
          <button key={exId} onClick={() => onPick?.(ex)} className={`w-full text-left p-3 rounded-xl border transition ${active ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 overflow-hidden rounded-lg bg-slate-100 grid place-items-center'>{ex?.img ? <img src={ex.img} alt={ex?.name || 'exercise'} className='object-cover w-full h-full' /> : <Dumbbell size={16} className='text-slate-500' />}</div>
              <div className='min-w-0 flex-1'>
                <div className='font-medium truncate'>
                  {idx + 1}. {ex?.name ?? 'Unnamed exercise'}
                </div>
                <div className='text-xs opacity-70'>
                  {total} sets • Rest {ex?.rest ?? 90}s
                </div>
                <div className='mt-1 h-1.5 rounded-full bg-slate-200'>
                  <div
                    className='h-1.5 rounded-full bg-indigo-600'
                    style={{
                      width: `${Math.round((done / Math.max(1, total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
