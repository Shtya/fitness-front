/** Drops anything that belongs to a different chat. Messages carry their own
 *  conversationId, so a slow response for a previously opened chat can never
 *  paint into the chat the user is looking at now. */
export function scopeMessagesToConversation(items = [], conversationId = null) {
	if (!conversationId) return Array.isArray(items) ? items : [];
	return (Array.isArray(items) ? items : []).filter(
		item => !item?.conversationId || item.conversationId === conversationId,
	);
}

function messageSortTime(message) {
	const time = new Date(message?.providerTimestamp || message?.created_at || 0).getTime();
	return Number.isFinite(time) ? time : 0;
}

const WHATSAPP_ACK_RANK = {
	pending: 0,
	sent: 1,
	delivered: 2,
	read: 3,
	played: 4,
};

export function isLocalMediaUrl(url) {
	return typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'));
}

export function isInlineImageDataUrl(url) {
	return typeof url === 'string' && /^data:image\//i.test(url);
}

/** Actual local file (blob/data), never a JPEG thumbnail used as the media src. */
export function localMediaFileUrl(attachment, kind = '') {
	const type = String(kind || attachment?.type || '').toLowerCase();
	const fileUrl = isLocalMediaUrl(attachment?.url) ? attachment.url : null;
	if (!fileUrl) return null;
	if (['video', 'audio', 'ptt', 'voice'].includes(type) && isInlineImageDataUrl(fileUrl)) {
		return null;
	}
	return fileUrl;
}

export function isPlayableVideoUrl(url) {
	if (!url || typeof url !== 'string') return false;
	if (isInlineImageDataUrl(url)) return false;
	return (
		url.startsWith('blob:') ||
		/^data:video\//i.test(url) ||
		/^https?:/i.test(url) ||
		url.startsWith('/')
	);
}

export function preferWhatsAppAckStatus(current, incoming) {
	const next = String(incoming || '').toLowerCase();
	const prev = String(current || '').toLowerCase();
	if (next === 'failed') return 'failed';
	if (!next) return prev || 'sent';
	if (prev === 'failed') return next;
	const prevRank = WHATSAPP_ACK_RANK[prev] ?? -1;
	const nextRank = WHATSAPP_ACK_RANK[next] ?? -1;
	if (nextRank < 0) return prev || next;
	return nextRank >= prevRank ? next : prev;
}

function sameMediaFamily(left, right) {
	const normalize = value => {
		const type = String(value || '').toLowerCase();
		if (['audio', 'ptt', 'voice'].includes(type)) return 'voice';
		return type;
	};
	return normalize(left) === normalize(right);
}

function mergeAttachments(existing = [], incoming = []) {
	if (!incoming?.length) return existing;
	if (!existing?.length) return incoming;
	return incoming.map((attachment, index) => {
		const previous = existing[index] || {};
		return {
			...previous,
			...attachment,
			url: attachment?.url || previous.url || null,
			previewDataUrl: attachment?.previewDataUrl || previous.previewDataUrl || null,
		};
	});
}

function isOutbound(message) {
	return String(message?.direction || 'outbound').toLowerCase() === 'outbound';
}

function uniqueSingle(matches) {
	const unique = [...new Set(matches)];
	return unique.length === 1 ? unique[0] : null;
}

function findOptimisticTwin(pending, item) {
	if (!item || item.optimistic) return null;
	if (!isOutbound(item)) return null;
	return uniqueSingle(
		pending.filter(
			message =>
				message?.optimistic &&
				!message.providerMessageId &&
				isOutbound(message) &&
				sameMediaFamily(message.type, item.type) &&
				(!item.clientMessageId ||
					!message.clientMessageId ||
					message.clientMessageId === item.clientMessageId),
		),
	);
}

function findConfirmedTwinForOptimistic(pending, item) {
	if (!item?.optimistic || item.providerMessageId) return null;
	if (!isOutbound(item)) return null;
	const itemTime = messageSortTime(item);
	return uniqueSingle(
		pending.filter(message => {
			if (
				!message ||
				message.optimistic ||
				!isOutbound(message) ||
				!sameMediaFamily(message.type, item.type)
			) {
				return false;
			}
			if (
				message.clientMessageId &&
				item.clientMessageId &&
				message.clientMessageId !== item.clientMessageId
			) {
				return false;
			}
			return Math.abs(messageSortTime(message) - itemTime) < 20_000;
		}),
	);
}

/**
 * Idempotent merge for API pages, socket events, and optimistic sends.
 * Collapses pending:* rows into the confirmed provider/DB message when the
 * same clientMessageId or providerMessageId arrives later.
 */
export function mergeMessages(current = [], incoming = [], conversationId = null) {
	const byProvider = new Map();
	const byClient = new Map();
	const byStableId = new Map();
	const orphans = [];

	const forget = message => {
		if (!message) return;
		if (message.providerMessageId && byProvider.get(message.providerMessageId) === message) {
			byProvider.delete(message.providerMessageId);
		}
		if (message.clientMessageId && byClient.get(message.clientMessageId) === message) {
			byClient.delete(message.clientMessageId);
		}
		const id = String(message.id || '');
		if (id && !id.startsWith('pending:') && !id.startsWith('live:') && byStableId.get(id) === message) {
			byStableId.delete(id);
		}
	};

	const remember = message => {
		if (message.providerMessageId) byProvider.set(message.providerMessageId, message);
		if (message.clientMessageId) byClient.set(message.clientMessageId, message);
		const id = String(message.id || '');
		if (id && !id.startsWith('pending:') && !id.startsWith('live:')) {
			byStableId.set(id, message);
		}
	};

	[
		...scopeMessagesToConversation(current, conversationId),
		...scopeMessagesToConversation(incoming, conversationId),
	].forEach((item, index) => {
		let existing =
			(item?.providerMessageId && byProvider.get(item.providerMessageId)) ||
			(item?.clientMessageId && byClient.get(item.clientMessageId)) ||
			null;
		const stableId = String(item?.id || '');
		if (
			!existing &&
			stableId &&
			!stableId.startsWith('pending:') &&
			!stableId.startsWith('live:')
		) {
			existing = byStableId.get(stableId) || null;
		}

		if (existing) {
			forget(existing);
			const merged = {
				...existing,
				...item,
				clientMessageId: item.clientMessageId || existing.clientMessageId,
				optimistic: Boolean(item.optimistic) && !item.providerMessageId,
				status: preferWhatsAppAckStatus(existing.status, item.status),
				providerTimestamp: existing.optimistic
					? existing.providerTimestamp || item.providerTimestamp
					: item.providerTimestamp || existing.providerTimestamp,
				created_at: existing.created_at || item.created_at,
				attachments: mergeAttachments(existing.attachments, item.attachments),
				reactions: item.reactions?.length ? item.reactions : existing.reactions,
				replyTo: item.replyTo || existing.replyTo,
			};
			remember(merged);
			return;
		}

		const pool = [...byProvider.values(), ...byClient.values(), ...byStableId.values(), ...orphans];
		const optimisticTwin = findOptimisticTwin(pool, item);
		if (optimisticTwin) {
			forget(optimisticTwin);
			const merged = {
				...optimisticTwin,
				...item,
				id: item.id || optimisticTwin.id,
				clientMessageId: item.clientMessageId || optimisticTwin.clientMessageId,
				optimistic: false,
				status: preferWhatsAppAckStatus(optimisticTwin.status, item.status),
				providerTimestamp: optimisticTwin.providerTimestamp || item.providerTimestamp,
				created_at: optimisticTwin.created_at || item.created_at,
				attachments: mergeAttachments(optimisticTwin.attachments, item.attachments),
				reactions: item.reactions?.length ? item.reactions : optimisticTwin.reactions,
				replyTo: item.replyTo || optimisticTwin.replyTo,
			};
			remember(merged);
			return;
		}

		const confirmedTwin = findConfirmedTwinForOptimistic(pool, item);
		if (confirmedTwin) {
			forget(confirmedTwin);
			const merged = {
				...confirmedTwin,
				...item,
				id: confirmedTwin.id,
				providerMessageId: confirmedTwin.providerMessageId || item.providerMessageId,
				clientMessageId: item.clientMessageId || confirmedTwin.clientMessageId,
				optimistic: false,
				status: preferWhatsAppAckStatus(confirmedTwin.status, item.status),
				providerTimestamp: item.providerTimestamp || confirmedTwin.providerTimestamp,
				created_at: item.created_at || confirmedTwin.created_at,
				attachments: mergeAttachments(item.attachments, confirmedTwin.attachments),
				reactions: confirmedTwin.reactions?.length ? confirmedTwin.reactions : item.reactions,
				replyTo: confirmedTwin.replyTo || item.replyTo,
			};
			remember(merged);
			return;
		}

		const hasIdentity =
			item?.providerMessageId ||
			item?.clientMessageId ||
			(stableId && !stableId.startsWith('pending:') && !stableId.startsWith('live:'));
		if (hasIdentity) {
			remember(item);
			return;
		}

		orphans.push({
			...item,
			__anonKey: `anon:${index}:${item?.providerTimestamp || item?.created_at || ''}:${item?.text || item?.type || ''}`,
		});
	});

	const deduped = new Set();
	const merged = [];
	for (const message of [
		...byProvider.values(),
		...byClient.values(),
		...byStableId.values(),
	]) {
		if (deduped.has(message)) continue;
		deduped.add(message);
		merged.push(message);
	}
	for (const orphan of orphans) {
		const { __anonKey, ...rest } = orphan;
		merged.push(rest);
	}

	return merged.sort((a, b) => {
		const difference = messageSortTime(a) - messageSortTime(b);
		if (difference) return difference;
		return String(a?.id || a?.providerMessageId || '').localeCompare(
			String(b?.id || b?.providerMessageId || ''),
		);
	});
}

