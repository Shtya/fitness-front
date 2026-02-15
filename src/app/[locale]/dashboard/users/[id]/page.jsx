// app/(admin)/clients/[id]/ClientProfilePage.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "use-intl";
import { useTheme } from "@/app/[locale]/theme";
import DataTable from "@/components/dashboard/ui/DataTable";
import { TabsPill, EmptyState, spring } from "@/components/dashboard/ui/UI";
import {
	User,
	ClipboardList,
	LineChart,
	CalendarRange,
	NotebookPen,
	FileText,
	CalendarDays,
	Clock,
	TrendingUp,
	TrendingDown,
	Dumbbell,
	UtensilsCrossed,
	Scale,
	Activity,
	Shield,
	Flame,
	BarChart3,
	CheckCircle2,
	Sparkles,
	ImageIcon,
	MessageSquare,
	ChevronLeft,
	ChevronRight,
	X,
	Eye,
} from "lucide-react";
import { Notification } from "@/config/Notification";
import api from "@/utils/axios";
import Img from "@/components/atoms/Img";

/* ============================== * Small shared UI * ============================== */
function Spinner({ className = "" }) {
	return (
		<div className={`flex items-center justify-center ${className}`}>
			<div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--color-primary-500)]" />
			<span className="ml-2 text-sm text-slate-600">Loading…</span>
		</div>
	);
}

function SummarySkeleton() {
	return (
		<div className="space-y-4 p-6">
			{[1, 2, 3].map((i) => (
				<div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
			))}
		</div>
	);
}

function CardGlass({ children, className = "" }) {
	return (
		<div className={`rounded-lg border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm ${className}`}>
			{children}
		</div>
	);
}

function SectionTitle({ children, icon: Icon }) {
	return (
		<h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
			{Icon && <Icon className="h-5 w-5 text-[var(--color-primary-600)]" />}
			{children}
		</h3>
	);
}

/* ============================== * Data utils * ============================== */
const qp = (obj = {}) =>
	Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

async function apiGetUserSummary(userId, signal) {
	const { data } = await api.get(`/about-user/${userId}/summary`, { signal });
	return data;
}

async function apiListMeasurements(userId, { from, to, page = 1, limit = 200 } = {}, signal) {
	const { data } = await api.get(`/about-user/${userId}/measurements`, {
		params: qp({ from, to, page, limit }),
		signal,
	});
	const records = Array.isArray(data?.measurements) ? data.measurements : Array.isArray(data) ? data : [];
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

const TABS = (t) => [
	{ key: "overview", label: t("tabs.overview"), icon: User },
	{ key: "measurements", label: t("tabs.measurements"), icon: ClipboardList },
	{ key: "progress", label: t("tabs.progress"), icon: LineChart },
	{ key: "workouts", label: t("tabs.workouts"), icon: CalendarRange },
	{ key: "nutrition", label: t("tabs.nutrition"), icon: NotebookPen },
	{ key: "reports", label: t("tabs.reports"), icon: FileText },
];

const TAB_QUERY_KEY = "tab";
const tabStorageKey = (id) => `client360.activeTab:${id}`;

function num(v) {
	const n = +v;
	return Number.isFinite(n) ? n : undefined;
}

/* ============================== * Utility Functions * ============================== */
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

const toDayKey = (d) => new Date(d).toISOString().slice(0, 10);
const safeNum = (n, f = 0) => (n == null || isNaN(n) ? 0 : +Number(n).toFixed(f));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const safe = (n) => (n == null || Number.isNaN(Number(n)) ? "—" : n);

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
	const minX = Math.min(...xs),
		maxX = Math.max(...xs);
	const minY = Math.min(...ys),
		maxY = Math.max(...ys);
	const rw = w - pad * 2,
		rh = h - pad * 2;
	const sx = (t) => (maxX === minX ? pad + rw / 2 : pad + ((t - minX) / (maxX - minX)) * rw);
	const sy = (v) => (maxY === minY ? pad + rh / 2 : pad + rh - ((v - minY) / (maxY - minY)) * rh);
	return points
		.map((p, i) => `${i ? "L" : "M"} ${sx(new Date(p[xKey]).getTime()).toFixed(2)} ${sy(Number(p[yKey] || 0)).toFixed(2)}`)
		.join(" ");
}

function groupByDay(logs = []) {
	const map = {};
	for (const m of logs) {
		const key = toDayKey(m.eatenAt ?? m.created_at ?? m.updated_at);
		if (!map[key]) map[key] = [];
		map[key].push(m);
	}
	return Object.entries(map)
		.sort(([a], [b]) => new Date(b) - new Date(a))
		.map(([day, list]) => ({ day, list: list.sort((a, b) => a.mealIndex - b.mealIndex) }));
}

function topFoods(logs = [], limit = 8) {
	const counts = new Map();
	for (const m of logs) {
		(m.items || []).forEach((it) => {
			const k = (it.name || "").trim();
			if (!k) return;
			counts.set(k, (counts.get(k) || 0) + 1);
		});
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([name, c]) => ({ name, count: c }));
}

function buildAdherenceSeries(logs = [], days = 14) {
	const today = new Date();
	const series = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(today.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		const dayMeals = logs.filter((m) => toDayKey(m.eatenAt || m.created_at) === key);
		const val = dayMeals.length ? avg(dayMeals.map((m) => safeNum(m.adherence))) : 0;
		series.push({ x: key, y: +val.toFixed(2), count: dayMeals.length });
	}
	return series;
}

function sparkPath(points, { w = 240, h = 56, pad = 6 } = {}) {
	if (!points.length) return "";
	const xs = points.map((p) => new Date(p.x).getTime());
	const ys = points.map((p) => p.y);
	const minX = Math.min(...xs),
		maxX = Math.max(...xs);
	const minY = Math.min(...ys),
		maxY = Math.max(...ys);
	const rw = w - pad * 2,
		rh = h - pad * 2;
	const sx = (t) => (maxX === minX ? pad + rw / 2 : pad + ((t - minX) / (maxX - minX)) * rw);
	const sy = (v) => (maxY === minY ? pad + rh / 2 : pad + rh - ((v - minY) / (maxY - minY)) * rh);
	return points.map((p, i) => `${i ? "L" : "M"} ${sx(new Date(p.x).getTime()).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(" ");
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

/* ============================== * Shared Components * ============================== */
export function Card({ className, children , onClick }) {
	return <div onClick={()=> onClick?.()}  className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className || ""}`}>{children}</div>;
}

