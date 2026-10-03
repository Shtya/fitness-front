'use client';

import { useEffect } from 'react';
import api from '@/utils/axios';

const PAGE_FIELDS = ['allowedPages', 'loginLandingPage', 'pageAccess'];
const MIN_INTERVAL_MS = 60_000;

function samePageFields(a, b) {
	return PAGE_FIELDS.every((key) => JSON.stringify(a?.[key] ?? null) === JSON.stringify(b?.[key] ?? null));
}

/**
 * Keeps the stored user + middleware cookie in sync with page access set by the
 * super admin, so sidebar/lock changes apply without a new login.
 */
export function usePageAccessSync(userId) {
	useEffect(() => {
		if (!userId) return undefined;
		let lastRun = 0;
		let inFlight = false;

		const sync = async () => {
			const accessToken = localStorage.getItem('accessToken');
			if (!accessToken || inFlight || Date.now() - lastRun < MIN_INTERVAL_MS) return;
			inFlight = true;
			lastRun = Date.now();
			try {
				const { data } = await api.get('/auth/me', { skipAuthRedirect: true });
				const stored = JSON.parse(localStorage.getItem('user') || 'null');
				if (!stored || stored.id !== data?.id || samePageFields(stored, data)) return;

				const next = { ...stored };
				for (const key of PAGE_FIELDS) next[key] = data[key] ?? null;
				localStorage.setItem('user', JSON.stringify(next));
				window.dispatchEvent(new Event('sobha-user-updated'));

				await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ accessToken }),
				});
			} catch (error) {
				console.warn('Page access sync failed; retrying on next focus', error?.message);
			} finally {
				inFlight = false;
			}
		};

		const onVisible = () => {
			if (document.visibilityState === 'visible') sync();
		};

		sync();
		window.addEventListener('focus', onVisible);
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			window.removeEventListener('focus', onVisible);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [userId]);
}
