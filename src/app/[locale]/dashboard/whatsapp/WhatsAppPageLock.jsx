'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	AlertTriangle,
	ArrowLeft,
	Clock3,
	Eye,
	EyeOff,
	KeyRound,
	Loader2,
	Lock,
	Delete,
	LockKeyhole,
	LockKeyholeOpen,
	LogOut,
	Mail,
	MonitorOff,
	RefreshCw,
	ShieldCheck,
	Trash2,
	UserRound,
} from 'lucide-react';
import api from '@/utils/axios';
import { WaCustomSelect } from './WaCustomSelect';
import {
	PAGE_LOCK_AUTO_MINUTES,
	PAGE_LOCK_MAX_LENGTH,
	PAGE_LOCK_PIN_LENGTH,
	formatPageLockCountdown,
	isPageLockAwayExpired,
	isPageLockIdleExpired,
	isPageLockPin,
	normalizePageLockStatus,
	pageLockErrorDetails,
	pageLockPinError,
	readPageLockHint,
	readPageLockMode,
	readPageLockSession,
	shouldStartPageLocked,
	writePageLockHint,
	writePageLockMode,
	writePageLockSession,
} from './whatsapp-page-lock';
import './wa-page-lock.css';

const COPY = {
	en: {
		tab: 'Page lock',
		title: 'WhatsApp page lock',
		description: 'Ask for a password before anyone can see this WhatsApp screen.',
		lockedTitle: 'WhatsApp is locked',
		lockedHint: 'Enter your page lock password to continue.',
		password: 'Password',
		newPassword: 'New password',
		confirmPassword: 'Confirm new password',
		currentPassword: 'Current password',
		accountPassword: 'Your account login password',
		show: 'Show password',
		hide: 'Hide password',
		unlock: 'Unlock',
		forgot: 'Forgot password?',
		leave: 'Leave WhatsApp',
		wrong: 'Wrong password',
		attemptsLeft: '{count} tries left before a short block.',
		blocked: 'Too many wrong tries. Try again in {time}.',
		tooShort: 'Use at least 4 characters.',
		tooLong: `Use at most ${PAGE_LOCK_MAX_LENGTH} characters.`,
		onlySpaces: 'The password cannot be only spaces.',
		mismatch: 'The two passwords do not match.',
		failed: 'Something went wrong. Try again.',
		setupTitle: 'Set a 4-digit PIN',
		setupHint: 'Pick a PIN only you know. You will type it to open WhatsApp here.',
		turnOn: 'Turn on page lock',
		enabled: 'Page lock',
		enabledHint: 'Show the lock screen before the WhatsApp page.',
		on: 'On',
		off: 'Off',
		autoLock: 'Lock automatically after',
		autoLockHint: 'Locks the page when nobody uses it for this long.',
		minutes: { 0: 'Never (no idle timer)', 1: '1 minute', 5: '5 minutes', 15: '15 minutes', 30: '30 minutes', 60: '1 hour', 240: '4 hours' },
		lockOnHide: 'Lock when I stay away from the tab',
		lockOnHideHint: 'Quick tab switches never lock. If you are away for the auto-lock time (5 minutes when it is off), it locks when you come back.',
		lockOnOpen: 'Ask every time I open WhatsApp',
		lockOnOpenHint: 'Asks again after a page reload or in a new browser tab. Moving between pages inside the app does not lock it.',
		pinTitle: 'Enter your PIN',
		pinHint: 'Type your 4-digit PIN to open WhatsApp.',
		passwordHint: 'Type your page lock password to open WhatsApp.',
		newPin: 'New 4-digit PIN',
		confirmPin: 'Type the PIN again',
		currentPin: 'Current PIN or password',
		pinDigits: 'The PIN must be exactly 4 digits.',
		pinMismatch: 'The two PINs do not match.',
		wrongPin: 'Wrong PIN. Try again.',
		checking: 'Checking…',
		unlocked: 'Unlocked',
		usePassword: 'Use password instead',
		usePin: 'Use 4-digit PIN',
		deleteDigit: 'Delete last digit',
		digit: 'Digit {n}',
		lockNow: 'Lock now',
		lockNowHint: 'Shortcut: Ctrl + Alt + L',
		change: 'Change PIN',
		changeHint: 'Enter your current PIN or password, then the new 4-digit PIN.',
		saveNew: 'Save new PIN',
		changed: 'PIN changed.',
		forgotTitle: 'Reset your page lock password',
		forgotHint: 'Prove it is you, then pick a new 4-digit PIN.',
		byEmail: 'Email me a code',
		byAccount: 'Use my account password',
		sendCode: 'Send code to {email}',
		resendCode: 'Send a new code',
		resendIn: 'New code in {time}',
		codeSent: 'We sent a 6-digit code to {email}. It works for 5 minutes.',
		code: '6-digit code',
		reset: 'Reset password',
		resetDone: 'Password reset. The page is unlocked.',
		back: 'Back',
		cancel: 'Cancel',
		turnOffTitle: 'Enter your password to turn the lock off',
		turnOff: 'Turn off',
		remove: 'Remove password',
		removeHint: 'Deletes the password and turns the lock off. You can set a new one later.',
		removeConfirm: 'Remove',
		removed: 'Page lock removed.',
		saved: 'Saved.',
		protectNote:
			'After 5 wrong tries the page is blocked for 5 minutes, then longer. The lock guards this screen in this browser; it does not sign you out.',
		loading: 'Loading…',
	},
	ar: {
		tab: 'قفل الصفحة',
		title: 'قفل صفحة واتساب',
		description: 'اطلب كلمة سر قبل أن يرى أي شخص شاشة واتساب.',
		lockedTitle: 'واتساب مقفول',
		lockedHint: 'اكتب كلمة سر قفل الصفحة للمتابعة.',
		password: 'كلمة السر',
		newPassword: 'كلمة السر الجديدة',
		confirmPassword: 'تأكيد كلمة السر الجديدة',
		currentPassword: 'كلمة السر الحالية',
		accountPassword: 'كلمة سر تسجيل الدخول لحسابك',
		show: 'إظهار كلمة السر',
		hide: 'إخفاء كلمة السر',
		unlock: 'فتح',
		forgot: 'نسيت كلمة السر؟',
		leave: 'الخروج من واتساب',
		wrong: 'كلمة السر غير صحيحة',
		attemptsLeft: 'باقي {count} محاولات قبل الإيقاف المؤقت.',
		blocked: 'محاولات خاطئة كثيرة. حاول بعد {time}.',
		tooShort: 'استخدم 4 أحرف على الأقل.',
		tooLong: `استخدم ${PAGE_LOCK_MAX_LENGTH} حرفًا كحد أقصى.`,
		onlySpaces: 'لا يمكن أن تكون كلمة السر مسافات فقط.',
		mismatch: 'كلمتا السر غير متطابقتين.',
		failed: 'حدث خطأ. حاول مرة أخرى.',
		setupTitle: 'عيّن رقمًا سريًا من 4 أرقام',
		setupHint: 'اختر رقمًا سريًا تعرفه أنت فقط. ستكتبه لفتح واتساب هنا.',
		turnOn: 'تفعيل قفل الصفحة',
		enabled: 'قفل الصفحة',
		enabledHint: 'إظهار شاشة القفل قبل صفحة واتساب.',
		on: 'مفعّل',
		off: 'متوقف',
		autoLock: 'القفل تلقائيًا بعد',
		autoLockHint: 'تُقفل الصفحة إذا لم يستخدمها أحد طوال هذه المدة.',
		minutes: { 0: 'أبدًا (بدون مؤقت)', 1: 'دقيقة', 5: '5 دقائق', 15: '15 دقيقة', 30: '30 دقيقة', 60: 'ساعة', 240: '4 ساعات' },
		lockOnHide: 'القفل لو غبت عن التبويب',
		lockOnHideHint: 'التنقل السريع بين التبويبات لا يقفل. لو غبت مدة القفل التلقائي (5 دقائق لو متوقف) تُقفل عند رجوعك.',
		lockOnOpen: 'اطلب كلمة السر كل مرة أفتح واتساب',
		lockOnOpenHint: 'تطلبها بعد إعادة تحميل الصفحة أو في تبويب متصفح جديد. التنقل بين صفحات التطبيق لا يقفل.',
		pinTitle: 'اكتب الرقم السري',
		pinHint: 'اكتب الرقم السري المكوّن من 4 أرقام لفتح واتساب.',
		passwordHint: 'اكتب كلمة سر قفل الصفحة لفتح واتساب.',
		newPin: 'رقم سري جديد (4 أرقام)',
		confirmPin: 'اكتب الرقم السري مرة أخرى',
		currentPin: 'الرقم السري أو كلمة السر الحالية',
		pinDigits: 'الرقم السري لازم يكون 4 أرقام بالضبط.',
		pinMismatch: 'الرقمان السريان غير متطابقين.',
		wrongPin: 'رقم سري غير صحيح. حاول مرة أخرى.',
		checking: 'جارٍ التحقق…',
		unlocked: 'تم الفتح',
		usePassword: 'استخدم كلمة سر بدلًا من ذلك',
		usePin: 'استخدم الرقم السري (4 أرقام)',
		deleteDigit: 'حذف آخر رقم',
		digit: 'الرقم {n}',
		lockNow: 'اقفل الآن',
		lockNowHint: 'الاختصار: Ctrl + Alt + L',
		change: 'تغيير الرقم السري',
		changeHint: 'اكتب الرقم السري أو كلمة السر الحالية ثم الرقم السري الجديد.',
		saveNew: 'حفظ الرقم السري الجديد',
		changed: 'تم تغيير الرقم السري.',
		forgotTitle: 'إعادة تعيين كلمة سر القفل',
		forgotHint: 'أثبت أنك صاحب الحساب ثم اختر رقمًا سريًا جديدًا من 4 أرقام.',
		byEmail: 'أرسل لي رمزًا على البريد',
		byAccount: 'استخدم كلمة سر حسابي',
		sendCode: 'أرسل الرمز إلى {email}',
		resendCode: 'أرسل رمزًا جديدًا',
		resendIn: 'رمز جديد بعد {time}',
		codeSent: 'أرسلنا رمزًا من 6 أرقام إلى {email}. صالح لمدة 5 دقائق.',
		code: 'الرمز (6 أرقام)',
		reset: 'إعادة تعيين كلمة السر',
		resetDone: 'تمت إعادة التعيين وفُتحت الصفحة.',
		back: 'رجوع',
		cancel: 'إلغاء',
		turnOffTitle: 'اكتب كلمة السر لإيقاف القفل',
		turnOff: 'إيقاف',
		remove: 'حذف كلمة السر',
		removeHint: 'يحذف كلمة السر ويوقف القفل. يمكنك تعيين واحدة جديدة لاحقًا.',
		removeConfirm: 'حذف',
		removed: 'تم حذف قفل الصفحة.',
		saved: 'تم الحفظ.',
		protectNote:
			'بعد 5 محاولات خاطئة تُوقف الصفحة 5 دقائق ثم مدة أطول. القفل يحمي هذه الشاشة في هذا المتصفح ولا يسجّل خروجك.',
		loading: 'جارٍ التحميل…',
	},
};

