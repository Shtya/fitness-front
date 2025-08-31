"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, StatCard, ToolbarButton, TabsPill, DateRangeControl,
  Modal, EmptyState, MiniTrend, ProgressRing, spring
} from "@/components/dashboard/ui/UI";
import {
  LineChart, Plus, Download, Upload, Target, Image as ImageIcon, RefreshCcw
} from "lucide-react";
import ProgressChart from "@/components/dashboard/ui/Charts/ProgressChart";

/* ---------------- Mock API ---------------- */
const MOCK = [
  { date: "2025-04-01", weight: 85, bodyFat: 22, muscleMass: 38 },
  { date: "2025-05-01", weight: 82, bodyFat: 20, muscleMass: 39 },
  { date: "2025-06-01", weight: 80, bodyFat: 18, muscleMass: 40 },
  { date: "2025-07-01", weight: 78, bodyFat: 16, muscleMass: 41 },
  { date: "2025-08-01", weight: 76, bodyFat: 15, muscleMass: 42 },
];
const fetchProgress = () => new Promise(res => setTimeout(()=>res(MOCK), 900));

/* ---------------- Page ---------------- */
export default function ProgressDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [metric, setMetric] = useState("weight"); // weight | bodyFat | muscleMass
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  // Photos & Goal
  const [photos, setPhotos] = useState([]); // {id, url, date}
  const [goal, setGoal] = useState({ target: 75, by: "" }); // for weight by default

  useEffect(() => {
    setLoading(true);
    fetchProgress().then((d) => { setData(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let rows = data.slice();
    if (from) rows = rows.filter(r => r.date >= from);
    if (to)   rows = rows.filter(r => r.date <= to);
    return rows;
  }, [data, from, to]);

  const latest = filtered[filtered.length - 1];
  const first  = filtered[0];

  function kpiDelta(key) {
    if (!latest || !first) return { val: 0, delta: 0, arr: [] };
    return { val: latest[key], delta: +(latest[key] - first[key]).toFixed(1), arr: filtered.map(r => r[key]) };
  }

  const w = kpiDelta("weight");
  const bf = kpiDelta("bodyFat");
  const mm = kpiDelta("muscleMass");

  const tabs = [
    { key: "weight", label: "Weight" },
    { key: "bodyFat", label: "Body Fat" },
    { key: "muscleMass", label: "Muscle Mass" },
  ];

  // table columns
  const columns = [
    { header: "Date", accessor: "date", sortable: true },
    { header: "Weight (kg)", accessor: "weight", sortable: true },
    { header: "Body Fat (%)", accessor: "bodyFat", sortable: true },
    { header: "Muscle Mass (kg)", accessor: "muscleMass", sortable: true },
  ];

  // actions
  const refresh = () => { setLoading(true); fetchProgress().then(d => { setData(d); setLoading(false); }); };
  const exportCSV = () => {
    const rows = [["date","weight","bodyFat","muscleMass"]];
    filtered.forEach(r => rows.push([r.date, r.weight, r.bodyFat, r.muscleMass]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="progress.csv"; a.click(); URL.revokeObjectURL(url);
  };

  // goal progress (for weight: assume goal is lower better; tweak to your logic)
  const goalPct = (() => {
    if (!latest) return 0;
    const start = first?.weight ?? latest.weight;
    const target = goal.target || latest.weight;
    const total = Math.abs(start - target) || 1;
    const reached = Math.min(total, Math.abs(latest.weight - target));
    return Math.round((reached / total) * 100);
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={LineChart}
        title="Progress Tracking"
        subtitle="Visualize body metrics, log measurements, set goals, and compare changes over time."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
            <ToolbarButton icon={Upload} onClick={()=>setPhotoOpen(true)} variant="secondary">Upload Photo</ToolbarButton>
            <ToolbarButton icon={Target} onClick={()=>setGoalOpen(true)} variant="secondary">Set Goal</ToolbarButton>
            <ToolbarButton icon={Plus} onClick={()=>setAddOpen(true)}>Add Measurement</ToolbarButton>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiBlock title="Weight" value={`${w.val ?? "-" } kg`} delta={w.delta} points={w.arr} good="down" />
        <KpiBlock title="Body Fat" value={`${bf.val ?? "-" } %`} delta={bf.delta} points={bf.arr} good="down" />
        <KpiBlock title="Muscle Mass" value={`${mm.val ?? "-" } kg`} delta={mm.delta} points={mm.arr} good="up" />
      </div>

      {/* Filters + Tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <TabsPill tabs={tabs} active={metric} onChange={setMetric} />
          <div className="flex items-center gap-2">
            <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            <ToolbarButton icon={RefreshCcw} onClick={refresh} variant="secondary">Refresh</ToolbarButton>
          </div>
        </div>
      </motion.div>

      {/* Chart + Goal & Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-2">{tabs.find(t=>t.key===metric)?.label} Progress</h2>
          <ProgressChart
            data={filtered}
            metric={metric}
            metricName={tabs.find(t=>t.key===metric)?.label}
            unit={metric === "bodyFat" ? "%" : "kg"}
          />
          {!loading && filtered.length === 0 ? (
            <EmptyState title="No measurements" subtitle="Try another date range or add a measurement." />
          ) : null}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          {/* Goal */}
          <div className="card-glow p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Weight Goal</div>
                <div className="text-xl font-semibold">{goal.target} kg</div>
                <div className="text-xs text-slate-500">{goal.by ? `by ${new Date(goal.by).toLocaleDateString()}` : "no date set"}</div>
              </div>
              <ProgressRing value={goalPct} />
            </div>
            <button onClick={()=>setGoalOpen(true)} className="mt-3 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
              Update Goal
            </button>
          </div>

          {/* Photos */}
          <div className="card-glow p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Progress Photos</div>
              <button onClick={()=>setPhotoOpen(true)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                <ImageIcon className="w-4 h-4 inline mr-1" /> Upload
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.slice(0,6).map(p => (
                <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="object-cover w-full h-full" />
                </div>
              ))}
              {!photos.length && <div className="col-span-3"><EmptyState title="No photos yet" subtitle="Upload front/side/back to visualize changes." /></div>}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Measurements Log */}
      <div className="card-glow">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          itemsPerPage={8}
          pagination
          initialSort={{ key: "date", dir: "asc" }}
        />
      </div>

      {/* Add Measurement */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add Measurement">
        <AddForm
          onSubmit={(payload) => {
            setData(arr => [...arr, payload].sort((a,b)=>a.date.localeCompare(b.date)));
            setAddOpen(false);
          }}
          last={latest}
        />
      </Modal>

      {/* Goal */}
      <Modal open={goalOpen} onClose={()=>setGoalOpen(false)} title="Update Goal">
        <GoalForm
          initial={goal}
          onSubmit={(g)=>{ setGoal(g); setGoalOpen(false); }}
        />
      </Modal>

      {/* Photos */}
      <Modal open={photoOpen} onClose={()=>setPhotoOpen(false)} title="Upload Progress Photos">
        <PhotoUpload onSubmit={(list)=>{ 
          const mapped = Array.from(list).map((f,i)=>({ id: Date.now()+i, url: URL.createObjectURL(f), date: today() }));
          setPhotos(prev => [...mapped, ...prev]);
          setPhotoOpen(false);
        }}/>
      </Modal>
    </div>
  );
}

/* ---------------- Small blocks ---------------- */

function KpiBlock({ title, value, delta=0, points=[], good="down" }) {
  const up = delta > 0;
  const color = (good === "up" ? up : !up) ? "text-green-600" : "text-red-600";
  return (
    <StatCard title={title} value={value} sub={<span className={color}>{up ? "▲" : "▼"} {Math.abs(delta)} since start</span>} icon={LineChart}>
      {/* StatCard already renders children via its internal layout; this line kept for clarity */}
    </StatCard>
  );
}

function AddForm({ onSubmit, last }) {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState(last?.weight || 80);
  const [bodyFat, setBodyFat] = useState(last?.bodyFat || 18);
  const [muscleMass, setMuscleMass] = useState(last?.muscleMass || 40);
  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit?.({ date, weight:+weight, bodyFat:+bodyFat, muscleMass:+muscleMass });}} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="inp" /></Field>
        <Field label="Weight (kg)"><input type="number" step="0.1" value={weight} onChange={(e)=>setWeight(e.target.value)} className="inp" /></Field>
        <Field label="Body Fat (%)"><input type="number" step="0.1" value={bodyFat} onChange={(e)=>setBodyFat(e.target.value)} className="inp" /></Field>
        <Field label="Muscle Mass (kg)"><input type="number" step="0.1" value={muscleMass} onChange={(e)=>setMuscleMass(e.target.value)} className="inp" /></Field>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
      </div>
      <style jsx>{`.inp{@apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;}`}</style>
    </form>
  );
}

function GoalForm({ initial, onSubmit }) {
  const [target, setTarget] = useState(initial?.target || 75);
  const [by, setBy] = useState(initial?.by || "");
  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit?.({ target:+target, by });}} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Target Weight (kg)"><input type="number" value={target} onChange={(e)=>setTarget(e.target.value)} className="inp" /></Field>
        <Field label="Target Date (optional)"><input type="date" value={by} onChange={(e)=>setBy(e.target.value)} className="inp" /></Field>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
      </div>
      <style jsx>{`.inp{@apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;}`}</style>
    </form>
  );
}

function PhotoUpload({ onSubmit }) {
  const [files, setFiles] = useState(null);
  return (
    <form onSubmit={(e)=>{e.preventDefault(); if(files?.length){ onSubmit?.(files);} }} className="space-y-3">
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 bg-white hover:bg-slate-50 cursor-pointer">
        <ImageIcon className="w-6 h-6 text-slate-500" />
        <span className="text-sm text-slate-600">Drop images here or click to upload</span>
        <input type="file" className="hidden" multiple accept="image/*" onChange={(e)=>setFiles(e.target.files)} />
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white" disabled={!files?.length}>Upload</button>
      </div>
    </form>
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
function today(){ return new Date().toISOString().slice(0,10); }
