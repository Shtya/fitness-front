"use client";

import { useEffect, useMemo, useState , useCallback } from "react";
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
  CalendarRange, LineChart, NotebookPen, Folder, CreditCard, Activity, CheckCircle2,
  FileText
} from "lucide-react";
import { Notification } from '@/config/Notification';
import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';

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
  { key: "workouts", label: "Workouts", icon: CalendarRange },
  { key: "nutrition", label: "Nutrition", icon: CheckCircle2 },
  { key: "logs", label: "Progress Meals", icon: ClipboardList },
  { key: "suggestions", label: "Suggestions", icon: MessageSquare },
  { key: "reports", label: "Reports", icon: FileText },
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

  // Nutrition-related states
  const [mealLogs, setMealLogs] = useState([]);
  const [loadingMealLogs, setLoadingMealLogs] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [nutritionSuggestions, setNutritionSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [nutritionReports, setNutritionReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generateReportOpen, setGenerateReportOpen] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);

  // Fetch nutrition data
  const fetchMealLogs = useCallback(async (userId, date) => {
    setLoadingMealLogs(true);
    try {
      const { data } = await api.get(`/nutrition/meal-logs/all`, {
        params: { userId, date }
      });
      setMealLogs(data || []);
    } catch (error) {
      console.error('Error fetching meal logs:', error);
      setMealLogs([]);
    } finally {
      setLoadingMealLogs(false);
    }
  }, []);

  const fetchNutritionSuggestions = useCallback(async (userId) => {
    setLoadingSuggestions(true);
    try {
      const { data } = await api.get(`/nutrition/suggestions/${userId}`);
      setNutritionSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setNutritionSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const fetchNutritionReports = useCallback(async (userId) => {
    setLoadingReports(true);
    try {
      const { data } = await api.get(`/nutrition/reports/${userId}`);
      setNutritionReports(data.records || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setNutritionReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchClient(id).then((data) => {
      setClient(data);
      setLoading(false);
    });
  }, [id]);

  // Load nutrition data when client changes
  useEffect(() => {
    if (client && active === 'logs') {
      fetchMealLogs(client.id, selectedLogDate);
    }
  }, [client, active, selectedLogDate, fetchMealLogs]);

  useEffect(() => {
    if (client && active === 'suggestions') {
      fetchNutritionSuggestions(client.id);
    }
  }, [client, active, fetchNutritionSuggestions]);

  useEffect(() => {
    if (client && active === 'reports') {
      fetchNutritionReports(client.id);
    }
  }, [client, active, fetchNutritionReports]);

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
        <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
        <div className="h-72 rounded-lg bg-slate-100 animate-pulse" />
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
                <select className="px-3 py-2 rounded-lg border border-slate-200 bg-white" value={metric} onChange={(e)=>setMetric(e.target.value)}>
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
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          {/* Measurements Table */}
          <div className="card-glow">
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
          </div>

          {/* Body Images */}
          <div className="card-glow p-5">
            <div className="font-semibold mb-4">Body Progress Images</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-full h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                  <div className="text-center">
                    <div className="text-2xl text-slate-400 mb-1">📸</div>
                    <div className="text-xs text-slate-500">Front View</div>
                  </div>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">Upload</button>
              </div>
              <div className="text-center">
                <div className="w-full h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                  <div className="text-center">
                    <div className="text-2xl text-slate-400 mb-1">📸</div>
                    <div className="text-xs text-slate-500">Left Side</div>
                  </div>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">Upload</button>
              </div>
              <div className="text-center">
                <div className="w-full h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                  <div className="text-center">
                    <div className="text-2xl text-slate-400 mb-1">📸</div>
                    <div className="text-xs text-slate-500">Right Side</div>
                  </div>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">Upload</button>
              </div>
              <div className="text-center">
                <div className="w-full h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                  <div className="text-center">
                    <div className="text-2xl text-slate-400 mb-1">📸</div>
                    <div className="text-xs text-slate-500">Back View</div>
                  </div>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">Upload</button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {active === "progress" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          {/* Exercise Progress */}
          <div className="card-glow p-5">
            <div className="font-semibold mb-4">Exercise Progress</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Total Workouts</div>
                  <div className="text-2xl font-bold text-slate-800">24</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Personal Records</div>
                  <div className="text-2xl font-bold text-slate-800">8</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Consistency</div>
                  <div className="text-2xl font-bold text-slate-800">85%</div>
                </div>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-slate-700">Recent Achievements</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">New PR: Squat</div>
                      <div className="text-sm text-green-600">120kg x 5 reps</div>
                    </div>
                    <div className="text-xs text-green-600">2 days ago</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-blue-800">New PR: Deadlift</div>
                      <div className="text-sm text-blue-600">150kg x 3 reps</div>
                    </div>
                    <div className="text-xs text-blue-600">1 week ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Body Measurements Progress */}
          <div className="card-glow p-5">
            <div className="font-semibold mb-2">Body Measurements Progress</div>
            <div className="flex items-center gap-2 mb-4">
              <select className="px-3 py-2 rounded-lg border border-slate-200 bg-white" value={metric} onChange={(e)=>setMetric(e.target.value)}>
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


      {active === "workouts" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="font-semibold mb-2">Assigned Workouts</div>
          {client.workouts.length ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {client.workouts.map(w => (
                <li key={w.id} className="rounded-lg border border-slate-200 bg-white p-3">
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
                <li key={m.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.calories} kcal · P{m.protein} / C{m.carbs} / F{m.fat}</div>
                  <div className="mt-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 w-fit">{m.status}</div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No meal plans" subtitle="Assign a meal plan from Nutrition." />}
        </motion.div>
      )}


      {active === "logs" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Meal Logs</div>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white" 
                value={selectedLogDate} 
                onChange={(e) => setSelectedLogDate(e.target.value)} 
              />
              <button 
                onClick={() => fetchMealLogs(client.id, selectedLogDate)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
          {loadingMealLogs ? (
            <div className="text-center py-8 text-slate-500">Loading meal logs...</div>
          ) : mealLogs.length > 0 ? (
            <div className="space-y-2">
              {mealLogs.map(log => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{log.itemName}</span>
                      <span className="text-sm text-slate-500 ml-2">({log.mealType})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${log.taken ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.taken ? 'Taken' : 'Not Taken'}
                      </span>
                      <span className="text-xs text-slate-500">{log.quantity}g</span>
                    </div>
                  </div>
                  {log.notes && (
                    <div className="mt-2 text-sm text-slate-600">{log.notes}</div>
                  )}
                </div>
              ))}
            </div>
          ) : <EmptyState title="No meal logs" subtitle="No meal logs found for this date." />}
        </motion.div>
      )}

      {active === "suggestions" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          {/* Exercise Suggestions */}
          <div className="card-glow p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Exercise Suggestions</div>
              <button 
                onClick={() => setSuggestionModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:from-indigo-700 hover:to-blue-600 text-sm"
              >
                Add Suggestion
              </button>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Squat Form Improvement</span>
                  <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Pending</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">I think I can improve my squat depth. Can we work on mobility exercises?</p>
                <div className="text-xs text-slate-500">Exercise • 2 days ago</div>
                <div className="mt-2 flex items-center gap-2">
                  <button className="px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm">Approve</button>
                  <button className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm">Reject</button>
                </div>
              </div>
            </div>
          </div>

          {/* Nutrition Suggestions */}
          <div className="card-glow p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Nutrition Suggestions</div>
              <button 
                onClick={() => fetchNutritionSuggestions(client.id)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              >
                Refresh
              </button>
            </div>
            {loadingSuggestions ? (
              <div className="text-center py-8 text-slate-500">Loading suggestions...</div>
            ) : nutritionSuggestions.length > 0 ? (
              <div className="space-y-2">
                {nutritionSuggestions.map(suggestion => (
                  <div key={suggestion.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{suggestion.itemName}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${suggestion.coachApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {suggestion.coachApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{suggestion.suggestion}</p>
                    <div className="text-xs text-slate-500">
                      {suggestion.mealType} • {suggestion.day} • {timeAgo(suggestion.created_at)}
                    </div>
                    {!suggestion.coachApproved && (
                      <div className="mt-2 flex items-center gap-2">
                        <button 
                          onClick={() => {/* Approve suggestion */}}
                          className="px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => {/* Reject suggestion */}}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No suggestions" subtitle="No nutrition suggestions found for this client." />}
          </div>
        </motion.div>
      )}

      {active === "reports" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Nutrition Reports</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setGenerateReportOpen(true)}
                className="px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:from-indigo-700 hover:to-blue-600 text-sm"
              >
                Generate Report
              </button>
              <button 
                onClick={() => fetchNutritionReports(client.id)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
          {loadingReports ? (
            <div className="text-center py-8 text-slate-500">Loading reports...</div>
          ) : nutritionReports.length > 0 ? (
            <div className="space-y-2">
              {nutritionReports.map(report => (
                <div key={report.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{report.title}</span>
                    <span className="text-xs text-slate-500">{fmt(report.reportDate)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{report.description}</p>
                  <div className="text-xs text-slate-500 mb-2">
                    Period: {fmt(report.periodStart)} - {fmt(report.periodEnd)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {/* View report details */}}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => {/* Download report */}}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No reports" subtitle="No nutrition reports found for this client." />}
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
            <button className="px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Add</button>
          </div>
        </form>
      </Modal>

      {/* Add note modal */}
      <Modal open={addNoteOpen} onClose={()=>setAddNoteOpen(false)} title="Add Note">
        <form onSubmit={addNote} className="space-y-3">
          <textarea className="inp" rows={5} placeholder="Write a coaching note…" value={noteText} onChange={(e)=>setNoteText(e.target.value)} />
          <div className="flex items-center justify-end">
            <button className="px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Save</button>
          </div>
        </form>
      </Modal>

      {/* Generate report modal */}
      <Modal open={generateReportOpen} onClose={()=>setGenerateReportOpen(false)} title="Generate Nutrition Report">
        <ReportForm
          onSubmit={async payload => {
            try {
              await api.post('/nutrition/reports', {
                userId: client.id,
                generatedById: USER?.id,
                ...payload,
              });
              Notification('Report generated successfully', 'success');
              setGenerateReportOpen(false);
              fetchNutritionReports(client.id);
            } catch (e) {
              Notification(e?.response?.data?.message || 'Generate failed', 'error');
            }
          }}
        />
      </Modal>

      {/* Suggestion Modal */}
      <Modal open={suggestionModalOpen} onClose={()=>setSuggestionModalOpen(false)} title="Submit Suggestion">
        <SuggestionForm
          onSubmit={async payload => {
            try {
              await api.post('/nutrition/suggestions', {
                userId: client.id,
                ...payload,
              });
              Notification('Suggestion submitted successfully', 'success');
              setSuggestionModalOpen(false);
            } catch (e) {
              Notification(e?.response?.data?.message || 'Submit failed', 'error');
            }
          }}
        />
      </Modal>

      {/* Floating Suggestion Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setSuggestionModalOpen(true)}
          className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-full shadow-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 flex items-center justify-center group"
        >
          <MessageSquare size={24} />
          <div className="absolute right-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Submit Suggestion
          </div>
        </button>
      </div>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );

  /* ---------- small locals ---------- */
  function Stat({ title, value }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
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

// Report Form Component
function ReportForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [periodStart, setPeriodStart] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { title, description, periodStart, periodEnd };
      await onSubmit(payload);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-slate-600">Report Title</label>
        <input 
          type="text" 
          className="inp" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          placeholder="e.g., Monthly Nutrition Analysis" 
        />
      </div>

      <div>
        <label className="text-sm text-slate-600">Description</label>
        <textarea 
          className="inp" 
          rows={3}
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Optional description for this report" 
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm text-slate-600">Start Date</label>
          <input 
            type="date" 
            className="inp" 
            value={periodStart} 
            onChange={(e) => setPeriodStart(e.target.value)} 
            required 
          />
        </div>
        <div className="flex-1">
          <label className="text-sm text-slate-600">End Date</label>
          <input 
            type="date" 
            className="inp" 
            value={periodEnd} 
            onChange={(e) => setPeriodEnd(e.target.value)} 
            required 
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button 
          type="submit"
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </form>
  );
}

// Suggestion Form Component
function SuggestionForm({ onSubmit }) {
  const [type, setType] = useState('exercise');
  const [title, setTitle] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        type,
        title,
        suggestion,
        date: new Date().toISOString().split('T')[0],
        day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        mealType: type === 'nutrition' ? 'breakfast' : null,
        itemName: title
      };
      await onSubmit(payload);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-slate-600">Suggestion Type</label>
        <select 
          className="inp" 
          value={type} 
          onChange={(e) => setType(e.target.value)} 
          required
        >
          <option value="exercise">Exercise</option>
          <option value="nutrition">Nutrition</option>
          <option value="general">General</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-slate-600">Title</label>
        <input 
          type="text" 
          className="inp" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          placeholder="Brief title for your suggestion" 
        />
      </div>

      <div>
        <label className="text-sm text-slate-600">Suggestion</label>
        <textarea 
          className="inp" 
          rows={4}
          value={suggestion} 
          onChange={(e) => setSuggestion(e.target.value)} 
          required
          placeholder="Describe your suggestion in detail..." 
        />
      </div>

      <div className="flex items-center justify-end">
        <button 
          type="submit"
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Suggestion'}
        </button>
      </div>
    </form>
  );
}
