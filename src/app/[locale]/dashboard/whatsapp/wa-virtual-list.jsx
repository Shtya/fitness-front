'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
	Virtualizer,
	elementScroll,
	observeElementOffset,
	observeElementRect,
} from '@tanstack/react-virtual';
import { waScrollLog, waScrollMark } from './wa-scroll-debug';
import { chunkedVirtualRange, computeRowWindow, isSameRowWindow } from './wa-row-window';

export { computeRowWindow, isSameRowWindow };

/**
 * Scroll metrics for the rows container. When it grows to its full content height
 * and an ancestor scrolls instead (mobile inbox: header + rows scroll together),
 * measure that ancestor, offset by where the rows start inside it.
 */
function readScrollViewport(node) {
	if (!node) return null;
	if (node.scrollHeight > node.clientHeight + 1) {
		return { scrollTop: node.scrollTop, clientHeight: node.clientHeight };
	}
	for (let parent = node.parentElement; parent; parent = parent.parentElement) {
		if (parent.scrollHeight <= parent.clientHeight + 1) continue;
		const overflowY = getComputedStyle(parent).overflowY;
		if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
		const offset =
			node.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop;
		return {
			scrollTop: Math.max(0, parent.scrollTop - offset),
			clientHeight: parent.clientHeight,
		};
	}
	return { scrollTop: node.scrollTop, clientHeight: node.clientHeight };
}

/** Hook: keep a window in sync with a scroll container. */
export function useWaScrollWindow({
	count,
	rowHeight = 72,
	overscan = 12,
	/** Rows per window change; see computeRowWindow. */
	step = 1,
	enabled = true,
	minCountToWindow = 48,
	/** 'end' = chat thread (latest at bottom). 'start' = inbox list (latest at top). */
	initialAlign = 'end',
	/** Optional scroll container — used to read real scrollTop on count changes. */
	scrollRef = null,
	/** When false→true, re-read the scroll container (e.g. inbox tab was hidden). */
	visible = true,
} = {}) {
	const shouldWindow = Boolean(enabled) && count >= minCountToWindow;
	const [windowState, setWindowState] = useState(() =>
		computeRowWindow({
			count,
			rowHeight,
			overscan,
			step,
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

		const viewport = readScrollViewport(scrollRef?.current);
		const realScrollTop = viewport ? viewport.scrollTop : null;
		const realClientHeight = viewport?.clientHeight > 0 ? viewport.clientHeight : 800;
		const prepended = count - prevCount;
		const h = Math.max(24, Number(rowHeight) || 72);

		setWindowState(current => {
			// Prepend (load older): shift the mounted window so the same rows stay visible.
			// Bottom-anchored threads only — for a top-anchored inbox a count jump is a
			// filter switch or a new chat, and shifting leaves a blank top spacer.
			if (
				initialAlign === 'end' &&
				prepended > 0 &&
				(realScrollTop == null || realScrollTop < realClientHeight * 2)
			) {
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
					step,
				});
			}

			if (current.end > 0 && current.end <= count) {
				return computeRowWindow({
					scrollTop: current.start * (current.rowHeight || h),
					clientHeight: 800,
					count,
					rowHeight: h,
					overscan,
					step,
				});
			}

			const estimatedBottom = Math.max(0, count * h - 800);
			return computeRowWindow({
				scrollTop: initialAlign === 'start' ? 0 : estimatedBottom,
				clientHeight: 800,
				count,
				rowHeight: h,
				overscan,
				step,
			});
		});
	}, [shouldWindow, count, rowHeight, overscan, step, initialAlign, scrollRef]);

	// Tab switches unmount the inbox list while the hook state survives. On remount
	// scrollTop resets to 0 but start/end can still point mid-list — huge topPad, blank UI.
	useLayoutEffect(() => {
		if (!visible) return undefined;
		let frameId = 0;
		const syncFromScroll = () => {
			const node = scrollRef?.current;
			if (!node) {
				frameId = requestAnimationFrame(syncFromScroll);
				return;
			}
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
			const viewport = readScrollViewport(node);
			const next = computeRowWindow({
				scrollTop: Number(viewport.scrollTop) || 0,
				clientHeight: viewport.clientHeight > 0 ? viewport.clientHeight : 800,
				count,
				rowHeight,
				overscan,
				step,
			});
			setWindowState(current => (isSameRowWindow(current, next) ? current : next));
		};
		syncFromScroll();
		return () => {
			if (frameId) cancelAnimationFrame(frameId);
		};
	}, [visible, shouldWindow, count, rowHeight, overscan, step, scrollRef]);

	const scrollFrameRef = useRef(0);
	const scrollNodeRef = useRef(null);
	useEffect(
		() => () => {
			if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
			scrollFrameRef.current = 0;
		},
		[],
	);

	// One window update per frame, and none while the mounted slice is unchanged.
	const onScroll = useCallback(
		event => {
			if (!shouldWindow) return;
			scrollNodeRef.current = scrollRef?.current || event.currentTarget;
			if (scrollFrameRef.current) return;
			scrollFrameRef.current = requestAnimationFrame(() => {
				scrollFrameRef.current = 0;
				const viewport = readScrollViewport(scrollNodeRef.current);
				if (!viewport) return;
				const next = computeRowWindow({
					scrollTop: viewport.scrollTop,
					clientHeight: viewport.clientHeight,
					count,
					rowHeight,
					overscan,
					step,
				});
				setWindowState(current => (isSameRowWindow(current, next) ? current : next));
			});
		},
		[shouldWindow, count, rowHeight, overscan, step, scrollRef],
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
				step,
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
	}, [shouldWindow, windowState, count, rowHeight, overscan, step]);

	return { shouldWindow, onScroll, ...slice };
}

