'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CheckCircle2, Circle, FileCode2, GitCommit, HelpCircle, Info, ListChecks, MessageSquare, Route, Table2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { errorMessage, pmApi } from '../api';
import { useProjectMind } from '../ProjectMindContext';
import { EmptyState, ErrorState, formatDate, InlineWarning, PageHeader, Panel, PanelTitle, PriorityBadge, RequireProject, SkeletonRows, StatusPill } from '../ui';

function Stat({ icon: Icon, label, value, href }) {
	const inner = (
		<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-[var(--color-primary-300)] dark:border-slate-800 dark:bg-slate-900">
			<span className="grid size-9 place-items-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-slate-800 dark:text-[var(--color-primary-300)]">
				<Icon className="size-4" aria-hidden />
			</span>
			<div>
				<div className="text-lg font-semibold leading-tight text-slate-900 dark:text-slate-50">{value}</div>
				<div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
			</div>
		</div>
	);
	return href ? <Link href={href}>{inner}</Link> : inner;
}

function Coverage({ label, value, method }) {
	const t = useTranslations('projectmind.dashboard');
	return (
		<div>
			<div className="flex items-baseline justify-between">
				<span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
				<span className="text-sm font-semibold">{value === null || value === undefined ? t('notAvailable') : `${value}%`}</span>
			</div>
			<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label={label} aria-valuenow={value ?? 0} aria-valuemin={0} aria-valuemax={100}>
				<div className="h-full rounded-full bg-[var(--color-primary-600)]" style={{ width: `${value ?? 0}%` }} />
			</div>
			<details className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
				<summary className="cursor-pointer select-none">{t('howComputed')}</summary>
				<p className="mt-1">{method}</p>
			</details>
		</div>
	);
}

const STEPS = ['create', 'import', 'analysis', 'ask'];

