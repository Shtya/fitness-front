"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  Rocket, Plus, Search, Eye, X, Edit, Trash2, Copy, Users, CheckCircle2, XCircle,
  Layers, RefreshCcw, Calendar, Clock, DollarSign, Globe, Lock, EyeOff, Tag, Upload, Download, Settings
} from "lucide-react";

const spring = { type: "spring", stiffness: 360, damping: 30, mass: 0.7 };

/* ---------------- Mock API ---------------- */
const GOALS = ["Hypertrophy", "Strength", "Fat Loss", "General Fitness", "Mobility"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STATUS = ["Published", "Draft", "Archived"];
const VISIBILITY = ["Public", "Private", "Unlisted"];
const BILLING = ["One-time", "Subscription"];

const PLANS_LIST = [
  { id: 201, name: "Push/Pull/Legs – 6 Weeks" },
  { id: 202, name: "Full Body – 3 Days" },
  { id: 203, name: "Fat Loss Circuit – 4 Weeks" },
];

const mockPrograms = [
  {
    id: 301,
    name: "8-Week Muscle Builder",
    goal: "Hypertrophy",
    level: "Intermediate",
    status: "Published",
    visibility: "Public",
    billing: "Subscription",
    price: 39,
    currency: "USD",
    billingPeriod: "Monthly",
    durationWeeks: 8,
    sessionsPerWeek: 5,
    enrolled: 128,
    rating: 4.7,
    coach: "Jane Smith",
    nextStart: "2025-09-15",
    updatedAt: "2025-08-24",
    plans: [201, 202],
    tags: ["Muscle", "Gym"],
    cohorts: ["2025-09-15", "2025-10-13"],
    capacity: 200,
    banner: "",
  },
  {
    id: 302,
    name: "Shred & Condition",
    goal: "Fat Loss",
    level: "Beginner",
    status: "Draft",
    visibility: "Unlisted",
    billing: "One-time",
    price: 79,
    currency: "USD",
    billingPeriod: "",
    durationWeeks: 6,
    sessionsPerWeek: 4,
    enrolled: 0,
    rating: 0,
    coach: "Mike Johnson",
    nextStart: "",
    updatedAt: "2025-08-05",
    plans: [203],
    tags: ["Cutting", "Home"],
    cohorts: [],
    capacity: 999,
    banner: "",
  },
  {
    id: 303,
    name: "Athletic Strength Academy",
    goal: "Strength",
    level: "Advanced",
    status: "Published",
    visibility: "Private",
    billing: "Subscription",
    price: 59,
    currency: "USD",
    billingPeriod: "Monthly",
    durationWeeks: 12,
    sessionsPerWeek: 4,
    enrolled: 42,
    rating: 4.8,
    coach: "Sarah Wilson",
    nextStart: "2025-09-01",
    updatedAt: "2025-08-20",
    plans: [201],
    tags: ["Athlete", "Performance"],
    cohorts: ["2025-09-01"],
    capacity: 60,
    banner: "",
  },
];

const fetchPrograms = () => new Promise((res) => setTimeout(() => res(mockPrograms), 1000));

/* ---------------- Little atoms ---------------- */
function Badge({ color = "slate", children }) {
  const map = {
    green: "bg-green-100 text-green-700 ring-green-600/10",
    red: "bg-red-100 text-red-700 ring-red-600/10",
    blue: "bg-blue-100 text-blue-700 ring-blue-600/10",
    indigo: "bg-indigo-100 text-indigo-700 ring-indigo-600/10",
    amber: "bg-amber-100 text-amber-800 ring-amber-600/10",
    slate: "bg-slate-100 text-slate-700 ring-slate-600/10",
    violet: "bg-violet-100 text-violet-700 ring-violet-600/10",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color]}`}>{children}</span>;
}
const StatusPill = ({ status }) => {
  const m = { Published: "green", Draft: "amber", Archived: "slate" };
  return <Badge color={m[status] || "slate"}>{status}</Badge>;
};
const VisibilityPill = ({ visibility }) => {
  const icon = visibility === "Public" ? <Globe className="w-3 h-3" /> : visibility === "Private" ? <Lock className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />;
  const m = { Public: "blue", Private: "violet", Unlisted: "slate" };
  return <Badge color={m[visibility]}>{icon} {visibility}</Badge>;
};
const PriceTag = ({ price, currency, billing, billingPeriod }) => (
  <div className="font-medium">
    {price ? (<>{currencySymbol(currency)}{price}{billing === "Subscription" && billingPeriod ? <span className="text-xs text-slate-600"> / {billingPeriod.toLowerCase()}</span> : null}</>) : <span className="text-slate-400">—</span>}
  </div>
);
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
export default function ProgramsPage() {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);

  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState("All");
  const [level, setLevel] = useState("All");
  const [status, setStatus] = useState("All");
  const [visibility, setVisibility] = useState("All");
  const [billing, setBilling] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchPrograms().then((data) => {
      setPrograms(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let data = programs.slice();
    const s = search.toLowerCase();
    if (s) data = data.filter((p) => [p.name, p.goal, p.level, p.status, p.visibility, (p.tags||[]).join(" ")].join(" ").toLowerCase().includes(s));
    if (goal !== "All") data = data.filter((p) => p.goal === goal);
    if (level !== "All") data = data.filter((p) => p.level === level);
    if (status !== "All") data = data.filter((p) => p.status === status);
    if (visibility !== "All") data = data.filter((p) => p.visibility === visibility);
    if (billing !== "All") data = data.filter((p) => p.billing === billing);
    if (minPrice) data = data.filter((p) => (p.price || 0) >= Number(minPrice));
    if (maxPrice) data = data.filter((p) => (p.price || 0) <= Number(maxPrice));
    return data;
  }, [programs, search, goal, level, status, visibility, billing, minPrice, maxPrice]);

  const columns = [
    { header: "Program", accessor: "name", sortable: true },
    { header: "Goal", accessor: "goal", sortable: true },
    { header: "Level", accessor: "level", sortable: true },
    { header: "Price", accessor: "price", cell: (r) => <PriceTag price={r.price} currency={r.currency} billing={r.billing} billingPeriod={r.billingPeriod} />, sortable: true },
    { header: "Billing", accessor: "billing", sortable: true },
    { header: "Weeks", accessor: "durationWeeks", sortable: true },
    { header: "Sessions/Wk", accessor: "sessionsPerWeek", sortable: true },
    { header: "Enrolled", accessor: "enrolled", sortable: true },
    { header: "Rating", accessor: "rating", sortable: true },
    { header: "Visibility", accessor: "visibility", cell: (r) => <VisibilityPill visibility={r.visibility} /> },
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
          <button onClick={() => duplicateProgram(row, setPrograms)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          {row.status === "Published" ? (
            <button onClick={() => setPrograms(arr => arr.map(p => p.id === row.id ? { ...p, status: "Draft" } : p))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Unpublish
            </button>
          ) : (
            <button onClick={() => setPrograms(arr => arr.map(p => p.id === row.id ? { ...p, status: "Published" } : p))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Publish
            </button>
          )}
          <button onClick={() => setPrograms((arr) => arr.filter((x) => x.id !== row.id))} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      ),
    },
  ];

  const allIds = filtered.map((p) => p.id);
  const onToggleRow = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const onToggleAll = (ids) => setSelected((prev) => (prev.length === ids.length ? [] : ids));

  // Bulk actions
  const bulkPublish  = () => setPrograms(arr => arr.map(p => selected.includes(p.id) ? { ...p, status: "Published" } : p));
  const bulkArchive  = () => setPrograms(arr => arr.map(p => selected.includes(p.id) ? { ...p, status: "Archived" } : p));
  const bulkDelete   = () => setPrograms(arr => arr.filter(p => !selected.includes(p.id)));
  const refresh = () => { setLoading(true); setSelected([]); fetchPrograms().then(d => { setPrograms(d); setLoading(false); }); };

  // KPIs
  const kpiTotal = programs.length;
  const kpiPublished = programs.filter(p => p.status === "Published").length;
  const kpiAvgPrice = programs.length ? Math.round(programs.reduce((a,p)=>a+(p.price||0),0) / programs.length) : 0;
  const kpiEnrolled = programs.reduce((a,p)=>a+(p.enrolled||0),0);

  const exportCSV = () => {
    const rows = [["id","name","goal","level","status","visibility","billing","price","currency","billingPeriod","weeks","sessionsPerWeek","enrolled","rating","coach","nextStart","updatedAt","plans","tags","capacity"]];
    filtered.forEach(p => rows.push([
      p.id,p.name,p.goal,p.level,p.status,p.visibility,p.billing,p.price||"",p.currency||"",p.billingPeriod||"",
      p.durationWeeks,p.sessionsPerWeek,p.enrolled||0,p.rating||0,p.coach||"",p.nextStart||"",p.updatedAt||"",
      (p.plans||[]).join("|"), (p.tags||[]).join("|"), p.capacity||""
    ]));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "programs.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const importCSV = () => alert("Import CSV not wired in this mock. Connect to your uploader/parser.");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={spring}
            className="h-10 w-10 grid place-content-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md">
            <Rocket className="w-5 h-5" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-semibold">Programs</h1>
            <p className="text-sm text-slate-600">Package plans, pricing, cohorts, and access rules.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={importCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setBuilderOpen(true)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Layers} title="Total Programs" value={kpiTotal} sub={`${kpiPublished} Published`} />
        <StatCard icon={DollarSign} title="Avg Price" value={`${currencySymbol("USD")}${kpiAvgPrice}`} sub="Across all programs" />
        <StatCard icon={Users} title="Total Enrolled" value={kpiEnrolled} />
        <StatCard icon={RefreshCcw} title="Draft/Archived" value={programs.filter(p=>p.status!=="Published").length} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 lg:min-w-[340px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, goal, tags…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select label="Goal" value={goal} setValue={setGoal} options={["All", ...GOALS]} />
            <Select label="Level" value={level} setValue={setLevel} options={["All", ...LEVELS]} />
            <Select label="Status" value={status} setValue={setStatus} options={["All", ...STATUS]} />
            <Select label="Visibility" value={visibility} setValue={setVisibility} options={["All", ...VISIBILITY]} />
            <Select label="Billing" value={billing} setValue={setBilling} options={["All", ...BILLING]} />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500">Price</span>
              <input type="number" placeholder="min" value={minPrice} onChange={(e)=>setMinPrice(e.target.value)} className="w-16 outline-none" />
              <span className="text-slate-400">—</span>
              <input type="number" placeholder="max" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} className="w-16 outline-none" />
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
              className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="blue">{selected.length} selected</Badge>
                <button onClick={bulkPublish} className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Publish
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

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || "Program"} maxW="max-w-4xl">
        {preview && <ProgramPreview program={preview} />}
      </Modal>

      {/* Builder (Create/Edit) */}
      <Modal open={builderOpen || !!editRow} onClose={() => { setBuilderOpen(false); setEditRow(null); }} title={editRow ? `Edit: ${editRow?.name}` : "Create Program"} maxW="max-w-4xl">
        <ProgramBuilder
          initial={editRow || null}
          onSubmit={(payload) => {
            if (editRow) {
              setPrograms(arr => arr.map(p => p.id === editRow.id ? { ...p, ...payload, updatedAt: today() } : p));
              setEditRow(null);
            } else {
              setPrograms(arr => [{ id: Date.now(), ...payload, updatedAt: today(), enrolled: 0, rating: 0 }, ...arr]);
              setBuilderOpen(false);
            }
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

function ProgramPreview({ program }) {
  const planNames = (program.plans || []).map(id => PLANS_LIST.find(p => p.id === id)?.name || id);
  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="aspect-[16/5] rounded-xl overflow-hidden bg-slate-100 grid place-content-center">
        {program.banner ? <img src={program.banner} alt="" className="object-cover w-full h-full" /> : <Tag className="w-8 h-8 text-slate-400" />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Info title="Goal" value={program.goal} />
        <Info title="Level" value={program.level} />
        <Info title="Weeks" value={program.durationWeeks} />
        <Info title="Sessions/Wk" value={program.sessionsPerWeek} />
        <Info title="Billing" value={program.billing} />
        <Info title="Price" value={`${currencySymbol(program.currency)}${program.price || 0}${program.billing==="Subscription" && program.billingPeriod ? `/${program.billingPeriod.toLowerCase()}` : ""}`} />
        <Info title="Visibility" value={program.visibility} />
        <Info title="Status" value={program.status} />
      </div>
      <div className="text-sm text-slate-600">
        <div><span className="font-medium">Coach:</span> {program.coach || "-"}</div>
        <div className="mt-1"><span className="font-medium">Included plans:</span> {planNames.length ? planNames.join(", ") : "-"}</div>
        <div className="mt-1"><span className="font-medium">Tags:</span> {(program.tags||[]).join(", ") || "-"}</div>
        <div className="mt-1"><span className="font-medium">Next start:</span> {program.nextStart || "-"}</div>
        <div className="mt-1"><span className="font-medium">Cohorts:</span> {(program.cohorts||[]).join(", ") || "-"}</div>
        <div className="mt-1"><span className="font-medium">Capacity:</span> {program.capacity || "-"}</div>
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

function ProgramBuilder({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [goal, setGoal] = useState(initial?.goal || GOALS[0]);
  const [level, setLevel] = useState(initial?.level || LEVELS[0]);
  const [status, setStatus] = useState(initial?.status || "Draft");
  const [visibility, setVisibility] = useState(initial?.visibility || "Public");
  const [billing, setBilling] = useState(initial?.billing || "One-time");
  const [price, setPrice] = useState(initial?.price || 0);
  const [currency, setCurrency] = useState(initial?.currency || "USD");
  const [billingPeriod, setBillingPeriod] = useState(initial?.billingPeriod || "Monthly");
  const [durationWeeks, setWeeks] = useState(initial?.durationWeeks || 6);
  const [sessionsPerWeek, setSessions] = useState(initial?.sessionsPerWeek || 4);
  const [coach, setCoach] = useState(initial?.coach || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [banner, setBanner] = useState(initial?.banner || "");
  const [plans, setPlans] = useState(initial?.plans || []);
  const [cohorts, setCohorts] = useState(initial?.cohorts || []);
  const [capacity, setCapacity] = useState(initial?.capacity || 100);
  const [nextStart, setNextStart] = useState(initial?.nextStart || "");

  const addCohort = (date) => {
    if (!date) return;
    setCohorts((arr) => Array.from(new Set([...arr, date])));
  };
  const removeCohort = (date) => setCohorts(arr => arr.filter(d => d !== date));
  const togglePlan = (id) => setPlans((arr) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const payload = {
    name, goal, level, status, visibility, billing, price: Number(price) || 0, currency, billingPeriod: billing==="Subscription" ? billingPeriod : "",
    durationWeeks: Number(durationWeeks), sessionsPerWeek: Number(sessionsPerWeek),
    coach, tags: parseTags(tags), banner, plans, cohorts, capacity: Number(capacity), nextStart,
  };

  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit?.(payload);}} className="space-y-4">
      {/* Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Program Name"><input value={name} onChange={(e)=>setName(e.target.value)} required className="inp" placeholder="e.g., 8-Week Muscle Builder" /></Field>
        <Field label="Coach"><input value={coach} onChange={(e)=>setCoach(e.target.value)} className="inp" placeholder="Coach name" /></Field>
        <Field label="Goal"><SelectNative value={goal} setValue={setGoal} options={GOALS} /></Field>
        <Field label="Level"><SelectNative value={level} setValue={setLevel} options={LEVELS} /></Field>
        <Field label="Status"><SelectNative value={status} setValue={setStatus} options={STATUS} /></Field>
        <Field label="Visibility"><SelectNative value={visibility} setValue={setVisibility} options={VISIBILITY} /></Field>

        <Field label="Billing"><SelectNative value={billing} setValue={setBilling} options={BILLING} /></Field>
        <Field label="Price">
          <div className="flex gap-2">
            <input type="number" min="0" value={price} onChange={(e)=>setPrice(e.target.value)} className="inp" />
            <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="inp">
              {["USD","EUR","GBP","SAR","AED","EGP"].map(c => <option key={c}>{c}</option>)}
            </select>
            {billing === "Subscription" && (
              <select value={billingPeriod} onChange={(e)=>setBillingPeriod(e.target.value)} className="inp">
                {["Monthly","Weekly","Quarterly","Yearly"].map(p => <option key={p}>{p}</option>)}
              </select>
            )}
          </div>
        </Field>

        <Field label="Duration (weeks)"><input type="number" min="1" value={durationWeeks} onChange={(e)=>setWeeks(e.target.value)} className="inp" /></Field>
        <Field label="Sessions per week"><input type="number" min="1" value={sessionsPerWeek} onChange={(e)=>setSessions(e.target.value)} className="inp" /></Field>

        <Field label="Tags (comma separated)"><input value={tags} onChange={(e)=>setTags(e.target.value)} className="inp" placeholder="Muscle, Gym" /></Field>
        <Field label="Banner image URL"><input value={banner} onChange={(e)=>setBanner(e.target.value)} className="inp" placeholder="https://..." /></Field>

        <Field label="Capacity"><input type="number" min="1" value={capacity} onChange={(e)=>setCapacity(e.target.value)} className="inp" /></Field>
        <Field label="Next Start (optional)"><input type="date" value={nextStart} onChange={(e)=>setNextStart(e.target.value)} className="inp" /></Field>
      </div>

      {/* Include Plans */}
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-sm font-semibold mb-2">Included Plans</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PLANS_LIST.map(p => (
            <label key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 bg-white hover:bg-slate-50">
              <input type="checkbox" checked={plans.includes(p.id)} onChange={()=>togglePlan(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cohorts */}
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-sm font-semibold mb-2">Cohort Start Dates</div>
        <CohortAdder onAdd={addCohort} />
        <div className="flex flex-wrap gap-2 mt-2">
          {cohorts.map((d)=>(
            <span key={d} className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-200 bg-white">
              <Calendar className="w-3 h-3" /> {d}
              <button type="button" onClick={()=>removeCohort(d)} className="text-slate-500 hover:text-red-600">×</button>
            </span>
          ))}
          {!cohorts.length && <span className="text-sm text-slate-500">No cohorts added</span>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white inline-flex items-center gap-2">
          Save Program
        </button>
      </div>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </form>
  );
}

function CohortAdder({ onAdd }) {
  const [date, setDate] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="inp" />
      <button type="button" onClick={()=>{ onAdd?.(date); setDate(""); }} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
        Add Date
      </button>
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
function SelectNative({ value, setValue, options }) {
  return (
    <select value={value} onChange={(e)=>setValue(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ---------------- Utils ---------------- */
function duplicateProgram(row, setPrograms) {
  const copy = {
    ...row,
    id: Date.now(),
    name: `${row.name} (Copy)`,
    status: "Draft",
    updatedAt: today(),
    enrolled: 0,
    rating: 0,
  };
  setPrograms((arr)=>[copy, ...arr]);
}
function today() { return new Date().toISOString().slice(0,10); }
function currencySymbol(c) {
  const m = { USD:"$", EUR:"€", GBP:"£", SAR:"ر.س", AED:"د.إ", EGP:"E£" };
  return m[c] || "$";
}
function parseTags(s="") { return s.split(",").map(x=>x.trim()).filter(Boolean); }
