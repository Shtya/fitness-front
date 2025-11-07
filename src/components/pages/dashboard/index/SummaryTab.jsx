// app/(admin)/statistics/SummaryTab.jsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
	User as UserIcon,
	Shield,
	Activity,
	CalendarDays,
	Clock,
	TrendingUp,
	TrendingDown,
	Dumbbell,
	UtensilsCrossed,
	FileText,
	CheckCircle2,
	BarChart3,
	Scale,
	Ruler,
	LineChart,
	Sparkles,
} from "lucide-react";
import MultiLangText from "@/components/atoms/MultiLangText";

// ---------- utils ----------
const cn = (...c) => c.filter(Boolean).join(" ");
const spring = { type: "spring", stiffness: 120, damping: 16, mass: 0.8 };

export function daysBetween(a, b) {
	if (!a || !b) return null;
	const d1 = new Date(a);
	const d2 = new Date(b);
	return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}
export function formatDate(d) {
	if (!d) return "-";
	const dt = new Date(d);
	if (isNaN(dt)) return "-";
	return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
export function last(arr) {
	if (!Array.isArray(arr) || arr.length === 0) return null;
	return arr[arr.length - 1];
}
export function dedupeWeekly(weekly) {
	if (!Array.isArray(weekly)) return [];
	const map = {};
	for (const w of weekly) {
		const key = w.text || w.id;
		if (!map[key] || new Date(w.at) > new Date(map[key].at)) map[key] = w;
	}
	return Object.values(map).sort((a, b) => new Date(b.at) - new Date(a.at));
}
export function sortMeasurements(ms) {
	if (!Array.isArray(ms)) return [];
	return [...ms].sort((a, b) => new Date(a.date) - new Date(b.date));
}
export const num = (v) => {
	const n = parseFloat(v);
	return isNaN(n) ? null : n;
};

// spark helpers
export function computeScales(points, width, height, pad) {
	const xs = points.map((p) => new Date(p.x).getTime());
	const ys = points.map((p) => p.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const rw = width - pad * 2;
	const rh = height - pad * 2;
	const xScale = (t) => (maxX === minX ? pad + rw / 2 : pad + ((t - minX) / (maxX - minX)) * rw);
	const yScale = (v) => (maxY === minY ? pad + rh / 2 : pad + rh - ((v - minY) / (maxY - minY)) * rh);
	return { xScale, yScale, minY, maxY };
}
export function sparkline(points, width = 320, height = 120, pad = 10) {
	if (!points || points.length === 0) return { line: "", area: "", circles: [], minY: null, maxY: null };
	const { xScale, yScale, minY, maxY } = computeScales(points, width, height, pad);
	const path = points
		.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(new Date(p.x).getTime()).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
		.join(" ");
	// area path (close to bottom)
	const first = points[0];
	const lastP = points[points.length - 1];
	const area =
		`${path} L ${xScale(new Date(lastP.x).getTime()).toFixed(2)} ${yScale(minY).toFixed(2)} ` +
		`L ${xScale(new Date(first.x).getTime()).toFixed(2)} ${yScale(minY).toFixed(2)} Z`;

	const circles = points.map((p) => ({
		cx: xScale(new Date(p.x).getTime()),
		cy: yScale(p.y),
		v: p.y,
		date: p.x,
	}));
	return { line: path, area, circles, minY, maxY };
}

// ---------- primitives ----------
export function Card({ className, children }) {
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

export function SectionHeader({ icon, title, subtitle, right }) {
	const Icon = icon;
	return (
		<div className="flex items-start justify-between p-4 pb-2">
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					{Icon ? (
						<span className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500/15 to-indigo-600/10 grid place-items-center">
							<Icon className="h-4 w-4 text-indigo-600" />
						</span>
					) : null}
					<h3 className="text-sm font-semibold text-slate-900">{title}</h3>
				</div>
				{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
			</div>
			{right ? <div className="flex items-center gap-2">{right}</div> : null}
		</div>
	);
}

export function Badge({ tone = "slate", children }) {
	const map = {
		slate: "bg-slate-100 text-slate-700 border-slate-200",
		emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
		amber: "bg-amber-50 text-amber-700 border-amber-200",
		rose: "bg-rose-50 text-rose-700 border-rose-200",
		indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
		sky: "bg-sky-50 text-sky-700 border-sky-200",
		fuchsia: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
	};
	return (
		<span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", map[tone] || map.slate)}>
			{children}
		</span>
	);
}

function KPI({ label, value, delta, good, icon: Icon, tone = "indigo" }) {
	const DeltaIcon = delta == null ? null : good ? TrendingUp : TrendingDown;
	const toneGrad = {
		indigo: "from-indigo-500/10 to-indigo-500/0",
		emerald: "from-emerald-500/10 to-emerald-500/0",
		sky: "from-sky-500/10 to-sky-500/0",
		amber: "from-amber-500/10 to-amber-500/0",
		fuchsia: "from-fuchsia-500/10 to-fuchsia-500/0",
	}[tone];

	return (
		<motion.div
			whileHover={{ y: -2 }}
			transition={{ type: "spring", stiffness: 200, damping: 18, mass: 0.7 }}
			className="rounded-lg border border-slate-200 p-4 relative overflow-hidden"
		>
			<div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b", toneGrad)} />
			<div className="relative z-10">
				<div className="flex items-center justify-between">
					<div className="text-xs text-slate-500">{label}</div>
					{Icon ? (
						<span className="h-8 w-8 rounded-lg bg-white/70 ring-1 ring-slate-200 grid place-items-center">
							<Icon className={cn("h-4 w-4", tone === "emerald" ? "text-emerald-600" : tone === "sky" ? "text-sky-600" : tone === "amber" ? "text-amber-600" : tone === "fuchsia" ? "text-fuchsia-600" : "text-indigo-600")} />
						</span>
					) : null}
				</div>
				<div className="mt-1 flex items-end gap-2">
					<div className="text-xl font-semibold text-slate-900">{value ?? "-"}</div>
					{delta != null && (
						<span className={cn("text-xs font-medium", good ? "text-emerald-600" : "text-rose-600")}>
							<span className="inline-flex items-center gap-1">
								<DeltaIcon className="h-3 w-3" />
								{typeof delta === "number" && delta > 0 ? `+${delta}` : `${delta}`}
							</span>
						</span>
					)}
				</div>
			</div>
		</motion.div>
	);
}

// ---------- main ----------
export default function SummaryTab({ data }) {
	const t = useTranslations("client360.summary");

	const { identity, coach, measurements = [], workouts, mealPlans, weeklyReport = [] } = data || {};

	const sortedMs = useMemo(() => sortMeasurements(measurements), [measurements]);
	const latest = last(sortedMs);
	const prev = sortedMs.length > 1 ? sortedMs[sortedMs.length - 2] : null;

	const latestWeight = num(latest?.weight);
	const prevWeight = num(prev?.weight);
	const weightDelta = latestWeight != null && prevWeight != null ? +(latestWeight - prevWeight).toFixed(1) : null;

	const latestWaist = num(latest?.waist);
	const prevWaist = num(prev?.waist);
	const waistDelta = latestWaist != null && prevWaist != null ? +(latestWaist - prevWaist).toFixed(1) : null;

	const start = identity?.subscriptionStart;
	const end = identity?.subscriptionEnd;
	const today = new Date();
	const daysToEnd = end ? daysBetween(today, end) : null;
	const daysElapsed = start ? daysBetween(start, today) : null;

	const trendPoints = useMemo(
		() =>
			sortedMs
				.filter((m) => num(m.weight) != null)
				.map((m) => ({ x: m.date, y: num(m.weight) })),
		[sortedMs]
	);

	const { line, area, circles, minY, maxY } = sparkline(trendPoints);

	const dedupedWeekly = weeklyReport
	const totalCheckins = dedupedWeekly.length;

	const workoutDays = workouts?.days?.length || 0;
	const workoutName = workouts?.name || "-";
	const mealName = mealPlans?.name || "-";
	const mealDays = mealPlans?.days?.length || 0;

	const currentWeight = latestWeight ?? null;
	const minWeight = trendPoints.length ? Math.min(...trendPoints.map((p) => p.y)) : null;
	const maxWeight = trendPoints.length ? Math.max(...trendPoints.map((p) => p.y)) : null;

	// hover state for simple focus dot (UX nicety)
	const [hoverIdx, setHoverIdx] = useState(null);

	return (
		<div className="relative">


			{/* Content grid */}
			<div className="  space-y-6">
				{/* KPIs (colorful + icons) */}
				<Card>
					<SectionHeader icon={Activity} title={t("snapshot.title")} subtitle={t("snapshot.subtitle")} />
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 pt-2">
						<KPI
							label={t("snapshot.daysToExpiry")}
							value={daysToEnd != null ? `${daysToEnd}${t("units.dayShort")}` : t("common.hyphen")}
							delta={daysElapsed != null ? `${daysElapsed}${t("units.dayShort")}` : null}
							good={true}
							icon={BarChart3}
							tone="indigo"
						/>
						<KPI
							label={t("snapshot.latestWeight")}
							value={currentWeight != null ? `${currentWeight} ${t("units.kg")}` : t("common.hyphen")}
							delta={weightDelta != null ? weightDelta : null}
							good={weightDelta != null ? weightDelta < 0 : true}
							icon={Scale}
							tone="emerald"
						/>
						<KPI
							label={t("snapshot.latestWaist")}
							value={latestWaist != null ? `${latestWaist} ${t("units.cm")}` : t("common.hyphen")}
							delta={waistDelta != null ? waistDelta : null}
							good={waistDelta != null ? waistDelta < 0 : true}
							icon={Ruler}
							tone="sky"
						/>
						<KPI
							label={t("snapshot.totalCheckins")}
							value={totalCheckins}
							delta={null}
							good={true}
							icon={Sparkles}
							tone="amber"
						/>
					</div>
				</Card>

				{/* Trend + recent measurements */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="lg:col-span-2">
						<SectionHeader
							icon={LineChart}
							title={t("trend.title")}
							subtitle={t("trend.subtitle")}
							right={
								<div className="flex items-center gap-2">
									<Badge tone="indigo">{t("trend.legend.current")}: {currentWeight ?? t("common.hyphen")} {t("units.kg")}</Badge>
									<Badge tone="emerald">{t("trend.legend.min")}: {minWeight ?? t("common.hyphen")} {t("units.kg")}</Badge>
									<Badge tone="rose">{t("trend.legend.max")}: {maxWeight ?? t("common.hyphen")} {t("units.kg")}</Badge>
								</div>
							}
						/>
						<div className="p-4 pt-2">
							<div className=" grid grid-cols-[1fr_250px] max-sm:grid-cols-1 gap-2 rounded-lg border border-slate-200 p-4 bg-white">
								{/* Pretty grid background */}
								<div className="relative">
									<svg viewBox="0 0 360 160" className="w-full h-40">
										{/* grid lines */}
										{[0, 1, 2, 3, 4].map((i) => (
											<line key={i} x1="0" x2="360" y1={10 + i * 30} y2={10 + i * 30} stroke="#e5e7eb" strokeWidth="1" />
										))}
										{/* gradient defs */}
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
										{/* area */}
										<path d={area} fill="url(#wArea)" />
										{/* line */}
										<path d={line} fill="none" stroke="url(#wLine)" strokeWidth="2.5" strokeLinecap="round" />
										{/* circles */}
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
											{t("trend.axis.y")}
										</span>
										<span className="inline-flex items-center gap-1">
											<span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
											{t("trend.legend.latestPoint")}
										</span>
										<span className="inline-flex items-center gap-1">
											<span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
											{t("trend.legend.otherPoints")}
										</span>
									</div>
								</div>

								{/* last 6 rows */}
								<ul className="max-h-[190px] px-2 overflow-auto grid grid-cols-1 gap-2">
									{sortedMs.slice(-6).reverse().map((m) => (
										<li
											key={m.id}
											className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
										>
											<span className=" font-en text-slate-500">{formatDate(m.date)}</span>
											<span className="font-medium text-slate-900">
												{<span className="font-en" >{num(m.weight)}</span> ?? t("common.hyphen")} {t("units.kg")}
											</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					</Card>

					{/* Active plans */}
					<div className="space-y-6  ">
						<Card>
							<SectionHeader icon={Dumbbell} title={t("workout.title")} subtitle={t("workout.subtitle")} />
							<div className="p-4 pt-5">
								<div className="flex items-start justify-between">
									<div>
										<MultiLangText className="text-sm font-medium text-slate-900">{workoutName}</MultiLangText>
										<div className="text-xs text-slate-500">
											{workoutDays} {t("workout.daysShort")} · {workouts?.isActive ? t("common.active") : t("common.inactive")}
										</div>
									</div>
									<Badge tone="emerald">{workouts?.isActive ? t("common.active") : t("common.inactive")}</Badge>
								</div>
							</div>
						</Card>

						<Card>
							<SectionHeader icon={UtensilsCrossed} title={t("meal.title")} subtitle={t("meal.subtitle")} />
							<div className="p-4 pt-5">
								<MultiLangText className="text-sm font-medium text-slate-900">{mealName}</MultiLangText>
								<div className="text-xs text-slate-500">
									{mealDays} {t("meal.daysShort")} · {mealPlans?.isActive ? t("common.active") : t("common.inactive")}
								</div>
							</div>
						</Card>
					</div>
				</div>

				<Card>
					<SectionHeader icon={FileText} title={t("checkins.title")} subtitle={t("checkins.subtitle")} />
					<div className="p-4 pt-2">
						{dedupedWeekly.length === 0 ? (
							<p className="text-sm text-slate-600">{t("checkins.empty")}</p>
						) : (
							<ol className="relative border-s border-slate-200 ml-3">
								{dedupedWeekly.slice(0, 6).map((w) => (
									<li key={w.id} className=" rtl:pr-6 ltr:pl-6 py-3">
										<span className="absolute rtl:-right-1.5 ltr:-left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
										<div className="flex items-center justify-between">
											<div className="text-sm text-slate-800 font-en ">{w.text}</div>
											<div className="text-xs text-slate-500  font-en">{formatDate(w.at)}</div>
										</div>
									</li>
								))}
							</ol>
						)}
					</div>
				</Card>

				{/* Identity panel */}
				<Card>
					<SectionHeader icon={CheckCircle2} title={t("identity.title")} subtitle={t("identity.subtitle")} />
					<div className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="rounded-lg border border-slate-200 p-3 text-sm">
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<UserIcon className="h-4 w-4 text-indigo-600" />
								{t("identity.client")}
							</div>
							<MultiLangText className=" block mt-1 font-medium text-slate-900">{identity?.name}</MultiLangText>
							<MultiLangText className="text-xs block mt-[-2px]  text-slate-600">{identity?.email}</MultiLangText>
						</div>
						<div className="rounded-lg border border-slate-200 p-3 text-sm">
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<Shield className="h-4 w-4 text-emerald-600" />
								{t("identity.membership")}
							</div>
							<div className="mt-1 font-medium capitalize font-en ">{identity?.membership || t("common.hyphen")}</div>
						</div>
						<div className="rounded-lg border border-slate-200 p-3 text-sm">
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<CheckCircle2 className="h-4 w-4 text-sky-600" />
								{t("identity.gender")}
							</div>
							<div className="mt-1 font-medium capitalize  font-en ">{identity?.gender || t("common.hyphen")}</div>
						</div>
						<div className="rounded-lg border border-slate-200 p-3 text-sm">
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<Clock className="h-4 w-4 text-amber-600" />
								{t("identity.phone")}
							</div>
							<div className="mt-1 font-medium  font-en ">{identity?.phone || t("common.hyphen")}</div>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}
