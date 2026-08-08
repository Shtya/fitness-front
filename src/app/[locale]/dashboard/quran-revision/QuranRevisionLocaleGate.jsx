'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const VISIT_KEY = 'so7ba:quran-revision:locale-visit:v1';

function setDocumentLangDir(nextLocale) {
	if (typeof document === 'undefined') return;
	document.documentElement.lang = nextLocale;
	document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
}

function setLocaleCookie(nextLocale) {
	if (typeof document === 'undefined') return;
	document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function swapLocaleInPath(pathname, nextLocale) {
	const segs = (pathname || '/').split('/').filter(Boolean);
	if (segs.length && (segs[0] === 'en' || segs[0] === 'ar')) {
		segs[0] = nextLocale;
		return `/${segs.join('/')}`;
	}
	return `/${[nextLocale, ...segs].join('/')}`;
}

function readVisit() {
	try {
		const raw = sessionStorage.getItem(VISIT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (parsed?.entryLocale !== 'en' && parsed?.entryLocale !== 'ar') return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeVisit(visit) {
	try {
		sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
	} catch {
		/* ignore quota / private mode */
	}
}

function clearVisit() {
	try {
		sessionStorage.removeItem(VISIT_KEY);
	} catch {
		/* ignore */
	}
}

/**
 * Quran revision is most natural in Arabic.
 * On first entry in a visit: remember the user's locale, then force Arabic once.
 * Manual language toggles on the page stay allowed after that.
 * On leave: restore the entry locale (cookie + URL if needed).
 */
export default function QuranRevisionLocaleGate() {
	const locale = useLocale();
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	// Enter: prefer Arabic by default (once per visit)
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!pathname?.includes('/quran-revision')) return;

		let visit = readVisit();
		if (!visit) {
			visit = { entryLocale: locale === 'en' ? 'en' : 'ar', primed: false };
			writeVisit(visit);
		}

		if (visit.primed) return;

		visit = { ...visit, primed: true };
		writeVisit(visit);

		if (locale === 'ar') return;

		setLocaleCookie('ar');
		setDocumentLangDir('ar');
		const href = swapLocaleInPath(pathname, 'ar');
		const qs = searchParams?.toString();
		router.replace(qs ? `${href}?${qs}` : href);
	}, [locale, pathname, router, searchParams]);

	// Leave: restore whatever locale the user had before entering
	useEffect(() => {
		return () => {
			window.setTimeout(() => {
				const path = window.location.pathname || '';
				if (path.includes('/quran-revision')) return;

				const visit = readVisit();
				clearVisit();
				const prev = visit?.entryLocale;
				if (prev !== 'en' && prev !== 'ar') return;

				setLocaleCookie(prev);
				setDocumentLangDir(prev);

				const segs = path.split('/').filter(Boolean);
				if (!segs.length || (segs[0] !== 'en' && segs[0] !== 'ar')) return;
				if (segs[0] === prev) return;

				segs[0] = prev;
				const next = `/${segs.join('/')}${window.location.search}${window.location.hash}`;
				window.location.replace(next);
			}, 0);
		};
	}, []);

	return null;
}
