/**
 * HTTP Range header → byte offsets, for serving partial video (206) out of a full cached copy.
 * Browsers ask for video in pieces (Safari starts with `bytes=0-1`), and cache.put refuses a
 * 206, so the whole file is stored once and every piece is sliced from it.
 *
 * Returns { start, end } (end inclusive), null when the range cannot be satisfied (→ 416),
 * or undefined when there is no usable single range (→ answer with the whole file).
 */
export function parseRange(header, size) {
	const value = String(header || '').trim();
	const match = /^bytes=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(value);
	// Missing, malformed or multi-range (bytes=0-1,5-9): a full 200 is a valid answer.
	if (!match) return undefined;
	const [, from, to] = match;
	if (!from && !to) return undefined;
	if (!(size > 0)) return null;
	if (!from) {
		// Suffix: the last N bytes.
		const length = Number(to);
		if (!length) return null;
		return { start: Math.max(0, size - length), end: size - 1 };
	}
	const start = Number(from);
	if (start >= size) return null;
	const end = to ? Math.min(Number(to), size - 1) : size - 1;
	if (end < start) return null;
	return { start, end };
}
