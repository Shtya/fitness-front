export const WHATSAPP_UNREAD_EVENT = 'so7ba:whatsapp-unread';
export const META_WHATSAPP_UNREAD_EVENT = 'so7ba:meta-whatsapp-unread';

export function notifyWhatsAppUnreadChanged() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(WHATSAPP_UNREAD_EVENT));
}

export function notifyMetaWhatsAppUnreadChanged() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(META_WHATSAPP_UNREAD_EVENT));
}
