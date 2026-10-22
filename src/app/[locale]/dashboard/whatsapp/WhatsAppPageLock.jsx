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
	LockKeyhole,
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
	formatPageLockCountdown,
	isPageLockIdleExpired,
	normalizePageLockStatus,
	pageLockErrorDetails,
	pageLockPasscodeError,
	readPageLockHint,
	readPageLockSession,
	shouldStartPageLocked,
	writePageLockHint,
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
		setupTitle: 'Set a page lock password',
		setupHint: 'Pick a password or PIN only you know. You will need it to open WhatsApp here.',
		turnOn: 'Turn on page lock',
		enabled: 'Page lock',
		enabledHint: 'Show the lock screen before the WhatsApp page.',
		on: 'On',
		off: 'Off',
		autoLock: 'Lock automatically after',
		autoLockHint: 'Locks the page when nobody uses it for this long.',
		minutes: { 0: 'Never (no idle timer)', 1: '1 minute', 5: '5 minutes', 15: '15 minutes', 30: '30 minutes', 60: '1 hour', 240: '4 hours' },
		lockOnHide: 'Lock when I leave the tab',
		lockOnHideHint: 'Locks as soon as you switch tabs or minimize the browser.',
		lockOnOpen: 'Ask every time I open WhatsApp',
		lockOnOpenHint: 'Also locks after a page reload, even if you were active.',
		lockNow: 'Lock now',
		lockNowHint: 'Shortcut: Ctrl + Alt + L',
		change: 'Change password',
		changeHint: 'Enter your current password, then the new one.',
		saveNew: 'Save new password',
		changed: 'Password changed.',
		forgotTitle: 'Reset your page lock password',
		forgotHint: 'Prove it is you, then pick a new password.',
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
		setupTitle: 'عيّن كلمة سر لقفل الصفحة',
		setupHint: 'اختر كلمة سر أو رقمًا سريًا تعرفه أنت فقط. ستحتاجه لفتح واتساب هنا.',
		turnOn: 'تفعيل قفل الصفحة',
		enabled: 'قفل الصفحة',
		enabledHint: 'إظهار شاشة القفل قبل صفحة واتساب.',
		on: 'مفعّل',
		off: 'متوقف',
		autoLock: 'القفل تلقائيًا بعد',
		autoLockHint: 'تُقفل الصفحة إذا لم يستخدمها أحد طوال هذه المدة.',
		minutes: { 0: 'أبدًا (بدون مؤقت)', 1: 'دقيقة', 5: '5 دقائق', 15: '15 دقيقة', 30: '30 دقيقة', 60: 'ساعة', 240: '4 ساعات' },
		lockOnHide: 'القفل عند مغادرة التبويب',
		lockOnHideHint: 'تُقفل فور التبديل لتبويب آخر أو تصغير المتصفح.',
		lockOnOpen: 'اطلب كلمة السر كل مرة أفتح واتساب',
		lockOnOpenHint: 'تُقفل أيضًا بعد إعادة تحميل الصفحة حتى لو كنت نشطًا.',
		lockNow: 'اقفل الآن',
		lockNowHint: 'الاختصار: Ctrl + Alt + L',
		change: 'تغيير كلمة السر',
		changeHint: 'اكتب كلمة السر الحالية ثم الجديدة.',
		saveNew: 'حفظ كلمة السر الجديدة',
		changed: 'تم تغيير كلمة السر.',
		forgotTitle: 'إعادة تعيين كلمة سر القفل',
		forgotHint: 'أثبت أنك صاحب الحساب ثم اختر كلمة سر جديدة.',
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
 * Page lock state for the WhatsApp workspace. The server owns the password and wrong-try limits;
 * this tab remembers that it was unlocked (sessionStorage) and re-locks on idle / tab switch / open.
 */
