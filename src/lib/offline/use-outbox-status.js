'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getSnapshotVersion, getStatus, subscribe } from './outbox';

const serverSnapshot = () => 0;

/**
 * Live outbox state for the given record kinds:
 * { state: 'offline' | 'syncing' | 'pending' | 'failed' | 'synced', online, syncing, pending, failed }
 */
export function useOutboxStatus(kinds) {
	const version = useSyncExternalStore(subscribe, getSnapshotVersion, serverSnapshot);
	const kindsKey = (kinds || []).join('|');
	return useMemo(() => {
		if (typeof window === 'undefined') {
			return { state: 'synced', online: true, syncing: false, pending: 0, failed: 0, lastSyncedAt: 0 };
		}
		const status = getStatus({ kinds: kindsKey ? kindsKey.split('|') : undefined });
		const state = !status.online
			? 'offline'
			: status.syncing && status.pending + status.failed > 0
				? 'syncing'
				: status.failed
					? 'failed'
					: status.pending
						? 'pending'
						: 'synced';
		return { ...status, state };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [version, kindsKey]);
}
