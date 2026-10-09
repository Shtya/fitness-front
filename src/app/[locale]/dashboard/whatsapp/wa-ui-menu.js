'use client';

import { useEffect, useRef } from 'react';

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])';

/**
 * Keyboard behaviour shared by every chat menu: arrows and Home/End move between items,
 * Escape and Tab close, and focus goes back to whatever opened the menu.
 *
 * Focus moves into the menu on open so arrow keys work immediately; pointer users do not
 * see a ring because the browser only shows :focus-visible after keyboard input.
 * `onClose` is read through a ref, so callers can pass an inline function without the
 * effect re-running (and re-stealing focus) on every render.
 */
export function useMenuKeyboard(menuRef, { open, onClose, autoFocus = true } = {}) {
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!open) return undefined;
		const opener = typeof document !== 'undefined' ? document.activeElement : null;
		const items = () => [...(menuRef.current?.querySelectorAll(ITEM_SELECTOR) || [])];
		const close = () => onCloseRef.current?.();

		// Menus mount through a portal a tick after `open` flips, so focus is retried briefly.
		const timers = [];
		if (autoFocus) {
			const focusFirst = () => {
				const first = items()[0];
				if (first && !menuRef.current?.contains(document.activeElement)) {
					first.focus({ preventScroll: true });
				}
			};
			timers.push(window.setTimeout(focusFirst, 0), window.setTimeout(focusFirst, 60));
		}

		const onKeyDown = event => {
			const menu = menuRef.current;
			if (!menu) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				close();
				return;
			}
			if (!menu.contains(document.activeElement)) return;
			if (event.key === 'Tab') {
				close();
				return;
			}
			const list = items();
			if (!list.length) return;
			const index = list.indexOf(document.activeElement);
			let next = null;
			if (event.key === 'ArrowDown') next = list[(index + 1) % list.length];
			else if (event.key === 'ArrowUp') next = list[(index - 1 + list.length) % list.length];
			else if (event.key === 'Home') next = list[0];
			else if (event.key === 'End') next = list[list.length - 1];
			if (next) {
				event.preventDefault();
				next.focus({ preventScroll: false });
			}
		};

		document.addEventListener('keydown', onKeyDown, true);
		return () => {
			timers.forEach(id => window.clearTimeout(id));
			document.removeEventListener('keydown', onKeyDown, true);
			// Give focus back to the trigger unless the user already moved somewhere else.
			const active = document.activeElement;
			if (
				opener &&
				typeof opener.focus === 'function' &&
				document.contains(opener) &&
				(!active || active === document.body || menuRef.current?.contains(active))
			) {
				opener.focus({ preventScroll: true });
			}
		};
	}, [open, autoFocus, menuRef]);
}
