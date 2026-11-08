'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import {
	Archive,
	BellOff,
	Camera,
	Check,
	CheckCheck,
	Ellipsis,
	Mic,
	Phone,
	Pin,
	Plus,
	Search,
	Video,
	X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { FC_ASSETS, resolveChatAvatarKind, resolveChatAvatarSrc } from './assets';
import { AvatarCircle, IconBackChevron, IconCameraSolid, IosHomeIndicator, IosStatusBar, PhoneNotch } from './IphoneChrome';
import { resolveFakeChatMediaUrl } from './media-url';
import { chatDisplayName } from './ios-font-and-match';
import { IOS_WA_FONT, tw } from './styles';
import { ph } from './phone-styles';
import { useLongPress } from './ChatPeek';

function MetaAiAvatar({ className = '' }) {
	return (
		<span className={cn(tw.metaAi, className)} aria-hidden="true">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className={tw.metaAiImg} src={FC_ASSETS.metaAi} alt="" draggable={false} />
		</span>
	);
}

function MetaAiFab() {
	return (
		<span className={ph.fab} aria-hidden="true">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className={ph.fabImg} src={FC_ASSETS.metaAi} alt="" draggable={false} />
		</span>
	);
}

function WhatsAppAvatar() {
	return (
		<span className={tw.waAvatar} aria-hidden="true">
			<svg viewBox="0 0 24 24" width={22} height={22} fill="#fff">
				<path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.86c0 1.93.56 3.73 1.53 5.27L2 22l5.04-1.62a9.86 9.86 0 0 0 5 1.35h.01c5.46 0 9.89-4.4 9.89-9.86C21.94 6.4 17.5 2 12.04 2zm5.75 13.98c-.24.68-1.4 1.25-1.93 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.26-4.79-4.18-4.93-4.38-.14-.2-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34.26-.28.56-.35.75-.35h.54c.17 0 .4-.06.62.48.24.56.8 1.95.87 2.09.07.14.12.3.02.49-.1.2-.15.32-.3.49-.14.17-.3.38-.43.51-.14.14-.29.29-.12.56.17.28.74 1.22 1.59 1.98 1.1.97 2.02 1.28 2.3 1.42.29.14.45.12.62-.07.17-.2.71-.82.9-1.1.19-.28.38-.23.64-.14.26.1 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
			</svg>
		</span>
	);
}

function PreviewIcon({ kind }) {
	if (kind === 'video') return <Video size={17} strokeWidth={2} className={ph.row2Icon} />;
	if (kind === 'camera') return <Camera size={17} strokeWidth={2} className={ph.row2Icon} />;
	if (kind === 'mic') return <Mic size={17} strokeWidth={2} className={ph.row2Icon} />;
	if (kind === 'phone') return <Phone size={17} strokeWidth={2} className={ph.row2Icon} />;
	return null;
}

function ChatAvatar({ chat }) {
	if (chat.metaAi) return <MetaAiAvatar />;
	if (chat.whatsapp || chat.avatarKind === 'whatsapp') return <WhatsAppAvatar />;
	return (
		<AvatarCircle
			src={resolveChatAvatarSrc(chat)}
			label={chat.name}
			size={62}
			fallbackKind={resolveChatAvatarKind(chat)}
		/>
	);
}

/**
 * Inline text on the mockup. Commits on blur/Enter only, so React never re-renders mid-typing;
 * `key={value}` resets the DOM after an external change.
 */
function EditableText({ editing, value, onCommit, className, dir, numeric = false, display }) {
	const shown = display ?? value;
	if (!editing) {
		return (
			<span className={className} dir={dir}>
				{shown}
			</span>
		);
	}
	return (
		<span
			key={String(value ?? '')}
			className={cn(className, tw.editable)}
			dir={dir}
			contentEditable
			suppressContentEditableWarning
			spellCheck={false}
			onClick={event => event.stopPropagation()}
			onKeyDown={event => {
				if (event.key === 'Enter') {
					event.preventDefault();
					event.currentTarget.blur();
				}
				if (event.key === 'Escape') {
					event.currentTarget.textContent = String(value ?? '');
					event.currentTarget.blur();
				}
			}}
			onBlur={event => {
				const raw = String(event.currentTarget.textContent || '').trim();
				const next = numeric ? Math.max(0, Number.parseInt(raw.replace(/\D/g, ''), 10) || 0) : raw;
				if (next !== value) onCommit?.(next);
			}}
		>
			{value}
		</span>
	);
}

