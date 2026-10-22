export const WHATSAPP_PRIVACY_BLUR_KEY = 'wa-privacy-blur';

export const MAX_PRIVACY_BLUR_CHATS = 500;

export const DEFAULT_WHATSAPP_PRIVACY_BLUR = {
	enabled: false,
	list: true,
	thread: true,
	hoverReveal: true,
	persistReveal: true,
	selectedOnly: false,
	chatIds: [],
};

const ROOT_CLASSES = [
	'wa-privacy-on',
	'wa-privacy-list',
	'wa-privacy-thread',
	'wa-privacy-hover',
	'wa-privacy-persist',
	'wa-privacy-selected',
];

export const PRIVACY_BLUR_REVEAL_SELECTOR = [
	'.title-chat',
	'.desc-chat',
	'.wa-conversation-avatar',
	'.wa-avatar-3d',
	'.wa-chat-avatar-ring',
	'.wa-chat-contact h3',
	'.wa-message-text',
	'.wa-message-bubble > p',
	'.wa-media-gallery',
	'.wa-photo-tile',
	'.wa-file-card',
	'.wa-voice-message',
	'.wa-message-bubble video',
	'.wa-chat-image-viewer img',
	'.wa-collapsed-chat-tip-title',
	'.wa-collapsed-chat-tip-preview',
	'.wa-privacy-identity',
	'[data-privacy-reveal]',
].join(',');

function normalizeChatIds(value) {
	if (!Array.isArray(value)) return [];
	const seen = new Set();
	for (const item of value) {
		const id = typeof item === 'string' ? item.trim() : '';
		if (id) seen.add(id);
		if (seen.size >= MAX_PRIVACY_BLUR_CHATS) break;
	}
	return [...seen];
}

export function normalizeWhatsAppPrivacyBlur(value) {
	const source = value && typeof value === 'object' ? value : {};
	return {
		enabled: Boolean(source.enabled),
		list: source.list !== false,
		thread: source.thread !== false,
		hoverReveal: source.hoverReveal !== false,
		persistReveal: source.persistReveal !== false,
		selectedOnly: Boolean(source.selectedOnly),
		chatIds: normalizeChatIds(source.chatIds),
	};
}

export function privacyBlurRootClassNames(settings) {
	const next = normalizeWhatsAppPrivacyBlur(settings);
	return [
		next.enabled ? 'wa-privacy-on' : '',
		next.enabled && next.list ? 'wa-privacy-list' : '',
		next.enabled && next.thread ? 'wa-privacy-thread' : '',
		next.enabled && next.hoverReveal ? 'wa-privacy-hover' : '',
		next.enabled && next.persistReveal ? 'wa-privacy-persist' : '',
		next.enabled && next.selectedOnly ? 'wa-privacy-selected' : '',
	]
		.filter(Boolean)
		.join(' ');
}

/** Whether this chat should carry the `data-privacy-chat` marker (only matters in selected-only mode). */
export function isWhatsAppChatPrivacyBlurred(settings, chatId) {
	if (!chatId || !settings?.enabled || !settings?.selectedOnly) return false;
	return Array.isArray(settings.chatIds) && settings.chatIds.includes(String(chatId));
}

export function toggleWhatsAppPrivacyBlurChat(settings, chatId, on) {
	const next = normalizeWhatsAppPrivacyBlur(settings);
	const id = String(chatId || '').trim();
	if (!id) return next;
	const has = next.chatIds.includes(id);
	const want = on === undefined ? !has : Boolean(on);
	if (want === has) return next;
	return {
		...next,
		chatIds: want ? normalizeChatIds([...next.chatIds, id]) : next.chatIds.filter(item => item !== id),
	};
}

export function readWhatsAppPrivacyBlur() {
	if (typeof window === 'undefined') return { ...DEFAULT_WHATSAPP_PRIVACY_BLUR, chatIds: [] };
	try {
		const raw = window.localStorage.getItem(WHATSAPP_PRIVACY_BLUR_KEY);
		if (!raw) return { ...DEFAULT_WHATSAPP_PRIVACY_BLUR, chatIds: [] };
		return normalizeWhatsAppPrivacyBlur(JSON.parse(raw));
	} catch {
		return { ...DEFAULT_WHATSAPP_PRIVACY_BLUR, chatIds: [] };
	}
}

export function writeWhatsAppPrivacyBlur(settings) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(
			WHATSAPP_PRIVACY_BLUR_KEY,
			JSON.stringify(normalizeWhatsAppPrivacyBlur(settings)),
		);
	} catch {
		// Ignore quota / private-mode failures.
	}
}

export function applyWhatsAppPrivacyBlurClasses(settings) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const next = new Set(privacyBlurRootClassNames(settings).split(' ').filter(Boolean));
	ROOT_CLASSES.forEach(className => {
		root.classList.toggle(className, next.has(className));
	});
	if (!settings?.enabled || !settings?.persistReveal) {
		document.querySelectorAll('.is-privacy-revealed').forEach(node => {
			node.classList.remove('is-privacy-revealed');
		});
	}
}

export function markPrivacyBlurRevealed(target) {
	if (!target || typeof target.closest !== 'function') return;
	const hit = target.closest(PRIVACY_BLUR_REVEAL_SELECTOR);
	if (hit) hit.classList.add('is-privacy-revealed');
}
