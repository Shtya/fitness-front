import { Suspense } from 'react';
import localFont from 'next/font/local';
import QuranRevisionStudio from './QuranRevisionStudio';
import QuranRevisionLocaleGate from './QuranRevisionLocaleGate';

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
			<style>{`
				/* Beat [dir=rtl] body * { font-family: var(--font-arabic) } — Safari needs the full stack inline */
				[dir='rtl'] body .qr-studio .qr-mushaf,
				[dir='ltr'] body .qr-studio .qr-mushaf,
				body .qr-studio .qr-mushaf,
				body .qr-studio .qr-mushaf .qr-ayah,
				body .qr-studio .qr-mushaf .qr-ayah-text,
				body .qr-studio .qr-mushaf .qr-tw-text,
				body .qr-studio .qr-mushaf .qr-tw-word,
				body .qr-studio .qr-mushaf .qr-tw-mark,
				body .qr-studio .qr-mushaf.has-tajweed,
				body .qr-studio .qr-mushaf.has-tajweed .qr-tw-mark,
				body .qr-studio .qr-mushaf.has-tajweed .qr-tw-word,
				body .qr-studio .qr-unit-ayah,
				body .qr-tw-modal-example em {
					font-family: ${quranFontFamily} !important;
					font-weight: 400 !important;
					font-style: normal !important;
					font-synthesis: none !important;
					-webkit-font-smoothing: auto !important;
				}

				body .qr-studio .qr-mushaf .qr-ayah-num,
				body .qr-studio .qr-mushaf .qr-ayah-num-val,
				body .qr-studio .qr-mushaf .qr-ayah-num * {
					font-family: var(--font-inter), system-ui, sans-serif !important;
				}
			`}</style>
			<QuranRevisionStudio quranFontFamily={quranFontFamily} />
		</div>
	);
}
