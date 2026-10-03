'use client';

import { useDeferredValue, useState } from 'react';
import { Megaphone, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { FB_BASE } from './FbShell';
import { isActiveCampaign, useFbCampaigns } from './fb-hooks';
import { useFbT } from './fb-i18n';
import {
	EmptyState,
	ErrorState,
	inputClass,
	PageAvatar,
	Pagination,
	ProgressBar,
	SkeletonList,
	StatusBadge,
	useFbFormat,
} from './fb-ui';

const STATUSES = ['draft', 'queued', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'];
const LIMIT = 12;

function CampaignCard({ campaign }) {
	const t = useFbT();
	const format = useFbFormat();
	const done = campaign.publishedCount + campaign.failedCount;
	return (
		<Link
			href={`${FB_BASE}/campaigns/${campaign.id}`}
			className="group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] motion-reduce:hover:translate-y-0 dark:border-slate-800 dark:bg-slate-900/60"
		>
			<div className="flex items-start gap-3">
				<PageAvatar account={campaign.account} />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-slate-900 group-hover:text-[var(--color-primary-700)] dark:text-white dark:group-hover:text-[var(--color-primary-300)]" dir="auto">
						{campaign.name}
					</p>
					<p className="truncate text-xs text-slate-500 dark:text-slate-400">{campaign.account?.name || '—'}</p>
				</div>
				<StatusBadge status={campaign.status} />
			</div>
			{campaign.post?.message && (
				<p className="line-clamp-2 text-[13px] leading-5 text-slate-600 dark:text-slate-300" dir="auto">
					{campaign.post.message}
				</p>
			)}
			<div className="mt-auto space-y-2">
				<ProgressBar
					published={campaign.publishedCount}
					failed={campaign.failedCount}
					pending={campaign.pendingCount}
					total={campaign.totalCount}
				/>
				<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
					<span className="tabular-nums">{t('doneOfTotal', { done, total: campaign.totalCount })}</span>
					<time dateTime={campaign.updatedAt} title={format.dateTime(campaign.updatedAt)}>
						{format.relative(campaign.updatedAt)}
					</time>
				</div>
			</div>
		</Link>
	);
}

export default function CampaignsView() {
	const t = useFbT();
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');
	const [page, setPage] = useState(1);
	const deferredSearch = useDeferredValue(search.trim());
	const params = { page, limit: LIMIT, ...(deferredSearch && { search: deferredSearch }), ...(status && { status }) };
	const query = useFbCampaigns(params);
	const filtered = Boolean(deferredSearch || status);
	const items = query.data?.items ?? [];

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
					<input
						type="search"
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							setPage(1);
						}}
						placeholder={t('searchCampaigns')}
						aria-label={t('searchCampaigns')}
						className={cn(inputClass, 'ps-9')}
					/>
				</div>
				<select
					value={status}
					onChange={(event) => {
						setStatus(event.target.value);
						setPage(1);
					}}
					aria-label={t('filterStatus')}
					className={cn(inputClass, 'sm:w-56')}
				>
					<option value="">{t('allStatuses')}</option>
					{STATUSES.map((value) => (
						<option key={value} value={value}>
							{t(`status_${value}`)}
						</option>
					))}
				</select>
			</div>

			{query.isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<SkeletonList rows={1} className="[&>*]:h-40" />
					<SkeletonList rows={1} className="[&>*]:h-40" />
					<SkeletonList rows={1} className="hidden xl:block [&>*]:h-40" />
				</div>
			) : query.isError ? (
				<ErrorState error={query.error} onRetry={() => query.refetch()} />
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
					<EmptyState
						icon={Megaphone}
						title={filtered ? t('noMatchingCampaigns') : t('noCampaigns')}
						description={filtered ? t('tryOtherFilters') : t('noCampaignsHint')}
						action={
							!filtered && (
								<Button asChild>
									<Link href={`${FB_BASE}/campaigns/new`}>
										<Plus aria-hidden />
										{t('newCampaign')}
									</Link>
								</Button>
							)
						}
					/>
				</div>
			) : (
				<>
					<div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', query.isPlaceholderData && 'opacity-60 transition-opacity')}>
						{items.map((campaign) => (
							<CampaignCard key={campaign.id} campaign={campaign} />
						))}
					</div>
					{items.some(isActiveCampaign) && <p className="text-xs text-slate-500 dark:text-slate-400">{t('liveUpdating')}</p>}
					<Pagination page={query.data.page} limit={query.data.limit} total={query.data.total} onChange={setPage} />
				</>
			)}
		</div>
	);
}