function ChatRow({ chat, active, onOpen, onPeek, onOpenStory, hidePhoneNumbers = false, editing = false, onEdit, onPickAvatar }) {
	const press = useLongPress(onPeek ? () => onPeek(chat.id) : null, () => onOpen?.(chat.id));
	const displayName = chatDisplayName(chat, hidePhoneNumbers);
	const nameField = displayName === chat.name ? 'name' : 'about';
	const unread = Number(chat.unread) || 0;
	const RowTag = editing ? 'div' : 'button';
	const avatar = (
		<span
			className={cn(tw.avatarWrap, chat.storyRing && tw.storyRing, editing && tw.editAvatar)}
			onClick={
				chat.storyRing && onOpenStory && !editing
					? event => {
							// Tapping the photo of a chat with a status opens the status, not the chat.
							event.stopPropagation();
							onOpenStory(chat.id);
						}
					: undefined
			}
			role="presentation"
		>
			<ChatAvatar chat={chat} />
			{chat.disappearing ? (
				<span className={tw.disappearBadge} aria-hidden="true">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={FC_ASSETS.infoDisappearing}
						alt=""
						className="h-[11px] w-[11px] object-contain"
						draggable={false}
					/>
				</span>
			) : null}
		</span>
	);
	const pinFilled = Boolean(chat.pinned);
	return (
		<RowTag
			{...(editing ? {} : { type: 'button', tabIndex: -1, ...press })}
			className={ph.row2}
		>
			<span className={ph.row2Avatar}>
				{editing ? (
					<label title="Change photo">
						{avatar}
						<input
							className={tw.fileInputHidden}
							type="file"
							accept="image/*"
							onChange={event => onPickAvatar?.(chat.id, event)}
						/>
					</label>
				) : (
					avatar
				)}
			</span>
			<div className={ph.row2Body}>
				<div className={ph.row2Top}>
					<EditableText
						editing={editing}
						className={ph.row2Name}
						dir="auto"
						value={displayName}
						onCommit={next => onEdit?.(chat.id, { [nameField]: next })}
					/>
					<EditableText
						editing={editing}
						className={cn(ph.row2Time, (chat.timeGreen || unread > 0) && ph.row2TimeGreen)}
						value={chat.time}
						onCommit={next => onEdit?.(chat.id, { time: next })}
					/>
				</div>
				<div className={ph.row2Bottom}>
					<span className={ph.row2Preview}>
						{chat.ticks === 'sent' ? <Check size={17} strokeWidth={2} className={ph.row2Icon} /> : null}
						{chat.ticks === 'delivered' || chat.ticks === 'read' ? (
							<CheckCheck
								size={18}
								strokeWidth={2}
								className={cn(ph.row2Icon, chat.ticks === 'read' && 'text-[#3f9ae6]')}
							/>
						) : null}
						<PreviewIcon kind={chat.previewIcon} />
						<EditableText
							editing={editing}
							className={ph.row2PreviewText}
							dir="auto"
							value={chat.preview}
							onCommit={next => onEdit?.(chat.id, { preview: next })}
						/>
					</span>
					<span className={ph.row2Trail}>
						{chat.muted ? <BellOff size={18} strokeWidth={2.2} fill="currentColor" /> : null}
						{pinFilled ? <Pin size={18} strokeWidth={2} fill="currentColor" className="rotate-45" /> : null}
						{unread > 0 || editing ? (
							<EditableText
								editing={editing}
								numeric
								className={cn(ph.row2Badge, editing && unread === 0 && tw.editableGhost)}
								value={unread}
								display={unread > 99 ? '99+' : unread}
								onCommit={next => onEdit?.(chat.id, { unread: next, timeGreen: next > 0 })}
							/>
						) : null}
					</span>
				</div>
			</div>
		</RowTag>
	);
}

