'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/** Old multi-page routes redirect into the unified studio tabs. */
export default function RedirectToStudio({ tab = 'home', sub }) {
	const router = useRouter();
	useEffect(() => {
		const params = new URLSearchParams();
		if (tab && tab !== 'home') params.set('tab', tab);
		if (sub) params.set('sub', sub);
		const qs = params.toString();
		router.replace(qs ? `/ai-studio?${qs}` : '/ai-studio');
	}, [router, tab, sub]);
	return <div className="grid min-h-[40vh] place-items-center text-sm text-[#5c6b63]">…</div>;
}
