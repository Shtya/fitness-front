'use client';

import { memo } from 'react';
import { AlertCircle, BellOff, Bot, Check, CheckCheck, ChevronDown, Clock, MapPin, Pin, Star, Trash2, Video } from 'lucide-react';
import { conversationTitle, conversationAvatarUrl, conversationUnreadCount, messageDeliveryState, messageTextPresentation, conversationPreview, conversationPreviewShowsReaction, isDeletedWhatsAppMessage } from '../whatsapp-utils';
import { whatsappFileIconSrc } from '../whatsapp-file-icons';
import { Avatar } from './WaAvatar';

export const GRADIENT = 'linear-gradient(135deg, #1DAB61 0%, #1DAB61 100%)';

export function DeliveryTicks({ message, size = 13, className = '', selfChat = false }) {
	const state = messageDeliveryState(message, { selfChat });
	if (state === 'hidden') return null;
	if (state === 'pending') {
		return <Clock size={Math.max(12, size - 1)} className={`animate-pulse ${className}`} />;
	}
	if (state === 'failed') {
		const ar = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
		const reason = message?.sendError ? String(message.sendError) : '';
		return (
			<button
				type="button"
				aria-label={`${ar ? 'لم تُرسل الرسالة. إعادة المحاولة' : 'Message not sent. Retry'}${reason ? ` — ${reason}` : ''}`}
				title={reason ? `${ar ? 'إعادة المحاولة' : 'Retry'} — ${reason}` : ar ? 'إعادة المحاولة' : 'Retry'}
				className={`wa-delivery-retry inline-flex items-center ${className}`}
				onClick={event => {
					event.preventDefault();
					event.stopPropagation();
					window.dispatchEvent(
						new CustomEvent('wa-retry-outbound', { detail: { message } }),
					);
				}}
			>
				<AlertCircle size={size} className="text-rose-500" aria-hidden="true" />
				{/* The bare icon was easy to miss; in a bubble the action is spelled out. */}
				<span className="wa-delivery-retry__label">{ar ? 'إعادة' : 'Retry'}</span>
			</button>
		);
	}
	if (state === 'read') {
		return <CheckCheck size={size} className={`text-[#53BDEB] ${className}`} />;
	}
	if (state === 'delivered') {
		return <CheckCheck size={size} className={`text-[#8696A0] ${className}`} />;
	}
	return <Check size={size} className={className} />;
}

/* Segmented "stepper" ring around a story avatar — one arc per item, filled for
	 viewed items and gradient-highlighted for unviewed ones. Replaces the old
	 plain N/M count badge. */
function polarToCartesian(cx, cy, r, angleDeg) {
	const rad = ((angleDeg - 90) * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
	const start = polarToCartesian(cx, cy, r, endAngle);
	const end = polarToCartesian(cx, cy, r, startAngle);
	const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
	return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function StoryRing({ size = 80, strokeWidth = 3, segmentsViewed, idSuffix = '' }) {
	const segs = segmentsViewed && segmentsViewed.length ? segmentsViewed : [false];
	const n = segs.length;
	const r = (size - strokeWidth) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const gap = n > 1 ? Math.min(10, 360 / n / 3) : 0;
	const step = 360 / n;
	// Unique id per instance — reusing one static id across every ring in the
	// grid caused browsers to resolve url(#id) inconsistently, which is why
	// only some rings were rendering their stroke.
	const gradId = `storyRingGradient-${idSuffix || Math.random().toString(36).slice(2)}`;
	return (
		<svg viewBox={`0 0 ${size} ${size}`} className="wa-story-ring opacity-80" aria-hidden="true">
			<defs>
				<linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#25D366" />
					<stop offset="100%" stopColor="#128C7E" />
				</linearGradient>
			</defs>
			{segs.map((viewed, i) => {
				if (n === 1) {
					return (
						<circle
							key={i}
							cx={cx}
							cy={cy}
							r={r}
							fill="none"
							stroke={viewed ? '#cbd5e1' : `url(#${gradId})`}
							strokeWidth={strokeWidth}
						/>
					);
				}
				const start = i * step + gap / 2;
				const end = (i + 1) * step - gap / 2;
				return (
					<path
						key={i}
						d={describeArc(cx, cy, r, start, end)}
						fill="none"
						stroke={viewed ? '#cbd5e1' : `url(#${gradId})`}
						strokeWidth={strokeWidth}
						strokeLinecap="round"
					/>
				);
			})}
		</svg>
	);
}

export function conversationTimestamp(value, locale) {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '';
	const now = new Date();
	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();
	if (sameDay) {
		return new Intl.DateTimeFormat(locale, {
			hour: 'numeric',
			minute: '2-digit',
		}).format(date);
	}
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
	}).format(date);
}

