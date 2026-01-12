/* 
	- Show all data as TABLE (not boxes) for:
		1) (آخر المعاملات) in Overview
		2) (إدارة العملاء) in Clients
	- Create a reusable table component with nice pagination (use it everywhere)
	- In Clients: show stats (need renew soon / subscription ended / active)
	- In Subscriptions: show filters in a prettier way (chips + clean layout)
*/

"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import {
	Wallet,
	TrendingUp,
	DollarSign,
	Calendar,
	Clock,
	CheckCircle,
	XCircle,
	AlertCircle,
	Trash2,
	RefreshCw,
	Download,
	ArrowUpRight,
	ArrowDownRight,
	User,
	Mail,
	Phone,
	Filter,
	Search,
	ChevronDown,
	Eye,
	Plus,
	Info,
	Edit,
	Package,
	Send,
	Users,
	Activity,
	FileText,
	Receipt,
	Crown,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ===============================
// Reusable DataTable + Pagination
// ===============================
function PaginationBar({ page, totalPages, onPageChange }) {
	const canPrev = page > 1;
	const canNext = page < totalPages;

	// show up to 7 buttons with ellipsis behavior
	const pages = useMemo(() => {
		if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

		const out = new Set([1, totalPages, page, page - 1, page + 1]);
		const arr = [...out].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

		const withDots = [];
		for (let i = 0; i < arr.length; i++) {
			withDots.push(arr[i]);
			if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) {
				withDots.push("dots-" + i);
			}
		}
		return withDots;
	}, [page, totalPages]);

	return (
		<div className="flex items-center justify-between mt-6 pt-5 border-t-2">
			<Button
				variant="outline"
				disabled={!canPrev}
				onClick={() => onPageChange(page - 1)}
				className="h-11 px-6 rounded-xl border-2 font-semibold"
			>
				← السابق
			</Button>

			<div className="flex items-center gap-2">
				{pages.map((p) =>
					typeof p === "string" ? (
						<span key={p} className="px-2 text-gray-400 font-bold">
							…
						</span>
					) : (
						<Button
							key={p}
							variant={page === p ? "default" : "outline"}
							size="sm"
							onClick={() => onPageChange(p)}
							className="w-10 h-10 rounded-xl font-bold"
						>
							{p}
						</Button>
					)
				)}
			</div>

			<Button
				variant="outline"
				disabled={!canNext}
				onClick={() => onPageChange(page + 1)}
				className="h-11 px-6 rounded-xl border-2 font-semibold"
			>
				التالي →
			</Button>
		</div>
	);
}

