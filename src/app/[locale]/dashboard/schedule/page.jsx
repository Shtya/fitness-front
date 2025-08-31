"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Calendar from "./Calendar";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, SearchInput, Select, Switch,
  DateRangeControl, TimeSlotPicker, MiniMonth, spring, Badge
} from "@/components/dashboard/ui/UI";
import {
  CalendarRange, Users, Building2, Dumbbell, Download, Plus, Pencil, Trash2, Check, XCircle, Clock, UserPlus
} from "lucide-react";

/* ================= Mock Data ================= */
const seedCoaches = [
  { id: "C-1", name: "Coach Ali" },
  { id: "C-2", name: "Coach Mariam" },
  { id: "C-3", name: "Coach Omar" },
];
const seedRooms = [
  { id: "R-1", name: "Studio A", capacity: 20 },
  { id: "R-2", name: "Studio B", capacity: 14 },
  { id: "R-3", name: "Weight Room", capacity: 30 },
];
const seedEvents = [
  { id: 100, title: "HIIT", type: "class", start: iso("2025-08-31 18:00"), end: iso("2025-08-31 19:00"), coachId: "C-1", roomId: "R-1", roomName:"Studio A", capacity: 20, booked: 18 },
  { id: 101, title: "PT · John", type: "pt",   start: iso("2025-08-31 19:00"), end: iso("2025-08-31 20:00"), coachId: "C-2", roomId: "R-3", roomName:"Weight Room", capacity: 1, booked: 1 },
  { id: 102, title: "Yoga Flow", type: "class", start: iso("2025-09-01 18:30"), end: iso("2025-09-01 19:30"), coachId: "C-3", roomId: "R-2", roomName:"Studio B", capacity: 14, booked: 12 },
];
const seedRoster = [
  // day: 0=Mon ... 6=Sun
  { coachId: "C-1", day: 0, start: "17:00", end: "21:00" },
  { coachId: "C-2", day: 2, start: "10:00", end: "18:00" },
  { coachId: "C-3", day: 4, start: "16:00", end: "20:00" },
];
const seedBookings = [
  { id: "B-9001", member: "John Doe", eventId: 100, eventTitle: "HIIT", status: "booked", bookedAt: "2025-08-30T10:00:00Z" },
  { id: "B-9002", member: "Sarah Smith", eventId: 100, eventTitle: "HIIT", status: "booked", bookedAt: "2025-08-31T09:00:00Z" },
  { id: "B-9003", member: "Mike Johnson", eventId: 102, eventTitle: "Yoga Flow", status: "waitlist", bookedAt: "2025-08-31T11:00:00Z" },
];