function CameraPreviewIcon({ className = '' }) {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
			<path fillRule="evenodd" clipRule="evenodd" d="M9.86992 5C9.63121 5 9.40038 5.08539 9.21913 5.24074L7.45833 6.75H5C3.89543 6.75 3 7.64543 3 8.75V17.25C3 18.3546 3.89543 19.25 5 19.25H19C20.1046 19.25 21 18.3546 21 17.25V8.75C21 7.64543 20.1046 6.75 19 6.75H16.5417L14.7809 5.24074C14.5996 5.08539 14.3688 5 14.1301 5H9.86992ZM12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17ZM12 15.75C13.5188 15.75 14.75 14.5188 14.75 13C14.75 11.4812 13.5188 10.25 12 10.25C10.4812 10.25 9.25 11.4812 9.25 13C9.25 14.5188 10.4812 15.75 12 15.75ZM17.5 11.25C18.0523 11.25 18.5 10.8023 18.5 10.25C18.5 9.69772 18.0523 9.25 17.5 9.25C16.9477 9.25 16.5 9.69772 16.5 10.25C16.5 10.8023 16.9477 11.25 17.5 11.25Z" fill="currentColor" />
		</svg>
	);
}

function ConversationPreviewIcon({ type }) {
	const normalizedType = String(type || '').toLowerCase();
	const props = { size: 15, strokeWidth: 2, className: 'shrink-0 text-[#667781]' };
	if (['image', 'photo'].includes(normalizedType)) {
		return <CameraPreviewIcon className={props.className} />;
	}
	if (['audio', 'ptt', 'voice'].includes(normalizedType)) {
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={props.className}
				aria-hidden="true"
			>
				<path d="M12 19v3" />
				<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
				<rect x="9" y="2" width="6" height="13" rx="3" fill="currentColor" />
			</svg>
		);
	}
	if (['location', 'live_location'].includes(normalizedType)) return <MapPin {...props} />;
	if (normalizedType === 'video') return <Video {...props} />;
	if (normalizedType === 'document') {
		return (
			<img
				src={whatsappFileIconSrc('file')}
				alt=""
				aria-hidden="true"
				className={`h-4 w-4 shrink-0 object-contain ${props.className || ''}`}
			/>
		);
	}
	if (normalizedType === 'sticker') {
		return (
			<img
				src="/sticker.svg"
				alt=""
				aria-hidden="true"
				className="h-4 w-4 shrink-0 object-contain"
			/>
		);
	}
	return null;
}

export function TypingIndicator({ locale = 'en', recording = false, senderName = '', count = 1, className = '' }) {
	const many = count > 1;
	const action = recording
		? locale === 'ar' ? (many ? 'بيسجلوا صوت الآن' : 'يسجل صوت الآن') : (many ? 'are recording' : 'recording')
		: locale === 'ar' ? (many ? 'بيكتبوا الآن' : 'يكتب الآن') : (many ? 'are typing' : 'typing');
	const label = senderName ? `${senderName} ${action}` : action;
	return (
		<span className={`wa-typing-indicator ${className}`.trim()} aria-live="polite">
			<span className="wa-typing-dots" aria-hidden="true">
				<i />
				<i />
				<i />
			</span>
			<span className="wa-typing-indicator__label">{label}</span>
		</span>
	);
}

