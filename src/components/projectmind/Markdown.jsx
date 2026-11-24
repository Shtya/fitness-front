'use client';

import { isValidElement, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from './ui';
import { cn } from '@/lib/utils';

function slug(text) {
	return String(text)
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

function textOf(node) {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(textOf).join('');
	if (isValidElement(node)) return textOf(node.props.children);
	return '';
}

const heading = (Tag) =>
	function H({ children }) {
		const id = slug(textOf(children));
		return (
			<Tag id={id} className="group scroll-mt-20">
				{children}
				<a href={`#${id}`} className="ms-2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 dark:text-slate-600" aria-label="Link to this heading">
					#
				</a>
			</Tag>
		);
	};

const components = {
	h1: heading('h1'),
	h2: heading('h2'),
	h3: heading('h3'),
	a: ({ href, children }) => (
		<a href={href} target={/^https?:/.test(href || '') ? '_blank' : undefined} rel="noopener noreferrer nofollow">
			{children}
		</a>
	),
	pre: ({ children }) => {
		const code = textOf(children).replace(/\n$/, '');
		return (
			<div className="not-prose relative my-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" dir="ltr">
				<CopyButton text={code} className="absolute end-1 top-1 h-7" />
				<pre className="overflow-x-auto p-3 pe-20 text-[12.5px] leading-5">{children}</pre>
			</div>
		);
	},
	table: ({ children }) => (
		<div className="my-3 overflow-x-auto">
			<table className="min-w-full text-sm">{children}</table>
		</div>
	),
	code: ({ className, children }) => <code className={cn('font-mono', className)} dir="ltr">{children}</code>,
};

/** Markdown with copyable code blocks and heading anchors. Raw HTML is NOT rendered (react-markdown default), so repo content cannot inject script. */
export const Markdown = memo(function Markdown({ children, className }) {
	return (
		<div className={cn('pm-md', className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
				{String(children || '')}
			</ReactMarkdown>
		</div>
	);
});

/** Headings (h1-h3) for a sticky table of contents. */
export function extractToc(md) {
	const out = [];
	let fenced = false;
	for (const line of String(md || '').split('\n')) {
		if (/^```/.test(line)) fenced = !fenced;
		if (fenced) continue;
		const m = /^(#{1,3})\s+(.+)$/.exec(line);
		if (m) out.push({ level: m[1].length, text: m[2].replace(/[`*_]/g, ''), id: slug(m[2].replace(/[`*_]/g, '')) });
	}
	return out;
}
