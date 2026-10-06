'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import {
	AreaChart, Area, BarChart, Bar,
	XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
	Users, UserPlus, Bell, FileText, Activity, Utensils,
	MessageSquare, Clock, Award, Zap, BarChart2, RefreshCw,
	AlertCircle, TrendingUp, Dumbbell, CheckCircle2, XCircle,
	Sparkles, Star, Shield, Flame,
} from 'lucide-react';
import GmStatCard from '@/components/molecules/GmStatCard';
import api from '@/utils/axios';
import '@/components/pages/dashboard/users/roster/roster.css';

const PREVIEW_DATA = {
	kpis: {
		totalClients: 38, activeClients: 38, newClients: 1,
		churnedThisRange: 0, formsSubmissions: 4, unreadNotifications: 129,
		assetsUploaded: 0, pendingExerciseVideos: 0,
	},
	series: {
		usersCreatedDaily: [
			{ date: '2026-02-28', value: 0 }, { date: '2026-03-01', value: 0 },
			{ date: '2026-03-02', value: 0 }, { date: '2026-03-03', value: 0 },
			{ date: '2026-03-04', value: 0 }, { date: '2026-03-05', value: 0 },
			{ date: '2026-03-06', value: 0 }, { date: '2026-03-07', value: 0 },
			{ date: '2026-03-08', value: 0 }, { date: '2026-03-09', value: 0 },
			{ date: '2026-03-10', value: 0 }, { date: '2026-03-11', value: 1 },
			{ date: '2026-03-12', value: 0 },
		],
		exerciseVolumeDaily: [
			{ date: '2026-02-28', value: 2 }, { date: '2026-03-01', value: 5 },
			{ date: '2026-03-02', value: 8 }, { date: '2026-03-03', value: 4 },
			{ date: '2026-03-04', value: 11 }, { date: '2026-03-05', value: 7 },
			{ date: '2026-03-06', value: 9 }, { date: '2026-03-07', value: 14 },
			{ date: '2026-03-08', value: 6 }, { date: '2026-03-09', value: 10 },
			{ date: '2026-03-10', value: 8 }, { date: '2026-03-11', value: 16 },
			{ date: '2026-03-12', value: 5 },
		],
		mealLogsDaily: [
			{ date: '2026-02-28', value: 0 }, { date: '2026-03-01', value: 1 },
			{ date: '2026-03-02', value: 0 }, { date: '2026-03-03', value: 5 },
			{ date: '2026-03-04', value: 7 }, { date: '2026-03-05', value: 1 },
			{ date: '2026-03-06', value: 1 }, { date: '2026-03-07', value: 3 },
			{ date: '2026-03-08', value: 0 }, { date: '2026-03-09', value: 0 },
			{ date: '2026-03-10', value: 3 }, { date: '2026-03-11', value: 4 },
			{ date: '2026-03-12', value: 0 },
		],
	},
	breakdowns: {
		membershipCounts: [
			{ label: 'basic', value: 34 },
			{ label: 'gold', value: 2 },
			{ label: 'platinum', value: 2 },
		],
		messagesPerConversationTop5: [
			{ conversationId: '1', name: null, messages: 70 },
			{ conversationId: '2', name: null, messages: 29 },
			{ conversationId: '3', name: null, messages: 17 },
			{ conversationId: '4', name: null, messages: 7 },
			{ conversationId: '5', name: null, messages: 7 },
		],
	},
	reviewsQueue: { weeklyReportsPending: 1, videosPending: 0, foodSuggestionsPending: 0 },
};

const n = (v) => Number(v) || 0;

const INK = {
	primary: 'var(--color-primary-500)',
	secondary: 'var(--color-secondary-500)',
	ok: 'var(--gm-ok)',
	warn: 'var(--gm-warn)',
	danger: 'var(--gm-danger)',
};

const fmtDate = (d, locale) =>
	new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
		month: 'short', day: 'numeric',
	});

