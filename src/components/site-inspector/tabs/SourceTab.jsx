'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, Braces, CheckCircle2, FileCode2, FileJson, FileType2, Map as MapIcon, PenTool, Sparkles, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeViewer from '../CodeViewer';
import { Chips, CopyButton, EmptyState, Panel, Pill, SearchInput, SourceLabel, formatBytes, includesQuery, shortUrl } from '../ui';

function fileName(url, fallback) {
	try {
		const u = new URL(url);
		return u.pathname.split('/').filter(Boolean).pop() || u.hostname;
	} catch {
		return fallback;
	}
}

function treeOutline(node, depth = 0, out = []) {
	if (!node || out.length > 1500) return out;
	out.push(`${'  '.repeat(depth)}<${node.tag}${node.id ? ` id="${node.id}"` : ''}${node.cls ? ` class="${node.cls}"` : ''}>${node.text ? ` ${node.text}` : ''}${node.more ? `  (+${node.more} more)` : ''}`);
	for (const child of node.children || []) treeOutline(child, depth + 1, out);
	return out;
}

function useFiles(source) {
	return useMemo(() => {
		const files = [];
		const add = (group, f) => files.push({ group, ...f, id: `${group}-${files.length}` });
		if (source.rawHtml?.text) add('documents', { label: 'index.html (raw)', sub: 'Server response', language: 'html', code: source.rawHtml.text, bytes: source.rawHtml.bytes, truncated: source.rawHtml.truncated, filename: 'index.raw.html' });
		if (source.renderedHtml?.text) add('documents', { label: 'index.html (rendered DOM)', sub: 'After JavaScript', language: 'html', code: source.renderedHtml.text, bytes: source.renderedHtml.bytes, truncated: source.renderedHtml.truncated, filename: 'index.rendered.html' });
		for (const s of source.stylesheets || []) add('stylesheets', { label: fileName(s.url, 'style.css'), sub: shortUrl(s.url, 60), language: 'css', code: s.text, url: s.url, bytes: s.bytes, truncated: s.truncated, filename: fileName(s.url, 'style.css') });
		for (const s of source.styleBlocks || []) add('stylesheets', { label: `<style> #${s.index + 1}`, sub: 'Inline style block', language: 'css', code: s.text, bytes: s.bytes, truncated: s.truncated, filename: `style-${s.index + 1}.css` });
		for (const s of source.scripts || []) add('scripts', { label: fileName(s.url, 'script.js'), sub: shortUrl(s.url, 60), language: 'js', code: s.text, url: s.url, bytes: s.bytes, truncated: s.truncated, filename: fileName(s.url, 'script.js'), badge: s.minified ? 'minified' : '' });
		for (const s of source.inlineScripts || []) add('scripts', { label: s.id ? `<script id="${s.id}">` : '<script> inline', sub: s.type, language: /json/.test(s.type) ? 'json' : 'js', code: s.text, bytes: s.bytes, truncated: s.truncated });
		if (source.scriptTags?.length) add('scripts', { label: 'script tags', sub: `${source.scriptTags.length} external`, language: 'html', code: source.scriptTags.map((s) => `<script src="${s.src}"${s.type ? ` type="${s.type}"` : ''}${s.async ? ' async' : ''}${s.defer ? ' defer' : ''}></script>`).join('\n') });
		for (const j of source.jsonData || []) add('data', { label: j.id, sub: j.type, language: 'json', code: j.text, bytes: j.bytes, truncated: j.truncated, filename: 'data.json' });
		if (source.cssVariables?.length) add('styles', { label: 'CSS variables', sub: `${source.cssVariables.length} custom properties`, language: 'css', code: groupVariables(source.cssVariables), filename: 'variables.css' });
		if (source.inlineStyles?.length) add('styles', { label: 'Inline styles', sub: `${source.inlineStyles.length} style="" attributes`, language: 'css', code: source.inlineStyles.map((s) => `${s.selector} {\n  ${s.style.replace(/;\s*/g, ';\n  ').trim()}\n}`).join('\n\n'), filename: 'inline-styles.css' });
		if (source.svgs?.length) add('svg', { label: 'Inline SVGs', sub: `${source.svgs.length} unique`, language: 'svg', code: source.svgs.map((s) => `<!-- ${s.selector || 'svg'} -->\n${s.markup}`).join('\n\n'), filename: 'icons.svg.html' });
		if (source.domTree) add('dom', { label: 'DOM structure', sub: 'Simplified element outline', language: 'html', code: treeOutline(source.domTree).join('\n'), filename: 'dom-outline.html' });
		return files;
	}, [source]);
}

