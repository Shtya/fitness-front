'use client';

import {
	BellOff,
	Camera,
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
import { AvatarCircle, IosHomeIndicator, IosStatusBar, PhoneNotch } from './IphoneChrome';
import { resolveFakeChatMediaUrl } from './media-url';
import { chatDisplayName } from './ios-font-and-match';
import { IOS_WA_FONT, tw } from './styles';

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
		<span className={tw.metaFab} aria-hidden="true">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className={tw.metaFabImg} src={FC_ASSETS.metaAi} alt="" draggable={false} />
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
	if (kind === 'video') return <Video size={14} strokeWidth={2} className="shrink-0 text-[#8696a0]" />;
	if (kind === 'camera') return <Camera size={14} strokeWidth={2} className="shrink-0 text-[#8696a0]" />;
	if (kind === 'mic') return <Mic size={14} strokeWidth={2} className="shrink-0 text-[#1dab61]" />;
	if (kind === 'phone') return <Phone size={14} strokeWidth={2} className="shrink-0 text-[#8696a0]" />;
	return null;
}

function ChatAvatar({ chat }) {
	if (chat.metaAi) return <MetaAiAvatar />;
	if (chat.whatsapp || chat.avatarKind === 'whatsapp') return <WhatsAppAvatar />;
	return (
		<AvatarCircle
			src={resolveChatAvatarSrc(chat)}
			label={chat.name}
			size={52}
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

function ChatRow({ chat, active, onOpen, hidePhoneNumbers = false, editing = false, onEdit, onPickAvatar }) {
	const displayName = chatDisplayName(chat, hidePhoneNumbers);
	const nameField = displayName === chat.name ? 'name' : 'about';
	const unread = Number(chat.unread) || 0;
	const RowTag = editing ? 'div' : 'button';
	const avatar = (
		<span className={cn(tw.avatarWrap, chat.storyRing && tw.storyRing, editing && tw.editAvatar)}>
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
	return (
		<RowTag
			{...(editing
				? {}
				: { type: 'button', tabIndex: -1, onClick: () => onOpen?.(chat.id) })}
			className={cn(tw.listRow, 'w-full border-0 bg-transparent text-start', active && !editing && 'bg-[#f0f2f5]')}
		>
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
			<div className={tw.listRowBody}>
				<div className={tw.listRowTop}>
					<EditableText
						editing={editing}
						className={tw.listName}
						dir="auto"
						value={displayName}
						onCommit={next => onEdit?.(chat.id, { [nameField]: next })}
					/>
					<EditableText
						editing={editing}
						className={cn(tw.listTime, chat.timeGreen && tw.listTimeGreen)}
						value={chat.time}
						onCommit={next => onEdit?.(chat.id, { time: next })}
					/>
				</div>
				<div className={tw.listRowBottom}>
					<span className={tw.listPreview}>
						{chat.ticks === 'delivered' || chat.ticks === 'read' ? (
							<CheckCheck
								size={15}
								strokeWidth={2.2}
								className={cn(
									'shrink-0',
									chat.ticks === 'read' ? 'text-[#53bdeb]' : 'text-[#8696a0]',
								)}
							/>
						) : null}
						<PreviewIcon kind={chat.previewIcon} />
						<EditableText
							editing={editing}
							className={tw.listPreviewText}
							dir="auto"
							value={chat.preview}
							onCommit={next => onEdit?.(chat.id, { preview: next })}
						/>
					</span>
					<span className={tw.listTrailing}>
						{chat.muted ? <BellOff size={14} strokeWidth={2.2} className={tw.listMute} /> : null}
						{chat.pinned ? <Pin size={14} strokeWidth={2.2} className={tw.listPin} /> : null}
						{unread > 0 || editing ? (
							<EditableText
								editing={editing}
								numeric
								className={cn(tw.listBadge, editing && unread === 0 && tw.editableGhost)}
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
}) {
	const showSearch = Boolean(list?.showSearch);
	const showSuggestions = Boolean(list?.showSuggestions);
	const hidePhoneNumbers = Boolean(list?.hidePhoneNumbers);
	const selfAvatar = list?.selfAvatar || '';

	return (
		<div className={cn(tw.phone, tw.phoneList, capturing && tw.phoneCapturing)} dir="ltr" style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			{/* Real iOS screenshots have no drawn notch graphic. */}
			<PhoneNotch hidden />
			<div className={cn(tw.chromeList, 'shrink-0')}>
				<IosStatusBar {...status} />
				<div className={tw.listTop}>
					<button type="button" className={tw.listMore} tabIndex={-1} aria-hidden="true">
						<Ellipsis size={18} strokeWidth={2.2} />
					</button>
					<p className={cn(tw.listTopTitle, editing && 'pointer-events-auto')}>
						<EditableText
							editing={editing}
							value={list.title || 'Chats'}
							onCommit={next => onEditList?.({ title: next })}
						/>
					</p>
					<div className={tw.listTopRight}>
						<button type="button" className={tw.listTopBtn} tabIndex={-1} aria-hidden="true">
							<Camera size={22} strokeWidth={1.9} />
						</button>
						<button type="button" className={cn(tw.listTopBtn, tw.listNew)} tabIndex={-1} aria-hidden="true">
							<Plus size={18} strokeWidth={2.6} />
						</button>
					</div>
				</div>
				{showSearch ? (
					<>
						<div className={tw.listSearch}>
							<Search size={16} strokeWidth={2.2} />
							<span>{list.searchPlaceholder}</span>
						</div>
						<div className={tw.listFilters}>
							{['All', 'Unread', 'Favourites', 'Groups'].map((label, index) => (
								<span key={label} className={cn(tw.chip, index === 0 && tw.chipActive)}>
									{label}
								</span>
							))}
							<span className={cn(tw.chip, tw.chipPlus)}>
								<Plus size={14} strokeWidth={2.4} />
							</span>
						</div>
					</>
				) : null}
			</div>

			<div className={tw.listPane}>
				<div className={tw.listBody}>
					{(list.chats || []).map(chat => (
						<ChatRow
							key={chat.id}
							chat={chat}
							active={chat.id === activeChatId}
							onOpen={onOpenChat}
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

			<nav className={tw.tabbar}>
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
					<span key={tab.key} className={cn(tw.tabItem, tab.active && tw.tabItemActive)}>
						<span className="relative">
							{tab.you ? (
								selfAvatar ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img className={tw.tabYouAvatar} src={resolveFakeChatMediaUrl(selfAvatar)} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
								) : (
									<span className={cn(tw.tabYouAvatar, 'grid place-items-center bg-[#cfd8dc] text-[10px] font-bold text-white')}>
										Me
									</span>
								)
							) : (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									className={cn(tw.tabIconImg, tab.active && tw.tabIconActiveImg)}
									src={tab.icon}
									alt=""
								/>
							)}
							{tab.badge > 0 || (editing && tab.badgeField) ? (
								<EditableText
									editing={editing && Boolean(tab.badgeField)}
									numeric
									className={cn(tw.tabBadge, editing && !tab.badge && tw.editableGhost)}
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