function isoLocal(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function last13Days() {
	const to = new Date();
	const from = new Date();
	from.setDate(to.getDate() - 12);
	return { from: isoLocal(from), to: isoLocal(to) };
}

const axisTick = { fill: 'var(--gm-faint)', fontSize: 11 };

function ChartTooltip({ active, payload, label, locale }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-[var(--gm-line)] bg-[var(--gm-paper)] px-3.5 py-2.5 text-xs shadow-[var(--gm-shadow-2)]">
			<p className="mb-2 border-b border-[var(--gm-line)] pb-1.5 font-medium text-[var(--gm-muted)]">
				{fmtDate(label, locale)}
			</p>
			{payload.map((p, i) => (
				<div key={i} className="mt-1 flex items-center gap-2">
					<span className="size-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
					<span className="text-[var(--gm-muted)]">{p.name}</span>
					<span className="ms-auto ps-3 font-bold tabular-nums text-[var(--gm-ink)]">{p.value}</span>
				</div>
			))}
		</div>
	);
}

function Panel({ children, className = '', delay = 0 }) {
	const reduce = useReducedMotion();
	return (
		<motion.section
			initial={reduce ? false : { opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: reduce ? 0 : delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
			className={`h-full rounded-[20px] border border-[var(--gm-line)] bg-[var(--gm-paper)] p-4 shadow-[var(--gm-shadow-3d)] sm:p-5 ${className}`}
		>
			{children}
		</motion.section>
	);
}

function PanelHead({ icon: Icon, title, subtitle, tone = 'gm-chip', right }) {
	return (
		<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
			<div className="flex min-w-0 items-center gap-3">
				<div className={`grid size-10 shrink-0 place-items-center rounded-[13px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ${tone}`}>
					<Icon className="size-4" strokeWidth={1.75} />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-semibold leading-tight text-[var(--gm-ink)]">{title}</p>
					{subtitle ? <p className="mt-0.5 text-xs text-[var(--gm-muted)]">{subtitle}</p> : null}
				</div>
			</div>
			{right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
		</div>
	);
}

function MiniStat({ value, label, color }) {
	return (
		<div className="min-w-[72px] rounded-xl border border-[var(--gm-line)] bg-[color-mix(in_srgb,var(--gm-muted)_6%,var(--gm-paper))] px-2.5 py-1.5 text-center">
			<p className="text-sm font-bold leading-none tabular-nums" style={{ color }}>{value}</p>
			<p className="mt-1 text-[10px] font-medium text-[var(--gm-faint)]">{label}</p>
		</div>
	);
}

function Track({ pct, color, delay = 0 }) {
	const [drawn, setDrawn] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setDrawn(true));
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gm-muted)_14%,transparent)]">
			<div
				className="h-full rounded-full"
				style={{
					width: drawn ? `${pct}%` : '0%',
					background: color,
					transition: `width 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
				}}
			/>
		</div>
	);
}

function ActivityChart({ usersData, mealData, exerciseData, t, locale }) {
	const uKey = t('charts.newUsers');
	const mKey = t('charts.mealLogs');
	const eKey = t('charts.exerciseVolume');
	const byDate = new Map();
	const put = (rows, key) => {
		for (const row of rows || []) {
			if (!row?.date) continue;
			const cur = byDate.get(row.date) || { date: row.date, [uKey]: 0, [mKey]: 0, [eKey]: 0 };
			cur[key] = n(row.value);
			byDate.set(row.date, cur);
		}
	};
	put(usersData, uKey);
	put(mealData, mKey);
	put(exerciseData, eKey);
	const combined = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
	const series = [
		{ key: uKey, color: INK.primary, grad: 'dashUsers' },
		{ key: mKey, color: INK.secondary, grad: 'dashMeals' },
		{ key: eKey, color: INK.ok, grad: 'dashTrain' },
	];
	const totalMeals = mealData.reduce((s, d) => s + n(d.value), 0);
	const totalEx = exerciseData.reduce((s, d) => s + n(d.value), 0);
	const peakMeal = mealData.length ? Math.max(...mealData.map((d) => n(d.value))) : 0;

	return (
		<div className="lg:col-span-2">
			<Panel delay={0.08}>
				<PanelHead
					icon={TrendingUp}
					title={t('charts.activityTrends')}
					subtitle={t('charts.activityTrendsSub')}
					right={(
						<>
							<MiniStat value={totalMeals} label={t('charts.mealLogs')} color={INK.secondary} />
							<MiniStat value={totalEx} label={t('charts.exerciseVolume')} color={INK.ok} />
							<MiniStat value={peakMeal} label={t('charts.peakDay')} color={INK.primary} />
						</>
					)}
				/>
				<div className="h-[230px] w-full" dir="ltr">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={combined} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
							<defs>
								{series.map((s) => (
									<linearGradient key={s.grad} id={s.grad} x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
										<stop offset="100%" stopColor={s.color} stopOpacity={0} />
									</linearGradient>
								))}
							</defs>
							<CartesianGrid strokeDasharray="4 4" stroke="var(--gm-line)" vertical={false} />
							<XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, locale)} tick={axisTick} axisLine={false} tickLine={false} interval={2} />
							<YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
							<Tooltip content={<ChartTooltip locale={locale} />} />
							<Legend wrapperStyle={{ paddingTop: 12, fontSize: 11 }} formatter={(v) => <span style={{ color: 'var(--gm-muted)', fontWeight: 500 }}>{v}</span>} />
							{series.map((s) => (
								<Area
									key={s.key}
									type="monotone"
									dataKey={s.key}
									stroke={s.color}
									strokeWidth={2}
									fill={`url(#${s.grad})`}
									dot={false}
									activeDot={{ r: 4, fill: s.color, stroke: 'var(--gm-paper)', strokeWidth: 2 }}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</Panel>
		</div>
	);
}

function MembershipCard({ data, t }) {
	const total = data.reduce((s, d) => s + n(d.value), 0);
	const tiers = [
		{ color: INK.primary, icon: Shield },
		{ color: INK.warn, icon: Star },
		{ color: INK.secondary, icon: Sparkles },
	];

	return (
		<Panel delay={0.14}>
			<PanelHead
				icon={Award}
				title={t('charts.membershipTiers')}
				subtitle={t('charts.membershipSub')}
				tone="gm-chip-warn"
				right={(
					<div className="text-end">
						<p className="text-2xl font-bold leading-none tabular-nums text-[var(--gm-ink)]">{total}</p>
						<p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--gm-faint)]">{t('kpi.totalClients')}</p>
					</div>
				)}
			/>
			<div className="space-y-4">
				{data.map((d, i) => {
					const tier = tiers[i] || tiers[0];
					const pct = total ? Math.round((n(d.value) / total) * 100) : 0;
					const Icon = tier.icon;
					return (
						<div key={d.label || i}>
							<div className="mb-1.5 flex items-center justify-between gap-2">
								<div className="flex min-w-0 items-center gap-2">
									<span className="grid size-6 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${tier.color} 16%, var(--gm-paper))`, color: tier.color }}>
										<Icon className="size-3" />
									</span>
									<span className="truncate text-sm font-medium text-[var(--gm-ink-soft)]">{t(`membership.${d.label}`)}</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm font-bold tabular-nums text-[var(--gm-ink)]">{n(d.value)}</span>
									<span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white" style={{ background: tier.color }}>{pct}%</span>
								</div>
							</div>
							<Track pct={pct} color={tier.color} delay={120 + i * 80} />
						</div>
					);
				})}
			</div>
			{data.length === 0 ? <p className="text-sm text-[var(--gm-muted)]">{t('empty.noData')}</p> : null}
		</Panel>
	);
}

