"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PageHeader, TabsPill, ToolbarButton, EmptyState, Modal, SearchInput,
  TagChips, RingProgress, ProgressBar, NumberStepper, spring
} from "@/components/dashboard/ui/UI";
import DataTable from "@/components/dashboard/ui/DataTable";
import { Salad, Plus, Download, Trash2, ArrowLeftRight, CalendarRange, Check, X } from "lucide-react";
 
/** ===== Mock recipes (swap with your real Recipe Library API) =====
 *  each recipe defines per-serving macros and ingredients (qty + unit)
 */
const seedRecipes = [
  {
    id: "R-1",
    name: "Grilled Chicken Bowl",
    cals: 520, p: 45, c: 50, f: 14, tags: ["high-protein", "lunch"],
    ingredients: [
      { name: "Chicken breast", qty: 200, unit: "g" },
      { name: "Rice", qty: 120, unit: "g" },
      { name: "Mixed veg", qty: 100, unit: "g" },
      { name: "Olive oil", qty: 10, unit: "ml" },
    ],
  },
  {
    id: "R-2",
    name: "Overnight Oats",
    cals: 380, p: 22, c: 55, f: 9, tags: ["breakfast", "prep"],
    ingredients: [
      { name: "Oats", qty: 70, unit: "g" },
      { name: "Skim milk", qty: 200, unit: "ml" },
      { name: "Greek yogurt", qty: 100, unit: "g" },
      { name: "Berries", qty: 80, unit: "g" },
    ],
  },
  {
    id: "R-3",
    name: "Greek Salad",
    cals: 270, p: 12, c: 16, f: 18, tags: ["vegetarian", "dinner"],
    ingredients: [
      { name: "Tomato", qty: 150, unit: "g" },
      { name: "Cucumber", qty: 120, unit: "g" },
      { name: "Feta", qty: 60, unit: "g" },
      { name: "Olives", qty: 30, unit: "g" },
      { name: "Olive oil", qty: 15, unit: "ml" },
    ],
  },
];

/** ===== Week skeleton ===== */
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SLOTS = ["Breakfast","Lunch","Dinner","Snack"];

