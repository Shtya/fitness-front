'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FolderGit2, KeyRound, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { errorMessage, pmApi } from '../api';
import { useProjectMind } from '../ProjectMindContext';
import { ConfirmDialog, EmptyState, ErrorState, formatBytes, formatDate, InlineWarning, PageHeader, Panel, PanelTitle, SkeletonRows, Spinner, StatusPill } from '../ui';

const GITHUB_URL = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+/i;

function ReuploadButton({ project, onDone }) {
	const t = useTranslations('projectmind.projects');
	const ref = useRef(null);
	const m = useMutation({
		mutationFn: (f) => pmApi.importZip(project.id, f),
		onSuccess: () => {
			toast.success(t('resyncStarted'));
			onDone();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});
	return (
		<>
			<input ref={ref} type="file" accept=".zip,application/zip" className="hidden" aria-label={t('uploadNewZip')} onChange={(e) => e.target.files?.[0] && m.mutate(e.target.files[0])} />
			<Button variant="outline" size="sm" disabled={m.isPending} onClick={() => ref.current?.click()}>
				{m.isPending ? <Spinner /> : <Upload />} {t('uploadNewZip')}
			</Button>
		</>
	);
}

export default function ProjectsView() {
	const t = useTranslations('projectmind.projects');
	const tc = useTranslations('projectmind.common');
	const locale = useLocale();
	const qc = useQueryClient();
	const { projects, project, setProjectId, loading, error, refetch } = useProjectMind();
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [toDelete, setToDelete] = useState(null);
	const refresh = () => qc.invalidateQueries({ queryKey: ['pm'] });

	const create = useMutation({
		// GitHub only; the default branch and the saved access token (Settings) are used automatically.
		mutationFn: () => pmApi.createProject({ name, sourceType: 'github', sourceUrl: url }),
		onSuccess: (p) => {
			toast.success(t('created'));
			setProjectId(p.id);
			setName('');
			setUrl('');
			refresh();
		},
		onError: (e) => {
			toast.error(errorMessage(e));
			refresh();
		},
	});

	const resync = useMutation({
		mutationFn: (id) => pmApi.resync(id),
		onSuccess: () => {
			toast.success(t('resyncStarted'));
			refresh();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	const del = useMutation({
		mutationFn: (id) => pmApi.deleteProject(id),
		onSuccess: () => {
			toast.success(t('deleted'));
			setToDelete(null);
			refresh();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	const canSubmit = name.trim().length >= 2 && GITHUB_URL.test(url.trim()) && !create.isPending;
	const tokenQ = useQuery({ queryKey: ['pm', 'github-token'], queryFn: pmApi.githubTokenStatus, staleTime: 30_000 });

	return (
		<div className="space-y-5">
			<PageHeader title={t('title')} subtitle={t('subtitle')} />

			<Panel>
				<PanelTitle>{t('newProject')}</PanelTitle>
				<form
					className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] md:items-end"
					onSubmit={(e) => {
						e.preventDefault();
						if (canSubmit) create.mutate();
					}}
				>
					<div className="space-y-1.5">
						<Label htmlFor="pm-name">{t('name')}</Label>
						<Input id="pm-name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} required />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="pm-url">{t('repoUrl')}</Label>
						<Input id="pm-url" dir="ltr" placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} required />
					</div>
					<Button type="submit" disabled={!canSubmit}>
						{create.isPending ? <Spinner /> : <FolderGit2 />} {t('createAndImport')}
					</Button>
				</form>
				<p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
					<KeyRound className="size-3.5 shrink-0" aria-hidden />
					{tokenQ.data?.configured ? t('tokenSaved', { last4: tokenQ.data.last4 || '' }) : t('tokenMissing')}
					<Link href="/dashboard/projectmind/settings" className="font-medium underline">{t('tokenManage')}</Link>
				</p>
			</Panel>

			<Panel>
				<PanelTitle hint={t('count', { n: projects.length })}>{t('yourProjects')}</PanelTitle>
				{loading ? (
					<SkeletonRows rows={3} />
				) : error ? (
					<ErrorState message={errorMessage(error)} onRetry={refetch} />
				) : projects.length === 0 ? (
					<EmptyState icon={FolderGit2} title={t('emptyTitle')} body={t('emptyBody')} />
				) : (
					<ul className="divide-y divide-slate-200 dark:divide-slate-800">
						{projects.map((p) => {
							const busy = p.status === 'importing' || p.status === 'analyzing';
							return (
								<li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="truncate font-medium text-slate-900 dark:text-slate-50">{p.name}</span>
											<StatusPill status={p.status} />
											{project?.id === p.id ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium dark:bg-slate-800">{t('active')}</span> : null}
										</div>
										<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
											<bdi dir="ltr">{p.sourceType === 'github' ? p.sourceUrl : t('source_zip')}</bdi> · {t('files', { n: p.fileCount })} · {formatBytes(p.totalBytes)} · {formatDate(p.analyzedAt || p.createdAt, locale)}
										</p>
										{busy ? (
											<div className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
												<div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
													<div className="h-full bg-[var(--color-primary-600)] transition-[width]" style={{ width: `${p.progress}%` }} />
												</div>
												{p.statusMessage}
											</div>
										) : p.statusMessage ? (
											<p className={`mt-1 text-xs ${p.status === 'failed' ? 'text-red-600 dark:text-red-300' : 'text-slate-500'}`}>{p.statusMessage}</p>
										) : null}
									</div>
									<div className="flex items-center gap-1.5">
										{p.status === 'ready' ? (
											<Button asChild size="sm" onClick={() => setProjectId(p.id)}>
												<Link href="/dashboard/projectmind">{t('open')}</Link>
											</Button>
										) : null}
										{p.sourceType === 'github' && !busy ? (
											<Button variant="outline" size="sm" onClick={() => resync.mutate(p.id)} disabled={resync.isPending}>
												<RefreshCw /> {t('resync')}
											</Button>
										) : null}
										{p.sourceType === 'zip' && !busy ? <ReuploadButton project={p} onDone={refresh} /> : null}
										<Button variant="ghost" size="icon" aria-label={tc('delete')} onClick={() => setToDelete(p)} disabled={busy}>
											<Trash2 />
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</Panel>

			<ConfirmDialog
				open={!!toDelete}
				onOpenChange={(o) => !o && setToDelete(null)}
				title={t('deleteTitle', { name: toDelete?.name || '' })}
				body={t('deleteBody')}
				confirmLabel={tc('delete')}
				busy={del.isPending}
				onConfirm={() => del.mutate(toDelete.id)}
			/>
		</div>
	);
}