export function SectionHeader({ icon, title, subtitle, right }) {
	const Icon = icon;
	return (
		<div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div className="flex items-center gap-3">
				{Icon && (
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-sm">
						<Icon className="h-5 w-5" />
					</div>
				)}
				<div>
					<h2 className="text-xl font-semibold text-slate-900">{title}</h2>
					{subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
				</div>
			</div>
			{right && <div className="flex items-center gap-2">{right}</div>}
		</div>
	);
}

export function Badge({ tone = "slate", children }) {
	const map = {
		slate: "bg-slate-100 text-slate-700 border-slate-200",
		emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
		amber: "bg-amber-50 text-amber-700 border-amber-200",
		rose: "bg-rose-50 text-rose-700 border-rose-200",
		indigo: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]",
		sky: "bg-sky-50 text-sky-700 border-sky-200",
		fuchsia: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
	};
	return (
		<span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${map[tone]}`}>
			{children}
		</span>
	);
}

function KPI({ label, value, delta, good, icon: Icon, tone = "indigo" }) {
	const DeltaIcon = delta == null ? null : good ? TrendingUp : TrendingDown;
	const toneGrad = {
		indigo: "from-[var(--color-primary-500)]/10 to-[var(--color-primary-500)]/0",
		emerald: "from-emerald-500/10 to-emerald-500/0",
		sky: "from-sky-500/10 to-sky-500/0",
		amber: "from-amber-500/10 to-amber-500/0",
		fuchsia: "from-fuchsia-500/10 to-fuchsia-500/0",
	}[tone];
	return (
		<div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br p-5 shadow-sm ${toneGrad}`}>
			<p className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</p>
			<div className="mt-2 flex items-baseline gap-2">
				{Icon && <Icon className="h-5 w-5 text-[var(--color-primary-600)]" />}
				<p className="text-3xl font-bold text-slate-900">{value ?? "-"}</p>
			</div>
			{delta != null && (
				<div className={`mt-2 flex items-center gap-1 text-xs font-medium ${good ? "text-emerald-600" : "text-rose-600"}`}>
					{DeltaIcon && <DeltaIcon className="h-3.5 w-3.5" />}
					{typeof delta === "number" && delta > 0 ? `+${delta}` : `${delta}`}
				</div>
			)}
		</div>
	);
}

function CardHeader({ icon, title, subtitle, actions }) {
	const Icon = icon;
	return (
		<div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
			<div className="flex items-center gap-3">
				{Icon && (
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-sm">
						<Icon className="h-5 w-5" />
					</div>
				)}
				<div>
					<h3 className="text-lg font-semibold text-slate-900">{title}</h3>
					{subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
				</div>
			</div>
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</div>
	);
}

function WorkoutKPI({ icon: Icon, label, value, hint, tone = "indigo" }) {
	const toneMap = {
		indigo: "bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-100)] text-[var(--color-primary-600)]",
		emerald: "bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600",
		amber: "bg-amber-50 ring-1 ring-amber-100 text-amber-600",
		sky: "bg-sky-50 ring-1 ring-sky-100 text-sky-600",
		rose: "bg-rose-50 ring-1 ring-rose-100 text-rose-600",
	};
	return (
		<div className={`flex items-center gap-3 rounded-lg p-4 ${toneMap[tone]}`}>
			{Icon && <Icon className="h-8 w-8 flex-shrink-0" />}
			<div>
				<p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
				<p className="text-2xl font-bold">{value}</p>
				{hint && <p className="mt-0.5 text-xs opacity-70">{hint}</p>}
			</div>
		</div>
	);
}

function NutritionKPI({ icon: Icon, label, value, hint, tone = "emerald" }) {
	const toneMap = {
		emerald: "bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600",
		indigo: "bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-100)] text-[var(--color-primary-600)]",
		amber: "bg-amber-50 ring-1 ring-amber-100 text-amber-600",
		sky: "bg-sky-50 ring-1 ring-sky-100 text-sky-600",
		rose: "bg-rose-50 ring-1 ring-rose-100 text-rose-600",
	};
	return (
		<div className={`flex items-center gap-3 rounded-lg p-4 ${toneMap[tone]}`}>
			{Icon && <Icon className="h-8 w-8 flex-shrink-0" />}
			<div>
				<p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
				<p className="text-2xl font-bold">{value}</p>
				{hint && <p className="mt-0.5 text-xs opacity-70">{hint}</p>}
			</div>
		</div>
	);
}

function FoodPill({ name, count }) {
	return (
		<div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-1.5">
			<span className="text-sm font-medium text-[var(--color-primary-700)]">{name}</span>
			<span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-200)] text-xs font-bold text-[var(--color-primary-700)]">
				{count}
			</span>
		</div>
	);
}

function Chip({ tone = "slate", children }) {
	const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium";
	const tones = {
		slate: "border-slate-200 bg-slate-50 text-slate-700",
		emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
		amber: "border-amber-200 bg-amber-50 text-amber-700",
		rose: "border-rose-200 bg-rose-50 text-rose-700",
		indigo: "border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
		sky: "border-sky-200 bg-sky-50 text-sky-700",
	};
	return <span className={`${base} ${tones[tone]}`}>{children}</span>;
}

