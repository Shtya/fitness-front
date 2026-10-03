'use client';

import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, ExternalLink, WrapText, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyButton, SourceLabel, formatBytes } from './ui';

const CHUNK = 60_000;

const CLS = {
	comment: 'text-slate-400 italic dark:text-slate-500',
	string: 'text-emerald-700 dark:text-emerald-300',
	number: 'text-amber-700 dark:text-amber-300',
	keyword: 'text-violet-700 dark:text-violet-300',
	tag: 'text-rose-700 dark:text-rose-300',
	attr: 'text-sky-700 dark:text-sky-300',
	prop: 'text-sky-700 dark:text-sky-300',
	fn: 'text-indigo-700 dark:text-indigo-300',
	punct: 'text-slate-500 dark:text-slate-400',
	atrule: 'text-violet-700 dark:text-violet-300',
	selector: 'text-rose-700 dark:text-rose-300',
	variable: 'text-fuchsia-700 dark:text-fuchsia-300',
	literal: 'text-amber-700 dark:text-amber-300',
	key: 'text-sky-700 dark:text-sky-300',
};

const JS_KEYWORDS = new Set(
	'const let var function return if else for while do switch case break continue new this class extends import from export default async await try catch finally throw typeof instanceof in of void delete yield static get set super null undefined true false'.split(
		' ',
	),
);

function tokenizeJs(code) {
	const out = [];
	const re =
		/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\b0x[\da-f]+\b)|([A-Za-z_$][\w$]*)|([{}()[\];,.:?=<>+\-*/%!&|^~]+)|(\s+)|(.)/gi;
	let m;
	while ((m = re.exec(code))) {
		if (m[1]) out.push(['comment', m[1]]);
		else if (m[2]) out.push(['string', m[2]]);
		else if (m[3]) out.push(['number', m[3]]);
		else if (m[4]) {
			const next = code[re.lastIndex];
			out.push([JS_KEYWORDS.has(m[4]) ? 'keyword' : next === '(' ? 'fn' : '', m[4]]);
		} else if (m[5]) out.push(['punct', m[5]]);
		else out.push(['', m[0]]);
	}
	return out;
}

function tokenizeJson(code) {
	const out = [];
	const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])|(\s+)|(.)/gi;
	let m;
	while ((m = re.exec(code))) {
		if (m[1]) {
			out.push([m[2] ? 'key' : 'string', m[1]]);
			if (m[2]) out.push(['punct', m[2]]);
		} else if (m[3]) out.push(['number', m[3]]);
		else if (m[4]) out.push(['literal', m[4]]);
		else if (m[5]) out.push(['punct', m[5]]);
		else out.push(['', m[0]]);
	}
	return out;
}

function tokenizeCss(code) {
	const out = [];
	const re =
		/(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@[\w-]+)|(--[\w-]+)|(#[\da-f]{3,8}\b)|(-?\d*\.?\d+(?:px|rem|em|%|s|ms|vh|vw|deg|fr|ch|dvh|svh)?\b)|([{};:,()])|([^\s{};:,()"'/]+)|(\s+)|(.)/gi;
	let depth = 0;
	let m;
	while ((m = re.exec(code))) {
		if (m[1]) out.push(['comment', m[1]]);
		else if (m[2]) out.push(['string', m[2]]);
		else if (m[3]) out.push(['atrule', m[3]]);
		else if (m[4]) out.push(['variable', m[4]]);
		else if (m[5]) out.push(['number', m[5]]);
		else if (m[6]) out.push(['number', m[6]]);
		else if (m[7]) {
			if (m[7] === '{') depth++;
			if (m[7] === '}') depth = Math.max(0, depth - 1);
			out.push(['punct', m[7]]);
		} else if (m[8]) {
			const rest = code.slice(re.lastIndex, re.lastIndex + 40);
			const isProp = depth > 0 && /^\s*:/.test(rest) && !/^\s*:[a-z-]+\s*[{,(]/i.test(rest);
			const isSelector = /^[^;{}]*\{/.test(code.slice(re.lastIndex, re.lastIndex + 300)) && !isProp;
			out.push([isProp ? 'prop' : isSelector ? 'selector' : /\($/.test(m[8]) ? 'fn' : '', m[8]]);
		} else out.push(['', m[0]]);
	}
	return out;
}

function tokenizeHtml(code) {
	const out = [];
	const re = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][\w:-]*)([^>]*?)(\/?>)|([^<]+)|(<)/g;
	const attrRe = /([^\s=/]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s>]+)?|(\s+)|(.)/g;
	let m;
	while ((m = re.exec(code))) {
		if (m[1]) out.push(['comment', m[1]]);
		else if (m[2]) {
			out.push(['tag', m[2]]);
			let a;
			attrRe.lastIndex = 0;
			while ((a = attrRe.exec(m[3]))) {
				if (!a[0]) break;
				if (a[1]) {
					out.push(['attr', a[1]]);
					if (a[2]) out.push(['punct', a[2]]);
					if (a[3]) out.push(['string', a[3]]);
				} else out.push(['', a[0]]);
			}
			out.push(['tag', m[4]]);
		} else out.push(['', m[0]]);
	}
	return out;
}

const TOKENIZERS = { js: tokenizeJs, javascript: tokenizeJs, jsx: tokenizeJs, tsx: tokenizeJs, json: tokenizeJson, css: tokenizeCss, html: tokenizeHtml, svg: tokenizeHtml, xml: tokenizeHtml };

export function formatCode(code, language) {
	const text = String(code || '');
	if (language === 'json') {
		try {
			return JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			return text;
		}
	}
	if (language === 'css') {
		let depth = 0;
		return text
			.replace(/\/\*[\s\S]*?\*\//g, (c) => `${c}\n`)
			.replace(/\s*([{};])\s*/g, (_, ch) => {
				if (ch === '{') {
					depth++;
					return ` {\n${'  '.repeat(depth)}`;
				}
				if (ch === '}') {
					depth = Math.max(0, depth - 1);
					return `\n${'  '.repeat(depth)}}\n${'  '.repeat(depth)}`;
				}
				return `;\n${'  '.repeat(depth)}`;
			})
			.replace(/\n\s*\n/g, '\n')
			.trim();
	}
	if (language === 'html' || language === 'svg' || language === 'xml') {
		let depth = 0;
		const VOID = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr|path|circle|rect|line|polygon|polyline|ellipse|stop|use)\b/i;
		return text
			.replace(/>\s*</g, '>\n<')
			.split('\n')
			.map((line) => {
				const trimmed = line.trim();
				if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1);
				const indented = `${'  '.repeat(Math.min(depth, 20))}${trimmed}`;
				if (/^<[a-zA-Z]/.test(trimmed) && !VOID.test(trimmed) && !/\/>$/.test(trimmed) && !/<\/[\w:-]+>$/.test(trimmed)) depth++;
				return indented;
			})
			.join('\n');
	}
	if (language === 'js' && !/\n/.test(text.slice(0, 4000)) && text.length > 400) {
		return text.replace(/;(?=\S)/g, ';\n').replace(/\{(?=\S)/g, '{\n').replace(/\}(?=[^\s;,)])/g, '}\n');
	}
	return text;
}

