const LOCAL_KEY_BUFFER = 'mw.sets.buffer.v1';

 
 

export function createSessionFromDay(dayProgram) {
	const list = Array.isArray(dayProgram?.allExercises)
		? dayProgram.allExercises
		: Array.isArray(dayProgram?.exercises)
		? dayProgram.exercises
		: [];

	const clampSets = n => {
		const x = Number(n);
		if (!Number.isFinite(x) || x <= 0) return 2;
		return Math.max(1, Math.min(20, Math.round(x)));
	};

	return {
		...dayProgram,
		startedAt: null,
		exercises: list.map(e => ({ ...e })),
		sets: list.flatMap(ex => {
			const count = clampSets(ex.targetSets ?? 2);
			return Array.from({ length: count }).map((_, i) => ({
				id: `${ex.id}-set${i + 1}`,
				exId: ex.id,
				exName: ex.name,
				set: i + 1,
				targetReps: ex.targetReps,
				weight: 0,
				reps: 0,
				effort: null,
				done: false,
				pr: false,
				restTime: Number.isFinite(ex.rest ?? ex.restSeconds) ? ex.rest ?? ex.restSeconds : 90,
			}));
		}),
	};
}



export function applyServerRecords(session, recordsByEx, setWorkout, lastSavedRef) {
  const nextSets = (session.sets || []).map(s => {
    const rr = (recordsByEx?.[s.exName] || []).find(r => Number(r.setNumber) === Number(s.set));
    if (!rr) return s;
    return {
      ...s,
      serverId: rr.id,
      weight: Number(rr.weight) || 0,
      reps: Number(rr.reps) || 0,
      done: !!rr.done,
      pr: !!rr.isPr,
    };
  });
  const next = { ...session, sets: nextSets };
  setWorkout(next);
  // refresh last-saved mirror
  const map = new Map();
  nextSets.forEach(s => map.set(s.id, { weight: s.weight, reps: s.reps, done: s.done }));
  lastSavedRef.current = map;
}

export function markUnsaved(workout, setUnsaved) {
  try {
    persistLocalBuffer(workout);
  } catch {}
  setUnsaved(true);
}
export function persistLocalBuffer(workout) {
  if (!workout) return;
  // Store minimal buffer: by exercise -> array of {set, weight, reps, done}
  const buf = {};
  (workout.exercises || []).forEach(ex => {
    buf[ex.name] = (workout.sets || []).filter(s => s.exName === ex.name).map(s => ({ set: s.set, weight: s.weight, reps: s.reps, done: !!s.done }));
  });
  localStorage.setItem(LOCAL_KEY_BUFFER, JSON.stringify({ date: todayISO(), data: buf }));
}
export function flushLocalBufferForExercise(exName) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_BUFFER);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return;
    delete parsed.data[exName];
    localStorage.setItem(LOCAL_KEY_BUFFER, JSON.stringify(parsed));
  } catch {}
}