export function useWhatsAppPageLock({ active = true } = {}) {
	const [status, setStatus] = useState(() => readPageLockHint() || normalizePageLockStatus(null));
	const [loaded, setLoaded] = useState(false);
	const [locked, setLocked] = useState(() =>
		active ? shouldStartPageLocked(readPageLockHint(), readPageLockSession(), Date.now()) : false,
	);
	const statusRef = useRef(status);
	const lockedRef = useRef(locked);
	const lastActivity = useRef(readPageLockSession()?.lastActivity || Date.now());
	const lastWrite = useRef(0);
	const unlockedHere = useRef(false);
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
				if (!unlockedHere.current) setLocked(shouldStartPageLocked(next, readPageLockSession(), Date.now()));
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
				if (statusRef.current.lockOnHide) lockNow();
			} else {
				checkIdle();
			}
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

	const unlock = useCallback(
		async passcode => {
			const { data } = await api.post('/whatsapp/page-lock/verify', { passcode });
			applyStatus(data);
			markUnlocked();
		},
		[applyStatus, markUnlocked],
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

function newPasswordProblem(next, confirm, copy) {
	return pageLockPasscodeError(next, copy) || (next !== confirm ? copy.mismatch : '');
}

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
		const problem = newPasswordProblem(next, confirm, copy);
		if (problem) return setError(problem);
		setBusy(true);
		setError('');
		try {
			if (method === 'email') await lock.resetWithCode(code.trim(), next);
			else await lock.resetWithAccountPassword(accountPassword, next);
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
					<PasswordField id="wpl-reset-new" label={copy.newPassword} value={next} onChange={setNext} copy={copy} autoComplete="new-password" />
					<PasswordField id="wpl-reset-confirm" label={copy.confirmPassword} value={confirm} onChange={setConfirm} copy={copy} autoComplete="new-password" />
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
						disabled={busy || !next || !confirm || (method === 'email' ? code.length !== 6 : !accountPassword)}
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

export function WhatsAppPageLockScreen({ lock, locale, onLeave }) {
	const copy = pageLockCopy(locale);
	const [view, setView] = useState('unlock');
	const [passcode, setPasscode] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [attemptsLeft, setAttemptsLeft] = useState(null);
	const [blockedUntil, setBlockedUntil] = useState(lock.status.lockedUntil);
	const blockedLeft = useCountdown(blockedUntil);
	const inputRef = useRef(null);

	useEffect(() => {
		setBlockedUntil(lock.status.lockedUntil);
	}, [lock.status.lockedUntil]);

	useEffect(() => {
		if (!lock.locked) return undefined;
		const root = document.documentElement;
		root.classList.add('wa-page-locked');
		return () => root.classList.remove('wa-page-locked');
	}, [lock.locked]);

	if (!lock.locked || typeof document === 'undefined') return null;

	const submit = async event => {
		event.preventDefault();
		if (!passcode || busy || blockedLeft > 0) return;
		setBusy(true);
		setError('');
		try {
			await lock.unlock(passcode);
			setPasscode('');
			setAttemptsLeft(null);
		} catch (err) {
			const details = pageLockErrorDetails(err, copy.failed);
			setPasscode('');
			if (details.lockedUntil) {
				setBlockedUntil(details.lockedUntil);
				setError('');
			} else {
				setError(details.status === 400 && details.attemptsLeft != null ? copy.wrong : details.message);
				setAttemptsLeft(details.attemptsLeft);
			}
			window.setTimeout(() => inputRef.current?.focus(), 0);
		} finally {
			setBusy(false);
		}
	};

	return createPortal(
		<div className="wpl-screen" role="dialog" aria-modal="true" aria-labelledby="wpl-title" dir={copy === COPY.ar ? 'rtl' : 'ltr'}>
			<div className="wpl-card">
				<span className="wpl-glyph" aria-hidden="true">
					<LockKeyhole size={26} strokeWidth={1.9} />
				</span>
				<h2 id="wpl-title" className="wpl-title">
					{view === 'unlock' ? copy.lockedTitle : copy.forgotTitle}
				</h2>
				<p className="wpl-sub">{view === 'unlock' ? copy.lockedHint : copy.forgotHint}</p>

				{view === 'unlock' ? (
					<form className="wpl-form" onSubmit={submit}>
						<span className="wpl-input-wrap is-large">
							<input
								ref={inputRef}
								type="password"
								value={passcode}
								onChange={event => setPasscode(event.target.value)}
								placeholder={copy.password}
								aria-label={copy.password}
								autoComplete="off"
								autoFocus
								dir="ltr"
								maxLength={PAGE_LOCK_MAX_LENGTH}
								disabled={blockedLeft > 0}
								className="wpl-input"
							/>
						</span>
						{blockedLeft > 0 ? (
							<Message>{copy.blocked.replace('{time}', formatPageLockCountdown(blockedLeft))}</Message>
						) : (
							<>
								<Message>{error}</Message>
								{error && attemptsLeft != null && attemptsLeft > 0 ? (
									<p className="wpl-note">{copy.attemptsLeft.replace('{count}', String(attemptsLeft))}</p>
								) : null}
							</>
						)}
						<button type="submit" className="wpl-btn is-primary is-block" disabled={busy || !passcode || blockedLeft > 0}>
							{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
							{copy.unlock}
						</button>
						<div className="wpl-row-links">
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
					</form>
				) : (
					<ForgotPasswordForm lock={lock} copy={copy} onCancel={() => setView('unlock')} onDone={() => setView('unlock')} />
				)}
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
		const problem = newPasswordProblem(next, confirm, copy);
		if (problem) return setError(problem);
		setBusy(true);
		setError('');
		try {
			await lock.setup(next, minutes);
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
				<PasswordField id="wpl-setup-new" label={copy.newPassword} value={next} onChange={setNext} copy={copy} autoComplete="new-password" />
				<PasswordField id="wpl-setup-confirm" label={copy.confirmPassword} value={confirm} onChange={setConfirm} copy={copy} autoComplete="new-password" />
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
				<button type="submit" className="wst-btn is-primary" disabled={busy || !next || !confirm}>
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
		const problem = newPasswordProblem(next, confirm, copy);
		if (problem) return setError(problem);
		setBusy(true);
		setError('');
		try {
			await lock.change(current, next);
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
				<PasswordField id="wpl-change-current" label={copy.currentPassword} value={current} onChange={setCurrent} copy={copy} autoFocus />
				<PasswordField id="wpl-change-new" label={copy.newPassword} value={next} onChange={setNext} copy={copy} autoComplete="new-password" />
				<PasswordField id="wpl-change-confirm" label={copy.confirmPassword} value={confirm} onChange={setConfirm} copy={copy} autoComplete="new-password" />
			</div>
			<Message>{error}</Message>
			<div className="wpl-actions">
				<button type="button" className="wst-btn is-ghost" onClick={onClose}>
					{copy.cancel}
				</button>
				<button type="submit" className="wst-btn is-primary" disabled={busy || !current || !next || !confirm}>
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
