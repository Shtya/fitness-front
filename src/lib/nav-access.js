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
	pageAccess_super: ['/dashboard/super-admin/page-access'],
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
	bodyMeasurement: ['/dashboard/my/profile/body-measurements'],
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
	readingRoom: ['/ai-studio'],
	learning: ['/dashboard/learning'],
	learningManagement: ['/dashboard/learning/management'],
	learningStudy: ['/dashboard/learning/study'],
	quranRevision: ['/dashboard/quran-revision'],
	webTranslator: ['/dashboard/web-translator'],
	siteInspector: ['/dashboard/site-inspector'],
	phoneCheck: ['/dashboard/phone-check'],
	fitnessLeads: ['/dashboard/fitness-leads'],
	metaWhatsApp: ['/dashboard/meta-whatsapp'],
	facebookEngagement: ['/dashboard/facebook-engagement'],
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
		'/dashboard/my/profile/body-measurements',
		'/dashboard/my/nutrition',
		'/dashboard/reminders',
		'/dashboard/my/report',
		'/dashboard/calculator',
		'/dashboard/chat',
		'/dashboard/transcript',
		'/dashboard/quran-revision',
		'/dashboard/web-translator',
		'/dashboard/site-inspector',
		'/dashboard/my/profile',
		'/dashboard/phone-check',
		'/dashboard/ai-free',
		'/ai-studio',
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
		'/dashboard/facebook-engagement',
		'/dashboard/transcript',
		'/dashboard/calculator',
		'/dashboard/my-account',
		'/dashboard/intake/forms',
		'/dashboard/intake/responses',
		'/dashboard/phone-check',
		'/dashboard/fitness-leads',
		'/dashboard/ai-free',
		'/dashboard/quran-revision',
		'/dashboard/web-translator',
		'/dashboard/site-inspector',
		'/dashboard/recipes',
		'/dashboard/notifications',
		'/ai-studio',
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
		'/dashboard/facebook-engagement',
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
		'/dashboard/web-translator',
		'/dashboard/site-inspector',
		'/dashboard/recipes',
		'/dashboard/notifications',
		'/ai-studio',
		'/money',
		'/workspace',
	],
	super_admin: [
		'/dashboard',
		'/dashboard/super-admin/users',
		'/dashboard/super-admin/page-access',
		'/dashboard/super-admin/forms',
		'/dashboard/super-admin/feedback',
		'/dashboard/workouts',
		'/dashboard/whatsapp',
		'/dashboard/meta-whatsapp',
		'/dashboard/facebook-engagement',
		'/dashboard/transcript',
		'/dashboard/billing',
		'/dashboard/billing/analytics',
		'/dashboard/billing/withdrawal-approvals',
		'/dashboard/billing/all-wallets',
		'/dashboard/phone-check',
		'/dashboard/fitness-leads',
		'/dashboard/ai-free',
		'/dashboard/quran-revision',
		'/dashboard/web-translator',
		'/dashboard/site-inspector',
		'/ai-studio',
		'/workspace',
	],
};

/* ─── Page modes (super admin → Page access) ──────────────────── */

export const PAGE_MODES = ['default', 'optional', 'locked'];
export const MANAGED_PAGE_ROLES = ['admin', 'coach', 'client'];

/** Never lockable: every role must keep a home and an account page. */
export const REQUIRED_PAGE_IDS = [
	'overview_admin',
	'overview_client',
	'overview_superadmin',
	'allUsers_super',
	'profile_admin',
	'profile_client',
];

/** Sidebar children; a locked parent locks its children too. */
export const PAGE_PARENT_BY_ID = {
	manageForms: 'clientIntake',
	responses: 'clientIntake',
	learningManagement: 'learning',
	learningStudy: 'learning',
};

function isRequiredPage(page) {
	return !!page?.required || REQUIRED_PAGE_IDS.includes(page?.id);
}

/** Mode when the super admin has not configured the page. */
export function codePageMode(page) {
	if (isRequiredPage(page)) return 'default';
	return page?.marketplace ? 'optional' : 'default';
}

function ownPageMode(page, access) {
	if (isRequiredPage(page)) return 'default';
	if (access?.extraPages?.includes(page.id)) return 'default';
	if (access?.lockedPages?.includes(page.id)) return 'locked';
	const roleMode = access?.roleModes?.[page.id];
	return PAGE_MODES.includes(roleMode) ? roleMode : codePageMode(page);
}

