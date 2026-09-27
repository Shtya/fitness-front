import {
	conversationAvatarUrl,
	conversationTitle,
	conversationUnreadCount,
	sortConversationsByActivity,
} from '../whatsapp-utils';

/**
 * WhatsApp UI font (as reported on device): Helvetica Neue LT.
 * Local files optional under /fake-chat/fonts/ — see ensureIosWaFonts().
 *
 * Arabic must resolve to the same self-hosted file in the live preview and in the PNG:
 * system fallbacks (e.g. Windows mapping "Helvetica" → Arial) are not applied inside
 * html-to-image's SVG, so any ambiguity makes the PNG wrap text differently.
 */
export const IOS_WA_FONT =
	'"FC Arabic", "Helvetica Neue LT", "HelveticaNeueLT", "Helvetica Neue LT Pro", "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

const ARABIC_FONT_CSS = `
@font-face {
  font-family: "FC Arabic";
  src: url("/fake-chat/fonts/NotoSansArabic-arabic.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: block;
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC;
}
`;

function ensureArabicFontFace() {
	document.getElementById('fc-ios-wa-fonts-ar')?.remove();
	if (document.getElementById('fc-ios-wa-fonts-arabic')) return;
	const style = document.createElement('style');
	style.id = 'fc-ios-wa-fonts-arabic';
	style.textContent = ARABIC_FONT_CSS;
	document.head.appendChild(style);
}

/** Inject Helvetica Neue LT (@font-face if files exist) + self-hosted Arabic once. */
let iosFontLinkInjected = false;
export function ensureIosWaFonts() {
	if (typeof document === 'undefined') return;
	ensureArabicFontFace();
	if (iosFontLinkInjected) return;
	iosFontLinkInjected = true;
	if (document.getElementById('fc-ios-wa-fonts')) return;

	const style = document.createElement('style');
	style.id = 'fc-ios-wa-fonts';
	style.textContent = `
@font-face {
  font-family: "Helvetica Neue LT";
  src:
    local("Helvetica Neue LT"),
    local("HelveticaNeueLT"),
    local("Helvetica Neue LT Pro"),
    local("HelveticaNeueLTPro-Roman"),
    url("/fake-chat/fonts/HelveticaNeueLT.woff2") format("woff2"),
    url("/fake-chat/fonts/HelveticaNeueLT.otf") format("opentype"),
    url("/fake-chat/fonts/HelveticaNeueLT.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Helvetica Neue LT";
  src:
    local("Helvetica Neue LT Medium"),
    local("HelveticaNeueLT-Md"),
    local("Helvetica Neue LT Pro Medium"),
    url("/fake-chat/fonts/HelveticaNeueLT-Medium.woff2") format("woff2"),
    url("/fake-chat/fonts/HelveticaNeueLT-Medium.otf") format("opentype"),
    url("/fake-chat/fonts/HelveticaNeueLT-Medium.ttf") format("truetype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Helvetica Neue LT";
  src:
    local("Helvetica Neue LT Bold"),
    local("HelveticaNeueLT-Bd"),
    local("Helvetica Neue LT Pro Bold"),
    url("/fake-chat/fonts/HelveticaNeueLT-Bold.woff2") format("woff2"),
    url("/fake-chat/fonts/HelveticaNeueLT-Bold.otf") format("opentype"),
    url("/fake-chat/fonts/HelveticaNeueLT-Bold.ttf") format("truetype");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Helvetica Neue LT";
  src:
    local("Helvetica Neue LT Bold"),
    local("HelveticaNeueLT-Bd"),
    url("/fake-chat/fonts/HelveticaNeueLT-Bold.woff2") format("woff2"),
    url("/fake-chat/fonts/HelveticaNeueLT-Bold.otf") format("opentype"),
    url("/fake-chat/fonts/HelveticaNeueLT-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
`;
	document.head.appendChild(style);
}

