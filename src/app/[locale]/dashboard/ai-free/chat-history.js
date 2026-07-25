const STORAGE_PREFIX = 'fitcoach_chats_v1';

function storageKey(userId) {
	return `${STORAGE_PREFIX}:${userId || 'guest'}`;
}

function chatId() {
	if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
	return `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function fallbackTitleFromMessages(messages, fallback = 'New chat') {
	const firstUser = (messages || []).find(message => message.role === 'user');
	const text = String(firstUser?.content || '').replace(/\s+/g, ' ').trim();
	if (!text) return fallback;
	return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

export function loadChatStore(userId) {
	if (typeof window === 'undefined') {
		return { chats: [], activeId: null };
	}
	try {
		const raw = localStorage.getItem(storageKey(userId));
		if (!raw) return { chats: [], activeId: null };
		const parsed = JSON.parse(raw);
		const chats = Array.isArray(parsed?.chats) ? parsed.chats : [];
		return {
			chats,
			activeId: parsed?.activeId || chats[0]?.id || null,
		};
	} catch {
		return { chats: [], activeId: null };
	}
}

export function saveChatStore(userId, store) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(
		storageKey(userId),
		JSON.stringify({
			chats: (store.chats || []).slice(0, 40),
			activeId: store.activeId || null,
		}),
	);
}

export function createEmptyChat(locale = 'en') {
	const now = new Date().toISOString();
	return {
		id: chatId(),
		title: locale === 'ar' ? 'محادثة جديدة' : 'New chat',
		titleSource: 'default',
		messages: [],
		createdAt: now,
		updatedAt: now,
	};
}

export function upsertActiveChat(store, chat) {
	const chats = [...(store.chats || [])];
	const index = chats.findIndex(item => item.id === chat.id);
	const keepAiTitle = chat.titleSource === 'ai' && chat.title;
	const next = {
		...chat,
		title: keepAiTitle
			? chat.title
			: fallbackTitleFromMessages(chat.messages, chat.title),
		titleSource: keepAiTitle ? 'ai' : chat.titleSource || 'fallback',
		updatedAt: new Date().toISOString(),
	};
	if (index >= 0) chats[index] = next;
	else chats.unshift(next);
	chats.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
	return { chats, activeId: next.id };
}

export function deleteChat(store, id) {
	const chats = (store.chats || []).filter(chat => chat.id !== id);
	const activeId =
		store.activeId === id ? chats[0]?.id || null : store.activeId;
	return { chats, activeId };
}