/** Inbox row. Props are primitives or stable references so presence/typing on one chat re-renders one row. */
export const WaConversationRow = memo(function WaConversationRow({
	conversation,
	active,
	isSplitSecondary,
	story,
	viewedStatusIds,
	collapsed,
	demoEnabled,
	pinPending,
	favoritePending,
	selfChat,
	locale,
	t,
	actions,
	agentBadge = null,
	privacyBlurred = false,
}) {
	const title = conversationTitle(conversation);
	const titlePresentation = messageTextPresentation(title);
	const previewText = conversationPreview(conversation, locale);
	const lastMessageDeleted = isDeletedWhatsAppMessage(conversation.lastMessage);
	const previewShowsReaction = conversationPreviewShowsReaction(conversation, locale);
	const typing = Boolean(
		conversation.isTyping ||
		conversation.typing ||
		conversation.presence?.typing,
	);
	const isGroup = conversation.type === 'group';
	const typingName = isGroup ? String(conversation.presence?.senderName || '').trim() : '';
	const typingMany = (conversation.presence?.typers?.length || 0) > 1;
	const typingText = typingName
		? locale === 'ar'
			? `${typingName} ${typingMany ? 'بيكتبوا' : 'يكتب'}…`
			: `${typingName} ${typingMany ? 'are' : 'is'} typing…`
		: locale === 'ar'
			? 'يكتب الآن…'
			: 'typing…';
	const previewPresentation = messageTextPresentation(typing ? typingText : previewText);
	const unreadCount = conversationUnreadCount(conversation);
	const unread = unreadCount > 0;
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => actions.click(conversation)}
			onPointerEnter={event => {
				actions.prefetch(conversation.id);
				if (!collapsed) return;
				const rect = event.currentTarget.getBoundingClientRect();
				const isRtl = locale === 'ar';
				actions.showTip({
					title,
					preview: typing ? typingText : previewText,
					unread: unreadCount,
					privacyBlurred,
					top: rect.top + rect.height / 2,
					left: isRtl ? rect.left - 8 : rect.right + 8,
					align: isRtl ? 'end' : 'start',
					dir: titlePresentation.dir,
				});
			}}
			onPointerDown={event => actions.longPressStart(event, conversation)}
			onPointerMove={actions.longPressCancel}
			onPointerUp={actions.longPressCancel}
			onPointerCancel={actions.longPressCancel}
			onPointerLeave={() => {
				actions.longPressCancel();
				if (collapsed) actions.showTip(null);
			}}
			onContextMenu={event => actions.contextMenu(event, conversation)}
			onKeyDown={event => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					actions.keyActivate(conversation);
				}
			}}
			className={`wa-conversation-row relative flex w-full cursor-pointer items-start gap-3 text-start transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_72px] ${unread ? 'is-unread' : ''} ${
				active
					? isSplitSecondary
						? 'is-active is-split-secondary'
						: 'is-active'
					: ''
			}`}
			aria-current={active && !isSplitSecondary ? 'true' : undefined}
			data-selected={active ? 'true' : undefined}
			data-conversation-id={conversation.id}
			data-privacy-chat={privacyBlurred ? 'on' : undefined}
		>
			<div className="wa-conversation-avatar relative grid h-11 w-11 shrink-0 place-items-center">
				{story ? (
					<>
						<StoryRing
							size={collapsed ? 44 : 48}
							strokeWidth={2}
							segmentsViewed={story.items.map(item =>
								Boolean(viewedStatusIds?.has(item.id)),
							)}
							idSuffix={`chat-${conversation.id}`}
						/>
						<button
							type="button"
							aria-label={locale === 'ar' ? `عرض حالة ${title}` : `View ${title}'s story`}
							onClick={event => {
								event.stopPropagation();
								actions.openStory(story);
							}}
							className="wa-story-avatar"
						>
							<Avatar
								label={title}
								size={9}
								isGroup={isGroup}
								src={conversationAvatarUrl(conversation)}
								conversationId={conversation.id}
								onAvatarRefreshed={url => actions.applyAvatar?.(conversation.id, url)}
								className="!ring-0"
							/>
						</button>
					</>
				) : (
					<Avatar
						label={title}
						size={11}
						isGroup={isGroup}
						src={conversationAvatarUrl(conversation)}
						conversationId={conversation.id}
						onAvatarRefreshed={url => actions.applyAvatar?.(conversation.id, url)}
					/>
				)}
				{!isGroup && conversation.presence?.online && !unread && (
					<span className="wa-avatar-online-dot" aria-label={locale === 'ar' ? 'متصل' : 'Online'} />
				)}
				{unread && (
					<span className="wa-unread-avatar-badge">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<p
						className={`title-chat truncate ${titlePresentation.className}`}
						dir={titlePresentation.dir}
						lang={titlePresentation.lang}
						title={title}
					>
						{title}
					</p>
					<div className="flex shrink-0 items-center gap-1">
						{agentBadge ? (
							<span
								className={`wa-agent-row-badge is-${agentBadge}`}
								data-wa-agent-badge={agentBadge}
								title={t.agentBadges?.[agentBadge]}
								aria-label={t.agentBadges?.[agentBadge]}
							>
								<Bot size={12} strokeWidth={2.2} />
							</span>
						) : null}
						{conversation.isMuted ? (
							<span
								className="text-slate-400"
								title={t.muteChat}
								aria-label={t.muteChat}
							>
								<BellOff size={13} strokeWidth={2.2} />
							</span>
						) : null}
						<button
							type="button"
							disabled={demoEnabled || pinPending}
							onClick={event => actions.togglePinned(conversation, event)}
							aria-label={conversation.isPinned ? t.unpinChat : t.pinChat}
							className={`wa-conversation-preference wa-conversation-pin rounded p-0.5 disabled:opacity-50 ${
								conversation.isPinned ? 'is-on text-[var(--color-primary-500)]' : 'text-slate-400 hover:text-[var(--color-primary-500)]'
							}`}
						>
							<Pin
								size={15}
								strokeWidth={2.2}
								fill={conversation.isPinned ? 'currentColor' : 'none'}
							/>
						</button>
						<button
							type="button"
							disabled={demoEnabled || favoritePending}
							onClick={event => actions.toggleFavorite(conversation, event)}
							aria-label={t.favoriteChats}
							className={`wa-conversation-preference rounded p-0.5 disabled:opacity-50 ${conversation.isFavorite
								? 'text-amber-500'
								: 'text-slate-300 hover:text-amber-500'
								}`}
						>
							<Star
								size={13}
								fill={conversation.isFavorite ? 'currentColor' : 'none'}
							/>
						</button>
						{conversation.lastMessageAt && (
							<span className={`time-chat text-[10px] ${unread ? 'is-unread' : ''}`}>
								{conversationTimestamp(
									conversation.lastMessage?.providerTimestamp ||
									conversation.lastMessageAt,
									locale,
								)}
							</span>
						)}
					</div>
				</div>
				<div className="mt-0.5 flex items-center justify-between gap-2">
					<p className={`desc-chat flex min-w-0 items-center gap-1 truncate text-sm ${typing ? 'is-typing' : lastMessageDeleted ? 'wa-conversation-preview--deleted' : 'text-[#667781]'}`}>
						{typing ? (
							<TypingIndicator
								locale={locale}
								recording={Boolean(conversation.presence?.recording)}
								senderName={conversation.presence?.senderName || ''}
								count={conversation.presence?.typers?.length || 1}
							/>
						) : (
							<>
								{lastMessageDeleted && (
									<Trash2 size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
								)}
								{!lastMessageDeleted &&
									!previewShowsReaction &&
									conversation.lastMessage?.direction === 'outbound' && (
									<span className="shrink-0">
										<DeliveryTicks
											message={conversation.lastMessage}
											size={16}
											selfChat={selfChat}
										/>
									</span>
								)}
								{!lastMessageDeleted && !previewShowsReaction && (
									<ConversationPreviewIcon
										type={conversation.lastMessage?.type}
									/>
								)}
								<span
									className={`truncate ${previewPresentation.className}${
										previewShowsReaction ? ' wa-conversation-preview--reaction' : ''
									}`}
									dir={previewPresentation.dir}
									lang={previewPresentation.lang}
								>
									{previewText}
								</span>
							</>
						)}
					</p>
					{unread && (
						<span
							className="wa-row-unread grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold text-white"
							style={{ background: GRADIENT }}
						>
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</div>
			</div>
			{actions.openMenu && !collapsed ? (
				<button
					type="button"
					className="wa-row-more"
					aria-label={locale === 'ar' ? `خيارات ${title}` : `${title} options`}
					title={locale === 'ar' ? 'خيارات' : 'Options'}
					aria-haspopup="menu"
					onPointerDown={event => event.stopPropagation()}
					onClick={event => {
						event.stopPropagation();
						actions.openMenu(event, conversation);
					}}
					onKeyDown={event => event.stopPropagation()}
				>
					<ChevronDown size={20} strokeWidth={2.2} />
				</button>
			) : null}
		</div>
	);
});
