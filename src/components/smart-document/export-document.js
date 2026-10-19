import { generateHTML, resolveExtensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { MarkdownManager } from '@tiptap/markdown';
import { htmlForEditor, isHtmlSource } from './source-format';
import { ARABIC_FONTS, ENGLISH_FONTS, normalizeTypography } from './typography';

const EXPORT_EXTENSIONS = [
	StarterKit,
	TaskList,
	TaskItem.configure({ nested: true }),
	TableKit,
];

let markdownManager = null;

function getMarkdownManager() {
	if (!markdownManager) {
		markdownManager = new MarkdownManager({
			extensions: resolveExtensions(EXPORT_EXTENSIONS),
		});
	}
	return markdownManager;
}

/** Safe download basename from a document title. */
export function safeDocumentFileName(title, fallback = 'document') {
	const base = String(title || fallback)
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
	return base || fallback;
}

/**
 * Convert editor source (Markdown or HTML) into body HTML for Word export.
 */
export function sourceToExportHtml(raw) {
	const src = String(raw || '');
	if (!src.trim()) return '';
	if (isHtmlSource(src)) return htmlForEditor(src);
	try {
		const json = getMarkdownManager().parse(src);
		return generateHTML(json, EXPORT_EXTENSIONS) || '';
	} catch {
		// Fallback: escape as paragraphs so export never hard-fails.
		return src
			.split(/\n{2,}/)
			.map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
			.join('\n');
	}
}

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function buildExportCss(dir, typography) {
	const s = normalizeTypography(typography);
	const ar = ARABIC_FONTS[s.arabicFont]?.stack || ARABIC_FONTS.plex.stack;
	const en = ENGLISH_FONTS[s.englishFont]?.stack || ENGLISH_FONTS.inter.stack;
	const direction = dir === 'rtl' ? 'rtl' : 'ltr';
	return `
		@page { margin: 2cm; }
		body {
			font-family: ${ar}, ${en};
			font-size: ${s.fontSize}pt;
			line-height: ${s.lineHeight};
			letter-spacing: ${s.letterSpacing}em;
			word-spacing: ${s.wordSpacing}em;
			color: #111;
			direction: ${direction};
			text-align: ${direction === 'rtl' ? 'right' : 'left'};
		}
		h1, h2, h3, h4, h5, h6 {
			font-weight: 700;
			line-height: 1.35;
			margin: 1.1em 0 0.45em;
		}
		h1 { font-size: 1.7em; }
		h2 { font-size: 1.4em; }
		h3 { font-size: 1.2em; }
		p, li { margin: 0 0 ${s.paragraphSpacing}em; }
		ul, ol { padding-inline-start: 1.4em; margin: 0 0 0.9em; }
		blockquote {
			margin: 0.8em 0;
			padding: 0.2em 0.9em;
			border-inline-start: 3px solid #cbd5e1;
			color: #334155;
		}
		code, pre {
			font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
			font-size: 0.92em;
		}
		pre {
			padding: 10px 12px;
			background: #f8fafc;
			border: 1px solid #e2e8f0;
			white-space: pre-wrap;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin: 0.9em 0 1.2em;
		}
		th, td {
			border: 1px solid #94a3b8;
			padding: 8px 10px;
			vertical-align: top;
		}
		th { background: #f1f5f9; font-weight: 700; }
		a { color: #0f766e; }
		hr { border: 0; border-top: 1px solid #cbd5e1; margin: 1.2em 0; }
		img { max-width: 100%; height: auto; }
	`.trim();
}

/**
 * Build a Word-compatible HTML document (opens in Microsoft Word / Google Docs).
 */
export function buildWordHtmlDocument({ title, bodyHtml, dir = 'ltr', typography } = {}) {
	const safeTitle = escapeHtml(title || 'Document');
	const css = buildExportCss(dir, typography);
	const direction = dir === 'rtl' ? 'rtl' : 'ltr';
	return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
	xmlns:w="urn:schemas-microsoft-com:office:word"
	xmlns="http://www.w3.org/TR/REC-html40"
	lang="${direction === 'rtl' ? 'ar' : 'en'}"
	dir="${direction}">
<head>
	<meta charset="utf-8" />
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<!--[if gte mso 9]><xml>
		<w:WordDocument>
			<w:View>Print</w:View>
			<w:Zoom>100</w:Zoom>
			<w:DoNotOptimizeForBrowser/>
		</w:WordDocument>
	</xml><![endif]-->
	<title>${safeTitle}</title>
	<style>${css}</style>
</head>
<body dir="${direction}">
${bodyHtml || ''}
</body>
</html>`;
}

/**
 * Trigger a browser download of the current document as a Word (.doc) file.
 */
export function downloadWordDocument({
	title,
	source,
	bodyHtml,
	dir = 'ltr',
	typography,
} = {}) {
	const htmlBody = bodyHtml != null && bodyHtml !== '' ? bodyHtml : sourceToExportHtml(source);
	if (!String(htmlBody || '').replace(/<[^>]+>/g, '').trim()) {
		const err = new Error('empty');
		err.code = 'empty';
		throw err;
	}
	const docTitle = title || 'Document';
	const html = buildWordHtmlDocument({
		title: docTitle,
		bodyHtml: htmlBody,
		dir,
		typography,
	});
	const blob = new Blob(['\ufeff', html], {
		type: 'application/msword;charset=utf-8',
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `${safeDocumentFileName(docTitle)}.doc`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1500);
	return true;
}
