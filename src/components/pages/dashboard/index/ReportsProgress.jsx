// app/(admin)/statistics/ReportsTab.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
	FileText, CalendarDays, CheckCircle2, User as UserIcon, Image as ImageIcon,
	Activity, HeartPulse, UtensilsCrossed, Bed, ThumbsUp, AlertTriangle, Eye, MessageSquare,
	ChevronLeft, ChevronRight, X, Info, Loader2
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/utils/axios";
import Img from "@/components/atoms/Img";

/* -------------------------------- utils -------------------------------- */
const cn = (...c) => c.filter(Boolean).join(" ");
const spring = { type: "spring", stiffness: 120, damping: 16, mass: 0.8 };

function formatDate(d) {
	if (!d) return "—";
	const dt = new Date(d);
	if (isNaN(dt)) return "—";
	return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function dedupeByWeekOf(records = []) {
	const map = new Map();
	for (const r of records) {
		const k = r.weekOf;
		const prev = map.get(k);
		if (!prev || new Date(r.created_at) > new Date(prev.created_at)) map.set(k, r);
	}
	return [...map.values()].sort((a, b) => new Date(b.weekOf) - new Date(a.weekOf));
}
const safe = (n) => (n == null || Number.isNaN(Number(n)) ? "—" : n);

function chip({ tone = "slate", children }) {
	const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs";
	const tones = {
		slate: "border-slate-200 bg-slate-50 text-slate-700",
		emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
		amber: "border-amber-200 bg-amber-50 text-amber-700",
		rose: "border-rose-200 bg-rose-50 text-rose-700",
		indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
		sky: "border-sky-200 bg-sky-50 text-sky-700",
	};
	return <span className={cn(base, tones[tone] || tones.slate)}>{children}</span>;
}

function Meter({ value = 0, max = 5, label }) {
	const pct = Math.max(0, Math.min(100, (value / max) * 100));
	return (
		<div className="w-full">
			<div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
				<span>{label}</span>
				<span className="tabular-nums">{value}/{max}</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-slate-100">
				<div className="h-full w-0 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}

const YesNo = ({ val, t }) => {
	const v = (val || "").toLowerCase();
	const ok = v === "yes";
	const bad = v === "no";
	return chip({
		tone: ok ? "emerald" : bad ? "rose" : "slate",
		children: (
			<span className="inline-flex items-center gap-1">
				{ok ? <ThumbsUp className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
				{ok ? t("common.yes") : t("common.no")}
			</span>
		),
	});
};

/* ------------------------------ primitives ----------------------------- */
function Card({ className, children }) {
	return (
		<motion.section
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={spring}
			className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}
		>
			{children}
		</motion.section>
	);
}
function CardHeader({ icon, title, subtitle, actions }) {
	const Icon = icon;
	return (
		<div className="flex items-start justify-between p-4 pb-2">
			<div>
				<div className="flex items-center gap-2">
					{Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
					<h3 className="text-sm font-semibold text-slate-900">{title}</h3>
				</div>
				{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
			</div>
			{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
		</div>
	);
}
function KPI({ icon: Icon, label, value, hint, tone = "indigo" }) {
	const ring = {
		indigo: "bg-indigo-50 ring-1 ring-indigo-100 text-indigo-600",
		emerald: "bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600",
		amber: "bg-amber-50 ring-1 ring-amber-100 text-amber-600",
		sky: "bg-sky-50 ring-1 ring-sky-100 text-sky-600",
	};
	return (
		<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
			<div className="flex items-center gap-2">
				<span className={cn("grid h-6 w-6 place-items-center rounded-lg", ring[tone])}>
					{Icon ? <Icon className="h-3.5 w-3.5" /> : null}
				</span>
				<div className="text-xs text-slate-500">{label}</div>
			</div>
			<div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
			{hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
		</div>
	);
}

/* -------------------------------- modal -------------------------------- */
function ReportModal({ open, report, onClose, onPrev, onNext, t }) {
	const escCb = useCallback(
		(e) => {
			if (e.key === "Escape") onClose?.();
			if (e.key === "ArrowLeft") onPrev?.();
			if (e.key === "ArrowRight") onNext?.();
		},
		[onClose, onPrev, onNext]
	);

	useEffect(() => {
		if (!open) return;
		window.addEventListener("keydown", escCb);
		return () => window.removeEventListener("keydown", escCb);
	}, [open, escCb]);

	const d = report?.diet || {};
	const tr = report?.training || {};
	const ms = report?.measurements || {};
	const ph = report?.photos || {};

	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					className="fixed inset-0 z-[100] grid place-items-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
					<motion.div
						className="relative mx-4 w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
						initial={{ y: 24, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 24, opacity: 0 }}
						transition={spring}
					>
						<div className="flex items-center justify-between border-b border-slate-200 p-4">
							<div className="flex items-center gap-2">
								<CalendarDays className="h-4 w-4 text-slate-500" />
								<div>
									<div className="text-sm font-semibold text-slate-900">
										{t("modal.title")} {formatDate(report?.weekOf)}
									</div>
									<div className="text-[11px] text-slate-500">
										{t("card.created")} {formatDate(report?.created_at)} · {t("card.updated")} {formatDate(report?.updated_at)}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<button onClick={onPrev} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50">
									<ChevronLeft className="h-4 w-4" />
								</button>
								<button onClick={onNext} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50">
									<ChevronRight className="h-4 w-4" />
								</button>
								<button onClick={onClose} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50">
									<X className="h-4 w-4" />
								</button>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
							{/* diet */}
							<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
								<div className="flex items-center gap-2 text-sm font-medium text-slate-900">
									<UtensilsCrossed className="h-4 w-4 text-slate-500" />
									{t("diet.title")}
								</div>
								<div className="mt-2 flex flex-wrap gap-1.5">
									<YesNo val={d.hungry} t={t} />
									<YesNo val={d.foodTooMuch} t={t} />
									<YesNo val={d.mentalComfort} t={t} />
									{d.dietDeviation?.hasDeviation
										? chip({
											tone: (d.dietDeviation.hasDeviation || "").toLowerCase() === "yes" ? "amber" : "emerald",
											children: (
												<>
													<AlertTriangle className="h-3.5 w-3.5" />
													{t("diet.deviation")} {d.dietDeviation.times != null ? `(${d.dietDeviation.times})` : ""}
												</>
											),
										})
										: null}
								</div>
								{d.wantSpecific ? <div className="mt-2 text-xs text-slate-600">{d.wantSpecific}</div> : null}
							</div>

							{/* training */}
							<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
								<div className="flex items-center gap-2 text-sm font-medium text-slate-900">
									<HeartPulse className="h-4 w-4 text-slate-500" />
									{t("training.title")}
								</div>
								<div className="mt-2 flex flex-wrap gap-1.5">
									<span className="inline-flex items-center gap-1 text-xs text-slate-600">
										<Bed className="h-3.5 w-3.5" /> {t("training.sleepEnough")}:
									</span>
									<YesNo val={tr.sleep?.enough} t={t} />
									<span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-600">
										<Activity className="h-3.5 w-3.5" /> {t("training.intensityOk")}:
									</span>
									<YesNo val={tr.intensityOk} t={t} />
									<span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-600">
										<UserIcon className="h-3.5 w-3.5" /> {t("training.shapeChange")}:
									</span>
									<YesNo val={tr.shapeChange} t={t} />
								</div>
								<div className="mt-3">
									<Meter value={tr.cardioAdherence ?? 0} max={5} label={t("training.cardio")} />
								</div>
								{tr.programNotes ? <div className="mt-2 text-xs text-slate-600">{tr.programNotes}</div> : null}
							</div>

							{/* measurements + photos */}
							<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
								<div className="flex items-center gap-2 text-sm font-medium text-slate-900">
									<MessageSquare className="h-4 w-4 text-slate-500" />
									{t("measurements.title")}
								</div>
								<div className="mt-2 grid grid-cols-3 gap-2 text-xs">
									<div>
										<div className="text-slate-500">{t("measurements.weight")}</div>
										<div className="font-medium text-slate-900">{safe(ms.weight)}</div>
									</div>
									<div>
										<div className="text-slate-500">{t("measurements.waist")}</div>
										<div className="font-medium text-slate-900">{safe(ms.waist)}</div>
									</div>
									<div>
										<div className="text-slate-500">{t("measurements.chest")}</div>
										<div className="font-medium text-slate-900">{safe(ms.chest)}</div>
									</div>
								</div>
								<div className="mt-3">
									<div className="mb-1 text-[11px] text-slate-500">{t("photos.title")}</div>
									<div className="grid grid-cols-4 gap-2">
										{["front", "left", "right", "back"].map((k) => {
											const url = ph?.[k]?.url;
											return (
												<div key={k} className="grid aspect-[4/5] place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
													{url ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img src={url} alt={`${k}`} className="h-full w-full object-cover" />
													) : (
														<div className="flex flex-col items-center text-[11px] text-slate-500">
															<ImageIcon className="mb-1 h-4 w-4" />
															{t("photos.placeholder", { side: t(`photos.${k}`) })}
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</div>

						{typeof report?.coachFeedback === "string" && report.coachFeedback.trim() !== "" ? (
							<div className="m-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-sm text-slate-800">
								<div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
									<Info className="h-3.5 w-3.5" /> {t("feedback.title")}
								</div>
								{report.coachFeedback}
							</div>
						) : null}
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}


export default function ReportsTab({ userId, active, pageSize = 4 }) {
	const t = useTranslations("reportsTab");
	const router = useRouter();
	const search = useSearchParams();

	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState(null);
	const [rawRecords, setRawRecords] = useState([]);
	const [page, setPage] = useState(1);

	// modal state
	const [open, setOpen] = useState(false);
	const [selectedId, setSelectedId] = useState(null);

	// fetch: ask for many (50), dedupe client-side, then paginate by 4
	useEffect(() => {
		let mounted = true;
		async function run() {
			if (active !== "reports" || !userId) return;
			setLoading(true);
			setErr(null);
			try {
				const { data } = await api.get(`/weekly-reports/users/${userId}/weekly-reports`, {
					params: { page: 1, limit: 50, sortBy: "created_at", sortOrder: "DESC" },
				});
				console.log(data);
				setRawRecords(Array.isArray(data?.records) ? data.records : []);
			} catch (e) {
				if (!mounted) return;
				setErr(e?.message || "Failed to load");
			} finally {
				if (mounted) setLoading(false);
			}
		}
		run();
		return () => {
			mounted = false;
		};
	}, [active, userId]);

	// dedupe + paging
	const deduped = rawRecords
	const total = deduped.length;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));

	// clamp page when data/pageSize changes (fixes "pagination doesn’t work")
	useEffect(() => {
		setPage((p) => Math.min(Math.max(1, p), pageCount));
	}, [pageCount]);

	const sliceFrom = (page - 1) * pageSize;
	const pageItems = deduped.slice(sliceFrom, sliceFrom + pageSize);

	// KPIs
	const unread = useMemo(() => deduped.filter((r) => !r.isRead).length, [deduped]);
	const withPhotos = useMemo(
		() => deduped.filter((r) => r.photos?.front || r.photos?.back || r.photos?.left || r.photos?.right).length,
		[deduped]
	);

	// deep link handling: ?reportId=...
	const initialized = useRef(false);
	useEffect(() => {
		if (initialized.current) return;
		const qId = search?.get("reportId");
		if (qId) {
			const found = deduped.find((r) => r.id === qId);
			if (found) {
				setSelectedId(found.id);
				setOpen(true);
				// auto navigate to the page that contains this report
				const idx = deduped.findIndex((r) => r.id === qId);
				if (idx >= 0) setPage(Math.floor(idx / pageSize) + 1);
			}
		}
		initialized.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, deduped]);

	// modal helpers
	const currentIndex = useMemo(() => deduped.findIndex((r) => r.id === selectedId), [deduped, selectedId]);
	const selected = currentIndex >= 0 ? deduped[currentIndex] : null;

	const openReport = useCallback(
		(id) => {
			setSelectedId(id);
			setOpen(true);
			// update URL
			const url = new URL(window.location.href);
			url.searchParams.set("reportId", id);
			router.replace(url.toString(), { scroll: false });
		},
		[router]
	);

	const closeReport = useCallback(() => {
		setOpen(false);
		const url = new URL(window.location.href);
		url.searchParams.delete("reportId");
		router.replace(url.toString(), { scroll: false });
	}, [router]);

	const goPrev = useCallback(() => {
		if (currentIndex <= 0) return;
		const prev = deduped[currentIndex - 1]?.id;
		if (prev) openReport(prev);
	}, [currentIndex, deduped, openReport]);

	const goNext = useCallback(() => {
		if (currentIndex < 0 || currentIndex >= deduped.length - 1) return;
		const next = deduped[currentIndex + 1]?.id;
		if (next) openReport(next);
	}, [currentIndex, deduped, openReport]);

	const setPageAndScrollTop = useCallback((p) => {
		setPage(p);
		if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	return (
		<div className="space-y-6">

			{/* KPIs */}
			<div className="">
				<Card>
					<CardHeader icon={Activity} title={t("kpi.title")} subtitle={t("kpi.subtitle")} />
					<div className="grid grid-cols-1 gap-4 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
						<KPI icon={FileText} label={t("kpi.total")} value={total} hint={t("kpi.pages", { n: pageCount })} tone="indigo" />
						<KPI icon={Eye} label={t("kpi.unread")} value={unread} hint={t("kpi.unreadHint")} tone="amber" />
						<KPI icon={ImageIcon} label={t("kpi.withPhotos")} value={withPhotos} hint={t("kpi.withPhotosHint")} tone="sky" />
						<KPI icon={CalendarDays} label={t("kpi.latestWeek")}  value={deduped[0]?.weekOf ? formatDate(deduped[0].weekOf) : "—"} tone="emerald" />
					</div>
				</Card>
			</div>

			<div className="">
				<Card>
					<CardHeader icon={FileText} title={t("list.title")} subtitle={t("list.subtitle")} />
					<div className="p-4 pt-2">
						{loading ? (
							<div className="flex items-center gap-2 text-sm text-slate-600">
								<Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
							</div>
						) : err ? (
							<div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
								<AlertTriangle className="h-4 w-4" /> {t("error")} — {String(err)}
							</div>
						) : !pageItems.length ? (
							<div className="text-sm text-slate-500">{t("empty")}</div>
						) : (
							<ul className="space-y-4">
								{pageItems.map((r) => {
									const d = r.diet || {};
									const tr = r.training || {};
									const ms = r.measurements || {};
									const ph = r.photos || {};
									const readTone = r.isRead ? "emerald" : "amber";
									return (
										<li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-sm">
											{/* header row */}
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<CalendarDays className="h-4 w-4 text-slate-500" />
														<h4 className="truncate text-sm font-semibold text-slate-900">
															{t("card.weekOf")} <div className="font-en">{formatDate(r.weekOf)}</div>
														</h4>
													</div>
													<p className="mt-0.5 text-xs text-slate-500">
														{t("card.created")} {formatDate(r.created_at)} · {t("card.updated")} {formatDate(r.updated_at)}
													</p>
												</div>
												<div className="flex items-center gap-2">
													{chip({
														tone: readTone,
														children: (
															<span className="inline-flex items-center gap-1">
																<Eye className="h-3.5 w-3.5" />
																{r.isRead ? t("card.read") : t("card.unread")}
															</span>
														),
													})}
													{r.reviewedAt
														? chip({
															tone: "indigo",
															children: (
																<span className="inline-flex items-center gap-1">
																	<CheckCircle2 className="h-3.5 w-3.5" />
																	{t("card.reviewedAt")} {formatDate(r.reviewedAt)}
																</span>
															),
														})
														: null}
													<button
														onClick={() => openReport(r.id)}
														className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
													>
														{t("actions.view")}
													</button>
												</div>
											</div>

											{/* compact preview grid */}
											<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
												{/* diet */}
												<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
													<div className="flex items-center gap-2 text-sm font-medium text-slate-900">
														<UtensilsCrossed className="h-4 w-4 text-slate-500" />
														{t("diet.title")}
													</div>
													<div className="mt-2 flex flex-wrap gap-1.5">
														<YesNo val={d.hungry} t={t} />
														<YesNo val={d.foodTooMuch} t={t} />
														<YesNo val={d.mentalComfort} t={t} />
													</div>
												</div>

												{/* training */}
												<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
													<div className="flex items-center gap-2 text-sm font-medium text-slate-900">
														<HeartPulse className="h-4 w-4 text-slate-500" />
														{t("training.title")}
													</div>
													<div className="mt-2 flex flex-wrap items-center gap-1.5">
														<span className="inline-flex items-center gap-1 text-xs text-slate-600">
															<Bed className="h-3.5 w-3.5" /> {t("training.sleepEnough")}:
														</span>
														<YesNo val={tr.sleep?.enough} t={t} />
														<span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-600">
															<Activity className="h-3.5 w-3.5" /> {t("training.intensityOk")}:
														</span>
														<YesNo val={tr.intensityOk} t={t} />
													</div>
													<div className="mt-3">
														<Meter value={tr.cardioAdherence ?? 0} max={5} label={t("training.cardio")} />
													</div>
												</div>

												{/* measurements + photo thumb */}
												<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
													<div className="flex items-center gap-2 text-sm font-medium text-slate-900">
														<MessageSquare className="h-4 w-4 text-slate-500" />
														{t("measurements.title")}
													</div>
													<div className="mt-2 grid grid-cols-3 gap-2 text-xs">
														<div>
															<div className="text-slate-500">{t("measurements.weight")}</div>
															<div className=" font-en font-medium text-slate-900">{safe(ms.weight)}</div>
														</div>
														<div>
															<div className="text-slate-500">{t("measurements.waist")}</div>
															<div className=" font-en font-medium text-slate-900">{safe(ms.waist)}</div>
														</div>
														<div>
															<div className="text-slate-500">{t("measurements.chest")}</div>
															<div className=" font-en font-medium text-slate-900">{safe(ms.chest)}</div>
														</div>
													</div>
													<div className="mt-3 grid grid-cols-4 gap-2">
														{["front", "left", "right", "back"].map((k) => {
															const url = ph?.[k]?.url;
															return (
																<div key={k} className="grid aspect-1/1 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
																	{url ? (
																		<Img src={url} alt={`${k}`} className="h-full w-full object-cover" />
																	) : (
																		<ImageIcon className="h-7 w-7 text-slate-400" />
																	)}
																</div>
															);
														})}
													</div>
												</div>
											</div>

											{/* coach feedback (one-liner preview) */}
											{typeof r.coachFeedback === "string" && r.coachFeedback.trim() !== "" ? (
												<div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs text-slate-800">
													<span className="font-medium text-slate-600">{t("feedback.title")}:</span>{" "}
													<span className="line-clamp-1">{r.coachFeedback}</span>
												</div>
											) : null}
										</li>
									);
								})}
							</ul>
						)}
					</div>

					{/* pagination */}
					<div className="flex items-center justify-between border-t border-slate-200 p-3">
						<div className="text-xs text-slate-500">
							{t("pager.showing", {
								from: total ? sliceFrom + 1 : 0,
								to: Math.min(sliceFrom + pageSize, total),
								total,
							})}
						</div>
						<div className="flex items-center gap-2">
							<button
								className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-40"
								disabled={page <= 1}
								onClick={() => setPageAndScrollTop(page - 1)}
							>
								{t("pager.prev")}
							</button>
							<div className="text-xs tabular-nums text-slate-600">{page}/{pageCount}</div>
							<button
								className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-40"
								disabled={page >= pageCount}
								onClick={() => setPageAndScrollTop(page + 1)}
							>
								{t("pager.next")}
							</button>
						</div>
					</div>
				</Card>
			</div>

			{/* DETAIL MODAL */}
			<ReportModal
				open={open}
				report={selected}
				onClose={closeReport}
				onPrev={goPrev}
				onNext={goNext}
				t={t}
			/>
		</div>
	);
}
