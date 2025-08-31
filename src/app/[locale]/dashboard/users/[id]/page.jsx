"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import ProgressChart from "@/components/dashboard/ui/Charts/ProgressChart";
import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, DateRangeControl,
  Avatar, FileDrop, spring
} from "@/components/dashboard/ui/UI";
import {
  User, Send, ClipboardList, MessageSquare, Plus, Download, Pencil, Trash2,
  CalendarRange, LineChart, NotebookPen, Folder, CreditCard, Activity, CheckCircle2
} from "lucide-react";

/* ---------------- Mock API ---------------- */
// Replace these with real API calls later.
const fetchClient = (id) =>
  new Promise((res) =>
    setTimeout(
      () =>
        res({
          id,
          name: "John Doe",
          email: "john@example.com",
          phone: "+20 100 000 0000",
          avatar: "",
          status: "Active",
          joinedAt: "2024-10-10",
          coach: "Coach Ali",
          membership: { plan: "Standard", renewsAt: "2025-10-10", status: "Active" },
          tags: ["fat loss", "beginner"],
          measurements: [
            { date: "2025-05-01", weight: 82, bodyFat: 21, chest: 102, waist: 86, arms: 35.5, thighs: 58 },
            { date: "2025-06-01", weight: 80, bodyFat: 19.8, chest: 101, waist: 84.5, arms: 35.8, thighs: 57.6 },
            { date: "2025-07-01", weight: 78.9, bodyFat: 18.6, chest: 100.5, waist: 83.6, arms: 36, thighs: 57.3 },
            { date: "2025-08-01", weight: 78.1, bodyFat: 17.9, chest: 100.2, waist: 83.0, arms: 36.2, thighs: 57.1 },
          ],
          notes: [
            { id: 1, at: "2025-08-20T10:00:00Z", text: "Great adherence this week. Increase steps target by +1k." },
            { id: 2, at: "2025-08-10T12:30:00Z", text: "Left knee a bit sore—keep squats at RPE 7." },
          ],
          checkins: [
            { id: 201, date: "2025-08-25", weight: 78.2, bodyFat: 17.8, adherence: 88, mood: 4 },
            { id: 202, date: "2025-08-18", weight: 78.5, bodyFat: 18.0, adherence: 85, mood: 4 },
            { id: 203, date: "2025-08-11", weight: 78.9, bodyFat: 18.2, adherence: 82, mood: 3 },
          ],
          workouts: [
            { id: 10, name: "Lower A", schedule: "Mon", status: "Assigned" },
            { id: 11, name: "Upper A", schedule: "Wed", status: "Assigned" },
          ],
          mealPlans: [
            { id: 31, name: "Weight Loss Plan", calories: 2000, protein: 160, carbs: 200, fat: 65, status: "Active" },
          ],
          assignments: [
            { id: 51, type: "program", title: "Beginner Strength · 8 weeks", startDate: "2025-07-01", endDate: "2025-08-26", status: "Active" },
          ],
          messagesPreview: [
            { id: "m1", from: "client", text: "Finished today’s workout 💪", at: "2025-08-30T11:32:00Z" },
            { id: "m2", from: "coach", text: "Nice! How was RPE on squats?", at: "2025-08-30T11:34:00Z" },
          ],
          files: [
            { id: "f1", name: "Waiver.pdf", size: "122 KB", at: "2025-07-15T09:20:00Z" },
            { id: "f2", name: "Before.jpg", size: "1.1 MB", at: "2025-05-01T08:00:00Z" },
          ],
          invoices: [
            { id: "inv_1001", date: "2025-08-01", amount: 800, currency: "EGP", status: "paid" },
            { id: "inv_1000", date: "2025-07-01", amount: 800, currency: "EGP", status: "paid" },
          ],
          activity: [
            { id: "a1", at: "2025-08-30T11:32:00Z", kind: "message", text: "Client sent a message" },
            { id: "a2", at: "2025-08-25T09:00:00Z", kind: "checkin", text: "Weekly check-in submitted" },
            { id: "a3", at: "2025-08-10T13:00:00Z", kind: "plan", text: "Program ‘Beginner Strength’ assigned" },
          ],
        }),
      600
    )
  );

