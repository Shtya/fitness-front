import api, { baseImg } from '@/utils/axios';

const streamUrlCache = new Map();

export function absoluteApiUrl(pathOrUrl) {
	if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
	if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) return pathOrUrl;
	const origin = String(baseImg || '').replace(/\/$/, '');
	const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
	return `${origin}${path}`;
}

export function rememberAttachmentStreamUrl(attachmentId, url, expiresAt) {
	const id = String(attachmentId || '');
	const href = absoluteApiUrl(url);
	if (!id || !href) return href;
	const expiresAtMs = Date.parse(String(expiresAt || '')) || Date.now() + 14 * 60 * 1000;
	streamUrlCache.set(id, { url: href, expiresAtMs });
	return href;
}

export async function getAttachmentStreamUrl(attachmentId, hint = null) {
	const id = String(attachmentId || '');
	if (!id) throw new Error('Attachment is unavailable');
	const now = Date.now();
	const cached = streamUrlCache.get(id);
	if (cached?.url && cached.expiresAtMs - 20_000 > now) return cached.url;
	if (hint?.streamUrl && hint?.streamExpiresAt) {
		const hintExpiry = Date.parse(String(hint.streamExpiresAt));
		if (Number.isFinite(hintExpiry) && hintExpiry - 20_000 > now) {
			return rememberAttachmentStreamUrl(id, hint.streamUrl, hint.streamExpiresAt);
		}
	}
	const { data } = await api.get(`/whatsapp/attachments/${id}/signed-url`);
	if (!data?.url) throw new Error('Media stream URL missing');
	return rememberAttachmentStreamUrl(id, data.url, data.expiresAt);
}

export function forgetAttachmentStreamUrl(attachmentId) {
	const id = String(attachmentId || '');
	if (id) streamUrlCache.delete(id);
}
