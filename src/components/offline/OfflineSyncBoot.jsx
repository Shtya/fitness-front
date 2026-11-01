'use client';

import { useEffect } from 'react';
import { startOutbox } from '@/lib/offline/outbox';
import { registerServiceWorker } from '@/lib/offline/register-sw';
import { registerOfflineSenders } from '@/lib/offline/senders';

/**
 * Mounted once in the root layout: registers the service worker (offline app shell) and,
 * whatever page is open when the network comes back, sends the saved workouts and
 * nutrition changes.
 */
export default function OfflineSyncBoot() {
	useEffect(() => {
		registerServiceWorker();
		registerOfflineSenders();
		startOutbox();
	}, []);
	return null;
}
