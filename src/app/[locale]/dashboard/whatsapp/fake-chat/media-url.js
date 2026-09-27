import api, { baseImg } from '@/utils/axios';

/**
 * Turn stored media refs into a browser-loadable URL.
 * - /fake-chat/... → same-origin public asset
 * - /uploads/fake-chat/... → same-origin Next public/
 * - /uploads/chat/... → same-origin Next proxy (Nest static)
 * - data:/blob:/http(s) → unchanged (http uploads also routed via proxy when possible)
 */
export function resolveFakeChatMediaUrl(src) {
	const s = String(src || '').trim();
	if (!s) return '';
	if (s.startsWith('data:') || s.startsWith('blob:')) return s;

	let uploadsPath = '';
	if (s.startsWith('/uploads/')) {
		uploadsPath = s;
	} else if (/^https?:\/\//i.test(s)) {
		try {
			const u = new URL(s);
			if (u.pathname.startsWith('/uploads/')) uploadsPath = u.pathname;
		} catch {
			/* keep absolute */
		}
		if (!uploadsPath) return s;
	}

	if (uploadsPath) {
		// Local Next public uploads — already same-origin.
		if (uploadsPath.startsWith('/uploads/fake-chat/')) return uploadsPath;
		// Nest /uploads/chat/... → proxy for canvas capture.
		if (typeof window !== 'undefined') {
			return `/api/fake-chat/proxy-image?src=${encodeURIComponent(uploadsPath)}`;
		}
		const origin = String(baseImg || '').replace(/\/$/, '');
		return origin ? `${origin}${uploadsPath}` : uploadsPath;
	}

	return s;
}

/** Short path for JSON / clipboard (never a data: URL). */
export function shortMediaPath(src) {
	const s = String(src || '').trim();
	if (!s || s.startsWith('data:')) return '';
	if (/^https?:\/\//i.test(s)) {
		try {
			const u = new URL(s);
			if (u.pathname.startsWith('/uploads/') || u.pathname.startsWith('/fake-chat/')) {
				return u.pathname;
			}
		} catch {
			/* ignore */
		}
		return s;
	}
	return s;
}

/** Absolute link on the API host for sharing / paste “copy link”. */
export function absoluteMediaLink(src) {
	const path = shortMediaPath(src) || String(src || '').trim();
	if (!path) return '';
	if (/^https?:\/\//i.test(path)) return path;
	if (path.startsWith('/uploads/fake-chat/')) {
		if (typeof window !== 'undefined') {
			const site = String(process.env.NEXT_PUBLIC_WEBSITE_URL || window.location.origin).replace(
				/\/$/,
				'',
			);
			return `${site}${path}`;
		}
		return path;
	}
	if (path.startsWith('/uploads/')) {
		const origin = String(baseImg || '').replace(/\/$/, '');
		return origin ? `${origin}${path}` : path;
	}
	if (typeof window !== 'undefined') {
		const site = String(process.env.NEXT_PUBLIC_WEBSITE_URL || window.location.origin).replace(
			/\/$/,
			'',
		);
		return `${site}${path.startsWith('/') ? path : `/${path}`}`;
	}
	return path;
}

function ensureImageFileName(file) {
	if (file?.name && /\.\w+$/.test(file.name)) return file;
	const subtype = String(file?.type || 'image/png').split('/')[1] || 'png';
	const ext = subtype === 'jpeg' ? 'jpg' : subtype.replace('+xml', '');
	return new File([file], `paste.${ext}`, { type: file.type || 'image/png' });
}

function uploadErrorMessage(error) {
	const data = error?.response?.data;
	const fromBody =
		(typeof data === 'string' && data) ||
		data?.message ||
		(Array.isArray(data?.message) ? data.message.join(', ') : '') ||
		data?.error;
	if (fromBody) return String(fromBody);
	if (error?.response?.status === 401) return 'Please sign in again';
	if (error?.response?.status === 413) return 'Image too large';
	if (error?.message) return String(error.message);
	return 'Upload failed';
}

/**
 * Persist image → short `/uploads/...` path (Nest chat disk, or local fake-chat fallback).
 */
export async function uploadFakeChatImage(file) {
	if (!file) throw new Error('No file');
	const looksImage =
		String(file.type || '').startsWith('image/') ||
		!file.type ||
		file.type === 'application/octet-stream';
	if (!looksImage) throw new Error('Not an image');

	const uploadFile = ensureImageFileName(file);
	const form = new FormData();
	form.append('file', uploadFile);

	const token =
		typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') || '' : '';

	// Same-origin Next route (works even when Nest chat upload is down / CORS / auth flake).
	try {
		const res = await fetch('/api/fake-chat/upload', {
			method: 'POST',
			headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			body: form,
		});
		const data = await res.json().catch(() => ({}));
		const url = String(data?.url || '').trim();
		if (res.ok && url.startsWith('/uploads/')) return url;
		throw new Error(data?.message || `Upload failed (${res.status})`);
	} catch (firstError) {
		// Legacy Nest path as last resort.
		try {
			const { data } = await api.post('/chat/upload/image', form, {
				maxBodyLength: Infinity,
				maxContentLength: Infinity,
			});
			const url = String(data?.url || '').trim();
			if (!url.startsWith('/uploads/')) {
				throw new Error(data?.message || 'Upload failed');
			}
			return url;
		} catch (secondError) {
			throw new Error(uploadErrorMessage(secondError) || uploadErrorMessage(firstError));
		}
	}
}
