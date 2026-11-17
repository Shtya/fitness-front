/**
 * Line bookmarks for the document preview: pure helpers (storage, matching), no React.
 *
 * A bookmark remembers a line by its text, not its position: `{ id, text, nth, createdAt }`,
 * where `nth` tells identical lines apart. Edits elsewhere in the document do not move it; if
 * the line itself is rewritten the bookmark is shown as "line changed" and can be removed.
 */

const MAX_TEXT = 160;

/**
 * A short highlight over `el` (a heading a contents link landed on, a bookmarked line). Drawn as
 * an overlay in `host`, not a class on `el`: the editor owns its DOM and drops foreign classes
 * when it redraws a line.
 */
export function flashElement(el, host) {
	if (!el || !host || typeof document === 'undefined') return;
	const box = el.getBoundingClientRect();
	const hostBox = host.getBoundingClientRect();
	const overlay = document.createElement('div');
	overlay.className = 'sd-flash-overlay';
	overlay.style.top = `${box.top - hostBox.top - 4}px`;
	overlay.style.left = `${box.left - hostBox.left - 8}px`;
	overlay.style.width = `${box.width + 16}px`;
	overlay.style.height = `${box.height + 8}px`;
	host.appendChild(overlay);
	window.setTimeout(() => overlay.remove(), 1700);
}

/** The text a bookmark keeps for a line (whitespace folded, trimmed, bounded). */
export function lineFingerprint(text) {
	return String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

export function readBookmarks(key) {
	if (!key || typeof localStorage === 'undefined') return [];
	try {
		const list = JSON.parse(localStorage.getItem(key) || '[]');
		return Array.isArray(list) ? list.filter((item) => item && typeof item.text === 'string') : [];
	} catch {
		return [];
	}
}

export function writeBookmarks(key, list) {
	if (!key || typeof localStorage === 'undefined') return;
	try {
		if (list.length) localStorage.setItem(key, JSON.stringify(list));
		else localStorage.removeItem(key);
	} catch {
		/* storage full or blocked: bookmarks stay for this visit */
	}
}

/**
 * Every line (textblock) of the document with its fingerprint and occurrence number:
 * [{ pos, text, nth }]. `doc` is a ProseMirror node.
 */
export function documentLines(doc) {
	const lines = [];
	const counts = new Map();
	doc.descendants((node, pos) => {
		if (!node.isTextblock) return true;
		const text = lineFingerprint(node.textContent);
		if (text) {
			const nth = counts.get(text) || 0;
			counts.set(text, nth + 1);
			lines.push({ pos, size: node.nodeSize, text, nth, heading: node.type.name === 'heading' });
		}
		return false;
	});
	return lines;
}

/** Where each bookmark is now: Map(bookmarkId → line) for those still found. */
export function locateBookmarks(lines, bookmarks) {
	const byKey = new Map(lines.map((line) => [`${line.nth}\u0000${line.text}`, line]));
	const out = new Map();
	for (const bookmark of bookmarks) {
		const line = byKey.get(`${bookmark.nth || 0}\u0000${bookmark.text}`) || byKey.get(`0\u0000${bookmark.text}`);
		if (line) out.set(bookmark.id, line);
	}
	return out;
}

/** Add the line if it is not bookmarked, remove it if it is. Returns the new list. */
export function toggleBookmark(bookmarks, line) {
	const existing = bookmarks.find((item) => item.text === line.text && (item.nth || 0) === line.nth);
	if (existing) return bookmarks.filter((item) => item !== existing);
	return [
		...bookmarks,
		{ id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, text: line.text, nth: line.nth, createdAt: Date.now() },
	];
}
