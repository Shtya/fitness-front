'use client';

import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyButton, EmptyState, Panel, SearchInput, SourceLabel } from './ui';

const LABEL_TONE = {
	Header: 'text-sky-600 dark:text-sky-300',
	Navigation: 'text-sky-600 dark:text-sky-300',
	Main: 'text-emerald-600 dark:text-emerald-300',
	Footer: 'text-sky-600 dark:text-sky-300',
	Section: 'text-emerald-600 dark:text-emerald-300',
	Hero: 'text-fuchsia-600 dark:text-fuchsia-300',
	Card: 'text-amber-600 dark:text-amber-300',
	Grid: 'text-violet-600 dark:text-violet-300',
	Row: 'text-violet-600 dark:text-violet-300',
	Stack: 'text-violet-600 dark:text-violet-300',
};

function matches(node, q) {
	return `${node.tag} ${node.id || ''} ${node.cls || ''} ${node.label || ''} ${node.text || ''}`.toLowerCase().includes(q);
}

function filterTree(node, q) {
	if (!node) return null;
	if (!q) return node;
	const kids = (node.children || []).map((c) => filterTree(c, q)).filter(Boolean);
	if (kids.length || matches(node, q)) return { ...node, children: kids.length ? kids : node.children, _hit: matches(node, q) };
	return null;
}

function toOutline(node, depth = 0) {
	if (!node) return '';
	const line = `${'  '.repeat(depth)}<${node.tag}${node.id ? `#${node.id}` : ''}${node.cls ? `.${node.cls.split(' ').join('.')}` : ''}>${node.label ? `  // ${node.label}` : ''}`;
	return [line, ...(node.children || []).map((c) => toOutline(c, depth + 1))].join('\n');
}

const TreeNode = memo(function TreeNode({ node, depth, openAll, forceOpen, onHover, onPick }) {
	const [open, setOpen] = useState(openAll ?? depth < 2);
	const hasKids = !!node.children?.length;
	const expanded = forceOpen || open;
	return (
		<li>
			<div
				className={cn('group flex min-w-0 items-center gap-1 rounded-md py-0.5 pe-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10', node._hit && 'bg-amber-50 dark:bg-amber-500/10')}
				style={{ paddingInlineStart: depth * 14 + 4 }}
				onMouseEnter={() => onHover(node)}
				onMouseLeave={() => onHover(null)}
			>
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					disabled={forceOpen}
					className={cn('grid size-4 shrink-0 place-items-center text-slate-400', !hasKids && 'invisible')}
					aria-label={expanded ? 'Collapse' : 'Expand'}
				>
					<ChevronDown className={cn('size-3.5 transition-transform', !expanded && '-rotate-90 rtl:rotate-90')} />
				</button>
				<button type="button" onClick={() => onPick(node)} className="flex min-w-0 flex-1 items-center gap-1.5 text-start font-mono text-[11.5px]" dir="ltr">
					<span className="text-rose-600 dark:text-rose-300">{node.tag}</span>
					{node.id && <span className="truncate text-amber-600 dark:text-amber-300">#{node.id}</span>}
					{node.cls && <span className="max-w-[260px] truncate text-slate-400">.{node.cls.split(' ').join('.')}</span>}
					{node.label && <span className={cn('shrink-0 rounded bg-slate-100 px-1 font-sans text-[10px] font-semibold dark:bg-slate-800', LABEL_TONE[node.label] || 'text-slate-500')}>{node.label}</span>}
					{node.text && <span className="truncate font-sans text-slate-500 dark:text-slate-400">“{node.text}”</span>}
					{node.wrappers ? <span className="shrink-0 text-[10px] text-slate-400" title="Collapsed single-child wrappers">+{node.wrappers}⤵</span> : null}
				</button>
				<span className="hidden shrink-0 font-mono text-[10px] text-slate-400 group-hover:inline" dir="ltr">
					{node.w}×{node.h} · {node.display}
				</span>
			</div>
			{hasKids && expanded && (
				<ul>
					{node.children.map((child, i) => (
						<TreeNode key={`${child.sel}-${i}`} node={child} depth={depth + 1} openAll={openAll} forceOpen={forceOpen} onHover={onHover} onPick={onPick} />
					))}
					{node.more ? (
						<li className="py-0.5 text-[11px] text-slate-400" style={{ paddingInlineStart: (depth + 1) * 14 + 24 }}>
							+{node.more} more…
						</li>
					) : null}
				</ul>
			)}
		</li>
	);
});

export default function ComponentTree({ tree, onHover, onPick }) {
	const t = useTranslations('siteInspector');
	const [query, setQuery] = useState('');
	const [openAll, setOpenAll] = useState(null);
	const q = query.trim().toLowerCase();
	const filtered = useMemo(() => filterTree(tree, q), [tree, q]);
	const outline = useMemo(() => (tree ? toOutline(tree) : ''), [tree]);

	return (
		<Panel
			title={t('componentTree')}
			icon={Network}
			subtitle={t('componentTreeHint')}
			actions={
				<>
					<SourceLabel />
					<button type="button" onClick={() => setOpenAll(openAll ? false : true)} className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400" title={openAll ? t('collapseAll') : t('expandAll')}>
						{openAll ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
					</button>
					<CopyButton value={outline} label={t('copyOutline')} />
				</>
			}
		>
			{tree ? (
				<>
					<SearchInput value={query} onChange={setQuery} placeholder={t('searchTree')} className="mb-3" />
					<div className="max-h-[560px] overflow-auto">
						{filtered ? (
							<ul>
								<TreeNode key={String(openAll)} node={filtered} depth={0} openAll={openAll ?? undefined} forceOpen={!!q} onHover={onHover} onPick={onPick} />
							</ul>
						) : (
							<EmptyState>{t('noMatches')}</EmptyState>
						)}
					</div>
				</>
			) : (
				<EmptyState icon={Network}>{t('needsBrowser')}</EmptyState>
			)}
		</Panel>
	);
}