/* ---------------- Helpers ---------------- */
const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "measurements", label: "Measurements", icon: ClipboardList },
  { key: "progress", label: "Progress", icon: LineChart },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "workouts", label: "Workouts", icon: CalendarRange },
  { key: "nutrition", label: "Nutrition", icon: CheckCircle2 },
  { key: "assignments", label: "Assignments", icon: Activity },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "checkins", label: "Check-ins", icon: ClipboardList },
  { key: "files", label: "Files", icon: Folder },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "activity", label: "Activity", icon: Activity },
];

function fmt(d) { return new Date(d).toLocaleDateString(); }
function timeAgo(iso) {
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d)/1000);
  if (s < 60) return `${s}s`; const m = Math.floor(s/60); if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`;
  const days = Math.floor(h/24); if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

/* ---------------- Page ---------------- */
export default function ClientProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [active, setActive] = useState("overview");

  // local UI state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [addMeasOpen, setAddMeasOpen] = useState(false);
  const [newMeas, setNewMeas] = useState({ date: new Date().toISOString().slice(0,10), weight: "", bodyFat: "", chest: "", waist: "", arms: "", thighs: "" });
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [metric, setMetric] = useState("weight");

  useEffect(() => {
    setLoading(true);
    fetchClient(id).then((data) => {
      setClient(data);
      setLoading(false);
    });
  }, [id]);

  const filteredMeasurements = useMemo(() => {
    if (!client) return [];
    let list = client.measurements.slice();
    if (from) list = list.filter((r) => r.date >= from);
    if (to) list = list.filter((r) => r.date <= to);
    return list.sort((a,b)=>a.date.localeCompare(b.date));
  }, [client, from, to]);

  const measColumns = [
    { header: "Date", accessor: "date", sortable: true, cell: (r) => fmt(r.date) },
    { header: "Weight (kg)", accessor: "weight", sortable: true },
    { header: "Body Fat (%)", accessor: "bodyFat", sortable: true },
    { header: "Chest (cm)", accessor: "chest" },
    { header: "Waist (cm)", accessor: "waist" },
    { header: "Arms (cm)", accessor: "arms" },
    { header: "Thighs (cm)", accessor: "thighs" },
  ];

  const checkinColumns = [
    { header: "Date", accessor: "date", cell: (r)=>fmt(r.date) },
    { header: "Weight", accessor: "weight" },
    { header: "Body Fat %", accessor: "bodyFat" },
    { header: "Adherence %", accessor: "adherence" },
    { header: "Mood", accessor: "mood" },
  ];

  const invoiceColumns = [
    { header: "Invoice", accessor: "id" },
    { header: "Date", accessor: "date", cell: (r)=>fmt(r.date) },
    { header: "Amount", accessor: "amount", cell: (r)=>`${r.amount} ${r.currency}` },
    { header: "Status", accessor: "status", cell: (r)=>(<span className={`px-2 py-0.5 rounded-full text-xs ${r.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-800'}`}>{r.status}</span>) },
  ];

  const activityColors = { message: "bg-indigo-50", checkin: "bg-emerald-50", plan: "bg-blue-50" };

  const exportMeasurements = () => {
    const head = ["date","weight","bodyFat","chest","waist","arms","thighs"];
    const rows = [head, ...filteredMeasurements.map(m => head.map(k => m[k] ?? ""))];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `client-${client?.id}-measurements.csv`;
    a.click();
  };

  const addMeasurement = (e) => {
    e.preventDefault();
    setClient(c => ({ ...c, measurements: [...c.measurements, { ...newMeas, ...toNums(newMeas) }] }));
    setAddMeasOpen(false);
    setNewMeas({ date: new Date().toISOString().slice(0,10), weight: "", bodyFat: "", chest: "", waist: "", arms: "", thighs: "" });
  };

  const addNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setClient(c => ({ ...c, notes: [{ id: Date.now(), at: new Date().toISOString(), text: noteText.trim() }, ...c.notes] }));
    setAddNoteOpen(false);
    setNoteText("");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-72 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!client) return <EmptyState title="Client not found" subtitle="Check the URL or go back to Users." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={User}
        title={client.name}
        subtitle={`${client.email} • ${client.phone || "No phone"} • Joined ${fmt(client.joinedAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={MessageSquare} onClick={()=>router.push(`/dashboard/communication/messages?client=${client.id}`)} variant="secondary">Open Chat</ToolbarButton>
            <ToolbarButton icon={ClipboardList} onClick={()=>router.push(`/dashboard/progress/check-ins?client=${client.id}`)} variant="secondary">New Check-in</ToolbarButton>
            <ToolbarButton icon={Pencil} onClick={()=>alert("Edit client (mock).")}>Edit</ToolbarButton>
          </div>
        }
      />

      {/* Identity strip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{client.status}</span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Coach: {client.coach}</span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{client.membership.plan} · {client.membership.status}</span>
              {client.tags.map((t)=>(
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">#{t}</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <TabsPill tabs={TABS} active={active} onChange={setActive} id="client-360-tabs" />

      {/* Tab content */}
      {active === "overview" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: quick stats + next */}
          <div className="space-y-6">
            <div className="card-glow p-5">
              <div className="font-semibold mb-3">Quick Stats</div>
              <div className="grid grid-cols-3 gap-3">
                <Stat title="Weight" value={`${last(client.measurements)?.weight ?? "—"} kg`} />
                <Stat title="Body Fat" value={`${last(client.measurements)?.bodyFat ?? "—"} %`} />
                <Stat title="Adherence (30d)" value={`${avg(client.checkins.map(c=>c.adherence)).toFixed(0)}%`} />
              </div>
            </div>
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Upcoming</div>
              <div className="text-sm text-slate-600">Next session: <span className="font-medium">Wednesday · 6:00 PM</span></div>
              <div className="mt-2 text-xs text-slate-500">Lower A · RPE 7 cap</div>
              <div className="mt-3 flex items-center gap-2">
                <ToolbarButton icon={CalendarRange} variant="secondary" onClick={()=>alert("Reschedule (mock).")}>Reschedule</ToolbarButton>
                <ToolbarButton icon={Send} variant="secondary" onClick={()=>router.push(`/dashboard/communication/messages?client=${client.id}`)}>Message</ToolbarButton>
              </div>
            </div>
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Current Program</div>
              {client.assignments.length ? (
                <>
                  <div className="text-sm">{client.assignments[0].title}</div>
                  <div className="text-xs text-slate-500">Ends {fmt(client.assignments[0].endDate)}</div>
                </>
              ) : <div className="text-sm text-slate-600">No active program.</div>}
            </div>
          </div>

          {/* Middle: chart */}
          <div className="lg:col-span-2 card-glow p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Progress</div>
              <div className="flex items-center gap-2">
                <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white" value={metric} onChange={(e)=>setMetric(e.target.value)}>
                  <option value="weight">Weight</option>
                  <option value="bodyFat">Body Fat</option>
                  <option value="chest">Chest</option>
                  <option value="waist">Waist</option>
                  <option value="arms">Arms</option>
                  <option value="thighs">Thighs</option>
                </select>
                <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
              </div>
            </div>
            <div className="mt-3">
              <ProgressChart
                data={filteredMeasurements.map(m => ({ date: m.date, weight: m.weight, bodyFat: m.bodyFat, chest: m.chest, waist: m.waist, arms: m.arms, thighs: m.thighs }))}
                metric={metric}
                metricName={labelFor(metric)}
                unit={unitFor(metric)}
              />
            </div>
          </div>
        </motion.div>
      )}

      {active === "measurements" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow">
          <div className="p-4 flex items-center justify-between">
            <div className="font-semibold">Measurements</div>
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Download} variant="secondary" onClick={exportMeasurements}>Export CSV</ToolbarButton>
              <ToolbarButton icon={Plus} onClick={()=>setAddMeasOpen(true)}>Add</ToolbarButton>
            </div>
          </div>
          <div className="px-4 pb-4">
            <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
          </div>
          <DataTable columns={measColumns} data={filteredMeasurements} loading={false} itemsPerPage={8} pagination />
          {!filteredMeasurements.length && <EmptyState title="No measurements" subtitle="Add a measurement to get started." />}
        </motion.div>
      )}

      {active === "progress" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          {/* reuse the same block but show key deltas */}
          <div className="card-glow p-5">
            <div className="font-semibold mb-2">Progress Charts</div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white" value={metric} onChange={(e)=>setMetric(e.target.value)}>
                {["weight","bodyFat","chest","waist","arms","thighs"].map(m => <option key={m} value={m}>{labelFor(m)}</option>)}
              </select>
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <div className="mt-3">
              <ProgressChart
                data={filteredMeasurements.map(m => ({ date: m.date, weight: m.weight, bodyFat: m.bodyFat, chest: m.chest, waist: m.waist, arms: m.arms, thighs: m.thighs }))}
                metric={metric}
                metricName={labelFor(metric)}
                unit={unitFor(metric)}
              />
            </div>
          </div>
        </motion.div>
      )}

      {active === "notes" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Coach Notes</div>
            <ToolbarButton icon={Plus} onClick={()=>setAddNoteOpen(true)}>New Note</ToolbarButton>
          </div>
          <div className="mt-3 space-y-3">
            {client.notes.length ? client.notes.map(n => (
              <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">{timeAgo(n.at)}</div>
                <div className="mt-0.5">{n.text}</div>
              </div>
            )) : <EmptyState title="No notes" subtitle="Add your first coaching note." />}
          </div>
        </motion.div>
      )}

      {active === "workouts" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="font-semibold mb-2">Assigned Workouts</div>
          {client.workouts.length ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {client.workouts.map(w => (
                <li key={w.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-slate-500">{w.schedule} · {w.status}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm">Open</button>
                    <button className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm">Edit</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No workouts" subtitle="Assign a workout plan to get started." />}
        </motion.div>
      )}

      {active === "nutrition" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="font-semibold mb-2">Meal Plans</div>
          {client.mealPlans.length ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {client.mealPlans.map(m => (
                <li key={m.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.calories} kcal · P{m.protein} / C{m.carbs} / F{m.fat}</div>
                  <div className="mt-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 w-fit">{m.status}</div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No meal plans" subtitle="Assign a meal plan from Nutrition." />}
        </motion.div>
      )}

      {active === "assignments" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="font-semibold mb-2">Assignments</div>
          {client.assignments.length ? (
            <ul className="space-y-2">
              {client.assignments.map(a => (
                <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-slate-500">From {fmt(a.startDate)} to {fmt(a.endDate)} · {a.status}</div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No assignments" subtitle="Assign a program or diet." />}
        </motion.div>
      )}

      {active === "messages" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Recent Messages</div>
            <ToolbarButton icon={MessageSquare} onClick={()=>router.push(`/dashboard/communication/messages?client=${client.id}`)}>Open Chat</ToolbarButton>
          </div>
          <div className="mt-3 space-y-2">
            {client.messagesPreview.length ? client.messagesPreview.map(m => (
              <div key={m.id} className={`px-3 py-2 rounded-2xl border ${m.from==='coach'? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white border-slate-200'}`}>
                <div className="text-xs opacity-80">{timeAgo(m.at)}</div>
                <div>{m.text}</div>
              </div>
            )) : <EmptyState title="No messages" subtitle="Start a conversation from Messages." />}
          </div>
        </motion.div>
      )}

      {active === "checkins" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow">
          <div className="p-4 flex items-center justify-between">
            <div className="font-semibold">Check-ins</div>
            <ToolbarButton icon={ClipboardList} onClick={()=>router.push(`/dashboard/progress/check-ins?client=${client.id}`)}>Open Check-ins</ToolbarButton>
          </div>
          <DataTable columns={checkinColumns} data={client.checkins} loading={false} itemsPerPage={8} pagination />
          {!client.checkins.length && <EmptyState title="No check-ins" subtitle="Submit the first weekly check-in." />}
        </motion.div>
      )}

      {active === "files" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="font-semibold mb-2">Files</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FileDrop label="Upload files" multiple onFiles={(fs)=>alert(`${fs.length} file(s) selected (mock).`)} />
            <div className="md:col-span-2">
              {client.files.length ? (
                <ul className="space-y-2">
                  {client.files.map(f => (
                    <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.name}</div>
                        <div className="text-xs text-slate-500">{f.size} · {fmt(f.at)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm">View</button>
                        <button className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 text-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No files" subtitle="Upload PDFs or images for this client." />}
            </div>
          </div>
        </motion.div>
      )}

      {active === "billing" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow">
          <div className="p-4 flex items-center justify-between">
            <div className="font-semibold">Billing</div>
            <div className="text-sm text-slate-600">
              Plan: <span className="font-medium">{client.membership.plan}</span> · Renews {fmt(client.membership.renewsAt)} ·
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{client.membership.status}</span>
            </div>
          </div>
          <div className="p-4">
            <DataTable columns={invoiceColumns} data={client.invoices} loading={false} itemsPerPage={6} pagination />
            {!client.invoices.length && <EmptyState title="No invoices" subtitle="Create the first invoice." />}
          </div>
        </motion.div>
      )}

      {active === "activity" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="font-semibold mb-2">Activity</div>
          {client.activity.length ? (
            <ul className="space-y-2">
              {client.activity.map(a => (
                <li key={a.id} className={`rounded-xl border border-slate-200 p-3 ${activityColors[a.kind] || "bg-white"}`}>
                  <div className="text-xs text-slate-500">{timeAgo(a.at)}</div>
                  <div>{a.text}</div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No activity" subtitle="Activity shows messages, check-ins, assignments and more." />}
        </motion.div>
      )}

      {/* Add measurement modal */}
      <Modal open={addMeasOpen} onClose={()=>setAddMeasOpen(false)} title="Add Measurement">
        <form onSubmit={addMeasurement} className="space-y-3">
          <Row>
            <Field label="Date"><input type="date" className="inp" value={newMeas.date} onChange={(e)=>setNewMeas(x=>({ ...x, date: e.target.value }))} /></Field>
            <Field label="Weight (kg)"><input type="number" step="0.1" className="inp" value={newMeas.weight} onChange={(e)=>setNewMeas(x=>({ ...x, weight: e.target.value }))} /></Field>
            <Field label="Body Fat (%)"><input type="number" step="0.1" className="inp" value={newMeas.bodyFat} onChange={(e)=>setNewMeas(x=>({ ...x, bodyFat: e.target.value }))} /></Field>
          </Row>
          <Row>
            <Field label="Chest (cm)"><input type="number" step="0.1" className="inp" value={newMeas.chest} onChange={(e)=>setNewMeas(x=>({ ...x, chest: e.target.value }))} /></Field>
            <Field label="Waist (cm)"><input type="number" step="0.1" className="inp" value={newMeas.waist} onChange={(e)=>setNewMeas(x=>({ ...x, waist: e.target.value }))} /></Field>
          </Row>
          <Row>
            <Field label="Arms (cm)"><input type="number" step="0.1" className="inp" value={newMeas.arms} onChange={(e)=>setNewMeas(x=>({ ...x, arms: e.target.value }))} /></Field>
            <Field label="Thighs (cm)"><input type="number" step="0.1" className="inp" value={newMeas.thighs} onChange={(e)=>setNewMeas(x=>({ ...x, thighs: e.target.value }))} /></Field>
          </Row>
          <div className="flex items-center justify-end">
            <button className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Add</button>
          </div>
        </form>
      </Modal>

      {/* Add note modal */}
      <Modal open={addNoteOpen} onClose={()=>setAddNoteOpen(false)} title="Add Note">
        <form onSubmit={addNote} className="space-y-3">
          <textarea className="inp" rows={5} placeholder="Write a coaching note…" value={noteText} onChange={(e)=>setNoteText(e.target.value)} />
          <div className="flex items-center justify-end">
            <button className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
          </div>
        </form>
      </Modal>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );

  /* ---------- small locals ---------- */
  function Stat({ title, value }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    );
  }
  function Field({ label, children }) {
    return (
      <div className="flex-1">
        <label className="text-sm text-slate-600">{label}</label>
        <div className="mt-1">{children}</div>
      </div>
    );
  }
  function Row({ children }) {
    return <div className="flex flex-col md:flex-row gap-3">{children}</div>;
  }
}

function last(arr){ return arr && arr.length ? arr[arr.length-1] : null; }
function avg(arr){ if(!arr || !arr.length) return 0; return arr.reduce((a,b)=>a+(+b||0),0)/arr.length; }
function toNums(o){ const out={}; Object.keys(o).forEach(k=>{ const v=o[k]; out[k]=isNaN(+v)?v:+v; }); return out; }
function labelFor(m){ return ({weight:"Weight",bodyFat:"Body Fat",chest:"Chest",waist:"Waist",arms:"Arms",thighs:"Thighs"})[m] || m; }
function unitFor(m){ return ({weight:"kg",bodyFat:"%",chest:"cm",waist:"cm",arms:"cm",thighs:"cm"})[m] || ""; }
