/**
 * Saving chat media to the device.
 *
 * iOS Safari (browser and installed PWA) has no download manager for blob URLs:
 * an `<a download>` either does nothing in standalone mode or opens a dead-end
 * viewer. The supported path is the Web Share API with real `File` objects,
 * which opens the Share Sheet with "Save Image", "Save Video" and "Save to Files".
 * Bytes are passed through untouched, so quality and format stay original.
 */

const MIME_EXTENSIONS = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/heic': 'heic',
	'image/heif': 'heif',
	'image/avif': 'avif',
	'image/bmp': 'bmp',
	'image/svg+xml': 'svg',
	'video/mp4': 'mp4',
	'video/quicktime': 'mov',
	'video/3gpp': '3gp',
	'video/webm': 'webm',
	'video/x-matroska': 'mkv',
	'audio/ogg': 'ogg',
	'audio/opus': 'opus',
	'audio/mpeg': 'mp3',
	'audio/mp3': 'mp3',
	'audio/mp4': 'm4a',
	'audio/x-m4a': 'm4a',
	'audio/aac': 'aac',
	'audio/wav': 'wav',
	'audio/x-wav': 'wav',
	'audio/webm': 'weba',
	'audio/amr': 'amr',
	'application/pdf': 'pdf',
	'application/zip': 'zip',
	'application/x-zip-compressed': 'zip',
	'application/msword': 'doc',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
	'application/vnd.ms-excel': 'xls',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
	'application/vnd.ms-powerpoint': 'ppt',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
	'text/plain': 'txt',
	'text/csv': 'csv',
	'text/vcard': 'vcf',
	'text/x-vcard': 'vcf',
	'application/json': 'json',
};

const KIND_BASE_NAMES = {
	image: 'WhatsApp Image',
	sticker: 'WhatsApp Sticker',
	video: 'WhatsApp Video',
	audio: 'WhatsApp Audio',
	ptt: 'WhatsApp Audio',
	voice: 'WhatsApp Audio',
	document: 'WhatsApp Document',
};

const MAX_FILE_NAME_LENGTH = 120;

export function normalizeMimeType(value) {
	return String(value || '')
		.split(';')[0]
		.trim()
		.toLowerCase();
}

export function extensionForMimeType(value) {
	return MIME_EXTENSIONS[normalizeMimeType(value)] || '';
}

function splitExtension(name) {
	const dot = name.lastIndexOf('.');
	if (dot <= 0 || dot === name.length - 1) return { base: name, ext: '' };
	const ext = name.slice(dot + 1);
	if (!/^[a-z0-9]{1,6}$/i.test(ext)) return { base: name, ext: '' };
	return { base: name.slice(0, dot), ext };
}

function pad2(value) {
	return String(value).padStart(2, '0');
}

/** "WhatsApp Image 2026-10-13 at 09.49.12" — the name WhatsApp itself exports. */
export function fallbackMediaBaseName(kind, sentAt) {
	const base = KIND_BASE_NAMES[String(kind || '').toLowerCase()] || 'WhatsApp File';
	const date = sentAt ? new Date(sentAt) : null;
	if (!date || Number.isNaN(date.getTime())) return base;
	const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
	const time = `${pad2(date.getHours())}.${pad2(date.getMinutes())}.${pad2(date.getSeconds())}`;
	return `${base} ${day} at ${time}`;
}

/**
 * Keeps the original name (including Arabic) but strips path and reserved
 * characters, and adds the extension iOS needs to offer "Save Image/Video".
 */
export function mediaFileName(name, mimeType, { kind = '', sentAt = null } = {}) {
	const cleaned = String(name || '')
		.replace(/[\u0000-\u001f\u007f]/g, '')
		.split(/[\\/]/)
		.pop()
		.replace(/[:*?"<>|]/g, '_')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^\.+/, '');
	const mimeExt = extensionForMimeType(mimeType);
	const { base, ext } = splitExtension(cleaned);
	const safeBase = (base || fallbackMediaBaseName(kind, sentAt)).trim();
	const finalExt = ext || mimeExt;
	const room = MAX_FILE_NAME_LENGTH - (finalExt ? finalExt.length + 1 : 0);
	const trimmedBase = safeBase.length > room ? safeBase.slice(0, room).trim() : safeBase;
	return finalExt ? `${trimmedBase}.${finalExt}` : trimmedBase;
}

/** Wraps original bytes in a named `File`; never re-encodes. */
export function toMediaFile(blob, { fileName = '', mimeType = '', kind = '', sentAt = null } = {}, FileCtor) {
	const Ctor = FileCtor || (typeof File === 'function' ? File : null);
	const blobType = normalizeMimeType(blob?.type);
	const declaredType = normalizeMimeType(mimeType);
	const type =
		blobType && blobType !== 'application/octet-stream' ? blobType : declaredType || blobType || '';
	const name = mediaFileName(fileName, type, { kind, sentAt });
	if (!Ctor) throw new Error('File API is unavailable');
	return new Ctor([blob], name, type ? { type } : undefined);
}

export function isAppleMobileDevice(nav) {
	if (!nav) return false;
	const ua = String(nav.userAgent || '');
	if (/iPhone|iPad|iPod/i.test(ua)) return true;
	return nav.platform === 'MacIntel' && Number(nav.maxTouchPoints) > 1;
}

export function isStandaloneDisplay(win) {
	if (!win) return false;
	if (win.navigator?.standalone === true) return true;
	try {
		return Boolean(win.matchMedia?.('(display-mode: standalone)').matches);
	} catch {
		return false;
	}
}

function canShareFiles(nav, files) {
	if (typeof nav?.share !== 'function' || typeof nav?.canShare !== 'function') return false;
	try {
		return Boolean(nav.canShare({ files }));
	} catch {
		return false;
	}
}

/** iOS has no blob download manager, so it always goes through the Share Sheet when it can. */
export function shouldSaveViaShareSheet(nav, files) {
	return isAppleMobileDevice(nav) && canShareFiles(nav, files);
}

function anchorDownload(file, { doc, url }) {
	const href = url.createObjectURL(file);
	const anchor = doc.createElement('a');
	anchor.href = href;
	anchor.download = file.name;
	anchor.rel = 'noopener';
	anchor.style.display = 'none';
	doc.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	const timer = setTimeout(() => url.revokeObjectURL(href), 60_000);
	timer?.unref?.();
}

function browserEnv() {
	if (typeof window === 'undefined') return null;
	return { nav: window.navigator, doc: window.document, url: window.URL, win: window };
}

/**
 * Status values:
 * - `shared`: the Share Sheet completed (user picked Save Image / Save to Files / …)
 * - `cancelled`: the user closed the Share Sheet
 * - `needs-gesture`: Safari refused because the tap's activation expired while
 *    fetching; call again from a fresh tap with the same files
 * - `downloaded`: handed to the browser download manager
 */
export async function saveFilesToDevice(files, env = browserEnv()) {
	const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
	if (!list.length) throw new Error('Nothing to save');
	if (!env?.doc || !env?.url) throw new Error('Saving is unavailable here');
	const { nav } = env;

	if (shouldSaveViaShareSheet(nav, list)) {
		try {
			await nav.share({ files: list });
			return { status: 'shared' };
		} catch (error) {
			if (error?.name === 'AbortError') return { status: 'cancelled' };
			if (error?.name === 'NotAllowedError') return { status: 'needs-gesture' };
			// Share Sheet failed for another reason — fall back to a plain download.
		}
	}

	for (const file of list) anchorDownload(file, env);
	return { status: 'downloaded' };
}
