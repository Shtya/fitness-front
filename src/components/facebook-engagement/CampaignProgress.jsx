'use client';

import { Clock } from 'lucide-react';
import { isActiveCampaign } from './fb-hooks';
import { useFbT } from './fb-i18n';
import { ProgressBar, StatusBadge, useFbFormat } from './fb-ui';

export function formatDuration(seconds, t) {
	if (seconds < 60) return t('durationSeconds', { n: Math.max(0, Math.round(seconds)) });
	if (seconds < 3600) return t('durationMinutes', { n: Math.round(seconds / 60) });
	return t('durationHours', { n: (seconds / 3600).toFixed(1) });
}

export default function CampaignProgress({ campaign }) {
	const t = useFbT();
	const format = useFbFormat();
	if (!campaign) return null;

	const { totalCount = 0, publishedCount = 0, failedCount = 0, pendingCount = 0 } = campaign;
	const done = publishedCount + failedCount;
	const percent = totalCount ? Math.round((done / totalCount) * 100) : 0;
	const active = isActiveCampaign(campaign);
	const stats = [
		{ key: 'published', label: t('status_published'), value: publishedCount, dot: 'bg-emerald-500' },
		{ key: 'failed', label: t('status_failed'), value: failedCount, dot: 'bg-rose-500' },
		{ key: 'pending', label: t('inQueue'), value: pendingCount, dot: 'bg-amber-400' },
		{ key: 'draft', label: t('status_draft'), value: Math.max(0, totalCount - done - pendingCount), dot: 'bg-slate-300 dark:bg-slate-600' },
	];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="text-[13px] text-slate-500 dark:text-slate-400">{t('progress')}</p>
					<p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
						{percent}%
						<span className="ms-2 text-sm font-normal text-slate-500 dark:text-slate-400">
							{t('doneOfTotal', { done, total: totalCount })}
						</span>
					</p>
				</div>
				<StatusBadge status={campaign.status} className="text-[13px]" />
			</div>
			<ProgressBar published={publishedCount} failed={failedCount} pending={pendingCount} total={totalCount} className="h-2.5" />
			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{stats.map((stat) => (
					<div key={stat.key} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
						<dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
							<span className={`size-2 rounded-full ${stat.dot}`} aria-hidden />
							{stat.label}
						</dt>
						<dd className="mt-1 text-lg font-semibold text-slate-900 tabular-nums dark:text-white">{format.number(stat.value)}</dd>
					</div>
				))}
			</dl>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
				{active && pendingCount > 0 && (
					<span className="inline-flex items-center gap-1.5">
						<Clock className="size-3.5" aria-hidden />
						{t('eta', { time: formatDuration(pendingCount * campaign.pacingSeconds, t) })}
					</span>
				)}
				<span>{t('pacingEvery', { time: formatDuration(campaign.pacingSeconds, t) })}</span>
				{campaign.startedAt && <span>{t('startedAt', { time: format.dateTime(campaign.startedAt) })}</span>}
				{campaign.finishedAt && <span>{t('finishedAt', { time: format.dateTime(campaign.finishedAt) })}</span>}
			</div>
		</div>
	);
}
