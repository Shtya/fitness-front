/** Same-tab signal that impersonation session started/ended (Layout listens). */
export const IMPERSONATION_EVENT = 'so7ba:impersonation-changed';

export function notifyImpersonationChanged() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(IMPERSONATION_EVENT));
}

export function isImpersonatingSession() {
	if (typeof window === 'undefined') return false;
	return !!localStorage.getItem('super_admin_prev_session');
}
