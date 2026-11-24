'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Download, GitCommit, Pencil, Printer, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { downloadText, errorCode, errorMessage, pmApi } from '../api';
import { Markdown, extractToc } from '../Markdown';
import { useProjectMind } from '../ProjectMindContext';
import { EmptyState, ErrorState, formatDate, InlineWarning, LabelBadge, PageHeader, RequireProject, SkeletonRows, Spinner } from '../ui';

export default function DocsView() {
	return (
		<RequireProject needReady>
			<Inner />
		</RequireProject>
	);
}

function Inner() {
	const t = useTranslations('projectmind.docs');
	const locale = useLocale();
	const qc = useQueryClient();
	const { project, projectId } = useProjectMind();
	const [active, setActive] = useState(null);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState('');
	const [busyKey, setBusyKey] = useState(null);

	const metaQ = useQuery({ queryKey: ['pm', 'meta'], queryFn: pmApi.meta, staleTime: 300_000 });
	const q = useQuery({ queryKey: ['pm', 'docs', projectId], queryFn: () => pmApi.docs(projectId) });
	const sections = useMemo(() => {
		const order = ['overview', 'architecture', 'api', 'database', 'setup', 'testing', 'security'];
		const rank = (k) => (order.includes(k) ? order.indexOf(k) : 100);
		return [...(q.data || [])].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
	}, [q.data]);
	const aiSections = metaQ.data?.aiSections || [];

	useEffect(() => {
		if (!active && sections.length) setActive(sections[0].key);
	}, [sections, active]);

	const current = sections.find((s) => s.key === active);
	const toc = useMemo(() => extractToc(current?.contentMd), [current?.contentMd]);
	const refresh = () => qc.invalidateQueries({ queryKey: ['pm', 'docs', projectId] });

	const save = useMutation({
		mutationFn: () => pmApi.docUpdate(projectId, active, draft),
		onSuccess: () => {
			toast.success(t('saved'));
			setEditing(false);
			refresh();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	const regenerate = useMutation({
		mutationFn: ({ key, ai }) => (ai ? pmApi.docAi(projectId, key) : pmApi.docReset(projectId, key)),
		onMutate: ({ key }) => setBusyKey(key),
		onSuccess: (_r, { key }) => {
			toast.success(t('regenerated'));
			setActive(key);
			refresh();
		},
		onError: (e) => toast.error(errorCode(e) === 'AI_NOT_CONFIGURED' ? t('noKey') : errorMessage(e)),
		onSettled: () => setBusyKey(null),
	});

	async function exportMd() {
		try {
			const r = await pmApi.docExport(projectId);
			downloadText(r.filename, r.markdown);
		} catch (e) {
			toast.error(errorMessage(e));
		}
	}

	if (q.isLoading) return <SkeletonRows rows={6} />;
	if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} />;
	if (!sections.length) return <EmptyState icon={BookOpen} title={t('emptyTitle')} body={t('emptyBody')} />;

	const missingAi = aiSections.filter((a) => !sections.some((s) => s.key === a.key));
	const stale = current?.stale;

	return (
		<div className="space-y-4">
			<PageHeader
				title={t('title')}
				subtitle={t('subtitle')}
				actions={
					<>
						<Button variant="outline" size="sm" onClick={exportMd}><Download /> {t('exportMd')}</Button>
						<Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> {t('exportPdf')}</Button>
					</>
				}
			/>
			<div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_220px]">
				<nav aria-label={t('sections')} className="pm-no-print space-y-1 lg:sticky lg:top-4 lg:self-start">
					{sections.map((s) => (
						<button key={s.key} onClick={() => { setActive(s.key); setEditing(false); }} aria-current={s.key === active ? 'page' : undefined} className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800', s.key === active && 'bg-[var(--color-primary-50)] font-medium dark:bg-slate-800')}>
							<span className="truncate">{s.title}</span>
							{s.stale ? <span className="size-2 shrink-0 rounded-full bg-amber-500" title={t('stale')} /> : null}
						</button>
					))}
					{missingAi.length ? (
						<div className="pt-3">
							<p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('aiSections')}</p>
							{missingAi.map((a) => (
								<button key={a.key} onClick={() => regenerate.mutate({ key: a.key, ai: true })} disabled={regenerate.isPending} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800">
									{busyKey === a.key ? <Spinner /> : <Sparkles className="size-4" />} <span className="truncate">{a.title}</span>
								</button>
							))}
						</div>
					) : null}
				</nav>

				<article className="pm-print min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
					{current ? (
						<>
							<div className="pm-no-print mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 text-xs dark:border-slate-800">
								<LabelBadge label={current.verification} />
								<span className="text-slate-500">{t(`origin.${current.origin}`)}</span>
								<span className="inline-flex items-center gap-1 text-slate-500"><GitCommit className="size-3.5" /><bdi dir="ltr" className="font-mono">{current.lastAnalyzedCommit ? current.lastAnalyzedCommit.slice(0, 10) : t('noCommit')}</bdi></span>
								<span className="text-slate-500">{formatDate(current.generatedAt, locale)}</span>
								<div className="ms-auto flex items-center gap-1.5">
									{editing ? (
										<>
											<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Spinner /> : <Save />} {t('save')}</Button>
											<Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X /> {t('cancel')}</Button>
										</>
									) : (
										<>
											<Button size="sm" variant="outline" onClick={() => { setDraft(current.contentMd); setEditing(true); }}><Pencil /> {t('edit')}</Button>
											<Button size="sm" variant="outline" disabled={regenerate.isPending} onClick={() => regenerate.mutate({ key: current.key, ai: current.origin === 'ai' || current.key.startsWith('ai-') })}>
												{busyKey === current.key ? <Spinner /> : <RefreshCw />} {t('regenerate')}
											</Button>
										</>
									)}
								</div>
							</div>
							{stale ? <div className="pm-no-print mb-3"><InlineWarning>{t('staleWarning')}</InlineWarning></div> : null}
							{current.verification !== 'verified' ? <div className="pm-no-print mb-3"><InlineWarning>{t(`verifyNote.${current.verification}`)}</InlineWarning></div> : null}

							{editing ? (
								<div className="grid gap-4 xl:grid-cols-2">
									<div>
										<label htmlFor="pm-doc-edit" className="mb-1 block text-xs font-medium text-slate-500">{t('editor')}</label>
										<Textarea id="pm-doc-edit" dir="ltr" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[50vh] font-mono text-[13px]" />
									</div>
									<div>
										<p className="mb-1 text-xs font-medium text-slate-500">{t('preview')}</p>
										<div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 p-3 dark:border-slate-800"><Markdown>{draft}</Markdown></div>
									</div>
								</div>
							) : (
								<div className="mx-auto max-w-3xl"><Markdown>{current.contentMd}</Markdown></div>
							)}
						</>
					) : null}
				</article>

				{toc.length > 1 && !editing ? (
					<aside className="pm-no-print hidden xl:block">
						<div className="sticky top-4 text-sm">
							<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('onThisPage')}</p>
							<ul className="space-y-1 border-s border-slate-200 ps-3 dark:border-slate-700">
								{toc.map((h, i) => (
									<li key={i} style={{ paddingInlineStart: (h.level - 1) * 10 }}>
										<a href={`#${h.id}`} className="block truncate text-slate-600 hover:text-[var(--color-primary-700)] dark:text-slate-300">{h.text}</a>
									</li>
								))}
							</ul>
						</div>
					</aside>
				) : null}
			</div>
		</div>
	);
}
