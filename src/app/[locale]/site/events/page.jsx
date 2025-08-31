 'use client';
import { useMemo, useEffect, useState } from 'react';
import { Container, Section, Button, Card, Input, Select, Badge, Textarea } from '@/components/site/UI';
import { Link } from '@/i18n/navigation';



export const EVENTS = [
  {
    id: 'e1',
    slug: 'summer-throwdown-2025',
    title: 'Summer Throwdown 2025',
    type: 'Challenge', // Event | Challenge
    cover: '/images/events/summer-throwdown.jpg',
    dateStart: '2025-09-15',
    dateEnd: '2025-10-15',
    time: 'All month',
    city: 'Cairo',
    location: 'Amazing Gym — Studio A',
    coach: 'Ahmed',
    capacity: 200,
    spotsLeft: 42,
    priceEGP: 0,
    tags: ['PRs', 'Leaderboards', 'Community'],
    excerpt: 'A month‑long gym‑wide challenge: accumulate points from workouts, PRs, and class check‑ins.',
    details: `Compete solo or with a buddy. Weekly mini‑events, bonus tasks, and prizes for top 10%.`,
    rules: [
      '1 point per class check‑in (capped at 30 for the month).',
      'Bonus +3 for a verified PR (film or coach sign‑off).',
      'Weekly mini‑events posted every Sunday.',
    ],
    metrics: ['Total points', 'PRs achieved', 'Classes attended'],
  },
  {
    id: 'e2',
    slug: 'mobility-masterclass-oct-5',
    title: 'Mobility Masterclass',
    type: 'Event',
    cover: '/images/events/mobility.jpg',
    dateStart: '2025-10-05',
    dateEnd: '2025-10-05',
    time: '18:00 – 20:00',
    city: 'Cairo',
    location: 'Amazing Gym — Studio B',
    coach: 'Sara',
    capacity: 24,
    spotsLeft: 7,
    priceEGP: 250,
    tags: ['Workshop', 'Mobility', 'Recovery'],
    excerpt: 'Two‑hour hands‑on session to bulletproof your hips & shoulders.',
    details: `Bring a mat. We’ll cover assessment, drills, and a take‑home routine.`,
    schedule: [
      { label: 'Check‑in', time: '17:45' },
      { label: 'Session', time: '18:00 – 19:40' },
      { label: 'Q&A', time: '19:40 – 20:00' },
    ],
  },
  {
    id: 'e3',
    slug: '5k-fun-run-sep-20',
    title: '5K Community Fun Run',
    type: 'Event',
    cover: '/images/events/funrun.jpg',
    dateStart: '2025-09-20',
    dateEnd: '2025-09-20',
    time: '07:30 – 09:00',
    city: 'Cairo',
    location: 'Zamalek Riverside',
    coach: 'Omar',
    capacity: 60,
    spotsLeft: 0,
    priceEGP: 0,
    tags: ['Outdoor', 'Community'],
    excerpt: 'All paces welcome — jog, run, or walk. Coffee after!',
    details: `Family‑friendly. Strollers welcome. Dogs on leash.`,
  },
];

export function getEvent(slug){
  return EVENTS.find(e => e.slug === slug);
}

export function getUpcoming(now = new Date()){
  return EVENTS.filter(e => new Date(e.dateEnd) >= now)
    .sort((a,b)=> new Date(a.dateStart) - new Date(b.dateStart));
}

export function getPast(now = new Date()){
  return EVENTS.filter(e => new Date(e.dateEnd) < now)
    .sort((a,b)=> new Date(b.dateStart) - new Date(a.dateStart));
}

export function toICS(e){
  // builds a simple single VEVENT (floating local times)
  const fmt = (d) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
  const [sH,sM] = (e.time?.split('–')[0] || '09:00').trim().split(':').map(Number);
  const [eH,eM] = (e.time?.split('–')[1] || '10:00').trim().split(':').map(Number);
  const s = new Date(e.dateStart + 'T00:00:00'); s.setHours(sH||9, sM||0, 0, 0);
  const ed = new Date(e.dateEnd + 'T00:00:00'); ed.setHours(eH||10, eM||0, 0, 0);
  const body = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AmazingGym//Events//EN','BEGIN:VEVENT',
    `UID:${e.id}@amazinggym`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(s)}`,`DTEND:${fmt(ed)}`,
    `SUMMARY:${e.title} (${e.type})`,`LOCATION:${e.location}`,
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  return new Blob([body], { type:'text/calendar;charset=utf-8' });
}

 

export  function Countdown({ to }){
  const [left, setLeft] = useState(calcLeft(to));
  useEffect(()=>{
    const id = setInterval(()=> setLeft(calcLeft(to)), 1000);
    return ()=> clearInterval(id);
  }, [to]);
  if (left.ms <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 px-2 py-0.5 text-[11px]">
      Starts in {left.d}d {left.h}h {left.m}m
    </span>
  );
}
function calcLeft(to){
  const ms = new Date(to).getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms/86400000));
  const h = Math.max(0, Math.floor((ms%86400000)/3600000));
  const m = Math.max(0, Math.floor((ms%3600000)/60000));
  return { ms, d, h, m };
}
 
export function EventCard({ e, onRegister, onICS }){
  const upcoming = new Date(e.dateEnd) >= new Date();
  const full = e.spotsLeft === 0;
  return (
    <Card className="overflow-hidden">
      <Link href={`/site/events/${e.slug}`} className="block">
        <div className="aspect-[16/9] w-full bg-slate-200" style={{ backgroundImage: `url(${e.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">{fmtDateRange(e)}</div>
          <Badge>{e.type}</Badge>
        </div>
        <Link href={`/site/events/${e.slug}`} className="mt-1 block font-semibold text-lg hover:underline">{e.title}</Link>
        <p className="mt-1 text-sm text-slate-600">{e.excerpt}</p>
        <div className="mt-2 text-xs text-slate-500">{e.city} • {e.location} • Coach {e.coach}</div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-600">Capacity {e.capacity} · {full? <span className="text-rose-600">Full</span> : <span>{e.spotsLeft} left</span>}</div>
          {upcoming && <Countdown to={e.dateStart + 'T09:00:00'} />}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={()=> onRegister?.(e)} disabled={!upcoming || full}>{full? 'Join waitlist' : 'Register'}</Button>
          <Button variant='ghost' onClick={()=> onICS?.(e)}>Add to calendar</Button>
        </div>
      </div>
    </Card>
  );
}

