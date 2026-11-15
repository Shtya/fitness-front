'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, Bell, BellOff, Columns2, Info, Pin, Star, Trash2, UserPlus } from 'lucide-react';
import { conversationTitle, conversationAvatarUrl, conversationPreview } from '../whatsapp-utils';
import { useMenuKeyboard } from '../wa-ui-menu';
import { Avatar } from './WaAvatar';
import { useFreshPressGuard, useLongPressBackdrop } from './wa-long-press';

function computeBesideMenuPosition(anchorRect, menuSize = { width: 228, height: 280 }) {
	const gap = 6;
	const margin = 10;
	const viewportW =
		typeof window === 'undefined' ? 1280 : window.innerWidth || 1280;
	const viewportH =
		typeof window === 'undefined' ? 720 : window.innerHeight || 720;
	const width = Math.min(menuSize.width, viewportW - margin * 2);
	const height = Math.min(menuSize.height, viewportH - margin * 2);
	const rect = anchorRect || {
		top: margin,
		bottom: margin + 32,
		left: viewportW - width - margin,
		right: viewportW - margin,
		width: 32,
		height: 32,
	};
	const isRtl =
		typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
	let left = isRtl ? rect.left - gap - width : rect.right + gap;
	if (left + width > viewportW - margin) {
		left = rect.left - gap - width;
	}
	if (left < margin) {
		left = Math.min(rect.right + gap, viewportW - width - margin);
	}
	left = Math.max(margin, Math.min(left, viewportW - width - margin));
	let top = rect.top;
	if (top + height > viewportH - margin) {
		top = Math.max(margin, viewportH - height - margin);
	}
	return { top, left, width, maxHeight: height };
}

/** Wide enough for the longest label ("Open beside current chat") in either language. */
const CONVERSATION_MENU_WIDTH = 252;

export function ConversationActionMenu({
	conversation,
	anchorRect,
	locale,
	canAssign,
	busy,
	onClose,
	onAction,
	onLongPressAt,
}) {
	const [mounted, setMounted] = useState(false);
	const backdropHandlers = useLongPressBackdrop({
		open: conversation,
		onClose,
		onLongPress: onLongPressAt,
	});
	const pressGuard = useFreshPressGuard(conversation);
	const [pos, setPos] = useState(() =>
		computeBesideMenuPosition(anchorRect, { width: CONVERSATION_MENU_WIDTH, height: 380 }),
	);
	const menuRef = useRef(null);
	useMenuKeyboard(menuRef, { open: Boolean(conversation), onClose });
	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!conversation) return undefined;
		const update = () => {
			const measured = menuRef.current?.getBoundingClientRect();
			setPos(
				computeBesideMenuPosition(anchorRect, {
					width: CONVERSATION_MENU_WIDTH,
					height: measured?.height || 380,
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
	}, [conversation, anchorRect]);
	if (!mounted || !conversation) return null;
	const ar = locale === 'ar';
	// Split view needs a wide screen; phones open one chat at a time.
	const canOpenBeside = typeof window === 'undefined' || window.innerWidth > 768;
	const actions = [
		canOpenBeside && {
			id: 'openBeside',
			label: ar ? 'فتح بجانب الشات الحالي' : 'Open beside current chat',
			icon: Columns2,
			group: 'open',
		},
		{
			id: 'pin',
			label: conversation.isPinned ? (ar ? 'إلغاء تثبيت المحادثة' : 'Unpin conversation') : ar ? 'تثبيت المحادثة' : 'Pin conversation',
			icon: Pin,
		},
		{
			id: 'mute',
			label: conversation.isMuted
				? ar
					? 'إلغاء كتم الإشعارات'
					: 'Unmute notifications'
				: ar
					? 'كتم الإشعارات'
					: 'Mute notifications',
			icon: conversation.isMuted ? Bell : BellOff,
		},
		{
			id: 'favorite',
			label: conversation.isFavorite ? (ar ? 'إزالة من المفضلة' : 'Remove from favorites') : ar ? 'إضافة إلى المفضلة' : 'Add to favorites',
			icon: Star,
		},
		{
			id: 'archive',
			label: conversation.isArchived
				? ar
					? 'إلغاء أرشفة المحادثة'
					: 'Unarchive chat'
				: ar
					? 'أرشفة المحادثة'
					: 'Archive chat',
			icon: Archive,
		},
		canAssign && { id: 'assign', label: ar ? 'تعيين إلى شخص' : 'Assign to person', icon: UserPlus, group: 'manage' },
		{ id: 'info', label: ar ? 'معلومات المحادثة' : 'Conversation info', icon: Info, group: 'manage' },
		{
			id: 'delete',
			label: ar ? 'حذف المحادثة' : 'Delete chat',
			icon: Trash2,
			destructive: true,
			group: 'danger',
		},
	].filter(Boolean);
	const preview =
		conversationPreview(conversation, locale) ||
		(ar ? 'لا توجد رسائل' : 'No messages');
	return createPortal(
		<>
			<button
				type="button"
				tabIndex={-1}
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				{...backdropHandlers}
				className="wa-cam-scrim fixed inset-0 z-[105] cursor-default bg-transparent"
			/>
			<div
				ref={menuRef}
				role="menu"
				aria-label={conversationTitle(conversation)}
				className="wa-conversation-action-menu wa-ui-menu"
				style={{
					top: pos.top,
					left: pos.left,
					width: pos.width,
				}}
				{...pressGuard}
				onClick={event => event.stopPropagation()}
			>
				<div className="wa-ui-menu__header">
					<Avatar
						label={conversationTitle(conversation)}
						size={9}
						src={conversationAvatarUrl(conversation)}
						isGroup={conversation.type === 'group'}
						className="!ring-0"
					/>
					<div className="min-w-0 flex-1">
						<p className="wa-ui-menu__header-title" dir="auto">
							{conversationTitle(conversation)}
						</p>
						<p className="wa-ui-menu__header-sub" dir="auto">
							{preview}
						</p>
					</div>
				</div>
				{actions.map((action, index) => {
					const Icon = action.icon;
					const previousGroup = actions[index - 1]?.group || 'state';
					const group = action.group || 'state';
					return (
						<Fragment key={action.id}>
							{index > 0 && group !== previousGroup ? (
								<div className="wa-ui-menu__sep" role="separator" />
							) : null}
							<button
								type="button"
								role="menuitem"
								disabled={busy}
								onClick={() => onAction(action.id)}
								className={`wa-ui-menu__item${action.destructive ? ' is-danger' : ''}`}
							>
								<Icon className="wa-ui-menu__icon" strokeWidth={1.8} aria-hidden="true" />
								<span className="wa-ui-menu__label">{action.label}</span>
							</button>
						</Fragment>
					);
				})}
			</div>
		</>,
		document.body,
	);
}
