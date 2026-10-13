/**
 * Scroll-window helper: only mount a slice of rows (+spacers).
 * Safer than absolute virtualizers when rows have complex nested UI.
 *
 * Fixed rowHeight is an estimate. Variable-height chat bubbles should disable
 * windowing (enabled:false) — otherwise spacers drift and scroll jumps on prepend.
 *
 * `step` snaps both edges outward to multiples of `step` rows, so the mounted slice
 * (and the re-render it costs) changes once per `step` rows scrolled instead of every row.
 */
export function computeRowWindow({
	scrollTop = 0,
	clientHeight = 600,
	count = 0,
	rowHeight = 72,
	overscan = 12,
	step = 1,
} = {}) {
	const safeCount = Math.max(0, Number(count) || 0);
	const h = Math.max(24, Number(rowHeight) || 72);
	if (safeCount <= 0) {
		return { start: 0, end: 0, topPad: 0, bottomPad: 0, rowHeight: h };
	}
	const chunk = Math.max(1, Math.floor(Number(step) || 1));
	const first = Math.max(0, Math.floor(scrollTop / h) - overscan);
	const visible = Math.ceil(Math.max(clientHeight, 1) / h) + overscan * 2;
	const start = Math.floor(first / chunk) * chunk;
	// Derived from the snapped start so both edges move together, once per chunk.
	const span = Math.ceil((visible + chunk - 1) / chunk) * chunk;
	const end = Math.min(safeCount, chunk === 1 ? start + visible : start + span);
	return {
		start,
		end,
		topPad: start * h,
		bottomPad: Math.max(0, (safeCount - end) * h),
		rowHeight: h,
	};
}

/**
 * TanStack rangeExtractor: the default overscan range, widened to whole chunks so the
 * rendered indexes change once per `chunk` rows instead of on every row boundary.
 */
export function chunkedVirtualRange({ startIndex, endIndex, overscan = 0, count }, chunk = 6) {
	const size = Math.max(1, Math.floor(Number(chunk) || 1));
	const total = Math.max(0, Number(count) || 0);
	if (total <= 0) return [];
	const first = Math.max(0, startIndex - overscan);
	const last = Math.min(total - 1, endIndex + overscan);
	const start = Math.floor(first / size) * size;
	const end = Math.min(total - 1, Math.ceil((last + 1) / size) * size - 1);
	const indexes = [];
	for (let index = start; index <= end; index += 1) indexes.push(index);
	return indexes;
}

export function isSameRowWindow(a, b) {
	return Boolean(
		a &&
			b &&
			a.start === b.start &&
			a.end === b.end &&
			a.topPad === b.topPad &&
			a.bottomPad === b.bottomPad &&
			a.rowHeight === b.rowHeight,
	);
}
