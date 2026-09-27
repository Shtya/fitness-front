import { formatChatBubbleTime, formatIosStatusTime, nextId } from './capture';
import { FC_ASSETS, LIST_AVATARS, resolveChatAvatarSrc } from './assets';
import { chatDisplayName } from './ios-font-and-match';
import { shortMediaPath } from './media-url';

/** Shared Contact Info defaults (once on the chat → list + thread + info). */
export const DEFAULT_CHAT_INFO = {
	mediaCount: '1',
	storage: '191 KB',
	keptMessages: 'None',
	saveToPhotos: 'Off',
	disappearing: '24 hours',
	transcriptLanguage: 'Arabic (Saudi Arabia)',
	advancedPrivacy: 'Off',
	lockChat: false,
	groupsLabel: 'No groups in common',
};

export function getActiveChat(state) {
	const chats = state?.list?.chats || [];
	if (!chats.length) return null;
	const id = state?.activeChatId;
	return chats.find(chat => chat.id === id) || chats[0];
}

/** List-row preview / time / icon from the latest bubble (WhatsApp-style). */
export function listFieldsFromMessages(messages, now = new Date()) {
	const list = Array.isArray(messages) ? messages : [];
	const last = list[list.length - 1];
	if (!last) {
		return {
			preview: '',
			time: formatChatBubbleTime(now),
			ticks: '',
			previewIcon: '',
		};
	}
	const preview =
		last.type === 'voice'
			? `Voice message (${last.duration || '0:03'})`
			: last.type === 'image' || last.type === 'ticket'
				? last.caption || 'Photo'
				: String(last.text || '').trim() || '';
	return {
		preview,
		time: resolveBubbleTime(last) || formatChatBubbleTime(now),
		ticks: last.side === 'out' ? last.ticks || 'read' : '',
		previewIcon:
			last.type === 'voice' ? 'mic' : last.type === 'image' || last.type === 'ticket' ? 'camera' : '',
	};
}

/**
 * Merge patch into chat and move it to the top of its section:
 * pinned stay among pins; otherwise right under the last pinned row.
 */
export function bumpChatToTop(chats, chatId, patch = {}) {
	const list = Array.isArray(chats) ? [...chats] : [];
	const idx = list.findIndex(c => c.id === chatId);
	const updated =
		idx >= 0 ? { ...list[idx], ...patch, id: chatId } : { id: chatId, ...patch };
	if (idx >= 0) list.splice(idx, 1);

	if (updated.pinned) {
		list.unshift(updated);
		return list;
	}
	let insertAt = 0;
	while (insertAt < list.length && list[insertAt]?.pinned) insertAt += 1;
	list.splice(insertAt, 0, updated);
	return list;
}

function seedMessagesForChat(chat) {
	if (Array.isArray(chat?.messages) && chat.messages.length) return chat.messages;
	const preview = String(chat?.preview || '').trim();
	const time = chat?.time || formatChatBubbleTime();
	const you = /^you\s*:/i.test(preview);
	const text = preview.replace(/^you\s*:\s*/i, '');
	if (chat?.previewIcon === 'mic') {
		return [
			{
				id: nextId('m'),
				side: 'in',
				type: 'voice',
				duration: '0:09',
				time,
				ticks: 'none',
			},
		];
	}
	if (chat?.previewIcon === 'camera') {
		return [
			{
				id: nextId('m'),
				side: you ? 'out' : 'in',
				type: 'image',
				src: '',
				caption: text || '2 photos',
				time,
				ticks: you ? chat.ticks || 'read' : 'none',
			},
		];
	}
	if (!text) return [];
	return [
		{
			id: nextId('m'),
			side: you ? 'out' : 'in',
			type: 'text',
			text,
			time,
			ticks: you ? chat.ticks || 'read' : 'none',
		},
	];
}

/** Profile on list.chats[]; each chat owns its recent messages. */
export function resolveThreadView(state) {
	const chat = getActiveChat(state);
	const thread = state?.thread || {};
	const list = state?.list || {};
	const info = { ...DEFAULT_CHAT_INFO, ...(chat?.info || {}) };
	const name = chatDisplayName(chat, list.hidePhoneNumbers);
	const phone = chat?.phone || '';
	const rawAbout = String(chat?.about || '').trim();
	const nameIsPhoneLike =
		/^\+?\d[\d\s-]{6,}/.test(String(chat?.name || '')) || /\(You\)/i.test(String(chat?.name || ''));
	let about = '';
	if (rawAbout && !/^~\s*\+?\d/.test(rawAbout)) {
		about = rawAbout;
	} else if (!rawAbout && chat?.name && !nameIsPhoneLike) {
		about = `~${chat.name}`;
	}
	const firstContact = Boolean(chat?.firstContact);
	const messages =
		Array.isArray(chat?.messages) && chat.messages.length
			? chat.messages
			: Array.isArray(thread.messages)
				? thread.messages
				: [];
	const displayPhone =
		phone ||
		(nameIsPhoneLike ? String(chat?.name || '').trim() : '') ||
		name;
	const displayAbout = about
		? about.startsWith('~')
			? about
			: `~${about.replace(/^~\s*/, '')}`
		: '';
	return {
		...thread,
		messages,
		/** Dynamic from list tab unread (sidebar) — not a hardcoded back badge. */
		backBadge: Number(list.unreadBadge) > 0 ? String(list.unreadBadge) : '',
		contactName: name,
		contactAvatar: resolveChatAvatarSrc(chat),
		contactAvatarKind: chat?.avatarKind === 'group' ? 'group' : 'user',
		contactSubtitle: firstContact
			? 'tap to add to contacts'
			: chat?.online || String(chat?.subtitle || '').toLowerCase() === 'online'
				? chat?.subtitle || 'online'
				: chat?.subtitle || 'tap for contact info',
		selfAvatar: list.selfAvatar || '',
		hidePhoneNumbers: Boolean(list.hidePhoneNumbers),
		firstContact,
		firstContactCountry: chat?.country || guessCountryFromPhone(displayPhone),
		firstContactPhone: displayPhone,
		firstContactAbout: displayAbout,
		dateLabel: chat?.dateLabel || thread.dateLabel || '',
		showEncryptionNotice:
			firstContact || Boolean(chat?.showEncryptionNotice ?? thread.showEncryptionNotice),
		contactInfo: {
			...info,
			phone: list.hidePhoneNumbers ? name || about : phone || chat?.name || name,
			about,
			disappearing: chat?.disappearing
				? info.disappearing || '24 hours'
				: info.disappearing || 'Off',
		},
	};
}

