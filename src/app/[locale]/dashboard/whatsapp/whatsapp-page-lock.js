/** Unlock state for the current browser tab only; the password itself is checked by the server. */
export const PAGE_LOCK_SESSION_KEY = 'wa-page-lock-session';
/** Non-secret copy of the settings so a locked page never flashes its content before the status loads. */
export const PAGE_LOCK_HINT_KEY = 'wa-page-lock-hint';
/** Which keypad the lock screen shows: 'pin' (4 digits) or 'password' (an older free-text password). */
export const PAGE_LOCK_MODE_KEY = 'wa-page-lock-mode';
export const PAGE_LOCK_PIN_LENGTH = 4;
/** Away from the tab for this long locks on return when "lock when away" is on and the idle timer is off. */
export const PAGE_LOCK_AWAY_DEFAULT_MINUTES = 5;
export const PAGE_LOCK_MIN_LENGTH = 4;
export const PAGE_LOCK_MAX_LENGTH = 64;
export const PAGE_LOCK_AUTO_MINUTES = [0, 1, 5, 15, 30, 60, 240];

export function normalizePageLockStatus(value) {
	const source = value && typeof value === 'object' ? value : {};
	const minutes = Number(source.autoLockMinutes);
	return {
		configured: Boolean(source.configured),
		enabled: Boolean(source.enabled),
		autoLockMinutes: PAGE_LOCK_AUTO_MINUTES.includes(minutes) ? minutes : 5,
		lockOnHide: Boolean(source.lockOnHide),
		lockOnOpen: Boolean(source.lockOnOpen),
		lockedUntil: typeof source.lockedUntil === 'string' ? source.lockedUntil : null,
		attemptsLeft: Number.isFinite(Number(source.attemptsLeft)) ? Number(source.attemptsLeft) : null,
		maxAttempts: Number(source.maxAttempts) || 5,
		email: typeof source.email === 'string' ? source.email : '',
	};
}

export function isPageLockIdleExpired(status, lastActivity, now = Date.now()) {
	const minutes = Number(status?.autoLockMinutes) || 0;
	if (!minutes || !Number.isFinite(Number(lastActivity))) return false;
	return now - Number(lastActivity) >= minutes * 60_000;
}

/**
 * Whether the page should show the lock screen when it opens. "Ask every time I open WhatsApp"
 * only applies to a fresh page load (reload / new browser tab); moving between pages inside the
 * app and coming back is not "opening" it again, so only the idle timer counts then.
 */
export function shouldStartPageLocked(status, session, now = Date.now(), { freshLoad = true } = {}) {
	if (!status?.enabled) return false;
	if (status.lockOnOpen && freshLoad) return true;
	if (!session?.unlockedAt) return true;
	return isPageLockIdleExpired(status, session.lastActivity ?? session.unlockedAt, now);
}

/**
 * After coming back to the tab: locked only if you were away at least the auto-lock time
 * (or 5 minutes when the idle timer is off). Switching tabs on its own never locks.
 */
export function isPageLockAwayExpired(status, hiddenAt, now = Date.now()) {
	if (!status?.lockOnHide || hiddenAt == null || !Number.isFinite(Number(hiddenAt))) return false;
	const minutes = Number(status.autoLockMinutes) || PAGE_LOCK_AWAY_DEFAULT_MINUTES;
	return now - Number(hiddenAt) >= minutes * 60_000;
}

export const isPageLockPin = value => new RegExp(`^\\d{${PAGE_LOCK_PIN_LENGTH}}$`).test(String(value ?? ''));

/** A new PIN: exactly 4 digits, typed the same twice. */
export function pageLockPinError(pin, confirm, copy) {
	if (!isPageLockPin(pin)) return copy.pinDigits;
	if (confirm != null && pin !== confirm) return copy.pinMismatch;
	return '';
}

export function pageLockPasscodeError(value, copy) {
	const text = String(value ?? '');
	if (text.length < PAGE_LOCK_MIN_LENGTH) return copy.tooShort;
	if (text.length > PAGE_LOCK_MAX_LENGTH) return copy.tooLong;
	if (!text.trim()) return copy.onlySpaces;
	return '';
}

function readJson(storage, key) {
	try {
		const raw = storage?.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function writeJson(storage, key, value) {
	try {
		if (value == null) storage?.removeItem(key);
		else storage?.setItem(key, JSON.stringify(value));
	} catch {
		// Private mode / quota: the lock still works for this page view.
	}
}

const sessionStore = () => (typeof window === 'undefined' ? null : window.sessionStorage);
const localStore = () => (typeof window === 'undefined' ? null : window.localStorage);

export const readPageLockMode = () => {
	try {
		return localStore()?.getItem(PAGE_LOCK_MODE_KEY) === 'password' ? 'password' : 'pin';
	} catch {
		return 'pin';
	}
};
export const writePageLockMode = mode => {
	try {
		localStore()?.setItem(PAGE_LOCK_MODE_KEY, mode === 'password' ? 'password' : 'pin');
	} catch {
		// Not remembered: the lock screen opens on the PIN pad next time.
	}
};

export const readPageLockSession = () => readJson(sessionStore(), PAGE_LOCK_SESSION_KEY);
export const writePageLockSession = value => writeJson(sessionStore(), PAGE_LOCK_SESSION_KEY, value);
export const readPageLockHint = () => {
	const hint = readJson(localStore(), PAGE_LOCK_HINT_KEY);
	return hint ? normalizePageLockStatus(hint) : null;
};
export const writePageLockHint = status =>
	writeJson(
		localStore(),
		PAGE_LOCK_HINT_KEY,
		status
			? {
					configured: status.configured,
					enabled: status.enabled,
					autoLockMinutes: status.autoLockMinutes,
					lockOnHide: status.lockOnHide,
					lockOnOpen: status.lockOnOpen,
				}
			: null,
	);

/** Message and extra fields (attemptsLeft, lockedUntil) from a Nest error response. */
export function pageLockErrorDetails(error, fallback) {
	const data = error?.response?.data;
	const raw = data?.message;
	const message = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : '';
	return {
		message: message || fallback,
		attemptsLeft: Number.isFinite(Number(data?.attemptsLeft)) ? Number(data.attemptsLeft) : null,
		lockedUntil: typeof data?.lockedUntil === 'string' ? data.lockedUntil : null,
		retryAfterSeconds: Number(data?.retryAfterSeconds) || 0,
		status: error?.response?.status || 0,
	};
}

export function formatPageLockCountdown(ms) {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
