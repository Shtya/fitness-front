"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import Kanban from "./Kanban";

import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, SearchInput, Select, DateRangeControl,
  SegmentPicker, TagInput, Badge, spring
} from "@/components/dashboard/ui/UI";

import { Users, Mail, MessageSquare, Plus, Download, Pencil, Trash2, Send, Zap, Copy } from "lucide-react";

/* ===== Mock data store ===== */
const seedLeads = [
  { id: "L-1001", name: "Ahmed Samir",  email: "ahmed@example.com",  phone: "+20 100 000 0001", stage: "new",       tags:["facebook","evening"], score: 36, createdAt: "2025-08-28T10:00:00Z" },
  { id: "L-1002", name: "Mona Fathy",   email: "mona@example.com",   phone: "+20 100 000 0002", stage: "qualified", tags:["website"], score: 62, createdAt: "2025-08-29T09:20:00Z" },
  { id: "L-1003", name: "Omar Khaled",  email: "omar@example.com",   phone: "+20 100 000 0003", stage: "trial",     tags:["trial"], score: 75, createdAt: "2025-08-20T17:00:00Z" },
  { id: "L-1004", name: "Sara Nabil",   email: "sara@example.com",   phone: "+20 100 000 0004", stage: "member",    tags:["converted"], score: 90, createdAt: "2025-08-12T12:30:00Z" },
];

const seedTemplates = [
  { id: "T-1", name: "Welcome Lead (Email)", channel: "email", subject: "Welcome to {{gymName}}!", body: "Hi {{firstName}}, thanks for your interest…", updatedAt: "2025-08-20T12:00:00Z" },
  { id: "T-2", name: "Trial Reminder (SMS)", channel: "sms", body: "Hi {{firstName}}, your trial is tomorrow at {{time}}. Reply YES to confirm.", updatedAt: "2025-08-22T15:00:00Z" },
];

const seedCampaigns = [
  { id: "C-501", name: "September Promo", channel: "email", audience: "Leads (All)", status: "scheduled", scheduledAt: "2025-09-01T09:00:00Z" },
];

const seedRules = [
  { id: "R-1", name: "New lead → Welcome SMS", enabled: true, trigger: "new_lead", actions: ["send_sms:T-2"] },
];