/**
 * Effective mode for one page. `access` is the `/auth/me` `pageAccess`
 * payload ({ roleModes, extraPages, lockedPages }).
 */
export function resolvePageMode(page, access) {
	const parentId = page?.parentId ?? PAGE_PARENT_BY_ID[page?.id];
	if (parentId && ownPageMode({ id: parentId }, access) === 'locked') return 'locked';
	return ownPageMode(page, access);
}

function legacyAllowSet(allowedPages) {
	return Array.isArray(allowedPages) && allowedPages.length > 0 ? new Set(allowedPages) : null;
}

function legacyItem(item, allow) {
	const selfOk = allow.has(item.id);
	const kids = (item.children || []).filter((c) => allow.has(c.id));
	if (!selfOk && !kids.length) return null;
	const next = { ...item, required: true, marketplace: false };
	if (item.children) next.children = kids.length ? kids : item.children;
	return next;
}

function accessItem(item, access) {
	const mode = resolvePageMode(item, access);
	if (mode === 'locked') return null;
	const next = { ...item, marketplace: mode === 'optional' };
	if (item.children) {
		const kids = item.children.filter((c) => resolvePageMode({ ...c, parentId: item.id }, access) !== 'locked');
		if (!kids.length && !item.href) return null;
		if (kids.length) next.children = kids;
		else delete next.children;
	}
	return next;
}

/**
 * Sidebar sections after page access:
 * - legacy allowedPages → allowlist (shown, ignores local hide/marketplace)
 * - otherwise locked pages removed; optional pages become Marketplace items
 */
export function applyPageAccessToSections(sections, user) {
	if (!Array.isArray(sections)) return sections;
	const allow = legacyAllowSet(user?.allowedPages);
	const access = user?.pageAccess;
	return sections
		.map((section) => ({
			...section,
			items: (section.items || [])
				.map((item) => (allow ? legacyItem(item, allow) : accessItem(item, access)))
				.filter(Boolean),
		}))
		.filter((section) => section.items.length);
}

const HREF_OWNERS = (() => {
	const owners = new Map();
	for (const [id, hrefs] of Object.entries(PAGE_HREFS_BY_ID)) {
		for (const href of hrefs) {
			const key = normalizePathOnly(href);
			owners.set(key, [...(owners.get(key) || []), id]);
		}
	}
	return owners;
})();

/**
 * True when the most specific page owning `path` is locked for every id that
 * owns it (e.g. /workspace needs both todos and calendar locked).
 */
export function isPathLocked(path, locked) {
	if (!Array.isArray(locked) || !locked.length) return false;
	const lockedSet = new Set(locked.filter((id) => !REQUIRED_PAGE_IDS.includes(id)));
	for (const [childId, parentId] of Object.entries(PAGE_PARENT_BY_ID)) {
		if (lockedSet.has(parentId)) lockedSet.add(childId);
	}
	const target = normalizePathOnly(path);
	let best = null;
	for (const href of HREF_OWNERS.keys()) {
		const matches = target === href || (href !== '/' && target.startsWith(href + '/'));
		if (matches && (!best || href.length > best.length)) best = href;
	}
	return !!best && HREF_OWNERS.get(best).every((id) => lockedSet.has(id));
}

/**
 * Effective path allowlist for a user.
 * - No allowedPages / empty → full role list
 * - Non-empty allowedPages → only mapped hrefs for those ids ( ∩ role list)
 * - Locked pages (page access) are removed
 */
export function getEffectiveNavHrefs(role, allowedPages, locked) {
	const roleHrefs = (NAV_HREFS[role] || []).filter((h) => !isPathLocked(h, locked));
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
	const locked = user.pageAccess?.locked;
	const allowed = getEffectiveNavHrefs(role, user.allowedPages, locked);

	const intended = sanitizeReturnPath(intendedPath);
	if (intended && pathMatchesAllowlist(intended, allowed) && !isPathLocked(intended, locked)) {
		return intended;
	}

	const landingId = user.loginLandingPage ? String(user.loginLandingPage).trim() : '';
	if (landingId) {
		const restricted = Array.isArray(user.allowedPages) && user.allowedPages.length > 0;
		const href = PAGE_HREFS_BY_ID[landingId]?.[0];
		if (href && (!restricted || user.allowedPages.includes(landingId)) && !isPathLocked(href, locked)) {
			return href;
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
