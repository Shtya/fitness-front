"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, ToolbarButton, DateRangeControl, RadioPills, FileDrop,
  Modal, EmptyState, spring
} from "@/components/dashboard/ui/UI";
import {
  ClipboardList, Download, RefreshCcw, Send, Image as ImageIcon, Eye
} from "lucide-react";

/* ---------------- Mock + Utils ---------------- */
const seedHistory = [
  { id: 1, date: "2025-07-07", weight: 80.0, bodyFat: 18.0, chest: 102, waist: 84, arms: 36, thighs: 58, energy: 3, sleep: 7, adherence: 80, mood: 3, soreness: 2, notes: "Solid week." },
  { id: 2, date: "2025-07-14", weight: 79.2, bodyFat: 17.6, chest: 101.5, waist: 83, arms: 36.2, thighs: 57.8, energy: 4, sleep: 7.5, adherence: 85, mood: 4, soreness: 2, notes: "More steps." },
  { id: 3, date: "2025-07-21", weight: 78.8, bodyFat: 17.2, chest: 101, waist: 82.5, arms: 36.3, thighs: 57.6, energy: 3, sleep: 7.2, adherence: 78, mood: 3, soreness: 3, notes: "" },
  { id: 4, date: "2025-07-28", weight: 78.2, bodyFat: 16.8, chest: 100.8, waist: 82, arms: 36.4, thighs: 57.2, energy: 4, sleep: 7.8, adherence: 90, mood: 4, soreness: 2, notes: "Dialed in." },
  { id: 5, date: "2025-08-04", weight: 77.9, bodyFat: 16.4, chest: 100.5, waist: 81.6, arms: 36.5, thighs: 57.0, energy: 4, sleep: 7.6, adherence: 88, mood: 4, soreness: 2, notes: "" },
];
const fetchHistory = () => new Promise(res => setTimeout(()=>res(seedHistory), 600));
function today(){ return new Date().toISOString().slice(0,10); }
function delta(a, b){ if(a==null || b==null) return ""; const d = +(a-b).toFixed(1); if(!d) return "—"; return `${d>0?"+":""}${d}`; }
function fmt(d){ return new Date(d).toLocaleDateString(); }