/** WhatsApp-style delivery ticks: pending → sent → delivered → read/played. */
export function messageDeliveryState(message, options = {}) {
	if (!message) return 'hidden';
	if (message.showReadReceipt === false) return 'hidden';
	if (message.optimistic || message.status === 'pending') return 'pending';
	if (message.status === 'failed') return 'failed';
	if (['read', 'played'].includes(message.status)) {
		if (options.selfChat) return 'delivered';
		return 'read';
	}
	if (message.status === 'delivered') return 'delivered';
	return 'sent';
}

export function isSelfChatConversation(conversation, account) {
	if (!conversation) return false;
	const title = String(conversationTitle(conversation) || '').trim();
	if (/^(you|me|أنت|انت|أنا|انا)$/i.test(title)) return true;
	const ownDigits = String(account?.phoneNumber || account?.wid || '').replace(/\D/g, '');
	if (ownDigits.length < 7) return false;
	const chatDigits = String(conversation.providerChatId || '')
		.split('@')[0]
		.split(':')[0]
		.replace(/\D/g, '');
	const phoneDigits = String(conversation.contact?.phoneNumber || '').replace(/\D/g, '');
	const samePhone = (left, right) =>
		left.length >= 7 &&
		right.length >= 7 &&
		(left === right || left.endsWith(right) || right.endsWith(left));
	return samePhone(ownDigits, chatDigits) || samePhone(ownDigits, phoneDigits);
}

export function messageMatchesAckTarget(message, payload = {}) {
	if (!message) return false;
	const ids = [
		payload.messageId,
		payload.providerMessageId,
		payload.clientMessageId,
		payload.id,
	]
		.map(value => String(value || '').trim())
		.filter(Boolean);
	if (!ids.length) return false;
	const own = [
		message.id,
		message.providerMessageId,
		message.clientMessageId,
	]
		.map(value => String(value || '').trim())
		.filter(Boolean);
	return own.some(id => ids.includes(id));
}

function isWeakConversationLabel(value, chatId, phone) {
	const n = String(value || '').trim();
	if (!n) return true;
	if (/^you$/i.test(n)) return false;
	const stripped = n.replace(
		/@(c\.us|s\.whatsapp\.net|g\.us|lid|hosted\.lid|newsletter)$/i,
		'',
	);
	const lidUser = String(chatId || '').includes('@')
		? String(chatId).split('@')[0]
		: '';
	const phoneDigits = String(phone || '').replace(/\D/g, '');
	if (phoneDigits && stripped.replace(/\D/g, '') === phoneDigits) return true;
	if (lidUser && (n === lidUser || stripped === lidUser)) return true;
	if (/^\+?\d[\d\s-]{6,32}$/.test(stripped) && !/[A-Za-z\u0600-\u06ff]/.test(stripped)) {
		return true;
	}
	return false;
}

export function formatWhatsAppPhone(phone) {
	const digits = String(phone || '').replace(/\D/g, '');
	if (!digits) return '';
	if (digits.startsWith('00')) return `+${digits.slice(2)}`;
	return `+${digits}`;
}

export function conversationAvatarUrl(conversation) {
	return String(
		conversation?.contact?.avatarUrl || conversation?.group?.avatarUrl || '',
	).trim();
}

export function inboxAvatarForWaId(conversations, waId) {
	const id = String(waId || '').trim();
	if (!id) return '';
	const digits = id.replace(/@.*$/, '').replace(/\D/g, '');
	const match = (conversations || []).find(item => {
		if (item?.type === 'group') return false;
		const contactId = String(item?.contact?.waId || item?.providerChatId || '');
		if (contactId === id) return true;
		return Boolean(digits) && contactId.replace(/@.*$/, '').replace(/\D/g, '') === digits;
	});
	return conversationAvatarUrl(match);
}

export function isChannelConversation(conversation) {
	const chatId = String(conversation?.providerChatId || '').toLowerCase();
	const waId = String(conversation?.contact?.waId || '').toLowerCase();
	return chatId.endsWith('@newsletter') || waId.endsWith('@newsletter');
}

export function conversationTitle(conversation) {
	if (isEmailMemoAiConversation(conversation)) {
		const name = String(conversation?.contact?.name || '').trim();
		return name || 'AI Memo Emails';
	}
	const chatId = String(conversation?.providerChatId || '');
	const isGroup =
		conversation?.type === 'group' || chatId.endsWith('@g.us');
	const isChannel = isChannelConversation(conversation);
	const phone = String(conversation?.contact?.phoneNumber || '').trim();
	const contactName = String(conversation?.contact?.name || '').trim();
	const pushName = String(
		conversation?.contact?.pushName ||
			conversation?.contact?.pushname ||
			conversation?.contact?.notify ||
			'',
	).trim();
	const groupSubject = String(conversation?.group?.subject || '').trim();

	if (groupSubject && !isWeakConversationLabel(groupSubject, chatId, phone)) {
		return groupSubject;
	}
	// WhatsApp order: saved contact → profile display name → phone.
	if (contactName && !isWeakConversationLabel(contactName, chatId, phone)) {
		return contactName;
	}
	if (pushName && !isWeakConversationLabel(pushName, chatId, phone)) {
		return pushName;
	}
	if (isGroup) return 'Group';
	if (isChannel) return 'Channel';

	const phoneFromChat = chatId.match(/^(\d{8,15})@(c\.us|s\.whatsapp\.net)$/i);
	return (
		formatWhatsAppPhone(phone) ||
		formatWhatsAppPhone(phoneFromChat?.[1]) ||
		'Chat'
	);
}

export const EMAIL_MEMO_AI_CHAT_ID = 'email-memo-ai@so7ba.internal';

export function isEmailMemoAiConversation(conversation) {
	if (!conversation) return false;
	if (conversation.isEmailMemoAi) return true;
	return String(conversation.providerChatId || '') === EMAIL_MEMO_AI_CHAT_ID;
}

export function normalizeWhatsAppIdentity(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/@(c\.us|s\.whatsapp\.net|g\.us|lid)$/i, '');
}

function conversationSortTime(conversation) {
	return new Date(
		conversation?.lastMessage?.providerTimestamp ||
			conversation?.lastMessageAt ||
			conversation?.created_at ||
			0,
	).getTime();
}

/** WhatsApp keeps pinned chats on top and orders the rest by newest activity.
 *  Realtime preview patches must re-apply that order, otherwise an incoming
 *  message updates the row in place without bubbling the chat up. */
