import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';

/**
 * The WhatsApp page's type pair: Inter for Latin text and IBM Plex Sans Arabic for Arabic.
 * Both are neo-grotesques with matching x-heights and weights, so mixed Arabic / English /
 * numbers read as one voice. Exposed as CSS variables; wa-chats-studio.css maps the
 * page's --wa-font-* tokens onto them under .wa-font-pair.
 */
export const waLatinFont = Inter({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700', '800'],
	display: 'swap',
	variable: '--font-wa-en',
});

export const waArabicFont = IBM_Plex_Sans_Arabic({
	subsets: ['arabic'],
	weight: ['400', '500', '600', '700'],
	display: 'swap',
	variable: '--font-wa-ar',
});

export const waFontClasses = `${waLatinFont.variable} ${waArabicFont.variable} wa-font-pair`;
