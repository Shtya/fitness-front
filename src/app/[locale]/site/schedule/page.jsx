"use client";

// app/(site)/schedule/page.jsx
// Public Website Class Schedule (public view + “Book a trial”)

import { useMemo, useState } from "react";
import TrialModal from "@/components/site/TrialModal";
import { Container, Section, Button, Card, Input, Select, Badge } from "@/components/site/UI";
import { CalendarRange, Clock, MapPin, Users, Dumbbell,   Kayak, FlameKindling, Activity, Download } from "lucide-react";

// ===== Demo data (replace with CMS/API) =====
const CLASSES = [
  { id:'Y1', title:'Yoga Basics', type:'Yoga', day:'Mon', time:'18:00', length:60, coach:'Sara', room:'Studio B', capacity:20, left:2 },
  { id:'H1', title:'HIIT Express', type:'HIIT', day:'Tue', time:'19:00', length:45, coach:'Omar', room:'Studio A', capacity:18, left:0 },
  { id:'S1', title:'Strength 101', type:'Strength', day:'Wed', time:'20:00', length:60, coach:'Ahmed', room:'Studio A', capacity:18, left:5 },
  { id:'C1', title:'Core & Mobility', type:'Mobility', day:'Thu', time:'18:30', length:45, coach:'Sara', room:'Studio B', capacity:16, left:7 },
  { id:'B1', title:'BoxFit', type:'Boxing', day:'Sat', time:'17:00', length:60, coach:'Omar', room:'Studio A', capacity:20, left:10 },
  { id:'Y2', title:'Vinyasa Flow', type:'Yoga', day:'Sun', time:'10:00', length:60, coach:'Sara', room:'Studio B', capacity:20, left:12 },
];

const TYPES = ['All','Strength','HIIT','Mobility','Yoga','Boxing'];
const DAYS  = ['All','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ORDER = {Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};

const TYPE_ICON = {
  Strength: Dumbbell,
  HIIT: FlameKindling,
  Mobility: Activity,
  Yoga: Kayak,
  Boxing: Activity,
};

export default function PublicSchedulePage(){
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('grid'); // grid | list
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');
  const [day, setDay] = useState('All');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return CLASSES
      .filter(c => (type==='All' || c.type===type))
      .filter(c => (day==='All' || c.day===day))
      .filter(c => !s || [c.title,c.coach,c.type,c.day].join(' ').toLowerCase().includes(s))
      .sort((a,b)=> ORDER[a.day]-ORDER[b.day] || a.time.localeCompare(b.time));
  }, [q,type,day]);

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">Class Schedule</h1>
            <p className="text-slate-600">Filter by day and type. Book a free trial to join a class.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={()=>setOpen(true)}>Book a trial</Button>
            <Button variant='ghost' onClick={()=>setView(v=> v==='grid'?'list':'grid')}>{view==='grid'?'List view':'Grid view'}</Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mt-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input placeholder="Search class or coach…" value={q} onChange={e=>setQ(e.target.value)} />
            <Select value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(t=> <option key={t}>{t}</option>)}</Select>
            <Select value={day} onChange={e=>setDay(e.target.value)}>{DAYS.map(t=> <option key={t}>{t}</option>)}</Select>
            <Button variant='ghost' onClick={()=>{ setQ(''); setType('All'); setDay('All'); }}>Reset</Button>
          </div>
        </Card>

        {/* Content */}
        {view==='grid' ? (
          <GridByDay classes={filtered} onTrial={()=>setOpen(true)} />
        ) : (
          <ListAll classes={filtered} onTrial={()=>setOpen(true)} />
        )}

        <TrialModal open={open} onClose={()=>setOpen(false)} />
      </Container>
    </Section>
  );
}

