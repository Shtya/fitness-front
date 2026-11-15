'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, BookmarkPlus, Copy, Check, CheckCheck, ChevronRight, CircleDashed, Pencil, FileVideo, Forward, Images, Info, LayoutGrid, ListChecks, Languages, Loader2, Mic, MoreHorizontal, Pin, Plus, Reply, Send, Smile, Star, Trash2, Video, X } from 'lucide-react';
import { isSelectableTranscriptMessage } from '../../transcript/transcription-client';
import { firstSocialVideoLink, isViewOnceMessage, computeAnchoredMenuPosition } from '../whatsapp-utils';
import { useMenuKeyboard } from '../wa-ui-menu';
import { BoardColumnPickerMenu } from '../BoardColumnPicker';
import { isDemoId } from '../demo/demo-read-model';
import { isPersistedAttachmentId } from './wa-attachment-blobs';
import { WhatsAppFormattedText } from './WaFormattedText';
import { useFreshPressGuard, useLongPressBackdrop } from './wa-long-press';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MORE_REACTIONS = [
	'🔥', '👏', '🥰', '😍', '💯', '🎉', '😭', '💪',
	'🫡', '👀', '✨', '🤝', '🌹', '💔', '😅', '🤩',
];

/** Any chat message that can be forwarded / shared (including image-only). */
export function isSharableChatMessage(message) {
	if (!message?.id || message.optimistic) return false;
	if (message.deletedMode && message.deletedMode !== 'none') return false;
	if (isViewOnceMessage(message)) return false;
	return true;
}

export function messageHasSelectableMedia(message) {
	if (!isSharableChatMessage(message)) return false;
	const type = String(message?.type || '').toLowerCase();
	if (['image', 'sticker', 'video', 'document', 'audio', 'ptt', 'voice'].includes(type)) {
		return true;
	}
	return (message?.attachments || []).some(item => {
		const id = String(item?.id || '');
		return Boolean(item?.demoAttachment || isDemoId(id) || isPersistedAttachmentId(id));
	});
}

export function firstGalleryAttachmentId(message) {
	const type = String(message?.type || '').toLowerCase();
	if (type === 'image' || type === 'sticker') {
		const direct = message?.attachments?.find(att => {
			const attType = String(att?.type || type).toLowerCase();
			return (attType === 'image' || attType === 'sticker') && att?.id;
		});
		if (direct?.id) return String(direct.id);
	}
	for (const att of message?.attachments || []) {
		const attType = String(att?.type || '').toLowerCase();
		if ((attType === 'image' || attType === 'sticker') && att?.id) {
			return String(att.id);
		}
	}
	return null;
}

function messageHasGalleryMedia(message) {
	return Boolean(firstGalleryAttachmentId(message));
}

/** First attachment the server can act on — needed by the voice editor and the library. */
export function firstPersistedAttachmentId(message) {
	if (!isSharableChatMessage(message)) return null;
	for (const attachment of message?.attachments || []) {
		const id = String(attachment?.id || '');
		if (isPersistedAttachmentId(id)) return id;
	}
	return null;
}

const VIEW_ONCE_MESSAGE_ACTIONS = new Set(['reply', 'pin', 'star', 'info', 'delete']);

function HoverActionButton({
	tooltip,
	className = '',
	children,
	tooltipPrefer = 'below',
	...props
}) {
	const buttonRef = useRef(null);
	const [tip, setTip] = useState(null);

	const hideTip = useCallback(() => setTip(null), []);

	const showTip = useCallback(() => {
		const node = buttonRef.current;
		if (!node || !tooltip) return;
		const rect = node.getBoundingClientRect();
		const preferBelow = tooltipPrefer === 'below';
		const gap = 8;
		setTip({
			label: tooltip,
			left: rect.left + rect.width / 2,
			top: preferBelow ? rect.bottom + gap : rect.top - gap,
			place: preferBelow ? 'below' : 'above',
		});
	}, [tooltip, tooltipPrefer]);

	useEffect(() => {
		if (!tip) return undefined;
		const onScroll = () => hideTip();
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', hideTip);
		return () => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', hideTip);
		};
	}, [tip, hideTip]);

	return (
		<>
			<button
				{...props}
				ref={buttonRef}
				type={props.type || 'button'}
				aria-label={props['aria-label'] || tooltip}
				className={className}
				onMouseEnter={event => {
					props.onMouseEnter?.(event);
					showTip();
				}}
				onMouseLeave={event => {
					props.onMouseLeave?.(event);
					hideTip();
				}}
				onFocus={event => {
					props.onFocus?.(event);
					showTip();
				}}
				onBlur={event => {
					props.onBlur?.(event);
					hideTip();
				}}
				onClick={event => {
					hideTip();
					props.onClick?.(event);
				}}
			>
				{children}
			</button>
			{tip && typeof document !== 'undefined'
				? createPortal(
						<span
							className={`wa-hover-portal-tooltip is-${tip.place}`}
							style={{ left: tip.left, top: tip.top }}
							role="tooltip"
						>
							{tip.label}
						</span>,
						document.body,
					)
				: null}
		</>
	);
}

