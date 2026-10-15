'use client';

import { useEffect, useRef, useState } from 'react';

export const PULL_TRIGGER_PX = 64;
const PULL_MAX_PX = 96;
const PULL_RESISTANCE = 0.5;

/**
 * Damped pull distance for a raw finger delta. Exported for tests.
 * @param {number} deltaY
 */
export function pullDistance(deltaY) {
	const raw = Math.max(0, Number(deltaY) || 0) * PULL_RESISTANCE;
	return Math.min(PULL_MAX_PX, Math.round(raw));
}

/**
 * Touch-only pull-to-refresh for a scroll container. Starts only when the list is
 * already at the top, ignores mostly-horizontal drags (row swipe actions), and
 * never runs two refreshes at once.
 *
 * @param {import('react').RefObject<HTMLElement>} scrollRef
 * @param {() => Promise<unknown>} onRefresh
 * @param {{ enabled?: boolean, attachKey?: unknown }} [options] `attachKey` re-binds
 *   listeners when the scroll node can be remounted (e.g. tab switches).
 */
export function usePullToRefresh(scrollRef, onRefresh, { enabled = true, attachKey } = {}) {
	const [pull, setPull] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const onRefreshRef = useRef(onRefresh);
	onRefreshRef.current = onRefresh;
	const refreshingRef = useRef(false);

	useEffect(() => {
		const node = scrollRef.current;
		if (!node || !enabled) return undefined;
		let startX = 0;
		let startY = 0;
		let tracking = false;
		let pulling = false;
		let distance = 0;

		const reset = () => {
			tracking = false;
			pulling = false;
			distance = 0;
			setPull(0);
		};
		const onStart = event => {
			if (refreshingRef.current || event.touches.length !== 1) return;
			if (node.scrollTop > 0) return;
			tracking = true;
			pulling = false;
			startX = event.touches[0].clientX;
			startY = event.touches[0].clientY;
		};
		const onMove = event => {
			if (!tracking) return;
			const dx = event.touches[0].clientX - startX;
			const dy = event.touches[0].clientY - startY;
			if (!pulling) {
				if (Math.abs(dx) > Math.abs(dy) || dy <= 6 || node.scrollTop > 0) {
					if (Math.abs(dx) > 8 || dy < -6) tracking = false;
					return;
				}
				pulling = true;
			}
			if (event.cancelable) event.preventDefault();
			distance = pullDistance(dy);
			setPull(distance);
		};
		const onEnd = () => {
			if (!tracking) return;
			const shouldRefresh = pulling && distance >= PULL_TRIGGER_PX;
			reset();
			if (!shouldRefresh) return;
			refreshingRef.current = true;
			setRefreshing(true);
			Promise.resolve()
				.then(() => onRefreshRef.current?.())
				.catch(() => { })
				.finally(() => {
					refreshingRef.current = false;
					setRefreshing(false);
				});
		};

		node.addEventListener('touchstart', onStart, { passive: true });
		node.addEventListener('touchmove', onMove, { passive: false });
		node.addEventListener('touchend', onEnd, { passive: true });
		node.addEventListener('touchcancel', reset, { passive: true });
		return () => {
			node.removeEventListener('touchstart', onStart);
			node.removeEventListener('touchmove', onMove);
			node.removeEventListener('touchend', onEnd);
			node.removeEventListener('touchcancel', reset);
		};
	}, [attachKey, enabled, scrollRef]);

	return { pull, refreshing, armed: pull >= PULL_TRIGGER_PX };
}
