"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, ToolbarButton, Modal, EmptyState, SearchInput, Select,
  CalendarToolbar, BadgeDot, spring
} from "@/components/dashboard/ui/UI";
import { CalendarRange, Plus, Users, Download, Clock, MapPin, User2, Trash2, Copy, Check } from "lucide-react";

/* ================= Mock data ================= */
const STAFF = [
  { id:"c1", name:"Coach Ahmed" },
  { id:"c2", name:"Coach Sara"  },
  { id:"c3", name:"Coach Omar"  },
];
const ROOMS = ["Studio A","Studio B","PT Room 1","PT Room 2"];

const seedBookings = [
  // type: class | pt | event
  { id:"BK-1", title:"HIIT Express",  type:"class", coachId:"c2", room:"Studio A", date:"2025-08-31", start:"18:00", end:"18:45", capacity:18, attendees:16, waitlist:0 },
  { id:"BK-2", title:"PT – John D.",  type:"pt",    coachId:"c1", room:"PT Room 1", date:"2025-08-31", start:"17:00", end:"18:00", capacity:1,  attendees:1,  waitlist:1 },
  { id:"BK-3", title:"Yoga Basics",   type:"class", coachId:"c3", room:"Studio B", date:"2025-09-01", start:"19:00", end:"20:00", capacity:20, attendees:20, waitlist:3 },
  { id:"BK-4", title:"Nutrition Talk",type:"event", coachId:"c2", room:"Studio A", date:"2025-09-03", start:"17:30", end:"18:30", capacity:30, attendees:22, waitlist:0 },
];

/* ================= Helpers ================= */
const colorFor = (t) => t==="class" ? "indigo" : t==="pt" ? "emerald" : "amber";
const iso = (d) => d.toISOString().slice(0,10);
function startOfWeek(dt){ const day=(dt.getDay()+6)%7; const nd=new Date(dt); nd.setDate(dt.getDate()-day); nd.setHours(0,0,0,0); return nd; }
function addDays(dt,n){ const nd=new Date(dt); nd.setDate(nd.getDate()+n); return nd; }
function monthMatrix(date){
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({length:6},(_,w)=> Array.from({length:7},(_,d)=> addDays(start, w*7+d)));
}
const within = (d, a, b) => d >= a && d <= b;
const timeStr = (t) => t.replace(/:00$/,""); // prettify

