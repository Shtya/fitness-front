"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, EmptyState, SearchInput, DateRangeControl, Badge, spring
} from "@/components/dashboard/ui/UI";
import { ChartCard, LineTrend, BarTrend, AreaTrend, Donut } from "@/components/dashboard/ui/Charts/Primitives";
import {
  LineChart as LineIcon, Download, CalendarRange, TrendingUp, Users, Dumbbell, Salad, Percent
} from "lucide-react";

/* =============== Mock data =============== */
// Revenue (last 12 months)
const revenue = [
  { m: "2024-09", mrr: 21000, newSubs: 58, cancels: 22 },
  { m: "2024-10", mrr: 22600, newSubs: 64, cancels: 20 },
  { m: "2024-11", mrr: 23250, newSubs: 61, cancels: 19 },
  { m: "2024-12", mrr: 24100, newSubs: 66, cancels: 21 },
  { m: "2025-01", mrr: 25200, newSubs: 80, cancels: 23 },
  { m: "2025-02", mrr: 26150, newSubs: 74, cancels: 25 },
  { m: "2025-03", mrr: 27500, newSubs: 88, cancels: 24 },
  { m: "2025-04", mrr: 28900, newSubs: 91, cancels: 26 },
  { m: "2025-05", mrr: 30100, newSubs: 96, cancels: 27 },
  { m: "2025-06", mrr: 30950, newSubs: 84, cancels: 29 },
  { m: "2025-07", mrr: 31600, newSubs: 79, cancels: 31 },
  { m: "2025-08", mrr: 32750, newSubs: 92, cancels: 28 },
];

// Attendance last 30 days (utilization % of capacity)
const attendance = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (29 - i));
  const util = 45 + Math.round(Math.abs(Math.sin(i/4))*40); // 45–85%
  return { day: d.toISOString().slice(5,10), utilization: util };
});

// Program performance
const programs = [
  { name: "Beginner Strength", active: 120, completed: 86, prs: 230 },
  { name: "Fat Loss 12w",      active: 95,  completed: 62, prs: 120 },
  { name: "Hypertrophy 8w",    active: 70,  completed: 41, prs: 175 },
];

// Trainer performance
const trainers = [
  { coach: "Ali",   sessions: 142, retention: 82, rating: 4.8 },
  { coach: "Mariam",sessions: 126, retention: 79, rating: 4.7 },
  { coach: "Omar",  sessions: 118, retention: 76, rating: 4.6 },
];

// Nutrition adherence (weekly % met targets)
const nutrition = [
  { week: "W30", adherence: 71 },
  { week: "W31", adherence: 74 },
  { week: "W32", adherence: 78 },
  { week: "W33", adherence: 77 },
  { week: "W34", adherence: 81 },
  { week: "W35", adherence: 83 },
];

// Funnel (counts)
const funnel = { leads: 1200, qualified: 720, trial: 320, member: 210 };