function normalizeName(value) {
	return String(value || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u064B-\u065F\u0670]/g, '')
		.replace(/[^\p{L}\p{N}+]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function digitsOnly(value) {
	return String(value || '').replace(/\D/g, '');
}

function phonesMatch(a, b) {
	if (!a || !b) return false;
	if (a === b) return true;
	if (a.length >= 8 && b.length >= 8 && (a.endsWith(b) || b.endsWith(a))) return true;
	return false;
}

/**
 * Score how well a live conversation matches a fake-list chat (name / phone).
 * ≥70 = accept.
 */
export function scoreConversationMatch(chat, conversation) {
	const chatName = normalizeName(chat?.name);
	const chatPhone = digitsOnly(chat?.phone || chat?.name);
	const title = normalizeName(conversationTitle(conversation));
	const phone = digitsOnly(
		conversation?.contact?.phoneNumber ||
			String(conversation?.providerChatId || '').replace(/@.*$/, ''),
	);

	if (chatPhone && phone && phonesMatch(chatPhone, phone)) return 100;
	if (chatName && title && chatName === title) return 95;
	if (chatName && title && chatName.length >= 4 && title.length >= 4) {
		if (chatName.includes(title) || title.includes(chatName)) return 80;
		const chatTokens = new Set(chatName.split(' ').filter(Boolean));
		const titleTokens = title.split(' ').filter(Boolean);
		const overlap = titleTokens.filter(t => chatTokens.has(t)).length;
		if (overlap >= 2) return 75;
		if (overlap === 1 && titleTokens.length === 1) return 72;
	}
	return 0;
}

export function matchConversationToChat(chat, conversations) {
	let best = null;
	let bestScore = 0;
	for (const conversation of conversations || []) {
		const score = scoreConversationMatch(chat, conversation);
		if (score > bestScore) {
			bestScore = score;
			best = conversation;
		}
	}
	return bestScore >= 70 ? best : null;
}

export async function urlToDataUrl(url) {
	const src = String(url || '').trim();
	if (!src) return '';
	if (src.startsWith('data:image')) return src;
	if (src.startsWith('data:')) return '';
	try {
		const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
		if (!response.ok) return '';
		const blob = await response.blob();
		if (!blob || !blob.type?.startsWith('image/')) return '';
		return await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = String(reader.result || '');
				resolve(result.startsWith('data:image') ? result : '');
			};
			reader.onerror = () => reject(new Error('read failed'));
			reader.readAsDataURL(blob);
		});
	} catch {
		return '';
	}
}

/**
 * Match fake-list chats to live WhatsApp inbox rows and return avatar patches.
 * Prefer short /uploads paths (persistable). Never wipe an existing /uploads avatar.
 * @param {{ force?: boolean }} [options] force=true overwrites local assets.
 */
export async function syncListAvatarsFromConversations(chats, conversations, options = {}) {
	const list = Array.isArray(chats) ? chats : [];
	const inbox = Array.isArray(conversations) ? conversations : [];
	const force = Boolean(options.force);
	const patches = [];
	let matched = 0;

	for (const chat of list) {
		const conversation = matchConversationToChat(chat, inbox);
		if (!conversation) continue;
		const raw = conversationAvatarUrl(conversation);
		if (!raw) continue;
		matched += 1;
		const current = String(chat.avatar || '').trim();
		if (
			!force &&
			(current.startsWith('/fake-chat/') ||
				current.startsWith('/uploads/') ||
				current.startsWith('data:image'))
		) {
			continue;
		}

		let avatar = '';
		try {
			const u = new URL(raw, typeof window !== 'undefined' ? window.location.href : 'http://local');
			if (u.pathname.startsWith('/uploads/')) avatar = u.pathname;
		} catch {
			/* ignore */
		}
		if (!avatar && String(raw).startsWith('/uploads/')) avatar = String(raw);
		if (!avatar) {
			const data = await urlToDataUrl(raw);
			if (data.startsWith('data:image')) avatar = data;
		}
		if (!avatar || avatar === chat.avatar) continue;
		patches.push({
			id: chat.id,
			avatar,
			metaAi: false,
			whatsapp: Boolean(chat.whatsapp),
		});
	}

	return { patches, matched, total: list.length };
}

function formatFakeBubbleTime(value) {
	const date = value ? new Date(value) : new Date();
	if (Number.isNaN(date.getTime())) return '';
	return date
		.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
		.toLowerCase();
}