function MealLogsBar({ data, t, locale }) {
	const logsKey = t('charts.logs');
	const formatted = data.map((d) => ({ date: d.date, [logsKey]: n(d.value) }));
	const total = data.reduce((s, d) => s + n(d.value), 0);
	const avg = data.length ? (total / data.length).toFixed(1) : '0';
	const peak = data.length ? Math.max(...data.map((d) => n(d.value))) : 0;

	return (
		<div className="lg:col-span-2">
			<Panel delay={0.1}>
				<PanelHead
					icon={Utensils}
					title={t('charts.mealLogsTitle')}
					subtitle={t('charts.mealLogsSub')}
					tone="gm-chip-secondary"
					right={(
						<>
							<MiniStat value={total} label={t('charts.total')} color={INK.secondary} />
							<MiniStat value={avg} label={t('charts.dailyAvg')} color={INK.primary} />
							<MiniStat value={peak} label={t('charts.peak')} color={INK.ok} />
						</>
					)}
				/>
				<div className="h-[190px] w-full" dir="ltr">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barSize={16}>
							<CartesianGrid strokeDasharray="4 4" stroke="var(--gm-line)" vertical={false} />
							<XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, locale)} tick={axisTick} axisLine={false} tickLine={false} interval={2} />
							<YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
							<Tooltip content={<ChartTooltip locale={locale} />} cursor={{ fill: 'color-mix(in srgb, var(--gm-muted) 8%, transparent)' }} />
							<Bar dataKey={logsKey} fill={INK.secondary} radius={[6, 6, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</Panel>
		</div>
	);
}

