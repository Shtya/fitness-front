'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { saveLastRoute } from '@/lib/last-route';

/** Keeps the last dashboard route so reopen can restore it. */
export default function LastRouteTracker() {
	const pathname = usePathname();
	const params = useParams();
	const locale = params?.locale === 'en' ? 'en' : 'ar';

	useEffect(() => {
		const search = typeof window !== 'undefined' ? window.location.search : '';
		saveLastRoute(pathname, locale, search);
	}, [pathname, locale]);

	return null;
}
