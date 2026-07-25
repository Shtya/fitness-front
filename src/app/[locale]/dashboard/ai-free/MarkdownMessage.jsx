'use client';

/**
 * Lightweight Markdown renderer for AI chat replies.
 * Supports common ChatGPT/Claude/Groq formatting without extra packages.
 */

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function isMostlyArabic(text) {
	const value = String(text || '');
	if (!value.trim()) return false;
	const arabic = (value.match(ARABIC_RE) || []).length;
	if (!arabic) return false;
	const latin = (value.match(/[A-Za-z]/g) || []).length;
	// Prefer RTL whenever Arabic letters dominate, or when there is clear Arabic content.
	return arabic >= latin || arabic >= 8;
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function safeHref(href) {
	const value = String(href || '').trim();
	if (!value) return '#';
	if (/^(https?:|mailto:|tel:|\/|#)/i.test(value)) return value;
	return '#';
}

/** Inline markdown → safe HTML */
function renderInline(raw) {
	let text = escapeHtml(raw);

	// Inline code first (so markdown inside code stays literal)
	text = text.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');

	// Images ![alt](url)
	text = text.replace(
		/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
		(_, alt, src) =>
			`<img class="md-img" alt="${alt}" src="${safeHref(src)}" loading="lazy" />`,
	);

	// Links [label](url)
	text = text.replace(
		/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
		(_, label, href) =>
			`<a class="md-link" href="${safeHref(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
	);

	// Bold+italic ***text*** or ___text___
	text = text.replace(
		/(\*\*\*|___)(.+?)\1/g,
		'<strong><em>$2</em></strong>',
	);

	// Bold **text** or __text__
	text = text.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');

	// Italic *text* or _text_
	text = text.replace(/(\*|_)([^*_\n]+?)\1/g, '<em>$2</em>');

	// Strikethrough ~~text~~
	text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

	return text;
}

function isTableSeparator(line) {
	return /^\s*\|?[\s:|-]+\|[\s|:|-]*\|?\s*$/.test(line) && /-+/.test(line);
}

function splitTableRow(line) {
	let row = String(line || '').trim();
	if (row.startsWith('|')) row = row.slice(1);
	if (row.endsWith('|')) row = row.slice(0, -1);
	return row.split('|').map(cell => cell.trim());
}

function parseAlignments(separatorLine) {
	return splitTableRow(separatorLine).map(cell => {
		const left = cell.startsWith(':');
		const right = cell.endsWith(':');
		if (left && right) return 'center';
		if (right) return 'right';
		if (left) return 'left';
		return '';
	});
}

function renderTable(headerLine, separatorLine, bodyLines) {
	const headers = splitTableRow(headerLine);
	const aligns = parseAlignments(separatorLine);
	const head = headers
		.map((cell, index) => {
			const align = aligns[index];
			const arabic = isMostlyArabic(cell);
			const styleBits = [];
			if (align) styleBits.push(`text-align:${align}`);
			else if (arabic) styleBits.push('text-align:right');
			const style = styleBits.length ? ` style="${styleBits.join(';')}"` : '';
			const dir = arabic ? ' dir="rtl"' : ' dir="ltr"';
			return `<th${style}${dir}>${renderInline(cell)}</th>`;
		})
		.join('');

	const body = bodyLines
		.map(line => {
			const cells = splitTableRow(line);
			const tds = headers
				.map((_, index) => {
					const cell = cells[index] || '';
					const align = aligns[index];
					const arabic = isMostlyArabic(cell);
					const styleBits = [];
					if (align) styleBits.push(`text-align:${align}`);
					else if (arabic) styleBits.push('text-align:right');
					const style = styleBits.length ? ` style="${styleBits.join(';')}"` : '';
					const dir = arabic ? ' dir="rtl"' : ' dir="ltr"';
					return `<td${style}${dir}>${renderInline(cell)}</td>`;
				})
				.join('');
			return `<tr>${tds}</tr>`;
		})
		.join('');

	return `<div class="md-table-wrap" dir="ltr"><table class="md-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderList(items, ordered) {
	const tag = ordered ? 'ol' : 'ul';
	const lis = items
		.map(item => `<li>${renderInline(item)}</li>`)
		.join('');
	return `<${tag} class="md-list">${lis}</${tag}>`;
}

/**
 * Convert markdown text into HTML string.
 */
export function markdownToHtml(markdown) {
	const source = String(markdown || '').replace(/\r\n/g, '\n');
	if (!source.trim()) return '';

	const lines = source.split('\n');
	const blocks = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();

		// Fenced code block ```
		if (trimmed.startsWith('```')) {
			const lang = trimmed.slice(3).trim();
			const codeLines = [];
			i += 1;
			while (i < lines.length && !lines[i].trim().startsWith('```')) {
				codeLines.push(escapeHtml(lines[i]));
				i += 1;
			}
			i += 1; // closing fence
			blocks.push(
				`<pre class="md-pre"><code class="md-code-block"${
					lang ? ` data-lang="${escapeHtml(lang)}"` : ''
				}>${codeLines.join('\n')}</code></pre>`,
			);
			continue;
		}

		// Horizontal rule
		if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(trimmed)) {
			blocks.push('<hr class="md-hr" />');
			i += 1;
			continue;
		}

		// Table: header + separator
		if (
			trimmed.includes('|') &&
			i + 1 < lines.length &&
			isTableSeparator(lines[i + 1])
		) {
			const headerLine = lines[i];
			const separatorLine = lines[i + 1];
			const bodyLines = [];
			i += 2;
			while (i < lines.length && lines[i].trim().includes('|')) {
				bodyLines.push(lines[i]);
				i += 1;
			}
			blocks.push(renderTable(headerLine, separatorLine, bodyLines));
			continue;
		}

		// Headings
		const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
		if (heading) {
			const level = heading[1].length;
			blocks.push(
				`<h${level} class="md-h md-h${level}">${renderInline(heading[2])}</h${level}>`,
			);
			i += 1;
			continue;
		}

		// Blockquote
		if (trimmed.startsWith('>')) {
			const quoteLines = [];
			while (i < lines.length && lines[i].trim().startsWith('>')) {
				quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
				i += 1;
			}
			blocks.push(
				`<blockquote class="md-quote">${renderInline(quoteLines.join(' '))}</blockquote>`,
			);
			continue;
		}

		// Unordered list
		if (/^[-*+]\s+/.test(trimmed)) {
			const items = [];
			while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
				items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
				i += 1;
			}
			blocks.push(renderList(items, false));
			continue;
		}

		// Ordered list
		if (/^\d+\.\s+/.test(trimmed)) {
			const items = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
				items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
				i += 1;
			}
			blocks.push(renderList(items, true));
			continue;
		}

		// Empty line
		if (!trimmed) {
			i += 1;
			continue;
		}

		// Paragraph (merge consecutive non-empty non-special lines)
		const para = [];
		while (
			i < lines.length &&
			lines[i].trim() &&
			!lines[i].trim().startsWith('```') &&
			!/^#{1,6}\s+/.test(lines[i].trim()) &&
			!lines[i].trim().startsWith('>') &&
			!/^[-*+]\s+/.test(lines[i].trim()) &&
			!/^\d+\.\s+/.test(lines[i].trim()) &&
			!(
				lines[i].trim().includes('|') &&
				i + 1 < lines.length &&
				isTableSeparator(lines[i + 1])
			) &&
			!/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(lines[i].trim())
		) {
			para.push(lines[i]);
			i += 1;
		}
		blocks.push(
			`<p class="md-p">${para.map(renderInline).join('<br />')}</p>`,
		);
	}

	return blocks.join('');
}

export default function MarkdownMessage({ content, className = '' }) {
	const text = String(content || '');
	const arabic = isMostlyArabic(text);
	const html = markdownToHtml(text);

	return (
		<div
			dir={arabic ? 'rtl' : 'ltr'}
			lang={arabic ? 'ar' : undefined}
			className={`md-message ${
				arabic ? 'fitcoach-msg-ar font-ar text-right' : 'font-en text-left'
			} ${className}`}
			style={
				arabic
					? {
							direction: 'rtl',
							textAlign: 'right',
							fontFamily:
								'var(--font-arabic), Tajawal, Cairo, "Noto Sans Arabic", Tahoma, sans-serif',
						}
					: undefined
			}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
