/**
 * In-document links (a table of contents: `[المشكلة](#المشكلة)`) → the heading they point at.
 *
 * The preview is an editor with link clicks off (so editing a link does not navigate) and its
 * headings carry no ids, so a "#…" link went nowhere. Targets are matched the way Markdown
 * renderers build heading anchors (GitHub's slug), then more loosely, then by the link's own
 * text, so hand-written and generated contents both work, in Arabic and English.
 */

/** GitHub-style heading slug: lower case, punctuation dropped, each space → "-". */
export function headingSlug(text) {
	return String(text || '')
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
		.replace(/\s/g, '-');
}

/** Letters and digits only: survives different slug rules, dashes, numbering and spacing. */
export function looseKey(text) {
	return String(text || '')
		.toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}]/gu, '');
}

/** Same as looseKey without leading numbering ("1.", "9ب)", "-9ج)"), for text-to-text matches. */
function titleKey(text) {
	return looseKey(String(text || '').replace(/^[\s\-–—]*[\d٠-٩]+[\p{L}]?[).:\-–—\s]+/u, ''));
}

function decodeHash(hash) {
	const raw = String(hash || '').replace(/^#/, '');
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

/**
 * Index of the heading a link points at, or -1.
 * `headings`: their texts in document order. `linkText`: the visible text of the link.
 */
export function findHeadingIndex(headings, hash, linkText = '') {
	const target = decodeHash(hash);
	if (!target && !linkText) return -1;
	const list = headings.map((text) => String(text || ''));
	// 1) exact slug, also GitHub's "-1", "-2" suffixes for repeated headings
	const slugs = list.map(headingSlug);
	const seen = new Map();
	const unique = slugs.map((slug) => {
		const n = seen.get(slug) || 0;
		seen.set(slug, n + 1);
		return n ? `${slug}-${n}` : slug;
	});
	const lowered = target.toLowerCase();
	let index = unique.indexOf(lowered);
	if (index < 0) index = slugs.indexOf(lowered);
	if (index >= 0) return index;
	// 2) same letters and digits (other slug rules, en dashes, double hyphens)
	const wanted = looseKey(target);
	if (wanted) {
		index = list.findIndex((text) => looseKey(text) === wanted);
		if (index >= 0) return index;
	}
	// 3) the link's own text names the heading (numbering may differ)
	const byText = titleKey(linkText);
	if (byText) {
		index = list.findIndex((text) => titleKey(text) === byText);
		if (index >= 0) return index;
		index = list.findIndex((text) => {
			const key = titleKey(text);
			return key && (key.startsWith(byText) || byText.startsWith(key));
		});
	}
	return index;
}
