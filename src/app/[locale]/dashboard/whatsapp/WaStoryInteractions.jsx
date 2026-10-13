'use client';

import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import {
	STORY_QUICK_REACTIONS,
	formatStoryViewTime,
	storyViewCountLabel,
	storyViewerName,
} from './wa-story-interactions';

/** Bottom bar on your own story: eye + count, opens the viewer list (WhatsApp's swipe-up). */
export function StoryViewsButton({ count, locale, onOpen }) {
	return (
		<button
			type="button"
			data-testid="story-views-button"
			onClick={event => {
				event.preventDefault();
				event.stopPropagation();
				onOpen();
			}}
			className="relative z-40 flex w-full flex-col items-center gap-0.5 border-t border-white/10 bg-black/45 px-4 pb-3 pt-2 text-white backdrop-blur-md transition-colors hover:bg-black/60"
			aria-label={locale === 'ar' ? 'عرض من شاهد الحالة' : 'See who viewed this story'}
		>
			<ChevronUp size={16} className="text-white/60" aria-hidden="true" />
			<span className="inline-flex items-center gap-1.5 text-sm font-bold">
				<Eye size={16} aria-hidden="true" />
				<span data-testid="story-views-count">{storyViewCountLabel(count, locale)}</span>
			</span>
		</button>
	);
}

function ViewerSkeleton() {
	return (
		<li className="flex items-center gap-3 px-4 py-2.5" aria-hidden="true">
			<span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
			<span className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
				<span className="h-2.5 w-20 animate-pulse rounded-full bg-white/5" />
			</span>
		</li>
	);
}

/** Who viewed your story, newest first, with the emoji each person reacted with. */
export function StoryViewersSheet({ open, locale, loading, error, data, onRetry, onClose, renderAvatar }) {
	const titleId = useId();
	const ar = locale === 'ar';
	const viewers = Array.isArray(data?.viewers) ? data.viewers : [];
	const count = Number(data?.viewerCount ?? viewers.length) || 0;
	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					key="story-viewers"
					className="absolute inset-0 z-60 flex flex-col justify-end"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18 }}
					onClick={event => {
						event.stopPropagation();
						onClose();
					}}
				>
					<div className="absolute inset-0 bg-black/55" aria-hidden="true" />
					<motion.section
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						data-testid="story-viewers-sheet"
						className="relative flex max-h-[72%] min-h-[40%] flex-col overflow-hidden rounded-t-3xl bg-[#111b21]/95 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 420, damping: 38 }}
						onClick={event => event.stopPropagation()}
						dir={ar ? 'rtl' : 'ltr'}
					>
						<div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
						<header className="flex items-center gap-3 px-4 pb-2 pt-3">
							<Eye size={18} className="text-emerald-400" aria-hidden="true" />
							<h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-black">
								{loading && !data
									? ar
										? 'جارٍ تحميل المشاهدات…'
										: 'Loading views…'
									: ar
										? `شوهدت بواسطة ${count}`
										: `Viewed by ${count}`}
							</h2>
							<button
								type="button"
								onClick={onClose}
								className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
								aria-label={ar ? 'إغلاق' : 'Close'}
							>
								<X size={17} />
							</button>
						</header>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
							{error && !data ? (
								<div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
									<p className="text-sm font-bold text-white/90">
										{ar ? 'تعذر تحميل المشاهدات' : 'Could not load views'}
									</p>
									<p className="text-xs text-white/55">{error}</p>
									<button
										type="button"
										onClick={onRetry}
										className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold transition-colors hover:bg-white/25"
									>
										<RefreshCw size={14} />
										{ar ? 'إعادة المحاولة' : 'Try again'}
									</button>
								</div>
							) : loading && !data ? (
								<ul aria-busy="true">
									{[0, 1, 2, 3].map(index => (
										<ViewerSkeleton key={index} />
									))}
								</ul>
							) : !viewers.length ? (
								<div className="flex flex-col items-center gap-2 px-6 py-10 text-center" data-testid="story-viewers-empty">
									<span className="grid h-14 w-14 place-items-center rounded-full bg-white/5">
										<Eye size={24} className="text-white/40" aria-hidden="true" />
									</span>
									<p className="text-sm font-bold text-white/85">
										{ar ? 'لا توجد مشاهدات بعد' : 'No views yet'}
									</p>
									<p className="max-w-xs text-xs leading-relaxed text-white/50">
										{ar
											? 'سيظهر هنا من يشاهد حالتك. لا يظهر من أوقف إيصالات القراءة.'
											: 'People who view your story appear here. Anyone with read receipts off will not.'}
									</p>
								</div>
							) : (
								<ul data-testid="story-viewers-list">
									{loading ? (
										<li className="flex justify-center py-1" aria-hidden="true">
											<Loader2 size={14} className="animate-spin text-white/40" />
										</li>
									) : null}
									{viewers.map(viewer => (
										<li
											key={viewer.id}
											data-testid="story-viewer-row"
											className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
										>
											{renderAvatar(viewer)}
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-bold" dir="auto">
													{storyViewerName(viewer, locale)}
												</p>
												<p className="truncate text-xs text-white/55">
													{formatStoryViewTime(viewer.viewedAt || viewer.reactedAt, locale)}
												</p>
											</div>
											{viewer.reaction ? (
												<span
													className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl leading-none"
													title={ar ? 'تفاعل' : 'Reaction'}
													data-testid="story-viewer-reaction"
												>
													{viewer.reaction}
												</span>
											) : null}
										</li>
									))}
								</ul>
							)}
						</div>
					</motion.section>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

