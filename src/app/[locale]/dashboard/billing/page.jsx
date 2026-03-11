"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import {
  Wallet, TrendingUp, DollarSign, Calendar, Clock,
  CheckCircle, XCircle, AlertCircle, Trash2, RefreshCw,
  Download, ArrowUpRight, ArrowDownRight, User, Mail,
  Phone, Filter, ChevronDown, Eye, Plus, Info, Edit,
  Package, Send, Users, Activity, FileText, Receipt,
  Crown, Sparkles, BarChart3, SlidersHorizontal, Check,
  BookMarked, Heart, Tag,
} from "lucide-react";

import { PageHeader } from "@/components/molecules/PageHeader";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const cls = (...a) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const CSS_VARS = `
  :root {
    --color-gradient-from: #4f46e5;
    --color-gradient-via:  #6366f1;
    --color-gradient-to:   #7c3aed;
    --color-primary-50:  #eef2ff;
    --color-primary-100: #e0e7ff;
    --color-primary-150: #c7d2fe;
    --color-primary-200: #c7d2fe;
    --color-primary-300: #a5b4fc;
    --color-primary-400: #818cf8;
    --color-primary-500: #6366f1;
    --color-primary-600: #4f46e5;
    --color-primary-700: #4338ca;
    --color-primary-800: #3730a3;
    --color-primary-900: #312e81;
  }
`;

/* ─────────────────────────────────────────────────────────────
   MICRO-COMPONENTS
───────────────────────────────────────────────────────────── */

/** Glassy card surface */
function Surface({ children, className = "", accent = false, glow = false }) {
  return (
    <div
      className={cls("relative overflow-hidden rounded-lg border bg-white/90 backdrop-blur-xl", className)}
      style={{
        borderColor: "var(--color-primary-100)",
        boxShadow: glow
          ? "0 0 0 1px var(--color-primary-100), 0 4px 6px -1px rgba(15,23,42,0.05), 0 20px 50px -10px rgba(15,23,42,0.10)"
          : "0 1px 3px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.07)",
      }}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))" }} />
      )}
      {children}
    </div>
  );
}

