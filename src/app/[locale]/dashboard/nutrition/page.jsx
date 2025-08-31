"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/dashboard/ui/DataTable";
import useDebounced from "@/hooks/useDebounced";
import { PageHeader, StatCard, ToolbarButton, SearchInput, Select, Modal, EmptyState, Badge, spring } from "@/components/dashboard/ui/UI";
import {
  Apple, Plus, Upload, Download, RefreshCcw, Utensils, Eye, Edit, Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

/* ---------------- Mock API ---------------- */
const MOCK = [
  { id: 1,  name: "Chicken Breast", brand: "—", category: "Protein", serving: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
  { id: 2,  name: "Brown Rice (cooked)", brand: "—", category: "Carbs", serving: 100, calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, sugar: 0.4, sodium: 5 },
  { id: 3,  name: "Olive Oil", brand: "—", category: "Fats", serving: 15,  calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0 },
  { id: 4,  name: "Apple", brand: "—", category: "Fruits", serving: 182, calories: 95,  protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 },
  { id: 5,  name: "Greek Yogurt (nonfat)", brand: "—", category: "Dairy", serving: 170, calories: 100, protein: 17, carbs: 6, fat: 0, fiber: 0, sugar: 6, sodium: 61 },
  { id: 6,  name: "Oats (dry)", brand: "—", category: "Carbs", serving: 40,  calories: 154, protein: 5.3, carbs: 27, fat: 2.6, fiber: 4, sugar: 0.5, sodium: 2 },
  { id: 7,  name: "Banana", brand: "—", category: "Fruits", serving: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
  { id: 8,  name: "Egg (whole)", brand: "—", category: "Protein", serving: 50,  calories: 72,  protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0, sugar: 0.2, sodium: 71 },
  { id: 9,  name: "Almonds", brand: "—", category: "Fats", serving: 28,  calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1.2, sodium: 0 },
  { id: 10, name: "Broccoli", brand: "—", category: "Vegetables", serving: 91, calories: 31,  protein: 2.5, carbs: 6, fat: 0.3, fiber: 2.4, sugar: 1.5, sodium: 30 },
];

const CATS = ["All","Protein","Carbs","Fats","Fruits","Vegetables","Dairy","Snacks","Drinks"];

const fetchFoods = () => new Promise(res => setTimeout(()=>res(MOCK), 900));

/* ---------------- Page ---------------- */
export default function FoodDatabasePage() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  // search & filters
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [cat, setCat] = useState("All");
  const [brand, setBrand] = useState("");
  const [kMin, setKMin] = useState(""); const [kMax, setKMax] = useState("");
  const [pMin, setPMin] = useState(""); const [pMax, setPMax] = useState("");
  const [cMin, setCMin] = useState(""); const [cMax, setCMax] = useState("");
  const [fMin, setFMin] = useState(""); const [fMax, setFMax] = useState("");

  // selection
  const [selected, setSelected] = useState([]);

  // modals
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchFoods().then((d) => { setFoods(d); setLoading(false); });
  }, []);

  /* filters */
  const filtered = useMemo(() => {
    let data = foods.slice();

    if (q) {
      const s = q.toLowerCase();
      data = data.filter(x =>
        [x.name, x.brand, x.category].join(" ").toLowerCase().includes(s)
      );
    }
    if (brand) data = data.filter(x => (x.brand || '').toLowerCase().includes(brand.toLowerCase()));
    if (cat !== "All") data = data.filter(x => x.category === cat);

    const within = (v, min, max) => (min ? v >= +min : true) && (max ? v <= +max : true);
    data = data.filter(x =>
      within(x.calories, kMin, kMax) &&
      within(x.protein,  pMin, pMax) &&
      within(x.carbs,    cMin, cMax) &&
      within(x.fat,      fMin, fMax)
    );
    return data;
  }, [foods, q, brand, cat, kMin, kMax, pMin, pMax, cMin, cMax, fMin, fMax]);

  /* KPIs */
  const kpiTotal = foods.length;
  const kpiAvgKcal = Math.round(foods.reduce((a,f)=>a+f.calories,0)/Math.max(1,foods.length));
  const kpiProteinRich = foods.filter(f => f.protein >= 15).length;
  const kpiFiberRich = foods.filter(f => f.fiber >= 3).length;

  /* table columns */
  const columns = [
    {
      header: "Food",
      accessor: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-slate-500">{row.brand && row.brand !== "—" ? row.brand : ""}</div>
        </div>
      )
    },
    { header: "Category", accessor: "category", sortable: true },
    { header: "Serving (g/ml)", accessor: "serving", sortable: true },
    { header: "Kcal", accessor: "calories", sortable: true },
    { header: "P (g)", accessor: "protein", sortable: true },
    { header: "C (g)", accessor: "carbs", sortable: true },
    { header: "F (g)", accessor: "fat", sortable: true },
    {
      header: "More",
      accessor: "_more",
      disableSort: true,
      cell: (row) => (
        <div className="text-xs text-slate-600">
          Fiber: {row.fiber ?? 0}g · Sugar: {row.sugar ?? 0}g · Na: {row.sodium ?? 0}mg
        </div>
      )
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
          <button onClick={() => setEditRow(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setFoods(arr => arr.filter(x => x.id !== row.id))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )
    },
  ];

  /* selection handlers (DataTable controlled API) */
  const selectedIds = selected;
  const onToggleRow = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const onToggleAll = (ids) => setSelected(prev => prev.length === ids.length ? [] : ids);

  /* actions */
  const refresh = () => { setLoading(true); setSelected([]); fetchFoods().then(d => { setFoods(d); setLoading(false); }); };
  const exportCSV = () => {
    const rows = [["id","name","brand","category","serving","calories","protein","carbs","fat","fiber","sugar","sodium"]];
    filtered.forEach(f => rows.push([f.id,f.name,f.brand,f.category,f.serving,f.calories,f.protein,f.carbs,f.fat,f.fiber,f.sugar,f.sodium]));
    const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "foods.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const importCSV = () => alert("Import CSV not wired in this mock. Hook to your uploader/parser.");

  const addFood = (payload) => {
    const id = Math.max(0, ...foods.map(f=>f.id)) + 1;
    setFoods(arr => [{ id, ...payload }, ...arr]);
  };
  const saveEdit = (payload) => setFoods(arr => arr.map(f => f.id === editRow.id ? { ...f, ...payload } : f));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Utensils}
        title="Food Database"
        subtitle="Manage foods, macros and servings. Reusable across plans and meal builders."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Upload} onClick={importCSV} variant="secondary">Import</ToolbarButton>
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
            <ToolbarButton icon={Plus} onClick={() => setAddOpen(true)}>Add Food</ToolbarButton>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Apple} title="Total Foods" value={kpiTotal} />
        <StatCard icon={RefreshCcw} title="Avg kcal / item" value={kpiAvgKcal} />
        <StatCard icon={Utensils} title="Protein-rich (≥15g)" value={kpiProteinRich} />
        <StatCard icon={Utensils} title="Fiber-rich (≥3g)" value={kpiFiberRich} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name, brand, category…" className="w-full lg:min-w-[360px]" />
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select label="Category" value={cat} setValue={setCat} options={CATS} />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500">Brand</span>
              <input value={brand} onChange={(e)=>setBrand(e.target.value)} className="outline-none" placeholder="e.g. Brand" />
            </div>
            <Range label="Kcal" vMin={kMin} vMax={kMax} setMin={setKMin} setMax={setKMax} />
            <Range label="P" vMin={pMin} vMax={pMax} setMin={setPMin} setMax={setPMax} />
            <Range label="C" vMin={cMin} vMax={cMax} setMin={setCMin} setMax={setCMax} />
            <Range label="F" vMin={fMin} vMax={fMax} setMin={setFMin} setMax={setFMax} />
            <ToolbarButton icon={RefreshCcw} onClick={refresh} variant="secondary">Refresh</ToolbarButton>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <Badge color="blue">{selected.length} selected</Badge>
            <button onClick={() => setFoods(arr => arr.filter(f => !selected.includes(f.id)))} className="ml-2 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2">
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
          itemsPerPage={10}
          pagination
          selectable
          selectedIds={selectedIds}
          onToggleRow={onToggleRow}
          onToggleAll={onToggleAll}
          onRowClick={(row) => setPreview(row)}
          initialSort={{ key: 'name', dir: 'asc' }}
        />
      </div>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || "Food"}>
        {preview && <FoodPreview food={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Food">
        <FoodForm
          onSubmit={(payload)=>{ addFood(payload); setAddOpen(false); }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ""}`}>
        {editRow && (
          <FoodForm
            initial={editRow}
            onSubmit={(payload)=>{ saveEdit(payload); setEditRow(null); }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Tiny controls ---------------- */

function Range({ label, vMin, vMax, setMin, setMax }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
      <span className="text-xs text-slate-500">{label}</span>
      <input type="number" placeholder="min" value={vMin} onChange={(e)=>setMin(e.target.value)} className="w-16 outline-none" />
      <span className="text-slate-400">—</span>
      <input type="number" placeholder="max" value={vMax} onChange={(e)=>setMax(e.target.value)} className="w-16 outline-none" />
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function FoodPreview({ food }) {
  const [qty, setQty] = useState(1);
  const m = (v) => +(v * qty).toFixed(1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Category" value={food.category} />
        <Info title="Brand" value={food.brand || "—"} />
        <Info title="Serving" value={`${food.serving} g/ml`} />
        <Info title="Calories" value={m(food.calories)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Protein (g)" value={m(food.protein)} />
        <Info title="Carbs (g)" value={m(food.carbs)} />
        <Info title="Fat (g)" value={m(food.fat)} />
        <Info title="Fiber (g)" value={m(food.fiber ?? 0)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Sugar (g)" value={m(food.sugar ?? 0)} />
        <Info title="Sodium (mg)" value={m(food.sodium ?? 0)} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Servings</span>
        <input type="number" min="0.25" step="0.25" value={qty} onChange={(e)=>setQty(parseFloat(e.target.value||1))} className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none" />
      </div>
      <p className="text-xs text-slate-500">Tip: calories ≈ 4×P + 4×C + 9×F; use this if no label kcal available.</p>
    </div>
  );
}

function FoodForm({ initial, onSubmit }) {
  return (
    <form onSubmit={(e)=>{e.preventDefault(); const f=new FormData(e.currentTarget);
      const payload = {
        name: f.get('name'), brand: f.get('brand') || '—', category: f.get('category') || 'Protein',
        serving: +f.get('serving') || 100,
        calories: +f.get('calories') || calcKcal(+f.get('protein')||0, +f.get('carbs')||0, +f.get('fat')||0),
        protein: +f.get('protein') || 0, carbs: +f.get('carbs') || 0, fat: +f.get('fat') || 0,
        fiber: +f.get('fiber') || 0, sugar: +f.get('sugar') || 0, sodium: +f.get('sodium') || 0,
      };
      onSubmit?.(payload);
    }} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name"><input name="name" defaultValue={initial?.name||""} required className="inp" /></Field>
        <Field label="Brand"><input name="brand" defaultValue={initial?.brand||""} className="inp" placeholder="—" /></Field>
        <Field label="Category">
          <select name="category" defaultValue={initial?.category||"Protein"} className="inp">
            {CATS.filter(c=>c!=="All").map(c=> <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Serving size (g/ml)"><input name="serving" type="number" defaultValue={initial?.serving||100} className="inp" /></Field>
        <Field label="Calories (kcal)"><input name="calories" type="number" defaultValue={initial?.calories||""} className="inp" placeholder="auto from macros if empty" /></Field>
        <Field label="Protein (g)"><input name="protein" type="number" step="0.1" defaultValue={initial?.protein||0} className="inp" /></Field>
        <Field label="Carbs (g)"><input name="carbs" type="number" step="0.1" defaultValue={initial?.carbs||0} className="inp" /></Field>
        <Field label="Fat (g)"><input name="fat" type="number" step="0.1" defaultValue={initial?.fat||0} className="inp" /></Field>
        <Field label="Fiber (g)"><input name="fiber" type="number" step="0.1" defaultValue={initial?.fiber||0} className="inp" /></Field>
        <Field label="Sugar (g)"><input name="sugar" type="number" step="0.1" defaultValue={initial?.sugar||0} className="inp" /></Field>
        <Field label="Sodium (mg)"><input name="sodium" type="number" step="1" defaultValue={initial?.sodium||0} className="inp" /></Field>
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
      {children}
    </div>
  );
}

/* ---------------- Utils ---------------- */
function calcKcal(p=0,c=0,f=0){ return Math.round(p*4 + c*4 + f*9); }