/** Map live WhatsApp messages → Fake Chat bubble JSON (recent window). */
export function mapLiveMessagesToFake(items, { limit = 40 } = {}) {
	const list = Array.isArray(items) ? items : [];
	const slice = list.slice(-Math.max(1, limit));
	return slice
		.map(item => {
			const outbound = String(item?.direction || '').toLowerCase() === 'outbound';
			const typeRaw = String(item?.type || 'text').toLowerCase();
			const time = formatFakeBubbleTime(
				item?.providerTimestamp || item?.timestamp || item?.created_at || item?.createdAt,
			);
			const ticks = outbound
				? String(item?.status || '').toLowerCase() === 'read'
					? 'read'
					: String(item?.status || '').toLowerCase() === 'delivered'
						? 'delivered'
						: 'sent'
				: 'none';
			const mediaUrl =
				item?.attachments?.[0]?.previewDataUrl ||
				item?.attachments?.[0]?.url ||
				item?.mediaUrl ||
				'';

			if (typeRaw === 'audio' || typeRaw === 'ptt' || typeRaw === 'voice') {
				return {
					id: String(item?.id || item?.providerMessageId || `m-${Math.random().toString(36).slice(2, 8)}`),
					side: outbound ? 'out' : 'in',
					type: 'voice',
					duration: item?.voice?.durationLabel || item?.duration || '0:05',
					time,
					ticks,
				};
			}
			if (typeRaw === 'image' || typeRaw === 'sticker' || typeRaw === 'ticket') {
				return {
					id: String(item?.id || item?.providerMessageId || `m-${Math.random().toString(36).slice(2, 8)}`),
					side: outbound ? 'out' : 'in',
					type: typeRaw === 'ticket' ? 'ticket' : 'image',
					src: mediaUrl,
					caption: item?.text || item?.caption || '',
					time,
					ticks,
				};
			}
			const text = String(item?.text || item?.body || item?.caption || '').trim();
			if (!text && !mediaUrl) return null;
			return {
				id: String(item?.id || item?.providerMessageId || `m-${Math.random().toString(36).slice(2, 8)}`),
				side: outbound ? 'out' : 'in',
				type: 'text',
				text: text || '📎',
				time,
				ticks,
			};
		})
		.filter(Boolean);
}

/** WhatsApp list clock: time today, "Yesterday", weekday within a week, else dd/mm/yy. */
function formatListTime(value) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const now = new Date();
	if (date.toDateString() === now.toDateString()) return formatFakeBubbleTime(value);
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
	if (now.getTime() - date.getTime() < 7 * 86_400_000) {
		return date.toLocaleDateString('en-US', { weekday: 'long' });
	}
	return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function persistableAvatar(raw) {
	const src = String(raw || '').trim();
	if (!src) return '';
	try {
		const url = new URL(src, typeof window !== 'undefined' ? window.location.href : 'http://local');
		if (url.pathname.startsWith('/uploads/')) return url.pathname;
	} catch {
		/* fall through */
	}
	return /^https?:\/\//i.test(src) ? src : '';
}

function listPreviewFromLastMessage(conversation) {
	const last = conversation?.lastMessage || {};
	const type = String(last.type || 'text').toLowerCase();
	const text = String(last.text || last.caption || conversation?.lastMessagePreview || '').trim();
	if (type === 'audio' || type === 'ptt' || type === 'voice') {
		return { previewIcon: 'mic', preview: text || 'Voice message' };
	}
	if (type === 'image' || type === 'sticker') {
		return { previewIcon: 'camera', preview: text || (type === 'sticker' ? 'Sticker' : 'Photo') };
	}
	if (type === 'video') return { previewIcon: 'video', preview: text || 'Video' };
	if (type === 'document') return { previewIcon: '', preview: text || 'Document' };
	return { previewIcon: '', preview: text };
}