function CodeViewerImpl({ code, language = 'text', title, label = 'extracted', url, bytes, truncated, maxHeight = 480, filename, defaultFormat = false, className, headerExtra }) {
	const t = useTranslations('siteInspector');
	const [wrap, setWrap] = useState(false);
	const [formatted, setFormatted] = useState(defaultFormat);
	const [limit, setLimit] = useState(CHUNK);
	const source = useMemo(() => (formatted ? formatCode(code, language) : String(code || '')), [code, language, formatted]);
	const visible = source.length > limit ? source.slice(0, limit) : source;
	const lines = useMemo(() => {
		const tokenize = TOKENIZERS[language];
		const tokens = tokenize ? tokenize(visible) : [['', visible]];
		const rows = [[]];
		for (const [cls, text] of tokens) {
			const parts = text.split('\n');
			parts.forEach((part, i) => {
				if (i > 0) rows.push([]);
				if (part) rows[rows.length - 1].push([cls, part]);
			});
		}
		return rows;
	}, [visible, language]);

	const onDownload = () => {
		const blob = new Blob([source], { type: 'text/plain;charset=utf-8' });
		const href = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = href;
		a.download = filename || `extracted.${language === 'javascript' ? 'js' : language || 'txt'}`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(href), 1000);
	};

	return (
		<div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950', className)}>
			<div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
				<SourceLabel kind={label === 'ai' ? 'ai' : 'extracted'} />
				<span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{language}</span>
				<span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-300" dir="ltr" title={url || title}>
					{title}
				</span>
				{(bytes || source.length) > 0 && <span className="text-[11px] text-slate-400">{formatBytes(bytes || source.length)}</span>}
				{headerExtra}
				<div className="flex items-center gap-1">
					{language !== 'text' && (
						<button
							type="button"
							onClick={() => setFormatted((v) => !v)}
							title={t('format')}
							aria-pressed={formatted}
							className={cn('grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white', formatted && 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300')}
						>
							<Wand2 className="size-3.5" />
						</button>
					)}
					<button
						type="button"
						onClick={() => setWrap((v) => !v)}
						title={t('wrap')}
						aria-pressed={wrap}
						className={cn('grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white', wrap && 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300')}
					>
						<WrapText className="size-3.5" />
					</button>
					<button type="button" onClick={onDownload} title={t('download')} className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white">
						<Download className="size-3.5" />
					</button>
					{url && /^https?:/.test(url) && (
						<a href={url} target="_blank" rel="noopener noreferrer nofollow" title={t('openOriginal')} className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white">
							<ExternalLink className="size-3.5" />
						</a>
					)}
					<CopyButton value={source} />
				</div>
			</div>
			<div className="overflow-auto" style={{ maxHeight }} dir="ltr">
				<pre className={cn('min-w-full py-2 font-mono text-[11.5px] leading-5 text-slate-800 dark:text-slate-200', wrap ? 'whitespace-pre-wrap break-all' : 'w-max whitespace-pre')}>
					{lines.map((row, i) => (
						<div key={i} className="flex hover:bg-indigo-50/50 dark:hover:bg-white/[0.03]">
							<span className="sticky left-0 w-11 shrink-0 select-none bg-slate-50/95 pe-3 text-end text-slate-300 dark:bg-slate-950/95 dark:text-slate-600">{i + 1}</span>
							<code className="min-w-0 flex-1 pe-4">
								{row.length
									? row.map(([cls, text], j) =>
											cls ? (
												<span key={j} className={CLS[cls]}>
													{text}
												</span>
											) : (
												text
											),
										)
									: ' '}
							</code>
						</div>
					))}
				</pre>
				{(source.length > limit || truncated) && (
					<div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800">
						{source.length > limit && (
							<button type="button" onClick={() => setLimit((l) => l * 3)} className="rounded-lg bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300">
								{t('showMore', { shown: formatBytes(limit), total: formatBytes(source.length) })}
							</button>
						)}
						{truncated && <span>{t('truncatedByServer')}</span>}
					</div>
				)}
			</div>
		</div>
	);
}

export const CodeViewer = memo(CodeViewerImpl);
export default CodeViewer;
