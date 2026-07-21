export function mergeMessages(current = [], incoming = []) {
	const map = new Map();
	for (const item of [...current, ...incoming]) {
		map.set(item.providerMessageId || item.id, item);
	}
	return [...map.values()].sort(
		(a, b) =>
			new Date(a.providerTimestamp || a.created_at) -
			new Date(b.providerTimestamp || b.created_at),
	);
}

export function conversationTitle(conversation) {
	const raw =
		conversation?.group?.subject ||
		conversation?.contact?.name ||
		conversation?.contact?.phoneNumber ||
		conversation?.providerChatId ||
		'';
	return String(raw)
		.replace(/@(c\.us|s\.whatsapp\.net|g\.us|lid)$/i, '')
		.trim() || 'Chat';
}

export function normalizeWhatsAppIdentity(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/@(c\.us|s\.whatsapp\.net|g\.us|lid)$/i, '');
}

export function updateConversationPreview(conversations = [], payload = {}) {
	const conversationId = payload?.conversationId;
	const preview = payload?.preview;
	if (!conversationId || !preview) return conversations;
	const hasRenderablePreview = isRenderableWhatsAppMessage(preview);

	let changed = false;
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

	return changed ? next : conversations;
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
	return language === 'ar' ? `${year} س` : `${year}y`;
}

export function messageTextPresentation(text) {
	const value = String(text || '');
	const hasArabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(value);
	const hasLatin = /[A-Za-z]/.test(value);
	const arabicStyle = {
		fontFamily:
			'var(--font-arabic), "Tajawal", "Noto Sans Arabic", Tahoma, Arial, sans-serif',
		fontWeight: 500,
		fontFeatureSettings: '"kern" 1, "liga" 1',
		lineHeight: 1.85,
	};
	if (hasArabic && hasLatin) {
		return {
			dir: 'auto',
			lang: 'ar',
			style: { ...arabicStyle, textAlign: 'start' },
		};
	}
	if (hasArabic) {
		return {
			dir: 'rtl',
			lang: 'ar',
			style: { ...arabicStyle, textAlign: 'right' },
		};
	}
	return {
		dir: 'ltr',
		lang: 'en',
		style: { textAlign: 'left' },
	};
}

export function parseWhatsAppBold(text) {
	const value = String(text || '');
	const parts = [];
	const pattern = /\*\*(?=\S)([\s\S]*?\S)\*\*/g;
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

const MESSAGE_URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[),.!?;:\]}]+$/;

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
				href: linkText.startsWith('www.') ? `https://${linkText}` : linkText,
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
