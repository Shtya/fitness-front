import { Aref_Ruqaa, Playfair_Display } from 'next/font/google';

/**
 * Faces for the motivation cards on the Habits tab: Arabic sayings in Ruqʿah calligraphy
 * (Aref Ruqaa), English ones in an elegant italic serif (Playfair Display). Self-hosted by
 * next/font and only loaded where the cards are shown.
 */
export const cardArabicFont = Aref_Ruqaa({
	subsets: ['arabic'],
	weight: ['400', '700'],
	display: 'swap',
	preload: false,
	variable: '--font-hb-card-ar',
});

/** The Habits page title and date: a bold upright serif (Arabic falls back to Aref Ruqaa). */
export const boardTitleFont = Playfair_Display({
	subsets: ['latin'],
	weight: ['400', '500', '800'],
	style: ['normal'],
	display: 'swap',
	preload: false,
	variable: '--font-hb-title',
});

export const cardLatinFont = Playfair_Display({
	subsets: ['latin'],
	weight: ['500', '600'],
	style: ['italic'],
	display: 'swap',
	preload: false,
	variable: '--font-hb-card-en',
});
