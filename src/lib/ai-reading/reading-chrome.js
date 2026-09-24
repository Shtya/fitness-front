'use client';

import { useSyncExternalStore } from 'react';

/** Sync dashboard sidebar chrome with the active AI Reading theme. */
let chrome = null;
const listeners = new Set();

export function setAiReadingChrome(next) {
	chrome = next;
	listeners.forEach(fn => fn());
}

export function clearAiReadingChrome() {
	setAiReadingChrome(null);
}

function subscribe(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

function getSnapshot() {
	return chrome;
}

function getServerSnapshot() {
	return null;
}

export function useAiReadingChrome() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const DARK_THEME_IDS = new Set(['dark', 'midnight', 'dusk', 'slate', 'forest']);

export function isReadingThemeDark(themeId) {
	return DARK_THEME_IDS.has(themeId);
}

/** Map reading THEME_STYLES → sidebar palette shape. */
export function readingThemeToSidebarPalette(theme, themeId = 'light') {
	const dark = isReadingThemeDark(themeId);
	const bg = theme.paper || theme.bg;
	const ink = theme.ink;
	const muted = theme.muted;
	const accent = theme.accent;
	return {
		bg: `linear-gradient(160deg, ${bg} 0%, ${theme.bg} 100%)`,
		bgCard: dark ? `color-mix(in srgb, ${ink} 8%, ${bg})` : `color-mix(in srgb, #fff 88%, transparent)`,
		bgHover: dark ? `color-mix(in srgb, ${ink} 10%, ${bg})` : `color-mix(in srgb, ${accent} 10%, ${bg})`,
		bgActive: dark
			? `linear-gradient(155deg, color-mix(in srgb, ${accent} 28%, ${bg}), color-mix(in srgb, ${accent} 12%, ${bg}))`
			: `linear-gradient(155deg, color-mix(in srgb, ${accent} 18%, #fff), color-mix(in srgb, ${accent} 8%, #fff))`,
		border: `color-mix(in srgb, ${ink} ${dark ? 14 : 10}%, transparent)`,
		borderStrong: `color-mix(in srgb, ${ink} ${dark ? 22 : 16}%, transparent)`,
		text: ink,
		textMuted: muted,
		textLight: muted,
		textXLight: muted,
		sectionLabel: muted,
		iconBg: dark ? `color-mix(in srgb, ${ink} 10%, ${bg})` : `color-mix(in srgb, #fff 90%, transparent)`,
		iconBorder: `color-mix(in srgb, ${ink} ${dark ? 16 : 12}%, transparent)`,
		shadow: {
			sm: dark ? '0 1px 3px rgba(0,0,0,0.35)' : '0 1px 3px rgba(15,23,42,0.06)',
			md: dark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 18px -8px rgba(15,23,42,0.12)',
		},
		headerBg: 'transparent',
		footerBg: dark ? `color-mix(in srgb, ${ink} 6%, ${bg})` : `color-mix(in srgb, #fff 48%, transparent)`,
		texture: `radial-gradient(circle at 20% 10%, color-mix(in srgb, ${accent} 18%, transparent), transparent 42%)`,
		textureSize: 'auto',
		/* keep gradient refs for accents */
		primary: undefined,
		gradient: undefined,
	};
}
