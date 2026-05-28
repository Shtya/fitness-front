'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_blue.css';
import toast from 'react-hot-toast';
import api from '@/utils/axios';

import {
  Wallet, TrendingUp, DollarSign, Clock, CheckCircle, XCircle,
  AlertCircle, Trash2, RefreshCw, Download, ArrowUpRight, ArrowDownRight,
  User, Mail, Phone, Eye, Plus, Info, Edit, Package, Send, Users, Activity,
  FileText, Receipt, Crown, BarChart3, Check, MessageCircle, Zap, Shield,
  Award, CreditCard, Banknote, Smartphone, Hash, FileDown, X,
} from 'lucide-react';

import { PageHeader } from '@/components/molecules/PageHeader';
import DataTable, { FilterField } from '@/components/atoms/Datatable';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/* ─── HELPERS ─── */
const cls = (...a) => a.filter(Boolean).join(' ');

const PAYMENT_METHODS = [
  { key: 'cash', apiValue: 'cash', icon: Banknote, labelKey: 'form.methodCash', activeBg: 'bg-green-600', activeBorder: 'border-green-600', activeText: 'text-green-600', inactiveIconBg: 'bg-slate-100', inactiveIconText: 'text-slate-600', activeShadow: 'shadow-[0_4px_16px_rgba(22,163,74,.3)]' },
  { key: 'bank', apiValue: 'bank_transfer', icon: Hash, labelKey: 'form.methodBank', activeBg: 'bg-blue-600', activeBorder: 'border-blue-600', activeText: 'text-blue-600', inactiveIconBg: 'bg-slate-100', inactiveIconText: 'text-slate-600', activeShadow: 'shadow-[0_4px_16px_rgba(37,99,235,.3)]' },
  { key: 'card', apiValue: 'card', icon: CreditCard, labelKey: 'form.methodCard', activeBg: 'bg-[var(--color-secondary-600)]', activeBorder: 'border-[var(--color-secondary-600)]', activeText: 'text-[var(--color-secondary-600)]', inactiveIconBg: 'bg-slate-100', inactiveIconText: 'text-slate-600', activeShadow: 'shadow-[0_4px_16px_rgba(147,51,234,.3)]' },
  { key: 'wallet', apiValue: 'wallet', icon: Smartphone, labelKey: 'form.methodWallet', activeBg: 'bg-amber-600', activeBorder: 'border-amber-600', activeText: 'text-amber-600', inactiveIconBg: 'bg-slate-100', inactiveIconText: 'text-slate-600', activeShadow: 'shadow-[0_4px_16px_rgba(217,119,6,.3)]' },
];

const QUICK_AMOUNTS = [500, 1000, 1200, 2500, 5000, 12000];

function toYMD(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function money(v) { return Number(v || 0); }

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'U';
}

function getPlanDurationLabel(interval, t) {
  const map = { monthly: t('packages.form.monthly'), quarterly: t('packages.form.quarterly'), yearly: t('packages.form.annual'), one_time: t('packages.form.oneTime') };
  return map[interval] || interval || '—';
}

function getPlanIntervalFromDuration(duration) {
  if (duration === 'monthly') return 'monthly';
  if (duration === 'quarterly') return 'quarterly';
  if (duration === 'yearly' || duration === 'annual') return 'yearly';
  return 'monthly';
}

function mapPlanToUi(plan, t) {
  return { id: plan.id, name: plan.name, nameEn: plan.name, price: money(plan.price), duration: getPlanDurationLabel(plan.interval, t), features: Array.isArray(plan.features) ? plan.features : [], raw: plan };
}

