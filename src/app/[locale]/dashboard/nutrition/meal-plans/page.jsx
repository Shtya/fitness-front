"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, StatCard, ToolbarButton, SearchInput, Select, RangeControl,
  Modal, StatusPill, EmptyState, MacroBar, spring
} from "@/components/dashboard/ui/UI";
import {
  Calendar, Plus, Upload, Download, RefreshCcw, Eye, Edit, Trash2, Users, ChefHat
} from "lucide-react";
import { motion } from "framer-motion";

/* ---------------- Mock API ---------------- */
const GOALS = ["All","Weight Loss","Muscle Building","Maintenance","Keto","Recomp"];
const STATUS = ["All","Active","Draft"];

const MOCK = [
  { id: 1, name: "Weight Loss Plan", goal: "Weight Loss", status: "Active", calories: 1800, protein: 140, carbs: 180, fat: 50, mealsPerDay: 4, durationDays: 28,
    structure: sampleStructure(28, 4, "Weight Loss Plan")
  },
  { id: 2, name: "Muscle Building", goal: "Muscle Building", status: "Active", calories: 2800, protein: 200, carbs: 300, fat: 80, mealsPerDay: 5, durationDays: 42,
    structure: sampleStructure(42, 5, "Muscle Building")
  },
  { id: 3, name: "Maintenance", goal: "Maintenance", status: "Draft", calories: 2200, protein: 160, carbs: 240, fat: 65, mealsPerDay: 3, durationDays: 21,
    structure: sampleStructure(21, 3, "Maintenance")
  },
  { id: 4, name: "Keto Diet", goal: "Keto", status: "Active", calories: 2000, protein: 150, carbs: 30, fat: 150, mealsPerDay: 3, durationDays: 30,
    structure: sampleStructure(30, 3, "Keto")
  },
];

function sampleStructure(days, mealsPerDay, label) {
  // simple stub structure: [{day:1, meals:[{name, note}]}]
  return Array.from({ length: days }).map((_, i) => ({
    day: i+1,
    meals: Array.from({ length: mealsPerDay }).map((__, m) => ({
      name: `Meal ${m+1}`,
      note: (m===0 && (i%7===0)) ? `Prep ahead for ${label}` : ""
    }))
  }));
}
const fetchPlans = () => new Promise(res => setTimeout(()=>res(MOCK), 900));