/** Guess country label from E.164-ish phone for the unknown-contact card. */
export function guessCountryFromPhone(phone) {
	const d = String(phone || '').replace(/\D/g, '');
	if (d.startsWith('20')) return 'Egypt';
	if (d.startsWith('966')) return 'Saudi Arabia';
	if (d.startsWith('971')) return 'United Arab Emirates';
	if (d.startsWith('974')) return 'Qatar';
	if (d.startsWith('965')) return 'Kuwait';
	if (d.startsWith('973')) return 'Bahrain';
	if (d.startsWith('968')) return 'Oman';
	if (d.startsWith('962')) return 'Jordan';
	if (d.startsWith('1')) return 'United States';
	return 'Egypt';
}

/** Seed conversation matching the user's iPhone XR WhatsApp screenshot. */
export function createDefaultStudioState(now = new Date()) {
	const statusTime = formatIosStatusTime(now);
	const state = {
		screen: 'thread',
		activeChatId: 'c9',
		status: {
			time: statusTime,
			signal: 4,
			wifi: true,
			battery: 55,
			lowPower: false,
			charging: true,
		},
		list: {
			title: 'Chats',
			searchPlaceholder: 'Ask Meta AI or Search',
			unreadBadge: 8,
			callsBadge: 26,
			filter: 'all',
			showSearch: false,
			showSuggestions: false,
			hidePhoneNumbers: false,
			selfAvatar: LIST_AVATARS.youTab,
			chats: [
				{
					id: 'c1',
					name: 'M5zoon company',
					preview: 'Ahmed: انا جربتها بس هرفع دي واجربهم مع بعض تاني اقصد يعني',
					time: '6:01 pm',
					ticks: '',
					avatar: '',
					avatarKind: 'group',
					pinned: true,
					unread: 0,
				},
				{
					id: 'c2',
					name: '+201551495772 (You)',
					preview: '2 photos',
					time: '5:57 pm',
					ticks: 'read',
					previewIcon: 'camera',
					avatar: LIST_AVATARS.youNote,
					pinned: true,
					unread: 0,
				},
				{
					id: 'c3',
					name: 'Attendance Alex Branch',
					preview: '~ Abdullah Alrouby: Check out',
					time: '6:03 pm',
					ticks: '',
					avatar: LIST_AVATARS.attendance,
					timeGreen: true,
					muted: true,
					unread: 1,
				},
				{
					id: 'c4',
					name: 'Mohamed Abdelghany',
					preview: 'Voice message (0:09)',
					time: '6:03 pm',
					ticks: '',
					previewIcon: 'mic',
					avatar: LIST_AVATARS.mohamed,
					timeGreen: true,
					unread: 1,
				},
				{
					id: 'c5',
					name: 'Noor Saleh',
					preview: 'تمام',
					time: '6:02 pm',
					ticks: '',
					avatar: LIST_AVATARS.noor,
					timeGreen: true,
					unread: 1,
				},
				{
					id: 'c6',
					name: '+20 128 004 7376',
					preview: 'تمام',
					time: '5:07 pm',
					ticks: 'read',
					avatar: LIST_AVATARS.nurseconnect,
					phone: '+20 128 004 7376',
					about: '~Micho',
					subtitle: 'tap for contact info',
					disappearing: true,
					unread: 0,
					info: {
						...DEFAULT_CHAT_INFO,
						mediaCount: '1',
						storage: '191 KB',
						keptMessages: 'None',
						saveToPhotos: 'Off',
						disappearing: '24 hours',
						transcriptLanguage: 'Arabic (Saudi Arabia)',
						advancedPrivacy: 'Off',
						lockChat: false,
						groupsLabel: 'No groups in common',
					},
				},
				{
					id: 'c7',
					name: '+20 104 142 2849',
					preview: '..',
					time: '4:40 pm',
					ticks: '',
					avatar: '',
					avatarKind: 'person',
					unread: 0,
				},
				{
					id: 'c8',
					name: 'Qatar Securities <> Cloudilic',
					preview: 'You: السلام عليكم استاذ سيد اخبارك حضرتك ايه يارب تكون بخير',
					time: '4:38 pm',
					ticks: 'delivered',
					avatar: LIST_AVATARS.qatar,
					muted: true,
					unread: 0,
				},
				{
					id: 'c9',
					name: 'Nour Eldien',
					preview: 'فل الفل',
					time: '3:12 pm',
					ticks: '',
					avatar: LIST_AVATARS.nour,
					about: '~Nour Eldien',
					subtitle: 'tap for contact info',
					unread: 0,
					info: { ...DEFAULT_CHAT_INFO },
				},
				{
					id: 'c10',
					name: 'Cloudilic Engineering',
					preview: 'Yousef Cloudilic: https://meet.google.com/psc-bmhy-ett?ij...',
					time: '2:27 pm',
					ticks: '',
					avatar: LIST_AVATARS.cloudilic,
					timeGreen: true,
					unread: 6,
				},
				{
					id: 'c11',
					name: 'Zoozo ❤️',
					preview: 'You reacted ❤️ to "حبيبي تسلم كتر خيرك"',
					time: '2:05 pm',
					ticks: '',
					avatar: LIST_AVATARS.zoozo,
					unread: 0,
				},
				{
					id: 'c12',
					name: 'عبدو جميل',
					preview: 'You reacted ❤️ to "تمام ماشي انا فاضي"',
					time: '2:03 pm',
					ticks: '',
					avatar: LIST_AVATARS.abdou,
					disappearing: true,
					unread: 0,
				},
				{
					id: 'c13',
					name: 'Adam',
					preview: 'Voice message (0:03)',
					time: '1:56 pm',
					ticks: 'delivered',
					previewIcon: 'mic',
					avatar: LIST_AVATARS.adam,
					unread: 0,
				},
				{
					id: 'c14',
					name: 'My Bro',
					preview: 'طمني عليك',
					time: '1:04 pm',
					ticks: 'delivered',
					avatar: LIST_AVATARS.mybro,
					unread: 0,
				},
				{
					id: 'c15',
					name: 'Offers',
					preview: 'Applus: 📷 تعرف ان كل دول 👋👋 متاحين بشكل Unlimited في اشتراك...',
					time: '12:13 pm',
					ticks: '',
					avatar: '',
					avatarKind: 'group',
					timeGreen: true,
					muted: true,
					unread: 1,
				},
				{
					id: 'c16',
					name: 'Hazem Mohamed',
					preview: 'Voice message (0:06)',
					time: '8:45 am',
					ticks: 'delivered',
					previewIcon: 'mic',
					avatar: LIST_AVATARS.hazem,
					storyRing: true,
					disappearing: true,
					unread: 0,
				},
				{
					id: 'c17',
					name: 'WhatsApp',
					preview: 'New: Add a password for stronger account protection 🔐 Y...',
					time: '8:32 am',
					ticks: '',
					previewIcon: 'video',
					avatar: LIST_AVATARS.whatsapp,
					whatsapp: true,
					timeGreen: true,
					unread: 1,
				},
				{
					id: 'c18',
					name: 'Marrmora ❤️ 🧸',
					preview: 'You reacted ❤️ to "👤 Sticker"',
					time: 'Yesterday',
					ticks: '',
					avatar: LIST_AVATARS.marrmora,
					unread: 0,
				},
				{
					id: 'c19',
					name: '+20 104 072 1528',
					preview:
						'ببعت لحضرتك رقم سيستم بتحول عليه المبلغ بعد ما حضرتك تبعت البيانات علي...',
					time: 'Yesterday',
					ticks: '',
					avatar: '',
					avatarKind: 'person',
					unread: 0,
				},
				{
					id: 'c20',
					name: 'HelloCreator',
					preview:
						'عزيزي، دعني أعرفك على Wprbdau :~ وظيفتنا أولاً، ثم يمكنك أن تقرر ما إذا كان...',
					time: 'Yesterday',
					ticks: '',
					avatar: '',
					avatarKind: 'group',
					unread: 0,
				},
				{
					id: 'c21',
					name: 'MY FAMILY',
					preview: 'My Heart ❤️❤️❤️: https://www.facebook.com/share/v/18Uu...',
					time: 'Yesterday',
					ticks: '',
					avatar: LIST_AVATARS.family,
					timeGreen: true,
					unread: 1,
				},
				{
					id: 'c22',
					name: '+20 100 643 9739',
					preview: 'Voice call',
					time: 'Yesterday',
					ticks: '',
					previewIcon: 'phone',
					avatar: '',
					avatarKind: 'person',
					unread: 0,
				},
				{
					id: 'c23',
					name: '+20 155 477 6577',
					preview: 'ان شاء الله',
					time: 'Yesterday',
					ticks: 'delivered',
					avatar: '',
					avatarKind: 'person',
					unread: 0,
				},
				{
					id: 'c24',
					name: 'Yousef Cloudilic',
					preview: 'Reacted ❤️ to "🎙️ Voice message (0:10)"',
					time: 'Yesterday',
					ticks: '',
					avatar: LIST_AVATARS.yousef,
					unread: 0,
				},
			],
			suggestions: [],
		},
		thread: {
			backBadge: '7',
			wallpaper: '/fake-chat/Wallpaper.png',
			messages: [],
		},
	};

	// Attach per-chat recent seeds; active chat gets the Nour Eldien sample thread.
	const nourMessages = [
		{
			id: nextId('m'),
			side: 'in',
			type: 'text',
			text: 'التكلفه بسيطه',
			time: '2:02 pm',
			ticks: 'read',
		},
		{
			id: nextId('m'),
			side: 'in',
			type: 'text',
			text: 'هو اخره 10 الاف',
			time: '2:03 pm',
			ticks: 'read',
		},
		{
			id: nextId('m'),
			side: 'in',
			type: 'text',
			text: 'و اسبوع ري ديزين',
			time: '2:04 pm',
			ticks: 'read',
		},
		{
			id: nextId('m'),
			side: 'out',
			type: 'voice',
			duration: '0:03',
			time: '2:23 pm',
			ticks: 'read',
		},
		{
			id: nextId('m'),
			side: 'in',
			type: 'text',
			text: 'مش عايزين نبئا زانقين نفسنا بس',
			time: '2:25 pm',
			ticks: 'read',
		},
		{
			id: nextId('m'),
			side: 'in',
			type: 'text',
			text: 'اعمل للحج هثم دول بثا',
			time: '2:54 pm',
			ticks: 'read',
			reply: {
				author: 'Nour Eldien',
				text: 'و بقولك rpg خلي في امكانيه تعديل الـfeedback من الداشبورد و في الشيت اللي كانو بيرفعوه في عامود اسمه كومينت في الاخر بيكتبوا فيه ...Dzer',
			},
		},
		{
			id: nextId('m'),
			side: 'out',
			type: 'voice',
			duration: '0:01',
			time: '3:08 pm',
			ticks: 'read',
		},
		{
			id: nextId('m'),
			side: 'in',
			type: 'text',
			text: 'فل الفل',
			time: '3:12 pm',
			ticks: 'read',
		},
	];

	state.list.chats = state.list.chats.map(chat => {
		if (chat.id === 'c9') return { ...chat, messages: nourMessages };
		return { ...chat, messages: seedMessagesForChat(chat) };
	});
	state.thread.messages = nourMessages;
	return state;
}

