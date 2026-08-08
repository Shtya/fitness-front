import localFont from 'next/font/local';
import QuranRevisionStudio from './QuranRevisionStudio';

/**
 * Self-hosted mushaf faces (next/font/local) so RTL global UI fonts
 * (Cairo / --font-arabic on `body *`) cannot steal glyphs from tajweed spans.
 *
 * UthmanicHafs = KFGQPC Madani Unicode (best with quran-uthmani / tajweed markers)
 * Amiri Quran  = widely used Quran fallback
 */
const uthmani = localFont({
	src: './fonts/UthmanicHafs1Ver18.woff2',
	display: 'swap',
	adjustFontFallback: false,
	variable: '--font-qr-uthmani',
	weight: '400',
});

const amiriQuran = localFont({
	src: './fonts/AmiriQuran.ttf',
	display: 'swap',
	adjustFontFallback: false,
	variable: '--font-qr-amiri',
	weight: '400',
});

const quranFontFamily = `var(--font-qr-uthmani), ${uthmani.style.fontFamily.split(',')[0]}, var(--font-qr-amiri), "Amiri Quran", serif`;

export const metadata = {
	title: 'مراجعة القرآن | Sobha Fit',
};

export default function QuranRevisionPage() {
	return (
		<div className={`${uthmani.variable} ${amiriQuran.variable} ${uthmani.className}`}>
			<style>{`
				/* Beat [dir=rtl] body * { font-family: var(--font-arabic) } */
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
