// /middleware.js
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

export const NAV_HREFS = {
  client: [
    // '/dashboard/my',
    '/dashboard/my/workouts',
    '/dashboard/my/progress',
    '/dashboard/my/nutrition',
    '/dashboard/reminders',
    '/dashboard/my/report',
    '/dashboard/calculator',
    '/dashboard/chat',
    '/dashboard/my/profile',
  ],
  coach: [
    '/dashboard/users',
    '/dashboard/workouts',
    '/dashboard/workouts/plans',
    '/dashboard/nutrition',
    '/dashboard/reports',
    '/dashboard/chat',
    '/dashboard/calculator',
  ],
  admin: [
    '/dashboard/users',
    '/dashboard/workouts',
    '/dashboard/workouts/plans',
    '/dashboard/nutrition',
    '/dashboard/intake/forms',
    '/dashboard/intake/responses',
    '/dashboard/chat',
    '/dashboard/calculator',
    '/dashboard/reports',
    '/dashboard/settings',
  ],
  super_admin: [
    '/dashboard',
    '/dashboard/super-admin/users',
    '/dashboard/workouts',
  ],
};

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

const LOCALES = ['en', 'ar'];
const UNAUTH_REDIRECT = '/auth';
const NO_ACCESS_REDIRECT = '/';

const PUBLIC_PREFIXES = [
  '/auth',
  '/public',
  // workouts plans public:
  /^\/workouts\/plans(?:\/|$)/,
];

function normalize(p) {
  if (!p) return '/';
  if (p !== '/' && p.endsWith('/')) return p.slice(0, -1);
  return p;
}
function getLocaleFromPath(pathname) {
  const seg = pathname.split('/').filter(Boolean);
  return seg.length && LOCALES.includes(seg[0]) ? seg[0] : null;
}
function stripLocale(pathname) {
  const seg = pathname.split('/').filter(Boolean);
  if (seg.length && LOCALES.includes(seg[0])) return '/' + seg.slice(1).join('/');
  return pathname || '/';
}
function withLocale(path, locale) {
  const p = normalize(path || '/');
  const l = locale || 'en';
  return `/${l}${p === '/' ? '' : p}`;
}
function matchesPublic(pathNoLocale) {
  const p = normalize(pathNoLocale);
  for (const pref of PUBLIC_PREFIXES) {
    if (pref instanceof RegExp) {
      if (pref.test(p)) return true;
    } else {
      const n = normalize(pref);
      if (p === n || p.startsWith(n + '/')) return true;
    }
  }
  return false;
}
function isPathAllowed(pathNoLocale, allowed) {
  const path = normalize(pathNoLocale);
  for (const a of allowed) {
    const x = normalize(a);
    if (path === x) return true;
    if (x !== '/' && path.startsWith(x + '/')) return true;
  }
  return false;
}
function readUserCookie(req) {
  const raw = req.cookies.get('user')?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default function middleware(req) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const currentLocale = getLocaleFromPath(pathname) || 'en';

  // Always remove locale before checks to avoid loops
  const pathNoLocale = stripLocale(pathname);

  // Public routes → allow and pass through next-intl
  if (matchesPublic(pathNoLocale)) {
    return intlMiddleware(req);
  }

  // Auth check via cookie
  const user = readUserCookie(req);
  const role = user?.role || null;

  if (!role) {
    const to = new URL(withLocale(UNAUTH_REDIRECT, currentLocale), req.url);
    to.searchParams.set('next', pathNoLocale);
    return NextResponse.redirect(to);
  }

  const allowed = NAV_HREFS[role] || [];
  if (!allowed.length) {
    return NextResponse.redirect(new URL(withLocale(NO_ACCESS_REDIRECT, currentLocale), req.url));
  }

  if (!isPathAllowed(pathNoLocale, allowed)) {
    const first = allowed[0] || NO_ACCESS_REDIRECT;
    return NextResponse.redirect(new URL(withLocale(first, currentLocale), req.url));
  }

  // All good → let next-intl finalize locale handling
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