export default function MyNutritionPage() {
  const [tab, setTab] = useState("plan"); // plan | recipes | grocery
  const [loading, setLoading] = useState(true);

  const [recipes, setRecipes] = useState([]);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState([]);

  // nutrition targets (user-specific; make editable or fetch from profile)
  const [target, setTarget] = useState({ kcal: 2400, p: 180, c: 260, f: 70 });

  // weekly plan: { [day]: { [slot]: { recipeId, servings } } }
  const [plan, setPlan] = useState(() =>
    Object.fromEntries(DAYS.map(d => [d, Object.fromEntries(SLOTS.map(s => [s, null]))]))
  );

  // modals
  const [openPick, setOpenPick] = useState(false);
  const [pickCtx, setPickCtx] = useState({ day: null, slot: null, servings: 1, replacingId: null });

  // grocery selection (which days included)
  const [selectedDays, setSelectedDays] = useState(new Set(DAYS));
  const toggleDay = (d) => setSelectedDays(s => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n; });

  useEffect(() => {
    setLoading(true);
    setTimeout(()=>{ setRecipes(seedRecipes); setLoading(false); }, 300);
  }, []);

  const allTags = useMemo(() => Array.from(new Set(recipes.flatMap(r => r.tags || []))).sort(), [recipes]);

  const filteredRecipes = useMemo(() => {
    let list = recipes.slice();
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(r => [r.name, ...(r.tags||[])].join(" ").toLowerCase().includes(s));
    }
    if (tagFilter.length) {
      list = list.filter(r => (r.tags||[]).some(t => tagFilter.includes(t)));
    }
    return list;
  }, [recipes, q, tagFilter]);

  /* ===== Derived totals ===== */
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay()-1];
  const todayMeals = plan[todayKey];

  const dayTotals = (day) => {
    const meals = plan[day];
    return Object.values(meals).filter(Boolean).reduce((acc, m) => {
      const r = recipes.find(x => x.id === m.recipeId); if (!r) return acc;
      acc.kcal += r.cals * m.servings;
      acc.p += r.p * m.servings;
      acc.c += r.c * m.servings;
      acc.f += r.f * m.servings;
      return acc;
    }, { kcal:0, p:0, c:0, f:0 });
  };

  const weekTotals = useMemo(() => {
    return DAYS.reduce((tot, d) => {
      const t = dayTotals(d);
      tot.kcal += t.kcal; tot.p += t.p; tot.c += t.c; tot.f += t.f;
      return tot;
    }, { kcal:0, p:0, c:0, f:0 });
  }, [plan, recipes]);

  const todayTotals = useMemo(()=> dayTotals(todayKey), [plan, recipes, todayKey]);

  /* ===== Plan actions ===== */
  function openPicker(day, slot, existing){
    const servings = existing?.servings ?? 1;
    setPickCtx({ day, slot, servings, replacingId: existing?.recipeId || null });
    setOpenPick(true);
  }

  function assignRecipe(rec){
    setPlan(prev => {
      const next = structuredClone(prev);
      next[pickCtx.day][pickCtx.slot] = { recipeId: rec.id, servings: pickCtx.servings };
      return next;
    });
    setOpenPick(false);
  }

  function changeServings(day, slot, v){
    setPlan(prev => {
      const next = structuredClone(prev);
      next[day][slot].servings = Math.max(1, v);
      return next;
    });
  }

  function removeMeal(day, slot){
    setPlan(prev => {
      const next = structuredClone(prev);
      next[day][slot] = null;
      return next;
    });
  }

  /* ===== Grocery list ===== */
  const groceryItems = useMemo(() => {
    // collect ingredients from selected days
    const agg = {};
    for (const d of DAYS) {
      if (!selectedDays.has(d)) continue;
      for (const slot of SLOTS) {
        const m = plan[d][slot];
        if (!m) continue;
        const r = recipes.find(x => x.id === m.recipeId);
        if (!r) continue;
        for (const ing of (r.ingredients||[])) {
          const key = `${ing.name}__${ing.unit}`;
          agg[key] = agg[key] || { name: ing.name, unit: ing.unit, qty: 0 };
          agg[key].qty += ing.qty * m.servings;
        }
      }
    }
    // to array
    return Object.values(agg).sort((a,b)=> a.name.localeCompare(b.name));
  }, [plan, recipes, selectedDays]);

  const [checkedGroceries, setCheckedGroceries] = useState({});
  const toggleG = (name, unit) => {
    const key = `${name}__${unit}`;
    setCheckedGroceries(s => ({ ...s, [key]: !s[key] }));
  };

  function exportGroceryCSV() {
    if (!groceryItems.length) return;
    const rows = [["Item","Qty","Unit"], ...groceryItems.map(i => [i.name, i.qty, i.unit])];
    const csv = rows.map(r => r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "grocery-list.csv"; a.click(); URL.revokeObjectURL(url);
  }

  /* ===== UI helpers ===== */
  const pct = (part, whole) => Math.min(100, Math.round((part / Math.max(1, whole)) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Salad}
        title="My Nutrition"
        subtitle="Plan your meals, explore recipes, and generate a grocery list."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={CalendarRange} variant="secondary" onClick={()=>setTab("plan")}>Weekly plan</ToolbarButton>
            <ToolbarButton icon={Download} variant="secondary" onClick={exportGroceryCSV}>Export groceries</ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="my-nutrition-tabs"
        tabs={[
          { key:"plan",    label:"Meal Plan", icon: CalendarRange },
          { key:"recipes", label:"Recipes",   icon: Salad },
          { key:"grocery", label:"Grocery List", icon: Download },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== TOP SUMMARY (always visible) ===== */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <RingProgress value={pct(todayTotals.kcal, target.kcal)}>
            <div className="text-center">
              <div className="text-[10px] text-slate-500">Today kcal</div>
              <div className="text-sm font-semibold">{pct(todayTotals.kcal, target.kcal)}%</div>
            </div>
          </RingProgress>
          <div className="min-w-0">
            <div className="text-sm text-slate-500">{todayKey}</div>
            <div className="text-sm font-medium">{Math.round(todayTotals.kcal)} / {target.kcal} kcal</div>
          </div>
        </div>
        <MacroKPI label="Protein" val={todayTotals.p} target={target.p} />
        <MacroKPI label="Carbs"   val={todayTotals.c} target={target.c} />
        <MacroKPI label="Fat"     val={todayTotals.f} target={target.f} />
      </motion.div>

      {/* ===== PLAN ===== */}
      {tab==="plan" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Weekly totals</div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              <SimpleStat label="Calories" value={`${Math.round(weekTotals.kcal)} kcal`} />
              <SimpleStat label="Protein"  value={`${Math.round(weekTotals.p)} g`} />
              <SimpleStat label="Carbs"    value={`${Math.round(weekTotals.c)} g`} />
              <SimpleStat label="Fat"      value={`${Math.round(weekTotals.f)} g`} />
            </div>
          </div>

          {/* Planner grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Day</th>
                  {SLOTS.map(s => <th key={s} className="py-2 pr-3">{s}</th>)}
                  <th className="py-2 pr-3">Totals</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => {
                  const t = dayTotals(day);
                  return (
                    <tr key={day} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-3 font-medium">{day}</td>
                      {SLOTS.map(slot => {
                        const meal = plan[day][slot];
                        const r = meal ? recipes.find(x => x.id===meal.recipeId) : null;
                        return (
                          <td key={slot} className="py-3 pr-3">
                            {meal && r ? (
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate" title={r.name}>{r.name}</div>
                                    <div className="text-xs text-slate-500">{r.cals} kcal · {r.p}P/{r.c}C/{r.f}F × {meal.servings}</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button className="btn-xs" title="Swap" onClick={()=>openPicker(day, slot, meal)}><ArrowLeftRight className="w-4 h-4" /></button>
                                    <button className="btn-xs" title="Remove" onClick={()=>removeMeal(day, slot)}><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Servings</span>
                                  <NumberStepper value={meal.servings} min={1} onChange={(v)=>changeServings(day, slot, v)} />
                                </div>
                              </div>
                            ) : (
                              <button onClick={()=>openPicker(day, slot)} className="w-full h-[74px] rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50">
                                + Add
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 pr-3 text-xs text-slate-600">
                        <div>{Math.round(t.kcal)} kcal</div>
                        <div>{Math.round(t.p)}P / {Math.round(t.c)}C / {Math.round(t.f)}F</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ===== RECIPES ===== */}
      {tab==="recipes" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search recipes…" />
              <TagChips tags={allTags} selected={tagFilter} onToggle={(t)=> setTagFilter(s => s.includes(t) ? s.filter(x=>x!==t) : [...s, t])} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({length:6}).map((_,i)=> <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : filteredRecipes.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredRecipes.map(r => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.cals} kcal · {r.p}P/{r.c}C/{r.f}F</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.tags||[]).map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">#{t}</span>)}
                  </div>
                  <div className="mt-3">
                    <button className="btn-sm" onClick={()=>{ setPickCtx({ day: todayKey, slot: "Lunch", servings: 1 }); setOpenPick(true); }}>Add to plan</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No recipes" subtitle="Create recipes in Content → Recipes, then add to your plan." />
          )}
        </motion.div>
      )}

      {/* ===== GROCERY ===== */}
      {tab==="grocery" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Included days</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {DAYS.map(d => {
                const on = selectedDays.has(d);
                return (
                  <button key={d} onClick={()=>toggleDay(d)}
                          className={`px-2 py-1 rounded-full text-xs border ${on?'bg-indigo-600 text-white border-transparent':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Grocery List</div>
              <div className="flex items-center gap-2">
                <ToolbarButton icon={Download} variant="secondary" onClick={exportGroceryCSV}>Download CSV</ToolbarButton>
              </div>
            </div>

            {groceryItems.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {groceryItems.map(i => {
                  const key = `${i.name}__${i.unit}`;
                  const checked = !!checkedGroceries[key];
                  return (
                    <li key={key} className="py-2 flex items-center gap-3">
                      <input type="checkbox" checked={checked} onChange={()=>toggleG(i.name, i.unit)} className="w-4 h-4 rounded border-slate-300" />
                      <span className={`text-sm ${checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>{i.name}</span>
                      <span className="ml-auto text-sm tabular-nums">{Math.round(i.qty)} {i.unit}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="Nothing to buy" subtitle="Add meals to your weekly plan or include more days." />
            )}
          </div>
        </motion.div>
      )}

      {/* ===== Recipe Picker modal ===== */}
      <Modal open={openPick} onClose={()=>setOpenPick(false)} title="Add recipe to plan">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Day">
              <select className="inp" value={pickCtx.day || ""} onChange={(e)=>setPickCtx(c=>({ ...c, day: e.target.value }))}>
                <option value="">Select…</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Meal">
              <select className="inp" value={pickCtx.slot || ""} onChange={(e)=>setPickCtx(c=>({ ...c, slot: e.target.value }))}>
                <option value="">Select…</option>
                {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Servings">
              <NumberStepper value={pickCtx.servings} min={1} onChange={(v)=>setPickCtx(c=>({ ...c, servings: v }))} />
            </Field>
          </div>

          <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search recipes…" />
          <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200">
            {filteredRecipes.map(r => (
              <button key={r.id} onClick={()=>assignRecipe(r)} className="w-full text-left px-3 py-2 border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-500">{r.cals} kcal · {r.p}P/{r.c}C/{r.f}F</div>
              </button>
            ))}
            {!filteredRecipes.length && <div className="p-3 text-sm text-slate-500">No recipes match.</div>}
          </div>
          <div className="flex items-center justify-end">
            <button className="btn-primary" onClick={()=>setOpenPick(false)}>Done</button>
          </div>
        </div>
      </Modal>

      {/* local styles if not global */}
      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm; }
        .btn-xs { @apply p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs; }
      `}</style>
    </div>
  );
}

/* ===== small presentational bits ===== */
function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
function SimpleStat({ label, value }){ return (<div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">{label}</div><div className="font-semibold">{value}</div></div>); }
function MacroKPI({ label, val=0, target=0 }){
  const pct = Math.min(100, Math.round((val/Math.max(1,target))*100));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">{label}</div>
        <div className="text-xs text-slate-500">{val} / {target} g</div>
      </div>
      <div className="mt-2"><ProgressBar value={val} max={target} /></div>
      <div className="text-xs text-slate-500 mt-1">{pct}%</div>
    </div>
  );
}