export const INFO_JSON_HELP = `{
  "screen": "thread | list | contact",
  "activeChatId": "c9",
  "status": { "time": "5:36", "wifi": true, "battery": 55, "charging": true },
  "thread": {
    "backBadge": "7",
    "wallpaper": "/fake-chat/Wallpaper.png"
  },
  "list": {
    "title": "Chats",
    "unreadBadge": 8,
    "callsBadge": 26,
    "selfAvatar": "/fake-chat/list-avatars/you-tab.png",
    "showSearch": false,
    "showSuggestions": false
  }
}
// Profile (name/avatar/phone/about/info) lives on list.chats[] — one source for list + chat + contact info.`;

export const MESSAGES_JSON_HELP = `[
  {
    "side": "in | out",
    "type": "text | voice | image | ticket",
    "text": "message text",
    "time": "2:02 pm",
    "ticks": "none | sent | delivered | read",
    "duration": "0:03",
    "src": "",
    "caption": "",
    "reply": { "author": "Name", "text": "quoted" }
  }
]`;

export const LIST_JSON_HELP = `{
  "title": "Chats",
  "unreadBadge": 8,
  "callsBadge": 26,
  "selfAvatar": "/fake-chat/list-avatars/you-tab.png",
  "chats": [
    {
      "id": "c9",
      "name": "Nour Eldien",
      "avatar": "/fake-chat/list-avatars/nour.png",
      "phone": "",
      "about": "~Nour Eldien",
      "subtitle": "tap for contact info",
      "preview": "فل الفل",
      "time": "3:12 pm",
      "ticks": "",
      "unread": 0,
      "pinned": false,
      "muted": false,
      "disappearing": false,
      "info": {
        "mediaCount": "1",
        "storage": "191 KB",
        "keptMessages": "None",
        "saveToPhotos": "Off",
        "disappearing": "24 hours",
        "transcriptLanguage": "Arabic (Saudi Arabia)",
        "advancedPrivacy": "Off",
        "lockChat": false,
        "groupsLabel": "No groups in common"
      }
    }
  ]
}`;

