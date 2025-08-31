'use client';

// app/site/contact/page.jsx
// Public Website — Contact & Locations (map, hours, phone/WhatsApp)
// Single-file page with all helper components defined below.

import { useMemo, useState } from 'react';
import { Container, Section, Button, Card, Input, Textarea, Badge } from '@/components/site/UI';
import { Phone, Mail, MapPin, Clock, MessageCircle, Navigation, CheckCircle2 } from 'lucide-react';

/* ======================= Demo data (replace with CMS/API) ======================= */
const LOCATIONS = [
  {
    id: 'heliopolis',
    name: 'Heliopolis Club',
    address: ['12 Abbas El Akkad St', 'Heliopolis, Cairo'],
    city: 'Cairo',
    phone: '+20 100 123 4567',
    whatsapp: '+201001234567',
    email: 'hello@amazinggym.com',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3451.709!2d31.340!3d30.087!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2zMzDCsDA1JzEyLjAiTiAzMcKwMjAnMjQuMCJF!5e0!3m2!1sen!2seg!4v1680000000000',
    mapsLink: 'https://maps.google.com/?q=Amazing+Gym+Heliopolis',
    hours: {
      Mon: ['07:00', '22:00'],
      Tue: ['07:00', '22:00'],
      Wed: ['07:00', '22:00'],
      Thu: ['07:00', '22:00'],
      Fri: ['09:00', '20:00'],
      Sat: ['08:00', '21:00'],
      Sun: ['08:00', '21:00'],
    },
  },
  {
    id: 'zamalek',
    name: 'Zamalek Riverside Studio',
    address: ['5 Nile Corniche', 'Zamalek, Cairo'],
    city: 'Cairo',
    phone: '+20 100 765 4321',
    whatsapp: '+201007654321',
    email: 'zamalek@amazinggym.com',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3451.709!2d31.224!3d30.061!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2zMzDCsDAzJzQxLjYiTiAzMcKwMTMnMjYuNCJF!5e0!3m2!1sen!2seg!4v1680000000001',
    mapsLink: 'https://maps.google.com/?q=Amazing+Gym+Zamalek',
    hours: {
      Mon: ['06:30', '22:30'],
      Tue: ['06:30', '22:30'],
      Wed: ['06:30', '22:30'],
      Thu: ['06:30', '22:30'],
      Fri: ['08:00', '20:00'],
      Sat: ['08:00', '21:00'],
      Sun: ['08:00', '21:00'],
    },
  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Date.getDay() order

export default function ContactLocationsPage() {
  const [activeId, setActiveId] = useState(LOCATIONS[0].id);
  const active = useMemo(() => LOCATIONS.find(l => l.id === activeId), [activeId]);

  const status = useMemo(() => getOpenStatus(active.hours), [active]);

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className='text-center max-w-2xl mx-auto'>
          <Badge>We're here to help</Badge>
          <h1 className='mt-3 text-3xl sm:text-4xl font-extrabold'>Contact & Locations</h1>
          <p className='mt-2 text-slate-600'>Call, WhatsApp, or drop by. Choose a branch to see the map and hours.</p>
        </div>

        {/* Location switcher */}
        <Card className='mt-6 p-4'>
          <div className='flex flex-wrap items-center gap-2'>
            {LOCATIONS.map(l => (
              <button key={l.id} onClick={() => setActiveId(l.id)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${l.id === activeId ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                {l.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Layout: left info + right map */}
        <div className='mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* Info */}
          <div className='lg:col-span-5 space-y-4'>
            <Card className='p-5'>
              <div className='font-semibold text-lg flex items-center gap-2'>
                <MapPin className='w-5 h-5' /> {active.name}
              </div>
              <div className='mt-1 text-slate-600 text-sm'>
                <div>{active.address[0]}</div>
                <div>{active.address[1]}</div>
              </div>
              <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <ActionButton href={`tel:${onlyDigits(active.phone)}`} icon={Phone} label='Call' detail={active.phone} />
                <ActionButton href={`https://wa.me/${digitsForWa(active.whatsapp)}`} icon={MessageCircle} label='WhatsApp' detail='Chat now' />
                <ActionButton href={`mailto:${active.email}`} icon={Mail} label='Email' detail={active.email} />
                <ActionButton href={active.mapsLink} icon={Navigation} label='Directions' detail={active.city} />
              </div>
            </Card>

            <Card className='p-5'>
              <div className='flex items-center justify-between'>
                <div className='font-semibold text-lg flex items-center gap-2'>
                  <Clock className='w-5 h-5' /> Opening hours
                </div>
                <StatusPill status={status} />
              </div>
              <HoursTable hours={active.hours} />
            </Card>

            <Card className='p-5'>
              <div className='font-semibold text-lg'>Send us a message</div>
              <p className='text-sm text-slate-600 mt-0.5'>We usually reply within the same business day.</p>
              <ContactForm toEmail={active.email} defaultBranch={active.name} />
            </Card>
          </div>

          {/* Map */}
          <div className='lg:col-span-7'>
            <Card className='p-0 overflow-hidden'>
              <div className='aspect-[16/9] w-full bg-slate-200'>
                <iframe title={`Map of ${active.name}`} src={active.mapEmbed} loading='lazy' className='w-full h-full border-0' allowFullScreen referrerPolicy='no-referrer-when-downgrade' />
              </div>
            </Card>
          </div>
        </div>

        {/* CTA band */}
        <Card className='mt-8 p-5 flex flex-col sm:flex-row items-center justify-between'>
          <div>
            <div className='font-semibold'>Ready to visit?</div>
            <div className='text-slate-600 text-sm'>Book a free trial class and we’ll take it from there.</div>
          </div>
          <div className='flex gap-2 mt-3 sm:mt-0'>
            <Button as='a' href='/site/schedule#trial'>
              Book a trial
            </Button>
            <Button as='a' href={active.mapsLink} variant='ghost'>
              Open in Maps
            </Button>
          </div>
        </Card>
      </Container>
    </Section>
  );
}

/* ======================= Helpers & small components ======================= */
function onlyDigits(s = '') {
  return s.replace(/[^+\d]/g, '');
}
function digitsForWa(s = '') {
  return s.replace(/[^\d]/g, '');
}

function StatusPill({ status }) {
  if (!status) return null;
  const { open, until, nextOpen } = status;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${open ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-rose-100'}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 ${open ? 'text-emerald-600' : 'text-rose-600'}`} />
      {open ? `Open now • until ${until}` : `Closed • opens ${nextOpen}`}
    </span>
  );
}

function HoursTable({ hours }) {
  const todayIdx = new Date().getDay(); // 0=Sun
  return (
    <div className='mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden'>
      {DAYS.map((d, i) => {
        const row = hours[d];
        const isToday = i === todayIdx;
        return (
          <div key={d} className={`flex items-center justify-between px-4 py-2 text-sm ${isToday ? 'bg-slate-50' : ''}`}>
            <div className='font-medium text-slate-800'>{d}</div>
            <div className='text-slate-700'>{row ? `${row[0]} – ${row[1]}` : 'Closed'}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActionButton({ href, icon: Icon, label, detail }) {
  return (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} className='group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
      <Icon className='w-4 h-4 text-indigo-600' />
      <span className='font-medium'>{label}</span>
      {detail && <span className='text-slate-500'>• {detail}</span>}
    </a>
  );
}

function ContactForm({ toEmail = 'hello@amazinggym.com', defaultBranch }) {
  const [data, setData] = useState({ name: '', email: '', phone: '', branch: defaultBranch || '', message: '' });
  const [sent, setSent] = useState(false);
  function onSubmit(e) {
    e.preventDefault();
    // TODO: POST to your backend / CRM
    console.log('Contact form:', data);
    setSent(true);
  }
  if (sent) return <div className='mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700'>Thanks! We received your message and will get back to you shortly.</div>;
  return (
    <form onSubmit={onSubmit} className='mt-3 space-y-3'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Input placeholder='Full name' required value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} />
        <Input type='email' placeholder='Email' required value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Input type='tel' placeholder='Phone / WhatsApp' value={data.phone} onChange={e => setData(d => ({ ...d, phone: e.target.value }))} />
        <Input placeholder='Preferred branch' value={data.branch} onChange={e => setData(d => ({ ...d, branch: e.target.value }))} />
      </div>
      <Textarea rows={4} placeholder='How can we help?' value={data.message} onChange={e => setData(d => ({ ...d, message: e.target.value }))} />
      <div className='flex items-center justify-end gap-2'>
        <Button as='a' href={`mailto:${toEmail}`} variant='ghost'>
          Email us
        </Button>
        <Button type='submit'>Send message</Button>
      </div>
    </form>
  );
}

function getOpenStatus(hours) {
  try {
    const now = new Date();
    const day = DAYS[now.getDay()];
    const today = hours?.[day];
    const timeToM = t => {
      const [H, M] = (t || '00:00').split(':').map(Number);
      return H * 60 + M;
    };
    const m = now.getHours() * 60 + now.getMinutes();
    if (!today) {
      // find next open day
      for (let i = 1; i <= 7; i++) {
        const d = DAYS[(now.getDay() + i) % 7];
        const slot = hours?.[d];
        if (slot) return { open: false, nextOpen: `${d} ${slot[0]}` };
      }
      return { open: false };
    }
    const [o, c] = today.map(timeToM);
    if (m >= o && m < c) {
      return { open: true, until: minutesToHHMM(c) };
    }
    return { open: false, nextOpen: `${day} ${today[0]}` };
  } catch (e) {
    return null;
  }
}

function minutesToHHMM(x) {
  const H = Math.floor(x / 60)
    .toString()
    .padStart(2, '0');
  const M = (x % 60).toString().padStart(2, '0');
  return `${H}:${M}`;
}
