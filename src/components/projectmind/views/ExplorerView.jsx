'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, File, FileLock2, Folder, Search, X } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { errorMessage, pmApi } from '../api';
import { CodeViewer, parseLineRange } from '../CodeViewer';
import { useProjectMind } from '../ProjectMindContext';
import { CopyButton, EmptyState, ErrorState, formatBytes, PageHeader, RequireProject, SkeletonRows, SourceChip } from '../ui';

/** Flatten a path list into visible rows given the expanded set and an optional filter. */
function buildRows(files, expanded, query, lang, showExcluded) {
	const q = query.trim().toLowerCase();
	const visible = files.filter((f) => (showExcluded || !f.excluded) && (!lang || f.language === lang) && (!q || f.path.toLowerCase().includes(q)));
	const root = { children: new Map(), file: null };
	for (const f of visible) {
		let node = root;
		const parts = f.path.split('/');
		parts.forEach((part, i) => {
			if (!node.children.has(part)) node.children.set(part, { name: part, path: parts.slice(0, i + 1).join('/'), children: new Map(), file: null });
			node = node.children.get(part);
		});
		node.file = f;
	}
	const rows = [];
	const walk = (node, depth) => {
		const kids = [...node.children.values()].sort((a, b) => (a.file ? 1 : 0) - (b.file ? 1 : 0) || a.name.localeCompare(b.name));
		for (const k of kids) {
			const isDir = !k.file;
			const open = q ? true : expanded.has(k.path);
			rows.push({ ...k, depth, isDir, open });
			if (isDir && open) walk(k, depth + 1);
		}
	};
	walk(root, 0);
	return rows;
}

function useResizable(key, initial, min, max) {
	const [w, setW] = useState(initial);
	useEffect(() => {
		const saved = Number(localStorage.getItem(key));
		if (saved >= min && saved <= max) setW(saved);
	}, [key, min, max]);
	const dragging = useRef(false);
	const onPointerDown = (e) => {
		dragging.current = true;
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e) => {
		if (!dragging.current) return;
		const rect = e.currentTarget.parentElement.getBoundingClientRect();
		const rtl = getComputedStyle(e.currentTarget.parentElement).direction === 'rtl';
		const x = rtl ? rect.right - e.clientX : e.clientX - rect.left;
		setW(Math.max(min, Math.min(max, Math.round(x))));
	};
	const onPointerUp = () => {
		dragging.current = false;
		localStorage.setItem(key, String(w));
	};
	const onKeyDown = (e) => {
		const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
		const delta = (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0) * (rtl ? -1 : 1) * 24;
		if (!delta) return;
		e.preventDefault();
		const next = Math.max(min, Math.min(max, w + delta));
		setW(next);
		localStorage.setItem(key, String(next));
	};
	return { w, handleProps: { onPointerDown, onPointerMove, onPointerUp, onKeyDown } };
}

export default function ExplorerView() {
	return (
		<RequireProject needReady>
			<Inner />
		</RequireProject>
	);
}

