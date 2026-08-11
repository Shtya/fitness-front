'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
	buildLastRouteHref,
	consumeRestoreTicket,
	isColdStartEntryPath,
	isRestorablePath,
	normalizeAppPath,
	readLastRoute,
} from '@/lib/last-route';

/**
 * Once per browser session: if the user lands on a cold-start entry
 * (`/`, `/dashboard`) and we have a saved route, send them there.
 * `/open` has its own preload page and is skipped here.
 */
export default function LastRouteRestorer() {
	const pathname = usePathname();
	const router = useRouter();
	const params = useParams();
	const locale = params?.locale === 'en' ? 'en' : 'ar';
	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) return;
		ran.current = true;

		const current = normalizeAppPath(pathname);
		if (current === '/open' || current.startsWith('/auth')) return;
		if (!isColdStartEntryPath(current)) return;

		if (!consumeRestoreTicket()) return;

		const saved = readLastRoute();
		if (!saved || !isRestorablePath(saved.path)) return;
		if (saved.path === current) return;

		const href = buildLastRouteHref(locale);
		if (!href) return;

		// next-intl router expects locale-less path
		router.replace(`${saved.path}${saved.search || ''}`);
	}, [pathname, locale, router]);

	return null;
}
