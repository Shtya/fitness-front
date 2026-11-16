'use client';

/**
 * Keeps the last chat photos that were on screen loaded in memory.
 *
 * The virtualised thread unmounts rows you scroll past. When the last <img> using a URL goes
 * away, the browser may drop that image from memory and, when the row comes back, reload it from
 * the disk cache asynchronously: the photo was not ready in the first frame and showed its
 * skeleton and fade again. Holding a detached Image for each recent URL keeps it in the
 * browser's memory cache, so a remounted <img> with the same URL is complete at once.
 * Bounded (LRU) so memory stays small.
 */
const MAX_IMAGES = 60;
const retained = new Map(); // url -> HTMLImageElement

export function retainShownImage(url) {
	if (!url || typeof window === 'undefined' || typeof Image === 'undefined') return;
	const key = String(url);
	if (retained.has(key)) {
		// Refresh its place in the LRU order.
		const img = retained.get(key);
		retained.delete(key);
		retained.set(key, img);
		return;
	}
	const img = new Image();
	img.decoding = 'async';
	img.src = key;
	retained.set(key, img);
	while (retained.size > MAX_IMAGES) {
		const oldest = retained.keys().next().value;
		retained.delete(oldest);
	}
}

/** True when this URL was shown before in this session (the picture should be cached). */
export function wasImageShown(url) {
	return Boolean(url) && retained.has(String(url));
}