export function pageLockCopy(locale) {
	return COPY[String(locale || '').toLowerCase().startsWith('ar') ? 'ar' : 'en'];
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];
const ACTIVITY_WRITE_MS = 5_000;
const IDLE_CHECK_MS = 10_000;

/**
 * Set once this page load has been unlocked. Leaving WhatsApp for another dashboard page and coming
 * back remounts the workspace; that is not "opening" it again, so "ask every time" waits for a reload.
 */
let unlockedThisPageLoad = false;
const startLocked = status =>
	shouldStartPageLocked(status, readPageLockSession(), Date.now(), { freshLoad: !unlockedThisPageLoad });

/**
 * Page lock state for the WhatsApp workspace. The server owns the password and wrong-try limits;
 * this tab remembers that it was unlocked (sessionStorage) and re-locks after the idle time, after being
 * away from the tab that long, or on a fresh page load. A quick tab switch never locks.
 */
export function useWhatsAppPageLock({ active = true } = {}) {
	const [status, setStatus] = useState(() => readPageLockHint() || normalizePageLockStatus(null));
	const [loaded, setLoaded] = useState(false);
	const [locked, setLocked] = useState(() =>
		active ? startLocked(readPageLockHint()) : false,
	);
	const statusRef = useRef(status);
	const lockedRef = useRef(locked);
	const lastActivity = useRef(readPageLockSession()?.lastActivity || Date.now());
	const lastWrite = useRef(0);
	const unlockedHere = useRef(false);
	const hiddenAt = useRef(null);
	statusRef.current = status;
	lockedRef.current = locked;

	const applyStatus = useCallback(next => {
		const normalized = normalizePageLockStatus(next);
		setStatus(normalized);
		writePageLockHint(normalized);
		if (!normalized.enabled) setLocked(false);
		return normalized;
	}, []);

	const markUnlocked = useCallback(() => {
		const now = Date.now();
		unlockedHere.current = true;
		unlockedThisPageLoad = true;
		hiddenAt.current = null;
		lastActivity.current = now;
		lastWrite.current = now;
		writePageLockSession({ unlockedAt: now, lastActivity: now });
		setLocked(false);
	}, []);

	const lockNow = useCallback(() => {
		if (!statusRef.current.enabled) return false;
		writePageLockSession(null);
		setLocked(true);
		return true;
	}, []);

	const refresh = useCallback(async () => {
		const { data } = await api.get('/whatsapp/page-lock');
		return applyStatus(data);
	}, [applyStatus]);

	useEffect(() => {
		if (!active) {
			setLocked(false);
			return undefined;
		}
		let alive = true;
		api
			.get('/whatsapp/page-lock')
			.then(({ data }) => {
				if (!alive) return;
				const next = applyStatus(data);
				if (!unlockedHere.current) setLocked(startLocked(next));
			})
			.catch(() => {
				// Keep the cached decision; a network error must not open a locked page.
			})
			.finally(() => {
				if (alive) setLoaded(true);
			});
		return () => {
			alive = false;
		};
	}, [active, applyStatus]);

	const enabled = active && status.enabled;

	useEffect(() => {
		if (!enabled || locked) return undefined;
		const touch = () => {
			const now = Date.now();
			lastActivity.current = now;
			if (now - lastWrite.current < ACTIVITY_WRITE_MS) return;
			lastWrite.current = now;
			const session = readPageLockSession();
			writePageLockSession({ unlockedAt: session?.unlockedAt || now, lastActivity: now });
		};
		const checkIdle = () => {
			if (isPageLockIdleExpired(statusRef.current, lastActivity.current, Date.now())) lockNow();
		};
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') {
				hiddenAt.current = Date.now();
				return;
			}
			const awaySince = hiddenAt.current;
			hiddenAt.current = null;
			if (isPageLockAwayExpired(statusRef.current, awaySince, Date.now())) lockNow();
			else checkIdle();
		};
		ACTIVITY_EVENTS.forEach(name => window.addEventListener(name, touch, { passive: true, capture: true }));
		document.addEventListener('visibilitychange', onVisibility);
		const timer = window.setInterval(checkIdle, IDLE_CHECK_MS);
		return () => {
			ACTIVITY_EVENTS.forEach(name => window.removeEventListener(name, touch, { capture: true }));
			document.removeEventListener('visibilitychange', onVisibility);
			window.clearInterval(timer);
		};
	}, [enabled, locked, lockNow]);

	useEffect(() => {
		if (!enabled) return undefined;
		const onKey = event => {
			if (event.ctrlKey && event.altKey && !event.shiftKey && (event.key === 'l' || event.key === 'L')) {
				event.preventDefault();
				lockNow();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [enabled, lockNow]);

	/** Checks the passcode on the server without opening the page yet (the lock screen animates first). */
	const checkPasscode = useCallback(
		async passcode => {
			const { data } = await api.post('/whatsapp/page-lock/verify', { passcode });
			applyStatus(data);
		},
		[applyStatus],
	);

	const unlock = useCallback(
		async passcode => {
			await checkPasscode(passcode);
			markUnlocked();
		},
		[checkPasscode, markUnlocked],
	);

	const actions = useMemo(
		() => ({
			async setup(passcode, autoLockMinutes) {
				const { data } = await api.post('/whatsapp/page-lock/setup', { passcode, autoLockMinutes });
				markUnlocked();
				return applyStatus(data);
			},
			async updateSettings(patch) {
				const { data } = await api.patch('/whatsapp/page-lock/settings', patch);
				const next = applyStatus(data);
				if (patch.enabled === true) markUnlocked();
				return next;
			},
			async change(currentPasscode, newPasscode) {
				const { data } = await api.post('/whatsapp/page-lock/change', { currentPasscode, newPasscode });
				return applyStatus(data);
			},
			async remove(passcode) {
				const { data } = await api.post('/whatsapp/page-lock/remove', { passcode });
				writePageLockSession(null);
				return applyStatus(data);
			},
			async sendResetCode() {
				const { data } = await api.post('/whatsapp/page-lock/forgot');
				return data;
			},
			async resetWithCode(code, newPasscode) {
				const { data } = await api.post('/whatsapp/page-lock/forgot/code', { code, newPasscode });
				applyStatus(data);
				markUnlocked();
			},
			async resetWithAccountPassword(accountPassword, newPasscode) {
				const { data } = await api.post('/whatsapp/page-lock/forgot/account-password', { accountPassword, newPasscode });
				applyStatus(data);
				markUnlocked();
			},
		}),
		[applyStatus, markUnlocked],
	);

	return {
		active,
		status,
		loaded,
		locked: enabled && locked,
		lockNow,
		unlock,
		checkPasscode,
		finishUnlock: markUnlocked,
		refresh,
		...actions,
	};
}

/* ─── Small pieces ───────────────────────────────────────────────── */

function PasswordField({ label, value, onChange, autoFocus, autoComplete = 'off', copy, inputMode, maxLength = PAGE_LOCK_MAX_LENGTH, id }) {
	const [visible, setVisible] = useState(false);
	return (
		<label className="wpl-field" htmlFor={id}>
			<span className="wpl-label">{label}</span>
			<span className="wpl-input-wrap">
				<input
					id={id}
					type={visible ? 'text' : 'password'}
					value={value}
					onChange={event => onChange(event.target.value)}
					autoFocus={autoFocus}
					autoComplete={autoComplete}
					inputMode={inputMode}
					maxLength={maxLength}
					spellCheck={false}
					dir="ltr"
					className="wpl-input"
				/>
				<button
					type="button"
					className="wpl-eye"
					onClick={() => setVisible(current => !current)}
					aria-label={visible ? copy.hide : copy.show}
					title={visible ? copy.hide : copy.show}
				>
					{visible ? <EyeOff size={16} /> : <Eye size={16} />}
				</button>
			</span>
		</label>
	);
}

function useCountdown(untilIso) {
	const [now, setNow] = useState(() => Date.now());
	const until = untilIso ? new Date(untilIso).getTime() : 0;
	const left = until - now;
	useEffect(() => {
		if (!until || until <= Date.now()) return undefined;
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [until]);
	return left > 0 ? left : 0;
}

function Message({ tone = 'error', children }) {
	if (!children) return null;
	return (
		<p className={`wpl-msg is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
			{tone === 'error' ? <AlertTriangle size={14} aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}
			<span>{children}</span>
		</p>
	);
}

const PIN_SLOTS = Array.from({ length: PAGE_LOCK_PIN_LENGTH }, (_, index) => index);
const onlyDigits = value => String(value ?? '').replace(/\D/g, '').slice(0, PAGE_LOCK_PIN_LENGTH);

/** Four boxes that fill with a dot per digit; the active box glows. */
function PinSlots({ value, focused, phase = 'idle', size }) {
	return (
		<span className={`wpl-pin-slots${size ? ` is-${size}` : ''} is-${phase}`} aria-hidden="true">
			{PIN_SLOTS.map(index => (
				<span
					key={index}
					className={`wpl-pin-slot${index < value.length ? ' is-filled' : ''}${focused && index === value.length ? ' is-active' : ''}`}
					style={{ '--wpl-i': index }}
				>
					<i />
				</span>
			))}
		</span>
	);
}

/** A 4-digit PIN entry for Settings and the reset form. A transparent input sits over the boxes. */
function PinField({ id, label, value, onChange, autoFocus, invalid }) {
	const [focused, setFocused] = useState(false);
	return (
		<label className={`wpl-field wpl-pin-field${invalid ? ' is-invalid' : ''}`} htmlFor={id}>
			<span className="wpl-label">{label}</span>
			<span className="wpl-pin-box">
				<PinSlots value={value} focused={focused} size="sm" />
				<input
					id={id}
					value={value}
					onChange={event => onChange(onlyDigits(event.target.value))}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					autoFocus={autoFocus}
					inputMode="numeric"
					pattern="[0-9]*"
					autoComplete="off"
					maxLength={PAGE_LOCK_PIN_LENGTH}
					spellCheck={false}
					dir="ltr"
					className="wpl-pin-input"
				/>
			</span>
		</label>
	);
}

const newPinProblem = (next, confirm, copy) => pageLockPinError(next, confirm, copy);

/** Reset via an emailed code or the account login password. Used on the lock screen and in Settings. */
function ForgotPasswordForm({ lock, copy, onDone, onCancel }) {
	const [method, setMethod] = useState('email');
	const [sent, setSent] = useState(null);
	const [resendAt, setResendAt] = useState(null);
	const [code, setCode] = useState('');
	const [accountPassword, setAccountPassword] = useState('');
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const resendLeft = useCountdown(resendAt);
	const email = sent?.email || lock.status.email;

	const sendCode = async () => {
		setBusy(true);
		setError('');
		try {
			const data = await lock.sendResetCode();
			setSent(data || { sent: true });
			setResendAt(new Date(Date.now() + 60_000).toISOString());
		} catch (err) {
			const details = pageLockErrorDetails(err, copy.failed);
			if (details.retryAfterSeconds) setResendAt(new Date(Date.now() + details.retryAfterSeconds * 1000).toISOString());
			setError(details.message);
		} finally {
			setBusy(false);
		}
	};

	const submit = async event => {
		event.preventDefault();
		const problem = newPinProblem(next, confirm, copy);
		if (problem) return setError(problem);
		setBusy(true);
		setError('');
		try {
			if (method === 'email') await lock.resetWithCode(code.trim(), next);
			else await lock.resetWithAccountPassword(accountPassword, next);
			writePageLockMode('pin');
			onDone?.(copy.resetDone);
		} catch (err) {
			setError(pageLockErrorDetails(err, copy.failed).message);
		} finally {
			setBusy(false);
		}
	};

	const switchMethod = value => {
		setMethod(value);
		setError('');
	};

	return (
		<form className="wpl-forgot" onSubmit={submit}>
			<div className="wpl-segment" role="tablist" aria-label={copy.forgotTitle}>
				<button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'is-active' : ''} onClick={() => switchMethod('email')}>
					<Mail size={14} aria-hidden="true" />
					{copy.byEmail}
				</button>
				<button type="button" role="tab" aria-selected={method === 'account'} className={method === 'account' ? 'is-active' : ''} onClick={() => switchMethod('account')}>
					<UserRound size={14} aria-hidden="true" />
					{copy.byAccount}
				</button>
			</div>

			{method === 'email' ? (
				!sent ? (
					<button type="button" className="wpl-btn is-primary is-block" onClick={sendCode} disabled={busy || !email}>
						{busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />}
						{copy.sendCode.replace('{email}', email || '—')}
					</button>
				) : (
					<>
						<Message tone="ok">{copy.codeSent.replace('{email}', email)}</Message>
						<label className="wpl-field">
							<span className="wpl-label">{copy.code}</span>
							<input
								value={code}
								onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
								inputMode="numeric"
								autoComplete="one-time-code"
								autoFocus
								dir="ltr"
								className="wpl-input is-code"
							/>
						</label>
						<button type="button" className="wpl-link" onClick={sendCode} disabled={busy || resendLeft > 0}>
							<RefreshCw size={13} aria-hidden="true" />
							{resendLeft > 0 ? copy.resendIn.replace('{time}', formatPageLockCountdown(resendLeft)) : copy.resendCode}
						</button>
					</>
				)
			) : (
				<PasswordField id="wpl-account-pass" label={copy.accountPassword} value={accountPassword} onChange={setAccountPassword} copy={copy} autoComplete="current-password" maxLength={200} autoFocus />
			)}

			{method === 'account' || sent ? (
				<>
					<PinField id="wpl-reset-new" label={copy.newPin} value={next} onChange={setNext} />
					<PinField id="wpl-reset-confirm" label={copy.confirmPin} value={confirm} onChange={setConfirm} invalid={confirm.length === PAGE_LOCK_PIN_LENGTH && confirm !== next} />
				</>
			) : null}

			<Message>{error}</Message>

			<div className="wpl-actions">
				{onCancel ? (
					<button type="button" className="wpl-btn is-ghost" onClick={onCancel}>
						<ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
						{copy.back}
					</button>
				) : null}
				{method === 'account' || sent ? (
					<button
						type="submit"
						className="wpl-btn is-primary"
						disabled={busy || !isPageLockPin(next) || !isPageLockPin(confirm) || (method === 'email' ? code.length !== 6 : !accountPassword)}
					>
						{busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
						{copy.reset}
					</button>
				) : null}
			</div>
		</form>
	);
}

/* ─── Lock screen ────────────────────────────────────────────────── */

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'mode', '0', 'back'];
/** Long enough for the shake / unlock animations to read; skipped with reduced motion. */
const WRONG_RESET_MS = 520;
const OPEN_MS = 560;

const prefersReducedMotion = () =>
	typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

function useClock(running) {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		if (!running) return undefined;
		setNow(new Date());
		const timer = window.setInterval(() => setNow(new Date()), 15_000);
		return () => window.clearInterval(timer);
	}, [running]);
	return now;
}

export function WhatsAppPageLockScreen({ lock, locale, onLeave }) {
	const copy = pageLockCopy(locale);
	const isArabic = copy === COPY.ar;
	const [view, setView] = useState('unlock');
	const [mode, setMode] = useState(readPageLockMode);
	const [pin, setPin] = useState('');
	const [passcode, setPasscode] = useState('');
	const [phase, setPhase] = useState('idle');
	const [focused, setFocused] = useState(false);
	const [error, setError] = useState('');
	const [attemptsLeft, setAttemptsLeft] = useState(null);
	const [blockedUntil, setBlockedUntil] = useState(lock.status.lockedUntil);
	const blockedLeft = useCountdown(blockedUntil);
	const blocked = blockedLeft > 0;
	const pinRef = useRef(null);
	const passwordRef = useRef(null);
	const busyRef = useRef(false);
	const keyRef = useRef(null);
	const now = useClock(lock.locked);

	useEffect(() => {
		setBlockedUntil(lock.status.lockedUntil);
	}, [lock.status.lockedUntil]);

	useEffect(() => {
		if (!lock.locked) return undefined;
		const root = document.documentElement;
		root.classList.add('wa-page-locked');
		return () => root.classList.remove('wa-page-locked');
	}, [lock.locked]);

	const focusEntry = useCallback(() => {
		window.setTimeout(() => (mode === 'pin' ? pinRef.current : passwordRef.current)?.focus({ preventScroll: true }), 0);
	}, [mode]);

	useEffect(() => {
		if (lock.locked && view === 'unlock') focusEntry();
	}, [lock.locked, view, focusEntry]);

	const verify = async value => {
		if (busyRef.current || blocked || !value) return;
		busyRef.current = true;
		setPhase('checking');
		setError('');
		const quick = prefersReducedMotion();
		try {
			await lock.checkPasscode(value);
			writePageLockMode(isPageLockPin(value) ? 'pin' : 'password');
			setAttemptsLeft(null);
			setPhase('open');
			window.setTimeout(() => {
				lock.finishUnlock();
				setPin('');
				setPasscode('');
				setPhase('idle');
				busyRef.current = false;
			}, quick ? 0 : OPEN_MS);
		} catch (err) {
			const details = pageLockErrorDetails(err, copy.failed);
			if (details.lockedUntil) {
				setBlockedUntil(details.lockedUntil);
			} else {
				const wrong = details.status === 400 && details.attemptsLeft != null;
				setError(wrong ? (mode === 'pin' ? copy.wrongPin : copy.wrong) : details.message);
				setAttemptsLeft(details.attemptsLeft);
			}
			setPhase('wrong');
			window.setTimeout(() => {
				setPin('');
				setPasscode('');
				setPhase('idle');
				busyRef.current = false;
				focusEntry();
			}, quick ? 0 : WRONG_RESET_MS);
		}
	};

	/** Every way of typing ends here; the 4th digit checks the PIN right away, no Enter needed. */
	const typePin = next => {
		if (busyRef.current || blocked) return;
		const digits = onlyDigits(next);
		setPin(digits);
		if (error && digits.length) setError('');
		if (digits.length === PAGE_LOCK_PIN_LENGTH) void verify(digits);
	};

	const switchMode = () => {
		const next = mode === 'pin' ? 'password' : 'pin';
		setMode(next);
		writePageLockMode(next);
		setPin('');
		setPasscode('');
		setError('');
	};

	// Digits typed while focus is elsewhere on the screen (e.g. after clicking the backdrop).
	keyRef.current = { pin, typePin };
	useEffect(() => {
		if (!lock.locked || view !== 'unlock' || mode !== 'pin') return undefined;
		const onKey = event => {
			if (event.ctrlKey || event.metaKey || event.altKey) return;
			const target = event.target;
			if (target === pinRef.current) return;
			if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
			const { pin: current, typePin: type } = keyRef.current;
			if (/^\d$/.test(event.key)) {
				event.preventDefault();
				type(current + event.key);
				pinRef.current?.focus({ preventScroll: true });
			} else if (event.key === 'Backspace') {
				event.preventDefault();
				type(current.slice(0, -1));
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [lock.locked, view, mode]);

	if (!lock.locked || typeof document === 'undefined') return null;

	const submitPassword = event => {
		event.preventDefault();
		void verify(passcode);
	};

	const pressKey = key => {
		if (key === 'back') typePin(pin.slice(0, -1));
		else typePin(pin + key);
		pinRef.current?.focus({ preventScroll: true });
	};

	const timeText = now.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' });
	const dateText = now.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
	const opening = phase === 'open';
	const status = blocked
		? copy.blocked.replace('{time}', formatPageLockCountdown(blockedLeft))
		: phase === 'checking'
			? copy.checking
			: opening
				? copy.unlocked
				: error;
	const tone = blocked || (error && !opening && phase !== 'checking') ? 'error' : opening ? 'ok' : 'info';
	const title = view !== 'unlock' ? copy.forgotTitle : mode === 'pin' ? copy.pinTitle : copy.lockedTitle;
	const hint = view !== 'unlock' ? copy.forgotHint : mode === 'pin' ? copy.pinHint : copy.passwordHint;

	return createPortal(
		<div
			className={`wpl-screen is-${phase}${view !== 'unlock' ? ' is-forgot' : ''}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="wpl-title"
			dir={isArabic ? 'rtl' : 'ltr'}
			onPointerDown={event => {
				if (view === 'unlock' && event.target === event.currentTarget) focusEntry();
			}}
		>
			<span className="wpl-aura" aria-hidden="true" />
			<div className="wpl-card">
				{view === 'unlock' ? (
					<div className="wpl-clock" aria-hidden="true">
						<span className="wpl-time">{timeText}</span>
						<span className="wpl-date">{dateText}</span>
					</div>
				) : null}

				<span className="wpl-glyph" aria-hidden="true">
					<span className="wpl-glyph-ring" />
					{opening ? <LockKeyholeOpen size={26} strokeWidth={1.9} /> : <LockKeyhole size={26} strokeWidth={1.9} />}
				</span>
				<h2 id="wpl-title" className="wpl-title">
					{title}
				</h2>
				<p className="wpl-sub">{hint}</p>

				{view !== 'unlock' ? (
					<ForgotPasswordForm lock={lock} copy={copy} onCancel={() => setView('unlock')} onDone={() => setView('unlock')} />
				) : mode === 'pin' ? (
					<div className="wpl-pin-lock">
						<div className="wpl-pin-box is-lock">
							<PinSlots value={pin} focused={focused && phase === 'idle' && !blocked} phase={blocked ? 'blocked' : phase} />
							<input
								ref={pinRef}
								value={pin}
								onChange={event => typePin(event.target.value)}
								onFocus={() => setFocused(true)}
								onBlur={() => setFocused(false)}
								aria-label={copy.pinTitle}
								inputMode="numeric"
								pattern="[0-9]*"
								autoComplete="off"
								maxLength={PAGE_LOCK_PIN_LENGTH}
								spellCheck={false}
								dir="ltr"
								disabled={blocked}
								readOnly={phase !== 'idle'}
								className="wpl-pin-input"
							/>
						</div>
						<p className={`wpl-status is-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
							{phase === 'checking' ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
							<span>{status}</span>
						</p>
						{error && !blocked && attemptsLeft != null && attemptsLeft > 0 ? (
							<p className="wpl-note">{copy.attemptsLeft.replace('{count}', String(attemptsLeft))}</p>
						) : null}

						<div className="wpl-keypad" dir="ltr">
							{KEYPAD.map(key =>
								key === 'mode' ? (
									<span key={key} aria-hidden="true" />
								) : (
									<button
										key={key}
										type="button"
										className={`wpl-key${key === 'back' ? ' is-back' : ''}`}
										onPointerDown={event => event.preventDefault()}
										onClick={() => pressKey(key)}
										disabled={blocked || phase !== 'idle' || (key === 'back' && !pin)}
										aria-label={key === 'back' ? copy.deleteDigit : key}
									>
										{key === 'back' ? <Delete size={20} strokeWidth={1.8} aria-hidden="true" /> : key}
									</button>
								),
							)}
						</div>
					</div>
				) : (
					<form className="wpl-form" onSubmit={submitPassword}>
						<span className={`wpl-input-wrap is-large${phase === 'wrong' ? ' is-shake' : ''}`}>
							<input
								ref={passwordRef}
								type="password"
								value={passcode}
								onChange={event => {
									setPasscode(event.target.value);
									if (error) setError('');
								}}
								placeholder={copy.password}
								aria-label={copy.password}
								autoComplete="off"
								dir="ltr"
								maxLength={PAGE_LOCK_MAX_LENGTH}
								disabled={blocked}
								readOnly={phase !== 'idle'}
								className="wpl-input"
							/>
						</span>
						{status ? <Message tone={tone === 'error' ? 'error' : 'ok'}>{status}</Message> : null}
						{error && !blocked && attemptsLeft != null && attemptsLeft > 0 ? (
							<p className="wpl-note">{copy.attemptsLeft.replace('{count}', String(attemptsLeft))}</p>
						) : null}
						<button type="submit" className="wpl-btn is-primary is-block" disabled={phase !== 'idle' || !passcode || blocked}>
							{phase === 'checking' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
							{copy.unlock}
						</button>
					</form>
				)}

				{view === 'unlock' ? (
					<div className="wpl-row-links">
						<button type="button" className="wpl-link" onClick={switchMode}>
							<KeyRound size={13} aria-hidden="true" />
							{mode === 'pin' ? copy.usePassword : copy.usePin}
						</button>
						<button type="button" className="wpl-link" onClick={() => setView('forgot')}>
							{copy.forgot}
						</button>
						{onLeave ? (
							<button type="button" className="wpl-link is-muted" onClick={onLeave}>
								<LogOut size={13} className="rtl:rotate-180" aria-hidden="true" />
								{copy.leave}
							</button>
						) : null}
					</div>
				) : null}
			</div>
		</div>,
		document.body,
	);
}

/* ─── Settings panel ─────────────────────────────────────────────── */

function Switch({ checked, onChange, label, disabled }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`wst-switch${checked ? ' is-on' : ''}`}
		>
			<span />
		</button>
	);
}

function SetupForm({ lock, copy, onNotice }) {
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');
	const [minutes, setMinutes] = useState(lock.status.autoLockMinutes || 5);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const options = PAGE_LOCK_AUTO_MINUTES.map(value => ({ value: String(value), label: copy.minutes[value] }));

	const submit = async event => {
		event.preventDefault();
		const problem = newPinProblem(next, confirm, copy);
		if (problem) return setError(problem);
		setBusy(true);
		setError('');
		try {
			await lock.setup(next, minutes);
			writePageLockMode('pin');
			setNext('');
			setConfirm('');
			onNotice(copy.saved);
		} catch (err) {
			setError(pageLockErrorDetails(err, copy.failed).message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<form className="wst-row is-stack" onSubmit={submit}>
			<div className="wst-row-text">
				<p className="wst-row-title">
					<KeyRound size={15} aria-hidden="true" />
					{copy.setupTitle}
				</p>
				<p className="wst-row-hint">{copy.setupHint}</p>
			</div>
			<div className="wpl-grid">
				<PinField id="wpl-setup-new" label={copy.newPin} value={next} onChange={setNext} />
				<PinField id="wpl-setup-confirm" label={copy.confirmPin} value={confirm} onChange={setConfirm} invalid={confirm.length === PAGE_LOCK_PIN_LENGTH && confirm !== next} />
				<label className="wpl-field">
					<span className="wpl-label">{copy.autoLock}</span>
					<WaCustomSelect
						ariaLabel={copy.autoLock}
						value={String(minutes)}
						onChange={value => setMinutes(Number(value))}
						options={options}
						buttonClassName="h-10 text-sm"
					/>
				</label>
			</div>
			<Message>{error}</Message>
			<div className="wpl-actions">
				<button type="submit" className="wst-btn is-primary" disabled={busy || !isPageLockPin(next) || !isPageLockPin(confirm)}>
					{busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
					{copy.turnOn}
				</button>
			</div>
		</form>
	);
}

function ChangeForm({ lock, copy, onNotice, onClose }) {
	const [current, setCurrent] = useState('');
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const submit = async event => {
		event.preventDefault();
		const problem = newPinProblem(next, confirm, copy);
		if (problem) return setError(problem);
		setBusy(true);
		setError('');
		try {
			await lock.change(current, next);
			writePageLockMode('pin');
			onNotice(copy.changed);
			onClose();
		} catch (err) {
			setError(pageLockErrorDetails(err, copy.failed).message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<form className="wpl-panel" onSubmit={submit}>
			<div className="wpl-grid">
				<PasswordField id="wpl-change-current" label={copy.currentPin} value={current} onChange={setCurrent} copy={copy} autoFocus />
				<PinField id="wpl-change-new" label={copy.newPin} value={next} onChange={setNext} />
				<PinField id="wpl-change-confirm" label={copy.confirmPin} value={confirm} onChange={setConfirm} invalid={confirm.length === PAGE_LOCK_PIN_LENGTH && confirm !== next} />
			</div>
			<Message>{error}</Message>
			<div className="wpl-actions">
				<button type="button" className="wst-btn is-ghost" onClick={onClose}>
					{copy.cancel}
				</button>
				<button type="submit" className="wst-btn is-primary" disabled={busy || !current || !isPageLockPin(next) || !isPageLockPin(confirm)}>
					{busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
					{copy.saveNew}
				</button>
			</div>
		</form>
	);
}

/** Asks for the current password before a sensitive action (turn off / remove). */
function ConfirmPasswordForm({ copy, title, actionLabel, danger, onConfirm, onClose }) {
	const [passcode, setPasscode] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const submit = async event => {
		event.preventDefault();
		setBusy(true);
		setError('');
		try {
			await onConfirm(passcode);
			onClose();
		} catch (err) {
			const details = pageLockErrorDetails(err, copy.failed);
			setError(details.lockedUntil ? copy.blocked.replace('{time}', formatPageLockCountdown(new Date(details.lockedUntil).getTime() - Date.now())) : details.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<form className="wpl-panel" onSubmit={submit}>
			<p className="wpl-panel-title">{title}</p>
			<PasswordField id="wpl-confirm-pass" label={copy.currentPassword} value={passcode} onChange={setPasscode} copy={copy} autoFocus />
			<Message>{error}</Message>
			<div className="wpl-actions">
				<button type="button" className="wst-btn is-ghost" onClick={onClose}>
					{copy.cancel}
				</button>
				<button type="submit" className={`wst-btn ${danger ? 'wpl-danger' : 'is-primary'}`} disabled={busy || !passcode}>
					{busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
					{actionLabel}
				</button>
			</div>
		</form>
	);
}

export function WhatsAppPageLockSettings({ lock, locale }) {
	const copy = pageLockCopy(locale);
	const { status } = lock;
	const [panel, setPanel] = useState(null);
	const [notice, setNotice] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const options = PAGE_LOCK_AUTO_MINUTES.map(value => ({ value: String(value), label: copy.minutes[value] }));

	useEffect(() => {
		if (!notice) return undefined;
		const timer = window.setTimeout(() => setNotice(''), 3500);
		return () => window.clearTimeout(timer);
	}, [notice]);

	const save = async patch => {
		setSaving(true);
		setError('');
		try {
			await lock.updateSettings(patch);
			setNotice(copy.saved);
		} catch (err) {
			setError(pageLockErrorDetails(err, copy.failed).message);
		} finally {
			setSaving(false);
		}
	};

	const togglePanel = id => {
		setError('');
		setPanel(current => (current === id ? null : id));
	};

	return (
		<section className="wst-section">
			<header className="wst-head">
				<span className="wst-icon" aria-hidden="true">
					<LockKeyhole size={18} />
				</span>
				<div className="wst-head-text">
					<h3>{copy.title}</h3>
					<p>{copy.description}</p>
				</div>
			</header>

			{!lock.loaded && !status.configured ? (
				<div className="wst-loading" role="status" aria-label={copy.loading}>
					<Loader2 size={20} className="animate-spin" aria-hidden="true" />
				</div>
			) : !status.configured ? (
				<div className="wst-rows">
					<SetupForm lock={lock} copy={copy} onNotice={setNotice} />
					{notice ? <Message tone="ok">{notice}</Message> : null}
				</div>
			) : (
				<div className="wst-rows">
					<div className={`wst-row wst-power${status.enabled ? ' is-on' : ''}`}>
						<div className="wst-row-text">
							<p className="wst-row-title">{copy.enabled}</p>
							<p className="wst-row-hint">{copy.enabledHint}</p>
						</div>
						<div className="wst-row-control">
							<span className={`wst-state${status.enabled ? ' is-on' : ''}`}>{status.enabled ? copy.on : copy.off}</span>
							<Switch
								label={copy.enabled}
								checked={status.enabled}
								disabled={saving}
								onChange={value => (value ? void save({ enabled: true }) : togglePanel('disable'))}
							/>
						</div>
					</div>
					{panel === 'disable' ? (
						<ConfirmPasswordForm
							copy={copy}
							title={copy.turnOffTitle}
							actionLabel={copy.turnOff}
							onConfirm={passcode => lock.updateSettings({ enabled: false, passcode }).then(() => setNotice(copy.saved))}
							onClose={() => setPanel(null)}
						/>
					) : null}

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<Clock3 size={15} aria-hidden="true" />
								{copy.autoLock}
							</p>
							<p className="wst-row-hint">{copy.autoLockHint}</p>
						</div>
						<div className="wst-row-control is-select">
							<WaCustomSelect
								ariaLabel={copy.autoLock}
								value={String(status.autoLockMinutes)}
								onChange={value => void save({ autoLockMinutes: Number(value) })}
								options={options}
								buttonClassName="h-10 min-w-44 text-sm"
							/>
						</div>
					</div>

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<MonitorOff size={15} aria-hidden="true" />
								{copy.lockOnHide}
							</p>
							<p className="wst-row-hint">{copy.lockOnHideHint}</p>
						</div>
						<div className="wst-row-control">
							<Switch label={copy.lockOnHide} checked={status.lockOnHide} disabled={saving} onChange={value => void save({ lockOnHide: value })} />
						</div>
					</div>

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<RefreshCw size={15} aria-hidden="true" />
								{copy.lockOnOpen}
							</p>
							<p className="wst-row-hint">{copy.lockOnOpenHint}</p>
						</div>
						<div className="wst-row-control">
							<Switch label={copy.lockOnOpen} checked={status.lockOnOpen} disabled={saving} onChange={value => void save({ lockOnOpen: value })} />
						</div>
					</div>

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<Lock size={15} aria-hidden="true" />
								{copy.lockNow}
							</p>
							<p className="wst-row-hint">{copy.lockNowHint}</p>
						</div>
						<div className="wst-row-control">
							<button type="button" className="wst-btn is-ghost" disabled={!status.enabled} onClick={() => lock.lockNow()}>
								<Lock size={15} aria-hidden="true" />
								{copy.lockNow}
							</button>
						</div>
					</div>

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<KeyRound size={15} aria-hidden="true" />
								{copy.change}
							</p>
							<p className="wst-row-hint">{copy.changeHint}</p>
						</div>
						<div className="wst-row-control">
							<button type="button" className="wst-btn is-ghost" aria-expanded={panel === 'change'} onClick={() => togglePanel('change')}>
								{copy.change}
							</button>
						</div>
					</div>
					{panel === 'change' ? <ChangeForm lock={lock} copy={copy} onNotice={setNotice} onClose={() => setPanel(null)} /> : null}

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<Mail size={15} aria-hidden="true" />
								{copy.forgot}
							</p>
							<p className="wst-row-hint">{copy.forgotHint}</p>
						</div>
						<div className="wst-row-control">
							<button type="button" className="wst-btn is-ghost" aria-expanded={panel === 'forgot'} onClick={() => togglePanel('forgot')}>
								{copy.reset}
							</button>
						</div>
					</div>
					{panel === 'forgot' ? (
						<div className="wpl-panel">
							<ForgotPasswordForm
								lock={lock}
								copy={copy}
								onCancel={() => setPanel(null)}
								onDone={message => {
									setNotice(message);
									setPanel(null);
								}}
							/>
						</div>
					) : null}

					<div className="wst-row">
						<div className="wst-row-text">
							<p className="wst-row-title">
								<Trash2 size={15} aria-hidden="true" />
								{copy.remove}
							</p>
							<p className="wst-row-hint">{copy.removeHint}</p>
						</div>
						<div className="wst-row-control">
							<button type="button" className="wst-btn is-ghost wpl-danger-text" aria-expanded={panel === 'remove'} onClick={() => togglePanel('remove')}>
								{copy.remove}
							</button>
						</div>
					</div>
					{panel === 'remove' ? (
						<ConfirmPasswordForm
							copy={copy}
							title={copy.removeHint}
							actionLabel={copy.removeConfirm}
							danger
							onConfirm={passcode => lock.remove(passcode).then(() => setNotice(copy.removed))}
							onClose={() => setPanel(null)}
						/>
					) : null}

					<div className="wst-row is-stack">
						<p className="wst-callout">
							<ShieldCheck size={14} aria-hidden="true" />
							<span>{copy.protectNote}</span>
						</p>
						<Message>{error}</Message>
						{notice ? <Message tone="ok">{notice}</Message> : null}
					</div>
				</div>
			)}
		</section>
	);
}
