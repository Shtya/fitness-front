"use client";

import React, { useMemo, useState } from "react";
import {
  Inbox, FolderOpen, Ruler, Dumbbell, Salad, FileText, MessageSquare,
  BarChart2, ClipboardList, Bell, Users, Camera, ChevronRight, X
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, BarChart, Bar, Legend
} from "recharts";

/** ---------------------------------------
 * Helpers
 * --------------------------------------*/
const cn = (...c) => c.filter(Boolean).join(" ");
const formatBytes = (bytes = 0) => {
  if (bytes == null) return "-";
  const sizes = ["B","KB","MB","GB","TB"];
  const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), sizes.length-1);
  return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${sizes[i]}`;
};
const formatDate = (d) => new Date(d).toLocaleString("ar-EG", { dateStyle: "medium" });

/** ---------------------------------------
 * Fake providers (swap with API calls later)
 * --------------------------------------*/
function useFakeUser(userId){
  return useMemo(()=>({
    id: userId, name:"محمد علي", email:"m.ali@example.com", phone:"+201001234567",
    role:"client", status:"active", membership:"Gold",
    coach:{id:"coach-1", name:"كابتن سليم"},
    subscriptionStart:"2025-09-10", subscriptionEnd:"2026-09-10",
    points: 240, avatar: ""
  }),[userId]);
}
function useFakeAssets(userId){
  return useMemo(()=>[
    { id:"a1", filename:"front-progress.jpg", url:"https://images.unsplash.com/photo-1597074866923-3dfb3c01ebe0?q=80&w=1000&auto=format&fit=crop", type:"image", category:"progress", mimeType:"image/jpeg", size:7340032, created_at:"2025-10-01T11:22:33Z" },
    { id:"a2", filename:"meal-plan-v3.pdf", url:"https://dummyimage.com/800x600/edf2f7/111&text=PDF+Preview", type:"file", category:"plans", mimeType:"application/pdf", size:11811160, created_at:"2025-10-05T09:12:00Z" },
    { id:"a3", filename:"squat-set-1.mp4", url:"https://dummyimage.com/800x450/dbeafe/111&text=Video", type:"video", category:"exercise", mimeType:"video/mp4", size:45111160, created_at:"2025-10-12T09:12:00Z" },
  ],[userId]);
}
function useFakeBodyMeasurements(userId){
  const rows = [
    { date:"2025-09-15", weight:86.4, waist:89.5, chest:101.0, hips:98.0, arms:33.2, thighs:58.0 },
    { date:"2025-10-01", weight:85.8, waist:88.0, chest:101.5, hips:97.5, arms:33.5, thighs:57.8 },
    { date:"2025-10-15", weight:84.9, waist:86.8, chest:102.0, hips:96.9, arms:33.7, thighs:57.4 },
    { date:"2025-11-01", weight:84.1, waist:86.0, chest:102.3, hips:96.4, arms:34.0, thighs:57.0 },
  ];
  return useMemo(()=>rows,[userId]);
}
function useFakeProgressPhotos(userId){
  return useMemo(()=>[
    { id:"pp1", takenAt:"2025-10-01", weight:85.8, note:"إضاءة نهارية", sides:{ front:"https://images.unsplash.com/photo-1597074866923-3dfb3c01ebe0?q=80&w=1000&auto=format&fit=crop", left:"https://images.unsplash.com/photo-1526404079165-76b0941fc6dd?q=80&w=1000&auto=format&fit=crop", right:"https://images.unsplash.com/photo-1598289724774-0d376a8d951e?q=80&w=1000&auto=format&fit=crop" } },
    { id:"pp2", takenAt:"2025-11-01", weight:84.1, note:"بعد تمرين الرجل", sides:{ front:"https://images.unsplash.com/photo-1597074866923-3dfb3c01ebe0?q=80&w=1000&auto=format&fit=crop", back:"https://images.unsplash.com/photo-1534367610401-9f805d1818f8?q=80&w=1000&auto=format&fit=crop" } },
  ],[userId]);
}
function useFakeExerciseRecords(userId){
  const days = ["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
  return useMemo(()=>[
    { id:"er1", date:"2025-10-30", day:days[4], exerciseName:"Barbell Squat",
      workoutSets:[ { setNumber:1, weight:80, reps:8, done:true, e1rm:100, isPr:false }, { setNumber:2, weight:85, reps:6, done:true, e1rm:104, isPr:true } ],
      totalVolume:985, bestE1rm:104, isPersonalRecord:true
    },
    { id:"er2", date:"2025-11-02", day:days[6], exerciseName:"Bench Press",
      workoutSets:[ { setNumber:1, weight:70, reps:8, done:true, e1rm:87, isPr:false }, { setNumber:2, weight:72.5, reps:6, done:true, e1rm:86, isPr:false } ],
      totalVolume:860, bestE1rm:87, isPersonalRecord:false
    },
  ],[userId]);
}
function useFakeMealPlan(userId){
  return useMemo(()=>({
    id:"mp1", name:"Cutting – 2200 kcal", desc:"خطة أسبوعية مع بروتين مرتفع", coach:{id:"coach-1", name:"كابتن سليم"},
    days:[ { id:"d1", day:"saturday", name:"High Protein Day", meals:[
      { id:"m1", title:"فطور", time:"08:30", items:[ {id:"i1", name:"بيض + شوفان", calories:450, quantity:200 }, {id:"i2", name:"قهوة سادة", calories:0, quantity:200 } ] },
      { id:"m2", title:"غداء", time:"14:00", items:[ {id:"i3", name:"صدر دجاج + رز", calories:650, quantity:320 } ] },
    ], supplements:[ { id:"s1", name:"فيتامين D", time:"09:00", timing:"with" } ] } ]
  }),[userId]);
}
function useFakeMealLogs(userId){
  return useMemo(()=>[
    { id:"ml1", dayName:"Saturday", eatenAt:"2025-11-02T08:50:00Z", mealTitle:"فطور", adherence:4,
      items:[ {id:"mi1", name:"بيض", taken:true }, {id:"mi2", name:"شوفان", taken:true } ],
      extras:[ {id:"e1", name:"قطعة كيك", calories:220 } ]
    },
    { id:"ml2", dayName:"Saturday", eatenAt:"2025-11-02T14:20:00Z", mealTitle:"غداء", adherence:5,
      items:[ {id:"mi3", name:"دجاج", taken:true }, {id:"mi4", name:"رز", taken:true } ],
      extras:[]
    },
  ],[userId]);
}
function useFakeFoodSuggestions(userId){
  return useMemo(()=>[
    { id:"fs1", day:"sunday", mealIndex:1, mealTitle:"غداء", message:"بديل للرز؟", status:"pending" },
    { id:"fs2", day:"monday", mealIndex:0, mealTitle:"فطور", message:"بديل للألبان", status:"reviewed" },
  ],[userId]);
}
function useFakeNutritionStats(userId){
  const series = [
    { date:"10-01", calories:2100, protein:150, adherence:3.8 },
    { date:"10-08", calories:2150, protein:155, adherence:4.1 },
    { date:"10-15", calories:2200, protein:160, adherence:4.4 },
    { date:"10-22", calories:2050, protein:152, adherence:4.6 },
    { date:"10-29", calories:2000, protein:158, adherence:4.8 },
  ];
  return useMemo(()=>series,[userId]);
}
function useFakeWeeklyReports(userId){
  return useMemo(()=>[
    { id:"wr1", weekOf:"2025-10-27",
      diet:{ hungry:"no", mentalComfort:"yes", wantSpecific:"أطباق أسهل", foodTooMuch:"no", dietDeviation:{ hasDeviation:"yes", times:"1", details:"خروجة" } },
      training:{ intensityOk:"yes", daysDeviation:{ hasDeviation:"no", count:null, reason:null }, shapeChange:"yes", fitnessChange:"yes", sleep:{ enough:"yes", hours:"7" }, programNotes:"أداء ممتاز", cardioAdherence:4 },
      measurements:{ date:"2025-11-01", weight:84.1, waist:86.0, chest:102.3, hips:96.4, arms:34.0, thighs:57.0 },
      photos:{ front:{ url:"https://images.unsplash.com/photo-1597074866923-3dfb3c01ebe0?q=80&w=1000&auto=format&fit=crop" }, back:null, left:null, right:null, extras:[] },
      isRead:false
    },
    { id:"wr2", weekOf:"2025-11-03",
      diet:{ hungry:"no", mentalComfort:"yes", wantSpecific:"لا", foodTooMuch:"no", dietDeviation:{ hasDeviation:"no", times:null, details:null } },
      training:{ intensityOk:"yes", daysDeviation:{ hasDeviation:"yes", count:"1", reason:"سفر" }, shapeChange:"yes", fitnessChange:"yes", sleep:{ enough:"no", hours:"5" }, programNotes:"نحتاج نوم أفضل", cardioAdherence:3 },
      measurements:null,
      photos:{ front:null, back:null, left:null, right:null, extras:[] },
      isRead:true
    },
  ],[userId]);
}
function useFakeNotifications(userId){
  return useMemo(()=>[
    { id:1, type:"FORM_SUBMISSION", title:"استبيان أسبوعي جديد", created_at:"2025-11-02T10:00:00Z", isRead:false },
    { id:2, type:"SYSTEM", title:"انتهت صلاحية الخطة التجريبية", created_at:"2025-10-22T08:00:00Z", isRead:true },
  ],[userId]);
}

/** ---------------------------------------
 * Reusable UI
 * --------------------------------------*/
const Shell = ({ title, subtitle, right, children }) => (
  <div className="relative">
    {/* sticky gradient banner */}
    <div className="sticky top-0 z-30 -mx-4 -mt-6 mb-6 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-4 py-5 text-white shadow-lg">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-white/90">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </div>
    </div>
    <div>{children}</div>
  </div>
);

const Card = ({ className, children }) => (
  <div className={cn(
    "rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur",
    "hover:shadow-md transition-shadow", className
  )}>{children}</div>
);

const Tag = ({ children, tone = "slate" }) => (
  <span className={cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
    tone === "green" && "bg-emerald-50 text-emerald-700 ring-emerald-100",
    tone === "amber" && "bg-amber-50 text-amber-700 ring-amber-100",
    tone === "slate" && "bg-slate-50 text-slate-700 ring-slate-100"
  )}>{children}</span>
);

const Kpi = ({ icon, label, value, hint }) => (
  <Card>
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-slate-50">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold text-slate-900">{value}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  </Card>
);

const Tabs = ({ value, onChange, items }) => (
  <div className="w-full">
    {/* sticky tabs row */}
    <div className="sticky top-[76px] z-20 -mx-4 mb-4 bg-white/80 px-4 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {items.map(it => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
              value === it.value
                ? "border-slate-900 bg-slate-900 text-white shadow"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
            aria-pressed={value === it.value}
          >
            <span className="inline-flex items-center gap-2">
              {it.icon}
              {it.label}
              {typeof it.count === "number" && (
                <span className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[10px]",
                  value === it.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}>{it.count}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
    <div>{items.find(it => it.value === value)?.content}</div>
  </div>
);

/** ---------------------------------------
 * Feature sections
 * --------------------------------------*/
function HeaderSummary({ user, weightSeries }) {
  const latest = weightSeries[weightSeries.length - 1];
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <Kpi icon={<Users size={18} />} label="العميل" value={user.name} />
      <Kpi icon={<ClipboardList size={18} />} label="الخطة" value={user.membership} />
      <Kpi icon={<BarChart2 size={18} />} label="النقاط" value={user.points} />
      <Kpi icon={<Ruler size={18} />} label="آخر وزن" value={latest?.weight ?? "—"} hint="كجم" />
    </div>
  );
}

function AssetsTab({ assets }) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {assets.map(a => (
          <Card key={a.id}>
            <button
              className="mb-3 block w-full overflow-hidden rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              onClick={() => a.type === "image" ? setLightbox(a.url) : undefined}
            >
              <img src={a.url} alt={a.filename} className="h-44 w-full object-cover transition-transform hover:scale-[1.02]" />
            </button>
            <div className="mb-2 flex items-center justify-between">
              <div className="truncate font-medium text-slate-900" title={a.filename}>{a.filename}</div>
              <Tag tone={a.type === "image" ? "green" : "slate"}>{a.type}</Tag>
            </div>
            <div className="text-xs text-slate-500">{a.mimeType} • {formatBytes(a.size)}</div>
            <div className="text-xs text-slate-500">مضافة: {formatDate(a.created_at)}</div>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={()=>setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 shadow" onClick={()=>setLightbox(null)}>
            <X size={18} />
          </button>
          <img src={lightbox} alt="preview" className="max-h-[85vh] w-auto rounded-lg border border-white/20 shadow-2xl" />
        </div>
      )}
    </>
  );
}

function MeasurementsTab({ rows, photos }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <Ruler size={18} /> <span className="font-semibold">قياسات الجسم</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                {["التاريخ","الوزن","الخصر","الصدر","الحوض","الذراع","الفخذ"].map(h=>(
                  <th key={h} className="px-3 py-2 text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.date} className="border-b hover:bg-slate-50/60">
                  <td className="px-3 py-2">{formatDate(r.date)}</td>
                  <td className="px-3 py-2">{r.weight ?? "—"}</td>
                  <td className="px-3 py-2">{r.waist ?? "—"}</td>
                  <td className="px-3 py-2">{r.chest ?? "—"}</td>
                  <td className="px-3 py-2">{r.hips ?? "—"}</td>
                  <td className="px-3 py-2">{r.arms ?? "—"}</td>
                  <td className="px-3 py-2">{r.thighs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weight area chart */}
        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows.map(r=>({ date:r.date.slice(5), weight:r.weight }))}>
              <defs>
                <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="weight" stroke="#3b82f6" fillOpacity={1} fill="url(#w)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2"><Camera size={18}/> <span className="font-semibold">صور التقدم</span></div>
        <div className="grid grid-cols-2 gap-3">
          {photos.map(p=>(
            <div key={p.id} className="overflow-hidden rounded-lg border">
              {p.sides.front && <img src={p.sides.front} alt="front" className="h-40 w-full object-cover" />}
              <div className="p-2 text-xs text-slate-600">{formatDate(p.takenAt)} • {p.weight ? `${p.weight} كجم` : "—"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ExerciseTab({ records }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {records.map(r=>(
        <Card key={r.id}>
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">{r.exerciseName}</div>
            {r.isPersonalRecord && <Tag tone="amber">رقم شخصي</Tag>}
          </div>
          <div className="mb-3 text-xs text-slate-500">{r.day} • {formatDate(r.date)}</div>
          <div className="overflow-x-auto">
            <table className="min-w-[480px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600">
                  {["الست","الوزن","التكرارات","E1RM","تم"].map(h=>(
                    <th key={h} className="px-3 py-2 text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.workoutSets.map(s=>(
                  <tr key={s.setNumber} className="border-b hover:bg-slate-50/60">
                    <td className="px-3 py-2">{s.setNumber}</td>
                    <td className="px-3 py-2">{s.weight}</td>
                    <td className="px-3 py-2">{s.reps}</td>
                    <td className="px-3 py-2">{s.e1rm}</td>
                    <td className="px-3 py-2">{s.done ? "✔" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MealPlanTab({ plan }) {
  if (!plan) return <Card>لا توجد خطة حالية</Card>;
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <div className="mb-1 text-sm text-slate-500">اسم الخطة</div>
        <div className="mb-2 text-lg font-semibold">{plan.name}</div>
        {plan.desc && <div className="text-slate-600">{plan.desc}</div>}
      </Card>

      {plan.days.map(d=>(
        <Card key={d.id}>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">{d.name} ({d.day})</div>
            <Tag tone="green">{d.meals.length} وجبات</Tag>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {d.meals.map(m=>(
              <div key={m.id} className="rounded-lg border p-3">
                <div className="mb-1 text-xs text-slate-500">{m.time ?? "—"}</div>
                <div className="mb-2 font-medium">{m.title}</div>
                <ul className="list-disc px-5 text-sm text-slate-700">
                  {m.items.map(it=>(<li key={it.id}>{it.name} • {it.calories} kcal</li>))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MealLogsTab({ logs }) {
  return (
    <div className="space-y-3">
      {logs.map(l=>(
        <Card key={l.id} className="group">
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5">{l.dayName}</span>
            <span>{new Date(l.eatenAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="mb-2 inline-flex items-center gap-2 font-semibold">
            {l.mealTitle}
            <ChevronRight size={16} className="opacity-50 transition group-hover:translate-x-0.5" />
          </div>
          <div className="text-sm text-slate-700">الالتزام: {l.adherence}/5</div>
          {l.items?.length>0 && <div className="mt-2 text-sm text-slate-600">الأصناف: {l.items.map(i=>i.name).join("، ")}</div>}
          {l.extras?.length>0 && <div className="mt-2 text-sm text-amber-700">إضافات: {l.extras.map(e=>`${e.name} (${e.calories} kcal)`).join("، ")}</div>}
        </Card>
      ))}
    </div>
  );
}

function FoodSuggestionsTab({ items }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map(s=>(
        <Card key={s.id}>
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">{s.mealTitle} • {s.day}</div>
            <Tag tone={s.status === "pending" ? "amber" : "green"}>{s.status}</Tag>
          </div>
          <div className="text-slate-700">{s.message}</div>
        </Card>
      ))}
    </div>
  );
}

function NutritionStatsTab({ series }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <div className="mb-3 flex items-center gap-2"><BarChart2 size={18}/> <span className="font-semibold">السعرات والالتزام (أسابيع)</span></div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="calories" stroke="#0ea5e9" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="adherence" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <div className="mb-3 flex items-center gap-2"><Dumbbell size={18}/> <span className="font-semibold">البروتين الأسبوعي</span></div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="protein" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function WeeklyReportsTab({ reports }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {reports.map(r=>(
        <Card key={r.id}>
          <div className="mb-1 flex items-center justify-between">
            <div className="font-semibold">تقرير أسبوع {r.weekOf}</div>
            <Tag tone={r.isRead ? "slate" : "amber"}>{r.isRead ? "مقروء" : "غير مقروء"}</Tag>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-slate-500">النظام الغذائي</div>
              <ul className="list-disc px-5 text-sm">
                <li>جوع: {r.diet.hungry}</li>
                <li>راحة نفسية: {r.diet.mentalComfort}</li>
                <li>انحراف: {r.diet.dietDeviation.hasDeviation} {r.diet.dietDeviation.times ? `(${r.diet.dietDeviation.times})` : ""}</li>
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">التدريب</div>
              <ul className="list-disc px-5 text-sm">
                <li>الشدة مناسبة: {r.training.intensityOk}</li>
                <li>كارديو: {r.training.cardioAdherence}/5</li>
                <li>نوم: {r.training.sleep.enough} ({r.training.sleep.hours ?? "—"} ساعات)</li>
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">قياسات</div>
              {r.measurements ? (
                <ul className="list-disc px-5 text-sm">
                  <li>وزن: {r.measurements.weight} كجم</li>
                  <li>خصر: {r.measurements.waist} سم</li>
                  <li>صدر: {r.measurements.chest} سم</li>
                </ul>
              ) : <div className="text-sm text-slate-500">لا قياسات</div>}
            </div>
          </div>
          {r.photos?.front?.url && (
            <div className="mt-4 overflow-hidden rounded-lg border">
              <img src={r.photos.front.url} alt="front" className="h-56 w-full object-cover" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function NotificationsTab({ items }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map(n=>(
        <Card key={n.id}>
          <div className="mb-1 text-xs text-slate-500">{formatDate(n.created_at)}</div>
          <div className="mb-1 font-semibold">{n.title}</div>
          <Tag tone={n.isRead ? "slate" : "amber"}>{n.isRead ? "مقروء" : "غير مقروء"}</Tag>
        </Card>
      ))}
    </div>
  );
}

/** ---------------------------------------
 * Page
 * --------------------------------------*/
export default function CoachUserDetailsPage({ params }) {
  const userId = params?.id || "633c7739-31bb-4b41-bf1d-dd994d557694";
  const user = useFakeUser(userId);
  const assets = useFakeAssets(userId);
  const bm = useFakeBodyMeasurements(userId);
  const photos = useFakeProgressPhotos(userId);
  const exRecords = useFakeExerciseRecords(userId);
  const mealPlan = useFakeMealPlan(userId);
  const mealLogs = useFakeMealLogs(userId);
  const suggestions = useFakeFoodSuggestions(userId);
  const stats = useFakeNutritionStats(userId);
  const reports = useFakeWeeklyReports(userId);
  const notifications = useFakeNotifications(userId);

  const [tab, setTab] = useState("overview");

  const tabs = [
    { value:"overview", label:"نظرة عامة", icon:<Inbox size={16}/>, content:(
      <>
        <HeaderSummary user={user} weightSeries={bm.map(r=>({ weight:r.weight }))} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-2 text-sm text-slate-500">بيانات أساسية</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-slate-500">الاسم</div><div className="font-medium">{user.name}</div></div>
              <div><div className="text-slate-500">الهاتف</div><div className="font-medium">{user.phone}</div></div>
              <div><div className="text-slate-500">الحالة</div><div className="font-medium">{user.status}</div></div>
              <div><div className="text-slate-500">المدرب</div><div className="font-medium">{user.coach?.name}</div></div>
            </div>
          </Card>
          <Card>
            <div className="mb-2 text-sm text-slate-500">اشتراك</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-slate-500">من</div><div className="font-medium">{user.subscriptionStart}</div></div>
              <div><div className="text-slate-500">إلى</div><div className="font-medium">{user.subscriptionEnd}</div></div>
            </div>
          </Card>
        </div>
      </>
    )},
    { value:"assets", label:"الوسائط", icon:<FolderOpen size={16}/>, count: assets.length, content:<AssetsTab assets={assets}/> },
    { value:"measurements", label:"قياسات/صور", icon:<Ruler size={16}/>, content:<MeasurementsTab rows={bm} photos={photos}/> },
    { value:"exercise", label:"التدريب", icon:<Dumbbell size={16}/>, content:<ExerciseTab records={exRecords}/> },
    { value:"mealplan", label:"خطة الطعام", icon:<Salad size={16}/>, content:<MealPlanTab plan={mealPlan}/> },
    { value:"meallogs", label:"سجل الوجبات", icon:<FileText size={16}/>, count: mealLogs.length, content:<MealLogsTab logs={mealLogs}/> },
    { value:"suggestions", label:"اقتراحات الطعام", icon:<MessageSquare size={16}/>, count: suggestions.length, content:<FoodSuggestionsTab items={suggestions}/> },
    { value:"nutrition", label:"إحصائيات التغذية", icon:<BarChart2 size={16}/>, content:<NutritionStatsTab series={stats}/> },
    { value:"weekly", label:"التقارير الأسبوعية", icon:<ClipboardList size={16}/>, count: reports.length, content:<WeeklyReportsTab reports={reports}/> },
    { value:"notifications", label:"الإشعارات", icon:<Bell size={16}/>, count: notifications.filter(n=>!n.isRead).length, content:<NotificationsTab items={notifications}/> },
  ];

  return (
    <div dir="rtl" className="mx-auto max-w-7xl px-4 py-6">
      <Shell
        title="ملف العميل"
        subtitle={`كل ما يخص ${user.name} في مكان واحد — للمدرب.`}
        right={
          <>
            <button className="rounded-lg bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/20 hover:bg-white/15">رسالة</button>
            <button className="rounded-lg bg-white px-3 py-1.5 text-slate-900 ring-1 ring-white/30 hover:shadow">إجراءات</button>
          </>
        }
      >
        <Tabs value={tab} onChange={setTab} items={tabs} />
      </Shell>
    </div>
  );
}
