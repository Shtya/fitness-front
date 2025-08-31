"use client";

// app/(site)/stories/page.jsx
// Public Website – Success Stories / Transformations

import { useMemo, useState } from "react";
import TrialModal from "@/components/site/TrialModal";
import { Container, Section, Button, Card, Input, Select, Badge } from "@/components/site/UI";
import { Sparkles, Star, Quote, Timer, Scale, LineChart } from "lucide-react";

/* ================= Demo data (replace with CMS/API) ================= */
const STORIES = [
  {
    id:"s1",
    name:"Mahmoud A.",
    goal:"Fat loss",
    gender:"M",
    type:"PT",
    months:6,
    startWeight:96,
    endWeight:84,
    startBodyFat:28,
    endBodyFat:18,
    quote:"Lost 12 kg without crazy diets. I finally enjoy training.",
    before:"https://picsum.photos/seed/gym-before-1/1200/900",
    after:"https://picsum.photos/seed/gym-after-1/1200/900",
  },
  {
    id:"s2",
    name:"Nour H.",
    goal:"Recomposition",
    gender:"F",
    type:"Online",
    months:4,
    startWeight:64,
    endWeight:62,
    startBodyFat:27,
    endBodyFat:21,
    quote:"Clothes fit better and I feel stronger every week!",
    before:"https://picsum.photos/seed/gym-before-2/1200/900",
    after:"https://picsum.photos/seed/gym-after-2/1200/900",
  },
  {
    id:"s3",
    name:"Omar S.",
    goal:"Strength",
    gender:"M",
    type:"PT",
    months:5,
    startWeight:78,
    endWeight:80,
    startBodyFat:20,
    endBodyFat:17,
    quote:"Hit +60kg on deadlift and fixed my back pain.",
    before:"https://picsum.photos/seed/gym-before-3/1200/900",
    after:"https://picsum.photos/seed/gym-after-3/1200/900",
  },
];

const GOALS = ["All","Fat loss","Recomposition","Strength"];
const TYPES = ["All","PT","Online"];
const GENDERS = ["All","M","F"];