function groupVariables(vars) {
	const byScope = new Map();
	for (const v of vars) {
		if (!byScope.has(v.scope)) byScope.set(v.scope, []);
		byScope.get(v.scope).push(`  ${v.name}: ${v.value};`);
	}
	return [...byScope.entries()].map(([scope, lines]) => `${scope} {\n${lines.join('\n')}\n}`).join('\n\n');
}

const GROUP_ICON = { documents: FileCode2, stylesheets: FileType2, scripts: Braces, data: FileJson, styles: Wind, svg: PenTool, dom: FileCode2 };

function ClassesPanel({ classes }) {
	const t = useTranslations('siteInspector');
	const [query, setQuery] = useState('');
	if (!classes?.total) return null;
	const cats = Object.entries(classes.categories || {}).sort((a, b) => b[1].length - a[1].length);
	const allClasses = (classes.topClasses || []).map((c) => c.cls).join(' ');
	return (
		<Panel
			title={t('classAnalysis')}
			icon={Wind}
			subtitle={t('classSummary', { total: classes.total, unique: classes.unique, ratio: Math.round(classes.tailwindRatio * 100) })}
			actions={
				<>
					<SourceLabel />
					{classes.likelyTailwind && <Pill tone="sky">Tailwind</Pill>}
					<SearchInput value={query} onChange={setQuery} placeholder={t('searchClasses')} className="w-44" />
					<CopyButton value={allClasses} label={t('copyTop')} />
				</>
			}
		>
			<div className="space-y-4">
				<div className="flex flex-wrap gap-2 text-xs">
					<Pill tone="indigo">utility-like: {classes.tailwindLike}</Pill>
					<Pill tone="amber">arbitrary values: {classes.arbitraryValues}</Pill>
					{classes.variants?.slice(0, 12).map((v) => (
						<Pill key={v.variant} tone="violet" className="font-mono">
							{v.variant}: ×{v.count}
						</Pill>
					))}
				</div>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{cats.map(([cat, items]) => {
						const filtered = items.filter((c) => includesQuery(query, c.cls));
						if (!filtered.length) return null;
						return (
							<div key={cat} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
								<div className="mb-2 flex items-center justify-between">
									<p className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
										{cat} <span className="font-normal text-slate-400">· {items.length}</span>
									</p>
									<CopyButton value={filtered.map((c) => c.cls).join(' ')} size="xs" />
								</div>
								<div className="max-h-40 overflow-auto">
									<Chips items={filtered.map((c) => c.cls)} tone="indigo" max={80} />
								</div>
							</div>
						);
					})}
				</div>
				{classes.cssModules?.length > 0 && (
					<div>
						<p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('cssModules')}</p>
						<Chips items={classes.cssModules.map((c) => c.cls)} max={40} />
					</div>
				)}
				{!classes.likelyTailwind && (
					<div>
						<p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('topClasses')}</p>
						<Chips items={(classes.topClasses || []).filter((c) => includesQuery(query, c.cls)).map((c) => `${c.cls} ×${c.count}`)} max={80} />
					</div>
				)}
			</div>
		</Panel>
	);
}

