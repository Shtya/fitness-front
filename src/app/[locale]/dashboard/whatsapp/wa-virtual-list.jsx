'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Scroll-window helper: only mount a slice of rows (+spacers).
 * Safer than absolute virtualizers when rows have complex nested UI.
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

/** Hook: keep a window in sync with a scroll container. */
export function useWaScrollWindow({
	count,
	rowHeight = 72,
	overscan = 12,
	enabled = true,
	minCountToWindow = 48,
} = {}) {
	const shouldWindow = Boolean(enabled) && count >= minCountToWindow;
	const [windowState, setWindowState] = useState(() =>
		computeRowWindow({ count, rowHeight, overscan, clientHeight: 800 }),
	);

	// Recompute when the list grows from empty / crosses the window threshold.
	// Without this, start/end stay at 0 and the UI shows spacers with no rows.
	useEffect(() => {
		if (!shouldWindow) {
			setWindowState({
				start: 0,
				end: count,
				topPad: 0,
				bottomPad: 0,
				rowHeight,
			});
			return;
		}
		setWindowState(current => {
			if (current.end > 0 && current.end <= count) {
				return computeRowWindow({
					scrollTop: current.start * (current.rowHeight || rowHeight),
					clientHeight: 800,
					count,
					rowHeight,
					overscan,
				});
			}
			return computeRowWindow({
				scrollTop: 0,
				clientHeight: 800,
				count,
				rowHeight,
				overscan,
			});
		});
	}, [shouldWindow, count, rowHeight, overscan]);

	const onScroll = useCallback(
		event => {
			if (!shouldWindow) return;
			const node = event.currentTarget;
			setWindowState(
				computeRowWindow({
					scrollTop: node.scrollTop,
					clientHeight: node.clientHeight,
					count,
					rowHeight,
					overscan,
				}),
			);
		},
		[shouldWindow, count, rowHeight, overscan],
	);

	const slice = useMemo(() => {
		if (!shouldWindow) {
			return {
				start: 0,
				end: count,
				topPad: 0,
				bottomPad: 0,
				rowHeight,
			};
		}
		const start = Math.min(Math.max(0, windowState.start || 0), count);
		const end = Math.max(start, Math.min(count, windowState.end || 0));
		// Guard: never mount an empty window when rows exist.
		if (count > 0 && end <= start) {
			return computeRowWindow({
				scrollTop: 0,
				clientHeight: 800,
				count,
				rowHeight,
				overscan,
			});
		}
		return {
			...windowState,
			start,
			end,
			topPad: start * rowHeight,
			bottomPad: Math.max(0, (count - end) * rowHeight),
			rowHeight,
		};
	}, [shouldWindow, windowState, count, rowHeight, overscan]);

	return { shouldWindow, onScroll, ...slice };
}

/**
 * Optional TanStack virtualizer for absolute-position layouts.
 */
export function useWaVirtualRows({
	count,
	scrollRef,
	estimateSize,
	overscan = 12,
	enabled = true,
}) {
	const virtualizer = useVirtualizer({
		count: enabled ? count : 0,
		getScrollElement: () => scrollRef?.current || null,
		estimateSize: typeof estimateSize === 'function' ? estimateSize : () => estimateSize || 72,
		overscan,
		enabled: Boolean(enabled && count > 0),
	});

	const items = enabled ? virtualizer.getVirtualItems() : [];
	const totalSize = enabled ? virtualizer.getTotalSize() : 0;

	return {
		virtualizer,
		items,
		totalSize,
		scrollToIndex: (index, opts) => virtualizer.scrollToIndex(index, opts),
		measureElement: virtualizer.measureElement,
	};
}

export function WaVirtualSpacer({ height }) {
	const h = Number(height) || 0;
	if (h <= 0) return null;
	return <div aria-hidden="true" style={{ height: h, flexShrink: 0 }} />;
}