/* =============== Page =============== */
export default function ReportsPage() {
  const [tab, setTab] = useState("revenue"); // revenue | attendance | programs | trainers | nutrition | funnel
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(""); // optional global filter
  const [to, setTo] = useState("");

  useEffect(() => { const t = setTimeout(()=>setLoading(false), 600); return ()=>clearTimeout(t); }, []);

  /* ===== derived KPIs ===== */
  const mrr = revenue[revenue.length-1].mrr;
  const prevMrr = revenue[revenue.length-2].mrr;
  const mrrDelta = pctDelta(prevMrr, mrr);

  const churnRate = useMemo(() => {
    // simple logo churn = cancels / (previous month active estimate)
    return Math.round((revenue[revenue.length-1].cancels / (revenue[revenue.length-2].newSubs + 800)) * 1000)/10; // %
  }, []);
  const retention = 100 - churnRate;

  const avgUtil = Math.round(attendance.reduce((a,b)=>a+b.utilization,0)/attendance.length);

  const completionRows = programs.map(p => ({
    program: p.name,
    active: p.active,
    completed: p.completed,
    completionRate: Math.round((p.completed / Math.max(1, p.active + p.completed)) * 100),
    prs: p.prs
  })).sort((a,b)=>b.completionRate - a.completionRate);

  const trainerRows = trainers.map(t => ({
    coach: t.coach, sessions: t.sessions, retention: t.retention, rating: t.rating
  })).sort((a,b)=>b.sessions - a.sessions);

  const funnelRates = [
    { stage: "Qualified", value: rate(funnel.qualified, funnel.leads) },
    { stage: "Trial",     value: rate(funnel.trial, funnel.leads) },
    { stage: "Member",    value: rate(funnel.member, funnel.leads) },
    { stage: "Trial→Member", value: rate(funnel.member, funnel.trial) }
  ];

  /* ===== tables ===== */
  const programCols = [
    { header: "Program", accessor: "program" },
    { header: "Active", accessor: "active" },
    { header: "Completed", accessor: "completed" },
    { header: "Completion %", accessor: "completionRate", cell: r => <strong>{r.completionRate}%</strong> },
    { header: "PRs", accessor: "prs" },
  ];

  const trainerCols = [
    { header: "Coach", accessor: "coach" },
    { header: "Sessions", accessor: "sessions" },
    { header: "Retention %", accessor: "retention", cell: r => <strong>{r.retention}%</strong> },
    { header: "Rating", accessor: "rating" },
  ];

  const utilCols = [
    { header: "Day", accessor: "day" },
    { header: "Utilization %", accessor: "utilization", cell: r => <strong>{r.utilization}%</strong> },
  ];

  /* ===== export helpers ===== */
  function exportCSV(name, rows) {
    const keys = Object.keys(rows[0]||{});
    const out = [keys, ...rows.map(r => keys.map(k => r[k]))]
      .map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([out], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LineIcon}
        title="Reporting & Analytics"
        subtitle="Track revenue, attendance, programs, trainers, nutrition, and funnel performance."
        actions={
          <div className="flex items-center gap-2">
            <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            <ToolbarButton icon={Download} variant="secondary" onClick={()=>window.print()}>Print</ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="reports-tabs"
        tabs={[
          { key:"revenue",    label:"Revenue",    icon: TrendingUp },
          { key:"attendance", label:"Attendance", icon: CalendarRange },
          { key:"programs",   label:"Programs",   icon: Dumbbell },
          { key:"trainers",   label:"Trainers",   icon: Users },
          { key:"nutrition",  label:"Nutrition",  icon: Salad },
          { key:"funnel",     label:"Funnel",     icon: Percent },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ========= REVENUE ========= */}
      {tab==="revenue" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI title="MRR" value={fmt(mrr)} delta={mrrDelta} />
            <KPI title="ARR" value={fmt(mrr*12)} />
            <KPI title="Churn" value={`${churnRate}%`} delta={-churnRate} invert />
            <KPI title="Retention" value={`${retention}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="MRR" subtitle="12 months">
              <AreaTrend data={revenue.map(r=>({ label: r.m, value: r.mrr }))} />
            </ChartCard>
            <ChartCard title="New vs Cancels" subtitle="12 months">
              <BarTrend data={revenue.map(r=>({ label: r.m.slice(5), value: r.newSubs, cancels: r.cancels }))} x="label" y="value" />
            </ChartCard>
            <ChartCard title="Net Adds" subtitle="New - Cancels">
              <LineTrend data={revenue.map(r=>({ label: r.m.slice(5), value: r.newSubs - r.cancels }))} />
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ========= ATTENDANCE ========= */}
      {tab==="attendance" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Avg Utilization" value={`${avgUtil}%`} />
            <KPI title="Peak Day" value={`${peak(attendance, 'utilization').day}`} />
            <KPI title="Peak Util %" value={`${peak(attendance, 'utilization').utilization}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Utilization (30d)" subtitle="Percent of capacity">
              <LineTrend data={attendance.map(a=>({ label: a.day, value: a.utilization }))} />
            </ChartCard>
            <ChartCard title="Daily Utilization Table" subtitle="Last 30 days" right={<ToolbarButton variant="secondary" icon={Download} onClick={()=>exportCSV("attendance", attendance)}>CSV</ToolbarButton>}>
              <div className="h-[260px] overflow-auto">
                <DataTable columns={utilCols} data={attendance} loading={loading} pagination={false} />
              </div>
            </ChartCard>
            <ChartCard title="By Day-of-Week" subtitle="Avg utilization">
              <BarTrend data={dow(attendance)} x="dow" y="avg" />
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ========= PROGRAMS ========= */}
      {tab==="programs" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Completion Rate by Program" subtitle="Higher is better">
              <BarTrend data={completionRows.map(r=>({ label: r.program, value: r.completionRate }))} />
            </ChartCard>
            <ChartCard title="Personal Records (PRs)" subtitle="Program totals">
              <AreaTrend data={programs.map(p=>({ label: short(p.name), value: p.prs }))} />
            </ChartCard>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Program Table</div>
                <ToolbarButton variant="secondary" icon={Download} onClick={()=>exportCSV("programs", completionRows)}>CSV</ToolbarButton>
              </div>
              <div className="mt-2">
                <DataTable columns={programCols} data={completionRows} loading={loading} pagination itemsPerPage={8} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========= TRAINERS ========= */}
      {tab==="trainers" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Top Sessions" value={trainerRows[0].coach} />
            <KPI title="Best Retention" value={trainerRows.slice().sort((a,b)=>b.retention-a.retention)[0].coach} />
            <KPI title="Highest Rating" value={trainerRows.slice().sort((a,b)=>b.rating-a.rating)[0].coach} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Sessions by Trainer" subtitle="This month">
              <BarTrend data={trainerRows.map(t=>({ label: t.coach, value: t.sessions }))} />
            </ChartCard>
            <ChartCard title="Retention by Trainer" subtitle="% of clients retained">
              <LineTrend data={trainerRows.map(t=>({ label: t.coach, value: t.retention }))} />
            </ChartCard>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Trainer Table</div>
              <ToolbarButton variant="secondary" icon={Download} onClick={()=>exportCSV("trainers", trainerRows)}>CSV</ToolbarButton>
            </div>
            <div className="mt-2">
              <DataTable columns={trainerCols} data={trainerRows} loading={loading} pagination itemsPerPage={8} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ========= NUTRITION ========= */}
      {tab==="nutrition" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Avg Adherence" value={`${avg(nutrition, 'adherence')}%`} />
            <KPI title="Best Week" value={peak(nutrition, 'adherence').week} />
            <KPI title="Best %" value={`${peak(nutrition, 'adherence').adherence}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Weekly Adherence" subtitle="6 weeks">
              <AreaTrend data={nutrition.map(n=>({ label: n.week, value: n.adherence }))} />
            </ChartCard>
            <ChartCard title="Goal Hit Split" subtitle="Est. distribution">
              <Donut data={[
                { name:">90%", value: 22 },
                { name:"75–90%", value: 48 },
                { name:"50–75%", value: 24 },
                { name:"<50%", value: 6 },
              ]}/>
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* ========= FUNNEL ========= */}
      {tab==="funnel" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI title="Leads" value={funnel.leads} />
            <KPI title="Qualified" value={`${funnel.qualified} (${rate(funnel.qualified, funnel.leads)}%)`} />
            <KPI title="Trials" value={`${funnel.trial} (${rate(funnel.trial, funnel.leads)}%)`} />
            <KPI title="Members" value={`${funnel.member} (${rate(funnel.member, funnel.leads)}%)`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Stage Conversion" subtitle="Overall">
              <BarTrend data={funnelRates.map(r=>({ label: r.stage, value: r.value }))} />
            </ChartCard>
            <ChartCard title="Lead Sources (est.)" subtitle="Example split">
              <Donut data={[
                { name:"Website", value: 46 },
                { name:"Facebook", value: 32 },
                { name:"Instagram", value: 14 },
                { name:"Referral", value: 8 },
              ]}/>
            </ChartCard>
            <ChartCard title="Month-over-Month Members" subtitle="Synthetic">
              <LineTrend data={revenue.map(r=>({ label: r.m.slice(5), value: Math.round(r.mrr/150) }))} />
            </ChartCard>
          </div>
        </motion.div>
      )}

      {/* skeleton when loading */}
      {loading && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({length:6}).map((_,i)=> <div key={i} className="h-32 rounded-lg bg-slate-100 animate-pulse" />)}
      </div>}

      <style jsx>{`
        .kpi { @apply rounded-lg border border-slate-200 bg-white p-4; }
      `}</style>
    </div>
  );
}

/* ===== Small helpers (local) ===== */
function KPI({ title, value, delta, invert }) {
  const good = invert ? (delta<0) : (delta>0);
  return (
    <div className="kpi">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {delta!=null && (
        <div className={`text-xs mt-1 ${good?'text-emerald-600':'text-rose-600'}`}>
          {good ? '↑' : '↓'} {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}
function fmt(n){ return n.toLocaleString(undefined, { style:"currency", currency:"USD", maximumFractionDigits:0 }); }
function pctDelta(prev, now){ if(!prev) return 0; return Math.round(((now-prev)/prev)*1000)/10; }
function avg(arr, k){ return Math.round(arr.reduce((a,b)=>a+b[k],0)/Math.max(1,arr.length)); }
function peak(arr, k){ return arr.reduce((m,x)=> x[k]>m[k]? x : m, arr[0]); }
function short(s){ return s.replace(/(Beginner|Hypertrophy|Strength|Loss)/g, (m)=>m[0]); }
function rate(part, whole){ return Math.round((part/Math.max(1,whole))*100); }
function dow(days){ // avg by Mon..Sun
  const week = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const now = new Date();
  const enriched = days.map(d => {
    // rebuild date with current year for weekday
    const s = new Date(`${now.getFullYear()}-${d.day}`);
    const wd = week[(s.getDay()+6)%7];
    return { wd, v: d.utilization };
  });
  return week.map(w => {
    const items = enriched.filter(x => x.wd===w);
    const avg = Math.round(items.reduce((a,b)=>a+b.v,0)/Math.max(1,items.length));
    return { dow: w, avg };
  });
}
