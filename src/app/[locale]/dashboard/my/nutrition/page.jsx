'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader, TabsPill, EmptyState, spring } from '@/components/dashboard/ui/UI';
import { Flame, Droplets, Utensils, History as HistoryIcon, Info, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

/* ========================= LIGHT THEME / PALETTE ========================= */
const PALETTE = {
  bg: 'bg-[#f7f9fc]',
  card: 'bg-white shadow-sm border border-slate-200',
  border: 'border-slate-200',
  text: 'text-slate-900',
  subtext: 'text-slate-600',
  brand: { from: 'from-indigo-500', to: 'to-sky-400' },
  ring: {
    base: '#E5E7EB',   // slate-200
    fill: '#6366F1',   // indigo-500
    water: '#06B6D4',  // cyan-500
    ok: '#10B981',     // emerald-500
  },
};

const STORAGE_KEYS = {
  ui: 'mw.nutri.ui.v2',
  dayState: 'mw.nutri.state.v3',
  profile: 'mw.nutri.profile.v2',
};

const weekOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

/* ========================= BASE PLAN (WITH KCAL) ========================= */
const baseMeals = [
  { id: 'm1', title: 'Meal 1', items: [
    { id: 'm1-eggs', label: '2 whole eggs', kcal: 150 },
    { id: 'm1-toast', label: '2 brown toast', kcal: 160 },
    { id: 'm1-veggies', label: 'Vegetables', kcal: 40 },
  ], subs:['يمكن تبديل 2 brown toast برغيف عيش بلدي.']},
  { id: 'm2', title: 'Meal 2', items: [
    { id: 'm2-oats', label: '50g oats', kcal: 190 },
    { id: 'm2-nuts', label: '10g nuts', kcal: 60 },
    { id: 'm2-banana', label: '150g banana', kcal: 135 },
    { id: 'm2-milk', label: '100ml milk', kcal: 50 },
  ], subs:['الموز ↔ فراولة / تفاح / جوافة / كمثرى.']},
  { id: 'm3', title: 'Meal 3', items: [
    { id: 'm3-protein', label: '150g chicken/fish', kcal: 240 },
    { id: 'm3-rice', label: '150g rice', kcal: 200 },
    { id: 'm3-nuts', label: '10g nuts', kcal: 60 },
    { id: 'm3-veggies', label: 'Vegetables', kcal: 40 },
  ], subs:['كل 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.']},
  { id: 'm4', title: 'Meal 4', items: [
    { id: 'm4-protein', label: '150g chicken/fish', kcal: 240 },
    { id: 'm4-rice', label: '150g rice', kcal: 200 },
    { id: 'm4-nuts', label: '10g nuts', kcal: 60 },
    { id: 'm4-veggies', label: 'Vegetables', kcal: 40 },
  ], subs:['كل 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.']},
  { id: 'm5', title: 'Meal 5', items: [
    { id: 'm5-yog', label: 'Greek yogurt', kcal: 120 },
    { id: 'm5-berry', label: '100g strawberries', kcal: 35 },
  ], subs:['Greek yogurt ↔ سكوب بروتين + 60ml milk.']},
];

const guidelines = [
  '١) مالتي فيتامين بعد الوجبة الأولى. ٢) أوميجا بعد الثانية. ٣) زنك بعد الأخيرة.',
  '٤) الملح معتدل. ٥) ٤ لتر ماء يوميًا.',
  '٦) مشروبات دايت مسموحة. ٧) وزن الطعام بعد الطبخ.',
  '٨) ممنوع الزيوت المهدرجة/السكر المصنع.',
  '٩) 100g رز ↔ 120g بطاطس/بطاطا أو 100g مكرونة.',
  '١٠) يمكن دمج الوجبات أو تبديل ترتيبها.',
];

/* ========================= HELPERS ========================= */
const targetWaterMl = 4000;
const cups = 8;
const cupSize = targetWaterMl / cups;

function loadLS(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function saveLS(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

function makeDefaultDayState() {
  const items = {};
  baseMeals.forEach(m => m.items.forEach(it => { items[it.id] = false; }));
  return {
    items,
    mealsDone: baseMeals.reduce((a,m)=>({ ...a, [m.id]: false }),{}),
    waterMl: 0,
    notes: '',
    extras: [], // [{id,label,kcal}]
    supplements: { multi:false, omega:false, zinc:false, creatine:false },
    snapshots: {},
  };
}

/* ========================= UI PRIMITIVES ========================= */
function Ring({ size=84, stroke=10, value=0, color=PALETTE.ring.fill, track=PALETTE.ring.base, label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct/100) * c;
  return (
    <div className="relative" style={{ width:size, height:size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c-dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-900">{Math.round(pct)}%</div>
          {label && <div className="text-[10px] text-slate-500">{label}</div>}
          {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ children }) {
  return <div className={`rounded-2xl ${PALETTE.card} p-4`}>{children}</div>;
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full border transition
        ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  );
}

/* ========================= PAGE ========================= */
export default function NutritionPage() {
  const [tab, setTab] = useState('meals'); // meals | guidelines | history
  const [selectedDay, setSelectedDay] = useState('saturday');

  const [profile, setProfile] = useState(() =>
    loadLS(STORAGE_KEYS.profile, { clientName: 'Client', targetKcal: 2200 }),
  );

  const [dayState, setDayState] = useState(() => {
    const saved = loadLS(STORAGE_KEYS.dayState, {});
    const filled = { ...saved };
    weekOrder.forEach(d => {
      if (!filled[d]) filled[d] = makeDefaultDayState();
      if (!filled[d].extras) filled[d].extras = [];
      if (!filled[d].snapshots) filled[d].snapshots = {};
      if (!filled[d].supplements) filled[d].supplements = { multi:false, omega:false, zinc:false, creatine:false };
    });
    return filled;
  });

  /* Persist */
  useEffect(() => {
    const ui = loadLS(STORAGE_KEYS.ui, { tab, selectedDay });
    setTab(ui.tab || 'meals');
    setSelectedDay(ui.selectedDay || 'saturday');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { saveLS(STORAGE_KEYS.ui, { tab, selectedDay }); }, [tab, selectedDay]);
  useEffect(() => { saveLS(STORAGE_KEYS.profile, profile); }, [profile]);
  useEffect(() => { saveLS(STORAGE_KEYS.dayState, dayState); }, [dayState]);

  const todays = dayState[selectedDay] || makeDefaultDayState();

  /* Derived */
  const totalItems = baseMeals.reduce((s,m)=> s + m.items.length, 0);
  const totalDone = Object.values(todays.items).filter(Boolean).length;
  const completionPct = (totalDone/Math.max(1,totalItems))*100;

  const mealStats = useMemo(() => {
    return baseMeals.map(m => {
      const done = m.items.filter(it => todays.items[it.id]);
      const kcalTotal = m.items.reduce((s,i)=>s+(i.kcal||0),0);
      const kcalDone = done.reduce((s,i)=>s+(i.kcal||0),0);
      return {
        id:m.id, title:m.title,
        doneCount: done.length, total: m.items.length,
        kcalDone, kcalTotal,
      };
    });
  }, [todays]);

  const kcalMealsDone = mealStats.reduce((s,m)=> s + m.kcalDone, 0);
  const kcalMealsTotal = mealStats.reduce((s,m)=> s + m.kcalTotal, 0);
  const kcalExtras = (todays.extras||[]).reduce((s,e)=> s + (Number(e.kcal)||0), 0);
  const kcalToday = kcalMealsDone + kcalExtras;

  const waterPct = Math.min(100, Math.round((todays.waterMl/ targetWaterMl)*100));

  /* Mutators */
  const toggleItem = (id) => setDayState(p => ({...p, [selectedDay]: { ...p[selectedDay], items: { ...p[selectedDay].items, [id]: !p[selectedDay].items[id] }}}));
  const markMeal = (mealId, val) => setDayState(p=>{
    const meal = baseMeals.find(m=>m.id===mealId); if(!meal) return p;
    const next = { ...p[selectedDay].items }; meal.items.forEach(i => next[i.id]=val);
    return { ...p, [selectedDay]: { ...p[selectedDay], items: next, mealsDone: { ...p[selectedDay].mealsDone, [mealId]: val } } };
  });
  const setNotes = (t) => setDayState(p=> ({...p, [selectedDay]: { ...p[selectedDay], notes: t.slice(0,1000) }}));
  const setSupp = (k,v)=> setDayState(p=> ({...p, [selectedDay]: { ...p[selectedDay], supplements: { ...p[selectedDay].supplements, [k]: v }}}));
  const water = (d)=> setDayState(p=> {
    const cur = p[selectedDay].waterMl; const nxt = Math.max(0, Math.min(targetWaterMl, cur + d));
    return { ...p, [selectedDay]: { ...p[selectedDay], waterMl: nxt }};
  });

  const addExtra = (label,kcal)=>{
    if(!label.trim()) return;
    const id = `ex-${Date.now()}`;
    setDayState(p=> ({...p, [selectedDay]: { ...p[selectedDay], extras:[...(p[selectedDay].extras||[]), {id,label:label.trim(),kcal:Number(kcal)||0}] }}));
  };
  const editExtra = (id,next)=> setDayState(p=> ({...p, [selectedDay]: { ...p[selectedDay], extras:(p[selectedDay].extras||[]).map(e=> e.id===id? {...e,...next}:e) }}));
  const removeExtra = (id)=> setDayState(p=> ({...p, [selectedDay]: { ...p[selectedDay], extras:(p[selectedDay].extras||[]).filter(e=>e.id!==id) }}));

  const snapshotToday = ()=> setDayState(p=> ({...p, [selectedDay]: {
    ...p[selectedDay],
    snapshots: { ...(p[selectedDay].snapshots||{}), lastSaved:{
      at:new Date().toISOString(),
      completion:`${totalDone}/${totalItems}`,
      kcal:kcalToday, waterMl:todays.waterMl
    }}
  }}));

  /* ========================= RENDER ========================= */
  return (
    <div className={`${PALETTE.bg} min-h-[100dvh] ${PALETTE.text}`}>
      <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">

        {/* Hero / banner */}
        <div className="rounded-3xl overflow-hidden border border-indigo-200">
          <div className={`relative p-6 md:p-8 bg-gradient-to-tr ${PALETTE.brand.from} ${PALETTE.brand.to} text-white`}>
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
              <PageHeader
                icon={Utensils}
                title="Nutrition"
                subtitle="Light UI • ring progress • quick actions"
              />

              {/* Calories banner */}
              <div className="grid grid-cols-3 gap-3">
                <StatMini title="Today kcal" value={`${kcalToday}`} />
                <StatMini title="Target kcal">
                  <input
                    type="number"
                    value={profile.targetKcal}
                    onChange={e => setProfile(p=>({...p, targetKcal: Number(e.target.value||0)}))}
                    className="w-24 rounded-lg bg-white/20 border border-white/30 px-2 py-1 text-sm text-white outline-none placeholder:text-white/80"
                    placeholder="2200"
                  />
                </StatMini>
                <StatMini title="Client" value={profile.clientName}>
                  <input
                    value={profile.clientName}
                    onChange={e => setProfile(p=>({...p, clientName: e.target.value.slice(0,40)}))}
                    className="w-32 rounded-lg bg-white/20 border border-white/30 px-2 py-1 text-sm text-white outline-none placeholder:text-white/80"
                    placeholder="Client"
                  />
                </StatMini>
              </div>
            </div>
          </div>

          {/* Secondary controls */}
          <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
            <div className="flex flex-wrap gap-2">
              {weekOrder.map(d => (
                <Pill key={d} active={selectedDay===d} onClick={()=>setSelectedDay(d)}>
                  {d[0].toUpperCase()+d.slice(1)}
                </Pill>
              ))}
            </div>

            <TabsPill
              id="nutri-tabs"
              tabs={[
                { key:'meals', label:'Meals', icon:Utensils },
                { key:'guidelines', label:'Guidelines', icon:Info },
                { key:'history', label:'History', icon:HistoryIcon },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>
        </div>

        {/* Summary rings */}
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard>
            <div className="flex items-center gap-4">
              <Ring value={completionPct} label="Completed" sub={`${totalDone}/${totalItems}`} />
              <div>
                <div className="text-sm text-slate-500">Meals progress</div>
                <div className="text-2xl font-semibold">Completion</div>
                <div className="text-slate-500 text-sm mt-1">Check items to fill the ring</div>
              </div>
            </div>
          </StatCard>

          <StatCard>
            <div className="flex items-center gap-4">
              <Ring value={waterPct} color={PALETTE.ring.water} label="Water" sub={`${Math.round(todays.waterMl/100)/10} L`} />
              <div className="flex-1">
                <div className="text-sm text-slate-500">Water intake</div>
                <div className="flex gap-2 mt-2">
                  {[...Array(cups)].map((_,i)=>{
                    const filled = todays.waterMl >= (i+1)*cupSize;
                    return <div key={i} className={`h-2 w-8 rounded ${filled?'bg-cyan-500':'bg-slate-200'}`} />;
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>water(250)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-sm">+250ml</button>
                  <button onClick={()=>water(-250)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-sm">-250ml</button>
                </div>
              </div>
            </div>
          </StatCard>

          <StatCard>
            <div className="flex items-center gap-4">
              <Ring value={Math.min(100, (kcalToday/Math.max(1,profile.targetKcal))*100)} color={PALETTE.ring.ok} label="Calories" sub={`${kcalToday}/${profile.targetKcal}`} />
              <div>
                <div className="text-sm text-slate-500">Energy balance</div>
                <div className="text-2xl font-semibold">{kcalToday} kcal</div>
                <button onClick={snapshotToday} className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm hover:bg-emerald-100">
                  Save snapshot
                </button>
              </div>
            </div>
          </StatCard>
        </div>

        {/* =================== TABS =================== */}
        {tab === 'meals' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-6">
            {/* Meals grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {baseMeals.map(m=>{
                const doneCount = m.items.filter(i=>todays.items[i.id]).length;
                const allDone = doneCount===m.items.length;
                const kcalTotal = m.items.reduce((s,i)=>s+(i.kcal||0),0);
                const kcalDone = m.items.filter(i=>todays.items[i.id]).reduce((s,i)=>s+(i.kcal||0),0);

                return (
                  <div key={m.id} className={`rounded-2xl ${PALETTE.card} p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{m.title}</div>
                        <div className="text-xs text-slate-500">{doneCount}/{m.items.length} • {kcalDone}/{kcalTotal} kcal</div>
                      </div>
                      <button
                        onClick={()=>markMeal(m.id, !allDone)}
                        className={`px-3 py-1.5 text-xs rounded-lg border ${allDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {allDone ? 'Unmark' : 'Mark meal'}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {m.items.map(i=>{
                        const checked = !!todays.items[i.id];
                        return (
                          <label key={i.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={()=>toggleItem(i.id)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className={`text-sm ${checked?'line-through text-slate-400':'text-slate-800'}`}>{i.label}</span>
                              <span className="text-xs text-slate-500">{i.kcal} kcal</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {m.subs?.length ? (
                      <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
                        <div className="text-xs text-slate-700 mb-1">Smart swaps</div>
                        <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                          {m.subs.map((s,i)=><li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    ):null}
                  </div>
                );
              })}
            </div>

            {/* Extras + Notes + Supplements */}
            <div className="grid lg:grid-cols-3 gap-4">
              <ExtrasPanel
                extras={todays.extras||[]}
                onAdd={addExtra}
                onEdit={editExtra}
                onRemove={removeExtra}
              />

              <div className={`rounded-2xl ${PALETTE.card} p-4 lg:col-span-2`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Notes</div>
                  <div className="text-xs text-slate-500">Max 1000 chars</div>
                </div>
                <textarea
                  value={todays.notes}
                  onChange={e=>setNotes(e.target.value)}
                  className="w-full min-h-[120px] rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Anything to remember for meals/shopping…"
                />
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    ['multi','Multi-vitamin'],['omega','Omega'],
                    ['zinc','Zinc'],['creatine','Creatine 3g']
                  ].map(([k,label])=>(
                    <button
                      key={k}
                      onClick={()=>setSupp(k,!todays.supplements[k])}
                      className={`px-3 py-2 rounded-lg border text-sm ${todays.supplements[k] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grocery list */}
            <div className={`rounded-2xl ${PALETTE.card} p-4`}>
              <div className="font-semibold">Grocery (auto)</div>
              <ul className="mt-2 list-square pl-5 space-y-1 text-sm text-slate-800">
                {baseMeals.flatMap(m=>m.items).filter(i=>!todays.items[i.id]).map((i,idx)=><li key={i.id+idx}>{i.label}</li>)}
              </ul>
              {!baseMeals.flatMap(m=>m.items).filter(i=>!todays.items[i.id]).length && (
                <div className="text-sm text-slate-500 mt-1">All set for today 🎉</div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'guidelines' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}
            className={`rounded-2xl ${PALETTE.card} p-5`}>
            <div className="font-semibold mb-2 flex items-center gap-2"><Info size={16}/> الإرشادات</div>
            <ul className="space-y-2 text-sm text-slate-800">
              {guidelines.map((g,i)=><li key={i}>{g}</li>)}
            </ul>
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}
            className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {weekOrder.map(day=>{
                const d = dayState[day] || makeDefaultDayState();
                const items = baseMeals.reduce((s,m)=>s+m.items.length,0);
                const done = Object.values(d.items||{}).filter(Boolean).length;
                const wPct = Math.min(100, Math.round((d.waterMl/targetWaterMl)*100));
                const kcalMeals = baseMeals.reduce((sum,m)=> sum + m.items.filter(i=>d.items?.[i.id]).reduce((s,i)=>s+(i.kcal||0),0), 0);
                const kcalEx = (d.extras||[]).reduce((s,e)=> s+(Number(e.kcal)||0), 0);
                const totalK = kcalMeals + kcalEx;

                return (
                  <div key={day} className={`rounded-2xl ${PALETTE.card} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{day[0].toUpperCase()+day.slice(1)}</div>
                      <div className="text-xs text-slate-500">{done}/{items} items</div>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <Ring size={64} value={(done/Math.max(1,items))*100} label="Done"/>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500">Water</div>
                        <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                          <div className="h-2 rounded" style={{width:`${wPct}%`, background:PALETTE.ring.water}}/>
                        </div>
                        <div className="mt-2 text-sm text-slate-700">Kcal: <span className="font-semibold">{totalK}</span>/<span className="opacity-80">{profile.targetKcal}</span></div>
                      </div>
                    </div>
                    {d.snapshots?.lastSaved && (
                      <div className="mt-2 text-[11px] text-slate-500">
                        Saved {new Date(d.snapshots.lastSaved.at).toLocaleString()} • {d.snapshots.lastSaved.completion} • {d.snapshots.lastSaved.kcal} kcal
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <EmptyState title="Tip" subtitle="Use “Save snapshot” in the summary to record today." icon={HistoryIcon}/>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ========================= SUB COMPONENTS ========================= */

function StatMini({ title, value, children }) {
  return (
    <div className="rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-white">
      <div className="text-[11px]/5"> {title} </div>
      {value ? <div className="text-sm font-semibold">{value}</div> : children}
    </div>
  );
}

function ExtrasPanel({ extras, onAdd, onEdit, onRemove }) {
  const [label,setLabel] = useState('');
  const [kcal,setKcal]   = useState('');

  return (
    <div className={`rounded-2xl ${PALETTE.card} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Extras (snacks / custom)</div>
        <div className="text-xs text-slate-500">{extras.length} item(s)</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
        <input
          value={label} onChange={e=>setLabel(e.target.value)}
          placeholder="Dark chocolate 20g" className="md:col-span-4 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <input
          type="number" value={kcal} onChange={e=>setKcal(e.target.value)}
          placeholder="kcal" className="md:col-span-1 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          onClick={()=>{ if(!label.trim()) return; onAdd(label, Number(kcal||0)); setLabel(''); setKcal(''); }}
          className="md:col-span-1 inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200"
        >
          <Plus size={14}/> Add
        </button>
      </div>

      {extras.length ? (
        <div className="divide-y divide-slate-200">
          {extras.map(e=> <ExtraRow key={e.id} extra={e} onEdit={onEdit} onRemove={onRemove} />)}
        </div>
      ):(
        <div className="text-sm text-slate-500">No extras yet.</div>
      )}
    </div>
  );
}

function ExtraRow({ extra, onEdit, onRemove }) {
  const [edit, setEdit] = useState(false);
  const [label,setLabel] = useState(extra.label);
  const [kcal,setKcal] = useState(String(extra.kcal ?? ''));

  return (
    <div className="py-2 flex items-center gap-3">
      {edit ? (
        <>
          <input value={label} onChange={e=>setLabel(e.target.value)} className="flex-1 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
          <input type="number" value={kcal} onChange={e=>setKcal(e.target.value)} className="w-28 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
          <button onClick={()=>{ onEdit(extra.id, {label:label.trim(), kcal:Number(kcal||0)}); setEdit(false); }} className="h-9 w-9 grid place-items-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"><Check size={16}/></button>
          <button onClick={()=>{ setEdit(false); setLabel(extra.label); setKcal(String(extra.kcal ?? '')); }} className="h-9 w-9 grid place-items-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50"><X size={16}/></button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <div className="text-sm font-medium">{extra.label}</div>
            <div className="text-xs text-slate-500">{extra.kcal} kcal</div>
          </div>
          <button onClick={()=>setEdit(true)} className="h-9 w-9 grid place-items-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50"><Pencil size={16}/></button>
          <button onClick={()=>onRemove(extra.id)} className="h-9 w-9 grid place-items-center rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"><Trash2 size={16}/></button>
        </>
      )}
    </div>
  );
}
