/*
 * Bidirectional text helpers for documents that mix Arabic and English (technical notes,
 * lecture write-ups). Pure functions — the editor turns their results into decorations, so
 * the saved Markdown / HTML is never touched.
 */

export const DIRECTIONS = ['auto', 'rtl', 'ltr'];

const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;

/** Direction of the first strong character ('rtl' | 'ltr'), or null when there is none (digits, emoji…). */
export function firstStrongDir(text) {
	for (const ch of String(text || '')) {
		if (RTL_CHAR.test(ch)) return 'rtl';
		if (LTR_CHAR.test(ch)) return 'ltr';
	}
	return null;
}

export function normalizeDirection(value) {
	return DIRECTIONS.includes(value) ? value : 'auto';
}

// A run of English: words joined by spaces or by the punctuation that lives inside terms
// (TCP/IP, node.js, C++, C#, e-mail, it's). Trailing sentence punctuation stays outside.
const LATIN_RUN = /[A-Za-zÀ-ɏ][\wÀ-ɏ'’.+#/&-]*(?:[ \t]+[A-Za-z0-9À-ɏ][\wÀ-ɏ'’.+#/&-]*)*/g;
const ARABIC_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿٠-٩ \t]*/g;
const TRAILING_PUNCT = /[\s.,:;!?'’/&-]+$/;

/**
 * Runs of the opposite script inside a block of direction `dir`: English inside an Arabic
 * paragraph, Arabic inside an English one. Each run is isolated so its punctuation, brackets
 * and neighbours keep their places. Returns [{ from, to, dir }] as string offsets.
 */
export function oppositeRuns(text, dir) {
	const source = String(text || '');
	const pattern = dir === 'rtl' ? LATIN_RUN : dir === 'ltr' ? ARABIC_RUN : null;
	if (!pattern) return [];
	const runs = [];
	pattern.lastIndex = 0;
	for (let m = pattern.exec(source); m; m = pattern.exec(source)) {
		const raw = m[0];
		const trimmed = raw.replace(TRAILING_PUNCT, '');
		// "C++" / "C#" keep their sign; everything else loses trailing sentence punctuation.
		const value = /[+#]$/.test(raw.trimEnd()) ? raw.trimEnd() : trimmed;
		if (value) runs.push({ from: m.index, to: m.index + value.length, dir: dir === 'rtl' ? 'ltr' : 'rtl' });
	}
	return runs;
}

/**
 * The number that opens a numbered heading or line ("11) …", "3. …", "٢- …") in an RTL block.
 * Isolated as one left-to-right unit, it shows exactly as typed on the start (right) side.
 * Returns { from, to } or null.
 */
export function numberedPrefix(text) {
	const m = /^(\s*)([0-9٠-٩۰-۹]+(?:[.)\-–:]|\s*\))(?:[0-9٠-٩.]*[.)])?)/.exec(String(text || ''));
	if (!m) return null;
	return { from: m[1].length, to: m[1].length + m[2].length };
}