export function studioInfoToJson(state) {
	const s = state || createDefaultStudioState();
	const chat = getActiveChat(s);
	return JSON.stringify(
		{
			screen: s.screen,
			activeChatId: s.activeChatId,
			status: s.status,
			thread: {
				backBadge: s.thread.backBadge,
				wallpaper: s.thread.wallpaper || '',
			},
			activeChat: chat
				? {
						id: chat.id,
						name: chat.name,
						avatar: chat.avatar || '',
						phone: chat.phone || '',
						about: chat.about || '',
						subtitle: chat.subtitle || '',
						info: chat.info || {},
					}
				: null,
			list: {
				title: s.list.title,
				searchPlaceholder: s.list.searchPlaceholder,
				unreadBadge: s.list.unreadBadge,
				callsBadge: s.list.callsBadge,
				showSuggestions: s.list.showSuggestions,
				showSearch: s.list.showSearch,
				selfAvatar: s.list.selfAvatar || '',
				filter: s.list.filter,
			},
		},
		null,
		2,
	);
}

export function studioMessagesToJson(state) {
	const chat = getActiveChat(state);
	const messages =
		(Array.isArray(chat?.messages) && chat.messages.length
			? chat.messages
			: state?.thread?.messages) || [];
	return JSON.stringify(messages, null, 2);
}

