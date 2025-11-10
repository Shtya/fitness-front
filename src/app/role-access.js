// src/app/role-access.js
'use client';

import { useEffect, useMemo, useState, useCallback, useLayoutEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

export const LS_KEY = 'user';

/* ---------------- localStorage helpers ---------------- */
export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (typeof window === 'undefined') return;
  if (user == null) {
    window.localStorage.removeItem(LS_KEY);
  } else {
    window.localStorage.setItem(LS_KEY, JSON.stringify(user));
  }
  // same-tab notify (storage doesn't fire in same tab)
  window.dispatchEvent(new Event('app:user-updated'));
}

/* ---------------- NAV utilities ---------------- */
function normalize(p) {
  if (!p) return '';
  if (p === '/') return '/';
  return p.endsWith('/') ? p.slice(0, -1) : p;
}

function collectHrefs(items, out = []) {
  for (const it of items || []) {
    if (it.href) out.push(it.href);
    if (it.children?.length) collectHrefs(it.children, out);
  }
  return out;
}

export function allowedPathsFromNAV(NAV, role) {
  if (!role) return [];
  const sections = (NAV || []).filter(s => s.role === role);
  const hrefs = [];
  sections.forEach(s => collectHrefs(s.items, hrefs));
  return Array.from(new Set(hrefs.map(normalize)));
}

export function filterNAVByRole(NAV, role) {
  if (!role) return [];
  return (NAV || []).filter(s => s.role === role);
}

export function isPathAllowed(pathname, allowed) {
  const path = normalize(pathname);
  for (const a of allowed) {
    const x = normalize(a);
    if (path === x) return true;
    if (x !== '/' && path.startsWith(x + '/')) return true;
  }
  return false;
}

/* ---------------- useAuthRole (hydration-safe) ---------------- */
export function useAuthRole() {
  // 1) instant read before paint to avoid a "null" flash
  const [hydrated, setHydrated] = useState(false);
  const [user, setUserState] = useState(null);

  useLayoutEffect(() => {
    const u = getStoredUser();
    setUserState(u);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onStorage = e => {
      if (e.key && e.key !== LS_KEY) return;
      setUserState(getStoredUser());
    };
    const onLocal = () => setUserState(getStoredUser());

    window.addEventListener('storage', onStorage);
    window.addEventListener('app:user-updated', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('app:user-updated', onLocal);
    };
  }, []);

  const setUser = useCallback(next => {
    setStoredUser(next);
    setUserState(next);
  }, []);

  const role = user?.role || null;
  return { user, role, setUser, hydrated };
}

/* ---------------- Pretty loading UI ---------------- */
function CheckingAccessSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      {/* Soft glow accent */}
      <div
        aria-hidden
        className="absolute -z-10 h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-sky-400/20 via-emerald-400/15 to-indigo-400/25 blur-3xl"
      />

      {/* Spinner */}
      <div className="relative h-16 w-16">
        <div
          className="h-full w-full rounded-full border-[5px] border-transparent animate-spin"
          style={{
            background:
              'conic-gradient(from 0deg, #0ea5e9, #22d3ee, #10b981, #0ea5e9)',
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 6px), black 0)',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), black 0)',
          }}
        ></div>
        <div className="absolute inset-[6px] rounded-full bg-white/90 backdrop-blur-sm" />
      </div>
 
    </div>
  );
}

/* ---------------- RouteGuard ---------------- */
export function RouteGuard({
  NAV,
  unauthRedirect = '/auth',
  noAccessRedirect = '/',
  loading = <CheckingAccessSkeleton />,
  publicPrefixes = [], // e.g., ['/auth', '/public']
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, hydrated } = useAuthRole();

  // make sure unauthRedirect is treated as public automatically
  const effectivePublic = useMemo(() => {
    const base = Array.isArray(publicPrefixes) ? publicPrefixes.slice() : [];
    if (!base.includes(unauthRedirect)) base.push(unauthRedirect);
    return base;
  }, [publicPrefixes, unauthRedirect]);

  const isPublic = useMemo(() => {
    const p = normalize(pathname || '/');
    return effectivePublic.some(pref => {
      const n = normalize(pref);
      return p === n || p.startsWith(n + '/');
    });
  }, [pathname, effectivePublic]);

  const allowed = useMemo(() => allowedPathsFromNAV(NAV, role), [NAV, role]);
  const firstAllowed = allowed[0];

  const doReplace = useCallback(
    to => {
      const current = normalize(pathname || '/');
      const target = normalize(to);
      if (current !== target) router.replace(to);
    },
    [pathname, router],
  );

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait until we have read localStorage at least once
    if (!hydrated || !pathname) return;

    // Public routes are always accessible
    if (isPublic) {
      setChecking(false);
      return;
    }

    // No role → go to login, but don't loop if we are already there
    if (!role) {
      if (normalize(pathname) !== normalize(unauthRedirect)) {
        doReplace(unauthRedirect);
      }
      setChecking(false);
      return;
    }

    // Role has no pages → send to fallback (avoid loop)
    if (!allowed.length) {
      if (normalize(pathname) !== normalize(noAccessRedirect)) {
        doReplace(noAccessRedirect);
      }
      setChecking(false);
      return;
    }

    // Path not allowed → go to first allowed
    if (!isPathAllowed(pathname, allowed)) {
      doReplace(firstAllowed);
      setChecking(false);
      return;
    }

    setChecking(false);
  }, [hydrated, pathname, role, allowed, firstAllowed, isPublic, unauthRedirect, noAccessRedirect, doReplace]);

  if (checking) return loading;
  return children;
}

/* ---------------- Helpers for login/logout ---------------- */
export function loginPersist(userLikeObject) {
  // Always use this after you get your user/role
  setStoredUser(userLikeObject);
}

export function logoutClear() {
  setStoredUser(null);
}
