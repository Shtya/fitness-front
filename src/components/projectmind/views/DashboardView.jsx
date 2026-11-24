'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, Check, CheckCircle2, FileCode2, GitCommit, HelpCircle, Info, MessageSquare, Route, Sparkles, Table2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { errorMessage, pmApi } from '../api';
import { useProjectMind } from '../ProjectMindContext';
import { EmptyState, ErrorState, formatDate, InlineWarning, Panel, PanelTitle, PriorityBadge, RequireProject, Ring, SkeletonRows, StatusPill } from '../ui';

const LANG_COLORS = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-slate-400'];
const STEPS = ['create', 'import', 'analysis', 'ask'];

function Stat({ icon: Icon, label, value, href, tone }) {
	return (
		<Link href={href || '#'} className={cn('group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-300)] hover:shadow-md dark:border-slate-800 dark:bg-slate-900', !href && 'pointer-events-none')}>
			<span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone || 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-slate-800 dark:text-[var(--color-primary-300)]')}>
				<Icon className="size-[18px]" aria-hidden />
			</span>
			<span className="min-w-0">
				<span className="block text-xl font-semibold leading-none tabular-nums text-slate-900 dark:text-slate-50">{value}</span>
				<span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{label}</span>
			</span>
		</Link>
	);
}

function Hero({ d, locale }) {
	const t = useTranslations('projectmind.dashboard');
	const tc = useTranslations('projectmind.chat');
	const router = useRouter();
	const [q, setQ] = useState('');
	const ready = d.project.status === 'ready';
	const go = (text) => {
		const v = (text ?? q).trim();
		router.push(v ? `/dashboard/projectmind/chat?q=${encodeURIComponent(v)}` : '/dashboard/projectmind/chat');
	};
	return (
		<section className="pm-rise relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-lg sm:p-7" aria-labelledby="pm-hero-title">
			<div className="pm-grid pointer-events-none absolute inset-0 opacity-[.18]" aria-hidden />
			<div className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-[var(--color-primary-500)] opacity-25 blur-3xl" aria-hidden />
			<div className="relative">
				<div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
					<StatusPill status={d.project.status} />
					{d.project.commitSha ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
							<GitCommit className="size-3" aria-hidden />
							<bdi dir="ltr" className="font-mono">{d.project.commitSha.slice(0, 8)}</bdi>
						</span>
					) : null}
					<span>{t('analyzedAt', { date: formatDate(d.project.analyzedAt, locale) })}</span>
				</div>
				<h1 id="pm-hero-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" dir="auto">{d.project.name}</h1>
				<p className="mt-1 max-w-2xl text-sm text-slate-300">{t('askTitle')}</p>

				<form
					className="mt-4 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur focus-within:border-white/40 focus-within:bg-white/15"
					onSubmit={(e) => {
						e.preventDefault();
						go();
					}}
				>
					<Sparkles className="ms-2.5 size-4 shrink-0 text-[var(--color-primary-300)]" aria-hidden />
					<label htmlFor="pm-hero-q" className="sr-only">{t('askPlaceholder')}</label>
					<input id="pm-hero-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} disabled={!ready} placeholder={ready ? t('askPlaceholder') : t('askDisabled')} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed" />
					<Button type="submit" size="sm" disabled={!ready} className="bg-white text-slate-900 hover:bg-slate-200">
						{t('askButton')} <ArrowRight className="rtl:rotate-180" />
					</Button>
				</form>
				<div className="mt-3 flex flex-wrap gap-1.5">
					{['q1', 'q2', 'q3', 'q4'].map((k) => (
						<button key={k} type="button" disabled={!ready} onClick={() => go(tc(`suggest.${k}`))} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/15 disabled:opacity-40">
							{tc(`suggest.${k}`)}
						</button>
					))}
				</div>
			</div>
		</section>
	);
}

