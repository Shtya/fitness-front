/**
 * Shared nav access helpers (middleware + UI).
 * Keep in sync with Sidebar ITEM_META / NAV_HREFS.
 */

export const PAGE_HREFS_BY_ID = {
	overview_admin: ['/dashboard'],
	overview_client: ['/dashboard/my/stats'],
	overview_superadmin: ['/dashboard'],
	allUsers: ['/dashboard/users'],
	allUsers_super: ['/dashboard/super-admin/users'],
	manageForms: ['/dashboard/intake/forms'],
	responses: ['/dashboard/intake/responses'],
	forms_super: ['/dashboard/super-admin/forms'],
	feedback_super: ['/dashboard/super-admin/feedback'],
	allExercises: ['/dashboard/workouts'],
	allRecipes: ['/dashboard/recipes'],
	workoutPlans: ['/dashboard/workouts/plans'],
	mealPlans: ['/dashboard/nutrition'],
	reports: ['/dashboard/reports'],
	myWorkouts: ['/dashboard/my/workouts'],
	myNutrition: ['/dashboard/my/nutrition'],
	recipes: ['/dashboard/my/recipes'],
	weeklyStrength: ['/dashboard/my/report'],
	myReminders: ['/dashboard/reminders'],
	todos: ['/workspace'],
	calendar: ['/workspace'],
	messages: ['/dashboard/chat'],
	whatsapp: ['/dashboard/whatsapp'],
	transcript: ['/dashboard/transcript'],
	calorieCalculator: ['/dashboard/calculator'],
	aiFree: ['/dashboard/ai-free'],
	quranRevision: ['/dashboard/quran-revision'],
	phoneCheck: ['/dashboard/phone-check'],
	fitnessLeads: ['/dashboard/fitness-leads'],
	metaWhatsApp: ['/dashboard/meta-whatsapp'],
	notifications: ['/dashboard/notifications'],
	billing: [
		'/dashboard/billing',
		'/dashboard/billing/transactions',
		'/dashboard/billing/subscriptions',
		'/dashboard/billing/withdraw',
		'/dashboard/billing/client-payments',
		'/dashboard/billing/analytics',
		'/dashboard/billing/withdrawal-approvals',
		'/dashboard/billing/all-wallets',
	],
	money: ['/money'],
	profile_admin: ['/dashboard/my-account'],
	branding: ['/dashboard/settings', '/dashboard/settings/branding'],
	profile_client: ['/dashboard/my/profile'],
};

/** Role allowlists (paths). Super-admin includes forms/feedback used in Sidebar. */
export const NAV_HREFS = {
	client: [
		'/dashboard/my/stats',
		'/dashboard/my/workouts',
		'/dashboard/my/progress',
		'/dashboard/my/nutrition',
		'/dashboard/reminders',
		'/dashboard/my/report',
		'/dashboard/calculator',
		'/dashboard/chat',
		'/dashboard/transcript',
		'/dashboard/quran-revision',
		'/dashboard/my/profile',
		'/dashboard/phone-check',
		'/dashboard/ai-free',
		'/money',
		'/workspace',
	],
	coach: [
		'/dashboard/users',
		'/dashboard/workouts',
		'/dashboard/workouts/plans',
		'/dashboard/nutrition',
		'/dashboard/reports',
		'/dashboard/chat',
		'/dashboard/whatsapp',
		'/dashboard/meta-whatsapp',
		'/dashboard/transcript',
		'/dashboard/calculator',
		'/dashboard/my-account',
		'/dashboard/intake/forms',
		'/dashboard/intake/responses',
		'/dashboard/phone-check',
		'/dashboard/fitness-leads',
		'/dashboard/ai-free',
		'/dashboard/quran-revision',
		'/dashboard/recipes',
		'/dashboard/notifications',
		'/workspace',
	],
	admin: [
		'/dashboard',
		'/dashboard/users',
		'/dashboard/workouts',
		'/dashboard/workouts/plans',
		'/dashboard/nutrition',
		'/dashboard/intake/forms',
		'/dashboard/intake/responses',
		'/dashboard/chat',
		'/dashboard/whatsapp',
		'/dashboard/meta-whatsapp',
		'/dashboard/transcript',
		'/dashboard/calculator',
		'/dashboard/reports',
		'/dashboard/settings',
		'/dashboard/settings/branding',
		'/dashboard/billing',
		'/dashboard/billing/transactions',
		'/dashboard/billing/subscriptions',
		'/dashboard/billing/withdraw',
		'/dashboard/billing/client-payments',
		'/dashboard/templates',
		'/dashboard/my-account',
		'/dashboard/phone-check',
		'/dashboard/fitness-leads',
		'/dashboard/ai-free',
		'/dashboard/quran-revision',
		'/dashboard/recipes',
		'/dashboard/notifications',
		'/money',
		'/workspace',
	],
	super_admin: [
		'/dashboard',
		'/dashboard/super-admin/users',
		'/dashboard/super-admin/forms',
		'/dashboard/super-admin/feedback',
		'/dashboard/workouts',
		'/dashboard/whatsapp',
		'/dashboard/meta-whatsapp',
		'/dashboard/transcript',
		'/dashboard/billing',
		'/dashboard/billing/analytics',
		'/dashboard/billing/withdrawal-approvals',
		'/dashboard/billing/all-wallets',
		'/dashboard/phone-check',
		'/dashboard/fitness-leads',
		'/dashboard/ai-free',
		'/dashboard/quran-revision',
		'/workspace',
	],
};

