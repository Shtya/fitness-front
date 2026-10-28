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
													{STORY_LIKE_EMOJIS.has(viewer.reaction) ? (
														<Heart size={18} fill="currentColor" strokeWidth={0} className="text-[#25d366]" />
													) : (
														viewer.reaction
													)}
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
