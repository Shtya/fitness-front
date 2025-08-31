"use client";

// app/(site)/programs/page.jsx
// Public Website Programs/Services (Gym, PT, Online coaching, Nutrition)

import { useState } from "react";
import { motion } from "framer-motion";
import TrialModal from "@/components/site/TrialModal";
import { Container, Section, Button, Card, Feature, Badge, spring } from "@/components/site/UI";
import { Dumbbell, Users, Video, Salad, Sparkles, Target, Clock, CheckCircle2, ClipboardList, MessageSquare } from "lucide-react";

const programs = [
  { key:'gym', icon:Dumbbell, title:'Gym Classes', tag:'Group training', desc:'Strength, conditioning, and mobility — scalable for all levels. Small groups so coaches can actually coach.', bullets:['Beginner-friendly Foundations','Periodized cycles','Technique-first coaching','Community vibe'], cta:"See schedule", href:"/site/schedule" },
  { key:'pt', icon:Users, title:'Personal Training', tag:'1-on-1 coaching', desc:'Private sessions tailored to your goals, schedule, and training history. Perfect for fast, focused progress.', bullets:['Movement assessment','Custom program','Flexible times','Weekly check‑ins'], cta:"Book PT", href:"/site/schedule" },
  { key:'online', icon:Video, title:'Online Coaching', tag:'Remote', desc:'Fully remote programming with video form checks, habit coaching, and message support — anywhere you are.', bullets:['App-based logging','Video feedback','Monthly reviews','Worldwide access'], cta:"Get started", href:"/site/pricing" },
  { key:'nutrition', icon:Salad, title:'Nutrition Coaching', tag:'Food & habits', desc:'Meal templates, recipe library, and grocery lists. We focus on sustainable changes, not crash diets.', bullets:['Macro targets','Meal plans','Recipe library','Weekly adjustments'], cta:"View plans", href:"/site/pricing" },
];

export default function ProgramsPage(){
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ================= Intro ================= */}
      <Section>
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <Badge><Sparkles className="w-4 h-4"/> Pick your path — or combine them</Badge>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">Programs & Services</h1>
            <p className="mt-2 text-slate-600">Whether you love the energy of classes or prefer 1‑on‑1, we’ve got a track that fits your goals, time, and budget.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={()=>setOpen(true)}>Book a free trial</Button>
              <Button as='a' href="/site/pricing" variant='ghost'>See pricing</Button>
            </div>
          </div>

          {/* Cards grid */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {programs.map((p,i)=> (
              <motion.div key={p.key} initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{...spring, delay:i*0.03}}>
                <Card className="p-5 h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 grid place-items-center"><p.icon className="w-6 h-6"/></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-lg">{p.title}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{p.tag}</span>
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{p.desc}</p>
                      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 list-disc pl-5">
                        {p.bullets.map((b,idx)=>(<li key={idx}>{b}</li>))}
                      </ul>
                      <div className="mt-4 flex gap-2">
                        <Button as='a' href={p.href}>{p.cta}</Button>
                        <Button variant='ghost' onClick={()=>setOpen(true)}>Book trial</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ================= Deeper dive sections ================= */}
      <Section className="pt-0">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="font-semibold text-lg flex items-center gap-2"><Dumbbell className="w-5 h-5"/> How classes work</div>
              <div className="mt-2 text-slate-600 text-sm">Small groups (max 18) split by level. Every 8–12 weeks we switch cycles (hypertrophy → strength → power). Coaches demo, cue, and scale.</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MiniStep icon={ClipboardList} title="Arrive & brief" text="Warm‑up + daily focus"/>
                <MiniStep icon={Target} title="Main sets" text="Progressive loading"/>
                <MiniStep icon={CheckCircle2} title="Finisher" text="Conditioning or accessories"/>
              </div>
              <div className="mt-4"><Button as='a' href="/site/schedule" variant='ghost'>See weekly schedule</Button></div>
            </Card>
            <Card className="p-5">
              <div className="font-semibold text-lg flex items-center gap-2"><Users className="w-5 h-5"/> Personal training flow</div>
              <div className="mt-2 text-slate-600 text-sm">Start with a movement assessment and goal setting. Your plan fits your calendar, equipment access, and training history.</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MiniStep icon={ClipboardList} title="Assess" text="History + movement"/>
                <MiniStep icon={Target} title="Plan" text="Custom program"/>
                <MiniStep icon={MessageSquare} title="Check‑ins" text="Weekly adjustments"/>
              </div>
              <div className="mt-4"><Button onClick={()=>setOpen(true)}>Book intro PT</Button></div>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ================= Comparison table ================= */}
      <Section className="pt-0">
        <Container>
          <Card className="p-5 overflow-x-auto">
            <div className="font-semibold mb-3">Compare options</div>
            <table className="min-w-[760px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Feature</th>
                  <th className="py-2">Gym Classes</th>
                  <th className="py-2">Personal Training</th>
                  <th className="py-2">Online Coaching</th>
                  <th className="py-2">Nutrition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r,i)=> (
                  <tr key={i}>
                    <td className="py-3 font-medium">{r.feature}</td>
                    <td className="py-3">{r.gym}</td>
                    <td className="py-3">{r.pt}</td>
                    <td className="py-3">{r.online}</td>
                    <td className="py-3">{r.nutrition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Container>
      </Section>

      {/* ================= Final CTA ================= */}
      <Section className="py-10">
        <Container>
          <Card className="p-5 flex flex-col sm:flex-row items-center justify-between">
            <div>
              <div className="font-semibold">Not sure which one fits?</div>
              <div className="text-slate-600 text-sm">Start with a free trial. We’ll recommend the best mix for your goals.</div>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-0">
              <Button onClick={()=>setOpen(true)}>Book a trial</Button>
              <Button as='a' href="/site/pricing" variant='ghost'>See pricing</Button>
            </div>
          </Card>
        </Container>
      </Section>

      <TrialModal open={open} onClose={()=>setOpen(false)} />
    </>
  );
}

const rows = [
  { feature:'Coaching attention', gym:'Medium (≤18/class)', pt:'Highest (1:1)', online:'High (async video)', nutrition:'High (weekly review)' },
  { feature:'Customization', gym:'Scaled options', pt:'Full custom', online:'Custom blocks', nutrition:'Plan + macros' },
  { feature:'Schedule flexibility', gym:'Fixed slots', pt:'You + coach', online:'Anytime', nutrition:'Weekly' },
  { feature:'Equipment needed', gym:'Provided', pt:'Gym or home', online:'Gym/home', nutrition:'Kitchen' },
  { feature:'Best for', gym:'General fitness', pt:'Specific goals', online:'Remote trainees', nutrition:'Diet support' },
];

function MiniStep({ icon:Icon, title, text }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 font-medium"><Icon className="w-4 h-4"/> {title}</div>
      <div className="text-xs text-slate-600 mt-1">{text}</div>
    </div>
  );
}
