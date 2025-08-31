"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  Dumbbell, Plus, Search, Filter, Play, Eye, X, Edit, Trash2,
  CheckCircle2, XCircle, Layers, Settings, RefreshCcw, Rows, LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/site/UI";
import { Modal, StatCard, StatusPill } from "@/components/dashboard/ui/UI";

const spring = { type: "spring", stiffness: 360, damping: 30, mass: 0.7 };

/* ---------------- Mock API ---------------- */
const CATEGORIES = ["Strength", "Hypertrophy", "Mobility", "Cardio"];
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];
const DIFFICULTY = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT = ["Bodyweight", "Dumbbell", "Barbell", "Cable", "Machine", "Kettlebell", "Band"];
const STATUS = ["Active", "Inactive"];

const mockExercises = [
  {
    id: 101,
    name: "Barbell Bench Press",
    category: "Strength",
    primaryMuscles: ["Chest", "Triceps"],
    secondaryMuscles: ["Shoulders"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    status: "Active",
    video: "https://wger.de/media/exercise-video/512/fff4c294-93f0-4926-b3a2-bf59ad4afaa5.MOV",
    createdAt: "2023-10-03",
  },
  {
    id: 102,
    name: "Lat Pulldown",
    category: "Hypertrophy",
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps"],
    equipment: "Machine",
    difficulty: "Beginner",
    status: "Active",
    video: "https://wger.de/media/exercise-video/507/307e7276-a14d-4ea0-b579-f5b0dbc6f5af.MOV",
    createdAt: "2024-01-12",
  },
  {
    id: 103,
    name: "Squat",
    category: "Strength",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Advanced",
    status: "Inactive",
    video: "https://wger.de/media/exercise-video/348/de69928a-8a35-4096-821c-1f46de5e0e03.MOV",
    createdAt: "2023-07-21",
  },
  {
    id: 104,
    name: "Plank",
    category: "Mobility",
    primaryMuscles: ["Core"],
    secondaryMuscles: [],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    status: "Active",
    video: "",
    createdAt: "2024-04-08",
  },
];

const fetchExercises = () =>
  new Promise((res) => setTimeout(() => res(mockExercises), 1000));

 
/* ---------------- Page ---------------- */
export default function ExercisesPage() {
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [muscle, setMuscle] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [equipment, setEquip] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState([]);

  const [view, setView] = useState("table"); // "grid" | "table"
  const [preview, setPreview] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchExercises().then((data) => {
      setExercises(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let data = exercises.slice();
    const s = search.toLowerCase();
    if (s) {
      data = data.filter((e) =>
        [e.name, e.category, e.equipment, e.difficulty, ...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])]
          .join(" ")
          .toLowerCase()
          .includes(s)
      );
    }
    if (cat !== "All") data = data.filter((e) => e.category === cat);
    if (muscle !== "All") data = data.filter((e) => e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle));
    if (difficulty !== "All") data = data.filter((e) => e.difficulty === difficulty);
    if (equipment !== "All") data = data.filter((e) => e.equipment === equipment);
    if (status !== "All") data = data.filter((e) => e.status === status);
    return data;
  }, [exercises, search, cat, muscle, difficulty, equipment, status]);

  const columns = [
    { header: "Exercise", accessor: "name", sortable: true },
    { header: "Category", accessor: "category", sortable: true },
    {
      header: "Muscles",
      accessor: "primaryMuscles",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.primaryMuscles.map((m) => (
            <Badge key={m} color="blue">{m}</Badge>
          ))}
          {row.secondaryMuscles.length ? <span className="text-xs text-slate-500">·</span> : null}
          {row.secondaryMuscles.map((m) => (
            <Badge key={m} color="slate">{m}</Badge>
          ))}
        </div>
      ),
    },
    { header: "Equipment", accessor: "equipment", sortable: true },
    { header: "Difficulty", accessor: "difficulty", sortable: true },
    { header: "Status", accessor: "status", cell: (r) => <StatusPill status={r.status} /> },
    { header: "Created", accessor: "createdAt", sortable: true },
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
          <button onClick={() => setExercises((arr) => arr.filter((x) => x.id !== row.id))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      ),
    },
  ];

  const allIds = filtered.map((e) => e.id);
  const onToggleRow = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const onToggleAll = (ids) => setSelected((prev) => (prev.length === ids.length ? [] : ids));

  const bulkActivate = () => { setExercises((arr) => arr.map((e) => selected.includes(e.id) ? { ...e, status: "Active" } : e)); setSelected([]); };
  const bulkDeactivate = () => { setExercises((arr) => arr.map((e) => selected.includes(e.id) ? { ...e, status: "Inactive" } : e)); setSelected([]); };
  const bulkDelete = () => { setExercises((arr) => arr.filter((e) => !selected.includes(e.id))); setSelected([]); };
  const refresh = () => { setLoading(true); setSelected([]); fetchExercises().then((d) => { setExercises(d); setLoading(false); }); };

  const kpiTotal = exercises.length;
  const kpiActive = exercises.filter((e) => e.status === "Active").length;
  const kpiStrength = exercises.filter((e) => e.category === "Strength").length;
  const kpiBeginner = exercises.filter((e) => e.difficulty === "Beginner").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={spring}
            className="h-10 w-10 grid place-content-center rounded-xl bg-main shadow-md">
            <Dumbbell className="w-5 h-5" />
          </motion.div>
        <div>
          <h1 className="text-2xl font-semibold">Exercises</h1>
          <p className="text-sm text-slate-600">Manage your gym’s exercise library.</p>
        </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(view === "table" ? "grid" : "table")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
            {view === "table" ? <LayoutGrid className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
            {view === "table" ? "Grid" : "Table"}
          </button>
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-main text-white">
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Layers} title="Total" value={kpiTotal} sub={`${kpiStrength} Strength`} />
        <StatCard icon={CheckCircle2} title="Active" value={kpiActive} sub={`${((kpiActive/Math.max(1,kpiTotal))*100).toFixed(0)}%`} />
        <StatCard icon={Settings} title="Beginner Friendly" value={kpiBeginner} />
        <StatCard icon={RefreshCcw} title="Pending Review" value={exercises.filter(e=>e.status!=="Active").length} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 lg:min-w-[320px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, muscle, equipment…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select value={cat} setValue={setCat} label="Category" options={["All", ...CATEGORIES]} />
            <Select value={muscle} setValue={setMuscle} label="Muscle" options={["All", ...MUSCLES]} />
            <Select value={difficulty} setValue={setDifficulty} label="Difficulty" options={["All", ...DIFFICULTY]} />
            <Select value={equipment} setValue={setEquip} label="Equipment" options={["All", ...EQUIPMENT]} />
            <Select value={status} setValue={setStatus} label="Status" options={["All", ...STATUS]} />
            <button onClick={refresh} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="blue">{selected.length} selected</Badge>
                <button onClick={bulkActivate} className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Activate
                </button>
                <button onClick={bulkDeactivate} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 inline-flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Deactivate
                </button>
                <button onClick={bulkDelete} className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content */}
      {view === "table" ? (
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
            initialSort={{ key: "name", dir: "asc" }}
            onRowClick={(row) => setPreview(row)}
          />
        </div>
      ) : (
        <GridView loading={loading} items={filtered} onView={setPreview} onEdit={setEditRow} onDelete={(id)=>setExercises(arr=>arr.filter(x=>x.id!==id))} />
      )}

      {/* Preview Drawer */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || "Preview"} maxW="max-w-3xl">
        {preview && <ExercisePreview exercise={preview} />}
      </Modal>

      {/* Add / Edit Modals */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Exercise">
        <ExerciseForm
          onSubmit={(payload) => {
            setExercises(arr => [{ id: Date.now(), ...payload }, ...arr]);
            setAddOpen(false);
          }}
        />
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ""}`}>
        {editRow && (
          <ExerciseForm
            initial={editRow}
            onSubmit={(payload) => {
              setExercises(arr => arr.map(e => e.id === editRow.id ? { ...e, ...payload } : e));
              setEditRow(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

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

function GridView({ loading, items, onView, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-glow p-4 animate-pulse">
            <div className="h-40 rounded-xl bg-slate-200 mb-3" />
            <div className="h-4 rounded bg-slate-200 w-2/3 mb-2" />
            <div className="h-3 rounded bg-slate-200 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="card-glow p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 grid place-content-center">
          <Dumbbell className="w-7 h-7 text-slate-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No exercises found</h3>
        <p className="text-sm text-slate-600 mt-1">Adjust filters or add a new exercise.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((e) => (
        <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
          <div className="aspect-video rounded-xl bg-slate-100 grid place-content-center overflow-hidden mb-3">
            {e.video ? (
              <video src={e.video} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <Play className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{e.name}</div>
              <div className="text-xs text-slate-500">{e.category} · {e.equipment} · {e.difficulty}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {e.primaryMuscles.map((m) => <Badge key={m} color="blue">{m}</Badge>)}
                {e.secondaryMuscles.map((m) => <Badge key={m}>{m}</Badge>)}
              </div>
            </div>
            <StatusPill status={e.status} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => onView(e)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
              <Eye className="w-4 h-4" /> View
            </button>
            <button onClick={() => onEdit(e)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={() => onDelete(e.id)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ExercisePreview({ exercise }) {
  return (
    <div className="space-y-4">
      <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 grid place-content-center">
        {exercise.video ? (
          <video src={exercise.video} controls className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-400 text-sm">No video</div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{exercise.name}</div>
          <div className="text-sm text-slate-600">{exercise.category} · {exercise.equipment} · {exercise.difficulty}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {exercise.primaryMuscles.map((m) => <Badge key={m} color="blue">{m}</Badge>)}
            {exercise.secondaryMuscles.map((m) => <Badge key={m}>{m}</Badge>)}
          </div>
        </div>
        <StatusPill status={exercise.status} />
      </div>
      <div className="text-sm text-slate-600">Created at: {exercise.createdAt}</div>
      <div className="text-sm text-slate-600">Tip: add instructions, tempo, reps ranges, and coaching cues here.</div>
    </div>
  );
}

function ExerciseForm({ initial, onSubmit }) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const payload = {
        name: f.get("name"),
        category: f.get("category"),
        primaryMuscles: (f.get("primaryMuscles") || "").split(",").map(s=>s.trim()).filter(Boolean),
        secondaryMuscles: (f.get("secondaryMuscles") || "").split(",").map(s=>s.trim()).filter(Boolean),
        equipment: f.get("equipment"),
        difficulty: f.get("difficulty"),
        status: f.get("status"),
        video: f.get("video"),
        createdAt: initial?.createdAt || new Date().toISOString().slice(0,10),
      };
      onSubmit?.(payload);
    }} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name"><input name="name" defaultValue={initial?.name||""} required className="inp" /></Field>
        <Field label="Category"><SelectNative name="category" options={CATEGORIES} defaultValue={initial?.category} /></Field>
        <Field label="Primary Muscles (comma separated)">
          <input name="primaryMuscles" defaultValue={initial?.primaryMuscles?.join(", ")||""} className="inp" placeholder="Chest, Triceps" />
        </Field>
        <Field label="Secondary Muscles (comma separated)">
          <input name="secondaryMuscles" defaultValue={initial?.secondaryMuscles?.join(", ")||""} className="inp" placeholder="Shoulders" />
        </Field>
        <Field label="Equipment"><SelectNative name="equipment" options={EQUIPMENT} defaultValue={initial?.equipment} /></Field>
        <Field label="Difficulty"><SelectNative name="difficulty" options={DIFFICULTY} defaultValue={initial?.difficulty} /></Field>
        <Field label="Status"><SelectNative name="status" options={STATUS} defaultValue={initial?.status||"Active"} /></Field>
        <Field label="Video URL (optional)"><input name="video" defaultValue={initial?.video||""} className="inp" placeholder="https://..." /></Field>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
      </div>
      <style jsx>{`
        .inp { @apply mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </form>
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
function SelectNative({ name, options, defaultValue }) {
  return (
    <select name={name} defaultValue={defaultValue} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
