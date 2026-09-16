import api, { baseImg } from '@/utils/axios';

const streamUrlCache = new Map();

export function absoluteApiUrl(pathOrUrl) {
	if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
	if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) return pathOrUrl;
	const origin = String(baseImg || '')
		.trim()
		.replace(/\/$/, '');
	const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
	if (!origin) return path;
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

// A screenful of media used to mean one signed-url request per bubble. Requests
// raised in the same tick are coalesced into a single batch call instead.
const pendingBatch = new Map();
let batchTimer = null;

function flushBatch() {
	batchTimer = null;
	const batch = [...pendingBatch.entries()];
	pendingBatch.clear();
	if (!batch.length) return;

	const ids = batch.map(([id]) => id);
	api.post('/whatsapp/attachments/signed-urls', { attachmentIds: ids })
		.then(({ data }) => {
			const byId = new Map(
				(Array.isArray(data?.items) ? data.items : []).map(item => [
					String(item?.attachmentId || ''),
					item,
				]),
			);
			for (const [id, waiters] of batch) {
				const item = byId.get(id);
				if (item?.url) {
					const href = rememberAttachmentStreamUrl(id, item.url, item.expiresAt);
					waiters.forEach(({ resolve }) => resolve(href));
				} else {
					const error = new Error('Media stream URL missing');
					waiters.forEach(({ reject }) => reject(error));
				}
			}
		})
		.catch(error => {
			for (const [, waiters] of batch) waiters.forEach(({ reject }) => reject(error));
		});
}

function requestStreamUrl(id) {
	return new Promise((resolve, reject) => {
		const waiters = pendingBatch.get(id);
		if (waiters) {
			waiters.push({ resolve, reject });
			return;
		}
		pendingBatch.set(id, [{ resolve, reject }]);
		if (!batchTimer) batchTimer = setTimeout(flushBatch, 16);
	});
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
	return requestStreamUrl(id);
}

export function forgetAttachmentStreamUrl(attachmentId) {
	const id = String(attachmentId || '');
	if (id) streamUrlCache.delete(id);
}
