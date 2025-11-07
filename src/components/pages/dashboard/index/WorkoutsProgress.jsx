// app/(admin)/statistics/WorkoutsProgressTab.jsx
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
	Flame, CalendarDays, Activity, TrendingUp, BarChart3, Clock, CheckCircle2
} from "lucide-react";

const cn = (...c) => c.filter(Boolean).join(" ");
const spring = { type: "spring", stiffness: 120, damping: 16, mass: 0.8 };

function formatDate(d) {
	if (!d) return "—";
	const dt = new Date(d);
	if (isNaN(dt)) return "—";
	return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function pct(n) {
	if (n == null || isNaN(n)) return 0;
	return Math.max(0, Math.min(100, Math.round(n)));
}
function maxBy(arr, key) {
	if (!Array.isArray(arr) || arr.length === 0) return 0;
	return arr.reduce((m, it) => Math.max(m, Number(it[key] || 0)), 0);
}
function sparklinePath(points, { w = 220, h = 56, pad = 6, xKey = "x", yKey = "y" } = {}) {
	if (!points || points.length === 0) return "";
	const xs = points.map((p) => new Date(p[xKey]).getTime());
	const ys = points.map((p) => Number(p[yKey] || 0));
	const minX = Math.min(...xs), maxX = Math.max(...xs);
	const minY = Math.min(...ys), maxY = Math.max(...ys);
	const rw = w - pad * 2, rh = h - pad * 2;
	const sx = (t) => (maxX === minX ? pad + rw / 2 : pad + ((t - minX) / (maxX - minX)) * rw);
	const sy = (v) => (maxY === minY ? pad + rh / 2 : pad + rh - ((v - minY) / (maxY - minY)) * rh);
	return points.map((p, i) => `${i ? "L" : "M"} ${sx(new Date(p[xKey]).getTime()).toFixed(2)} ${sy(Number(p[yKey] || 0)).toFixed(2)}`).join(" ");
}

// ---------- primitives ----------
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
	const toneMap = {
		indigo: "bg-indigo-50 ring-indigo-100 text-indigo-600",
		emerald: "bg-emerald-50 ring-emerald-100 text-emerald-600",
		rose: "bg-rose-50 ring-rose-100 text-rose-600",
		amber: "bg-amber-50 ring-amber-100 text-amber-600",
		sky: "bg-sky-50 ring-sky-100 text-sky-600",
	};
	return (
		<div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
			<div className="flex items-center gap-2">
				<span className={cn("h-6 w-6 grid place-items-center rounded-lg ring-1", toneMap[tone])}>
					{Icon ? <Icon className="h-3.5 w-3.5" /> : null}
				</span>
				<div className="text-xs text-slate-500">{label}</div>
			</div>
			<div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
			{hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
		</div>
	);
}

// ---------- main ----------
export default function WorkoutsProgress({ data }) {
	const t = useTranslations("workoutsProgress");
	if (!data) {
		return (
			<Card>
				<CardHeader icon={Activity} title={t("title")} subtitle={t("subtitle")} />
				<div className="p-4 text-sm text-slate-500">{t("loading")}</div>
			</Card>
		);
	}

	const { adherence = {}, volume = {}, sessions = {}, exercises = {}, prs = {}, e1rmTrends = {}, meta = {} } = data;

	const maxVol = useMemo(() => maxBy(sessions.last8 || [], "volume"), [sessions]);
	const maxSets = useMemo(() => maxBy(sessions.last8 || [], "setsTotal"), [sessions]);
	const e1rmSeries = useMemo(() => {
		// flatten { "Ex A": [{date,e1rm}]} into [{name, points, path}]
		return Object.entries(e1rmTrends || {}).map(([name, arr]) => {
			const pts = (arr || []).map((x) => ({ x: x.date, y: x.e1rm }));
			return { name, points: pts, path: sparklinePath(pts) };
		});
	}, [e1rmTrends]);

	return (
		<div className="space-y-6">


			{/* KPIs */}
			<div className="">
				<Card>
					<CardHeader
						icon={BarChart3}
						title={t("kpi.title")}
						subtitle={t("kpi.subtitle", { date: formatDate(meta.timestamp) })}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 pt-2">
						<KPI
							icon={Flame}
							label={t("kpi.adherence")}
							value={`${pct(adherence.pct)}%`}
							hint={t("kpi.daysTrained", { n: adherence.daysTrained || 0 })}
							tone="emerald"
						/>
						<KPI
							icon={TrendingUp}
							label={t("kpi.volumeTotal")}
							value={volume.total != null ? volume.total : "—"}
							hint={t("kpi.avgPerSession", { n: volume.avgPerSession || 0 })}
							tone="indigo"
						/>
						<KPI
							icon={CheckCircle2}
							label={t("kpi.sessions")}
							value={sessions.count || 0}
							hint={t("kpi.avgSetsPerSession", { n: sessions.avgSetsPerSession || 0 })}
							tone="sky"
						/>
						<KPI
							icon={CalendarDays}
							label={t("kpi.lastWorkout")}
							value={formatDate(adherence.lastWorkoutDate)}
							hint={t("kpi.streak", { n: adherence.currentStreakDays || 0 })}
							tone="amber"
						/>
					</div>
				</Card>
			</div>

			{/* Sessions last 8 – micro bars */}
			<div className="">
				<Card>
					<CardHeader icon={Clock} title={t("sessions.title")} subtitle={t("sessions.subtitle")} />
					<div className="p-4 pt-2">
						{Array.isArray(sessions.last8) && sessions.last8.length ? (
							<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
								{sessions.last8.map((s, idx) => {
									const vPct = maxVol ? Math.round((Number(s.volume || 0) / maxVol) * 100) : 0;
									const setsPct = maxSets ? Math.round((Number(s.setsTotal || 0) / maxSets) * 100) : 0;
									return (
										<li key={`${s.date}-${idx}`} className="rounded-lg border border-slate-200 bg-white/70 p-3">
											<div className="text-xs text-slate-500">{formatDate(s.date)}</div>
											<div className="mt-1 text-sm font-medium text-slate-900">
												{t("sessions.sets", { d: s.setsDone || 0, t: s.setsTotal || 0 })}
											</div>
											{/* volume bar */}
											<div className="mt-2">
												<div className="flex items-center justify-between text-xs text-slate-500">
													<span>{t("sessions.volume")}</span>
													<span className="tabular-nums">{s.volume || 0}</span>
												</div>
												<div className="mt-1 h-2.5 rounded-full bg-slate-100">
													<div
														className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
														style={{ width: `${vPct}%` }}
													/>
												</div>
											</div>
											{/* sets bar */}
											<div className="mt-2">
												<div className="flex items-center justify-between text-xs text-slate-500">
													<span>{t("sessions.setsShort")}</span>
													<span className="tabular-nums">{s.setsTotal || 0}</span>
												</div>
												<div className="mt-1 h-2.5 rounded-full bg-slate-100">
													<div
														className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
														style={{ width: `${setsPct}%` }}
													/>
												</div>
											</div>
											{/* top 2 exercises */}
											{Array.isArray(s.exercises) && s.exercises.length ? (
												<div className="mt-2">
													<div className="text-[11px] text-slate-500">{t("sessions.exercises")}</div>
													<div className="text-xs text-slate-700 line-clamp-2">
														{s.exercises.slice(0, 2).join(" · ")}
														{s.exercises.length > 2 ? ` +${s.exercises.length - 2}` : ""}
													</div>
												</div>
											) : null}
										</li>
									);
								})}
							</ul>
						) : (
							<p className="text-sm text-slate-500">{t("empty")}</p>
						)}
					</div>
				</Card>
			</div>

			{/* Top exercises */}
			<div className=" grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader icon={BarChart3} title={t("top.byAttempts")} />
					<div className="p-4 pt-2 space-y-2">
						{Array.isArray(exercises.topByAttempts) && exercises.topByAttempts.length ? (
							exercises.topByAttempts.map((e, i) => {
								const maxA = maxBy(exercises.topByAttempts, "attempts") || 1;
								const w = Math.round((Number(e.attempts || 0) / maxA) * 100);
								return (
									<div key={`${e.name}-${i}`}>
										<div className="flex items-center justify-between text-sm">
											<div className="truncate text-slate-800">{e.name}</div>
											<div className="ml-2 shrink-0 text-xs text-slate-500">{e.attempts}</div>
										</div>
										<div className="mt-1 h-2.5 rounded-full bg-slate-100">
											<div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${w}%` }} />
										</div>
									</div>
								);
							})
						) : (
							<p className="text-sm text-slate-500">{t("empty")}</p>
						)}
					</div>
				</Card>

				<Card>
					<CardHeader icon={TrendingUp} title={t("top.byVolume")} />
					<div className="p-4 pt-2 space-y-2">
						{Array.isArray(exercises.topByVolume) && exercises.topByVolume.length ? (
							exercises.topByVolume.map((e, i) => {
								const maxV = maxBy(exercises.topByVolume, "volume") || 1;
								const w = Math.round((Number(e.volume || 0) / maxV) * 100);
								return (
									<div key={`${e.name}-${i}`}>
										<div className="flex items-center justify-between text-sm">
											<div className="truncate text-slate-800">{e.name}</div>
											<div className="ml-2 shrink-0 text-xs text-slate-500">{e.volume}</div>
										</div>
										<div className="mt-1 h-2.5 rounded-full bg-slate-100">
											<div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${w}%` }} />
										</div>
									</div>
								);
							})
						) : (
							<p className="text-sm text-slate-500">{t("empty")}</p>
						)}
					</div>
				</Card>
			</div>

			{/* PRs */}
			<div className="">
				<Card>
					<CardHeader icon={CheckCircle2} title={t("prs.title")} subtitle={t("prs.subtitle", { n: prs.count || 0 })} />
					<div className="p-4 pt-2">
						{Array.isArray(prs.top) && prs.top.length ? (
							<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{prs.top.map((p, i) => (
									<li key={`${p.exercise}-${p.date}-${i}`} className="rounded-lg border border-slate-200 bg-white/70 p-3">
										<div className="text-sm font-medium text-slate-900 truncate">{p.exercise}</div>
										<div className="mt-0.5 text-xs text-slate-500">{formatDate(p.date)}</div>
										<div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
											<span className="rounded-md bg-slate-100 px-2 py-1">{t("prs.e1rm", { n: p.e1rm || 0 })}</span>
											<span className="rounded-md bg-slate-100 px-2 py-1">{t("prs.weight", { n: p.weight || 0 })}</span>
											<span className="rounded-md bg-slate-100 px-2 py-1">{t("prs.reps", { n: p.reps || 0 })}</span>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-slate-500">{t("empty")}</p>
						)}
					</div>
				</Card>
			</div>

			{/* e1RM trends sparklines */}
			<div className="mx-auto max-w-7xl px-4 md:px-6">
				<Card>
					<CardHeader icon={TrendingUp} title={t("e1rm.title")} subtitle={t("e1rm.subtitle", { d: meta.exerciseWindowDays || 90 })} />
					<div className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{e1rmSeries.length ? (
							e1rmSeries.map((s, i) => (
								<div key={`${s.name}-${i}`} className="rounded-lg border border-slate-200 p-3">
									<div className="text-sm font-medium text-slate-900 truncate">{s.name}</div>
									<svg viewBox="0 0 240 64" className="mt-2 w-full h-16">
										<path d={s.path} fill="none" stroke="currentColor" className="text-indigo-500" strokeWidth="2" />
									</svg>
								</div>
							))
						) : (
							<p className="text-sm text-slate-500">{t("empty")}</p>
						)}
					</div>
				</Card>
			</div>
		</div>
	);
}