export default function SuccessStoriesPage(){
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [goal, setGoal] = useState("All");
  const [type, setType] = useState("All");
  const [gender, setGender] = useState("All");
  const [sort, setSort] = useState("impact"); // impact | months | name

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = STORIES.filter(x =>
      (goal==='All' || x.goal===goal) &&
      (type==='All' || x.type===type) &&
      (gender==='All' || x.gender===gender) &&
      (!s || [x.name,x.goal,x.type].join(' ').toLowerCase().includes(s))
    );
    if (sort==='months') list.sort((a,b)=> a.months-b.months);
    if (sort==='name') list.sort((a,b)=> a.name.localeCompare(b.name));
    if (sort==='impact') list.sort((a,b)=> delta(b)-delta(a));
    return list;
  }, [q,goal,type,gender,sort]);

  const kpi = useMemo(() => {
    const n = STORIES.length;
    const lost = STORIES.reduce((acc,x)=> acc + Math.max(0,x.startWeight-x.endWeight), 0);
    const avgMonths = Math.round(STORIES.reduce((a,x)=> a+x.months,0)/n);
    return { total:n, lost, avgMonths };
  }, []);

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <Badge><Sparkles className="w-4 h-4"/> Real people. Real results.</Badge>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">Success Stories & Transformations</h1>
          <p className="mt-2 text-slate-600">Swipe the before/after slider, read their stories, and start yours today.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={()=>setOpen(true)}>Start your story</Button>
            <Button as='a' href="/site/pricing" variant='ghost'>See pricing</Button>
          </div>
        </div>

        {/* KPI band */}
        <Card className="mt-8 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Total transformations</div>
              <div className="text-2xl font-extrabold">{kpi.total}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Total kg lost</div>
              <div className="text-2xl font-extrabold">{kpi.lost}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Avg. program length</div>
              <div className="text-2xl font-extrabold">{kpi.avgMonths} months</div>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="mt-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Input placeholder="Search name or goal…" value={q} onChange={e=>setQ(e.target.value)} />
            <Select value={goal} onChange={e=>setGoal(e.target.value)}>{GOALS.map(o=> <option key={o}>{o}</option>)}</Select>
            <Select value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(o=> <option key={o}>{o}</option>)}</Select>
            <Select value={gender} onChange={e=>setGender(e.target.value)}>{GENDERS.map(o=> <option key={o}>{o}</option>)}</Select>
            <Select value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="impact">Sort by impact</option>
              <option value="months">Sort by duration</option>
              <option value="name">Sort by name</option>
            </Select>
          </div>
        </Card>

        {/* Stories grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(s => (
            <Card key={s.id} className="p-4">
              <BeforeAfter before={s.before} after={s.after} name={s.name} />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.goal} • {s.type}</div>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <div className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5"/> {s.months} months</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Stat icon={Scale} label="Weight" value={`${s.startWeight}→${s.endWeight} kg`} color="text-indigo-600" />
                <Stat icon={LineChart} label="Body fat" value={`${s.startBodyFat}%→${s.endBodyFat}%`} color="text-emerald-600" />
                <Impact value={delta(s)} />
              </div>

              <blockquote className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Quote className="w-4 h-4 text-slate-400 mt-0.5"/>
                  <p className="leading-relaxed">{s.quote}</p>
                </div>
              </blockquote>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">{s.goal}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">{s.type}</span>
                </div>
                <Button onClick={()=>setOpen(true)} variant='ghost'>Start like {s.name}</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Final CTA */}
        <div className="mt-10">
          <Card className="p-5 flex flex-col sm:flex-row items-center justify-between">
            <div>
              <div className="font-semibold">Your before/after starts here</div>
              <div className="text-slate-600 text-sm">Book a free trial. We’ll match you to the right coach and plan.</div>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-0">
              <Button onClick={()=>setOpen(true)}>Book a trial</Button>
              <Button href="/site/coaches" as='a' variant='ghost'>Meet the coaches</Button>
            </div>
          </Card>
        </div>

        <TrialModal open={open} onClose={()=>setOpen(false)} />
      </Container>
    </Section>
  );
}

/* ================= Helpers & small UI ================= */
function delta(s){
  // simple impact score: kg change + bf% change
  const kg = Math.abs(s.endWeight - s.startWeight);
  const bf = Math.abs((s.endBodyFat ?? 0) - (s.startBodyFat ?? 0));
  return Math.round(kg + bf);
}

function Stat({ icon:Icon, label, value, color }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <div className={`inline-flex items-center gap-1 text-[11px] text-slate-500`}><Icon className={`w-3.5 h-3.5 ${color}`} /> {label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Impact({ value }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Star className="w-3.5 h-3.5 text-amber-500"/> Impact</div>
      <div className="mt-1 font-semibold text-slate-800">+{value}</div>
    </div>
  );
}

/* =============== Before/After slider component =============== */
function BeforeAfter({ before, after, name }){
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden select-none bg-slate-200">
      {/* fallback placeholders if images missing */}
      {before ? <img src={before} alt={`${name} before`} className="absolute inset-0 w-full h-full object-cover"/> : <div className="absolute inset-0 bg-slate-300"/>}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100-pos}% 0 0)` }}>
        {after ? <img src={after} alt={`${name} after`} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-400"/>}
      </div>
      {/* divider handle */}
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="h-full w-[2px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]" />
        <div className="absolute -top-4 -translate-x-1/2 left-0 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">Slide</div>
      </div>
      <input
        type="range"
        value={pos}
        min={0}
        max={100}
        onChange={(e)=> setPos(Number(e.target.value))}
        className="absolute inset-0 opacity-0 cursor-ew-resize"
        aria-label="Compare before and after"
      />
    </div>
  );
}