/** Quick emoji reactions under someone else's story. `onReact` resolves true when sent. */
export function StoryReactionBar({ locale, selected, sendingEmoji, disabled, onReact }) {
	const [burst, setBurst] = useState(null);
	useEffect(() => {
		if (!burst) return undefined;
		const timer = window.setTimeout(() => setBurst(null), 900);
		return () => window.clearTimeout(timer);
	}, [burst]);
	return (
		<div
			className="relative z-40 border-t border-white/10 bg-black/45 px-2 pt-2 backdrop-blur-md"
			onClick={event => event.stopPropagation()}
		>
			<AnimatePresence>
				{burst ? (
					<motion.span
						key={burst.key}
						className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 text-5xl"
						initial={{ opacity: 0, y: 0, scale: 0.6 }}
						animate={{ opacity: 1, y: -90, scale: 1.25 }}
						exit={{ opacity: 0, y: -130 }}
						transition={{ duration: 0.7, ease: 'easeOut' }}
						aria-hidden="true"
					>
						{burst.emoji}
					</motion.span>
				) : null}
			</AnimatePresence>
			<div
				role="group"
				aria-label={locale === 'ar' ? 'تفاعل مع الحالة' : 'React to this story'}
				className="flex items-center justify-between gap-1 overflow-x-auto"
				data-testid="story-reaction-bar"
			>
				{STORY_QUICK_REACTIONS.map(emoji => {
					const active = selected === emoji;
					const busy = sendingEmoji === emoji;
					return (
						<button
							key={emoji}
							type="button"
							data-testid="story-reaction"
							data-emoji={emoji}
							aria-pressed={active}
							disabled={disabled || Boolean(sendingEmoji)}
							onClick={async () => {
								const sent = await onReact(emoji);
								if (sent) setBurst({ emoji, key: Date.now() });
							}}
							className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[22px] leading-none transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
								active ? 'bg-emerald-500/30 ring-2 ring-emerald-400' : 'hover:bg-white/10'
							}`}
						>
							{busy ? <Loader2 size={18} className="animate-spin text-white" /> : emoji}
						</button>
					);
				})}
			</div>
		</div>
	);
}
