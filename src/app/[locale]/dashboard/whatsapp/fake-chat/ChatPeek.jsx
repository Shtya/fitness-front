'use client';

import { useRef } from 'react';
import {
	Archive,
	ArchiveRestore,
	Ban,
	BellOff,
	BellRing,
	Heart,
	HeartOff,
	ListPlus,
	Lock,
	Mail,
	MailOpen,
	MessageCircle,
	MessageCircleMore,
	Pin,
	PinOff,
	Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { IosStatusBar } from './IphoneChrome';
import { IOS_WA_FONT } from './styles';

const LONG_PRESS_MS = 450;

/** Hold a row (or right-click it) to peek; a plain click still opens the chat. */
export function useLongPress(onLong, onClick) {
	const timerRef = useRef(0);
	const firedRef = useRef(false);
	const clear = () => {
		if (timerRef.current) window.clearTimeout(timerRef.current);
		timerRef.current = 0;
	};
	if (!onLong) return { onClick };
	return {
		onPointerDown: event => {
			if (event.button !== 0) return;
			firedRef.current = false;
			clear();
			timerRef.current = window.setTimeout(() => {
				firedRef.current = true;
				onLong();
			}, LONG_PRESS_MS);
		},
		onPointerUp: clear,
		onPointerLeave: clear,
		onPointerCancel: clear,
		onContextMenu: event => {
			event.preventDefault();
			clear();
			firedRef.current = true;
			onLong();
		},
		onClick: event => {
			if (firedRef.current) {
				firedRef.current = false;
				event.preventDefault();
				return;
			}
			onClick?.(event);
		},
	};
}

/** Context menu rows, in the order each app shows them. */
export function peekMenuItems(app, chat) {
	const unread = Number(chat?.unread) > 0;
	if (app === 'messenger') {
		return [
			{ id: 'unread', label: unread ? 'Mark as read' : 'Mark as unread', Icon: unread ? MailOpen : Mail },
			{ id: 'pin', label: chat?.pinned ? 'Unpin' : 'Pin', Icon: chat?.pinned ? PinOff : Pin },
			{ id: 'mute', label: chat?.muted ? 'Unmute' : 'Mute', Icon: chat?.muted ? BellRing : BellOff },
			{ id: 'archive', label: chat?.archived ? 'Unarchive' : 'Archive', Icon: chat?.archived ? ArchiveRestore : Archive },
			{ id: 'delete', label: 'Delete', Icon: Trash2, danger: true },
			{ id: 'block', label: 'Block', Icon: Ban, danger: true },
		];
	}
	return [
		{ id: 'unread', label: unread ? 'Mark as read' : 'Mark as unread', Icon: unread ? MessageCircle : MessageCircleMore, dot: !unread },
		{ id: 'archive', label: chat?.archived ? 'Unarchive' : 'Archive', Icon: chat?.archived ? ArchiveRestore : Archive },
		{ id: 'mute', label: chat?.muted ? 'Unmute' : 'Mute', Icon: chat?.muted ? BellRing : BellOff },
		{ id: 'lock', label: chat?.info?.lockChat ? 'Unlock chat' : 'Lock chat', Icon: Lock },
		{ id: 'favourite', label: chat?.favourite ? 'Remove from Favourites' : 'Add to Favourites', Icon: chat?.favourite ? HeartOff : Heart },
		{ id: 'list', label: 'Add to list', Icon: ListPlus },
		{ id: 'delete', label: 'Delete chat', Icon: Trash2, danger: true },
	];
}

/**
 * The iPhone long-press preview: the screen behind blurs, a card shows the bottom of the chat,
 * and the action menu sits under it. Sizes are from 739×1600 screenshots ÷ 1.785.
 */
export function ChatPeekOverlay({ app, status, chat, title, thread, onAction, onClose }) {
	const messenger = app === 'messenger';
	const cardTop = 71;
	const cardHeight = 540;
	const scale = 378 / 414;
	// Show the newest messages: the chat's bottom edge (above its composer) meets the card's.
	const composer = messenger ? 78 : 86;
	const innerTop = cardHeight - (896 - composer) * scale;
	const items = peekMenuItems(app, chat);
	return (
		<div
			className="absolute inset-0 z-50"
			data-fc-peek=""
			style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}
			onClick={onClose}
			role="presentation"
		>
			<div className="absolute inset-0 bg-[rgba(200,200,206,0.42)]" />
			<div className="relative z-10">
				<IosStatusBar {...status} />
			</div>
			<div
				className="absolute start-[18px] end-[18px] overflow-hidden rounded-[16px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
				style={{ top: cardTop, height: cardHeight }}
				onClick={event => event.stopPropagation()}
				role="presentation"
			>
				<div
					className="absolute start-0 top-0 h-[896px] w-[414px] origin-top-left"
					style={{ transform: `translateY(${innerTop}px) scale(${scale})` }}
				>
					{thread}
				</div>
				{messenger ? null : (
					<div className="absolute inset-x-0 top-0 z-10 grid h-[45px] place-items-center border-b-[0.5px] border-[#d6d6d6] bg-white">
						<span className="max-w-[86%] truncate text-[17.5px] font-bold text-black" dir="auto">
							{title}
						</span>
					</div>
				)}
			</div>
			<ul
				className="absolute start-[18px] m-0 w-[275px] list-none overflow-hidden rounded-[14px] bg-[rgba(244,244,246,0.97)] p-0 shadow-[0_8px_30px_rgba(0,0,0,0.1)]"
				style={{ top: cardTop + cardHeight + 18 }}
				onClick={event => event.stopPropagation()}
			>
				{items.map((item, index) => (
					<li key={item.id}>
						<button
							type="button"
							tabIndex={-1}
							onClick={() => onAction(item.id)}
							className={cn(
								'flex h-[46px] w-full cursor-pointer items-center justify-between border-0 bg-transparent px-[18px] text-start text-[18px] font-normal',
								index > 0 && 'border-t-[0.5px] border-solid border-[#c8c8cc]',
								item.danger ? 'text-[#e0243c]' : 'text-black',
							)}
						>
							<span>{item.label}</span>
							<span className="relative">
								<item.Icon
									size={22}
									strokeWidth={item.filled ? 0 : messenger ? 2.4 : 1.7}
									fill={item.filled ? 'currentColor' : 'none'}
									stroke={item.filled ? 'none' : 'currentColor'}
								/>
								{item.dot ? <span className="absolute -end-[1px] -top-[1px] h-[8px] w-[8px] rounded-full bg-[#25d366]" /> : null}
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
