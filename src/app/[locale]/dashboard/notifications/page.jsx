"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PageHeader, SearchInput, TabsPill, Select, DateRangeControl, TimeRangeControl,
  Switch, ToolbarButton, Modal, EmptyState, Badge, spring
} from "@/components/dashboard/ui/UI";
import {
  Bell, BellRing, BellOff, Trash2, Archive, ArchiveRestore, Check, RefreshCcw,
  MessageSquare, ClipboardList, CheckCircle2, CreditCard, ShieldCheck, Activity, Download, Settings
} from "lucide-react";

/* ---------------- Mock data ---------------- */
const TYPES = ["All","System","Messages","Assignments","Check-ins","Payments","Progress"];
const TABS  = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "high", label: "High" },
  { key: "archived", label: "Archived" },
];

const seed = [
  { id: 1, type: "Messages",   title: "New message from John", body: "Finished today’s workout 💪", priority: "normal",  read: false, archived: false, createdAt: "2025-08-30T10:42:00Z", link: "/dashboard/communication/messages" },
  { id: 2, type: "Assignments",title: "Plan assigned",         body: "Sarah Smith was assigned ‘Fat Loss’", priority: "high", read: false, archived: false, createdAt: "2025-08-29T17:30:00Z", link: "/dashboard/assignments" },
  { id: 3, type: "Check-ins",  title: "Weekly check-in due",   body: "Mike Johnson is due today", priority: "high", read: true, archived: false, createdAt: "2025-08-29T07:00:00Z", link: "/dashboard/progress/check-ins" },
  { id: 4, type: "System",     title: "New version deployed",  body: "Performance improvements applied", priority: "normal", read: true, archived: true, createdAt: "2025-08-10T09:00:00Z", link: "#" },
  { id: 5, type: "Payments",   title: "Invoice paid",          body: "David Brown paid August invoice", priority: "normal", read: false, archived: false, createdAt: "2025-08-20T12:10:00Z", link: "#" },
  { id: 6, type: "Progress",   title: "Milestone reached",     body: "Emily hit −5kg since start", priority: "normal", read: true, archived: false, createdAt: "2025-08-26T08:15:00Z", link: "/dashboard/progress" },
];

const fetchNotifs = () => new Promise(res => setTimeout(()=>res(seed), 700));