function Health({ d }) {
	const t = useTranslations('projectmind.dashboard');
	return (
		<Panel className="pm-rise flex flex-col justify-between">
			<PanelTitle>{t('coverage')}</PanelTitle>
			<div className="grid grid-cols-2 gap-4">
				{[
					['docCoverage', d.coverage.documentation],
					['knowledgeCoverage', d.coverage.knowledge],
				].map(([k, c]) => (
					<div key={k} className="flex flex-col items-center gap-2 text-center">
						<Ring value={c.value} label={t(k)} />
						<span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t(k)}</span>
						<details className="text-start text-[11px] text-slate-500 dark:text-slate-400">
							<summary className="cursor-pointer select-none text-center underline-offset-2 hover:underline">{t('howComputed')}</summary>
							<p className="mt-1">{c.method}</p>
						</details>
					</div>
				))}
			</div>
			<p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
				<Info className="mt-0.5 size-3 shrink-0" aria-hidden /> {t('heuristicNote')}
			</p>
		</Panel>
	);
}

function Languages({ d }) {
	const t = useTranslations('projectmind.dashboard');
	const entries = Object.entries(d.languages || {}).sort((a, b) => b[1] - a[1]);
	const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
	const top = entries.slice(0, 6);
	return (
		<Panel className="pm-rise">
			<PanelTitle hint={`${d.counts.indexedFiles}/${d.counts.files}`}>{t('languages')}</PanelTitle>
			{entries.length === 0 ? (
				<p className="text-sm text-slate-500">—</p>
			) : (
				<>
					<div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="img" aria-label={top.map(([l, n]) => `${l} ${Math.round((n / total) * 100)}%`).join(', ')}>
						{top.map(([l, n], i) => (
							<span key={l} className={LANG_COLORS[i]} style={{ width: `${(n / total) * 100}%` }} title={`${l}: ${n}`} />
						))}
					</div>
					<ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
						{top.map(([l, n], i) => (
							<li key={l} className="flex items-center gap-2">
								<span className={cn('size-2 shrink-0 rounded-full', LANG_COLORS[i])} aria-hidden />
								<span className="truncate" dir="ltr">{l}</span>
								<span className="ms-auto tabular-nums text-slate-500">{n}</span>
							</li>
						))}
					</ul>
				</>
			)}
		</Panel>
	);
}

function Setup({ d }) {
	const t = useTranslations('projectmind.dashboard');
	const status = d.project.status;
	const done = { create: true, import: status !== 'draft' && status !== 'failed', analysis: status === 'ready', ask: d.counts.questions > 0 };
	if (STEPS.every((s) => done[s])) return null;
	const current = STEPS.find((s) => !done[s]);
	return (
		<ol className="pm-rise grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900" aria-label={t('onboardingTitle')}>
			{STEPS.map((s, i) => (
				<li key={s} aria-current={current === s ? 'step' : undefined} className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm', current === s && 'bg-[var(--color-primary-50)] dark:bg-slate-800')}>
					<span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold', done[s] ? 'bg-emerald-500 text-white' : current === s ? 'bg-[var(--color-primary-600)] text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200')}>
						{done[s] ? <Check className="size-3.5" aria-hidden /> : i + 1}
					</span>
					<span className="min-w-0">
						<span className="block truncate font-medium">{t(`step.${s}.title`)}</span>
						<span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{t(`step.${s}.body`)}</span>
					</span>
				</li>
			))}
		</ol>
	);
}

export default function DashboardView() {
	return (
		<RequireProject>
			<Inner />
		</RequireProject>
	);
}

