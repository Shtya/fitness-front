'use client';

import { AlertTriangle, Check, CloudDownload, CloudOff, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';

const cx = (...c) => c.filter(Boolean).join(' ');

export function mediaPercent(entry) {
	if (!entry?.total) return entry ? 100 : 0;
	return Math.round((entry.cached / entry.total) * 100);
}

/** Offline state of one day: 'none' | 'downloading' | 'partial' | 'ready' | 'quota' | null (unknown). */
export function mediaState(entry) {
	if (!entry) return null;
	if (entry.state === 'downloading' || entry.state === 'quota') return entry.state;
	if (!entry.total || entry.cached >= entry.total) return 'ready';
	return entry.cached ? 'partial' : 'none';
}

function Ring({ percent }) {
	const r = 6;
	const c = 2 * Math.PI * r;
	return (
		<svg viewBox="0 0 16 16" className="h-3.5 w-3.5 -rotate-90" aria-hidden="true">
			<circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.4" />
			<circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
		</svg>
	);
}

/** Small corner badge on a day tab. */
export function DayMediaBadge({ entry, active }) {
	const t = useTranslations('OfflineMedia');
	const state = mediaState(entry);
	if (!state) return null;
	const percent = mediaPercent(entry);
	const label = state === 'downloading' ? t('downloading', { percent }) : t(state);
	const tone = {
		ready: 'bg-emerald-500 text-white',
		downloading: active ? 'bg-[var(--color-primary-600)] text-white' : 'bg-white text-[var(--color-primary-700)]',
		partial: 'bg-amber-400 text-amber-950',
		quota: 'bg-rose-500 text-white',
		none: active ? 'bg-slate-200 text-slate-500' : 'bg-white/25 text-white/80',
	}[state];
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			data-media-state={state}
			className={cx('pointer-events-none absolute -top-1.5 -end-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border border-white/70 shadow-[1px_2px_4px_rgba(15,23,42,0.3)]', tone)}
		>
			{state === 'ready' ? <Check size={10} strokeWidth={3.5} />
				: state === 'downloading' ? <Ring percent={percent} />
					: state === 'none' ? <CloudDownload size={10} strokeWidth={2.6} />
						: <AlertTriangle size={9} strokeWidth={3} />}
		</span>
	);
}

/** One line under the day tabs describing the selected day. */
export function DayMediaLine({ entry, youtubeCount = 0 }) {
	const t = useTranslations('OfflineMedia');
	const state = mediaState(entry);
	if (!state) return null;
	const percent = mediaPercent(entry);
	const text = {
		none: t('lineNone'),
		downloading: t('lineDownloading', { percent }),
		ready: t('lineReady'),
		partial: t('linePartial', { cached: entry.cached, total: entry.total }),
		quota: t('lineQuota'),
	}[state];
	const Icon = state === 'ready' ? Check : state === 'none' ? CloudDownload : state === 'downloading' ? null : AlertTriangle;
	return (
		<div data-media-line={state} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-3 text-[11px] font-semibold text-white/80" aria-live="polite">
			<span className="inline-flex min-w-0 items-center gap-1.5">
				{Icon ? <Icon size={12} strokeWidth={2.6} className={state === 'ready' ? 'text-emerald-300' : state === 'none' ? '' : 'text-amber-300'} /> : <Ring percent={percent} />}
				<span className="min-w-0">{text}</span>
			</span>
			{state === 'downloading' && (
				<span className="h-1 w-full overflow-hidden rounded-full bg-white/20">
					<span className="block h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${percent}%` }} />
				</span>
			)}
			{youtubeCount > 0 && (
				<span className="inline-flex items-center gap-1 text-white/60">
					<Youtube size={12} /> {t('youtubeOnline')}
				</span>
			)}
		</div>
	);
}

/** Stands in for an image/video that is not stored and cannot load without a network. */
export function OfflineMediaPlaceholder({ youtube = false, compact = false }) {
	const t = useTranslations('OfflineMedia');
	const Icon = youtube ? Youtube : CloudOff;
	return (
		<div
			data-offline-placeholder={youtube ? 'youtube' : 'media'}
			role="img"
			aria-label={youtube ? t('youtubeNeedsInternet') : t('needsInternet')}
			className="absolute inset-0 z-[1] grid place-items-center bg-[linear-gradient(135deg,#1e293b,#0f172a)] px-6 text-center text-white"
		>
			<div className="flex flex-col items-center gap-2">
				<span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10">
					<Icon size={22} />
				</span>
				<p className="text-sm font-bold">{youtube ? t('youtubeNeedsInternet') : t('needsInternet')}</p>
				{!compact && <p className="max-w-[260px] text-[11.5px] font-medium leading-5 text-white/65">{youtube ? t('youtubeHint') : t('needsInternetHint')}</p>}
			</div>
		</div>
	);
}
