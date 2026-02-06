'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
 
const USER_LS_KEY = 'user';
const SESSION_FLAG_KEY = 'session:initial_role_redirect_done';

function roleToPath(role) {
	switch (role) {
		case 'client':
			return '/dashboard/my/workouts';
		case 'coach':
			return '/dashboard/users';
		case 'admin':
			return '/dashboard/users';
		default:
			return '/';
	}
}

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
 			if (sessionStorage.getItem(SESSION_FLAG_KEY) === '1') return;
			const raw = localStorage.getItem(USER_LS_KEY);
			if (!raw) return; 
			sessionStorage.setItem(USER_LS_KEY, raw); 
			sessionStorage.setItem(SESSION_FLAG_KEY, '1');

			const parsed = JSON.parse(raw);
			const role = parsed?.role;

			console.log(role);

			const target = roleToPath(role); 
			if (pathname === target || pathname.startsWith(target)) return;

			router.replace(target);
		} catch {
 		}
	}, [blocked, pathname, router]);
}