export function sortConversationsByActivity(conversations = []) {
	return [...conversations].sort((a, b) => {
		const aAi = isEmailMemoAiConversation(a);
		const bAi = isEmailMemoAiConversation(b);
		if (aAi !== bAi) return aAi ? -1 : 1;
		if (Boolean(a?.isPinned) !== Boolean(b?.isPinned)) return a?.isPinned ? -1 : 1;
		const difference = conversationSortTime(b) - conversationSortTime(a);
		if (difference) return difference;
		return String(a?.id).localeCompare(String(b?.id));
	});
}

export function updateConversationPreview(conversations = [], payload = {}) {
	const conversationId = payload?.conversationId;
	const preview = payload?.preview;
	if (!conversationId || !preview) return conversations;
	const hasRenderablePreview = isRenderableWhatsAppMessage(preview);

	let changed = false;
	let reorder = false;
	const next = conversations.map(conversation => {
		if (conversation.id !== conversationId) return conversation;

		const nextTimestamp = preview.providerTimestamp || payload.lastMessageAt;
		const currentTimestamp =
			conversation.lastMessage?.providerTimestamp || conversation.lastMessageAt;
		const nextTime = new Date(nextTimestamp || 0).getTime();
		const currentTime = new Date(currentTimestamp || 0).getTime();
		const isLatest =
			!Number.isFinite(currentTime) ||
			!currentTimestamp ||
			(Number.isFinite(nextTime) && nextTime >= currentTime);
		const unreadCount =
			isLatest && String(preview.direction || '').toLowerCase() === 'outbound'
				? 0
				: payload.unreadCount == null
					? conversation.unreadCount
					: Math.max(0, Number(payload.unreadCount) || 0);

		changed = true;
		if (isLatest && hasRenderablePreview) reorder = true;
		const sameLastMessage = Boolean(
			(preview.id && conversation.lastMessage?.id === preview.id) ||
				(preview.providerMessageId &&
					conversation.lastMessage?.providerMessageId === preview.providerMessageId) ||
				(preview.clientMessageId &&
					conversation.lastMessage?.clientMessageId === preview.clientMessageId),
		);
		const lastMessage =
			isLatest && hasRenderablePreview
				? sameLastMessage
					? {
							...conversation.lastMessage,
							...preview,
							status: preferWhatsAppAckStatus(
								conversation.lastMessage?.status,
								preview.status,
							),
							providerTimestamp:
								nextTimestamp || conversation.lastMessage?.providerTimestamp,
						}
					: {
							...preview,
							providerTimestamp:
								nextTimestamp || preview.providerTimestamp,
						}
				: sameLastMessage && conversation.lastMessage
					? {
							...conversation.lastMessage,
							status: preferWhatsAppAckStatus(conversation.lastMessage.status, preview.status),
						}
					: conversation.lastMessage;
		return {
			...conversation,
			unreadCount,
			...(isLatest && hasRenderablePreview
				? {
						lastMessageAt: nextTimestamp || conversation.lastMessageAt,
						lastMessage,
					}
				: lastMessage !== conversation.lastMessage
					? { lastMessage }
					: {}),
		};
	});

	if (!changed) return conversations;
	return reorder ? sortConversationsByActivity(next) : next;
}

export function conversationUnreadCount(conversation) {
	return Math.max(0, Number(conversation?.unreadCount) || 0);
}

/** Chip filters that can be applied to the already-loaded All inbox. */
export const WHATSAPP_INBOX_CHIP_FILTERS = new Set([
	'unread',
	'favorites',
	'important',
	'starred',
]);

/**
 * Client-side match for All / Unread / Favorites / Important chips.
 * Important uses hasImportantMessages (set when starring or after a background important fetch).
 */
export function conversationMatchesInboxFilter(conversation, filter = 'all', options = {}) {
	const normalized = String(filter || 'all').toLowerCase();
	if (!normalized || normalized === 'all') return true;
	if (normalized === 'unread') return conversationUnreadCount(conversation) > 0;
	if (normalized === 'favorites') return Boolean(conversation?.isFavorite);
	if (normalized === 'important' || normalized === 'starred') {
		if (conversation?.hasImportantMessages) return true;
		const messagesCache = options.messagesCache;
		if (!messagesCache || typeof messagesCache.get !== 'function' || !conversation?.id) {
			return false;
		}
		const main = messagesCache.get(conversation.id);
		if ((main?.items || []).some(item => item?.isStarred)) return true;
		const important = messagesCache.get(`${conversation.id}:important`);
		return (important?.items || []).length > 0;
	}
	return true;
}

export function seekRatio(clientX, left, width, isRtl = false) {
	if (!(width > 0)) return 0;
	const physicalRatio = (clientX - left) / width;
	return Math.min(1, Math.max(0, isRtl ? 1 - physicalRatio : physicalRatio));
}

export function relativeTime(dateStr, nowOrLocale = Date.now(), locale = 'en') {
	if (!dateStr) return '';
	const now = typeof nowOrLocale === 'number' ? nowOrLocale : Date.now();
	const language = typeof nowOrLocale === 'string' ? nowOrLocale : locale;
	const time = new Date(dateStr).getTime();
	if (!Number.isFinite(time)) return '';
	const diff = Math.max(0, now - time);
	const min = Math.floor(diff / 60000);
	if (min < 1) return language === 'ar' ? 'الآن' : 'now';
	if (min < 60) return language === 'ar' ? `${min} د` : `${min} min`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return language === 'ar' ? `${hr} س` : `${hr} hr`;
	const day = Math.floor(hr / 24);
	if (day < 30) return language === 'ar' ? `${day} ي` : `${day}d`;
	const month = Math.floor(day / 30);
	if (month < 12) return language === 'ar' ? `${month} ش` : `${month} mo`;
	const year = Math.floor(day / 365);
	return language === 'ar' ? `${year} سنة` : `${year}y`;
}

const ARABIC_SCRIPT_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/g;
const LATIN_SCRIPT_RE = /[A-Za-z]/g;
const ARABIC_CHAR_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

/** First strong letter wins: Arabic → rtl, Latin → ltr. Skips digits/punctuation/space. */
export function firstStrongTextDirection(text) {
	const value = String(text || '');
	for (const ch of value) {
		if (ARABIC_CHAR_RE.test(ch)) return 'rtl';
		if (LATIN_CHAR_RE.test(ch)) return 'ltr';
	}
	return 'ltr';
}

export function isMostlyArabicText(text) {
	const value = String(text || '');
	if (!value.trim()) return false;
	const arabic = (value.match(ARABIC_SCRIPT_RE) || []).length;
	if (!arabic) return false;
	const latin = (value.match(LATIN_SCRIPT_RE) || []).length;
	return arabic >= latin;
}

export function messageTextPresentation(text) {
	const value = String(text || '');
	// Same rule as WhatsApp Web: first strong letter decides bubble direction.
	const dir = firstStrongTextDirection(value);
	const isArabic = dir === 'rtl';
	const arabicStyle = {
		fontFamily:
			'"Segoe UI", Tahoma, "Noto Sans Arabic", var(--font-arabic), "Helvetica Neue", Arial, sans-serif',
		fontWeight: 400,
		fontFeatureSettings: 'normal',
		letterSpacing: 'normal',
		lineHeight: '19px',
		direction: 'rtl',
		unicodeBidi: 'plaintext',
		textAlign: 'start',
		overflowWrap: 'break-word',
		wordBreak: 'normal',
		wordWrap: 'break-word',
		hyphens: 'none',
		whiteSpace: 'pre-wrap',
	};
	const englishStyle = {
		direction: 'ltr',
		textAlign: 'start',
		unicodeBidi: 'plaintext',
		overflowWrap: 'break-word',
		wordBreak: 'normal',
		wordWrap: 'break-word',
		hyphens: 'none',
		whiteSpace: 'pre-wrap',
		fontFamily:
			'"Segoe UI", "Helvetica Neue", Helvetica, "Lucida Grande", Arial, Ubuntu, Cantarell, "Fira Sans", sans-serif',
		fontWeight: 400,
		letterSpacing: 'normal',
		fontFeatureSettings: 'normal',
		lineHeight: '19px',
	};
	if (isArabic) {
		return {
			dir: 'rtl',
			lang: 'ar',
			isArabic: true,
			className: 'wa-message-text--ar',
			style: arabicStyle,
		};
	}
	return {
		dir: 'ltr',
		lang: 'en',
		isArabic: false,
		className: 'wa-message-text--en',
		style: englishStyle,
	};
}

