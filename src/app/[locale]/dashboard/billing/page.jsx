
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
	Loader,
	AlertCircle,
	LayoutDashboard,
	Wallet as WalletIcon,
	Banknote,
	BarChart3,
	Filter,
	Users2,
	Trash2,
	CheckCircle2,
	XCircle,
	Clock3,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';

import {
	getWallet,
	getAdminAnalytics,
	getSubscription,
	renewSubscription,
	getClientPayments,
	recordClientPayment,
	markPaymentAsPaid,
	deleteClientPayment, // ✅ NEW
	getAdminBillingOverview, // ✅ OPTIONAL (if you want overview extra stats)
} from '@/services/api/billing.service';

import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';

import { WalletCard } from '@/components/billing/BillingCards';

import Select from '@/components/atoms/Select';
import { Input2 as Input } from '@/components/atoms/Input';
import InputDate from '@/components/atoms/InputDate';

// charts
import {
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	CartesianGrid,
} from 'recharts';

// form
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

// ----------------------
// Tabs config
// ----------------------
const TABS = [
	{ id: 'overview', labelKey: 'tabs.overview', icon: LayoutDashboard, roles: ['admin', 'super_admin'] },
	{ id: 'subscriptions', labelKey: 'tabs.subscriptions', icon: WalletIcon, roles: ['admin', 'super_admin'] },
	{ id: 'client-payments', labelKey: 'tabs.clientPayments', icon: Banknote, roles: ['admin'] },
];

const CHART_COLORS = ['#2563eb', '#16a34a', '#f97316', '#7c3aed', '#0f766e'];

function cn(...c) {
	return c.filter(Boolean).join(' ');
}

// ----------------------
// Skeletons
// ----------------------
function SkeletonBlock({ className = '' }) {
	return <div className={cn('animate-pulse rounded-xl bg-slate-100', className)} />;
}

function PageSkeleton() {
	return (
		<div className="space-y-6">
			<SkeletonBlock className="h-10 w-64" />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<SkeletonBlock className="h-28" />
				<SkeletonBlock className="h-28" />
				<SkeletonBlock className="h-28" />
			</div>
			<SkeletonBlock className="h-80" />
		</div>
	);
}

function FiltersSkeleton() {
	return (
		<div className="bg-white rounded-xl border p-4">
			<div className="flex items-center gap-2 mb-4">
				<SkeletonBlock className="h-5 w-5 rounded-md" />
				<SkeletonBlock className="h-5 w-40" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<SkeletonBlock className="h-12" />
				<SkeletonBlock className="h-12" />
				<SkeletonBlock className="h-12" />
				<SkeletonBlock className="h-12" />
			</div>
		</div>
	);
}

function FullPageLoader() {
	return (
		<div className="flex items-center justify-center min-h-[50vh]">
			<Loader className="w-8 h-8 animate-spin text-blue-600" />
		</div>
	);
}

