/** Quick reactions shown under someone else's story (WhatsApp's story set). */
export const STORY_QUICK_REACTIONS = ['😂', '😮', '😍', '😢', '👏', '🔥', '🎉', '💯'];

/** Bare WhatsApp message id of a story — what receipts and live events reference. */
export function storyMessageKey(providerStatusId) {
	const id = String(providerStatusId || '').trim();
	if (!id) return '';
	return id.match(/status@broadcast_([^_]+)/i)?.[1] || id;
}

/**
 * Applies a `status_interactions_updated` socket payload to a list of stories.
 * Returns the same array when nothing changed so React can skip the render.
 */
export function applyStoryInteractionUpdate(items, payload) {
	const key = String(payload?.statusMessageId || '').trim();
	if (!Array.isArray(items) || !items.length || !key) return items;
	let changed = false;
	const next = items.map(item => {
		if (!item || storyMessageKey(item.providerStatusId) !== key) return item;
		const patch = {};
		if (item.isOwn) {
			if (Number.isFinite(payload.viewerCount) && payload.viewerCount !== item.viewerCount) {
				patch.viewerCount = payload.viewerCount;
			}
			if (Number.isFinite(payload.reactionCount) && payload.reactionCount !== item.reactionCount) {
				patch.reactionCount = payload.reactionCount;
			}
		} else {
			if ('myReaction' in payload && (payload.myReaction || null) !== (item.myReaction || null)) {
				patch.myReaction = payload.myReaction || null;
			}
			if ('myLiked' in payload && Boolean(payload.myLiked) !== Boolean(item.myLiked)) {
				patch.myLiked = Boolean(payload.myLiked);
			}
		}
		if (!Object.keys(patch).length) return item;
		changed = true;
		return { ...item, ...patch };
	});
	return changed ? next : items;
}

export function storyViewCountLabel(count, locale = 'en') {
	const n = Math.max(0, Number(count) || 0);
	if (locale === 'ar') {
		if (n === 0) return 'لا توجد مشاهدات بعد';
		if (n === 1) return 'مشاهدة واحدة';
		if (n === 2) return 'مشاهدتان';
		if (n <= 10) return `${n} مشاهدات`;
		return `${n} مشاهدة`;
	}
	if (n === 0) return 'No views yet';
	return n === 1 ? '1 view' : `${n} views`;
}

export function storyViewerName(viewer, locale = 'en') {
	const name = String(viewer?.name || '').trim();
	if (name) return name;
	const phone = String(viewer?.phone || '').replace(/\D/g, '');
	if (phone) return `+${phone}`;
	return locale === 'ar' ? 'جهة اتصال' : 'Contact';
}

/** "Today, 10:05" / "Yesterday, 22:10" / "12 Oct, 09:00" — the WhatsApp viewer list style. */
export function formatStoryViewTime(value, locale = 'en', now = new Date()) {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '';
	const tag = locale === 'ar' ? 'ar-EG' : 'en-GB';
	const time = date.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
	const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
	if (days === 0) return locale === 'ar' ? `اليوم، ${time}` : `Today, ${time}`;
	if (days === 1) return locale === 'ar' ? `أمس، ${time}` : `Yesterday, ${time}`;
	const day = date.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
	return locale === 'ar' ? `${day}، ${time}` : `${day}, ${time}`;
}