function Inner() {
	const t = useTranslations('projectmind.explorer');
	const { projectId } = useProjectMind();
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const selected = params.get('path') || '';
	const range = parseLineRange(params.get('line'));
	const [query, setQuery] = useState('');
	const [lang, setLang] = useState('');
	const [showExcluded, setShowExcluded] = useState(false);
	const [expanded, setExpanded] = useState(() => new Set());
	const [mobileTab, setMobileTab] = useState('tree');
	const [codeQuery, setCodeQuery] = useState('');
	const [codeHits, setCodeHits] = useState(null);
	const { w, handleProps } = useResizable('projectmind.explorer.w', 320, 220, 560);

	const treeQ = useQuery({ queryKey: ['pm', 'tree', projectId], queryFn: () => pmApi.tree(projectId), staleTime: 60_000 });
	const fileQ = useQuery({ queryKey: ['pm', 'file', projectId, selected], queryFn: () => pmApi.file(projectId, selected), enabled: !!selected, retry: false });

	const files = treeQ.data || [];
	const languages = useMemo(() => [...new Set(files.map((f) => f.language).filter(Boolean))].sort(), [files]);
	const rows = useMemo(() => buildRows(files, expanded, query, lang, showExcluded), [files, expanded, query, lang, showExcluded]);

	// Expand the ancestors of the selected file so deep links reveal it.
	useEffect(() => {
		if (!selected) return;
		setExpanded((prev) => {
			const next = new Set(prev);
			const parts = selected.split('/');
			for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join('/'));
			return next;
		});
		setMobileTab('file');
	}, [selected]);

	const open = useCallback(
		(path, line) => {
			const q = new URLSearchParams({ path });
			if (line) q.set('line', String(line));
			router.replace(`${pathname}?${q.toString()}`);
		},
		[router, pathname],
	);

	const parentRef = useRef(null);
	const v = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 28, overscan: 20 });

	const toggle = (p) =>
		setExpanded((prev) => {
			const n = new Set(prev);
			n.has(p) ? n.delete(p) : n.add(p);
			return n;
		});

	async function runCodeSearch(e) {
		e.preventDefault();
		if (!codeQuery.trim()) return setCodeHits(null);
		try {
			setCodeHits(await pmApi.search(projectId, codeQuery));
		} catch (err) {
			setCodeHits({ error: errorMessage(err) });
		}
	}

	const f = fileQ.data;

	return (
		<div className="flex h-[calc(100dvh-8.5rem)] min-h-[480px] flex-col gap-3">
			<PageHeader title={t('title')} subtitle={t('subtitle')} />
			<div className="flex gap-2 md:hidden" role="tablist" aria-label={t('title')}>
				{['tree', 'file'].map((k) => (
					<button key={k} role="tab" aria-selected={mobileTab === k} onClick={() => setMobileTab(k)} className={cn('flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium', mobileTab === k ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700')}>
						{t(`tab_${k}`)}
					</button>
				))}
			</div>

			<div className="flex min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
				{/* tree pane */}
				<aside className={cn('min-h-0 shrink-0 flex-col border-e border-slate-200 md:w-[var(--pm-w)] dark:border-slate-800', mobileTab === 'tree' ? 'flex w-full' : 'hidden md:flex')} style={{ '--pm-w': `${w}px` }}>
					<div className="space-y-2 border-b border-slate-200 p-2 dark:border-slate-800">
						<div className="relative">
							<Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-slate-400" aria-hidden />
							<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('filterFiles')} aria-label={t('filterFiles')} className="ps-8" dir="ltr" />
						</div>
						<div className="flex items-center gap-2">
							<select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')} className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-2 text-xs dark:border-slate-700">
								<option value="">{t('allLanguages')}</option>
								{languages.map((l) => (
									<option key={l} value={l}>{l}</option>
								))}
							</select>
							<label className="flex items-center gap-1.5 text-xs">
								<input type="checkbox" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} /> {t('showExcluded')}
							</label>
						</div>
					</div>
					<div ref={parentRef} className="min-h-0 flex-1 overflow-auto" dir="ltr" role="tree" aria-label={t('title')}>
						{treeQ.isLoading ? (
							<div className="p-2"><SkeletonRows rows={8} /></div>
						) : treeQ.isError ? (
							<ErrorState message={errorMessage(treeQ.error)} onRetry={treeQ.refetch} />
						) : rows.length === 0 ? (
							<p className="p-4 text-sm text-slate-500">{t('noMatches')}</p>
						) : (
							<div style={{ height: v.getTotalSize(), position: 'relative' }}>
								{v.getVirtualItems().map((item) => {
									const r = rows[item.index];
									const Icon = r.isDir ? Folder : r.file?.excluded ? FileLock2 : File;
									return (
										<button
											key={item.key}
											role="treeitem"
											aria-expanded={r.isDir ? r.open : undefined}
											aria-selected={r.path === selected}
											onClick={() => (r.isDir ? toggle(r.path) : open(r.path))}
											className={cn('absolute start-0 flex h-7 w-full items-center gap-1.5 truncate pe-2 text-start text-[13px] hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary-500)] dark:hover:bg-slate-800', r.path === selected && 'bg-[var(--color-primary-50)] font-medium dark:bg-slate-800', r.file?.excluded && 'text-slate-400')}
											style={{ top: 0, transform: `translateY(${item.start}px)`, paddingInlineStart: 8 + r.depth * 14 }}
											title={r.path}
										>
											{r.isDir ? (r.open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />) : <span className="w-3.5 shrink-0" />}
											<Icon className="size-3.5 shrink-0" aria-hidden />
											<span className="truncate">{r.name}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</aside>

				<div
					role="separator"
					aria-orientation="vertical"
					aria-label={t('resize')}
					aria-valuenow={w}
					tabIndex={0}
					{...handleProps}
					className="hidden w-1.5 shrink-0 cursor-col-resize bg-slate-100 hover:bg-[var(--color-primary-300)] focus-visible:bg-[var(--color-primary-400)] md:block dark:bg-slate-800"
				/>

				{/* viewer pane */}
				<section className={cn('min-h-0 min-w-0 flex-1 flex-col', mobileTab === 'file' ? 'flex' : 'hidden md:flex')} aria-live="polite">
					<form onSubmit={runCodeSearch} className="flex items-center gap-2 border-b border-slate-200 p-2 dark:border-slate-800">
						<div className="relative flex-1">
							<Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-slate-400" aria-hidden />
							<Input value={codeQuery} onChange={(e) => setCodeQuery(e.target.value)} placeholder={t('searchCode')} aria-label={t('searchCode')} className="ps-8" />
						</div>
						{codeHits ? (
							<button type="button" onClick={() => { setCodeHits(null); setCodeQuery(''); }} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t('clearSearch')}>
								<X className="size-4" />
							</button>
						) : null}
					</form>

					{codeHits ? (
						<div className="min-h-0 flex-1 overflow-auto p-3">
							{codeHits.error ? (
								<ErrorState message={codeHits.error} />
							) : codeHits.length === 0 ? (
								<EmptyState title={t('noCodeHits')} />
							) : (
								<ul className="space-y-3">
									{codeHits.map((h) => (
										<li key={h.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
											<SourceChip path={h.path} startLine={h.startLine} endLine={h.endLine} />
											<pre dir="ltr" className="mt-2 max-h-32 overflow-hidden text-xs text-slate-600 dark:text-slate-300">{h.text.slice(0, 500)}</pre>
										</li>
									))}
								</ul>
							)}
						</div>
					) : !selected ? (
						<div className="grid flex-1 place-items-center p-6"><EmptyState icon={File} title={t('pickFile')} body={t('pickFileBody')} /></div>
					) : fileQ.isLoading ? (
						<div className="p-3"><SkeletonRows rows={10} /></div>
					) : fileQ.isError ? (
						<div className="p-3"><ErrorState message={fileQ.error?.response?.status === 404 ? t('fileNotFound') : errorMessage(fileQ.error)} onRetry={fileQ.refetch} /></div>
					) : (
						<>
							<header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
								<bdi dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[13px]">{f.path}</bdi>
								<span className="text-xs text-slate-500">{f.language || t('plain')} · {t('lines', { n: f.lineCount })} · {formatBytes(f.sizeBytes)}</span>
								<CopyButton text={f.path} label={t('copyPath')} />
							</header>
							{f.excluded ? (
								<div className="grid flex-1 place-items-center p-6">
									<EmptyState icon={FileLock2} title={t(`excluded.${f.excludeReason}.title`)} body={t(`excluded.${f.excludeReason}.body`)} />
								</div>
							) : (
								<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
									<div className="min-h-0 min-w-0 flex-1 p-2">
										<CodeViewer content={f.content} language={f.language} range={range} className="h-full" />
									</div>
									<aside className="max-h-56 shrink-0 space-y-3 overflow-auto border-t border-slate-200 p-3 text-sm lg:max-h-none lg:w-64 lg:border-s lg:border-t-0 dark:border-slate-800">
										<div>
											<h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('outline')}</h3>
											{f.symbols.length === 0 ? <p className="text-xs text-slate-400">{t('none')}</p> : (
												<ul className="space-y-0.5" dir="ltr">
													{f.symbols.slice(0, 120).map((s, i) => (
														<li key={i}><button className="w-full truncate rounded px-1 text-start text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => open(f.path, s.line)}>{s.name} <span className="text-slate-400">· {s.kind}:{s.line}</span></button></li>
													))}
												</ul>
											)}
										</div>
										<div>
											<h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('imports')}</h3>
											{f.imports.length === 0 ? <p className="text-xs text-slate-400">{t('none')}</p> : (
												<ul className="space-y-0.5" dir="ltr">
													{f.imports.slice(0, 60).map((im, i) => (
														<li key={i} className="truncate text-xs">{im.resolved ? <button className="text-[var(--color-primary-700)] underline dark:text-[var(--color-primary-300)]" onClick={() => open(im.resolved)}>{im.spec}</button> : <span className="text-slate-500">{im.spec}</span>}</li>
													))}
												</ul>
											)}
										</div>
										<div>
											<h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('importedBy')}</h3>
											{f.importedBy.length === 0 ? <p className="text-xs text-slate-400">{t('none')}</p> : (
												<ul className="space-y-0.5" dir="ltr">
													{f.importedBy.map((p) => (
														<li key={p} className="truncate text-xs"><button className="text-[var(--color-primary-700)] underline dark:text-[var(--color-primary-300)]" onClick={() => open(p)}>{p}</button></li>
													))}
												</ul>
											)}
										</div>
									</aside>
								</div>
							)}
						</>
					)}
				</section>
			</div>
		</div>
	);
}
