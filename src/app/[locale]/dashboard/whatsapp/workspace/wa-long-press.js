'use client';

import { useEffect, useRef } from 'react';

export const LONG_PRESS_MS = 500;

/** A long-press can leave a native selection behind; iOS then spends the next
 *  tap clearing it instead of delivering the click that should close the menu. */
export function clearLongPressSelection() {
	if (typeof window === 'undefined') return;
	const clear = () => {
		try {
			window.getSelection()?.removeAllRanges();
		} catch {
			/* ignore */
		}
	};
	clear();
	window.requestAnimationFrame(clear);
}

/**
 * Backdrop handlers for menus opened by a long-press. The release of the
 * opening press can land a click on the freshly mounted backdrop, so only a
 * press that started on the backdrop may close it. Holding on the backdrop
 * hands the point to `onLongPress` (open the menu for whatever is underneath).
 */
const isBackdropElement = event => event.target === event.currentTarget;

export function useLongPressBackdrop({ open, onClose, onLongPress, isBackdrop = isBackdropElement }) {
	const stateRef = useRef({ armed: false, timer: 0, x: 0, y: 0 });
	useEffect(() => {
		const state = stateRef.current;
		state.armed = false;
		window.clearTimeout(state.timer);
	}, [open]);
	useEffect(() => () => window.clearTimeout(stateRef.current.timer), []);
	const stopTimer = () => window.clearTimeout(stateRef.current.timer);
	return {
		onPointerDown: event => {
			if (!isBackdrop(event)) return;
			const state = stateRef.current;
			state.armed = true;
			state.x = event.clientX;
			state.y = event.clientY;
			stopTimer();
			if (!onLongPress) return;
			state.timer = window.setTimeout(() => {
				state.armed = false;
				clearLongPressSelection();
				onLongPress(state.x, state.y);
			}, LONG_PRESS_MS);
		},
		onPointerMove: event => {
			const state = stateRef.current;
			if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 8) stopTimer();
		},
		onPointerUp: stopTimer,
		onPointerCancel: () => {
			stopTimer();
			stateRef.current.armed = false;
		},
		onClick: event => {
			if (!isBackdrop(event)) return;
			const state = stateRef.current;
			if (!state.armed) return;
			state.armed = false;
			onClose();
		},
		onContextMenu: event => {
			if (!isBackdrop(event)) return;
			event.preventDefault();
			stopTimer();
			stateRef.current.armed = false;
			if (onLongPress) onLongPress(event.clientX, event.clientY);
			else onClose();
		},
	};
}

/**
 * Menu-body guard for long-press menus: the finger that opened the menu is
 * still down when items mount under it, and its release can click whichever
 * item (Delete, Archive…) now sits there. Only a press that starts inside the
 * menu after it opened may activate an item; keyboard clicks (detail 0) pass.
 */
export function useFreshPressGuard(open) {
	const freshRef = useRef(false);
	useEffect(() => {
		freshRef.current = false;
	}, [open]);
	return {
		onPointerDownCapture: () => {
			freshRef.current = true;
		},
		onClickCapture: event => {
			if (freshRef.current || event.detail === 0) return;
			event.preventDefault();
			event.stopPropagation();
		},
	};
}
