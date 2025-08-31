"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { spring, Badge } from "@/components/dashboard/ui/UI";

const STAGES = [
  { key: "new",        label: "New" },
  { key: "qualified",  label: "Qualified" },
  { key: "trial",      label: "Trial" },
  { key: "member",     label: "Member" },
];

export default function Kanban({ leads = [], onMove }) {
  const grouped = useMemo(() => {
    const g = { new:[], qualified:[], trial:[], member:[] };
    leads.forEach(l => g[l.stage||"new"].push(l));
    return g;
  }, [leads]);

  const handleDrop = (e, stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    onMove?.(id, stage);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STAGES.map(col => (
        <motion.div key={col.key} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}
          className="rounded-2xl border border-slate-200 bg-white p-3 min-h-[280px]"
          onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>handleDrop(e, col.key)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">{col.label}</div>
            <Badge color={col.key==="member"?"emerald":col.key==="trial"?"blue":col.key==="qualified"?"indigo":"slate"}>
              {grouped[col.key].length}
            </Badge>
          </div>
          <div className="space-y-2">
            {grouped[col.key].map(card => (
              <div key={card.id}
                draggable
                onDragStart={(e)=>e.dataTransfer.setData("text/plain", String(card.id))}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow transition"
              >
                <div className="font-medium truncate">{card.name}</div>
                <div className="text-xs text-slate-500 truncate">{card.email || card.phone || "—"}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(card.tags||[]).slice(0,4).map(t=> <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">#{t}</span>)}
                  {card.score ? <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Score {card.score}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
