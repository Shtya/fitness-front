'use client';

import { useState } from 'react';
import { CheckCircle2, ImageOff, Link2, ListChecks, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiErrorMessage, fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';
import { useFbMutation, useFbPagePosts } from './fb-hooks';
import { useFbT } from './fb-i18n';
import { EmptyState, ErrorState, inputClass, outlineButtonClass, SkeletonList, useFbFormat } from './fb-ui';

export default function PostPicker({ accountId, selectedPost, onSelect }) {
	const t = useFbT();
	const format = useFbFormat();
	const [mode, setMode] = useState('url');
	const [reference, setReference] = useState('');
	const [urlError, setUrlError] = useState('');
	const [pendingId, setPendingId] = useState(null);
	const posts = useFbPagePosts(mode === 'list' ? accountId : null);

	const resolve = useFbMutation((ref) => fbEngagementApi.resolvePost({ accountId, reference: ref }), {
		silentError: true,
		onSuccess: (post) => {
			setUrlError('');
			onSelect(post);
		},
	});

	const submitUrl = (event) => {
		event.preventDefault();
		if (!reference.trim()) return;
		resolve.mutate(reference.trim(), { onError: (error) => setUrlError(apiErrorMessage(error)) });
	};

	const pick = (item) => {
		setPendingId(item.externalId);
		resolve.mutate(item.externalId, {
			onError: (error) => setUrlError(apiErrorMessage(error)),
			onSettled: () => setPendingId(null),
		});
	};

	const items = posts.data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<div className="space-y-4">
			<div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
				{[
					{ id: 'url', icon: Link2, label: t('pasteLink') },
					{ id: 'list', icon: ListChecks, label: t('chooseFromPage') },
				].map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={mode === tab.id}
						onClick={() => {
							setMode(tab.id);
							setUrlError('');
						}}
						className={cn(
							'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
							mode === tab.id
								? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
								: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
						)}
					>
						<tab.icon className="size-4" aria-hidden />
						{tab.label}
					</button>
				))}
			</div>

			{mode === 'url' ? (
				<form onSubmit={submitUrl} className="space-y-2">
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							type="url"
							inputMode="url"
							value={reference}
							onChange={(event) => setReference(event.target.value)}
							placeholder="https://www.facebook.com/yourpage/posts/…"
							className={inputClass}
							aria-label={t('postLink')}
							aria-invalid={Boolean(urlError)}
							dir="ltr"
						/>
						<Button type="submit" disabled={!reference.trim() || resolve.isPending} className="sm:w-36">
							{resolve.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
							{t('findPost')}
						</Button>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400">{t('postLinkHint')}</p>
				</form>
			) : posts.isLoading ? (
				<SkeletonList rows={3} />
			) : posts.isError ? (
				<ErrorState error={posts.error} onRetry={() => posts.refetch()} />
			) : items.length === 0 ? (
				<EmptyState icon={ImageOff} title={t('noPagePosts')} description={t('noPagePostsHint')} />
			) : (
				<div className="space-y-3">
					<ul className="grid gap-3 sm:grid-cols-2">
						{items.map((item) => {
							const selected = selectedPost?.externalId === item.externalId;
							return (
								<li key={item.externalId}>
									<button
										type="button"
										onClick={() => pick(item)}
										disabled={resolve.isPending}
										className={cn(
											'group flex w-full gap-3 rounded-xl border p-3 text-start transition',
											selected
												? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-500)]/20 dark:bg-[var(--color-primary-500)]/10'
												: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
										)}
									>
										{item.imageUrl ? (
											<img
												src={item.imageUrl}
												alt=""
												className="size-16 shrink-0 rounded-lg bg-slate-100 object-cover dark:bg-slate-800"
												loading="lazy"
												referrerPolicy="no-referrer"
											/>
										) : (
											<span className="grid size-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
												<ImageOff className="size-5" aria-hidden />
											</span>
										)}
										<span className="min-w-0 flex-1">
											<span className="line-clamp-2 text-[13px] leading-5 text-slate-800 dark:text-slate-200" dir="auto">
												{item.message || t('noCaption')}
											</span>
											<span className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
												{format.relative(item.publishedAt)}
												<span aria-hidden>·</span>
												{t('commentsCount', { n: format.number(item.commentsCount) })}
											</span>
										</span>
										{pendingId === item.externalId ? (
											<Loader2 className="size-5 shrink-0 animate-spin text-slate-400" aria-hidden />
										) : (
											selected && <CheckCircle2 className="size-5 shrink-0 text-[var(--color-primary-600)]" aria-hidden />
										)}
									</button>
								</li>
							);
						})}
					</ul>
					{posts.hasNextPage && (
						<div className="flex justify-center">
							<Button
								variant="outline"
								className={outlineButtonClass}
								onClick={() => posts.fetchNextPage()}
								disabled={posts.isFetchingNextPage}
							>
								{posts.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
								{t('loadMore')}
							</Button>
						</div>
					)}
				</div>
			)}

			{urlError && (
				<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
					{urlError}
				</p>
			)}
		</div>
	);
}
