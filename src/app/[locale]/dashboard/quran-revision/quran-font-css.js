/**
 * Mushaf font overrides shared by the Quran revision page and the WhatsApp Quran tab.
 * Beats [dir=rtl] body * { font-family: var(--font-arabic) }; Safari needs the full stack inline.
 */
export function quranFontCss(stack) {
	return `
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
		font-family: ${stack} !important;
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
`;
}
