'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Boxes,
	Braces,
	CheckCircle2,
	Clapperboard,
	Download,
	ExternalLink,
	FileCode2,
	Globe,
	Image as ImageIcon,
	LayoutDashboard,
	Loader2,
	Moon,
	Palette,
	RotateCw,
	ScanSearch,
	ShieldCheck,
	Sun,
	X,
	Layers,
	AlertCircle,
	History,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { siteInspectorApi } from '@/lib/site-inspector/site-inspector-api';
import { cn } from '@/lib/utils';
import AnimationsTab from './tabs/AnimationsTab';
import AssetsTab from './tabs/AssetsTab';
import ComponentsTab from './tabs/ComponentsTab';
import DesignTab from './tabs/DesignTab';
import OverviewTab from './tabs/OverviewTab';
import SourceTab from './tabs/SourceTab';
import TechTab from './tabs/TechTab';
import { Pill } from './ui';

const THEME_KEY = 'site-inspector:theme';
const RECENT_KEY = 'site-inspector:recent';
const STAGES = [
	{ key: 'stageSecurity', at: 0 },
	{ key: 'stageFetch', at: 1.2 },
	{ key: 'stageRender', at: 3 },
	{ key: 'stageScroll', at: 6 },
	{ key: 'stageScreenshot', at: 8.5 },
	{ key: 'stageDom', at: 10 },
	{ key: 'stageResponsive', at: 12 },
	{ key: 'stageCss', at: 15 },
	{ key: 'stageReport', at: 18 },
];
const EXAMPLES = ['vercel.com', 'linear.app', 'stripe.com', 'tailwindcss.com'];

function useScopedTheme() {
	const [dark, setDark] = useState(false);
	useEffect(() => {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved === 'dark' || saved === 'light') {
			setDark(saved === 'dark');
			return undefined;
		}
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		setDark(media.matches);
		const onChange = (event) => setDark(event.matches);
		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	}, []);
	const toggle = () =>
		setDark((current) => {
			localStorage.setItem(THEME_KEY, current ? 'light' : 'dark');
			return !current;
		});
	return { dark, toggle };
}

function readRecent() {
	try {
		const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
		return Array.isArray(list) ? list.filter((x) => typeof x === 'string').slice(0, 6) : [];
	} catch {
		return [];
	}
}

function errorMessage(err, fallback) {
	const msg = err?.response?.data?.message;
	return (Array.isArray(msg) ? msg[0] : msg) || err?.message || fallback;
}

function Progress({ elapsed, onCancel }) {
	const t = useTranslations('siteInspector');
	const current = STAGES.reduce((idx, s, i) => (elapsed >= s.at ? i : idx), 0);
	const pct = Math.min(96, (elapsed / 22) * 100);
	return (
		<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
			<div className="mb-4 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Loader2 className="size-4 animate-spin text-indigo-500" />
					<p className="text-sm font-semibold text-slate-900 dark:text-white">{t('analyzing')}</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="font-mono text-xs text-slate-400">{elapsed.toFixed(0)}s</span>
					<button type="button" onClick={onCancel} className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
						<X className="size-3.5" />
						{t('cancel')}
					</button>
				</div>
			</div>
			<div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
				<motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.8 }} />
			</div>
			<ol className="space-y-2">
				{STAGES.map((s, i) => (
					<li key={s.key} className={cn('flex items-center gap-2.5 text-xs transition-colors', i > current ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200')}>
						{i < current ? <CheckCircle2 className="size-4 text-emerald-500" /> : i === current ? <Loader2 className="size-4 animate-spin text-indigo-500" /> : <span className="grid size-4 place-items-center"><span className="size-1.5 rounded-full bg-current" /></span>}
						{t(s.key)}
					</li>
				))}
			</ol>
			<p className="mt-4 text-[11px] text-slate-400">{t('analyzingHint')}</p>
		</motion.div>
	);
}

