'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	Circle,
	Loader2,
	Plug,
	Save,
	Send,
	XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';
import { Link, useRouter } from '@/i18n/navigation';
import CampaignProgress, { formatDuration } from './CampaignProgress';
import DraftCommentsEditor, { normalizeMessage } from './DraftCommentsEditor';
import { FB_BASE } from './FbShell';
import PostPicker from './PostPicker';
import PostPreview from './PostPreview';
import { useFbAccounts, useFbCampaign, useFbComments, useFbMutation } from './fb-hooks';
import { useFbT } from './fb-i18n';
import {
	EmptyState,
	ErrorState,
	Field,
	ghostButtonClass,
	inputClass,
	outlineButtonClass,
	PageAvatar,
	Panel,
	SkeletonList,
	StatusBadge,
	Tag,
} from './fb-ui';

const STEPS = ['stepConnection', 'stepPost', 'stepComments', 'stepPreview', 'stepPublish'];
const PACING_OPTIONS = [15, 30, 60, 120, 300];
const PREVIEW_LIMIT = 5;

function Stepper({ step, maxReached, onGo }) {
	const t = useFbT();
	return (
		<ol className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
			{STEPS.map((key, index) => {
				const done = index < step;
				const current = index === step;
				const reachable = index <= maxReached && step < 4;
				return (
					<li key={key} className="flex shrink-0 items-center gap-2">
						<button
							type="button"
							onClick={() => reachable && onGo(index)}
							disabled={!reachable}
							aria-current={current ? 'step' : undefined}
							className={cn(
								'flex items-center gap-2 rounded-full py-1 pe-3 ps-1 text-[13px] font-medium transition',
								current
									? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-500)]/15 dark:text-[var(--color-primary-300)]'
									: done
										? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
										: 'text-slate-400 dark:text-slate-500',
							)}
						>
							<span
								className={cn(
									'grid size-6 place-items-center rounded-full text-xs tabular-nums',
									current
										? 'bg-[var(--color-primary-600)] text-white'
										: done
											? 'bg-emerald-500 text-white'
											: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
								)}
							>
								{done ? <Check className="size-3.5" aria-hidden /> : index + 1}
							</span>
							{t(key)}
						</button>
						{index < STEPS.length - 1 && <span className="h-px w-5 bg-slate-200 dark:bg-slate-800" aria-hidden />}
					</li>
				);
			})}
		</ol>
	);
}

function AccountStep({ accounts, accountId, onSelect }) {
	const t = useFbT();
	if (accounts.isLoading) return <SkeletonList rows={3} />;
	if (accounts.isError) return <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />;
	const rows = accounts.data ?? [];
	if (!rows.length) {
		return (
			<EmptyState
				icon={Plug}
				title={t('noPagesConnected')}
				description={t('noPagesConnectedHint')}
				action={
					<Button asChild>
						<Link href={`${FB_BASE}/accounts`}>{t('connectPage')}</Link>
					</Button>
				}
			/>
		);
	}
	return (
		<ul className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('stepConnection')}>
			{rows.map((account) => {
				const usable = account.status === 'active' && account.canPublishComments;
				const selected = account.id === accountId;
				return (
					<li key={account.id}>
						<button
							type="button"
							role="radio"
							aria-checked={selected}
							disabled={!usable}
							onClick={() => onSelect(account.id)}
							className={cn(
								'flex w-full items-center gap-3 rounded-xl border p-3 text-start transition',
								selected
									? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-500)]/20 dark:bg-[var(--color-primary-500)]/10'
									: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
								!usable && 'cursor-not-allowed opacity-60 hover:shadow-none',
							)}
						>
							<PageAvatar account={account} className="size-11" />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{account.name}</span>
								<span className="mt-1 flex flex-wrap items-center gap-1.5">
									{account.category && <Tag>{account.category}</Tag>}
									{usable ? (
										<Tag tone="emerald">{t('canPublish')}</Tag>
									) : (
										<Tag tone="rose">{account.status !== 'active' ? t(`status_${account.status}`) : t('missingPermission')}</Tag>
									)}
								</span>
							</span>
							{selected ? (
								<CheckCircle2 className="size-5 shrink-0 text-[var(--color-primary-600)]" aria-hidden />
							) : (
								<Circle className="size-5 shrink-0 text-slate-300 dark:text-slate-700" aria-hidden />
							)}
						</button>
					</li>
				);
			})}
		</ul>
	);
}

