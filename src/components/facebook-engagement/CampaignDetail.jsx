'use client';

import { useState } from 'react';
import { ArrowLeft, Copy, Loader2, Pencil, RefreshCw, RotateCcw, Send, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';
import { Link, useRouter } from '@/i18n/navigation';
import ActivityFeed from './ActivityFeed';
import CampaignProgress, { formatDuration } from './CampaignProgress';
import CommentsTable from './CommentsTable';
import { FB_BASE } from './FbShell';
import PostPreview from './PostPreview';
import { isActiveCampaign, useFbCampaign, useFbMutation } from './fb-hooks';
import { useFbT } from './fb-i18n';
import {
	ConfirmDialog,
	ErrorState,
	FbDialog,
	Field,
	ghostButtonClass,
	inputClass,
	outlineButtonClass,
	Panel,
	SkeletonList,
} from './fb-ui';

const PACING_OPTIONS = [15, 30, 60, 120, 300];

export default function CampaignDetail({ id }) {
	const t = useFbT();
	const router = useRouter();
	const query = useFbCampaign(id);
	const [confirm, setConfirm] = useState(null);
	const [editOpen, setEditOpen] = useState(false);
	const [form, setForm] = useState({ name: '', pacingSeconds: 30 });

	const publish = useFbMutation(() => fbEngagementApi.publishCampaign(id), {
		success: (result) => t('publishQueued', { n: result.queued, skipped: result.skipped.length }),
	});
	const retry = useFbMutation(() => fbEngagementApi.retryFailed(id), {
		success: (result) => t('retryQueued', { n: result.queued }),
	});
	const cancel = useFbMutation(() => fbEngagementApi.cancelCampaign(id), {
		success: t('campaignCancelled'),
		onSuccess: () => setConfirm(null),
	});
	const remove = useFbMutation(() => fbEngagementApi.deleteCampaign(id), {
		success: t('campaignDeleted'),
		onSuccess: () => router.push(`${FB_BASE}/campaigns`),
	});
	const duplicate = useFbMutation(() => fbEngagementApi.duplicateCampaign(id), {
		success: t('campaignDuplicated'),
		onSuccess: (copy) => router.push(`${FB_BASE}/campaigns/${copy.id}`),
	});
	const update = useFbMutation((body) => fbEngagementApi.updateCampaign(id, body), {
		success: t('campaignSaved'),
		onSuccess: () => setEditOpen(false),
	});
	const refreshPost = useFbMutation((postId) => fbEngagementApi.refreshPost(postId), { success: t('postRefreshed') });

	if (query.isLoading) return <SkeletonList rows={6} />;
	if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

	const campaign = query.data;
	const active = isActiveCampaign(campaign);
	const draftCount = campaign.statusCounts?.draft ?? 0;

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<Link
						href={`${FB_BASE}/campaigns`}
						className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
					>
						<ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden />
						{t('navCampaigns')}
					</Link>
					<h2 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
						<span className="truncate" dir="auto">{campaign.name}</span>
						<Button
							size="icon-sm"
							variant="ghost"
							className={ghostButtonClass}
							onClick={() => {
								setForm({ name: campaign.name, pacingSeconds: campaign.pacingSeconds });
								setEditOpen(true);
							}}
							aria-label={t('editCampaign')}
							title={t('editCampaign')}
						>
							<Pencil aria-hidden />
						</Button>
					</h2>
					{campaign.account && (
						<p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{t('asPage', { name: campaign.account.name })}</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{draftCount > 0 && (
						<Button onClick={() => publish.mutate()} disabled={publish.isPending}>
							{publish.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
							{t('publishDrafts', { n: draftCount })}
						</Button>
					)}
					{campaign.failedCount > 0 && (
						<Button variant="outline" className={outlineButtonClass} onClick={() => retry.mutate()} disabled={retry.isPending}>
							{retry.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
							{t('retryFailedN', { n: campaign.failedCount })}
						</Button>
					)}
					{active && (
						<Button variant="outline" className={outlineButtonClass} onClick={() => setConfirm('cancel')}>
							<Square aria-hidden />
							{t('stopCampaign')}
						</Button>
					)}
					<Button
						size="icon"
						variant="ghost"
						className={ghostButtonClass}
						onClick={() => duplicate.mutate()}
						disabled={duplicate.isPending}
						aria-label={t('duplicateCampaign')}
						title={t('duplicateCampaign')}
					>
						<Copy aria-hidden />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className={cn(ghostButtonClass, 'hover:text-rose-600 dark:hover:text-rose-400')}
						onClick={() => setConfirm('delete')}
						disabled={active}
						aria-label={t('deleteCampaign')}
						title={active ? t('stopBeforeDelete') : t('deleteCampaign')}
					>
						<Trash2 aria-hidden />
					</Button>
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="min-w-0 space-y-5">
					<Panel>
						<CampaignProgress campaign={campaign} />
					</Panel>
					<Panel title={t('navComments')} description={t('campaignCommentsHint')}>
						<CommentsTable campaign={campaign} accounts={campaign.eligiblePublishers} />
					</Panel>
				</div>
				<div className="space-y-5 lg:sticky lg:top-36 lg:self-start">
					{campaign.post ? (
						<div className="space-y-2">
							<PostPreview post={campaign.post} account={campaign.account} compact />
							<Button
								size="sm"
								variant="ghost"
								className={cn(ghostButtonClass, 'w-full')}
								onClick={() => refreshPost.mutate(campaign.post.id)}
								disabled={refreshPost.isPending}
							>
								<RefreshCw className={cn(refreshPost.isPending && 'animate-spin')} aria-hidden />
								{t('refreshPost')}
							</Button>
						</div>
					) : (
						<ErrorState error={{ message: t('postMissing') }} />
					)}
					<Panel title={t('navActivity')} bodyClassName="p-0">
						<ActivityFeed params={{ campaignId: id, limit: 10 }} compact live={active} />
					</Panel>
				</div>
			</div>

			<FbDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				title={t('editCampaign')}
				footer={
					<>
						<Button variant="ghost" className={ghostButtonClass} onClick={() => setEditOpen(false)}>
							{t('cancel')}
						</Button>
						<Button onClick={() => update.mutate({ name: form.name.trim(), pacingSeconds: form.pacingSeconds })} disabled={!form.name.trim() || update.isPending}>
							{update.isPending && <Loader2 className="animate-spin" aria-hidden />}
							{t('save')}
						</Button>
					</>
				}
			>
				<div className="space-y-4">
					<Field label={t('campaignName')} htmlFor="fb-edit-name">
						<input
							id="fb-edit-name"
							value={form.name}
							onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
							maxLength={160}
							className={inputClass}
							dir="auto"
						/>
					</Field>
					<Field label={t('pacing')} htmlFor="fb-edit-pacing" hint={t('pacingNextRun')}>
						<select
							id="fb-edit-pacing"
							value={form.pacingSeconds}
							onChange={(event) => setForm((value) => ({ ...value, pacingSeconds: Number(event.target.value) }))}
							className={inputClass}
						>
							{[...new Set([...PACING_OPTIONS, form.pacingSeconds])].sort((a, b) => a - b).map((value) => (
								<option key={value} value={value}>
									{t('pacingEvery', { time: formatDuration(value, t) })}
								</option>
							))}
						</select>
					</Field>
				</div>
			</FbDialog>

			<ConfirmDialog
				open={confirm === 'cancel'}
				onOpenChange={(open) => !open && setConfirm(null)}
				title={t('stopCampaignTitle')}
				description={t('stopCampaignHint')}
				confirmLabel={t('stopCampaign')}
				loading={cancel.isPending}
				onConfirm={() => cancel.mutate()}
			/>
			<ConfirmDialog
				open={confirm === 'delete'}
				onOpenChange={(open) => !open && setConfirm(null)}
				title={t('deleteCampaignTitle')}
				description={t('deleteCampaignHint')}
				confirmLabel={t('deleteCampaign')}
				loading={remove.isPending}
				onConfirm={() => remove.mutate()}
			/>
		</div>
	);
}
