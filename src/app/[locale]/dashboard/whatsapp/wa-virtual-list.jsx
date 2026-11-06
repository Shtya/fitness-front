'use client';

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
	Virtualizer,
	elementScroll,
	observeElementOffset,
	observeElementRect,
} from '@tanstack/react-virtual';
import { waScrollLog, waScrollMark } from './wa-scroll-debug';
import { waPerfCountRender } from './wa-perf';
import { buildRowOffsets, chunkedVirtualRange, computeMeasuredRowWindow } from './wa-row-window';

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
 *
 * Even chunked, the owner (the 30k-line workspace) re-rendered synchronously inside the
 * scroll event every time new rows were measured. With `renderOwner`, a range or size
 * change re-renders only the <WaVirtualRowsHost> that draws the rows; the owner renders
 * only while `renderOwner()` is true (e.g. while a scroll anchor is being restored).
 * `items` and `totalSize` on the returned object always read the live virtualizer.
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
	/**
	 * () => boolean. When given, a range or size change re-renders the owner only while it
	 * returns true; otherwise only the subscribed <WaVirtualRowsHost> re-renders.
	 */
	renderOwner = null,
}) {
	const rerender = useReducer(x => x + 1, 0)[1];
	const renderOwnerRef = useRef(renderOwner);
	renderOwnerRef.current = renderOwner;
	const subscribersRef = useRef(new Set());
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
			const ownerToo = typeof renderOwnerRef.current !== 'function' || renderOwnerRef.current() !== false;
			const subscribers = subscribersRef.current;
			const notify = () => {
				if (ownerToo || !subscribers.size) rerender();
				// The host re-renders on its own too: it may be memoised against the owner.
				for (const fn of subscribers) fn();
			};
			// Scroll-driven range changes stay synchronous so new rows paint in the same frame.
			if (sync) flushSync(notify);
			else notify();
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
		enabled,
		/** Live values: the owner may not have re-rendered since the last scroll. */
		get items() {
			return enabled ? virtualizer.getVirtualItems() : items;
		},
		get totalSize() {
			return enabled ? virtualizer.getTotalSize() : totalSize;
		},
		subscribe: fn => {
			subscribersRef.current.add(fn);
			return () => subscribersRef.current.delete(fn);
		},
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
		/**
		 * scrollToIndex / scrollToOffset keep re-applying their target every frame for up to
		 * 5s. Their "end" is the list's total size, which is short of the real bottom when
		 * content follows the list, so a native pin-to-bottom and that loop pulled the thread
		 * back and forth and the loop often won, leaving the chat above the latest message.
		 * Bottom pinning stops the loop and scrolls the box natively instead.
		 */
		cancelScrollReconcile: () => {
			virtualizer.scrollState = null;
			if (virtualizer.rafId != null) {
				virtualizer.targetWindow?.cancelAnimationFrame?.(virtualizer.rafId);
				virtualizer.rafId = null;
			}
		},
		getScrollOffset: () => virtualizer.scrollOffset,
		measureElement: virtualizer.measureElement,
	};
}

/**
 * Draws the virtual rows of a useWaVirtualRows list and re-renders by itself when the
 * visible range or the measured sizes change, so scrolling never re-renders the owner.
 * `children` is a render function: ({ items, totalSize }) => ReactNode.
 */
export function WaVirtualRowsHost({ virtual, children }) {
	const [, bump] = useReducer(x => x + 1, 0);
	const subscribe = virtual?.subscribe;
	useLayoutEffect(() => (typeof subscribe === 'function' ? subscribe(bump) : undefined), [subscribe]);
	const enabled = Boolean(virtual?.enabled);
	return children({
		items: enabled ? virtual.virtualizer.getVirtualItems() : [],
		totalSize: enabled ? virtual.virtualizer.getTotalSize() : 0,
	});
}

const defaultRowKey = item => item.id;

/**
 * Windowed inbox rows. Owns the window state, so a scroll re-renders only this list and not the
 * whole workspace. Rows are measured rather than assumed: heights differ by device and content
 * (a one or two line preview, an unread row), and the spacers must equal the rows they replace
 * or the list jumps wherever scroll anchoring does not hide it (Safari).
 */
