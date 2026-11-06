/**
 * Top offset of every row (length = rows + 1), from measured heights. Rows not seen yet use
 * `estimate`. A row that has been on screen keeps its real height after it unmounts, so the
 * spacer replacing it is exact and nothing on screen moves. Safari has no scroll anchoring to
 * hide a mismatch: with a fixed guess the inbox jumped on every window shift.
 */
export function buildRowOffsets(items, getKey, heights, estimate) {
	const count = items.length;
	const offsets = new Float64Array(count + 1);
	for (let index = 0; index < count; index += 1) {
		const height = heights.get(getKey(items[index]));
		offsets[index + 1] = offsets[index] + (height === undefined ? estimate : height);
	}
	return offsets;
}

/** Index of the row containing `y`, clamped to the list. */
export function findRowAtOffset(offsets, y) {
	const last = offsets.length - 2;
	if (last < 0) return 0;
	let low = 0;
	let high = last;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (offsets[middle] <= y) low = middle;
		else high = middle - 1;
	}
	return low;
}

/** Rows to mount for a scroll position. Both edges snap to `step`, so they move once per chunk. */
export function computeMeasuredRowWindow({
	offsets,
	scrollTop = 0,
	clientHeight = 600,
	overscan = 12,
	step = 1,
}) {
	const count = offsets.length - 1;
	if (count <= 0) return { start: 0, end: 0 };
	const chunk = Math.max(1, Math.floor(Number(step) || 1));
	const top = Math.max(0, Number(scrollTop) || 0);
	const first = findRowAtOffset(offsets, top);
	const last = findRowAtOffset(offsets, top + Math.max(clientHeight, 1));
	const start = Math.floor(Math.max(0, first - overscan) / chunk) * chunk;
	const end = Math.min(count, Math.ceil((last + 1 + overscan) / chunk) * chunk);
	return { start, end };
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
