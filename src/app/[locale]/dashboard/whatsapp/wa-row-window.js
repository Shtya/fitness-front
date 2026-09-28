/**
 * Scroll-window helper: only mount a slice of rows (+spacers).
 * Safer than absolute virtualizers when rows have complex nested UI.
 *
 * Fixed rowHeight is an estimate. Variable-height chat bubbles should disable
 * windowing (enabled:false) — otherwise spacers drift and scroll jumps on prepend.
 */
export function computeRowWindow({
	scrollTop = 0,
	clientHeight = 600,
	count = 0,
	rowHeight = 72,
	overscan = 12,
} = {}) {
	const safeCount = Math.max(0, Number(count) || 0);
	const h = Math.max(24, Number(rowHeight) || 72);
	if (safeCount <= 0) {
		return { start: 0, end: 0, topPad: 0, bottomPad: 0, rowHeight: h };
	}
	const start = Math.max(0, Math.floor(scrollTop / h) - overscan);
	const visible = Math.ceil(Math.max(clientHeight, 1) / h) + overscan * 2;
	const end = Math.min(safeCount, start + visible);
	return {
		start,
		end,
		topPad: start * h,
		bottomPad: Math.max(0, (safeCount - end) * h),
		rowHeight: h,
	};
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