function daysLeftFromEnd(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getClientStatusByDays(daysLeft, t) {
  if (daysLeft == null) return { key: 'ended', icon: XCircle, label: t('clients.status.ended') };
  if (daysLeft <= 0) return { key: 'expiring', icon: XCircle, label: t('clients.status.ended') };
  if (daysLeft <= 7) return { key: 'expiring', icon: AlertCircle, label: t('clients.status.expiringSoon') };
  if (daysLeft <= 30) return { key: 'warn', icon: RefreshCw, label: t('clients.status.renewalDue') };
  return { key: 'active', icon: CheckCircle, label: t('clients.status.active') };
}

function mapClientToClientRow(client) {
  const endDate = client.renewalDate || client.subscriptionEnd || null;
  const daysLeft = daysLeftFromEnd(endDate);
  return {
    id: client.id,
    userId: client.id,
    subscriptionId: client.currentSubscriptionId || null,
    name: client.name || '—',
    email: client.email || '—',
    phone: client.phone || '—',
    package: client.currentPackage || client.membership || '—',
    startDate: client.subscriptionStart || '—',
    endDate: endDate || '—',
    daysLeft,
    avatar: getInitials(client.name),
    raw: client,
  };
}

function paymentStatusToUi(status, t) {
  if (status === 'succeeded') return { key: 'completed', label: t('status.completed'), icon: CheckCircle };
  if (status === 'failed') return { key: 'failed', label: t('status.failed'), icon: XCircle };
  return { key: 'pending', label: t('status.pending'), icon: Clock };
}

function buildQuery(obj = {}) {
  const params = {};
  Object.keys(obj).forEach((k) => { const v = obj[k]; if (v === undefined || v === null || v === '' || v === 'all') return; params[k] = v; });
  return params;
}

/* ─── SURFACE ─── */
function Surface({ children, className = '', accent = false, glow = false, id }) {
  return (
    <div id={id} className={cls('relative overflow-hidden rounded-2xl border bg-white/90 backdrop-blur-xl', 'border-[var(--color-primary-100)]', glow ? 'shadow-[0_0_0_1px_var(--color-primary-100),0_4px_6px_-1px_rgba(15,23,42,.05),0_20px_50px_-10px_rgba(15,23,42,.12)]' : 'shadow-[0_1px_3px_rgba(15,23,42,.04),0_10px_30px_rgba(15,23,42,.07)]', className)}>
      {children}
    </div>
  );
}

/* ─── STATUS BADGE ─── */
function StatusBadge({ status, label, icon: Icon }) {
  const map = { completed: 'border-emerald-200 bg-emerald-50 text-emerald-700', failed: 'border-rose-200 bg-rose-50 text-rose-700', pending: 'border-amber-200 bg-amber-50 text-amber-700', active: 'border-emerald-200 bg-emerald-50 text-emerald-700', expiring: 'border-rose-200 bg-rose-50 text-rose-700', warn: 'border-amber-200 bg-amber-50 text-amber-700', ended: 'border-slate-200 bg-slate-50 text-slate-600' };
  return (
    <span className={cls('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold', map[status] || map.pending)}>
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

/* ─── TOOLTIP ICON BUTTON ─── */
function TipIconBtn({ tooltip, onClick, disabled, children, variant = 'ghost' }) {
  const vars = { ghost: 'border-[var(--color-primary-100)] bg-white text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)]', danger: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100', success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100', whatsapp: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={onClick} disabled={disabled} aria-label={tooltip} className={cls('inline-flex h-8 w-8 items-center justify-center rounded-lg border', 'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]', 'disabled:opacity-50 disabled:cursor-not-allowed', 'hover:-translate-y-0.5 active:scale-95', 'shadow-[0_1px_3px_rgba(15,23,42,.07)]', vars[variant] || vars.ghost)}>
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent><p className="text-xs font-semibold">{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─── ACTION PILL ─── */
function ActionPill({ children }) {
  return <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary-100)] bg-white p-1 shadow-sm">{children}</div>;
}
function PillDivider() { return <div className="h-4 w-px bg-slate-100" aria-hidden="true" />; }

/* ─── TAB PANE ─── */
function TabPane({ children, className = '', id }) {
  return (
    <section id={id} className={cls('mt-10 space-y-6 lg:space-y-8', className)} data-aos="fade-up" data-aos-duration="400" data-aos-easing="ease-out-cubic">
      {children}
    </section>
  );
}

/* ─── FIELD ERROR ─── */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600" role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {msg}
    </p>
  );
}

/* ─── INPUT FIELD ─── */
function InputField({ label, required, error, icon: Icon, hint, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-bold text-slate-700">
          {label}
          {required && <span className="ms-1 text-rose-500" aria-hidden="true">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 rtl:right-3.5 ltr:left-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-50)]" aria-hidden="true">
            <Icon className="h-4 w-4 text-[var(--color-primary-500)]" />
          </div>
        )}
        {children}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN BILLING PAGE
══════════════════════════════════════════ */
export default function BillingPage() {
  const t = useTranslations('billing');
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'overview';

  const [overviewStats, setOverviewStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [clientRows, setClientRows] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const loadOverviewStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data } = await api.get('/billing/stats/overview');
      setOverviewStats(data || null);
    } catch (e) {
      console.error(e);
      toast.error(t('errors.loadStats'));
    } finally {
      setStatsLoading(false);
    }
  }, [t]);

  const loadClientsBase = useCallback(async () => {
    try {
      setClientsLoading(true);
      const { data } = await api.get('/billing/clients', { params: { page: 1, limit: 200 } });
      const items = Array.isArray(data?.items) ? data.items : [];
      setClientRows(items.map(mapClientToClientRow));
    } catch (e) {
      console.error(e);
      toast.error(t('errors.loadClients'));
    } finally {
      setClientsLoading(false);
    }
  }, [t]);

  useEffect(() => { loadOverviewStats(); loadClientsBase(); }, [loadOverviewStats, loadClientsBase]);

  const walletData = useMemo(() => {
    const cards = overviewStats?.cards || {};
    return {
      balance: Number(cards.outstandingAmount || 0),
      totalEarned: Number(cards.revenueCollected || 0),
      totalWithdrawn: 0,
      moneyInThisMonth: Number(cards.revenueCollected || 0),
      pendingPayments: Number(cards.outstandingAmount || 0),
      transactionCount: Number(cards.totalPayments || 0),
      activeClients: Number(cards.activeSubscriptions || 0),
    };
  }, [overviewStats]);

  const handleTabChange = useCallback((id) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', id);
    router.push(`?${p.toString()}`);
  }, [searchParams, router]);

  const clientStats = useMemo(() => {
    const total = clientRows.length;
    const active = clientRows.filter((c) => (c.daysLeft || 0) > 30).length;
    const r7 = clientRows.filter((c) => (c.daysLeft || 0) > 0 && (c.daysLeft || 0) <= 7).length;
    const r30 = clientRows.filter((c) => (c.daysLeft || 0) > 7 && (c.daysLeft || 0) <= 30).length;
    return { total, active, r7, r30 };
  }, [clientRows]);

  const STATS = useMemo(() => {
    if (activeTab === 'clients') return [
      { label: t('kpi.totalClients'), value: String(clientStats.total), icon: Users, change: null },
      { label: t('kpi.activeClients'), value: String(clientStats.active), icon: CheckCircle, change: null },
      { label: t('kpi.urgentRenewal'), value: String(clientStats.r7), icon: AlertCircle, change: null },
      { label: t('kpi.soonRenewal'), value: String(clientStats.r30), icon: RefreshCw, change: null },
    ];
    if (activeTab === 'subscriptions') return [
      { label: t('kpi.activeSubscriptions'), value: String(overviewStats?.cards?.activeSubscriptions || 0), icon: Users, change: null },
      { label: t('kpi.monthlyRevenue'), value: `${money(overviewStats?.cards?.revenueCollected).toLocaleString()} ${t('currency')}`, icon: DollarSign, change: null },
      { label: t('kpi.renewalRate'), value: overviewStats?.cards?.totalSubscriptions ? `${Math.round((Number(overviewStats?.cards?.activeSubscriptions || 0) / Number(overviewStats?.cards?.totalSubscriptions || 1)) * 100)}%` : '0%', icon: RefreshCw, change: null },
    ]; 
    if (activeTab === 'payments') return [
      { label: t('kpi.totalPayments'), value: String(walletData.transactionCount), icon: Receipt, change: null },
      { label: t('kpi.totalEarned.title'), value: `${walletData.totalEarned.toLocaleString()} ${t('currency')}`, icon: TrendingUp, change: null },
    ];
    if (activeTab === 'communications') return [
      { label: t('kpi.activeClients'), value: String(clientRows.length), icon: Users, change: null },
    ];
    return [
      { label: t('kpi.walletBalance.title'), value: `${walletData.balance.toLocaleString()} ${t('currency')}`, icon: Wallet, change: null },
      { label: t('kpi.totalEarned.title'), value: `${walletData.totalEarned.toLocaleString()} ${t('currency')}`, icon: TrendingUp, change: null },
      { label: t('kpi.moneyInThisMonth.title'), value: `${walletData.moneyInThisMonth.toLocaleString()} ${t('currency')}`, icon: ArrowDownRight, change: null },
      { label: t('kpi.pendingPayments'), value: `${walletData.pendingPayments.toLocaleString()} ${t('currency')}`, icon: Clock, change: null },
    ];
  }, [activeTab, clientStats, overviewStats, t, walletData, clientRows.length]);

  const TABS = useMemo(() => [
    { id: 'overview', label: t('tabs.overview'), icon: Activity, count: walletData.transactionCount },
    { id: 'clients', label: t('tabs.clients'), icon: Users, count: clientRows.length },
    { id: 'subscriptions', label: t('tabs.subscriptions'), icon: Crown, count: Number(overviewStats?.cards?.activeSubscriptions || 0) },
    { id: 'payments', label: t('tabs.payments'), icon: Receipt },
    { id: 'communications', label: t('tabs.communications'), icon: MessageCircle },
  ], [t, walletData, clientRows.length, overviewStats]);

  const HEADER_FILTERS = [
    { key: 'status', label: t('filters.status'), type: 'toggle', options: [{ value: 'completed', label: t('status.completed') }, { value: 'pending', label: t('status.pending') }, { value: 'failed', label: t('status.failed') }] },
    { key: 'type', label: t('filters.type'), type: 'toggle', options: [{ value: 'subscription', label: t('filters.subscription') }, { value: 'withdrawal', label: t('filters.withdrawal') }, { value: 'refund', label: t('filters.refund') }] },
  ];

  const [headerFilters, setHeaderFilters] = useState({ status: '', type: '' });

  return (
    <div id="billing-page" className="relative">
      <PageHeader
        title={t('title')}
        desc={t('subtitle')}
        icon={Wallet}
        stats={statsLoading ? [] : STATS}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        filters={HEADER_FILTERS}
        filterValues={headerFilters}
        onFilterChange={(k, v) => setHeaderFilters((f) => ({ ...f, [k]: v }))}
        onFilterReset={() => setHeaderFilters({ status: '', type: '' })}
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={t('tooltips.pageInfo')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.16] backdrop-blur-[16px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.3)] transition-transform hover:scale-105 active:scale-95">
                    <Info className="h-4 w-4 text-white" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{t('tooltips.pageInfo')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button type="button" onClick={() => { loadOverviewStats(); loadClientsBase(); }} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black text-white bg-white/[.22] backdrop-blur-[16px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.3),0_4px_16px_rgba(0,0,0,.1)] transition-transform hover:scale-[1.04] active:scale-95">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('common.refresh')}
            </button>
          </div>
        }
      />

      <div id="billing-content" className="container py-6 lg:py-8">
        {activeTab === 'overview' && <OverviewTab key="overview" t={t} onNav={handleTabChange} />}
        {activeTab === 'clients' && <ClientsTab key="clients" t={t} initialData={clientRows} loading={clientsLoading} onRefresh={loadClientsBase} />}
        {activeTab === 'subscriptions' && <SubscriptionsTab key="subscriptions" t={t} />}
        {activeTab === 'payments' && <PaymentsTab key="payments" t={t} clients={clientRows} onSuccessRefresh={() => { loadOverviewStats(); loadClientsBase(); }} />}
        {activeTab === 'communications' && <CommunicationsTab key="communications" t={t} clients={clientRows} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════ */
function OverviewTab({ t, onNav }) {
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/billing/payments', { params: { page: 1, limit: 50 } });
      const items = Array.isArray(data?.items) ? data.items : [];
      setTransactions(items.map((p) => ({
        id: p.id, status: p.status,
        description: p.notes || p.invoice?.description || p.provider || '—',
        date: p.paidAt || p.created_at?.slice?.(0, 10) || '—',
        time: p.created_at ? new Date(p.created_at).toLocaleTimeString() : '—',
        amount: money(p.amount),
        client: p.user?.name || t('common.system'),
        raw: p,
      })));
    } catch (e) {
      console.error(e);
      toast.error(t('errors.loadPayments'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const filteredTransactions = useMemo(() => transactions.filter((row) => {
    const q = String(filters.search || '').toLowerCase();
    const matchQ = !q || String(row.client || '').toLowerCase().includes(q) || String(row.description || '').toLowerCase().includes(q);
    const matchStatus = !filters.status || filters.status === 'all' || paymentStatusToUi(row.status, t).key === filters.status;
    return matchQ && matchStatus;
  }), [transactions, filters, t]);

  const COLUMNS = [
    {
      key: 'status',
      header: t('table.status'),
      cell: (row) => { const s = paymentStatusToUi(row.status, t); return <StatusBadge status={s.key} label={s.label} icon={s.icon} />; },
    },
    {
      key: 'client',
      header: t('table.client'),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)]">
            <User className="h-4 w-4 text-[var(--color-primary-600)]" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-900">{row.client}</span>
        </div>
      ),
    },
    { key: 'description', header: t('table.description'), cell: (row) => <span className="text-sm text-slate-600 font-medium">{row.description}</span> },
    { key: 'date', header: t('table.date'), cell: (row) => <div><p className="text-sm font-semibold text-slate-700">{row.date}</p><p className="text-xs text-slate-400">{row.time}</p></div> },
    { key: 'amount', header: t('table.amount'), cell: (row) => <span className={cls('text-base font-black', row.amount > 0 ? 'text-emerald-700' : 'text-rose-700')}>{row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()} {t('currency')}</span> },
  ];

  return (
    <TabPane id="tab-overview">
      <DataTable
        title={t('transactions.recent')}
        subtitle={t('transactions.recentSubtitle')}
        data={filteredTransactions}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        isLoading={loading}
        searchValue={filters.search || ''}
        onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
        labels={{ searchPlaceholder: t('common.search'), filter: t('common.apply'), emptyTitle: t('transactions.empty') }}
        hasActiveFilters={!!filters.status}
        isFiltersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        filters={
          <FilterField label={t('filters.status')}>
            <Select value={filters.status || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="h-9 rounded-lg text-xs border-[var(--color-primary-200)]"><SelectValue placeholder={t('common.all')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
                <SelectItem value="pending">{t('status.pending')}</SelectItem>
                <SelectItem value="failed">{t('status.failed')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        }
        actions={[
          { key: 'viewAll', label: t('common.viewAll'), color: 'default', icon: <ArrowUpRight size={14} aria-hidden="true" />, onClick: () => onNav('subscriptions') },
          { key: 'reload', label: t('common.refresh'), color: 'default', icon: <RefreshCw size={14} aria-hidden="true" />, onClick: loadTransactions },
        ]}
        headerExtra={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1.5 text-xs font-bold">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('payments.total', { count: filteredTransactions.length })}
          </span>
        }
        pagination={null}
      />
    </TabPane>
  );
}

/* ══════════════════════════════════════════
   CLIENTS TAB
══════════════════════════════════════════ */
function ClientsTab({ t, initialData = [], loading = false, onRefresh }) {
  const [filters, setFilters] = useState({ package: 'all', status: 'all' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filteredData = useMemo(() => initialData
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || String(c.name).toLowerCase().includes(q) || String(c.email).toLowerCase().includes(q) || String(c.phone).toLowerCase().includes(q);
      const matchPkg = filters.package === 'all' || !filters.package || c.package === filters.package;
      const { key } = getClientStatusByDays(c.daysLeft, t);
      const matchStatus = filters.status === 'all' || !filters.status || key === filters.status;
      return matchSearch && matchPkg && matchStatus;
    })
    .sort((a, b) => (a.daysLeft ?? 999999) - (b.daysLeft ?? 999999)),
    [search, filters, initialData, t]);

  const uniquePackages = useMemo(() => [...new Set(initialData.map((c) => c.package).filter(Boolean))], [initialData]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const pagedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredData.slice(start, start + perPage);
  }, [filteredData, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [search, filters.package, filters.status]);

  const COLUMNS = [
    {
      key: 'client',
      header: t('table.client'),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarFallback className="text-sm font-black text-white bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">{row.avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{row.name}</p>
            <p className="text-xs text-slate-400">{t('clients.startDate')}: {row.startDate}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('clients.contact'),
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" /><span className="truncate max-w-[140px]">{row.email}</span></div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />{row.phone}</div>
        </div>
      ),
    },
    { key: 'package', header: t('clients.package'), cell: (row) => <span className="inline-flex items-center rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-800)] px-3 py-1 text-xs font-bold">{row.package}</span> },
    {
      key: 'renewal',
      header: t('clients.renewal'),
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">{row.endDate}</p>
          <p className={cls('text-xs font-bold mt-0.5', (row.daysLeft ?? 0) <= 7 ? 'text-rose-600' : (row.daysLeft ?? 0) <= 30 ? 'text-amber-600' : 'text-slate-400')}>
            {row.daysLeft > 0 ? `${row.daysLeft} ${t('clients.days')}` : t('clients.expired')}
          </p>
        </div>
      ),
    },
    { key: 'status', header: t('table.status'), cell: (row) => { const s = getClientStatusByDays(row.daysLeft, t); return <StatusBadge status={s.key} label={s.label} icon={s.icon} />; } },
    {
      key: 'actions',
      header: t('table.actions'),
      cell: (row) => (
        <ActionPill>
          <TipIconBtn tooltip={t('clients.sendReminder')} variant="success" onClick={async () => {
            try {
              await api.post(`/billing/clients/${row.userId}/communications/send`, {
                type: 'reminder',
                template: 'renewal_reminder',
                message: `${t('communications.greeting')} ${row.name}`,
              });
              toast.success(t('clients.reminderQueued'));
            } catch (e) {
              toast.error(t('communications.sendError'));
            }
          }}>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </TipIconBtn>
          <PillDivider />
          <TipIconBtn tooltip={t('common.whatsapp')} variant="whatsapp" onClick={() => {
            const msg = `${t('communications.greeting')} ${row.name}\n${t('communications.reminderText', { package: row.package, days: row.daysLeft > 0 ? row.daysLeft : 0 })}`;
            window.open(`https://wa.me/${String(row.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
          }}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          </TipIconBtn>
        </ActionPill>
      ),
    },
  ];

  return (
    <TabPane id="tab-clients">
      <DataTable
        title={t('clients.management')}
        subtitle={`${filteredData.length} ${t('clients.results')}`}
        data={pagedData}
        columns={COLUMNS}
        rowKey={(c) => c.id}
        isLoading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        labels={{ searchPlaceholder: t('clients.search'), emptyTitle: t('clients.noResults') }}
        hasActiveFilters={!!(filters.package !== 'all' || filters.status !== 'all')}
        isFiltersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        filters={
          <>
            <FilterField label={t('filters.package')}>
              <Select value={filters.package} onValueChange={(v) => setFilters((f) => ({ ...f, package: v }))}>
                <SelectTrigger className="h-9 rounded-lg text-xs border-[var(--color-primary-200)]"><SelectValue placeholder={t('common.all')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {uniquePackages.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('filters.status')}>
              <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 rounded-lg text-xs border-[var(--color-primary-200)]"><SelectValue placeholder={t('common.all')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="active">{t('clients.status.active')}</SelectItem>
                  <SelectItem value="warn">{t('clients.status.renewalDue')}</SelectItem>
                  <SelectItem value="expiring">{t('clients.status.expiringSoon')}</SelectItem>
                  <SelectItem value="ended">{t('clients.status.ended')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </>
        }
        onApplyFilters={() => setFiltersOpen(false)}
        headerExtra={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1.5 text-xs font-bold">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t('payments.total', { count: filteredData.length })}
            </span>
            <button type="button" onClick={onRefresh} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-white px-3 text-xs font-bold text-[var(--color-primary-700)]">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('common.refresh')}
            </button>
          </div>
        }
        pagination={null}
      />
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-primary-100)] bg-white px-4 py-3 text-xs font-semibold text-slate-600">
        <span>Showing {pagedData.length} / {filteredData.length}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 px-3 rounded-lg border border-slate-200 disabled:opacity-50">Prev</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-8 px-3 rounded-lg border border-slate-200 disabled:opacity-50">Next</button>
        </div>
      </div>
    </TabPane>
  );
}

/* ══════════════════════════════════════════
   PACKAGES TAB
══════════════════════════════════════════ */
function PkgCard({ pkg, idx, onEdit, onDelete, onSendWhatsApp, t }) {
  const PALETTES = [
    { gradientFrom: 'from-[#f0f4ff]', gradientTo: 'to-[#e8edff]', border: 'border-[#dde5ff]', accentText: 'text-[var(--color-primary-600)]', accentBg: 'bg-[var(--color-primary-600)]', iconBg: 'bg-[var(--color-primary-600)]', priceBg: 'bg-white/65', badge: t('packages.starter'), BadgeIcon: Zap },
    { gradientFrom: 'from-[#fffdf0]', gradientTo: 'to-[#fff8dc]', border: 'border-amber-200', accentText: 'text-amber-600', accentBg: 'bg-amber-600', iconBg: 'bg-amber-600', priceBg: 'bg-white/65', badge: t('packages.gold'), BadgeIcon: Award, popular: true },
    { gradientFrom: 'from-[var(--color-secondary-50)]', gradientTo: 'to-[var(--color-secondary-100)]', border: 'border-[var(--color-secondary-200)]', accentText: 'text-[var(--color-secondary-600)]', accentBg: 'bg-[var(--color-secondary-600)]', iconBg: 'bg-[var(--color-secondary-600)]', priceBg: 'bg-white/65', badge: t('packages.platinum'), BadgeIcon: Shield },
  ];
  const pal = PALETTES[idx % PALETTES.length];
  const BadgeIcon = pal.BadgeIcon;
  return (
    <article className={cls('group relative flex flex-col rounded-3xl border-2 overflow-hidden bg-gradient-to-b', pal.gradientFrom, pal.gradientTo, pal.border, 'shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.025]')} aria-label={pkg.name}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-900 ease-in-out" aria-hidden="true" />
      <div className={cls('absolute inset-x-0 top-0 h-1.5 rounded-t-3xl', pal.accentBg)} aria-hidden="true" />
      {pal.popular && <div className={cls('absolute top-5 -end-8 rotate-45 px-10 py-1 text-[10px] font-black text-white', pal.accentBg)} aria-label={t('packages.mostPopular')}>{t('packages.mostPopular')}</div>}
      <div className="relative flex flex-col flex-1 p-7 pt-8">
        <div className="flex items-start justify-between mb-6 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cls('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md', pal.iconBg)}>
              <BadgeIcon className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className={cls('block text-[11px] font-black uppercase tracking-widest', pal.accentText)}>{pal.badge}</span>
              <h3 className="text-lg font-black text-slate-900 md: leading-tight truncate">{pkg.name}</h3>
              <p className="text-[11px] text-slate-400 font-medium truncate">{pkg.nameEn}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
            <TipIconBtn tooltip={t('common.edit')} onClick={onEdit}><Edit className="h-3.5 w-3.5" aria-hidden="true" /></TipIconBtn>
            <TipIconBtn tooltip={t('common.delete')} onClick={onDelete} variant="danger"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></TipIconBtn>
          </div>
        </div>
        <div className={cls('mb-7 rounded-2xl p-5 text-center border backdrop-blur-sm', pal.priceBg, pal.border)}>
          <p className={cls('text-[11px] font-black uppercase tracking-widest mb-1', pal.accentText)}>{pkg.duration}</p>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className={cls('text-5xl font-black md: leading-none', pal.accentText)}>{pkg.price.toLocaleString()}</span>
            <span className="text-base font-bold text-slate-500">{t('currency')}</span>
          </div>
        </div>
        <ul className="flex-1 space-y-3 mb-8">
          {pkg.features.map((feat, fi) => (
            <li key={fi} className="flex items-center gap-3">
              <span className={cls('flex h-5 w-5 shrink-0 items-center justify-center rounded-full shadow-sm', pal.accentBg)}>
                <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-slate-700">{feat}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onSendWhatsApp} className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-black text-white bg-gradient-to-r from-green-600 to-green-700 shadow-[0_8px_24px_rgba(22,163,74,.4)] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[.97]">
          <MessageCircle className="h-4 w-4 relative z-10" aria-hidden="true" />
          <span className="relative z-10">{t('packages.sendToClient')}</span>
        </button>
      </div>
    </article>
  );
}

function SendAllWhatsAppDialog({ packages, t, open, onClose }) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const intro = `${t('communications.greeting')}${clientName ? ` ${clientName}` : ''}! 👋\n\n${t('packages.exportDialog.offerIntro')}\n\n`;
    const body = packages.map((pkg, i) => {
      const tiers = [t('packages.starter'), t('packages.gold'), t('packages.platinum')];
      return `${['🔵', '⭐', '💜'][i % 3]} *${pkg.name}* — ${tiers[i % 3]}\n💰 ${pkg.price.toLocaleString()} ${t('currency')} / ${pkg.duration}\n✅ ${pkg.features.join(' • ')}\n`;
    }).join('\n');
    const outro = `\n${t('packages.exportDialog.outro')} 🚀`;
    const clean = phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(intro + body + outro)}`, '_blank');
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); setStep(1); setPhone(''); setClientName(''); }, 1500);
  };

  const inputBase = 'h-11 w-full rounded-xl border border-[var(--color-primary-200)] bg-white px-4 rtl:pr-9 ltr:pl-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setStep(1); setPhone(''); setClientName(''); } }}>
      <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden gap-0">
        <div className="relative overflow-hidden p-6 pb-5 bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-secondary-600)]">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px,transparent 1px)', backgroundSize: '20px 20px' }} aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <FileDown className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white truncate">{t('packages.sendAllAsPdf')}</h2>
                <p className="text-sm text-white/70 mt-0.5">{t('packages.exportDialog.includesPlans', { count: packages.length })}</p>
              </div>
            </div>
            <button type="button" onClick={() => { onClose(); setStep(1); }} aria-label={t('common.cancel')} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="relative mt-5 flex items-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className={cls('flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all', step >= s ? 'bg-white text-[var(--color-primary-600)]' : 'bg-white/20 text-white')}>
                  {step > s ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s}
                </div>
                {s < 2 && <div className={cls('flex-1 h-0.5 rounded-full transition-colors duration-300', step > s ? 'bg-white' : 'bg-white/30')} />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-600">{t('packages.exportDialog.selectClient')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--color-primary-500)]">{t('form.clientName')}</Label>
                  <div className="relative">
                    <User className="absolute top-1/2 -translate-y-1/2 rtl:right-3 ltr:left-3 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={t('form.clientNamePlaceholder')} className={inputBase} />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--color-primary-500)]">{t('packages.exportDialog.phoneLabel')}</Label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 -translate-y-1/2 rtl:right-3 ltr:left-3 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                    <input value={phoneNumber} onChange={(e) => setPhone(e.target.value)} placeholder="201XXXXXXXXX" type="tel" className={inputBase} />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-4">
                <p className="text-xs font-black uppercase tracking-widest mb-3 text-[var(--color-primary-500)]">{t('pdf.allPackages')} ({packages.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {packages.map((pkg, i) => {
                    const colors = ['#4f46e5', '#d97706', '#7c3aed'];
                    const bgCls = ['bg-[#eff6ff]', 'bg-[#fffbeb]', 'bg-[var(--color-secondary-50)]'];
                    const borderCls = ['border-[#bfdbfe]', 'border-amber-200', 'border-[var(--color-secondary-200)]'];
                    return (
                      <div key={pkg.id} className={cls('rounded-xl p-3 text-center border-2', bgCls[i % bgCls.length], borderCls[i % borderCls.length])}>
                        <p className="text-xs font-black text-slate-900 mb-1 truncate">{pkg.name}</p>
                        <p className="text-lg font-black" style={{ color: colors[i % colors.length] }}>{pkg.price.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">{t('currency')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-emerald-200 overflow-hidden">
                <div className="bg-green-50 px-4 py-3 flex items-center gap-3 border-b border-green-100">
                  <MessageCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <p className="text-sm font-black text-green-800">{t('packages.exportDialog.preview')}</p>
                </div>
                <div className="p-4 bg-white text-xs text-slate-700 md: leading-relaxed space-y-1 max-h-44 overflow-y-auto" dir="rtl">
                  <p>{t('communications.greeting')} {clientName || `[${t('form.clientName')}]`}! 👋</p>
                  <p>{t('packages.exportDialog.offerIntro')}</p>
                  <br />
                  {packages.map((pkg, i) => (
                    <div key={pkg.id} className="mb-2">
                      <p className="font-bold">{['🔵', '⭐', '💜'][i % 3]} {pkg.name} — {[t('packages.starter'), t('packages.gold'), t('packages.platinum')][i % 3]}</p>
                      <p>💰 {pkg.price.toLocaleString()} {t('currency')} / {pkg.duration}</p>
                      <p>✅ {pkg.features.join(' • ')}</p>
                    </div>
                  ))}
                  <br />
                  <p>{t('packages.exportDialog.outro')} 🚀</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 bg-slate-50">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-slate-400">{t('packages.exportDialog.sendingTo')}</p>
                  <p className="text-sm font-black text-slate-800 ltr">{phoneNumber}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-primary-50)]">
            <button type="button" onClick={() => (step === 1 ? (onClose(), setStep(1)) : setStep(1))} className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              {step === 1 ? t('common.cancel') : `← ${t('common.back')}`}
            </button>
            {step === 1 ? (
              <button type="button" onClick={() => setStep(2)} disabled={!phoneNumber} className="h-10 rounded-xl px-6 text-sm font-black text-white bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] shadow-[0_6px_20px_rgba(79,70,229,.4)] disabled:opacity-40 transition-transform hover:scale-[1.02] active:scale-[.97]">
                {t('packages.exportDialog.preview')} →
              </button>
            ) : (
              <button type="button" onClick={handleSend} disabled={sending || sent} className={cls('h-10 rounded-xl px-6 text-sm font-black text-white disabled:opacity-60 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[.97]', sent ? 'bg-green-600' : 'bg-gradient-to-r from-green-600 to-green-700 shadow-[0_6px_20px_rgba(22,163,74,.4)]')}>
                {sent ? <><Check className="h-4 w-4" aria-hidden="true" /> {t('packages.exportDialog.sent')}</> : sending ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('packages.exportDialog.sending')}</> : <><MessageCircle className="h-4 w-4" aria-hidden="true" /> {t('packages.exportDialog.send')}</>}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SinglePkgWhatsAppDialog({ pkg, t, open, onClose }) {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!phone) return;
    setSending(true);
    const msg = `${t('communications.greeting')}! 👋\n\n${t('packages.packageDetails')}\n\n📦 *${pkg.name}* (${pkg.nameEn})\n💰 ${pkg.price.toLocaleString()} ${t('currency')} / ${pkg.duration}\n\n✅ ${t('packages.form.features')}:\n${pkg.features.map((f) => `• ${f}`).join('\n')}\n\n${t('packages.exportDialog.outro')} 🚀`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); setPhone(''); }, 1200);
  };

  if (!pkg) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPhone(''); } }}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden gap-0">
        <div className="h-1.5 w-full bg-gradient-to-r from-green-600 to-green-700" aria-hidden="true" />
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-100"><MessageCircle className="h-6 w-6 text-green-700" aria-hidden="true" /></div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900">{t('packages.sendToClient')}</h3>
              <p className="text-xs text-slate-500 truncate">{pkg.name}</p>
            </div>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5 text-xs text-green-800">
            <p className="font-black">📦 {pkg.name} — {pkg.price.toLocaleString()} {t('currency')} / {pkg.duration}</p>
            <p>{pkg.features.slice(0, 3).join(' • ')}{pkg.features.length > 3 ? ` +${pkg.features.length - 3}` : ''}</p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-[var(--color-primary-500)]">{t('packages.exportDialog.phoneLabel')}</Label>
            <div className="relative">
              <Phone className="absolute top-1/2 -translate-y-1/2 rtl:right-3 ltr:left-3 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="201XXXXXXXXX" type="tel" className="h-11 w-full rounded-xl border border-[var(--color-primary-200)] bg-white rtl:pr-9 ltr:pl-9 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{t('packages.exportDialog.info')}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { onClose(); setPhone(''); }} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">{t('common.cancel')}</button>
            <button type="button" onClick={handleSend} disabled={!phone || sending || sent} className={cls('h-10 flex-[2] rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[.97]', sent ? 'bg-green-600' : 'bg-gradient-to-r from-green-600 to-green-700 shadow-[0_6px_20px_rgba(22,163,74,.4)]')}>
              {sent ? <><Check className="h-4 w-4" aria-hidden="true" /> {t('packages.exportDialog.sent')}</> : sending ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('packages.exportDialog.sending')}</> : <><MessageCircle className="h-4 w-4" aria-hidden="true" /> {t('packages.exportDialog.send')}</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
 
function PackageDialog({ open, onClose, t, onSubmit, initialData }) {
  const [form, setForm] = useState({ name: '', price: '', duration: 'monthly', currency: 'EGP', featuresText: '' });

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        price: initialData.price || '',
        duration: initialData.raw?.interval || 'monthly',
        currency: initialData.raw?.currency || 'EGP',
        featuresText: Array.isArray(initialData.features) ? initialData.features.join('\n') : '',
      });
    } else {
      setForm({ name: '', price: '', duration: 'monthly', currency: 'EGP', featuresText: '' });
    }
  }, [open, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    await onSubmit({
      name: form.name,
      price: Number(form.price || 0),
      duration: form.duration,
      currency: form.currency || 'EGP',
      features: String(form.featuresText || '').split('\n').map((x) => x.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? t('packages.editPlan') : t('packages.addPlan')}</DialogTitle>
          <DialogDescription>{t('packages.subtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('packages.form.nameAr')} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder={t('packages.form.price')} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            <select value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3">
              <option value="monthly">{t('packages.form.monthly')}</option>
              <option value="quarterly">{t('packages.form.quarterly')}</option>
              <option value="yearly">{t('packages.form.annual')}</option>
            </select>
          </div>
          <textarea rows={4} value={form.featuresText} onChange={(e) => setForm((p) => ({ ...p, featuresText: e.target.value }))} placeholder={t('packages.form.features')} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          <DialogFooter>
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600">{t('common.cancel')}</button>
            <button type="submit" className="h-9 rounded-lg bg-[var(--color-primary-600)] px-3 text-sm font-semibold text-white">{t('common.save')}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PackagesTab({ t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [singlePkg, setSinglePkg] = useState(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/billing/plans', { params: { page: 1, limit: 100 } });
      const rows = Array.isArray(data?.items) ? data.items : [];
      setItems(rows.map((x) => mapPlanToUi(x, t)));
    } catch (e) {
      console.error(e);
      toast.error(t('errors.loadPlans'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const onDelete = async (id) => {
    try {
      await api.delete(`/billing/plans/${id}`);
      toast.success(t('common.deleted'));
      loadPlans();
    } catch (e) {
      console.error(e);
      toast.error(t('errors.deletePlan'));
    }
  };

  const onSubmitForm = async (form) => {
    const payload = {
      name: form.name,
      interval: getPlanIntervalFromDuration(form.duration),
      price: Number(form.price || 0),
      currency: form.currency || 'EGP',
      features: form.features || [],
      status: 'active',
    };
    try {
      if (editing?.id) await api.patch(`/billing/plans/${editing.id}`, payload);
      else await api.post('/billing/plans', payload);
      toast.success(t('common.saved'));
      setCreateOpen(false);
      setEditing(null);
      loadPlans();
    } catch (e) {
      console.error(e);
      toast.error(t('errors.savePlan'));
    }
  };

  return (
    <TabPane id="tab-packages">
      <Surface className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-black text-slate-800">{t('packages.title')}</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSendAllOpen(true)} className="h-9 rounded-xl border border-[var(--color-primary-200)] bg-white px-3 text-xs font-bold text-[var(--color-primary-700)]">
              {t('packages.sendAllAsPdf')}
            </button>
            <button type="button" onClick={() => { setEditing(null); setCreateOpen(true); }} className="h-9 rounded-xl bg-[var(--color-primary-600)] px-3 text-xs font-bold text-white">
              {t('packages.addPlan')}
            </button>
          </div>
        </div>
      </Surface>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((pkg, idx) => (
            <PkgCard
              key={pkg.id}
              pkg={pkg}
              idx={idx}
              t={t}
              onEdit={() => { setEditing(pkg); setCreateOpen(true); }}
              onDelete={() => onDelete(pkg.id)}
              onSendWhatsApp={() => { setSinglePkg(pkg); setSingleOpen(true); }}
            />
          ))}
        </div>
      )}

      <PackageDialog open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null); }} t={t} onSubmit={onSubmitForm} initialData={editing} />
      <SendAllWhatsAppDialog packages={items} t={t} open={sendAllOpen} onClose={() => setSendAllOpen(false)} />
      <SinglePkgWhatsAppDialog pkg={singlePkg} t={t} open={singleOpen} onClose={() => setSingleOpen(false)} />
    </TabPane>
  );
}

/* ══════════════════════════════════════════
   SUBSCRIPTIONS TAB  (invoices/history)
══════════════════════════════════════════ */
function SubscriptionsTab({ t }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ client: 'all', fromDate: null, toDate: null, sort: 'newest' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/billing/invoices', { params: { page: 1, limit: 200 } });
      const items = Array.isArray(data?.items) ? data.items : [];
      setInvoices(items.map((inv) => ({
        id: inv.id,
        clientName: inv.user?.name || '—', email: inv.user?.email || '—', phone: inv.user?.phone || '—',
        description: inv.description || inv.plan?.name || '—',
        amount: money(inv.total),
        date: inv.issueDate || inv.created_at?.slice?.(0, 10) || '—',
        time: inv.created_at ? new Date(inv.created_at).toLocaleTimeString() : '—',
        periodFrom: inv.subscription?.startDate || '—',
        periodTo: inv.subscription?.endDate || inv.subscription?.renewAt || '—',
        status: inv.status, raw: inv,
      })));
    } catch (e) { console.error(e); toast.error(t('errors.loadInvoices')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const filteredRows = useMemo(() => {
    let rows = [...invoices];
    const q = search.toLowerCase();
    if (q) rows = rows.filter((r) => String(r.clientName).toLowerCase().includes(q) || String(r.email).toLowerCase().includes(q) || String(r.description).toLowerCase().includes(q));
    if (filters.client !== 'all') rows = rows.filter((r) => r.clientName === filters.client);
    if (filters.fromDate) { const from = toYMD(filters.fromDate); rows = rows.filter((r) => !r.date || r.date >= from); }
    if (filters.toDate) { const to = toYMD(filters.toDate); rows = rows.filter((r) => !r.date || r.date <= to); }
    if (filters.sort === 'newest') rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (filters.sort === 'oldest') rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (filters.sort === 'amountHigh') rows.sort((a, b) => b.amount - a.amount);
    if (filters.sort === 'amountLow') rows.sort((a, b) => a.amount - b.amount);
    return rows;
  }, [invoices, search, filters]);

  const COLUMNS = [
    { key: 'client', header: t('table.client'), cell: (row) => <div><p className="text-sm font-bold text-slate-900">{row.clientName}</p><p className="text-xs text-slate-400">{row.email}</p><p className="text-xs text-slate-400">{row.phone}</p></div> },
    { key: 'description', header: t('table.description'), cell: (row) => <p className="text-sm text-slate-600 font-medium max-w-[200px] truncate">{row.description}</p> },
    { key: 'period', header: t('table.period'), cell: (row) => <div><p className="text-xs font-semibold text-slate-700">{row.periodFrom}</p><p className="text-xs text-slate-400">{t('table.to')} {row.periodTo}</p></div> },
    { key: 'date', header: t('table.date'), cell: (row) => <div><p className="text-xs font-semibold text-slate-700">{row.date}</p><p className="text-xs text-slate-400">{row.time}</p></div> },
    { key: 'amount', header: t('table.amount'), cell: (row) => <div className="text-end"><p className="text-base font-black text-slate-900">{row.amount.toLocaleString()}</p><p className="text-[10px] font-semibold text-slate-400">{t('currency')}</p></div> },
    {
      key: 'actions',
      header: t('table.actions'),
      cell: (row) => (
        <ActionPill>
          <TipIconBtn tooltip={t('table.view')} onClick={() => toast.success(`${t('table.view')} #${row.id}`)}><Eye className="h-3.5 w-3.5" aria-hidden="true" /></TipIconBtn>
          <PillDivider />
          <TipIconBtn tooltip={t('common.delete')} variant="danger" onClick={async () => { try { await api.patch(`/billing/invoices/${row.id}`, { status: 'void' }); toast.success(t('common.deleted')); loadInvoices(); } catch (e) { toast.error(t('errors.deleteInvoice')); } }}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </TipIconBtn>
        </ActionPill>
      ),
    },
  ];

  return (
    <TabPane id="tab-subscriptions">
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /></div>
      ) : (
        <DataTable
          title={t('payments.history')}
          subtitle={t('payments.historyDescription')}
          data={filteredRows}
          columns={COLUMNS}
          rowKey={(p) => p.id}
          searchValue={search}
          onSearchChange={setSearch}
          labels={{ searchPlaceholder: t('common.search'), emptyTitle: t('payments.empty'), emptySubtitle: t('payments.emptyDescription') }}
          hasActiveFilters={!!(filters.client !== 'all' || filters.fromDate || filters.toDate)}
          isFiltersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          filters={
            <>
              <FilterField label={t('filters.client')}>
                <Select value={filters.client} onValueChange={(v) => setFilters((f) => ({ ...f, client: v }))}>
                  <SelectTrigger className="h-9 rounded-lg text-xs border-[var(--color-primary-200)]"><SelectValue placeholder={t('filters.allClients')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filters.allClients')}</SelectItem>
                    {[...new Set(invoices.map((p) => p.clientName))].filter(Boolean).map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t('filters.fromDate')}>
                <Flatpickr value={filters.fromDate} onChange={([d]) => setFilters((f) => ({ ...f, fromDate: d }))} options={{ dateFormat: 'Y-m-d' }} className="h-9 w-full rounded-lg border border-[var(--color-primary-200)] bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]" placeholder={t('filters.selectDate')} />
              </FilterField>
              <FilterField label={t('filters.toDate')}>
                <Flatpickr value={filters.toDate} onChange={([d]) => setFilters((f) => ({ ...f, toDate: d }))} options={{ dateFormat: 'Y-m-d' }} className="h-9 w-full rounded-lg border border-[var(--color-primary-200)] bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]" placeholder={t('filters.selectDate')} />
              </FilterField>
              <FilterField label={t('filters.sort')}>
                <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}>
                  <SelectTrigger className="h-9 rounded-lg text-xs border-[var(--color-primary-200)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[['newest', 'filters.newest'], ['oldest', 'filters.oldest'], ['amountHigh', 'filters.amountHigh'], ['amountLow', 'filters.amountLow']].map(([v, k]) => <SelectItem key={v} value={v}>{t(k)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
            </>
          }
          onApplyFilters={() => setFiltersOpen(false)}
          actions={[
            { key: 'export', label: t('common.export'), icon: <Download size={13} aria-hidden="true" />, color: 'default', onClick: () => toast.success(t('common.export')) },
            { key: 'reload', label: t('common.refresh'), icon: <RefreshCw size={13} aria-hidden="true" />, color: 'default', onClick: loadInvoices },
          ]}
          headerExtra={
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1.5 text-xs font-bold">
              <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
              {t('payments.total', { count: filteredRows.length })}
            </span>
          }
          pagination={null}
        />
      )}
    </TabPane>
  );
}

/* ══════════════════════════════════════════
   PAYMENTS TAB  (add payment form)
══════════════════════════════════════════ */
function PaymentsTab({ t, clients = [], onSuccessRefresh }) {
  const [form, setForm] = useState({ client: '', amount: '', description: '', method: 'cash', periodFrom: null, periodTo: null, notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSub] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState(null);

  const set = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), []);

  const validate = () => {
    const e = {};
    if (!form.client) e.client = t('form.errors.clientRequired');
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = t('form.errors.amountRequired');
    if (!String(form.description || '').trim()) e.description = t('form.errors.descriptionRequired');
    if ((form.periodFrom && !form.periodTo) || (!form.periodFrom && form.periodTo)) e.period = t('form.errors.periodRequired');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const selectedClient = clients.find((c) => String(c.userId) === String(form.client));
    if (!selectedClient?.userId) { setApiError(t('form.errors.clientRequired')); return; }
    setSub(true);
    setApiError(null);
    try {
      const amount = String(form.amount);
      const issueDate = toYMD(form.periodFrom) || toYMD(new Date());
      const dueDate = toYMD(form.periodTo) || issueDate;
      const invoicePayload = { userId: selectedClient.userId, planId: selectedClient.raw?.planId || undefined, subscriptionId: selectedClient.subscriptionId || undefined, subtotal: amount, total: amount, amountPaid: amount, amountDue: '0', currency: 'EGP', issueDate, dueDate, paidAt: toYMD(new Date()), status: 'paid', description: form.description, notes: form.notes || undefined, items: [{ title: selectedClient.package || 'Subscription payment', description: form.description, qty: 1, unitPrice: Number(form.amount), total: Number(form.amount) }] };
      const invoiceRes = await api.post('/billing/invoices', invoicePayload);
      const invoiceId = invoiceRes?.data?.id;
      const method = PAYMENT_METHODS.find((m) => m.key === form.method);
      await api.post('/billing/payments', { userId: selectedClient.userId, invoiceId, paymentMethod: method?.apiValue || 'cash', status: 'succeeded', amount, currency: 'EGP', provider: method?.key || 'manual', paidAt: toYMD(new Date()), notes: form.notes || form.description });
      toast.success(t('form.success'));
      setSuccess(true);
      setForm({ client: '', amount: '', description: '', method: 'cash', periodFrom: null, periodTo: null, notes: '' });
      onSuccessRefresh?.();
      setTimeout(() => setSuccess(false), 5000);
    } catch (e) {
      console.error(e);
      setApiError(e?.response?.data?.message || t('form.errors.submitFailed'));
      toast.error(e?.response?.data?.message || t('form.errors.submitFailed'));
    } finally { setSub(false); }
  };

  const inputBase = (hasErr) => cls('h-12 w-full rounded-xl border bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400', 'transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]', 'rtl:pr-14 ltr:pl-14 px-4', hasErr ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300' : 'border-[var(--color-primary-200)] hover:border-[var(--color-primary-300)]');

  const selectedClient = form.client ? clients.find((c) => String(c.userId) === form.client) : null;

  return (
    <TabPane id="tab-payments">
      <div className="mx-auto max-w-5xl">
        {apiError && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-100"><AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" /></div>
            <p className="text-sm font-medium text-rose-800">{apiError}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status" aria-live="polite">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-100"><CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /></div>
            <p className="text-sm font-medium text-emerald-800">{t('form.success')}</p>
          </div>
        )}
        <Surface accent glow id="payment-form-card" className="overflow-visible">
          <div className="relative overflow-hidden rounded-t-2xl px-7 py-6 bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]">
            <div className="pointer-events-none absolute inset-0 opacity-[.15]" style={{ backgroundImage: 'radial-gradient(white 1px,transparent 1px)', backgroundSize: '18px 18px' }} aria-hidden="true" />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur-[12px] border border-white/35 shadow-xl transition-transform hover:rotate-12 hover:scale-110 duration-300">
                <Receipt className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-white md: leading-tight">{t('form.title')}</h2>
                <p className="mt-1 text-sm text-white/70 font-medium">{t('form.description')}</p>
              </div>
              {form.amount && (
                <div className="shrink-0 rounded-2xl px-4 py-2 text-center bg-white/[.18] backdrop-blur-[8px] border border-white/30">
                  <p className="text-[11px] font-semibold text-white/70 mb-0.5">{t('table.amount')}</p>
                  <p className="text-xl font-black text-white">{Number(form.amount || 0).toLocaleString()}</p>
                  <p className="text-[11px] text-white/70">{t('currency')}</p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-7" noValidate>
            <div className="grid grid-cols-2 gap-2">
              <InputField label={t('form.client')} required error={errors.client} icon={User} htmlFor="payment-client">
                <Select value={form.client} onValueChange={(v) => set('client', v)}>
                  <SelectTrigger id="payment-client" className={cls('h-12 w-full rounded-xl rtl:pr-14', errors.client ? 'border-rose-400' : 'border-[var(--color-primary-200)] hover:border-[var(--color-primary-300)]')}>
                    <SelectValue placeholder={t('form.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.userId} value={String(c.userId)}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">{c.avatar}</span>
                          <span className="font-semibold">{c.name}</span>
                          <span className="text-slate-400 text-xs hidden sm:inline">— {c.package}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputField>
              <InputField label={t('form.amount')} required error={errors.amount} icon={DollarSign} htmlFor="payment-amount">
                <input id="payment-amount" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" className={inputBase(errors.amount)} aria-invalid={!!errors.amount} />
              </InputField>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button key={amt} type="button" onClick={() => set('amount', String(amt))} className={cls('rounded-xl border px-3 py-2 text-xs font-bold transition-all', String(form.amount) === String(amt) ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                  {amt.toLocaleString()} {t('currency')}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-bold text-slate-700" id="payment-method-label">{t('form.paymentMethod')}</label>
              <div className="grid mt-2 grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-labelledby="payment-method-label">
                {PAYMENT_METHODS.map((m) => {
                  const MIcon = m.icon;
                  const active = form.method === m.key;
                  return (
                    <button key={m.key} type="button" role="radio" aria-checked={active} onClick={() => set('method', m.key)} className={cls('relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-[.97]', active ? cls('border-[currentColor]', m.activeBorder, m.activeShadow) : 'border-slate-200 bg-white')}>
                      {active && <span className={cls('absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]', m.activeBg)} aria-hidden="true"><Check className="h-3 w-3" /></span>}
                      <div className={cls('flex h-10 w-10 items-center justify-center rounded-xl', active ? m.activeBg : m.inactiveIconBg)}>
                        <MIcon className={cls('h-5 w-5', active ? 'text-white' : m.inactiveIconText)} aria-hidden="true" />
                      </div>
                      <span className={cls('text-xs font-bold', active ? m.activeText : 'text-slate-600')}>{t(m.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <InputField label={t('form.description')} required error={errors.description} icon={FileText} htmlFor="payment-description">
              <textarea id="payment-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('form.descriptionPlaceholder')} aria-invalid={!!errors.description} className={cls('w-full resize-none rounded-xl border bg-white rtl:pr-14 ltr:pl-14 px-4 pt-3 pb-3', 'text-sm font-medium text-slate-800 placeholder:text-slate-400', 'transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]', errors.description ? 'border-rose-400 bg-rose-50/40' : 'border-[var(--color-primary-200)] hover:border-[var(--color-primary-300)]')} />
            </InputField>

            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['periodFrom', 'form.periodFrom'], ['periodTo', 'form.periodTo']].map(([field, labelKey]) => (
                  <div key={field}>
                    <Label className="mb-1.5 text-sm font-bold text-slate-700" htmlFor={`payment-${field}`}>{t('form.period')} — {t(labelKey)}</Label>
                    <Flatpickr value={form[field]} onChange={([d]) => set(field, d)} options={{ dateFormat: 'Y-m-d' }} className={cls('h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2', errors.period ? 'border-rose-300 focus:ring-rose-200' : 'border-[var(--color-primary-200)] focus:ring-[var(--color-primary-200)]')} placeholder={t('filters.selectDate')} />
                  </div>
                ))}
              </div>
              <FieldError msg={errors.period} />
            </div>

            <InputField label={t('form.notes')} icon={FileText} htmlFor="payment-notes">
              <textarea id="payment-notes" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t('form.notesPlaceholder')} className="w-full resize-none rounded-xl border border-[var(--color-primary-200)] bg-white rtl:pr-14 ltr:pl-14 px-4 pt-3 pb-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]" />
            </InputField>

            {(form.client || form.amount) && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-4" aria-live="polite">
                <div className="flex items-center gap-2 text-xs text-slate-600"><User className="h-3.5 w-3.5 text-[var(--color-primary-500)]" aria-hidden="true" /><span className="font-bold">{selectedClient?.name || '—'}</span></div>
                <div className="h-3 w-px bg-slate-200" aria-hidden="true" />
                <div className="flex items-center gap-2 text-xs text-slate-600"><DollarSign className="h-3.5 w-3.5 text-[var(--color-primary-500)]" aria-hidden="true" /><span className="font-black">{form.amount ? Number(form.amount).toLocaleString() : '—'} {t('currency')}</span></div>
                <div className="h-3 w-px bg-slate-200" aria-hidden="true" />
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  {(() => { const M = PAYMENT_METHODS.find((m) => m.key === form.method); const MIcon = M?.icon || CreditCard; return <><MIcon className={cls('h-3.5 w-3.5', M?.activeText)} aria-hidden="true" /><span className="font-bold">{M ? t(M.labelKey) : ''}</span></>; })()}
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting} className="relative w-full overflow-hidden rounded-2xl py-4 text-base font-black text-white bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-[0_10px_30px_-6px_rgba(79,70,229,.5)] transition-all disabled:opacity-60 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[.98]">
              <span className="relative flex items-center justify-center gap-2.5">
                {submitting ? <><RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />{t('form.submitting')}</> : <><CheckCircle className="h-5 w-5" aria-hidden="true" />{t('form.submit')}</>}
              </span>
            </button>
          </form>
        </Surface>
      </div>
    </TabPane>
  );
}

/* ══════════════════════════════════════════
   COMMUNICATIONS TAB
══════════════════════════════════════════ */
function CommunicationsTab({ t, clients = [] }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [messageType, setMessageType] = useState('reminder');
  const [customMessage, setCustomMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const selectedClient = clients.find((c) => String(c.userId) === selectedClientId) || null;

  const loadLogs = useCallback(async (clientId) => {
    if (!clientId) return;
    try {
      setLogsLoading(true);
      const { data } = await api.get(`/billing/clients/${clientId}/communications`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { if (selectedClientId) loadLogs(selectedClientId); else setLogs([]); }, [selectedClientId, loadLogs]);

  const MESSAGE_TYPES = [
    { key: 'reminder', label: t('communications.types.reminder'), icon: RefreshCw },
    { key: 'renewal', label: t('communications.types.renewal'), icon: Crown },
    { key: 'welcome', label: t('communications.types.welcome'), icon: Award },
    { key: 'custom', label: t('communications.types.custom'), icon: MessageCircle },
  ];

  const buildMessage = () => {
    if (!selectedClient) return '';
    if (messageType === 'reminder') return `${t('communications.greeting')} ${selectedClient.name}!\n\n${t('communications.reminderText', { package: selectedClient.package, days: selectedClient.daysLeft > 0 ? selectedClient.daysLeft : 0 })}\n\n${t('communications.contactUs')}`;
    if (messageType === 'renewal') return `${t('communications.greeting')} ${selectedClient.name}!\n\n${t('communications.renewalText', { package: selectedClient.package })}\n\n${t('communications.contactUs')}`;
    if (messageType === 'welcome') return `${t('communications.greeting')} ${selectedClient.name}!\n\n${t('communications.welcomeText', { package: selectedClient.package })}\n\n${t('communications.contactUs')}`;
    return customMessage;
  };

  const sendWhatsApp = async () => {
    if (!selectedClient) return;
    const msg = buildMessage();
    window.open(`https://wa.me/${String(selectedClient.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    try {
      await api.post(`/billing/clients/${selectedClient.userId}/communications/send`, {
        type: messageType,
        message: msg,
        metadata: { channel: 'whatsapp' },
      });
      await loadLogs(selectedClientId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <TabPane id="tab-communications">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          <Surface className="p-5 space-y-4">
            <h3 className="text-base font-black text-slate-800">{t('communications.selectClient')}</h3>
            <div>
              <Label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-widest">{t('form.client')}</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-11 w-full rounded-xl border-[var(--color-primary-200)]"><SelectValue placeholder={t('communications.chooseClient')} /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.userId} value={String(c.userId)}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">{c.avatar}</span>
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClient && (
              <div className="rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarFallback className="text-sm font-black text-white bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">{selectedClient.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-black text-slate-900">{selectedClient.name}</p>
                    <p className="text-xs text-slate-500">{selectedClient.package}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600"><Mail className="h-3.5 w-3.5 text-slate-400" /><span className="truncate">{selectedClient.email}</span></div>
                  <div className="flex items-center gap-1.5 text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" />{selectedClient.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  {(() => { const s = getClientStatusByDays(selectedClient.daysLeft, t); return <StatusBadge status={s.key} label={s.label} icon={s.icon} />; })()}
                  {selectedClient.daysLeft != null && selectedClient.daysLeft > 0 && <span className="text-xs text-slate-500">{selectedClient.daysLeft} {t('clients.days')}</span>}
                </div>
              </div>
            )}
          </Surface>

          <Surface className="p-5 space-y-3">
            <h3 className="text-base font-black text-slate-800">{t('communications.messageType')}</h3>
            <div className="space-y-2">
              {MESSAGE_TYPES.map((m) => {
                const MIcon = m.icon;
                return (
                  <button key={m.key} type="button" onClick={() => setMessageType(m.key)} className={cls('w-full flex items-center gap-3 rounded-xl border-2 p-3 text-sm font-bold transition-all', messageType === m.key ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                    <MIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Surface>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-3 space-y-4">
          <Surface className="p-5 space-y-4">
            <h3 className="text-base font-black text-slate-800">{t('communications.messagePreview')}</h3>
            {selectedClient ? (
              <>
                <div className="rounded-2xl border-2 border-emerald-200 overflow-hidden">
                  <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2 border-b border-green-100">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-black text-green-800">WhatsApp</p>
                  </div>
                  <div className="p-4 bg-white text-sm text-slate-700 md: leading-relaxed whitespace-pre-line min-h-[120px]" dir="rtl">
                    {messageType === 'custom' ? (
                      <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder={t('communications.customPlaceholder')} className="w-full h-32 bg-transparent resize-none focus:outline-none text-sm text-slate-700 placeholder:text-slate-400" />
                    ) : buildMessage()}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={sendWhatsApp} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white bg-gradient-to-r from-green-600 to-green-700 shadow-[0_6px_20px_rgba(22,163,74,.3)] transition-all hover:scale-[1.02] active:scale-[.97]">
                    <MessageCircle className="h-4 w-4" />
                    {t('communications.sendWhatsapp')}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">{t('communications.chooseClientFirst')}</p>
              </div>
            )}
          </Surface>

          {/* Logs */}
          <Surface className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">{t('communications.log')}</h3>
              {selectedClientId && <button type="button" onClick={() => loadLogs(selectedClientId)} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-white px-2.5 text-xs font-bold text-[var(--color-primary-700)]"><RefreshCw className="h-3 w-3" />{t('common.refresh')}</button>}
            </div>
            {logsLoading ? (
              <div className="space-y-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8"><Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">{selectedClientId ? t('communications.noLogs') : t('communications.chooseClientFirst')}</p></div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={log.id || i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-100)]">
                      <MessageCircle className="h-4 w-4 text-[var(--color-primary-600)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{log.type || messageType}</p>
                      <p className="text-[11px] text-slate-400">{log.createdAt ? new Date(log.createdAt).toLocaleString('ar') : '—'}</p>
                    </div>
                    <StatusBadge status="completed" label={t('status.completed')} icon={CheckCircle} />
                  </div>
                ))}
              </div>
            )}
          </Surface>
        </div>
      </div>
    </TabPane>
  );
}