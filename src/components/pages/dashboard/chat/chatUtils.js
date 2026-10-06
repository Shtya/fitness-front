export const API_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const cls = (...a) => a.filter(Boolean).join(' ');

export function detectMessageType(mime = '') {
	if (/^image\//.test(mime)) return 'image';
	if (/^video\//.test(mime)) return 'video';
	if (/^audio\//.test(mime)) return 'voice';
	return 'file';
}

export function formatDuration(sec = 0) {
	const s = Math.max(0, Math.floor(Number(sec) || 0));
	return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function timeHHMM(dateStr, locale) {
	try {
		return new Date(dateStr).toLocaleTimeString(locale === 'ar' ? 'ar' : 'en', {
			hour: '2-digit',
			minute: '2-digit',
			numberingSystem: 'latn',
		});
	} catch {
		return '';
	}
}

export function dateLabel(dateStr, t, locale) {
	const d = new Date(dateStr);
	const today = new Date();
	const yday = new Date();
	yday.setDate(today.getDate() - 1);
	const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	if (sameDay(d, today)) return t('dates.today');
	if (sameDay(d, yday)) return t('dates.yesterday');
	return d.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', { numberingSystem: 'latn' });
}

export function initials(name = '') {
	const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function resolveUrl(url) {
	if (!url) return '';
	if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
	const base = String(API_URL || '').replace(/\/+$/, '');
	const path = String(url).startsWith('/') ? url : `/${url}`;
	return `${base}${path}`;
}

export function peerOf(conversation, meId) {
	const others = (conversation?.chatParticipants || [])
		.map(p => p.user)
		.filter(u => u && u.id !== meId);
	return others[0] || null;
}

export function previewOf(last, t) {
	if (!last) return '';
	if (last.messageType === 'text') return last.content || '';
	if (last.messageType === 'image') return t('list.photo');
	if (last.messageType === 'video') return t('list.video');
	if (last.messageType === 'voice') return t('list.voice');
	if (last.messageType === 'file') return t('list.file');
	return '';
}

export function isMessageRead(msg) {
	const r = msg?.readBy;
	if (!r) return false;
	if (Array.isArray(r)) return r.length > 0;
	return true;
}

export function avatarFill(role) {
	const r = String(role || '').toLowerCase();
	if (r === 'coach') return 'linear-gradient(145deg, var(--color-secondary-400), var(--color-secondary-700))';
	if (r === 'admin' || r === 'super_admin') return 'linear-gradient(145deg, var(--color-primary-700), var(--color-primary-900))';
	return 'linear-gradient(145deg, var(--color-primary-400), var(--color-primary-700))';
}

export async function listConversations(api, page = 1, limit = 50) {
	const { data } = await api.get('/chat/conversations', { params: { page, limit } });
	return Array.isArray(data) ? data : [];
}

export async function getMessages(api, conversationId, page = 1, limit = 200) {
	const { data } = await api.get(`/chat/conversations/${conversationId}/messages`, { params: { page, limit } });
	return Array.isArray(data) ? data : [];
}

export async function searchUsersApi(api, q, role) {
	const { data } = await api.get('/chat/users/search', { params: { q, role } });
	return Array.isArray(data) ? data : [];
}

export async function getOrCreateDirect(api, userId) {
	const { data } = await api.post(`/chat/conversations/direct/${userId}`);
	return data;
}

export async function uploadChatFile(api, file) {
	const isImg = /^image\//.test(file.type);
	const isVideo = /^video\//.test(file.type);
	const url = isImg ? '/chat/upload/image' : isVideo ? '/chat/upload/video' : '/chat/upload/file';
	const fd = new FormData();
	fd.append('file', file);
	const { data } = await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
	return data;
}
