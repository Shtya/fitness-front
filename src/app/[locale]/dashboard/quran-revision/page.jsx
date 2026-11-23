import { Suspense } from 'react';
import localFont from 'next/font/local';
import QuranRevisionStudio from './QuranRevisionStudio';
import QuranRevisionLocaleGate from './QuranRevisionLocaleGate';
import { quranFontCss } from './quran-font-css';

/**
 * Self-hosted mushaf faces (next/font/local) so RTL global UI fonts
 * (Cairo / --font-arabic on `body *`) cannot steal glyphs from tajweed spans.
 *
 * UthmanicHafs = KFGQPC Madani Unicode (best with quran-uthmani / tajweed markers)
 * Amiri Quran  = widely used Quran fallback (TTF = reliable on Safari)
 */
const uthmani = localFont({
	src: [
		{
			path: './fonts/UthmanicHafs1Ver18.woff2',
			weight: '400',
			style: 'normal',
		},
	],
	display: 'swap',
	adjustFontFallback: false,
	variable: '--font-qr-uthmani',
	preload: true,
});

const amiriQuran = localFont({
	src: [
		{
			path: './fonts/AmiriQuran.ttf',
			weight: '400',
			style: 'normal',
		},
	],
	display: 'swap',
	adjustFontFallback: false,
	variable: '--font-qr-amiri',
	preload: true,
});

/** Explicit stack — avoid stuffing commas into one CSS variable (Safari bug). */
const quranFontFamily = [
	'var(--font-qr-uthmani)',
	uthmani.style.fontFamily.split(',')[0].trim(),
	'var(--font-qr-amiri)',
	amiriQuran.style.fontFamily.split(',')[0].trim(),
	'"UthmanicHafs"',
	'"Amiri Quran"',
	'"Scheherazade New"',
	'serif',
].join(', ');

export const metadata = {
	title: 'مراجعة القرآن | Sobha Fit',
};

export default function QuranRevisionPage() {
	return (
		<div className={`${uthmani.variable} ${amiriQuran.variable} flex h-full min-h-0 flex-col`}>
			<Suspense fallback={null}>
				<QuranRevisionLocaleGate />
			</Suspense>
			<style>{quranFontCss(quranFontFamily)}</style>
			<QuranRevisionStudio quranFontFamily={quranFontFamily} />
		</div>
	);
}
