// app/(admin)/clients/[id]/ClientProfilePage.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "use-intl";

import DataTable from "@/components/dashboard/ui/DataTable";
import { TabsPill, EmptyState, spring, Badge } from "@/components/dashboard/ui/UI";
import {
	User, ClipboardList, LineChart, CalendarRange, NotebookPen, FileText,
	CalendarDays, Clock
} from "lucide-react";

import { Notification } from "@/config/Notification";
import api from "@/utils/axios";
import MultiLangText from "@/components/atoms/MultiLangText";
import SummaryTab, { formatDate, last, SectionHeader, sortMeasurements, sparkline } from "@/components/pages/dashboard/index/SummaryTab";
import { Card } from "@/app/[locale]/page";
import WorkoutsProgress from "@/components/pages/dashboard/index/WorkoutsProgress";
import NutritionProgress from "@/components/pages/dashboard/index/NutritionProgress";
import ReportsProgress from "@/components/pages/dashboard/index/ReportsProgress";

/* ==============================
 * Small shared UI
 * ============================== */
function Spinner({ className = "" }) {
	return (
		<div className={`flex items-center justify-center py-14 ${className}`}>
			<div className="inline-flex items-center gap-3 text-slate-500">
				<span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
				<span className="text-sm">Loading…</span>
			</div>
		</div>
	);
}

function SummarySkeleton() {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm">
				<div className="flex items-center justify-between gap-6">
					<div className="flex items-center gap-3 min-w-0">
						<div className="h-12 w-12 rounded-lg bg-slate-200 animate-pulse" />
						<div className="min-w-0 space-y-2">
							<div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
							<div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
						</div>
					</div>
					<div className="space-y-2">
						<div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
						<div className="h-3 w-56 rounded bg-slate-100 animate-pulse" />
					</div>
				</div>
				<div className="mt-4 h-9 w-full rounded-lg bg-slate-100 animate-pulse" />
			</div>
			<div className="grid gap-4">
				<div className="h-40 rounded-lg border border-slate-200 bg-white animate-pulse" />
				<div className="h-40 rounded-lg border border-slate-200 bg-white animate-pulse" />
			</div>
		</div>
	);
}

function CardGlass({ children, className = "" }) {
	return (
		<div className={`rounded-lg border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm ${className}`}>
			{children}
		</div>
	);
}

function SectionTitle({ children, icon: Icon }) {
	return (
		<div className="flex items-center gap-2 text-slate-800 font-semibold">
			{Icon ? <Icon size={18} className="text-slate-500" /> : null}
			<span>{children}</span>
		</div>
	);
}

/* ==============================
 * Data utils
 * ============================== */
const qp = (obj = {}) =>
	Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

async function apiGetUserSummary(userId, signal) {
	const { data } = await api.get(`/about-user/${userId}/summary`, { signal });
	return data;
}
async function apiListMeasurements(userId, { from, to, page = 1, limit = 200 } = {}, signal) {
	const { data } = await api.get(`/about-user/${userId}/measurements`, { params: qp({ from, to, page, limit }), signal });
	const records = Array.isArray(data?.measurements) ? data.measurements : (Array.isArray(data) ? data : []);
	return { records, total_records: records.length };
}
async function apiGetNutritionTargets(userId, signal) {
	const { data } = await api.get(`/about-user/${userId}/targets`, { signal });
	return data?.target ?? null;
}
async function apiGetWeightMetrics(userId, days = 30, signal) {
	const { data } = await api.get(`/about-user/${userId}/metrics/weights`, { params: { days }, signal });
	return data?.points ?? [];
}

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "");
const TABS = (t) => ([
	{ key: "overview", label: t("tabs.overview"), icon: User },
	{ key: "measurements", label: t("tabs.measurements"), icon: ClipboardList },
	{ key: "progress", label: t("tabs.progress"), icon: LineChart },
	{ key: "workouts", label: t("tabs.workouts"), icon: CalendarRange },
	{ key: "nutrition", label: t("tabs.nutrition"), icon: NotebookPen },
	{ key: "reports", label: t("tabs.reports"), icon: FileText },
]);
const TAB_QUERY_KEY = "tab";
const tabStorageKey = (id) => `client360.activeTab:${id}`;

function num(v) { const n = +v; return Number.isFinite(n) ? n : undefined; }

/* ==============================
 * Page
 * ============================== */
