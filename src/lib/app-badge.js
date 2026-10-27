/**
 * Unread count everywhere the browser shows it:
 * - installed PWA icon (Badging API, Chromium / iOS 16.4+ home-screen apps),
 * - the tab title, "(N) …" — always: desktop Chrome exposes setAppBadge but only shows it for
 *   installed apps, so relying on it alone left normal tabs without any count,
 * - the tab favicon, with a drawn count bubble.
 *
 * Several parts of the app know a count (the dashboard sidebar's server total, the open
 * WhatsApp inbox's live total); each reports under its own source and the largest wins.
 */

const TITLE_PREFIX = /^\(\d+\+?\)\s+/;

export function appBadgeSupported() {
	return typeof navigator !== 'undefined' && typeof navigator.setAppBadge === 'function';
}

/** Exported for tests. */
export function badgeTitle(title, count) {
	const base = String(title || '').replace(TITLE_PREFIX, '');
	const value = Math.max(0, Math.floor(Number(count) || 0));
	if (!value) return base;
	return `(${value > 99 ? '99+' : value}) ${base}`;
}

/** Exported for tests: the text drawn in the favicon bubble. */
export function badgeLabel(count) {
	const value = Math.max(0, Math.floor(Number(count) || 0));
	if (!value) return '';
	return value > 99 ? '99+' : String(value);
}

const sources = new Map();
let shown = null;
let titleObserver = null;
let faviconJob = 0;

function currentCount() {
	let max = 0;
	for (const value of sources.values()) max = Math.max(max, value);
	return max;
}

function applyTitle(value) {
	if (typeof document === 'undefined') return;
	const next = badgeTitle(document.title, value);
	if (next !== document.title) document.title = next;
}

/* Route changes rewrite <title>; put the count back whenever that happens. */
function watchTitle() {
	if (titleObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
	titleObserver = new MutationObserver(() => {
		if (shown) applyTitle(shown);
	});
	titleObserver.observe(document.head, { subtree: true, childList: true, characterData: true });
}

function iconLink() {
	if (typeof document === 'undefined') return null;
	return document.head.querySelector("link[rel~='icon']");
}

/** Draws the count over the tab's current base icon (restores the plain icon at 0). */
function applyFavicon(value) {
	const link = iconLink();
	if (!link) return;
	const href = link.getAttribute('href') || '';
	if (!link.dataset.badgeBase && !href.startsWith('data:')) link.dataset.badgeBase = href;
	const base = link.dataset.badgeBase;
	if (!base) return;
	const job = ++faviconJob;
	if (!value) {
		if (href !== base) {
			link.setAttribute('href', base);
			if (link.dataset.badgeBaseType) link.setAttribute('type', link.dataset.badgeBaseType);
		}
		return;
	}
	const img = new Image();
	img.onload = () => {
		if (job !== faviconJob) return; // a newer count arrived meanwhile
		const size = 64;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.drawImage(img, 0, 0, size, size);
		const label = badgeLabel(value);
		const fontSize = label.length > 2 ? 22 : 28;
		ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
		const width = Math.max(34, ctx.measureText(label).width + 14);
		const height = 34;
		const x = size - width;
		const y = 0;
		const r = height / 2;
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + width, y, x + width, y + height, r);
		ctx.arcTo(x + width, y + height, x, y + height, r);
		ctx.arcTo(x, y + height, x, y, r);
		ctx.arcTo(x, y, x + width, y, r);
		ctx.closePath();
		ctx.fillStyle = '#e53935';
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = '#ffffff';
		ctx.stroke();
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, x + width / 2, y + height / 2 + 1);
		try {
			if (!link.dataset.badgeBaseType) link.dataset.badgeBaseType = link.getAttribute('type') || '';
			link.setAttribute('type', 'image/png');
			link.setAttribute('href', canvas.toDataURL('image/png'));
		} catch {
			/* tainted canvas (cross-origin icon) — keep the plain icon */
		}
	};
	img.src = base;
}

function render(force = false) {
	if (typeof window === 'undefined') return;
	const value = currentCount();
	if (!force && value === shown) return;
	shown = value;
	if (appBadgeSupported()) {
		const action = value > 0 ? navigator.setAppBadge(value) : navigator.clearAppBadge?.();
		Promise.resolve(action).catch(() => { });
	}
	watchTitle();
	applyTitle(value);
	applyFavicon(value);
}

/** Report this source's unread count (e.g. 'sidebar', 'whatsapp-workspace'). */
export function syncAppBadge(count, source = 'global') {
	sources.set(source, Math.max(0, Math.floor(Number(count) || 0)));
	render();
}

export function clearAppBadgeSource(source) {
	sources.delete(source);
	render();
}

/** The page swapped its base favicon (e.g. WhatsApp icon) — redraw the count on the new one. */
export function refreshFaviconBadge() {
	const link = iconLink();
	if (link) {
		const href = link.getAttribute('href') || '';
		if (!href.startsWith('data:')) link.dataset.badgeBase = href;
	}
	render(true);
}
