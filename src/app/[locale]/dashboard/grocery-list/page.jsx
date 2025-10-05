'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Search,
  Filter,
  CheckSquare,
  Square,
  Download,
  Printer,
  Trash2,
  RefreshCw,
  ChevronDown,
  Plus,
  Minus,
  Info,
} from 'lucide-react';

/* =================== STORAGE KEYS =================== */
const LS_PLAN     = 'mw.nutri.plan.v1';     // weekly meal plan (if not present, we seed defaults)
const LS_GROCERY  = 'mw.nutri.groceries.v1';// checkmarks and UI state
const spring = { type: 'spring', stiffness: 220, damping: 26 };

/* =================== HELPERS =================== */
function loadLS(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function saveLS(key, val)     { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
const round = (n, d=0) => { const p = Math.pow(10,d); return Math.round((+n || 0)*p)/p; };

const CATS = ['protein','carbs','fats','veg','fruit','dairy','other'];
const CAT_LABEL = {
  protein: 'Protein', carbs: 'Carbs', fats: 'Fats', veg: 'Vegetables', fruit: 'Fruit', dairy: 'Dairy', other: 'Other'
};

/* =================== DEFAULT WEEK PLAN (seed) =================== */
/* Plan model:
{
  days: [{ id:'saturday', meals:[{name:'Meal1', items:[{name, qty, unit, cat}] }, ...] }, ...] 
}
*/
function seedWeeklyPlan() {
  const baseMeals = [
    {
      name: 'Meal1',
      items: [
        { name: 'Eggs', qty: 2, unit: 'pcs', cat: 'protein' },
        { name: 'Brown toast', qty: 2, unit: 'slice', cat: 'carbs' },
        { name: 'Mixed vegetables', qty: 150, unit: 'g', cat: 'veg' },
      ],
    },
    {
      name: 'Meal2',
      items: [
        { name: 'Oats', qty: 50, unit: 'g', cat: 'carbs' },
        { name: 'Mixed nuts', qty: 10, unit: 'g', cat: 'fats' },
        { name: 'Banana', qty: 150, unit: 'g', cat: 'fruit' },
        { name: 'Milk', qty: 100, unit: 'ml', cat: 'dairy' },
      ],
    },
    {
      name: 'Meal3',
      items: [
        { name: 'Chicken / Fish', qty: 150, unit: 'g', cat: 'protein' },
        { name: 'Rice (cooked)', qty: 150, unit: 'g', cat: 'carbs' },
        { name: 'Mixed nuts', qty: 10, unit: 'g', cat: 'fats' },
        { name: 'Vegetables', qty: 150, unit: 'g', cat: 'veg' },
      ],
    },
    {
      name: 'Meal4',
      items: [
        { name: 'Chicken / Fish', qty: 150, unit: 'g', cat: 'protein' },
        { name: 'Rice (cooked)', qty: 150, unit: 'g', cat: 'carbs' },
        { name: 'Mixed nuts', qty: 10, unit: 'g', cat: 'fats' },
        { name: 'Vegetables', qty: 150, unit: 'g', cat: 'veg' },
      ],
    },
    {
      name: 'Meal5',
      items: [
        { name: 'Greek yogurt', qty: 1, unit: 'cup', cat: 'dairy' },
        { name: 'Strawberries', qty: 100, unit: 'g', cat: 'fruit' },
      ],
    },
  ];

  const week = ['saturday','sunday','monday','tuesday','wednesday','thursday','friday'];
  return {
    days: week.map(d => ({ id: d, meals: structuredClone(baseMeals) })),
    notes: 'Swap rules: 100g rice ↔ 120g potato ↔ 100g pasta; 2 brown toast ↔ 1 baladi bread; Greek yogurt ↔ scoop whey + 60ml milk; fruit swaps (banana, strawberry, apple, guava, pear).',
  };
}

/* Compile grocery list by summing items across the 7 days */
function compileGroceries(plan, scale=1) {
  const map = new Map(); // key = name|unit|cat -> {name,unit,cat,total}
  (plan?.days || []).forEach(day => {
    (day.meals || []).forEach(meal => {
      (meal.items || []).forEach(it => {
        const key = `${it.name.toLowerCase()}|${it.unit}|${it.cat}`;
        const prev = map.get(key) || { name: it.name, unit: it.unit, cat: it.cat, total: 0 };
        prev.total += (+it.qty || 0) * scale;
        map.set(key, prev);
      });
    });
  });
  // group by category for UI
  const byCat = {};
  Array.from(map.values()).forEach(x => {
    const c = CATS.includes(x.cat) ? x.cat : 'other';
    byCat[c] = byCat[c] || [];
    byCat[c].push({ ...x, total: normalizeQty(x.total, x.unit) });
  });
  // sort inside each category by name
  CATS.forEach(c => {
    if (byCat[c]) byCat[c].sort((a,b)=>a.name.localeCompare(b.name));
  });
  return byCat;
}

/* Normalize quantities (e.g., 1000 g -> 1 kg display if unit is g) */
function normalizeQty(total, unit) {
  if (unit === 'g' && total >= 1000) {
    return { qty: round(total/1000, 2), unit: 'kg' };
  }
  if (unit === 'ml' && total >= 1000) {
    return { qty: round(total/1000, 2), unit: 'L' };
  }
  return { qty: round(total, 0), unit };
}

/* For CSV export */
function flattenForCSV(data) {
  const rows = [];
  CATS.forEach(cat => {
    (data[cat] || []).forEach(item => {
      rows.push({ Category: CAT_LABEL[cat], Item: item.name, Quantity: item.total.qty, Unit: item.total.unit });
    });
  });
  return rows;
}
function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h])).join(',')));
  return lines.join('\n');
}
function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =================== PAGE =================== */
export default function GroceryListPage() {
  // load or seed plan
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState(() => loadLS(LS_GROCERY, {
    bought: {},         // { key: true/false } key = name|unit|cat (normalized)
    filter: 'all',      // category filter
    q: '',              // search
    scale: 1,           // servings scaler (1 = default week)
  }));

  useEffect(() => {
    const p = loadLS(LS_PLAN, null);
    if (p?.days?.length) setPlan(p);
    else {
      const seeded = seedWeeklyPlan();
      setPlan(seeded);
      saveLS(LS_PLAN, seeded);
    }
  }, []);
  useEffect(() => saveLS(LS_GROCERY, state), [state]);

  const compiled = useMemo(() => compileGroceries(plan || seedWeeklyPlan(), state.scale), [plan, state.scale]);

  const keysList = useMemo(() => {
    // apply category filter + search
    const makeKey = (it, cat) => `${it.name.toLowerCase()}|${it.total.unit}|${cat}`;
    const filtered = [];
    const term = state.q.trim().toLowerCase();
    const cats = state.filter === 'all' ? CATS : [state.filter];
    cats.forEach(cat => {
      (compiled[cat] || []).forEach(it => {
        const ok = !term || it.name.toLowerCase().includes(term);
        if (ok) filtered.push({ key: makeKey(it, cat), ...it, cat });
      });
    });
    return filtered;
  }, [compiled, state.filter, state.q]);

  function toggle(key) {
    setState(s => ({ ...s, bought: { ...s.bought, [key]: !s.bought[key] } }));
  }
  function markAll(v) {
    const next = { ...state.bought };
    keysList.forEach(k => { next[`${k.name.toLowerCase()}|${k.total.unit}|${k.cat}`] = v; });
    setState(s => ({ ...s, bought: next }));
  }
  function resetChecks() {
    setState(s => ({ ...s, bought: {} }));
  }
  function exportCSV() {
    const csv = toCSV(flattenForCSV(compiled));
    download(`grocery-list-week.csv`, csv);
  }
  function printList() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Grocery List</h1>
            <p className="text-sm text-slate-600 mt-1">
              Auto-compiled from your weekly meal plan. Check off items as you shop. Scale servings, export, or print.
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <button onClick={exportCSV} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2">
              <Download size={16}/> Export CSV
            </button>
            <button onClick={printList} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2">
              <Printer size={16}/> Print
            </button>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <label className="relative md:col-span-2">
            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={state.q}
              onChange={e=>setState(s=>({ ...s, q: e.target.value }))}
              placeholder="Search items…"
              className="h-10 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          {/* Category filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={16} className="text-slate-500" />
            {['all', ...CATS].map(t => (
              <button
                key={t}
                onClick={()=>setState(s=>({ ...s, filter: t }))}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${t===state.filter ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {t === 'all' ? 'All' : CAT_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Scaling */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-slate-600">Servings (week):</span>
            <div className="inline-flex items-center gap-1">
              <button onClick={()=>setState(s=>({ ...s, scale: Math.max(0.5, round(s.scale-0.5,1)) }))} className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><Minus size={14}/></button>
              <input
                type="number" step="0.5" min="0.5" value={state.scale}
                onChange={e=>setState(s=>({ ...s, scale: Math.max(0.5, +e.target.value || 1) }))}
                className="h-8 w-16 rounded-md border border-slate-200 px-2 text-sm text-center outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button onClick={()=>setState(s=>({ ...s, scale: round(s.scale+0.5,1) }))} className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><Plus size={14}/></button>
            </div>
          </div>
        </div>

        {/* Hints */}
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <Info size={14}/> Tip: Use swaps from the Food Library to adapt your plan, then return here to regenerate totals.
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={()=>markAll(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 inline-flex items-center gap-2">
          <CheckSquare size={14}/> Mark all
        </button>
        <button onClick={()=>markAll(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 inline-flex items-center gap-2">
          <Square size={14}/> Unmark all
        </button>
        <button onClick={resetChecks} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2">
          <Trash2 size={14}/> Reset checks
        </button>
      </div>

      {/* List by category */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 print:grid-cols-2">
        {(['protein','carbs','fats','veg','fruit','dairy','other']).map(cat => {
          const items = (compiled[cat] || []).filter(it => {
            const term = state.q.trim().toLowerCase();
            const okQ = !term || it.name.toLowerCase().includes(term);
            const okF = state.filter === 'all' || state.filter === cat;
            return okQ && okF;
          });
          if (!items.length) return null;
          return (
            <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
              className="rounded-2xl border border-slate-200 bg-white p-4 break-inside-avoid">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{CAT_LABEL[cat]}</div>
                <div className="text-xs text-slate-500">{items.length} item(s)</div>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map(it => {
                  const key = `${it.name.toLowerCase()}|${it.total.unit}|${cat}`;
                  const on = !!state.bought[key];
                  return (
                    <label key={key} className="py-2 flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={()=>toggle(key)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className={`min-w-0 flex-1 ${on ? 'opacity-60 line-through' : ''}`}>
                        <div className="text-sm font-medium text-slate-800">{it.name}</div>
                        <div className="text-xs text-slate-500">{it.total.qty} {it.total.unit}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {keysList.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          No items found — adjust filters or check your meal plan.
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-slate-500">
        Quantities are compiled from your plan for 7 days. Units are normalized (g→kg, ml→L). Bakery/produce can vary — weigh when possible.
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          .break-inside-avoid { break-inside: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
