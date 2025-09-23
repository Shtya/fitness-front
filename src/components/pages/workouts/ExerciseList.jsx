export function ExerciseList({ workout, currentExId, onPick }) {
  const setsFor = exId => (workout?.sets || []).filter(s => s.exId === exId);
  if (!workout?.exercises?.length) {
    return <div className='text-sm text-slate-500'>Nothing here yet.</div>;
  }
  return (
    <div className='space-y-2'>
      {workout.exercises.map((ex, idx) => {
        const done = setsFor(ex.id).filter(s => s.done).length;
        const total = setsFor(ex.id).length;
        const active = currentExId === ex.id;
        return (
          <button key={ex.id} onClick={() => onPick?.(ex)} className={`w-full text-left p-3 rounded-xl border transition ${active ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 overflow-hidden rounded-lg bg-slate-100 grid place-items-center'>{ex.img ? <img src={ex.img} alt='' className='object-cover w-full h-full' /> : <Dumbbell size={16} className='text-slate-500' />}</div>
              <div className='min-w-0 flex-1'>
                <div className='font-medium truncate'>
                  {idx + 1}. {ex.name}
                </div>
                <div className='text-xs opacity-70'>
                  {total} × {ex.targetReps} • Rest {Number.isFinite(ex.rest ?? ex.restSeconds) ? ex.rest ?? ex.restSeconds : 90}s
                </div>
                <div className='mt-1 h-1.5 rounded-full bg-slate-200'>
                  <div className='h-1.5 rounded-full bg-indigo-600' style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
