"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, EmptyState, RingProgress, ProgressBar,
  NumberStepper, RestTimer, spring
} from "@/components/dashboard/ui/UI";
import {
  Dumbbell, Play, Save, Plus, Trophy, History as HistoryIcon, Flame, ClipboardList
} from "lucide-react";

/* ====== Mock seed data (swap with API) ====== */
const seedPlanToday = {
  id: "W-2025-08-31",
  name: "Lower Body Strength (W3 • D1)",
  restSeconds: 90,
  exercises: [
    { id:"ex1", name:"Back Squat",       targetSets:5, targetReps:"5",   rest:120 },
    { id:"ex2", name:"Romanian Deadlift",targetSets:4, targetReps:"8",   rest:90  },
    { id:"ex3", name:"Walking Lunges",   targetSets:3, targetReps:"12e", rest:60  },
    { id:"ex4", name:"Calf Raise",       targetSets:3, targetReps:"15",  rest:45  },
  ],
};

const seedHistory = [
  { id:"S-1", date:"2025-08-27", name:"Upper Push (W3•D2)", volume: 13240, duration: "00:48", setsDone: 13, setsTotal: 13 },
  { id:"S-2", date:"2025-08-25", name:"Lower Body (W3•D1)", volume: 18760, duration: "00:55", setsDone: 15, setsTotal: 15 },
];

/* ====== Utilities ====== */
const epley = (w, r) => Math.round(w * (1 + r/30)); // estimated 1RM
const vol = (w, r) => (w*r);