/**
 * Effective path allowlist for a user.
 * - No allowedPages / empty → full role list
 * - Non-empty allowedPages → only mapped hrefs for those ids ( ∩ role list)
 */
export function getEffectiveNavHrefs(role, allowedPages) {
	const roleHrefs = NAV_HREFS[role] || [];
	if (!Array.isArray(allowedPages) || allowedPages.length === 0) return roleHrefs;

	const fromIds = new Set();
	for (const id of allowedPages) {
		const hrefs = PAGE_HREFS_BY_ID[id];
		if (hrefs) hrefs.forEach((h) => fromIds.add(h));
	}
	if (!fromIds.size) return roleHrefs;

	// Prefer intersection with role list; keep id-mapped paths that are clearly under dashboard/workspace
	const roleSet = new Set(roleHrefs);
	const intersect = [...fromIds].filter((h) => roleSet.has(h));
	return intersect.length ? intersect : [...fromIds];
}

/** Role defaults when loginLandingPage is not set */
export function getDefaultPostLoginPath(role) {
	const r = String(role || '').toLowerCase();
	if (r === 'super_admin') return '/dashboard/super-admin/users';
	if (r === 'admin' || r === 'coach') return '/dashboard/users';
	if (r === 'client') return '/dashboard/my/workouts';
	return '/dashboard/users';
}

/**
 * Safe relative return path from ?next= / ?redirect= (blocks open redirects).
 * Accepts "/dashboard/quran-revision" or with query/hash.
 */
export function sanitizeReturnPath(raw) {
	if (!raw || typeof raw !== 'string') return null;
	let value = raw.trim();
	try {
		value = decodeURIComponent(value);
	} catch {
		/* keep raw */
	}
	if (!value.startsWith('/')) return null;
	if (value.startsWith('//')) return null;
	if (value.includes('://')) return null;
	// Strip locale prefix if somehow included
	const noLocale = value.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
	const normalized = noLocale.startsWith('/') ? noLocale : `/${noLocale}`;
	if (normalized === '/auth' || normalized.startsWith('/auth?') || normalized.startsWith('/auth/')) {
		return null;
	}
	return normalized;
}

function pathMatchesAllowlist(pathWithQuery, allowed) {
	const pathOnly = normalizePathOnly(pathWithQuery);
	for (const a of allowed) {
		const x = normalizePathOnly(a);
		if (pathOnly === x) return true;
		if (x !== '/' && pathOnly.startsWith(x + '/')) return true;
	}
	return false;
}

function normalizePathOnly(p) {
	if (!p) return '/';
	const path = String(p).split('?')[0].split('#')[0];
	if (path !== '/' && path.endsWith('/')) return path.slice(0, -1);
	return path || '/';
}

/**
 * Resolve post-login path for a user object.
 * Priority:
 * 1) intended return URL (?next / deep link) if user is allowed to open it
 * 2) loginLandingPage (nav id) when set & allowed
 * 3) role default, else first allowed href
 */
export function resolvePostLoginPath(user, intendedPath) {
	if (!user) return getDefaultPostLoginPath('client');
	const role = String(user.role || '').toLowerCase();
	const allowed = getEffectiveNavHrefs(role, user.allowedPages);

	const intended = sanitizeReturnPath(intendedPath);
	if (intended && pathMatchesAllowlist(intended, allowed)) {
		return intended;
	}

	const landingId = user.loginLandingPage ? String(user.loginLandingPage).trim() : '';
	if (landingId) {
		const restricted = Array.isArray(user.allowedPages) && user.allowedPages.length > 0;
		if (!restricted || user.allowedPages.includes(landingId)) {
			const hrefs = PAGE_HREFS_BY_ID[landingId];
			if (hrefs?.[0]) return hrefs[0];
		}
	}

	const fallback = getDefaultPostLoginPath(role);
	if (allowed.some((h) => fallback === h || fallback.startsWith(h + '/'))) return fallback;
	return allowed[0] || fallback;
}

/** @deprecated Compact top-nav by page count is disabled — desktop uses sidebar; mobile uses header. */
export const COMPACT_NAV_PAGE_THRESHOLD = 5;

/**
 * Always false: navigation chrome is responsive (sidebar desktop / header mobile),
 * not driven by allowedPages length.
 */
export function shouldUseCompactTopNav(_allowedPages) {
	return false;
}

export function getAllowedPagesCount(allowedPages) {
	return Array.isArray(allowedPages) ? allowedPages.length : 0;
}