function ExerciseCard({ data, t, locale }) {
	const total = data.reduce((s, d) => s + n(d.value), 0);
	const peak = data.length ? Math.max(...data.map((d) => n(d.value))) : 0;
	const activeDays = data.filter((d) => n(d.value) > 0).length;
	const consistency = data.length ? Math.round((activeDays / data.length) * 100) : 0;
	const [ringPct, setRingPct] = useState(0);
	useEffect(() => {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) { setRingPct(consistency); return; }
		const id = setTimeout(() => setRingPct(consistency), 280);
		return () => clearTimeout(id);
	}, [consistency]);
	const R = 28;
	const circ = 2 * Math.PI * R;
	const heat = [
		'color-mix(in srgb, var(--gm-muted) 16%, transparent)',
		'color-mix(in srgb, var(--color-primary-300) 55%, var(--gm-paper))',
		'color-mix(in srgb, var(--color-primary-400) 78%, var(--gm-paper))',
		'var(--color-primary-500)',
		'var(--color-primary-700)',
	];

	return (
		<Panel delay={0.12}>
			<PanelHead icon={Dumbbell} title={t('charts.exerciseVolume')} subtitle={t('charts.exerciseVolumeSub')} tone="gm-chip-ok" />
			<div className="mb-5 flex items-center gap-4">
				<svg viewBox="0 0 72 72" className="size-[72px] shrink-0" aria-hidden>
					<circle cx="36" cy="36" r={R} fill="none" stroke="var(--gm-line)" strokeWidth="6" />
					<circle
						cx="36" cy="36" r={R} fill="none" stroke="var(--gm-ok)" strokeWidth="6" strokeLinecap="round"
						strokeDasharray={circ}
						strokeDashoffset={circ - (circ * ringPct) / 100}
						transform="rotate(-90 36 36)"
						style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
					/>
					<text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--gm-ink)">{consistency}%</text>
				</svg>
				<div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
					{[
						{ val: total, label: t('charts.totalSessions'), color: INK.primary },
						{ val: peak, label: t('charts.peakDay'), color: INK.ok },
						{ val: `${consistency}%`, label: t('charts.consistency'), color: INK.secondary },
					].map((s) => (
						<div key={s.label} className="rounded-xl border border-[var(--gm-line)] bg-[color-mix(in_srgb,var(--gm-muted)_6%,var(--gm-paper))] px-2 py-2.5 text-center">
							<p className="text-lg font-bold leading-none tabular-nums" style={{ color: s.color }}>{s.val}</p>
							<p className="mt-1.5 text-[10px] font-medium leading-tight text-[var(--gm-faint)]">{s.label}</p>
						</div>
					))}
				</div>
			</div>
			<p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--gm-faint)]">{t('charts.last13Days')}</p>
			<div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5">
				{data.map((d, i) => {
					const v = n(d.value);
					const lvl = v === 0 ? 0 : v < 5 ? 1 : v < 10 ? 2 : v < 14 ? 3 : 4;
					return (
						<div
							key={d.date || i}
							title={`${fmtDate(d.date, locale)}: ${v}`}
							className="aspect-square rounded-[4px] transition-transform duration-150 hover:scale-110"
							style={{ background: heat[lvl] }}
						/>
					);
				})}
			</div>
			<div className="mt-2 flex items-center justify-end gap-1">
				<span className="me-0.5 text-[10px] text-[var(--gm-faint)]">0</span>
				{heat.map((c, i) => <div key={i} className="size-2.5 rounded-[3px]" style={{ background: c }} />)}
				<span className="ms-0.5 text-[10px] text-[var(--gm-faint)]">+</span>
			</div>
		</Panel>
	);
}

