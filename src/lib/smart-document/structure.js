/**
 * Conservative plain-text → document structure detector.
 * Prefer normal paragraphs when uncertain — never force false headings.
 */

const BULLET_RE = /^\s*(?:[•●○▪▸►]|[-*+]|–|—)\s+(.+)$/;
const NUMBERED_RE = /^\s*(\d{1,3})[.)]\s+(.+)$/;
const MD_HEADING_RE = /^(#{1,3})\s+(.+)$/;
const QUOTE_RE = /^\s*>\s+(.+)$/;
const SEPARATOR_RE = /^\s*(?:[-*_]){3,}\s*$/;
const URL_LINE_RE = /^\s*https?:\/\/\S+\s*$/i;
const CODE_FENCE_RE = /^\s*```/;
const ALL_CAPS_RE = /^[A-Z0-9][A-Z0-9\s/&:.-]{2,48}$/;
const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

function stripBullet(line) {
	const b = line.match(BULLET_RE);
	if (b) return { type: 'bullet', text: b[1].trim() };
	const n = line.match(NUMBERED_RE);
	if (n) return { type: 'ordered', text: n[2].trim(), order: Number(n[1]) };
	return null;
}

function isLikelyHeading(line, ctx) {
	const text = line.trim();
	if (!text || text.length > 72) return false;
	if (SEPARATOR_RE.test(text) || URL_LINE_RE.test(text)) return false;
	if (CODE_FENCE_RE.test(text)) return false;

	const md = text.match(MD_HEADING_RE);
	if (md) return { level: Math.min(md[1].length, 3), text: md[2].trim() };

	const list = stripBullet(text);
	if (list) {
		/* Numbered short lines can be section titles when followed by prose */
		if (list.type === 'ordered' && list.text.length <= 48) {
			const next = ctx.next?.trim() || '';
			const nextIsList = !!(next && stripBullet(next));
			const nextIsEmpty = !next;
			const nextIsProse = next.length > 40 && !nextIsList;
			const looksTitle =
				list.text.length <= 40 &&
				!/[.؟!。]$/.test(list.text) &&
				(nextIsEmpty || nextIsProse || ctx.prevEmpty);
			if (looksTitle && (ctx.prevEmpty || ctx.index === 0 || ctx.prevEmptyish)) {
				return { level: 2, text: list.text };
			}
		}
		return false;
	}

	const wordCount = text.split(/\s+/).filter(Boolean).length;
	if (wordCount > 10) return false;
	if (/[.؟!。:;]$/.test(text) && wordCount > 4) return false;

	let score = 0;
	if (ctx.index === 0 || ctx.prevEmpty) score += 2;
	if (ctx.prevEmptyish) score += 1;
	if (wordCount <= 6) score += 1;
	if (text.length <= 40) score += 1;
	if (ALL_CAPS_RE.test(text) && !ARABIC_RE.test(text)) score += 2;
	if (/^\d{1,2}\.\s+\S/.test(text) && text.length <= 50) score += 2;
	if (ctx.next && ctx.next.length > 35 && !stripBullet(ctx.next)) score += 1;
	if (ctx.nextEmpty) score -= 1;
	if (/[,،]/.test(text)) score -= 2;

	if (score < 4) return false;
	const level = ALL_CAPS_RE.test(text) || ctx.index === 0 ? 1 : 2;
	return { level, text };
}

function lineDirection(text) {
	const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
	const en = (text.match(/[A-Za-z]/g) || []).length;
	if (ar === 0 && en === 0) return null;
	return ar > en ? 'rtl' : 'ltr';
}

/**
 * @typedef {{ type: 'heading'|'paragraph'|'bullet'|'ordered'|'quote'|'code'|'separator'|'empty', text?: string, level?: number, dir?: string|null }} Block
 */

/**
 * Parse plain text into conservative document blocks.
 * @param {string} raw
 * @returns {Block[]}
 */
export function detectDocumentStructure(raw) {
	const source = String(raw || '').replace(/\r\n/g, '\n');
	if (!source.trim()) return [];

	const lines = source.split('\n');
	/** @type {Block[]} */
	const blocks = [];
	let inCode = false;
	/** @type {string[]} */
	let codeBuf = [];

	const flushCode = () => {
		if (!codeBuf.length) return;
		blocks.push({ type: 'code', text: codeBuf.join('\n') });
		codeBuf = [];
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (CODE_FENCE_RE.test(trimmed)) {
			if (inCode) {
				flushCode();
				inCode = false;
			} else {
				inCode = true;
			}
			continue;
		}
		if (inCode) {
			codeBuf.push(line);
			continue;
		}

		if (!trimmed) {
			blocks.push({ type: 'empty' });
			continue;
		}

		if (SEPARATOR_RE.test(trimmed)) {
			blocks.push({ type: 'separator' });
			continue;
		}

		const quote = trimmed.match(QUOTE_RE);
		if (quote) {
			blocks.push({ type: 'quote', text: quote[1].trim(), dir: lineDirection(quote[1]) });
			continue;
		}

		const prev = lines[i - 1] ?? '';
		const next = lines[i + 1] ?? '';
		const ctx = {
			index: i,
			prevEmpty: !prev.trim(),
			prevEmptyish: !prev.trim() || prev.trim().length < 2,
			nextEmpty: !next.trim(),
			next: next,
			prev: prev,
		};

		const heading = isLikelyHeading(line, ctx);
		if (heading) {
			blocks.push({
				type: 'heading',
				level: heading.level,
				text: heading.text,
				dir: lineDirection(heading.text),
			});
			continue;
		}

		const list = stripBullet(trimmed);
		if (list) {
			blocks.push({
				type: list.type,
				text: list.text,
				dir: lineDirection(list.text),
			});
			continue;
		}

		if (URL_LINE_RE.test(trimmed)) {
			blocks.push({ type: 'paragraph', text: trimmed, dir: 'ltr' });
			continue;
		}

		blocks.push({
			type: 'paragraph',
			text: trimmed,
			dir: lineDirection(trimmed),
		});
	}

	flushCode();
	return consolidateBlocks(blocks);
}

/** Merge consecutive bullets into list groups is TipTap's job; here we only drop noise empties. */
function consolidateBlocks(blocks) {
	const out = [];
	for (const b of blocks) {
		if (b.type === 'empty') {
			if (!out.length || out[out.length - 1].type === 'empty') continue;
			out.push(b);
			continue;
		}
		out.push(b);
	}
	while (out.length && out[out.length - 1].type === 'empty') out.pop();
	return out;
}

/**
 * Convert detected blocks into TipTap JSON doc.
 * @param {Block[]} blocks
 */
export function blocksToTiptapDoc(blocks) {
	const content = [];
	let i = 0;
	while (i < blocks.length) {
		const b = blocks[i];
		if (b.type === 'empty') {
			i += 1;
			continue;
		}
		if (b.type === 'bullet' || b.type === 'ordered') {
			const listType = b.type === 'ordered' ? 'orderedList' : 'bulletList';
			const items = [];
			while (i < blocks.length && blocks[i].type === b.type) {
				const item = blocks[i];
				items.push({
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							attrs: item.dir ? { dir: item.dir } : undefined,
							content: item.text ? [{ type: 'text', text: item.text }] : [],
						},
					],
				});
				i += 1;
			}
			content.push({ type: listType, content: items });
			continue;
		}
		if (b.type === 'heading') {
			content.push({
				type: 'heading',
				attrs: { level: b.level || 2, ...(b.dir ? { dir: b.dir } : {}) },
				content: b.text ? [{ type: 'text', text: b.text }] : [],
			});
			i += 1;
			continue;
		}
		if (b.type === 'quote') {
			content.push({
				type: 'blockquote',
				content: [
					{
						type: 'paragraph',
						attrs: b.dir ? { dir: b.dir } : undefined,
						content: b.text ? [{ type: 'text', text: b.text }] : [],
					},
				],
			});
			i += 1;
			continue;
		}
		if (b.type === 'code') {
			content.push({
				type: 'codeBlock',
				content: b.text ? [{ type: 'text', text: b.text }] : [],
			});
			i += 1;
			continue;
		}
		if (b.type === 'separator') {
			content.push({ type: 'horizontalRule' });
			i += 1;
			continue;
		}
		content.push({
			type: 'paragraph',
			attrs: b.dir ? { dir: b.dir } : undefined,
			content: b.text ? [{ type: 'text', text: b.text }] : [],
		});
		i += 1;
	}

	if (!content.length) {
		content.push({ type: 'paragraph' });
	}
	return { type: 'doc', content };
}

export function plainTextToTiptapDoc(raw) {
	return blocksToTiptapDoc(detectDocumentStructure(raw));
}

export function detectDominantDir(text) {
	const ar = (String(text).match(/[\u0600-\u06FF]/g) || []).length;
	const en = (String(text).match(/[A-Za-z]/g) || []).length;
	if (ar === 0 && en === 0) return 'ltr';
	return ar >= en ? 'rtl' : 'ltr';
}

export { ARABIC_RE, LATIN_RE };
