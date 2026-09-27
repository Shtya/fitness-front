/** Capture a DOM node as PNG data URL / File (iPhone fake-chat preview). */

/** Design layout inside the phone (WhatsApp iOS proportions). */
export const IPHONE_LAYOUT = Object.freeze({ width: 414, height: 896 });

/**
 * Output mock size — 739×1600 (same aspect as iPhone XR 414×896 @ ~1.78×).
 * Capture targets the screen only (no device chassis) so PNGs match real phone shares.
 */
export const IPHONE_XR = Object.freeze({ width: 739, height: 1600 });

export const IPHONE_CONTENT_SCALE = IPHONE_XR.width / IPHONE_LAYOUT.width;

/** Preview-only chassis padding (not included in PNG). */
export const IPHONE_BEZEL = 14;

export const IPHONE_DEVICE = Object.freeze({
	width: IPHONE_XR.width + IPHONE_BEZEL * 2,
	height: IPHONE_XR.height + IPHONE_BEZEL * 2,
});

const TRANSPARENT_PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(new Error('read failed'));
		reader.readAsDataURL(blob);
	});
}

function waitImgLoad(img, timeoutMs = 4000) {
	return new Promise(resolve => {
		if (img.complete && img.naturalWidth > 0) {
			resolve(true);
			return;
		}
		let done = false;
		const finish = ok => {
			if (done) return;
			done = true;
			resolve(ok);
		};
		const timer = window.setTimeout(() => finish(img.complete && img.naturalWidth > 0), timeoutMs);
		img.addEventListener(
			'load',
			() => {
				window.clearTimeout(timer);
				finish(true);
			},
			{ once: true },
		);
		img.addEventListener(
			'error',
			() => {
				window.clearTimeout(timer);
				finish(false);
			},
			{ once: true },
		);
	});
}

/**
 * html-to-image cannot paint cross-origin <img> without CORS / data URLs.
 * Inline every non-data image under `root` so avatars from /uploads survive PNG capture.
 */
async function inlineImagesForCapture(root) {
	const imgs = Array.from(root.querySelectorAll('img'));
	await Promise.all(
		imgs.map(async img => {
			const src = String(img.currentSrc || img.getAttribute('src') || '').trim();
			if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

			let absolute;
			try {
				absolute = new URL(src, window.location.href);
			} catch {
				return;
			}

			try {
				const response = await fetch(absolute.href, {
					mode: 'cors',
					credentials: 'omit',
					cache: 'force-cache',
				});
				if (!response.ok) return;
				const blob = await response.blob();
				if (!blob || !String(blob.type || '').startsWith('image/')) return;
				const dataUrl = await blobToDataUrl(blob);
				if (!dataUrl.startsWith('data:image')) return;
				img.removeAttribute('srcset');
				img.crossOrigin = 'anonymous';
				img.src = dataUrl;
				await waitImgLoad(img, 3000);
			} catch {
				/* keep original src — waitForImages may still succeed for same-origin */
			}
		}),
	);
}

function waitForImages(root, timeoutMs = 2500) {
	const imgs = Array.from(root.querySelectorAll('img'));
	return Promise.all(
		imgs.map(
			img =>
				new Promise(resolve => {
					if (img.complete && img.naturalWidth > 0) {
						resolve();
						return;
					}
					let done = false;
					const finish = () => {
						if (done) return;
						done = true;
						resolve();
					};
					const timer = window.setTimeout(() => {
						finish();
					}, timeoutMs);
					img.addEventListener(
						'load',
						() => {
							window.clearTimeout(timer);
							finish();
						},
						{ once: true },
					);
					img.addEventListener(
						'error',
						() => {
							window.clearTimeout(timer);
							finish();
						},
						{ once: true },
					);
				}),
		),
	);
}

function patchBrokenImages(root) {
	root.querySelectorAll('img').forEach(img => {
		if (!img.complete || img.naturalWidth === 0) {
			img.removeAttribute('srcset');
			img.src = TRANSPARENT_PIXEL;
		}
	});
}

/**
 * html-to-image drops scrollTop, so a scrolled thread renders from the top and the latest
 * message is cut. Convert each scroll offset into a negative margin on the first child
 * (visually identical) for the duration of the capture.
 */
function freezeScrollForCapture(root) {
	const restores = [];
	const scrolled = [root, ...root.querySelectorAll('*')].filter(
		el => el instanceof HTMLElement && el.scrollTop > 0 && el.firstElementChild instanceof HTMLElement,
	);
	scrolled.forEach(el => {
		const offset = el.scrollTop;
		const first = el.firstElementChild;
		const prevMargin = first.style.marginTop;
		const baseMargin = parseFloat(window.getComputedStyle(first).marginTop) || 0;
		first.style.marginTop = `${baseMargin - offset}px`;
		el.scrollTop = 0;
		restores.push(() => {
			first.style.marginTop = prevMargin;
			el.scrollTop = offset;
		});
	});
	return () => restores.forEach(restore => restore());
}

