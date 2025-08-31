"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import Scanner from "./Scanner";
import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, SearchInput, Select, DateRangeControl, Badge,
  StatPill, CapacityMeter, spring
} from "@/components/dashboard/ui/UI";
import { QrCode, Users, Download, Plus, RotateCcw, ScanLine } from "lucide-react";

/* ===== Mock store ===== */
const seedMembers = [
  { id: "M-1001", name: "John Doe" },
  { id: "M-1002", name: "Sarah Smith" },
  { id: "M-1003", name: "Mike Johnson" },
];

const seedLogs = [
  { id: 1, at: "2025-08-31T08:10:00Z", type: "in",  memberId: "M-1001", name: "John Doe" },
  { id: 2, at: "2025-08-31T09:05:00Z", type: "in",  memberId: "M-1002", name: "Sarah Smith" },
  { id: 3, at: "2025-08-31T10:22:00Z", type: "out", memberId: "M-1001", name: "John Doe" },
];

const fetchAll = () => new Promise(res => setTimeout(()=>res({
  members: seedMembers,
  logs: seedLogs,
  capacityLimit: 80, // editable
}), 500));

/* ===== Utils ===== */
const fmt = (iso) => new Date(iso).toLocaleString();
const todayISO = () => new Date().toISOString().slice(0,10);