// ----------------------
// MAIN PAGE
// ----------------------
export default function BillingTabbedPage() {
	const t = useTranslations('billing');
	const { role, id: userId } = useUser() || {};
	const router = useRouter();
	const searchParams = useSearchParams();

	const [mounted, setMounted] = useState(false);
	const [users, setUsers] = useState([]);
	const [usersLoading, setUsersLoading] = useState(true);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		let alive = true;
		setUsersLoading(true);

		api
			.get('/auth/users?limit=100')
			.then((res) => {
				if (!alive) return;
				setUsers(res.data?.users || []);
			})
			.catch(() => {
				if (!alive) return;
				setUsers([]);
			})
			.finally(() => {
				if (!alive) return;
				setUsersLoading(false);
			});

		return () => {
			alive = false;
		};
	}, []);

	if (!mounted) return null;

	const urlTab = searchParams.get('tab');
	const allowedTabs = TABS.filter((tab) => !tab.roles || tab.roles.includes(role));

	const activeTab =
		allowedTabs.find((t0) => t0.id === urlTab)?.id ||
		allowedTabs[0]?.id ||
		'overview';

	const ActiveIcon = TABS.find((x) => x.id === activeTab)?.icon || LayoutDashboard;

	const handleTabChange = (tabId) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('tab', tabId);
		router.push(`?${params.toString()}`, { scroll: false });
	};

	return (
		<div className="bg-white min-h-[80vh] py-4 px-4">
			<div>
				{/* Header */}
				<div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
							<span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
								<ActiveIcon className="w-6 h-6 text-blue-600" />
							</span>
							{t('title')}
						</h1>
						<p className="text-gray-600 mt-1">{t('subtitle')}</p>
					</div>

					<div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
						<span>{t('badge')}</span>
					</div>
				</div>

				{/* Tabs */}
				<div className="mb-6 border-b border-gray-200">
					<nav className="flex gap-2 overflow-x-auto pb-1">
						{allowedTabs.map((tab) => {
							const Icon = tab.icon;
							const isActive = tab.id === activeTab;
							return (
								<button
									key={tab.id}
									onClick={() => handleTabChange(tab.id)}
									className={cn(
										'flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-all',
										isActive
											? 'border-blue-600 text-blue-700 bg-white shadow-sm'
											: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100',
									)}
								>
									<Icon className="w-4 h-4" />
									<span>{t(tab.labelKey)}</span>
								</button>
							);
						})}
					</nav>
				</div>

				{/* Content */}
				<div>
					{activeTab === 'overview' && <OverviewTab role={role} />}
					{activeTab === 'subscriptions' && (
						<SubscriptionsTab role={role} users={users} usersLoading={usersLoading} />
					)}
					{activeTab === 'client-payments' && role === 'admin' && (
						<ClientPaymentsTab userId={userId} users={users} usersLoading={usersLoading} />
					)}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------
// TAB: OVERVIEW
// ---------------------------------------------------
function OverviewTab({ role, users = [], usersLoading }) {
	const t = useTranslations('billing');

	const [wallet, setWallet] = useState(null);
	const [analytics, setAnalytics] = useState(null);
	const [overview, setOverview] = useState(null);

	// ✅ super admin can preview other admins
	const [selectedAdminId, setSelectedAdminId] = useState('');

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const isSuperAdmin = role === 'super_admin';

	function formatMoney(n, currency = 'USD') {
		const num = Number(n || 0);
		try {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency,
				maximumFractionDigits: 2,
			}).format(num);
		} catch {
			return `$${num.toFixed(2)}`;
		}
	}

	function formatDate(d) {
		if (!d) return '—';
		try {
			return new Date(d).toLocaleDateString('ar-EG');
		} catch {
			return '—';
		}
	}

	const adminOptions = useMemo(() => {
		return (users || []).map((u) => ({
			id: u.id,
			label: u.name || u.email || t('common.unnamed'),
		}));
	}, [users, t]);

	const fetchAll = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const adminIdParam = isSuperAdmin && selectedAdminId ? selectedAdminId : undefined;

			const [walletRes, analyticsRes, overviewRes] = await Promise.all([
				getWallet(adminIdParam),
				getAdminAnalytics(adminIdParam),
				getAdminBillingOverview(adminIdParam),
			]);

			setWallet(walletRes?.data?.data ?? null);
			setAnalytics(analyticsRes?.data  ?? null);
			setOverview(overviewRes?.data  ?? null);
			console.log(overviewRes?.data);
		} catch (err) {
			setError(err?.response?.data?.message || t('errors.load'));
		} finally {
			setLoading(false);
		}
	}, [isSuperAdmin, selectedAdminId, t]);

	useEffect(() => {
		if (role === 'admin' || role === 'super_admin') fetchAll();
	}, [role, fetchAll]);

	if (loading) return <PageSkeleton />;

	const currency = wallet?.currency || overview?.wallet?.currency || 'USD';

	const moneyIn = Number(overview?.month?.moneyIn || 0);
	const moneyOut = Number(overview?.month?.moneyOut || 0);
	const net = Number(overview?.month?.net || (moneyIn - moneyOut) || 0);
	const paidPaymentsThisMonth = Number(overview?.month?.paidPayments || 0);
	const pendingPayments = Number(overview?.pendingPayments || 0);

	const balance = Number(wallet?.balance ?? overview?.wallet?.balance ?? analytics?.totalBalance ?? 0);
	const totalEarned = Number(wallet?.totalEarned ?? overview?.wallet?.totalEarned ?? analytics?.totalEarned ?? 0);
	const totalWithdrawn = Number(wallet?.totalWithdrawn ?? overview?.wallet?.totalWithdrawn ?? analytics?.totalWithdrawn ?? 0);

	// charts
	const walletChartData =
		analytics && analytics.totalEarned !== undefined
			? [
				{ name: t('overview.wallet.currentBalance'), value: Number(analytics.totalBalance || 0) },
				{ name: t('overview.wallet.totalEarned'), value: Number(analytics.totalEarned || 0) },
				{ name: t('overview.wallet.totalWithdrawn'), value: Number(analytics.totalWithdrawn || 0) },
			]
			: [];

	const activityChartData = analytics
		? [
			{ name: t('overview.activity.activeSubs'), value: analytics.activeSubscriptions || 0 },
			{ name: t('overview.activity.expiredSubs'), value: analytics.expiredSubscriptions || 0 },
			{ name: t('overview.activity.pendingWithdrawals'), value: analytics.pendingWithdrawals || 0 },
			{ name: t('overview.activity.transactions'), value: analytics.transactionCount || 0 },
		]
		: [];

	const recentTransactions = overview?.recentTransactions || [];
	const withdrawalRequests = overview?.withdrawalRequests || [];

	const typePill = (type) => {
		const map = {
			deposit: 'bg-blue-50 text-blue-700 ring-blue-200',
			withdrawal: 'bg-rose-50 text-rose-700 ring-rose-200',
			client_payment: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
			subscription_charge: 'bg-purple-50 text-purple-700 ring-purple-200',
			refund: 'bg-amber-50 text-amber-700 ring-amber-200',
			commission: 'bg-slate-50 text-slate-700 ring-slate-200',
		};
		return map[type] || 'bg-slate-50 text-slate-700 ring-slate-200';
	};

	const statusPill = (st) => {
		const map = {
			pending: 'bg-amber-50 text-amber-700 ring-amber-200',
			completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
			failed: 'bg-rose-50 text-rose-700 ring-rose-200',
			cancelled: 'bg-slate-50 text-slate-700 ring-slate-200',
		};
		return map[st] || 'bg-slate-50 text-slate-700 ring-slate-200';
	};

	return (
		<div className="space-y-8">
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* ✅ Super Admin picker + refresh */}
			{isSuperAdmin && (
				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
						<div className="max-w-md w-full">
							<Select
								searchable
								clearable
								label={t('overview.selectAdmin') || 'Preview as Admin'}
								placeholder={t('overview.selectAdminPh') || 'Choose admin (optional)'}
								options={adminOptions}
								value={selectedAdminId}
								onChange={(val) => setSelectedAdminId(val || '')}
								icon={<Users2 className="w-4 h-4" />}
							/>
							<p className="mt-2 text-xs text-slate-500">
								{t('overview.selectAdminHint') ||
									'If you select an admin, the overview will load their wallet + billing stats.'}
							</p>
						</div>

						<button
							onClick={fetchAll}
							className="rounded-xl bg-slate-900 text-white px-4 py-2 font-extrabold text-sm hover:bg-slate-800 transition"
							disabled={usersLoading}
						>
							{t('common.refresh') || 'Refresh'}
						</button>
					</div>
				</div>
			)}

			{/* Wallet card (your existing component) */}
			{wallet && <WalletCard {...wallet} />}

			{/* ✅ KPI cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<p className="text-xs text-slate-500 font-semibold">{t('overview.kpi.balance') || 'Wallet Balance'}</p>
					<p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{formatMoney(balance, currency)}</p>
				</div>

				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<p className="text-xs text-slate-500 font-semibold">{t('overview.kpi.totalEarned') || 'Total Earned'}</p>
					<p className="mt-2 text-2xl font-extrabold text-emerald-600 tabular-nums">{formatMoney(totalEarned, currency)}</p>
				</div>

				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<p className="text-xs text-slate-500 font-semibold">{t('overview.kpi.totalWithdrawn') || 'Total Withdrawn'}</p>
					<p className="mt-2 text-2xl font-extrabold text-rose-600 tabular-nums">{formatMoney(totalWithdrawn, currency)}</p>
				</div>

				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<p className="text-xs text-slate-500 font-semibold">{t('overview.month.moneyIn') || 'Money In (This Month)'}</p>
					<p className="mt-2 text-2xl font-extrabold text-emerald-600 tabular-nums">{formatMoney(moneyIn, currency)}</p>
					<p className="mt-1 text-[11px] text-slate-500">{t('overview.month.start') || 'From'}: {formatDate(overview?.month?.start)}</p>
				</div>

				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<p className="text-xs text-slate-500 font-semibold">{t('overview.month.moneyOut') || 'Money Out (This Month)'}</p>
					<p className="mt-2 text-2xl font-extrabold text-rose-600 tabular-nums">{formatMoney(moneyOut, currency)}</p>
					<p className="mt-1 text-[11px] text-slate-500">{t('overview.month.net') || 'Net'}: {formatMoney(net, currency)}</p>
				</div>

				<div className="rounded-2xl border bg-white p-5 shadow-sm">
					<p className="text-xs text-slate-500 font-semibold">{t('overview.kpi.pendingPayments') || 'Pending Payments'}</p>
					<p className="mt-2 text-2xl font-extrabold text-amber-600 tabular-nums">{pendingPayments}</p>
					<p className="mt-1 text-[11px] text-slate-500">
						{t('overview.kpi.paidThisMonth') || 'Paid this month'}: <span className="font-bold">{paidPaymentsThisMonth}</span>
					</p>
				</div>
			</div>

			{/* Charts */}
			{analytics && (
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
					<div className="bg-white rounded-xl shadow p-6 border-t-4 border-blue-500 xl:col-span-1">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-gray-800">{t('overview.charts.walletTitle')}</h2>
							<BarChart3 className="w-5 h-5 text-blue-500" />
						</div>

						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Tooltip />
									<Legend verticalAlign="bottom" height={36} />
									<Pie data={walletChartData} dataKey="value" nameKey="name" outerRadius={80} label>
										{walletChartData.map((_, idx) => (
											<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
										))}
									</Pie>
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow p-6 border-t-4 border-emerald-500 xl:col-span-2">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-gray-800">{t('overview.charts.activityTitle')}</h2>
							<LayoutDashboard className="w-5 h-5 text-emerald-500" />
						</div>

						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={activityChartData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="name" tick={{ fontSize: 11 }} />
									<YAxis />
									<Tooltip />
									<Bar dataKey="value">
										{activityChartData.map((_, idx) => (
											<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			)}

			{/* ✅ Preview lists */}
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
				{/* Recent Transactions */}
				<div className="rounded-2xl border bg-white shadow-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-extrabold text-slate-900">
							{t('overview.preview.recentTransactions') || 'Recent Transactions'}
						</h3>
						<span className="text-xs font-semibold text-slate-500">
							{t('common.count') || 'Count'}: <span className="font-extrabold text-slate-900">{recentTransactions.length}</span>
						</span>
					</div>

					{recentTransactions.length === 0 ? (
						<p className="text-sm text-slate-500 py-10 text-center">
							{t('overview.preview.noTransactions') || 'No transactions yet.'}
						</p>
					) : (
						<div className="space-y-3">
							{recentTransactions.map((tx) => (
								<div key={tx.id} className="rounded-2xl border p-4 hover:shadow-sm transition">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${typePill(tx.type)}`}>
													{tx.type}
												</span>
												<span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${statusPill(tx.status)}`}>
													{tx.status}
												</span>
											</div>

											{tx.description ? (
												<p className="mt-2 text-sm text-slate-700 line-clamp-2">{tx.description}</p>
											) : (
												<p className="mt-2 text-sm text-slate-400">—</p>
											)}

											<p className="mt-2 text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
										</div>

										<div className="text-right flex-none">
											<div className="text-xl font-extrabold tabular-nums text-slate-900">
												{formatMoney(tx.amount, currency)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Withdrawal Requests */}
				<div className="rounded-2xl border bg-white shadow-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-extrabold text-slate-900">
							{t('overview.preview.withdrawals') || 'Latest Withdrawal Requests'}
						</h3>
						<span className="text-xs font-semibold text-slate-500">
							{t('common.count') || 'Count'}: <span className="font-extrabold text-slate-900">{withdrawalRequests.length}</span>
						</span>
					</div>

					{withdrawalRequests.length === 0 ? (
						<p className="text-sm text-slate-500 py-10 text-center">
							{t('overview.preview.noWithdrawals') || 'No withdrawal requests yet.'}
						</p>
					) : (
						<div className="space-y-3">
							{withdrawalRequests.map((w) => (
								<div key={w.id} className="rounded-2xl border p-4 hover:shadow-sm transition">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="text-sm font-extrabold text-slate-900">
												{t('overview.preview.withdrawalId') || 'Request'}: <span className="font-semibold text-slate-600">{w.id.slice(0, 8)}…</span>
											</p>

											<div className="mt-2 flex flex-wrap gap-2">
												<span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${statusPill(w.status)}`}>
													{w.status}
												</span>
												<span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
													{formatDate(w.createdAt)}
												</span>
											</div>

											{w.rejectionReason ? (
												<p className="mt-2 text-sm text-rose-700 line-clamp-2">{w.rejectionReason}</p>
											) : null}
										</div>

										<div className="text-right flex-none">
											<div className="text-xl font-extrabold tabular-nums text-slate-900">
												{formatMoney(w.amount, currency)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
 
 		</div>
	);
}


// ---------------------------------------------------
// TAB: SUBSCRIPTIONS + PAYMENTS
// ---------------------------------------------------
function SubscriptionsTab({ role, users, usersLoading }) {
	const t = useTranslations('billing');

	const [subscription, setSubscription] = useState(null);
	const [loading, setLoading] = useState(true);
	const [renewing, setRenewing] = useState(false);
	const [error, setError] = useState(null);

	// payments
	const [paymentsLoading, setPaymentsLoading] = useState(true);
	const [paymentsError, setPaymentsError] = useState(null);

	const [payments, setPayments] = useState([]);
	const [meta, setMeta] = useState({ page: 1, pages: 1, hasNext: false, hasPrev: false, total: 0, limit: 10 });

	const [clientFilter, setClientFilter] = useState('');
	const [range, setRange] = useState({ from: null, to: null });
	const [sortOrder, setSortOrder] = useState('newest');

	// ✅ NEW paid filter: all | paid | unpaid
	const [paidFilter, setPaidFilter] = useState('all');

	const userOptions = useMemo(
		() =>
			(users || []).map((u) => ({
				id: u.id,
				label: u.name || u.email || t('common.unnamed'),
			})),
		[users, t],
	);

	// ✅ fetch subscription once
	useEffect(() => {
		let alive = true;

		(async () => {
			try {
				setLoading(true);
				const res = await getSubscription();
				if (!alive) return;
				setSubscription(res.data.data);
				setError(null);
			} catch (err) {
				if (!alive) return;
				setError(err.response?.data?.message || t('errors.loadSubscription'));
			} finally {
				if (!alive) return;
				setLoading(false);
			}
		})();

		return () => {
			alive = false;
		};
	}, [role, t]);

	const fetchPayments = useCallback(async () => {
		try {
			setPaymentsLoading(true);
			setPaymentsError(null);

			const params = {
				page: meta.page,
				limit: meta.limit,
				sort: sortOrder,
				paid: paidFilter,
				...(clientFilter ? { clientId: clientFilter } : {}),
				...(range?.from ? { startDate: range.from } : {}),
				...(range?.to ? { endDate: range.to } : {}),
			};

			const res = await getClientPayments(params);
			console.log(res);
			const payload = res.data?.data
			const data = payload || [];
			const newMeta = {
				page: payload?.page ?? 1,
				pages: payload?.pages ?? 1,
				hasNext: !!payload?.hasNext,
				hasPrev: !!payload?.hasPrev,
				total: payload?.total ?? 0,
				limit: payload?.limit ?? meta.limit,
			};

			setPayments(data);
			setMeta(newMeta);
		} catch (err) {
			setPaymentsError(err.response?.data?.message || t('errors.loadPayments'));
		} finally {
			setPaymentsLoading(false);
		}
	}, [meta.page, meta.limit, sortOrder, paidFilter, clientFilter, range, t]);

	// ✅ payments effect
	useEffect(() => {
		let alive = true;

		(async () => {
			if (role !== 'admin') {
				setPaymentsLoading(false);
				setPayments([]);
				return;
			}
			if (!alive) return;
			await fetchPayments();
		})();

		return () => {
			alive = false;
		};
	}, [role, fetchPayments]);

	const handleRenew = async () => {
		if (!subscription) return;
		try {
			setRenewing(true);
			// ✅ renew by subscription id
			const res = await renewSubscription(subscription.id);
			setSubscription(res.data.data);
			setError(null);
			alert(t('messages.renewed'));
		} catch (err) {
			setError(err.response?.data?.message || t('errors.renew'));
		} finally {
			setRenewing(false);
		}
	};

	const statusLabels = {
		pending: t('payments.status.pending'),
		completed: t('payments.status.paid'),
		paid: t('payments.status.paid'),
		failed: t('payments.status.failed'),
	};

	const statusIcon = {
		pending: Clock3,
		completed: CheckCircle2,
		paid: CheckCircle2,
		failed: XCircle,
	};

	const statusUI = {
		pending: { pill: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
		completed: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
		paid: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
		failed: { pill: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
	};

	const handleMarkAsPaid = async (id) => {
		try {
			await markPaymentAsPaid(id);
			// refresh (better than local patch)
			await fetchPayments();
		} catch (err) {
			setPaymentsError(err.response?.data?.message || t('errors.markPaid'));
		}
	};

	const handleDeletePayment = async (id) => {
		if (!confirm(t('payments.confirmDelete') || 'Delete this payment?')) return;

		try {
			await deleteClientPayment(id);
			// if page became empty after delete -> go back one page safely
			// simple: refetch current page; backend will return correct hasNext/hasPrev
			await fetchPayments();
		} catch (err) {
			setPaymentsError(err.response?.data?.message || t('errors.deletePayment') || 'Failed to delete');
		}
	};

	const resetFilters = () => {
		setClientFilter('');
		setRange({ from: null, to: null });
		setSortOrder('newest');
		setPaidFilter('all');
		setMeta((p) => ({ ...p, page: 1 }));
	};

	if (loading) return <FullPageLoader />;

	return (
		<div className="space-y-6">
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Subscription box */}
			{subscription && (
				<div className="bg-white rounded-2xl border shadow-sm p-5">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<div>
							<h2 className="text-lg font-extrabold text-slate-900">
								{t('subscriptions.detailsTitle')}
							</h2>
							<p className="text-sm text-slate-500 mt-1">
								{t('subscriptions.periodTitle')}:{' '}
								<span className="font-bold text-slate-700">
									{subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ar-EG') : '—'}
								</span>
							</p>
						</div>

						<div className="flex gap-2">
							<button
								onClick={handleRenew}
								disabled={renewing}
								className="rounded-xl bg-blue-600 px-4 py-2 text-white font-extrabold hover:bg-blue-700 transition disabled:opacity-50"
							>
								{renewing ? t('common.loading') : t('subscriptions.renewNow')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Filters */}
			{role === 'admin' && (
				<div className="bg-white rounded-2xl border shadow-sm p-5">
					<div className="flex items-center justify-between gap-2 mb-4">
						<div className="flex items-center gap-2">
							<Filter className="w-5 h-5 text-slate-600" />
							<h3 className="font-extrabold text-slate-900">{t('payments.filtersTitle')}</h3>
						</div>

						<button
							onClick={resetFilters}
							className="text-xs font-extrabold text-slate-600 hover:text-slate-900"
						>
							{t('common.reset')}
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						<Select
							searchable={false}
							clearable={false}
							label={t('payments.chooseClient')}
							placeholder={t('payments.chooseClient')}
							options={userOptions}
							value={clientFilter}
							onChange={(val) => {
								setClientFilter(val);
								setMeta((p) => ({ ...p, page: 1 }));
							}}
							icon={<Users2 className="w-4 h-4" />}
						/>

						<InputDate
							label={t('payments.filters.from') || 'From'}
							defaultValue={range.from}
							onChange={(d) => {
								const iso = d?.toISOString?.().slice(0, 10);
								setRange((prev) => ({ ...prev, from: iso || null }));
								setMeta((p) => ({ ...p, page: 1 }));
							}}
						/>

						<InputDate
							label={t('payments.filters.to') || 'To'}
							defaultValue={range.to}
							onChange={(d) => {
								const iso = d?.toISOString?.().slice(0, 10);
								setRange((prev) => ({ ...prev, to: iso || null }));
								setMeta((p) => ({ ...p, page: 1 }));
							}}
						/>

						<Select
							searchable={false}
							clearable={false}
							label={t('payments.filters.paid') || 'Payment Status'}
							placeholder={t('payments.filters.paid') || 'Payment Status'}
							options={[
								{ id: 'all', label: t('payments.filters.paidAll') || 'All' },
								{ id: 'paid', label: t('payments.filters.paidOnly') || 'Paid' },
								{ id: 'unpaid', label: t('payments.filters.unpaidOnly') || 'Unpaid' },
							]}
							value={paidFilter}
							onChange={(val) => {
								setPaidFilter(val);
								setMeta((p) => ({ ...p, page: 1 }));
							}}
						/>

						<Select
							searchable={false}
							clearable={false}
							label={t('payments.sort.order') || 'Sort'}
							placeholder={t('payments.sort.order') || 'Sort'}
							options={[
								{ id: 'newest', label: t('payments.sort.newest') },
								{ id: 'oldest', label: t('payments.sort.oldest') },
								{ id: 'amount_high', label: t('payments.sort.amountHigh') },
								{ id: 'amount_low', label: t('payments.sort.amountLow') },
							]}
							value={sortOrder}
							onChange={(val) => {
								setSortOrder(val);
								setMeta((p) => ({ ...p, page: 1 }));
							}}
						/>
					</div>
 
				</div>
			)}

			{/* Errors */}
			{paymentsError && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
					<p className="text-red-800">{paymentsError}</p>
				</div>
			)}

			{/* History */}
			{role === 'admin' && (
				<div className="bg-white rounded-2xl border shadow-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-extrabold text-slate-900">{t('payments.historyTitle')}</h2>

						<div className="text-xs font-semibold text-slate-500">
							{t('common.total') || 'Total'}: <span className="text-slate-900 font-extrabold">{meta.total}</span>
						</div>
					</div>

					{usersLoading || paymentsLoading ? <FiltersSkeleton /> : null}

					{paymentsLoading ? (
						<div className="space-y-3">
							<SkeletonBlock className="h-24" />
							<SkeletonBlock className="h-24" />
							<SkeletonBlock className="h-24" />
						</div>
					) : payments.length === 0 ? (
						<p className="text-gray-600 text-center py-10">{t('payments.empty')}</p>
					) : (
						<>
							<div className="max-h-[380px] overflow-y-auto w-[calc(100%+36px)] rtl:mr-[-18px] ltr:ml-[-18px] px-[18px]">
								<div className="space-y-3">
									{payments.map((payment) => {
										const client = payment?.client || {};
										const clientName = client?.name || t('common.unnamed');
										const clientEmail = client?.email || '—';
										const clientPhone = client?.phone || null;

										const amount = Number(payment.amount || 0);
										const created = new Date(payment.createdAt);

										const hasPeriod = !!(payment.periodStart || payment.periodEnd);
										const periodFrom = payment.periodStart
											? new Date(payment.periodStart).toLocaleDateString('ar-EG')
											: '—';
										const periodTo = payment.periodEnd
											? new Date(payment.periodEnd).toLocaleDateString('ar-EG')
											: '—';

										const status = payment.status || 'pending';
										const pill = statusUI[status]?.pill || 'bg-slate-50 text-slate-700 ring-slate-200';
										const dot = statusUI[status]?.dot || 'bg-slate-400';
										const StatusIcon = statusIcon[status] || Clock3;

										const initials = (clientName || 'U')
											.split(' ')
											.filter(Boolean)
											.slice(0, 2)
											.map((s) => s[0]?.toUpperCase())
											.join('');

										return (
											<div
												key={payment.id}
												className={cn(
													'relative overflow-hidden rounded-2xl border bg-white shadow-sm transition',
													'hover:shadow-md hover:border-slate-300',
												)}
											>
												<div className="p-4 md:p-5">
													<div className="flex items-start justify-between gap-3">
														<div className="flex items-start gap-3 min-w-0">
															<div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 ring-1 ring-slate-200 grid place-items-center flex-none">
																<span className="font-extrabold text-slate-700">{initials || 'U'}</span>
															</div>

															<div className="min-w-0">
																<div className="flex flex-wrap items-center gap-2">
																	<h3 className="text-[15px] md:text-base font-extrabold text-slate-900 truncate max-w-[260px]">
																		{clientName}
																	</h3>
																</div>

																<div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
																	<span className="truncate max-w-[260px]">{clientEmail}</span>
																	{clientPhone && (
																		<>
																			<span className="opacity-40">•</span>
																			<span className="tabular-nums">{clientPhone}</span>
																		</>
																	)}
																</div>

																{payment.description && (
																	<p className="mt-2 text-sm text-slate-700 line-clamp-2">
																		{payment.description}
																	</p>
																)}
															</div>
														</div>

														<div className="flex flex-col items-end gap-2 flex-none">
															<div className="flex items-center gap-2">
																<span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold ring-1', pill)}>
																	<span className={cn('h-2 w-2 rounded-full', dot)} />
																	<StatusIcon className="w-3.5 h-3.5" />
																	{statusLabels[status] || status}
																</span>

																<button
																	onClick={() => handleDeletePayment(payment.id)}
																	className="inline-flex items-center justify-center rounded-xl border bg-white p-2 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition"
																	title={t('common.delete') || 'Delete'}
																>
																	<Trash2 className="w-4 h-4" />
																</button>
															</div>

															<div className="text-right">
																<div className="text-2xl font-extrabold text-emerald-600 tabular-nums leading-tight">
																	${amount.toFixed(2)}
																</div>
																<p className="text-xs text-slate-500 mt-0.5">
																	{created.toLocaleDateString('ar-EG')}
																</p>
															</div>

															{status === 'pending' && (
																<button
																	onClick={() => handleMarkAsPaid(payment.id)}
																	className={cn(
																		'inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-extrabold transition',
																		'bg-emerald-600 text-white hover:bg-emerald-700',
																		'focus:outline-none focus:ring-4 focus:ring-emerald-100',
																	)}
																>
																	{t('payments.markPaid')}
																</button>
															)}
														</div>
													</div>

													{/* Period */}
													<div className="mt-4 flex flex-wrap items-center gap-2">
														<div className="rounded-xl flex items-center gap-2 bg-slate-50 ring-1 ring-slate-200 px-3 py-2">
															<div className="text-[11px] font-extrabold text-slate-500">
																{t('payments.period')}
															</div>

															{hasPeriod ? (
																<div className="flex flex-row-reverse flex-wrap items-center gap-2">
																	<span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200 tabular-nums">
																		{periodFrom}
																	</span>
																	<span className="text-slate-400">→</span>
																	<span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200 tabular-nums">
																		{periodTo}
																	</span>
																</div>
															) : (
																<span className="text-[11px] text-slate-400">—</span>
															)}
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* ✅ Pagination */}
							<div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
								<button
									disabled={!meta.hasPrev}
									onClick={() => setMeta((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
									className={cn(
										'inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition',
										'hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed',
									)}
								>
									<ChevronRight className="w-4 h-4 rtl:hidden" />
									<ChevronLeft className="w-4 h-4 ltr:hidden" />
									{t('common.prev')}
								</button>

								<div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700 tabular-nums">
									{t('common.page') || 'Page'} {meta.page} / {meta.pages}
								</div>

								<button
									disabled={!meta.hasNext}
									onClick={() => setMeta((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
									className={cn(
										'inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition',
										'hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed',
									)}
								>
									{t('common.next')}
									<ChevronLeft className="w-4 h-4 rtl:hidden" />
									<ChevronRight className="w-4 h-4 ltr:hidden" />
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------
// TAB: CLIENT PAYMENTS FORM
// ---------------------------------------------------
function ClientPaymentsTab({ userId, users, usersLoading }) {
	const t = useTranslations('billing');
	const { role } = useUser() || {};

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [successMsg, setSuccessMsg] = useState(null);

	const userOptions = useMemo(
		() =>
			(users || []).map((u) => ({
				id: u.id,
				label: u.name || u.email || t('common.unnamed'),
			})),
		[users, t],
	);

	const schema = useMemo(
		() =>
			yup
				.object({
					clientId: yup.string().required(t('form.errors.clientRequired')),
					amount: yup
						.number()
						.typeError(t('form.errors.amountNumber'))
						.positive(t('form.errors.amountPositive'))
						.required(t('form.errors.amountRequired')),
					description: yup.string().required(t('form.errors.descRequired')),
					periodFrom: yup.string().nullable(),
					periodTo: yup.string().nullable(),
				})
				.test('period-both-or-none', t('form.errors.periodBoth'), function (val) {
					const from = val?.periodFrom;
					const to = val?.periodTo;
					if ((from && !to) || (!from && to)) {
						return this.createError({ path: 'periodTo', message: t('form.errors.periodBoth') });
					}
					return true;
				}),
		[t],
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
		watch,
		setValue,
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			clientId: '',
			amount: '',
			description: '',
			periodFrom: null,
			periodTo: null,
		},
		mode: 'onTouched',
	});

	const periodFrom = watch('periodFrom');
	const periodTo = watch('periodTo');

	const onSubmit = async (values) => {
		if (role !== 'admin') return;

		try {
			setSubmitting(true);
			setError(null);

			const payload = {
				adminId: userId,
				clientId: values.clientId,
				amount: Number(values.amount),
				description: values.description,
				periodStart: values.periodFrom || undefined,
				periodEnd: values.periodTo || undefined,
			};

			await recordClientPayment(payload);

			setSuccessMsg(t('messages.paymentRecorded'));
			reset();
			setTimeout(() => setSuccessMsg(null), 2500);
		} catch (err) {
			setError(err.response?.data?.message || t('errors.recordPayment'));
		} finally {
			setSubmitting(false);
		}
	};

	if (usersLoading) return <FullPageLoader />;

	return (
		<div className="space-y-6">
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{successMsg && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
					<AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
					<p className="text-green-800">{successMsg}</p>
				</div>
			)}

			<div className="bg-white rounded-2xl shadow-sm p-6 border">
				<h2 className="text-xl font-extrabold text-gray-900 mb-6">{t('form.title')}</h2>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Controller
						control={control}
						name="clientId"
						render={({ field }) => (
							<Select
								searchable={false}
								clearable={false}
								label={t('form.client')}
								placeholder={t('form.chooseClient')}
								options={userOptions}
								value={field.value}
								onChange={(val) => field.onChange(val)}
								icon={<Users2 className="w-4 h-4" />}
							/>
						)}
					/>
					{errors.clientId?.message && (
						<p className="mt-1.5 text-xs text-rose-600">{String(errors.clientId.message)}</p>
					)}

					<Controller
						control={control}
						name="amount"
						render={({ field }) => (
							<Input
								label={t('form.amount')}
								placeholder={t('form.amountPh')}
								type="number"
								value={field.value}
								onChange={field.onChange}
								error={errors.amount?.message}
							/>
						)}
					/>

					<Controller
						control={control}
						name="description"
						render={({ field }) => (
							<div className="w-full">
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									{t('form.description')}
								</label>
								<textarea
									value={field.value}
									onChange={(e) => field.onChange(e.target.value)}
									rows={3}
									placeholder={t('form.descPh')}
									className={cn(
										'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none',
										errors.description ? 'border-rose-500' : 'border-slate-300',
										'focus-within:ring-4 focus-within:ring-indigo-100',
									)}
								/>
								{errors.description?.message && (
									<p className="mt-1.5 text-xs text-rose-600">{String(errors.description.message)}</p>
								)}
							</div>
						)}
					/>

					<div className="space-y-2">
						<div className="text-sm font-extrabold text-slate-700">{t('form.period')}</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<InputDate
								label={t('form.periodFrom')}
								defaultValue={periodFrom}
								onChange={(d) => {
									const iso = d?.toISOString?.().slice(0, 10);
									setValue('periodFrom', iso || null, { shouldValidate: true });
								}}
							/>

							<InputDate
								label={t('form.periodTo')}
								defaultValue={periodTo}
								onChange={(d) => {
									const iso = d?.toISOString?.().slice(0, 10);
									setValue('periodTo', iso || null, { shouldValidate: true });
								}}
							/>
						</div>

						{errors?.periodTo?.message && (
							<p className="mt-1.5 text-xs text-rose-600">{String(errors.periodTo.message)}</p>
						)}
					</div>

					<button
						type="submit"
						disabled={submitting}
						className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 transition disabled:opacity-50 mt-4"
					>
						{submitting ? t('common.loading') : t('form.submit')}
					</button>
				</form>
			</div>
		</div>
	);
}
