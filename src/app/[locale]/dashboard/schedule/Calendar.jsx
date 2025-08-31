"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { spring } from "@/components/dashboard/ui/UI";

function startOfWeek(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtHM(iso){ const dt=new Date(iso); return dt.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}); }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function between(day, startISO, endISO){ const d0=new Date(day); d0.setHours(0,0,0,0); const s=new Date(startISO), e=new Date(endISO); return +d0>=+new Date(s.getFullYear(),s.getMonth(),s.getDate()) && +d0<=+new Date(e.getFullYear(),e.getMonth(),e.getDate()); }

export default function Calendar({ date, setDate, view, setView, events = [], onNew, onOpen }) {
  const today = new Date();
  const weekDays = useMemo(()=>Array.from({length:7}).map((_,i)=>addDays(startOfWeek(date), i)), [date]);
  const monthCells = useMemo(()=>{
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({length:42}).map((_,i)=>addDays(start,i));
  }, [date]);

  return (
    <div className="card-glow p-4">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded-lg border border-slate-200" onClick={()=>setDate(prev=> new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()- (view==='month'?28:7)))}>‹‹</button>
          <button className="px-2 py-1 rounded-lg border border-slate-200" onClick={()=>setDate(prev=> new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()- (view==='month'?7:1)))}>‹</button>
          <button className="px-3 py-1 rounded-lg border border-slate-200" onClick={()=>setDate(new Date())}>Today</button>
          <button className="px-2 py-1 rounded-lg border border-slate-200" onClick={()=>setDate(prev=> new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()+ (view==='month'?7:1)))}>›</button>
          <button className="px-2 py-1 rounded-lg border border-slate-200" onClick={()=>setDate(prev=> new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()+ (view==='month'?28:7)))}>››</button>
        </div>
        <div className="font-semibold">{date.toLocaleDateString(undefined, { month:"long", year:"numeric" })}</div>
        <div className="flex items-center gap-1">
          {["month","week","day"].map(v=>(
            <button key={v} onClick={()=>setView(v)}
              className={`px-3 py-1 rounded-xl border ${view===v? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'border-slate-200 bg-white'}`}>
              {v[0].toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* views */}
      {view === "month" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-3">
          <div className="grid grid-cols-7 text-xs text-slate-500">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=> <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d,i)=>{
              const dayEvents = events.filter(e => between(d, e.start, e.end));
              const dim = d.getMonth()!==date.getMonth();
              return (
                <div key={i} className={`rounded-xl border p-2 min-h-[98px] ${dim?'border-slate-100 bg-slate-50':'border-slate-200 bg-white'}`}>
                  <div className={`text-xs mb-1 ${sameDay(d,today)?'font-semibold text-indigo-600':''}`}>{d.getDate()}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0,3).map(e=>(
                      <button key={e.id} onClick={()=>onOpen?.(e)}
                        className="w-full text-left text-xs px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100">
                        <span className="font-medium">{e.title}</span> · {new Date(e.start).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      </button>
                    ))}
                    {dayEvents.length>3 && <div className="text-[11px] text-slate-500">+{dayEvents.length-3} more</div>}
                  </div>
                  <button onClick={()=>onNew?.({ date: d })} className="mt-2 text-[11px] text-slate-500 hover:text-indigo-600">+ Add</button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {view === "week" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-3">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d,idx)=>{
              const dayEvents = events
                .filter(e => between(d, e.start, e.end))
                .sort((a,b)=> new Date(a.start) - new Date(b.start));
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-2">
                  <div className={`text-sm mb-1 ${sameDay(d,today)?'font-semibold text-indigo-600':''}`}>
                    {d.toLocaleDateString(undefined, { weekday:"short", day:"numeric" })}
                  </div>
                  {dayEvents.length ? dayEvents.map(e=>(
                    <button key={e.id} onClick={()=>onOpen?.(e)}
                      className="w-full text-left px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 mb-1">
                      <div className="text-xs font-medium">{e.title}</div>
                      <div className="text-[11px] text-slate-500">{fmtHM(e.start)}–{fmtHM(e.end)} · {e.roomName || e.roomId}</div>
                    </button>
                  )) : <div className="text-xs text-slate-500">No events</div>}
                  <button onClick={()=>onNew?.({ date: d })} className="mt-2 text-[11px] text-slate-500 hover:text-indigo-600">+ Add</button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {view === "day" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-3">
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="text-sm mb-2 font-semibold">{date.toLocaleDateString(undefined, { weekday:"long", day:"numeric", month:"long"})}</div>
            {events.filter(e => sameDay(new Date(e.start), date)).sort((a,b)=>new Date(a.start)-new Date(b.start)).map(e=>(
              <button key={e.id} onClick={()=>onOpen?.(e)} className="w-full text-left px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 mb-2">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-slate-500">{fmtHM(e.start)}–{fmtHM(e.end)} · {e.type} · {e.roomName || e.roomId}</div>
                <div className="text-xs">{(e.booked||0)}/{e.capacity} booked</div>
              </button>
            ))}
            <button onClick={()=>onNew?.({ date })} className="text-[11px] text-slate-500 hover:text-indigo-600">+ Add event</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
