'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

const KEYWORDS = new Set(
	'abstract async await break case catch class const continue debugger def default delete do else enum export extends finally for from function if implements import in instanceof interface is let new null of package private protected public raise return self static super switch this throw try type typeof undefined var void while with yield true false None True False lambda pass elif except not and or fn func struct impl pub mod use mut match select where create table index primary key references insert into update set values begin commit'.split(' '),
);

const TOKEN = /(\/\/[^\n]*|#[^\n]*|--[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)/g;

/** Tiny dependency-free tokenizer: comments, strings, numbers, keywords. Good enough to read code; not a parser. */
function highlight(line, lang) {
	const out = [];
	let last = 0;
	const hashComment = lang === 'python' || lang === 'shell' || lang === 'yaml' || lang === 'toml' || lang === 'docker';
	const slashComment = !hashComment && lang !== 'sql' && lang !== 'markdown';
	line.replace(TOKEN, (m, comment, str, num, word, idx) => {
		if (idx > last) out.push(line.slice(last, idx));
		last = idx + m.length;
		if (comment) {
			const isHash = comment.startsWith('#');
			const isDash = comment.startsWith('--');
			const ok = (isHash && hashComment) || (isDash && lang === 'sql') || (!isHash && !isDash && slashComment) || comment.startsWith('/*');
			out.push(ok ? <span key={idx} className="text-slate-400 italic dark:text-slate-500">{comment}</span> : comment);
		} else if (str) out.push(<span key={idx} className="text-emerald-700 dark:text-emerald-300">{str}</span>);
		else if (num) out.push(<span key={idx} className="text-orange-600 dark:text-orange-300">{num}</span>);
		else if (word && KEYWORDS.has(word)) out.push(<span key={idx} className="font-medium text-violet-700 dark:text-violet-300">{word}</span>);
		else out.push(word);
		return m;
	});
	if (last < line.length) out.push(line.slice(last));
	return out;
}

const ROW = 20;

const Row = memo(function Row({ n, text, lang, active, width }) {
	return (
		<div className={cn('flex min-w-full', active && 'bg-amber-100/70 dark:bg-amber-400/15')} style={{ height: ROW }} data-line={n}>
			<span className="sticky start-0 z-[1] w-12 shrink-0 select-none bg-slate-50 pe-3 text-end text-slate-400 dark:bg-slate-900 dark:text-slate-500" style={{ width }}>
				{n}
			</span>
			<span className="whitespace-pre ps-3">{highlight(text, lang)}</span>
		</div>
	);
});

/**
 * Virtualized, line-numbered code view. `range` = [start, end] (1-based, inclusive) is highlighted and scrolled to.
 * Always rendered LTR, even inside an RTL page, because code and paths must not mirror.
 */
export function CodeViewer({ content, language, range, className }) {
	const lines = useMemo(() => String(content ?? '').split('\n'), [content]);
	const parentRef = useRef(null);
	const v = useVirtualizer({ count: lines.length, getScrollElement: () => parentRef.current, estimateSize: () => ROW, overscan: 30 });
	const gutter = Math.max(36, String(lines.length).length * 9 + 20);

	useEffect(() => {
		if (range?.[0]) v.scrollToIndex(Math.max(0, range[0] - 4), { align: 'start' });
	}, [range?.[0], range?.[1], content]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div
			ref={parentRef}
			dir="ltr"
			role="region"
			tabIndex={0}
			aria-label="Source code"
			className={cn('relative overflow-auto rounded-lg border border-slate-200 bg-slate-50 font-mono text-[12.5px] leading-5 text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100', className)}
		>
			<div style={{ height: v.getTotalSize(), position: 'relative', minWidth: 'max-content' }}>
				{v.getVirtualItems().map((item) => {
					const n = item.index + 1;
					const active = !!range && n >= range[0] && n <= (range[1] || range[0]);
					return (
						<div key={item.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}>
							<Row n={n} text={lines[item.index]} lang={language} active={active} width={gutter} />
						</div>
					);
				})}
			</div>
		</div>
	);
}

/** "12" → [12,12]; "10-25" → [10,25]; invalid → null. */
export function parseLineRange(value) {
	const m = /^(\d+)(?:-(\d+))?$/.exec(String(value || ''));
	if (!m) return null;
	const a = Number(m[1]);
	const b = m[2] ? Number(m[2]) : a;
	return a > 0 && b >= a ? [a, b] : null;
}