/* ---------------- Page ---------------- */
export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // filters
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // selection
  const [selected, setSelected] = useState([]);

  // preferences
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(false);
  const [quietFrom, setQuietFrom] = useState("22:00");
  const [quietTo, setQuietTo] = useState("07:00");
  const [digest, setDigest] = useState("Daily"); // Instant | Hourly | Daily | Weekly
  const [prefsOpen, setPrefsOpen] = useState(false);

  // muted types
  const [mutedTypes, setMutedTypes] = useState(new Set()); // e.g., "System"

  useEffect(() => {
    setLoading(true);
    fetchNotifs().then(d => { setRows(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = rows.slice();
    if (tab === "unread") list = list.filter(n => !n.read && !n.archived);
    if (tab === "high") list = list.filter(n => n.priority === "high" && !n.archived);
    if (tab === "archived") list = list.filter(n => n.archived);
    if (tab === "all") list = list.filter(n => !n.archived);

    if (type !== "All") list = list.filter(n => n.type === type);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(n => [n.title, n.body, n.type].join(" ").toLowerCase().includes(s));
    }
    if (from) list = list.filter(n => n.createdAt >= from);
    if (to)   list = list.filter(n => n.createdAt <= addDay(to)); // inclusive end

    // show muted but send them to the bottom
    list = list.sort((a,b) => {
      const mA = mutedTypes.has(a.type), mB = mutedTypes.has(b.type);
      if (mA !== mB) return mA ? 1 : -1;
      const p = (b.priority === "high") - (a.priority === "high");
      if (p) return p;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return list;
  }, [rows, tab, type, search, from, to, mutedTypes]);

  // grouping
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  /* ---------------- Actions ---------------- */
  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = (ids) => setSelected(prev => prev.length === ids.length ? [] : ids);

  const markRead = (ids) => setRows(arr => arr.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
  const markUnread = (ids) => setRows(arr => arr.map(n => ids.includes(n.id) ? { ...n, read: false } : n));
  const archive = (ids, value=true) => setRows(arr => arr.map(n => ids.includes(n.id) ? { ...n, archived: value } : n));
  const remove = (ids) => setRows(arr => arr.filter(n => !ids.includes(n.id)));
  const muteType = (t) => setMutedTypes(prev => new Set(prev.has(t) ? [...[...prev].filter(x=>x!==t)] : [...prev, t]));

  const refresh = () => { setLoading(true); fetchNotifs().then(d => { setRows(d); setLoading(false); }); };
  const exportCSV = () => {
    const head = ["id","type","title","body","priority","read","archived","createdAt"];
    const rowsCsv = [head, ...filtered.map(n => head.map(k => `"${String(n[k] ?? "").replace(/"/g,'""')}"`))];
    const csv = rowsCsv.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="notifications.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const markAllRead = () => markRead(filtered.map(n => n.id));

  /* ---------------- Render ---------------- */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* Left: list */}
      <div className="space-y-4">
        <PageHeader
          icon={Bell}
          title="Notifications"
          subtitle="All system and client alerts in one place."
          actions={
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Download} onClick={exportCSV} variant="secondary">Export</ToolbarButton>
              <ToolbarButton icon={Settings} onClick={()=>setPrefsOpen(true)} variant="secondary">Preferences</ToolbarButton>
              <ToolbarButton icon={Check} onClick={markAllRead}>Mark all read</ToolbarButton>
            </div>
          }
        />

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search notifications…" className="w-full lg:min-w-[320px]" />
            <div className="flex flex-wrap items-center gap-2">
              <TabsPill tabs={TABS} active={tab} onChange={setTab} id="notifications-tabs" />
              <Select label="Type" value={type} setValue={setType} options={TYPES} />
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
              <ToolbarButton icon={RefreshCcw} onClick={refresh} variant="secondary">Refresh</ToolbarButton>
            </div>
          </div>

          {/* Bulk actions */}
          {selected.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="text-sm text-slate-600">{selected.length} selected</span>
              <button onClick={()=>markRead(selected)} className="ml-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2">
                <Check className="w-4 h-4" /> Read
              </button>
              <button onClick={()=>markUnread(selected)} className="ml-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2">
                <BellRing className="w-4 h-4" /> Unread
              </button>
              <button onClick={()=>archive(selected, true)} className="ml-2 px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 inline-flex items-center gap-2">
                <Archive className="w-4 h-4" /> Archive
              </button>
              <button onClick={()=>remove(selected)} className="ml-2 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </motion.div>

        {/* List */}
        <div className="card-glow p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No notifications" subtitle="Try a different filter or date range." />
          ) : (
            Object.entries(groups).map(([label, list]) => (
              <div key={label} className="pb-2">
                <div className="px-2 py-2 text-xs font-semibold text-slate-500">{label}</div>
                <ul className="space-y-1">
                  {/* header row with Select All for the section */}
                  <li className="px-2">
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={list.every(n => selected.includes(n.id))}
                        onChange={()=>selectAll(list.map(n=>n.id))}
                      />
                      Select all in “{label}”
                    </label>
                  </li>

                  {list.map(n => (
                    <li key={n.id}>
                      <div className={`px-3 py-3 rounded-xl border transition flex items-start gap-3 ${n.read ? "bg-white hover:bg-slate-50 border-slate-200" : "bg-indigo-50/60 border-indigo-200"}`}>
                        <input
                          type="checkbox"
                          className="mt-1.5"
                          checked={selected.includes(n.id)}
                          onChange={() => toggleSelect(n.id)}
                        />
                        <div className="w-9 h-9 rounded-xl grid place-content-center text-white shadow"
                          style={{ background: iconBg(n) }}>
                          {iconFor(n)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">{n.title}</div>
                            <div className="text-xs text-slate-500 shrink-0">{timeAgo(n.createdAt)}</div>
                          </div>
                          <div className="text-sm text-slate-600 truncate">{n.body}</div>
                          <div className="mt-1 flex items-center gap-2">
                            {n.priority === "high" && <Badge color="red">High</Badge>}
                            <Badge color="slate">{n.type}</Badge>
                            {mutedTypes.has(n.type) && <Badge color="amber">Muted</Badge>}
                            {n.archived && <Badge color="blue">Archived</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!n.read ? (
                            <IconBtn title="Mark read" onClick={()=>markRead([n.id])}><Check className="w-4 h-4" /></IconBtn>
                          ) : (
                            <IconBtn title="Mark unread" onClick={()=>markUnread([n.id])}><BellRing className="w-4 h-4" /></IconBtn>
                          )}
                          <IconBtn title={n.archived ? "Unarchive" : "Archive"} onClick={()=>archive([n.id], !n.archived)}>
                            {n.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </IconBtn>
                          <IconBtn title={`${mutedTypes.has(n.type) ? "Unmute" : "Mute"} ${n.type}`} onClick={()=>muteType(n.type)}>
                            <BellOff className="w-4 h-4" />
                          </IconBtn>
                          <IconBtn title="Delete" onClick={()=>remove([n.id])}><Trash2 className="w-4 h-4" /></IconBtn>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Preferences */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-4">
        <div className="card-glow p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Channel preferences</div>
              <div className="font-semibold">Delivery</div>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <Switch checked={email} onChange={setEmail} label="Email" />
            <Switch checked={push} onChange={setPush} label="Push" />
            <Switch checked={sms} onChange={setSms} label="SMS" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <TimeRangeControl label="Quiet hours" from={quietFrom} to={quietTo} setFrom={setQuietFrom} setTo={setQuietTo} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Digest</span>
              <select value={digest} onChange={(e)=>setDigest(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white">
                {["Instant","Hourly","Daily","Weekly"].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button onClick={()=>alert("Preferences saved (mock).")} className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">
              Save preferences
            </button>
          </div>
        </div>

        <div className="card-glow p-5">
          <div className="font-semibold mb-2">Muted types</div>
          <div className="flex flex-wrap gap-2">
            {["System","Messages","Assignments","Check-ins","Payments","Progress"].map(t => (
              <button
                key={t}
                onClick={()=>muteType(t)}
                className={`px-2 py-1 rounded-lg border text-xs ${
                  mutedTypes.has(t) ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                {mutedTypes.has(t) ? "Unmute" : "Mute"} {t}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Preferences modal (same controls, mobile-friendly) */}
      <Modal open={prefsOpen} onClose={()=>setPrefsOpen(false)} title="Notification Preferences">
        <div className="space-y-4">
          <div className="space-y-3">
            <Switch checked={email} onChange={setEmail} label="Email" />
            <Switch checked={push} onChange={setPush} label="Push" />
            <Switch checked={sms} onChange={setSms} label="SMS" />
          </div>
          <TimeRangeControl label="Quiet hours" from={quietFrom} to={quietTo} setFrom={setQuietFrom} setTo={setQuietTo} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Digest</span>
            <select value={digest} onChange={(e)=>setDigest(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white">
              {["Instant","Hourly","Daily","Weekly"].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end">
            <button onClick={()=>{ setPrefsOpen(false); alert("Preferences saved (mock)."); }} className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Local bits ---------------- */
function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 grid place-content-center">
      {children}
    </button>
  );
}

function iconFor(n) {
  const cls = "w-5 h-5";
  switch (n.type) {
    case "Messages":   return <MessageSquare className={cls} />;
    case "Assignments":return <ClipboardList className={cls} />;
    case "Check-ins":  return <CheckCircle2 className={cls} />;
    case "Payments":   return <CreditCard className={cls} />;
    case "Progress":   return <Activity className={cls} />;
    case "System":
    default:           return <ShieldCheck className={cls} />;
  }
}
function iconBg(n) {
  if (n.priority === "high") return "linear-gradient(135deg,#ef4444,#f59e0b)"; // red→amber
  switch (n.type) {
    case "Messages":    return "linear-gradient(135deg,#4f46e5,#3b82f6)";
    case "Assignments": return "linear-gradient(135deg,#06b6d4,#22c55e)";
    case "Check-ins":   return "linear-gradient(135deg,#10b981,#34d399)";
    case "Payments":    return "linear-gradient(135deg,#0ea5e9,#06b6d4)";
    case "Progress":    return "linear-gradient(135deg,#8b5cf6,#6366f1)";
    case "System":
    default:            return "linear-gradient(135deg,#64748b,#94a3b8)";
  }
}

/* ---------------- Utils ---------------- */
function addDay(dateStr){ const d = new Date(dateStr); d.setDate(d.getDate()+1); return d.toISOString(); }
function timeAgo(iso) {
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d)/1000);
  if (s < 60) return `${s}s`; const m = Math.floor(s/60); if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`;
  const days = Math.floor(h/24); if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
function groupByDate(list){
  const out = { "Today": [], "This week": [], "Earlier": [] };
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
  const startOfWeek = new Date(now); const day = startOfWeek.getDay(); const diff = (day+6)%7; // Mon week
  startOfWeek.setDate(startOfWeek.getDate() - diff); startOfWeek.setHours(0,0,0,0);

  list.forEach(n => {
    const dt = new Date(n.createdAt);
    if (dt >= startOfDay) out["Today"].push(n);
    else if (dt >= startOfWeek) out["This week"].push(n);
    else out["Earlier"].push(n);
  });
  // remove empty groups
  Object.keys(out).forEach(k => { if (!out[k].length) delete out[k]; });
  return out;
}