/* ================= Page ================= */
export default function CalendarPage(){
  const [view, setView] = useState("month"); // month | week | list
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [q, setQ] = useState("");
  const [coach, setCoach] = useState("All");
  const [type, setType] = useState("All");
  const [room, setRoom] = useState("All");

  // modal: create/edit
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ id:null, title:"", type:"class", coachId:"", room:"", date: iso(new Date()), start:"18:00", end:"19:00", capacity: 20, attendees: 0, waitlist: 0 });

  // details
  const [openView, setOpenView] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(()=>{ setBookings(seedBookings); setLoading(false); }, 300);
  }, []);

  /* ===== Filters ===== */
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return bookings.filter(b => {
      if (s && ![b.title, b.room].join(" ").toLowerCase().includes(s)) return false;
      if (coach !== "All" && b.coachId !== coach) return false;
      if (type  !== "All" && b.type !== type) return false;
      if (room  !== "All" && b.room !== room) return false;
      return true;
    });
  }, [bookings, q, coach, type, room]);

  /* ===== Derived for calendar ===== */
  const matrix = useMemo(()=> monthMatrix(date), [date]);
  const weekDays = useMemo(()=>{
    const s = startOfWeek(date);
    return Array.from({length:7},(_,i)=> addDays(s,i));
  }, [date]);

  const byDate = useMemo(() => {
    const map = {};
    for (const b of filtered) { (map[b.date] ||= []).push(b); }
    for (const k in map) map[k].sort((a,b) => a.start.localeCompare(b.start));
    return map;
  }, [filtered]);

  /* ===== Actions ===== */
  function openNew(day){ setForm({ id:null, title:"", type:"class", coachId:STAFF[0]?.id||"", room:ROOMS[0]||"", date: iso(day||new Date()), start:"18:00", end:"19:00", capacity: 20, attendees: 0, waitlist: 0 }); setOpen(true); }
  function saveBooking(e){
    e.preventDefault();
    const rec = { ...form, id: form.id || "BK-"+Date.now() };
    setBookings(list => form.id ? list.map(x=>x.id===rec.id?rec:x) : [rec, ...list]);
    setOpen(false);
  }
  function editBooking(b){ setForm({ ...b }); setOpen(true); }
  function viewBooking(b){ setCurrent(b); setOpenView(true); }
  function duplicate(b){ const copy = { ...b, id:"BK-"+Date.now(), title: b.title+" (Copy)" }; setBookings(list => [copy, ...list]); }
  function cancelBooking(id){ setBookings(list => list.filter(x => x.id!==id)); setOpenView(false); }
  function addAttendee(id){
    setBookings(list => list.map(x => {
      if (x.id!==id) return x;
      if (x.attendees < x.capacity) return { ...x, attendees: x.attendees+1 };
      return { ...x, waitlist: x.waitlist+1 };
    }));
  }
  function promoteWaitlist(id){
    setBookings(list => list.map(x => {
      if (x.id!==id) return x;
      if (x.waitlist > 0) return { ...x, waitlist: x.waitlist-1, attendees: Math.min(x.capacity, x.attendees+1) };
      return x;
    }));
  }
  function exportICS(b){
    const dt = (d,t)=> {
      const [H,M]=t.split(":").map(Number);
      const dt=new Date(d+"T"+t+":00");
      const y=dt.getFullYear(), m=String(dt.getMonth()+1).padStart(2,"0"), da=String(dt.getDate()).padStart(2,"0"), hh=String(H).padStart(2,"0"), mm=String(M).padStart(2,"0");
      return `${y}${m}${da}T${hh}${mm}00`;
    };
    const ics = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GymOS//Calendar//EN","BEGIN:VEVENT",
      `UID:${b.id}@gymos`,`DTSTAMP:${dt(b.date,b.start)}`,
      `DTSTART:${dt(b.date,b.start)}`,`DTEND:${dt(b.date,b.end)}`,
      `SUMMARY:${b.title}`,`LOCATION:${b.room}`,`DESCRIPTION:Coach ${STAFF.find(s=>s.id===b.coachId)?.name||""} • ${b.type.toUpperCase()}`,
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
    const url=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
    const a=document.createElement("a"); a.href=url; a.download=`${b.title}.ics`; a.click(); URL.revokeObjectURL(url);
  }

  /* ===== Columns for list view ===== */
  const listCols = [
    { header: "Date", accessor: "date" },
    { header: "Time", accessor: "start", cell: r => `${timeStr(r.start)}–${timeStr(r.end)}` },
    { header: "Title", accessor: "title" },
    { header: "Type", accessor: "type", cell: r => <BadgeDot color={colorFor(r.type)}>{r.type}</BadgeDot> },
    { header: "Coach", accessor: "coachId", cell: r => STAFF.find(s=>s.id===r.coachId)?.name || "—" },
    { header: "Room", accessor: "room" },
    { header: "Capacity", accessor: "capacity", cell: r => <span className="tabular-nums">{r.attendees}/{r.capacity}{r.waitlist?` (+${r.waitlist})`:""}</span> },
    { header: "Actions", accessor: "_", cell: r => (
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>viewBooking(r)} title="Open"><CalendarRange className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>editBooking(r)} title="Edit"><Clock className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>duplicate(r)} title="Duplicate"><Copy className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>exportICS(r)} title="Export .ics"><Download className="w-4 h-4" /></button>
      </div>
    )},
  ];

  /* ===== Render ===== */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarRange}
        title="Calendar & Bookings"
        subtitle="Classes, PT sessions, and events with capacity & waitlists."
        actions={<ToolbarButton icon={Plus} onClick={()=>openNew(date)}>New booking</ToolbarButton>}
      />

      {/* Filters + Toolbar */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <CalendarToolbar date={date} setDate={setDate} view={view} setView={setView} />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title/room…" />
            <Select label="Type" value={type} setValue={setType} options={["All","class","pt","event"]} />
            {/* <Select label="Coach" value={coach} setValue={setCoach} options={["All", ...STAFF.map(s=>({label:s.name,value:s.id}))]} /> */}
            <Select label="Room" value={room} setValue={setRoom} options={["All", ...ROOMS]} />
          </div>
        </div>
      </motion.div>

      {/* Views */}
      {view==="month" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-lg border border-slate-200 bg-white p-2">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(h => <th key={h} className="px-2 py-2 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((week,i)=>(
                <tr key={i} className="align-top">
                  {week.map((day,j)=>{
                    const ds = iso(day);
                    const out = day.getMonth()!==date.getMonth();
                    const items = byDate[ds] || [];
                    return (
                      <td key={j} className="p-1">
                        <div className={`h-36 rounded-lg border p-2 ${out?'border-slate-100 bg-slate-50 text-slate-400':'border-slate-200 bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <button onClick={()=>openNew(day)} className="text-xs font-medium">{day.getDate()}</button>
                            <div className="flex gap-1">
                              {items.slice(0,3).map(b => (
                                <span key={b.id} title={`${b.title} • ${b.start}`}
                                  className={`w-2 h-2 rounded-full bg-${colorFor(b.type)}-500`} />
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1 overflow-auto max-h-24 pr-1">
                            {items.map(b => (
                              <button key={b.id} onClick={()=>viewBooking(b)}
                                className={`w-full text-left px-2 py-1 rounded-lg border text-xs hover:bg-slate-50 border-${colorFor(b.type)}-200`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-medium text-${colorFor(b.type)}-700 truncate`}>{b.title}</span>
                                  <span className="text-[10px] text-slate-500">{timeStr(b.start)}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {STAFF.find(s=>s.id===b.coachId)?.name} · {b.room} · {b.attendees}/{b.capacity}{b.waitlist?` (+${b.waitlist})`:""}
                                </div>
                              </button>
                            ))}
                            {!items.length && <div className="text-[11px] text-slate-400">No bookings</div>}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {view==="week" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-lg border border-slate-200 bg-white p-3 overflow-x-auto">
          <div className="grid grid-cols-8 gap-2 min-w-[880px]">
            <div />
            {weekDays.map(d => <div key={iso(d)} className="text-sm font-medium">{d.toLocaleDateString(undefined,{weekday:"short", day:"numeric"})}</div>)}
            {[...Array(14)].map((_,slot)=>{ // half-hour slots from ~8:00–15:00 (demo)
              const tH = 8 + Math.floor(slot/2), tM = slot%2 ? "30":"00";
              const label = `${String(tH).padStart(2,"0")}:${tM}`;
              return (
                <>
                  <div key={`h-${slot}`} className="text-xs text-slate-500">{label}</div>
                  {weekDays.map(d => {
                    const ds = iso(d);
                    const items = (byDate[ds]||[]).filter(b => b.start===label);
                    return (
                      <div key={`${ds}-${slot}`} className="min-h-10 border rounded-lg border-slate-100 p-1">
                        {items.map(b => (
                          <button key={b.id} onClick={()=>viewBooking(b)} className={`w-full text-left px-2 py-1 rounded bg-${colorFor(b.type)}-50 text-${colorFor(b.type)}-800 text-xs`}>
                            {b.title} · {timeStr(b.start)}–{timeStr(b.end)}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </motion.div>
      )}

      {view==="list" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-lg border border-slate-200 bg-white p-4">
          <DataTable
            columns={listCols}
            data={[...filtered].sort((a,b)=> (a.date+b.start).localeCompare(b.date+b.start))}
            loading={loading}
            pagination
            itemsPerPage={10}
          />
          {!loading && !filtered.length && <EmptyState title="No bookings" subtitle="Try different filters or create a booking." />}
        </motion.div>
      )}

      {/* ===== Create / Edit booking ===== */}
      <Modal open={open} onClose={()=>setOpen(false)} title={form.id ? "Edit Booking" : "New Booking"}>
        <form onSubmit={saveBooking} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Title"><input className="inp" value={form.title} onChange={e=>setForm(f=>({ ...f, title:e.target.value }))} required /></Field>
            <Field label="Type">
              <select className="inp" value={form.type} onChange={e=>setForm(f=>({ ...f, type:e.target.value }))}>
                <option value="class">Class</option><option value="pt">PT</option><option value="event">Event</option>
              </select>
            </Field>
            <Field label="Coach">
              <select className="inp" value={form.coachId} onChange={e=>setForm(f=>({ ...f, coachId:e.target.value }))}>
                {STAFF.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Room">
              <select className="inp" value={form.room} onChange={e=>setForm(f=>({ ...f, room:e.target.value }))}>
                {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" className="inp" value={form.date} onChange={e=>setForm(f=>({ ...f, date:e.target.value }))} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start"><input type="time" className="inp" value={form.start} onChange={e=>setForm(f=>({ ...f, start:e.target.value }))} /></Field>
              <Field label="End"><input type="time" className="inp" value={form.end} onChange={e=>setForm(f=>({ ...f, end:e.target.value }))} /></Field>
            </div>
            <Field label="Capacity"><input type="number" min={1} className="inp" value={form.capacity} onChange={e=>setForm(f=>({ ...f, capacity:+e.target.value }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">{form.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* ===== View booking / manage waitlist ===== */}
      <Modal open={openView} onClose={()=>setOpenView(false)} title="Booking">
        {current ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="font-semibold">{current.title} <span className="ml-2"><BadgeDot color={colorFor(current.type)}>{current.type}</BadgeDot></span></div>
              <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-4">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {current.date} · {timeStr(current.start)}–{timeStr(current.end)}</span>
                <span className="flex items-center gap-1"><User2 className="w-4 h-4" /> {STAFF.find(s=>s.id===current.coachId)?.name}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {current.room}</span>
              </div>
              <div className="mt-2 text-sm">Capacity: <span className="tabular-nums">{current.attendees}/{current.capacity}</span> {current.waitlist ? <span className="text-amber-700">(+{current.waitlist} wait)</span> : null}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-sm" onClick={()=>addAttendee(current.id)}><Users className="w-4 h-4" /> Add attendee</button>
              <button className="btn-sm" onClick={()=>promoteWaitlist(current.id)}><Check className="w-4 h-4" /> Promote from waitlist</button>
              <button className="btn-sm" onClick={()=>duplicate(current)}><Copy className="w-4 h-4" /> Duplicate</button>
              <button className="btn-sm" onClick={()=>exportICS(current)}><Download className="w-4 h-4" /> .ics</button>
              <button className="btn-sm" onClick={()=>cancelBooking(current.id)}><Trash2 className="w-4 h-4" /> Cancel</button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* local styles if not global */}
      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm; }
      `}</style>
    </div>
  );
}

/* tiny */
function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
