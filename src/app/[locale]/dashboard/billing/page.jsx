"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, SearchInput,
  Select, Switch, DateRangeControl, Badge, MoneyInput, PercentInput, spring
} from "@/components/dashboard/ui/UI";
import {
  CreditCard, Wallet, Package, Users, Receipt, Percent, Gift, Download, Plus,
  Pause, Play, XCircle, Pencil, Trash2, ShoppingCart, RefreshCcw, Check
} from "lucide-react";

/* ================= Mock API ================= */
const seedPlans = [
  { id: 1, name: "Monthly Standard", price: 800, currency: "EGP", interval: "month", active: true, features: ["Gym access", "Group classes"] },
  { id: 2, name: "Monthly Premium",  price: 1200, currency: "EGP", interval: "month", active: true, features: ["All access", "Sauna", "1 PT session"] },
  { id: 3, name: "Annual",           price: 9000, currency: "EGP", interval: "year",  active: true, features: ["All access", "12 PT sessions"] },
];

const seedSubs = [
  { id: 100, member: "John Doe", planId: 1, planName: "Monthly Standard", amount: 800, currency: "EGP", status: "active", startedAt: "2025-06-01", renewsAt: "2025-09-01" },
  { id: 101, member: "Sarah Smith", planId: 2, planName: "Monthly Premium", amount: 1200, currency: "EGP", status: "paused", startedAt: "2025-05-10", renewsAt: "2025-09-10" },
  { id: 102, member: "Mike Johnson", planId: 3, planName: "Annual", amount: 9000, currency: "EGP", status: "active", startedAt: "2025-01-15", renewsAt: "2026-01-15" },
];

const seedInvoices = [
  { id: "INV-1205", member: "John Doe", amount: 800, currency: "EGP", status: "paid",  dueDate: "2025-08-01", paidAt: "2025-08-01" },
  { id: "INV-1206", member: "Sarah Smith", amount: 1200, currency: "EGP", status: "due",   dueDate: "2025-09-10" },
  { id: "INV-1207", member: "Mike Johnson", amount: 9000, currency: "EGP", status: "paid",  dueDate: "2025-01-15", paidAt: "2025-01-15" },
];

const seedCoupons = [
  { id: 1, code: "WELCOME15", type: "percent", value: 15, active: true, maxRedemptions: 200, redemptions: 83, expiresAt: "2026-01-01" },
  { id: 2, code: "AUG-100",   type: "fixed",   value: 100, active: true, maxRedemptions: 100, redemptions: 21, expiresAt: "2025-12-31" },
];

const seedGifts = [
  { id: 1, code: "GC-9F3A2", initial: 500, balance: 120, currency: "EGP", owner: "—", issuedAt: "2025-07-01", expiresAt: "2026-07-01" },
];

const fetchAll = () =>
  new Promise((res) =>
    setTimeout(() => res({
      plans: seedPlans,
      subs: seedSubs,
      invoices: seedInvoices,
      coupons: seedCoupons,
      gifts: seedGifts,
    }), 700)
  );

