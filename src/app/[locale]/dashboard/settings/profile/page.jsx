"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PageHeader, ToolbarButton, SectionCard, Field, SaveBar, Switch, AvatarUpload, spring
} from "@/components/dashboard/ui/UI";
import { UserCog, Shield, Globe, Bell, Key } from "lucide-react";

export default function ProfileSettingsPage() {
  const [saving, setSaving] = useState(false);

  // form state (mock values)
  const [avatar, setAvatar] = useState(null);
  const [first, setFirst] = useState("Mohamed");
  const [last, setLast] = useState("El Coach");
  const [email, setEmail] = useState("coach@example.com");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [lang, setLang] = useState("en");
  const [twofa, setTwofa] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // password
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  const onSave = async () => {
    setSaving(true);
    // TODO: call your API here
    setTimeout(() => { setSaving(false); alert("Profile saved (mock)."); }, 900);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCog}
        title="Profile Settings"
        subtitle="Manage your personal info, preferences and account security."
        actions={<ToolbarButton icon={Key} href="/dashboard/admin/audit-logs" variant="secondary">Audit</ToolbarButton>}
      />

      {/* Personal */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
        <SectionCard title="Personal Information" subtitle="Your profile details for clients and teammates.">
          <Field label="Avatar"><AvatarUpload name={`${first} ${last}`} onFile={setAvatar} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
            <Field label="First name"><input className="inp" value={first} onChange={(e)=>setFirst(e.target.value)} /></Field>
            <Field label="Last name"><input className="inp" value={last} onChange={(e)=>setLast(e.target.value)} /></Field>
            <Field label="Email"><input className="inp" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></Field>
            <Field label="Phone (optional)"><input className="inp" value={phone} onChange={(e)=>setPhone(e.target.value)} /></Field>
          </div>
        </SectionCard>

        {/* Preferences */}
        <SectionCard title="Preferences" subtitle="Language & time defaults" >
          <Field label="Language">
            <select className="inp" value={lang} onChange={(e)=>setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </Field>
          <Field label="Time zone">
            <select className="inp" value={timezone} onChange={(e)=>setTimezone(e.target.value)}>
              {["Africa/Cairo","Europe/London","Asia/Dubai","America/New_York"].map(z => <option key={z}>{z}</option>)}
            </select>
          </Field>
          <Field label="Weekly digest emails" className="md:col-span-2"><Switch checked={weeklyDigest} onChange={setWeeklyDigest} /></Field>
          <Field label="Product updates" className="md:col-span-2"><Switch checked={marketing} onChange={setMarketing} /></Field>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" subtitle="Password & two-factor authentication">
          <Field label="Current password"><input className="inp" type="password" value={pwd.current} onChange={(e)=>setPwd(p=>({ ...p, current: e.target.value }))} /></Field>
          <Field label="New password"><input className="inp" type="password" value={pwd.next} onChange={(e)=>setPwd(p=>({ ...p, next: e.target.value }))} /></Field>
          <Field label="Confirm new password"><input className="inp" type="password" value={pwd.confirm} onChange={(e)=>setPwd(p=>({ ...p, confirm: e.target.value }))} /></Field>
          <Field label="Two-factor authentication" hint="Add an extra layer of security to your account." className="md:col-span-2">
            <Switch checked={twofa} onChange={setTwofa} />
          </Field>
        </SectionCard>
      </motion.div>

      <SaveBar saving={saving} onSave={onSave} onCancel={()=>history.back()} />

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );
}
