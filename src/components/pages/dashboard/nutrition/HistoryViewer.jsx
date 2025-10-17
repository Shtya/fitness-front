'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, StarHalf, CheckSquare, Square, Filter, Clock, Inbox } from 'lucide-react';

/* ---------- small helpers ---------- */
const pad = n => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = d =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const fmtTime = d => {
  const dd = new Date(d);
  let h = dd.getHours();
  const m = pad(dd.getMinutes());
  const am = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${am}`;
};
const clamp01 = n => Math.max(0, Math.min(1, n));

function Stars({ value = 0, size = 14 }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="inline-flex items-center gap-[2px]">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={size} className="fill-amber-400 stroke-amber-400" />
      ))}
      {hasHalf && <StarHalf size={size} className="fill-amber-400 stroke-amber-400" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={size} className="stroke-slate-300" />
      ))}
    </div>
  );
}

function TinyBar({ value = 0 }) {
  return (
    <div className="h-1.5 w-24 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(clamp01(value) * 100)}%` }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="h-full bg-emerald-500"
      />
    </div>
  );
}

/* pretty checkbox used in filters */
function PrettyCheck({ checked, onChange, label }) {
  const Icon = checked ? CheckSquare : Square;
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-all',
        checked
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      ].join(' ')}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ---------- main component ---------- */
export default function HistoryViewer({ history = [] }) {
  // figure out available days & meals from the data
  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const availableDays = useMemo(() => {
    const set = new Set();
    (history || []).forEach(h => {
      const d = (h.dayName || h.day || '').toString();
      if (d) set.add(d[0].toUpperCase() + d.slice(1));
    });
    return dayOrder.filter(d => set.has(d)); // keep natural order
  }, [history]);

  const availableMeals = useMemo(() => {
    const map = new Map();
    (history || []).forEach(h => {
      const idx = Number(h.mealIndex ?? -1);
      if (idx >= 0) {
        const title = h.mealTitle || `Meal ${idx + 1}`;
        if (!map.has(idx)) map.set(idx, title);
      }
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]); // [ [index, title], ... ]
  }, [history]);

  // checked filters
  const [checkedDays, setCheckedDays] = useState({});
  const [checkedMeals, setCheckedMeals] = useState({});

  // initialize to all-checked when data changes
  useEffect(() => {
    setCheckedDays(prev => {
      const next = { ...prev };
      availableDays.forEach(d => (next[d] = true));
      return next;
    });
  }, [availableDays]);
  useEffect(() => {
    setCheckedMeals(prev => {
      const next = { ...prev };
      availableMeals.forEach(([i]) => (next[i] = true));
      return next;
    });
  }, [availableMeals]);

  // filtered rows
  const rows = useMemo(() => {
    const byDateDesc = [...(history || [])].sort(
      (a, b) => new Date(b.eatenAt || b.createdAt) - new Date(a.eatenAt || a.createdAt)
    );
    return byDateDesc.filter(h => {
      const dayName = (h.dayName || h.day || '').toString();
      const normDay = dayName ? dayName[0].toUpperCase() + dayName.slice(1) : '';
      const dayOk = checkedDays[normDay];
      const mealOk = checkedMeals[Number(h.mealIndex ?? -999)];
      return (dayOk ?? true) && (mealOk ?? true);
    });
  }, [history, checkedDays, checkedMeals]);

  // quick helpers
  const toggleAllDays = val => {
    const next = {};
    availableDays.forEach(d => (next[d] = val));
    setCheckedDays(next);
  };
  const toggleAllMeals = val => {
    const next = {};
    availableMeals.forEach(([i]) => (next[i] = val));
    setCheckedMeals(next);
  };

  return (
    <div className="space-y-4">
      {/* filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 text-slate-700 mb-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-semibold">Filters</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {/* days */}
          <div className="rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-medium text-slate-600">Days</div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleAllDays(true)}
                  className="text-[12px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllDays(false)}
                  className="text-[12px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableDays.map(d => (
                <PrettyCheck
                  key={d}
                  checked={!!checkedDays[d]}
                  onChange={v => setCheckedDays(s => ({ ...s, [d]: v }))}
                  label={d}
                />
              ))}
            </div>
          </div>

          {/* meals */}
          <div className="rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-medium text-slate-600">Meals</div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleAllMeals(true)}
                  className="text-[12px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllMeals(false)}
                  className="text-[12px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableMeals.map(([idx, title]) => (
                <PrettyCheck
                  key={idx}
                  checked={!!checkedMeals[idx]}
                  onChange={v => setCheckedMeals(s => ({ ...s, [idx]: v }))}
                  label={title}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      {!rows.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
            <Inbox className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-2 text-sm font-medium text-slate-800">No logs match your filters</div>
          <div className="mt-1 text-[12px] text-slate-500">
            Adjust day/meal filters above to display entries.
          </div>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="*:*:px-3 *:*:py-2 border-b border-slate-200 text-slate-600">
                <th className="text-left">Date</th>
                <th className="text-left">Day</th>
                <th className="text-left">Meal</th>
                <th className="text-left">Time</th>
                <th className="text-left">Adherence</th>
                <th className="text-left">Items</th>
                <th className="text-left">Extras</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map(log => {
                  const when = log.eatenAt || log.createdAt;
                  const items = Array.isArray(log.items) ? log.items : [];
                  const itemsTaken = items.filter(i => i.taken).length;
                  const itemsPct = items.length ? itemsTaken / items.length : 0;
                  const extrasCount = Array.isArray(log.extraFoods) ? log.extraFoods.length : 0;

                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className="*:*:px-3 *:*:py-2 border-b last:border-b-0 border-slate-200 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap text-slate-900">{fmtDate(when)}</td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-[2px] text-[12px] text-slate-700">
                          {log.dayName || (log.day ? log.day[0].toUpperCase() + log.day.slice(1) : '')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-slate-900 font-medium">
                        {log.mealTitle || `Meal ${Number(log.mealIndex) + 1 || ''}`}
                      </td>
                      <td className="whitespace-nowrap text-[12px] text-slate-600 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {fmtTime(when)}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Stars value={Number(log.adherence || 0)} size={12} />
                          <span className="text-[12px] text-slate-600">{Number(log.adherence || 0)}/5</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <TinyBar value={itemsPct} />
                          <span className="text-[12px] text-slate-600">
                            {itemsTaken}/{items.length}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[12px] text-slate-700">
                        {extrasCount ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-[2px]">
                            {extrasCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
