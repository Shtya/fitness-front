'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FolderGit2, Github, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { errorMessage, pmApi } from '../api';
import { useProjectMind } from '../ProjectMindContext';
import { ConfirmDialog, EmptyState, ErrorState, formatBytes, formatDate, InlineWarning, PageHeader, Panel, PanelTitle, SkeletonRows, Spinner, StatusPill } from '../ui';

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
	const [source, setSource] = useState('zip');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [url, setUrl] = useState('');
	const [branch, setBranch] = useState('');
	const [token, setToken] = useState('');
	const [file, setFile] = useState(null);
	const [uploadPct, setUploadPct] = useState(null);
	const [toDelete, setToDelete] = useState(null);
	const fileRef = useRef(null);
	const refresh = () => qc.invalidateQueries({ queryKey: ['pm'] });

	const create = useMutation({
		mutationFn: async () => {
			const p = await pmApi.createProject({ name, description, sourceType: source, sourceUrl: url, branch: branch || undefined, githubToken: token || undefined });
			if (source === 'zip') {
				setUploadPct(0);
				await pmApi.importZip(p.id, file, setUploadPct);
			}
			return p;
		},
		onSuccess: (p) => {
			toast.success(t('created'));
			setProjectId(p.id);
			setName('');
			setDescription('');
			setUrl('');
			setBranch('');
			setToken('');
			setFile(null);
			if (fileRef.current) fileRef.current.value = '';
			refresh();
		},
		onError: (e) => {
			toast.error(errorMessage(e));
			refresh();
		},
		onSettled: () => setUploadPct(null),
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

	const canSubmit = name.trim().length >= 2 && (source === 'zip' ? !!file : url.trim().length > 10) && !create.isPending;

	return (
		<div className="space-y-5">
			<PageHeader title={t('title')} subtitle={t('subtitle')} />

			<Panel>
				<PanelTitle>{t('newProject')}</PanelTitle>
				<form
					className="grid gap-4 md:grid-cols-2"
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
						<Label htmlFor="pm-desc">{t('description')}</Label>
						<Input id="pm-desc" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
					</div>

					<fieldset className="md:col-span-2">
						<legend className="mb-1.5 text-sm font-medium">{t('source')}</legend>
						<div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="radiogroup" aria-label={t('source')}>
							{[
								['zip', Upload],
								['github', Github],
							].map(([v, Icon]) => (
								<button
									key={v}
									type="button"
									role="radio"
									aria-checked={source === v}
									onClick={() => setSource(v)}
									className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${source === v ? 'bg-[var(--color-primary-600)] text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
								>
									<Icon className="size-4" /> {t(`source_${v}`)}
								</button>
							))}
						</div>
					</fieldset>

					{source === 'zip' ? (
						<div className="space-y-1.5 md:col-span-2">
							<Label htmlFor="pm-zip">{t('zipFile')}</Label>
							<Input id="pm-zip" ref={fileRef} type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] || null)} />
							<p className="text-xs text-slate-500 dark:text-slate-400">{t('zipHint')}</p>
						</div>
					) : (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="pm-url">{t('repoUrl')}</Label>
								<Input id="pm-url" dir="ltr" placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="pm-branch">{t('branch')}</Label>
								<Input id="pm-branch" dir="ltr" placeholder="main" value={branch} onChange={(e) => setBranch(e.target.value)} />
							</div>
							<div className="space-y-1.5 md:col-span-2">
								<Label htmlFor="pm-token">{t('token')}</Label>
								<Input id="pm-token" dir="ltr" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
								<InlineWarning>{t('tokenHint')}</InlineWarning>
							</div>
						</>
					)}

					<div className="flex items-center gap-3 md:col-span-2">
						<Button type="submit" disabled={!canSubmit}>
							{create.isPending ? <Spinner /> : <FolderGit2 />} {t('createAndImport')}
						</Button>
						{uploadPct !== null ? (
							<div className="flex min-w-40 items-center gap-2 text-xs text-slate-600 dark:text-slate-300" role="progressbar" aria-valuenow={uploadPct} aria-valuemin={0} aria-valuemax={100}>
								<div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
									<div className="h-full bg-[var(--color-primary-600)] transition-[width]" style={{ width: `${uploadPct}%` }} />
								</div>
								{uploadPct}%
							</div>
						) : null}
					</div>
				</form>
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
