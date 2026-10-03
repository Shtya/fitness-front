'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, Cookie, ExternalLink, Globe2, Layers, ServerCog, ShieldCheck, ShieldAlert, TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeViewer from '../CodeViewer';
import { Chips, ConfidenceBar, CopyButton, EmptyState, Expandable, KeyValue, Panel, Pill, SearchInput, SourceLabel, formatBytes, includesQuery, shortUrl } from '../ui';

function TechCard({ tech }) {
	const t = useTranslations('siteInspector');
	const [open, setOpen] = useState(false);
	return (
		<div className="rounded-xl border border-slate-200/80 p-3 transition-colors hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-500/30">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
						{tech.name}
						{tech.version && <span className="ms-1.5 font-mono text-xs font-normal text-indigo-600 dark:text-indigo-300">v{tech.version}</span>}
					</p>
					{tech.note && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{tech.note}</p>}
				</div>
				{tech.website && (
					<a href={tech.website} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-indigo-600" aria-label={tech.website}>
						<ExternalLink className="size-3.5" />
					</a>
				)}
			</div>
			<div className="mt-2 flex items-center gap-2">
				<ConfidenceBar value={tech.confidence} />
				<span className="w-9 shrink-0 text-end font-mono text-[11px] text-slate-500">{tech.confidence}%</span>
			</div>
			<button type="button" onClick={() => setOpen((v) => !v)} className="mt-1.5 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-300">
				{open ? t('hideEvidence') : t('showEvidence', { count: tech.evidence.length })}
			</button>
			{open && (
				<ul className="mt-1.5 space-y-1">
					{tech.evidence.map((e, i) => (
						<li key={i} className="break-all rounded bg-slate-50 px-2 py-1 font-mono text-[10.5px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" dir="ltr">
							{e}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function RequestsTable({ requests }) {
	const t = useTranslations('siteInspector');
	const [query, setQuery] = useState('');
	const [type, setType] = useState('all');
	const types = useMemo(() => ['all', ...new Set(requests.map((r) => r.type))], [requests]);
	const rows = requests.filter((r) => (type === 'all' || r.type === type) && includesQuery(query, r.url, r.mime, r.status));
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<SearchInput value={query} onChange={setQuery} placeholder={t('filterRequests')} className="min-w-[200px] flex-1" />
				<div className="flex flex-wrap gap-1">
					{types.map((ty) => (
						<button
							key={ty}
							type="button"
							onClick={() => setType(ty)}
							className={cn('h-7 rounded-lg px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800', type === ty && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300')}
						>
							{ty}
						</button>
					))}
				</div>
			</div>
			<div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800" dir="ltr">
				<table className="w-full min-w-[640px] text-[11px]">
					<thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
						<tr className="text-slate-500">
							{['status', 'type', 'url', 'mime', 'size', ''].map((h) => (
								<th key={h} className="px-2 py-1.5 text-start font-medium">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((r, i) => (
							<tr key={`${r.url}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
								<td className={cn('px-2 py-1 font-mono', r.failed ? 'text-rose-500' : r.status >= 400 ? 'text-amber-600' : 'text-emerald-600')}>{r.failed ? (r.blocked ? 'blocked' : 'failed') : r.status}</td>
								<td className="px-2 py-1 text-slate-500">{r.type}</td>
								<td className="max-w-[420px] truncate px-2 py-1 font-mono text-slate-700 dark:text-slate-300" title={r.url}>
									{r.thirdParty && <Pill tone="amber" className="me-1">3p</Pill>}
									{shortUrl(r.url, 90)}
								</td>
								<td className="px-2 py-1 text-slate-500">{r.mime}</td>
								<td className="px-2 py-1 font-mono text-slate-500">{r.size ? formatBytes(r.size) : r.fromCache ? 'cache' : '—'}</td>
								<td className="px-2 py-1">
									<CopyButton value={r.url} size="xs" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{!rows.length && <p className="p-4 text-center text-xs text-slate-400">{t('noMatches')}</p>}
			</div>
		</div>
	);
}

export default function TechTab({ report }) {
	const t = useTranslations('siteInspector');
	const [query, setQuery] = useState('');
	const net = report.network || {};
	const groups = useMemo(() => {
		const map = new Map();
		for (const tech of report.tech || []) {
			if (!includesQuery(query, tech.name, tech.category, tech.version, tech.note)) continue;
			if (!map.has(tech.category)) map.set(tech.category, []);
			map.get(tech.category).push(tech);
		}
		return [...map.entries()];
	}, [report.tech, query]);
	const maxTypeBytes = Math.max(1, ...(net.byType || []).map((x) => x.bytes));

	return (
		<div className="space-y-4">
			<Panel
				title={t('technologies')}
				icon={Layers}
				subtitle={t('techHint')}
				actions={
					<>
						<SourceLabel />
						<SearchInput value={query} onChange={setQuery} placeholder={t('searchTech')} className="w-48" />
					</>
				}
			>
				{groups.length ? (
					<div className="space-y-5">
						{groups.map(([category, items]) => (
							<div key={category}>
								<p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
									{category} <span className="rounded bg-slate-100 px-1.5 text-[10px] dark:bg-slate-800">{items.length}</span>
								</p>
								<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
									{items.map((tech) => (
										<TechCard key={tech.name} tech={tech} />
									))}
								</div>
							</div>
						))}
					</div>
				) : (
					<EmptyState icon={Layers}>{query ? t('noMatches') : t('noTech')}</EmptyState>
				)}
			</Panel>

			<div className="grid gap-4 lg:grid-cols-2">
				<Panel title={t('networkSummary')} icon={Activity} subtitle={net.requestCount ? `${net.requestCount} requests · ${formatBytes(net.totalBytes)}` : t('needsBrowser')}>
					<div className="space-y-2">
						{(net.byType || []).map((x) => (
							<div key={x.type} className="grid grid-cols-[90px_1fr_110px] items-center gap-2 text-xs">
								<span className="truncate text-slate-600 dark:text-slate-300">{x.type}</span>
								<div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
									<div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${(x.bytes / maxTypeBytes) * 100}%` }} />
								</div>
								<span className="text-end font-mono text-[11px] text-slate-500">
									{x.count} · {formatBytes(x.bytes)}
								</span>
							</div>
						))}
					</div>
				</Panel>
				<Panel title={t('domains')} icon={Globe2}>
					<div className="max-h-[260px] space-y-1 overflow-auto">
						{(net.domains || []).map((d) => (
							<div key={d.domain} className="flex items-center justify-between gap-2 text-xs">
								<span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-slate-700 dark:text-slate-300" dir="ltr">
									{d.thirdParty ? <Pill tone="amber">3p</Pill> : <Pill tone="emerald">1p</Pill>}
									{d.domain}
								</span>
								<span className="shrink-0 font-mono text-[11px] text-slate-500">
									{d.count} · {formatBytes(d.bytes)}
								</span>
							</div>
						))}
						{!net.domains?.length && <EmptyState>{t('needsBrowser')}</EmptyState>}
					</div>
				</Panel>
			</div>

			<Panel title={t('apis')} icon={ServerCog} subtitle={t('apisHint')}>
				{net.apis?.length ? (
					<div className="space-y-2">
						{net.apis.map((api, i) => (
							<Expandable
								key={`${api.url}-${i}`}
								title={
									<span className="font-mono" dir="ltr">
										<span className="me-1.5 font-semibold text-indigo-600 dark:text-indigo-300">{api.method}</span>
										{shortUrl(api.url, 100)}
									</span>
								}
								meta={`${api.status || api.failed || ''} · ${api.mime || api.type}${api.graphql ? ' · GraphQL' : ''}`}
								actions={<CopyButton value={api.url} size="xs" />}
							>
								{api.preview ? <CodeViewer code={api.preview} language={/json/.test(api.mime) ? 'json' : 'text'} title={t('responsePreview')} defaultFormat maxHeight={280} /> : <p className="text-xs text-slate-500">{t('noPreview')}</p>}
							</Expandable>
						))}
					</div>
				) : (
					<EmptyState icon={ServerCog}>{t('noApis')}</EmptyState>
				)}
			</Panel>

			<div className="grid gap-4 lg:grid-cols-2">
				<Panel title={t('securityHeaders')} icon={ShieldCheck}>
					<ul className="space-y-1.5">
						{(net.security || []).map((h) => (
							<li key={h.name} className="flex items-start gap-2 text-xs">
								{h.present ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> : <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-slate-300 dark:text-slate-600" />}
								<div className="min-w-0" dir="ltr">
									<p className="font-mono text-slate-800 dark:text-slate-200">{h.name}</p>
									{h.value && <p className="break-all font-mono text-[10.5px] text-slate-500">{h.value}</p>}
								</div>
							</li>
						))}
					</ul>
				</Panel>
				<Panel title={t('responseHeaders')} icon={TerminalSquare} actions={<CopyButton value={Object.entries(net.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')} />}>
					<div className="max-h-[300px] overflow-auto">
						<KeyValue rows={Object.entries(net.headers || {})} />
					</div>
				</Panel>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Panel title={t('cookies')} icon={Cookie} subtitle={t('cookiesHint')}>
					<Chips items={net.cookies} empty={t('none')} tone="amber" />
				</Panel>
				<Panel title={t('consoleErrors')} icon={TerminalSquare}>
					{net.consoleErrors?.length ? (
						<ul className="max-h-[220px] space-y-1 overflow-auto">
							{net.consoleErrors.map((e, i) => (
								<li key={i} className="break-all rounded bg-rose-50 px-2 py-1 font-mono text-[10.5px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" dir="ltr">
									{e}
								</li>
							))}
						</ul>
					) : (
						<span className="text-xs text-slate-400">{t('none')}</span>
					)}
				</Panel>
			</div>

			<Panel title={t('allRequests')} icon={Activity}>
				{net.requests?.length ? <RequestsTable requests={net.requests} /> : <EmptyState>{t('needsBrowser')}</EmptyState>}
			</Panel>
		</div>
	);
}