export function studioListToJson(state) {
	const list = state?.list || createDefaultStudioState().list;
	return JSON.stringify(list, null, 2);
}

/**
 * Parse "10s" | "1m" | "2m" | 10 | { value, unit } → milliseconds.
 * Default 60s when empty/invalid.
 */
export function parseIntervalMs(value, fallbackMs = 60_000) {
	if (value == null || value === '') return fallbackMs;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.max(0, value) * 1000;
	}
	if (typeof value === 'object') {
		const n = Math.max(0, Number(value.value) || 0);
		const unit = String(value.unit || 'seconds').toLowerCase();
		if (unit.startsWith('m')) return n * 60_000;
		return n * 1_000;
	}
	const raw = String(value).trim().toLowerCase();
	const m = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)?$/.exec(raw);
	if (!m) return fallbackMs;
	const n = Number(m[1]) || 0;
	const unit = m[2] || 's';
	if (unit.startsWith('m')) return n * 60_000;
	return n * 1_000;
}

function isAutoTime(value) {
	if (value == null || value === true) return true;
	if (typeof value === 'boolean') return true;
	const s = String(value).trim().toLowerCase();
	return !s || s === 'now' || s === 'auto' || s === 'true';
}

/** Non-empty clock string the author set on purpose (keep as-is on `time`). */
function hasExplicitTime(value) {
	return !isAutoTime(value);
}

/** Display clock: user `time` wins; system fill lives on `autoTime`. */
export function resolveBubbleTime(message) {
	const user = String(message?.time ?? '').trim();
	if (user && !isAutoTime(user)) return user;
	const auto = String(message?.autoTime ?? '').trim();
	if (auto) return auto;
	return '';
}

function normalizeTicks(value, side = 'out') {
	const raw = String(value ?? '')
		.trim()
		.toLowerCase();
	if (side !== 'out') return 'none';
	if (!raw || raw === 'none') return 'read';
	if (raw === 'sent' || raw === 'single' || raw === 'check') return 'sent';
	if (raw === 'deliver' || raw === 'delivered' || raw === 'double' || raw === 'grey') {
		return 'delivered';
	}
	if (raw === 'read' || raw === 'blue' || raw === 'seen') return 'read';
	return 'read';
}

/** Parse "9:55 pm" against a reference day → Date, or null. */
function parseBubbleTimeToDate(timeStr, refDate = new Date()) {
	const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(timeStr || '').trim());
	if (!m) return null;
	let hours = Number(m[1]);
	const minutes = Number(m[2]);
	const ap = m[3].toLowerCase();
	if (ap === 'pm' && hours < 12) hours += 12;
	if (ap === 'am' && hours === 12) hours = 0;
	const d = new Date(refDate);
	d.setHours(hours, minutes, 0, 0);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Fill gaps for messages that have no author `time`.
 *
 * - `time`      → yours. Never overwritten by the engine.
 * - `autoTime`  → written once by the studio when both `time` and `autoTime` are missing,
 *                 then never recalculated (so re-applying a pack keeps sent messages stable).
 * Display uses `time || autoTime`.
 */
export function applyMessageTiming(messages, timing = {}, now = new Date()) {
	const list = Array.isArray(messages) ? messages : [];
	if (!list.length) return [];

	const mode = String(timing?.mode || '').toLowerCase();
	const hasCustomAnchor = Boolean(timing?.startAt || timing?.anchor || mode === 'custom');

	const fallbackNow = now instanceof Date ? new Date(now) : new Date();
	let anchor = fallbackNow;
	if (hasCustomAnchor) {
		const raw = timing.startAt || timing.anchor || now;
		const parsed = raw instanceof Date ? new Date(raw) : new Date(raw);
		if (!Number.isNaN(parsed.getTime())) anchor = parsed;
	}

	const defaultGap = parseIntervalMs(timing?.interval ?? timing?.gap ?? '1m', 60_000);
	let cursor = anchor;
	const out = [];

	/**
	 * Bubble clocks are minute-precision ("h:mm pm"). Re-anchoring on them must not
	 * floor the cursor to :00, or every sub-minute gap collapses into a 1-minute step.
	 */
	const anchorOn = timeStr => {
		const parsed = parseBubbleTimeToDate(timeStr, cursor);
		if (!parsed) return;
		const sameMinute =
			parsed.getHours() === cursor.getHours() && parsed.getMinutes() === cursor.getMinutes();
		if (sameMinute) return;
		parsed.setSeconds(59, 0);
		cursor = parsed;
	};

	for (let i = list.length - 1; i >= 0; i -= 1) {
		const item = list[i] || {};
		const userTime = hasExplicitTime(item.time) ? String(item.time).trim() : '';

		let next = { ...item };
		if (userTime) {
			// Author clock is sacred — never write/replace `time`.
			next.time = userTime;
			if ('autoTime' in next) delete next.autoTime;
			anchorOn(userTime);
		} else if (hasExplicitTime(item.autoTime)) {
			next.autoTime = String(item.autoTime).trim();
			if (next.time != null && isAutoTime(next.time)) delete next.time;
			anchorOn(next.autoTime);
		} else {
			next.autoTime = formatChatBubbleTime(cursor);
			if (next.time != null && isAutoTime(next.time)) delete next.time;
		}

		out.unshift(next);
		const gap = parseIntervalMs(item.interval ?? item.gap ?? timing?.interval ?? '1m', defaultGap);
		cursor = new Date(cursor.getTime() - gap);
	}
	return out;
}

