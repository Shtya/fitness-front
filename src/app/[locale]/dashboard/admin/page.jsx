"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, ToolbarButton, TabsPill, SearchInput, Select, DateRangeControl,
  Switch, Modal, EmptyState, HealthBadge, KeyField, ConfirmDialog, spring
} from "@/components/dashboard/ui/UI";
import {
  Settings, ShieldCheck, ServerCog, Activity, Database, Cloud, Lock, Globe, Download, Upload,
  RefreshCcw, Plus, Trash2, Key, Webhook, Shield, AlertTriangle, History
} from "lucide-react";

/* ---------------- Mock API ---------------- */
const seedFlags = [
  { key: "new-dashboard", name: "New Dashboard", on: true, env: "production" },
  { key: "beta-workouts", name: "Beta Workouts UI", on: false, env: "staging" },
  { key: "meal-ai", name: "AI Meal Suggestions", on: true, env: "production" },
];

const seedKeys = [
  { id: 1, name: "Server SDK", key: "sk_live_4f8a9c1a8f3b2e6d", createdAt: "2025-07-10", lastUsed: "2025-08-29", scope: "server" },
  { id: 2, name: "Webhook Secret", key: "whsec_7b2e8c9f0a1d3e4f", createdAt: "2025-07-15", lastUsed: "2025-08-28", scope: "webhook" },
];

const seedHooks = [
  { id: 1, url: "https://api.example.com/webhooks/gym", events: ["assignment.created","checkin.submitted"], status: "ok", lastDelivery: "2025-08-30T09:15:00Z" },
  { id: 2, url: "https://zapier.com/hooks/abc",          events: ["message.received"],                   status: "warn", lastDelivery: "2025-08-27T16:40:00Z" },
];

const seedHealth = [
  { id: "db",     name: "Database", status: "ok",   latency: 18,  details: "Postgres 15" },
  { id: "redis",  name: "Cache",    status: "ok",   latency: 3,   details: "Redis 7" },
  { id: "queue",  name: "Queue",    status: "warn", latency: 120, details: "2 delayed jobs" },
  { id: "email",  name: "Email",    status: "ok",   latency: 45,  details: "SMTP" },
  { id: "storage",name: "Storage",  status: "ok",   latency: 32,  details: "S3" },
];

const fetchAll = () => new Promise(res => setTimeout(()=>res({
  flags: seedFlags, keys: seedKeys, hooks: seedHooks, health: seedHealth,
  stats: { users: 842, trainers: 11, active: 691, storageGB: 38.4, version: "v1.7.3" }
}), 700));