function DataTable({
	columns,
	rows,
	getRowKey,
	renderCell,
	emptyTitle,
	emptyIcon: EmptyIcon,
	emptyDescription,
	pageSize = 8,
	showPagination = true,
	headerRight,
	headerTitle,
	headerSubtitle,
}) {
	const [page, setPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
	const safePage = Math.min(page, totalPages);

	const pagedRows = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return rows.slice(start, start + pageSize);
	}, [rows, safePage, pageSize]);

	// keep page in bounds when rows change
	React.useEffect(() => {
		if (page > totalPages) setPage(totalPages);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalPages]);

	return (
		<Card className="rounded-3xl border-2 shadow-xl overflow-hidden">
			{(headerTitle || headerRight) && (
				<CardHeader className="pb-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							{headerTitle && <CardTitle className="text-xl font-bold">{headerTitle}</CardTitle>}
							{headerSubtitle && <p className="text-sm text-gray-500 mt-1">{headerSubtitle}</p>}
						</div>
						{headerRight}
					</div>
				</CardHeader>
			)}

			<CardContent>
				{rows.length === 0 ? (
					<div className="text-center py-16">
						{EmptyIcon ? <EmptyIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" /> : null}
						<p className="text-gray-600 font-bold text-lg">{emptyTitle || "لا توجد بيانات"}</p>
						{emptyDescription ? <p className="text-sm text-gray-400 mt-2">{emptyDescription}</p> : null}
					</div>
				) : (
					<>
						<div className="rounded-xl border-2 overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-50">
										{columns.map((c) => (
											<TableHead
												key={c.key}
												className={[
													"font-black text-gray-900 rtl:text-right ltr:text-left",
												].join(" ")}
											>
												{c.label}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>

								<TableBody>
									{pagedRows.map((row) => (
										<TableRow key={getRowKey(row)} className="hover:bg-gray-50">
											{columns.map((c) => (
												<TableCell
													key={c.key}
													className={[
														c.align === "right" ? "text-right" : "",
														c.align === "center" ? "text-center" : "",
													].join(" ")}
												>
													{renderCell(row, c.key)}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>

						{showPagination && totalPages > 1 && (
							<PaginationBar page={safePage} totalPages={totalPages} onPageChange={setPage} />
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}

// ===============================
// Billing Page
// ===============================
export default function BillingPage() {
	const t = useTranslations("billing");
	const searchParams = useSearchParams();
	const router = useRouter();

	const activeTab = searchParams.get("tab") || "overview";

	// State
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(null);

	// Mock data
	const walletData = {
		balance: 25000,
		totalEarned: 150000,
		totalWithdrawn: 125000,
		moneyInThisMonth: 15000,
		moneyOutThisMonth: 8000,
		pendingPayments: 5000,
		paidThisMonth: 12000,
		growthRate: 12.5,
		transactionCount: 48,
		activeClients: 23,
	};

	const tabs = useMemo(() => {
		const allTabs = [
			{ id: "overview", label: t("tabs.overview"), icon: Activity },
			{ id: "clients", label: t("tabs.clients"), icon: Users },
			{ id: "packages", label: t("tabs.packages"), icon: Package },
			{ id: "subscriptions", label: t("tabs.subscriptions"), icon: Crown },
			{ id: "client-payments", label: t("tabs.clientPayments"), icon: Receipt },
		];

		return allTabs;
	}, [t]);

	const handleTabChange = (tabId) => {
		const params = new URLSearchParams(searchParams);
		params.set("tab", tabId);
		router.push(`?${params.toString()}`);
	};

	return (
		<div className="relative">
			<div className="relative z-10 !py-4 container">
				{/* Header */}
				<div className="mb-8 lg:mb-12">
					<div className="flex flex-col lg:flex-row items-start justify-between gap-6">
						<div className="flex items-start gap-4 lg:gap-6">
							<div className="w-16 h-16 lg:w-20 lg:h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative overflow-hidden">
								<Wallet className="w-8 h-8 lg:w-10 lg:h-10 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
								<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
							</div>

							<div>
								<div className="flex items-center gap-3 mb-2">
									<h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
										{t("title")}
									</h1>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<button className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
													<Info className="w-4 h-4 text-slate-600" />
												</button>
											</TooltipTrigger>
											<TooltipContent className="max-w-xs">
												<p className="text-sm">{t("tooltips.pageInfo")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>

								<p className="text-base lg:text-lg text-gray-600 mb-3 max-w-2xl">{t("subtitle")}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="mb-6 lg:mb-8">
					<div className="w-full lg:w-fit bg-white/70 backdrop-blur-2xl rounded-2xl lg:rounded-3xl p-1.5 border-2 border-gray-200/60 shadow-xl shadow-black/5">
						<div className="flex gap-1 overflow-x-auto scrollbar-none">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								const isActive = activeTab === tab.id;

								return (
									<button
										key={tab.id}
										onClick={() => handleTabChange(tab.id)}
										className={[
											"relative flex items-center gap-2.5",
											"px-4 lg:px-6 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl text-sm lg:text-base font-bold",
											"whitespace-nowrap select-none transition-all duration-300",
											"focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
											isActive ? "text-indigo-950 shadow-lg" : "text-slate-600 hover:bg-black/5",
										].join(" ")}
									>
										{isActive && (
											<motion.span
												layoutId="activeTabPill"
												className="absolute inset-0 rounded-xl lg:rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600"
												transition={{ type: "spring", stiffness: 500, damping: 35 }}
											/>
										)}

										<span className="relative z-10 inline-flex items-center gap-2 lg:gap-2.5">
											<Icon
												className={["h-4 w-4 lg:h-5 lg:w-5", isActive ? "text-white drop-shadow-sm" : ""].join(" ")}
												strokeWidth={2.5}
											/>
											<span className={isActive ? "text-white font-black" : ""}>{tab.label}</span>
										</span>

										{isActive && (
											<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
										)}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Tab Content */}
				<AnimatePresence mode="wait">
					{activeTab === "overview" && (
						<OverviewTab walletData={walletData} t={t} onNavigateToSubscriptions={() => handleTabChange("subscriptions")} />
					)}

					{activeTab === "clients" && <ClientsTab t={t} />}

					{activeTab === "packages" && <PackagesTab t={t} />}

					{activeTab === "subscriptions" && <SubscriptionsTab t={t} />}

					{activeTab === "client-payments" && <ClientPaymentsTab t={t} />}
				</AnimatePresence>
			</div>

			<style jsx global>{`
				.scrollbar-none::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-none {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
			`}</style>
		</div>
	);
}

// ==========================================
// OVERVIEW TAB (transactions as TABLE)
// ==========================================
function OverviewTab({ walletData, t, onNavigateToSubscriptions }) {
	const [error, setError] = useState(null);

	const cardGradients = [
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #B5CBE9 129.29%)",
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #E9B5B5 129.29%)",
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #E9C6B5 129.29%)",
	];

	const walletStats = [
		{
			title: t("kpi.walletBalance.title"),
			subtitle: t("kpi.walletBalance.subtitle"),
			value: `${walletData.balance.toLocaleString()} ${t("currency")}`,
			icon: Wallet,
			gradient: cardGradients[0],
			textColor: "text-blue-600",
		},
		{
			title: t("kpi.totalEarned.title"),
			subtitle: t("kpi.totalEarned.subtitle"),
			value: `${walletData.totalEarned.toLocaleString()} ${t("currency")}`,
			icon: TrendingUp,
			gradient: cardGradients[1],
			textColor: "text-emerald-600",
		},
		{
			title: t("kpi.moneyInThisMonth.title"),
			subtitle: new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" }),
			value: `${walletData.moneyInThisMonth.toLocaleString()} ${t("currency")}`,
			icon: ArrowDownRight,
			gradient: cardGradients[2],
			textColor: "text-teal-600",
		},
	];

	const recentTransactions = [
		{
			id: 1,
			type: "subscription_payment",
			status: "completed",
			description: t("transactions.examples.subscription"),
			date: "2025-01-12",
			time: "14:32",
			amount: 2500,
			client: "Sarah Johnson",
		},
		{
			id: 2,
			type: "withdrawal",
			status: "pending",
			description: t("transactions.examples.withdrawal"),
			date: "2025-01-11",
			time: "09:15",
			amount: -5000,
			client: t("common.system"),
		},
		{
			id: 3,
			type: "refund",
			status: "completed",
			description: t("transactions.examples.refund"),
			date: "2025-01-10",
			time: "16:48",
			amount: -1000,
			client: "Michael Chen",
		},
		{
			id: 4,
			type: "subscription_payment",
			status: "completed",
			description: t("transactions.examples.annual"),
			date: "2025-01-09",
			time: "11:20",
			amount: 12000,
			client: "Emma Davis",
		},
	];

	const txColumns = [
		{ key: "status", label: t("table.status") },
		{ key: "client", label: t("table.client") },
		{ key: "description", label: t("table.description") },
		{ key: "date", label: t("table.date") },
		{ key: "amount", label: t("table.amount"), align: "right" },
	];

	return (
		<motion.div
			key="overview"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			className="space-y-6 lg:space-y-8"
		>
			{error && (
				<Alert variant="destructive" className="rounded-2xl border-2">
					<AlertCircle className="h-5 w-5" />
					<AlertDescription className="text-base">{error}</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
				{walletStats.map((stat) => {
					const Icon = stat.icon;
					const trend = stat.trend; // optional

					return (
						<div
							key={stat.title}
							className="group relative rounded-2xl lg:rounded-3xl border-2 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
							style={{ background: stat.gradient }}
						>
							<div className="absolute inset-0 bg-gradient-to-t from-black/[0.05] to-transparent pointer-events-none" />

							<div className="relative p-4 lg:p-5">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-white/70 backdrop-blur flex items-center justify-center border border-white/60 group-hover:scale-[1.04] transition-transform">
											<Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.textColor}`} />
										</div>

										<div className="min-w-0">
											<h3 className="text-[11px] lg:text-xs font-black text-gray-700 uppercase tracking-wider truncate">
												{stat.title}
											</h3>
											{stat.subtitle ? (
												<p className="text-[11px] text-gray-500 font-semibold truncate mt-0.5">
													{stat.subtitle}
												</p>
											) : null}
										</div>
									</div>

									{/* right badges */}
									<div className="flex items-center gap-1.5 shrink-0">
										{stat.chip ? (
											<span className="px-2 py-1 rounded-xl text-[10px] font-black bg-white/70 border border-white/70 text-gray-700">
												{stat.chip}
											</span>
										) : null}

										{trend?.value ? (
											<span
												className={[
													"px-2 py-1 rounded-xl text-[10px] font-black border",
													trend.direction === "down"
														? "bg-rose-50/80 border-rose-200 text-rose-700"
														: "bg-emerald-50/80 border-emerald-200 text-emerald-700",
												].join(" ")}
											>
												{trend.value}
											</span>
										) : null}
									</div>
								</div>

								<div className="mt-3 flex items-end justify-between gap-3">
									<p className="text-2xl lg:text-3xl font-black text-gray-900 leading-none tracking-tight">
										{stat.value}
									</p>

									{stat.hint ? (
										<p className="text-[11px] text-gray-500 font-semibold text-right">
											{stat.hint}
										</p>
									) : null}
								</div>

								{/* tiny progress bar (optional) */}
								{typeof stat.progress === "number" ? (
									<div className="mt-3">
										<div className="h-1.5 w-full rounded-full bg-white/60 border border-white/70 overflow-hidden">
											<div
												className="h-full rounded-full bg-black/20"
												style={{ width: `${Math.max(0, Math.min(100, stat.progress))}%` }}
											/>
										</div>
									</div>
								) : null}
							</div>
						</div>
					);
				})}
			</div>

			<DataTable
				headerTitle={t("transactions.recent")}
				headerSubtitle={t("transactions.recentSubtitle") || t("transactions.recent")}
				headerRight={
					<div className="flex items-center gap-3">
						<Badge variant="secondary" className="font-bold text-sm px-4 py-1.5">
							{t("payments.total", { count: recentTransactions.length })}
						</Badge>
						<Button
							variant="outline"
							size="sm"
							className="rounded-xl border-2"
							onClick={onNavigateToSubscriptions}
						>
							{t("common.viewAll")}
							<ArrowUpRight className="w-4 h-4 ml-2" />
						</Button>
					</div>
				}
				columns={txColumns}
				rows={recentTransactions}
				getRowKey={(r) => r.id}
				pageSize={6}
				emptyTitle={t("transactions.empty")}
				emptyIcon={FileText}
				renderCell={(tx, key) => {
					if (key === "status") return <TxStatusBadge status={tx.status} t={t} />;
					if (key === "client") {
						return (
							<div className="flex items-center gap-2">
								<User className="w-4 h-4 text-gray-400" />
								<span className="font-bold text-gray-900">{tx.client}</span>
							</div>
						);
					}
					if (key === "description") return <span className="text-sm text-gray-700">{tx.description}</span>;
					if (key === "date") {
						return (
							<div className="text-sm">
								<p className="text-gray-700">{tx.date}</p>
								<p className="text-xs text-gray-500">{tx.time}</p>
							</div>
						);
					}
					if (key === "amount") {
						return (
							<div>
								<p className={`text-lg font-black ${tx.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>
									{tx.amount > 0 ? "+" : ""}
									{tx.amount.toLocaleString()}
								</p>
								<p className="text-xs font-semibold text-gray-500">{t("currency")}</p>
							</div>
						);
					}
					return null;
				}}
			/>
		</motion.div>
	);
}

function TxStatusBadge({ status, t }) {
	const cfg =
		status === "completed"
			? { cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: CheckCircle }
			: status === "failed"
				? { cls: "bg-rose-500/10 text-rose-700 border-rose-500/30", icon: XCircle }
				: { cls: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: Clock };

	const Icon = cfg.icon;

	return (
		<Badge className={`${cfg.cls} border-2 px-2.5 py-1 font-bold text-xs`}>
			<Icon className="w-3 h-3 mr-1.5" />
			{t(`status.${status}`)}
		</Badge>
	);
}

// ==========================================
// CLIENTS TAB (TABLE + STATS)
// ==========================================
function ClientsTab({ t }) {
	const [searchTerm, setSearchTerm] = useState("");

	const clients = [
		{
			id: 1,
			name: "أحمد محمد علي",
			email: "ahmed@example.com",
			phone: "01001234567",
			package: "الحزمة الذهبية",
			startDate: "2024-10-15",
			endDate: "2025-02-15",
			daysLeft: 34,
			status: "active",
			avatar: "AM",
		},
		{
			id: 2,
			name: "فاطمة حسن",
			email: "fatima@example.com",
			phone: "01112345678",
			package: "حزمة البداية",
			startDate: "2024-12-01",
			endDate: "2025-01-20",
			daysLeft: 8,
			status: "expiring_soon",
			avatar: "FH",
		},
		{
			id: 3,
			name: "محمود السيد",
			email: "mahmoud@example.com",
			phone: "01223456789",
			package: "الحزمة البلاتينية",
			startDate: "2024-08-01",
			endDate: "2025-08-01",
			daysLeft: 201,
			status: "active",
			avatar: "MS",
		},
		{
			id: 4,
			name: "نور الدين",
			email: "nour@example.com",
			phone: "01334567890",
			package: "الحزمة الذهبية",
			startDate: "2024-11-10",
			endDate: "2025-01-15",
			daysLeft: 3,
			status: "expiring_soon",
			avatar: "ND",
		},
		{
			id: 5,
			name: "ليلى يوسف",
			email: "layla@example.com",
			phone: "01445678901",
			package: "حزمة البداية",
			startDate: "2024-09-20",
			endDate: "2025-03-20",
			daysLeft: 67,
			status: "active",
			avatar: "LY",
		},
		{
			id: 6,
			name: "علي سامي",
			email: "ali@example.com",
			phone: "01555555555",
			package: "حزمة البداية",
			startDate: "2024-10-01",
			endDate: "2025-01-05",
			daysLeft: -7,
			status: "ended",
			avatar: "AS",
		},
	];

	const normalized = (v) => (v || "").toString().toLowerCase();
	const filtered = useMemo(() => {
		const q = normalized(searchTerm);
		return clients
			.filter(
				(c) =>
					normalized(c.name).includes(q) || normalized(c.email).includes(q) || (c.phone || "").includes(searchTerm)
			)
			.sort((a, b) => a.daysLeft - b.daysLeft);
	}, [clients, searchTerm]);

	const stats = useMemo(() => {
		const total = clients.length;

		const active = clients.filter((c) => c.daysLeft > 30).length;
		const renew30 = clients.filter((c) => c.daysLeft > 7 && c.daysLeft <= 30).length; // soon
		const renew7 = clients.filter((c) => c.daysLeft > 0 && c.daysLeft <= 7).length; // urgent
		const ended = clients.filter((c) => c.daysLeft <= 0).length;

		const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

		return [
			{
				key: "total",
				label: t("clients.stats.total") ?? "إجمالي العملاء",
				value: total,
				icon: Users,
				gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #DDE7F7 129.29%)",
				iconCls: "text-slate-700",
				chip: "100%",
				subLabel: t("clients.statsSubtitle.total") ?? "الكل",
				progress: 100,
				hint: t("clients.statsHint.total") ?? "قاعدة العملاء",
			},
			{
				key: "active",
				label: t("clients.stats.active") || "نشط",
				value: active,
				icon: CheckCircle,
				gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #B5E9C6 129.29%)",
				iconCls: "text-emerald-700",
				chip: `${pct(active)}%`,
				subLabel: t("clients.statsSubtitle.active") ?? "أكثر من 30 يوم",
				progress: pct(active),
				hint: t("clients.statsHint.active") ?? "اشتراكات مستقرة",
			},
			{
				key: "renew7",
				label: t("clients.stats.renewUrgent") ?? "تجديد عاجل",
				value: renew7,
				icon: AlertCircle,
				gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #F7D6DA 129.29%)",
				iconCls: "text-rose-700",
				chip: `${pct(renew7)}%`,
				subLabel: t("clients.statsSubtitle.renewUrgent") ?? "خلال 7 أيام",
				progress: pct(renew7),
				hint: t("clients.statsHint.renewUrgent") ?? "أرسل تذكير الآن",
			},
			{
				key: "renew30",
				label: t("clients.stats.renewSoon") || "يحتاج تجديد قريبًا",
				value: renew30,
				icon: RefreshCw,
				gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #E9C6B5 129.29%)",
				iconCls: "text-amber-700",
				chip: `${pct(renew30)}%`,
				subLabel: t("clients.statsSubtitle.renewSoon") ?? "8–30 يوم",
				progress: pct(renew30),
				hint: t("clients.statsHint.renewSoon") ?? "تابع قبل الانتهاء",
			},
			{
				key: "ended",
				label: t("clients.stats.ended") || "منتهي",
				value: ended,
				icon: XCircle,
				gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #E9B5B5 129.29%)",
				iconCls: "text-rose-700",
				chip: `${pct(ended)}%`,
				subLabel: t("clients.statsSubtitle.ended") ?? "انتهى بالفعل",
				progress: pct(ended),
				hint: t("clients.statsHint.ended") ?? "استرجاع العملاء",
			},
		];
	}, [clients, t]);

	const getClientBadge = (daysLeft) => {
		if (daysLeft <= 0) {
			return {
				text: t("clients.status.ended") || "منتهي",
				className: "bg-rose-500/10 text-rose-700 border-rose-500/30",
				icon: XCircle,
			};
		}
		if (daysLeft <= 7) {
			return {
				text: t("clients.status.expiringSoon"),
				className: "bg-rose-500/10 text-rose-700 border-rose-500/30",
				icon: AlertCircle,
			};
		}
		if (daysLeft <= 30) {
			return {
				text: t("clients.status.renewalDue") || "تجديد قريب",
				className: "bg-amber-500/10 text-amber-700 border-amber-500/30",
				icon: RefreshCw,
			};
		}
		return {
			text: t("clients.status.active"),
			className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
			icon: CheckCircle,
		};
	};

	const columns = [
		{ key: "client", label: t("table.client") },
		{ key: "contact", label: t("clients.contact") || "التواصل" },
		{ key: "package", label: t("clients.package") || "الباقة" },
		{ key: "renewal", label: t("clients.renewal") || "التجديد" },
		{ key: "status", label: t("table.status") },
		{ key: "actions", label: t("table.actions"), align: "center" },
	];

	return (
		<motion.div
			key="clients"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			className="space-y-8"
		>
 

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
				{stats.map((s) => {
					const Icon = s.icon;
					return (
						<div
							key={s.key}
							className="group relative rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
							style={{ background: s.gradient }}
						>
							<div className="absolute inset-0 bg-gradient-to-t from-black/[0.05] to-transparent pointer-events-none" />

							<div className="relative p-3.5 lg:p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center border border-white/60 group-hover:scale-[1.03] transition-transform">
											<Icon className={`w-5 h-5 ${s.iconCls}`} />
										</div>

										<div className="min-w-0">
											<p className="text-[11px] font-black text-gray-700 uppercase tracking-wide truncate">
												{s.label}
											</p>
											{s.subLabel ? (
												<p className="text-[11px] text-gray-500 font-semibold truncate mt-0.5">
													{s.subLabel}
												</p>
											) : null}
										</div>
									</div>

									{s.chip ? (
										<span className="px-2 py-1 rounded-xl text-[10px] font-black bg-white/70 border border-white/70 text-gray-700 shrink-0">
											{s.chip}
										</span>
									) : null}
								</div>

								<div className="mt-3 flex items-end justify-between gap-3">
									<p className="text-2xl lg:text-[26px] font-black text-gray-900 leading-none">
										{s.value}
									</p>

									{s.hint ? (
										<p className="text-[11px] text-gray-500 font-semibold text-right">
											{s.hint}
										</p>
									) : null}
								</div>

								{typeof s.progress === "number" ? (
									<div className="mt-3">
										<div className="h-1.5 w-full rounded-full bg-white/60 border border-white/70 overflow-hidden">
											<div
												className="h-full rounded-full bg-black/20"
												style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }}
											/>
										</div>
									</div>
								) : null}
							</div>
						</div>
					);
				})}
			</div>

			{/* Table */}
			<DataTable
				headerTitle={t("clients.management") || "إدارة العملاء"}
				headerSubtitle={t("clients.managementSubtitle") || "عرض العملاء في جدول مع بحث وترتيب وتجديد"}
				headerRight={
					<Badge variant="secondary" className="font-bold text-sm px-4 py-1.5">
						{t("payments.total", { count: filtered.length })}
					</Badge>
				}
				columns={columns}
				rows={filtered}
				getRowKey={(c) => c.id}
				pageSize={8}
				emptyTitle={t("clients.noResults")}
				emptyIcon={Users}
				renderCell={(c, key) => {
					if (key === "client") {
						return (
							<div className="flex items-center gap-3">
								<Avatar className="w-10 h-10 border-2 border-white shadow-sm">
									<AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black">
										{c.avatar}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<p className="font-black text-gray-900 truncate">{c.name}</p>
									<p className="text-xs text-gray-500">
										{t("clients.startDate") || "بدأ"}: {c.startDate}
									</p>
								</div>
							</div>
						);
					}

					if (key === "contact") {
						return (
							<div className="space-y-1">
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<Mail className="w-4 h-4 text-gray-400" />
									<span className="truncate">{c.email}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<Phone className="w-4 h-4 text-gray-400" />
									<span>{c.phone}</span>
								</div>
							</div>
						);
					}

					if (key === "package") {
						return <span className="font-bold text-gray-900">{c.package}</span>;
					}

					if (key === "renewal") {
						return (
							<div className="text-sm">
								<p className="text-gray-700">
									{t("clients.renewalDate")}: {c.endDate}
								</p>
								<p className={`text-xs font-bold ${c.daysLeft <= 7 ? "text-rose-700" : c.daysLeft <= 30 ? "text-amber-700" : "text-gray-500"}`}>
									{t("clients.daysLeft")}:{" "}
									<span className="font-black">{c.daysLeft}</span> {t("clients.days")}
								</p>
							</div>
						);
					}

					if (key === "status") {
						const b = getClientBadge(c.daysLeft);
						const Icon = b.icon;
						return (
							<Badge className={`${b.className} border-2 px-3 py-1 font-bold text-xs`}>
								<Icon className="w-3 h-3 mr-1.5" />
								{b.text}
							</Badge>
						);
					}

					if (key === "actions") {
						return (
							<div className="flex items-center justify-center gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button className="rounded-xl h-10 px-4 font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700">
												<Send className="w-4 h-4 mr-2" />
												{t("clients.sendReminder")}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>{t("clients.sendReminder")}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						);
					}

					return null;
				}}
			/>
		</motion.div>
	);
}

// ==========================================
// PACKAGES TAB (unchanged from your code)
// ==========================================
function PackagesTab({ t }) {
	const [packages, setPackages] = useState([
		{
			id: 1,
			name: "حزمة البداية",
			nameEn: "Starter Package",
			price: 500,
			duration: "شهري",
			features: ["3 جلسات تدريبية", "دعم عبر الواتساب", "خطة تمارين مخصصة"],
			gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #B5CBE9 129.29%)",
		},
		{
			id: 2,
			name: "الحزمة الذهبية",
			nameEn: "Gold Package",
			price: 1200,
			duration: "شهري",
			features: ["8 جلسات تدريبية", "دعم 24/7", "خطة تمارين وتغذية", "متابعة أسبوعية"],
			gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #E9C6B5 129.29%)",
		},
		{
			id: 3,
			name: "الحزمة البلاتينية",
			nameEn: "Platinum Package",
			price: 2500,
			duration: "شهري",
			features: ["جلسات غير محدودة", "دعم VIP", "خطة شاملة", "تحليل جسم شامل", "مكملات غذائية"],
			gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #CCB5E9 129.29%)",
		},
	]);

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
	const [exportingPackages, setExportingPackages] = useState(false);
	const [phoneNumber, setPhoneNumber] = useState("");
	const [editingPackage, setEditingPackage] = useState(null);
	const [formData, setFormData] = useState({
		name: "",
		nameEn: "",
		price: "",
		duration: "شهري",
		features: [""],
	});

	const cardGradients = [
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #B5CBE9 129.29%)",
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #E9B5B5 129.29%)",
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #E9C6B5 129.29%)",
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #CCB5E9 129.29%)",
		"linear-gradient(300.09deg, #FAFAFA 74.95%, #D4B9EF 129.29%)",
	];

	const handleAddFeature = () => setFormData({ ...formData, features: [...formData.features, ""] });
	const handleRemoveFeature = (index) => {
		const newFeatures = formData.features.filter((_, i) => i !== index);
		setFormData({ ...formData, features: newFeatures });
	};
	const handleFeatureChange = (index, value) => {
		const newFeatures = [...formData.features];
		newFeatures[index] = value;
		setFormData({ ...formData, features: newFeatures });
	};

	const handleSubmit = () => {
		if (editingPackage) {
			setPackages(
				packages.map((pkg) =>
					pkg.id === editingPackage.id
						? {
							...pkg,
							...formData,
							gradient: cardGradients[Math.floor(Math.random() * cardGradients.length)],
						}
						: pkg
				)
			);
		} else {
			const newPackage = {
				id: Date.now(),
				...formData,
				gradient: cardGradients[Math.floor(Math.random() * cardGradients.length)],
			};
			setPackages([...packages, newPackage]);
		}
		setIsDialogOpen(false);
		setEditingPackage(null);
		setFormData({ name: "", nameEn: "", price: "", duration: "شهري", features: [""] });
	};

	const handleEdit = (pkg) => {
		setEditingPackage(pkg);
		setFormData({
			name: pkg.name,
			nameEn: pkg.nameEn,
			price: pkg.price,
			duration: pkg.duration,
			features: pkg.features,
		});
		setIsDialogOpen(true);
	};

	const handleDelete = (id) => setPackages(packages.filter((pkg) => pkg.id !== id));

	const handleExportAllPackages = async () => {
		if (!phoneNumber) return;
		setExportingPackages(true);
		await new Promise((resolve) => setTimeout(resolve, 2000));
		setExportingPackages(false);
		setIsExportDialogOpen(false);
		setPhoneNumber("");
		alert(t("packages.exportSuccess", { phone: phoneNumber }));
	};

	return (
		<motion.div
			key="packages"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			className="space-y-8"
		>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-black text-gray-900 mb-2">{t("packages.title")}</h2>
					<p className="text-gray-600">{t("packages.description")}</p>
				</div>
				<div className="flex gap-3">
					{/* Export All Button */}
					<Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" className="h-14 px-8 rounded-2xl font-bold border-2">
								<Send className="w-5 h-5 mr-2" />
								{t("packages.exportAll")}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle className="text-2xl font-black">{t("packages.exportDialog.title")}</DialogTitle>
								<DialogDescription>{t("packages.exportDialog.description")}</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div>
									<Label htmlFor="phone" className="text-base font-bold mb-3 block">
										{t("packages.exportDialog.phoneLabel")}
									</Label>
									<div className="relative">
										<Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
										<Input
											id="phone"
											type="tel"
											placeholder="01XXXXXXXXX"
											value={phoneNumber}
											onChange={(e) => setPhoneNumber(e.target.value)}
											className="h-14 pl-12 rounded-2xl border-2 text-base"
										/>
									</div>
								</div>
								<Alert className="bg-blue-50 border-blue-200">
									<Info className="h-5 w-5 text-blue-600" />
									<AlertDescription className="text-blue-900">{t("packages.exportDialog.info")}</AlertDescription>
								</Alert>
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="rounded-xl border-2">
									{t("common.cancel")}
								</Button>
								<Button
									onClick={handleExportAllPackages}
									disabled={!phoneNumber || exportingPackages}
									className="rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
								>
									{exportingPackages ? (
										<>
											<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
											{t("packages.exportDialog.sending")}
										</>
									) : (
										<>
											<Send className="w-4 h-4 mr-2" />
											{t("packages.exportDialog.send")}
										</>
									)}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Add New Button */}
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button
								className="h-14 px-8 rounded-2xl font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-xl shadow-indigo-500/30"
								onClick={() => {
									setEditingPackage(null);
									setFormData({ name: "", nameEn: "", price: "", duration: "شهري", features: [""] });
								}}
							>
								<Plus className="w-5 h-5 mr-2" />
								{t("packages.addNew")}
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle className="text-2xl font-black">{editingPackage ? t("packages.edit") : t("packages.addNew")}</DialogTitle>
								<DialogDescription>{t("packages.dialogDescription")}</DialogDescription>
							</DialogHeader>

							<div className="space-y-6 py-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="name" className="text-sm font-bold mb-2 block">
											{t("packages.form.nameAr")}
										</Label>
										<Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl border-2" />
									</div>
									<div>
										<Label htmlFor="nameEn" className="text-sm font-bold mb-2 block">
											{t("packages.form.nameEn")}
										</Label>
										<Input id="nameEn" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} className="h-12 rounded-xl border-2" />
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="price" className="text-sm font-bold mb-2 block">
											{t("packages.form.price")}
										</Label>
										<Input id="price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="h-12 rounded-xl border-2" />
									</div>
									<div>
										<Label htmlFor="duration" className="text-sm font-bold mb-2 block">
											{t("packages.form.duration")}
										</Label>
										<Select value={formData.duration} onValueChange={(v) => setFormData({ ...formData, duration: v })}>
											<SelectTrigger className="h-12 rounded-xl border-2">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="شهري">{t("packages.form.monthly")}</SelectItem>
												<SelectItem value="ربع سنوي">{t("packages.form.quarterly")}</SelectItem>
												<SelectItem value="نصف سنوي">{t("packages.form.semiAnnual")}</SelectItem>
												<SelectItem value="سنوي">{t("packages.form.annual")}</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between mb-2">
										<Label className="text-sm font-bold">{t("packages.form.features")}</Label>
										<Button type="button" variant="outline" size="sm" onClick={handleAddFeature} className="rounded-xl">
											<Plus className="w-4 h-4 mr-1" />
											{t("packages.form.addFeature")}
										</Button>
									</div>
									<div className="space-y-2">
										{formData.features.map((feature, index) => (
											<div key={index} className="flex gap-2">
												<Input
													value={feature}
													onChange={(e) => handleFeatureChange(index, e.target.value)}
													className="h-12 rounded-xl border-2"
													placeholder={`${t("packages.form.feature")} ${index + 1}`}
												/>
												{formData.features.length > 1 && (
													<Button type="button" variant="outline" size="icon" onClick={() => handleRemoveFeature(index)} className="h-12 w-12 rounded-xl border-2">
														<Trash2 className="w-4 h-4 text-rose-500" />
													</Button>
												)}
											</div>
										))}
									</div>
								</div>
							</div>

							<DialogFooter>
								<Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl border-2">
									{t("common.cancel")}
								</Button>
								<Button onClick={handleSubmit} className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700">
									{editingPackage ? t("common.update") : t("common.save")}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Packages Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{packages.map((pkg) => (
					<div
						key={pkg.id}
						className="rounded-2xl lg:rounded-3xl border-2 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group hover:-translate-y-2"
						style={{ background: pkg.gradient }}
					>
						<div className="p-6 relative">
							<div className="flex items-start justify-between mb-6">
								<div>
									<h3 className="text-2xl font-black text-gray-900 mb-1">{pkg.name}</h3>
									<p className="text-sm text-gray-600">{pkg.nameEn}</p>
								</div>
								<div className="flex gap-2">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)} className="rounded-xl hover:bg-white/60">
													<Edit className="w-4 h-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{t("common.edit")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)} className="rounded-xl hover:bg-white/60 text-rose-500">
													<Trash2 className="w-4 h-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{t("common.delete")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</div>

							<div className="mb-6">
								<div className="flex items-baseline gap-2">
									<span className="text-4xl font-black text-gray-900">{pkg.price}</span>
									<span className="text-lg font-bold text-gray-600">{t("currency")}</span>
								</div>
								<p className="text-sm text-gray-600 mt-1">{pkg.duration}</p>
							</div>

							<div className="space-y-3 mb-6">
								{pkg.features.map((feature, idx) => (
									<div key={idx} className="flex items-start gap-2">
										<CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
										<span className="text-sm font-medium text-gray-700">{feature}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
		</motion.div>
	);
}

// ==========================================
// SUBSCRIPTIONS TAB (prettier filters + chips)
// ==========================================
function SubscriptionsTab({ t }) {
	const [filters, setFilters] = useState({
		client: "",
		fromDate: null,
		toDate: null,
		sort: "newest",
	});

	const [loading, setLoading] = useState(false);
	const [showFilters, setShowFilters] = useState(true);

	const payments = [
		{
			id: 1,
			clientName: "يسرا علام",
			email: "yosra@example.com",
			phone: "01002766903",
			description: "Monthly subscription - Premium tier",
			amount: 2500,
			date: "2025-01-12",
			time: "14:32",
			periodFrom: "2025-01-01",
			periodTo: "2025-01-31",
		},
		{
			id: 2,
			clientName: "أحمد محمد",
			email: "ahmed@example.com",
			phone: "01112345678",
			description: "Quarterly payment - Business plan",
			amount: 5000,
			date: "2025-01-10",
			time: "11:20",
			periodFrom: "2025-01-01",
			periodTo: "2025-03-31",
		},
		{
			id: 3,
			clientName: "Sarah Johnson",
			email: "sarah.j@example.com",
			phone: "+1234567890",
			description: "Annual subscription - Enterprise",
			amount: 15000,
			date: "2025-01-08",
			time: "09:45",
			periodFrom: "2025-01-01",
			periodTo: "2025-12-31",
		},
	];

	const resetFilters = () => {
		setFilters({
			client: "",
			fromDate: null,
			toDate: null,
			sort: "newest",
		});
	};

	const filterChips = useMemo(() => {
		const chips = [];
		if (filters.client && filters.client !== "all") chips.push({ key: "client", label: `${t("filters.client")}: ${filters.client}` });
		if (filters.fromDate) chips.push({ key: "fromDate", label: `${t("filters.fromDate")}: ${new Date(filters.fromDate).toLocaleDateString("ar-EG")}` });
		if (filters.toDate) chips.push({ key: "toDate", label: `${t("filters.toDate")}: ${new Date(filters.toDate).toLocaleDateString("ar-EG")}` });
		if (filters.sort) chips.push({ key: "sort", label: `${t("filters.sort")}: ${t(`filters.${filters.sort}`)}` });
		return chips;
	}, [filters, t]);

	const stats = [
		{
			label: t("subscriptions.stats.active"),
			value: "23",
			icon: Users,
			gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #B5CBE9 129.29%)",
			iconCls: "text-blue-700",
		},
		{
			label: t("subscriptions.stats.revenue"),
			value: "12,500",
			icon: DollarSign,
			gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #B5E9C6 129.29%)",
			iconCls: "text-emerald-700",
		},
		{
			label: t("subscriptions.stats.renewal"),
			value: "94%",
			icon: RefreshCw,
			gradient: "linear-gradient(300.09deg, #FAFAFA 74.95%, #CCB5E9 129.29%)",
			iconCls: "text-violet-700",
		},
	];

	const paymentColumns = [
		{ key: "client", label: t("table.client") },
		{ key: "description", label: t("table.description") },
		{ key: "period", label: t("table.period") },
		{ key: "date", label: t("table.date") },
		{ key: "amount", label: t("table.amount"), align: "right" },
		{ key: "actions", label: t("table.actions"), align: "center" },
	];

	return (
		<motion.div
			key="subscriptions"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			className="space-y-8"
		>
			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{stats.map((stat) => {
					const Icon = stat.icon;
					return (
						<div key={stat.label} className="rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ background: stat.gradient }}>
							<div className="p-2 !px-6 flex items-center justify-between ">
								<div className="flex items-center justify-between gap-2 ">
									<div className="w-14 h-14 rounded-2xl bg-gray-200/60 flex items-center justify-center">
										<Icon className={`w-7 h-7 ${stat.iconCls}`} />
									</div>
									<p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">{stat.label}</p>
								</div>
								<p className="text-3xl font-black text-gray-900">{stat.value}</p>
							</div>
						</div>
					);
				})}
			</div>

			{/* Filters */}
			<Card className="rounded-3xl border-2 shadow-xl overflow-hidden">
				<CardHeader className="pb-4">
					<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
								<Filter className="w-6 h-6 text-blue-600" />
							</div>
							<div>
								<CardTitle className="text-xl font-bold">{t("filters.title")}</CardTitle>
								<CardDescription className="text-sm">{t("filters.subtitle") || "فلترة النتائج بسرعة ووضوح"}</CardDescription>
							</div>
						</div>

						<div className="flex gap-2">
							<Button variant="ghost" size="sm" onClick={resetFilters} className="rounded-xl font-semibold">
								<RefreshCw className="w-4 h-4 mr-2" />
								{t("filters.reset")}
							</Button>
							<Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="rounded-xl border-2 font-semibold">
								{showFilters ? t("filters.hide") : t("filters.show")}
								<ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
							</Button>
						</div>
					</div>

					{/* Active filter chips */}
					{filterChips.length > 0 && (
						<div className="mt-4 flex flex-wrap gap-2">
							{filterChips.map((c) => (
								<Badge key={c.key} variant="secondary" className="px-3 py-1.5 rounded-xl font-bold">
									{c.label}
								</Badge>
							))}
						</div>
					)}
				</CardHeader>

				<AnimatePresence>
					{showFilters && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.3 }}
						>
							<CardContent className="pt-0">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div>
										<Label className="text-sm font-semibold mb-2 block">{t("filters.client")}</Label>
										<Select value={filters.client} onValueChange={(v) => setFilters({ ...filters, client: v })}>
											<SelectTrigger className="h-11 rounded-xl border-2">
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
										<Label className="text-sm font-semibold mb-2 block">{t("filters.fromDate")}</Label>
										<Flatpickr
											value={filters.fromDate}
											onChange={([date]) => setFilters({ ...filters, fromDate: date })}
											options={{ dateFormat: "Y-m-d", locale: "ar" }}
											className="h-11 w-full rounded-xl border-2 px-3 text-sm"
											placeholder={t("filters.selectDate")}
										/>
									</div>

									<div>
										<Label className="text-sm font-semibold mb-2 block">{t("filters.toDate")}</Label>
										<Flatpickr
											value={filters.toDate}
											onChange={([date]) => setFilters({ ...filters, toDate: date })}
											options={{ dateFormat: "Y-m-d", locale: "ar" }}
											className="h-11 w-full rounded-xl border-2 px-3 text-sm"
											placeholder={t("filters.selectDate")}
										/>
									</div>

									<div>
										<Label className="text-sm font-semibold mb-2 block">{t("filters.sort")}</Label>
										<Select value={filters.sort} onValueChange={(v) => setFilters({ ...filters, sort: v })}>
											<SelectTrigger className="h-11 rounded-xl border-2">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="newest">{t("filters.newest")}</SelectItem>
												<SelectItem value="oldest">{t("filters.oldest")}</SelectItem>
												<SelectItem value="amountHigh">{t("filters.amountHigh")}</SelectItem>
												<SelectItem value="amountLow">{t("filters.amountLow")}</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</CardContent>
						</motion.div>
					)}
				</AnimatePresence>
			</Card>

			{/* Payments History TABLE (using reusable DataTable) */}
			{loading ? (
				<Card className="rounded-3xl border-2 shadow-xl overflow-hidden">
					<CardHeader className="pb-4">
						<CardTitle className="text-xl font-bold">{t("payments.history")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-20 w-full rounded-2xl" />
						))}
					</CardContent>
				</Card>
			) : (
				<DataTable
					headerTitle={t("payments.history")}
					headerSubtitle={t("payments.historyDescription")}
					headerRight={
						<div className="flex items-center gap-3">
							<Badge variant="secondary" className="font-bold text-sm px-4 py-1.5">
								{t("payments.total", { count: payments.length })}
							</Badge>
							<Button variant="outline" size="sm" className="rounded-xl border-2">
								<Download className="w-4 h-4 mr-2" />
								{t("common.export")}
							</Button>
						</div>
					}
					columns={paymentColumns}
					rows={payments}
					getRowKey={(p) => p.id}
					pageSize={7}
					emptyTitle={t("payments.empty")}
					emptyIcon={Receipt}
					emptyDescription={t("payments.emptyDescription")}
					renderCell={(p, key) => {
						if (key === "client") {
							return (
								<div>
									<p className="font-bold text-gray-900">{p.clientName}</p>
									<p className="text-sm text-gray-500">{p.email}</p>
									{p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
								</div>
							);
						}
						if (key === "description") return <p className="text-sm text-gray-700">{p.description}</p>;
						if (key === "period") {
							return (
								<div className="text-sm">
									<p className="text-gray-700">{p.periodFrom}</p>
									<p className="text-xs text-gray-500">
										{t("table.to")} {p.periodTo}
									</p>
								</div>
							);
						}
						if (key === "date") {
							return (
								<div className="text-sm">
									<p className="text-gray-700">{p.date}</p>
									<p className="text-xs text-gray-500">{p.time}</p>
								</div>
							);
						}
						if (key === "amount") {
							return (
								<div>
									<p className="text-lg font-black text-gray-900">{p.amount.toLocaleString()}</p>
									<p className="text-xs font-semibold text-gray-500">{t("currency")}</p>
								</div>
							);
						}
						if (key === "actions") {
							return (
								<div className="flex items-center justify-center gap-2">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button variant="ghost" size="icon" className="rounded-xl">
													<Eye className="w-4 h-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{t("table.view")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button variant="ghost" size="icon" className="rounded-xl text-rose-500">
													<Trash2 className="w-4 h-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{t("common.delete")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							);
						}
						return null;
					}}
				/>
			)}
		</motion.div>
	);
}

// ==========================================
// CLIENT PAYMENTS TAB (your code unchanged)
// ==========================================
function ClientPaymentsTab({ t }) {
	const [formData, setFormData] = useState({
		client: "",
		amount: "",
		description: "",
		periodFrom: null,
		periodTo: null,
	});

	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(null);
	const [error, setError] = useState(null);

	const validate = () => {
		const newErrors = {};
		if (!formData.client) newErrors.client = t("form.errors.clientRequired");
		if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t("form.errors.amountRequired");
		if (!formData.description) newErrors.description = t("form.errors.descriptionRequired");
		if ((formData.periodFrom && !formData.periodTo) || (!formData.periodFrom && formData.periodTo)) {
			newErrors.period = t("form.errors.periodRequired");
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setSubmitting(true);
		setError(null);
		setSuccess(null);

		try {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			setSuccess(t("form.success"));
			setFormData({ client: "", amount: "", description: "", periodFrom: null, periodTo: null });
			setTimeout(() => setSuccess(null), 5000);
		} catch (err) {
			setError(t("form.errors.submitFailed"));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<motion.div
			key="client-payments"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			className="max-w-4xl mx-auto"
		>
			<AnimatePresence>
				{error && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
						<Alert variant="destructive" className="mb-6 rounded-2xl border-2">
							<AlertCircle className="h-5 w-5" />
							<AlertDescription className="text-base font-medium">{error}</AlertDescription>
						</Alert>
					</motion.div>
				)}

				{success && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
						<Alert className="mb-6 rounded-2xl border-2 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-900 border-emerald-200">
							<CheckCircle className="h-5 w-5" />
							<AlertDescription className="text-base font-medium">{success}</AlertDescription>
						</Alert>
					</motion.div>
				)}
			</AnimatePresence>

			<Card className="rounded-3xl border-2 shadow-2xl overflow-hidden">
				<CardHeader className="pb-6 relative z-10">
					<div className="flex items-start gap-4">
						<div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
							<Plus className="w-8 h-8 text-white" />
						</div>
						<div>
							<CardTitle className="text-3xl font-black mb-2">{t("form.title")}</CardTitle>
							<CardDescription className="text-base">{t("form.description")}</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="relative z-10">
					<form onSubmit={handleSubmit} className="space-y-8">
						<div>
							<Label htmlFor="client" className="text-base font-bold mb-3 block">
								{t("form.client")} <span className="text-red-500">*</span>
							</Label>
							<Select value={formData.client} onValueChange={(v) => setFormData({ ...formData, client: v })}>
								<SelectTrigger id="client" className={`h-14 rounded-2xl border-2 text-base ${errors.client ? "border-red-500" : ""}`}>
									<SelectValue placeholder={t("form.selectClient")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="client1">Client 1 - John Doe</SelectItem>
									<SelectItem value="client2">Client 2 - Jane Smith</SelectItem>
									<SelectItem value="client3">Client 3 - Bob Johnson</SelectItem>
								</SelectContent>
							</Select>
							{errors.client && (
								<motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 mt-2 font-semibold flex items-center gap-1">
									<AlertCircle className="w-4 h-4" />
									{errors.client}
								</motion.p>
							)}
						</div>

						<div>
							<Label htmlFor="amount" className="text-base font-bold mb-3 block">
								{t("form.amount")} <span className="text-red-500">*</span>
							</Label>
							<div className="relative">
								<DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0"
									value={formData.amount}
									onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
									className={`h-14 pl-12 rounded-2xl border-2 text-base ${errors.amount ? "border-red-500" : ""}`}
									placeholder="0.00"
								/>
							</div>
							{errors.amount && (
								<motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 mt-2 font-semibold flex items-center gap-1">
									<AlertCircle className="w-4 h-4" />
									{errors.amount}
								</motion.p>
							)}
						</div>

						<div>
							<Label htmlFor="description" className="text-base font-bold mb-3 block">
								{t("form.description")} <span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="description"
								rows={5}
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								className={`rounded-2xl border-2 text-base resize-none ${errors.description ? "border-red-500" : ""}`}
								placeholder={t("form.descriptionPlaceholder")}
							/>
							{errors.description && (
								<motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 mt-2 font-semibold flex items-center gap-1">
									<AlertCircle className="w-4 h-4" />
									{errors.description}
								</motion.p>
							)}
						</div>

						<div>
							<Label className="text-base font-bold mb-3 block">
								{t("form.period")} ({t("form.optional")})
							</Label>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="periodFrom" className="text-sm font-semibold mb-2 block text-gray-600">
										{t("form.periodFrom")}
									</Label>
									<Flatpickr
										value={formData.periodFrom}
										onChange={([date]) => setFormData({ ...formData, periodFrom: date })}
										options={{ dateFormat: "Y-m-d", locale: "ar" }}
										className={`h-14 w-full rounded-2xl border-2 px-4 text-base ${errors.period ? "border-red-500" : ""}`}
										placeholder={t("filters.selectDate")}
									/>
								</div>
								<div>
									<Label htmlFor="periodTo" className="text-sm font-semibold mb-2 block text-gray-600">
										{t("form.periodTo")}
									</Label>
									<Flatpickr
										value={formData.periodTo}
										onChange={([date]) => setFormData({ ...formData, periodTo: date })}
										options={{ dateFormat: "Y-m-d", locale: "ar" }}
										className={`h-14 w-full rounded-2xl border-2 px-4 text-base ${errors.period ? "border-red-500" : ""}`}
										placeholder={t("filters.selectDate")}
									/>
								</div>
							</div>

							{errors.period && (
								<motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 mt-2 font-semibold flex items-center gap-1">
									<AlertCircle className="w-4 h-4" />
									{errors.period}
								</motion.p>
							)}
						</div>

						<Button
							type="submit"
							disabled={submitting}
							className="w-full h-16 rounded-2xl text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300"
						>
							{submitting ? (
								<>
									<RefreshCw className="mr-3 h-6 w-6 animate-spin" />
									{t("form.submitting")}
								</>
							) : (
								<>
									<CheckCircle className="mr-3 h-6 w-6" />
									{t("form.submit")}
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</motion.div>
	);
}
