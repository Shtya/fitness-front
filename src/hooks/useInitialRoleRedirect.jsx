'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const USER_LS_KEY = 'user';
const SESSION_FLAG_KEY = 'session:initial_client_redirect_done';

const CLIENT_TARGET = '/dashboard/my/workouts';

// don’t redirect from these routes
function isBlockedRoute(pathname) {
  return (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/site') ||
    pathname.startsWith('/form') ||
    pathname.startsWith('/thank-you') ||
    pathname.startsWith('/workouts/plans') ||
    pathname.includes('/dashboard/builder/preview')
  );
}

export function useInitialRoleRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  // avoid double-run in StrictMode dev
  const ranRef = useRef(false);

  const blocked = useMemo(() => isBlockedRoute(pathname), [pathname]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (blocked) return;

    try {
      // run only once per tab/session
      if (sessionStorage.getItem(SESSION_FLAG_KEY) === '1') return;

      const raw = localStorage.getItem(USER_LS_KEY);
      if (!raw) return;

      // (optional) keep user available in sessionStorage too
      sessionStorage.setItem(USER_LS_KEY, raw);

      const parsed = JSON.parse(raw);
      const role = parsed?.role;

      // ✅ only redirect if role is client
      if (role !== 'client') {
        sessionStorage.setItem(SESSION_FLAG_KEY, '1');
        return;
      }

      const target = CLIENT_TARGET;

      // already on (or under) the target
      if (pathname === target || pathname.startsWith(target)) {
        sessionStorage.setItem(SESSION_FLAG_KEY, '1');
        return;
      }

      sessionStorage.setItem(SESSION_FLAG_KEY, '1');
      router.replace(target);
    } catch {
      // ignore
    }
  }, [blocked, pathname, router]);
}