function Inner() {
	const t = useTranslations('projectmind.dashboard');
	const locale = useLocale();
	const { project, projectId } = useProjectMind();
	const q = useQuery({ queryKey: ['pm', 'dashboard', projectId, project?.status, project?.analyzedAt], queryFn: () => pmApi.dashboard(projectId), enabled: !!projectId });

	if (q.isLoading) return <SkeletonRows rows={6} />;
	if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} />;
	const d = q.data;
	const c = d.counts;

	return (
		<div className="space-y-4">
			{d.project.status === 'failed' ? <InlineWarning>{d.project.statusMessage}</InlineWarning> : null}
			{d.docsStale ? <InlineWarning>{t('docsStale')}</InlineWarning> : null}

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
				<Hero d={d} locale={locale} />
				<Health d={d} />
			</div>

			<Setup d={d} />

			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
				<Stat icon={FileCode2} label={t('stats.files')} value={c.indexedFiles.toLocaleString(locale)} href="/dashboard/projectmind/explorer" />
				<Stat icon={Route} label={t('stats.routes')} value={c.routes.toLocaleString(locale)} href="/dashboard/projectmind/docs" tone="bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-sky-300" />
				<Stat icon={Table2} label={t('stats.entities')} value={c.entities.toLocaleString(locale)} href="/dashboard/projectmind/docs" tone="bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-violet-300" />
				<Stat icon={MessageSquare} label={t('stats.questions')} value={c.questions.toLocaleString(locale)} href="/dashboard/projectmind/chat" tone="bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300" />
				<Stat icon={HelpCircle} label={t('stats.openGaps')} value={c.openGaps.toLocaleString(locale)} href="/dashboard/projectmind/gaps" tone="bg-amber-50 text-amber-700 dark:bg-slate-800 dark:text-amber-300" />
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Panel className="pm-rise">
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/gaps">{t('viewAll')}</Link>}>{t('topGaps')}</PanelTitle>
					{d.topGaps.length === 0 ? (
						<EmptyState icon={CheckCircle2} title={t('noGaps')} />
					) : (
						<ul className="space-y-2.5">
							{d.topGaps.map((g) => (
								<li key={g.id} className="flex items-start gap-2 text-sm">
									<PriorityBadge priority={g.priority} />
									<span dir="auto" className="min-w-0 flex-1 leading-snug">{g.title}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>

				<Panel className="pm-rise">
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/chat">{t('askNow')}</Link>}>{t('recentQuestions')}</PanelTitle>
					{d.recentQuestions.length === 0 ? (
						<EmptyState icon={MessageSquare} title={t('noQuestions')} />
					) : (
						<ul className="space-y-2.5">
							{[...new Map(d.recentQuestions.map((r) => [r.content, r])).values()].map((r, i) => (
								<li key={i} className="text-sm">
									<Link href={`/dashboard/projectmind/chat?q=${encodeURIComponent(r.content)}`} dir="auto" className="line-clamp-2 leading-snug text-slate-800 hover:text-[var(--color-primary-700)] hover:underline dark:text-slate-100">{r.content}</Link>
									<span className="text-[11px] text-slate-400">{formatDate(r.createdAt, locale)}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>

				<div className="space-y-4">
					<Languages d={d} />
					<Panel className="pm-rise">
						<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/meetings">{t('viewAll')}</Link>}>{t('upcomingMeetings')}</PanelTitle>
						{d.upcomingMeetings.length === 0 ? (
							<p className="flex items-center gap-2 text-sm text-slate-500"><CalendarClock className="size-4" aria-hidden /> {t('noMeetings')}</p>
						) : (
							<ul className="space-y-2 text-sm">
								{d.upcomingMeetings.map((m) => (
									<li key={m.id} className="flex justify-between gap-2"><span dir="auto">{m.title}</span><span className="text-xs text-slate-500">{formatDate(m.scheduledAt, locale)}</span></li>
								))}
							</ul>
						)}
					</Panel>
				</div>
			</div>

			{d.simulatorTrend.length > 0 ? (
				<Panel className="pm-rise">
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/simulator">{t('practice')}</Link>}>{t('simTrend')}</PanelTitle>
					<div className="flex h-20 items-end gap-1.5" role="img" aria-label={t('simTrend')}>
						{d.simulatorTrend.map((s, i) => (
							<div key={i} className="flex-1 rounded-t bg-[var(--color-primary-500)]" style={{ height: `${Math.max(4, s.totalScore)}%` }} title={`${s.totalScore}/100`} />
						))}
					</div>
				</Panel>
			) : null}

		</div>
	);
}
