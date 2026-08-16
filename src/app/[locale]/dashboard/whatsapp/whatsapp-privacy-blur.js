export const WHATSAPP_PRIVACY_BLUR_KEY = 'wa-privacy-blur';

export const DEFAULT_WHATSAPP_PRIVACY_BLUR = {
	enabled: false,
	list: true,
	thread: true,
	hoverReveal: true,
	persistReveal: true,
};

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

export function normalizeWhatsAppPrivacyBlur(value) {
	const source = value && typeof value === 'object' ? value : {};
	return {
		enabled: Boolean(source.enabled),
		list: source.list !== false,
		thread: source.thread !== false,
		hoverReveal: source.hoverReveal !== false,
		persistReveal: source.persistReveal !== false,
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
	]
		.filter(Boolean)
		.join(' ');
}

export function readWhatsAppPrivacyBlur() {
	if (typeof window === 'undefined') return { ...DEFAULT_WHATSAPP_PRIVACY_BLUR };
	try {
		const raw = window.localStorage.getItem(WHATSAPP_PRIVACY_BLUR_KEY);
		if (!raw) return { ...DEFAULT_WHATSAPP_PRIVACY_BLUR };
		return normalizeWhatsAppPrivacyBlur(JSON.parse(raw));
	} catch {
		return { ...DEFAULT_WHATSAPP_PRIVACY_BLUR };
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
	['wa-privacy-on', 'wa-privacy-list', 'wa-privacy-thread', 'wa-privacy-hover', 'wa-privacy-persist'].forEach(
		className => {
			root.classList.toggle(className, next.has(className));
		},
	);
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
