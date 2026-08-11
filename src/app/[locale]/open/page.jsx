'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
	consumeRestoreTicket,
	isRestorablePath,
	readLastRoute,
} from '@/lib/last-route';

/**
 * Lightweight PWA entry: show a short preload, then jump to the last
 * dashboard page (or /dashboard). Avoids booting the heavy marketing home.
 */
export default function OpenAppPage() {
	const router = useRouter();
	const params = useParams();
	const locale = params?.locale === 'en' ? 'en' : 'ar';
	const isAr = locale === 'ar';
	const [label, setLabel] = useState(isAr ? 'جارٍ التحميل…' : 'Loading…');

	const fallback = useMemo(() => `/${locale}/dashboard`, [locale]);

	useEffect(() => {
		consumeRestoreTicket();
		const saved = readLastRoute();
		const target =
			saved && isRestorablePath(saved.path)
				? `/${saved.locale || locale}${saved.path}`
				: fallback;

		setLabel(
			isAr
				? saved
					? 'بنرجّعك لآخر صفحة فتحتها…'
					: 'بنفتح التطبيق…'
				: saved
					? 'Returning to your last page…'
					: 'Opening the app…',
		);

		const timer = window.setTimeout(() => {
			router.replace(target);
		}, 420);

		return () => window.clearTimeout(timer);
	}, [fallback, isAr, locale, router]);

	return (
		<div
			className="fixed inset-0 z-[300000] grid place-items-center bg-gradient-to-br from-slate-50 via-white to-slate-100"
			dir={isAr ? 'rtl' : 'ltr'}
			role="status"
			aria-live="polite"
		>
			<div className="flex flex-col items-center gap-5 px-6 text-center">
				<div
					className="relative grid h-16 w-16 place-items-center rounded-[1.35rem] text-white shadow-lg"
					style={{
						background:
							'linear-gradient(135deg, var(--color-gradient-from, #0f766e), var(--color-gradient-to, #115e59))',
					}}
				>
					<span className="text-lg font-black tracking-tight">صحبة</span>
					<span
						aria-hidden
						className="absolute -inset-1 -z-10 animate-pulse rounded-[1.55rem] opacity-40"
						style={{
							background:
								'linear-gradient(135deg, var(--color-primary-200, #99f6e4), transparent)',
						}}
					/>
				</div>
				<div className="space-y-2">
					<p className="text-sm font-black text-slate-800">{label}</p>
					<div className="mx-auto h-1 w-28 overflow-hidden rounded-full bg-slate-200">
						<div
							className="h-full w-1/2 rounded-full bg-[var(--color-primary-500,#0d9488)]"
							style={{
								animation: 'so7ba-preload 1.1s ease-in-out infinite',
							}}
						/>
					</div>
				</div>
			</div>
			<style>{`
				@keyframes so7ba-preload {
					0% { transform: translateX(-120%); }
					100% { transform: translateX(220%); }
				}
			`}</style>
		</div>
	);
}