export default function ChatsListPreview({
	status,
	list,
	capturing = false,
	activeChatId = '',
	onOpenChat,
	editing = false,
	onEditChat,
	onEditList,
	onPickChatAvatar,
	onOpenArchived,
	onPeek,
	onOpenStory,
}) {
	// The phone always shows search and the filter chips; hiding them made screens look wrong.
	const showSearch = true;
	const showSuggestions = Boolean(list?.showSuggestions);
	const hidePhoneNumbers = Boolean(list?.hidePhoneNumbers);
	const selfAvatar = list?.selfAvatar || '';
	const allChats = list?.chats || [];
	const archivedChats = allChats.filter(chat => chat.archived);
	const visibleChats = allChats.filter(chat => !chat.archived);
	const archivedShown = archivedChats.length || Number(list?.archivedCount) || 0;

	// iOS large title: scrolling up tucks "Chats", search and chips away and shows a small centred
	// title in the bar. `list.scrolled` pins that look for screenshots.
	const scrollRef = useRef(null);
	const firstRowRef = useRef(null);
	const [collapsed, setCollapsed] = useState(Boolean(list?.scrolled));
	useLayoutEffect(() => {
		const box = scrollRef.current;
		if (!box) return;
		if (list?.scrolled) {
			box.scrollTop = firstRowRef.current ? firstRowRef.current.offsetTop : 0;
			setCollapsed(true);
		} else {
			box.scrollTop = 0;
			setCollapsed(false);
		}
	}, [list?.scrolled]);
	const onScroll = event => {
		const next = event.currentTarget.scrollTop > 46;
		if (next !== collapsed) setCollapsed(next);
	};

	return (
		<div className={cn(tw.phone, tw.phoneList, capturing && tw.phoneCapturing)} dir="ltr" style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			{/* Real iOS screenshots have no drawn notch graphic. */}
			<PhoneNotch hidden />
			<div className={cn(tw.chromeList, 'relative z-10 shrink-0 pb-[6px]', collapsed && 'border-b-[0.5px] border-[#d6d6d6] bg-white/95')}>
				<IosStatusBar {...status} />
				<div className={cn(ph.listBar, 'relative')}>
					<button type="button" className={ph.listRound} tabIndex={-1} aria-hidden="true">
						<Ellipsis size={20} strokeWidth={2.6} />
					</button>
					<span
						className={cn(
							'pointer-events-none absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px] font-bold text-black transition-opacity duration-150',
							collapsed ? 'opacity-100' : 'opacity-0',
						)}
						aria-hidden={!collapsed}
					>
						{list.title || 'Chats'}
					</span>
					<div className={ph.listRight}>
						<button type="button" className={ph.listRound} tabIndex={-1} aria-hidden="true">
							<IconCameraSolid size={21} lens="#f6f5f3" />
						</button>
						<button type="button" className={ph.listNew} tabIndex={-1} aria-hidden="true">
							<Plus size={20} strokeWidth={2.8} />
						</button>
					</div>
				</div>
			</div>

			<div className={tw.listPane}>
				<div className={tw.listBody} ref={scrollRef} onScroll={onScroll}>
					<p className={cn(ph.listTitle, editing && 'pointer-events-auto')}>
						<EditableText
							editing={editing}
							value={list.title || 'Chats'}
							onCommit={next => onEditList?.({ title: next })}
						/>
					</p>
					{showSearch ? (
						<>
							<div className={ph.search}>
								<Search size={21} strokeWidth={2.2} />
								<span>{list.searchPlaceholder}</span>
							</div>
							<div className={ph.chips}>
								{[
									{ label: 'All', on: true },
									{ label: 'Unread', count: list.unreadBadge },
									{ label: 'Favourites', count: list.favouritesCount },
									{ label: 'Groups', count: list.groupsCount },
								].map(chip => (
									<span key={chip.label} className={cn(ph.chip, chip.on && ph.chipOn)}>
										{chip.label}
										{Number(chip.count) > 0 ? <span className="font-medium">{chip.count}</span> : null}
									</span>
								))}
							</div>
						</>
					) : null}

					{archivedShown > 0 || list.archivedMention || editing ? (
						<button type="button" tabIndex={-1} className={cn(ph.archived, 'w-full cursor-pointer border-0 bg-transparent p-0 text-start')} onClick={onOpenArchived}>
							<span className={ph.archivedIcon}>
								<Archive size={25} strokeWidth={1.8} />
							</span>
							<span className={ph.archivedBody}>
								Archived
								<EditableText
									editing={editing}
									numeric
									className={ph.archivedCount}
									value={archivedShown}
									display={list.archivedMention && !editing ? <span className="text-[24px] font-semibold text-[#1daa61]">@</span> : undefined}
									onCommit={next => onEditList?.({ archivedCount: next })}
								/>
							</span>
						</button>
					) : null}
					<span ref={firstRowRef} aria-hidden="true" />
					{visibleChats.map(chat => (
						<ChatRow
							key={chat.id}
							chat={chat}
							active={chat.id === activeChatId}
							onOpen={onOpenChat}
							onPeek={onPeek}
							onOpenStory={onOpenStory}
							hidePhoneNumbers={hidePhoneNumbers}
							editing={editing}
							onEdit={onEditChat}
							onPickAvatar={onPickChatAvatar}
						/>
					))}

					{showSuggestions ? (
						<section className={tw.startChat}>
							<div className={tw.startHead}>
								<span>Start chatting</span>
								<button type="button" className={tw.startHide} tabIndex={-1}>
									Hide
								</button>
							</div>
							{(list.suggestions || []).map(item => (
								<div key={item.id} className={tw.startRow}>
									<AvatarCircle src={item.avatar} label={item.name} size={44} />
									<span className={tw.startName} dir="auto">
										{item.name}
									</span>
									<button type="button" className={tw.startChatBtn} tabIndex={-1}>
										Chat
									</button>
									<button type="button" className={tw.startX} tabIndex={-1}>
										<X size={16} strokeWidth={2.2} />
									</button>
								</div>
							))}
						</section>
					) : null}
				</div>

				{/* Fixed above the tab bar — does not scroll with the chat list. */}
				<MetaAiFab />
			</div>

			<nav className={ph.tabs}>
				{[
					{ key: 'updates', label: 'Updates', icon: FC_ASSETS.tabUpdates },
					{
						key: 'calls',
						label: 'Calls',
						icon: FC_ASSETS.tabCalls,
						badge: list.callsBadge || 0,
						badgeField: 'callsBadge',
					},
					{ key: 'communities', label: 'Communities', icon: FC_ASSETS.tabCommunities },
					{
						key: 'chats',
						label: 'Chats',
						icon: FC_ASSETS.tabChats,
						active: true,
						badge: list.unreadBadge || 0,
						badgeField: 'unreadBadge',
					},
					{ key: 'you', label: 'You', you: true },
				].map(tab => (
					<span key={tab.key} className={cn(ph.tab, tab.active && ph.tabOn)}>
						<span className="relative">
							{tab.you ? (
								selfAvatar ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img className={ph.tabYou} src={resolveFakeChatMediaUrl(selfAvatar)} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
								) : (
									<span className={cn(ph.tabYou, 'grid place-items-center bg-[#cfd8dc] text-[10px] font-bold text-white')}>
										Me
									</span>
								)
							) : (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									className={ph.tabIcon}
									src={tab.icon}
									alt=""
								/>
							)}
							{tab.badge > 0 || (editing && tab.badgeField) ? (
								<EditableText
									editing={editing && Boolean(tab.badgeField)}
									numeric
									className={cn(ph.tabBadge, editing && !tab.badge && tw.editableGhost)}
									value={tab.badge}
									onCommit={next => onEditList?.({ [tab.badgeField]: next })}
								/>
							) : null}
						</span>
						<span>{tab.label}</span>
					</span>
				))}
			</nav>
			<IosHomeIndicator className={tw.homeIndicatorList} />
		</div>
	);
}

