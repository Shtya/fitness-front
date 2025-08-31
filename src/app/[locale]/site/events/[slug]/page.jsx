
"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Container, Section, Button, Card, Badge } from '@/components/site/UI';
import { EventRegisterModal, getEvent, toICS } from '../page'; 
import { Countdown } from '../page'; 
 export default function EventDetail({ params }){
  const e = getEvent(params.slug);
  const [open, setOpen] = useState(false);
  if (!e) return (
    <Section>
      <Container>
        <Card className="p-8 text-center">
          <div className="font-semibold text-slate-800">Event not found</div>
          <div className="text-slate-600 text-sm">It may have been moved or unpublished.</div>
          <Button as={Link} href="/events" className="mt-3">Back to events</Button>
        </Card>
      </Container>
    </Section>
  );

  const full = e.spotsLeft === 0;
  const upcoming = new Date(e.dateEnd) >= new Date();

  function doICS(){ const file = toICS(e); const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = `${e.title}.ics`; a.click(); URL.revokeObjectURL(url); }

  return (
    <Section>
      <Container>
        {/* Hero */}
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <div className="relative">
            <div className="aspect-[16/7] w-full bg-slate-200" style={{ backgroundImage: `url(${e.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{e.type}</Badge>
                {upcoming && <Countdown to={e.dateStart + 'T09:00:00'} />}
              </div>
              <h1 className="mt-2 text-3xl font-extrabold">{e.title}</h1>
              <div className="text-sm opacity-90">{e.city} • {e.location} • Coach {e.coach}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <article className="lg:col-span-8">
            <Card className="p-5">
              <div className="text-slate-600 whitespace-pre-line">{e.details}</div>
              {e.rules?.length ? (
                <div className="mt-4">
                  <div className="font-semibold">Rules & Scoring</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {e.rules.map((r,i)=> <li key={i}>{r}</li>)}
                  </ul>
                </div>
              ) : null}
              {e.schedule?.length ? (
                <div className="mt-4">
                  <div className="font-semibold">Schedule</div>
                  <ul className="mt-2 text-sm text-slate-700 space-y-1">
                    {e.schedule.map((s,i)=> <li key={i} className="flex items-center justify-between"><span>{s.label}</span><span className="text-slate-500">{s.time}</span></li>)}
                  </ul>
                </div>
              ) : null}
            </Card>

            {/* Gallery placeholder */}
            <Card className="p-5 mt-4">
              <div className="font-semibold">Gallery</div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({length:6}).map((_,i)=> <div key={i} className="aspect-[4/3] rounded-xl bg-slate-200" />)}
              </div>
            </Card>
          </article>

          <aside className="lg:col-span-4">
            <Card className="p-5">
              <div className="text-xs text-slate-500">When</div>
              <div className="font-medium">{fmtWhen(e)}</div>
              <div className="mt-2 text-xs text-slate-500">Where</div>
              <div className="font-medium">{e.location}</div>
              <div className="text-xs text-slate-600">{e.city}</div>
              <div className="mt-2 text-xs text-slate-500">Coach</div>
              <div className="font-medium">{e.coach}</div>
              <div className="mt-2 text-xs text-slate-500">Capacity</div>
              <div className="font-medium">{e.capacity} • {full? 'Full' : `${e.spotsLeft} left`}</div>
              {typeof e.priceEGP === 'number' && (
                <div className="mt-2 text-xs text-slate-500">Price</div>
              )}
              {typeof e.priceEGP === 'number' && (
                <div className="font-medium">{e.priceEGP === 0 ? 'Free' : `${e.priceEGP} EGP`}</div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={()=> setOpen(true)} disabled={!upcoming || full}>{full? 'Join waitlist' : 'Register'}</Button>
                <Button variant='ghost' onClick={doICS}>Add to calendar</Button>
              </div>
            </Card>

            {/* Map placeholder */}
            <Card className="p-5 mt-4">
              <div className="font-semibold">Map</div>
              <div className="mt-2 aspect-[16/9] w-full rounded-xl bg-slate-200" />
            </Card>
          </aside>
        </div>

        <EventRegisterModal open={open} onClose={()=> setOpen(false)} event={e} />
      </Container>
    </Section>
  );
}

function fmtWhen(e){
  const s = new Date(e.dateStart);
  const ed = new Date(e.dateEnd);
  const same = s.toDateString() === ed.toDateString();
  const fmt = (d)=> d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  return same ? `${fmt(s)} • ${e.time}` : `${fmt(s)} → ${fmt(ed)}`;
}