/** The range a bottom-pinned viewport will show: last rows filling one viewport height. */
function endAnchoredRange(instance, range) {
	const measurements = instance?.getMeasurements?.() || [];
	const viewport = Number(instance?.scrollRect?.height) || 800;
	const last = range.count - 1;
	let first = last;
	let filled = Number(measurements[last]?.size) || 0;
	while (first > 0 && filled < viewport) {
		first -= 1;
		filled += Number(measurements[first]?.size) || 0;
	}
	return { ...range, startIndex: first, endIndex: last };
}

function virtualRenderSignature(instance) {
	const items = instance.getVirtualItems();
	return {
		first: items.length ? items[0].index : -1,
		last: items.length ? items[items.length - 1].index : -1,
		measurements: instance.getMeasurements(),
	};
}

/**
 * TanStack virtualizer for absolute-position layouts.
 *
 * useVirtualizer re-renders its host on every one-row range shift (flushSync while
 * scrolling). The host here is the whole workspace, so that cost a full workspace render
 * per scrolled row. This drives the same core Virtualizer, renders whole chunks of rows,
 * and re-renders only when the chunked range or the measured sizes change.
 */
export function useWaVirtualRows({
	count,
	scrollRef,
	estimateSize,
	overscan = 12,
	/** Rows per rendered-range change; see chunkedVirtualRange. */
	chunk = 8,
	enabled = true,
	getItemKey = null,
	shouldAdjustScrollPositionOnItemSizeChange = null,
	/** () => boolean. While true, render the last rows (one viewport + overscan) whatever the scroll offset. */
	anchorToEnd = null,
}) {
	const rerender = useReducer(x => x + 1, 0)[1];
	const renderedRef = useRef(null);
	const anchorToEndRef = useRef(anchorToEnd);
	anchorToEndRef.current = anchorToEnd;
	const virtualizerRef = useRef(null);
	const options = {
		count: enabled ? count : 0,
		getScrollElement: () => scrollRef?.current || null,
		estimateSize: typeof estimateSize === 'function' ? estimateSize : () => estimateSize || 72,
		overscan,
		rangeExtractor: range => {
			if (range.count > 0 && anchorToEndRef.current?.()) {
				return chunkedVirtualRange(endAnchoredRange(virtualizerRef.current, range), chunk);
			}
			return chunkedVirtualRange(range, chunk);
		},
		enabled: Boolean(enabled && count > 0),
		getItemKey:
			typeof getItemKey === 'function' ? getItemKey : index => index,
		shouldAdjustScrollPositionOnItemSizeChange:
			typeof shouldAdjustScrollPositionOnItemSizeChange === 'function'
				? shouldAdjustScrollPositionOnItemSizeChange
				: undefined,
		observeElementRect,
		observeElementOffset,
		scrollToFn: elementScroll,
		onChange: (instance, sync) => {
			const next = virtualRenderSignature(instance);
			const prev = renderedRef.current;
			if (
				prev &&
				prev.first === next.first &&
				prev.last === next.last &&
				prev.measurements === next.measurements
			) {
				return;
			}
			renderedRef.current = next;
			// Scroll-driven range changes stay synchronous so new rows paint in the same frame.
			if (sync) flushSync(rerender);
			else rerender();
		},
	};
	const [virtualizer] = useState(() => new Virtualizer(options));
	virtualizerRef.current = virtualizer;
	virtualizer.setOptions(options);
	useLayoutEffect(() => virtualizer._didMount(), [virtualizer]);
	useLayoutEffect(() => virtualizer._willUpdate());

	const items = enabled ? virtualizer.getVirtualItems() : [];
	const totalSize = enabled ? virtualizer.getTotalSize() : 0;
	const rendered = enabled ? virtualRenderSignature(virtualizer) : null;
	useLayoutEffect(() => {
		renderedRef.current = rendered;
	});

	return {
		virtualizer,
		items,
		totalSize,
		scrollToIndex: (index, opts) => {
			const box = scrollRef?.current;
			const oldTop = box ? Number(box.scrollTop) || 0 : 0;
			waScrollMark('useWaVirtualRows', 'virtualizer.scrollToIndex', { index, opts });
			virtualizer.scrollToIndex(index, opts);
			if (box) {
				waScrollLog(
					'useWaVirtualRows',
					`virtualizer.scrollToIndex:${index}`,
					box,
					oldTop,
					box.scrollTop,
					{ align: opts?.align },
				);
			}
		},
		scrollToOffset: (offset, opts) => {
			const box = scrollRef?.current;
			const oldTop = box ? Number(box.scrollTop) || 0 : 0;
			waScrollMark('useWaVirtualRows', 'virtualizer.scrollToOffset', { offset, opts });
			virtualizer.scrollToOffset(offset, opts);
			if (box) {
				waScrollLog(
					'useWaVirtualRows',
					`virtualizer.scrollToOffset:${offset}`,
					box,
					oldTop,
					box.scrollTop,
					{ align: opts?.align },
				);
			}
		},
		getScrollOffset: () => virtualizer.scrollOffset,
		measureElement: virtualizer.measureElement,
	};
}

export function WaVirtualSpacer({ height }) {
	const h = Number(height) || 0;
	if (h <= 0) return null;
	return <div aria-hidden="true" style={{ height: h, flexShrink: 0 }} />;
}