/** KPI stat card */
function KpiCard({ icon: Icon, title, subtitle, value, trend, bgFrom, bgTo, iconColor, idx = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.015 }}
      className="group relative overflow-hidden rounded-lg border-2 border-white/60 shadow-lg hover:shadow-2xl transition-all duration-300"
      style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})` }}
    >
      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
        initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.7 }} />
      <div className="relative p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 15, scale: 1.1 }} transition={{ duration: 0.3 }}
              className="h-12 w-12 rounded-lg bg-white/75 backdrop-blur border border-white/60 shadow flex items-center justify-center shrink-0">
              <Icon className={cls("w-6 h-6", iconColor)} strokeWidth={2} />
            </motion.div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">{title}</p>
              {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
            </div>
          </div>
          {trend && (
            <span className={cls("shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-black",
              trend.direction === "up" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
              {trend.direction === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}
            </span>
          )}
        </div>
        <p className="text-3xl lg:text-4xl font-black text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}

/** Status badge */
function StatusBadge({ status, label, icon: Icon }) {
  const styles = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    failed:    "border-rose-200   bg-rose-50   text-rose-700",
    pending:   "border-amber-200  bg-amber-50  text-amber-700",
    active:    "border-emerald-200 bg-emerald-50 text-emerald-700",
    expiring:  "border-rose-200   bg-rose-50   text-rose-700",
    warn:      "border-amber-200  bg-amber-50  text-amber-700",
    ended:     "border-slate-200  bg-slate-50  text-slate-600",
  };
  return (
    <span className={cls("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold", styles[status] || styles.pending)}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

/** Icon button with tooltip */
function TipIconBtn({ tooltip, onClick, disabled, children, variant = "ghost" }) {
  const variants = {
    ghost:   { border: "var(--color-primary-150,#e0e7ff)", bg: "white", color: "var(--color-primary-600)" },
    danger:  { border: "#fecaca", bg: "#fef2f2", color: "#dc2626" },
    success: { border: "#bbf7d0", bg: "#f0fdf4", color: "#15803d" },
  };
  const s = variants[variant] || variants.ghost;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={onClick} disabled={disabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none hover:-translate-y-0.5 active:scale-95"
            style={{ borderColor: s.border, background: s.bg, color: s.color, boxShadow: "0 1px 3px rgba(15,23,42,0.07)" }}>
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent><p className="text-xs font-semibold">{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ActionPill({ children }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--color-primary-100)] bg-white p-1 shadow-sm">
      {children}
    </div>
  );
}
function PillDivider() { return <div className="h-4 w-px bg-slate-100" />; }

/* ─────────────────────────────────────────────────────────────
   DATA TABLE
───────────────────────────────────────────────────────────── */
function PaginationBar({ page, totalPages, onPageChange }) {
  const canPrev = page > 1, canNext = page < totalPages;
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out = new Set([1, totalPages, page, page - 1, page + 1]);
    const arr = [...out].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const withDots = [];
    for (let i = 0; i < arr.length; i++) {
      withDots.push(arr[i]);
      if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) withDots.push("dots-" + i);
    }
    return withDots;
  }, [page, totalPages]);

  const btnBase = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-4 text-sm font-semibold text-[color:var(--color-primary-700)] shadow-sm transition-all hover:bg-[color:var(--color-primary-50)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none";

  return (
    <div className="flex items-center justify-between mt-6 pt-5 border-t border-[color:var(--color-primary-100)]">
      <button disabled={!canPrev} onClick={() => onPageChange(page - 1)} className={btnBase}>← السابق</button>
      <div className="flex items-center gap-1.5">
        {pages.map(p =>
          typeof p === "string" ? (
            <span key={p} className="px-1.5 text-slate-400 text-sm font-bold select-none">…</span>
          ) : (
            <motion.button key={p} onClick={() => onPageChange(p)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              className={cls("relative h-9 w-9 rounded-lg text-sm font-bold transition-all focus:outline-none",
                page === p ? "text-white shadow-md" : "border border-[color:var(--color-primary-200)] bg-white text-slate-700 hover:bg-[color:var(--color-primary-50)]")}>
              {page === p && (
                <motion.span layoutId="pgActive" className="absolute inset-0 rounded-lg"
                  style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }} />
              )}
              <span className="relative z-10">{p}</span>
            </motion.button>
          )
        )}
      </div>
      <button disabled={!canNext} onClick={() => onPageChange(page + 1)} className={btnBase}>التالي →</button>
    </div>
  );
}

function DataTable({ columns, rows, getRowKey, renderCell, emptyTitle, emptyIcon: EmptyIcon, emptyDescription, pageSize = 8, showPagination = true, headerRight, headerTitle, headerSubtitle }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => rows.slice((safePage - 1) * pageSize, safePage * pageSize), [rows, safePage, pageSize]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  return (
    <Surface glow>
      {(headerTitle || headerRight) && (
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-primary-50)] px-5 py-4">
          <div>
            {headerTitle && <h3 className="text-base font-black text-slate-900">{headerTitle}</h3>}
            {headerSubtitle && <p className="mt-0.5 text-xs font-medium text-slate-500">{headerSubtitle}</p>}
          </div>
          {headerRight}
        </div>
      )}
      <div className="p-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {EmptyIcon && (
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-lg"
                style={{ background: "linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))" }}>
                <EmptyIcon className="h-7 w-7" style={{ color: "var(--color-primary-500)" }} />
              </div>
            )}
            <p className="text-sm font-bold text-slate-800 mb-1">{emptyTitle || "لا توجد بيانات"}</p>
            {emptyDescription && <p className="text-xs text-slate-500">{emptyDescription}</p>}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-[color:var(--color-primary-100)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[color:var(--color-primary-100)]"
                    style={{ background: "linear-gradient(90deg, var(--color-primary-50), white)" }}>
                    {columns.map(c => (
                      <TableHead key={c.key}
                        className={cls("py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 rtl:text-right ltr:text-left",
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "")}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((row, i) => (
                    <motion.tr key={getRowKey(row)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group border-b border-[color:var(--color-primary-50)] transition-colors last:border-0 hover:bg-[color:var(--color-primary-50)]/40">
                      {columns.map(c => (
                        <TableCell key={c.key}
                          className={cls("py-3.5", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "")}>
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
            {showPagination && totalPages > 1 && (
              <PaginationBar page={safePage} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </div>
    </Surface>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB WRAPPER
───────────────────────────────────────────────────────────── */
function TabPane({ children, className = "" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cls("space-y-6 lg:space-y-8", className)}>
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function BillingPage() {
  const t = useTranslations("billing");
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get("tab") || "overview";
  const [filterValues, setFilterValues] = useState({ status: "", type: "" });

  const walletData = {
    balance: 25000, totalEarned: 150000, totalWithdrawn: 125000,
    moneyInThisMonth: 15000, moneyOutThisMonth: 8000,
    pendingPayments: 5000, paidThisMonth: 12000,
    growthRate: 12.5, transactionCount: 48, activeClients: 23,
  };

  const handleTabChange = tabId => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tabId);
    router.push(`?${params.toString()}`);
  };

  /* ── PageHeader props ── */
  const TABS = useMemo(() => [
    { id: "overview",        label: t("tabs.overview"),       icon: Activity,  count: walletData.transactionCount },
    { id: "clients",         label: t("tabs.clients"),        icon: Users,     count: walletData.activeClients },
    { id: "packages",        label: t("tabs.packages"),       icon: Package },
    { id: "subscriptions",   label: t("tabs.subscriptions"),  icon: Crown },
    { id: "client-payments", label: t("tabs.clientPayments"), icon: Receipt },
  ], [t]);

  const STATS = useMemo(() => [
    { label: t("kpi.walletBalance.title"),     value: `${walletData.balance.toLocaleString()} ${t("currency")}`,        icon: Wallet,      change: 12 },
    { label: t("kpi.totalEarned.title"),       value: `${walletData.totalEarned.toLocaleString()} ${t("currency")}`,    icon: TrendingUp,  change: 8 },
    { label: t("kpi.moneyInThisMonth.title"),  value: `${walletData.moneyInThisMonth.toLocaleString()} ${t("currency")}`, icon: ArrowDownRight, change: 5 },
    { label: t("kpi.pendingPayments") || "مدفوعات معلقة", value: `${walletData.pendingPayments.toLocaleString()} ${t("currency")}`, icon: Clock },
  ], [t, walletData]);

  const FILTERS = [
    {
      key: "status", label: t("filters.status") || "الحالة", type: "toggle",
      options: [
        { value: "completed", label: t("status.completed") || "مكتمل" },
        { value: "pending",   label: t("status.pending")   || "معلق" },
        { value: "failed",    label: t("status.failed")    || "فشل" },
      ],
    },
    {
      key: "type", label: t("filters.type") || "النوع", type: "toggle",
      options: [
        { value: "subscription", label: t("filters.subscription") || "اشتراك" },
        { value: "withdrawal",   label: t("filters.withdrawal")   || "سحب" },
        { value: "refund",       label: t("filters.refund")       || "استرداد" },
      ],
    },
  ];

  return (
    <>
      <style>{CSS_VARS}</style>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/80" />
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.12] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-gradient-from), transparent)" }} />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-[0.10] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-gradient-to), transparent)" }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(var(--color-primary-400) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      <div className="relative min-h-screen pb-20">
        {/* ── PAGE HEADER — shared component ── */}
        <PageHeader
          title={t("title")}
          desc={t("subtitle")}
          icon={Wallet}
          stats={STATS}
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          filters={FILTERS}
          filterValues={filterValues}
          onFilterChange={(k, v) => setFilterValues(fv => ({ ...fv, [k]: v }))}
          onFilterReset={() => setFilterValues({ status: "", type: "" })}
          actions={
            <div className="flex items-center gap-2">
              {/* Tooltip info */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(16px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)" }}>
                      <Info className="h-4 w-4 text-white" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{t("tooltips.pageInfo")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Export button */}
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black text-white"
                style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(16px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3),0 4px 16px rgba(0,0,0,0.1)" }}>
                <Download className="h-4 w-4" />
                {t("common.export")}
              </motion.button>
            </div>
          }
        />

        {/* ── TAB CONTENT ── */}
        <div className="container py-6 lg:py-8">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <OverviewTab key="overview" walletData={walletData} t={t}
                onNavigateToSubscriptions={() => handleTabChange("subscriptions")} />
            )}
            {activeTab === "clients"         && <ClientsTab        key="clients"         t={t} />}
            {activeTab === "packages"        && <PackagesTab       key="packages"        t={t} />}
            {activeTab === "subscriptions"   && <SubscriptionsTab  key="subscriptions"   t={t} />}
            {activeTab === "client-payments" && <ClientPaymentsTab key="client-payments" t={t} />}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   OVERVIEW TAB
───────────────────────────────────────────────────────────── */
function TxStatusBadge({ status, t }) {
  const cfg = {
    completed: { status: "completed", icon: CheckCircle },
    failed:    { status: "failed",    icon: XCircle },
    pending:   { status: "pending",   icon: Clock },
  }[status] || { status: "pending", icon: Clock };
  return <StatusBadge status={cfg.status} label={t(`status.${status}`)} icon={cfg.icon} />;
}

function OverviewTab({ walletData, t, onNavigateToSubscriptions }) {
  const walletStats = [
    { title: t("kpi.walletBalance.title"),    subtitle: t("kpi.walletBalance.subtitle"),   value: `${walletData.balance.toLocaleString()} ${t("currency")}`,           icon: Wallet,         iconColor: "text-blue-600",   bgFrom: "#eff6ff", bgTo: "#eef2ff", trend: { value: "+12.5%", direction: "up" } },
    { title: t("kpi.totalEarned.title"),      subtitle: t("kpi.totalEarned.subtitle"),     value: `${walletData.totalEarned.toLocaleString()} ${t("currency")}`,        icon: TrendingUp,     iconColor: "text-emerald-600", bgFrom: "#ecfdf5", bgTo: "#f0fdf4", trend: { value: "+8.2%", direction: "up" } },
    { title: t("kpi.moneyInThisMonth.title"), subtitle: new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" }), value: `${walletData.moneyInThisMonth.toLocaleString()} ${t("currency")}`, icon: ArrowDownRight, iconColor: "text-[color:var(--color-primary-600)]", bgFrom: "var(--color-primary-50)", bgTo: "#eef2ff", trend: { value: "+5.7%", direction: "up" } },
  ];

  const recentTransactions = [
    { id: 1, status: "completed", description: t("transactions.examples.subscription"), date: "2025-01-12", time: "14:32", amount: 2500,  client: "Sarah Johnson" },
    { id: 2, status: "pending",   description: t("transactions.examples.withdrawal"),   date: "2025-01-11", time: "09:15", amount: -5000, client: t("common.system") },
    { id: 3, status: "completed", description: t("transactions.examples.refund"),       date: "2025-01-10", time: "16:48", amount: -1000, client: "Michael Chen" },
    { id: 4, status: "completed", description: t("transactions.examples.annual"),       date: "2025-01-09", time: "11:20", amount: 12000, client: "Emma Davis" },
  ];

  const txColumns = [
    { key: "status",      label: t("table.status") },
    { key: "client",      label: t("table.client") },
    { key: "description", label: t("table.description") },
    { key: "date",        label: t("table.date") },
    { key: "amount",      label: t("table.amount"), align: "right" },
  ];

  return (
    <TabPane>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
        {walletStats.map((s, i) => <KpiCard key={s.title} {...s} idx={i} />)}
      </div>

      <DataTable
        headerTitle={t("transactions.recent")}
        headerSubtitle={t("transactions.recentSubtitle") || t("transactions.recent")}
        headerRight={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
              style={{ borderColor: "var(--color-primary-200)", background: "var(--color-primary-50)", color: "var(--color-primary-700)" }}>
              <BarChart3 className="h-3.5 w-3.5" />{t("payments.total", { count: recentTransactions.length })}
            </span>
            <button onClick={onNavigateToSubscriptions}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-xs font-bold text-[color:var(--color-primary-700)] shadow-sm transition-all hover:bg-[color:var(--color-primary-50)]">
              {t("common.viewAll")}<ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        }
        columns={txColumns} rows={recentTransactions} getRowKey={r => r.id} pageSize={6}
        emptyTitle={t("transactions.empty")} emptyIcon={FileText}
        renderCell={(tx, key) => {
          if (key === "status")      return <TxStatusBadge status={tx.status} t={t} />;
          if (key === "client")      return (
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ background: "linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))" }}>
                <User className="h-4 w-4" style={{ color: "var(--color-primary-600)" }} />
              </div>
              <span className="text-sm font-semibold text-slate-900">{tx.client}</span>
            </div>
          );
          if (key === "description") return <span className="text-sm text-slate-600 font-medium">{tx.description}</span>;
          if (key === "date")        return <div><p className="text-sm font-semibold text-slate-700">{tx.date}</p><p className="text-xs text-slate-400">{tx.time}</p></div>;
          if (key === "amount")      return (
            <div className="text-right">
              <p className={cls("text-base font-black", tx.amount > 0 ? "text-emerald-700" : "text-rose-700")}>
                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold">{t("currency")}</p>
            </div>
          );
          return null;
        }}
      />
    </TabPane>
  );
}

/* ─────────────────────────────────────────────────────────────
   CLIENTS TAB
───────────────────────────────────────────────────────────── */
function ClientsTab({ t }) {
  const [searchTerm, setSearchTerm] = useState("");

  const clients = [
    { id: 1, name: "أحمد محمد علي",  email: "ahmed@example.com",   phone: "01001234567", package: "الحزمة الذهبية",    startDate: "2024-10-15", endDate: "2025-02-15", daysLeft: 34,  avatar: "AM" },
    { id: 2, name: "فاطمة حسن",      email: "fatima@example.com",  phone: "01112345678", package: "حزمة البداية",       startDate: "2024-12-01", endDate: "2025-01-20", daysLeft: 8,   avatar: "FH" },
    { id: 3, name: "محمود السيد",    email: "mahmoud@example.com", phone: "01223456789", package: "الحزمة البلاتينية",  startDate: "2024-08-01", endDate: "2025-08-01", daysLeft: 201, avatar: "MS" },
    { id: 4, name: "نور الدين",      email: "nour@example.com",    phone: "01334567890", package: "الحزمة الذهبية",    startDate: "2024-11-10", endDate: "2025-01-15", daysLeft: 3,   avatar: "ND" },
    { id: 5, name: "ليلى يوسف",      email: "layla@example.com",   phone: "01445678901", package: "حزمة البداية",       startDate: "2024-09-20", endDate: "2025-03-20", daysLeft: 67,  avatar: "LY" },
    { id: 6, name: "علي سامي",       email: "ali@example.com",     phone: "01555555555", package: "حزمة البداية",       startDate: "2024-10-01", endDate: "2025-01-05", daysLeft: -7,  avatar: "AS" },
  ];

  const norm = v => (v || "").toString().toLowerCase();
  const filtered = useMemo(() => {
    const q = norm(searchTerm);
    return clients.filter(c => norm(c.name).includes(q) || norm(c.email).includes(q) || (c.phone || "").includes(searchTerm)).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [searchTerm]);

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.daysLeft > 30).length;
    const r30 = clients.filter(c => c.daysLeft > 7 && c.daysLeft <= 30).length;
    const r7 = clients.filter(c => c.daysLeft > 0 && c.daysLeft <= 7).length;
    const ended = clients.filter(c => c.daysLeft <= 0).length;
    const pct = n => (total ? Math.round((n / total) * 100) : 0);
    return [
      { key: "total",  label: t("clients.stats.total")       || "الإجمالي",   value: total,  icon: Users,       bgFrom: "#f8fafc", bgTo: "#f1f5f9", iconColor: "text-slate-600",   progress: 100,        chip: "100%" },
      { key: "active", label: t("clients.stats.active")      || "نشط",        value: active, icon: CheckCircle, bgFrom: "#ecfdf5", bgTo: "#f0fdf4", iconColor: "text-emerald-600", progress: pct(active), chip: `${pct(active)}%` },
      { key: "r7",     label: t("clients.stats.renewUrgent") || "تجديد عاجل", value: r7,     icon: AlertCircle, bgFrom: "#fff1f2", bgTo: "#fef2f2", iconColor: "text-rose-600",    progress: pct(r7),     chip: `${pct(r7)}%` },
      { key: "r30",    label: t("clients.stats.renewSoon")   || "تجديد قريب", value: r30,    icon: RefreshCw,   bgFrom: "#fffbeb", bgTo: "#fefce8", iconColor: "text-amber-600",   progress: pct(r30),    chip: `${pct(r30)}%` },
      { key: "ended",  label: t("clients.stats.ended")       || "منتهي",      value: ended,  icon: XCircle,     bgFrom: "#f8fafc", bgTo: "#f1f5f9", iconColor: "text-slate-500",   progress: pct(ended),  chip: `${pct(ended)}%` },
    ];
  }, []);

  const getClientBadge = daysLeft => {
    if (daysLeft <= 0)  return { status: "expiring", icon: XCircle,     label: t("clients.status.ended") || "منتهي" };
    if (daysLeft <= 7)  return { status: "expiring", icon: AlertCircle, label: t("clients.status.expiringSoon") };
    if (daysLeft <= 30) return { status: "warn",     icon: RefreshCw,   label: t("clients.status.renewalDue") || "تجديد قريب" };
    return               { status: "active",  icon: CheckCircle, label: t("clients.status.active") };
  };

  const columns = [
    { key: "client",  label: t("table.client") },
    { key: "contact", label: t("clients.contact") || "التواصل" },
    { key: "package", label: t("clients.package") || "الباقة" },
    { key: "renewal", label: t("clients.renewal") || "التجديد" },
    { key: "status",  label: t("table.status") },
    { key: "actions", label: t("table.actions"), align: "center" },
  ];

  return (
    <TabPane>
      {/* Mini stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }} whileHover={{ y: -4, scale: 1.015 }}
              className="group relative overflow-hidden rounded-lg border border-white/60 shadow transition-all duration-300 hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${s.bgFrom}, ${s.bgTo})` }}>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 shadow-sm border border-white/60 transition-transform group-hover:scale-105">
                    <Icon className={cls("h-4 w-4", s.iconColor)} strokeWidth={2} />
                  </div>
                  {s.chip && (
                    <span className="rounded-lg border border-white/70 bg-white/60 px-1.5 py-0.5 text-[10px] font-black text-slate-600">{s.chip}</span>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{s.value}</p>
                {typeof s.progress === "number" && (
                  <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/50">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))" }} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-400">🔍</span>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder={t("clients.search") || "بحث عن عميل…"}
          className="h-10 w-full rounded-lg border border-[color:var(--color-primary-200)] bg-white pl-9 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]" />
      </div>

      <DataTable
        headerTitle={t("clients.management") || "إدارة العملاء"}
        headerSubtitle={`${filtered.length} ${t("clients.results") || "نتيجة"}`}
        headerRight={
          <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{ borderColor: "var(--color-primary-200)", background: "var(--color-primary-50)", color: "var(--color-primary-700)" }}>
            <Users className="h-3.5 w-3.5" />{t("payments.total", { count: filtered.length })}
          </span>
        }
        columns={columns} rows={filtered} getRowKey={c => c.id} pageSize={8}
        emptyTitle={t("clients.noResults")} emptyIcon={Users}
        renderCell={(c, key) => {
          if (key === "client") return (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white shadow">
                <AvatarFallback className="text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
                  {c.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-400">{t("clients.startDate") || "بدأ"}: {c.startDate}</p>
              </div>
            </div>
          );
          if (key === "contact") return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail className="h-3.5 w-3.5 text-slate-400" />{c.email}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" />{c.phone}</div>
            </div>
          );
          if (key === "package") return (
            <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold"
              style={{ borderColor: "var(--color-primary-200)", background: "var(--color-primary-50)", color: "var(--color-primary-800)" }}>
              {c.package}
            </span>
          );
          if (key === "renewal") return (
            <div>
              <p className="text-xs font-semibold text-slate-700">{c.endDate}</p>
              <p className={cls("text-xs font-bold mt-0.5", c.daysLeft <= 7 ? "text-rose-600" : c.daysLeft <= 30 ? "text-amber-600" : "text-slate-400")}>
                {c.daysLeft > 0 ? `${c.daysLeft} ${t("clients.days") || "يوم"}` : t("clients.expired") || "منتهي"}
              </p>
            </div>
          );
          if (key === "status") { const b = getClientBadge(c.daysLeft); return <StatusBadge status={b.status} label={b.label} icon={b.icon} />; }
          if (key === "actions") return (
            <ActionPill><TipIconBtn tooltip={t("clients.sendReminder")} variant="success"><Send className="h-3.5 w-3.5" /></TipIconBtn></ActionPill>
          );
          return null;
        }}
      />
    </TabPane>
  );
}

