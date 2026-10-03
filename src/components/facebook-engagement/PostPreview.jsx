'use client';

import { useState } from 'react';
import { ExternalLink, MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFbT } from './fb-i18n';
import { PageAvatar, useFbFormat } from './fb-ui';

export default function PostPreview({ post, account, comments = [], className, compact = false }) {
	const t = useFbT();
	const format = useFbFormat();
	const [expanded, setExpanded] = useState(false);
	if (!post) return null;

	const author = account || { name: post.authorName, pictureUrl: null };
	const message = post.message || '';
	const long = message.length > 280;

	return (
		<article
			className={cn(
				'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
				className,
			)}
		>
			<header className="flex items-center gap-3 px-4 pt-4">
				<PageAvatar account={author} className="size-10" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{author.name || post.authorName}</p>
					<p className="text-xs text-slate-500 dark:text-slate-400">{format.dateTime(post.publishedAt)}</p>
				</div>
				{post.permalinkUrl && (
					<a
						href={post.permalinkUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
						aria-label={t('openOnFacebook')}
						title={t('openOnFacebook')}
					>
						<ExternalLink className="size-4" aria-hidden />
					</a>
				)}
			</header>

			{message && (
				<div className="px-4 pt-3">
					<p
						className={cn(
							'whitespace-pre-line break-words text-sm leading-6 text-slate-800 dark:text-slate-200',
							!expanded && (compact ? 'line-clamp-3' : 'line-clamp-6'),
						)}
						dir="auto"
					>
						{message}
					</p>
					{long && (
						<button
							type="button"
							onClick={() => setExpanded((value) => !value)}
							className="mt-1 text-[13px] font-medium text-slate-500 hover:underline dark:text-slate-400"
						>
							{expanded ? t('showLess') : t('showMore')}
						</button>
					)}
				</div>
			)}

			{post.imageUrl && !compact && (
				<img
					src={post.imageUrl}
					alt=""
					className="mt-3 max-h-[420px] w-full bg-slate-100 object-cover dark:bg-slate-800"
					loading="lazy"
					referrerPolicy="no-referrer"
				/>
			)}

			<div className="mx-4 mt-3 flex items-center justify-between border-b border-slate-100 pb-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
				<span className="inline-flex items-center gap-1.5">
					<span className="grid size-4 place-items-center rounded-full bg-[#1877F2] text-white">
						<ThumbsUp className="size-2.5" aria-hidden />
					</span>
					{format.number(post.reactionsCount)}
				</span>
				<span className="flex items-center gap-3">
					<span className="inline-flex items-center gap-1">
						<MessageCircle className="size-3.5" aria-hidden />
						{format.number(post.commentsCount)}
					</span>
					<span className="inline-flex items-center gap-1">
						<Share2 className="size-3.5" aria-hidden />
						{format.number(post.sharesCount)}
					</span>
				</span>
			</div>

			{comments.length > 0 && (
				<ul className="space-y-2.5 px-4 py-3">
					{comments.map((comment, index) => (
						<li key={comment.key || comment.id || index} className="flex items-start gap-2">
							<PageAvatar account={comment.account || author} className="size-8" />
							<div className="min-w-0 max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
								<p className="text-[13px] font-semibold text-slate-900 dark:text-white">
									{(comment.account || author).name}
								</p>
								<p className="whitespace-pre-line break-words text-[13px] leading-5 text-slate-800 dark:text-slate-200" dir="auto">
									{comment.message}
								</p>
							</div>
						</li>
					))}
				</ul>
			)}
			{comments.length === 0 && <div className="h-3" />}
		</article>
	);
}
