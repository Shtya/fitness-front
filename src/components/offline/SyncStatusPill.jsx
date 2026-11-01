'use client';

import { AlertTriangle, Check, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { flush } from '@/lib/offline/outbox';
import { useOutboxStatus } from '@/lib/offline/use-outbox-status';

const ICONS = {
	offline: CloudOff,
	syncing: Loader2,
	pending: RefreshCw,
	failed: AlertTriangle,
	synced: Check,
};

const TONES = {
	light: {
		offline: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
		syncing: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200',
		pending: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200',
		failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200',
		synced: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200',
	},
	onDark: {
		offline: 'border-amber-200/60 bg-amber-300/25 text-white',
		syncing: 'border-white/40 bg-white/15 text-white',
		pending: 'border-white/40 bg-white/15 text-white',
		failed: 'border-rose-200/60 bg-rose-400/30 text-white',
		synced: 'border-white/35 bg-white/15 text-white',
	},
};

/**
 * Offline / Syncing / Synced indicator for the given outbox kinds. Tapping it sends
 * everything that is waiting (including rows that are backing off after a failure).
 */
export default function SyncStatusPill({ kinds, tone = 'light', className = '' }) {
	const t = useTranslations('OfflineSync');
	const status = useOutboxStatus(kinds);
	const { state } = status;
	const waiting = status.pending + status.failed;
	const Icon = ICONS[state];
	const label =
		state === 'offline'
			? waiting
				? t('offlineSaved', { count: waiting })
				: t('offline')
			: state === 'syncing'
				? t('syncing')
				: state === 'pending'
					? t('pending', { count: waiting })
					: state === 'failed'
						? t('failed')
						: t('synced');

	return (
		<button
			type="button"
			onClick={() => void flush({ force: true })}
			disabled={state === 'offline' || state === 'syncing'}
			title={state === 'failed' || state === 'pending' ? t('retry') : label}
			aria-live="polite"
			data-sync-state={state}
			className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold leading-none transition active:scale-95 disabled:active:scale-100 ${TONES[tone]?.[state] || TONES.light[state]} ${className}`}
		>
			<Icon size={12} strokeWidth={2.6} className={state === 'syncing' ? 'animate-spin' : undefined} aria-hidden="true" />
			<span className="whitespace-nowrap">{label}</span>
		</button>
	);
}
