#!/usr/bin/env node
/**
 * Make `next/font/google` survive Google Fonts' extensionless font URLs.
 *
 * Google sometimes answers the CSS request with `https://fonts.gstatic.com/l/font?kit=…`
 * instead of `…/file.woff2`. Next 15.5.x (up to 15.5.29 at least) reads the file type with
 * `/\.(woff|woff2|…)$/.exec(url)[1]`, which is null for those URLs, so `next build` fails at
 * random with "An error occurred in `next/font`. TypeError: Cannot read properties of null
 * (reading '1')". Those files are woff2 (Next requests the CSS with a modern Chrome UA), so we
 * fall back to woff2.
 *
 * Runs on `postinstall` and before `build`. Idempotent; prints a warning and exits 0 when
 * Next's code no longer matches (a newer Next may have fixed it), so installs never break.
 */
const fs = require('fs');
const path = require('path');

const LOADER = path.join(
	__dirname,
	'..',
	'node_modules',
	'next',
	'dist',
	'compiled',
	'@next',
	'font',
	'dist',
	'google',
	'loader.js',
);
const BROKEN = '/\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1]';
const FIXED = "(/\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl) || [null, 'woff2'])[1]";

function main() {
	if (!fs.existsSync(LOADER)) {
		console.warn('[patch-next-font-loader] next/font loader not found, skipping.');
		return;
	}
	const source = fs.readFileSync(LOADER, 'utf8');
	if (source.includes(FIXED)) {
		console.log('[patch-next-font-loader] already patched.');
		return;
	}
	if (!source.includes(BROKEN)) {
		console.warn('[patch-next-font-loader] loader code changed; nothing patched (check if still needed).');
		return;
	}
	fs.writeFileSync(LOADER, source.split(BROKEN).join(FIXED));
	console.log('[patch-next-font-loader] patched next/font to accept extensionless Google font URLs.');
}

try {
	main();
} catch (error) {
	console.warn(`[patch-next-font-loader] skipped: ${error instanceof Error ? error.message : error}`);
}