export function WaWindowedRows({
	items,
	renderRow,
	getRowKey = defaultRowKey,
	scrollRef,
	/** First guess only: replaced by real measurements after the first paint. */
	rowHeight = 82,
	overscan = 22,
	step = 8,
	minCountToWindow = 40,
	visible = true,
}) {
	waPerfCountRender('chatListRows');
	const count = items.length;
	const shouldWindow = count >= minCountToWindow;
	const heightsRef = useRef(new Map());
	const estimateRef = useRef(rowHeight);
	const listWidthRef = useRef(0);
	const topSpacerRef = useRef(null);
	const bottomSpacerRef = useRef(null);
	const offsetsCacheRef = useRef({ items: null, offsets: null });

	const readOffsets = () => {
		const cache = offsetsCacheRef.current;
		if (cache.items !== items || !cache.offsets) {
			cache.items = items;
			cache.offsets = buildRowOffsets(items, getRowKey, heightsRef.current, estimateRef.current);
		}
		return cache.offsets;
	};
	const readOffsetsRef = useRef(readOffsets);
	readOffsetsRef.current = readOffsets;

	const [range, setRange] = useState(() =>
		computeMeasuredRowWindow({
			offsets: buildRowOffsets(items, getRowKey, heightsRef.current, estimateRef.current),
			scrollTop: 0,
			clientHeight: 800,
			overscan,
			step,
		}),
	);
	const rangeRef = useRef(range);
	rangeRef.current = range;

	// The list can shrink before the next scroll event re-reads the window.
	const end = shouldWindow ? Math.min(range.end, count) : count;
	const start = shouldWindow ? Math.min(range.start, end) : 0;

	const syncRange = useCallback(
		schedule => {
			const node = scrollRef?.current;
			const viewport = node ? readScrollViewport(node) : null;
			if (!viewport) return;
			const next = computeMeasuredRowWindow({
				offsets: readOffsetsRef.current(),
				scrollTop: viewport.scrollTop,
				clientHeight: viewport.clientHeight > 0 ? viewport.clientHeight : 800,
				overscan,
				step,
			});
			const current = rangeRef.current;
			if (current.start === next.start && current.end === next.end) return;
			schedule(() => setRange(next));
		},
		[scrollRef, overscan, step],
	);

	// A new list (filter, search) or a tab coming back: re-read before paint, so no blank rows.
	useLayoutEffect(() => {
		if (shouldWindow && visible) syncRange(run => run());
	}, [items, shouldWindow, visible, syncRange]);

	useEffect(() => {
		if (!visible || !shouldWindow) return undefined;
		let frame = 0;
		// On phones an ancestor (header + rows) is the scroller, not the rows container, so
		// listen at the document (scroll does not bubble; capture sees it) and react to any
		// scroll of the container or one of its ancestors.
		const listener = event => {
			const node = scrollRef?.current;
			const target = event.target;
			if (!node || !target || (target !== node && !(target.contains && target.contains(node)))) return;
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				// A transition: React splits the row work across frames instead of blocking the
				// frame that crossed the boundary (the overscan covers the gap).
				syncRange(startTransition);
			});
		};
		document.addEventListener('scroll', listener, { capture: true, passive: true });
		return () => {
			document.removeEventListener('scroll', listener, { capture: true });
			if (frame) cancelAnimationFrame(frame);
		};
	}, [scrollRef, syncRange, visible, shouldWindow]);

	// Rows use content-visibility, so an off-screen row is only as tall as its declared size. A
	// mounted row is told its recorded height up front; otherwise rows above the viewport would
	// change size as they mount. Sizes come from a ResizeObserver: reading any layout value here
	// (even the list's clientWidth) forces style for the rows just inserted, on every commit.
	const rowObserverRef = useRef(null);
	const observedRowsRef = useRef(new Map());
	const observedListRef = useRef(null);
	useEffect(
		() => () => {
			rowObserverRef.current?.disconnect();
			rowObserverRef.current = null;
			observedListRef.current = null;
			observedRowsRef.current.clear();
		},
		[],
	);

	useLayoutEffect(() => {
		const top = topSpacerRef.current;
		const bottom = bottomSpacerRef.current;
		const list = top?.parentElement;
		if (!top || !bottom || !list || typeof ResizeObserver === 'undefined') return;
		const observed = observedRowsRef.current;
		if (!rowObserverRef.current) {
			rowObserverRef.current = new ResizeObserver(entries => {
				const heights = heightsRef.current;
				let changed = false;
				for (const entry of entries) {
					if (entry.target === observedListRef.current) {
						// Rows re-wrap at a new width, so recorded heights no longer hold.
						const width = entry.contentRect.width;
						if (!width) continue; // Hidden tab.
						if (listWidthRef.current && listWidthRef.current !== width) {
							heights.clear();
							changed = true;
						}
						listWidthRef.current = width;
						continue;
					}
					const key = observed.get(entry.target);
					const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
					if (key === undefined || height <= 0 || heights.get(key) === height) continue;
					heights.set(key, height);
					changed = true;
				}
				if (!changed) return;
				if (heights.size) {
					let total = 0;
					heights.forEach(height => {
						total += height;
					});
					estimateRef.current = total / heights.size;
				}
				offsetsCacheRef.current.offsets = null;
			});
		}
		const observer = rowObserverRef.current;
		if (observedListRef.current !== list) {
			if (observedListRef.current) observer.unobserve(observedListRef.current);
			observedListRef.current = list;
			observer.observe(list);
		}
		observed.forEach((_, node) => {
			if (node.parentElement !== list) {
				observer.unobserve(node);
				observed.delete(node);
			}
		});
		const heights = heightsRef.current;
		let node = top.nextElementSibling;
		for (let index = start; index < end && node && node !== bottom; index += 1) {
			const key = getRowKey(items[index]);
			if (!observed.has(node)) {
				const known = heights.get(key);
				if (known !== undefined) node.style.containIntrinsicBlockSize = `auto ${known}px`;
				observer.observe(node);
			}
			observed.set(node, key);
			node = node.nextElementSibling;
		}
	});

	const slice = useMemo(() => items.slice(start, end), [items, start, end]);
	if (!shouldWindow) return <>{items.map(renderRow)}</>;
	const offsets = readOffsets();
	return (
		<>
			<div ref={topSpacerRef} aria-hidden="true" style={{ height: offsets[start], flexShrink: 0 }} />
			{slice.map(renderRow)}
			<div ref={bottomSpacerRef} aria-hidden="true" style={{ height: offsets[count] - offsets[end], flexShrink: 0 }} />
		</>
	);
}

export function WaVirtualSpacer({ height }) {
	const h = Number(height) || 0;
	if (h <= 0) return null;
	return <div aria-hidden="true" style={{ height: h, flexShrink: 0 }} />;
}
