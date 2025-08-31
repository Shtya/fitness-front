"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, SearchInput, Select,
  DateRangeControl, SegmentPicker, FileDropzone, StatusPill, NumberStepper, Badge, spring
} from "@/components/dashboard/ui/UI";
import {
  Wrench, Package, Megaphone, Plus, Pencil, Trash2, Download, Check, Clock, AlertTriangle, Send, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react";

/* ================= Mock Data ================= */
const seedEquipment = [
  { id:"EQ-1", name:"Treadmill #1", location:"Cardio Zone", lastService:"2025-07-15", nextService:"2025-09-15", status:"ok", hours: 820 },
  { id:"EQ-2", name:"Rowing Machine", location:"Cardio Zone", lastService:"2025-06-20", nextService:"2025-08-20", status:"due", hours: 640 },
  { id:"EQ-3", name:"Squat Rack A", location:"Weights", lastService:"2025-08-10", nextService:"2025-11-10", status:"ok", hours: 400 },
  { id:"EQ-4", name:"Cable Machine", location:"Weights", lastService:"2025-05-02", nextService:"2025-07-02", status:"down", hours: 1200 },
];

const seedMaintLogs = [
  { id:"ML-9001", equipmentId:"EQ-4", date:"2025-06-30", type:"repair", notes:"Cable frayed - awaiting part", by:"Tech Omar", cost: 1200 },
  { id:"ML-9002", equipmentId:"EQ-2", date:"2025-07-20", type:"inspection", notes:"Belt tension adjusted", by:"Tech Ali", cost: 0 },
];

const seedInventory = [
  { id:"SKU-100", sku:"PROT-CHOC-1KG", name:"Whey Protein 1kg (Choc.)", category:"supplement", stock:18, reorderLevel:10, price: 22.00, status:"stock_ok" },
  { id:"SKU-101", sku:"CREA-300G",      name:"Creatine 300g",          category:"supplement", stock:6,  reorderLevel:12, price: 14.50, status:"low" },
  { id:"SKU-200", sku:"TEE-BLACK-M",    name:"Gym Tee Black (M)",      category:"merch",      stock:24, reorderLevel:8,  price: 12.00, status:"stock_ok" },
];

const seedBroadcasts = [
  { id:"B-1", name:"Class Schedule Update", channel:"in-app", audience:"All members", status:"sent", sentAt:"2025-08-29T09:00:00Z" },
];

/* ================= Page ================= */
export default function OperationsPage() {
  const [tab, setTab] = useState("maintenance"); // maintenance | inventory | broadcasts
  const [loading, setLoading] = useState(true);

  // collections
  const [equipment, setEquipment] = useState([]);
  const [logs, setLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // modals
  const [openEq, setOpenEq] = useState(false);
  const [eqForm, setEqForm] = useState({ id:null, name:"", location:"", lastService:"", nextService:"", status:"ok", hours:0 });

  const [openMaint, setOpenMaint] = useState(false);
  const [maintForm, setMaintForm] = useState({ equipmentId:"", date: todayISO(), type:"inspection", notes:"", by:"", cost:0 });

  const [openStock, setOpenStock] = useState(false);
  const [moveForm, setMoveForm] = useState({ id:"", type:"receive", qty:1 }); // receive | issue | adjust

  const [openItem, setOpenItem] = useState(false);
  const [itemForm, setItemForm] = useState({ id:null, sku:"", name:"", category:"supplement", stock:0, reorderLevel:0, price:0 });

  const [openBroadcast, setOpenBroadcast] = useState(false);
  const [bcForm, setBcForm] = useState({ name:"", channel:"in-app", templateId:"", audience:{ role:"Member", status:"All", tags:[], query:"" }, subject:"", body:"" });

  useEffect(() => {
    setLoading(true);
    setTimeout(()=>{
      setEquipment(seedEquipment);
      setLogs(seedMaintLogs);
      setItems(seedInventory);
      setBroadcasts(seedBroadcasts);
      setLoading(false);
    }, 500);
  }, []);

  /* ============== Derived ============== */
  const equipmentCols = [
    { header:"Equipment", accessor:"name" },
    { header:"Location", accessor:"location" },
    { header:"Usage (hrs)", accessor:"hours" },
    { header:"Last Service", accessor:"lastService" },
    { header:"Next Service", accessor:"nextService" },
    { header:"Status", accessor:"status", cell:r=> <StatusPill status={r.status} /> },
    { header:"Actions", accessor:"_", cell:r=>(
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>editEq(r)}><Pencil className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>openMaintFor(r)} title="Add maintenance"><Wrench className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>removeEq(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const logsFiltered = useMemo(() => {
    let list = logs.slice();
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(L => [L.notes, L.by, L.type, L.equipmentId].join(" ").toLowerCase().includes(s));
    }
    if (from) list = list.filter(L => L.date >= from);
    if (to)   list = list.filter(L => L.date <= to);
    return list.sort((a,b)=> b.date.localeCompare(a.date));
  }, [logs, q, from, to]);

  const logsCols = [
    { header:"Date", accessor:"date" },
    { header:"Equipment", accessor:"equipmentId", cell:r=> equipment.find(e=>e.id===r.equipmentId)?.name || r.equipmentId },
    { header:"Type", accessor:"type", cell:r=> <Badge color={r.type==="repair"?"rose":r.type==="inspection"?"indigo":"slate"}>{r.type}</Badge> },
    { header:"By", accessor:"by" },
    { header:"Cost", accessor:"cost", cell:r=> currency(r.cost) },
    { header:"Notes", accessor:"notes" },
  ];

  const itemCols = [
    { header:"SKU", accessor:"sku" },
    { header:"Name", accessor:"name" },
    { header:"Category", accessor:"category" },
    { header:"Stock", accessor:"stock" },
    { header:"Reorder", accessor:"reorderLevel" },
    { header:"Status", accessor:"status", cell:r=> <StatusPill status={r.stock <= r.reorderLevel ? "low" : "stock_ok"} /> },
    { header:"Price", accessor:"price", cell:r=> currency(r.price) },
    { header:"Actions", accessor:"_", cell:r=>(
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>openReceive(r)} title="Receive"><ArrowDownToLine className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>openIssue(r)} title="Issue"><ArrowUpFromLine className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>editItem(r)}><Pencil className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>removeItem(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const bcCols = [
    { header:"Name", accessor:"name" },
    { header:"Channel", accessor:"channel", cell:r=> <Badge color={r.channel==="sms"?"blue":r.channel==="email"?"indigo":"slate"}>{r.channel.toUpperCase()}</Badge> },
    { header:"Audience", accessor:"audience" },
    { header:"Status", accessor:"status", cell:r=> <Badge color={r.status==="sent"?"emerald":"amber"}>{r.status}</Badge> },
    { header:"Sent At", accessor:"sentAt", cell:r=> r.sentAt ? new Date(r.sentAt).toLocaleString() : "—" },
    { header:"Actions", accessor:"_", cell:r=> r.status!=="sent" ? <button className="btn-sm" onClick={()=>sendNow(r.id)}><Send className="w-4 h-4" /></button> : null },
  ];

  const lowStock = items.filter(i => i.stock <= i.reorderLevel);

  /* ============== Actions ============== */
  // Equipment
  function saveEq(e){ e.preventDefault();
    const rec = { ...eqForm, id: eqForm.id || "EQ-"+Date.now(), hours:+eqForm.hours };
    setEquipment(list => eqForm.id ? list.map(x=>x.id===rec.id? rec : x) : [rec, ...list]);
    setOpenEq(false); setEqForm({ id:null, name:"", location:"", lastService:"", nextService:"", status:"ok", hours:0 });
  }
  function editEq(eq){ setEqForm({ ...eq }); setOpenEq(true); }
  function removeEq(id){ setEquipment(list => list.filter(e => e.id!==id)); }
  function openMaintFor(eq){ setMaintForm(f=>({ ...f, equipmentId: eq.id })); setOpenMaint(true); }

  function saveMaint(e){ e.preventDefault();
    const rec = { ...maintForm, id:"ML-"+Date.now(), cost:+maintForm.cost };
    setLogs(list => [rec, ...list]);
    // bump equipment service dates/status
    setEquipment(list => list.map(eq => eq.id===rec.equipmentId
      ? { ...eq, lastService: rec.date, status: rec.type==="repair" ? "ok" : eq.status }
      : eq
    ));
    setOpenMaint(false); setMaintForm({ equipmentId:"", date: todayISO(), type:"inspection", notes:"", by:"", cost:0 });
  }

  // Inventory
  function saveItem(e){ e.preventDefault();
    const rec = { ...itemForm, id: itemForm.id || "SKU-"+Date.now(), price:+itemForm.price, stock:+itemForm.stock, reorderLevel:+itemForm.reorderLevel };
    setItems(list => itemForm.id ? list.map(x=>x.id===rec.id? rec : x) : [rec, ...list]);
    setOpenItem(false); setItemForm({ id:null, sku:"", name:"", category:"supplement", stock:0, reorderLevel:0, price:0 });
  }
  function editItem(it){ setItemForm({ ...it }); setOpenItem(true); }
  function removeItem(id){ setItems(list => list.filter(x => x.id!==id)); }

  function openReceive(it){ setMoveForm({ id: it.id, type:"receive", qty:1 }); setOpenStock(true); }
  function openIssue(it){ setMoveForm({ id: it.id, type:"issue", qty:1 }); setOpenStock(true); }
  function saveMove(e){ e.preventDefault();
    setItems(list => list.map(x => {
      if (x.id!==moveForm.id) return x;
      const delta = moveForm.type==="receive" ? moveForm.qty : moveForm.type==="issue" ? -moveForm.qty : 0;
      return { ...x, stock: Math.max(0, x.stock + delta) };
    }));
    setOpenStock(false);
  }

  // Broadcasts
  function saveBroadcast(e){ e.preventDefault();
    const rec = { id:"B-"+Date.now(), name:bcForm.name, channel: bcForm.channel, audience: humanAudience(bcForm.audience), status:"scheduled", sentAt:null };
    setBroadcasts(arr => [rec, ...arr]);
    setOpenBroadcast(false); setBcForm({ name:"", channel:"in-app", templateId:"", audience:{ role:"Member", status:"All", tags:[], query:"" }, subject:"", body:"" });
  }
  function sendNow(id){ setBroadcasts(arr => arr.map(b => b.id===id ? { ...b, status:"sent", sentAt: new Date().toISOString() } : b)); }

  function exportCSV(name, rows){
    const keys = Object.keys(rows[0]||{});
    const csv = [keys, ...rows.map(r => keys.map(k => Array.isArray(r[k]) ? r[k].join("|") : r[k]))]
      .map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
    const a=document.createElement("a"); a.href=url; a.download=`${name}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  /* ============== Render ============== */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wrench}
        title="Operations"
        subtitle="Maintenance, inventory, and broadcast announcements."
        actions={
          <div className="flex items-center gap-2">
            {tab==="maintenance" && <ToolbarButton icon={Plus} onClick={()=>setOpenEq(true)}>Add Equipment</ToolbarButton>}
            {tab==="inventory" && <ToolbarButton icon={Plus} onClick={()=>setOpenItem(true)}>New Item</ToolbarButton>}
            {tab==="broadcasts" && <ToolbarButton icon={Plus} onClick={()=>setOpenBroadcast(true)}>New Broadcast</ToolbarButton>}
          </div>
        }
      />

      <TabsPill
        id="ops-tabs"
        tabs={[
          { key:"maintenance", label:"Equipment Maintenance", icon: Wrench },
          { key:"inventory",   label:"Inventory",             icon: Package },
          { key:"broadcasts",  label:"Announcements",         icon: Megaphone },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== Maintenance ===== */}
      {tab==="maintenance" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-glow p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Equipment</div>
              <div className="flex items-center gap-2">
                <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search equipment…" />
                <ToolbarButton variant="secondary" icon={Download} onClick={()=>exportCSV("equipment", equipment)}>CSV</ToolbarButton>
              </div>
            </div>
            <div className="mt-3">
              <DataTable columns={equipmentCols} data={equipment.filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()))} loading={loading} pagination itemsPerPage={8} />
              {!loading && !equipment.length && <EmptyState title="No equipment" subtitle="Add your first machine or rack." />}
            </div>
          </div>
          <div className="card-glow p-4">
            <div className="font-semibold mb-2">Maintenance Logs</div>
            <div className="flex items-center gap-2">
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
              <ToolbarButton icon={Wrench} onClick={()=>setOpenMaint(true)}>Add Log</ToolbarButton>
            </div>
            <div className="mt-3 h-[380px] overflow-auto">
              <DataTable columns={logsCols} data={logsFiltered} loading={loading} pagination={false} />
            </div>
            {!loading && !logsFiltered.length && <EmptyState title="No logs" subtitle="Log inspections and repairs here." />}
            {equipment.some(e => e.status==="due" || e.status==="down") && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Some equipment requires attention.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== Inventory ===== */}
      {tab==="inventory" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Inventory</div>
            <div className="flex items-center gap-2">
              <Select label="Category" value={"All"} setValue={()=>{}} options={["All","supplement","merch","other"]} />
              <ToolbarButton variant="secondary" icon={Download} onClick={()=>exportCSV("inventory", items)}>CSV</ToolbarButton>
            </div>
          </div>
          <div className="mt-3">
            <DataTable columns={itemCols} data={items} loading={loading} pagination itemsPerPage={10} />
            {!loading && !items.length && <EmptyState title="No items" subtitle="Add supplements or merch to track stock." />}
            {lowStock.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Low stock: {lowStock.map(i=>i.name).join(", ")}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== Broadcasts ===== */}
      {tab==="broadcasts" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-glow p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Announcements & Broadcasts</div>
              <ToolbarButton icon={Plus} onClick={()=>setOpenBroadcast(true)}>New</ToolbarButton>
            </div>
            <div className="mt-3">
              <DataTable columns={bcCols} data={broadcasts} loading={loading} pagination itemsPerPage={8} />
              {!loading && !broadcasts.length && <EmptyState title="No broadcasts" subtitle="Create your first announcement." />}
            </div>
          </div>
          <div className="card-glow p-4">
            <div className="font-semibold mb-2">Tips</div>
            <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
              <li>Use segments (e.g., Members, Trial) from <em>CRM</em> for targeted messages.</li>
              <li>Channels supported: in-app, email, SMS (wire providers later).</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* ====== Modals ====== */}

      {/* Add/Edit Equipment */}
      <Modal open={openEq} onClose={()=>setOpenEq(false)} title={eqForm.id ? "Edit Equipment" : "Add Equipment"}>
        <form onSubmit={saveEq} className="space-y-3">
          <Field label="Name"><input className="inp" value={eqForm.name} onChange={e=>setEqForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          <Field label="Location"><input className="inp" value={eqForm.location} onChange={e=>setEqForm(f=>({ ...f, location:e.target.value }))} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Last Service"><input type="date" className="inp" value={eqForm.lastService} onChange={e=>setEqForm(f=>({ ...f, lastService:e.target.value }))} /></Field>
            <Field label="Next Service"><input type="date" className="inp" value={eqForm.nextService} onChange={e=>setEqForm(f=>({ ...f, nextService:e.target.value }))} /></Field>
            <Field label="Status">
              <select className="inp" value={eqForm.status} onChange={e=>setEqForm(f=>({ ...f, status:e.target.value }))}>
                <option value="ok">OK</option>
                <option value="due">Due Soon</option>
                <option value="down">Out of Service</option>
              </select>
            </Field>
          </div>
          <Field label="Usage Hours">
            <NumberStepper value={eqForm.hours} onChange={(v)=>setEqForm(f=>({ ...f, hours: v }))} />
          </Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{eqForm.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* Add Maintenance Log */}
      <Modal open={openMaint} onClose={()=>setOpenMaint(false)} title="Add Maintenance Log">
        <form onSubmit={saveMaint} className="space-y-3">
          <Field label="Equipment">
            <select className="inp" value={maintForm.equipmentId} onChange={e=>setMaintForm(f=>({ ...f, equipmentId:e.target.value }))} required>
              <option value="">Select…</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Date"><input type="date" className="inp" value={maintForm.date} onChange={e=>setMaintForm(f=>({ ...f, date:e.target.value }))} /></Field>
            <Field label="Type">
              <select className="inp" value={maintForm.type} onChange={e=>setMaintForm(f=>({ ...f, type:e.target.value }))}>
                <option value="inspection">Inspection</option>
                <option value="repair">Repair</option>
                <option value="service">Service</option>
              </select>
            </Field>
            <Field label="Cost"><input type="number" min={0} className="inp" value={maintForm.cost} onChange={e=>setMaintForm(f=>({ ...f, cost:+e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Performed by"><input className="inp" value={maintForm.by} onChange={e=>setMaintForm(f=>({ ...f, by:e.target.value }))} /></Field>
            <Field label="Notes"><input className="inp" value={maintForm.notes} onChange={e=>setMaintForm(f=>({ ...f, notes:e.target.value }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">Save Log</button></div>
        </form>
      </Modal>

      {/* Receive / Issue Stock */}
      <Modal open={openStock} onClose={()=>setOpenStock(false)} title={moveForm.type==="receive" ? "Receive Stock" : "Issue Stock"}>
        <form onSubmit={saveMove} className="space-y-3">
          <Field label="Item">
            <select className="inp" value={moveForm.id} onChange={e=>setMoveForm(m=>({ ...m, id:e.target.value }))}>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity"><NumberStepper value={moveForm.qty} min={1} onChange={(v)=>setMoveForm(m=>({ ...m, qty:v }))} /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{moveForm.type==="receive" ? "Receive" : "Issue"}</button></div>
        </form>
      </Modal>

      {/* Add/Edit Item */}
      <Modal open={openItem} onClose={()=>setOpenItem(false)} title={itemForm.id ? "Edit Item" : "New Item"}>
        <form onSubmit={saveItem} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="SKU"><input className="inp" value={itemForm.sku} onChange={e=>setItemForm(f=>({ ...f, sku:e.target.value }))} required /></Field>
            <Field label="Name"><input className="inp" value={itemForm.name} onChange={e=>setItemForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Category">
              <select className="inp" value={itemForm.category} onChange={e=>setItemForm(f=>({ ...f, category:e.target.value }))}>
                <option value="supplement">Supplement</option>
                <option value="merch">Merch</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Stock"><input type="number" className="inp" value={itemForm.stock} onChange={e=>setItemForm(f=>({ ...f, stock:+e.target.value }))} /></Field>
            <Field label="Reorder Level"><input type="number" className="inp" value={itemForm.reorderLevel} onChange={e=>setItemForm(f=>({ ...f, reorderLevel:+e.target.value }))} /></Field>
          </div>
          <Field label="Price"><input type="number" step="0.01" className="inp" value={itemForm.price} onChange={e=>setItemForm(f=>({ ...f, price:+e.target.value }))} /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{itemForm.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* New Broadcast */}
      <Modal open={openBroadcast} onClose={()=>setOpenBroadcast(false)} title="New Broadcast">
        <form onSubmit={saveBroadcast} className="space-y-3">
          <Field label="Name"><input className="inp" value={bcForm.name} onChange={e=>setBcForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Channel">
              <select className="inp" value={bcForm.channel} onChange={(e)=>setBcForm(f=>({ ...f, channel:e.target.value }))}>
                <option value="in-app">In-app</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </Field>
            <Field label="Subject (email)"><input className="inp" value={bcForm.subject} onChange={e=>setBcForm(f=>({ ...f, subject:e.target.value }))} placeholder="Optional" /></Field>
            <Field label=" "><div /></Field>
          </div>
          <Field label="Audience"><SegmentPicker value={bcForm.audience} onChange={(aud)=>setBcForm(f=>({ ...f, audience: aud }))} /></Field>
          <Field label="Message"><textarea className="inp" rows={6} value={bcForm.body} onChange={e=>setBcForm(f=>({ ...f, body:e.target.value }))} placeholder="Write your announcement…" /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">Create</button></div>
        </form>
      </Modal>

      {/* local styles if you don't have them globally */}
      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50; }
        .card-glow { @apply rounded-2xl border border-slate-200 bg-white shadow-sm; }
      `}</style>
    </div>
  );
}

/* ===== tiny locals ===== */
function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function currency(n){ return n?.toLocaleString(undefined, { style:"currency", currency:"USD" }) ?? "$0.00"; }
function humanAudience(a){ const z=[]; if(a.role&&a.role!=="All") z.push(a.role); if(a.status&&a.status!=="All") z.push(a.status); if((a.tags||[]).length) z.push(`#${a.tags.join(", #")}`); if(a.query) z.push(`"${a.query}"`); return z.join(" · ")||"All"; }
