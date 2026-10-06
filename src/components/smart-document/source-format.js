/*
 * Source-format helpers for the smart document editor.
 * The Edit pane holds plain text that is either Markdown or HTML; these pure
 * string utilities decide which one it is and keep both readable.
 */

const HTML_BLOCK_TAGS =
	'address|article|aside|blockquote|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul';

const FIRST_TAG_RE = /^<([a-z][a-z0-9-]*)(\s[^<>]*)?\/?>/i;
const BLOCK_OPEN_RE = new RegExp(`<(?=(?:${HTML_BLOCK_TAGS})[\\s/>])`, 'gi');
const BLOCK_CLOSE_RE = new RegExp(`(</(?:${HTML_BLOCK_TAGS})>)`, 'gi');
const BLOCK_CLOSE_TO_NEWLINE_RE = new RegExp(`</(?:${HTML_BLOCK_TAGS})>`, 'gi');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#34': '"' };

export const SOURCE_FORMATS = Object.freeze({ markdown: 'markdown', html: 'html' });

/**
 * A document counts as HTML only when the source *starts* with a tag (after an
 * optional doctype or comments). Keeping the rule positional makes the format
 * predictable for the author: an inline `<br>` inside Markdown never flips the
 * whole document, and a pasted HTML block always renders as HTML.
 */
export function detectSourceFormat(raw) {
	let src = String(raw ?? '')
		.replace(/^\uFEFF/, '')
		.trimStart();
	if (!src) return SOURCE_FORMATS.markdown;
	if (/^<!doctype\b/i.test(src)) return SOURCE_FORMATS.html;

	while (src.startsWith('<!--')) {
		const end = src.indexOf('-->');
		if (end === -1) return SOURCE_FORMATS.markdown;
		src = src.slice(end + 3).trimStart();
	}

	return FIRST_TAG_RE.test(src) ? SOURCE_FORMATS.html : SOURCE_FORMATS.markdown;
}

export function isHtmlSource(raw) {
	return detectSourceFormat(raw) === SOURCE_FORMATS.html;
}

/** Breaks serialized HTML on block boundaries so the Edit pane stays readable. */
export function formatHtmlSource(html) {
	return String(html ?? '')
		.replace(BLOCK_OPEN_RE, '\n<')
		.replace(BLOCK_CLOSE_RE, '$1\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** Inner HTML TipTap can parse — strips doctype/html/head wrappers. */
export function htmlForEditor(raw) {
	const src = String(raw ?? '').trim();
	if (!src) return '';
	const body = src.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
	if (body) return body[1].trim();
	return src.replace(/^<!doctype[^>]*>/i, '').replace(/<\/?html\b[^>]*>/gi, '').replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '').trim();
}

/** Rough tag strip, used for history titles only — never for rendering. */
export function htmlToPlainText(html) {
	return String(html ?? '')
		.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(BLOCK_CLOSE_TO_NEWLINE_RE, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&(#?\w+);/g, (match, key) => ENTITIES[String(key).toLowerCase()] ?? match)
		.replace(/[ \t]+/g, ' ');
}
