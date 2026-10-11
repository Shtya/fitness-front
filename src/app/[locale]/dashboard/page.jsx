'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
	AlertCircle, ArrowLeft, ArrowRight, Bell, CheckCircle2, Dumbbell, FileText,
	Inbox, MessageCircle, RefreshCw, Utensils, UserPlus, Video,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import api from '@/utils/axios';
import '@/components/pages/dashboard/users/roster/roster.css';
import './dashboard-home.css';

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

const TIER_COLORS = ['var(--color-primary-600)', '#f59e0b', 'var(--color-primary-300)', '#a855f7', '#10b981', '#64748b'];

// Arabic month names, Western digits — matches the numbers everywhere else in the app.
const intlLocale = (locale) => (locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');

const fmtDay = (d, locale) =>
	new Date(d).toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric' });

function isoLocal(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function lastDays(count) {
	const to = new Date();
	const from = new Date();
	from.setDate(to.getDate() - (count - 1));
	return { from: isoLocal(from), to: isoLocal(to) };
}

const PRESETS = [7, 14, 30];

function initials(name) {
	const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '#';
	return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function useCount(target) {
	const reduce = useReducedMotion();
	const [value, setValue] = useState(reduce ? target : 0);
	useEffect(() => {
		if (reduce) { setValue(target); return undefined; }
		let frame = 0;
		const start = performance.now();
		const tick = (now) => {
			const t = Math.min(1, (now - start) / 700);
			setValue(Math.round(target * (1 - (1 - t) ** 3)));
			if (t < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, reduce]);
	return value;
}

function Card({ children, className = '', delay = 0, as: Tag = 'section', ...rest }) {
	const reduce = useReducedMotion();
	const M = motion[Tag] || motion.section;
	return (
		<M
			initial={reduce ? false : { opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: reduce ? 0 : delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
			className={`dh-card ${className}`}
			{...rest}
		>
			{children}
		</M>
	);
}

function CardHead({ title, sub, right }) {
	return (
		<header className="dh-card__head">
			<div className="min-w-0">
				<h2 className="dh-card__title">{title}</h2>
				{sub ? <p className="dh-card__sub">{sub}</p> : null}
			</div>
			{right}
		</header>
	);
}

/* ── Clients ─────────────────────────────────────────────────────────── */

function RosterCard({ kpis, tiers, t, h, locale }) {
	const total = n(kpis.totalClients);
	const active = Math.min(total, n(kpis.activeClients));
	const pct = total ? Math.round((active / total) * 100) : 0;
	const joined = n(kpis.newClients);
	const left = n(kpis.churnedThisRange);
	const net = joined - left;
	const shown = useCount(total);
	const tierTotal = tiers.reduce((s, d) => s + n(d.value), 0);
	const nf = new Intl.NumberFormat(intlLocale(locale));

	return (
		<Card className="dh-roster" delay={0.04}>
			<CardHead title={h('roster.title')} />
			<div className="dh-roster__hero">
				<p className="dh-num dh-num--xl">{nf.format(shown)}</p>
				<div className="dh-roster__share">
					<p className="dh-roster__pct">{h('roster.activeShare', { pct })}</p>
					<div className="dh-meter" role="img" aria-label={h('roster.activeShare', { pct })}>
						<span style={{ width: `${pct}%` }} />
					</div>
					<p className="dh-roster__legend">
						<span><i className="is-on" />{h('roster.active')} {nf.format(active)}</span>
						<span><i />{h('roster.inactive')} {nf.format(total - active)}</span>
					</p>
				</div>
			</div>

			<dl className="dh-roster__stats">
				<div>
					<dt>{h('roster.joined')}</dt>
					<dd className="is-up"><bdi dir="ltr">+{nf.format(joined)}</bdi></dd>
				</div>
				<div>
					<dt>{h('roster.left')}</dt>
					<dd className={left ? 'is-down' : ''}><bdi dir="ltr">{left ? `−${nf.format(left)}` : nf.format(0)}</bdi></dd>
				</div>
				<div>
					<dt>{h('roster.net')}</dt>
					<dd className={net > 0 ? 'is-up' : net < 0 ? 'is-down' : ''}>
						<bdi dir="ltr">{net > 0 ? '+' : net < 0 ? '−' : ''}{nf.format(Math.abs(net))}</bdi>
					</dd>
				</div>
				<div>
					<dt>{h('roster.files')}</dt>
					<dd>{nf.format(n(kpis.assetsUploaded))}</dd>
				</div>
			</dl>

			{tierTotal > 0 ? (
				<div className="dh-tiers">
					<p className="dh-label">{h('roster.tiers')}</p>
					<div className="dh-tiers__bar">
						{tiers.map((d, i) => (
							<span
								key={d.label || i}
								style={{ flexGrow: n(d.value), background: TIER_COLORS[i % TIER_COLORS.length] }}
								title={`${t(`membership.${d.label}`)}: ${n(d.value)}`}
							/>
						))}
					</div>
					<ul className="dh-tiers__list">
						{tiers.map((d, i) => (
							<li key={d.label || i}>
								<i style={{ background: TIER_COLORS[i % TIER_COLORS.length] }} />
								<span className="flex-1 truncate">{t(`membership.${d.label}`)}</span>
								<b>{nf.format(n(d.value))}</b>
								<small>{Math.round((n(d.value) / tierTotal) * 100)}%</small>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</Card>
	);
}

/* ── What needs the coach ─────────────────────────────────────────────── */

function NeedsCard({ kpis, queue, h, locale }) {
	const Forward = locale === 'ar' ? ArrowLeft : ArrowRight;
	const nf = new Intl.NumberFormat(intlLocale(locale));
	const items = [
		{ key: 'reports', value: n(queue.weeklyReportsPending), icon: FileText, href: '/dashboard/reports', tone: 'primary' },
		{ key: 'videos', value: n(queue.videosPending) || n(kpis.pendingExerciseVideos), icon: Video, href: '/dashboard/workouts', tone: 'violet' },
		{ key: 'food', value: n(queue.foodSuggestionsPending), icon: Utensils, href: '/dashboard/nutrition', tone: 'green' },
		{ key: 'forms', value: n(kpis.formsSubmissions), icon: Inbox, href: '/dashboard/intake/responses', tone: 'sky' },
		{ key: 'notifications', value: n(kpis.unreadNotifications), icon: Bell, href: '/dashboard/notifications', tone: 'amber' },
	];
	const open = items.filter((i) => i.value > 0);
	const done = items.filter((i) => i.value === 0);

	return (
		<Card className="dh-needs" delay={0.08}>
			<CardHead
				title={h('needs.title')}
				sub={h('needs.sub')}
				right={open.length ? <span className="dh-badge is-warn">{nf.format(open.length)}</span> : null}
			/>
			{open.length === 0 ? (
				<div className="dh-clear">
					<CheckCircle2 aria-hidden="true" />
					<p>{h('needs.clear')}</p>
				</div>
			) : null}
			<ul className="dh-needs__list">
				{[...open, ...done].map(({ key, value, icon: Icon, href, tone }) => (
					<li key={key}>
						<Link href={href} className={`dh-need is-${tone}${value ? '' : ' is-done'}`}>
							<span className="dh-need__icon" aria-hidden="true"><Icon /></span>
							<span className="dh-need__label">{h(`needs.${key}`)}</span>
							{value ? (
								<b className="dh-need__count">{nf.format(value)}</b>
							) : (
								<CheckCircle2 className="dh-need__ok" aria-hidden="true" />
							)}
							<Forward className="dh-need__arrow" aria-hidden="true" />
						</Link>
					</li>
				))}
			</ul>
		</Card>
	);
}

/* ── Activity ─────────────────────────────────────────────────────────── */

function ActivityTooltip({ active, payload, label, locale, name }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="dh-tip">
			<p>{fmtDay(label, locale)}</p>
			<b>{payload[0].value}</b> <span>{name}</span>
		</div>
	);
}

function ActivityCard({ series, t, h, locale, from, to }) {
	const tabs = [
		{ key: 'exercise', label: t('charts.exerciseVolume'), icon: Dumbbell, data: series.exerciseVolumeDaily || [], color: 'var(--color-primary-500)' },
		{ key: 'meals', label: t('charts.mealLogs'), icon: Utensils, data: series.mealLogsDaily || [], color: '#10b981' },
		{ key: 'clients', label: t('charts.newUsers'), icon: UserPlus, data: series.usersCreatedDaily || [], color: '#f59e0b' },
	];
	const [tab, setTab] = useState('exercise');
	const current = tabs.find((x) => x.key === tab) || tabs[0];
	const rows = [...current.data].sort((a, b) => String(a.date).localeCompare(String(b.date)));
	const values = rows.map((r) => n(r.value));
	const total = values.reduce((s, v) => s + v, 0);
	const peak = values.length ? Math.max(...values) : 0;
	const activeDays = values.filter((v) => v > 0).length;
	const avg = values.length ? total / values.length : 0;
	const nf = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 });
	const sub = h('activity.sub', { from: fmtDay(from, locale), to: fmtDay(to, locale) });

	return (
		<Card className="dh-activity" delay={0.12}>
			<CardHead
				title={h('activity.title')}
				sub={sub}
				right={(
					<div className="dh-tabs" role="tablist" aria-label={h('activity.title')}>
						{tabs.map(({ key, label, icon: Icon }) => (
							<button
								key={key}
								type="button"
								role="tab"
								aria-selected={tab === key}
								onClick={() => setTab(key)}
								className="dh-tab"
							>
								<Icon aria-hidden="true" />
								{label}
							</button>
						))}
					</div>
				)}
			/>
			<dl className="dh-activity__stats" style={{ '--tone': current.color }}>
				<div><dt>{h('activity.total')}</dt><dd className="dh-num">{nf.format(total)}</dd></div>
				<div><dt>{h('activity.avg')}</dt><dd className="dh-num">{nf.format(avg)}</dd></div>
				<div><dt>{h('activity.peak')}</dt><dd className="dh-num">{nf.format(peak)}</dd></div>
				<div><dt>{h('activity.activeDays')}</dt><dd className="dh-num">{nf.format(activeDays)}<small>/{nf.format(values.length)}</small></dd></div>
			</dl>
			<div className="dh-activity__chart" dir="ltr" role="img" aria-label={`${current.label}: ${sub}`}>
				{rows.length ? (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -8 }} barCategoryGap="22%">
							<CartesianGrid stroke="var(--gm-line)" strokeDasharray="3 5" vertical={false} />
							<XAxis
								dataKey="date"
								tickFormatter={(d) => fmtDay(d, locale)}
								tick={{ fill: 'var(--gm-faint)', fontSize: 11 }}
								axisLine={false}
								tickLine={false}
								interval="preserveStartEnd"
								minTickGap={18}
							/>
							<YAxis tick={{ fill: 'var(--gm-faint)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
							<Tooltip
								cursor={{ fill: 'color-mix(in srgb, var(--gm-muted) 9%, transparent)', radius: 8 }}
								content={<ActivityTooltip locale={locale} name={current.label} />}
							/>
							<Bar dataKey="value" radius={[7, 7, 3, 3]} isAnimationActive>
								{rows.map((r) => (
									<Cell
										key={r.date}
										fill={current.color}
										fillOpacity={n(r.value) === peak && peak > 0 ? 1 : 0.38}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				) : (
					<p className="dh-empty">{t('empty.noData')}</p>
				)}
			</div>
		</Card>
	);
}

/* ── Training consistency ─────────────────────────────────────────────── */

function ConsistencyCard({ data, h, locale }) {
	const rows = [...data].sort((a, b) => String(a.date).localeCompare(String(b.date)));
	const values = rows.map((r) => n(r.value));
	const max = Math.max(1, ...values);
	const active = values.filter((v) => v > 0).length;
	const pct = rows.length ? Math.round((active / rows.length) * 100) : 0;
	const cols = rows.length <= 16 ? rows.length || 1 : Math.ceil(rows.length / 2);
	const nf = new Intl.NumberFormat(intlLocale(locale));
	const level = (v) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));

	return (
		<Card className="dh-consistency" delay={0.16}>
			<CardHead title={h('consistency.title')} sub={h('consistency.sub')} />
			<div className="dh-consistency__top">
				<p className="dh-num dh-num--lg">{nf.format(pct)}<small>%</small></p>
				<p className="dh-consistency__of">{h('consistency.ofDays', { active: nf.format(active), days: nf.format(rows.length) })}</p>
			</div>
			<div className="dh-heat" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
				{rows.map((r) => {
					const v = n(r.value);
					return (
						<span key={r.date} className={`dh-heat__cell is-${level(v)}`} title={`${fmtDay(r.date, locale)} · ${v}`}>
							<b>{new Date(r.date).getDate()}</b>
						</span>
					);
				})}
			</div>
			<div className="dh-heat__legend" aria-hidden="true">
				<span>{h('consistency.less')}</span>
				{[0, 1, 2, 3, 4].map((l) => <i key={l} className={`dh-heat__cell is-${l}`} />)}
				<span>{h('consistency.more')}</span>
			</div>
		</Card>
	);
}

/* ── Conversations ───────────────────────────────────────────────────── */

function ConversationsCard({ data, t, h, locale }) {
	const total = data.reduce((s, d) => s + n(d.messages), 0);
	const max = Math.max(1, ...data.map((d) => n(d.messages)));
	const nf = new Intl.NumberFormat(intlLocale(locale));
	const Forward = locale === 'ar' ? ArrowLeft : ArrowRight;

	return (
		<Card className="dh-convos" delay={0.2}>
			<CardHead
				title={t('charts.topConversations')}
				sub={`${nf.format(total)} ${t('charts.totalMessages')}`}
				right={(
					<Link href="/dashboard/whatsapp" className="dh-link">
						<MessageCircle aria-hidden="true" />
						{h('conversations.open')}
						<Forward aria-hidden="true" className="dh-link__arrow" />
					</Link>
				)}
			/>
			{data.length === 0 ? (
				<p className="dh-empty">{t('empty.noData')}</p>
			) : (
				<ol className="dh-convos__list">
					{data.map((d, i) => {
						const name = d.name || `${t('charts.conversation')} ${i + 1}`;
						const share = total ? Math.round((n(d.messages) / total) * 100) : 0;
						return (
							<li key={d.conversationId || i}>
								<span className={`dh-avatar${d.name ? '' : ' is-anon'}`} aria-hidden="true">
									{d.name ? initials(d.name) : i + 1}
								</span>
								<div className="min-w-0 flex-1">
									<div className="dh-convos__row">
										<span className="truncate" dir="auto">{name}</span>
										<b>{nf.format(n(d.messages))}</b>
									</div>
									<div className="dh-convos__track" title={h('conversations.share', { pct: share })}>
										<span style={{ width: `${(n(d.messages) / max) * 100}%` }} />
									</div>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</Card>
	);
}

/* ── Loading ─────────────────────────────────────────────────────────── */

function DashboardSkeleton() {
	return (
		<div className="dh-grid" aria-busy="true">
			<div className="dh-skel dh-roster" />
			<div className="dh-skel dh-needs" />
			<div className="dh-skel dh-activity" />
			<div className="dh-skel dh-consistency" />
			<div className="dh-skel dh-convos" />
		</div>
	);
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DashboardPage({ PREVIEW = false, api: apiClient = api }) {
	const t = useTranslations('dashboard');
	const h = useTranslations('dashboard.home');
	const locale = useLocale();
	const initialRange = lastDays(14);
	const [data, setData] = useState(PREVIEW ? PREVIEW_DATA : null);
	const [loading, setLoading] = useState(!PREVIEW);
	const [err, setErr] = useState('');
	const [from, setFrom] = useState(initialRange.from);
	const [to, setTo] = useState(initialRange.to);
	const [preset, setPreset] = useState(14);
	const [updatedAt, setUpdatedAt] = useState(null);
	const [userName, setUserName] = useState('');
	const [hour, setHour] = useState(null);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		try {
			const u = JSON.parse(localStorage.getItem('user') || 'null');
			setUserName((u?.name || u?.email || '').split(/[\s@]/)[0]);
		} catch {
			/* no stored user */
		}
		setHour(new Date().getHours());
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const fetchStats = useCallback(async () => {
		if (PREVIEW || !from || !to || from > to) return;
		setLoading(true);
		setErr('');
		try {
			const res = await apiClient.get('/admin/stats', { params: { from, to } });
			setData(res.data);
			setUpdatedAt(new Date());
		} catch (e) {
			setErr(e?.response?.data?.message || t('error.loadFailed'));
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [PREVIEW, apiClient, from, to, t]);

	// Refetch whenever the period changes.
	useEffect(() => { fetchStats(); }, [fetchStats]);

	const pickPreset = (days) => {
		setPreset(days);
		if (days) {
			const r = lastDays(days);
			setFrom(r.from);
			setTo(r.to);
		}
	};

	const { kpis, series, breakdowns, reviewsQueue } = data || {};
	const pending = useMemo(() => {
		if (!kpis) return 0;
		const q = reviewsQueue || {};
		return [q.weeklyReportsPending, q.videosPending || kpis.pendingExerciseVideos, q.foodSuggestionsPending, kpis.formsSubmissions, kpis.unreadNotifications]
			.filter((v) => n(v) > 0).length;
	}, [kpis, reviewsQueue]);

	const greetingKey = hour == null ? null : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
	const showSkeleton = loading && !kpis;
	const dateInput = 'dh-date';

	return (
		<div className="gm-surface rs-scope dh app-stack pb-6">
			<header className="dh-top">
				<div className="min-w-0">
					<p className="dh-eyebrow">
						{new Date().toLocaleDateString(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' })}
					</p>
					<h1 className="dh-title">
						{greetingKey && userName ? h(`greeting.${greetingKey}`, { name: userName }) : t('title')}
					</h1>
					{kpis ? (
						<p className="dh-summary">
							{h('summary', { active: n(kpis.activeClients), total: n(kpis.totalClients), pending })}
						</p>
					) : null}
				</div>

				<div className="dh-controls">
					<div className="dh-range" role="group" aria-label={h('range.label')}>
						{PRESETS.map((d) => (
							<button key={d} type="button" aria-pressed={preset === d} onClick={() => pickPreset(d)}>
								{h(`range.d${d}`)}
							</button>
						))}
						<button type="button" aria-pressed={preset === 0} onClick={() => pickPreset(0)}>
							{h('range.custom')}
						</button>
					</div>
					<button
						type="button"
						onClick={fetchStats}
						disabled={loading || PREVIEW}
						className="dh-refresh"
						aria-label={t('refresh')}
						title={updatedAt ? h('updated', { time: updatedAt.toLocaleTimeString(intlLocale(locale), { hour: 'numeric', minute: '2-digit' }) }) : t('refresh')}
					>
						<RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" />
					</button>
				</div>

				{preset === 0 ? (
					<div className="dh-custom">
						<label>
							{t('filters.from')}
							<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
						</label>
						<label>
							{t('filters.to')}
							<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={dateInput} />
						</label>
					</div>
				) : null}
			</header>

			{err ? (
				<div role="alert" className="dh-alert">
					<span><AlertCircle aria-hidden="true" />{err}</span>
					<button type="button" onClick={fetchStats}>{t('error.retry')}</button>
				</div>
			) : null}

			{showSkeleton ? <DashboardSkeleton /> : null}

			{!showSkeleton && !kpis && !err ? (
				<Card>
					<p className="dh-card__title">{t('empty.title')}</p>
					<p className="dh-card__sub">{t('empty.subtitle')}</p>
				</Card>
			) : null}

			{!showSkeleton && kpis ? (
				<div className={`dh-grid${loading ? ' is-loading' : ''}`}>
					<RosterCard kpis={kpis} tiers={breakdowns?.membershipCounts || []} t={t} h={h} locale={locale} />
					<NeedsCard kpis={kpis} queue={reviewsQueue || {}} h={h} locale={locale} />
					{series ? <ActivityCard series={series} t={t} h={h} locale={locale} from={from} to={to} /> : null}
					{series ? <ConsistencyCard data={series.exerciseVolumeDaily || []} h={h} locale={locale} /> : null}
					{breakdowns ? (
						<ConversationsCard data={breakdowns.messagesPerConversationTop5 || []} t={t} h={h} locale={locale} />
					) : null}
				</div>
			) : null}
		</div>
	);
}
