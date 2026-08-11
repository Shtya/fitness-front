'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { saveLastRoute } from '@/lib/last-route';

/** Keeps the last dashboard route so PWA reopen can restore it. */
export default function LastRouteTracker() {
	const pathname = usePathname();
	const params = useParams();
	const locale = params?.locale === 'en' ? 'en' : 'ar';

	useEffect(() => {
		saveLastRoute(pathname, locale);
	}, [pathname, locale]);

	return null;
}
