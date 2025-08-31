"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, ToolbarButton, SearchInput, Select, TabsPill, DateRangeControl,
  StatusBadge, Modal, EmptyState, spring
} from "@/components/dashboard/ui/UI";
import {
  Send, Upload, Download, RefreshCcw, Eye, Edit, Trash2, Users, ListChecks, CalendarPlus
} from "lucide-react";
import { motion } from "framer-motion";

/* ---------------- Mock API ---------------- */
const MOCK = [
  { id: 1, type: "program", name: "John Doe",   item: "Beginner Strength", startDate: "2025-07-01", endDate: "2025-08-26", status: "Active",   progress: 65 },
  { id: 2, type: "program", name: "Sarah Smith",item: "Fat Loss",          startDate: "2025-08-10", endDate: "2025-09-21", status: "Active",   progress: 20 },
  { id: 3, type: "diet",    name: "Mike Johnson",item:"Weight Loss Diet",  startDate: "2025-06-15", endDate: "2025-07-15", status: "Active",   progress: 100 },
  { id: 4, type: "program", name: "Emily Wilson",item:"Muscle Building",   startDate: "2025-05-05", endDate: "2025-07-28", status: "Completed",progress: 100 },
];
const fetchAssignments = () => new Promise(res => setTimeout(()=>res(MOCK), 900));