export default function ClientProfilePage() {
	const t = useTranslations("client360");
	const { id } = useParams();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// header elevation + full-bleed when scrolling
	const { scrollY } = useScroll();
	const [elevated, setElevated] = useState(false);
	useMotionValueEvent(scrollY, "change", (y) => setElevated(y > 4));

	// summary
	const [summaryLoading, setSummaryLoading] = useState(true);
	const [client, setClient] = useState(null);

	const tabs = TABS(t);
	const validTabKeys = useMemo(() => new Set(tabs.map((x) => x.key)), [tabs]);

	// ---- Active tab with URL + localStorage persistence ----
	const getInitialTab = useCallback(() => {
		const qTab = searchParams?.get(TAB_QUERY_KEY);
		if (qTab && validTabKeys.has(qTab)) return qTab;
		if (typeof window !== "undefined" && id) {
			const saved = localStorage.getItem(tabStorageKey(id));
			if (saved && validTabKeys.has(saved)) return saved;
		}
		return "overview";
	}, [searchParams, id, validTabKeys]);

	const [active, setActive] = useState(getInitialTab);

	useEffect(() => {
		const qTab = searchParams?.get(TAB_QUERY_KEY);
		if (qTab && validTabKeys.has(qTab) && qTab !== active) setActive(qTab);
	}, [searchParams, validTabKeys, active]);

	const handleTabChange = useCallback((nextKey) => {
		if (!validTabKeys.has(nextKey)) return;
		setActive(nextKey);
		const sp = new URLSearchParams(searchParams?.toString() || "");
		sp.set(TAB_QUERY_KEY, nextKey);
		router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
		if (typeof window !== "undefined" && id) {
			localStorage.setItem(tabStorageKey(id), nextKey);
		}
	}, [id, pathname, router, searchParams, validTabKeys]);

	// dates
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	// per-tab data + loading
	const [measurements, setMeasurements] = useState([]);
	const [measurementsLoading, setMeasurementsLoading] = useState(false);

	const [targets, setTargets] = useState(null);
	const [nutritionLoading, setNutritionLoading] = useState(false);

	const [weightSeries, setWeightSeries] = useState([]);
	const [progressLoading, setProgressLoading] = useState(false);

	const [exProgress, setExProgress] = useState();
	const [workoutsLoading, setWorkoutsLoading] = useState(false);

	// a generic "tab spinning" state to show immediate spinner while data requests start
	const [tabLoading, setTabLoading] = useState(false);

	// AbortControllers to avoid stale updates if user switches tabs fast
	const abortRef = useRef({});

	const cancelKey = (key) => {
		const ctrl = abortRef.current[key];
		if (ctrl) ctrl.abort();
	};
	const newController = (key) => {
		cancelKey(key);
		const ctrl = new AbortController();
		abortRef.current[key] = ctrl;
		return ctrl;
	};

	const loadSummary = useCallback(async () => {
		if (!id) return;
		const ctrl = newController("summary");
		setSummaryLoading(true);
		try {
			const summary = await apiGetUserSummary(id, ctrl.signal);
			setClient(summary || null);
		} catch (e) {
			if (e.name !== "CanceledError" && e.name !== "AbortError") {
				setClient(null);
				Notification(e?.response?.data?.message || "Failed to load user summary", "error");
			}
		} finally {
			setSummaryLoading(false);
		}
	}, [id]);

	useEffect(() => {
		if (!id) return;
		loadSummary();
		return () => cancelKey("summary");
	}, [id, loadSummary]);

	const kickTabSpinner = useCallback(() => {
		// show spinner instantly; it will stop when the specific tab's fetchers resolve
		setTabLoading(true);
	}, []);

	/* ---------- MEASUREMENTS ---------- */
	const loadMeasurements = useCallback(async () => {
		if (!id) return;
		const ctrl = newController("measurements");
		setMeasurementsLoading(true);
		try {
			const { records } = await apiListMeasurements(id, { page: 1, limit: 200 }, ctrl.signal);
			setMeasurements(records || []);
		} catch (e) {
			if (e.name !== "CanceledError" && e.name !== "AbortError") {
				setMeasurements([]);
				Notification(e?.response?.data?.message || "Failed to load measurements", "error");
			}
		} finally {
			setMeasurementsLoading(false);
			setTabLoading(false);
		}
	}, [id]);

	useEffect(() => {
		if (active === "measurements") {
			kickTabSpinner();
			loadMeasurements();
			return () => cancelKey("measurements");
		}
	}, [active, kickTabSpinner, loadMeasurements]);

	/* ---------- PROGRESS (weights) ---------- */
	const loadWeightMetrics = useCallback(async () => {
		if (!id) return;
		const ctrl = newController("progress");
		setProgressLoading(true);
		try {
			const points = await apiGetWeightMetrics(id, 30, ctrl.signal);
			setWeightSeries(points || []);
		} catch (e) {
			if (e.name !== "CanceledError" && e.name !== "AbortError") setWeightSeries([]);
		} finally {
			setProgressLoading(false);
			setTabLoading(false);
		}
	}, [id]);

	useEffect(() => {
		if (active === "progress") {
			kickTabSpinner();
			loadWeightMetrics();
			return () => cancelKey("progress");
		}
	}, [active, kickTabSpinner, loadWeightMetrics]);

	/* ---------- NUTRITION TARGETS + LOGS ---------- */
	const loadTargets = useCallback(async () => {
		if (!id) return;
		const ctrl = newController("nutrition-targets");
		setNutritionLoading(true);
		try {
			const tgs = await apiGetNutritionTargets(id, ctrl.signal);
			setTargets(tgs);
		} catch (e) {
			if (e.name !== "CanceledError" && e.name !== "AbortError") setTargets(null);
		} finally {
			setNutritionLoading(false);
			// do not stop tabLoading here: meal-logs request also contributes
		}
	}, [id]);

	useEffect(() => {
		if (active === "nutrition") {
			kickTabSpinner();
			loadTargets();
			const ctrl = newController("nutrition-logs");
			api.get(`/nutrition/my/meal-logs?userId=${id}&days=30`, { signal: ctrl.signal })
				.then(res => setNutritionProgress(res.data))
				.catch((e) => {
					if (e.name !== "CanceledError" && e.name !== "AbortError") setNutritionProgress(undefined);
				})
				.finally(() => {
					setTabLoading(false);
				});
			return () => {
				cancelKey("nutrition-targets");
				cancelKey("nutrition-logs");
			};
		}
	}, [active, kickTabSpinner, loadTargets, id]);

	/* ---------- WORKOUTS ---------- */
	useEffect(() => {
		if (active === "workouts") {
			kickTabSpinner();
			setWorkoutsLoading(true);
			const ctrl = newController("workouts");
			api.get(`/prs/stats/progress?userId=${id}&windowDays=30&exerciseWindowDays=90`, { signal: ctrl.signal })
				.then(res => setExProgress(res.data))
				.catch((e) => {
					if (e.name !== "CanceledError" && e.name !== "AbortError") setExProgress(undefined);
				})
				.finally(() => {
					setWorkoutsLoading(false);
					setTabLoading(false);
				});
			return () => cancelKey("workouts");
		}
	}, [active, kickTabSpinner, id]);



	/* ---------- DERIVED ---------- */
	const filteredMeasurements = useMemo(() => {
		let list = (measurements || []).slice();
		if (from) list = list.filter((r) => r.date >= from);
		if (to) list = list.filter((r) => r.date <= to);
		return list.sort((a, b) => a.date.localeCompare(b.date));
	}, [measurements, from, to]);

	const measColumns = [
		{ header: t("measurements.date"), accessor: "date", sortable: true, cell: (r) => fmt(r.date) },
		{ header: t("measurements.weight"), accessor: "weight", sortable: true },
		{ header: t("measurements.waist"), accessor: "waist", sortable: true },
		{ header: t("measurements.chest"), accessor: "chest", sortable: true },
	];

	const [hoverIdx, setHoverIdx] = useState(null);
	const sortedMs = useMemo(() => sortMeasurements(weightSeries), [weightSeries]);
	const latest = last(sortedMs);
	const latestWeight = num(latest?.weight);
	const trendPoints = useMemo(
		() =>
			sortedMs
				.filter((m) => num(m.weight) != null)
				.map((m) => ({ x: m.date, y: num(m.weight) })),
		[sortedMs]
	);
	const { line, area, circles } = sparkline(trendPoints);
	const currentWeight = latestWeight ?? null;
	const minWeight = trendPoints.length ? Math.min(...trendPoints.map((p) => p.y)) : null;
	const maxWeight = trendPoints.length ? Math.max(...trendPoints.map((p) => p.y)) : null;

	if (!summaryLoading && !client) {
		return <EmptyState title={t("empty.clientNotFound.title")} subtitle={t("empty.clientNotFound.subtitle")} />;
	}

	return (
		<div className="space-y-6">
			{/* FULL-BLEED sticky header
          -mx/[px]-calc trick makes the container stretch to viewport width while preserving inner padding */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={spring}
				className={[
					"sticky top-[-15px] duration-500 inset-x-0 z-30",
					"py-3 border border-slate-200",
					"backdrop-blur rounded-lg supports-[backdrop-filter]:bg-white/70 bg-white/90",
					elevated ? "shadow-[0_6px_20px_-12px_rgba(15,23,42,0.25)]" : "shadow-none",
				].join(" ")}
			>
				<div className="px-4">
					{/* header content (skeleton while summary loads) */}
					{summaryLoading ? (
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 min-w-0">
								<div className="h-12 w-12 rounded-lg bg-slate-200 animate-pulse" />
								<div className="min-w-0 space-y-2">
									<div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
									<div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
								</div>
							</div>
							<div className="space-y-2">
								<div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
								<div className="h-3 w-56 rounded bg-slate-100 animate-pulse" />
							</div>
						</div>
					) : (
						<div className="mb-[16px] flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 min-w-0">
								<motion.div
									initial={{ rotate: -8, scale: 0.9 }}
									animate={{ rotate: 0, scale: 1 }}
									className="h-12 w-12 grid place-content-center rounded-lg bg-main text-white shadow-md shrink-0"
									aria-hidden="true"
								>
									<User className="w-5 h-5" />
								</motion.div>

								<div className="min-w-0">
									<MultiLangText className="text-2xl font-semibold leading-tight truncate">
										{client?.identity?.name}
									</MultiLangText>
									<p className="mt-[-8px] text-lg text-slate-600">
										<span className="font-[600] text-sm ">{client?.identity?.email}</span>
									</p>
								</div>
							</div>
							<div>
								<p className="mt-[-8px] text-lg text-slate-600">
									<span className="text-xs">{t("summary.header.coach")} : </span>
									<span className="font-[600] text-sm font-en ">{client?.coach?.name}</span>
								</p>
								<p className="mt-[-8px] text-lg text-slate-600">
									<span className="text-xs">{t("summary.header.phone")} : </span>
									<span className="font-[600] text-sm font-en ">{client?.identity?.phone}</span>
								</p>

								<div className="flex flex-col flex-wrap items-center gap-2">
									<Badge tone="indigo">
										<CalendarDays className="h-3.5 w-3.5" />
										{formatDate(client?.identity?.subscriptionStart)} {t("summary.header.arrow")} {formatDate(client?.identity?.subscriptionEnd)}
									</Badge>
									<Badge tone="slate">
										<Clock className="h-3.5 w-3.5" />
										{t("summary.header.lastLogin")} {formatDate(client?.identity?.lastLogin)}
									</Badge>
								</div>
							</div>
						</div>
					)}

					{/* tabs row */}
					<TabsPill
						sliceInPhone={false}
						tabs={tabs}
						active={active}
						onChange={(k) => {
							// trigger spinner instantly on switch
							kickTabSpinner();
							handleTabChange(k);
						}}
						id="client-360-tabs"
					/>
				</div>
			</motion.div>

			{/* CONTENT AREA */}
			<div className="">
				{summaryLoading ? (
					<SummarySkeleton />
				) : (

					<AnimatePresence mode="wait">
						{/* Keyed by active to ensure exit/enter are respected */}
						<motion.div
							key={active}
							initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
							animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
							exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
							transition={spring}
						>
							{active === "overview" && <SummaryTab data={client} />}

							{active === "measurements" && (
								measurementsLoading ? (
									<Spinner />
								) : (
									<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-4">
										<CardGlass className="p-0 overflow-hidden">
											<div className="py-3 flex items-center justify-between">
												<SectionTitle>{t("measurements.title")}</SectionTitle>
											</div>

											<div className="pb-4">
												<DataTable
													columns={measColumns}
													data={filteredMeasurements}
													loading={false}
													itemsPerPage={10}
													pagination
												/>
												{!filteredMeasurements.length && (
													<div className="mt-6">
														<EmptyState title={t("measurements.empty.title")} subtitle={t("measurements.empty.subtitle")} />
													</div>
												)}
											</div>
										</CardGlass>
									</motion.div>
								)
							)}

							{active === "progress" && (
								progressLoading ? (
									<Spinner />
								) : (
									<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
										<Card className="lg:col-span-2">
											<SectionHeader
												icon={LineChart}
												title={t("summary.trend.title")}
												subtitle={t("summary.trend.subtitle")}
												right={
													<div className="flex items-center gap-2">
														<Badge tone="indigo">{t("summary.trend.legend.current")}: {currentWeight ?? t("summary.common.hyphen")} {t("summary.units.kg")}</Badge>
														<Badge tone="emerald">{t("summary.trend.legend.min")}: {minWeight ?? t("summary.common.hyphen")} {t("summary.units.kg")}</Badge>
														<Badge tone="rose">{t("summary.trend.legend.max")}: {maxWeight ?? t("summary.common.hyphen")} {t("summary.units.kg")}</Badge>
													</div>
												}
											/>
											<div className="p-4 pt-2">
												<div className=" grid grid-cols-[1fr_300px] max-sm:grid-cols-1 gap-2 rounded-lg border border-slate-200 p-4 bg-white">
													<div className="relative">
														<svg viewBox="0 0 360 160" className="w-full max-h-[300px]">
															{[0, 1, 2, 3, 4].map((i) => (
																<line key={i} x1="0" x2="360" y1={10 + i * 30} y2={10 + i * 30} stroke="#e5e7eb" strokeWidth="1" />
															))}
															<defs>
																<linearGradient id="wLine" x1="0" x2="1" y1="0" y2="0">
																	<stop offset="0%" stopColor="#4f46e5" />
																	<stop offset="100%" stopColor="#06b6d4" />
																</linearGradient>
																<linearGradient id="wArea" x1="0" x2="0" y1="0" y2="1">
																	<stop offset="0%" stopColor="#4f46e5" stopOpacity="0.20" />
																	<stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
																</linearGradient>
															</defs>
															<path d={area} fill="url(#wArea)" />
															<path d={line} fill="none" stroke="url(#wLine)" strokeWidth="2.5" strokeLinecap="round" />
															{circles.map((c, idx) => (
																<g key={idx}>
																	<circle
																		cx={c.cx}
																		cy={c.cy}
																		r={hoverIdx === idx || idx === circles.length - 1 ? 3.8 : 2.2}
																		fill={idx === circles.length - 1 ? "#4f46e5" : "#0ea5e9"}
																		onMouseEnter={() => setHoverIdx(idx)}
																		onMouseLeave={() => setHoverIdx(null)}
																	/>
																</g>
															))}
														</svg>
														{/* mini legend row */}
														<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
															<span className="inline-flex items-center gap-1">
																<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#4f46e5,#06b6d4)" }} />
																{t("summary.trend.axis.y")}
															</span>
															<span className="inline-flex items-center gap-1">
																<span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
																{t("summary.trend.legend.latestPoint")}
															</span>
															<span className="inline-flex items-center gap-1">
																<span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
																{t("summary.trend.legend.otherPoints")}
															</span>
														</div>
													</div>

													{/* last rows */}
													<ul className="max-h-[300px] px-2 overflow-auto grid grid-cols-1 gap-2">
														{sortedMs.slice().reverse().map((m) => (
															<li
																key={m.id}
																className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
															>
																<span className=" font-en text-slate-500">{formatDate(m.date)}</span>
																<span className="font-medium text-slate-900">
																	{<span className="font-en">{num(m.weight)}</span> ?? t("summary.common.hyphen")} {t("summary.units.kg")}
																</span>
															</li>
														))}
													</ul>
												</div>
											</div>
										</Card>
									</motion.div>
								)
							)}

							{active === "workouts" && (workoutsLoading ? <Spinner /> : <WorkoutsProgress data={exProgress} />)}

							{active === "nutrition" && (nutritionLoading ? <Spinner /> : <NutritionProgress data={{ targets, logs: undefined }} />)}

							{active === "reports" && (<ReportsProgress active={active} userId={id} />)}
						</motion.div>
					</AnimatePresence>
				)}
			</div>

			<style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .chip { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50; }
      `}</style>
		</div>
	);
}