export default function SourceTab({ report }) {
	const t = useTranslations('siteInspector');
	const source = report.source || {};
	const files = useFiles(source);
	const [activeId, setActiveId] = useState(null);
	const [query, setQuery] = useState('');
	const active = files.find((f) => f.id === activeId) || files[0];
	const visibleFiles = files.filter((f) => includesQuery(query, f.label, f.sub, f.url));
	const groups = [...new Set(visibleFiles.map((f) => f.group))];

	return (
		<div className="space-y-4">
			<div className="grid gap-3 lg:grid-cols-3">
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
					<p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
						<CheckCircle2 className="size-4" />
						{t('canExtract')}
					</p>
					<p className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">{t('canExtractBody')}</p>
				</div>
				<div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
					<p className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
						<Ban className="size-4" />
						{t('cannotExtract')}
					</p>
					<p className="text-xs leading-relaxed text-rose-900/80 dark:text-rose-200/80">{t('cannotExtractBody')}</p>
				</div>
				<div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/20 dark:bg-violet-500/5">
					<p className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-300">
						<Sparkles className="size-4" />
						{t('aiReconstructed')}
					</p>
					<p className="text-xs leading-relaxed text-violet-900/80 dark:text-violet-200/80">{t('aiReconstructedBody')}</p>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
				<Panel title={t('files')} icon={FileCode2} bodyClassName="p-2" className="lg:sticky lg:top-28 lg:self-start">
					<SearchInput value={query} onChange={setQuery} placeholder={t('searchFiles')} className="mb-2" />
					<nav className="max-h-[560px] space-y-3 overflow-auto">
						{groups.map((g) => {
							const Icon = GROUP_ICON[g] || FileCode2;
							return (
								<div key={g}>
									<p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t(`group_${g}`)}</p>
									{visibleFiles
										.filter((f) => f.group === g)
										.map((f) => (
											<button
												key={f.id}
												type="button"
												onClick={() => setActiveId(f.id)}
												className={cn('flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-slate-100 dark:hover:bg-slate-800', active?.id === f.id && 'bg-indigo-50 hover:bg-indigo-50 dark:bg-indigo-500/15')}
											>
												<Icon className={cn('mt-0.5 size-3.5 shrink-0', active?.id === f.id ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400')} />
												<span className="min-w-0 flex-1">
													<span className="block truncate font-mono text-[11.5px] text-slate-800 dark:text-slate-200" dir="ltr">
														{f.label}
													</span>
													<span className="block truncate text-[10px] text-slate-400" dir="ltr">
														{f.sub}
														{f.bytes ? ` · ${formatBytes(f.bytes)}` : ''}
													</span>
												</span>
												{f.badge && <Pill className="shrink-0">{f.badge}</Pill>}
											</button>
										))}
								</div>
							);
						})}
						{!visibleFiles.length && <EmptyState>{t('noMatches')}</EmptyState>}
					</nav>
				</Panel>
				<div className="min-w-0 space-y-4">
					{active ? (
						<CodeViewer
							key={active.id}
							code={active.code}
							language={active.language}
							title={active.url || active.label}
							url={active.url}
							bytes={active.bytes}
							truncated={active.truncated}
							filename={active.filename}
							maxHeight={640}
						/>
					) : (
						<EmptyState icon={FileCode2}>{t('noFiles')}</EmptyState>
					)}
					<SourceMapsPanel maps={source.sourceMaps || []} />
				</div>
			</div>

			<ClassesPanel classes={source.classes} />

			{source.css && (
				<div className="flex flex-wrap gap-2 text-xs">
					<Pill>CSS: {formatBytes(source.css.bytes)}</Pill>
					<Pill>{source.css.ruleCount} rules</Pill>
					<Pill>{source.css.mediaQueryCount} media queries</Pill>
					<Pill tone={source.css.importantCount > 50 ? 'amber' : 'slate'}>{source.css.importantCount} !important</Pill>
					{source.css.layers?.length > 0 && <Pill tone="violet">@layer {source.css.layers.join(', ')}</Pill>}
					{Object.entries(source.css.features || {})
						.filter(([, v]) => v)
						.map(([k, v]) => (
							<Pill key={k} tone="sky">
								{k}
								{typeof v === 'number' ? `: ${v}` : ''}
							</Pill>
						))}
				</div>
			)}
		</div>
	);
}

function SourceMapsPanel({ maps }) {
	const t = useTranslations('siteInspector');
	return (
		<Panel title={t('sourceMaps')} icon={MapIcon} subtitle={t('sourceMapsHint')}>
			{maps.length ? (
				<div className="space-y-3">
					{maps.map((m) => (
						<div key={m.url} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
							<div className="mb-2 flex items-center gap-2">
								<p className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700 dark:text-slate-200" dir="ltr" title={m.url}>
									{shortUrl(m.url, 80)}
								</p>
								{m.error ? <Pill tone="rose">{m.error}</Pill> : <Pill tone="emerald">{m.sources.length} files</Pill>}
								{m.hasContent && <Pill tone="amber">sourcesContent</Pill>}
							</div>
							{m.sources.length > 0 && (
								<div className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-2 font-mono text-[10.5px] text-slate-600 dark:bg-slate-800/50 dark:text-slate-300" dir="ltr">
									{m.sources.map((s) => (
										<p key={s} className="truncate">
											{s}
										</p>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			) : (
				<p className="text-xs text-slate-500 dark:text-slate-400">{t('noSourceMaps')}</p>
			)}
		</Panel>
	);
}