function Intro({ onPick }) {
	const t = useTranslations('siteInspector');
	const features = [
		[Layers, 'featTech'],
		[Palette, 'featDesign'],
		[Boxes, 'featComponents'],
		[Clapperboard, 'featAnimations'],
		[ImageIcon, 'featAssets'],
		[FileCode2, 'featSource'],
	];
	return (
		<div className="space-y-6">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{features.map(([Icon, key], i) => (
					<motion.div
						key={key}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05 }}
						className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
					>
						<span className="mb-3 grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
							<Icon className="size-4" />
						</span>
						<p className="text-sm font-semibold text-slate-900 dark:text-white">{t(`${key}Title`)}</p>
						<p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t(`${key}Body`)}</p>
					</motion.div>
				))}
			</div>
			<div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200">
				<ShieldCheck className="mt-0.5 size-4 shrink-0" />
				<p>{t('introDisclaimer')}</p>
			</div>
			<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
				<span>{t('tryExample')}</span>
				{EXAMPLES.map((ex) => (
					<button key={ex} type="button" onClick={() => onPick(ex)} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-slate-700 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
						{ex}
					</button>
				))}
			</div>
		</div>
	);
}

export default function SiteInspectorApp() {
	const t = useTranslations('siteInspector');
	const { dark, toggle } = useScopedTheme();
	const [url, setUrl] = useState('');
	const [status, setStatus] = useState('idle');
	const [error, setError] = useState('');
	const [report, setReport] = useState(null);
	const [elapsed, setElapsed] = useState(0);
	const [tab, setTab] = useState('overview');
	const [selected, setSelected] = useState(null);
	const [recent, setRecent] = useState([]);
	const abortRef = useRef(null);
	const timerRef = useRef(null);

	useEffect(() => {
		setRecent(readRecent());
		return () => {
			abortRef.current?.abort();
			clearInterval(timerRef.current);
		};
	}, []);

	const analyze = useCallback(
		async (target) => {
			const value = String(target ?? url).trim();
			if (!value || status === 'loading') return;
			setUrl(value);
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;
			setStatus('loading');
			setError('');
			setSelected(null);
			const started = Date.now();
			setElapsed(0);
			clearInterval(timerRef.current);
			timerRef.current = setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
			try {
				const res = await siteInspectorApi.analyze(value, controller.signal);
				setReport(res.data);
				setTab('overview');
				setStatus('done');
				const next = [value, ...readRecent().filter((x) => x !== value)].slice(0, 6);
				localStorage.setItem(RECENT_KEY, JSON.stringify(next));
				setRecent(next);
			} catch (err) {
				if (controller.signal.aborted || err?.code === 'ERR_CANCELED') {
					setStatus(report ? 'done' : 'idle');
				} else {
					setError(errorMessage(err, t('analyzeFailed')));
					setStatus('error');
				}
			} finally {
				clearInterval(timerRef.current);
			}
		},
		[url, status, report, t],
	);

	const cancel = () => abortRef.current?.abort();

	const exportJson = () => {
		if (!report) return;
		const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
		const href = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = href;
		a.download = `site-analysis-${new URL(report.finalUrl).hostname}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(href), 1000);
	};

	const tabs = useMemo(() => {
		if (!report) return [];
		return [
			{ id: 'overview', icon: LayoutDashboard, count: null },
			{ id: 'tech', icon: Layers, count: report.tech?.length },
			{ id: 'design', icon: Palette, count: report.design?.colors?.palette?.length },
			{ id: 'components', icon: Boxes, count: (report.components?.buttons?.length || 0) + (report.components?.cards?.length || 0) + (report.components?.inputs?.length || 0) },
			{ id: 'animations', icon: Clapperboard, count: (report.animations?.summary?.keyframes || 0) + (report.animations?.summary?.running || 0) },
			{ id: 'assets', icon: ImageIcon, count: report.assets?.summary?.images },
			{ id: 'source', icon: Braces, count: null },
		];
	}, [report]);

	const hostname = useMemo(() => {
		try {
			return report ? new URL(report.finalUrl).hostname : '';
		} catch {
			return '';
		}
	}, [report]);

	return (
		<div className={cn('min-h-full', dark && 'dark')}>
			<div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
				<div className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_10%_0%,rgba(99,102,241,0.12),transparent_60%),radial-gradient(50%_100%_at_90%_0%,rgba(217,70,239,0.08),transparent_60%)]" />
					<div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
						<div className="mb-5 flex items-start justify-between gap-3">
							<div className="flex min-w-0 items-center gap-3">
								<span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25">
									<ScanSearch className="size-5" />
								</span>
								<div className="min-w-0">
									<h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{t('title')}</h1>
									<p className="truncate text-xs text-slate-500 sm:text-[13px] dark:text-slate-400">{t('subtitle')}</p>
								</div>
							</div>
							<button type="button" onClick={toggle} className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={t('toggleTheme')}>
								{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
							</button>
						</div>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								analyze();
							}}
							className="flex flex-col gap-2 sm:flex-row"
						>
							<label className="relative flex-1">
								<Globe className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
								<input
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder="https://example.com"
									inputMode="url"
									autoComplete="url"
									spellCheck={false}
									maxLength={2048}
									dir="ltr"
									aria-label={t('urlLabel')}
									className="h-12 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-3 font-mono text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900"
								/>
							</label>
							<button
								type="submit"
								disabled={!url.trim() || status === 'loading'}
								className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
							>
								{status === 'loading' ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
								{t('analyze')}
							</button>
						</form>
						{recent.length > 0 && (
							<div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
								<History className="size-3.5" />
								{recent.map((r) => (
									<button key={r} type="button" onClick={() => analyze(r)} disabled={status === 'loading'} className="max-w-[220px] truncate rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300" dir="ltr">
										{r}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
					{status === 'loading' && <Progress elapsed={elapsed} onCancel={cancel} />}

					{status === 'error' && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
							<AlertCircle className="mt-0.5 size-5 shrink-0" />
							<div className="min-w-0 flex-1">
								<p className="font-semibold">{t('analyzeFailed')}</p>
								<p className="mt-0.5 break-words text-xs">{error}</p>
							</div>
							<button type="button" onClick={() => analyze()} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-medium text-rose-700 shadow-sm dark:bg-rose-500/20 dark:text-rose-100">
								<RotateCw className="size-3.5" />
								{t('retry')}
							</button>
						</motion.div>
					)}

					{status === 'idle' && !report && <Intro onPick={analyze} />}

					{report && status !== 'loading' && (
						<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<div className="flex min-w-0 items-center gap-3">
									{report.page?.favicon && /^https?:/.test(report.page.favicon) ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={report.page.favicon} alt="" referrerPolicy="no-referrer" className="size-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1 dark:border-slate-700" />
									) : (
										<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800">
											<Globe className="size-4 text-slate-400" />
										</span>
									)}
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">{report.page?.title || hostname}</p>
										<a href={report.finalUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-indigo-600 hover:underline dark:text-indigo-300" dir="ltr">
											{report.finalUrl}
											<ExternalLink className="size-3 shrink-0" />
										</a>
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Pill tone={report.mode === 'browser' ? 'emerald' : 'amber'}>{report.mode === 'browser' ? t('modeBrowser') : t('modeStatic')}</Pill>
									<Pill>{(report.durationMs / 1000).toFixed(1)}s</Pill>
									<Pill>{new Date(report.analyzedAt).toLocaleString()}</Pill>
									<button type="button" onClick={exportJson} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
										<Download className="size-3.5" />
										{t('exportJson')}
									</button>
									<button type="button" onClick={() => analyze(report.url)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
										<RotateCw className="size-3.5" />
										{t('reanalyze')}
									</button>
								</div>
							</div>

							<Tabs value={tab} onValueChange={setTab} className="gap-4">
								<div className="sticky top-0 z-20 -mx-4 bg-slate-50/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 dark:bg-slate-950/85">
									<TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
										{tabs.map(({ id, icon: Icon, count }) => (
											<TabsTrigger
												key={id}
												value={id}
												className="h-9 flex-none gap-1.5 rounded-lg px-3 text-[13px] text-slate-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-200"
											>
												<Icon className="size-4" />
												{t(`tab_${id}`)}
												{count ? <span className="rounded-md bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{count}</span> : null}
											</TabsTrigger>
										))}
									</TabsList>
								</div>
								<AnimatePresence mode="wait">
									<motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
										<TabsContent value="overview">
											<OverviewTab report={report} selected={selected} onSelect={setSelected} />
										</TabsContent>
										<TabsContent value="tech">
											<TechTab report={report} />
										</TabsContent>
										<TabsContent value="design">
											<DesignTab report={report} />
										</TabsContent>
										<TabsContent value="components">
											<ComponentsTab report={report} selected={selected} onSelect={setSelected} />
										</TabsContent>
										<TabsContent value="animations">
											<AnimationsTab report={report} />
										</TabsContent>
										<TabsContent value="assets">
											<AssetsTab report={report} />
										</TabsContent>
										<TabsContent value="source">
											<SourceTab report={report} />
										</TabsContent>
									</motion.div>
								</AnimatePresence>
							</Tabs>
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
}