function LiveComments({ campaignId }) {
	const t = useFbT();
	const comments = useFbComments({ campaignId, page: 1, limit: 100 });
	if (comments.isLoading) return <SkeletonList rows={3} />;
	const rows = comments.data?.items ?? [];
	const icon = (status) => {
		if (status === 'published') return <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />;
		if (status === 'failed') return <XCircle className="size-4 text-rose-500" aria-hidden />;
		if (status === 'processing') return <Loader2 className="size-4 animate-spin text-sky-500" aria-hidden />;
		return <Circle className="size-4 text-slate-300 dark:text-slate-600" aria-hidden />;
	};
	return (
		<ol className="divide-y divide-slate-100 dark:divide-slate-800" aria-live="polite">
			{rows.map((row, index) => (
				<li key={row.id} className="flex items-start gap-3 py-2.5">
					<span className="mt-0.5">{icon(row.status)}</span>
					<div className="min-w-0 flex-1">
						<p className="line-clamp-2 text-[13px] text-slate-800 dark:text-slate-200" dir="auto">
							<span className="me-1.5 text-xs text-slate-400 tabular-nums">#{index + 1}</span>
							{row.message}
						</p>
						{row.lastError && row.status !== 'published' && (
							<p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">{row.lastError}</p>
						)}
					</div>
					<StatusBadge status={row.status} />
				</li>
			))}
			{!rows.length && <li className="py-4 text-center text-[13px] text-slate-500">{t('noCommentsYet')}</li>}
		</ol>
	);
}