/* =================== Grid by Day =================== */
function GridByDay({ classes, onTrial }){
  const groups = useMemo(() => {
    const map = {};
    for (const c of classes) { (map[c.day] ||= []).push(c); }
    for (const k of Object.keys(map)) map[k].sort((a,b)=> a.time.localeCompare(b.time));
    return Object.entries(map).sort((a,b)=> ORDER[a[0]]-ORDER[b[0]]);
  }, [classes]);

  if (!classes.length) return <EmptySchedule onTrial={onTrial} />;

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map(([day,items]) => (
        <Card key={day} className="p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{day}</div>
            <Badge>Classes: {items.length}</Badge>
          </div>
          <div className="mt-3 space-y-3">
            {items.map(c => <ClassRow key={c.id} c={c} onTrial={onTrial} />)}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* =================== List all =================== */
function ListAll({ classes, onTrial }){
  if (!classes.length) return <EmptySchedule onTrial={onTrial} />;
  return (
    <Card className="mt-6 p-0 overflow-x-auto">
      <table className="min-w-[760px] w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-3 pl-4">Class</th>
            <th className="py-3">Day</th>
            <th className="py-3">Time</th>
            <th className="py-3">Coach</th>
            <th className="py-3">Room</th>
            <th className="py-3">Capacity</th>
            <th className="py-3 pr-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {classes.map(c => (
            <tr key={c.id}>
              <td className="py-3 pl-4"><span className="font-medium">{c.title}</span> <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{c.type}</span></td>
              <td className="py-3">{c.day}</td>
              <td className="py-3">{c.time} ({c.length}m)</td>
              <td className="py-3">{c.coach}</td>
              <td className="py-3">{c.room}</td>
              <td className="py-3">{c.capacity} · {c.left===0? <span className="text-rose-600">Full</span> : <span>{c.left} left</span>}</td>
              <td className="py-3 pr-4 text-right">
                <div className="inline-flex items-center gap-2">
                  <Button onClick={onTrial} disabled={c.left===0}>{c.left===0? 'Join waitlist' : 'Book trial'}</Button>
                  <Button variant='ghost' onClick={()=>exportICS(c)} title="Add to calendar"><Download className="w-4 h-4"/></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* =================== Single class row (card list) =================== */
function ClassRow({ c, onTrial }){
  const Icon = TYPE_ICON[c.type] || CalendarRange;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 grid place-items-center"><Icon className="w-5 h-5"/></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium truncate">{c.title}</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">{c.type}</span>
          </div>
          <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {c.day} · {c.time} ({c.length}m)</span>
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5"/> Coach {c.coach}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {c.room}</span>
            <span className="inline-flex items-center gap-1">Capacity {c.capacity} · {c.left===0? <span className="text-rose-600">Full</span> : <span>{c.left} left</span>}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={onTrial} disabled={c.left===0}>{c.left===0? 'Join waitlist' : 'Book trial'}</Button>
            <Button variant='ghost' onClick={()=>exportICS(c)} title="Add to calendar"><Download className="w-4 h-4"/></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== Empty =================== */
function EmptySchedule({ onTrial }){
  return (
    <Card className="mt-6 p-8 text-center">
      <div className="text-slate-700 font-medium">No classes match your filters.</div>
      <div className="text-slate-500 text-sm mt-1">Try a different day or type, or book a free trial and we’ll help you pick.</div>
      <div className="mt-3"><Button onClick={onTrial}>Book a trial</Button></div>
    </Card>
  );
}

/* =================== .ics Export =================== */
function exportICS(c){
  const toICS = (day, time, length) => {
    const dayIdx = ORDER[day];
    const now = new Date();
    // find next occurrence of the weekday
    const cur = (now.getDay()+6)%7+1; // Mon=1..Sun=7
    const add = (dayIdx - cur + 7) % 7 || 7; // next week if today passed
    const [h,m] = time.split(":").map(Number);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()+add, h, m, 0);
    const end = new Date(start.getTime() + length*60000);
    const fmt = (d)=> `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
    return { dtStart: fmt(start), dtEnd: fmt(end) };
  };
  const { dtStart, dtEnd } = toICS(c.day, c.time, c.length||60);
  const body = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AmazingGym//Schedule//EN','BEGIN:VEVENT',
    `UID:${c.id}@amazinggym`,`DTSTAMP:${dtStart}`,`DTSTART:${dtStart}`,`DTEND:${dtEnd}`,
    `SUMMARY:${c.title} (${c.type})`,`LOCATION:${c.room}`,
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const url=URL.createObjectURL(new Blob([body],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=`${c.title}.ics`; a.click(); URL.revokeObjectURL(url);
}