export function MessageHoverActions({
	mine,
	locale,
	open,
	emojiOpen,
	showTranscribe = false,
	showCopy = false,
	showDownloadVideo = false,
	showTranslate = false,
	translating = false,
	onEmoji,
	onReply,
	onTranscribe,
	onDownloadVideo,
	onCopy,
	onTranslate,
	onMore,
}) {
	const ar = locale === 'ar';
	const [copied, setCopied] = useState(false);
	const copiedTimerRef = useRef(null);

	useEffect(
		() => () => {
			if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
		},
		[],
	);

	const copyLabel = copied ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy';
	const reactLabel = ar ? 'تفاعل' : 'React';
	const replyLabel = ar ? 'رد' : 'Reply';
	const transcribeLabel = ar ? 'تفريغ' : 'Transcribe';
	const downloadVideoLabel = ar ? 'تحميل الفيديو' : 'Download video';
	const moreLabel = ar ? 'المزيد' : 'More';
	const translateLabel = ar ? 'ترجم للعربي' : 'Translate to Arabic';

	return (
		<div
			className={`wa-message-hover-actions ${mine ? 'is-outgoing' : 'is-incoming'} ${open ? 'is-open' : ''}`}
			role="toolbar"
			aria-label={ar ? 'إجراءات الرسالة' : 'Message actions'}
		>
			{showCopy ? (
				<HoverActionButton
					onPointerDown={event => event.stopPropagation()}
					onClick={async event => {
						event.preventDefault();
						event.stopPropagation();
						if (copied) return;
						const ok = await onCopy?.(event);
						if (!ok) return;
						setCopied(true);
						if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
						copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
					}}
					tooltip={copyLabel}
					className={`wa-message-hover-btn ${copied ? 'is-copied' : ''}`}
				>
					{copied ? (
						<Check size={15} strokeWidth={2.4} aria-hidden />
					) : (
						<Copy size={14} strokeWidth={2.2} aria-hidden />
					)}
				</HoverActionButton>
			) : null}
			<HoverActionButton
				data-message-reaction-trigger
				onPointerDown={event => event.stopPropagation()}
				onClick={onEmoji}
				tooltip={reactLabel}
				aria-expanded={Boolean(emojiOpen)}
				className="wa-message-hover-btn"
			>
				<Smile size={15} strokeWidth={2.1} aria-hidden />
			</HoverActionButton>
			<HoverActionButton
				onClick={onReply}
				tooltip={replyLabel}
				className="wa-message-hover-btn"
			>
				<Reply size={15} strokeWidth={2.1} aria-hidden />
			</HoverActionButton>
			{showTranslate ? (
				<HoverActionButton
					onPointerDown={event => event.stopPropagation()}
					onClick={onTranslate}
					tooltip={translateLabel}
					disabled={translating}
					className="wa-message-hover-btn"
				>
					{translating ? (
						<Loader2 size={14} strokeWidth={2.2} className="animate-spin" aria-hidden />
					) : (
						<Languages size={14} strokeWidth={2.2} aria-hidden />
					)}
				</HoverActionButton>
			) : null}
			{showTranscribe ? (
				<HoverActionButton
					onClick={onTranscribe}
					tooltip={transcribeLabel}
					className="wa-message-hover-btn is-transcribe"
				>
					<AudioLines size={15} strokeWidth={2.1} aria-hidden />
				</HoverActionButton>
			) : null}
			{showDownloadVideo ? (
				<HoverActionButton
					onClick={onDownloadVideo}
					tooltip={downloadVideoLabel}
					className="wa-message-hover-btn"
				>
					<FileVideo size={15} strokeWidth={2.1} aria-hidden />
				</HoverActionButton>
			) : null}
			<span className="wa-message-hover-sep" aria-hidden />
			<HoverActionButton
				data-message-actions-trigger
				onPointerDown={event => event.stopPropagation()}
				onClick={onMore}
				tooltip={moreLabel}
				aria-expanded={open && !emojiOpen}
				className="wa-message-hover-btn is-more"
			>
				<MoreHorizontal size={15} strokeWidth={2.1} aria-hidden />
			</HoverActionButton>
		</div>
	);
}