export default function MyWorkoutsPage(){
  const [tab, setTab] = useState("today"); // today | history | prs
  const [loading, setLoading] = useState(true);

  // preference: RPE or RIR
  const [effortMode, setEffortMode] = useState("RPE"); // or "RIR"

  // live session
  const [workout, setWorkout] = useState(null);
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState({}); // { [exerciseName]: { e1rm, weight, reps, date } }

  useEffect(() => {
    setLoading(true);
    setTimeout(()=>{
      // Build today’s session with empty set logs
      const session = {
        ...seedPlanToday,
        startedAt: null,
        sets: seedPlanToday.exercises.flatMap(ex => (
          Array.from({ length: ex.targetSets }).map((_,i) => ({
            id: `${ex.id}-set${i+1}`,
            exId: ex.id,
            exName: ex.name,
            set: i+1,
            targetReps: ex.targetReps,
            weight: 0,
            reps: 0,
            effort: null, // RPE or RIR depending on effortMode
            done: false,
            pr: false,
          }))
        )),
      };
      setWorkout(session);
      setHistory(seedHistory);
      setLoading(false);
    }, 400);
  }, []);

  const exercises = useMemo(() => seedPlanToday.exercises, []);
  const setsFor = (exId) => workout?.sets.filter(s => s.exId===exId) || [];

  const completionPct = useMemo(() => {
    if (!workout) return 0;
    const t = workout.sets.length;
    const d = workout.sets.filter(s => s.done).length;
    return Math.round((d/Math.max(1,t))*100);
  }, [workout]);

  const totalVolume = useMemo(() => workout?.sets.filter(s=>s.done).reduce((a,s)=>a+vol(s.weight||0, s.reps||0),0) || 0, [workout]);

  function startWorkout(){
    setWorkout(w => w?.startedAt ? w : { ...w, startedAt: new Date().toISOString() });
    setTab("today");
  }

  function setField(setId, field, value){
    setWorkout(w => ({ ...w, sets: w.sets.map(s => s.id===setId ? { ...s, [field]: value } : s) }));
  }

  function toggleDone(setId){
    setWorkout(w => {
      const next = { ...w, sets: w.sets.map(s => s.id===setId ? { ...s, done: !s.done } : s) };
      // when marking done, compute PR
      const s = next.sets.find(x => x.id===setId);
      if (s && !s.pr && s.done && s.weight>0 && s.reps>0){
        const e1rm = epley(s.weight, s.reps);
        const prev = prs[s.exName];
        const isPR = !prev || e1rm > prev.e1rm;
        if (isPR){
          setPRs(p => ({ ...p, [s.exName]: { e1rm, weight:s.weight, reps:s.reps, date: today() } }));
          // tag the set visually
          next.sets = next.sets.map(x => x.id===setId ? { ...x, pr: true } : x);
        }
      }
      return next;
    });
  }

  function addSet(ex){
    setWorkout(w => ({
      ...w,
      sets: [
        ...w.sets,
        {
          id: `${ex.id}-set${setsFor(ex.id).length+1}-${Date.now()}`,
          exId: ex.id,
          exName: ex.name,
          set: setsFor(ex.id).length+1,
          targetReps: ex.targetReps,
          weight: 0, reps: 0, effort: null, done: false, pr: false
        }
      ]
    }));
  }

  function finishAndSave(){
    const duration = workout.startedAt
      ? hhmmss(Date.now() - new Date(workout.startedAt).getTime())
      : "00:00";
    const setsDone = workout.sets.filter(s => s.done).length;
    const setsTotal = workout.sets.length;
    const record = {
      id: "S-"+Date.now(),
      date: today(),
      name: workout.name,
      volume: totalVolume,
      duration,
      setsDone,
      setsTotal,
      details: workout.sets
    };
    setHistory(h => [record, ...h]);
  }

  /* ===== tables ===== */
  const histCols = [
    { header: "Date", accessor: "date" },
    { header: "Workout", accessor: "name" },
    { header: "Volume", accessor: "volume", cell: r => <span className="tabular-nums">{r.volume.toLocaleString()} kg·reps</span> },
    { header: "Duration", accessor: "duration" },
    { header: "Sets", accessor: "setsDone", cell: r => <span className="tabular-nums">{r.setsDone}/{r.setsTotal}</span> },
  ];

  const prRows = useMemo(() => {
    return Object.entries(prs).map(([exName, v]) => ({
      exercise: exName,
      e1rm: v.e1rm,
      best: `${v.weight} × ${v.reps}`,
      date: v.date
    })).sort((a,b)=> b.e1rm - a.e1rm);
  }, [prs]);

  const prCols = [
    { header: "Exercise", accessor: "exercise" },
    { header: "Est. 1RM", accessor: "e1rm", cell: r => <strong className="tabular-nums">{r.e1rm} kg</strong> },
    { header: "Best Set", accessor: "best" },
    { header: "Date", accessor: "date" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Dumbbell}
        title="My Workouts"
        subtitle="Log sets with RPE/RIR and track PRs automatically."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={ClipboardList} variant="secondary" onClick={()=>setTab("history")}>History</ToolbarButton>
            <ToolbarButton icon={Trophy} variant="secondary" onClick={()=>setTab("prs")}>PRs</ToolbarButton>
            <ToolbarButton icon={Play} onClick={startWorkout}>Start</ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="my-workouts-tabs"
        tabs={[
          { key:"today",   label:"Today",   icon: Dumbbell },
          { key:"history", label:"History", icon: HistoryIcon },
          { key:"prs",     label:"PRs",     icon: Trophy },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== TODAY ===== */}
      {tab==="today" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}>
          {loading ? (
            <div className="space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : workout ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RingProgress value={completionPct}>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500">Done</div>
                      <div className="text-sm font-semibold">{completionPct}%</div>
                    </div>
                  </RingProgress>
                  <div>
                    <div className="font-semibold">{workout.name}</div>
                    <div className="text-xs text-slate-500">Volume: <span className="tabular-nums">{totalVolume.toLocaleString()}</span> kg·reps</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="inp w-[140px]" value={effortMode} onChange={(e)=>setEffortMode(e.target.value)}>
                    <option>RPE</option>
                    <option>RIR</option>
                  </select>
                  <ToolbarButton icon={Save} onClick={finishAndSave}>Save Session</ToolbarButton>
                </div>
              </div>

              {/* Exercises */}
              <div className="space-y-4">
                {exercises.map(ex => (
                  <div key={ex.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{ex.name}</div>
                        <div className="text-xs text-slate-500">Target: {ex.targetSets} × {ex.targetReps}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <RestTimer initial={ex.rest ?? workout.restSeconds} />
                        <button className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white hover:bg-slate-50" onClick={()=>addSet(ex)}><Plus className="w-3 h-3 inline-block mr-1" /> Add set</button>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-2 pr-3">Set</th>
                            <th className="py-2 pr-3">Weight (kg)</th>
                            <th className="py-2 pr-3">Reps</th>
                            <th className="py-2 pr-3">{effortMode}</th>
                            <th className="py-2 pr-3">e1RM</th>
                            <th className="py-2 pr-3">PR</th>
                            <th className="py-2 pr-3">Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {setsFor(ex.id).map(s => {
                            const e1rm = s.weight && s.reps ? epley(s.weight, s.reps) : 0;
                            return (
                              <tr key={s.id} className="border-t border-slate-100">
                                <td className="py-2 pr-3">{s.set}</td>
                                <td className="py-2 pr-3">
                                  <input type="number" min={0} className="inp h-8 w-28" value={s.weight} onChange={(e)=>setField(s.id, "weight", +e.target.value)} />
                                </td>
                                <td className="py-2 pr-3">
                                  <input type="number" min={0} className="inp h-8 w-24" value={s.reps} onChange={(e)=>setField(s.id, "reps", +e.target.value)} />
                                </td>
                                <td className="py-2 pr-3">
                                  <input type="number" step={effortMode==="RPE"?0.5:1} min={effortMode==="RPE"?5:0} max={effortMode==="RPE"?10:6} className="inp h-8 w-24"
                                    value={s.effort ?? ""} onChange={(e)=>setField(s.id, "effort", e.target.value===""?null:+e.target.value)} placeholder={effortMode==="RPE"?"6–10":"0–5"} />
                                </td>
                                <td className="py-2 pr-3 tabular-nums">{e1rm ? `${e1rm}` : "—"}</td>
                                <td className="py-2 pr-3">
                                  {s.pr ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">PR</span> : "—"}
                                </td>
                                <td className="py-2 pr-3">
                                  <input type="checkbox" checked={s.done} onChange={()=>toggleDone(s.id)} className="w-4 h-4 rounded border-slate-300" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No workout loaded" subtitle="Start a workout or assign a plan." />
          )}
        </motion.div>
      )}

      {/* ===== HISTORY ===== */}
      {tab==="history" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Session History</div>
          </div>
          <div className="mt-3">
            <DataTable columns={histCols} data={history} loading={loading} pagination itemsPerPage={8} />
            {!loading && !history.length && <EmptyState title="No sessions yet" subtitle="Log your first workout to see history here." />}
          </div>
        </motion.div>
      )}

      {/* ===== PRs ===== */}
      {tab==="prs" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Personal Records</div>
            <div className="mt-3">
              <DataTable columns={prCols} data={prRows} loading={loading} pagination itemsPerPage={10} />
              {!loading && !prRows.length && <EmptyState title="No PRs yet" subtitle="Hit a new top set to record a PR." />}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Tips</div>
            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1 mt-2">
              <li><strong>RPE</strong>: 10 = max, 6 = easy. <strong>RIR</strong>: reps left in tank (0–5).</li>
              <li>PRs use Epley est. 1RM: <code>weight × (1 + reps/30)</code>.</li>
              <li>Add sets or adjust rest per exercise as needed.</li>
            </ul>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        .inp { @apply w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );
}

/* ===== small helpers ===== */
function today(){ return new Date().toISOString().slice(0,10); }
function hhmmss(ms){
  const s = Math.max(0, Math.floor(ms/1000)); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
