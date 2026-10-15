'use client';

import { useSyncExternalStore } from 'react';
import api, { baseImg } from '@/utils/axios';

export const DASHBOARD_BG_PRESETS = [
	{ id: 'main-3', src: '/bg-main-3.png' },
	{ id: 'main-1', src: '/bg-main-1.png' },
	{ id: 'main-2', src: '/bg-main-2.png' },
];

/** Light, low-contrast washes so glass cards and page titles stay readable. */
export const DASHBOARD_BG_GRADIENTS = [
	{ id: 'icy-sky', css: 'linear-gradient(135deg, #e0f2fe 0%, #eef2ff 45%, #f5f3ff 100%)' },
	{ id: 'ocean-dawn', css: 'linear-gradient(160deg, #dbeafe 0%, #e0f2fe 40%, #ccfbf1 100%)' },
	{ id: 'mint-breeze', css: 'linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 55%, #f0f9ff 100%)' },
	{ id: 'lavender-mist', css: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 45%, #e0e7ff 100%)' },
	{ id: 'peach-glow', css: 'linear-gradient(135deg, #fff7ed 0%, #ffe4e6 50%, #fdf2f8 100%)' },
	{
		id: 'sunset-soft',
		css: 'radial-gradient(at 12% 8%, #fde68a 0, transparent 45%), radial-gradient(at 88% 18%, #fbcfe8 0, transparent 45%), radial-gradient(at 50% 96%, #bfdbfe 0, transparent 55%), linear-gradient(180deg, #f8fafc, #f8fafc)',
	},
	{
		id: 'brand-aurora',
		css: 'radial-gradient(at 10% 0%, color-mix(in srgb, var(--color-primary-300) 55%, transparent) 0, transparent 50%), radial-gradient(at 92% 12%, color-mix(in srgb, var(--color-secondary-300) 50%, transparent) 0, transparent 50%), radial-gradient(at 50% 100%, color-mix(in srgb, var(--color-primary-200) 60%, transparent) 0, transparent 60%), linear-gradient(180deg, #f8fafc, #eef2f7)',
	},
	{ id: 'graphite-calm', css: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%)' },
];

const SYSTEM_CACHE_KEY = 'dashboard-bg:system';
const GALLERY_CACHE_KEY = 'dashboard-bg:gallery';
const personalKey = userId => `dashboard-bg:personal:${userId || 'anon'}`;
const DATA_URL_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const UPLOAD_RE = /^\/uploads\/branding\/[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif)$/;
/** localStorage is ~5 MB per origin and shared with the rest of the app. */
const MAX_PERSONAL_IMAGE_CHARS = 1_800_000;

const SYSTEM_OVERLAY_CACHE_KEY = 'dashboard-bg:system-overlay';
const personalOverlayKey = userId => `dashboard-bg:personal-overlay:${userId || 'anon'}`;

export const DASHBOARD_OVERLAY_TONES = ['light', 'dark', 'brand'];
export const DASHBOARD_OVERLAY_MAX = 90;

let state = {
	userId: null,
	system: null,
	personal: null,
	gallery: [],
	systemOverlay: null,
	personalOverlay: null,
	ready: false,
};
const listeners = new Set();

function emit(next) {
	state = { ...state, ...next };
	applyToDocument();
	listeners.forEach(listener => listener());
}

function readJson(key) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function writeJson(key, value) {
	if (value == null) localStorage.removeItem(key);
	else localStorage.setItem(key, JSON.stringify(value));
}

/** CSS `background-image` value, or null for the stylesheet default. */
export function backgroundCss(background) {
	if (!background?.kind) return null;
	if (background.kind === 'preset') {
		const preset = DASHBOARD_BG_PRESETS.find(item => item.id === background.value);
		return preset ? `url("${preset.src}")` : null;
	}
	if (background.kind === 'gradient') {
		return DASHBOARD_BG_GRADIENTS.find(item => item.id === background.value)?.css || null;
	}
	if (background.kind === 'image') {
		const value = String(background.value || '');
		if (DATA_URL_RE.test(value)) return `url("${value}")`;
		if (UPLOAD_RE.test(value)) return `url("${baseImg}${value}")`;
	}
	return null;
}

export function effectiveBackground(snapshot = state) {
	return snapshot.personal || snapshot.system || null;
}

/** A personal overlay at 0% still counts: it means "no overlay for me". */
export function effectiveOverlay(snapshot = state) {
	return snapshot.personalOverlay || snapshot.systemOverlay || null;
}

/** CSS layer painted above the background image, or null for none. */
export function overlayCss(overlay) {
	const opacity = Math.min(DASHBOARD_OVERLAY_MAX, Math.max(0, Math.round(Number(overlay?.opacity) || 0)));
	if (!opacity || !DASHBOARD_OVERLAY_TONES.includes(overlay?.tone)) return null;
	const color =
		overlay.tone === 'dark'
			? `rgba(8, 12, 22, ${opacity / 100})`
			: overlay.tone === 'brand'
				? `color-mix(in srgb, var(--color-primary-600) ${opacity}%, transparent)`
				: `rgba(255, 255, 255, ${opacity / 100})`;
	return `linear-gradient(${color}, ${color})`;
}

function setRootVar(name, value) {
	if (value) document.documentElement.style.setProperty(name, value);
	else document.documentElement.style.removeProperty(name);
}

function applyToDocument() {
	if (typeof document === 'undefined') return;
	setRootVar('--gm-bg-user', backgroundCss(effectiveBackground()));
	setRootVar('--gm-bg-overlay', overlayCss(effectiveOverlay()));
}

/** Live preview while a slider is dragged; nothing is saved. */
export function previewOverlay(overlay) {
	if (typeof document === 'undefined') return;
	setRootVar('--gm-bg-overlay', overlayCss(overlay));
}

export function galleryImageUrl(url) {
	return UPLOAD_RE.test(String(url || '')) ? `${baseImg}${url}` : '';
}

/** Server response → store; a personal pick of a deleted gallery image falls back to the system one. */
function applyServerAppearance(data, { clearPersonal = false } = {}) {
	const system = data?.background || null;
	const gallery = Array.isArray(data?.gallery) ? data.gallery.filter(item => UPLOAD_RE.test(String(item?.url || ''))) : [];
	const systemOverlay = data?.overlay || null;
	writeJson(SYSTEM_CACHE_KEY, system);
	writeJson(GALLERY_CACHE_KEY, gallery);
	writeJson(SYSTEM_OVERLAY_CACHE_KEY, systemOverlay);
	let personal = clearPersonal ? null : state.personal;
	const personalUpload = personal?.kind === 'image' && UPLOAD_RE.test(String(personal.value || ''));
	if (personalUpload && !gallery.some(item => item.url === personal.value)) personal = null;
	if (personal !== state.personal) writeJson(personalKey(state.userId), personal);
	emit({ system, gallery, personal, systemOverlay });
}

export async function initDashboardBackground(userId) {
	emit({
		userId: userId || null,
		system: readJson(SYSTEM_CACHE_KEY),
		gallery: readJson(GALLERY_CACHE_KEY) || [],
		personal: readJson(personalKey(userId)),
		systemOverlay: readJson(SYSTEM_OVERLAY_CACHE_KEY),
		personalOverlay: readJson(personalOverlayKey(userId)),
		ready: true,
	});
	if (!userId) return;
	try {
		const { data } = await api.get('/appearance/dashboard-background', { skipAuthRedirect: true });
		applyServerAppearance(data);
	} catch {
		/* Cached or stylesheet default stays applied. */
	}
}

export function setPersonalBackground(background) {
	if (background?.kind === 'image' && String(background.value).length > MAX_PERSONAL_IMAGE_CHARS) {
		throw new Error('too-large');
	}
	try {
		writeJson(personalKey(state.userId), background);
	} catch {
		throw new Error('too-large');
	}
	emit({ personal: background });
}

export function setPersonalOverlay(overlay) {
	writeJson(personalOverlayKey(state.userId), overlay);
	emit({ personalOverlay: overlay });
}

/** Drops this user's own background and overlay so the system defaults apply again. */
export function clearPersonalAppearance() {
	writeJson(personalKey(state.userId), null);
	writeJson(personalOverlayKey(state.userId), null);
	emit({ personal: null, personalOverlay: null });
}

export async function setSystemOverlay(overlay) {
	const { data } = await api.put('/appearance/dashboard-overlay', {
		tone: overlay?.tone || 'light',
		opacity: Math.round(Number(overlay?.opacity) || 0),
	});
	writeJson(personalOverlayKey(state.userId), null);
	state = { ...state, personalOverlay: null };
	applyServerAppearance(data);
}

export async function setSystemBackground(background) {
	const { data } = await api.put('/appearance/dashboard-background', background || { kind: 'default' });
	applyServerAppearance(data, { clearPersonal: true });
}

/** Super admin: adds the image to the shared Images list and makes it the system background. */
export async function uploadSystemBackground(blob, fileName) {
	const form = new FormData();
	form.append('file', blob, fileName);
	const { data } = await api.post('/appearance/dashboard-background/image', form);
	applyServerAppearance(data, { clearPersonal: true });
}

export async function removeGalleryImage(id) {
	const { data } = await api.delete(`/appearance/dashboard-background/gallery/${encodeURIComponent(id)}`);
	applyServerAppearance(data);
}

/** Downscales a pasted/dropped image so it fits storage and loads fast. */
export async function prepareBackgroundImage(file, maxSide = 2400) {
	if (!file?.type?.startsWith('image/')) throw new Error('not-image');
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(bitmap.width * scale));
	canvas.height = Math.max(1, Math.round(bitmap.height * scale));
	canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close?.();
	const toBlob = type => new Promise(resolve => canvas.toBlob(resolve, type, 0.82));
	const blob = (await toBlob('image/webp')) || (await toBlob('image/jpeg'));
	if (!blob) throw new Error('not-image');
	return blob;
}

export function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

const subscribe = listener => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};
const getSnapshot = () => state;
const getServerSnapshot = () => state;

export function useDashboardBackground() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
