"use client";

// app/(site)/pricing/page.jsx
// Public Website Pricing & Memberships (tiers, FAQs)

import { useMemo, useState } from "react";
import { Container, Section, Button, Card, Badge } from "@/components/site/UI";
import { Sparkles, Crown, ShieldCheck, Zap, Check, Info } from "lucide-react";

const PLANS = [
  {
    key: "basic",
    name: "Basic",
    highlight: false,
    monthly: 699,
    yearly: 6990, // sample: ~2 months off
    unit: "EGP",
    tagline: "8 classes / month + open gym",
    features: [
      "Small‑group classes (8/mo)",
      "Open gym access",
      "Community chat",
      "Coach Q&A (weekly)",
    ],
    cta: "Choose Basic",
  },
  {
    key: "plus",
    name: "Plus",
    highlight: true,
    monthly: 999,
    yearly: 9990,
    unit: "EGP",
    tagline: "Unlimited classes + 1 PT / month",
    features: [
      "Unlimited classes",
      "Open gym access",
      "1× Personal Training / month",
      "Priority waitlists",
    ],
    cta: "Choose Plus",
  },
  {
    key: "elite",
    name: "Elite",
    highlight: false,
    monthly: 1899,
    yearly: 18990,
    unit: "EGP",
    tagline: "Unlimited + weekly PT + nutrition",
    features: [
      "Unlimited classes",
      "Weekly Personal Training",
      "Nutrition coaching",
      "Monthly progress review",
    ],
    cta: "Choose Elite",
  },
];

const FAQ = [
  { q: "Can I freeze my membership?", a: "Yes, up to 2 months per calendar year. Contact support to schedule your freeze dates." },
  { q: "Do you offer student discounts?", a: "Yes — 10% off with a valid student ID at signup (non‑stackable)." },
  { q: "What is your refund policy?", a: "Monthly memberships are non‑refundable once the billing cycle starts. You can cancel next cycle anytime." },
  { q: "Do unused classes carry over?", a: "For Basic, unused sessions do not roll over. Consider Plus if you need more flexibility." },
];

export default function PricingPage(){
  const [period, setPeriod] = useState("monthly"); // monthly | yearly

  const note = useMemo(() => period === "yearly" ? "Save ~2 months with annual billing" : "Switch to annual to save")

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <Badge><Sparkles className="w-4 h-4"/> Simple plans, flexible options</Badge>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">Pricing & Memberships</h1>
          <p className="mt-2 text-slate-600">Pick a plan, start training, and cancel anytime. Prices shown are demo values — set yours in CMS.</p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
            <PeriodButton active={period==='monthly'} onClick={()=>setPeriod('monthly')}>Monthly</PeriodButton>
            <PeriodButton active={period==='yearly'} onClick={()=>setPeriod('yearly')}>Yearly <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">Save</span></PeriodButton>
          </div>
          <div className="mt-2 text-xs text-slate-500">{note}</div>
        </div>

        {/* Tiers */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <Card key={p.key} className={`p-5 ${p.highlight ? 'ring-2 ring-indigo-500' : ''}`}>
              {p.highlight && <div className="mb-2"><Badge>Most popular</Badge></div>}
              <div className="flex items-center justify-between">
                <div className="font-semibold text-lg">{p.name}</div>
                {p.highlight ? <Crown className="w-5 h-5 text-indigo-600"/> : <ShieldCheck className="w-5 h-5 text-slate-400"/>}
              </div>
              <div className="text-slate-600 text-sm mt-0.5">{p.tagline}</div>

              <div className="mt-3">
                <Price amount={p[period]} unit={p.unit} period={period} />
              </div>

              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {p.features.map((f,i)=>(
                  <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5"/>{f}</li>
                ))}
              </ul>

              <Button className="mt-4 w-full">{p.cta}</Button>
              <div className="mt-2 text-[11px] text-slate-500">No contracts. Cancel or change plan anytime.</div>
            </Card>
          ))}
        </div>

        {/* Included band */}
        <Card className="mt-8 p-5">
          <div className="font-semibold">Included in all plans</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-700">
            <Inc>Coach oversight & safety first</Inc>
            <Inc>App access for logging & check‑ins</Inc>
            <Inc>Community events & challenges</Inc>
          </div>
        </Card>

        {/* Payment logos (placeholders) */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-80">
          {Array.from({length:4}).map((_,i)=> <div key={i} className="h-10 bg-slate-200 rounded" />)}
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold">FAQs</h2>
            <p className="mt-1 text-slate-600 text-sm">Everything you need to know about memberships.</p>
          </div>
          <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQ.map((item, i) => (
              <details key={i} className="group open:bg-slate-50">
                <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                  <span className="font-medium text-slate-800">{item.q}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-10">
          <Card className="p-5 flex flex-col sm:flex-row items-center justify-between">
            <div>
              <div className="font-semibold">Ready to start?</div>
              <div className="text-slate-600 text-sm">Book a free trial and we’ll help you pick a plan.</div>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-0">
              <Button href="/site/schedule" as='a'>Book a trial</Button>
              <Button href="/site/coaches" as='a' variant='ghost'>Meet the coaches</Button>
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
}

/* ================= helpers ================= */
function PeriodButton({ active, children, ...props }){
  return (
    <button
      className={`px-3 py-1.5 rounded-lg text-sm border transition ${active? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Price({ amount, unit, period }){
  const per = period === 'yearly' ? 'yr' : 'mo';
  return (
    <div>
      <div className="text-3xl font-extrabold">{amount}<span className="text-base font-medium"> {unit}/{per}</span></div>
    </div>
  );
}

function Inc({ children }){
  return <div className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-600"/>{children}</div>;
}

function CrownIcon2(props){
  return <CrownIcon {...props}/>;
}

function CrownIcon({ className }){
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M5 17h14l1-9-4 3-5-6-5 6-4-3 1 9zm-1 2h16v2H4v-2z"/>
    </svg>
  );
}