/** Force rectangular frame — preview rounding must not bake into the PNG. */
function forceRectangularCapture(node) {
	const prev = {
		borderRadius: node.style.borderRadius,
		overflow: node.style.overflow,
		boxShadow: node.style.boxShadow,
	};
	node.style.borderRadius = '0px';
	node.style.overflow = 'hidden';
	node.style.boxShadow = 'none';
	node.querySelectorAll('.fc-phone').forEach(el => {
		if (el instanceof HTMLElement) el.style.borderRadius = '0px';
	});
	return () => {
		node.style.borderRadius = prev.borderRadius;
		node.style.overflow = prev.overflow;
		node.style.boxShadow = prev.boxShadow;
	};
}

/**
 * html-to-image inlines computed px sizes/margins on every clone. For text bubbles that
 * freezes an exact fit, so a sub-pixel difference wraps the time out of a fixed-height
 * bubble. Elements tagged `data-fc-fluid` get their intrinsic sizing back in the PNG.
 */
const CAPTURE_FLUID_CSS = `
[data-fc-fluid] { height: auto !important; block-size: auto !important; }
[data-fc-fluid="text"], [data-fc-fluid="bubble"], [data-fc-fluid="box"] { width: auto !important; inline-size: auto !important; }
[data-fc-fluid="bubble"] { max-width: 78% !important; }
[data-fc-fluid="meta"] { margin-inline-start: auto !important; }
[data-fc-fluid="bubble"]::before, [data-fc-fluid="bubble"]::after { top: auto !important; bottom: 0 !important; }
`;

async function buildFontEmbedCss(getFontEmbedCSS, node) {
	let fontCss = '';
	try {
		fontCss = await getFontEmbedCSS(node, { cacheBust: true });
	} catch {
		fontCss = '';
	}
	return `${fontCss}\n${CAPTURE_FLUID_CSS}`;
}

async function runToPng(toPng, node, width, height, pixelRatio, fontEmbedCSS) {
	return toPng(node, {
		cacheBust: true,
		fontEmbedCSS,
		pixelRatio,
		width,
		height,
		canvasWidth: Math.round(width * pixelRatio),
		canvasHeight: Math.round(height * pixelRatio),
		/** Cream WA wallpaper base — avoids white frame flash around content. */
		backgroundColor: '#f4f1ec',
		imagePlaceholder: TRANSPARENT_PIXEL,
		skipFonts: false,
		style: {
			borderRadius: '0px',
			boxShadow: 'none',
			outline: 'none',
			transform: 'none',
			width: `${width}px`,
			height: `${height}px`,
			margin: '0',
			overflow: 'hidden',
		},
		filter: el => {
			if (!(el instanceof HTMLElement)) return true;
			return !el.dataset?.noCapture;
		},
	});
}

export async function captureNodeAsPng(
	node,
	{ fileName = 'whatsapp-fake-chat.png', download = false, width: forceW, height: forceH } = {},
) {
	if (!node || typeof window === 'undefined') {
		throw new Error('Nothing to capture');
	}
	const { toPng, getFontEmbedCSS } = await import('html-to-image');

	// Prefer explicit XR screen size so stage fit-scale never leaks into the PNG.
	const width = Math.round(forceW || node.offsetWidth || IPHONE_XR.width);
	const height = Math.round(forceH || node.offsetHeight || IPHONE_XR.height);

	const restoreShape = forceRectangularCapture(node);
	const restoreScroll = freezeScrollForCapture(node);
	try {
		await inlineImagesForCapture(node);
		await waitForImages(node);
		patchBrokenImages(node);
		if (document.fonts?.load) {
			await Promise.all([
				document.fonts.load('500 16px "FC Arabic"', 'ا'),
				document.fonts.load('600 11px "FC Arabic"', 'ا'),
			]).catch(() => {});
		}
		if (document.fonts?.ready) await document.fonts.ready;
		await new Promise(r => window.requestAnimationFrame(() => r()));
		const fontEmbedCSS = await buildFontEmbedCss(getFontEmbedCSS, node);

		let dataUrl;
		try {
			dataUrl = await runToPng(toPng, node, width, height, 3, fontEmbedCSS);
		} catch (firstError) {
			patchBrokenImages(node);
			try {
				dataUrl = await runToPng(toPng, node, width, height, 2, fontEmbedCSS);
			} catch (secondError) {
				const msg =
					secondError?.message ||
					firstError?.message ||
					(typeof secondError === 'string' ? secondError : 'Capture failed');
				throw new Error(msg);
			}
		}

		if (download) {
			const link = document.createElement('a');
			link.download = fileName;
			link.href = dataUrl;
			link.click();
		}
		return dataUrl;
	} finally {
		restoreScroll();
		restoreShape();
	}
}

export function dataUrlToFile(dataUrl, fileName = 'whatsapp-fake-chat.png') {
	const [header, base64] = String(dataUrl || '').split(',');
	const mime = /data:([^;]+);/.exec(header)?.[1] || 'image/png';
	const binary = atob(base64 || '');
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return new File([bytes], fileName, { type: mime });
}

export function nextId(prefix = 'msg') {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** iOS status-bar clock — matches "4:44" style (no leading zero when 12h). */
export function formatIosStatusTime(date = new Date()) {
	const hours24 = date.getHours();
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const use12 = true;
	if (!use12) return `${String(hours24).padStart(2, '0')}:${minutes}`;
	const hours12 = hours24 % 12 || 12;
	return `${hours12}:${minutes}`;
}

export function formatChatBubbleTime(date = new Date()) {
	return date
		.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
		.toLowerCase();
}