function Meter({ value = 0, max = 5, label }) {
	const pct = Math.max(0, Math.min(100, (value / max) * 100));
	return (
		<div>
			<div className="mb-1 flex items-center justify-between text-xs">
				<span className="text-slate-600">{label}</span>
				<span className="font-medium text-[var(--color-primary-600)]">
					{value}/{max}
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
				<div
					className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] transition-all"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

const YesNo = ({ val, t }) => {
	const v = (val || "").toLowerCase();
	const ok = v === "yes";
	const bad = v === "no";
	return (
		<Chip tone={ok ? "emerald" : bad ? "rose" : "slate"}>
			{ok ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
			{ok ? t("common.yes") : t("common.no")}
		</Chip>
	);
};

function ReportKPI({ icon: Icon, label, value, hint, tone = "indigo" }) {
	const ring = {
		indigo: "bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-100)] text-[var(--color-primary-600)]",
		emerald: "bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600",
		amber: "bg-amber-50 ring-1 ring-amber-100 text-amber-600",
		sky: "bg-sky-50 ring-1 ring-sky-100 text-sky-600",
	};
	return (
		<div className={`flex items-center gap-3 rounded-lg p-4 ${ring[tone]}`}>
			{Icon && <Icon className="h-8 w-8 flex-shrink-0" />}
			<div>
				<p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
				<p className="text-2xl font-bold">{value}</p>
				{hint && <p className="mt-0.5 text-xs opacity-70">{hint}</p>}
			</div>
		</div>
	);
}

/* ============================== * Page * ============================== */
export default function ClientProfilePage() {
	const t = useTranslations("client360");
	const { colors } = useTheme();
	const { id } = useParams();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const { scrollY } = useScroll();
	const [elevated, setElevated] = useState(false);
	useMotionValueEvent(scrollY, "change", (y) => setElevated(y > 4));

	const [summaryLoading, setSummaryLoading] = useState(true);
	const [client, setClient] = useState(null);

	const tabs = TABS(t);
	const validTabKeys = useMemo(() => new Set(tabs.map((x) => x.key)), [tabs]);

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

	const handleTabChange = useCallback(
		(nextKey) => {
			if (!validTabKeys.has(nextKey)) return;
			setActive(nextKey);
			const sp = new URLSearchParams(searchParams?.toString() || "");
			sp.set(TAB_QUERY_KEY, nextKey);
			router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
			if (typeof window !== "undefined" && id) {
				localStorage.setItem(tabStorageKey(id), nextKey);
			}
		},
		[id, pathname, router, searchParams, validTabKeys]
	);

	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	const [measurements, setMeasurements] = useState([]);
	const [measurementsLoading, setMeasurementsLoading] = useState(false);
	const [targets, setTargets] = useState(null);
	const [nutritionLoading, setNutritionLoading] = useState(false);
	const [nutritionProgress, setNutritionProgress] = useState();
	const [weightSeries, setWeightSeries] = useState([]);
	const [progressLoading, setProgressLoading] = useState(false);
	const [exProgress, setExProgress] = useState();
	const [workoutsLoading, setWorkoutsLoading] = useState(false);

	const [tabLoading, setTabLoading] = useState(false);

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
		}
	}, [id]);

	useEffect(() => {
		if (active === "nutrition") {
			kickTabSpinner();
			loadTargets();
			const ctrl = newController("nutrition-logs");
			api
				.get(`/nutrition/my/meal-logs?userId=${id}&days=30`, { signal: ctrl.signal })
				.then((res) => setNutritionProgress(res.data))
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
			api
				.get(`/prs/stats/progress?userId=${id}&windowDays=30&exerciseWindowDays=90`, { signal: ctrl.signal })
				.then((res) => setExProgress(res.data))
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
		return <EmptyState message={t("summary.notFound")} />;
	}

	return (
		<div className="mx-auto min-h-screen ">
			{/* FULL-BLEED sticky header */}
			<motion.div
				className="sticky bg-white/20 backdrop-blur-2xl top-0 z-20 -mx-6 px-6 transition-all duration-200 md:-mx-8 md:px-8"

			>
				<div className="py-6">
					{summaryLoading ? (
						<div className="h-24 animate-pulse rounded-lg bg-slate-100" />
					) : (
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<h1 className="text-2xl font-bold text-slate-900">{client?.identity?.name}</h1>
								<p className="mt-1 text-sm text-slate-600">{client?.identity?.email}</p>
							</div>
							<div className="flex flex-wrap gap-3 text-xs text-slate-600">
								<div className="flex items-center gap-1.5">
									<Shield className="h-4 w-4 text-[var(--color-primary-500)]" />
									<span>
										{t("summary.header.coach")}: {client?.coach?.name}
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<CalendarDays className="h-4 w-4 text-[var(--color-primary-500)]" />
									<span>
										{formatDate(client?.identity?.subscriptionStart)} {t("summary.header.arrow")}{" "}
										{formatDate(client?.identity?.subscriptionEnd)}
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<Clock className="h-4 w-4 text-[var(--color-primary-500)]" />
									<span>
										{t("summary.header.lastLogin")} {formatDate(client?.identity?.lastLogin)}
									</span>
								</div>
							</div>
						</div>
					)}

					<div className="mt-4">
						<TabsPill
							tabs={tabs}
							active={active}
							onChange={(k) => {
								kickTabSpinner();
								handleTabChange(k);
							}}
							id="client-360-tabs"
						/>
					</div>
				</div>
			</motion.div>

			{/* CONTENT AREA */}
			<div className="pb-12 pt-6">
				{summaryLoading ? (
					<SummarySkeleton />
				) : (
					<AnimatePresence mode="wait">
						{active === "overview" && <SummaryTab key="overview" data={client} />}
						{active === "measurements" &&
							(measurementsLoading ? (
								<Spinner key="measurements-loading" />
							) : (
								<motion.div
									key="measurements"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={spring}
								>
									<CardGlass className="p-6">
										<SectionTitle icon={ClipboardList}>{t("measurements.title")}</SectionTitle>
										<DataTable columns={measColumns} data={filteredMeasurements} />
										{!filteredMeasurements.length && (
											<div className="py-12 text-center text-sm text-slate-500">
												<EmptyState message={t("measurements.empty")} />
											</div>
										)}
									</CardGlass>
								</motion.div>
							))}
						{active === "progress" &&
							(progressLoading ? (
								<Spinner key="progress-loading" />
							) : (
								<ProgressTab
									key="progress"
									weightSeries={weightSeries}
									currentWeight={currentWeight}
									minWeight={minWeight}
									maxWeight={maxWeight}
									sortedMs={sortedMs}
									trendPoints={trendPoints}
									line={line}
									area={area}
									circles={circles}
									hoverIdx={hoverIdx}
									setHoverIdx={setHoverIdx}
								/>
							))}
						{active === "workouts" &&
							(workoutsLoading ? <Spinner key="workouts-loading" /> : <WorkoutsProgress key="workouts" data={exProgress} />)}
						{active === "nutrition" &&
							(nutritionLoading ? (
								<Spinner key="nutrition-loading" />
							) : (
								<NutritionProgressTab key="nutrition" data={nutritionProgress} />
							))}
						{active === "reports" && <ReportsTab key="reports" userId={id} active={active} />}
					</AnimatePresence>
				)}
			</div>
		</div>
	);
}

// ---------- SummaryTab ----------
function SummaryTab({ data }) {
	const t = useTranslations("client360.summary");
	const router = useRouter();
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

	const dedupedWeekly = dedupeWeekly(weeklyReport);
	const totalCheckins = dedupedWeekly.length;

	const workoutDays = workouts?.days?.length || 0;
	const workoutName = workouts?.name || "-";
	const mealName = mealPlans?.name || "-";
	const mealDays = mealPlans?.days?.length || 0;

	const currentWeight = latestWeight ?? null;
	const minWeight = trendPoints.length ? Math.min(...trendPoints.map((p) => p.y)) : null;
	const maxWeight = trendPoints.length ? Math.max(...trendPoints.map((p) => p.y)) : null;

	const [hoverIdx, setHoverIdx] = useState(null);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={spring}
			className="space-y-6"
		>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<KPI
					icon={Scale}
					label={t("kpi.currentWeight")}
					value={latestWeight != null ? `${latestWeight} ${t("units.kg")}` : t("common.hyphen")}
					delta={weightDelta}
					good={weightDelta != null && weightDelta < 0}
					tone="indigo"
				/>
				<KPI
					icon={Activity}
					label={t("kpi.waist")}
					value={latestWaist != null ? `${latestWaist} ${t("units.cm")}` : t("common.hyphen")}
					delta={waistDelta}
					good={waistDelta != null && waistDelta < 0}
					tone="emerald"
				/>
				<KPI
					icon={CalendarDays}
					label={t("kpi.daysElapsed")}
					value={daysElapsed != null ? `${daysElapsed} ${t("units.days")}` : t("common.hyphen")}
					tone="sky"
				/>
				<KPI icon={CheckCircle2} label={t("kpi.checkIns")} value={totalCheckins} tone="fuchsia" />
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<SectionHeader
						icon={BarChart3}
						title={t("trend.title")}
						subtitle={`${t("trend.legend.current")}: ${currentWeight ?? t("common.hyphen")} ${t("units.kg")} · ${t("trend.legend.min")}: ${minWeight ?? t("common.hyphen")} ${t("units.kg")} · ${t("trend.legend.max")}: ${maxWeight ?? t("common.hyphen")} ${t("units.kg")}`}
					/>
					<div className="relative rounded-lg border border-slate-200 bg-slate-50 p-4">
						<svg viewBox="0 0 320 120" className="h-auto w-full">
							<defs>
								<linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="var(--color-gradient-from)" stopOpacity="0.2" />
									<stop offset="100%" stopColor="var(--color-gradient-to)" stopOpacity="0" />
								</linearGradient>
							</defs>
							{[0, 1, 2, 3, 4].map((i) => (
								<line
									key={i}
									x1={10}
									x2={310}
									y1={10 + i * 25}
									y2={10 + i * 25}
									stroke="#e2e8f0"
									strokeWidth="1"
									strokeDasharray="2,2"
								/>
							))}
							{area && <path d={area} fill="url(#areaGradient)" />}
							{line && <path d={line} fill="none" stroke="var(--color-gradient-from)" strokeWidth="2" />}
							{circles.map((c, idx) => (
								<circle
									key={idx}
									cx={c.cx}
									cy={c.cy}
									r={hoverIdx === idx ? 6 : idx === circles.length - 1 ? 5 : 3}
									fill={idx === circles.length - 1 ? "var(--color-primary-600)" : "var(--color-gradient-from)"}
									stroke="white"
									strokeWidth={hoverIdx === idx ? 2.5 : 2}
									className="cursor-pointer transition-all"
									onMouseEnter={() => setHoverIdx(idx)}
									onMouseLeave={() => setHoverIdx(null)}
								/>
							))}
						</svg>
						<div className="mt-3 flex items-center justify-between text-xs text-slate-500">
							<span>{t("trend.axis.y")}</span>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1">
									<div className="h-2 w-2 rounded-full bg-[var(--color-primary-600)]" />
									<span>{t("trend.legend.latestPoint")}</span>
								</div>
								<div className="flex items-center gap-1">
									<div className="h-2 w-2 rounded-full bg-[var(--color-gradient-from)]" />
									<span>{t("trend.legend.otherPoints")}</span>
								</div>
							</div>
						</div>
					</div>

					<div className="mt-4 max-h-64 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
						{sortedMs
							.slice(-6)
							.reverse()
							.map((m) => (
								<div key={m.date} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2">
									<span className="text-sm font-medium text-slate-700">{formatDate(m.date)}</span>
									<span className="text-sm font-semibold text-[var(--color-primary-600)]">
										{num(m.weight) ?? t("common.hyphen")} {t("units.kg")}
									</span>
								</div>
							))}
					</div>
				</Card>

				<div className="space-y-6">
					{/* Workout Plan Card - Enhanced */}
					<Card
						className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
						onClick={() => router.push(`/dashboard/workouts/plans?planId=${workouts?.id}`)}
					>
						{/* Subtle gradient overlay on hover */}
						<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-gradient-from)]/0 to-[var(--color-gradient-to)]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />

						<div className="relative">
							<div className="mb-4 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
										<Dumbbell className="h-6 w-6" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h3 className="font-semibold text-slate-900 transition-colors duration-300 group-hover:text-[var(--color-primary-700)]">
												{workoutName}
											</h3>
											<ChevronLeft className="h-4 w-4 -rotate-180 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 rtl:rotate-0 rtl:group-hover:-translate-x-1" />
										</div>
										<p className="text-xs text-slate-600">
											{workoutDays} {t("workout.daysShort")} · {workouts?.isActive ? t("common.active") : t("common.inactive")}
										</p>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<Badge tone={workouts?.isActive ? "emerald" : "slate"}>
									{workouts?.isActive ? (
										<>
											<CheckCircle2 className="h-3 w-3" />
											{t("common.active")}
										</>
									) : (
										<>
											<Clock className="h-3 w-3" />
											{t("common.inactive")}
										</>
									)}
								</Badge>

								<span className="text-xs font-medium text-[var(--color-primary-600)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
									{t("workout.viewPlan")} 
								</span>
							</div>
						</div>
					</Card>

					{/* Nutrition Plan Card - Enhanced */}
					<Card
						className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
						onClick={() => router.push(`/dashboard/nutrition?planId=${mealPlans?.id}`)}
					>
						{/* Subtle gradient overlay on hover */}
						<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-gradient-from)]/0 to-[var(--color-gradient-to)]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />

						<div className="relative">
							<div className="mb-4 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
										<UtensilsCrossed className="h-6 w-6" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h3 className="font-semibold text-slate-900 transition-colors duration-300 group-hover:text-[var(--color-primary-700)]">
												{mealName}
											</h3>
											<ChevronLeft className="h-4 w-4 -rotate-180 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 rtl:rotate-0 rtl:group-hover:-translate-x-1" />
										</div>
										<p className="text-xs text-slate-600">
											{mealDays} {t("meal.daysShort")} · {mealPlans?.isActive ? t("common.active") : t("common.inactive")}
										</p>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<Badge tone={mealPlans?.isActive ? "emerald" : "slate"}>
									{mealPlans?.isActive ? (
										<>
											<CheckCircle2 className="h-3 w-3" />
											{t("common.active")}
										</>
									) : (
										<>
											<Clock className="h-3 w-3" />
											{t("common.inactive")}
										</>
									)}
								</Badge>

								<span className="text-xs font-medium text-[var(--color-primary-600)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
									{t("meal.viewPlan")} 
								</span>
							</div>
						</div>
					</Card>

					{/* Weekly Check-ins Card - Enhanced */}
					<Card>
						<SectionHeader icon={FileText} title={t("checkins.title")} />
						{dedupedWeekly.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12">
								<div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
									<FileText className="h-8 w-8 text-slate-400" />
								</div>
								<p className="text-sm text-slate-500">{t("checkins.empty")}</p>
							</div>
						) : (
							<div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
								{dedupedWeekly.slice(0, 6).map((w, idx) => (
									<motion.div
										key={w.id}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: idx * 0.05, duration: 0.3 }}
										className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all duration-200 hover:border-[var(--color-primary-300)] hover:bg-white hover:shadow-sm"
									>
										{/* Accent bar */}
										<div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

										<div className="flex items-start justify-between gap-3 pl-2">
											<div className="flex-1">
												<p className="text-sm font-medium text-slate-900 transition-colors duration-200 group-hover:text-[var(--color-primary-700)]">
													{w.text}
												</p>
												<div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
													<CalendarDays className="h-3 w-3" />
													{formatDate(w.at)}
												</div>
											</div>

											<div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 opacity-0 transition-all duration-200 group-hover:opacity-100">
												<CheckCircle2 className="h-4 w-4" />
											</div>
										</div>
									</motion.div>
								))}

								{/* Show more indicator if there are more than 6 */}
								{dedupedWeekly.length > 6 && (
									<div className="pt-2 text-center">
										<span className="text-xs font-medium text-[var(--color-primary-600)]">
											+{dedupedWeekly.length - 6} {t("checkins.more")}
										</span>
									</div>
								)}
							</div>
						)}
					</Card>
				</div>
			</div>

			<Card>
				<SectionHeader icon={User} title={t("identity.title")} />
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t("identity.client")}</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{identity?.name}</p>
						<p className="text-sm text-slate-600">{identity?.email}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t("identity.membership")}</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{identity?.membership || t("common.hyphen")}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t("identity.gender")}</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{identity?.gender || t("common.hyphen")}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t("identity.phone")}</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{identity?.phone || t("common.hyphen")}</p>
					</div>
				</div>
			</Card>
		</motion.div>
	);
}