export default function AttendancePage() {
  const [tab, setTab] = useState("checkin"); // checkin | logs | capacity
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ members: [], logs: [], capacityLimit: 80 });
  const [inside, setInside] = useState(new Set()); // live presence

  // filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  // manual check-in modal
  const [openManual, setOpenManual] = useState(false);
  const [manual, setManual] = useState({ memberId: "", type: "in" });

  useEffect(() => {
    setLoading(true);
    fetchAll().then((d) => {
      setData(d);
      const current = new Set();
      d.logs.sort((a,b)=>a.at.localeCompare(b.at)).forEach(l => {
        if (l.type === "in") current.add(l.memberId);
        else current.delete(l.memberId);
      });
      setInside(current);
      setLoading(false);
    });
  }, []);

  // derived
  const logsFiltered = useMemo(() => {
    let list = data.logs.slice();
    if (type !== "All") list = list.filter(l => l.type === type);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l => [l.memberId, l.name].join(" ").toLowerCase().includes(s));
    }
    if (from) list = list.filter(l => l.at >= from);
    if (to)   list = list.filter(l => l.at <= addDay(to));
    return list.sort((a,b) => b.at.localeCompare(a.at));
  }, [data.logs, type, search, from, to]);

  const cols = [
    { header: "Time", accessor: "at", sortable: true, cell: r => fmt(r.at) },
    { header: "Member", accessor: "name", sortable: true },
    { header: "Member ID", accessor: "memberId" },
    { header: "Type", accessor: "type", cell: r => r.type==="in" ? <Badge color="emerald">IN</Badge> : <Badge color="slate">OUT</Badge> },
  ];

  const exportCSV = () => {
    const keys = ["at","memberId","name","type"];
    const rows = [keys, ...logsFiltered.map(r => keys.map(k => r[k]))]
      .map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv;charset=utf-8" }));
    a.download = `attendance-${from || "all"}-${to || "all"}.csv`;
    a.click();
  };

  const handleDetect = (text) => {
    // expect payload like "M-1001" or "member:M-1001"
    const memberId = (String(text).match(/(M-\d{4,})/)||[])[1] || String(text).trim();
    const m = data.members.find(x => x.id === memberId);
    if (!m) { alert(`Unknown member: ${memberId}`); return; }

    // decide in/out based on presence
    const isInside = inside.has(memberId);
    const nextType = isInside ? "out" : "in";
    addLog({ memberId, name: m.name, type: nextType });
  };

  const addLog = ({ memberId, name, type }) => {
    const log = { id: Date.now(), at: new Date().toISOString(), memberId, name, type };
    setData(d => ({ ...d, logs: [log, ...d.logs] }));
    setInside(set => {
      const s = new Set(set);
      if (type === "in") s.add(memberId); else s.delete(memberId);
      return s;
    });
  };

  const resetToday = () => {
    if (!confirm("Clear today's logs?")) return;
    setData(d => ({ ...d, logs: d.logs.filter(l => l.at.slice(0,10) !== todayISO()) }));
    setInside(new Set());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={QrCode}
        title="Attendance & Access"
        subtitle="Scan member codes, monitor occupancy, and review logs."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={ScanLine} href="/kiosk/check-in" variant="secondary">Open Kiosk</ToolbarButton>
            <ToolbarButton icon={RotateCcw} onClick={resetToday} variant="secondary">Clear Today</ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="attendance-tabs"
        tabs={[
          { key: "checkin", label: "Check-in" , icon: QrCode },
          { key: "logs",    label: "Logs",      icon: Users  },
          { key: "capacity",label: "Capacity",  icon: Users  },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== Check-in ===== */}
      {tab === "checkin" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-glow p-4">
            <div className="font-semibold mb-2">Scan QR / Barcode</div>
            <Scanner onDetected={handleDetect} />
            <div className="mt-3 text-xs text-slate-600">
              Tip: generate passes like <code>M-1001</code> as QR for members’ phones/cards.
            </div>
          </div>
          <div className="space-y-3">
            <StatPill label="Inside now" value={inside.size} sub="Members currently checked in" />
            <StatPill label="Today entries" value={data.logs.filter(l => l.type==='in' && l.at.slice(0,10)===todayISO()).length} />
            <StatPill label="Today exits" value={data.logs.filter(l => l.type==='out' && l.at.slice(0,10)===todayISO()).length} />
            <div className="card-glow p-4">
              <div className="font-semibold mb-2">Manual entry</div>
              <button onClick={()=>setOpenManual(true)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add check-in/out
              </button>
            </div>
          </div>

          {/* manual modal */}
          <Modal open={openManual} onClose={()=>setOpenManual(false)} title="Manual Check-in/out">
            <form
              onSubmit={(e)=>{ e.preventDefault();
                const m = data.members.find(x => x.id === manual.memberId);
                if (!m) return alert("Select a member");
                addLog({ memberId: m.id, name: m.name, type: manual.type });
                setOpenManual(false); setManual({ memberId: "", type: "in" });
              }}
              className="space-y-3"
            >
              <Field label="Member">
                <select className="inp" value={manual.memberId} onChange={(e)=>setManual(v=>({ ...v, memberId: e.target.value }))} required>
                  <option value="">Select member…</option>
                  {data.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.id}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select className="inp" value={manual.type} onChange={(e)=>setManual(v=>({ ...v, type: e.target.value }))}>
                  <option value="in">Check-in</option>
                  <option value="out">Check-out</option>
                </select>
              </Field>
              <div className="flex items-center justify-end"><button className="btn-primary">Add</button></div>
            </form>
          </Modal>
        </motion.div>
      )}

      {/* ===== Logs ===== */}
      {tab === "logs" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Member name or ID…" />
              <Select label="Type" value={type} setValue={setType} options={["All","in","out"]} />
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export CSV</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={cols} data={logsFiltered} loading={loading} pagination itemsPerPage={12} />
            {!loading && logsFiltered.length===0 && <EmptyState title="No logs" subtitle="Try another date range or type." />}
          </div>
        </motion.div>
      )}

      {/* ===== Capacity ===== */}
      {tab === "capacity" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CapacityMeter current={inside.size} max={data.capacityLimit} />
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Currently inside</div>
              {inside.size ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Array.from(inside).map(id => {
                    const m = data.members.find(x => x.id === id);
                    return (
                      <li key={id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m?.name || id}</div>
                          <div className="text-xs text-slate-500">{id}</div>
                        </div>
                        <button className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                                onClick={()=>addLog({ memberId: id, name: m?.name||id, type: "out" })}>
                          Force OUT
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <EmptyState title="No one inside" subtitle="Scan to check members in." />}
            </div>
          </div>
          <div className="space-y-4">
            <div className="card-glow p-5">
              <div className="font-semibold">Capacity limit</div>
              <input type="range" min={10} max={200} value={data.capacityLimit}
                     onChange={(e)=>setData(d=>({ ...d, capacityLimit: +e.target.value }))}
                     className="w-full mt-3" />
              <div className="text-sm text-slate-600 mt-1">{data.capacityLimit} members</div>
            </div>
            <div className="card-glow p-5">
              <div className="font-semibold mb-1">Tips</div>
              <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                <li>Use Kiosk Mode for unattended check-in at the entrance.</li>
                <li>Put member QR in their app/profile or on keycards.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
      `}</style>
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
function addDay(dateStr){ const d = new Date(dateStr); d.setDate(d.getDate()+1); return d.toISOString(); }