export const CHAT_PACK_HELP = `{
  "name": "Nour Eldien",
  "avatar": "/fake-chat/list-avatars/nour.png",
  "online": true,
  "firstContact": false,
  "country": "Egypt",
  "timing": {
    "fromNow": true,
    "interval": "5s",
    "mode": "now"
  },
  "messages": [
    { "side": "in", "text": "أول رسالة" },
    { "side": "out", "text": "ردّي", "time": "2:02 pm" },
    { "side": "in", "type": "voice", "duration": "0:03" }
  ]
}
// "time"     = أنت اللي كاتبه — النظام مش بيعدّل عليه أبداً.
// "autoTime" = النظام بيملاه مرة واحدة بس لما مفيش "time" ولا "autoTime" — وبعدها مش بيتغيّر.
// العرض = time || autoTime.`;

/** One-object dump of the active chat (profile + messages + timing defaults). */
export function studioChatPackToJson(state, timingOverride = null) {
	const chat = getActiveChat(state);
	const messages =
		(Array.isArray(chat?.messages) && chat.messages.length
			? chat.messages
			: state?.thread?.messages) || [];
	const timing = timingOverride && typeof timingOverride === 'object'
		? timingOverride
		: {
				fromNow: true,
				interval: '1m',
				mode: 'now',
			};
	return JSON.stringify(
		{
			id: chat?.id || '',
			name: chat?.name || '',
			avatar: chat?.avatar || '',
			phone: chat?.phone || '',
			about: chat?.about || '',
			online:
				String(chat?.subtitle || '')
					.toLowerCase()
					.includes('online') || Boolean(chat?.online),
			subtitle: chat?.subtitle || 'tap for contact info',
			unread: Number(chat?.unread) || 0,
			firstContact: Boolean(chat?.firstContact),
			country: chat?.country || '',
			dateLabel: chat?.dateLabel || '',
			showEncryptionNotice:
				chat?.showEncryptionNotice !== undefined
					? Boolean(chat.showEncryptionNotice)
					: Boolean(chat?.firstContact),
			timing,
			messages: messages.map(({ id: _id, _i, ...rest }) => rest),
		},
		null,
		2,
	);
}

/**
 * Apply a single-chat JSON pack onto studio state (creates chat if needed).
 * @returns {{ state: object, chatId: string }}
 */
export function applyChatPackToState(parsed, fallback = createDefaultStudioState(), now = new Date()) {
	const base = fallback || createDefaultStudioState();
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Chat pack must be an object { name, avatar, online, timing, messages }');
	}

	const timing =
		parsed.timing === true
			? { fromNow: true, ignoreTimes: false, interval: '1m', mode: 'now' }
			: parsed.timing && typeof parsed.timing === 'object'
				? parsed.timing
				: parsed.fromNow || parsed.useNow || parsed.ignoreTimes
					? {
							fromNow: true,
							ignoreTimes: Boolean(parsed.ignoreTimes),
							interval: parsed.interval || '1m',
							mode: parsed.mode || 'now',
							startAt: parsed.startAt,
						}
					: { fromNow: true, ignoreTimes: false, interval: parsed.interval || '1m', mode: 'now' };

	let anchor = now instanceof Date ? new Date(now) : new Date();
	if (timing.mode === 'custom' || timing.startAt || timing.anchor) {
		const raw = timing.startAt || timing.anchor || now;
		const parsedAnchor = raw instanceof Date ? new Date(raw) : new Date(raw);
		if (!Number.isNaN(parsedAnchor.getTime())) anchor = parsedAnchor;
	}

	const rawMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
	const timed = applyMessageTiming(rawMessages, timing, anchor);
	const messages = normalizeMessages(timed);

	const wantId = String(parsed.id || '').trim();
	const existing =
		(wantId && base.list.chats.find(c => c.id === wantId)) ||
		(parsed.name
			? base.list.chats.find(
					c => String(c.name || '').toLowerCase() === String(parsed.name).toLowerCase(),
				)
			: null);

	const online = Boolean(parsed.online);
	const firstContact = Boolean(
		parsed.firstContact ?? parsed.unknownContact ?? existing?.firstContact,
	);
	const country =
		parsed.country != null && String(parsed.country).trim()
			? String(parsed.country).trim()
			: existing?.country || '';
	const subtitle =
		parsed.subtitle != null && String(parsed.subtitle).trim()
			? String(parsed.subtitle).trim()
			: firstContact
				? 'tap to add to contacts'
				: online
					? 'online'
					: 'tap for contact info';

	const fromMsgs = listFieldsFromMessages(messages, now);
	const preview = parsed.preview || fromMsgs.preview;

	const chatId = existing?.id || wantId || nextId('c');
	const patch = normalizeListChat(
		{
			...(existing || {}),
			id: chatId,
			name: parsed.name ?? existing?.name ?? 'Chat',
			avatar: shortMediaPath(parsed.avatar ?? existing?.avatar ?? '') || parsed.avatar || existing?.avatar || '',
			avatarKind: parsed.avatarKind ?? existing?.avatarKind ?? '',
			phone: parsed.phone ?? existing?.phone ?? '',
			about: parsed.about ?? existing?.about ?? '',
			subtitle,
			online: firstContact ? false : online,
			firstContact,
			country,
			dateLabel: parsed.dateLabel ?? existing?.dateLabel ?? '',
			showEncryptionNotice:
				parsed.showEncryptionNotice !== undefined
					? Boolean(parsed.showEncryptionNotice)
					: firstContact,
			unread: parsed.unread != null ? Number(parsed.unread) || 0 : existing?.unread || 0,
			preview,
			time: fromMsgs.time,
			ticks: fromMsgs.ticks,
			previewIcon: fromMsgs.previewIcon,
			info: parsed.info || existing?.info || {},
			messages,
		},
		0,
	);

	const chats = bumpChatToTop(base.list.chats, chatId, { ...patch, messages });

	return {
		chatId,
		state: {
			...base,
			screen: 'thread',
			activeChatId: chatId,
			list: { ...base.list, chats },
			thread: {
				...base.thread,
				messages,
			},
		},
	};
}