/* ─────────────────────────────────────────────────────────────
   PACKAGES TAB
───────────────────────────────────────────────────────────── */
function PackagesTab({ t }) {
  const [packages, setPackages] = useState([
    { id: 1, name: "حزمة البداية",     nameEn: "Starter Package",  price: 500,  duration: "شهري", features: ["3 جلسات تدريبية", "دعم عبر الواتساب", "خطة تمارين مخصصة"] },
    { id: 2, name: "الحزمة الذهبية",   nameEn: "Gold Package",     price: 1200, duration: "شهري", features: ["8 جلسات تدريبية", "دعم 24/7", "خطة تمارين وتغذية", "متابعة أسبوعية"] },
    { id: 3, name: "الحزمة البلاتينية", nameEn: "Platinum Package", price: 2500, duration: "شهري", features: ["جلسات غير محدودة", "دعم VIP", "خطة شاملة", "تحليل جسم شامل", "مكملات غذائية"] },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportingPackages, setExportingPackages] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({ name: "", nameEn: "", price: "", duration: "شهري", features: [""] });

  const handleAddFeature    = () => setFormData(p => ({ ...p, features: [...p.features, ""] }));
  const handleRemoveFeature = i  => setFormData(p => ({ ...p, features: p.features.filter((_, j) => j !== i) }));
  const handleFeatureChange = (i, v) => setFormData(p => { const f = [...p.features]; f[i] = v; return { ...p, features: f }; });
  const handleSubmit = () => {
    if (editingPackage) setPackages(ps => ps.map(p => p.id === editingPackage.id ? { ...p, ...formData } : p));
    else setPackages(ps => [...ps, { id: Date.now(), ...formData }]);
    setIsDialogOpen(false); setEditingPackage(null);
    setFormData({ name: "", nameEn: "", price: "", duration: "شهري", features: [""] });
  };
  const handleEdit = pkg => {
    setEditingPackage(pkg);
    setFormData({ name: pkg.name, nameEn: pkg.nameEn, price: pkg.price, duration: pkg.duration, features: pkg.features });
    setIsDialogOpen(true);
  };
  const handleExport = async () => {
    if (!phoneNumber) return;
    setExportingPackages(true);
    await new Promise(r => setTimeout(r, 1800));
    setExportingPackages(false); setIsExportDialogOpen(false); setPhoneNumber("");
    alert(t("packages.exportSuccess", { phone: phoneNumber }));
  };

  const pkgPalettes = [
    { from: "#eff6ff", to: "#e0e7ff", accent: "#3b82f6" },
    { from: "#fffbeb", to: "#fef9c3", accent: "#f59e0b" },
    { from: "#faf5ff", to: "#ede9fe", accent: "#8b5cf6" },
  ];

  const inputCls = "h-11 w-full rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]";

  return (
    <TabPane>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight"
            style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("packages.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 font-medium">{t("packages.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dialog */}
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-4 text-sm font-bold text-[color:var(--color-primary-700)] shadow-sm transition-all hover:bg-[color:var(--color-primary-50)] focus:outline-none">
                <Send className="h-4 w-4" />{t("packages.exportAll")}
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">{t("packages.exportDialog.title")}</DialogTitle>
                <DialogDescription>{t("packages.exportDialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div>
                  <Label className="text-sm font-bold mb-2 block">{t("packages.exportDialog.phoneLabel")}</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 h-4 w-4 text-slate-400" />
                    <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} type="tel" placeholder="01XXXXXXXXX"
                      className="h-11 w-full rounded-lg border border-[color:var(--color-primary-200)] bg-white ltr:pl-9 rtl:pr-9 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]" />
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p className="text-xs font-medium text-blue-800">{t("packages.exportDialog.info")}</p>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setIsExportDialogOpen(false)} className="h-9 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-4 text-sm font-bold hover:bg-[color:var(--color-primary-50)]">{t("common.cancel")}</button>
                <button onClick={handleExport} disabled={!phoneNumber || exportingPackages}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-green-600 px-5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-50">
                  {exportingPackages ? <><RefreshCw className="h-4 w-4 animate-spin" />{t("packages.exportDialog.sending")}</> : <><Send className="h-4 w-4" />{t("packages.exportDialog.send")}</>}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add/edit dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button onClick={() => { setEditingPackage(null); setFormData({ name: "", nameEn: "", price: "", duration: "شهري", features: [""] }); }}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white shadow transition-all hover:opacity-90 active:scale-[.97] focus:outline-none"
                style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 4px 14px -4px var(--color-primary-500)" }}>
                <Plus className="h-4 w-4" />{t("packages.addNew")}
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">{editingPackage ? t("packages.edit") : t("packages.addNew")}</DialogTitle>
                <DialogDescription>{t("packages.dialogDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-3">
                <div className="grid grid-cols-2 gap-3">
                  {[["name", t("packages.form.nameAr")], ["nameEn", t("packages.form.nameEn")]].map(([field, label]) => (
                    <div key={field}>
                      <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide">{label}</Label>
                      <input value={formData[field]} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))} className={inputCls} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide">{t("packages.form.price")}</Label>
                    <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide">{t("packages.form.duration")}</Label>
                    <Select value={formData.duration} onValueChange={v => setFormData(p => ({ ...p, duration: v }))}>
                      <SelectTrigger className="h-11 rounded-lg border-[color:var(--color-primary-200)]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[["شهري","monthly"],["ربع سنوي","quarterly"],["نصف سنوي","semiAnnual"],["سنوي","annual"]].map(([v, k]) => (
                          <SelectItem key={v} value={v}>{t(`packages.form.${k}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wide">{t("packages.form.features")}</Label>
                    <button type="button" onClick={handleAddFeature}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-2.5 text-xs font-bold text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)]">
                      <Plus className="h-3 w-3" />{t("packages.form.addFeature")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.features.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={f} onChange={e => handleFeatureChange(i, e.target.value)}
                          placeholder={`${t("packages.form.feature")} ${i + 1}`} className={cls(inputCls, "flex-1")} />
                        {formData.features.length > 1 && (
                          <button type="button" onClick={() => handleRemoveFeature(i)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setIsDialogOpen(false)} className="h-9 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-4 text-sm font-bold hover:bg-[color:var(--color-primary-50)]">{t("common.cancel")}</button>
                <button onClick={handleSubmit} className="h-9 rounded-lg px-5 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
                  {editingPackage ? t("common.update") : t("common.save")}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Package cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, i) => {
          const pal = pkgPalettes[i % pkgPalettes.length];
          return (
            <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.45 }} whileHover={{ y: -8, scale: 1.015 }}
              className="group relative overflow-hidden rounded-lg border-2 border-white/70 shadow-lg hover:shadow-2xl transition-all duration-300"
              style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: pal.accent }} />
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.65 }} />
              <div className="relative p-6">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{pkg.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{pkg.nameEn}</p>
                  </div>
                  <div className="flex gap-1">
                    <TipIconBtn tooltip={t("common.edit")} onClick={() => handleEdit(pkg)}><Edit className="h-3.5 w-3.5" /></TipIconBtn>
                    <TipIconBtn tooltip={t("common.delete")} onClick={() => setPackages(ps => ps.filter(p => p.id !== pkg.id))} variant="danger"><Trash2 className="h-3.5 w-3.5" /></TipIconBtn>
                  </div>
                </div>
                <div className="mb-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-slate-900">{pkg.price}</span>
                    <span className="text-sm font-bold text-slate-500">{t("currency")}</span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{pkg.duration}</p>
                </div>
                <div className="space-y-2">
                  {pkg.features.map((feat, fi) => (
                    <motion.div key={fi} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: fi * 0.07 }}
                      className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{ background: pal.accent + "22", color: pal.accent }}>
                        <CheckCircle className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </TabPane>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUBSCRIPTIONS TAB
───────────────────────────────────────────────────────────── */
function SubscriptionsTab({ t }) {
  const [filters, setFilters] = useState({ client: "", fromDate: null, toDate: null, sort: "newest" });
  const [loading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const payments = [
    { id: 1, clientName: "يسرا علام",    email: "yosra@example.com",  phone: "01002766903", description: "Monthly subscription - Premium tier",    amount: 2500,  date: "2025-01-12", time: "14:32", periodFrom: "2025-01-01", periodTo: "2025-01-31" },
    { id: 2, clientName: "أحمد محمد",   email: "ahmed@example.com",  phone: "01112345678", description: "Quarterly payment - Business plan",       amount: 5000,  date: "2025-01-10", time: "11:20", periodFrom: "2025-01-01", periodTo: "2025-03-31" },
    { id: 3, clientName: "Sarah Johnson",email: "sarah.j@example.com",phone: "+1234567890", description: "Annual subscription - Enterprise",        amount: 15000, date: "2025-01-08", time: "09:45", periodFrom: "2025-01-01", periodTo: "2025-12-31" },
  ];

  const subStats = [
    { label: t("subscriptions.stats.active"),  value: "23",     icon: Users,      bgFrom: "#eff6ff", bgTo: "#e0e7ff", iconColor: "text-blue-600" },
    { label: t("subscriptions.stats.revenue"), value: "12,500", icon: DollarSign, bgFrom: "#ecfdf5", bgTo: "#d1fae5", iconColor: "text-emerald-600" },
    { label: t("subscriptions.stats.renewal"), value: "94%",    icon: RefreshCw,  bgFrom: "#faf5ff", bgTo: "#ede9fe", iconColor: "text-violet-600" },
  ];

  const filterChips = useMemo(() => {
    const chips = [];
    if (filters.client && filters.client !== "all") chips.push({ key: "client", label: `${t("filters.client")}: ${filters.client}` });
    if (filters.fromDate) chips.push({ key: "fromDate", label: `${t("filters.fromDate")}: ${new Date(filters.fromDate).toLocaleDateString("ar-EG")}` });
    if (filters.toDate)   chips.push({ key: "toDate",   label: `${t("filters.toDate")}: ${new Date(filters.toDate).toLocaleDateString("ar-EG")}` });
    if (filters.sort)     chips.push({ key: "sort",     label: `${t("filters.sort")}: ${t(`filters.${filters.sort}`)}` });
    return chips;
  }, [filters, t]);

  const columns = [
    { key: "client",      label: t("table.client") },
    { key: "description", label: t("table.description") },
    { key: "period",      label: t("table.period") },
    { key: "date",        label: t("table.date") },
    { key: "amount",      label: t("table.amount"), align: "right" },
    { key: "actions",     label: t("table.actions"), align: "center" },
  ];

  return (
    <TabPane>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {subStats.map((s, i) => <KpiCard key={s.label} {...s} idx={i} />)}
      </div>

      {/* Filter card */}
      <Surface>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: "linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))" }}>
                <Filter className="h-5 w-5" style={{ color: "var(--color-primary-600)" }} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{t("filters.title")}</p>
                <p className="text-xs text-slate-500">{t("filters.subtitle") || "فلترة النتائج"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFilters({ client: "", fromDate: null, toDate: null, sort: "newest" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-xs font-bold text-slate-600 hover:bg-[color:var(--color-primary-50)]">
                <RefreshCw className="h-3.5 w-3.5" />{t("filters.reset")}
              </button>
              <button onClick={() => setShowFilters(s => !s)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-xs font-bold text-slate-600 hover:bg-[color:var(--color-primary-50)]">
                {showFilters ? t("filters.hide") : t("filters.show")}
                <ChevronDown className={cls("h-3.5 w-3.5 transition-transform", showFilters ? "rotate-180" : "")} />
              </button>
            </div>
          </div>

          {filterChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filterChips.map(c => (
                <span key={c.key} className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold"
                  style={{ borderColor: "var(--color-primary-200)", background: "var(--color-primary-50)", color: "var(--color-primary-700)" }}>
                  {c.label}
                </span>
              ))}
            </div>
          )}

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t("filters.client")}</Label>
                    <Select value={filters.client} onValueChange={v => setFilters(f => ({ ...f, client: v }))}>
                      <SelectTrigger className="h-10 rounded-lg border-[color:var(--color-primary-200)]">
                        <SelectValue placeholder={t("filters.selectClient")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("filters.allClients")}</SelectItem>
                        <SelectItem value="client1">Client 1</SelectItem>
                        <SelectItem value="client2">Client 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t("filters.fromDate")}</Label>
                    <Flatpickr value={filters.fromDate} onChange={([d]) => setFilters(f => ({ ...f, fromDate: d }))}
                      options={{ dateFormat: "Y-m-d" }}
                      className="h-10 w-full rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]"
                      placeholder={t("filters.selectDate")} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t("filters.toDate")}</Label>
                    <Flatpickr value={filters.toDate} onChange={([d]) => setFilters(f => ({ ...f, toDate: d }))}
                      options={{ dateFormat: "Y-m-d" }}
                      className="h-10 w-full rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]"
                      placeholder={t("filters.selectDate")} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t("filters.sort")}</Label>
                    <Select value={filters.sort} onValueChange={v => setFilters(f => ({ ...f, sort: v }))}>
                      <SelectTrigger className="h-10 rounded-lg border-[color:var(--color-primary-200)]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[["newest","newest"],["oldest","oldest"],["amountHigh","amountHigh"],["amountLow","amountLow"]].map(([v, k]) => (
                          <SelectItem key={v} value={v}>{t(`filters.${k}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Surface>

      {loading ? (
        <Surface><div className="space-y-3 p-5">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div></Surface>
      ) : (
        <DataTable
          headerTitle={t("payments.history")}
          headerSubtitle={t("payments.historyDescription")}
          headerRight={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
                style={{ borderColor: "var(--color-primary-200)", background: "var(--color-primary-50)", color: "var(--color-primary-700)" }}>
                <Receipt className="h-3.5 w-3.5" />{t("payments.total", { count: payments.length })}
              </span>
              <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 text-xs font-bold text-[color:var(--color-primary-700)] shadow-sm hover:bg-[color:var(--color-primary-50)]">
                <Download className="h-3.5 w-3.5" />{t("common.export")}
              </button>
            </div>
          }
          columns={columns} rows={payments} getRowKey={p => p.id} pageSize={7}
          emptyTitle={t("payments.empty")} emptyIcon={Receipt} emptyDescription={t("payments.emptyDescription")}
          renderCell={(p, key) => {
            if (key === "client")      return <div><p className="text-sm font-bold text-slate-900">{p.clientName}</p><p className="text-xs text-slate-400">{p.email}</p>{p.phone && <p className="text-xs text-slate-400">{p.phone}</p>}</div>;
            if (key === "description") return <p className="text-sm text-slate-600 font-medium">{p.description}</p>;
            if (key === "period")      return <div><p className="text-xs font-semibold text-slate-700">{p.periodFrom}</p><p className="text-xs text-slate-400">{t("table.to")} {p.periodTo}</p></div>;
            if (key === "date")        return <div><p className="text-xs font-semibold text-slate-700">{p.date}</p><p className="text-xs text-slate-400">{p.time}</p></div>;
            if (key === "amount")      return <div className="text-right"><p className="text-base font-black text-slate-900">{p.amount.toLocaleString()}</p><p className="text-[10px] font-semibold text-slate-400">{t("currency")}</p></div>;
            if (key === "actions")     return <ActionPill><TipIconBtn tooltip={t("table.view")}><Eye className="h-3.5 w-3.5" /></TipIconBtn><PillDivider /><TipIconBtn tooltip={t("common.delete")} variant="danger"><Trash2 className="h-3.5 w-3.5" /></TipIconBtn></ActionPill>;
            return null;
          }}
        />
      )}
    </TabPane>
  );
}

/* ─────────────────────────────────────────────────────────────
   CLIENT PAYMENTS TAB
───────────────────────────────────────────────────────────── */
function FieldError({ msg }) {
  return msg ? (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-rose-600">
      <AlertCircle className="h-3.5 w-3.5" />{msg}
    </motion.p>
  ) : null;
}

function FormField({ label, required, error, children }) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-bold text-slate-700">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </Label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

function ClientPaymentsTab({ t }) {
  const [formData, setFormData] = useState({ client: "", amount: "", description: "", periodFrom: null, periodTo: null });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(null);
  const [error, setError]       = useState(null);

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!formData.client)                                    e.client      = t("form.errors.clientRequired");
    if (!formData.amount || parseFloat(formData.amount) <= 0) e.amount     = t("form.errors.amountRequired");
    if (!formData.description)                               e.description = t("form.errors.descriptionRequired");
    if ((formData.periodFrom && !formData.periodTo) || (!formData.periodFrom && formData.periodTo)) e.period = t("form.errors.periodRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await new Promise(r => setTimeout(r, 1500));
      setSuccess(t("form.success"));
      setFormData({ client: "", amount: "", description: "", periodFrom: null, periodTo: null });
      setTimeout(() => setSuccess(null), 5000);
    } catch { setError(t("form.errors.submitFailed")); }
    finally   { setSubmitting(false); }
  };

  const inputCls = hasError => cls(
    "h-12 w-full rounded-lg border bg-white px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]",
    hasError ? "border-rose-400 bg-rose-50/50" : "border-[color:var(--color-primary-200)]"
  );

  return (
    <TabPane className="max-w-3xl mx-auto">
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">{success}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Surface accent glow>
        <div className="flex items-center gap-4 border-b border-[color:var(--color-primary-50)] p-5 sm:p-6">
          <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.6 }}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 8px 24px -8px var(--color-primary-500)" }}>
            <Plus className="h-7 w-7 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{t("form.title")}</h2>
            <p className="mt-0.5 text-sm text-slate-500 font-medium">{t("form.description")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
          <FormField label={t("form.client")} required error={errors.client}>
            <Select value={formData.client} onValueChange={v => set("client", v)}>
              <SelectTrigger className={cls("h-12 rounded-lg", errors.client ? "border-rose-400" : "border-[color:var(--color-primary-200)]")}>
                <SelectValue placeholder={t("form.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client1">Client 1 - John Doe</SelectItem>
                <SelectItem value="client2">Client 2 - Jane Smith</SelectItem>
                <SelectItem value="client3">Client 3 - Bob Johnson</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label={t("form.amount")} required error={errors.amount}>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:left-3.5 rtl:right-3.5 h-4 w-4 text-slate-400" />
              <input type="number" step="0.01" min="0" value={formData.amount}
                onChange={e => set("amount", e.target.value)} placeholder="0.00"
                className={cls(inputCls(errors.amount), "ltr:pl-10 rtl:pr-10")} />
            </div>
          </FormField>

          <FormField label={t("form.description")} required error={errors.description}>
            <textarea rows={4} value={formData.description} onChange={e => set("description", e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              className={cls(
                "w-full resize-none rounded-lg border bg-white p-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]",
                errors.description ? "border-rose-400 bg-rose-50/50" : "border-[color:var(--color-primary-200)]"
              )} />
          </FormField>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              {t("form.period")} <span className="font-normal text-slate-400">({t("form.optional")})</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[["periodFrom", "form.periodFrom"], ["periodTo", "form.periodTo"]].map(([field, labelKey]) => (
                <div key={field}>
                  <Label className="mb-1.5 block text-xs font-semibold text-slate-400">{t(labelKey)}</Label>
                  <Flatpickr value={formData[field]} onChange={([d]) => set(field, d)}
                    options={{ dateFormat: "Y-m-d" }}
                    className={cls(inputCls(errors.period))}
                    placeholder={t("filters.selectDate")} />
                </div>
              ))}
            </div>
            <FieldError msg={errors.period} />
          </div>

          <motion.button type="submit" disabled={submitting}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="relative w-full overflow-hidden rounded-lg py-3.5 text-base font-black text-white transition-all disabled:opacity-60 focus:outline-none"
            style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 8px 24px -8px var(--color-primary-500)" }}>
            <motion.div className="absolute inset-0 bg-white/20" initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.5 }} />
            <span className="relative flex items-center justify-center gap-2">
              {submitting
                ? <><RefreshCw className="h-5 w-5 animate-spin" />{t("form.submitting")}</>
                : <><CheckCircle className="h-5 w-5" />{t("form.submit")}</>}
            </span>
          </motion.button>
        </form>
      </Surface>
    </TabPane>
  );
}