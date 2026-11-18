'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, Eye, Heart, Loader2, RefreshCw, SendHorizontal, Smile, X } from 'lucide-react';
import {
	STORY_QUICK_REACTIONS,
	formatStoryViewTime,
	storyViewCountLabel,
	storyViewerName,
} from './wa-story-interactions';

const STORY_LIKE_EMOJIS = new Set(['💚', '❤️', '❤']);

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

/** A viewer's photo, large, over the sheet: the stored thumb at once, the full one when it arrives. */
function ViewerPhoto({ viewer, locale, renderAvatar, fetchFullAvatar, onClose }) {
	const ar = locale === 'ar';
	const [fullUrl, setFullUrl] = useState(null);
	const [loadingFull, setLoadingFull] = useState(Boolean(fetchFullAvatar));
	useEffect(() => {
		let alive = true;
		setFullUrl(null);
		if (!fetchFullAvatar) return undefined;
		setLoadingFull(true);
		Promise.resolve(fetchFullAvatar(viewer))
			.then(url => alive && url && setFullUrl(url))
			.catch(() => undefined)
			.finally(() => alive && setLoadingFull(false));
		return () => {
			alive = false;
		};
	}, [viewer, fetchFullAvatar]);
	useEffect(() => {
		const onKey = event => {
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			onClose();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [onClose]);
	const src = fullUrl || viewer.avatarUrl || null;
	return (
		<motion.div
			key="viewer-photo"
			className="absolute inset-0 z-70 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 backdrop-blur-sm"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.16 }}
			onClick={event => {
				event.stopPropagation();
				onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-label={storyViewerName(viewer, locale)}
			data-testid="story-viewer-photo"
		>
			<motion.div
				className="relative aspect-square w-full max-w-[min(78vw,420px)] overflow-hidden rounded-3xl bg-white/5 shadow-2xl ring-1 ring-white/10"
				initial={{ scale: 0.86 }}
				animate={{ scale: 1 }}
				transition={{ type: 'spring', stiffness: 420, damping: 32 }}
				onClick={event => event.stopPropagation()}
			>
				{src ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={src} alt="" className="h-full w-full object-cover" />
				) : (
					<div className="grid h-full w-full place-items-center [&>*]:!h-40 [&>*]:!w-40 [&>*]:!text-5xl">
						{renderAvatar(viewer)}
					</div>
				)}
				{loadingFull ? (
					<span className="absolute end-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-black/50">
						<Loader2 size={14} className="animate-spin text-white/80" />
					</span>
				) : null}
			</motion.div>
			<p className="max-w-full truncate text-base font-black text-white">
				<bdi>{storyViewerName(viewer, locale)}</bdi>
			</p>
			<button
				type="button"
				onClick={onClose}
				className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
				aria-label={ar ? 'إغلاق' : 'Close'}
			>
				<X size={18} />
			</button>
		</motion.div>
	);
}

function replyPreview(reply, ar) {
	const text = String(reply?.text || '').trim();
	if (text) return text;
	const labels = ar
		? { image: '📷 صورة', video: '🎥 فيديو', audio: '🎤 رسالة صوتية', ptt: '🎤 رسالة صوتية', voice: '🎤 رسالة صوتية', sticker: 'ملصق', document: '📄 ملف' }
		: { image: '📷 Photo', video: '🎥 Video', audio: '🎤 Voice message', ptt: '🎤 Voice message', voice: '🎤 Voice message', sticker: 'Sticker', document: '📄 File' };
	return labels[String(reply?.type || '').toLowerCase()] || (ar ? 'رد' : 'Reply');
}

// Fresh profile photos for viewer rows whose stored one is missing or expired (WhatsApp CDN
// links are signed and expire). Shared across sheets, a few at a time, each person once.
const viewerAvatarCache = new Map(); // phone digits -> url | null (no photo) | Promise
const viewerAvatarQueue = [];
let viewerAvatarActive = 0;

function runViewerAvatarQueue() {
	while (viewerAvatarActive < 4 && viewerAvatarQueue.length) {
		viewerAvatarActive += 1;
		const job = viewerAvatarQueue.shift();
		job().finally(() => {
			viewerAvatarActive -= 1;
			runViewerAvatarQueue();
		});
	}
}

function fetchViewerAvatarOnce(key, viewer, fetchAvatar) {
	const known = viewerAvatarCache.get(key);
	if (known !== undefined) return Promise.resolve(known);
	const pending = new Promise(resolve => {
		viewerAvatarQueue.push(() =>
			Promise.resolve(fetchAvatar(viewer))
				.then(url => {
					viewerAvatarCache.set(key, url || null);
					resolve(url || null);
				})
				.catch(() => {
					// Offline or failed: try again next time instead of remembering "no photo".
					viewerAvatarCache.delete(key);
					resolve(null);
				}),
		);
		runViewerAvatarQueue();
	});
	viewerAvatarCache.set(key, pending);
	return pending;
}

function useViewerAvatar(viewer, fetchAvatar) {
	const key = String(viewer?.phone || '').replace(/\D/g, '');
	const stored = viewer?.avatarUrl || null;
	const [url, setUrl] = useState(() => {
		const known = key ? viewerAvatarCache.get(key) : undefined;
		return typeof known === 'string' ? known : stored;
	});
	useEffect(() => {
		let alive = true;
		const known = key ? viewerAvatarCache.get(key) : undefined;
		if (typeof known === 'string') {
			setUrl(known);
			return undefined;
		}
		const fresh = () => {
			if (!fetchAvatar || !key) {
				if (alive) setUrl(null);
				return;
			}
			fetchViewerAvatarOnce(key, viewer, fetchAvatar).then(next => alive && setUrl(next));
		};
		if (stored) {
			// Check the stored link first; an expired one is replaced by a fresh one.
			const probe = new Image();
			probe.referrerPolicy = 'no-referrer';
			probe.onload = () => alive && setUrl(stored);
			probe.onerror = fresh;
			probe.src = stored;
		} else {
			fresh();
		}
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- per person and stored photo
	}, [key, stored, fetchAvatar]);
	return url;
}

function ViewerAvatar({ viewer, renderAvatar, fetchAvatar, liked, locale, onOpen }) {
	const ar = locale === 'ar';
	const url = useViewerAvatar(viewer, fetchAvatar);
	const name = storyViewerName(viewer, locale);
	return (
		<button
			type="button"
			className="relative shrink-0 rounded-full transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 active:scale-95"
			onClick={() => onOpen({ ...viewer, avatarUrl: url })}
			aria-label={ar ? `صورة ${name}` : `${name}'s photo`}
			data-testid="story-viewer-avatar"
		>
			{/* Keyed by photo: a broken link hides its <img>, and a fresh link must get a new one. */}
			<span key={url || 'none'} className="block [&>*]:!h-11 [&>*]:!w-11 [&>*]:!ring-0">
				{renderAvatar({ ...viewer, avatarUrl: url })}
			</span>
			{viewer.reaction ? (
				<span
					className="absolute -bottom-0.5 -end-1 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#0f171c] px-[2px] text-[13px] leading-none"
					title={ar ? 'تفاعل' : 'Reaction'}
					data-testid="story-viewer-reaction"
				>
					{liked ? (
						<span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#25d366]">
							<Heart size={11} fill="#fff" strokeWidth={0} />
						</span>
					) : (
						viewer.reaction
					)}
				</span>
			) : null}
		</button>
	);
}

/** Who viewed your story, newest first, with each person's like/reaction and what they replied. */
export function StoryViewersSheet({
	open,
	locale,
	loading,
	error,
	data,
	onRetry,
	onClose,
	renderAvatar,
	fetchFullAvatar,
	fetchAvatar,
	onOpenReply,
}) {
	const titleId = useId();
	const ar = locale === 'ar';
	const viewers = Array.isArray(data?.viewers) ? data.viewers : [];
	const count = Number(data?.viewerCount ?? viewers.length) || 0;
	const likedViewers = viewers.filter(viewer => viewer.reaction);
	const repliedViewers = viewers.filter(viewer => Array.isArray(viewer.replies) && viewer.replies.length);
	const reactionCount = Number(data?.reactionCount) || likedViewers.length;
	const replyCount = Number(data?.replyCount) || 0;
	const [zoomed, setZoomed] = useState(null);
	const [tab, setTab] = useState('all');
	useEffect(() => {
		if (!open) {
			setZoomed(null);
			setTab('all');
		}
	}, [open]);
	const shown = tab === 'likes' ? likedViewers : tab === 'replies' ? repliedViewers : viewers;
	const tabs = [
		['all', ar ? 'الكل' : 'All', count],
		['likes', ar ? 'الإعجابات' : 'Likes', reactionCount],
		['replies', ar ? 'الردود' : 'Replies', replyCount],
	];
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
						className="relative flex max-h-[72%] min-h-[40%] flex-col overflow-hidden rounded-t-[28px] bg-[#0f171c] text-white shadow-2xl ring-1 ring-white/10"
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 420, damping: 38 }}
						onClick={event => event.stopPropagation()}
						dir={ar ? 'rtl' : 'ltr'}
					>
						<div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden="true" />
						<header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3">
							<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-400">
								<Eye size={18} aria-hidden="true" />
							</span>
							<div className="min-w-0 flex-1">
								<h2 id={titleId} className="truncate text-[15px] font-black leading-tight">
									{ar ? 'المشاهدات' : 'Views'}
								</h2>
								<p className="truncate text-xs text-white/50" aria-live="polite">
									{loading && !data
										? ar
											? 'جارٍ التحميل…'
											: 'Loading…'
										: ar
											? `شافها ${count}`
											: `Seen by ${count}`}
								</p>
							</div>
							{loading && data ? (
								<Loader2 size={15} className="shrink-0 animate-spin text-white/35" aria-label={ar ? 'تحديث' : 'Updating'} />
							) : null}
							<button
								type="button"
								onClick={onClose}
								className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/15"
								aria-label={ar ? 'إغلاق' : 'Close'}
							>
								<X size={17} />
							</button>
						</header>
						{data && (reactionCount || replyCount) ? (
							<div className="flex shrink-0 gap-1.5 px-5 pb-3" role="tablist" data-testid="story-viewers-totals">
								{tabs.map(([id, label, value]) =>
									id !== 'all' && !value ? null : (
										<button
											key={id}
											type="button"
											role="tab"
											aria-selected={tab === id}
											onClick={() => setTab(id)}
											className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold transition-colors ${
												tab === id ? 'bg-white text-[#0f171c]' : 'bg-white/10 text-white/75 hover:bg-white/15'
											}`}
										>
											{id === 'likes' ? (
												<Heart size={12} fill="currentColor" strokeWidth={0} className={tab === id ? 'text-[#1daa61]' : 'text-[#25d366]'} />
											) : null}
											{label}
											<span className={tab === id ? 'text-[#0f171c]/55' : 'text-white/45'}>{value}</span>
										</button>
									),
								)}
							</div>
						) : null}
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/5 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
								<ul aria-busy="true" className="pt-1">
									{[0, 1, 2].map(index => (
										<ViewerSkeleton key={index} />
									))}
								</ul>
							) : !shown.length ? (
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
								<ul data-testid="story-viewers-list" className="py-1">
									{shown.map(viewer => {
										const liked = STORY_LIKE_EMOJIS.has(viewer.reaction);
										const when = formatStoryViewTime(
											viewer.viewedAt || viewer.reactedAt || viewer.replies?.[0]?.at,
											locale,
										);
										return (
											<li
												key={viewer.id}
												data-testid="story-viewer-row"
												className="flex items-start gap-3.5 px-5 py-2.5 transition-colors hover:bg-white/[0.04]"
											>
												<ViewerAvatar
													viewer={viewer}
													renderAvatar={renderAvatar}
													fetchAvatar={fetchAvatar}
													liked={liked}
													locale={locale}
													onOpen={setZoomed}
												/>
												<div className="min-w-0 flex-1 pt-0.5 text-start">
													{/* bdi: each name reads in its own script, yet every name lines up on the
													    sheet's start edge (Arabic and English under each other). */}
													<p className="truncate text-[14.5px] font-bold leading-snug" data-testid="story-viewer-name">
														<bdi>{storyViewerName(viewer, locale)}</bdi>
													</p>
													<p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-white/50">
														<span>{when}</span>
														{viewer.reaction ? (
															<>
																<span aria-hidden="true">·</span>
																<span className={liked ? 'text-[#25d366]' : 'text-white/70'}>
																	{liked
																		? ar
																			? 'عجبته'
																			: 'Liked'
																		: ar
																			? `تفاعل ${viewer.reaction}`
																			: `Reacted ${viewer.reaction}`}
																</span>
															</>
														) : null}
													</p>
													{Array.isArray(viewer.replies) && viewer.replies.length ? (
														<ul className="mt-1.5 flex flex-col items-start gap-1" data-testid="story-viewer-replies">
															{viewer.replies.map(reply => (
																<li key={reply.messageId} className="max-w-full">
																	<button
																		type="button"
																		onClick={() => onOpenReply?.(reply, viewer)}
																		disabled={!onOpenReply}
																		className="max-w-full rounded-2xl rounded-ss-md bg-white/10 px-3 py-1.5 text-start text-[13px] leading-snug text-white/90 transition-colors hover:bg-white/15 disabled:cursor-default"
																		title={ar ? 'افتح الشات' : 'Open the chat'}
																		data-testid="story-viewer-reply"
																	>
																		<span className="line-clamp-3 whitespace-pre-wrap break-words">
																			<bdi>{replyPreview(reply, ar)}</bdi>
																		</span>
																		{reply.at ? (
																			<span className="mt-0.5 block text-[10.5px] text-white/45">
																				{formatStoryViewTime(reply.at, locale)}
																			</span>
																		) : null}
																	</button>
																</li>
															))}
														</ul>
													) : null}
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					</motion.section>
					<AnimatePresence>
						{zoomed ? (
							<ViewerPhoto
								viewer={zoomed}
								locale={locale}
								renderAvatar={renderAvatar}
								fetchFullAvatar={fetchFullAvatar}
								onClose={() => setZoomed(null)}
							/>
						) : null}
					</AnimatePresence>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

/**
 * The bar under someone else's story, laid out like the phone: reply field, a heart
 * that turns into Send while typing, and the emoji reactions in a tray behind the smiley.
 */
export function StoryComposer({
	locale,
	liked,
	liking,
	onToggleLike,
	reaction,
	sendingEmoji,
	onReact,
	draft,
	onDraftChange,
	sending,
	onSubmit,
	onFocusChange,
}) {
	const ar = locale === 'ar';
	const [trayOpen, setTrayOpen] = useState(false);
	const [heartBurst, setHeartBurst] = useState(0);
	const [emojiBurst, setEmojiBurst] = useState(null);
	const inputRef = useRef(null);
	const typing = draft.trim().length > 0;

	useEffect(() => {
		if (!emojiBurst) return undefined;
		const timer = window.setTimeout(() => setEmojiBurst(null), 900);
		return () => window.clearTimeout(timer);
	}, [emojiBurst]);

	const setTray = open => {
		setTrayOpen(open);
		onFocusChange?.(open || document.activeElement === inputRef.current);
	};

	const toggleLike = async () => {
		const next = !liked;
		const ok = await onToggleLike(next);
		if (ok && next) setHeartBurst(key => key + 1);
	};

	return (
		<div
			className="wa-story-composer relative z-40 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
			onClick={event => event.stopPropagation()}
		>
			<AnimatePresence>
				{emojiBurst ? (
					<motion.span
						key={emojiBurst.key}
						className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 text-5xl"
						initial={{ opacity: 0, y: 0, scale: 0.6 }}
						animate={{ opacity: 1, y: -110, scale: 1.3 }}
						exit={{ opacity: 0, y: -150 }}
						transition={{ duration: 0.7, ease: 'easeOut' }}
						aria-hidden="true"
					>
						{emojiBurst.emoji}
					</motion.span>
				) : null}
				{heartBurst ? (
					<motion.span
						key={`heart-${heartBurst}`}
						className="pointer-events-none absolute bottom-16 end-6 z-50 text-[#25d366]"
						initial={{ opacity: 0, scale: 0.4, y: 0 }}
						animate={{ opacity: [0, 1, 0], scale: [0.4, 1.5, 1.1], y: -70 }}
						transition={{ duration: 0.85, ease: 'easeOut' }}
						aria-hidden="true"
					>
						<Heart size={44} fill="currentColor" strokeWidth={0} />
					</motion.span>
				) : null}
			</AnimatePresence>
			<AnimatePresence initial={false}>
				{trayOpen ? (
					<motion.div
						key="tray"
						role="group"
						aria-label={ar ? 'تفاعل مع الحالة' : 'React to this story'}
						data-testid="story-reaction-bar"
						className="mb-2 flex items-center justify-between gap-1 overflow-x-auto rounded-full bg-black/55 px-2 py-1.5 ring-1 ring-white/10 backdrop-blur-xl"
						initial={{ opacity: 0, y: 12, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 12, scale: 0.96 }}
						transition={{ duration: 0.16 }}
					>
						{STORY_QUICK_REACTIONS.map(emoji => {
							const active = reaction === emoji;
							const busy = sendingEmoji === emoji;
							return (
								<button
									key={emoji}
									type="button"
									data-testid="story-reaction"
									data-emoji={emoji}
									aria-pressed={active}
									disabled={sending || Boolean(sendingEmoji)}
									onClick={async () => {
										const sent = await onReact(emoji);
										if (sent) {
											setEmojiBurst({ emoji, key: Date.now() });
											setTray(false);
										}
									}}
									className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[23px] leading-none transition-transform hover:scale-125 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
										active ? 'bg-white/20 ring-2 ring-[#25d366]' : 'hover:bg-white/10'
									}`}
								>
									{busy ? <Loader2 size={18} className="animate-spin text-white" /> : emoji}
								</button>
							);
						})}
					</motion.div>
				) : null}
			</AnimatePresence>
			<form
				onSubmit={event => {
					event.preventDefault();
					if (typing && !sending) onSubmit();
				}}
				className="flex items-center gap-2"
			>
				<div className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-full bg-white/12 ps-1.5 pe-4 ring-1 ring-white/15 backdrop-blur-xl transition-[background-color,box-shadow] focus-within:bg-white/18 focus-within:ring-white/35">
					<button
						type="button"
						onClick={() => setTray(!trayOpen)}
						aria-expanded={trayOpen}
						aria-label={ar ? 'تفاعلات سريعة' : 'Quick reactions'}
						className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
							trayOpen ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
						}`}
					>
						{reaction && !trayOpen ? (
							<span className="text-lg leading-none">{reaction}</span>
						) : (
							<Smile size={20} />
						)}
					</button>
					<input
						ref={inputRef}
						type="text"
						value={draft}
						onChange={event => onDraftChange(event.target.value)}
						onFocus={() => onFocusChange?.(true)}
						onBlur={() => onFocusChange?.(trayOpen)}
						placeholder={ar ? 'رد…' : 'Reply…'}
						maxLength={1000}
						disabled={sending}
						dir="auto"
						className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/55"
					/>
				</div>
				<AnimatePresence mode="popLayout" initial={false}>
					{typing ? (
						<motion.button
							key="send"
							type="submit"
							disabled={sending}
							aria-label={ar ? 'إرسال الرد' : 'Send reply'}
							className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#00a884] text-white shadow-lg shadow-black/30 transition-colors hover:bg-[#06cf9c] disabled:opacity-60"
							initial={{ scale: 0.6, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.6, opacity: 0 }}
							transition={{ duration: 0.14 }}
						>
							{sending ? (
								<Loader2 size={19} className="animate-spin" />
							) : (
								<SendHorizontal size={20} className="rtl:-scale-x-100" />
							)}
						</motion.button>
					) : (
						<motion.button
							key="like"
							type="button"
							onClick={() => void toggleLike()}
							disabled={liking}
							aria-pressed={Boolean(liked)}
							data-testid="story-like"
							aria-label={
								liked ? (ar ? 'إلغاء الإعجاب' : 'Unlike story') : ar ? 'أعجبني' : 'Like story'
							}
							title={liked ? (ar ? 'إلغاء الإعجاب' : 'Unlike') : ar ? 'أعجبني' : 'Like'}
							className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 backdrop-blur-xl transition-colors disabled:opacity-60 ${
								liked
									? 'bg-[#25d366]/20 text-[#25d366] ring-[#25d366]/50'
									: 'bg-white/12 text-white ring-white/15 hover:bg-white/20'
							}`}
							initial={{ scale: 0.6, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.6, opacity: 0 }}
							whileTap={{ scale: 0.85 }}
							transition={{ duration: 0.14 }}
						>
							{liking ? (
								<Loader2 size={19} className="animate-spin" />
							) : (
								<motion.span
									key={liked ? 'on' : 'off'}
									initial={{ scale: liked ? 0.5 : 1 }}
									animate={{ scale: 1 }}
									transition={{ type: 'spring', stiffness: 520, damping: 14 }}
									className="grid place-items-center"
								>
									<Heart size={22} fill={liked ? 'currentColor' : 'none'} strokeWidth={2.2} />
								</motion.span>
							)}
						</motion.button>
					)}
				</AnimatePresence>
			</form>
		</div>
	);
}