/** Pushed from the Archived row: the archived chats, with the same rows as the main list. */
export function ArchivedChatsPreview({ status, list, capturing = false, activeChatId = '', onOpenChat, onBack, onPeek }) {
	const chats = (list?.chats || []).filter(chat => chat.archived);
	return (
		<div className={cn(tw.phone, tw.phoneList, capturing && tw.phoneCapturing)} dir="ltr" style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<div className={cn(tw.chromeList, 'shrink-0')}>
				<IosStatusBar {...status} />
				<div className="relative flex h-[52px] items-center justify-center">
					<button type="button" tabIndex={-1} aria-label="Back" onClick={onBack} className="absolute start-[8px] flex h-[36px] cursor-pointer items-center border-0 bg-transparent p-0 text-black">
						<IconBackChevron className="h-[24px] w-[15px]" />
					</button>
					<span className="text-[18px] font-bold text-black">Archived</span>
				</div>
			</div>
			<div className={tw.listPane}>
				<div className={tw.listBody}>
					<p className="m-0 border-b-[0.5px] border-[#cfcfcf] px-[18px] pb-[12px] pt-[4px] text-center text-[14px] font-normal leading-[19px] text-[#6b6b6b]">
						These chats stay archived when new messages are received. To change this setting, go to Settings &gt; Chats.
					</p>
					{chats.map(chat => (
						<ChatRow
							key={chat.id}
							chat={chat}
							active={chat.id === activeChatId}
							onOpen={onOpenChat}
							onPeek={onPeek}
							hidePhoneNumbers={Boolean(list.hidePhoneNumbers)}
						/>
					))}
				</div>
			</div>
			<IosHomeIndicator className="relative z-30 shrink-0 !bg-white" />
		</div>
	);
}