/* ---------------- Page ---------------- */
export default function MealPlansPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);

  // filters
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState("All");
  const [status, setStatus] = useState("All");
  const [kMin, setKMin] = useState(""); const [kMax, setKMax] = useState("");

  // selection + modals
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [assignRow, setAssignRow] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchPlans().then((d) => { setPlans(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let data = plans.slice();
    const s = search.toLowerCase();
    if (s) data = data.filter(p => [p.name,p.goal,p.status].join(" ").toLowerCase().includes(s));
    if (goal !== "All") data = data.filter(p => p.goal === goal);
    if (status !== "All") data = data.filter(p => p.status === status);
    const within = (v, min, max) => (min ? v >= +min : true) && (max ? v <= +max : true);
    data = data.filter(p => within(p.calories, kMin, kMax));
    return data;
  }, [plans, search, goal, status, kMin, kMax]);

  // KPIs
  const kpiTotal = plans.length;
  const kpiActive = plans.filter(p=>p.status==="Active").length;
  const kpiAvgKcal = Math.round(plans.reduce((a,p)=>a+p.calories,0)/Math.max(1,plans.length));
  const kpiHighProtein = plans.filter(p => perc(p).pp >= 30).length;

  // columns
  const columns = [
    {
      header: "Meal Plan",
      accessor: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-slate-500">{row.goal} · {row.mealsPerDay} meals/day · {row.durationDays} days</div>
        </div>
      )
    },
    { header: "Kcal", accessor: "calories", sortable: true },
    {
      header: "Macros",
      accessor: "_macros",
      disableSort: true,
      cell: (row) => (
        <div className="min-w-[160px]">
          <MacroBar p={row.protein} c={row.carbs} f={row.fat} />
        </div>
      )
    },
    { header: "P (g)", accessor: "protein", sortable: true },
    { header: "C (g)", accessor: "carbs", sortable: true },
    { header: "F (g)", accessor: "fat", sortable: true },
    {
      header: "Status",
      accessor: "status",
      cell: (r) => <StatusPill status={r.status === "Active" ? "Active" : "Inactive"} />
    },
    {
      header: "Actions",
      accessor: "_actions",
      disableSort: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Eye className="w-4 h-4" /> View
          </button>
          <button onClick={() => setAssignRow(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Users className="w-4 h-4" /> Assign
          </button>
          <button onClick={() => setEditRow(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setPlans(arr => arr.filter(x => x.id !== row.id))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )
    },
  ];

  // selection handlers
  const onToggleRow = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const onToggleAll = (ids) => setSelected(prev => prev.length === ids.length ? [] : ids);

  // actions
  const refresh = () => { setLoading(true); setSelected([]); fetchPlans().then(d => { setPlans(d); setLoading(false); }); };
  const exportCSV = () => {
    const rows = [["id","name","goal","status","calories","protein","carbs","fat","mealsPerDay","durationDays"]];
    filtered.forEach(p => rows.push([p.id,p.name,p.goal,p.status,p.calories,p.protein,p.carbs,p.fat,p.mealsPerDay,p.durationDays]));
    const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="meal-plans.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const importCSV = () => alert("Import CSV not wired in this mock. Connect your uploader/parser.");

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ChefHat}
        title="Meal Plans"
        subtitle="Macros-driven plans to assign to clients or attach to programs."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Upload} onClick={importCSV} variant="secondary">Import</ToolbarButton>
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
            <ToolbarButton icon={Plus} onClick={() => setAddOpen(true)}>Create Meal Plan</ToolbarButton>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar} title="Total Plans" value={kpiTotal} sub={`${kpiActive} Active`} />
        <StatCard icon={RefreshCcw} title="Avg Calories" value={kpiAvgKcal} />
        <StatCard icon={Users} title="High Protein (≥30%)" value={kpiHighProtein} />
        <StatCard icon={ChefHat} title="Drafts" value={plans.filter(p=>p.status!=="Active").length} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by name, goal…" className="w-full lg:min-w-[340px]" />
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select label="Goal" value={goal} setValue={setGoal} options={GOALS} />
            <Select label="Status" value={status} setValue={setStatus} options={STATUS} />
            <RangeControl label="Kcal" vMin={kMin} vMax={kMax} setMin={setKMin} setMax={setKMax} />
            <ToolbarButton icon={RefreshCcw} onClick={refresh} variant="secondary">Refresh</ToolbarButton>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-sm text-slate-600">{selected.length} selected</span>
            <button onClick={() => setPlans(arr => arr.filter(p => !selected.includes(p.id)))} className="ml-2 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
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
          onRowClick={(row)=>setPreview(row)}
          initialSort={{ key: "name", dir: "asc" }}
        />
      </div>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || "Meal Plan"} maxW="max-w-4xl">
        {preview && <MealPlanPreview plan={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Create Meal Plan" maxW="max-w-3xl">
        <MealPlanForm
          onSubmit={(payload) => {
            const id = Date.now();
            setPlans(arr => [{ id, status: "Draft", structure: sampleStructure(payload.durationDays, payload.mealsPerDay, payload.name), ...payload }, ...arr]);
            setAddOpen(false);
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ""}`} maxW="max-w-3xl">
        {editRow && (
          <MealPlanForm
            initial={editRow}
            onSubmit={(payload) => {
              setPlans(arr => arr.map(p => p.id === editRow.id ? { ...p, ...payload } : p));
              setEditRow(null);
            }}
          />
        )}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignRow} onClose={() => setAssignRow(null)} title={`Assign: ${assignRow?.name || ""}`}>
        <AssignForm
          onSubmit={(payload) => {
            console.log("assign meal plan", { planId: assignRow.id, ...payload });
            setAssignRow(null);
          }}
        />
      </Modal>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function MealPlanPreview({ plan }) {
  const { pp, pc, pf } = perc(plan);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Goal" value={plan.goal} />
        <Info title="Kcal" value={plan.calories} />
        <Info title="Meals/Day" value={plan.mealsPerDay} />
        <Info title="Duration" value={`${plan.durationDays} days`} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Info title="Protein" value={`${plan.protein} g (${pp}%)`} />
        <Info title="Carbs" value={`${plan.carbs} g (${pc}%)`} />
        <Info title="Fat" value={`${plan.fat} g (${pf}%)`} />
      </div>
      <MacroBar p={plan.protein} c={plan.carbs} f={plan.fat} />
      <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
        {plan.structure?.map((d) => (
          <div key={d.day} className="p-3 border-b border-slate-100">
            <div className="font-medium">Day {d.day}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {d.meals.map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-2">
                  <div className="text-sm font-semibold">{m.name}</div>
                  {m.note ? <div className="text-xs text-slate-500">{m.note}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealPlanForm({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [goal, setGoal] = useState(initial?.goal || "Weight Loss");
  const [status, setStatus] = useState(initial?.status || "Draft");
  const [calories, setCalories] = useState(initial?.calories || 2000);
  const [protein, setProtein] = useState(initial?.protein || 150);
  const [carbs, setCarbs] = useState(initial?.carbs || 200);
  const [fat, setFat] = useState(initial?.fat || 70);
  const [mealsPerDay, setMealsPerDay] = useState(initial?.mealsPerDay || 4);
  const [durationDays, setDurationDays] = useState(initial?.durationDays || 28);

  const kcal = Math.round(protein*4 + carbs*4 + fat*9);

  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit?.({ name, goal, status, calories, protein, carbs, fat, mealsPerDay: Number(mealsPerDay), durationDays: Number(durationDays) });}} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name"><input value={name} onChange={(e)=>setName(e.target.value)} required className="inp" placeholder="e.g., 4-Week Cut" /></Field>
        <Field label="Goal"><select value={goal} onChange={(e)=>setGoal(e.target.value)} className="inp">{GOALS.filter(g=>g!=="All").map(g=><option key={g}>{g}</option>)}</select></Field>
        <Field label="Status"><select value={status} onChange={(e)=>setStatus(e.target.value)} className="inp">{["Active","Draft"].map(s=><option key={s}>{s}</option>)}</select></Field>
        <Field label="Calories (kcal)"><input type="number" value={calories} onChange={(e)=>setCalories(+e.target.value)} className="inp" /></Field>
        <Field label="Protein (g)"><input type="number" value={protein} onChange={(e)=>setProtein(+e.target.value)} className="inp" /></Field>
        <Field label="Carbs (g)"><input type="number" value={carbs} onChange={(e)=>setCarbs(+e.target.value)} className="inp" /></Field>
        <Field label="Fat (g)"><input type="number" value={fat} onChange={(e)=>setFat(+e.target.value)} className="inp" /></Field>
        <Field label="Meals per day"><input type="number" min="1" value={mealsPerDay} onChange={(e)=>setMealsPerDay(+e.target.value)} className="inp" /></Field>
        <Field label="Duration (days)"><input type="number" min="1" value={durationDays} onChange={(e)=>setDurationDays(+e.target.value)} className="inp" /></Field>
      </div>

      {/* live macro preview */}
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-sm font-semibold mb-2">Macro split preview</div>
        <MacroBar p={protein} c={carbs} f={fat} />
        <div className="text-xs text-slate-600 mt-1">Macros kcal ≈ <span className="font-medium">{kcal}</span> (plan calories: {calories})</div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
      </div>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </form>
  );
}

function AssignForm({ onSubmit }) {
  return (
    <form onSubmit={(e)=>{e.preventDefault(); const f=new FormData(e.currentTarget); onSubmit?.({ email:f.get("email"), startDate:f.get("startDate") });}} className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Client Email"><input name="email" type="email" required className="inp" placeholder="client@example.com" /></Field>
      <Field label="Start Date"><input name="startDate" type="date" required className="inp" /></Field>
    </div>
    <div className="flex items-center justify-end gap-2 pt-2">
      <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Assign</button>
    </div>
    <style jsx>{`.inp{ @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }`}</style>
  </form>
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
function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* ---------------- Utils ---------------- */
function perc(plan) {
  const kcal = plan.protein*4 + plan.carbs*4 + plan.fat*9 || 1;
  const pp = Math.round((plan.protein*4 / kcal) * 100);
  const pc = Math.round((plan.carbs*4   / kcal) * 100);
  const pf = 100 - pp - pc;
  return { pp, pc, pf };
}