/** Compact, like WhatsApp Web's message menu. */
const MESSAGE_MENU_WIDTH = 216;

export function MessageActionMenu({
	open,
	message,
	locale,
	mine = false,
	isVoice,
	isVideo = false,
	anchorRect,
	previewImageUrl,
	busy,
	onClose,
	onAction,
	onReact,
	mentionDirectory = null,
	accountId = null,
	conversationId = null,
	canUseBoard = false,
	canUseGroups = false,
	onBoardSuccess,
}) {
	const [mounted, setMounted] = useState(false);
	const [boardOpen, setBoardOpen] = useState(false);
	const [reactionsExpanded, setReactionsExpanded] = useState(false);
	// Height 0 means "not measured yet", which resolves to the viewport limit so the
	// very first paint cannot clip an option before the real height is known.
	const [desktopPos, setDesktopPos] = useState(() =>
		computeAnchoredMenuPosition(anchorRect, { width: MESSAGE_MENU_WIDTH, height: 0 }, { mine }),
	);
	const menuRef = useRef(null);
	useMenuKeyboard(menuRef, { open: Boolean(open && message), onClose });
	const sheetBackdropHandlers = useLongPressBackdrop({
		open: open ? message?.id || true : false,
		onClose,
		isBackdrop: isMessageSheetBackdrop,
	});
	const pressGuard = useFreshPressGuard(open ? message?.id || true : false);
	const boardItemRef = useRef(null);
	const boardCloseTimerRef = useRef(null);
	const [boardFlyoutPos, setBoardFlyoutPos] = useState(null);

	const clearBoardCloseTimer = () => {
		if (boardCloseTimerRef.current) {
			window.clearTimeout(boardCloseTimerRef.current);
			boardCloseTimerRef.current = null;
		}
	};

	const openBoardSubmenu = () => {
		if (!canUseBoard) return;
		clearBoardCloseTimer();
		setBoardOpen(true);
	};

	const scheduleBoardSubmenuClose = () => {
		clearBoardCloseTimer();
		boardCloseTimerRef.current = window.setTimeout(() => {
			setBoardOpen(false);
			boardCloseTimerRef.current = null;
		}, 160);
	};

	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) {
			clearBoardCloseTimer();
			setBoardOpen(false);
			setBoardFlyoutPos(null);
			setReactionsExpanded(false);
		}
	}, [open]);
	useEffect(() => () => clearBoardCloseTimer(), []);

	useEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const node = menuRef.current;
			setDesktopPos(
				computeAnchoredMenuPosition(
					anchorRect,
					{
						width: node?.getBoundingClientRect().width || MESSAGE_MENU_WIDTH,
						// `scrollHeight`, not the bounding box: the box reports the height it
						// was capped to, so measuring it would only ever re-confirm the cap
						// and the options below it would stay hidden.
						height: node?.scrollHeight || 0,
					},
					{ mine },
				),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRect, mine]);

	useEffect(() => {
		if (!boardOpen || !open) {
			setBoardFlyoutPos(null);
			return undefined;
		}
		const update = () => {
			const trigger = boardItemRef.current?.getBoundingClientRect();
			if (!trigger) return;
			const flyoutW = 228;
			const gap = 8;
			const margin = 10;
			const viewportW = window.innerWidth || 1280;
			const viewportH = window.innerHeight || 720;
			const spaceEnd = viewportW - trigger.right - margin;
			const spaceStart = trigger.left - margin;
			const openOnStart = spaceEnd < flyoutW + gap && spaceStart >= flyoutW + gap;
			let left = openOnStart ? trigger.left - flyoutW - gap : trigger.right + gap;
			left = Math.min(Math.max(margin, left), viewportW - flyoutW - margin);
			const maxHeight = Math.max(120, viewportH - margin * 2);
			let top = trigger.top;
			top = Math.min(Math.max(margin, top), viewportH - Math.min(maxHeight, 280) - margin);
			setBoardFlyoutPos({ top, left, maxHeight });
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [boardOpen, open, desktopPos.top, desktopPos.left]);

	if (!open || !message) return null;
	const ar = locale === 'ar';
	const viewOnce = isViewOnceMessage(message);
	const canSelectTranscript = isSelectableTranscriptMessage(message);
	const canSelectMedia = messageHasSelectableMedia(message);
	const canViewGallery = messageHasGalleryMedia(message);
	const canSelect = canSelectTranscript || canSelectMedia;
	// Both need a real server-side attachment: the editor and the library work from
	// stored media, not from an optimistic local blob.
	const canEditAsVoice = (isVoice || isVideo) && Boolean(firstPersistedAttachmentId(message));
	const canSaveToLibrary = canUseGroups && Boolean(firstPersistedAttachmentId(message));
	// Only a stored video: the server cuts the clips from the file on disk.
	const canAddToStory = isVideo && !isVoice && Boolean(firstPersistedAttachmentId(message));
	// A shared TikTok/Instagram/Facebook link can be pulled in as a playable video.
	const socialVideoLink = message.optimistic ? null : firstSocialVideoLink(message.text);
	const hasCopyableText = Boolean(String(message.text || '').trim());
	const isOutboundText =
		String(message.type || 'text').toLowerCase() === 'text' &&
		String(message.direction || '').toLowerCase() !== 'inbound' &&
		!message.optimistic;
	// WhatsApp only applies an edit within 15 minutes of sending; after that it is dropped silently.
	const sentAtMs = new Date(message.providerTimestamp || message.created_at || 0).getTime();
	const canEditText =
		isOutboundText && Number.isFinite(sentAtMs) && Date.now() - sentAtMs <= 15 * 60_000;
	const actions = [
		{ id: 'reply', label: ar ? 'رد' : 'Reply', icon: Reply, group: 'core' },
		hasCopyableText && { id: 'copy', label: ar ? 'نسخ النص' : 'Copy text', icon: Copy, group: 'core' },
		canEditText && { id: 'edit', label: ar ? 'تعديل' : 'Edit', icon: Pencil, group: 'core' },
		{ id: 'forward', label: ar ? 'إرسال إلى…' : 'Send to…', icon: Forward, group: 'core' },
		{
			id: 'pin',
			label: message.isPinned ? (ar ? 'إلغاء التثبيت' : 'Unpin') : ar ? 'تثبيت' : 'Pin',
			icon: Pin,
			group: 'core',
		},
		{
			id: 'star',
			label: message.isStarred
				? ar
					? 'إزالة من المهم'
					: 'Remove from important'
				: ar
					? 'حفظ كمهم'
					: 'Save as important',
			icon: Star,
			group: 'core',
		},
		canSelect && {
			id: canSelectMedia && !canSelectTranscript ? 'selectMedia' : 'select',
			label: ar ? 'تحديد' : 'Select',
			icon: ListChecks,
			group: 'organize',
		},
		canUseBoard &&
			canSelectTranscript && {
				id: 'addToBoard',
				label: ar ? 'إضافة للمهام' : 'Add to tasks',
				icon: LayoutGrid,
				submenu: true,
				group: 'organize',
			},
		// "Add to message group" is retired (Message groups removed).
		canSaveToLibrary && {
			id: 'saveToLibrary',
			label: ar ? 'حفظ في المكتبة…' : 'Save to library…',
			icon: BookmarkPlus,
			group: 'organize',
		},
		canViewGallery && {
			id: 'viewGallery',
			label: ar ? 'عرض في المعرض' : 'View in gallery',
			icon: Images,
			group: 'organize',
		},
		canAddToStory && {
			id: 'addToStory',
			label: ar ? 'إضافة إلى الحالة…' : 'Add to story…',
			icon: CircleDashed,
			group: 'organize',
		},
		(isVoice || isVideo) && {
			id: 'transcribe',
			label: ar ? 'تحويل إلى نص' : 'Transcribe',
			icon: isVideo && !isVoice ? Video : Mic,
			group: 'media',
		},
		canEditAsVoice && {
			id: 'sendAsVoice',
			label: isVoice
				? ar
					? 'تعديل وإرسال كصوت…'
					: 'Edit & send as voice…'
				: ar
					? 'إرسال كرسالة صوتية…'
					: 'Send as voice message…',
			icon: AudioLines,
			group: 'media',
		},
		socialVideoLink && {
			id: 'downloadSocialVideo',
			label: ar ? 'تحميل الفيديو' : 'Download video',
			icon: FileVideo,
			group: 'media',
		},
		{ id: 'info', label: ar ? 'معلومات الرسالة' : 'Message info', icon: Info, group: 'info' },
		{ id: 'delete', label: ar ? 'حذف' : 'Delete', icon: Trash2, destructive: true, group: 'danger' },
	].filter(
		action => action && (!viewOnce || VIEW_ONCE_MESSAGE_ACTIONS.has(action.id)),
	);

	const runAction = (actionId, event) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		if (actionId === 'addToBoard') {
			clearBoardCloseTimer();
			setBoardOpen(boardOpen ? false : true);
			return;
		}
		clearBoardCloseTimer();
		setBoardOpen(false);
		onAction(actionId);
	};

	const renderMenuItems = (options = {}) => {
		const { attachBoardRef = false } = options;
		return actions.map((action, index) => {
			const Icon = action.icon;
			const isBoard = action.id === 'addToBoard';
			const showSeparator = index > 0 && actions[index - 1].group !== action.group;
			return (
				<Fragment key={action.id}>
					{showSeparator ? <div className="wa-ui-menu__sep" role="separator" /> : null}
					<button
						ref={isBoard && attachBoardRef ? boardItemRef : undefined}
						type="button"
						role="menuitem"
						disabled={busy}
						onMouseEnter={() => {
							if (isBoard) openBoardSubmenu();
							else scheduleBoardSubmenuClose();
						}}
						onMouseDown={event => {
							if (isBoard) {
								event.preventDefault();
								event.stopPropagation();
							}
						}}
						onClick={event => runAction(action.id, event)}
						aria-expanded={isBoard ? boardOpen : undefined}
						aria-haspopup={isBoard ? 'menu' : undefined}
						className={`wa-ui-menu__item ${action.destructive ? 'is-danger' : ''} ${
							isBoard && boardOpen ? 'is-highlighted' : ''
						}`}
					>
						<Icon className="wa-ui-menu__icon" strokeWidth={1.8} aria-hidden="true" />
						<span className="wa-ui-menu__label">{action.label}</span>
						{action.submenu ? (
							<span className="wa-ui-menu__trail">
								<ChevronRight
									size={16}
									className={`rtl:rotate-180 transition-transform ${
										boardOpen && isBoard ? 'rotate-90 rtl:-rotate-90' : ''
									}`}
									aria-hidden="true"
								/>
							</span>
						) : null}
					</button>
				</Fragment>
			);
		});
	};

	const renderBoardFlyout = () =>
		boardOpen && canUseBoard && accountId && conversationId && boardFlyoutPos ? (
			<div
				className="wa-message-action-board-flyout hidden min-[769px]:block"
				style={{
					top: boardFlyoutPos.top,
					left: boardFlyoutPos.left,
					maxHeight: boardFlyoutPos.maxHeight,
				}}
				onMouseEnter={openBoardSubmenu}
				onMouseLeave={scheduleBoardSubmenuClose}
				onMouseDown={event => event.stopPropagation()}
				onClick={event => event.stopPropagation()}
			>
				<BoardColumnPickerMenu
					accountId={accountId}
					conversationId={conversationId}
					messageIds={[message.id]}
					locale={locale}
					onSuccess={() => {
						onBoardSuccess?.();
						onClose?.();
					}}
					className="wa-message-action-board-panel"
				/>
			</div>
		) : null;

	const renderBoardSheet = () =>
		boardOpen && canUseBoard && accountId && conversationId ? (
			<div
				className="wa-message-action-board wa-message-action-board--sheet"
				onMouseDown={event => event.stopPropagation()}
				onClick={event => event.stopPropagation()}
			>
				<BoardColumnPickerMenu
					accountId={accountId}
					conversationId={conversationId}
					messageIds={[message.id]}
					locale={locale}
					onSuccess={() => {
						onBoardSuccess?.();
						onClose?.();
					}}
					className="wa-message-action-board-panel"
				/>
			</div>
		) : null;

	const renderReactions = () => (
		<>
			<div className="wa-ui-reactions" role="group" aria-label={ar ? 'تفاعل سريع' : 'Quick reactions'}>
				{QUICK_REACTIONS.map(emoji => (
					<button
						key={emoji}
						type="button"
						disabled={busy}
						onClick={() => onReact(emoji)}
						aria-label={`${ar ? 'تفاعل' : 'React'} ${emoji}`}
						className="wa-ui-reaction"
					>
						{emoji}
					</button>
				))}
				<button
					type="button"
					aria-expanded={reactionsExpanded}
					onClick={() => setReactionsExpanded(current => !current)}
					className="wa-ui-reaction wa-ui-reaction--more"
					aria-label={
						reactionsExpanded
							? ar
								? 'إخفاء التفاعلات'
								: 'Hide reactions'
							: ar
								? 'المزيد من التفاعلات'
								: 'More reactions'
					}
				>
					{reactionsExpanded ? <X size={18} strokeWidth={2} /> : <Plus size={18} strokeWidth={2} />}
				</button>
			</div>
			{reactionsExpanded ? (
				<div className="wa-ui-reactions-grid">
					{MORE_REACTIONS.map(emoji => (
						<button
							key={emoji}
							type="button"
							disabled={busy}
							onClick={() => onReact(emoji)}
							aria-label={`${ar ? 'تفاعل' : 'React'} ${emoji}`}
							className="wa-ui-reaction"
						>
							{emoji}
						</button>
					))}
				</div>
			) : null}
		</>
	);
	const previewType = String(message.type || '').toLowerCase();
	const previewText = message.text || (isVoice
		? ar ? 'رسالة صوتية' : 'Voice message'
		: isVideo
			? ar ? 'فيديو' : 'Video'
		: previewType || (ar ? 'رسالة' : 'Message'));
	const mobileTop =
		typeof window === 'undefined'
			? 20
			: Math.max(16, Math.min(anchorRect?.top || 80, window.innerHeight - 620));

	if (!mounted) return null;

	return createPortal(
		<>
			{/* Desktop: fixed portal so overflow parents cannot clip the menu. */}
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-[20015] hidden bg-transparent min-[769px]:block"
			/>
			<div
				ref={menuRef}
				data-message-action-menu
				role="menu"
				aria-label={ar ? 'إجراءات الرسالة' : 'Message actions'}
				className="wa-message-action-menu wa-ui-menu wa-ui-scroll hidden min-[769px]:block"
				{...pressGuard}
				style={{
					top: desktopPos.top,
					left: desktopPos.left,
					width: desktopPos.width || MESSAGE_MENU_WIDTH,
					maxHeight: desktopPos.maxHeight || undefined,
				}}
				onMouseLeave={scheduleBoardSubmenuClose}
			>
				{renderReactions()}
				{renderMenuItems({ attachBoardRef: true })}
			</div>
			{renderBoardFlyout()}

			{/* Mobile sheet */}
			<div
				className={`wa-mam fixed inset-0 z-[100] hidden overflow-y-auto bg-black/20 px-3 backdrop-blur-md max-[769px]:block ${
					message.direction === 'outbound' ? 'is-out' : 'is-in'
				}`}
				{...sheetBackdropHandlers}
			>
				<div
					className="wa-mam__stack relative mx-auto w-full max-w-md pb-5"
					style={{ top: mobileTop }}
					{...pressGuard}
				>
					<div className={`wa-mam__preview mb-3 flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
						<div className={`wa-mam__bubble max-w-[88%] overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm shadow-xl ${
							message.direction === 'outbound' ? 'bg-[#d9fdd3]' : 'bg-white'
						}`}>
							{previewImageUrl && (
								<img src={previewImageUrl} alt="" className="mb-2 max-h-44 w-full rounded-xl object-cover" />
							)}
							<div className="flex items-center gap-2">
								{isVoice && <Mic size={17} className="shrink-0 text-[#00a884]" />}
								{isVideo && !isVoice && <Video size={17} className="shrink-0 text-[#00a884]" />}
								<p className="whitespace-pre-wrap wrap-break-word">
									<WhatsAppFormattedText
										text={previewText}
										mentionDirectory={mentionDirectory}
										mentionLabels={message.mentionLabels}
									/>
								</p>
							</div>
							<p className="wa-mam__time mt-1 text-end text-[10px] text-[#667781]">
								{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</p>
						</div>
					</div>
					<div className="wa-mam__reactions wa-ui-menu wa-ui-reactions-pill mx-auto mb-2.5 w-fit">
						{renderReactions()}
					</div>
					<div className="wa-mam__menu wa-message-action-sheet wa-ui-menu" role="menu" aria-label={ar ? 'إجراءات الرسالة' : 'Message actions'}>
						{renderMenuItems({ attachBoardRef: false })}
						{renderBoardSheet()}
					</div>
				</div>
			</div>
		</>,
		document.body,
	);
}

export function MultiMessageActionMenu({
	open,
	anchorRect,
	locale,
	selectedCount,
	messageIds = [],
	accountId,
	conversationId,
	canTranscribe = false,
	canUseBoard = false,
	canUseGroups = false,
	busy = false,
	onClose,
	onAction,
	onBoardSuccess,
}) {
	const [mounted, setMounted] = useState(false);
	const [boardOpen, setBoardOpen] = useState(false);
	const [boardFlyoutPos, setBoardFlyoutPos] = useState(null);
	const [pos, setPos] = useState(() =>
		computeAnchoredMenuPosition(anchorRect, { width: 248, height: 0 }),
	);
	const menuRef = useRef(null);
	const boardItemRef = useRef(null);
	const boardCloseTimerRef = useRef(null);

	const clearBoardCloseTimer = () => {
		if (boardCloseTimerRef.current) {
			window.clearTimeout(boardCloseTimerRef.current);
			boardCloseTimerRef.current = null;
		}
	};

	const openBoardSubmenu = () => {
		if (!canUseBoard) return;
		clearBoardCloseTimer();
		setBoardOpen(true);
	};

	const scheduleBoardSubmenuClose = () => {
		clearBoardCloseTimer();
		boardCloseTimerRef.current = window.setTimeout(() => {
			setBoardOpen(false);
			boardCloseTimerRef.current = null;
		}, 160);
	};

	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) {
			clearBoardCloseTimer();
			setBoardOpen(false);
			setBoardFlyoutPos(null);
		}
	}, [open]);
	useEffect(() => () => clearBoardCloseTimer(), []);
	useEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const node = menuRef.current;
			setPos(
				computeAnchoredMenuPosition(anchorRect, {
					// See the sibling menu above: the bounding box reports the capped
					// height, so content height has to come from `scrollHeight`.
					width: node?.getBoundingClientRect().width || 248,
					height: node?.scrollHeight || 0,
				}),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRect]);

	useEffect(() => {
		if (!boardOpen || !open) {
			setBoardFlyoutPos(null);
			return undefined;
		}
		const update = () => {
			const trigger = boardItemRef.current?.getBoundingClientRect();
			if (!trigger) return;
			const flyoutW = 228;
			const gap = 8;
			const margin = 10;
			const viewportW = window.innerWidth || 1280;
			const viewportH = window.innerHeight || 720;
			const spaceEnd = viewportW - trigger.right - margin;
			const spaceStart = trigger.left - margin;
			const openOnStart = spaceEnd < flyoutW + gap && spaceStart >= flyoutW + gap;
			let left = openOnStart ? trigger.left - flyoutW - gap : trigger.right + gap;
			left = Math.min(Math.max(margin, left), viewportW - flyoutW - margin);
			const maxHeight = Math.max(120, viewportH - margin * 2);
			let top = trigger.top;
			top = Math.min(Math.max(margin, top), viewportH - Math.min(maxHeight, 280) - margin);
			setBoardFlyoutPos({ top, left, maxHeight });
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [boardOpen, open, pos.top, pos.left]);

	if (!mounted || !open) return null;
	const ar = locale === 'ar';
	const actions = [
		canUseBoard && {
			id: 'addToBoard',
			label: ar ? 'إضافة للمهام…' : 'Add to tasks…',
			icon: LayoutGrid,
			submenu: true,
		},
		canTranscribe && {
			id: 'transcribe',
			label: ar ? 'تحويل المحدد' : 'Transcribe selected',
			icon: AudioLines,
		},
		selectedCount > 0 && {
			id: 'copy',
			label: ar ? 'نسخ' : 'Copy',
			icon: Copy,
		},
		// Message groups are retired: no add / remove here any more.
		{
			id: 'shareAsSend',
			label: ar ? 'إرسال إلى شخص…' : 'Send to chat…',
			icon: Send,
		},
		{
			id: 'selectAll',
			label: ar ? 'تحديد الكل' : 'Select all',
			icon: CheckCheck,
		},
		{
			id: 'clear',
			label: ar ? 'إلغاء التحديد' : 'Clear selection',
			icon: X,
		},
	].filter(Boolean);

	return createPortal(
		<>
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-[120] bg-transparent"
			/>
			<div
				ref={menuRef}
				className="wa-message-action-menu"
				style={{
					top: pos.top,
					left: pos.left,
					width: Math.max(pos.width || 248, 248),
				}}
				onMouseDown={event => event.stopPropagation()}
				onClick={event => event.stopPropagation()}
				onMouseLeave={scheduleBoardSubmenuClose}
			>
				<div className="wa-message-action-multi-head">
					{ar ? `${selectedCount} رسالة محددة` : `${selectedCount} selected`}
				</div>
				<div className="wa-message-action-list">
					{actions.map(action => {
						const Icon = action.icon;
						const isBoard = action.id === 'addToBoard';
						return (
							<button
								key={action.id}
								ref={isBoard ? boardItemRef : undefined}
								type="button"
								disabled={
									busy ||
									(action.id !== 'clear' &&
										action.id !== 'selectAll' &&
										!messageIds.length)
								}
								onMouseEnter={() => {
									if (isBoard) openBoardSubmenu();
									else scheduleBoardSubmenuClose();
								}}
								onMouseDown={event => {
									if (isBoard) {
										event.preventDefault();
										event.stopPropagation();
									}
								}}
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									if (isBoard) {
										clearBoardCloseTimer();
										setBoardOpen(boardOpen ? false : true);
										return;
									}
									clearBoardCloseTimer();
									setBoardOpen(false);
									onAction(action.id);
								}}
								aria-expanded={isBoard ? boardOpen : undefined}
								aria-haspopup={isBoard ? 'menu' : undefined}
								className={`wa-message-action-item ${
									isBoard && boardOpen ? 'is-active' : ''
								}`}
							>
								<span className="flex min-w-0 flex-1 items-center gap-1">
									{action.label}
									{action.submenu ? (
										<ChevronRight
											size={14}
											className={`opacity-50 transition-transform rtl:rotate-180 ${
												boardOpen && isBoard
													? 'rotate-90 rtl:-rotate-90'
													: ''
											}`}
										/>
									) : null}
								</span>
								<Icon size={16} strokeWidth={2.1} />
							</button>
						);
					})}
				</div>
			</div>
			{boardOpen && canUseBoard && accountId && conversationId && boardFlyoutPos ? (
				<div
					className="wa-message-action-board-flyout"
					style={{
						top: boardFlyoutPos.top,
						left: boardFlyoutPos.left,
						maxHeight: boardFlyoutPos.maxHeight,
					}}
					onMouseEnter={openBoardSubmenu}
					onMouseLeave={scheduleBoardSubmenuClose}
					onMouseDown={event => event.stopPropagation()}
					onClick={event => event.stopPropagation()}
				>
					<BoardColumnPickerMenu
						accountId={accountId}
						conversationId={conversationId}
						messageIds={messageIds}
						locale={locale}
						onSuccess={() => {
							onBoardSuccess?.();
							onClose?.();
						}}
						className="wa-message-action-board-panel"
					/>
				</div>
			) : null}
		</>,
		document.body,
	);
}

const isMessageSheetBackdrop = event =>
	!event.target?.closest?.('.wa-mam__bubble, .wa-mam__reactions, .wa-mam__menu');
