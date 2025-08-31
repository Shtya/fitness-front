"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PageHeader, ToolbarButton, SectionCard, Field, SaveBar, Switch, ColorSwatchPicker, KeyField,
  ConfirmDialog, spring
} from "@/components/dashboard/ui/UI";
import { ServerCog, Building2, Palette, Globe, BadgeDollarSign, ShieldCheck, Database, Upload, Download } from "lucide-react";

export default function SystemSettingsPage() {
  const [saving, setSaving] = useState(false);

  // Org
  const [orgName, setOrgName] = useState("Amazing Gym");
  const [domain, setDomain] = useState("amazing.gym");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [currency, setCurrency] = useState("EGP");

  // Branding
  const [brand, setBrand] = useState("#4F46E5");
  const [dark, setDark] = useState(false);
  const [logo, setLogo] = useState(null);

  // Units & defaults
  const [weightUnit, setWeightUnit] = useState("kg");
  const [lengthUnit, setLengthUnit] = useState("cm");
  const [energyUnit, setEnergyUnit] = useState("kcal");

  // Policies
  const [allowSignup, setAllowSignup] = useState(true);
  const [coachCanExport, setCoachCanExport] = useState(true);
  const [clientCanMessage, setClientCanMessage] = useState(true);

  // Integrations (mock keys)
  const [stripeKey] = useState("sk_live_1a2b3c4d5e6f");
  const [cloudKey] = useState("cld_9f8e7d6c5b4a");

  // Danger
  const [openReset, setOpenReset] = useState(false);

  const onSave = async () => {
    setSaving(true);
    // TODO call your API
    setTimeout(() => { setSaving(false); alert("System settings saved (mock)."); }, 900);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ServerCog}
        title="System Settings"
        subtitle="Organization defaults, branding, permissions and integrations."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Download} variant="secondary" onClick={()=>alert("Export settings JSON (mock).")}>Export</ToolbarButton>
            <ToolbarButton icon={Upload} variant="secondary" onClick={()=>alert("Import settings JSON (mock).")}>Import</ToolbarButton>
          </div>
        }
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
        {/* Organization */}
        <SectionCard title="Organization" subtitle="Gym identity and locale defaults.">
          <Field label="Gym name"><input className="inp" value={orgName} onChange={(e)=>setOrgName(e.target.value)} /></Field>
          <Field label="Subdomain / domain"><input className="inp" value={domain} onChange={(e)=>setDomain(e.target.value)} /></Field>
          <Field label="Time zone">
            <select className="inp" value={timezone} onChange={(e)=>setTimezone(e.target.value)}>
              {["Africa/Cairo","Europe/London","Asia/Dubai","America/New_York"].map(z => <option key={z}>{z}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select className="inp" value={currency} onChange={(e)=>setCurrency(e.target.value)}>
              {["EGP","USD","EUR","GBP","SAR","AED"].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </SectionCard>

        {/* Branding */}
        <SectionCard title="Branding" subtitle="Colors, theme, and logo.">
          <Field label="Brand color"><ColorSwatchPicker value={brand} onChange={setBrand} /></Field>
          <Field label="Dark theme">
            <div className="flex items-center gap-3">
              <Switch checked={dark} onChange={setDark} />
              <span className="text-sm text-slate-600">{dark ? "Dark" : "Light"}</span>
            </div>
          </Field>
          <Field label="Logo">
            <label className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer inline-flex items-center gap-2">
              Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>setLogo(e.target.files?.[0] || null)} />
            </label>
          </Field>
          <Field label="Preview">
            <div className="rounded-xl border border-slate-200 p-4" style={{ background: `linear-gradient(135deg, ${brand}, ${shade(brand, -15)})` }}>
              <div className="text-white font-semibold">Amazing Gym</div>
              <div className="mt-1 text-white/80 text-sm">Buttons, highlights and pills use your brand color</div>
            </div>
          </Field>
        </SectionCard>

        {/* Defaults */}
        <SectionCard title="Measurement Defaults" subtitle="Used across workouts, check-ins and progress.">
          <Field label="Weight unit">
            <select className="inp" value={weightUnit} onChange={(e)=>setWeightUnit(e.target.value)}>
              <option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option>
            </select>
          </Field>
          <Field label="Length unit">
            <select className="inp" value={lengthUnit} onChange={(e)=>setLengthUnit(e.target.value)}>
              <option value="cm">Centimeters (cm)</option><option value="in">Inches (in)</option>
            </select>
          </Field>
          <Field label="Energy unit">
            <select className="inp" value={energyUnit} onChange={(e)=>setEnergyUnit(e.target.value)}>
              <option value="kcal">Calories (kcal)</option><option value="kJ">Kilojoules (kJ)</option>
            </select>
          </Field>
          <Field label="Client can message" hint="Allow clients to initiate messages with coaches.">
            <Switch checked={clientCanMessage} onChange={setClientCanMessage} />
          </Field>
          <Field label="Coaches can export data" hint="Allow exports of users, workouts, and progress as CSV.">
            <Switch checked={coachCanExport} onChange={setCoachCanExport} />
          </Field>
          <Field label="Public signup" hint="Allow users to request access via a public form.">
            <Switch checked={allowSignup} onChange={setAllowSignup} />
          </Field>
        </SectionCard>

        {/* Integrations */}
        <SectionCard title="Integrations" subtitle="Connect billing and media storage.">
          <Field label="Stripe Secret (server)">
            <KeyField value={stripeKey} masked />
          </Field>
          <Field label="Cloud Media Key">
            <KeyField value={cloudKey} masked />
          </Field>
          <Field label="Webhooks (see Admin → API & Webhooks)" className="md:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">Manage endpoints and test delivery under <span className="font-medium">Admin → API & Webhooks</span>.</div>
          </Field>
        </SectionCard>

        {/* Danger */}
        <SectionCard title="Danger Zone" subtitle="Be careful — destructive actions." >
          <Field label="Reset theme to default">
            <button onClick={()=>setOpenReset(true)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-red-600">
              Reset branding
            </button>
          </Field>
        </SectionCard>
      </motion.div>

      <SaveBar saving={saving} onSave={onSave} onCancel={()=>history.back()} />

      <ConfirmDialog
        open={openReset}
        title="Reset branding?"
        desc="Brand color, theme and logo will be restored to defaults."
        confirmText="Reset"
        onConfirm={() => { setBrand("#4F46E5"); setDark(false); setLogo(null); }}
        onClose={() => setOpenReset(false)}
      />

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );
}

/* small util to tweak color preview */
function shade(hex, amt=0){
  // naive lighten/darken hex
  let c = hex.replace("#","");
  if (c.length===3) c = c.split("").map(x=>x+x).join("");
  const n = [0,2,4].map(i => Math.max(0, Math.min(255, parseInt(c.slice(i,i+2),16)+Math.round(255*amt/100))));
  return `#${n.map(v=>v.toString(16).padStart(2,"0")).join("")}`;
}