/**
 * Detect Markdown that WhatsApp native formatting does not cover
 * (headings, fenced code, **bold**, dash lists, etc.).
 * Keep plain WhatsApp *bold* / _italic_ on the WA path.
 */
export function looksLikeMarkdown(text) {
	const value = String(text || '')
		.replace(/^\uFEFF/, '')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.replace(/\r\n/g, '\n');
	if (!value.trim()) return false;
	if (/(^|\n)\s{0,3}#{1,6}\s+\S/.test(value)) return true;
	if (/(^|\n)\s*```/.test(value)) return true;
	if (/\*\*[^*\n][\s\S]*?\*\*/.test(value)) return true;
	if (/(^|\n)\s{0,3}[-+]\s+\S/.test(value)) return true;
	if (/(^|\n)\s{0,3}\d+\.\s+\S/.test(value)) return true;
	if (/(^|\n)\s{0,3}>\s+\S/.test(value)) return true;
	if (/\[[^\]]+\]\([^)\s]+\)/.test(value)) return true;
	if (/`[^`\n]+`/.test(value) && /\n/.test(value)) return true;
	return false;
}

/**
 * WhatsApp-style inline formatting: *bold* _italic_ ~strike~ `code`
 * (also accepts **bold**). Nested markers are left as plain text.
 */
export function parseWhatsAppBold(text) {
	const value = String(text || '');
	if (!value) return [{ text: '', bold: false, italic: false, strike: false, code: false }];
	const pattern =
		/`([^`\n]+)`|\*{1,2}(?=\S)([\s\S]*?\S)\*{1,2}|_(?=\S)([\s\S]*?\S)_|~(?=\S)([\s\S]*?\S)~/g;
	const parts = [];
	let cursor = 0;
	let match;
	while ((match = pattern.exec(value)) !== null) {
		if (match.index > cursor) {
			parts.push({
				text: value.slice(cursor, match.index),
				bold: false,
				italic: false,
				strike: false,
				code: false,
			});
		}
		if (match[1] != null) {
			parts.push({ text: match[1], bold: false, italic: false, strike: false, code: true });
		} else if (match[2] != null) {
			parts.push({ text: match[2], bold: true, italic: false, strike: false, code: false });
		} else if (match[3] != null) {
			parts.push({ text: match[3], bold: false, italic: true, strike: false, code: false });
		} else if (match[4] != null) {
			parts.push({ text: match[4], bold: false, italic: false, strike: true, code: false });
		}
		cursor = match.index + match[0].length;
	}
	if (cursor < value.length) {
		parts.push({
			text: value.slice(cursor),
			bold: false,
			italic: false,
			strike: false,
			code: false,
		});
	}
	return parts.length
		? parts
		: [{ text: value, bold: false, italic: false, strike: false, code: false }];
}

/** Compress large images before upload while keeping the 25MB hard cap elsewhere. */
export async function compressImageForWhatsApp(file, options = {}) {
	if (!file || !String(file.type || '').startsWith('image/')) return file;
	if (String(file.type || '').includes('gif')) return file;
	const maxEdge = Number(options.maxEdge) || 1920;
	const quality = Number(options.quality) || 0.82;
	const minBytesToCompress = Number(options.minBytes) || 350 * 1024;
	if (file.size < minBytesToCompress) return file;
	if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
		return file;
	}
	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			bitmap.close?.();
			return file;
		}
		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close?.();
		const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
		if (!blob || blob.size >= file.size) return file;
		const name = String(file.name || 'image.jpg').replace(/\.\w+$/, '.jpg');
		return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
	} catch {
		return file;
	}
}

const MESSAGE_URL_PATTERN =
	/(?:https?:\/\/|www\.)[^\s<>"']+|(?:(?:m\.|www\.)?(?:facebook|instagram|youtube|tiktok|twitter|x)\.com|fb\.watch|youtu\.be)\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[),.!?;:\]}]+$/;
const MESSAGE_MENTION_PATTERN = /@\d{8,32}\b/g;
const MESSAGE_EMOJI_PATTERN =
	/\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?)*/gu;

export function normalizeHttpUrl(value) {
	const trimmed = String(value || '').trim();
	if (!trimmed) return '';
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	if (trimmed.startsWith('//')) return `https:${trimmed}`;
	return `https://${trimmed.replace(/^\/+/, '')}`;
}

function pushTextWithEmojis(segments, text) {
	const value = String(text || '');
	if (!value) return;
	MESSAGE_EMOJI_PATTERN.lastIndex = 0;
	let cursor = 0;
	let match;
	while ((match = MESSAGE_EMOJI_PATTERN.exec(value)) !== null) {
		if (match.index > cursor) {
			segments.push({ type: 'text', text: value.slice(cursor, match.index) });
		}
		segments.push({ type: 'emoji', text: match[0] });
		cursor = match.index + match[0].length;
	}
	if (cursor < value.length) {
		segments.push({ type: 'text', text: value.slice(cursor) });
	}
}

function pushTextWithMentions(segments, text) {
	const value = String(text || '');
	if (!value) return;
	MESSAGE_MENTION_PATTERN.lastIndex = 0;
	let cursor = 0;
	let match;
	while ((match = MESSAGE_MENTION_PATTERN.exec(value)) !== null) {
		if (match.index > cursor) {
			pushTextWithEmojis(segments, value.slice(cursor, match.index));
		}
		segments.push({ type: 'mention', text: match[0] });
		cursor = match.index + match[0].length;
	}
	if (cursor < value.length) {
		pushTextWithEmojis(segments, value.slice(cursor));
	}
}

export function whatsAppIdDigits(value) {
	return String(value || '')
		.replace(/^@/, '')
		.replace(/@.*$/, '')
		.replace(/\D/g, '');
}

function isWeakMentionLabel(value, waId, phone) {
	const n = String(value || '').trim();
	if (!n) return true;
	const digits = whatsAppIdDigits(n);
	const idDigits = whatsAppIdDigits(waId);
	const phoneDigits = String(phone || '').replace(/\D/g, '');
	if (idDigits && digits === idDigits) return true;
	if (phoneDigits && digits === phoneDigits && /^\+?\d[\d\s-]*$/.test(n)) return true;
	return /^\d{8,32}$/.test(n);
}

function rememberMentionIdentity(directory, waId, name, phone) {
	const digits = whatsAppIdDigits(waId);
	if (!digits) return;
	const current = directory.get(digits) || { name: '', phone: '' };
	if (!current.name && name && !isWeakMentionLabel(name, waId, phone)) {
		current.name = String(name).trim();
	}
	const phoneDigits = String(phone || '').replace(/\D/g, '');
	if (
		!current.phone &&
		phoneDigits &&
		phoneDigits !== digits &&
		phoneDigits.length >= 8 &&
		phoneDigits.length <= 15
	) {
		current.phone = phoneDigits;
	}
	directory.set(digits, current);
}

export function mentionedJidsFromRaw(raw) {
	const info =
		raw?.message?.extendedTextMessage?.contextInfo ||
		raw?.message?.imageMessage?.contextInfo ||
		raw?.message?.videoMessage?.contextInfo ||
		raw?.extendedTextMessage?.contextInfo ||
		raw?.contextInfo ||
		{};
	return Array.isArray(info.mentionedJid) ? info.mentionedJid.filter(Boolean) : [];
}

export function buildWhatsAppMentionDirectory({
	conversations = [],
	messages = [],
	participants = [],
	mentionLabels = {},
} = {}) {
	const directory = new Map();
	for (const [id, label] of Object.entries(mentionLabels || {})) {
		rememberMentionIdentity(directory, id, label, '');
	}
	for (const conversation of conversations) {
		rememberMentionIdentity(
			directory,
			conversation?.contact?.waId || conversation?.providerChatId,
			conversation?.contact?.name,
			conversation?.contact?.phoneNumber,
		);
		for (const participant of conversation?.group?.participants || []) {
			rememberMentionIdentity(directory, participant?.waId, participant?.displayName, '');
		}
	}
	for (const participant of participants) {
		rememberMentionIdentity(directory, participant?.waId, participant?.displayName, '');
	}
	for (const message of messages) {
		const sender = groupSenderIdentity(message);
		rememberMentionIdentity(
			directory,
			message?.senderWaId || sender.key,
			sender.name,
			'',
		);
		for (const [id, label] of Object.entries(message?.mentionLabels || {})) {
			rememberMentionIdentity(directory, id, label, '');
		}
		for (const jid of mentionedJidsFromRaw(message?.raw)) {
			rememberMentionIdentity(directory, jid, '', '');
		}
	}
	return directory;
}