/* ---------------- Page ---------------- */
export default function CheckInSystem() {
  // history
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // form
  const [form, setForm] = useState({
    date: today(),
    weight: "", bodyFat: "", chest: "", waist: "", arms: "", thighs: "",
    energy: 3, sleep: 7, adherence: 80, mood: 3, soreness: 2,
    notes: "",
    photos: { front: null, side: null, back: null }
  });

  // modals
  const [viewRow, setViewRow] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchHistory().then(d => { setHistory(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let rows = history.slice();
    if (from) rows = rows.filter(r => r.date >= from);
    if (to)   rows = rows.filter(r => r.date <= to);
    return rows.sort((a,b)=>a.date.localeCompare(b.date)); // asc
  }, [history, from, to]);

  const last = filtered[filtered.length-1];

  /* -------- Submit -------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    const id = Date.now();
    const payload = {
      id,
      date: form.date,
      weight: num(form.weight), bodyFat: num(form.bodyFat),
      chest: num(form.chest), waist: num(form.waist), arms: num(form.arms), thighs: num(form.thighs),
      energy: form.energy, sleep: num(form.sleep), adherence: num(form.adherence), mood: form.mood, soreness: form.soreness,
      notes: form.notes,
      // you would upload photos and store URLs in real app
      photos: form.photos,
    };
    setHistory(arr => [...arr, payload]);
    // reset keep date as today
    setForm(f => ({ ...f, weight: "", bodyFat: "", chest: "", waist: "", arms: "", thighs: "", notes: "" }));
  };
  const num = (v) => (v === "" || v === null || typeof v === "undefined") ? null : +v;

  /* -------- Table -------- */
  const columns = [
    { header: "Date", accessor: "date", sortable: true, cell: r => fmt(r.date) },
    { header: "Weight", accessor: "weight", sortable: true, cell: r => showWithDelta(r.weight, lastBefore(r.date)?.weight) },
    { header: "Body Fat %", accessor: "bodyFat", sortable: true, cell: r => showWithDelta(r.bodyFat, lastBefore(r.date)?.bodyFat) },
    { header: "Chest (cm)", accessor: "chest", sortable: true },
    { header: "Waist (cm)", accessor: "waist", sortable: true },
    { header: "Arms (cm)", accessor: "arms", sortable: true },
    { header: "Thighs (cm)", accessor: "thighs", sortable: true },
    { header: "Energy", accessor: "energy", sortable: true },
    { header: "Sleep (h)", accessor: "sleep", sortable: true },
    { header: "Adherence %", accessor: "adherence", sortable: true },
    {
      header: "Actions",
      accessor: "_actions",
      cell: (row) => (
        <button onClick={()=>setViewRow(row)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
          <Eye className="w-4 h-4" /> View
        </button>
      )
    },
  ];

  function showWithDelta(val, prev) {
    if (val == null) return "—";
    const d = delta(val, prev);
    return (
      <div className="flex items-baseline gap-1">
        <span>{val}</span>
        <span className={`text-xs ${String(d).startsWith("+") ? "text-red-600" : "text-green-600"}`}>{d !== "—" ? d : ""}</span>
      </div>
    );
  }
  function lastBefore(dateStr){
    const idx = filtered.findIndex(r => r.date === dateStr);
    return idx > 0 ? filtered[idx-1] : null;
  }

  /* -------- Actions -------- */
  const refresh = () => { setLoading(true); fetchHistory().then(d => { setHistory(d); setLoading(false); }); };
  const exportCSV = () => {
    const rows = [["date","weight","bodyFat","chest","waist","arms","thighs","energy","sleep","adherence","mood","soreness","notes"]];
    filtered.forEach(r => rows.push([r.date,r.weight??"",r.bodyFat??"",r.chest??"",r.waist??"",r.arms??"",r.thighs??"",r.energy??"",r.sleep??"",r.adherence??"",r.mood??"",r.soreness??"", (r.notes||"").replace(/\n/g," ") ]));
    const csv = rows.map(r => r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="checkins.csv"; a.click(); URL.revokeObjectURL(url);
  };

  /* -------- Render -------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ClipboardList}
        title="Weekly Check-in"
        subtitle="Log measurements, photos, and subjective metrics to track weekly changes."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={refresh} variant="secondary">Refresh</ToolbarButton>
            <ToolbarButton icon={Send} onClick={(e)=>{ const formEl=document.getElementById('checkin-form'); formEl?.requestSubmit(); }}>Submit</ToolbarButton>
          </div>
        }
      />

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-6">
        <form id="checkin-form" onSubmit={handleSubmit} className="space-y-5">
          {/* date */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">Date</div>
            <input type="date" value={form.date} onChange={(e)=>setForm(f=>({ ...f, date: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 bg-white" />
          </div>

          {/* metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Weight (kg)">
              <input type="number" step="0.1" value={form.weight} onChange={(e)=>setForm(f=>({ ...f, weight: e.target.value }))} className="inp" />
            </Field>
            <Field label="Body Fat (%)">
              <input type="number" step="0.1" value={form.bodyFat} onChange={(e)=>setForm(f=>({ ...f, bodyFat: e.target.value }))} className="inp" />
            </Field>
            <div className="hidden md:block"></div>

            <Field label="Chest (cm)"><input type="number" step="0.1" value={form.chest} onChange={(e)=>setForm(f=>({ ...f, chest: e.target.value }))} className="inp" /></Field>
            <Field label="Waist (cm)"><input type="number" step="0.1" value={form.waist} onChange={(e)=>setForm(f=>({ ...f, waist: e.target.value }))} className="inp" /></Field>
            <Field label="Arms (cm)"><input type="number" step="0.1" value={form.arms} onChange={(e)=>setForm(f=>({ ...f, arms: e.target.value }))} className="inp" /></Field>
            <Field label="Thighs (cm)"><input type="number" step="0.1" value={form.thighs} onChange={(e)=>setForm(f=>({ ...f, thighs: e.target.value }))} className="inp" /></Field>
          </div>

          {/* subjective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RadioPills
              label="Energy"
              value={form.energy}
              onChange={(v)=>setForm(f=>({ ...f, energy: v }))}
              options={[1,2,3,4,5].map(v=>({ value:v, label:String(v) }))}
            />
            <RadioPills
              label="Mood"
              value={form.mood}
              onChange={(v)=>setForm(f=>({ ...f, mood: v }))}
              options={[1,2,3,4,5].map(v=>({ value:v, label:String(v) }))}
            />
            <Field label="Sleep (hours)">
              <input type="number" step="0.1" value={form.sleep} onChange={(e)=>setForm(f=>({ ...f, sleep: e.target.value }))} className="inp" />
            </Field>
            <Field label="Adherence (%)">
              <input type="number" step="1" value={form.adherence} onChange={(e)=>setForm(f=>({ ...f, adherence: e.target.value }))} className="inp" />
            </Field>
            <RadioPills
              label="Soreness"
              value={form.soreness}
              onChange={(v)=>setForm(f=>({ ...f, soreness: v }))}
              options={[0,1,2,3,4,5].map(v=>({ value:v, label:String(v) }))}
              className="md:col-span-2"
            />
          </div>

          {/* photos */}
          <div>
            <div className="text-sm text-slate-600 mb-2">Progress Photos</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Thumb file={form.photos.front} label="Front" />
                <FileDrop label="Front photo" accept="image/*" onFiles={(fs)=>setForm(f=>({ ...f, photos: { ...f.photos, front: fs?.[0]||null } }))} />
              </div>
              <div>
                <Thumb file={form.photos.side} label="Side" />
                <FileDrop label="Side photo" accept="image/*" onFiles={(fs)=>setForm(f=>({ ...f, photos: { ...f.photos, side: fs?.[0]||null } }))} />
              </div>
              <div>
                <Thumb file={form.photos.back} label="Back" />
                <FileDrop label="Back photo" accept="image/*" onFiles={(fs)=>setForm(f=>({ ...f, photos: { ...f.photos, back: fs?.[0]||null } }))} />
              </div>
            </div>
          </div>

          {/* notes + submit */}
          <div className="grid grid-cols-1 gap-4">
            <Field label="Notes">
              <textarea rows={4} value={form.notes} onChange={(e)=>setForm(f=>({ ...f, notes: e.target.value }))} className="inp" placeholder="Share wins, challenges, appetite, cravings, stress…" />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">
              Submit Check-in
            </button>
          </div>

          <style jsx>{`
            .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
          `}</style>
        </form>
      </motion.div>

      {/* History */}
      <div className="card-glow">
        <div className="p-4 flex items-center justify-between">
          <div className="font-semibold">Check-in History</div>
          <div className="flex items-center gap-2">
            <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          itemsPerPage={8}
          pagination
          initialSort={{ key: "date", dir: "asc" }}
        />
        {!loading && filtered.length === 0 ? (
          <EmptyState title="No check-ins" subtitle="Pick another date range or submit your first check-in." />
        ) : null}
      </div>

      {/* View modal */}
      <Modal open={!!viewRow} onClose={()=>setViewRow(null)} title={viewRow ? `Check-in · ${fmt(viewRow.date)}` : "Check-in"}>
        {viewRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Info title="Weight" value={`${viewRow.weight ?? "—"} kg`} />
              <Info title="Body Fat" value={`${viewRow.bodyFat ?? "—"} %`} />
              <Info title="Chest" value={`${viewRow.chest ?? "—"} cm`} />
              <Info title="Waist" value={`${viewRow.waist ?? "—"} cm`} />
              <Info title="Arms" value={`${viewRow.arms ?? "—"} cm`} />
              <Info title="Thighs" value={`${viewRow.thighs ?? "—"} cm`} />
              <Info title="Energy" value={viewRow.energy ?? "—"} />
              <Info title="Sleep" value={`${viewRow.sleep ?? "—"} h`} />
              <Info title="Adherence" value={`${viewRow.adherence ?? "—"} %`} />
              <Info title="Mood" value={viewRow.mood ?? "—"} />
              <Info title="Soreness" value={viewRow.soreness ?? "—"} />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Notes</div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white text-sm">{viewRow.notes || <span className="text-slate-400">No notes</span>}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-2">Photos</div>
              <div className="grid grid-cols-3 gap-2">
                {["front","side","back"].map(k => (
                  <PhotoSlot key={k} file={viewRow.photos?.[k]} label={k} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  /* ------------ tiny presenters ------------ */
  function Thumb({ file, label }){
    const url = file ? URL.createObjectURL(file) : null;
    return (
      <div className="mb-2">
        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 grid place-content-center">
          {url ? (<img src={url} alt="" className="object-cover w-full h-full" />)
               : (<ImageIcon className="w-6 h-6 text-slate-400" />)}
        </div>
        <div className="text-xs text-slate-600 mt-1">{label}</div>
      </div>
    );
  }
  function PhotoSlot({ file, label }){
    if (!file) return (
      <div className="aspect-square rounded-lg border border-dashed border-slate-300 grid place-content-center text-xs text-slate-500 capitalize">
        {label}
      </div>
    );
    const url = URL.createObjectURL(file);
    return (
      <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 capitalize">
        <img src={url} alt={label} className="object-cover w-full h-full" />
      </div>
    );
  }
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
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
