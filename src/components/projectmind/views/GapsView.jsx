'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownUp, ClipboardList, Plus, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { errorMessage, pmApi } from '../api';
import { useProjectMind } from '../ProjectMindContext';
import { CopyButton, EmptyState, ErrorState, PageHeader, Panel, PriorityBadge, RequireProject, SkeletonRows, SourceChip, Spinner } from '../ui';

const STATUSES = ['not_started', 'investigating', 'understood', 'documented', 'resolved'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export default function GapsView() {
	return (
		<RequireProject needReady>
			<Inner />
		</RequireProject>
	);
}

function Inner() {
	const t = useTranslations('projectmind.gaps');
	const tc = useTranslations('projectmind.common');
	const qc = useQueryClient();
	const { projectId } = useProjectMind();
	const [fStatus, setFStatus] = useState('');
	const [fPriority, setFPriority] = useState('');
	const [sort, setSort] = useState('priority');
	const [dialog, setDialog] = useState(false);
	const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });
	const [checklist, setChecklist] = useState(null);

	const q = useQuery({ queryKey: ['pm', 'gaps', projectId], queryFn: () => pmApi.gaps(projectId) });
	const refresh = () => {
		qc.invalidateQueries({ queryKey: ['pm', 'gaps', projectId] });
		qc.invalidateQueries({ queryKey: ['pm', 'dashboard'] });
	};

	const update = useMutation({
		mutationFn: ({ id, patch }) => pmApi.gapUpdate(projectId, id, patch),
		// optimistic: safe because the server validates and we roll back on error
		onMutate: async ({ id, patch }) => {
			await qc.cancelQueries({ queryKey: ['pm', 'gaps', projectId] });
			const prev = qc.getQueryData(['pm', 'gaps', projectId]);
			qc.setQueryData(['pm', 'gaps', projectId], (old) => (old || []).map((g) => (g.id === id ? { ...g, ...patch } : g)));
			return { prev };
		},
		onError: (e, _v, ctx) => {
			qc.setQueryData(['pm', 'gaps', projectId], ctx?.prev);
			toast.error(errorMessage(e));
		},
		onSettled: refresh,
	});

	const create = useMutation({
		mutationFn: () => pmApi.gapCreate(projectId, form),
		onSuccess: () => {
			toast.success(t('created'));
			setDialog(false);
			setForm({ title: '', description: '', priority: 'medium' });
			refresh();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	const remove = useMutation({
		mutationFn: (id) => pmApi.gapDelete(projectId, id),
		onSuccess: refresh,
		onError: (e) => toast.error(errorMessage(e)),
	});

	const rescan = useMutation({
		mutationFn: () => pmApi.gapRescan(projectId),
		onSuccess: () => {
			toast.success(t('rescanned'));
			refresh();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	const checklistM = useMutation({
		mutationFn: () => pmApi.gapChecklist(projectId),
		onSuccess: setChecklist,
		onError: (e) => toast.error(errorMessage(e)),
	});

	const rows = useMemo(() => {
		const list = (q.data || []).filter((g) => (!fStatus || g.status === fStatus) && (!fPriority || g.priority === fPriority));
		return [...list].sort((a, b) => (sort === 'priority' ? RANK[a.priority] - RANK[b.priority] : sort === 'status' ? STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) : a.title.localeCompare(b.title)));
	}, [q.data, fStatus, fPriority, sort]);

	const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, (q.data || []).filter((g) => g.status === s).length])), [q.data]);

	return (
		<div className="space-y-4">
			<PageHeader
				title={t('title')}
				subtitle={t('subtitle')}
				actions={
					<>
						<Button variant="outline" size="sm" onClick={() => rescan.mutate()} disabled={rescan.isPending}>{rescan.isPending ? <Spinner /> : <RefreshCw />} {t('rescan')}</Button>
						<Button variant="outline" size="sm" onClick={() => checklistM.mutate()} disabled={checklistM.isPending}><ClipboardList /> {t('checklist')}</Button>
						<Button size="sm" onClick={() => setDialog(true)}><Plus /> {t('add')}</Button>
					</>
				}
			/>

			<div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('filters')}>
				{STATUSES.map((s) => (
					<button key={s} onClick={() => setFStatus(fStatus === s ? '' : s)} aria-pressed={fStatus === s} className={`rounded-full border px-3 py-1 text-xs font-medium ${fStatus === s ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>
						{t(`status.${s}`)} <span className="text-slate-500">{counts[s]}</span>
					</button>
				))}
				<select value={fPriority} onChange={(e) => setFPriority(e.target.value)} aria-label={t('priorityFilter')} className="h-8 rounded-md border border-slate-300 bg-transparent px-2 text-xs dark:border-slate-700">
					<option value="">{t('allPriorities')}</option>
					{PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
				</select>
				<button onClick={() => setSort(sort === 'priority' ? 'status' : sort === 'status' ? 'title' : 'priority')} className="ms-auto inline-flex items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-300" aria-label={t('sortBy', { by: t(`sort.${sort}`) })}>
					<ArrowDownUp className="size-3.5" /> {t(`sort.${sort}`)}
				</button>
			</div>

			{q.isLoading ? <SkeletonRows rows={5} /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} /> : rows.length === 0 ? (
				<EmptyState icon={ClipboardList} title={(q.data || []).length ? t('noMatch') : t('emptyTitle')} body={(q.data || []).length ? undefined : t('emptyBody')} action={<Button size="sm" onClick={() => setDialog(true)}><Plus /> {t('add')}</Button>} />
			) : (
				<ul className="space-y-2">
					{rows.map((g) => (
						<li key={g.id}>
							<Panel as="div" className="p-3">
								<div className="flex flex-wrap items-start gap-3">
									<PriorityBadge priority={g.priority} />
									<div className="min-w-0 flex-1 basis-56">
										<p dir="auto" className="font-medium text-slate-900 dark:text-slate-50">{g.title}</p>
										{g.description ? <p dir="auto" className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{g.description}</p> : null}
										{g.relatedFiles?.length ? (
											<div className="mt-2 flex flex-wrap gap-1.5">{g.relatedFiles.slice(0, 6).map((p) => <SourceChip key={p} path={p} />)}</div>
										) : null}
									</div>
									<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
										<label className="sr-only" htmlFor={`st-${g.id}`}>{t('statusLabel')}</label>
										<select id={`st-${g.id}`} value={g.status} onChange={(e) => update.mutate({ id: g.id, patch: { status: e.target.value } })} className="h-8 rounded-md border border-slate-300 bg-transparent px-2 text-xs dark:border-slate-700">
											{STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
										</select>
										<select value={g.priority} onChange={(e) => update.mutate({ id: g.id, patch: { priority: e.target.value } })} aria-label={t('priorityFilter')} className="h-8 rounded-md border border-slate-300 bg-transparent px-2 text-xs dark:border-slate-700">
											{PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
										</select>
										{g.source === 'manual' ? (
											<Button variant="ghost" size="icon" aria-label={tc('delete')} onClick={() => remove.mutate(g.id)}><Trash2 /></Button>
										) : <span className="text-[11px] text-slate-400">{t('auto')}</span>}
									</div>
								</div>
							</Panel>
						</li>
					))}
				</ul>
			)}

			<Dialog open={dialog} onOpenChange={setDialog}>
				<DialogContent>
					<DialogHeader><DialogTitle>{t('add')}</DialogTitle></DialogHeader>
					<form id="pm-gap-form" className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
						<div className="space-y-1.5"><Label htmlFor="g-title">{t('fieldTitle')}</Label><Input id="g-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={300} required /></div>
						<div className="space-y-1.5"><Label htmlFor="g-desc">{t('fieldDescription')}</Label><Input id="g-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
						<div className="space-y-1.5"><Label htmlFor="g-prio">{t('fieldPriority')}</Label>
							<select id="g-prio" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-9 w-full rounded-md border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700">
								{PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
							</select></div>
					</form>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialog(false)}>{tc('cancel')}</Button>
						<Button type="submit" form="pm-gap-form" disabled={form.title.trim().length < 3 || create.isPending}>{create.isPending ? <Spinner /> : null} {tc('save')}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!checklist} onOpenChange={(o) => !o && setChecklist(null)}>
				<DialogContent>
					<DialogHeader><DialogTitle>{t('checklist')}</DialogTitle></DialogHeader>
					<pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">{checklist?.markdown}</pre>
					<DialogFooter><CopyButton text={checklist?.markdown || ''} /></DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
