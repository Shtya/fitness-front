/**
 * Text imported from ChatGPT can carry machinery that is not meant to be read:
 *  - citation tokens wrapped in private-use characters, e.g. U+E200 "filecite" U+E202 "turn0file0" U+E201
 *  - canvas markers such as `:::writing{variant="document" id="58321" title="…"}` and a closing `:::`
 * The stored book is left as it is; this only cleans what is shown and counted.
 */

const CITATION_RE = /[^]*/g;
const PRIVATE_USE_RE = /[-]/g;
const CANVAS_OPEN_RE = /:{3}[\w-]+\{[^}\n]*\}/g;
const CANVAS_CLOSE_RE = /(^|\s):{3}(?=\s|$)/g;
/* Bare leftovers once the private-use wrappers are gone: "filecite turn0file0 L102-L166". */
const BARE_CITE_RE = /\b(?:filecite|cite|navlist|image_group)\s*turn\d+\w*(?:\s*L\d+(?:-L\d+)?)?/gi;

export function cleanDisplayText(text) {
	if (!text) return text;
	const s = String(text);
	if (!/[-]|:::|turn\d/.test(s)) return s;
	return s
		.replace(CITATION_RE, '')
		.replace(PRIVATE_USE_RE, '')
		.replace(BARE_CITE_RE, '')
		.replace(CANVAS_OPEN_RE, '')
		.replace(CANVAS_CLOSE_RE, '$1')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/\s+([.,،؛:!?؟])/g, '$1')
		.trim();
}