/** Snapshot of the live inbox as Fake Chat list rows (newest first, pinned on top). */
export function mapConversationsToFakeList(conversations, { limit = 15 } = {}) {
	const rows = sortConversationsByActivity(
		(Array.isArray(conversations) ? conversations : []).filter(item => !item?.isArchived),
	).slice(0, Math.max(1, limit));

	return rows.map(conversation => {
		const last = conversation?.lastMessage || {};
		const outbound = String(last.direction || '').toLowerCase() === 'outbound';
		const status = String(last.status || '').toLowerCase();
		const unread = conversationUnreadCount(conversation);
		const isGroup =
			conversation?.type === 'group' || String(conversation?.providerChatId || '').endsWith('@g.us');
		return {
			id: `live-${conversation.id}`,
			liveConversationId: String(conversation.id),
			name: conversationTitle(conversation),
			phone: String(conversation?.contact?.phoneNumber || '').trim(),
			avatar: persistableAvatar(conversationAvatarUrl(conversation)),
			avatarKind: isGroup ? 'group' : '',
			...listPreviewFromLastMessage(conversation),
			time: formatListTime(
				last.providerTimestamp || conversation?.lastMessageAt || conversation?.created_at,
			),
			ticks: outbound ? (status === 'read' ? 'read' : status === 'delivered' ? 'delivered' : 'sent') : '',
			unread,
			timeGreen: unread > 0,
			pinned: Boolean(conversation?.isPinned),
			muted: Boolean(conversation?.isMuted),
			metaAi: false,
			whatsapp: false,
		};
	});
}

/**
 * Refresh list rows from a live snapshot without losing crafted chats:
 * matched rows keep their id + messages; unmatched rows with messages stay at the end.
 */
export function mergeLiveListIntoFake(currentChats, liveRows) {
	const current = Array.isArray(currentChats) ? currentChats : [];
	const used = new Set();
	const findPrevious = row => {
		const byId = current.find(
			chat => !used.has(chat.id) && chat.liveConversationId && chat.liveConversationId === row.liveConversationId,
		);
		if (byId) return byId;
		const rowName = normalizeName(row.name);
		const rowPhone = digitsOnly(row.phone);
		return current.find(chat => {
			if (used.has(chat.id)) return false;
			if (rowPhone && phonesMatch(rowPhone, digitsOnly(chat.phone || chat.name))) return true;
			return Boolean(rowName) && normalizeName(chat.name) === rowName;
		});
	};

	const merged = (Array.isArray(liveRows) ? liveRows : []).map(row => {
		const previous = findPrevious(row);
		if (!previous) return row;
		used.add(previous.id);
		return {
			...previous,
			...row,
			id: previous.id,
			avatar: row.avatar || previous.avatar || '',
			messages: previous.messages,
		};
	});

	const crafted = current.filter(
		chat => !used.has(chat.id) && Array.isArray(chat.messages) && chat.messages.length > 0,
	);
	return [...merged, ...crafted];
}

/** Prefer ~username / about when hiding phone numbers in the list & chat header. */
export function chatDisplayName(chat, hidePhoneNumbers = false) {
	const name = String(chat?.name || '').trim();
	if (!hidePhoneNumbers) return name;
	const about = String(chat?.about || chat?.displayName || '').trim();
	const phone = String(chat?.phone || '').trim();
	const looksPhone =
		/^\+?\d[\d\s-]{6,}$/.test(name) ||
		(phone && (name === phone || name.includes(phone.replace(/\s/g, ''))));
	if (looksPhone && about) return about.replace(/^~\s*/, '') || name;
	return name;
}

/** Restore extract avatars if a prior sync left broken stubs — never wipe /uploads. */
export function repairListAvatarPaths(chats, defaultsById = {}) {
	return (Array.isArray(chats) ? chats : []).map(chat => {
		const av = String(chat?.avatar || '').trim();
		const isStub =
			!av ||
			av.includes('avatar-user.png') ||
			av.includes('avatar-group.png') ||
			av.includes('unknown-number.png') ||
			av.includes('number-072.png') ||
			av.includes('number-155.png') ||
			av.includes('number-643.png') ||
			av.includes('hellocreator.png') ||
			av.includes('/offers.png') ||
			av.endsWith('/image.png');
		const ok =
			!isStub &&
			(av.startsWith('/fake-chat/') ||
				av.startsWith('/uploads/') ||
				av.startsWith('data:image') ||
				av.startsWith('blob:') ||
				/^https?:\/\//i.test(av));
		if (ok) return chat;
		const fallback = defaultsById[chat.id];
		if (fallback !== undefined) return { ...chat, avatar: fallback || '' };
		return { ...chat, avatar: '' };
	});
}