function ReviewQueue({ data, t }) {
	const items = [
		{ label: t('charts.weeklyReports'), val: n(data.weeklyReportsPending), icon: FileText, color: INK.primary },
		{ label: t('charts.pendingVideos'), val: n(data.videosPending), icon: Activity, color: INK.secondary },
		{ label: t('charts.foodSuggestions'), val: n(data.foodSuggestionsPending), icon: Utensils, color: INK.ok },
	];
	const anyPending = items.some((i) => i.val > 0);

	return (
		<Panel delay={0.16}>
			<PanelHead
				icon={Clock}
				title={t('charts.reviewQueue')}
				subtitle={t('charts.reviewQueueSub')}
				tone="gm-chip-warn"
				right={anyPending ? (
					<span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{ color: 'var(--gm-warn)', borderColor: 'color-mix(in srgb, var(--gm-warn) 35%, transparent)', background: 'color-mix(in srgb, var(--gm-warn) 12%, var(--gm-paper))' }}>
						<Flame className="size-3" />
						{t('status.requiresAttention')}
					</span>
				) : (
					<span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{ color: 'var(--gm-ok)', borderColor: 'color-mix(in srgb, var(--gm-ok) 35%, transparent)', background: 'color-mix(in srgb, var(--gm-ok) 12%, var(--gm-paper))' }}>
						<CheckCircle2 className="size-3" />
						{t('status.allClear')}
					</span>
				)}
			/>
			<div className="space-y-2">
				{items.map((item) => {
					const Icon = item.icon;
					return (
						<div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-[color-mix(in_srgb,var(--gm-muted)_6%,var(--gm-paper))] px-3.5 py-3 transition-colors hover:border-[var(--gm-line)]">
							<div className="flex min-w-0 items-center gap-2.5">
								<span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${item.color} 14%, var(--gm-paper))`, color: item.color }}>
									<Icon className="size-3.5" />
								</span>
								<span className="truncate text-sm font-medium text-[var(--gm-ink-soft)]">{item.label}</span>
							</div>
							{item.val > 0
								? <span className="text-xl font-bold tabular-nums" style={{ color: item.color }}>{item.val}</span>
								: <CheckCircle2 className="size-[18px] shrink-0 text-[var(--gm-ok)]" />}
						</div>
					);
				})}
			</div>
		</Panel>
	);
}

function TopConversations({ data, t }) {
	const max = Math.max(1, ...data.map((d) => n(d.messages)));
	const palette = [INK.primary, 'var(--color-secondary-600)', INK.secondary, 'var(--color-primary-300)', 'var(--gm-faint)'];
	const totalMsgs = data.reduce((s, d) => s + n(d.messages), 0);

	return (
		<Panel delay={0.18}>
			<PanelHead
				icon={MessageSquare}
				title={t('charts.topConversations')}
				subtitle={t('charts.topConversationsSub')}
				tone="gm-chip-secondary"
				right={(
					<div className="text-end">
						<p className="text-2xl font-bold leading-none tabular-nums" style={{ color: INK.primary }}>{totalMsgs}</p>
						<p className="mt-0.5 text-[10px] text-[var(--gm-faint)]">{t('charts.totalMessages')}</p>
					</div>
				)}
			/>
			{data.length === 0 ? (
				<p className="text-sm text-[var(--gm-muted)]">{t('empty.noData')}</p>
			) : (
				<div className="space-y-3.5">
					{data.map((d, i) => (
						<div key={d.conversationId || i}>
							<div className="mb-1.5 flex items-center justify-between gap-2">
								<div className="flex min-w-0 items-center gap-2">
									<span className="grid size-[18px] shrink-0 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: palette[i] || INK.primary }}>{i + 1}</span>
									<span className="truncate text-sm font-medium text-[var(--gm-ink-soft)]">{d.name || `${t('charts.conversation')} ${i + 1}`}</span>
								</div>
								<div className="flex shrink-0 items-center gap-1">
									<span className="text-sm font-bold tabular-nums" style={{ color: palette[i] || INK.primary }}>{n(d.messages)}</span>
									<span className="text-[11px] text-[var(--gm-muted)]">{t('charts.messages')}</span>
								</div>
							</div>
							<Track pct={(n(d.messages) / max) * 100} color={palette[i] || INK.primary} delay={80 + i * 70} />
						</div>
					))}
				</div>
			)}
		</Panel>
	);
}

function Skel({ className = '' }) {
	return <div className={`animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--gm-muted)_16%,transparent)] ${className}`} />;
}

function DashboardSkeleton() {
	return (
		<div className="space-y-5" aria-busy="true">
			<div className="flex items-center gap-3">
				<Skel className="size-14 rounded-[18px]" />
				<div className="space-y-2">
					<Skel className="h-7 w-40" />
					<Skel className="h-3 w-64" />
				</div>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-[108px] rounded-[20px]" />)}
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Skel className="h-72 rounded-[20px] lg:col-span-2" />
				<Skel className="h-72 rounded-[20px]" />
			</div>
		</div>
	);
}

export default function DashboardPage({ PREVIEW = false, api: apiClient = api }) {
	const t = useTranslations('dashboard');
	const locale = useLocale();
	const initialRange = last13Days();
	const [data, setData] = useState(PREVIEW ? PREVIEW_DATA : null);
	const [loading, setLoading] = useState(!PREVIEW);
	const [err, setErr] = useState('');
	const [from, setFrom] = useState(initialRange.from);
	const [to, setTo] = useState(initialRange.to);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const fetchStats = useCallback(async () => {
		if (PREVIEW) return;
		setLoading(true);
		setErr('');
		try {
			const res = await apiClient.get('/admin/stats', { params: { from, to } });
			setData(res.data);
		} catch (e) {
			setErr(e?.response?.data?.message || t('error.loadFailed'));
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [PREVIEW, apiClient, from, to, t]);

	useEffect(() => { if (!PREVIEW) fetchStats(); }, []);

	const { kpis, series, breakdowns, reviewsQueue } = data || {};
	const peakKpi = kpis
		? Math.max(1, kpis.totalClients, kpis.activeClients, kpis.newClients, kpis.unreadNotifications, kpis.formsSubmissions, kpis.churnedThisRange, kpis.assetsUploaded, kpis.pendingExerciseVideos)
		: 1;
	const metricCards = kpis ? [
		{ title: t('kpi.totalClients'), value: kpis.totalClients, hint: t('kpi.totalClientsSub'), icon: Users, tone: 'gm-chip', stroke: INK.primary, fill: 'var(--color-primary-400)', seed: 0.2, max: peakKpi },
		{ title: t('kpi.activeClients'), value: kpis.activeClients, hint: t('kpi.activeClientsSub'), icon: Zap, tone: 'gm-chip-ok', stroke: INK.ok, fill: INK.ok, seed: 0.6, max: peakKpi },
		{ title: t('kpi.newClients'), value: kpis.newClients, hint: t('kpi.newClientsSub'), icon: UserPlus, tone: 'gm-chip-secondary', stroke: INK.secondary, fill: 'var(--color-secondary-400)', seed: 1, max: peakKpi },
		{ title: t('kpi.notifications'), value: kpis.unreadNotifications, hint: t('kpi.notificationsSub'), icon: Bell, tone: 'gm-chip-warn', stroke: INK.warn, fill: INK.warn, seed: 1.4, max: peakKpi },
		{ title: t('kpi.formSubmissions'), value: kpis.formsSubmissions, hint: t('kpi.formSubmissionsSub'), icon: FileText, tone: 'gm-chip', stroke: INK.primary, fill: 'var(--color-primary-300)', seed: 1.8, max: peakKpi },
		{ title: t('kpi.churned'), value: kpis.churnedThisRange, hint: t('kpi.churnedSub'), icon: XCircle, tone: 'gm-chip-warn', stroke: INK.danger, fill: INK.danger, seed: 2.2, max: peakKpi },
		{ title: t('kpi.assetsUploaded'), value: kpis.assetsUploaded, hint: t('kpi.assetsUploadedSub'), icon: BarChart2, tone: 'gm-chip-secondary', stroke: INK.secondary, fill: 'var(--color-secondary-300)', seed: 2.6, max: peakKpi },
		{ title: t('kpi.pendingVideos'), value: kpis.pendingExerciseVideos, hint: t('kpi.pendingVideosSub'), icon: Activity, tone: 'gm-chip-ok', stroke: INK.ok, fill: INK.ok, seed: 3, max: peakKpi },
	] : [];

	const showSkeleton = loading && !kpis;

	return (
		<div className="gm-surface rs-scope app-stack pb-4">
			<header className="rs-hero">
				<span className="rs-hero__mark" aria-hidden>
					<Activity strokeWidth={1.7} />
				</span>
				<div className="rs-hero__text">
					<h1 className="rs-hero__title">{t('title')}</h1>
					<p className="rs-hero__sub">{t('subtitle')}</p>
					<p className="mt-1 text-[12px] text-[var(--gm-faint)]">{t('dateRange', { from, to })}</p>
				</div>
				<div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
					<label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] font-medium text-[var(--gm-muted)]">
						{t('filters.from')}
						<input
							type="date"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
							className="h-10 rounded-xl border border-[var(--gm-line)] bg-[var(--gm-paper)] px-2 text-[13px] text-[var(--gm-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary-500)_35%,transparent)] dark:[color-scheme:dark]"
						/>
					</label>
					<label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] font-medium text-[var(--gm-muted)]">
						{t('filters.to')}
						<input
							type="date"
							value={to}
							onChange={(e) => setTo(e.target.value)}
							className="h-10 rounded-xl border border-[var(--gm-line)] bg-[var(--gm-paper)] px-2 text-[13px] text-[var(--gm-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary-500)_35%,transparent)] dark:[color-scheme:dark]"
						/>
					</label>
					<button
						type="button"
						onClick={fetchStats}
						disabled={loading || PREVIEW || !from || !to}
						className="rs-btn"
						style={{ width: 'auto' }}
					>
						<RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
						{t('refresh')}
					</button>
				</div>
			</header>

			{err ? (
				<div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-rose-200/70 bg-rose-50/80 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
					<span className="inline-flex items-center gap-2"><AlertCircle className="size-4 shrink-0" />{err}</span>
					<button type="button" onClick={fetchStats} className="text-xs font-bold underline underline-offset-2">{t('error.retry')}</button>
				</div>
			) : null}

			{showSkeleton ? <DashboardSkeleton /> : null}

			{!showSkeleton && !kpis && !err ? (
				<Panel>
					<p className="text-sm font-semibold text-[var(--gm-ink)]">{t('empty.title')}</p>
					<p className="mt-1 text-sm text-[var(--gm-muted)]">{t('empty.subtitle')}</p>
				</Panel>
			) : null}

			{!showSkeleton && kpis ? (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{metricCards.map((card, i) => <GmStatCard key={card.title} card={card} index={i} />)}
				</div>
			) : null}

			{!showSkeleton && series && breakdowns ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<ActivityChart
						usersData={series.usersCreatedDaily || []}
						mealData={series.mealLogsDaily || []}
						exerciseData={series.exerciseVolumeDaily || []}
						t={t}
						locale={locale}
					/>
					<MembershipCard data={breakdowns.membershipCounts || []} t={t} />
				</div>
			) : null}

			{!showSkeleton && series && reviewsQueue ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<MealLogsBar data={series.mealLogsDaily || []} t={t} locale={locale} />
					<ReviewQueue data={reviewsQueue} t={t} />
				</div>
			) : null}

			{!showSkeleton && series && breakdowns ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<ExerciseCard data={series.exerciseVolumeDaily || []} t={t} locale={locale} />
					<TopConversations data={breakdowns.messagesPerConversationTop5 || []} t={t} />
				</div>
			) : null}
		</div>
	);
}
