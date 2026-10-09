/**
 * Reads the real text metrics of the rendered thread so row estimates match what the
 * browser lays out. Estimates only matter for rows that were never measured, but those
 * are exactly the rows that enter from the top while the user scrolls up — every
 * mismatch there becomes a programmatic scroll correction mid-gesture.
 */

let canvasContext = null;

function measureContext() {
	if (canvasContext) return canvasContext;
	if (typeof document === 'undefined') return null;
	canvasContext = document.createElement('canvas').getContext('2d');
	return canvasContext;
}

function fontOf(element, fallback) {
	if (!element) return fallback;
	const style = getComputedStyle(element);
	const size = parseFloat(style.fontSize);
	if (!Number.isFinite(size) || size <= 0) return fallback;
	return `${style.fontWeight || 400} ${size}px ${style.fontFamily}`;
}

function bubbleMaxRatio(viewportWidth) {
	// Mirrors the bubble max-widths in globals.css: 65% on desktop, 85% on phones,
	// 75% for text bubbles on 600–768px tablets. All are capped at 42rem.
	if (viewportWidth > 768) return 0.65;
	return viewportWidth >= 600 ? 0.75 : 0.85;
}

/**
 * @param {HTMLElement|null} box the scrolling thread element
 * @param {object|null} previous last layout, reused when nothing changed
 */
export function readThreadLayout(box, previous = null) {
	if (!box || typeof window === 'undefined') return previous;
	const viewportWidth = window.innerWidth || 0;
	const phone = viewportWidth <= 768;
	const line = box.querySelector('.wa-message-line');
	const boxStyle = getComputedStyle(box);
	const innerWidth =
		(line && line.clientWidth) ||
		box.clientWidth - parseFloat(boxStyle.paddingLeft || 0) - parseFloat(boxStyle.paddingRight || 0);
	if (!innerWidth || innerWidth < 120) return previous;

	const textEl =
		box.querySelector('.wa-message-row .wa-message-text--en') ||
		box.querySelector('.wa-message-row .wa-message-text');
	const textElAr = box.querySelector('.wa-message-row .wa-message-text--ar');
	const lineHeight = (textEl && parseFloat(getComputedStyle(textEl).lineHeight)) || 19;
	const fallbackSize = phone ? 16 : 14.2;
	const family = getComputedStyle(box).getPropertyValue('--wa-font-message-en') || 'sans-serif';
	const familyAr = getComputedStyle(box).getPropertyValue('--wa-font-message-ar') || family;
	const font = fontOf(textEl, `400 ${fallbackSize}px ${family}`);
	const fontAr = fontOf(textElAr, `400 ${fallbackSize}px ${familyAr}`);

	// Bubble chrome = bubble height minus its text, from one-line text bubbles. The smallest
	// value wins: a bubble whose time dropped to its own line is taller by that line, and
	// taking the first match let that case set the chrome for every row.
	let bubbleChrome = 0;
	let horizontalPadding = 18;
	for (const bubble of box.querySelectorAll('.wa-message-row .wa-message-bubble')) {
		const text = bubble.querySelector('.wa-message-text');
		if (!text || bubble.querySelector('img, video, .wa-voice-message, .wa-reply-quote, a[href]')) continue;
		const textHeight = text.getBoundingClientRect().height;
		if (Math.abs(textHeight - lineHeight) > 1) continue;
		const chrome = bubble.getBoundingClientRect().height - textHeight;
		if (chrome > 4 && chrome < 60 && (!bubbleChrome || chrome < bubbleChrome)) {
			bubbleChrome = chrome;
			const bubbleStyle = getComputedStyle(bubble);
			horizontalPadding =
				parseFloat(bubbleStyle.paddingLeft || 0) + parseFloat(bubbleStyle.paddingRight || 0);
		}
	}
	if (!bubbleChrome) bubbleChrome = phone ? 19 : 15;

	const metaWidth = selector => {
		const meta = box.querySelector(selector);
		if (!meta) return 0;
		const style = getComputedStyle(meta);
		return (
			meta.getBoundingClientRect().width +
			parseFloat(style.marginInlineStart || style.marginLeft || 0)
		);
	};
	const metaWidthMine = metaWidth('.wa-message-mine .wa-message-copy .wa-message-meta') || 75;
	const metaWidthOther = metaWidth('.wa-message-other .wa-message-copy .wa-message-meta') || 59;

	const bubbleMax = Math.min(innerWidth * bubbleMaxRatio(viewportWidth), 672);
	const textMaxWidth = Math.max(40, Math.floor(bubbleMax - horizontalPadding));

	const signature = [
		Math.round(textMaxWidth),
		lineHeight,
		Math.round(bubbleChrome),
		Math.round(metaWidthMine),
		Math.round(metaWidthOther),
		font,
		fontAr,
	].join('|');
	if (previous && previous.signature === signature) return previous;

	const widthCache = new Map();
	return {
		signature,
		version: (previous?.version || 0) + 1,
		textMaxWidth,
		lineHeight,
		bubbleChrome,
		metaWidthMine,
		metaWidthOther,
		metaLineHeight: 15,
		measureText(text, rtl) {
			const key = `${rtl ? 1 : 0}${text}`;
			const cached = widthCache.get(key);
			if (cached !== undefined) return cached;
			const context = measureContext();
			if (!context) return text.length * (phone ? 7.6 : 6.8);
			context.font = rtl ? fontAr : font;
			const width = context.measureText(text).width;
			if (widthCache.size > 4000) widthCache.clear();
			widthCache.set(key, width);
			return width;
		},
	};
}

/** Local calendar day, cheap enough to call per row (no Intl formatting). */
export function threadDayKey(value) {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '';
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
