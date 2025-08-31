"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  Dumbbell, Plus, Search, Filter, Eye, X, Edit, Trash2, Copy, Users, CheckCircle2, XCircle,
  Layers, Settings, RefreshCcw, Calendar, Clock, Save, ListPlus
} from "lucide-react";

const spring = { type: "spring", stiffness: 360, damping: 30, mass: 0.7 };

/* ---------------- Mock API ---------------- */
const GOALS = ["Hypertrophy", "Strength", "Fat Loss", "General Fitness", "Mobility"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STATUS = ["Active", "Draft", "Archived"];

const mockPlans = [
  {
    id: 201,
    name: "Push/Pull/Legs – 6 Weeks",
    goal: "Hypertrophy",
    level: "Intermediate",
    durationWeeks: 6,
    sessionsPerWeek: 6,
    exercisesCount: 54,
    status: "Active",
    updatedAt: "2025-07-28",
    structure: sampleStructure(6, [ "Push", "Pull", "Legs", "Push", "Pull", "Legs", "Rest" ]),
  },
  {
    id: 202,
    name: "Full Body – 3 Days",
    goal: "Strength",
    level: "Beginner",
    durationWeeks: 8,
    sessionsPerWeek: 3,
    exercisesCount: 36,
    status: "Draft",
    updatedAt: "2025-06-10",
    structure: sampleStructure(8, [ "Full Body", "Rest", "Full Body", "Rest", "Full Body", "Rest", "Rest" ]),
  },
  {
    id: 203,
    name: "Fat Loss Circuit – 4 Weeks",
    goal: "Fat Loss",
    level: "Beginner",
    durationWeeks: 4,
    sessionsPerWeek: 5,
    exercisesCount: 40,
    status: "Active",
    updatedAt: "2025-08-05",
    structure: sampleStructure(4, [ "Circuit A", "Circuit B", "LISS Cardio", "Circuit A", "Circuit B", "Mobility", "Rest" ]),
  },
];

function sampleStructure(weeks, weekPattern) {
  // returns: [{week:1, days:[{name, exercises:[{name, sets, reps, rest, tempo}], note}]}]
  const ex = (name) => ({ name, sets: 4, reps: "8–12", rest: "90s", tempo: "2-0-2" });
  const day = (n) => ({
    name: n,
    note: "",
    exercises: [ex("Barbell Bench Press"), ex("Lat Pulldown"), ex("Back Squat"), ex("Plank")],
  });
  return Array.from({ length: weeks }).map((_, w) => ({
    week: w + 1,
    days: weekPattern.map((label) => day(label)),
  }));
}
const fetchPlans = () => new Promise((res) => setTimeout(() => res(mockPlans), 1000));

/* ---------------- Little atoms ---------------- */
function Badge({ color = "slate", children }) {
  const map = {
    green: "bg-green-100 text-green-700 ring-green-600/10",
    red: "bg-red-100 text-red-700 ring-red-600/10",
    blue: "bg-blue-100 text-blue-700 ring-blue-600/10",
    indigo: "bg-indigo-100 text-indigo-700 ring-indigo-600/10",
    amber: "bg-amber-100 text-amber-800 ring-amber-600/10",
    slate: "bg-slate-100 text-slate-700 ring-slate-600/10",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color]}`}>{children}</span>;
}
const StatusPill = ({ status }) => {
  const map = { Active: "green", Draft: "amber", Archived: "slate" };
  return <Badge color={map[status] || "slate"}>{status}</Badge>;
};
function StatCard({ icon: Icon, title, value, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white grid place-content-center shadow-md">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-600">{title}</div>
          <div className="text-xl font-semibold">{value}</div>
          {sub ? <div className="text-xs text-slate-500 mt-0.5">{sub}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}
function Modal({ open, onClose, title, children, maxW = "max-w-3xl" }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="fixed z-50 inset-0 grid place-items-center p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={spring}>
            <div className={`w-full ${maxW} card-glow p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button onClick={onClose} className="w-9 h-9 rounded-lg border border-slate-200 grid place-content-center bg-white hover:bg-slate-50">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Page ---------------- */
export default function WorkoutPlansPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);

  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState("All");
  const [level, setLevel] = useState("All");
  const [status, setStatus] = useState("All");
  const [minWeeks, setMinWeeks] = useState("");
  const [maxWeeks, setMaxWeeks] = useState("");

  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null);
  const [editRow, setEditRow] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchPlans().then((data) => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let data = plans.slice();
    const s = search.toLowerCase();
    if (s) data = data.filter((p) => [p.name, p.goal, p.level, p.status].join(" ").toLowerCase().includes(s));
    if (goal !== "All") data = data.filter((p) => p.goal === goal);
    if (level !== "All") data = data.filter((p) => p.level === level);
    if (status !== "All") data = data.filter((p) => p.status === status);
    if (minWeeks) data = data.filter((p) => p.durationWeeks >= Number(minWeeks));
    if (maxWeeks) data = data.filter((p) => p.durationWeeks <= Number(maxWeeks));
    return data;
  }, [plans, search, goal, level, status, minWeeks, maxWeeks]);

  const columns = [
    { header: "Plan", accessor: "name", sortable: true },
    { header: "Goal", accessor: "goal", sortable: true },
    { header: "Level", accessor: "level", sortable: true },
    { header: "Weeks", accessor: "durationWeeks", sortable: true },
    { header: "Sessions/Wk", accessor: "sessionsPerWeek", sortable: true },
    { header: "Exercises", accessor: "exercisesCount", sortable: true },
    { header: "Status", accessor: "status", cell: (r) => <StatusPill status={r.status} /> },
    { header: "Updated", accessor: "updatedAt", sortable: true },
    {
      header: "Actions",
      accessor: "_actions",
      disableSort: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Eye className="w-4 h-4" /> View
          </button>
          <button onClick={() => setEditRow(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => duplicatePlan(row, setPlans)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button onClick={() => setAssignOpen(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Users className="w-4 h-4" /> Assign
          </button>
          <button onClick={() => setPlans((arr) => arr.filter((x) => x.id !== row.id))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      ),
    },
  ];

  const allIds = filtered.map((p) => p.id);
  const onToggleRow = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const onToggleAll = (ids) => setSelected((prev) => (prev.length === ids.length ? [] : ids));

  const bulkActivate = () => setPlans(arr => arr.map(p => selected.includes(p.id) ? { ...p, status: "Active" } : p));
  const bulkArchive  = () => setPlans(arr => arr.map(p => selected.includes(p.id) ? { ...p, status: "Archived" } : p));
  const bulkDelete   = () => setPlans(arr => arr.filter(p => !selected.includes(p.id)));
  const refresh = () => { setLoading(true); setSelected([]); fetchPlans().then(d => { setPlans(d); setLoading(false); }); };

  // KPIs
  const kpiTotal = plans.length;
  const kpiActive = plans.filter(p => p.status === "Active").length;
  const kpiBeginner = plans.filter(p => p.level === "Beginner").length;
  const kpiAvgWeeks = Math.round((plans.reduce((a,p)=>a+p.durationWeeks,0)/Math.max(1,kpiTotal)) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={spring}
            className="h-10 w-10 grid place-content-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md">
            <Calendar className="w-5 h-5" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-semibold">Workout Plans</h1>
            <p className="text-sm text-slate-600">Design, assign, and track periodized plans.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBuilderOpen(true)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Layers} title="Total Plans" value={kpiTotal} sub={`${kpiActive} Active`} />
        <StatCard icon={CheckCircle2} title="Beginner Plans" value={kpiBeginner} />
        <StatCard icon={Clock} title="Avg Duration" value={`${kpiAvgWeeks || 0} weeks`} />
        <StatCard icon={RefreshCcw} title="Draft/Archived" value={plans.filter(p=>p.status!=="Active").length} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 lg:min-w-[320px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, goal, level…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select label="Goal" value={goal} setValue={setGoal} options={["All", ...GOALS]} />
            <Select label="Level" value={level} setValue={setLevel} options={["All", ...LEVELS]} />
            <Select label="Status" value={status} setValue={setStatus} options={["All", ...STATUS]} />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500">Weeks</span>
              <input type="number" placeholder="min" value={minWeeks} onChange={(e)=>setMinWeeks(e.target.value)} className="w-16 outline-none" />
              <span className="text-slate-400">—</span>
              <input type="number" placeholder="max" value={maxWeeks} onChange={(e)=>setMaxWeeks(e.target.value)} className="w-16 outline-none" />
            </div>
            <button onClick={refresh} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-top border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="blue">{selected.length} selected</Badge>
                <button onClick={bulkActivate} className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Activate
                </button>
                <button onClick={bulkArchive} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 inline-flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Archive
                </button>
                <button onClick={bulkDelete} className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Table */}
      <div className="card-glow">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          itemsPerPage={8}
          pagination
          selectable
          selectedIds={selected}
          onToggleRow={onToggleRow}
          onToggleAll={onToggleAll}
          onRowClick={(row) => setPreview(row)}
          initialSort={{ key: "updatedAt", dir: "desc" }}
        />
      </div>

      {/* Preview Drawer */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || "Plan"}>
        {preview && <PlanPreview plan={preview} />}
      </Modal>

      {/* Builder (Create) */}
      <Modal open={builderOpen} onClose={() => setBuilderOpen(false)} title="Create Workout Plan" maxW="max-w-4xl">
        <PlanBuilder
          onSubmit={(plan) => {
            const id = Date.now();
            setPlans(arr => [{ id, exercisesCount: countExercises(plan.structure), updatedAt: today(), status: "Draft", ...plan }, ...arr]);
            setBuilderOpen(false);
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ""}`} maxW="max-w-4xl">
        {editRow && (
          <PlanBuilder
            initial={editRow}
            onSubmit={(plan) => {
              setPlans(arr => arr.map(p => p.id === editRow.id ? { ...p, ...plan, updatedAt: today(), exercisesCount: countExercises(plan.structure) } : p));
              setEditRow(null);
            }}
          />
        )}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign: ${assignOpen?.name || ""}`}>
        <AssignForm
          onSubmit={(payload) => {
            console.log("assign", { planId: assignOpen.id, ...payload });
            setAssignOpen(null);
          }}
        />
      </Modal>
    </div>
  );

}
function onToggleRow(id) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
function onToggleAll(ids) { setSelected(prev => prev.length === ids.length ? [] : ids); }

/* ---------------- Subcomponents ---------------- */

function Select({ value, setValue, label, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <select value={value} onChange={(e) => setValue(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function PlanPreview({ plan }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Goal" value={plan.goal} />
        <Info title="Level" value={plan.level} />
        <Info title="Weeks" value={plan.durationWeeks} />
        <Info title="Sessions/Wk" value={plan.sessionsPerWeek} />
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-auto">
        {plan.structure.map((w) => (
          <div key={w.week} className="rounded-xl border border-slate-200">
            <div className="px-3 py-2 bg-slate-50 rounded-t-xl text-sm font-semibold">Week {w.week}</div>
            <div className="divide-y">
              {w.days.map((d, i) => (
                <div key={i} className="p-3">
                  <div className="font-medium">{d.name}</div>
                  {d.note ? <div className="text-xs text-slate-500">{d.note}</div> : null}
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {d.exercises.map((e, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 p-2">
                        <div className="text-sm font-medium">{e.name}</div>
                        <div className="text-xs text-slate-600">Sets: {e.sets} · Reps: {e.reps} · Rest: {e.rest} · Tempo: {e.tempo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function PlanBuilder({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [goal, setGoal] = useState(initial?.goal || GOALS[0]);
  const [level, setLevel] = useState(initial?.level || LEVELS[0]);
  const [status, setStatus] = useState(initial?.status || "Draft");
  const [durationWeeks, setWeeks] = useState(initial?.durationWeeks || 4);
  const [sessionsPerWeek, setSessions] = useState(initial?.sessionsPerWeek || 4);
  const [structure, setStructure] = useState(initial?.structure || sampleStructure(durationWeeks, defaultWeekPattern()));

  // keep structure weeks synced
  useEffect(() => {
    setStructure((prev) => {
      const diff = durationWeeks - prev.length;
      if (diff > 0) return [...prev, ...sampleStructure(diff, defaultWeekPattern())];
      if (diff < 0) return prev.slice(0, durationWeeks);
      return prev;
    });
  }, [durationWeeks]);

  function defaultWeekPattern() {
    return ["Day 1", "Day 2", "Day 3", "Day 4", "Rest", "Rest", "Rest"];
  }

  function addExercise(wi, di) {
    setStructure(s => {
      const cp = structuredClone(s);
      cp[wi].days[di].exercises.push({ name: "New Exercise", sets: 3, reps: "10", rest: "60s", tempo: "2-0-2" });
      return cp;
    });
  }
  function updateExercise(wi, di, ei, patch) {
    setStructure(s => {
      const cp = structuredClone(s);
      cp[wi].days[di].exercises[ei] = { ...cp[wi].days[di].exercises[ei], ...patch };
      return cp;
    });
  }
  function removeExercise(wi, di, ei) {
    setStructure(s => {
      const cp = structuredClone(s);
      cp[wi].days[di].exercises.splice(ei,1);
      return cp;
    });
  }
  function renameDay(wi, di, name) {
    setStructure(s => {
      const cp = structuredClone(s);
      cp[wi].days[di].name = name;
      return cp;
    });
  }
  function setNote(wi, di, note) {
    setStructure(s => {
      const cp = structuredClone(s);
      cp[wi].days[di].note = note;
      return cp;
    });
  }

  const payload = {
    name, goal, level, durationWeeks: Number(durationWeeks), sessionsPerWeek: Number(sessionsPerWeek),
    status, structure,
  };

  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit?.(payload);}} className="space-y-4">
      {/* Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Plan Name">
          <input value={name} onChange={(e)=>setName(e.target.value)} required className="inp" placeholder="e.g., Upper/Lower – 8 Weeks" />
        </Field>
        <Field label="Goal"><SelectNative value={goal} setValue={setGoal} options={GOALS} /></Field>
        <Field label="Level"><SelectNative value={level} setValue={setLevel} options={LEVELS} /></Field>
        <Field label="Status"><SelectNative value={status} setValue={setStatus} options={STATUS} /></Field>
        <Field label="Duration (weeks)"><input type="number" min="1" value={durationWeeks} onChange={(e)=>setWeeks(e.target.value)} className="inp" /></Field>
        <Field label="Sessions per week"><input type="number" min="1" value={sessionsPerWeek} onChange={(e)=>setSessions(e.target.value)} className="inp" /></Field>
      </div>

      {/* Structure */}
      <div className="space-y-3 max-h-[55vh] overflow-auto">
        {structure.map((w, wi) => (
          <div key={wi} className="rounded-xl border border-slate-200">
            <div className="px-3 py-2 bg-slate-50 rounded-t-xl text-sm font-semibold">Week {w.week}</div>
            <div className="p-3 space-y-3">
              {w.days.map((d, di) => (
                <div key={di} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <input value={d.name} onChange={(e)=>renameDay(wi, di, e.target.value)} className="w-full font-medium outline-none" />
                    <input placeholder="Note…" value={d.note} onChange={(e)=>setNote(wi, di, e.target.value)} className="w-1/2 text-sm text-slate-600 outline-none border-b border-dashed" />
                    <button type="button" onClick={()=>addExercise(wi, di)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                      <ListPlus className="w-4 h-4" /> Add Exercise
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {d.exercises.map((e, ei) => (
                      <div key={ei} className="rounded-lg border border-slate-200 p-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={e.name} onChange={(ev)=>updateExercise(wi,di,ei,{name: ev.target.value})} className="inp" placeholder="Exercise name" />
                          <input value={e.sets} onChange={(ev)=>updateExercise(wi,di,ei,{sets: ev.target.value})} className="inp" placeholder="Sets" />
                          <input value={e.reps} onChange={(ev)=>updateExercise(wi,di,ei,{reps: ev.target.value})} className="inp" placeholder="Reps" />
                          <input value={e.rest} onChange={(ev)=>updateExercise(wi,di,ei,{rest: ev.target.value})} className="inp" placeholder="Rest" />
                          <input value={e.tempo} onChange={(ev)=>updateExercise(wi,di,ei,{tempo: ev.target.value})} className="inp" placeholder="Tempo" />
                          <button type="button" onClick={()=>removeExercise(wi,di,ei)} className="px-2 py-2 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> Save Plan
        </button>
      </div>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </form>
  );
}

function SelectNative({ value, setValue, options }) {
  return (
    <select value={value} onChange={(e)=>setValue(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function AssignForm({ onSubmit }) {
  return (
    <form onSubmit={(e)=>{e.preventDefault(); const f=new FormData(e.currentTarget); onSubmit?.({ userEmail:f.get("email"), startDate:f.get("startDate") }); }} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Client Email"><input name="email" type="email" required className="inp" placeholder="client@example.com" /></Field>
        <Field label="Start Date"><input name="startDate" type="date" required className="inp" /></Field>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white inline-flex items-center gap-2">
          <Users className="w-4 h-4" /> Assign
        </button>
      </div>
      <style jsx>{`.inp { @apply mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }`}</style>
    </form>
  );
}

/* ---------------- Utils ---------------- */
function duplicatePlan(row, setPlans) {
  const copy = {
    ...row,
    id: Date.now(),
    name: `${row.name} (Copy)`,
    status: "Draft",
    updatedAt: today(),
  };
  setPlans((arr)=>[copy, ...arr]);
}
function today() { return new Date().toISOString().slice(0,10); }
function countExercises(structure=[]) {
  return structure.reduce((acc,w)=>acc + w.days.reduce((dAcc,d)=>dAcc + (d.exercises?.length||0),0),0);
}
