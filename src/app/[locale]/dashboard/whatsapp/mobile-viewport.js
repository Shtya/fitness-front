/**
 * Phone viewport helpers for the WhatsApp page.
 *
 * iOS keeps reporting env(safe-area-inset-bottom) (34px) while the on-screen keyboard is
 * up, even though the keyboard now covers the home indicator, and it does not shrink the
 * layout viewport. Left alone, the composer floats 34px above the keyboard and the page
 * scrolls under the header. While a text field is focused and the keyboard is open we:
 *   - add `wa-kb-open` to <html> (CSS sets --wa-safe-bottom to 0 under it), and
 *   - set --wa-app-h to the visible height so the app shell ends at the keyboard, and
 *   - set --wa-kb-inset to the keyboard height: iOS anchors position:fixed to the full
 *     layout height, so fixed bottom bars (the composer, phone sheets) are lifted by it.
 */

export const KEYBOARD_MIN_PX = 120;
export const PHONE_MAX_WIDTH = 768;

/**
 * @param {{ layoutHeight: number, viewportHeight: number, offsetTop?: number }} sizes
 * @returns {{ open: boolean, inset: number, visibleHeight: number }}
 */
export function measureKeyboard({ layoutHeight, viewportHeight, offsetTop = 0 }) {
	const layout = Number(layoutHeight) || 0;
	const visible = Number(viewportHeight) || 0;
	const inset = Math.max(0, Math.round(layout - visible - (Number(offsetTop) || 0)));
	return {
		open: visible > 0 && inset >= KEYBOARD_MIN_PX,
		inset,
		visibleHeight: Math.max(0, Math.round(visible)),
	};
}

export function isEditableElement(element) {
	if (!element || typeof element !== 'object') return false;
	if (element.isContentEditable) return true;
	const tag = String(element.tagName || '').toLowerCase();
	if (tag === 'textarea') return !element.readOnly && !element.disabled;
	if (tag !== 'input') return false;
	const type = String(element.type || 'text').toLowerCase();
	const nonText = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'];
	return !nonText.includes(type) && !element.readOnly && !element.disabled;
}

/** Wires the keyboard state to <html>. Returns a cleanup function. */
export function installMobileViewport(win = typeof window === 'undefined' ? null : window) {
	if (!win?.document) return () => {};
	const root = win.document.documentElement;
	let frame = 0;
	// The tallest visible height seen at this width = the height without a keyboard.
	let baseline = 0;
	let baselineWidth = 0;

	const clear = () => {
		root.classList.remove('wa-kb-open');
		root.style.removeProperty('--wa-app-h');
		root.style.removeProperty('--wa-kb-inset');
	};

	const apply = () => {
		frame = 0;
		const vv = win.visualViewport;
		if (!vv || win.innerWidth > PHONE_MAX_WIDTH) {
			clear();
			return;
		}
		if (win.innerWidth !== baselineWidth) {
			baselineWidth = win.innerWidth;
			baseline = 0;
		}
		baseline = Math.max(baseline, root.clientHeight || 0, win.innerHeight || 0, vv.height || 0);
		const keyboard = measureKeyboard({
			layoutHeight: baseline,
			viewportHeight: vv.height,
			offsetTop: vv.offsetTop,
		});
		if (keyboard.open && isEditableElement(win.document.activeElement)) {
			root.classList.add('wa-kb-open');
			root.style.setProperty('--wa-app-h', `${keyboard.visibleHeight}px`);
			root.style.setProperty('--wa-kb-inset', `${keyboard.inset}px`);
			// iOS pans the page to reveal the field; the shell is already sized to the visible
			// area, so pin the page back to the top instead of letting the header slide away.
			if ((vv.offsetTop || 0) > 0 || (win.scrollY || 0) > 0) win.scrollTo(0, 0);
		} else {
			clear();
		}
	};

	let timer = 0;
	const schedule = () => {
		if (frame || timer) return;
		// Animation frames pause in hidden tabs; fall back to a timer so the state never sticks.
		if (win.requestAnimationFrame && win.document.visibilityState !== 'hidden') {
			frame = win.requestAnimationFrame(apply);
		} else {
			timer = win.setTimeout(() => {
				timer = 0;
				apply();
			}, 16);
		}
	};

	const vv = win.visualViewport;
	vv?.addEventListener?.('resize', schedule);
	vv?.addEventListener?.('scroll', schedule);
	win.addEventListener('resize', schedule);
	win.addEventListener('orientationchange', schedule);
	win.document.addEventListener('focusin', schedule);
	win.document.addEventListener('focusout', schedule);
	schedule();

	return () => {
		if (frame && win.cancelAnimationFrame) win.cancelAnimationFrame(frame);
		if (timer) win.clearTimeout(timer);
		vv?.removeEventListener?.('resize', schedule);
		vv?.removeEventListener?.('scroll', schedule);
		win.removeEventListener('resize', schedule);
		win.removeEventListener('orientationchange', schedule);
		win.document.removeEventListener('focusin', schedule);
		win.document.removeEventListener('focusout', schedule);
		clear();
	};
}
