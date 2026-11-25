/*
 * The printed Madinah mushaf's own page fonts (KFGQPC "QCF" v1, one font per page, from
 * quran.com's CDN). Each word is a single glyph already drawn with its stretched letters
 * (kashida), so a line fills the page the way the printed one does — no wide gaps between words.
 * A page font is loaded the first time that page is shown, then the browser keeps it.
 */

const CDN = 'https://static.qurancdn.com/fonts/quran/hafs/v1/woff2';
const fonts = new Map(); // page → { promise, ready }

export const qcfFamily = page => `QCF_P${String(page).padStart(3, '0')}`;

export function qcfReady(page) {
	return Boolean(fonts.get(page)?.ready);
}

/** Load one page's font (once). Resolves true when it can be used, false if it can't. */
export function loadQcf(page) {
	if (typeof window === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) return Promise.resolve(false);
	const known = fonts.get(page);
	if (known) return known.promise;
	const entry = { ready: false, promise: null };
	entry.promise = new FontFace(qcfFamily(page), `url(${CDN}/p${page}.woff2) format('woff2')`, { display: 'block' })
		.load()
		.then(face => {
			document.fonts.add(face);
			entry.ready = true;
			return true;
		})
		.catch(() => {
			fonts.delete(page); // try again next time (offline now)
			return false;
		});
	fonts.set(page, entry);
	return entry.promise;
}

/** Warm the neighbours' fonts with their pages. */
export function prefetchQcf(page, span = 1) {
	for (let d = 1; d <= span; d += 1) [page + d, page - d].forEach(p => p >= 1 && p <= 604 && void loadQcf(p));
}