/* ================= Page ================= */
export default function SchedulePage() {
  const [tab, setTab] = useState("calendar"); // calendar | roster | resources | bookings
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("week");

  const [coaches, setCoaches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [bookings, setBookings] = useState([]);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // modals
  const [openEvent, setOpenEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title:"", type:"class", dateISO: todayISO(), slot:{start:"18:00", end:"19:00"}, coachId:"", roomId:"", capacity:20, repeat:false, repeatCount:4 });

  const [openRoom, setOpenRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({ name:"", capacity:20 });

  const [openShift, setOpenShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({ coachId:"", day:0, slot:{start:"10:00", end:"18:00"} });

  const [openBooking, setOpenBooking] = useState(false);
  const [bookForm, setBookForm] = useState({ member:"", eventId:"" });

  useEffect(() => {
    // mock fetch
    setLoading(true);
    setTimeout(()=>{
      setCoaches(seedCoaches);
      setRooms(seedRooms);
      setEvents(seedEvents);
      setRoster(seedRoster);
      setBookings(seedBookings);
      setLoading(false);
    }, 500);
  }, []);

  /* ===== Derived ===== */
  const filteredBookings = useMemo(() => {
    let list = bookings.slice();
    if (status !== "All") list = list.filter(b => b.status === status);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(b => `${b.member} ${b.eventTitle}`.toLowerCase().includes(s));
    }
    if (from) list = list.filter(b => b.bookedAt >= from);
    if (to)   list = list.filter(b => b.bookedAt <= addDay(to));
    return list.sort((a,b)=> b.bookedAt.localeCompare(a.bookedAt));
  }, [bookings, status, search, from, to]);

  const eventCols = [
    { header:"Title", accessor:"title" },
    { header:"Type", accessor:"type", cell:r=> <Badge color={r.type==='class'?'blue':'indigo'}>{r.type}</Badge> },
    { header:"Coach", accessor:"coachId", cell:r=> coaches.find(c=>c.id===r.coachId)?.name || "—" },
    { header:"Room", accessor:"roomId", cell:r=> rooms.find(x=>x.id===r.roomId)?.name || "—" },
    { header:"Start", accessor:"start", cell:r=> new Date(r.start).toLocaleString() },
    { header:"End", accessor:"end", cell:r=> new Date(r.end).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) },
    { header:"Capacity", accessor:"capacity", cell:r=> `${r.booked||0}/${r.capacity}` },
    { header:"Actions", accessor:"_", cell:r=>(<div className="flex items-center gap-2">
      <button className="btn-sm" onClick={()=>editEvent(r)}><Pencil className="w-4 h-4" /></button>
      <button className="btn-sm" onClick={()=>removeEvent(r.id)}><Trash2 className="w-4 h-4" /></button>
    </div>)}
  ];

  const rosterCols = [
    { header:"Coach", accessor:"coachId", cell:r=> coaches.find(c=>c.id===r.coachId)?.name },
    { header:"Day", accessor:"day", cell:r=> ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][r.day] },
    { header:"Start", accessor:"start" },
    { header:"End", accessor:"end" },
    { header:"Actions", accessor:"_", cell:r=>(<div className="flex items-center gap-2">
      <button className="btn-sm" onClick={()=>editShift(r)}><Pencil className="w-4 h-4" /></button>
      <button className="btn-sm" onClick={()=>removeShift(r)}><Trash2 className="w-4 h-4" /></button>
    </div>)}
  ];

  const resourceCols = [
    { header:"Room/Area", accessor:"name" },
    { header:"Capacity", accessor:"capacity" },
    { header:"Actions", accessor:"_", cell:r=>(<div className="flex items-center gap-2">
      <button className="btn-sm" onClick={()=>editRoom(r)}><Pencil className="w-4 h-4" /></button>
      <button className="btn-sm" onClick={()=>removeRoom(r.id)}><Trash2 className="w-4 h-4" /></button>
    </div>)}
  ];

  const bookingCols = [
    { header:"Member", accessor:"member" },
    { header:"Event", accessor:"eventTitle" },
    { header:"Status", accessor:"status", cell:r=> r.status==="booked" ? <Badge color="emerald">Booked</Badge> : r.status==="attended" ? <Badge color="blue">Attended</Badge> : r.status==="waitlist" ? <Badge color="amber">Waitlist</Badge> : <Badge color="slate">Canceled</Badge> },
    { header:"Booked At", accessor:"bookedAt", cell:r=> new Date(r.bookedAt).toLocaleString() },
    { header:"Actions", accessor:"_", cell:r=>(
      <div className="flex items-center gap-2">
        {r.status==="booked" && <button className="btn-sm" onClick={()=>markAttended(r.id)} title="Attended"><Check className="w-4 h-4" /></button>}
        {r.status!=="canceled" && <button className="btn-sm" onClick={()=>cancelBooking(r.id)} title="Cancel"><XCircle className="w-4 h-4" /></button>}
        {r.status==="waitlist" && <button className="btn-sm" onClick={()=>promoteWaitlist(r.id)} title="Promote">Promote</button>}
      </div>
    )},
  ];

  /* ===== Actions ===== */
  function openNewFromCalendar({ date: d }) {
    const dISO = d.toISOString().slice(0,10);
    setEventForm({ title:"", type:"class", dateISO: dISO, slot:{start:"18:00", end:"19:00"}, coachId: coaches[0]?.id || "", roomId: rooms[0]?.id || "", capacity: 20, repeat:false, repeatCount:4 });
    setOpenEvent(true);
  }
  function openExisting(ev) {
    editEvent(ev);
  }

  function saveEvent(e){
    e.preventDefault();
    const id = eventForm.id || Date.now();
    const start = new Date(`${eventForm.dateISO}T${eventForm.slot.start}:00`);
    const end   = new Date(`${eventForm.dateISO}T${eventForm.slot.end}:00`);
    const roomName = rooms.find(r=>r.id===eventForm.roomId)?.name || "";
    const base = { id, title:eventForm.title.trim() || "Untitled", type:eventForm.type, start:start.toISOString(), end:end.toISOString(), coachId:eventForm.coachId, roomId:eventForm.roomId, roomName, capacity:+eventForm.capacity, booked:0 };

    setEvents(list => {
      // repeat weekly
      const copies = eventForm.repeat ? Array.from({length:eventForm.repeatCount}).map((_,i)=>{
        const s = new Date(start); s.setDate(s.getDate()+7*i);
        const e = new Date(end);   e.setDate(e.getDate()+7*i);
        return { ...base, id: base.id + i, start: s.toISOString(), end: e.toISOString() };
      }) : [base];

      // upsert
      let next = eventForm.id
        ? list.map(ev => ev.id===eventForm.id ? base : ev)
        : [...copies, ...list];
      return next.sort((a,b)=> new Date(a.start)-new Date(b.start));
    });
    setOpenEvent(false);
  }
  function editEvent(ev){
    setEventForm({
      id: ev.id, title: ev.title, type: ev.type,
      dateISO: ev.start.slice(0,10),
      slot: { start: ev.start.slice(11,16), end: ev.end.slice(11,16) },
      coachId: ev.coachId, roomId: ev.roomId, capacity: ev.capacity, repeat:false, repeatCount:4
    });
    setOpenEvent(true);
  }
  function removeEvent(id){ setEvents(list => list.filter(e => e.id!==id)); }

  function saveRoom(e){ e.preventDefault();
    setRooms(rs => roomForm.id ? rs.map(r=> r.id===roomForm.id? { ...roomForm, id:r.id, capacity:+roomForm.capacity }: r) : [{ id:"R-"+Date.now(), name: roomForm.name, capacity:+roomForm.capacity }, ...rs]);
    setOpenRoom(false); setRoomForm({ name:"", capacity:20 });
  }
  function editRoom(r){ setRoomForm(r); setOpenRoom(true); }
  function removeRoom(id){ setRooms(rs => rs.filter(r=> r.id!==id)); }

  function saveShift(e){ e.preventDefault();
    const rec = { coachId: shiftForm.coachId, day:+shiftForm.day, start: shiftForm.slot.start, end: shiftForm.slot.end };
    setRoster(list => {
      const idx = list.findIndex(s => s.coachId===rec.coachId && s.day===rec.day);
      if (idx>=0) { const copy = list.slice(); copy[idx]=rec; return copy; }
      return [rec, ...list];
    });
    setOpenShift(false); setShiftForm({ coachId:"", day:0, slot:{start:"10:00", end:"18:00"} });
  }
  function editShift(r){ setShiftForm({ coachId:r.coachId, day:r.day, slot:{start:r.start, end:r.end} }); setOpenShift(true); }
  function removeShift(r){ setRoster(list => list.filter(x => !(x.coachId===r.coachId && x.day===r.day))); }

  function createBooking(e){
    e.preventDefault();
    const ev = events.find(x=> String(x.id)===String(bookForm.eventId));
    if (!ev) return;
    const currentBooked = bookings.filter(b=> b.eventId===ev.id && b.status==="booked").length;
    const status = currentBooked >= ev.capacity ? "waitlist" : "booked";
    const rec = { id: "B-"+Date.now(), member: bookForm.member.trim(), eventId: ev.id, eventTitle: ev.title, status, bookedAt: new Date().toISOString() };
    setBookings(b => [rec, ...b]);
    // update booked counter if booked
    if (status==="booked") setEvents(list => list.map(x => x.id===ev.id? { ...x, booked: (x.booked||0)+1 }: x));
    setOpenBooking(false); setBookForm({ member:"", eventId:"" });
  }
  function cancelBooking(id){
    const rec = bookings.find(b=>b.id===id);
    setBookings(b => b.map(x => x.id===id? { ...x, status:"canceled" } : x));
    if (rec?.status==="booked") setEvents(list => list.map(x => x.id===rec.eventId? { ...x, booked: Math.max(0,(x.booked||0)-1) } : x));
  }
  function markAttended(id){ setBookings(b => b.map(x => x.id===id? { ...x, status:"attended" } : x)); }
  function promoteWaitlist(id){
    const rec = bookings.find(b => b.id===id);
    if (!rec) return;
    const ev = events.find(e => e.id===rec.eventId);
    const currentBooked = bookings.filter(b=> b.eventId===ev.id && b.status==="booked").length;
    if (currentBooked < ev.capacity) {
      setBookings(b => b.map(x => x.id===id? { ...x, status:"booked" } : x));
      setEvents(list => list.map(x => x.id===ev.id? { ...x, booked: (x.booked||0)+1 } : x));
    } else {
      alert("Still full. Try later.");
    }
  }

  /* ===== Render ===== */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarRange}
        title="Scheduling"
        subtitle="Classes, PT sessions, resources, bookings & waitlists."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Plus} onClick={()=>{ setEventForm({ title:"", type:"class", dateISO: todayISO(), slot:{start:"18:00", end:"19:00"}, coachId: coaches[0]?.id||"", roomId: rooms[0]?.id||"", capacity:20, repeat:false, repeatCount:4 }); setOpenEvent(true); }}>
              New Event
            </ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="schedule-tabs"
        tabs={[
          { key:"calendar",  label:"Calendar",  icon: CalendarRange },
          { key:"roster",    label:"Roster",    icon: Users },
          { key:"resources", label:"Rooms/Equipment", icon: Building2 },
          { key:"bookings",  label:"Bookings & Waitlists", icon: Dumbbell },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== Calendar ===== */}
      {tab === "calendar" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Calendar
              date={date}
              setDate={setDate}
              view={view}
              setView={setView}
              events={events}
              onNew={openNewFromCalendar}
              onOpen={openExisting}
            />
            <div className="mt-3 card-glow p-4">
              <div className="font-semibold mb-2">Events list</div>
              <DataTable columns={eventCols} data={events} loading={loading} pagination itemsPerPage={8} />
              {!loading && !events.length && <EmptyState title="No events" subtitle="Create your first class or PT session." />}
            </div>
          </div>
          <div className="space-y-4">
            <MiniMonth date={date} onChange={setDate} />
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold mb-1">Filters</div>
              <Select label="Type" value={status} setValue={setStatus} options={["All","class","pt","event"]} />
              <div className="mt-2 text-xs text-slate-500">Tip: use the table to search by coach/room.</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Roster ===== */}
      {tab === "roster" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-glow p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Coaches Roster</div>
              <ToolbarButton icon={Plus} onClick={()=>setOpenShift(true)}>Add Shift</ToolbarButton>
            </div>
            <DataTable columns={rosterCols} data={roster} loading={loading} pagination itemsPerPage={10} />
            {!loading && !roster.length && <EmptyState title="No shifts" subtitle="Add coach availability to plan sessions." />}
          </div>
          <div className="card-glow p-4">
            <div className="font-semibold mb-2">Coaches</div>
            <ul className="space-y-2">
              {coaches.map(c=>(
                <li key={c.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">{c.name}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* ===== Resources ===== */}
      {tab === "resources" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-glow p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Rooms & Areas</div>
              <ToolbarButton icon={Plus} onClick={()=>setOpenRoom(true)}>Add Room</ToolbarButton>
            </div>
            <DataTable columns={resourceCols} data={rooms} loading={loading} pagination itemsPerPage={8} />
            {!loading && !rooms.length && <EmptyState title="No rooms" subtitle="Create a studio/area to assign events." />}
          </div>
          <div className="card-glow p-4">
            <div className="font-semibold mb-1">Tips</div>
            <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
              <li>Set capacity to control bookings & waitlists.</li>
              <li>Create separate areas for PT vs classes.</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* ===== Bookings & Waitlists ===== */}
      {tab === "bookings" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search member or event…" />
              <Select label="Status" value={status} setValue={setStatus} options={["All","booked","waitlist","attended","canceled"]} />
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <ToolbarButton icon={UserPlus} onClick={()=>setOpenBooking(true)}>Add Booking</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={bookingCols} data={filteredBookings} loading={loading} pagination itemsPerPage={10} />
            {!loading && !filteredBookings.length && <EmptyState title="No bookings" subtitle="Try a different filter or add a new one." />}
          </div>
        </motion.div>
      )}

      {/* ===== Modals ===== */}

      {/* Create/Edit Event */}
      <Modal open={openEvent} onClose={()=>setOpenEvent(false)} title={eventForm.id ? "Edit Event" : "Create Event"}>
        <form onSubmit={saveEvent} className="space-y-3">
          <Field label="Title"><input className="inp" value={eventForm.title} onChange={e=>setEventForm(f=>({ ...f, title:e.target.value }))} required /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Type">
              <select className="inp" value={eventForm.type} onChange={e=>setEventForm(f=>({ ...f, type:e.target.value }))}>
                <option value="class">Class</option><option value="pt">PT</option><option value="event">Event</option>
              </select>
            </Field>
            <Field label="Date"><input type="date" className="inp" value={eventForm.dateISO} onChange={e=>setEventForm(f=>({ ...f, dateISO:e.target.value }))} /></Field>
            <Field label="Time"><TimeSlotPicker value={eventForm.slot} onChange={(v)=>setEventForm(f=>({ ...f, slot:v }))} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Coach">
              <select className="inp" value={eventForm.coachId} onChange={e=>setEventForm(f=>({ ...f, coachId:e.target.value }))}>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Room">
              <select className="inp" value={eventForm.roomId} onChange={e=>setEventForm(f=>({ ...f, roomId:e.target.value }))}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Capacity"><input type="number" min={1} className="inp" value={eventForm.capacity} onChange={e=>setEventForm(f=>({ ...f, capacity:e.target.value }))} /></Field>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch checked={eventForm.repeat} onChange={v=>setEventForm(f=>({ ...f, repeat:v }))} />
              Repeat weekly
            </label>
            {eventForm.repeat && (
              <div className="mt-2">
                <label className="text-sm text-slate-600">Occurrences</label>
                <input type="number" min={1} max={24} className="inp mt-1 w-24" value={eventForm.repeatCount} onChange={e=>setEventForm(f=>({ ...f, repeatCount:+e.target.value }))} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">{eventForm.id? "Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* Add Room */}
      <Modal open={openRoom} onClose={()=>setOpenRoom(false)} title={roomForm.id ? "Edit Room" : "Add Room"}>
        <form onSubmit={saveRoom} className="space-y-3">
          <Field label="Name"><input className="inp" value={roomForm.name} onChange={e=>setRoomForm(r=>({ ...r, name:e.target.value }))} required /></Field>
          <Field label="Capacity"><input type="number" min={1} className="inp" value={roomForm.capacity} onChange={e=>setRoomForm(r=>({ ...r, capacity:e.target.value }))} /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{roomForm.id?"Save":"Add"}</button></div>
        </form>
      </Modal>

      {/* Add/Edit Shift */}
      <Modal open={openShift} onClose={()=>setOpenShift(false)} title="Add Coach Shift">
        <form onSubmit={saveShift} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Coach">
              <select className="inp" value={shiftForm.coachId} onChange={e=>setShiftForm(s=>({ ...s, coachId:e.target.value }))} required>
                <option value="">Select coach…</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Day">
              <select className="inp" value={shiftForm.day} onChange={e=>setShiftForm(s=>({ ...s, day:+e.target.value }))}>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i)=><option key={i} value={i}>{d}</option>)}
              </select>
            </Field>
            <Field label="Time"><TimeSlotPicker value={shiftForm.slot} onChange={(v)=>setShiftForm(s=>({ ...s, slot:v }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">Save</button></div>
        </form>
      </Modal>

      {/* Add Booking */}
      <Modal open={openBooking} onClose={()=>setOpenBooking(false)} title="Add Booking">
        <form onSubmit={createBooking} className="space-y-3">
          <Field label="Member name"><input className="inp" value={bookForm.member} onChange={e=>setBookForm(b=>({ ...b, member:e.target.value }))} required /></Field>
          <Field label="Event">
            <select className="inp" value={bookForm.eventId} onChange={e=>setBookForm(b=>({ ...b, eventId:e.target.value }))} required>
              <option value="">Select event…</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {new Date(ev.start).toLocaleString()} ({(ev.booked||0)}/{ev.capacity})
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center justify-end"><button className="btn-primary">Add</button></div>
        </form>
      </Modal>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50; }
      `}</style>
    </div>
  );
}

/* ===== tiny locals ===== */
function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function iso(s){ // "YYYY-MM-DD HH:MM" local -> ISO
  const [d,t] = s.split(" "); const [Y,M,D]=d.split("-").map(Number); const [h,m]=t.split(":").map(Number);
  const x = new Date(Y, M-1, D, h, m); return x.toISOString();
}
function addDay(dateStr){ const d = new Date(dateStr); d.setDate(d.getDate()+1); return d.toISOString(); }
