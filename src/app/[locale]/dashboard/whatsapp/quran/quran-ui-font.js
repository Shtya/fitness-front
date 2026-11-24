import { Almarai } from 'next/font/google';

/**
 * UI face for the WhatsApp Quran tab (labels, buttons, numbers — not the Quran text, which
 * keeps the mushaf face). Almarai: clean, very readable Arabic. Self-hosted by next/font;
 * only loaded where the tab is used.
 */
export const quranUiFont = Almarai({
	subsets: ['arabic'],
	weight: ['300', '400', '700', '800'],
	display: 'swap',
	preload: false,
	variable: '--font-qr-ui',
});
