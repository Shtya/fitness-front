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
				optimistic: Boolean(item.optimistic) && !item.providerMessageId,
				attachments: item.attachments?.length ? item.attachments : existing.attachments,
				reactions: item.reactions?.length ? item.reactions : existing.reactions,
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
export function messageDeliveryState(message) {
	if (!message) return 'hidden';
	if (message.showReadReceipt === false) return 'hidden';
	if (message.optimistic || message.status === 'pending') return 'pending';
	if (message.status === 'failed') return 'failed';
	if (['read', 'played'].includes(message.status)) return 'read';
	if (message.status === 'delivered') return 'delivered';
	return 'sent';
}

export function conversationTitle(conversation) {
	const chatId = String(conversation?.providerChatId || '');
	const phone = String(conversation?.contact?.phoneNumber || '').trim();
	const contactName = String(conversation?.contact?.name || '').trim();
	const groupSubject = String(conversation?.group?.subject || '').trim();
	const lidUser = chatId.includes('@') ? chatId.split('@')[0] : '';
	const nameLooksLikeId =
		!contactName ||
		contactName === phone ||
		(lidUser && contactName === lidUser) ||
		/^\d{8,20}$/.test(contactName);
	const raw =
		groupSubject ||
		(!nameLooksLikeId ? contactName : '') ||
		phone ||
		contactName ||
		chatId ||
		'';
	return String(raw)
		.replace(/@(c\.us|s\.whatsapp\.net|g\.us|lid|hosted\.lid)$/i, '')
		.trim() || 'Chat';
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
			payload.unreadCount == null
				? conversation.unreadCount
				: Math.max(0, Number(payload.unreadCount) || 0);

		changed = true;
		if (isLatest && hasRenderablePreview) reorder = true;
		return {
			...conversation,
			unreadCount,
			...(isLatest && hasRenderablePreview
				? {
						lastMessageAt: nextTimestamp || conversation.lastMessageAt,
						lastMessage: {
							...conversation.lastMessage,
							...preview,
							providerTimestamp:
								nextTimestamp || conversation.lastMessage?.providerTimestamp,
						},
					}
				: {}),
		};
	});

	if (!changed) return conversations;
	return reorder ? sortConversationsByActivity(next) : next;
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
	const hasArabic = ARABIC_SCRIPT_RE.test(value);
	ARABIC_SCRIPT_RE.lastIndex = 0;
	const hasLatin = LATIN_SCRIPT_RE.test(value);
	LATIN_SCRIPT_RE.lastIndex = 0;
	const mostlyArabic = isMostlyArabicText(value);
	const arabicStyle = {
		fontFamily:
			'var(--font-arabic), "Tajawal", "Cairo", "Noto Sans Arabic", Tahoma, Arial, sans-serif',
		fontWeight: 500,
		fontFeatureSettings: '"kern" 1, "liga" 1',
		lineHeight: 1.85,
		direction: 'rtl',
		unicodeBidi: 'plaintext',
		textAlign: 'start',
	};
	if (mostlyArabic || (hasArabic && !hasLatin)) {
		return {
			dir: 'rtl',
			lang: 'ar',
			isArabic: true,
			className: 'wa-message-text--ar',
			style: arabicStyle,
		};
	}
	if (hasArabic && hasLatin) {
		return {
			dir: 'auto',
			lang: 'ar',
			isArabic: true,
			className: 'wa-message-text--ar',
			style: {
				...arabicStyle,
				direction: 'auto',
			},
		};
	}
	return {
		dir: 'ltr',
		lang: 'en',
		isArabic: false,
		className: 'wa-message-text--en',
		style: {
			direction: 'ltr',
			textAlign: 'start',
			unicodeBidi: 'plaintext',
		},
	};
}

export function parseWhatsAppBold(text) {
	const value = String(text || '');
	const parts = [];
	// WhatsApp uses *bold*; also accept **bold**
	const pattern = /\*{1,2}(?=\S)([\s\S]*?\S)\*{1,2}/g;
	let cursor = 0;
	let match;

	while ((match = pattern.exec(value)) !== null) {
		if (match.index > cursor) {
			parts.push({ text: value.slice(cursor, match.index), bold: false });
		}
		parts.push({ text: match[1], bold: true });
		cursor = match.index + match[0].length;
	}
	if (cursor < value.length) {
		parts.push({ text: value.slice(cursor), bold: false });
	}
	return parts.length ? parts : [{ text: value, bold: false }];
}

const MESSAGE_URL_PATTERN =
	/(?:https?:\/\/|www\.)[^\s<>"']+|(?:(?:m\.|www\.)?(?:facebook|instagram|youtube|tiktok|twitter|x)\.com|fb\.watch|youtu\.be)\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[),.!?;:\]}]+$/;

export function normalizeHttpUrl(value) {
	const trimmed = String(value || '').trim();
	if (!trimmed) return '';
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	if (trimmed.startsWith('//')) return `https:${trimmed}`;
	return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function messageTextSegments(text) {
	const value = String(text || '');
	const segments = [];
	let cursor = 0;
	let match;
	MESSAGE_URL_PATTERN.lastIndex = 0;

	while ((match = MESSAGE_URL_PATTERN.exec(value)) !== null) {
		if (match.index > cursor) {
			segments.push({ type: 'text', text: value.slice(cursor, match.index) });
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
		if (trailing) segments.push({ type: 'text', text: trailing });
		cursor = match.index + raw.length;
	}
	if (cursor < value.length) {
		segments.push({ type: 'text', text: value.slice(cursor) });
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
]);

export function isRenderableWhatsAppMessage(message) {
	if (!message) return false;
	if (String(message.text || '').trim()) return true;
	if (
		Array.isArray(message.attachments) &&
		message.attachments.some(attachment => attachment?.id || attachment?.url)
	) {
		return true;
	}
	return DISPLAYABLE_MEDIA_TYPES.has(String(message.type || '').toLowerCase());
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
	return imageOnly ? images : [];
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
			rows.push({ kind: 'message', key: message.id, message });
		}
	}
	return rows;
}