// ---------- ProgressTab ----------
function ProgressTab({ weightSeries, currentWeight, minWeight, maxWeight, sortedMs, trendPoints, line, area, circles, hoverIdx, setHoverIdx }) {
	const t = useTranslations("client360.summary");

	return (
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring}>
			<Card>
				<SectionHeader
					icon={LineChart}
					title={t("trend.title")}
					subtitle={`${t("trend.legend.current")}: ${currentWeight ?? t("common.hyphen")} ${t("units.kg")} · ${t("trend.legend.min")}: ${minWeight ?? t("common.hyphen")} ${t("units.kg")} · ${t("trend.legend.max")}: ${maxWeight ?? t("common.hyphen")} ${t("units.kg")}`}
				/>
				<div className="relative rounded-lg border border-slate-200 bg-slate-50 p-4">
					<svg viewBox="0 0 320 120" className="h-auto w-full">
						<defs>
							<linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="var(--color-gradient-from)" stopOpacity="0.2" />
								<stop offset="100%" stopColor="var(--color-gradient-to)" stopOpacity="0" />
							</linearGradient>
						</defs>
						{[0, 1, 2, 3, 4].map((i) => (
							<line key={i} x1={10} x2={310} y1={10 + i * 25} y2={10 + i * 25} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
						))}
						{area && <path d={area} fill="url(#areaGradient)" />}
						{line && <path d={line} fill="none" stroke="var(--color-gradient-from)" strokeWidth="2" />}
						{circles.map((c, idx) => (
							<circle
								key={idx}
								cx={c.cx}
								cy={c.cy}
								r={hoverIdx === idx ? 6 : idx === circles.length - 1 ? 5 : 3}
								fill={idx === circles.length - 1 ? "var(--color-primary-600)" : "var(--color-gradient-from)"}
								stroke="white"
								strokeWidth={hoverIdx === idx ? 2.5 : 2}
								className="cursor-pointer transition-all"
								onMouseEnter={() => setHoverIdx(idx)}
								onMouseLeave={() => setHoverIdx(null)}
							/>
						))}
					</svg>
					<div className="mt-3 flex items-center justify-between text-xs text-slate-500">
						<span>{t("trend.axis.y")}</span>
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1">
								<div className="h-2 w-2 rounded-full bg-[var(--color-primary-600)]" />
								<span>{t("trend.legend.latestPoint")}</span>
							</div>
							<div className="flex items-center gap-1">
								<div className="h-2 w-2 rounded-full bg-[var(--color-gradient-from)]" />
								<span>{t("trend.legend.otherPoints")}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-4 max-h-64 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
					{sortedMs
						.slice()
						.reverse()
						.map((m) => (
							<div key={m.date} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2">
								<span className="text-sm font-medium text-slate-700">{formatDate(m.date)}</span>
								<span className="text-sm font-semibold text-[var(--color-primary-600)]">
									{num(m.weight) ?? t("common.hyphen")} {t("units.kg")}
								</span>
							</div>
						))}
				</div>
			</Card>
		</motion.div>
	);
}

