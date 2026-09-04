/**
 * Temporary scroll-jump diagnostics for WhatsApp chat thread.
 * Enable console output: localStorage.setItem('wa-scroll-debug', '1')
 * Read ring buffer: window.__WA_SCROLL_LOG__()
 */

const MAX_ENTRIES = 300;
const ring = [];

let pendingMark = null;

function isEnabled() {
	if (typeof window === 'undefined') return false;
	try {
		return window.__WA_SCROLL_DEBUG__ === true || localStorage.getItem('wa-scroll-debug') === '1';
	} catch {
		return Boolean(window.__WA_SCROLL_DEBUG__);
	}
}

export function waScrollMark(who, reason, extra = {}) {
	pendingMark = {
		who: String(who || 'unknown'),
		reason: String(reason || ''),
		extra,
		at: performance.now(),
	};
}

export function waScrollLog(who, reason, box, oldTop, newTop, extra = {}) {
	const entry = {
		who: String(who || 'unknown'),
		reason: String(reason || ''),
		oldScrollTop: Number(oldTop) || 0,
		newScrollTop: Number(newTop) || 0,
		delta: (Number(newTop) || 0) - (Number(oldTop) || 0),
		scrollHeight: box ? Number(box.scrollHeight) || 0 : null,
		clientHeight: box ? Number(box.clientHeight) || 0 : null,
		distanceFromBottom: box
			? Number(box.scrollHeight) - Number(box.clientHeight) - Number(newTop)
			: null,
		timestamp: new Date().toISOString(),
		...extra,
	};
	ring.push(entry);
	if (ring.length > MAX_ENTRIES) ring.shift();
	if (isEnabled()) {
		// eslint-disable-next-line no-console
		console.log('[WA_SCROLL]', entry);
	}
	pendingMark = null;
	return entry;
}

export function waScrollApply(box, newTop, who, reason, extra = {}) {
	if (!box) return;
	const oldTop = Number(box.scrollTop) || 0;
	const target = Number(newTop) || 0;
	if (!extra?.force && Math.abs(oldTop - target) < 0.5) return;
	waScrollLog(who, reason, box, oldTop, target, extra);
	box.scrollTop = target;
}

export function waScrollTo(box, opts, who, reason, extra = {}) {
	if (!box) return;
	const oldTop = Number(box.scrollTop) || 0;
	const target =
		opts && typeof opts === 'object' && Number.isFinite(opts.top)
			? Number(opts.top)
			: Number(box.scrollHeight);
	if (Math.abs(oldTop - target) < 0.5 && opts?.behavior !== 'smooth') return;
	waScrollLog(who, reason, box, oldTop, target, {
		behavior: opts?.behavior || 'auto',
		...extra,
	});
	box.scrollTo(opts);
}

export function getWaScrollLog() {
	return [...ring];
}

export function clearWaScrollLog() {
	ring.length = 0;
}

/**
 * Passive spy: detects scrollTop / scrollHeight changes not already logged.
 * Attach once per message scroll container.
 */
export function installWaScrollSpy(box) {
	if (!box || box.__waScrollSpyInstalled) return () => {};
	box.__waScrollSpyInstalled = true;

	let lastTop = Number(box.scrollTop) || 0;
	let lastHeight = Number(box.scrollHeight) || 0;
	let scrollEventPending = false;

	const emitIfChanged = (source, extra = {}) => {
		const top = Number(box.scrollTop) || 0;
		const height = Number(box.scrollHeight) || 0;
		const topChanged = Math.abs(top - lastTop) > 0.5;
		const heightChanged = Math.abs(height - lastHeight) > 0.5;
		if (!topChanged && !heightChanged) return;

		if (topChanged) {
			if (pendingMark) {
				waScrollLog(
					pendingMark.who,
					pendingMark.reason,
					box,
					lastTop,
					top,
					{ ...pendingMark.extra, ...extra, source },
				);
			} else {
				waScrollLog(
					source,
					'unmarked-scroll-change',
					box,
					lastTop,
					top,
					{ ...extra, scrollHeight: height, prevScrollHeight: lastHeight },
				);
			}
		} else if (heightChanged && isEnabled()) {
			// eslint-disable-next-line no-console
			console.log('[WA_SCROLL_HEIGHT]', {
				source,
				oldScrollHeight: lastHeight,
				newScrollHeight: height,
				scrollTop: top,
				timestamp: new Date().toISOString(),
			});
		}

		lastTop = top;
		lastHeight = height;
		scrollEventPending = false;
	};

	const onScroll = () => {
		scrollEventPending = true;
		requestAnimationFrame(() => {
			if (!scrollEventPending) return;
			emitIfChanged('user-scroll-event');
		});
	};

	const ro = new ResizeObserver(() => {
		emitIfChanged('container-resize', { via: 'ResizeObserver' });
	});
	ro.observe(box);
	const thread = box.querySelector('.wa-message-thread');
	if (thread) ro.observe(thread);

	box.addEventListener('scroll', onScroll, { passive: true });

	let raf = 0;
	const poll = () => {
		emitIfChanged('raf-poll');
		raf = requestAnimationFrame(poll);
	};
	raf = requestAnimationFrame(poll);

	if (typeof window !== 'undefined') {
		window.__WA_SCROLL_LOG__ = getWaScrollLog;
		window.__WA_SCROLL_CLEAR__ = clearWaScrollLog;
	}

	return () => {
		box.removeEventListener('scroll', onScroll);
		ro.disconnect();
		cancelAnimationFrame(raf);
		box.__waScrollSpyInstalled = false;
	};
}