function fmtDateRange(e){
  const s = new Date(e.dateStart);
  const ed = new Date(e.dateEnd);
  const same = s.toDateString() === ed.toDateString();
  const fmt = (d)=> d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
  return same ? `${fmt(s)} • ${e.time}` : `${fmt(s)} → ${fmt(ed)}`;
}

 

export  function EventRegisterModal({ open, onClose, event }){
  const [form, setForm] = useState({ name:'', email:'', phone:'', note:'' });
  if (!open) return null;
  function submit(e){
    e.preventDefault();
    // TODO: POST /api/events/register
    console.log('Event registration', { eventId: event?.id, ...form });
    onClose?.();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-lg font-semibold">Register for {event?.title || 'event'}</div>
        <div className="text-xs text-slate-500 mt-0.5">{event ? `${event.city} • ${event.location} • ${event.time}` : ''}</div>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <Input placeholder="Full name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input type="email" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} required />
            <Input type="tel" placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} required />
          </div>
          <Textarea rows={3} placeholder="Notes (injuries, goals, T‑shirt size…)" value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} />
          <div className="flex items-center justify-end gap-2">
            <Button variant='ghost' type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

 
export default function EventsIndex(){
  const [tab, setTab] = useState('upcoming'); // upcoming | past
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');
  const [city, setCity] = useState('All');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const cities = useMemo(()=> ['All', ...Array.from(new Set(EVENTS.map(e=> e.city)))], []);

  const source = tab==='upcoming' ? getUpcoming() : getPast();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return source.filter(e =>
      (type==='All' || e.type===type) &&
      (city==='All' || e.city===city) &&
      (!s || [e.title, e.excerpt, e.coach, e.city, e.location, ...(e.tags||[])].join(' ').toLowerCase().includes(s))
    );
  }, [q, type, city, source]);

  function doRegister(e){ setSelected(e); setOpen(true); }
  function doICS(e){ const file = toICS(e); const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = `${e.title}.ics`; a.click(); URL.revokeObjectURL(url); }

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <Badge>Community</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">Events & Challenges</h1>
          <p className="mt-2 text-slate-600">Workshops, runs, competitions, and gym‑wide challenges. Join the fun!</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <TabBtn active={tab==='upcoming'} onClick={()=> setTab('upcoming')}>Upcoming</TabBtn>
          <TabBtn active={tab==='past'} onClick={()=> setTab('past')}>Past</TabBtn>
        </div>

        {/* Filters */}
        <Card className="mt-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Input placeholder="Search title, coach, tag…" value={q} onChange={e=>setQ(e.target.value)} />
            <Select value={type} onChange={e=>setType(e.target.value)}>
              {['All','Event','Challenge'].map(t=> <option key={t}>{t}</option>)}
            </Select>
            <Select value={city} onChange={e=>setCity(e.target.value)}>
              {cities.map(c=> <option key={c}>{c}</option>)}
            </Select>
            <Button variant='ghost' onClick={()=>{ setQ(''); setType('All'); setCity('All'); }}>Reset</Button>
          </div>
        </Card>

        {/* Grid */}
        {filtered.length ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(e => (
              <EventCard key={e.id} e={e} onRegister={doRegister} onICS={doICS} />
            ))}
          </div>
        ) : (
          <Card className="mt-6 p-8 text-center">
            <div className="text-slate-700 font-medium">No {tab} items match your filters.</div>
            <div className="text-slate-500 text-sm">Try a different keyword or city.</div>
          </Card>
        )}

        <EventRegisterModal open={open} onClose={()=> setOpen(false)} event={selected} />
      </Container>
    </Section>
  );
}

function TabBtn({ active, children, ...props }){
  return (
    <button className={`px-3 py-1.5 rounded-lg text-sm border transition ${active? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`} {...props}>
      {children}
    </button>
  );
}