export function normalizeMessages(parsed) {
	if (!Array.isArray(parsed)) throw new Error('Messages JSON must be an array');
	return parsed.map((item, index) => {
		const side = item?.side === 'out' ? 'out' : 'in';
		const userTime = hasExplicitTime(item?.time) ? String(item.time).trim() : '';
		const next = {
			id: item?.id || nextId('m'),
			side,
			type: ['text', 'voice', 'image', 'ticket'].includes(item?.type) ? item.type : 'text',
			text: item?.text || '',
			ticks: normalizeTicks(item?.ticks, side),
			duration: item?.duration || '0:03',
			src: item?.src || '',
			caption: item?.caption || '',
			reply: item?.reply || null,
			_i: index,
		};
		if (userTime) {
			next.time = userTime;
		} else if (hasExplicitTime(item?.autoTime)) {
			next.autoTime = String(item.autoTime).trim();
		}
		return next;
	});
}

export function normalizeListChat(item, index = 0) {
	const infoRaw = item?.info && typeof item.info === 'object' ? item.info : {};
	const messages = Array.isArray(item?.messages) ? normalizeMessages(item.messages) : undefined;
	return {
		id: item?.id || nextId('c'),
		name: item?.name || `Chat ${index + 1}`,
		preview: item?.preview || '',
		time: item?.time || formatChatBubbleTime(),
		ticks: item?.ticks || '',
		avatar: shortMediaPath(item?.avatar || '') || item?.avatar || '',
		avatarKind: item?.avatarKind || '',
		phone: item?.phone || '',
		about: item?.about || '',
		subtitle: item?.subtitle || 'tap for contact info',
		info: { ...DEFAULT_CHAT_INFO, ...infoRaw },
		unread: Math.max(0, Number(item?.unread) || 0),
		storyRing: Boolean(item?.storyRing),
		timeGreen: Boolean(item?.timeGreen),
		previewIcon: item?.previewIcon || '',
		metaAi: Boolean(item?.metaAi),
		whatsapp: Boolean(item?.whatsapp),
		pinned: Boolean(item?.pinned),
		muted: Boolean(item?.muted),
		disappearing: Boolean(item?.disappearing),
		online: Boolean(item?.online),
		firstContact: Boolean(item?.firstContact),
		country: item?.country || '',
		dateLabel: item?.dateLabel || '',
		showEncryptionNotice:
			item?.showEncryptionNotice !== undefined
				? Boolean(item.showEncryptionNotice)
				: Boolean(item?.firstContact),
		...(messages ? { messages } : {}),
	};
}

export function normalizeListState(parsed, fallbackList) {
	const base = fallbackList || createDefaultStudioState().list;
	// Allow raw chats array OR full list object
	if (Array.isArray(parsed)) {
		return {
			...base,
			chats: parsed.map((item, i) => normalizeListChat(item, i)),
		};
	}
	if (!parsed || typeof parsed !== 'object') {
		throw new Error('List JSON must be an object or chats array');
	}
	const chatsRaw = Array.isArray(parsed.chats) ? parsed.chats : base.chats;
	const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : base.suggestions;
	return {
		title: parsed.title ?? base.title,
		searchPlaceholder: parsed.searchPlaceholder ?? base.searchPlaceholder,
		unreadBadge: Number(parsed.unreadBadge ?? base.unreadBadge) || 0,
		callsBadge: Number(parsed.callsBadge ?? base.callsBadge) || 0,
		filter: parsed.filter ?? base.filter,
		showSuggestions:
			parsed.showSuggestions !== undefined
				? Boolean(parsed.showSuggestions)
				: Boolean(base.showSuggestions),
		showSearch:
			parsed.showSearch !== undefined ? Boolean(parsed.showSearch) : Boolean(base.showSearch),
		hidePhoneNumbers:
			parsed.hidePhoneNumbers !== undefined
				? Boolean(parsed.hidePhoneNumbers)
				: Boolean(base.hidePhoneNumbers),
		selfAvatar: parsed.selfAvatar ?? base.selfAvatar ?? '',
		chats: chatsRaw.map((item, i) => normalizeListChat(item, i)),
		suggestions: suggestionsRaw.map((item, i) => ({
			id: item?.id || nextId('s'),
			name: item?.name || `Contact ${i + 1}`,
			avatar: item?.avatar || '',
		})),
	};
}