/* ================= Page ================= */
export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plans"); // plans | subs | invoices | coupons
  const [data, setData] = useState({ plans: [], subs: [], invoices: [], coupons: [], gifts: [] });

  // filters & search
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // modals
  const [openPlan, setOpenPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", price: "", currency: "EGP", interval: "month", active: true, features: "" });

  const [openSub, setOpenSub] = useState(false);
  const [subForm, setSubForm] = useState({ member: "", planId: "", startDate: new Date().toISOString().slice(0,10) });

  const [openInvoice, setOpenInvoice] = useState(false);
  const [invForm, setInvForm] = useState({ member: "", amount: "", currency: "EGP", dueDate: new Date().toISOString().slice(0,10) });

  const [openCoupon, setOpenCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", type: "percent", value: "", maxRedemptions: 100, expiresAt: "" });

  const [openGift, setOpenGift] = useState(false);
  const [giftForm, setGiftForm] = useState({ amount: "", currency: "EGP", expiresAt: "" });

  useEffect(() => {
    setLoading(true);
    fetchAll().then((d) => { setData(d); setLoading(false); });
  }, []);

  /* ---------- Derived lists ---------- */
  const planOptions = useMemo(() => data.plans.map(p => ({ label: `${p.name} · ${p.price} ${p.currency}/${p.interval}`, value: String(p.id) })), [data.plans]);

  const filteredSubs = useMemo(() => {
    let list = data.subs.slice();
    if (status !== "All") list = list.filter(s => s.status === status);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(x => [x.member, x.planName].join(" ").toLowerCase().includes(s));
    }
    if (from) list = list.filter(s => s.startedAt >= from);
    if (to)   list = list.filter(s => s.startedAt <= to);
    return list.sort((a,b) => b.startedAt.localeCompare(a.startedAt));
  }, [data.subs, status, search, from, to]);

  const filteredInvoices = useMemo(() => {
    let list = data.invoices.slice();
    if (status !== "All") list = list.filter(i => i.status === status.toLowerCase() || (status==="Paid" && i.status==="paid"));
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(x => [x.id, x.member].join(" ").toLowerCase().includes(s));
    }
    if (from) list = list.filter(i => i.dueDate >= from);
    if (to)   list = list.filter(i => i.dueDate <= to);
    return list.sort((a,b) => b.dueDate.localeCompare(a.dueDate));
  }, [data.invoices, status, search, from, to]);

  /* ---------- Columns ---------- */
  const planCols = [
    { header: "Plan", accessor: "name", sortable: true },
    { header: "Price", accessor: "price", sortable: true, cell: (r)=>`${r.price} ${r.currency}/${r.interval}` },
    { header: "Active", accessor: "active", cell: (r)=> r.active ? <Badge color="emerald">Active</Badge> : <Badge color="slate">Inactive</Badge> },
    { header: "Features", accessor: "features", cell: (r)=> <span className="text-xs text-slate-600">{r.features.join(" · ")}</span> },
    {
      header: "Actions", accessor: "_", cell: (r)=>(
        <div className="flex items-center gap-2">
          <button className="btn-sm" onClick={()=>editPlan(r)}><Pencil className="w-4 h-4" /></button>
          <button className="btn-sm" onClick={()=>togglePlan(r.id)}>{r.active ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}</button>
          <button className="btn-sm" onClick={()=>removePlan(r.id)}><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  const subsCols = [
    { header: "Member", accessor: "member", sortable: true },
    { header: "Plan", accessor: "planName", sortable: true },
    { header: "Amount", accessor: "amount", cell: (r)=>`${r.amount} ${r.currency}/${r.planId===3?"year":"month"}` },
    { header: "Status", accessor: "status",
      cell: (r)=> r.status==="active" ? <Badge color="emerald">Active</Badge> : r.status==="paused" ? <Badge color="amber">Paused</Badge> : <Badge color="slate">Canceled</Badge> },
    { header: "Started", accessor: "startedAt", cell: (r)=>new Date(r.startedAt).toLocaleDateString() },
    { header: "Renews", accessor: "renewsAt", cell: (r)=>new Date(r.renewsAt).toLocaleDateString() },
    {
      header: "Actions", accessor: "_", cell: (r)=>(
        <div className="flex items-center gap-2">
          {r.status==="paused" ? (
            <button className="btn-sm" onClick={()=>resumeSub(r.id)} title="Resume"><Play className="w-4 h-4" /></button>
          ) : (
            <button className="btn-sm" onClick={()=>pauseSub(r.id)} title="Pause"><Pause className="w-4 h-4" /></button>
          )}
          <button className="btn-sm" onClick={()=>cancelSub(r.id)} title="Cancel"><XCircle className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  const invCols = [
    { header: "Invoice", accessor: "id", sortable: true },
    { header: "Member", accessor: "member", sortable: true },
    { header: "Amount", accessor: "amount", cell: (r)=>`${r.amount} ${r.currency}` },
    { header: "Status", accessor: "status",
      cell: (r)=> r.status==="paid" ? <Badge color="emerald">Paid</Badge> : r.status==="void" ? <Badge color="slate">Void</Badge> : <Badge color="amber">Due</Badge> },
    { header: "Due", accessor: "dueDate", sortable: true, cell: (r)=>new Date(r.dueDate).toLocaleDateString() },
    {
      header: "Actions", accessor: "_", cell: (r)=>(
        <div className="flex items-center gap-2">
          {r.status!=="paid" && <button className="btn-sm" onClick={()=>recordPayment(r.id)} title="Record payment"><Wallet className="w-4 h-4" /></button>}
          {r.status!=="paid" && r.status!=="void" && <button className="btn-sm" onClick={()=>voidInvoice(r.id)} title="Void"><XCircle className="w-4 h-4" /></button>}
        </div>
      )
    }
  ];

  const couponCols = [
    { header: "Code", accessor: "code", sortable: true },
    { header: "Type", accessor: "type", cell: (r)=> r.type==="percent" ? <Badge color="blue">Percent</Badge> : <Badge color="slate">Fixed</Badge> },
    { header: "Value", accessor: "value", cell: (r)=> r.type==="percent" ? `${r.value}%` : `${r.value}` },
    { header: "Active", accessor: "active", cell: (r)=> r.active ? <Badge color="emerald">Yes</Badge> : <Badge color="slate">No</Badge> },
    { header: "Redemptions", accessor: "redemptions", cell: (r)=> `${r.redemptions}/${r.maxRedemptions}` },
    { header: "Expires", accessor: "expiresAt", cell: (r)=> r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—" },
    {
      header: "Actions", accessor: "_", cell: (r)=>(
        <div className="flex items-center gap-2">
          <button className="btn-sm" onClick={()=>toggleCoupon(r.id)} title="Enable/Disable"><RefreshCcw className="w-4 h-4" /></button>
          <button className="btn-sm" onClick={()=>removeCoupon(r.id)}><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  const giftCols = [
    { header: "Code", accessor: "code", sortable: true },
    { header: "Initial", accessor: "initial", cell: (r)=>`${r.initial} ${r.currency}` },
    { header: "Balance", accessor: "balance", cell: (r)=>`${r.balance} ${r.currency}` },
    { header: "Owner", accessor: "owner" },
    { header: "Issued", accessor: "issuedAt", cell: (r)=>new Date(r.issuedAt).toLocaleDateString() },
    { header: "Expires", accessor: "expiresAt", cell: (r)=>new Date(r.expiresAt).toLocaleDateString() },
    {
      header: "Actions", accessor: "_", cell: (r)=>(
        <div className="flex items-center gap-2">
          <button className="btn-sm" onClick={()=>assignGift(r.id)} title="Assign to member"><Users className="w-4 h-4" /></button>
          <button className="btn-sm" onClick={()=>removeGift(r.id)}><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  /* ---------- Actions (mock state updates) ---------- */
  const editPlan = (r) => {
    setPlanForm({ ...r, features: r.features.join(", ") });
    setOpenPlan(true);
  };
  const togglePlan = (id) => setData(d => ({ ...d, plans: d.plans.map(p => p.id===id? { ...p, active: !p.active } : p) }));
  const removePlan = (id) => setData(d => ({ ...d, plans: d.plans.filter(p => p.id!==id) }));

  const pauseSub   = (id) => setData(d => ({ ...d, subs: d.subs.map(s => s.id===id? { ...s, status: "paused" } : s) }));
  const resumeSub  = (id) => setData(d => ({ ...d, subs: d.subs.map(s => s.id===id? { ...s, status: "active" } : s) }));
  const cancelSub  = (id) => setData(d => ({ ...d, subs: d.subs.map(s => s.id===id? { ...s, status: "canceled" } : s) }));

  const recordPayment = (id) => setData(d => ({ ...d, invoices: d.invoices.map(i => i.id===id? { ...i, status: "paid", paidAt: new Date().toISOString().slice(0,10) } : i) }));
  const voidInvoice   = (id) => setData(d => ({ ...d, invoices: d.invoices.map(i => i.id===id? { ...i, status: "void" } : i) }));

  const toggleCoupon = (id) => setData(d => ({ ...d, coupons: d.coupons.map(c => c.id===id? { ...c, active: !c.active } : c) }));
  const removeCoupon = (id) => setData(d => ({ ...d, coupons: d.coupons.filter(c => c.id!==id) }));
  const removeGift   = (id) => setData(d => ({ ...d, gifts: d.gifts.filter(g => g.id!==id) }));
  const assignGift   = (id) => alert(`Assign gift card #${id} (mock).`);

  const exportCSV = (rows, filename) => {
    const keys = Object.keys(rows[0] || {});
    const csv = [keys, ...rows.map(r => keys.map(k => r[k]))]
      .map(line => line.map(x => `"${String(x ?? "").replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
  };

  /* ---------- Tabs ---------- */
  const TABS = [
    { key: "plans",    label: "Plans & Products", icon: Package },
    { key: "subs",     label: "Members & Subscriptions", icon: Users },
    { key: "invoices", label: "Invoices & Payments", icon: Receipt },
    { key: "coupons",  label: "Coupons & Gift Cards", icon: Percent },
  ];

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Billing & Memberships"
        subtitle="Manage plans, subscriptions, invoices, coupons and gift cards."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={ShoppingCart} href="/dashboard/pos" variant="secondary">Open POS</ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={()=>{ setLoading(true); fetchAll().then(d=>{ setData(d); setLoading(false); }); }} variant="secondary">Refresh</ToolbarButton>
          </div>
        }
      />

      <TabsPill tabs={TABS} active={tab} onChange={setTab} id="billing-tabs" />

      {/* ===== Plans & Products ===== */}
      {tab === "plans" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow">
          <div className="p-4 flex items-center justify-between">
            <div className="font-semibold">Membership Plans</div>
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV(data.plans, "plans.csv")}>Export</ToolbarButton>
              <ToolbarButton icon={Plus} onClick={()=>{ setPlanForm({ name:"", price:"", currency:"EGP", interval:"month", active:true, features:"" }); setOpenPlan(true); }}>New Plan</ToolbarButton>
            </div>
          </div>
          <DataTable columns={planCols} data={data.plans} loading={loading} pagination itemsPerPage={8} />
          {!loading && data.plans.length===0 && <EmptyState title="No plans yet" subtitle="Create your first membership plan." />}
        </motion.div>
      )}

      {/* ===== Members & Subscriptions ===== */}
      {tab === "subs" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search member or plan…" />
              <Select label="Status" value={status} setValue={setStatus} options={["All","active","paused","canceled"]} />
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV(filteredSubs, "subscriptions.csv")}>Export</ToolbarButton>
              <ToolbarButton icon={Plus} onClick={()=>setOpenSub(true)}>New Subscription</ToolbarButton>
            </div>
          </div>
          <div className="mt-3">
            <DataTable columns={subsCols} data={filteredSubs} loading={loading} pagination itemsPerPage={10} />
            {!loading && filteredSubs.length===0 && <EmptyState title="No subscriptions" subtitle="Try a different filter or add a new one." />}
          </div>
        </motion.div>
      )}

      {/* ===== Invoices & Payments ===== */}
      {tab === "invoices" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card-glow p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search invoice or member…" />
              <Select label="Status" value={status} setValue={setStatus} options={["All","Paid","due","void"]} />
              <DateRangeControl from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV(filteredInvoices, "invoices.csv")}>Export</ToolbarButton>
              <ToolbarButton icon={Plus} onClick={()=>setOpenInvoice(true)}>Create Invoice</ToolbarButton>
            </div>
          </div>
          <div className="mt-3">
            <DataTable columns={invCols} data={filteredInvoices} loading={loading} pagination itemsPerPage={10} />
            {!loading && filteredInvoices.length===0 && <EmptyState title="No invoices" subtitle="Try different filters or create one." />}
          </div>
        </motion.div>
      )}

      {/* ===== Coupons & Gift Cards ===== */}
      {tab === "coupons" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coupons */}
          <div className="card-glow p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Coupons</div>
              <div className="flex items-center gap-2">
                <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV(data.coupons, "coupons.csv")}>Export</ToolbarButton>
                <ToolbarButton icon={Plus} onClick={()=>setOpenCoupon(true)}>New Coupon</ToolbarButton>
              </div>
            </div>
            <div className="mt-3">
              <DataTable columns={couponCols} data={data.coupons} loading={loading} itemsPerPage={8} pagination />
              {!loading && data.coupons.length===0 && <EmptyState title="No coupons" subtitle="Create a discount code." />}
            </div>
          </div>

          {/* Gift Cards */}
          <div className="card-glow p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Gift Cards</div>
              <div className="flex items-center gap-2">
                <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV(data.gifts, "giftcards.csv")}>Export</ToolbarButton>
                <ToolbarButton icon={Gift} onClick={()=>setOpenGift(true)}>Issue Gift Card</ToolbarButton>
              </div>
            </div>
            <div className="mt-3">
              <DataTable columns={giftCols} data={data.gifts} loading={loading} itemsPerPage={8} pagination />
              {!loading && data.gifts.length===0 && <EmptyState title="No gift cards" subtitle="Issue a prepaid gift card." />}
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Modals ===== */}

      {/* Create / Edit Plan */}
      <Modal open={openPlan} onClose={()=>setOpenPlan(false)} title={planForm.id ? "Edit Plan" : "Create Plan"}>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            const features = planForm.features ? planForm.features.split(",").map(s=>s.trim()).filter(Boolean) : [];
            setData(d => planForm.id
              ? { ...d, plans: d.plans.map(p => p.id===planForm.id ? { ...planForm, features, price:+planForm.price } : p) }
              : { ...d, plans: [{ id: Date.now(), ...planForm, price:+planForm.price, features }, ...d.plans] }
            );
            setOpenPlan(false);
          }}
          className="space-y-3"
        >
          <Field label="Name"><input className="inp" value={planForm.name} onChange={(e)=>setPlanForm(f=>({ ...f, name: e.target.value }))} required /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Price"><MoneyInput currency={planForm.currency} value={planForm.price} onChange={(v)=>setPlanForm(f=>({ ...f, price: v }))} /></Field>
            <Field label="Currency">
              <select className="inp" value={planForm.currency} onChange={(e)=>setPlanForm(f=>({ ...f, currency: e.target.value }))}>
                {["EGP","USD","EUR","GBP","AED","SAR"].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Interval">
              <select className="inp" value={planForm.interval} onChange={(e)=>setPlanForm(f=>({ ...f, interval: e.target.value }))}>
                <option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option>
              </select>
            </Field>
          </div>
          <Field label="Features (comma-separated)">
            <input className="inp" placeholder="Sauna, PT session, …" value={planForm.features} onChange={(e)=>setPlanForm(f=>({ ...f, features: e.target.value }))} />
          </Field>
          <Field label="Active">
            <Switch checked={planForm.active} onChange={(v)=>setPlanForm(f=>({ ...f, active: v }))} />
          </Field>
          <div className="flex items-center justify-end">
            <button className="btn-primary">{planForm.id ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      {/* New Subscription */}
      <Modal open={openSub} onClose={()=>setOpenSub(false)} title="Create Subscription">
        <form
          onSubmit={(e)=>{ e.preventDefault();
            const plan = data.plans.find(p => String(p.id)===String(subForm.planId));
            if (!plan) return alert("Select plan");
            setData(d => ({ ...d, subs: [{ id: Date.now(), member: subForm.member, planId: plan.id, planName: plan.name, amount: plan.price, currency: plan.currency, status: "active", startedAt: subForm.startDate, renewsAt: nextRenew(subForm.startDate, plan.interval) }, ...d.subs ] }));
            setOpenSub(false); setSubForm({ member: "", planId: "", startDate: new Date().toISOString().slice(0,10) });
          }}
          className="space-y-3"
        >
          <Field label="Member name"><input className="inp" value={subForm.member} onChange={(e)=>setSubForm(s=>({ ...s, member: e.target.value }))} placeholder="Search or type member…" required /></Field>
          <Field label="Plan">
            <select className="inp" value={subForm.planId} onChange={(e)=>setSubForm(s=>({ ...s, planId: e.target.value }))} required>
              <option value="">Select a plan</option>
              {planOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Start date"><input type="date" className="inp" value={subForm.startDate} onChange={(e)=>setSubForm(s=>({ ...s, startDate: e.target.value }))} /></Field>
          <div className="flex items-center justify-end">
            <button className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      {/* Create Invoice */}
      <Modal open={openInvoice} onClose={()=>setOpenInvoice(false)} title="Create Invoice">
        <form
          onSubmit={(e)=>{ e.preventDefault();
            setData(d => ({ ...d, invoices: [{ id: "INV-"+Date.now(), member: invForm.member, amount: +invForm.amount, currency: invForm.currency, status: "due", dueDate: invForm.dueDate }, ...d.invoices ] }));
            setOpenInvoice(false); setInvForm({ member: "", amount: "", currency: "EGP", dueDate: new Date().toISOString().slice(0,10) });
          }}
          className="space-y-3"
        >
          <Field label="Member name"><input className="inp" value={invForm.member} onChange={(e)=>setInvForm(v=>({ ...v, member: e.target.value }))} required /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Amount"><MoneyInput value={invForm.amount} onChange={(v)=>setInvForm(vv=>({ ...vv, amount: v }))} currency={invForm.currency} /></Field>
            <Field label="Currency">
              <select className="inp" value={invForm.currency} onChange={(e)=>setInvForm(vv=>({ ...vv, currency: e.target.value }))}>
                {["EGP","USD","EUR","GBP","AED","SAR"].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Due date"><input type="date" className="inp" value={invForm.dueDate} onChange={(e)=>setInvForm(vv=>({ ...vv, dueDate: e.target.value }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">Create</button></div>
        </form>
      </Modal>

      {/* New Coupon */}
      <Modal open={openCoupon} onClose={()=>setOpenCoupon(false)} title="New Coupon">
        <form
          onSubmit={(e)=>{ e.preventDefault();
            setData(d => ({ ...d, coupons: [{ id: Date.now(), code: couponForm.code.toUpperCase(), type: couponForm.type, value: +couponForm.value, active: true, maxRedemptions: +couponForm.maxRedemptions, redemptions: 0, expiresAt: couponForm.expiresAt || "" }, ...d.coupons ] }));
            setOpenCoupon(false); setCouponForm({ code: "", type: "percent", value: "", maxRedemptions: 100, expiresAt: "" });
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Code"><input className="inp uppercase" value={couponForm.code} onChange={(e)=>setCouponForm(c=>({ ...c, code: e.target.value }))} required /></Field>
            <Field label="Type">
              <select className="inp" value={couponForm.type} onChange={(e)=>setCouponForm(c=>({ ...c, type: e.target.value }))}>
                <option value="percent">Percent</option><option value="fixed">Fixed (amount)</option>
              </select>
            </Field>
            <Field label="Value">{couponForm.type==="percent"
              ? <PercentInput value={couponForm.value} onChange={(v)=>setCouponForm(c=>({ ...c, value: v }))} />
              : <MoneyInput value={couponForm.value} onChange={(v)=>setCouponForm(c=>({ ...c, value: v }))} currency="EGP" />
            }</Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Max redemptions"><input type="number" className="inp" min="1" value={couponForm.maxRedemptions} onChange={(e)=>setCouponForm(c=>({ ...c, maxRedemptions: e.target.value }))} /></Field>
            <Field label="Expires at (optional)"><input type="date" className="inp" value={couponForm.expiresAt} onChange={(e)=>setCouponForm(c=>({ ...c, expiresAt: e.target.value }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">Create</button></div>
        </form>
      </Modal>

      {/* Issue Gift Card */}
      <Modal open={openGift} onClose={()=>setOpenGift(false)} title="Issue Gift Card">
        <form
          onSubmit={(e)=>{ e.preventDefault();
            setData(d => ({ ...d, gifts: [{ id: Date.now(), code: "GC-"+Math.random().toString(36).slice(2,7).toUpperCase(), initial: +giftForm.amount, balance: +giftForm.amount, currency: giftForm.currency, owner: "—", issuedAt: new Date().toISOString().slice(0,10), expiresAt: giftForm.expiresAt || "2026-12-31" }, ...d.gifts ] }));
            setOpenGift(false); setGiftForm({ amount: "", currency: "EGP", expiresAt: "" });
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Amount"><MoneyInput value={giftForm.amount} onChange={(v)=>setGiftForm(g=>({ ...g, amount: v }))} currency={giftForm.currency} /></Field>
            <Field label="Currency">
              <select className="inp" value={giftForm.currency} onChange={(e)=>setGiftForm(g=>({ ...g, currency: e.target.value }))}>
                {["EGP","USD","EUR","GBP","AED","SAR"].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Expires at (optional)"><input type="date" className="inp" value={giftForm.expiresAt} onChange={(e)=>setGiftForm(g=>({ ...g, expiresAt: e.target.value }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">Issue</button></div>
        </form>
      </Modal>

      {/* small styles */}
      <style jsx>{`
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50; }
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
      `}</style>
    </div>
  );
}

/* ----- small helpers ----- */
function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function nextRenew(startISO, interval){
  const d = new Date(startISO);
  if (interval==="week") d.setDate(d.getDate()+7);
  else if (interval==="year") d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,10);
}
