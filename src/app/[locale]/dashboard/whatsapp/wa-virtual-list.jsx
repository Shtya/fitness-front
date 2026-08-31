'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

/** Hook: keep a window in sync with a scroll container. */
export function useWaScrollWindow({
	count,
	rowHeight = 72,
	overscan = 12,
	enabled = true,
	minCountToWindow = 48,
	/** 'end' = chat thread (latest at bottom). 'start' = inbox list (latest at top). */
	initialAlign = 'end',
	/** Optional scroll container — used to read real scrollTop on count changes. */
	scrollRef = null,
} = {}) {
	const shouldWindow = Boolean(enabled) && count >= minCountToWindow;
	const [windowState, setWindowState] = useState(() =>
		computeRowWindow({
			count,
			rowHeight,
			overscan,
			clientHeight: 800,
			scrollTop: initialAlign === 'start' ? 0 : Math.max(0, count * rowHeight - 800),
		}),
	);
	const prevCountRef = useRef(count);

	// Recompute when the list grows from empty / crosses the window threshold.
	// Without this, start/end stay at 0 and the UI shows spacers with no rows.
	useEffect(() => {
		const prevCount = prevCountRef.current;
		prevCountRef.current = count;

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

		const node = scrollRef?.current;
		const realScrollTop =
			node && typeof node.scrollTop === 'number' ? node.scrollTop : null;
		const realClientHeight =
			node && typeof node.clientHeight === 'number' && node.clientHeight > 0
				? node.clientHeight
				: 800;
		const prepended = count - prevCount;
		const h = Math.max(24, Number(rowHeight) || 72);

		setWindowState(current => {
			// Prepend (load older): shift the mounted window so the same rows stay visible.
			if (prepended > 0 && (realScrollTop == null || realScrollTop < realClientHeight * 2)) {
				const nextStart = Math.max(0, (current.start || 0) + prepended);
				const nextEnd = Math.min(
					count,
					Math.max(nextStart + 1, (current.end || 0) + prepended),
				);
				return {
					start: nextStart,
					end: nextEnd,
					topPad: nextStart * h,
					bottomPad: Math.max(0, (count - nextEnd) * h),
					rowHeight: h,
				};
			}

			if (realScrollTop != null) {
				return computeRowWindow({
					scrollTop: realScrollTop,
					clientHeight: realClientHeight,
					count,
					rowHeight: h,
					overscan,
				});
			}

			if (current.end > 0 && current.end <= count) {
				return computeRowWindow({
					scrollTop: current.start * (current.rowHeight || h),
					clientHeight: 800,
					count,
					rowHeight: h,
					overscan,
				});
			}

			const estimatedBottom = Math.max(0, count * h - 800);
			return computeRowWindow({
				scrollTop: initialAlign === 'start' ? 0 : estimatedBottom,
				clientHeight: 800,
				count,
				rowHeight: h,
				overscan,
			});
		});
	}, [shouldWindow, count, rowHeight, overscan, initialAlign, scrollRef]);

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
	getItemKey = null,
}) {
	const virtualizer = useVirtualizer({
		count: enabled ? count : 0,
		getScrollElement: () => scrollRef?.current || null,
		estimateSize: typeof estimateSize === 'function' ? estimateSize : () => estimateSize || 72,
		overscan,
		enabled: Boolean(enabled && count > 0),
		getItemKey:
			typeof getItemKey === 'function' ? getItemKey : (index) => index,
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
