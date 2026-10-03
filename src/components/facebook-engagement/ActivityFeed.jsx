'use client';

import { AlertTriangle, CheckCircle2, History, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { FB_BASE } from './FbShell';
import { useFbActivity } from './fb-hooks';
import { useFbT } from './fb-i18n';
import { EmptyState, ErrorState, Pagination, SkeletonList, useFbFormat } from './fb-ui';

const LEVEL = {
	info: { icon: Info, className: 'text-sky-500 bg-sky-50 dark:bg-sky-500/15' },
	success: { icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/15' },
	warning: { icon: AlertTriangle, className: 'text-amber-500 bg-amber-50 dark:bg-amber-500/15' },
	error: { icon: XCircle, className: 'text-rose-500 bg-rose-50 dark:bg-rose-500/15' },
};

export function ActivityList({ items, compact, showCampaignLink }) {
	const t = useFbT();
	const format = useFbFormat();
	return (
		<ol className="divide-y divide-slate-100 dark:divide-slate-800">
			{items.map((item) => {
				const level = LEVEL[item.level] || LEVEL.info;
				const Icon = level.icon;
				return (
					<li key={item.id} className={cn('flex items-start gap-3', compact ? 'px-4 py-2.5' : 'px-5 py-3')}>
						<span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg', level.className)}>
							<Icon className="size-4" aria-hidden />
						</span>
						<div className="min-w-0 flex-1">
							<p className={cn('break-words text-slate-800 dark:text-slate-200', compact ? 'text-[13px] leading-5' : 'text-sm leading-6')}>
								{item.message}
							</p>
							<p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
								<time dateTime={item.createdAt} title={format.dateTime(item.createdAt)}>
									{format.relative(item.createdAt)}
								</time>
								{showCampaignLink && item.campaignId && (
									<Link
										href={`${FB_BASE}/campaigns/${item.campaignId}`}
										className="font-medium text-[var(--color-primary-700)] hover:underline dark:text-[var(--color-primary-300)]"
									>
										{t('openCampaign')}
									</Link>
								)}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

export default function ActivityFeed({ params, compact = false, live = false, onPageChange, showCampaignLink = false }) {
	const t = useFbT();
	const query = useFbActivity(params, { live });
	if (query.isLoading) return <SkeletonList rows={compact ? 3 : 6} className="p-4" />;
	if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="m-4" />;
	const items = query.data?.items ?? [];
	if (!items.length) {
		return <EmptyState icon={History} title={t('noActivity')} description={compact ? undefined : t('noActivityHint')} className="py-8" />;
	}
	return (
		<>
			<ActivityList items={items} compact={compact} showCampaignLink={showCampaignLink} />
			{onPageChange && (
				<div className="px-5 pb-4">
					<Pagination page={query.data.page} limit={query.data.limit} total={query.data.total} onChange={onPageChange} />
				</div>
			)}
		</>
	);
}