export function resolveWhatsAppMentionLabel(mentionText, directory, mentionLabels) {
	const digits = whatsAppIdDigits(mentionText);
	const override =
		mentionLabels?.[digits] ||
		mentionLabels?.[mentionText] ||
		mentionLabels?.[String(mentionText || '').replace(/^@/, '')];
	if (override && !isWeakMentionLabel(override, mentionText)) {
		const label = String(override).trim();
		return label.startsWith('@') ? label : `@${label}`;
	}
	const hit = directory instanceof Map ? directory.get(digits) : directory?.[digits];
	if (hit?.name) return `@${hit.name}`;
	if (hit?.phone) return `@${formatWhatsAppPhone(hit.phone)}`;
	return String(mentionText || '').startsWith('@')
		? String(mentionText)
		: `@${mentionText || ''}`;
}

export function messageTextSegments(text) {
	const value = String(text || '');
	const segments = [];
	let cursor = 0;
	let match;
	MESSAGE_URL_PATTERN.lastIndex = 0;

	while ((match = MESSAGE_URL_PATTERN.exec(value)) !== null) {
		if (match.index > cursor) {
			pushTextWithMentions(segments, value.slice(cursor, match.index));
		}
		const raw = match[0];
		const trailing = raw.match(TRAILING_URL_PUNCTUATION)?.[0] || '';
		const linkText = trailing ? raw.slice(0, -trailing.length) : raw;
		if (linkText) {
			segments.push({
				type: 'link',
				text: linkText,
				href: normalizeHttpUrl(linkText),
			});
		}
		if (trailing) pushTextWithMentions(segments, trailing);
		cursor = match.index + raw.length;
	}
	if (cursor < value.length) {
		pushTextWithMentions(segments, value.slice(cursor));
	}
	return segments.length ? segments : [{ type: 'text', text: value }];
}

export function firstMessageLink(text) {
	const link = messageTextSegments(text).find(segment => segment.type === 'link');
	if (!link) return null;
	try {
		const parsed = new URL(link.href);
		return {
			href: parsed.href,
			hostname: parsed.hostname.replace(/^www\./i, ''),
			displayUrl: `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}`,
		};
	} catch {
		return null;
	}
}