/* ---------------- Page ---------------- */
export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | flags | api | security | health | backups
  const [data, setData] = useState({ flags: [], keys: [], hooks: [], health: [], stats: {} });

  // API keys/webhooks modals
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKey, setNewKey] = useState({ name: "", scope: "server" });
  const [revokeId, setRevokeId] = useState(null);

  const [createHookOpen, setCreateHookOpen] = useState(false);
  const [newHook, setNewHook] = useState({ url: "", events: ["assignment.created"] });
  const [pinging, setPinging] = useState(null);

  // Security
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [passwordPolicy, setPasswordPolicy] = useState("Strong"); // Basic | Strong | Strict

  // Backups
  const [lastBackup, setLastBackup] = useState("2025-08-27T23:10:00Z");
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAll().then((d) => { setData(d); setLoading(false); });
  }, []);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "flags",    label: "Feature Flags" },
    { key: "api",      label: "API & Webhooks" },
    { key: "security", label: "Security" },
    { key: "health",   label: "System Health" },
    { key: "backups",  label: "Backups" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="Admin"
        subtitle="Control flags, keys, webhooks, security, health, and backups."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={History} href="/dashboard/admin/audit-logs" variant="secondary">Audit Logs</ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={()=>{ setLoading(true); fetchAll().then(d=>{ setData(d); setLoading(false); }); }} variant="secondary">Refresh</ToolbarButton>
          </div>
        }
      />

      <div className="flex items-center justify-between">
        <TabsPill tabs={tabs} active={tab} onChange={setTab} id="admin-tabs" />
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat title="Total Users"  value={data.stats.users}  icon={<Shield className="w-4 h-4" />} />
            <Stat title="Active Users" value={data.stats.active} icon={<Activity className="w-4 h-4" />} />
            <Stat title="Trainers"     value={data.stats.trainers} icon={<ShieldCheck className="w-4 h-4" />} />
            <Stat title="Storage"      value={`${data.stats.storageGB ?? 0} GB`} icon={<Cloud className="w-4 h-4" />} />
            <Stat title="Version"      value={data.stats.version} icon={<ServerCog className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick flags */}
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Feature Flags</div>
              {loading ? <Skel lines={3} /> : (
                <ul className="space-y-2">
                  {data.flags.map(f=>(
                    <li key={f.key} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-slate-500">{f.key} · {f.env}</div>
                      </div>
                      <Switch checked={f.on} onChange={(v)=>toggleFlag(f.key, v)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent health */}
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">System Health</div>
              {loading ? <Skel lines={4} /> : (
                <ul className="space-y-2">
                  {data.health.map(h=>(
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{h.name}</div>
                        <div className="text-xs text-slate-500">{h.details}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{h.latency} ms</span>
                        <HealthBadge status={h.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick links */}
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Quick Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <ToolbarButton icon={Key} onClick={()=>setTab("api")} variant="secondary">Manage API Keys</ToolbarButton>
                <ToolbarButton icon={Webhook} onClick={()=>setTab("api")} variant="secondary">Webhooks</ToolbarButton>
                <ToolbarButton icon={Shield} onClick={()=>setTab("security")} variant="secondary">Security</ToolbarButton>
                <ToolbarButton icon={Database} onClick={()=>setTab("backups")} variant="secondary">Backups</ToolbarButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Feature Flags */}
      {tab === "flags" && (
        <Section title="Feature Flags" icon={ShieldCheck}>
          <FlagsTable flags={data.flags} onToggle={toggleFlag} loading={loading} />
        </Section>
      )}

      {/* API & Webhooks */}
      {tab === "api" && (
        <Section title="API & Webhooks" icon={Key}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Keys */}
            <div className="card-glow p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">API Keys</div>
                <ToolbarButton icon={Plus} onClick={()=>setCreateKeyOpen(true)}>Create Key</ToolbarButton>
              </div>
              {loading ? <Skel lines={4} /> : data.keys.length === 0 ? (
                <EmptyState title="No API keys" subtitle="Create a key for server or webhook usage." />
              ) : (
                <ul className="mt-3 space-y-3">
                  {data.keys.map(k => (
                    <li key={k.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{k.name}</div>
                          <div className="text-xs text-slate-500">scope: {k.scope} · created: {k.createdAt} · last used: {k.lastUsed || "—"}</div>
                        </div>
                        <button onClick={()=>setRevokeId(k.id)} className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 text-sm">
                          Revoke
                        </button>
                      </div>
                      <div className="mt-2">
                        <KeyField value={k.key} masked />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Webhooks */}
            <div className="card-glow p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Webhooks</div>
                <ToolbarButton icon={Plus} onClick={()=>setCreateHookOpen(true)}>Add Webhook</ToolbarButton>
              </div>
              {loading ? <Skel lines={4} /> : data.hooks.length === 0 ? (
                <EmptyState title="No webhooks" subtitle="Add an endpoint and subscribe to events." />
              ) : (
                <ul className="mt-3 space-y-3">
                  {data.hooks.map(h => (
                    <li key={h.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{h.url}</div>
                          <div className="text-xs text-slate-500 truncate">events: {h.events.join(", ")}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <HealthBadge status={h.status} />
                          <button
                            onClick={()=>ping(h.id)}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                          >
                            {pinging === h.id ? "Pinging…" : "Test"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Last delivery: {new Date(h.lastDelivery).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Create key modal */}
          <Modal open={createKeyOpen} onClose={()=>setCreateKeyOpen(false)} title="Create API Key">
            <form
              onSubmit={(e)=>{ e.preventDefault(); const id=Date.now();
                const key = (newKey.scope==="server"?"sk_":"whsec_")+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
                setData(d => ({ ...d, keys: [{ id, name: newKey.name||"New Key", scope: newKey.scope, key, createdAt: new Date().toISOString().slice(0,10) }, ...d.keys] }));
                setCreateKeyOpen(false); setNewKey({ name: "", scope: "server" });
              }}
              className="space-y-3"
            >
              <Field label="Name">
                <input className="inp" value={newKey.name} onChange={(e)=>setNewKey(k=>({ ...k, name: e.target.value }))} placeholder="e.g., Server SDK" required />
              </Field>
              <Field label="Scope">
                <select className="inp" value={newKey.scope} onChange={(e)=>setNewKey(k=>({ ...k, scope: e.target.value }))}>
                  <option value="server">Server</option>
                  <option value="webhook">Webhook</option>
                </select>
              </Field>
              <div className="flex items-center justify-end">
                <button className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Create</button>
              </div>
              <style jsx>{`.inp{@apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;}`}</style>
            </form>
          </Modal>

          {/* Add webhook modal */}
          <Modal open={createHookOpen} onClose={()=>setCreateHookOpen(false)} title="Add Webhook">
            <form
              onSubmit={(e)=>{ e.preventDefault(); const id=Date.now();
                setData(d => ({ ...d, hooks: [{ id, status: "ok", lastDelivery: new Date().toISOString(), ...newHook }, ...d.hooks] }));
                setCreateHookOpen(false); setNewHook({ url: "", events: ["assignment.created"] });
              }}
              className="space-y-3"
            >
              <Field label="URL"><input className="inp" value={newHook.url} onChange={(e)=>setNewHook(h=>({ ...h, url: e.target.value }))} placeholder="https://yourapp.com/webhooks" required /></Field>
              <Field label="Events">
                <select multiple className="inp h-28" value={newHook.events} onChange={(e)=>setNewHook(h=>({ ...h, events: Array.from(e.target.selectedOptions).map(o=>o.value) }))}>
                  {["assignment.created","assignment.updated","checkin.submitted","message.received","payment.succeeded"].map(ev=>(
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-center justify-end">
                <button className="px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white">Add</button>
              </div>
              <style jsx>{`.inp{@apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;}`}</style>
            </form>
          </Modal>

          {/* Revoke confirm */}
          <ConfirmDialog
            open={!!revokeId}
            title="Revoke API Key?"
            desc="This action invalidates the key immediately. Apps using it will fail until updated."
            confirmText="Revoke"
            onConfirm={()=>setData(d => ({ ...d, keys: d.keys.filter(k => k.id !== revokeId) }))}
            onClose={()=>setRevokeId(null)}
          />
        </Section>
      )}

      {/* Security */}
      {tab === "security" && (
        <Section title="Security" icon={Lock}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Policies</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enforce 2FA for staff</div>
                    <div className="text-xs text-slate-500">All admins/trainers must enable 2FA</div>
                  </div>
                  <Switch checked={enforce2FA} onChange={setEnforce2FA} />
                </div>
                <div>
                  <div className="font-medium">Session timeout</div>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="number" min={15} step={5} className="px-3 py-2 rounded-xl border border-slate-200 w-28" value={sessionMinutes} onChange={(e)=>setSessionMinutes(+e.target.value)} />
                    <span className="text-sm text-slate-600">minutes</span>
                  </div>
                </div>
                <div>
                  <div className="font-medium">Password policy</div>
                  <select className="mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white" value={passwordPolicy} onChange={(e)=>setPasswordPolicy(e.target.value)}>
                    {["Basic","Strong","Strict"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Danger Zone</div>
              <div className="space-y-3">
                <DangerItem
                  title="Flush cache"
                  desc="Clears Redis cache. Users may see slower first load."
                  action="Flush"
                  onConfirm={()=>alert("Cache flushed (mock).")}
                />
                <DangerItem
                  title="Rotate webhook secrets"
                  desc="Regenerate signing secrets and notify all endpoints."
                  action="Rotate"
                  onConfirm={()=>alert("Secrets rotated (mock).")}
                />
                <DangerItem
                  title="Delete tenant"
                  desc="Irreversible. Deletes all data for this organization."
                  action="Delete"
                  tone="red"
                  onConfirm={()=>alert("Tenant deleted (mock).")}
                />
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* System Health */}
      {tab === "health" && (
        <Section title="System Health" icon={ServerCog}>
          <div className="card-glow p-2">
            {loading ? (
              <div className="p-4"><Skel lines={6} /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Latency</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.health.map(h => (
                    <tr key={h.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{h.name}</td>
                      <td className="px-3 py-2"><HealthBadge status={h.status} /></td>
                      <td className="px-3 py-2">{h.latency} ms</td>
                      <td className="px-3 py-2 text-slate-600">{h.details}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={()=>alert(`Diagnostics for ${h.name} (mock).`)} className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm">
                          Diagnostics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>
      )}

      {/* Backups */}
      {tab === "backups" && (
        <Section title="Backups" icon={Database}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-glow p-5">
              <div className="font-semibold">Manual Backup</div>
              <div className="text-sm text-slate-600 mt-1">Last backup: {lastBackup ? new Date(lastBackup).toLocaleString() : "—"}</div>
              <div className="mt-3 flex items-center gap-2">
                <ToolbarButton icon={Download} onClick={()=>alert("Download latest backup (mock).")} variant="secondary">Download</ToolbarButton>
                <ToolbarButton icon={Upload} onClick={()=>alert("Restore from file (mock).")} variant="secondary">Restore</ToolbarButton>
                <ToolbarButton icon={Database} onClick={runBackup}>{backingUp ? "Creating…" : "Create Backup"}</ToolbarButton>
              </div>
            </div>

            <div className="card-glow p-5">
              <div className="font-semibold mb-2">Backup Strategy</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Daily snapshot</div>
                    <div className="text-xs text-slate-500">Runs at 02:00 local time</div>
                  </div>
                  <Switch checked onChange={()=>{}} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Encrypted</div>
                    <div className="text-xs text-slate-500">AES-256 server-side</div>
                  </div>
                  <Switch checked onChange={()=>{}} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Cross-region</div>
                    <div className="text-xs text-slate-500">Secondary region enabled</div>
                  </div>
                  <Switch checked onChange={()=>{}} />
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );

  /* -------- actions -------- */
  function toggleFlag(key, value){
    setData(d => ({ ...d, flags: d.flags.map(f => f.key === key ? { ...f, on: value } : f) }));
  }
  function ping(id){
    setPinging(id);
    setTimeout(()=>{
      setData(d => ({ ...d, hooks: d.hooks.map(h => h.id === id ? { ...h, status: "ok", lastDelivery: new Date().toISOString() } : h) }));
      setPinging(null);
    }, 900);
  }
  function runBackup(){
    setBackingUp(true);
    setTimeout(()=>{ setBackingUp(false); setLastBackup(new Date().toISOString()); alert("Backup created (mock)."); }, 1500);
  }
}

/* ---------------- Local blocks ---------------- */

function Section({ title, icon:Icon, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="w-5 h-5 text-slate-600" /> : null}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function FlagsTable({ flags=[], onToggle=()=>{}, loading }) {
  if (loading) return <div className="p-4"><Skel lines={4} /></div>;
  if (!flags.length) return <EmptyState title="No flags" subtitle="Add feature flags in your config." />;
  return (
    <div className="card-glow p-2">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="px-3 py-2">Flag</th>
            <th className="px-3 py-2">Key</th>
            <th className="px-3 py-2">Environment</th>
            <th className="px-3 py-2">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {flags.map(f => (
            <tr key={f.key} className="border-t border-slate-100">
              <td className="px-3 py-2 font-medium">{f.name}</td>
              <td className="px-3 py-2 font-mono text-sm">{f.key}</td>
              <td className="px-3 py-2">{f.env}</td>
              <td className="px-3 py-2">
                <Switch checked={f.on} onChange={(v)=>onToggle(f.key, v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="card-glow p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="text-2xl font-semibold">{value ?? "—"}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
    </div>
  );
}

function DangerItem({ title, desc, action, tone="amber", onConfirm }) {
  const [open, setOpen] = useState(false);
  const toneCls = tone==="red" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-amber-700 border-amber-200 hover:bg-amber-50";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-slate-500">{desc}</div>
        </div>
        <button onClick={()=>setOpen(true)} className={`px-3 py-1.5 rounded-lg border bg-white ${toneCls} text-sm`}>{action}</button>
      </div>
      <ConfirmDialog
        open={open}
        title={title}
        desc={desc}
        confirmText={action}
        onConfirm={onConfirm}
        onClose={()=>setOpen(false)}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Skel({ lines=3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_,i)=>(
        <div key={i} className="h-6 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}
