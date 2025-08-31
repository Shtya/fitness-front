"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, ToolbarButton, SearchInput, Select, DateRangeControl,
  Modal, EmptyState, spring
} from "@/components/dashboard/ui/UI";
import { FileClock, Download, RefreshCcw, Eye } from "lucide-react";
import { motion } from "framer-motion";

/* ---------------- Mock API ---------------- */
const seed = [
  { id: 1, at: "2025-08-30T11:05:00Z", actor: "admin@box.com", ip: "102.33.5.11", action: "assignment.create",   target: "Assignment#524", meta: { client: "Sarah Smith", plan: "Fat Loss" } },
  { id: 2, at: "2025-08-29T18:21:00Z", actor: "coach@box.com", ip: "102.33.5.11", action: "mealplan.update",      target: "Plan#12",        meta: { calories: 2200 } },
  { id: 3, at: "2025-08-29T09:44:00Z", actor: "john@client.com", ip: "41.35.121.2", action: "message.send",       target: "Convo#391",      meta: { text: "Finished workout" } },
  { id: 4, at: "2025-08-28T07:12:00Z", actor: "admin@box.com", ip: "102.33.5.11", action: "apikey.create",        target: "Key#88",         meta: { scope: "server" } },
  { id: 5, at: "2025-08-27T21:05:00Z", actor: "admin@box.com", ip: "102.33.5.11", action: "webhook.ping",         target: "Hook#2",         meta: { status: 200 } },
  { id: 6, at: "2025-08-26T13:31:00Z", actor: "system",         ip: "-",          action: "backup.create",        target: "Backup#2025-08-26", meta: { size: "1.1GB" } },
];
const fetchLogs = () => new Promise(res => setTimeout(()=>res(seed), 700));

/* ---------------- Page ---------------- */
export default function AuditLogsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("All");
  const [action, setAction] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // modal
  const [view, setView] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchLogs().then(d => { setRows(d); setLoading(false); });
  }, []);

  const actors = useMemo(()=>["All", ...Array.from(new Set(rows.map(r => r.actor)))], [rows]);
  const actions = useMemo(()=>["All", ...Array.from(new Set(rows.map(r => r.action)))], [rows]);

  const filtered = useMemo(() => {
    let list = rows.slice();
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => [r.actor, r.action, r.target].join(" ").toLowerCase().includes(s));
    }
    if (actor !== "All") list = list.filter(r => r.actor === actor);
    if (action !== "All") list = list.filter(r => r.action === action);
    if (from) list = list.filter(r => r.at >= from);
    if (to)   list = list.filter(r => r.at <= addDay(to));
    return list.sort((a,b)=> b.at.localeCompare(a.at));
  }, [rows, search, actor, action, from, to]);

  const columns = [
    { header: "Date", accessor: "at", sortable: true, cell: (r)=> new Date(r.at).toLocaleString() },
    { header: "Actor", accessor: "actor", sortable: true },
    { header: "IP", accessor: "ip", sortable: true },
    { header: "Action", accessor: "action", sortable: true },
    { header: "Target", accessor: "target", sortable: true },
    { header: "Details", accessor: "meta", cell: (r)=> <span className="text-xs text-slate-600">{Object.entries(r.meta||{}).map(([k,v])=>`${k}:${v}`).join(" · ")}</span> },
    {
      header: "Actions", accessor: "_act", cell: (r)=>(
        <button onClick={()=>setView(r)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1 text-sm">
          <Eye className="w-4 h-4" /> View
        </button>
      )
    }
  ];

  const exportCSV = () => {
    const head = ["at","actor","ip","action","target","meta"];
    const csvRows = [head, ...filtered.map(r => [
      r.at, r.actor, r.ip, r.action, r.target, JSON.stringify(r.meta || {})
    ])];
    const csv = csvRows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="audit-logs.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileClock}
        title="Audit Logs"
        subtitle="Tamper-evident trail of sensitive operations."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={()=>{ setLoading(true); fetchLogs().then(d=>{ setRows(d); setLoading(false); }); }} variant="secondary">Refresh</ToolbarButton>
          </div>
        }
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] items-center gap-3">
          <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search actor, action, target…" />
          <Select label="Actor" value={actor} setValue={setActor} options={actors} />
          <Select label="Action" value={action} setValue={setAction} options={actions} />
          <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
        </div>
      </motion.div>

      <div className="card-glow">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          itemsPerPage={12}
          pagination
          initialSort={{ key: "at", dir: "desc" }}
        />
        {!loading && filtered.length === 0 ? (
          <EmptyState title="No log entries" subtitle="Try different filters or date range." />
        ) : null}
      </div>

      <Modal open={!!view} onClose={()=>setView(null)} title="Log Entry">
        {view && (
          <div className="space-y-2 text-sm">
            <Info label="Date" value={new Date(view.at).toLocaleString()} />
            <Info label="Actor" value={view.actor} />
            <Info label="IP" value={view.ip} />
            <Info label="Action" value={view.action} />
            <Info label="Target" value={view.target} />
            <div>
              <div className="text-xs text-slate-600">Metadata</div>
              <pre className="mt-1 p-3 rounded-xl border border-slate-200 bg-white overflow-auto text-xs">
                {JSON.stringify(view.meta, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function addDay(dateStr){ const d = new Date(dateStr); d.setDate(d.getDate()+1); return d.toISOString(); }
