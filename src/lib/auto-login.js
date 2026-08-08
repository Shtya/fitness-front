import { getDefaultPostLoginPath, resolvePostLoginPath, sanitizeReturnPath } from '@/lib/nav-access';

/**
 * Build one-click login URL:
 * /{locale}/auth/auto?email=...&password=...&next=...
 */
export function buildAutoLoginUrl({
	locale = 'ar',
	email,
	password,
	next,
	origin,
} = {}) {
	const base =
		origin ||
		(typeof window !== 'undefined' ? window.location.origin : '') ||
		process.env.NEXT_PUBLIC_WEBSITE_URL ||
		'';
	const loc = locale === 'en' ? 'en' : 'ar';
	const params = new URLSearchParams();
	if (email) params.set('email', String(email).trim());
	if (password) params.set('password', String(password));
	const dest = sanitizeReturnPath(next) || getDefaultPostLoginPath('client');
	params.set('next', dest);
	return `${base.replace(/\/$/, '')}/${loc}/auth/auto?${params.toString()}`;
}

/** Plain-text welcome / credentials message for WhatsApp / SMS / email */
export function buildWelcomeMessage({
	locale = 'ar',
	name,
	email,
	password,
	role,
	loginUrl,
	autoLoginUrl,
	next,
} = {}) {
	const isAr = locale === 'ar' || String(locale).startsWith('ar');
	const dest = sanitizeReturnPath(next) || '';
	const displayName = name || email || (isAr ? 'عزيزي' : 'there');

	if (isAr) {
		return [
			`مرحباً ${displayName} 👋`,
			``,
			`تم إنشاء حسابك بنجاح.`,
			role ? `الدور: ${role}` : null,
			`البريد: ${email || '—'}`,
			`كلمة المرور: ${password || '—'}`,
			dest ? `الصفحة بعد الدخول: ${dest}` : null,
			``,
			autoLoginUrl ? `رابط الدخول (يفتح نموذج جاهز بالإيميل وكلمة المرور):` : null,
			autoLoginUrl || null,
			``,
			loginUrl ? `أو سجّل الدخول من هنا:` : null,
			loginUrl || null,
			``,
			`يُفضّل تغيير كلمة المرور بعد أول دخول.`,
		]
			.filter((line) => line !== null)
			.join('\n');
	}

	return [
		`Hi ${displayName} 👋`,
		``,
		`Your account is ready.`,
		role ? `Role: ${role}` : null,
		`Email: ${email || '—'}`,
		`Password: ${password || '—'}`,
		dest ? `Opens after login: ${dest}` : null,
		``,
		autoLoginUrl ? `Login link (opens a form with email & password ready):` : null,
		autoLoginUrl || null,
		``,
		loginUrl ? `Or sign in here:` : null,
		loginUrl || null,
		``,
		`Please change your password after first login.`,
	]
		.filter((line) => line !== null)
		.join('\n');
}

export function resolveShareLandingPath(userLike, explicitNext) {
	const intended = sanitizeReturnPath(explicitNext);
	if (intended) return intended;
	return resolvePostLoginPath(userLike || { role: 'client' });
}