export function textWithoutFirstLink(text) {
	const segments = messageTextSegments(text);
	let skipped = false;
	return segments
		.map(segment => {
			if (!skipped && segment.type === 'link') {
				skipped = true;
				return '';
			}
			return segment.text || '';
		})
		.join('')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** Build an in-app iframe embed for Facebook/IG/YouTube/TikTok links when possible. */
export function getStoryMediaEmbed(rawUrl) {
	const href = normalizeHttpUrl(rawUrl);
	if (!href) return null;
	let parsed;
	try {
		parsed = new URL(href);
	} catch {
		return null;
	}
	const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
	const path = parsed.pathname || '';
	const search = parsed.searchParams;
	const encoded = encodeURIComponent(href);

	if (host === 'youtu.be') {
		const id = path.replace(/^\//, '').split('/')[0];
		if (!id) return null;
		return {
			kind: 'youtube',
			openUrl: href,
			embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
		};
	}
	if (host === 'youtube.com' || host === 'm.youtube.com') {
		const id =
			search.get('v') || path.match(/\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1];
		if (!id) return null;
		return {
			kind: 'youtube',
			openUrl: href,
			embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
		};
	}

	if (
		host === 'facebook.com' ||
		host === 'm.facebook.com' ||
		host === 'fb.com' ||
		host === 'fb.watch'
	) {
		const haystack = `${path}${parsed.search}`;
		const isVideoLike =
			host === 'fb.watch' ||
			/\/(share\/[vr]|reel\/?|reels\/|watch|videos\/|video\.php)/i.test(haystack);
		if (isVideoLike || /\/share\//i.test(path)) {
			return {
				kind: 'facebook-video',
				openUrl: href,
				embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=476&height=720&allowfullscreen=true`,
			};
		}
		return {
			kind: 'facebook-post',
			openUrl: href,
			embedUrl: `https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500`,
		};
	}

	if (host === 'instagram.com') {
		const match = path.match(/\/(p|reel|reels|tv)\/([^/?#]+)/i);
		if (!match) return null;
		const kind = match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase();
		return {
			kind: 'instagram',
			openUrl: href,
			embedUrl: `https://www.instagram.com/${kind}/${match[2]}/embed`,
		};
	}

	if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
		const match = path.match(/\/video\/(\d+)/);
		if (!match) return null;
		return {
			kind: 'tiktok',
			openUrl: href,
			embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
		};
	}

	return null;
}

const DISPLAYABLE_MEDIA_TYPES = new Set([
	'image',
	'sticker',
	'video',
	'audio',
	'ptt',
	'voice',
	'document',
	'location',
	'live_location',
	'contact',
	'contacts',
	'contactsArray',
	'vcard',
]);

const INVISIBLE_MESSAGE_CHARS_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u00AD]/g;

export function visibleMessageText(value) {
	return String(value || '').replace(INVISIBLE_MESSAGE_CHARS_RE, '').trim();
}

function hasRenderableAttachment(attachment) {
	if (!attachment || typeof attachment !== 'object') return false;
	return Boolean(
		attachment.id ||
			attachment.url ||
			attachment.key ||
			attachment.providerMediaId ||
			attachment.previewDataUrl,
	);
}

function jpegThumbnailToDataUrl(thumb) {
	if (thumb == null) return null;
	if (typeof thumb === 'string' && thumb.length) {
		if (thumb.startsWith('data:')) return thumb;
		return `data:image/jpeg;base64,${thumb}`;
	}
	return null;
}

function toLocationCoord(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function locationPayloadFromNode(node, isLive = false) {
	if (!node || typeof node !== 'object') return null;
	const latitude = toLocationCoord(node.degreesLatitude ?? node.latitude ?? node.lat);
	const longitude = toLocationCoord(node.degreesLongitude ?? node.longitude ?? node.lng ?? node.lon);
	if (latitude == null || longitude == null) return null;
	return {
		latitude,
		longitude,
		name: String(node.name || node.caption || node.loc || '').trim() || null,
		address: String(node.address || '').trim() || null,
		comment: String(node.comment || '').trim() || null,
		url: String(node.url || '').trim() || null,
		isLive: Boolean(isLive || node.isLive),
		previewDataUrl: node.previewDataUrl || jpegThumbnailToDataUrl(node.jpegThumbnail),
	};
}

function locationFromMapsUrl(value) {
	const text = String(value || '');
	if (!text) return null;
	const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
	if (at) {
		const latitude = toLocationCoord(at[1]);
		const longitude = toLocationCoord(at[2]);
		if (latitude != null && longitude != null) return { latitude, longitude, url: text.match(/https?:\/\/\S+/i)?.[0] || null };
	}
	const query = text.match(/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
	if (query) {
		const latitude = toLocationCoord(query[1]);
		const longitude = toLocationCoord(query[2]);
		if (latitude != null && longitude != null) return { latitude, longitude, url: text.match(/https?:\/\/\S+/i)?.[0] || null };
	}
	const maps = text.match(/https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps)\S*/i);
	if (maps) return { url: maps[0] };
	return null;
}

export function isWhatsAppLocationMessage(message) {
	const type = String(message?.type || '').toLowerCase();
	if (type === 'location' || type === 'live_location' || type === 'livelocation') return true;
	return Boolean(whatsAppLocationFromMessage(message));
}

export function whatsAppLocationFromMessage(message) {
	if (!message || typeof message !== 'object') return null;
	const direct = locationPayloadFromNode(message.location, Boolean(message.location?.isLive));
	if (direct) return direct;
	const content = baileysContentFromRaw(message.raw);
	if (content?.liveLocationMessage) {
		const live = locationPayloadFromNode(content.liveLocationMessage, true);
		if (live) return live;
	}
	if (content?.locationMessage) {
		const pinned = locationPayloadFromNode(content.locationMessage, false);
		if (pinned) return pinned;
	}
	const fromRaw = locationPayloadFromNode(
		message.raw,
		String(message.type || '').toLowerCase() === 'live_location',
	);
	if (fromRaw) return fromRaw;
	const stored = locationPayloadFromNode(
		message.raw?.location,
		Boolean(message.raw?.location?.isLive),
	);
	if (stored) return stored;
	return locationFromMapsUrl(message.text || message.location?.url || message.raw?.url || '');
}

export function whatsAppLocationHref(message, location = null) {
	const loc = location || whatsAppLocationFromMessage(message);
	if (loc?.url && /^https?:\/\//i.test(String(loc.url))) return String(loc.url);
	const latitude = toLocationCoord(loc?.latitude);
	const longitude = toLocationCoord(loc?.longitude);
	if (latitude != null && longitude != null) {
		return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
	}
	const fromText = locationFromMapsUrl(message?.text || '');
	if (fromText?.url) return fromText.url;
	if (fromText?.latitude != null && fromText?.longitude != null) {
		return `https://www.google.com/maps?q=${encodeURIComponent(`${fromText.latitude},${fromText.longitude}`)}`;
	}
	return null;
}

export function isRenderableWhatsAppMessage(message) {
	if (!message) return false;
	const deleted = message.deletedMode && message.deletedMode !== 'none';
	if (deleted) return true;
	if (visibleMessageText(message.text)) return true;
	if (isWhatsAppLocationMessage(message)) return true;
	if (
		Array.isArray(message.attachments) &&
		message.attachments.some(hasRenderableAttachment)
	) {
		return true;
	}
	return DISPLAYABLE_MEDIA_TYPES.has(String(message.type || '').toLowerCase());
}

/** Local pending bubble shown instantly while media upload/send runs. */
export function buildOptimisticMediaMessage({
	conversationId = null,
	clientMessageId,
	type,
	file,
	previewUrl = null,
	caption = '',
	replySnapshot = null,
} = {}) {
	const now = new Date().toISOString();
	const mediaType = String(type || 'document').toLowerCase();
	return {
		id: `pending:${clientMessageId}`,
		conversationId,
		clientMessageId,
		type: mediaType,
		text: caption || '',
		direction: 'outbound',
		status: 'pending',
		providerTimestamp: now,
		created_at: now,
		optimistic: true,
		quotedProviderMessageId: replySnapshot?.providerMessageId || null,
		replyTo: replySnapshot || null,
		attachments: [
			{
				id: `pending-att:${clientMessageId}`,
				type: mediaType,
				mimeType: file?.type || '',
				fileName: file?.name || 'voice.webm',
				sizeBytes: file?.size || 0,
				url: previewUrl || null,
				// Images/stickers read previewDataUrl immediately in MediaAttachment.
				previewDataUrl:
					previewUrl && ['image', 'sticker', 'video'].includes(mediaType)
						? previewUrl
						: null,
			},
		],
	};
}

function imageAttachmentsForMessage(message) {
	const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
	const images = attachments.filter(attachment =>
		['image', 'sticker'].includes(String(attachment?.type || '').toLowerCase()),
	);
	const imageOnly =
		images.length > 0 &&
		images.length === attachments.length &&
		!String(message?.text || '').trim();
	if (!imageOnly) return [];
	const previewFromRaw = mediaPreviewFromRaw(message?.raw);
	return images.map(attachment => ({
		...attachment,
		previewDataUrl: attachment.previewDataUrl || previewFromRaw || null,
	}));
}

function baileysContentFromRaw(raw) {
	if (!raw || typeof raw !== 'object') return null;
	const message = raw.message || null;
	if (!message) return null;
	return (
		message.ephemeralMessage?.message ||
		message.viewOnceMessage?.message ||
		message.viewOnceMessageV2?.message ||
		message.viewOnceMessageV2Extension?.message ||
		message.documentWithCaptionMessage?.message ||
		message.editedMessage?.message ||
		message
	);
}

function baileysContextInfoFromRaw(raw) {
	const content = baileysContentFromRaw(raw);
	if (!content || typeof content !== 'object') return null;
	return (
		content.extendedTextMessage?.contextInfo ||
		content.imageMessage?.contextInfo ||
		content.videoMessage?.contextInfo ||
		content.audioMessage?.contextInfo ||
		content.documentMessage?.contextInfo ||
		content.stickerMessage?.contextInfo ||
		content.locationMessage?.contextInfo ||
		content.liveLocationMessage?.contextInfo ||
		null
	);
}

function mediaPreviewFromContent(content) {
	if (!content || typeof content !== 'object') return null;
	const node =
		content.imageMessage ||
		content.videoMessage ||
		content.stickerMessage ||
		content.documentMessage ||
		content.locationMessage ||
		content.liveLocationMessage ||
		null;
	return jpegThumbnailToDataUrl(node?.jpegThumbnail);
}

export function mediaPreviewFromRaw(raw) {
	return mediaPreviewFromContent(baileysContentFromRaw(raw));
}

export function quotedMediaPreviewFromRaw(raw) {
	return mediaPreviewFromContent(baileysContextInfoFromRaw(raw)?.quotedMessage);
}

const GROUP_SENDER_COLORS = [
	'#e17076',
	'#00a884',
	'#7bc86c',
	'#6bcbef',
	'#ee7aae',
	'#e5a95e',
	'#a695e7',
	'#02a698',
];

export function groupSenderIdentity(message) {
	const waId = String(message?.senderWaId || '').trim();
	const name = String(
		message?.senderName ||
			message?.contactName ||
			message?.raw?.pushName ||
			message?.senderUser?.name ||
			'',
	).trim();
	const fallback = waId ? waId.replace(/@.*$/, '') : '';
	const label = name || fallback;
	const seed = waId || label;
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return {
		key: waId || label || String(message?.id || ''),
		name: label,
		avatarUrl: String(message?.senderAvatarUrl || '').trim(),
		color: GROUP_SENDER_COLORS[hash % GROUP_SENDER_COLORS.length],
	};
}

/** Same author + same day → WhatsApp stacks bubbles tightly with one tail. */
export function messagesFormBubbleCluster(left, right, { isGroupChat = false } = {}) {
	if (!left || !right) return false;
	const leftOut = String(left.direction || '').toLowerCase() === 'outbound';
	const rightOut = String(right.direction || '').toLowerCase() === 'outbound';
	if (leftOut !== rightOut) return false;
	const dayLeft = String(left.providerTimestamp || left.created_at || left.timestamp || '').slice(
		0,
		10,
	);
	const dayRight = String(
		right.providerTimestamp || right.created_at || right.timestamp || '',
	).slice(0, 10);
	if (dayLeft && dayRight && dayLeft !== dayRight) return false;
	if (isGroupChat && !leftOut) {
		const keyLeft = groupSenderIdentity(left).key;
		const keyRight = groupSenderIdentity(right).key;
		if (!keyLeft || !keyRight || keyLeft !== keyRight) return false;
	}
	return true;
}

export function quotedPreviewFromMessage(message) {
	return (
		message?.replyTo?.previewDataUrl ||
		quotedMediaPreviewFromRaw(message?.raw) ||
		null
	);
}

export function voiceDurationSecondsFromSource(source) {
	if (!source || typeof source !== 'object') return 0;
	const direct = [
		source.durationSeconds,
		source.duration,
		source.seconds,
		source.mediaDuration,
	];
	for (const value of direct) {
		const num = Number(value);
		if (!Number.isFinite(num) || num <= 0) continue;
		if (num > 600 && num < 3_600_000) return Math.round(num / 1000);
		return Math.round(num);
	}
	const attachments = Array.isArray(source.attachments) ? source.attachments : [];
	for (const attachment of attachments) {
		const fromName = String(attachment?.fileName || '').match(/voice-(\d+(?:\.\d+)?)s/i);
		if (fromName) {
			const num = Number(fromName[1]);
			if (Number.isFinite(num) && num > 0) return Math.round(num);
		}
		const attDuration = Number(attachment?.duration ?? attachment?.seconds);
		if (Number.isFinite(attDuration) && attDuration > 0) {
			if (attDuration > 600 && attDuration < 3_600_000) return Math.round(attDuration / 1000);
			return Math.round(attDuration);
		}
	}
	const raw = source.raw;
	if (raw && typeof raw === 'object') {
		const candidates = [
			raw.duration,
			raw.mediaData?.duration,
			raw.message?.audioMessage?.seconds,
			raw.message?.audioMessage?.duration,
			raw.message?.pttMessage?.seconds,
			raw.audioMessage?.seconds,
			raw.audioMessage?.duration,
		];
		for (const value of candidates) {
			const num = Number(value);
			if (!Number.isFinite(num) || num <= 0) continue;
			if (num > 600 && num < 3_600_000) return Math.round(num / 1000);
			return Math.round(num);
		}
	}
	return 0;
}

export function formatVoiceDurationClock(seconds) {
	const value = Math.max(0, Math.floor(Number(seconds) || 0));
	const m = Math.floor(value / 60);
	const s = value % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatQuotedMessageTime(value, locale = 'en') {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) return '';
	return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : undefined, {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function isVoiceMessageType(type) {
	return ['audio', 'ptt', 'voice'].includes(String(type || '').toLowerCase());
}

/** Snapshot used when composing a reply (and for optimistic bubbles). */
export function buildReplySnapshot(message) {
	if (!message) return null;
	return {
		id: message.id,
		providerMessageId: message.providerMessageId,
		text: message.text,
		type: message.type,
		direction: message.direction,
		durationSeconds: voiceDurationSecondsFromSource(message),
		timestamp:
			message.providerTimestamp || message.timestamp || message.created_at || null,
		senderName: String(
			message.senderName ||
				message.contactName ||
				message.raw?.pushName ||
				message.senderUser?.name ||
				'',
		).trim() || null,
	};
}

export function resolveQuotedReplySource(replyTo, messages = []) {
	if (!replyTo) return null;
	const list = Array.isArray(messages) ? messages : [];
	const byId = replyTo.id
		? list.find(item => String(item?.id) === String(replyTo.id))
		: null;
	if (byId) return { ...replyTo, ...byId, type: replyTo.type || byId.type };
	const byProvider = replyTo.providerMessageId
		? list.find(
				item =>
					String(item?.providerMessageId || '') ===
					String(replyTo.providerMessageId),
			)
		: null;
	if (byProvider) {
		return { ...replyTo, ...byProvider, type: replyTo.type || byProvider.type };
	}
	return replyTo;
}

export function quotedMessageLabel(replyTo, locale = 'en') {
	const text = String(replyTo?.text || '').trim();
	const type = String(replyTo?.type || '').toLowerCase();
	const arabic = locale === 'ar';
	const isVoice = isVoiceMessageType(type);
	// Voice notes often store a placeholder caption — prefer duration/time details.
	if (text && !isVoice) return text;
	if (['image', 'sticker'].includes(type)) return arabic ? 'صورة' : 'Photo';
	if (type === 'video') return arabic ? 'فيديو' : 'Video';
	if (isVoice) {
		const duration = voiceDurationSecondsFromSource(replyTo);
		const durationLabel = duration > 0 ? formatVoiceDurationClock(duration) : '';
		const timeLabel = formatQuotedMessageTime(
			replyTo?.timestamp || replyTo?.providerTimestamp || replyTo?.created_at,
			locale,
		);
		const parts = [
			durationLabel || (arabic ? 'رسالة صوتية' : 'Voice message'),
			timeLabel,
		].filter(Boolean);
		return parts.join(' · ');
	}
	if (text) return text;
	if (type === 'document') return arabic ? 'مستند' : 'Document';
	if (['location', 'live_location', 'livelocation'].includes(type)) {
		return arabic ? 'موقع' : 'Location';
	}
	return type || (arabic ? 'رسالة' : 'Message');
}

export function quotedVoicePresentation(replyTo, locale = 'en') {
	if (!replyTo || !isVoiceMessageType(replyTo.type)) return null;
	const duration = voiceDurationSecondsFromSource(replyTo);
	return {
		senderName: String(replyTo.senderName || '').trim() || null,
		durationLabel: duration > 0 ? formatVoiceDurationClock(duration) : null,
		timeLabel: formatQuotedMessageTime(
			replyTo.timestamp || replyTo.providerTimestamp || replyTo.created_at,
			locale,
		) || null,
		fallbackLabel: locale === 'ar' ? 'رسالة صوتية' : 'Voice message',
	};
}

export function quotedTargetFromMessage(message) {
	const reply = message?.replyTo || {};
	const id = String(reply.id || message?.replyToId || '').trim() || null;
	const providerMessageId =
		String(
			reply.providerMessageId ||
				message?.quotedProviderMessageId ||
				'',
		).trim() || null;
	return { id, providerMessageId };
}

export function messageMatchesQuotedTarget(message, target) {
	if (!message || !target) return false;
	if (target.id && String(message.id) === String(target.id)) return true;
	if (
		target.providerMessageId &&
		String(message.providerMessageId || '') === String(target.providerMessageId)
	) {
		return true;
	}
	return false;
}

export function groupConsecutiveImageMessages(messages = []) {
	const rows = [];
	for (const message of messages) {
		const images = imageAttachmentsForMessage(message);
		const senderKey = [
			message?.direction || 'unknown',
			message?.senderWaId || message?.senderUserId || '',
		].join(':');
		const previous = rows[rows.length - 1];
		if (
			images.length > 0 &&
			previous?.kind === 'image-gallery' &&
			previous.senderKey === senderKey
		) {
			previous.messages.push(message);
			previous.attachments.push(...images);
			previous.key = `${previous.messages[0].id}:${message.id}`;
			continue;
		}
		if (images.length > 0) {
			rows.push({
				kind: 'image-gallery',
				key: message.id,
				senderKey,
				messages: [message],
				attachments: [...images],
			});
		} else {
			rows.push({
				kind: 'message',
				key: message.clientMessageId || message.id,
				message,
			});
		}
	}
	return rows;
}

const COMPOSER_IMAGE_TYPES = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/gif',
]);

function extensionForImageType(type) {
	if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
	if (type === 'image/webp') return 'webp';
	if (type === 'image/gif') return 'gif';
	return 'png';
}

export function isComposerImageFile(file) {
	const type = String(file?.type || '').toLowerCase();
	if (COMPOSER_IMAGE_TYPES.has(type)) return true;
	return /\.(jpe?g|png|webp|gif)$/i.test(String(file?.name || ''));
}

export function clipboardImageFiles(event) {
	const data = event?.clipboardData;
	if (!data) return [];
	const files = [];
	const seen = new Set();
	const add = (blob, fallbackType = '') => {
		if (!blob) return;
		const type = String(blob.type || fallbackType || 'image/png').toLowerCase();
		const key = `${Number(blob.size || 0)}:${type}`;
		if (seen.has(key)) return;
		const named =
			blob instanceof File
				? blob
				: new File([blob], `pasted-image.${extensionForImageType(type)}`, {
						type: type.startsWith('image/') ? type : 'image/png',
					});
		if (!isComposerImageFile(named)) return;
		seen.add(key);
		files.push(named);
	};

	let addedFromItems = false;
	if (data.items?.length) {
		for (const item of data.items) {
			if (item.kind === 'file' && String(item.type || '').startsWith('image/')) {
				add(item.getAsFile(), item.type);
				addedFromItems = true;
			}
		}
	}
	if (!addedFromItems && data.files?.length) {
		for (const file of data.files) add(file);
	}
	return files;
}

function cssEscapeAttr(value) {
	const str = String(value || '');
	if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
		return CSS.escape(str);
	}
	return str.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
}

const mediaDimCache = new Map();

function positiveSize(value) {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function mediaNodeFromRaw(raw) {
	const content = baileysContentFromRaw(raw);
	const node = content && typeof content === 'object' ? content : raw;
	if (!node || typeof node !== 'object') return null;
	return (
		node.imageMessage ||
		node.videoMessage ||
		node.stickerMessage ||
		node.documentMessage ||
		null
	);
}

export function resetMediaDimensionsCache() {
	mediaDimCache.clear();
}

export function rememberMediaDimensions(key, width, height) {
	const id = String(key || '');
	const w = positiveSize(width);
	const h = positiveSize(height);
	if (!id || !w || !h) return null;
	const existing = mediaDimCache.get(id);
	if (existing?.width > 0 && existing?.height > 0) return existing;
	const next = { width: w, height: h };
	mediaDimCache.set(id, next);
	return next;
}

export function mediaDimensionsFromRaw(raw) {
	const node = mediaNodeFromRaw(raw);
	const width = positiveSize(node?.width ?? raw?.width);
	const height = positiveSize(node?.height ?? raw?.height);
	if (!width || !height) return null;
	return { width, height };
}

export function mediaDimensionsForAttachment(attachment, raw = null) {
	const id = String(attachment?.id || '');
	if (id && mediaDimCache.has(id)) return mediaDimCache.get(id);
	const fromAttachment = {
		width: positiveSize(attachment?.width ?? attachment?.mediaWidth),
		height: positiveSize(attachment?.height ?? attachment?.mediaHeight),
	};
	if (fromAttachment.width && fromAttachment.height) {
		if (id) mediaDimCache.set(id, fromAttachment);
		return fromAttachment;
	}
	const fromRaw = mediaDimensionsFromRaw(raw);
	if (fromRaw) {
		if (id) mediaDimCache.set(id, fromRaw);
		return fromRaw;
	}
	return null;
}

export function reservedMediaBoxStyle(dims, fallbackRatio = '4 / 5') {
	const width = positiveSize(dims?.width);
	const height = positiveSize(dims?.height);
	const ratio = width && height ? `${Math.round(width)} / ${Math.round(height)}` : fallbackRatio;
	return {
		aspectRatio: ratio,
		'--wa-media-ar': ratio,
		'--wa-video-ar': ratio,
	};
}

export function isPortraitMediaDims(dims) {
	return positiveSize(dims?.height) > positiveSize(dims?.width) && positiveSize(dims?.width) > 0;
}

export function findThreadAnchorRow(box, pending) {
	if (!box || !pending || typeof box.querySelector !== 'function') return null;
	if (pending.rowKey) {
		const key = cssEscapeAttr(pending.rowKey);
		const byKey = box.querySelector(`[data-wa-row-key="${key}"]`);
		if (byKey) return byKey;
	}
	if (pending.messageId) {
		const id = cssEscapeAttr(pending.messageId);
		return (
			box.querySelector(`[data-wa-message-id="${id}"]`) ||
			box.querySelector(`[data-wa-message-ids~="${id}"]`)
		);
	}
	return null;
}

export function captureThreadScrollAnchor(box, options = {}) {
	if (!box) return null;
	const virtualItems = Array.isArray(options.virtualItems) ? options.virtualItems : [];
	const totalSize = positiveSize(options.totalSize) || Number(box.scrollHeight) || 0;
	const scrollTop = Number(box.scrollTop) || 0;
	const clientHeight = Number(box.clientHeight) || 0;
	const boxRect =
		typeof box.getBoundingClientRect === 'function'
			? box.getBoundingClientRect()
			: { top: 0 };
	const viewportTop = Number(boxRect?.top) || 0;

	let row = null;
	let bestScore = Number.POSITIVE_INFINITY;
	const nodes =
		typeof box.querySelectorAll === 'function' ? box.querySelectorAll('[data-wa-row-key]') : [];
	for (const node of nodes) {
		if (typeof node.getBoundingClientRect !== 'function') continue;
		const rect = node.getBoundingClientRect();
		if (rect.bottom <= viewportTop + 1) continue;
		if (clientHeight > 0 && rect.top >= viewportTop + clientHeight) continue;
		const dist = rect.top - viewportTop;
		const score = dist >= -1 ? dist : Number.POSITIVE_INFINITY;
		if (score < bestScore) {
			bestScore = score;
			row = node;
		}
	}

	let virtualIndex = -1;
	let virtualKey = '';
	if (virtualItems.length) {
		const visible = virtualItems.find(
			item => Number(item?.end) > scrollTop + 1 && Number(item?.start) < scrollTop + clientHeight,
		);
		if (visible) {
			virtualIndex = Number(visible.index);
			virtualKey = String(visible.key ?? '');
		}
	}

	const rowKey = row?.getAttribute?.('data-wa-row-key') || virtualKey || '';
	const messageId = row?.getAttribute?.('data-wa-message-id') || '';
	const offsetFromViewport = row?.getBoundingClientRect
		? row.getBoundingClientRect().top - viewportTop
		: 0;

	return {
		previousHeight: Number(box.scrollHeight) || totalSize,
		previousTotalSize: totalSize,
		previousScrollTop: scrollTop,
		lastAppliedTotalSize: totalSize,
		rowKey,
		messageId,
		virtualIndex,
		offsetFromViewport,
	};
}

export function applyThreadScrollAnchor(box, pending, options = {}) {
	if (!box || !pending) return false;
	const totalSize = positiveSize(options.totalSize);
	const virtualized = Boolean(options.virtualized);
	const row = findThreadAnchorRow(box, pending);
	if (row && typeof row.getBoundingClientRect === 'function') {
		const viewportTop =
			typeof box.getBoundingClientRect === 'function'
				? box.getBoundingClientRect().top
				: 0;
		const drift =
			row.getBoundingClientRect().top - viewportTop - Number(pending.offsetFromViewport || 0);
		if (Math.abs(drift) > 0.5) {
			box.scrollTop += drift;
		}
		pending.lastAppliedTotalSize = virtualized && totalSize ? totalSize : Number(box.scrollHeight) || totalSize;
		return true;
	}

	const nextSize = virtualized && totalSize ? totalSize : Number(box.scrollHeight) || totalSize;
	const prevSize = Number(
		pending.lastAppliedTotalSize ?? pending.previousTotalSize ?? pending.previousHeight ?? 0,
	);
	const delta = nextSize - prevSize;
	if (delta) box.scrollTop += delta;
	pending.lastAppliedTotalSize = nextSize;
	return true;
}

export function buildChatViewerImages(messages = [], registered = {}) {
	const items = [];
	const seen = new Set();
	for (const message of messages) {
		const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
		for (const attachment of attachments) {
			const type = String(attachment?.type || '').toLowerCase();
			if (type !== 'image' && type !== 'sticker') continue;
			const id = String(attachment?.id || '');
			if (!id || seen.has(id)) continue;
			seen.add(id);
			const registeredItem = registered[id] || registered[attachment.id] || null;
			const preview =
				(isInlineImageDataUrl(attachment?.previewDataUrl) && attachment.previewDataUrl) ||
				(isInlineImageDataUrl(registeredItem?.previewUrl) && registeredItem.previewUrl) ||
				mediaPreviewFromRaw(message?.raw) ||
				null;
			const fullUrl = registeredItem?.url || localMediaFileUrl(attachment) || null;
			const dims = mediaDimensionsForAttachment(attachment, message?.raw);
			items.push({
				id,
				fileName: attachment?.fileName || registeredItem?.fileName || '',
				url: fullUrl,
				previewUrl: preview,
				width: Number(dims?.width) || 0,
				height: Number(dims?.height) || 0,
			});
		}
	}
	return items;
}

export function viewerNeighborIds(images = [], activeId, radius = 2) {
	const index = images.findIndex(image => String(image?.id) === String(activeId));
	if (index < 0) return [];
	const ids = [];
	const span = Math.max(0, Number(radius) || 0);
	for (let i = index - span; i <= index + span; i += 1) {
		const id = images[i]?.id;
		if (id) ids.push(String(id));
	}
	return ids;
}

export function viewerThumbSrc(image, blobUrls = {}) {
	if (!image) return null;
	if (isInlineImageDataUrl(image.previewUrl)) return image.previewUrl;
	if (blobUrls[image.id]) return blobUrls[image.id];
	if (isInlineImageDataUrl(image.url)) return image.url;
	return null;
}

export function viewerFullSrc(image, blobUrls = {}, brokenUrls = {}) {
	if (!image) return null;
	const id = String(image.id || '');
	if (blobUrls[id] && !brokenUrls[blobUrls[id]]) return blobUrls[id];
	if (image.url && !brokenUrls[image.url] && isLocalMediaUrl(image.url)) return image.url;
	if (isInlineImageDataUrl(image.previewUrl)) return image.previewUrl;
	return null;
}

