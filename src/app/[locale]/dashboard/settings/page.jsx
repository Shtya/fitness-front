"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PageHeader,
  ToolbarButton,
  SectionCard,
  Field,
  SaveBar,
  Switch,
  ColorSwatchPicker,
  KeyField,
  ConfirmDialog,
  spring,
} from "@/components/dashboard/ui/UI";
import {
  ServerCog,
  Download,
  Upload,
  KeySquare,
  Info,
  ShieldCheck,
  Palette,
  BadgeDollarSign,
  Bell,
  CalendarClock,
  Megaphone,
  Headphones,
  FileText,
  Clock3,
  PhoneCall,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Wand2,
} from "lucide-react";

/* =====================================================
   💎 Redesigned System Settings Page (JS)
   - Focus on elegant layout, navigation, micro‑interactions
   - Sticky quick‑nav, glass header, soft cards, roomy spacing
   - Uses your UI kit + Tailwind + Framer Motion
   - Pure JS (no TS)
===================================================== */

const tzList = ["Africa/Cairo", "Europe/London", "Asia/Dubai", "America/New_York"];
const currencies = ["EGP", "USD", "EUR", "GBP", "SAR", "AED"];
const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function shade(hex, amt = 0) {
  let c = (hex || "#4F46E5").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const n = [0, 2, 4].map((i) =>
    Math.max(0, Math.min(255, parseInt(c.slice(i, i + 2), 16) + Math.round((255 * amt) / 100)))
  );
  return `#${n.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function SectionHeader({ icon: Icon, title, subtitle, id }) {
  return (
    <div id={id} className="sticky top-0 z-10 -mx-4 mb-3 bg-gradient-to-b from-white/70 to-white/0 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100">
            <Icon size={18} />
          </span>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {!!subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function TimePicker({ value = "08:00", onChange }) {
  return (
    <input type="time" className="inp w-[140px]" value={value} onChange={(e) => onChange?.(e.target.value)} />
  );
}

function MultiTimeRow({ label, times, setTimes }) {
  const add = () => setTimes((t) => [...t, "08:00"]);
  const upd = (i, v) => setTimes((t) => t.map((x, idx) => (idx === i ? v : x)));
  const rm = (i) => setTimes((t) => t.filter((_, idx) => idx !== i));
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-2">
        {times.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <TimePicker value={t} onChange={(v) => upd(i, v)} />
            <button
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={() => rm(i)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
        <ToolbarButton icon={Clock3} variant="secondary" onClick={add}>
          Add time
        </ToolbarButton>
      </div>
    </Field>
  );
}

export default function SystemSettingsRedesigned() {
  const [saving, setSaving] = useState(false);

  // Org
  const [orgName, setOrgName] = useState("Amazing Gym");
  const [domain, setDomain] = useState("amazing.gym");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [currency, setCurrency] = useState("EGP");

  // Branding
  const [maleColor, setMaleColor] = useState("#1E40AF");
  const [femaleColor, setFemaleColor] = useState("#BE185D");
  const [useGenderTheme, setUseGenderTheme] = useState(true);
  const [dark, setDark] = useState(false);

  // API & Loading
  const [apiToken, setApiToken] = useState("");
  const [openTokenHelp, setOpenTokenHelp] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState([
    { id: 1, text: "Syncing your plan…", weight: 3, showFor: "all" },
  ]);

  // Dhikr
  const [dhikrEnabled, setDhikrEnabled] = useState(true);
  const [dhikrList, setDhikrList] = useState([
    { id: 1, text: "سُبْحَانَ اللَّهِ", repeat: 33 },
    { id: 2, text: "الْحَمْدُ لِلَّهِ", repeat: 33 },
    { id: 3, text: "اللَّهُ أَكْبَرُ", repeat: 34 },
  ]);

  // Roles
  const [roles, setRoles] = useState({
    admin: { users: "full", plans: "full", billing: "full", settings: "full" },
    coach: { users: "edit", plans: "full", billing: "none", settings: "none" },
    assistant: { users: "view", plans: "edit", billing: "none", settings: "none" },
  });

  // Pricing
  const [billingEnabled, setBillingEnabled] = useState(true);
  const [plans, setPlans] = useState([
    { id: "basic", name: "Basic", price: 299, period: "month", features: ["Workout plan", "Meal plan"] },
    { id: "pro", name: "Pro", price: 599, period: "month", features: ["Everything in Basic", "Check-ins", "WhatsApp reminders"] },
  ]);

  // Reports & Automations
  const [autoSendReport, setAutoSendReport] = useState(true);
  const [reportDay, setReportDay] = useState("Thu");
  const [reportTime, setReportTime] = useState("18:00");
  const [motivationNextDay, setMotivationNextDay] = useState(true);
  const [motivationTemplate, setMotivationTemplate] = useState(
    "Great job {name}! Tomorrow is a fresh chance to get closer to your goal 💪"
  );

  const reportInfo = useMemo(
    () => [
      "Weight trend vs last week",
      "Meal adherence (logged vs planned)",
      "Workout completion %",
      "Water intake summary",
      "Check-in notes & next focus",
      "Latest progress photos",
    ],
    []
  );

  // WhatsApp
  const [waEnabled, setWaEnabled] = useState(false);
  const [waProvider, setWaProvider] = useState("twilio");
  const [waApiKey, setWaApiKey] = useState("");
  const [waTemplate, setWaTemplate] = useState("Hi {name}, don’t forget your {reminder} at {time}.");

  // Weekly Logs
  const [weeklyPromptEnabled, setWeeklyPromptEnabled] = useState(true);
  const [weeklyPromptDay, setWeeklyPromptDay] = useState("Fri");
  const [weeklyPromptTime, setWeeklyPromptTime] = useState("10:00");

  // Podcast
  const [podcastEnabled, setPodcastEnabled] = useState(true);
  const [podcastMode, setPodcastMode] = useState("manual");
  const [episodes, setEpisodes] = useState([
    { id: 1, title: "Mindset for Week 1", url: "https://example.com/ep1.mp3", visible: true },
  ]);

  // Motivation broadcast preview
  const [broadcastPreviewName, setBroadcastPreviewName] = useState("Mohamed");
  const [broadcastMsg, setBroadcastMsg] = useState("You’ve got this, {name}! Finish today strong. 💥");

  const previewMsg = useMemo(
    () => broadcastMsg.replaceAll("{name}", broadcastPreviewName || "Client"),
    [broadcastMsg, broadcastPreviewName]
  );

  // Reminders
  const [trainingDays, setTrainingDays] = useState(["Sun", "Tue", "Thu"]);
  const [trainingTimes, setTrainingTimes] = useState(["18:00"]);
  const [mealTimes, setMealTimes] = useState(["09:00", "14:00", "20:00"]);
  const [waterTimes, setWaterTimes] = useState(["08:00", "11:00", "14:00", "17:00", "20:00"]);
  const [checkinAlerts, setCheckinAlerts] = useState(true);

  // Local helpers
  const scrollTo = (hash) => {
    const el = document.querySelector(hash);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const onSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved (mock)");
    }, 800);
  };

  const navItems = [
    { id: "org", title: "Organization", icon: ServerCog },
    { id: "api", title: "API & Loading", icon: KeySquare },
    { id: "dhikr", title: "الذكر", icon: Sparkles },
    { id: "branding", title: "Branding", icon: Palette },
    { id: "roles", title: "Permissions", icon: ShieldCheck },
    { id: "pricing", title: "Pricing", icon: BadgeDollarSign },
    { id: "reports", title: "Reports", icon: FileText },
    { id: "whatsapp", title: "WhatsApp", icon: PhoneCall },
    { id: "weekly", title: "Weekly Logs", icon: CalendarClock },
    { id: "podcast", title: "Podcast", icon: Headphones },
    { id: "motivation", title: "Motivation", icon: Megaphone },
    { id: "reminders", title: "Reminders", icon: Bell },
  ];

  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative -mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 p-[1px]">
        <div className="rounded-2xl bg-white/60 p-6 backdrop-blur-sm">
          <PageHeader
            icon={ServerCog}
            title="System Settings"
            subtitle="Customize identity, themes, permissions, automations & more."
            actions={
              <div className="flex items-center gap-2">
                <ToolbarButton icon={Download} variant="secondary" onClick={() => alert("Export (mock)")}>Export</ToolbarButton>
                <ToolbarButton icon={Upload} variant="secondary" onClick={() => alert("Import (mock)")}>Import</ToolbarButton>
              </div>
            }
          />
          {/* Quick Nav Pills */}
          <div className="mt-4 flex w-full flex-wrap gap-2">
            {navItems.map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(`#sec-${id}`)}
                className="group inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur transition hover:bg-white"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600/10 text-indigo-700">
                  <Icon size={12} />
                </span>
                {title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid gap-6 md:grid-cols-[260px,1fr]">
        {/* Sticky Sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-[88px] space-y-2">
            {navItems.map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(`#sec-${id}`)}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200">
                  <Icon size={16} />
                </span>
                <span className="truncate">{title}</span>
                <ChevronRight className="ml-auto opacity-30" size={16} />
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="space-y-10">
          {/* Organization */}
          <section id="sec-org">
            <SectionHeader id="sec-org" icon={ServerCog} title="Organization" subtitle="Gym identity & locale." />
            <CardGlow>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Gym name"><input className="inp" value={orgName} onChange={(e) => setOrgName(e.target.value)} /></Field>
                <Field label="Subdomain / domain"><input className="inp" value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
                <Field label="Time zone">
                  <select className="inp" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {tzList.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency">
                  <select className="inp" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {currencies.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </CardGlow>
          </section>

          {/* API & Loading */}
          <section id="sec-api">
            <SectionHeader id="sec-api" icon={KeySquare} title="API & Loading" subtitle="Token + animated loading messages." />
            <CardGlow>
              <Field label="API token">
                <div className="flex items-center gap-2">
                  <input className="inp" placeholder="Paste token…" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
                  <ToolbarButton icon={Info} variant="secondary" onClick={() => setOpenTokenHelp(true)}>How to get it</ToolbarButton>
                </div>
              </Field>
              <Field label="Loading messages" hint="Weighted rotation; higher weight shows more often.">
                <div className="space-y-2">
                  {loadingTexts.map((item, i) => (
                    <motion.div key={item.id} layout className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr,120px,120px,auto]">
                      <input className="inp" value={item.text} onChange={(e) => setLoadingTexts((arr) => arr.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))} />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Weight</span>
                        <input type="number" min={1} className="inp w-20" value={item.weight} onChange={(e) => setLoadingTexts((arr) => arr.map((x, idx) => (idx === i ? { ...x, weight: Math.max(1, Number(e.target.value || 1)) } : x)))} />
                      </div>
                      <select className="inp" value={item.showFor} onChange={(e) => setLoadingTexts((arr) => arr.map((x, idx) => (idx === i ? { ...x, showFor: e.target.value } : x)))}>
                        <option value="all">All</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                      <button type="button" onClick={() => setLoadingTexts((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Remove</button>
                    </motion.div>
                  ))}
                  <ToolbarButton icon={Wand2} variant="secondary" onClick={() => setLoadingTexts((arr) => [...arr, { id: Date.now(), text: "Loading…", weight: 1, showFor: "all" }])}>Add message</ToolbarButton>
                </div>
              </Field>
            </CardGlow>
          </section>

          {/* Dhikr */}
          <section id="sec-dhikr">
            <SectionHeader id="sec-dhikr" icon={Sparkles} title="الذكر" subtitle="تحكم في الأذكار التي تظهر للمستخدم." />
            <CardGlow>
              <Field label="Enable Dhikr"><Switch checked={dhikrEnabled} onChange={setDhikrEnabled} /></Field>
              <AnimatePresence initial={false}>
                {dhikrEnabled && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="space-y-2">
                      {dhikrList.map((d, i) => (
                        <div key={d.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr,120px,auto]">
                          <input className="inp" value={d.text} placeholder="النص…" onChange={(e) => setDhikrList((l) => l.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))} />
                          <input type="number" className="inp" min={1} value={d.repeat} onChange={(e) => setDhikrList((l) => l.map((x, idx) => (idx === i ? { ...x, repeat: Math.max(1, Number(e.target.value || 1)) } : x)))} />
                          <button type="button" onClick={() => setDhikrList((l) => l.filter((_, idx) => idx !== i))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Remove</button>
                        </div>
                      ))}
                      <ToolbarButton icon={Sparkles} variant="secondary" onClick={() => setDhikrList((l) => [...l, { id: Date.now(), text: "", repeat: 1 }])}>Add Dhikr</ToolbarButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardGlow>
          </section>

          {/* Branding */}
          <section id="sec-branding">
            <SectionHeader id="sec-branding" icon={Palette} title="Branding" subtitle="Gender colors, theme preview." />
            <CardGlow>
              <Field label="Use gender-based theming"><Switch checked={useGenderTheme} onChange={setUseGenderTheme} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Male color"><ColorSwatchPicker value={maleColor} onChange={setMaleColor} /></Field>
                <Field label="Female color"><ColorSwatchPicker value={femaleColor} onChange={setFemaleColor} /></Field>
              </div>
              <Field label="Theme mode">
                <div className="flex items-center gap-3">
                  <Switch checked={dark} onChange={setDark} />
                  <span className="text-sm text-slate-600">{dark ? "Dark" : "Light"}</span>
                </div>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <ThemePreview title="Male" color={maleColor} />
                <ThemePreview title="Female" color={femaleColor} />
              </div>
            </CardGlow>
          </section>

          {/* Roles */}
          <section id="sec-roles">
            <SectionHeader id="sec-roles" icon={ShieldCheck} title="Roles & Permissions" subtitle="Control access per role." />
            <CardGlow>
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Role</th>
                      <th className="px-3 py-2 text-left">Users</th>
                      <th className="px-3 py-2 text-left">Plans</th>
                      <th className="px-3 py-2 text-left">Billing</th>
                      <th className="px-3 py-2 text-left">Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(roles).map(([role, perms]) => (
                      <tr key={role} className="border-t border-slate-200">
                        <td className="px-3 py-2 font-medium capitalize text-slate-700">{role}</td>
                        {["users", "plans", "billing", "settings"].map((k) => (
                          <td key={k} className="px-3 py-2">
                            <select
                              className="inp"
                              value={perms[k]}
                              onChange={(e) => setRoles((rs) => ({ ...rs, [role]: { ...rs[role], [k]: e.target.value } }))}
                            >
                              <option value="none">none</option>
                              <option value="view">view</option>
                              <option value="edit">edit</option>
                              <option value="full">full</option>
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardGlow>
          </section>

          {/* Pricing */}
          <section id="sec-pricing">
            <SectionHeader id="sec-pricing" icon={BadgeDollarSign} title="Pricing & Subscriptions" subtitle="Manage paid plans." />
            <CardGlow>
              <Field label="Enable billing"><Switch checked={billingEnabled} onChange={setBillingEnabled} /></Field>
              <AnimatePresence initial={false}>
                {billingEnabled && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid gap-4 md:grid-cols-2">
                      {plans.map((p, i) => (
                        <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_0_rgba(15,23,42,.04)]">
                          <div className="flex items-center justify-between gap-3">
                            <input className="inp" value={p.name} onChange={(e) => setPlans((arr) => arr.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} />
                            <button type="button" onClick={() => setPlans((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Remove</button>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input type="number" className="inp w-24" min={0} value={p.price} onChange={(e) => setPlans((arr) => arr.map((x, idx) => (idx === i ? { ...x, price: Number(e.target.value || 0) } : x)))} />
                            <select className="inp w-28" value={p.period} onChange={(e) => setPlans((arr) => arr.map((x, idx) => (idx === i ? { ...x, period: e.target.value } : x)))}>
                              <option value="month">/month</option>
                              <option value="year">/year</option>
                            </select>
                            <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">{currency}</span>
                          </div>
                          <Field label="Features">
                            <div className="space-y-2">
                              {p.features.map((f, fi) => (
                                <div key={fi} className="flex items-center gap-2">
                                  <input className="inp flex-1" value={f} onChange={(e) => setPlans((arr) => arr.map((x, idx) => (idx === i ? { ...x, features: p.features.map((y, yi) => (yi === fi ? e.target.value : y)) } : x)))} />
                                  <button type="button" onClick={() => setPlans((arr) => arr.map((x, idx) => (idx === i ? { ...x, features: p.features.filter((_, yi) => yi !== fi) } : x)))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Remove</button>
                                </div>
                              ))}
                              <ToolbarButton variant="secondary" onClick={() => setPlans((arr) => arr.map((x, idx) => (idx === i ? { ...x, features: [...p.features, ""] } : x)))}>Add feature</ToolbarButton>
                            </div>
                          </Field>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3">
                      <ToolbarButton variant="secondary" onClick={() => setPlans((p) => [...p, { id: String(Date.now()), name: "New Plan", price: 0, period: "month", features: [] }])}>Add plan</ToolbarButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardGlow>
          </section>

          {/* Reports */}
          <section id="sec-reports">
            <SectionHeader id="sec-reports" icon={FileText} title="Reports & Automations" subtitle="Weekly auto-report & next-day motivation." />
            <CardGlow>
              <Field label="Auto-send weekly report"><Switch checked={autoSendReport} onChange={setAutoSendReport} /></Field>
              {autoSendReport && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Report day">
                    <select className="inp" value={reportDay} onChange={(e) => setReportDay(e.target.value)}>
                      {days.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Report time"><TimePicker value={reportTime} onChange={setReportTime} /></Field>
                  <Field label="Includes">
                    <div className="text-xs text-slate-600">Push/WA notification when sent.</div>
                  </Field>
                </div>
              )}
              <Field label="What the report includes">
                <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
                  {reportInfo.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </Field>
              <Field label="Motivation for next day"><Switch checked={motivationNextDay} onChange={setMotivationNextDay} /></Field>
              {motivationNextDay && (
                <Field label="Message template">
                  <textarea className="inp min-h-[80px]" value={motivationTemplate} onChange={(e) => setMotivationTemplate(e.target.value)} />
                  <div className="pt-1 text-xs text-slate-500">Use {"{name}"} placeholder.</div>
                </Field>
              )}
            </CardGlow>
          </section>

          {/* WhatsApp */}
          <section id="sec-whatsapp">
            <SectionHeader id="sec-whatsapp" icon={PhoneCall} title="WhatsApp Reminders" subtitle="Provider, token and template." />
            <CardGlow>
              <Field label="Enable WhatsApp"><Switch checked={waEnabled} onChange={setWaEnabled} /></Field>
              {waEnabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Provider">
                    <select className="inp" value={waProvider} onChange={(e) => setWaProvider(e.target.value)}>
                      <option value="twilio">Twilio</option>
                      <option value="meta">Meta Cloud API</option>
                      <option value="custom">Custom webhook</option>
                    </select>
                  </Field>
                  <Field label="API key / token"><KeyField value={waApiKey} masked onChange={(v) => setWaApiKey(v)} /></Field>
                  <Field label="Template">
                    <input className="inp" value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} />
                    <div className="pt-1 text-xs text-slate-500">Placeholders: {"{name} {reminder} {time}"}</div>
                  </Field>
                </div>
              )}
            </CardGlow>
          </section>

          {/* Weekly Logs */}
          <section id="sec-weekly">
            <SectionHeader id="sec-weekly" icon={CalendarClock} title="Weekly Logs" subtitle="Prompt users for weight & progress once a week." />
            <CardGlow>
              <Field label="Enable weekly prompt"><Switch checked={weeklyPromptEnabled} onChange={setWeeklyPromptEnabled} /></Field>
              {weeklyPromptEnabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Day">
                    <select className="inp" value={weeklyPromptDay} onChange={(e) => setWeeklyPromptDay(e.target.value)}>
                      {days.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time"><TimePicker value={weeklyPromptTime} onChange={setWeeklyPromptTime} /></Field>
                </div>
              )}
            </CardGlow>
          </section>

          {/* Podcast */}
          <section id="sec-podcast">
            <SectionHeader id="sec-podcast" icon={Headphones} title="Podcast for Clients" subtitle="RSS or curated episodes." />
            <CardGlow>
              <Field label="Enable podcast"><Switch checked={podcastEnabled} onChange={setPodcastEnabled} /></Field>
              {podcastEnabled && (
                <Field label="Episodes">
                  <div className="space-y-2">
                    {episodes.map((ep, i) => (
                      <div key={ep.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr,1fr,auto]">
                        <input className="inp" placeholder="Title" value={ep.title} onChange={(e) => setEpisodes((arr) => arr.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))} />
                        <input className="inp" placeholder="https://audio.mp3" value={ep.url} onChange={(e) => setEpisodes((arr) => arr.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))} />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">Visible</span>
                          <Switch checked={ep.visible} onChange={(v) => setEpisodes((arr) => arr.map((x, idx) => (idx === i ? { ...x, visible: v } : x)))} />
                          <button type="button" onClick={() => setEpisodes((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Remove</button>
                        </div>
                      </div>)
                    )}
                    <ToolbarButton variant="secondary" onClick={() => setEpisodes((e) => [...e, { id: Date.now(), title: "", url: "", visible: true }])}>Add episode</ToolbarButton>
                  </div>
                </Field>
              )}
            </CardGlow>
          </section>

          {/* Motivation */}
          <section id="sec-motivation">
            <SectionHeader id="sec-motivation" icon={Megaphone} title="Motivation Broadcast" subtitle="Send a message to all clients (personalized)." />
            <CardGlow>
              <Field label="Message">
                <textarea className="inp min-h-[100px]" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} />
                <div className="pt-1 text-xs text-slate-500">Use {"{name}"} placeholder.</div>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Preview name"><input className="inp" value={broadcastPreviewName} onChange={(e) => setBroadcastPreviewName(e.target.value)} /></Field>
                <Field label="Preview"><div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{previewMsg}</div></Field>
              </div>
              <div className="pt-2">
                <ToolbarButton onClick={() => alert("Broadcast sent (mock)")}>Send to all</ToolbarButton>
              </div>
            </CardGlow>
          </section>

          {/* Reminders */}
          <section id="sec-reminders">
            <SectionHeader id="sec-reminders" icon={Bell} title="Reminders" subtitle="Training, meal & water times; coach check-in alerts." />
            <CardGlow>
              <Field label="Training days">
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const active = trainingDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setTrainingDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))}
                        className={[
                          "rounded-md px-3 py-1 text-sm shadow-sm ring-1 ring-inset transition",
                          active ? "bg-indigo-600 text-white ring-indigo-600 hover:bg-indigo-700" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <MultiTimeRow label="Training times" times={trainingTimes} setTimes={setTrainingTimes} />
              <MultiTimeRow label="Meal reminders" times={mealTimes} setTimes={setMealTimes} />
              <MultiTimeRow label="Water reminders" times={waterTimes} setTimes={setWaterTimes} />
              <Field label="Coach check-in alerts"><Switch checked={checkinAlerts} onChange={setCheckinAlerts} /></Field>
            </CardGlow>
          </section>
        </main>
      </div>

      <SaveBar saving={saving} onSave={onSave} onCancel={() => history.back()} />

      {/* Dialogs */}
      <ConfirmDialog
        open={openTokenHelp}
        title="Where do I get my API token?"
        desc={<div className="space-y-2 text-sm text-slate-700"><p>Go to <b>Admin → API & Webhooks</b>, click <b>Create token</b>, then copy and paste it here.</p><p>Keep your token secret. Revoke/rotate anytime.</p></div>}
        confirmText="Got it"
        onConfirm={() => setOpenTokenHelp(false)}
        onClose={() => setOpenTokenHelp(false)}
      />

      <style jsx>{`
        .inp { @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );
}

/* ============= Small pretty building blocks ============= */
function CardGlow({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={spring}
      className="relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_40px_-24px_rgba(99,102,241,.45)]"
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/10" />
      <div className="relative z-[1] space-y-4">{children}</div>
    </motion.div>
  );
}

function ThemePreview({ title, color }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">{title} preview</div>
      <div className="p-4" style={{ background: `linear-gradient(135deg, ${color}, ${shade(color, -20)})` }}>
        <div className="rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-800 backdrop-blur">Button • Chip • Badge</div>
      </div>
    </div>
  );
}
