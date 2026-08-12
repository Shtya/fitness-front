export const ACCEPTED_EXTENSIONS = [
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.svg',
	'.gif',
	'.glb',
	'.gltf',
];

export const ACCEPTED_MIME = [
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/svg+xml',
	'image/gif',
	'model/gltf-binary',
	'model/gltf+json',
	'application/octet-stream',
];

export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');

export function getExtension(filename = '') {
	const i = filename.lastIndexOf('.');
	return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export function isSvgFile(filename) {
	return getExtension(filename) === '.svg';
}

export function isModelFile(filename) {
	const ext = getExtension(filename);
	return ext === '.glb' || ext === '.gltf';
}

export function isImageFile(filename) {
	return !isModelFile(filename);
}

export function getAssetFolder(filename) {
	if (isModelFile(filename)) return 'models';
	if (isSvgFile(filename)) return 'svg';
	return 'images';
}

export function getAssetType(filename) {
	if (isModelFile(filename)) return 'model';
	if (isSvgFile(filename)) return 'svg';
	return 'image';
}

export function sanitizeFilename(name = 'asset') {
	const cleaned = String(name)
		.trim()
		.replace(/[^a-zA-Z0-9._-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
	return cleaned || `asset-${Date.now()}`;
}

export function uniqueFilename(name = 'asset') {
	const safe = sanitizeFilename(name);
	const ext = getExtension(safe);
	const base = ext ? safe.slice(0, -ext.length) : safe;
	const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	return `${base || 'asset'}-${stamp}${ext || ''}`;
}

export function formatParticleCount(n) {
	return Number(n || 0).toLocaleString('en-US');
}

export function publicAssetUrl(folder, filename) {
	return `/particle-assets/${folder}/${filename}`;
}