export function normalizeInfoState(parsed, fallback = createDefaultStudioState()) {
	const base = fallback || createDefaultStudioState();
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Info JSON must be an object { screen, status, thread, list }');
	}
	const listPatch = parsed.list && typeof parsed.list === 'object' ? parsed.list : {};
	const activeFromLegacy =
		parsed.thread?.contactName || parsed.thread?.contactAvatar
			? {
					name: parsed.thread?.contactName,
					avatar: parsed.thread?.contactAvatar,
					subtitle: parsed.thread?.contactSubtitle,
					phone: parsed.thread?.contactInfo?.phone,
					about: parsed.thread?.contactInfo?.about,
					info: parsed.thread?.contactInfo || {},
				}
			: null;
	const next = {
		...base,
		activeChatId: parsed.activeChatId || base.activeChatId,
		screen:
			parsed.screen === 'list'
				? 'list'
				: parsed.screen === 'contact'
					? 'contact'
					: parsed.screen === 'thread'
						? 'thread'
						: base.screen,
		status: {
			...base.status,
			...(parsed.status || {}),
			time: parsed.status?.time || base.status.time,
			battery: Number(parsed.status?.battery ?? base.status.battery),
			signal: Number(parsed.status?.signal ?? base.status.signal),
			wifi: parsed.status?.wifi !== false,
			charging: Boolean(parsed.status?.charging ?? base.status.charging),
			lowPower: Boolean(parsed.status?.lowPower),
		},
		list: {
			...base.list,
			title: listPatch.title ?? base.list.title,
			searchPlaceholder: listPatch.searchPlaceholder ?? base.list.searchPlaceholder,
			unreadBadge: Number(listPatch.unreadBadge ?? base.list.unreadBadge) || 0,
			callsBadge: Number(listPatch.callsBadge ?? base.list.callsBadge) || 0,
			filter: listPatch.filter ?? base.list.filter,
			showSuggestions:
				listPatch.showSuggestions !== undefined
					? Boolean(listPatch.showSuggestions)
					: base.list.showSuggestions,
			showSearch:
				listPatch.showSearch !== undefined
					? Boolean(listPatch.showSearch)
					: base.list.showSearch,
			selfAvatar:
				listPatch.selfAvatar ??
				parsed.thread?.selfAvatar ??
				base.list.selfAvatar ??
				'',
			chats: Array.isArray(listPatch.chats)
				? listPatch.chats.map((item, i) => normalizeListChat(item, i))
				: base.list.chats,
			suggestions: Array.isArray(listPatch.suggestions)
				? listPatch.suggestions.map((item, i) => ({
						id: item?.id || nextId('s'),
						name: item?.name || `Contact ${i + 1}`,
						avatar: item?.avatar || '',
					}))
				: base.list.suggestions,
		},
		thread: {
			backBadge: parsed.thread?.backBadge ?? base.thread.backBadge,
			wallpaper: parsed.thread?.wallpaper ?? base.thread.wallpaper,
			messages: base.thread.messages,
		},
	};

	// Migrate old thread.contact* into the active chat profile (one-time merge).
	if (activeFromLegacy) {
		const id = next.activeChatId;
		next.list = {
			...next.list,
			chats: next.list.chats.map(chat => {
				if (chat.id !== id) return chat;
				return normalizeListChat({
					...chat,
					name: activeFromLegacy.name ?? chat.name,
					avatar: activeFromLegacy.avatar ?? chat.avatar,
					subtitle: activeFromLegacy.subtitle ?? chat.subtitle,
					phone: activeFromLegacy.phone ?? chat.phone,
					about: activeFromLegacy.about ?? chat.about,
					info: { ...(chat.info || {}), ...(activeFromLegacy.info || {}) },
				});
			}),
		};
	}

	if (parsed.activeChat && typeof parsed.activeChat === 'object') {
		const id = parsed.activeChat.id || next.activeChatId;
		next.activeChatId = id;
		next.list = {
			...next.list,
			chats: next.list.chats.map(chat =>
				chat.id === id ? normalizeListChat({ ...chat, ...parsed.activeChat }) : chat,
			),
		};
	}

	return next;
}

/** Normalize pasted studio JSON into a full state object. */
export function normalizeStudioState(parsed, fallback = createDefaultStudioState()) {
	const base = fallback || createDefaultStudioState();
	if (Array.isArray(parsed)) {
		return {
			...base,
			thread: { ...base.thread, messages: normalizeMessages(parsed) },
		};
	}
	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Root must be an object or messages array');
	}
	const withInfo = normalizeInfoState(parsed, base);
	const messagesRaw = Array.isArray(parsed.thread?.messages)
		? parsed.thread.messages
		: Array.isArray(parsed.messages)
			? parsed.messages
			: base.thread.messages;
	return {
		...withInfo,
		thread: {
			...withInfo.thread,
			messages: normalizeMessages(messagesRaw),
		},
	};
}

export const STUDIO_JSON_HELP = `${INFO_JSON_HELP}\n\n--- chat pack ---\n${CHAT_PACK_HELP}\n\n--- messages ---\n${MESSAGES_JSON_HELP}\n\n--- list ---\n${LIST_JSON_HELP}`;