export default function CampaignWizard() {
	const t = useFbT();
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const rootRef = useRef(null);
	const accounts = useFbAccounts();

	const [step, setStep] = useState(0);
	const [maxReached, setMaxReached] = useState(0);
	const [accountId, setAccountId] = useState(null);
	const [post, setPost] = useState(null);
	const [name, setName] = useState('');
	const [pacing, setPacing] = useState(30);
	const [comments, setComments] = useState([]);
	const [campaignId, setCampaignId] = useState(null);
	const campaign = useFbCampaign(campaignId);

	const account = accounts.data?.find((row) => row.id === accountId) ?? null;
	const publishers = account ? [account] : [];
	const validComments = useMemo(() => comments.filter((comment) => comment.message.trim()), [comments]);
	const duplicateCount = useMemo(
		() => validComments.length - new Set(validComments.map((comment) => normalizeMessage(comment.message))).size,
		[validComments],
	);

	const canNext = [
		Boolean(account),
		Boolean(post && post.accountId === accountId),
		Boolean(name.trim() && validComments.length),
		true,
	][step];

	const go = (next) => {
		setStep(next);
		setMaxReached((value) => Math.max(value, next));
		rootRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
	};

	const create = useFbMutation(
		async ({ publish }) => {
			const created = await fbEngagementApi.createCampaign({
				name: name.trim(),
				postId: post.id,
				accountId,
				pacingSeconds: pacing,
				comments: validComments.map((comment) => ({
					message: comment.message.trim(),
					...(comment.accountId ? { accountId: comment.accountId } : {}),
				})),
			});
			if (!publish) return { created, published: null };
			try {
				return { created, published: await fbEngagementApi.publishCampaign(created.id) };
			} catch (error) {
				error.createdCampaignId = created.id;
				throw error;
			}
		},
		{
			success: ({ published }) =>
				published ? t('publishQueued', { n: published.queued, skipped: published.skipped.length }) : t('draftSaved'),
			onSuccess: ({ created, published }) => {
				if (!published) {
					router.push(`${FB_BASE}/campaigns/${created.id}`);
					return;
				}
				setCampaignId(created.id);
				go(4);
			},
		},
	);

	const submit = (publish) =>
		create.mutate(
			{ publish },
			{
				onError: (error) => {
					if (error.createdCampaignId) router.push(`${FB_BASE}/campaigns/${error.createdCampaignId}`);
				},
			},
		);

	const selectPost = (resolved) => {
		setPost(resolved);
		if (!name.trim()) {
			const base = (resolved.message || '').replace(/\s+/g, ' ').trim().slice(0, 60);
			setName(base ? `${t('campaignFor')} "${base}${resolved.message.length > 60 ? '…' : ''}"` : t('newCampaign'));
		}
	};

	const reset = () => {
		setStep(0);
		setMaxReached(0);
		setPost(null);
		setName('');
		setComments([]);
		setCampaignId(null);
	};

	const motionProps = reduceMotion
		? {}
		: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.18 } };

	return (
		<div ref={rootRef} className="scroll-mt-40 space-y-5">
			<Stepper step={step} maxReached={maxReached} onGo={go} />

			<AnimatePresence mode="wait">
				<motion.div key={step} {...motionProps}>
					{step === 0 && (
						<Panel title={t('chooseConnection')} description={t('chooseConnectionHint')}>
							<AccountStep
								accounts={accounts}
								accountId={accountId}
								onSelect={(id) => {
									setAccountId(id);
									if (post && post.accountId !== id) setPost(null);
								}}
							/>
						</Panel>
					)}

					{step === 1 && (
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
							<Panel title={t('choosePost')} description={t('choosePostHint', { page: account?.name })}>
								<PostPicker accountId={accountId} selectedPost={post} onSelect={selectPost} />
							</Panel>
							<div className="lg:sticky lg:top-36 lg:self-start">
								{post ? (
									<PostPreview post={post} account={account} />
								) : (
									<div className="grid h-48 place-items-center rounded-2xl border border-dashed border-slate-300 text-[13px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
										{t('postPreviewPlaceholder')}
									</div>
								)}
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
							<Panel title={t('writeComments')} description={t('writeCommentsHint')}>
								<div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
									<Field label={t('campaignName')} htmlFor="fb-campaign-name">
										<input
											id="fb-campaign-name"
											value={name}
											onChange={(event) => setName(event.target.value)}
											maxLength={160}
											className={inputClass}
											dir="auto"
										/>
									</Field>
									<Field label={t('pacing')} htmlFor="fb-campaign-pacing" hint={t('pacingHint')}>
										<select
											id="fb-campaign-pacing"
											value={pacing}
											onChange={(event) => setPacing(Number(event.target.value))}
											className={inputClass}
										>
											{PACING_OPTIONS.map((value) => (
												<option key={value} value={value}>
													{t('pacingEvery', { time: formatDuration(value, t) })}
												</option>
											))}
										</select>
									</Field>
								</div>
								<DraftCommentsEditor comments={comments} onChange={setComments} publishers={publishers} />
							</Panel>
							<div className="lg:sticky lg:top-36 lg:self-start">
								<PostPreview
									post={post}
									account={account}
									compact
									comments={validComments.slice(0, 3).map((comment) => ({ ...comment, account }))}
								/>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
							<div>
								<PostPreview
									post={post}
									account={account}
									comments={validComments.slice(0, PREVIEW_LIMIT).map((comment) => ({ ...comment, account }))}
								/>
								{validComments.length > PREVIEW_LIMIT && (
									<p className="mt-2 text-center text-[13px] text-slate-500 dark:text-slate-400">
										{t('andMoreComments', { n: validComments.length - PREVIEW_LIMIT })}
									</p>
								)}
							</div>
							<Panel title={t('summary')} className="lg:sticky lg:top-36 lg:self-start">
								<dl className="space-y-3 text-[13px]">
									<div className="flex justify-between gap-3">
										<dt className="text-slate-500 dark:text-slate-400">{t('campaignName')}</dt>
										<dd className="truncate text-end font-medium">{name}</dd>
									</div>
									<div className="flex justify-between gap-3">
										<dt className="text-slate-500 dark:text-slate-400">{t('publishAs')}</dt>
										<dd className="font-medium">{account?.name}</dd>
									</div>
									<div className="flex justify-between gap-3">
										<dt className="text-slate-500 dark:text-slate-400">{t('navComments')}</dt>
										<dd className="font-medium tabular-nums">{validComments.length}</dd>
									</div>
									<div className="flex justify-between gap-3">
										<dt className="text-slate-500 dark:text-slate-400">{t('pacing')}</dt>
										<dd className="font-medium">{t('pacingEvery', { time: formatDuration(pacing, t) })}</dd>
									</div>
									<div className="flex justify-between gap-3">
										<dt className="text-slate-500 dark:text-slate-400">{t('estimatedTime')}</dt>
										<dd className="font-medium">{formatDuration(Math.max(0, validComments.length - 1) * pacing, t)}</dd>
									</div>
								</dl>
								{duplicateCount > 0 && (
									<p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
										<AlertTriangle className="size-4 shrink-0" aria-hidden />
										{t('duplicatesWillSkip', { n: duplicateCount })}
									</p>
								)}
								<p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('publishNotice')}</p>
								<div className="mt-5 flex flex-col gap-2">
									<Button onClick={() => submit(true)} disabled={create.isPending}>
										{create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
										{t('publishNow')}
									</Button>
									<Button variant="outline" className={outlineButtonClass} onClick={() => submit(false)} disabled={create.isPending}>
										<Save aria-hidden />
										{t('saveDraft')}
									</Button>
								</div>
							</Panel>
						</div>
					)}

					{step === 4 && (
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
							<Panel
								title={t('publishing')}
								description={t('publishingHint')}
								actions={
									<>
										<Button variant="outline" size="sm" className={outlineButtonClass} onClick={reset}>
											{t('createAnother')}
										</Button>
										<Button size="sm" asChild>
											<Link href={`${FB_BASE}/campaigns/${campaignId}`}>{t('openCampaign')}</Link>
										</Button>
									</>
								}
							>
								{campaign.data ? <CampaignProgress campaign={campaign.data} /> : <SkeletonList rows={2} />}
								<div className="mt-5">
									<LiveComments campaignId={campaignId} />
								</div>
							</Panel>
							<div className="lg:sticky lg:top-36 lg:self-start">
								<PostPreview post={post} account={account} compact />
							</div>
						</div>
					)}
				</motion.div>
			</AnimatePresence>

			{step < 3 && (
				<div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-800 dark:bg-slate-950/90">
					<Button variant="ghost" className={ghostButtonClass} onClick={() => go(step - 1)} disabled={step === 0}>
						<ArrowLeft className="rtl:rotate-180" aria-hidden />
						{t('back')}
					</Button>
					<Button onClick={() => go(step + 1)} disabled={!canNext}>
						{t('continue')}
						<ArrowRight className="rtl:rotate-180" aria-hidden />
					</Button>
				</div>
			)}
			{step === 3 && (
				<div className="flex justify-start">
					<Button variant="ghost" className={ghostButtonClass} onClick={() => go(2)} disabled={create.isPending}>
						<ArrowLeft className="rtl:rotate-180" aria-hidden />
						{t('back')}
					</Button>
				</div>
			)}
		</div>
	);
}