/* ---------------- Page ---------------- */
export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // tabs + filters
  const [tab, setTab] = useState("all"); // all | programs | diets
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All"); // All | Active | Completed | Pending | Expired
  const [from, setFrom] = useState(""); // start date >= from
  const [to, setTo] = useState("");     // end date <= to

  // selection + modals
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAssignments().then(d => { setRows(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let data = rows.slice();
    if (tab !== "all") data = data.filter(x => x.type === (tab === "programs" ? "program" : "diet"));
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(x => [x.name, x.item, x.type].join(" ").toLowerCase().includes(s));
    }
    if (status !== "All") {
      data = data.filter(x => displayStatus(x) === status);
    }
    if (from) data = data.filter(x => x.startDate >= from);
    if (to)   data = data.filter(x => x.endDate   <= to);
    return data;
  }, [rows, tab, search, status, from, to]);

  // columns
  const columns = [
    { header: "Client", accessor: "name", sortable: true },
    {
      header: "Assignment",
      accessor: "item",
      sortable: true,
      cell: (r) => (
        <div>
          <div className="font-medium">{r.item}</div>
          <div className="text-xs text-slate-500 capitalize">{r.type}</div>
        </div>
      )
    },
    {
      header: "Dates",
      accessor: "startDate",
      sortable: true,
      cell: (r) => <span>{fmt(r.startDate)} → {fmt(r.endDate)}</span>
    },
    {
      header: "Days Left",
      accessor: "_daysleft",
      cell: (r) => {
        const d = daysLeft(r.endDate);
        return <span className={`text-sm ${d < 0 ? "text-slate-500" : d <= 7 ? "text-amber-600" : "text-slate-700"}`}>{d < 0 ? "0" : d}</span>;
      },
      sortable: false
    },
    {
      header: "Status",
      accessor: "status",
      cell: (r) => <StatusBadge status={displayStatus(r)} />
    },
    {
      header: "Actions",
      accessor: "_actions",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(r)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Eye className="w-4 h-4" /> View
          </button>
          <button onClick={() => setEditRow(r)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => removeOne(r.id)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        </div>
      )
    },
  ];

  // selection (DataTable controlled API)
  const onToggleRow = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const onToggleAll = (ids) => setSelected(prev => prev.length === ids.length ? [] : ids);

  // actions
  const refresh = () => { setLoading(true); setSelected([]); fetchAssignments().then(d => { setRows(d); setLoading(false); }); };
  const exportCSV = () => {
    const rowsCsv = [["id","type","name","item","startDate","endDate","status","progress"]];
    filtered.forEach(r => rowsCsv.push([r.id,r.type,r.name,r.item,r.startDate,r.endDate,displayStatus(r),r.progress||0]));
    const csv = rowsCsv.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="assignments.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const importCSV = () => alert("Import CSV not wired in this mock. Connect your uploader/parser.");

  const markCompleted = () => setRows(arr => arr.map(r => selected.includes(r.id) ? { ...r, status: "Completed", progress: 100 } : r));
  const extend7 = () => setRows(arr => arr.map(r => selected.includes(r.id) ? { ...r, endDate: addDays(r.endDate, 7) } : r));
  const removeSelected = () => setRows(arr => arr.filter(r => !selected.includes(r.id)));
  const removeOne = (id) => setRows(arr => arr.filter(r => r.id !== id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Send}
        title="Assignments"
        subtitle="Who is on which program or meal plan, with dates and status."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Upload} onClick={importCSV} variant="secondary">Import</ToolbarButton>
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
            <ToolbarButton icon={CalendarPlus} onClick={() => setCreateOpen(true)}>New Assignment</ToolbarButton>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <TabsPill
          tabs={[
            { key: "all",      label: "All" },
            { key: "programs", label: "Programs" },
            { key: "diets",    label: "Diets" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search client, program, type…" className="w-full lg:min-w-[340px]" />
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select label="Status" value={status} setValue={setStatus} options={["All","Active","Completed","Pending","Expired"]} />
            <DateRangeControl label="From/To" from={from} to={to} setFrom={setFrom} setTo={setTo} />
            <ToolbarButton icon={RefreshCcw} onClick={refresh} variant="secondary">Refresh</ToolbarButton>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-sm text-slate-600">{selected.length} selected</span>
            <button onClick={markCompleted} className="ml-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> Mark completed
            </button>
            <button onClick={extend7} className="ml-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2">
              +7 days
            </button>
            <button onClick={removeSelected} className="ml-2 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Remove
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
          initialSort={{ key: "startDate", dir: "desc" }}
        />
        {!loading && filtered.length === 0 ? (
          <EmptyState
            title="No assignments"
            subtitle="Try different filters or create a new assignment."
            action={<ToolbarButton onClick={()=>setCreateOpen(true)}>New Assignment</ToolbarButton>}
          />
        ) : null}
      </div>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || "Assignment"} maxW="max-w-3xl">
        {preview && <AssignmentPreview row={preview} />}
      </Modal>

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Assignment" maxW="max-w-3xl">
        <AssignmentForm
          onSubmit={(payload) => {
            const id = Date.now();
            setRows(arr => [{ id, progress: 0, status: "Active", ...payload }, ...arr]);
            setCreateOpen(false);
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ""}`} maxW="max-w-3xl">
        {editRow && (
          <AssignmentForm
            initial={editRow}
            onSubmit={(payload) => {
              setRows(arr => arr.map(r => r.id === editRow.id ? { ...r, ...payload } : r));
              setEditRow(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function AssignmentPreview({ row }) {
  const st = displayStatus(row);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Client" value={row.name} />
        <Info title="Type" value={cap(row.type)} />
        <Info title="Start" value={fmt(row.startDate)} />
        <Info title="End" value={fmt(row.endDate)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Item" value={row.item} />
        <Info title="Status" value={<StatusBadge status={st} />} />
        <Info title="Days left" value={Math.max(0, daysLeft(row.endDate))} />
        <Info title="Progress" value={`${row.progress ?? 0}%`} />
      </div>
      <p className="text-xs text-slate-600">Tip: you can auto-extend, reassign, or mark completed from bulk actions.</p>
    </div>
  );
}

function AssignmentForm({ initial, onSubmit }) {
  const [type, setType] = useState(initial?.type || "program");
  const [name, setName] = useState(initial?.name || "");
  const [item, setItem] = useState(initial?.item || "");
  const [start, setStart] = useState(initial?.startDate || today());
  const [end, setEnd] = useState(initial?.endDate || addDays(today(), 42));

  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit?.({ type, name, item, startDate: start, endDate: end }); }} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Client name"><input value={name} onChange={(e)=>setName(e.target.value)} required className="inp" placeholder="e.g., John Doe" /></Field>
        <Field label="Type">
          <select value={type} onChange={(e)=>setType(e.target.value)} className="inp">
            <option value="program">Program</option>
            <option value="diet">Diet</option>
          </select>
        </Field>
        <Field label={type === "diet" ? "Diet / Meal Plan" : "Program"}>
          <input value={item} onChange={(e)=>setItem(e.target.value)} required className="inp" placeholder={type==="diet" ? "Weight Loss Diet" : "Beginner Strength"} />
        </Field>
        <Field label="Start date"><input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="inp" /></Field>
        <Field label="End date"><input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="inp" /></Field>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
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
function cap(s=""){ return s.charAt(0).toUpperCase()+s.slice(1); }
function fmt(d){ return new Date(d).toLocaleDateString(); }
function today(){ return new Date().toISOString().slice(0,10); }
function addDays(dateStr, n){
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10);
}
function daysLeft(dateStr){
  const end = new Date(dateStr); const now = new Date();
  return Math.ceil((end - now) / (1000*60*60*24));
}
function displayStatus(r){
  if (String(r.status).toLowerCase() === "completed") return "Completed";
  if (daysLeft(r.endDate) < 0) return "Expired";
  return "Active"; // simple rule; extend if you add more states
}