function Onboarding({ project, questions }) {
	const t = useTranslations('projectmind.dashboard');
	const status = project?.status;
	const done = {
		create: !!project,
		import: !!project && status !== 'draft' && status !== 'failed',
		analysis: status === 'ready',
		ask: questions > 0,
	};
	const current = STEPS.find((s) => !done[s]);
	return (
		<Panel>
			<PanelTitle>{t('onboardingTitle')}</PanelTitle>
			<ol className="grid gap-2 sm:grid-cols-4">
				{STEPS.map((s, i) => (
					<li key={s} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${current === s ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800'}`} aria-current={current === s ? 'step' : undefined}>
						{done[s] ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" aria-hidden /> : <Circle className="mt-0.5 size-4 text-slate-400" aria-hidden />}
						<div>
							<div className="font-medium">{i + 1}. {t(`step.${s}.title`)}</div>
							<div className="text-xs text-slate-500 dark:text-slate-400">{t(`step.${s}.body`)}</div>
						</div>
					</li>
				))}
			</ol>
		</Panel>
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

	const nextAction = {
		upload_zip: { href: '/dashboard/projectmind/projects', label: t('next.upload_zip') },
		fix_import: { href: '/dashboard/projectmind/projects', label: t('next.fix_import') },
		wait_analysis: { href: '/dashboard/projectmind/projects', label: t('next.wait_analysis') },
		ask_first_question: { href: '/dashboard/projectmind/chat', label: t('next.ask_first_question') },
		review_gaps: { href: '/dashboard/projectmind/gaps', label: t('next.review_gaps') },
	}[d.nextStep.key];

	return (
		<div className="space-y-5">
			<PageHeader
				title={d.project.name}
				subtitle={
					<span className="inline-flex flex-wrap items-center gap-2">
						<StatusPill status={d.project.status} />
						{d.project.commitSha ? (
							<span className="inline-flex items-center gap-1 text-xs">
								<GitCommit className="size-3.5" aria-hidden />
								<bdi dir="ltr" className="font-mono">{d.project.commitSha.slice(0, 10)}</bdi>
							</span>
						) : null}
						<span className="text-xs">{t('analyzedAt', { date: formatDate(d.project.analyzedAt, locale) })}</span>
					</span>
				}
			/>

			<Panel className="border-[var(--color-primary-300)] bg-[var(--color-primary-50)] dark:bg-slate-900">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">{t('whatNext')}</p>
						<p className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{t(`nextBody.${d.nextStep.key}`)}</p>
					</div>
					<Button asChild>
						<Link href={nextAction.href}>
							{nextAction.label} <ArrowRight className="rtl:rotate-180" />
						</Link>
					</Button>
				</div>
			</Panel>

			{d.project.status === 'failed' ? <InlineWarning>{d.project.statusMessage}</InlineWarning> : null}
			{d.docsStale ? <InlineWarning>{t('docsStale')}</InlineWarning> : null}
			<Onboarding project={d.project} questions={c.questions} />

			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				<Stat icon={FileCode2} label={t('stats.files')} value={`${c.indexedFiles}/${c.files}`} href="/dashboard/projectmind/explorer" />
				<Stat icon={Route} label={t('stats.routes')} value={c.routes} href="/dashboard/projectmind/docs" />
				<Stat icon={Table2} label={t('stats.entities')} value={c.entities} href="/dashboard/projectmind/docs" />
				<Stat icon={MessageSquare} label={t('stats.questions')} value={c.questions} href="/dashboard/projectmind/chat" />
				<Stat icon={HelpCircle} label={t('stats.openGaps')} value={c.openGaps} href="/dashboard/projectmind/gaps" />
				<Stat icon={ListChecks} label={t('stats.chunks')} value={c.chunks} />
			</div>

			<div className="grid gap-5 lg:grid-cols-3">
				<Panel>
					<PanelTitle>{t('coverage')}</PanelTitle>
					<div className="space-y-4">
						<Coverage label={t('docCoverage')} value={d.coverage.documentation.value} method={d.coverage.documentation.method} />
						<Coverage label={t('knowledgeCoverage')} value={d.coverage.knowledge.value} method={d.coverage.knowledge.method} />
					</div>
					<p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
						<Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t('heuristicNote')}
					</p>
				</Panel>

				<Panel>
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/gaps">{t('viewAll')}</Link>}>{t('topGaps')}</PanelTitle>
					{d.topGaps.length === 0 ? (
						<EmptyState icon={CheckCircle2} title={t('noGaps')} />
					) : (
						<ul className="space-y-2">
							{d.topGaps.map((g) => (
								<li key={g.id} className="flex items-start gap-2 text-sm">
									<PriorityBadge priority={g.priority} />
									<span dir="auto" className="min-w-0 flex-1">{g.title}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>

				<Panel>
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/chat">{t('askNow')}</Link>}>{t('recentQuestions')}</PanelTitle>
					{d.recentQuestions.length === 0 ? (
						<EmptyState icon={MessageSquare} title={t('noQuestions')} />
					) : (
						<ul className="space-y-2">
							{d.recentQuestions.map((r, i) => (
								<li key={i} dir="auto" className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
									{r.content}
									<span className="ms-2 text-xs text-slate-400">{formatDate(r.createdAt, locale)}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>
			</div>

			<div className="grid gap-5 lg:grid-cols-3">
				<Panel>
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/meetings">{t('viewAll')}</Link>}>{t('upcomingMeetings')}</PanelTitle>
					{d.upcomingMeetings.length === 0 ? (
						<EmptyState icon={CalendarClock} title={t('noMeetings')} />
					) : (
						<ul className="space-y-2 text-sm">
							{d.upcomingMeetings.map((m) => (
								<li key={m.id} className="flex justify-between gap-2">
									<span>{m.title}</span>
									<span className="text-xs text-slate-500">{formatDate(m.scheduledAt, locale)}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>

				<Panel>
					<PanelTitle>{t('sync')}</PanelTitle>
					<dl className="space-y-1.5 text-sm">
						<div className="flex justify-between gap-2"><dt className="text-slate-500">{t('syncSource')}</dt><dd>{d.sync.sourceType === 'github' ? 'GitHub' : 'ZIP'}</dd></div>
						<div className="flex justify-between gap-2"><dt className="text-slate-500">{t('syncLast')}</dt><dd>{formatDate(d.sync.lastSyncedAt, locale)}</dd></div>
						<div className="flex justify-between gap-2"><dt className="text-slate-500">{t('languages')}</dt><dd className="text-end"><bdi dir="ltr">{Object.entries(d.languages || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l, n]) => `${l} (${n})`).join(', ') || '—'}</bdi></dd></div>
					</dl>
				</Panel>

				<Panel>
					<PanelTitle hint={<Link className="underline" href="/dashboard/projectmind/simulator">{t('practice')}</Link>}>{t('simTrend')}</PanelTitle>
					{d.simulatorTrend.length === 0 ? (
						<p className="text-sm text-slate-500">{t('noSims')}</p>
					) : (
						<div className="flex h-20 items-end gap-1.5" role="img" aria-label={t('simTrend')}>
							{d.simulatorTrend.map((s, i) => (
								<div key={i} className="flex-1 rounded-t bg-[var(--color-primary-500)]" style={{ height: `${Math.max(4, s.totalScore)}%` }} title={`${s.totalScore}/100`} />
							))}
						</div>
					)}
				</Panel>
			</div>
		</div>
	);
}