/* ===== Page ===== */
export default function CRMPage() {
  const [tab, setTab] = useState("inbox"); // inbox | pipeline | campaigns | templates | automations
  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [rules, setRules] = useState([]);

  // filters
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // modals/forms
  const [openNewLead, setOpenNewLead] = useState(false);
  const [leadForm, setLeadForm] = useState({ name:"", email:"", phone:"", tags:[], source:"manual" });

  const [openTemplate, setOpenTemplate] = useState(false);
  const [tplForm, setTplForm] = useState({ id:null, name:"", channel:"email", subject:"", body:"" });

  const [openCampaign, setOpenCampaign] = useState(false);
  const [cmpForm, setCmpForm] = useState({ name:"", channel:"email", templateId:"", audience:{ role:"Lead", status:"All", tags:[], query:"" }, schedule:"now" });

  const [openRule, setOpenRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name:"", enabled:true, trigger:"new_lead", actions:[], templateId:"" });

  useEffect(() => {
    // simulate fetch
    setLoading(true);
    setTimeout(()=>{
      setLeads(seedLeads);
      setTemplates(seedTemplates);
      setCampaigns(seedCampaigns);
      setRules(seedRules);
      setLoading(false);
    }, 500);
  }, []);

  /* ===== Derived ===== */
  const inboxCols = [
    { header: "Name", accessor: "name", sortable: true },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone" },
    { header: "Tags", accessor: "tags", cell: r => <div className="flex flex-wrap gap-1">{(r.tags||[]).map(t=> <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">#{t}</span>)}</div> },
    { header: "Stage", accessor: "stage", cell: r => <Badge color={r.stage==="member"?"emerald":r.stage==="trial"?"blue":r.stage==="qualified"?"indigo":"slate"}>{r.stage}</Badge> },
    { header: "Created", accessor: "createdAt", sortable: true, cell: r => new Date(r.createdAt).toLocaleString() },
    { header: "Actions", accessor: "_", cell: r => (
      <div className="flex items-center gap-2">
        <button className="btn-sm" title="Convert to Pipeline" onClick={()=>moveStage(r.id, "qualified")}><ArrowRight /></button>
        <button className="btn-sm" title="Edit" onClick={()=>editLead(r)}><Pencil className="w-4 h-4" /></button>
        <button className="btn-sm" title="Delete" onClick={()=>removeLead(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    ) },
  ];

  const templateCols = [
    { header: "Name", accessor: "name" },
    { header: "Channel", accessor: "channel", cell: r => <Badge color={r.channel==="sms"?"blue":"indigo"}>{r.channel.toUpperCase()}</Badge> },
    { header: "Updated", accessor: "updatedAt", cell: r => new Date(r.updatedAt).toLocaleString() },
    { header: "Actions", accessor: "_", cell: r => (
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>editTpl(r)}><Pencil className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>duplicateTpl(r)} title="Duplicate"><Copy className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>removeTpl(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    ) }
  ];

  const campaignCols = [
    { header: "Name", accessor: "name" },
    { header: "Channel", accessor: "channel", cell: r => <Badge color={r.channel==="sms"?"blue":"indigo"}>{r.channel.toUpperCase()}</Badge> },
    { header: "Audience", accessor: "audience" },
    { header: "Status", accessor: "status", cell: r => <Badge color={r.status==="sent"?"emerald":r.status==="scheduled"?"amber":"slate"}>{r.status}</Badge> },
    { header: "Scheduled", accessor: "scheduledAt", cell: r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : "—" },
    { header: "Actions", accessor: "_", cell: r => (
      <div className="flex items-center gap-2">
        {r.status!=="sent" && <button className="btn-sm" onClick={()=>sendNow(r.id)} title="Send now"><Send className="w-4 h-4" /></button>}
        <button className="btn-sm" onClick={()=>removeCampaign(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    ) }
  ];

  const rulesCols = [
    { header: "Rule", accessor: "name" },
    { header: "Trigger", accessor: "trigger" },
    { header: "Enabled", accessor: "enabled", cell: r => <Badge color={r.enabled?"emerald":"slate"}>{r.enabled?"On":"Off"}</Badge> },
    { header: "Actions", accessor: "_", cell: r => (
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>toggleRule(r.id)}>{r.enabled?"Disable":"Enable"}</button>
        <button className="btn-sm" onClick={()=>editRule(r)}><Pencil className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>removeRule(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    ) }
  ];

  const leadsFiltered = useMemo(() => {
    let list = leads.slice();
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l => `${l.name} ${l.email} ${l.phone}`.toLowerCase().includes(s));
    }
    if (from) list = list.filter(l => l.createdAt >= from);
    if (to)   list = list.filter(l => l.createdAt <= addDay(to));
    return list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }, [leads, search, from, to]);

  /* ===== Actions ===== */
  function moveStage(id, toStage){
    setLeads(list => list.map(l => l.id===id ? { ...l, stage: toStage } : l));
  }
  function editLead(l){
    setLeadForm({ name:l.name, email:l.email, phone:l.phone, tags:l.tags||[], source:l.source||"manual" });
    setOpenNewLead(true);
  }
  function removeLead(id){ setLeads(list => list.filter(l => l.id!==id)); }

  function saveLead(e){
    e.preventDefault();
    setLeads(list => [{ id: "L-"+Date.now(), stage:"new", score: 30, createdAt: new Date().toISOString(), ...leadForm }, ...list]);
    setLeadForm({ name:"", email:"", phone:"", tags:[], source:"manual" });
    setOpenNewLead(false);
  }

  function editTpl(t){ setTplForm({ ...t }); setOpenTemplate(true); }
  function duplicateTpl(t){ const copy = { ...t, id: "T-"+Date.now(), name: t.name + " (Copy)", updatedAt: new Date().toISOString() }; setTemplates(arr=>[copy, ...arr]); }
  function removeTpl(id){ setTemplates(arr => arr.filter(t => t.id!==id)); }
  function saveTpl(e){
    e.preventDefault();
    setTemplates(arr => tplForm.id
      ? arr.map(t => t.id===tplForm.id? { ...tplForm, updatedAt: new Date().toISOString() } : t)
      : [{ id:"T-"+Date.now(), ...tplForm, updatedAt: new Date().toISOString() }, ...arr]
    );
    setOpenTemplate(false); setTplForm({ id:null, name:"", channel:"email", subject:"", body:"" });
  }

  function saveCampaign(e){
    e.preventDefault();
    const tpl = templates.find(t => t.id===cmpForm.templateId);
    const rec = { id: "C-"+Date.now(), name: cmpForm.name, channel: cmpForm.channel, audience: humanAudience(cmpForm.audience), status: cmpForm.schedule==="now" ? "sent" : "scheduled", scheduledAt: cmpForm.schedule==="now" ? new Date().toISOString() : new Date(Date.now()+3600*1000).toISOString(), templateId: tpl?.id };
    setCampaigns(arr => [rec, ...arr]);
    setOpenCampaign(false);
  }
  function sendNow(id){ setCampaigns(arr => arr.map(c => c.id===id? { ...c, status:"sent", scheduledAt: new Date().toISOString() } : c)); }
  function removeCampaign(id){ setCampaigns(arr => arr.filter(c => c.id!==id)); }

  function editRule(r){ setRuleForm({ ...r }); setOpenRule(true); }
  function toggleRule(id){ setRules(arr => arr.map(r => r.id===id? { ...r, enabled: !r.enabled } : r)); }
  function removeRule(id){ setRules(arr => arr.filter(r => r.id!==id)); }
  function saveRule(e){
    e.preventDefault();
    const rec = { id: ruleForm.id || "R-"+Date.now(), ...ruleForm };
    setRules(arr => ruleForm.id ? arr.map(r => r.id===rec.id? rec : r) : [rec, ...arr]);
    setOpenRule(false); setRuleForm({ name:"", enabled:true, trigger:"new_lead", actions:[], templateId:"" });
  }

  function exportCSV(){
    const keys = ["id","name","email","phone","stage","tags","score","createdAt"];
    const rows = [keys, ...leadsFiltered.map(l => [l.id,l.name,l.email,l.phone,l.stage,(l.tags||[]).join("|"),l.score,l.createdAt])];
    const csv = rows.map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a=document.createElement("a"); a.href=url; a.download="leads.csv"; a.click(); URL.revokeObjectURL(url);
  }

  /* ===== Render ===== */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="CRM & Leads"
        subtitle="Capture leads, nurture with campaigns, automate follow-ups."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Download} variant="secondary" onClick={exportCSV}>Export</ToolbarButton>
            <ToolbarButton icon={Plus} onClick={()=>setOpenNewLead(true)}>New Lead</ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="crm-tabs"
        tabs={[
          { key:"inbox",     label:"Leads Inbox", icon: Users },
          { key:"pipeline",  label:"Pipeline",    icon: Users },
          { key:"campaigns", label:"Campaigns",   icon: Mail },
          { key:"templates", label:"Templates",   icon: MessageSquare },
          { key:"rules",     label:"Automations", icon: Zap },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== Inbox ===== */}
      {tab === "inbox" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name/email/phone…" />
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <div className="text-xs text-slate-600">
              Web form: <code>/lead</code> · Webhook: <code>/api/leads/webhook</code>
            </div>
          </div>
          <div className="mt-3">
            <DataTable columns={inboxCols} data={leadsFiltered} loading={loading} pagination itemsPerPage={10} />
            {!loading && !leadsFiltered.length && <EmptyState title="No leads" subtitle="Connect your web form or import a CSV." />}
          </div>
        </motion.div>
      )}

      {/* ===== Pipeline / Kanban ===== */}
      {tab === "pipeline" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}>
          <Kanban leads={leads} onMove={moveStage} />
          <div className="mt-3 text-xs text-slate-600">Drag cards between stages to advance the pipeline.</div>
        </motion.div>
      )}

      {/* ===== Campaigns ===== */}
      {tab === "campaigns" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Email/SMS Campaigns</div>
            <ToolbarButton icon={Plus} onClick={()=>setOpenCampaign(true)}>New Campaign</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={campaignCols} data={campaigns} loading={loading} pagination itemsPerPage={8} />
            {!loading && !campaigns.length && <EmptyState title="No campaigns" subtitle="Create your first blast using a template." />}
          </div>
        </motion.div>
      )}

      {/* ===== Templates ===== */}
      {tab === "templates" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Message Templates</div>
            <ToolbarButton icon={Plus} onClick={()=>{ setTplForm({ id:null, name:"", channel:"email", subject:"", body:"" }); setOpenTemplate(true); }}>New Template</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={templateCols} data={templates} loading={loading} pagination itemsPerPage={10} />
            {!loading && !templates.length && <EmptyState title="No templates" subtitle="Create SMS or Email templates with variables." />}
          </div>
          <div className="mt-3 text-xs text-slate-600">
            Variables supported e.g. <code>{{firstName}}</code>, <code>{{gymName}}</code>, <code>{{time}}</code>.
          </div>
        </motion.div>
      )}

      {/* ===== Automations ===== */}
      {tab === "rules" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Automation Rules</div>
            <ToolbarButton icon={Plus} onClick={()=>setOpenRule(true)}>New Rule</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={rulesCols} data={rules} loading={loading} pagination itemsPerPage={8} />
            {!loading && !rules.length && <EmptyState title="No automations" subtitle="Create triggers for leads or payments." />}
          </div>
          <div className="mt-3 text-xs text-slate-600">
            Triggers: <code>new_lead</code>, <code>missed_checkin</code>, <code>payment_failed</code> · Actions: <code>send_email</code>, <code>send_sms</code>, <code>add_tag</code>, <code>create_task</code>.
          </div>
        </motion.div>
      )}

      {/* ===== Modals ===== */}

      {/* New/Edit Lead */}
      <Modal open={openNewLead} onClose={()=>setOpenNewLead(false)} title="Add Lead">
        <form onSubmit={saveLead} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Name"><input className="inp" value={leadForm.name} onChange={(e)=>setLeadForm(f=>({ ...f, name:e.target.value }))} required /></Field>
            <Field label="Source">
              <select className="inp" value={leadForm.source} onChange={(e)=>setLeadForm(f=>({ ...f, source:e.target.value }))}>
                {["manual","website","facebook","instagram","referral"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Email"><input className="inp" type="email" value={leadForm.email} onChange={(e)=>setLeadForm(f=>({ ...f, email:e.target.value }))} /></Field>
            <Field label="Phone"><input className="inp" value={leadForm.phone} onChange={(e)=>setLeadForm(f=>({ ...f, phone:e.target.value }))} /></Field>
          </div>
          <Field label="Tags"><TagInput value={leadForm.tags} onChange={(tags)=>setLeadForm(f=>({ ...f, tags }))} /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">Save</button></div>
        </form>
      </Modal>

      {/* New/Edit Template */}
      <Modal open={openTemplate} onClose={()=>setOpenTemplate(false)} title={tplForm.id ? "Edit Template" : "New Template"}>
        <form onSubmit={saveTpl} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Name"><input className="inp" value={tplForm.name} onChange={(e)=>setTplForm(f=>({ ...f, name:e.target.value }))} required /></Field>
            <Field label="Channel">
              <select className="inp" value={tplForm.channel} onChange={(e)=>setTplForm(f=>({ ...f, channel:e.target.value }))}>
                <option value="email">Email</option><option value="sms">SMS</option>
              </select>
            </Field>
            {tplForm.channel==="email" && <Field label="Subject"><input className="inp" value={tplForm.subject} onChange={(e)=>setTplForm(f=>({ ...f, subject:e.target.value }))} /></Field>}
          </div>
          <Field label="Body">
            <textarea className="inp" rows={8} value={tplForm.body} onChange={(e)=>setTplForm(f=>({ ...f, body:e.target.value }))} placeholder="Use {{firstName}} etc." />
          </Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{tplForm.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* New Campaign */}
      <Modal open={openCampaign} onClose={()=>setOpenCampaign(false)} title="New Campaign">
        <form onSubmit={saveCampaign} className="space-y-3">
          <Field label="Name"><input className="inp" value={cmpForm.name} onChange={(e)=>setCmpForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Channel">
              <select className="inp" value={cmpForm.channel} onChange={(e)=>setCmpForm(f=>({ ...f, channel:e.target.value }))}>
                <option value="email">Email</option><option value="sms">SMS</option>
              </select>
            </Field>
            <Field label="Template">
              <select className="inp" value={cmpForm.templateId} onChange={(e)=>setCmpForm(f=>({ ...f, templateId:e.target.value }))} required>
                <option value="">Select template…</option>
                {templates.filter(t=>t.channel===cmpForm.channel).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Schedule">
              <select className="inp" value={cmpForm.schedule} onChange={(e)=>setCmpForm(f=>({ ...f, schedule:e.target.value }))}>
                <option value="now">Send now</option><option value="later">Schedule (1h from now)</option>
              </select>
            </Field>
          </div>
          <Field label="Audience"><SegmentPicker value={cmpForm.audience} onChange={(aud)=>setCmpForm(f=>({ ...f, audience: aud }))} /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">Create</button></div>
        </form>
      </Modal>

      {/* New/Edit Automation */}
      <Modal open={openRule} onClose={()=>setOpenRule(false)} title={ruleForm.id ? "Edit Automation" : "New Automation"}>
        <form onSubmit={saveRule} className="space-y-3">
          <Field label="Name"><input className="inp" value={ruleForm.name} onChange={(e)=>setRuleForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Trigger">
              <select className="inp" value={ruleForm.trigger} onChange={(e)=>setRuleForm(f=>({ ...f, trigger:e.target.value }))}>
                <option value="new_lead">New lead</option>
                <option value="missed_checkin">Missed check-in</option>
                <option value="payment_failed">Payment failed</option>
              </select>
            </Field>
            <Field label="Action(s)">
              <select multiple className="inp" value={ruleForm.actions} onChange={(e)=>setRuleForm(f=>({ ...f, actions: Array.from(e.target.selectedOptions).map(o=>o.value) }))}>
                <option value="send_email">Send email</option>
                <option value="send_sms">Send SMS</option>
                <option value="add_tag">Add tag</option>
                <option value="create_task">Create task</option>
              </select>
            </Field>
            <Field label="Template (for email/SMS)">
              <select className="inp" value={ruleForm.templateId} onChange={(e)=>setRuleForm(f=>({ ...f, templateId:e.target.value }))}>
                <option value="">—</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">{ruleForm.id ? "Save" : "Create"}</button></div>
        </form>
      </Modal>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50; }
      `}</style>
    </div>
  );
}

function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
function addDay(dateStr){ const d=new Date(dateStr); d.setDate(d.getDate()+1); return d.toISOString(); }
function humanAudience(a){ const z=[]; if(a.role&&a.role!=="All") z.push(a.role); if(a.status&&a.status!=="All") z.push(a.status); if((a.tags||[]).length) z.push(`#${a.tags.join(", #")}`); if(a.query) z.push(`"${a.query}"`); return z.join(" · ")||"All leads"; }
function ArrowRight(){ return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