// ---------- WorkoutsProgress ----------
function WorkoutsProgress({ data }) {
	const t = useTranslations("workoutsProgress");

	if (!data) {
		return (
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring}>
				<Card>
					<div className="py-12 text-center text-sm text-slate-500">{t("loading")}</div>
				</Card>
			</motion.div>
		);
	}

	const { adherence = {}, volume = {}, sessions = {}, exercises = {}, prs = {}, e1rmTrends = {}, meta = {} } = data;

	const maxVol = useMemo(() => maxBy(sessions.last8 || [], "volume"), [sessions]);
	const maxSets = useMemo(() => maxBy(sessions.last8 || [], "setsTotal"), [sessions]);

	const e1rmSeries = useMemo(() => {
		return Object.entries(e1rmTrends || {}).map(([name, arr]) => {
			const pts = (arr || []).map((x) => ({ x: x.date, y: x.e1rm }));
			return { name, points: pts, path: sparklinePath(pts) };
		});
	}, [e1rmTrends]);

	return (
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<WorkoutKPI icon={Flame} label={t("kpi.adherence")} value={`${adherence.overall || 0}%`} tone="indigo" />
				<WorkoutKPI icon={Activity} label={t("kpi.totalVolume")} value={volume.total || 0} hint={t("kpi.kg")} tone="emerald" />
				<WorkoutKPI icon={CalendarDays} label={t("kpi.sessions")} value={sessions.total || 0} tone="sky" />
				<WorkoutKPI icon={TrendingUp} label={t("kpi.prs")} value={prs.count || 0} tone="amber" />
			</div>

			<Card>
				<CardHeader icon={BarChart3} title={t("sessions.title")} subtitle={t("sessions.subtitle")} />
				{Array.isArray(sessions.last8) && sessions.last8.length ? (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{sessions.last8.map((s, idx) => {
							const vPct = maxVol ? Math.round((Number(s.volume || 0) / maxVol) * 100) : 0;
							const setsPct = maxSets ? Math.round((Number(s.setsTotal || 0) / maxSets) * 100) : 0;
							return (
								<div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
									<p className="text-sm font-semibold text-slate-900">{formatDate(s.date)}</p>
									<p className="mt-1 text-xs text-slate-600">{t("sessions.sets", { d: s.setsDone || 0, t: s.setsTotal || 0 })}</p>
									<div className="mt-3 space-y-2">
										<div>
											<div className="mb-1 flex items-center justify-between text-xs">
												<span className="text-slate-600">{t("sessions.volume")}</span>
												<span className="font-medium text-[var(--color-primary-600)]">{s.volume || 0}</span>
											</div>
											<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
												<div
													className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] transition-all"
													style={{ width: `${vPct}%` }}
												/>
											</div>
										</div>
										<div>
											<div className="mb-1 flex items-center justify-between text-xs">
												<span className="text-slate-600">{t("sessions.setsShort")}</span>
												<span className="font-medium text-[var(--color-primary-600)]">{s.setsTotal || 0}</span>
											</div>
											<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
												<div
													className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] transition-all"
													style={{ width: `${setsPct}%` }}
												/>
											</div>
										</div>
									</div>
									{Array.isArray(s.exercises) && s.exercises.length ? (
										<div className="mt-3 rounded border border-slate-200 bg-white p-2">
											<p className="text-xs font-medium text-slate-700">{t("sessions.exercises")}</p>
											<p className="mt-1 text-xs text-slate-600">
												{s.exercises.slice(0, 2).join(" · ")}
												{s.exercises.length > 2 ? ` +${s.exercises.length - 2}` : ""}
											</p>
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				) : (
					<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
				)}
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader icon={Dumbbell} title={t("exercises.byAttempts")} />
					{Array.isArray(exercises.topByAttempts) && exercises.topByAttempts.length ? (
						<div className="space-y-3">
							{exercises.topByAttempts.map((e, i) => {
								const maxA = maxBy(exercises.topByAttempts, "attempts") || 1;
								const w = Math.round((Number(e.attempts || 0) / maxA) * 100);
								return (
									<div key={i}>
										<div className="mb-1 flex items-center justify-between text-sm">
											<span className="font-medium text-slate-900">{e.name}</span>
											<span className="text-[var(--color-primary-600)]">{e.attempts}</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
											<div
												className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]"
												style={{ width: `${w}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
					)}
				</Card>

				<Card>
					<CardHeader icon={BarChart3} title={t("exercises.byVolume")} />
					{Array.isArray(exercises.topByVolume) && exercises.topByVolume.length ? (
						<div className="space-y-3">
							{exercises.topByVolume.map((e, i) => {
								const maxV = maxBy(exercises.topByVolume, "volume") || 1;
								const w = Math.round((Number(e.volume || 0) / maxV) * 100);
								return (
									<div key={i}>
										<div className="mb-1 flex items-center justify-between text-sm">
											<span className="font-medium text-slate-900">{e.name}</span>
											<span className="text-[var(--color-primary-600)]">{e.volume}</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
											<div
												className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]"
												style={{ width: `${w}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
					)}
				</Card>
			</div>

			<Card>
				<CardHeader icon={TrendingUp} title={t("prs.title")} />
				{Array.isArray(prs.top) && prs.top.length ? (
					<div className="max-h-96 space-y-3 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
						{prs.top.map((p, i) => (
							<div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-start justify-between">
									<div>
										<p className="font-semibold text-slate-900">{p.exercise}</p>
										<p className="mt-1 text-xs text-slate-600">{formatDate(p.date)}</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-medium text-[var(--color-primary-600)]">{t("prs.e1rm", { n: p.e1rm || 0 })}</p>
										<p className="mt-1 text-xs text-slate-600">
											{t("prs.weight", { n: p.weight || 0 })} · {t("prs.reps", { n: p.reps || 0 })}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
				)}
			</Card>

			<Card>
				<CardHeader icon={LineChart} title={t("e1rm.title")} subtitle={t("e1rm.subtitle")} />
				{e1rmSeries.length ? (
					<div className="grid gap-4 md:grid-cols-2">
						{e1rmSeries.map((s, i) => (
							<div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<p className="mb-3 text-sm font-semibold text-slate-900">{s.name}</p>
								<svg viewBox="0 0 220 56" className="h-auto w-full">
									<path d={s.path} fill="none" stroke="var(--color-gradient-from)" strokeWidth="2" />
								</svg>
							</div>
						))}
					</div>
				) : (
					<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
				)}
			</Card>
		</motion.div>
	);
}

// ---------- NutritionProgressTab ----------
function NutritionProgressTab({ data }) {
	const t = useTranslations("nutritionProgress");

	const logs = Array.isArray(data) ? data : [];

	const days = useMemo(() => groupByDay(logs), [logs]);
	const mealsLogged = logs.length;
	const supplementsCount = useMemo(() => logs.reduce((n, m) => n + (m.supplementsTaken?.filter((s) => s.taken)?.length || 0), 0), [logs]);
	const adherenceAvg = useMemo(() => safeNum(avg(logs.map((m) => safeNum(m.adherence))), 2), [logs]);
	const top = useMemo(() => topFoods(logs, 10), [logs]);

	const adherenceSeries = useMemo(() => buildAdherenceSeries(logs, 14), [logs]);
	const adherencePath = sparkPath(adherenceSeries);
	const mealsSeries = useMemo(() => adherenceSeries.map((d) => ({ x: d.x, y: d.count })), [adherenceSeries]);
	const mealsMax = useMemo(() => maxBy(mealsSeries, "y"), [mealsSeries]);

	return (
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<NutritionKPI icon={UtensilsCrossed} label={t("kpi.mealsLogged")} value={mealsLogged} tone="emerald" />
				<NutritionKPI icon={CheckCircle2} label={t("kpi.adherence")} value={`${adherenceAvg}%`} tone="indigo" />
				<NutritionKPI icon={Sparkles} label={t("kpi.supplements")} value={supplementsCount} tone="amber" />
				<NutritionKPI icon={CalendarDays} label={t("kpi.daysTracked")} value={days.length} tone="sky" />
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader icon={BarChart3} title={t("adherence.title")} subtitle={t("adherence.caption")} />
					<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<svg viewBox="0 0 240 56" className="h-auto w-full">
							{adherencePath && <path d={adherencePath} fill="none" stroke="var(--color-gradient-from)" strokeWidth="2" />}
						</svg>
					</div>
				</Card>

				<Card>
					<CardHeader icon={Activity} title={t("meals.title")} />
					{mealsSeries.length ? (
						<div className="flex items-end gap-1">
							{mealsSeries.map((d) => {
								const pct = mealsMax ? Math.round((d.y / mealsMax) * 100) : 0;
								return (
									<div key={d.x} className="group relative flex-1">
										<div className="h-24 rounded-t bg-slate-200">
											<div
												className="w-full rounded-t bg-gradient-to-t from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] transition-all"
												style={{ height: `${pct}%` }}
											/>
										</div>
										<p className="mt-1 text-center text-xs text-slate-600">{d.x.slice(5)}</p>
									</div>
								);
							})}
						</div>
					) : (
						<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
					)}
				</Card>
			</div>

			<Card>
				<CardHeader icon={UtensilsCrossed} title={t("topFoods.title")} />
				{top.length ? (
					<div className="flex flex-wrap gap-2">
						{top.map((f, i) => (
							<FoodPill key={i} name={f.name} count={f.count} />
						))}
					</div>
				) : (
					<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
				)}
			</Card>

			<Card>
				<CardHeader icon={FileText} title={t("logs.title")} />
				{days.length ? (
					<div className="max-h-[600px] space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
						{days.map(({ day, list }) => (
							<div key={day} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<p className="mb-3 text-sm font-semibold text-slate-900">{formatDate(day)}</p>
								<div className="space-y-3">
									{list.map((m) => {
										const items = m.items || [];
										const supps = m.supplementsTaken?.filter((s) => s.taken) || [];
										return (
											<div key={m.id} className="rounded border border-slate-200 bg-white p-3">
												<div className="flex items-start justify-between">
													<div>
														<p className="font-medium text-slate-900">{m.mealTitle}</p>
														<p className="mt-1 text-xs text-slate-600">
															{t("logs.at")} {formatDate(m.eatenAt || m.created_at)}
														</p>
													</div>
													<Badge tone="indigo">{t("logs.adherence", { n: m.adherence ?? 0 })}</Badge>
												</div>
												{items.length ? (
													<div className="mt-3 rounded bg-slate-50 p-2">
														<p className="text-xs font-medium text-slate-700">{t("logs.items")}</p>
														<div className="mt-1 space-y-1">
															{items.slice(0, 2).map((it, idx) => (
																<div key={idx} className="flex items-center justify-between text-xs text-slate-600">
																	<span>{it.name}</span>
																	<span className="font-medium">{it.quantity}</span>
																</div>
															))}
														</div>
														{items.length > 2 && (
															<p className="mt-1 text-xs text-[var(--color-primary-600)]">
																+{items.length - 2} {t("logs.more")}
															</p>
														)}
													</div>
												) : null}
												{supps.length ? (
													<div className="mt-2 flex flex-wrap gap-1">
														<span className="text-xs font-medium text-slate-600">{t("logs.supplements")}:</span>
														{supps.map((s, idx) => (
															<Badge key={idx} tone="emerald">
																{s.name}
															</Badge>
														))}
													</div>
												) : null}
												{m.notes && <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">{m.notes}</div>}
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="py-12 text-center text-sm text-slate-500">{t("empty")}</div>
				)}
			</Card>
		</motion.div>
	);
}

// ---------- ReportsTab Modal ----------
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
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						transition={spring}
						className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-6 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-2xl font-bold text-slate-900">{t("modal.title")}</h2>
									<p className="mt-1 text-sm text-slate-600">{formatDate(report?.weekOf)}</p>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={onPrev}
										className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
										disabled={!onPrev}
									>
										<ChevronLeft className="h-5 w-5" />
									</button>
									<button
										onClick={onNext}
										className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
										disabled={!onNext}
									>
										<ChevronRight className="h-5 w-5" />
									</button>
									<button onClick={onClose} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
										<X className="h-5 w-5" />
									</button>
								</div>
							</div>
							<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
								<span>
									{t("card.created")} {formatDate(report?.created_at)}
								</span>
								<span>·</span>
								<span>
									{t("card.updated")} {formatDate(report?.updated_at)}
								</span>
							</div>
						</div>

						{/* Body */}
						<div className="space-y-6 p-6">
							{/* Diet */}
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
									<UtensilsCrossed className="h-5 w-5 text-[var(--color-primary-600)]" />
									{t("diet.title")}
								</h3>
								<div className="space-y-3">
									<Meter value={d.adherence?.overall || 0} max={5} label={t("diet.adherence")} />
									<Meter value={d.water?.cups || 0} max={10} label={t("diet.water")} />
									{d.dietDeviation?.hasDeviation && (
										<Chip tone={(d.dietDeviation.hasDeviation || "").toLowerCase() === "yes" ? "amber" : "emerald"}>
											{t("diet.deviation")}
											{d.dietDeviation.times != null ? ` (${d.dietDeviation.times})` : ""}
										</Chip>
									)}
									{d.wantSpecific && <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">{d.wantSpecific}</div>}
								</div>
							</div>

							{/* Training */}
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
									<Dumbbell className="h-5 w-5 text-[var(--color-primary-600)]" />
									{t("training.title")}
								</h3>
								<div className="space-y-3">
									<div className="flex flex-wrap gap-2">
										<div>
											<span className="text-xs text-slate-600">{t("training.sleepEnough")}:</span> <YesNo val={tr.sleepEnough} t={t} />
										</div>
										<div>
											<span className="text-xs text-slate-600">{t("training.intensityOk")}:</span> <YesNo val={tr.intensityOk} t={t} />
										</div>
										<div>
											<span className="text-xs text-slate-600">{t("training.shapeChange")}:</span> <YesNo val={tr.shapeChange} t={t} />
										</div>
									</div>
									{tr.programNotes && <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">{tr.programNotes}</div>}
								</div>
							</div>

							{/* Measurements + Photos */}
							<div className="grid gap-6 lg:grid-cols-2">
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
									<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
										<Scale className="h-5 w-5 text-[var(--color-primary-600)]" />
										{t("measurements.title")}
									</h3>
									<div className="grid grid-cols-3 gap-3">
										<div className="rounded border border-slate-200 bg-white p-3 text-center">
											<p className="text-xs text-slate-600">{t("measurements.weight")}</p>
											<p className="mt-1 text-lg font-semibold text-slate-900">{safe(ms.weight)}</p>
										</div>
										<div className="rounded border border-slate-200 bg-white p-3 text-center">
											<p className="text-xs text-slate-600">{t("measurements.waist")}</p>
											<p className="mt-1 text-lg font-semibold text-slate-900">{safe(ms.waist)}</p>
										</div>
										<div className="rounded border border-slate-200 bg-white p-3 text-center">
											<p className="text-xs text-slate-600">{t("measurements.chest")}</p>
											<p className="mt-1 text-lg font-semibold text-slate-900">{safe(ms.chest)}</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
									<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
										<ImageIcon className="h-5 w-5 text-[var(--color-primary-600)]" />
										{t("photos.title")}
									</h3>
									<div className="grid grid-cols-4 gap-2">
										{["front", "left", "right", "back"].map((k) => {
											const url = ph?.[k]?.url;
											return (
												<div key={k} className="aspect-square overflow-hidden rounded border border-slate-200 bg-white">
													{url ? (
														<Img src={url} alt={t(`photos.${k}`)} className="h-full w-full object-cover" />
													) : (
														<div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
															{t("photos.placeholder", { side: t(`photos.${k}`) })}
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>

							{/* Coach Feedback */}
							{typeof report?.coachFeedback === "string" && report.coachFeedback.trim() !== "" && (
								<div className="rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4">
									<h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[var(--color-primary-900)]">
										<MessageSquare className="h-5 w-5" />
										{t("feedback.title")}
									</h3>
									<p className="text-sm text-[var(--color-primary-800)]">{report.coachFeedback}</p>
								</div>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

// ---------- ReportsTab ----------
function ReportsTab({ userId, active, pageSize = 4 }) {
	const t = useTranslations("reportsTab");
	const router = useRouter();
	const search = useSearchParams();

	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState(null);
	const [rawRecords, setRawRecords] = useState([]);
	const [page, setPage] = useState(1);

	const [open, setOpen] = useState(false);
	const [selectedId, setSelectedId] = useState(null);

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
	const deduped = useMemo(() => dedupeByWeekOf(rawRecords), [rawRecords]);
	const total = deduped.length;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	useEffect(() => {
		setPage((p) => Math.min(Math.max(1, p), pageCount));
	}, [pageCount]);
	const sliceFrom = (page - 1) * pageSize;
	const pageItems = deduped.slice(sliceFrom, sliceFrom + pageSize);
	const unread = useMemo(() => deduped.filter((r) => !r.isRead).length, [deduped]);
	const withPhotos = useMemo(() => deduped.filter((r) => r.photos?.front || r.photos?.back || r.photos?.left || r.photos?.right).length, [deduped]);
	const initialized = useRef(false);
	useEffect(() => {
		if (initialized.current) return;
		const qId = search?.get("reportId");
		if (qId) {
			const found = deduped.find((r) => r.id === qId);
			if (found) {
				setSelectedId(found.id);
				setOpen(true);
				const idx = deduped.findIndex((r) => r.id === qId);
				if (idx >= 0) setPage(Math.floor(idx / pageSize) + 1);
			}
		}
		initialized.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, deduped]);
	const currentIndex = useMemo(() => deduped.findIndex((r) => r.id === selectedId), [deduped, selectedId]);
	const selected = currentIndex >= 0 ? deduped[currentIndex] : null;
	const openReport = useCallback(
		(id) => {
			setSelectedId(id);
			setOpen(true);
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
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				<ReportKPI icon={FileText} label={t("kpi.totalReports")} value={total} tone="indigo" />
				<ReportKPI icon={Eye} label={t("kpi.unread")} value={unread} tone="amber" />
				<ReportKPI icon={ImageIcon} label={t("kpi.withPhotos")} value={withPhotos} tone="emerald" />
			</div>
			{loading ? (
				<Card>
					<div className="flex items-center justify-center py-12">
						<Spinner />
					</div>
				</Card>
			) : err ? (
				<Card>
					<div className="py-12 text-center text-sm text-rose-600">
						{t("error")} — {String(err)}
					</div>
				</Card>
			) : !pageItems.length ? (
				<Card>
					<div className="flex flex-col items-center justify-center py-16">
						<FileText className="h-12 w-12 text-slate-300" />
						<p className="mt-3 text-sm text-slate-500">{t("empty")}</p>
					</div>
				</Card>
			) : (
				<div className="space-y-4">
					{pageItems.map((r) => {
						const d = r.diet || {};
						const tr = r.training || {};
						const ms = r.measurements || {};
						const ph = r.photos || {};
						const readTone = r.isRead ? "emerald" : "amber";

						return (
							<Card key={r.id}>
								<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div>
										<h3 className="text-lg font-semibold text-slate-900">
											{t("card.weekOf")} {formatDate(r.weekOf)}
										</h3>
										<p className="mt-1 text-xs text-slate-600">
											{t("card.created")} {formatDate(r.created_at)} · {t("card.updated")} {formatDate(r.updated_at)}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Chip tone={readTone}>{r.isRead ? t("card.read") : t("card.unread")}</Chip>
										{r.reviewedAt && (
											<Chip tone="indigo">
												{t("card.reviewedAt")} {formatDate(r.reviewedAt)}
											</Chip>
										)}
										<button
											onClick={() => openReport(r.id)}
											className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
										>
											{t("actions.view")}
										</button>
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-3">
									<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
										<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("diet.title")}</p>
										<div className="space-y-2">
											<Meter value={d.adherence?.overall || 0} max={5} label={t("diet.adherence")} />
											<Meter value={d.water?.cups || 0} max={10} label={t("diet.water")} />
										</div>
									</div>

									<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
										<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("training.title")}</p>
										<div className="space-y-1 text-xs">
											<div>
												{t("training.sleepEnough")}: <YesNo val={tr.sleepEnough} t={t} />
											</div>
											<div>
												{t("training.intensityOk")}: <YesNo val={tr.intensityOk} t={t} />
											</div>
										</div>
									</div>

									<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
										<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("measurements.title")}</p>
										<div className="grid grid-cols-3 gap-2">
											<div className="rounded border border-slate-200 bg-white p-2 text-center">
												<p className="text-xs text-slate-600">{t("measurements.weight")}</p>
												<p className="mt-1 text-sm font-semibold text-slate-900">{safe(ms.weight)}</p>
											</div>
											<div className="rounded border border-slate-200 bg-white p-2 text-center">
												<p className="text-xs text-slate-600">{t("measurements.waist")}</p>
												<p className="mt-1 text-sm font-semibold text-slate-900">{safe(ms.waist)}</p>
											</div>
											<div className="rounded border border-slate-200 bg-white p-2 text-center">
												<p className="text-xs text-slate-600">{t("measurements.chest")}</p>
												<p className="mt-1 text-sm font-semibold text-slate-900">{safe(ms.chest)}</p>
											</div>
										</div>
										<div className="mt-3 grid grid-cols-4 gap-1">
											{["front", "left", "right", "back"].map((k) => {
												const url = ph?.[k]?.url;
												return (
													<div key={k} className="aspect-square overflow-hidden rounded border border-slate-200 bg-white">
														{url ? (
															<Img src={url} alt={t(`photos.${k}`)} className="h-full w-full object-cover" />
														) : (
															<div className="flex h-full w-full items-center justify-center">
																<ImageIcon className="h-4 w-4 text-slate-300" />
															</div>
														)}
													</div>
												);
											})}
										</div>
									</div>
								</div>

								{typeof r.coachFeedback === "string" && r.coachFeedback.trim() !== "" && (
									<div className="mt-4 rounded border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3 text-sm text-[var(--color-primary-800)]">
										<span className="font-medium">{t("feedback.title")}:</span> {r.coachFeedback}
									</div>
								)}
							</Card>
						);
					})}
				</div>
			)}

			<div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
				<p className="text-sm text-slate-600">
					{t("pager.showing", {
						from: total ? sliceFrom + 1 : 0,
						to: Math.min(sliceFrom + pageSize, total),
						total,
					})}
				</p>
				<div className="flex items-center gap-2">
					<button
						disabled={page <= 1}
						onClick={() => setPageAndScrollTop(page - 1)}
						className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("pager.prev")}
					</button>
					<span className="text-sm font-medium text-slate-900">
						{page}/{pageCount}
					</span>
					<button
						disabled={page >= pageCount}
						onClick={() => setPageAndScrollTop(page + 1)}
						className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("pager.next")}
					</button>
				</div>
			</div>

			<ReportModal open={open} report={selected} onClose={closeReport} onPrev={currentIndex > 0 ? goPrev : null} onNext={currentIndex < deduped.length - 1 ? goNext : null} t={t} />
		</motion.div>
	);
}