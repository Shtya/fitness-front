'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import {
	Archive,
	BadgeCheck,
	Bell,
	Bot,
	Check,
	CheckCheck,
	ChevronLeft,
	ChevronRight,
	CornerUpRight,
	Ellipsis,
	Gem,
	Image as ImageIcon,
	Layers,
	Menu,
	MessageCircle,
	MessageCircleMore,
	Mic,
	PenSquare,
	Phone,
	PhoneIncoming,
	PhoneMissed,
	PhoneOutgoing,
	Plus,
	QrCode,
	Search,
	Settings,
	Smile,
	Store,
	ThumbsUp,
	UserPlus,
	Users,
	UsersRound,
	Video,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { FC_ASSETS, resolveChatAvatarKind, resolveChatAvatarSrc } from './assets';
import { AvatarCircle, IconCameraSolid, IosHomeIndicator, IosStatusBar } from './IphoneChrome';
import { IOS_WA_FONT, tw } from './styles';
import { useLongPress } from './ChatPeek';
import { resolveFakeChatMediaUrl } from './media-url';
import { resolveBubbleTime } from './defaults';
import { messengerRowTime, messengerStamp, messengerGapStarts, resolveMessageDays } from './chat-dates';

/** Sizes from 739×1600 Messenger screenshots ÷ 1.785; colours sampled from them. */
const ms = {
	phone: cn(tw.phone, 'fc-ms bg-white'),
	head: 'relative shrink-0 bg-white',
	row: 'relative flex w-full cursor-pointer items-center border-0 bg-transparent p-0 text-start',
	rowAvatar: 'relative grid w-[106px] shrink-0 place-items-center',
	ring: 'rounded-full p-[3px] ring-[2.5px] ring-[#0a7cff]',
	dot: 'absolute start-[9px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full bg-[#0866fa]',
	rowBody: 'flex h-[84px] min-w-0 flex-1 items-center pe-[18px]',
	rowName: 'truncate text-left text-[17.5px] font-semibold leading-[24px] text-black',
	rowPreview: 'truncate text-[15.6px] font-normal leading-[23px] text-[#6b6b70]',
	rowTime: 'shrink-0 text-[14.5px] font-normal leading-[20px] text-[#6b6b70]',
	round: 'grid h-[35px] w-[35px] place-items-center rounded-full bg-[#e2e6e9] text-black',
	tabs: 'relative z-30 grid shrink-0 grid-cols-4 bg-[#f4f6fa] px-[6px] pt-[8px]',
	tab: 'relative flex cursor-pointer flex-col items-center gap-[2px] border-0 bg-transparent p-0 text-[13.5px] font-bold leading-[17px] text-[#65676b]',
	tabOn: 'text-[#0a63f2]',
	badge: 'absolute -top-[7px] start-[calc(50%+1px)] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#e0243c] px-[5px] text-[14px] font-bold leading-none text-white ring-[2px] ring-[#f4f6fa]',
	redDot: 'absolute -top-[3px] start-[calc(50%+9px)] h-[11px] w-[11px] rounded-full bg-[#e0243c]',
	fab: 'pointer-events-none absolute bottom-[18px] end-[18px] z-20 grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full bg-[#f3f5f9] shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
	stamp: 'my-[12px] text-center text-[14.5px] font-medium leading-[19px] tracking-[0.1px] text-[#68686a]',
	bubble: 'relative box-border inline-block max-w-[290px] rounded-[21px] px-[14px] py-[9px] text-[17.5px] font-normal leading-[24px] break-words whitespace-pre-wrap',
	bubbleIn: 'bg-[#f3f4f8] text-black',
	bubbleOut: 'text-white',
	reaction: 'absolute -bottom-[14px] end-[2px] z-[2] grid h-[28px] min-w-[30px] place-items-center rounded-full bg-[#f3f4f8] px-[5px] text-[17px] leading-none ring-[2px] ring-white',
	composer: 'relative z-10 flex shrink-0 items-center gap-[12px] bg-white px-[16px] pt-[6px] text-[#0019b8]',
	field: 'flex h-[44px] min-w-0 flex-1 items-center justify-between rounded-full bg-[#f3f4f8] ps-[20px] pe-[8px] text-[18px] font-normal text-[#65676b]',
	menuCard: 'mx-[18px] overflow-hidden rounded-[16px] bg-white',
	menuRow: 'flex h-[57px] w-full cursor-pointer items-center gap-[16px] border-0 bg-transparent ps-[17px] pe-[16px] text-start text-[18.5px] font-normal text-black',
	menuRowLine: 'flex h-full min-w-0 flex-1 items-center justify-between border-b-[0.5px] border-[#d8dadf]',
};

/** Messenger's sent bubbles shift from bright to deep blue down the screen. */
function bubbleBlue(y) {
	const t = Math.max(0, Math.min(1, (y - 380) / 480));
	const mix = (a, b) => Math.round(a + (b - a) * t);
	return `rgb(${mix(0, 2)}, ${mix(108, 32)}, ${mix(255, 220)})`;
}

/** Messenger's tab glyphs: filled shapes (bubble, two people, bell) and the three-line menu. */
function TabGlyph({ name }) {
	if (name === 'chats') {
		return (
			<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
				<path
					fill="currentColor"
					d="M16 3.2C8.7 3.2 3 8.5 3 15.4c0 3.6 1.5 6.7 4 8.9v4.3c0 .8.9 1.3 1.6.9l3.5-1.9c1.2.4 2.5.6 3.9.6 7.3 0 13-5.3 13-12.2S23.3 3.2 16 3.2Z"
				/>
			</svg>
		);
	}
	if (name === 'people') {
		return (
			<svg width="34" height="32" viewBox="0 0 34 32" aria-hidden="true">
				<circle cx="23.5" cy="10.2" r="5.2" fill="currentColor" />
				<path fill="currentColor" d="M23.5 17.4c4.6 0 8.5 2.7 8.5 6.6v1.6c0 .9-.7 1.6-1.6 1.6h-6.6c.1-.5.2-1 .2-1.6v-1.2c0-2.6-1.2-4.9-3.2-6.4.9-.4 1.8-.6 2.7-.6Z" />
				<circle cx="12.5" cy="10.8" r="6" fill="currentColor" />
				<path fill="currentColor" d="M12.5 18.6c5.4 0 9.8 3 9.8 7.3v1.2c0 1-.8 1.8-1.8 1.8h-16c-1 0-1.8-.8-1.8-1.8v-1.2c0-4.3 4.4-7.3 9.8-7.3Z" />
			</svg>
		);
	}
	if (name === 'notifications') {
		return (
			<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
				<path
					fill="currentColor"
					d="M16 3.5c-5 0-9 4-9 9v4.6l-2.3 4c-.6 1 .2 2.2 1.3 2.2h20c1.1 0 1.9-1.2 1.3-2.2l-2.3-4v-4.6c0-5-4-9-9-9Z"
				/>
				<path fill="currentColor" d="M12.2 25.2h7.6a3.8 3.8 0 0 1-7.6 0Z" />
			</svg>
		);
	}
	return (
		<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
			<path d="M5.5 8.5h21M5.5 16h21M5.5 23.5h21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
		</svg>
	);
}

function Tabs({ list, active, onTab }) {
	const tabs = [
		{ key: 'chats', label: 'Chats', badge: list.chatsBadge },
		{ key: 'people', label: 'People', dot: list.peopleDot },
		{ key: 'notifications', label: 'Notifications', dot: list.notificationsDot },
		{ key: 'menu', label: 'Menu', dot: list.menuDot },
	];
	return (
		<>
			<nav className={ms.tabs}>
				{tabs.map(({ key, label, badge, dot }) => (
					<button
						type="button"
						tabIndex={-1}
						key={key}
						className={cn(ms.tab, key === active && ms.tabOn)}
						onClick={() => onTab?.(key)}
					>
						<span className="relative grid h-[32px] place-items-center">
							<TabGlyph name={key} />
						</span>
						{badge ? <span className={ms.badge}>{badge}</span> : null}
						{dot ? <span className={ms.redDot} /> : null}
						{label}
					</button>
				))}
			</nav>
			<IosHomeIndicator className="relative z-30 shrink-0 !bg-[#f4f6fa]" />
		</>
	);
}

function Fab() {
	return (
		<span className={ms.fab} aria-hidden="true">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="h-[70%] w-[70%] object-contain" src={FC_ASSETS.metaAi} alt="" draggable={false} />
		</span>
	);
}

function Story({ avatar, name, note, noteDark = false, create = false, onOpen }) {
	return (
		<button
			type="button"
			tabIndex={-1}
			onClick={onOpen}
			className="relative flex w-[97px] shrink-0 cursor-pointer flex-col items-center gap-[6px] border-0 bg-transparent p-0"
		>
			<span className="relative">
				<AvatarCircle src={avatar} label={name} size={77} />
				{create ? (
					<span className="absolute -bottom-[1px] -end-[6px] grid h-[31px] w-[31px] place-items-center rounded-full bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
						<Plus size={20} strokeWidth={2.2} />
					</span>
				) : null}
			</span>
			{note ? (
				<span
					className={cn(
						'absolute -top-[17px] left-1/2 line-clamp-2 w-max max-w-[86px] -translate-x-1/2 rounded-[13px] px-[9px] py-[5px] text-center text-[12.5px] font-normal leading-[15px] shadow-[0_1px_5px_rgba(0,0,0,0.13)]',
						noteDark ? 'bg-[#3b2f2b] text-white' : 'bg-white text-[#3a3b3c]',
					)}
					dir="auto"
				>
					{note}
				</span>
			) : null}
			<span className={cn('w-full truncate text-center text-[14.5px] leading-[18px]', create ? 'font-normal text-[#65676b]' : 'font-medium text-[#1c1e21]')} dir="auto">
				{name}
			</span>
		</button>
	);
}

function Ticks({ state }) {
	if (state === 'sent') return <Check size={17} strokeWidth={2} className="shrink-0" />;
	if (state === 'delivered' || state === 'read') {
		return <CheckCheck size={18} strokeWidth={2} className={cn('shrink-0', state === 'read' && 'text-[#0a63f2]')} />;
	}
	return null;
}

function ChatRow({ chat, onOpen, onPeek, trailingDate = false }) {
	const press = useLongPress(onPeek ? () => onPeek(chat.id) : null, () => onOpen?.(chat.id));
	const unread = Number(chat.unread) > 0;
	const kind = resolveChatAvatarKind(chat);
	const fromMe = chat.messages?.[chat.messages.length - 1]?.side === 'out';
	return (
		<button type="button" tabIndex={-1} className={ms.row} {...press}>
			{unread ? <span className={ms.dot} /> : null}
			<span className={ms.rowAvatar}>
				{chat.marketplace ? (
					<span className="grid h-[66px] w-[66px] place-items-center rounded-[14px] bg-[#f3f4f8] text-black">
						<Store size={34} strokeWidth={0} fill="currentColor" />
					</span>
				) : (
					<span className={cn(chat.storyRing && ms.ring)}>
						<AvatarCircle src={resolveChatAvatarSrc(chat)} label={chat.name} size={chat.storyRing ? 54 : 66} fallbackKind={kind} />
					</span>
				)}
			</span>
			<span className={ms.rowBody}>
				<span className="flex min-w-0 flex-1 flex-col justify-center pe-[8px]">
					<span className={cn(ms.rowName, unread && 'font-bold')} dir="auto">
						{chat.name}
					</span>
					{chat.preview ? (
						<span className={cn(ms.rowPreview, 'flex min-w-0 items-center gap-[3px]', unread && 'font-bold text-black')}>
							{fromMe ? <Ticks state={chat.seenAvatar ? '' : chat.ticks} /> : null}
							<span className="truncate" dir="auto">
								{fromMe && !chat.previewPlain ? `You: ${chat.preview}` : chat.preview}
							</span>
						</span>
					) : null}
				</span>
				<span className="flex h-full shrink-0 flex-col items-end justify-center gap-[6px]">
					<span className={cn(ms.rowTime, unread && !trailingDate && 'font-medium text-[#0a63f2]')}>{messengerRowTime(chat.time)}</span>
					{chat.rowThumb ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={resolveFakeChatMediaUrl(chat.rowThumb)} alt="" className="h-[33px] w-[33px] rounded-[6px] object-cover" />
					) : chat.callButton ? (
						<span className={ms.round}>
							<Phone size={18} strokeWidth={0} fill="currentColor" />
						</span>
					) : chat.seenAvatar ? (
						<AvatarCircle src={resolveChatAvatarSrc(chat)} label="" size={18} fallbackKind={kind} />
					) : null}
				</span>
			</span>
		</button>
	);
}

export function MessengerList({ status, list, onOpenChat, onPeek, onTab, onOpenStory }) {
	const chats = (list.chats || []).filter(chat => !chat.request && !chat.archived);
	return (
		<div className={ms.phone} style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<div className={ms.head}>
				<IosStatusBar {...status} />
				<div className="flex h-[52px] items-center justify-between ps-[17px] pe-[20px]">
					<span
						className="bg-linear-to-r from-[#0a84ff] to-[#0a5df2] bg-clip-text text-[33px] font-extrabold leading-[44px] tracking-[-0.8px] text-transparent"
						style={{ WebkitTextFillColor: 'transparent' }}
					>
						{list.title || 'messenger'}
					</span>
					<span className="flex items-center gap-[22px] text-black">
						<PenSquare size={26} strokeWidth={2.2} />
						<span className="relative grid h-[26px] w-[26px] place-items-center rounded-full bg-black text-[19px] font-extrabold leading-none text-white">
							f
							{Number(list.fbBadge) > 0 ? (
								<span className="absolute -end-[9px] -top-[9px] grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#e0243c] px-[4px] text-[12.5px] font-bold leading-none text-white ring-[2px] ring-white">
									{list.fbBadge}
								</span>
							) : null}
						</span>
					</span>
				</div>
				<div className="mx-[18px] mt-[10px] flex h-[45px] items-center gap-[8px] rounded-full bg-[#f3f5f9] px-[14px] text-[18.5px] font-normal text-[#5f6368]">
					<Search size={23} strokeWidth={2.4} className="text-[#3a3b3c]" />
					{list.searchPlaceholder}
				</div>
			</div>
			<div className="relative min-h-0 flex-1 overflow-hidden">
				<div className={tw.listBody}>
					<div className="flex gap-0 overflow-hidden pb-[9px] ps-[8px] pt-[33px]">
						<Story avatar={list.selfAvatar} name="Create story" note={list.selfNote} create />
						{(list.stories || []).map(story => (
							<Story
								key={story.id}
								avatar={story.avatar}
								name={story.name}
								note={story.note}
								noteDark={story.noteDark}
								onOpen={() => onOpenStory?.(story.id)}
							/>
						))}
					</div>
					{list.showChips !== false ? (
						<div className="flex items-center gap-[9px] ps-[18px] pb-[8px] pt-[8px]">
							<span className="inline-flex h-[31px] items-center rounded-full bg-[#eaf6ff] px-[18px] text-[16px] font-bold text-[#0a63f2]">All</span>
							{[
								{ label: 'Unread', count: list.unreadBadge },
								{ label: 'Groups', count: list.groupsCount },
							].map(chip => (
								<span key={chip.label} className="inline-flex h-[31px] items-center gap-[5px] rounded-full bg-[#f1f2f6] px-[18px] text-[16px] font-bold text-black">
									{chip.label}
									{Number(chip.count) > 0 ? <span>{chip.count}</span> : null}
								</span>
							))}
							<span className="grid h-[31px] w-[31px] place-items-center rounded-full bg-[#f1f2f6] text-[#5f6368]">
								<Ellipsis size={18} strokeWidth={3} />
							</span>
						</div>
					) : null}
					{chats.map(chat => (
						<ChatRow key={chat.id} chat={chat} onOpen={onOpenChat} onPeek={onPeek} />
					))}
				</div>
				<Fab />
			</div>
			<Tabs list={list} active="chats" onTab={onTab} />
		</div>
	);
}

/** Message requests, or the archive: same rows under a pushed title. */
export function MessengerRequests({ status, list, onBack, onOpenChat, onPeek, onTab, mode = 'requests' }) {
	const archive = mode === 'archive';
	const chats = (list.chats || []).filter(chat => (archive ? chat.archived && !chat.request : chat.request));
	return (
		<div className={ms.phone} style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<div className={ms.head}>
				<IosStatusBar {...status} />
				<div className="relative flex h-[52px] items-center justify-center">
					<button type="button" tabIndex={-1} onClick={onBack} aria-label="Back" className="absolute start-[10px] grid cursor-pointer place-items-center border-0 bg-transparent p-0 text-black">
						<ChevronLeft size={34} strokeWidth={2.2} />
					</button>
					<span className="text-[18.5px] font-bold text-black">{archive ? 'Archive' : 'Message requests'}</span>
					{archive ? null : <span className="absolute end-[27px] text-[18px] font-medium text-[#0a63f2]">Edit</span>}
				</div>
				{archive ? null : (
					<>
						<div className="mx-[18px] mt-[2px] grid grid-cols-2 text-[15.5px] font-bold">
							<span className="grid h-[31px] place-items-center rounded-full bg-[#f1f2f6] text-black">YOU MAY KNOW</span>
							<span className="grid h-[31px] place-items-center text-[#65676b]">SPAM</span>
						</div>
						<p className="mx-[18px] mb-[10px] mt-[20px] text-[15px] font-normal leading-[18.5px] text-[#65676b]">
							Open a chat to get more info about who&apos;s messaging you. They won&apos;t know that you&apos;ve seen it until you reply.{' '}
							<span className="font-semibold text-[#0a63f2]">Choose who can message you</span>
						</p>
					</>
				)}
			</div>
			<div className="relative min-h-0 flex-1 overflow-hidden">
				<div className={tw.listBody}>
					{chats.map(chat => (
						<ChatRow key={chat.id} chat={chat} onOpen={onOpenChat} onPeek={onPeek} trailingDate />
					))}
				</div>
				<Fab />
			</div>
			<Tabs list={list} active="menu" onTab={onTab} />
		</div>
	);
}

function MenuRow({ Icon, label, onClick, last = false, fill = true }) {
	return (
		<button type="button" tabIndex={-1} className={ms.menuRow} onClick={onClick}>
			<Icon size={27} strokeWidth={fill ? 0 : 2.4} fill={fill ? 'currentColor' : 'none'} className="shrink-0" />
			<span className={cn(ms.menuRowLine, last && 'border-b-0')}>
				<span>{label}</span>
				<ChevronRight size={22} strokeWidth={2.2} className="text-[#65676b]" />
			</span>
		</button>
	);
}

/** The Menu tab: profile, settings and the shortcuts list (Message requests and Archive open). */
export function MessengerMenu({ status, list, onTab, onOpenRequests, onOpenArchive }) {
	return (
		<div className={cn(ms.phone, '!bg-[#f0f2f5]')} style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<div className="relative shrink-0">
				<IosStatusBar {...status} />
				<div className="flex h-[58px] items-center justify-between ps-[18px] pe-[22px]">
					<span className="text-[35px] font-extrabold leading-none tracking-[-0.6px] text-black">Menu</span>
					<QrCode size={30} strokeWidth={2.2} />
				</div>
			</div>
			<div className="relative min-h-0 flex-1 overflow-hidden">
				<div className={cn(tw.listBody, '!bg-transparent pt-[6px]')}>
					<div className={ms.menuCard}>
						<div className="flex h-[59px] items-center gap-[14px] ps-[14px] pe-[16px]">
							<AvatarCircle src={list.selfAvatar} label={list.profileName || 'Me'} size={36} />
							<span className="flex h-full min-w-0 flex-1 items-center justify-between border-b-[0.5px] border-[#d8dadf]">
								<span className="min-w-0">
									<span className="block truncate text-[18.5px] font-normal leading-[23px] text-black">{list.profileName || 'Your name'}</span>
									<span className="block truncate text-[14.5px] font-medium leading-[18px] text-[#65676b]">
										Switch profile · {list.profileHandle || '@username'}
									</span>
								</span>
								{Number(list.profileBadge) > 0 ? (
									<span className="grid h-[24px] min-w-[24px] place-items-center rounded-full bg-[#e0243c] px-[6px] text-[14px] font-bold text-white">
										{list.profileBadge}
									</span>
								) : null}
							</span>
						</div>
						<MenuRow Icon={Settings} label="Settings" last />
					</div>
					<div className={cn(ms.menuCard, 'mt-[36px]')}>
						<MenuRow Icon={Store} label="Marketplace" />
						<MenuRow Icon={UsersRound} label="Communities" />
						<MenuRow Icon={MessageCircleMore} label="Message requests" onClick={onOpenRequests} />
						<MenuRow Icon={Archive} label="Archive" last onClick={onOpenArchive} />
					</div>
					<div className={cn(ms.menuCard, 'mt-[36px]')}>
						<MenuRow Icon={UserPlus} label="Friend requests" />
						<MenuRow Icon={Layers} label="Moments" />
						<MenuRow Icon={Bot} label="Chat with AIs" last />
					</div>
					<p className="mx-[18px] mb-[8px] mt-[22px] text-[18px] font-medium text-[#65676b]">Subscriptions</p>
					<div className={ms.menuCard}>
						<MenuRow Icon={Gem} label="Facebook Plus" last />
					</div>
				</div>
				<Fab />
			</div>
			<Tabs list={list} active="menu" onTab={onTab} />
		</div>
	);
}

function Quote({ message, mine, contactName }) {
	const story = message.story;
	const reply = message.reply;
	if (!story && !reply) return null;
	return (
		<span className={cn('mb-[-10px] flex max-w-[270px] flex-col gap-[3px] text-[13px] text-[#65676b]', mine && 'items-end')}>
			<span className="flex items-center gap-[4px]">
				<CornerUpRight size={13} strokeWidth={2.2} className="-scale-x-100" />
				{story ? (mine ? `You replied to ${contactName}'s story` : `${contactName} replied to your story`) : mine ? `You replied to ${contactName}` : `${contactName} replied to you`}
			</span>
			{story ? (
				story.src ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={resolveFakeChatMediaUrl(story.src)} alt="" className="block h-[130px] w-[84px] rounded-[12px] object-cover" />
				) : (
					<span className="block h-[130px] w-[84px] rounded-[12px] bg-linear-to-br from-[#7bb48f] to-[#3f6f8c]" />
				)
			) : (
				<span className="rounded-[18px] bg-[#f3f4f8] px-[13px] pb-[16px] pt-[8px] text-[15.5px] text-[#65676b]" dir="auto">
					{reply.text}
				</span>
			)}
		</span>
	);
}

function VoiceBars() {
	const bars = [12, 20, 12, 30, 44, 24, 14, 22, 12, 32, 44, 16, 26, 38, 30, 20, 14, 18, 40, 22];
	return (
		<span className="flex h-[44px] min-w-0 flex-1 items-center justify-between">
			{bars.map((height, index) => (
				<span key={index} className="block w-[2.5px] rounded-full bg-white" style={{ height }} />
			))}
		</span>
	);
}

/** Call card: "Missed audio call 2:32 pm / Call back", "Audio call 50 min, 22 secs". */
function CallCard({ message, mine }) {
	const missed = message.callStatus !== 'answered';
	const video = message.callKind === 'video';
	const title = `${missed ? 'Missed ' : ''}${video ? 'video' : 'audio'} call`.replace(/^./, c => c.toUpperCase());
	const sub = missed ? resolveBubbleTime(message) : message.callDuration || '1 min, 5 secs';
	const Icon = missed ? PhoneMissed : mine ? PhoneOutgoing : PhoneIncoming;
	return (
		<span className="flex w-[232px] flex-col gap-[12px] rounded-[22px] bg-[#f3f4f8] p-[13px]">
			<span className="flex items-center gap-[12px]">
				<span className={cn('grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full text-white', missed && !mine ? 'bg-[#f02849]' : 'bg-[#8a8d91]')}>
					{video ? <Video size={20} strokeWidth={0} fill="currentColor" /> : <Icon size={20} strokeWidth={2.4} />}
				</span>
				<span className="min-w-0">
					<span className="block whitespace-nowrap text-[17px] font-bold leading-[22px] text-black">{title}</span>
					<span className="block text-[15px] leading-[19px] text-[#65676b]">{sub}</span>
				</span>
			</span>
			<span className="grid h-[38px] place-items-center rounded-[13px] bg-white text-[17px] font-bold text-black">
				{mine ? 'Call again' : 'Call back'}
			</span>
		</span>
	);
}

/** A shared reel/post: dark card with the author, the frame, play and the source mark. */
function ReelCard({ message, mine }) {
	const reel = message.reel || {};
	return (
		<span className="relative inline-flex items-center">
			{mine ? (
				<span className="me-[14px] grid h-[35px] w-[35px] place-items-center rounded-full bg-[#e4e6eb] text-black">
					<CornerUpRight size={19} strokeWidth={2.6} />
				</span>
			) : null}
			<span className="flex w-[190px] flex-col overflow-hidden rounded-[22px] bg-black p-[11px] pb-[10px]">
				<span className="mb-[8px] flex items-center gap-[8px]">
					<AvatarCircle src={reel.avatar} label={reel.author || ''} size={26} />
					<span className="truncate text-[15px] font-bold text-white" dir="auto">
						{reel.author || 'Reels'}
					</span>
				</span>
				<span className="relative block overflow-hidden rounded-[6px]">
					{message.src ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={resolveFakeChatMediaUrl(message.src)} alt="" className="block h-[200px] w-full object-cover" />
					) : (
						<span className="block h-[200px] w-full bg-linear-to-br from-[#6b5a4a] to-[#2b2b2b]" />
					)}
					<span className="absolute start-1/2 top-1/2 grid h-[50px] w-[50px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white">
						<svg width="20" height="22" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
							<path d="M1 .8v12.4L11.4 7z" />
						</svg>
					</span>
				</span>
				<span className="mt-[9px] grid h-[17px] w-[17px] place-items-center rounded-full bg-white text-[12px] font-extrabold leading-none text-black">
					{reel.platform === 'instagram' ? '◎' : 'f'}
				</span>
			</span>
			{mine ? null : (
				<span className="ms-[14px] grid h-[35px] w-[35px] place-items-center rounded-full bg-[#e4e6eb] text-black">
					<CornerUpRight size={19} strokeWidth={2.6} />
				</span>
			)}
		</span>
	);
}

function MessageBody({ message, mine, blue, corners }) {
	if (message.type === 'call') return <CallCard message={message} mine={mine} />;
	if (message.type === 'reel') return <ReelCard message={message} mine={mine} />;
	if (message.type === 'voice') {
		return (
			<span
				data-mg-out={mine ? '' : undefined}
				className={cn('flex h-[70px] w-[306px] items-center gap-[14px] rounded-[21px] ps-[14px] pe-[18px] text-white', !mine && 'bg-[#e4e6eb] text-black')}
				style={{ ...corners, ...(mine ? { background: blue } : null) }}
			>
				<span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#012a6a] text-white">
					<svg width="18" height="20" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
						<path d="M1 .8v12.4L11.4 7z" />
					</svg>
				</span>
				<VoiceBars />
				<span className="shrink-0 text-[16px] font-semibold">{message.duration || '0:10'}</span>
			</span>
		);
	}
	if (message.type === 'image' || message.type === 'video' || message.type === 'ticket') {
		return (
			<span className="relative block w-[240px] overflow-hidden rounded-[21px] bg-[#d1d7db]" style={corners}>
				{message.src ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={resolveFakeChatMediaUrl(message.src)} alt="" className="block max-h-[340px] w-full object-cover" />
				) : (
					<span className="block h-[170px] w-full bg-linear-to-br from-[#cfd8dc] to-[#90a4ae]" />
				)}
				{message.type === 'video' ? (
					<span className="absolute start-1/2 top-1/2 grid h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white">
						<svg width="20" height="22" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
							<path d="M1 .8v12.4L11.4 7z" />
						</svg>
					</span>
				) : null}
			</span>
		);
	}
	return (
		<span
			data-mg-out={mine ? '' : undefined}
			className={cn(ms.bubble, mine ? ms.bubbleOut : ms.bubbleIn)}
			style={{ ...corners, ...(mine ? { background: blue } : null) }}
			dir="auto"
		>
			{message.text}
		</span>
	);
}

export function MessengerThread({ status, thread, list, onBack, onOpenContact, peek = false }) {
	const messages = thread.messages || [];
	const days = resolveMessageDays(messages);
	const clocks = messages.map(resolveBubbleTime);
	const starts = messengerGapStarts(days, clocks);
	const scrollRef = useRef(null);

	const paintBlues = () => {
		const box = scrollRef.current;
		if (!box) return;
		const top = box.getBoundingClientRect().top;
		const scale = box.getBoundingClientRect().height / box.offsetHeight || 1;
		box.querySelectorAll('[data-mg-out]').forEach(node => {
			const rect = node.getBoundingClientRect();
			const y = (rect.top - top) / scale + 96;
			const yEnd = y + rect.height / scale;
			node.style.background = `linear-gradient(${bubbleBlue(y)}, ${bubbleBlue(yEnd)})`;
		});
	};

	const lastKey = `${messages.length}:${messages[messages.length - 1]?.id || ''}`;
	useLayoutEffect(() => {
		const box = scrollRef.current;
		if (box) box.scrollTop = box.scrollHeight;
	}, [lastKey]);
	useEffect(() => {
		paintBlues();
	});

	const lastOutIndex = messages.reduce((found, message, index) => (message.side === 'out' ? index : found), -1);
	const chatAvatarKind = thread.contactAvatarKind === 'group' ? 'group' : 'user';
	const cardLike = message => message.type === 'call' || message.type === 'reel';

	return (
		<div className={ms.phone} style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<header className="relative z-10 h-[96px] w-full shrink-0 bg-linear-to-r from-white via-white to-[#e8f3fd]">
				<IosStatusBar {...status} />
				<button type="button" tabIndex={-1} onClick={onBack} aria-label="Back" className="absolute start-[4px] top-[50px] flex h-[36px] cursor-pointer items-center border-0 bg-transparent p-0 text-[#0a7cff]">
					<ChevronLeft size={32} strokeWidth={2.4} className="-me-[11px]" />
					{Number(list.backCount) > 0 ? (
						<span className="grid h-[22px] min-w-[26px] place-items-center rounded-full bg-[#0a7cff] px-[5px] text-[15.5px] font-bold leading-none text-white">
							{list.backCount}
						</span>
					) : null}
				</button>
				<button type="button" tabIndex={-1} onClick={onOpenContact} className="absolute start-[55px] end-[86px] top-[47px] flex h-[42px] min-w-0 cursor-pointer items-center gap-[11px] border-0 bg-transparent p-0 text-start">
					<span className={cn(thread.storyRing && 'rounded-full p-[2.5px] ring-2 ring-[#0a7cff]')}>
						<AvatarCircle src={thread.contactAvatar} label={thread.contactName} size={thread.storyRing ? 35 : 40} fallbackKind={chatAvatarKind} />
					</span>
					<span className="min-w-0">
						<span className="flex min-w-0 items-center gap-[4px]">
							<span className="truncate text-[18px] font-bold leading-[22px] text-black" dir="auto">
								{thread.contactName}
							</span>
							{thread.verified ? <BadgeCheck size={17} strokeWidth={2.2} className="shrink-0 fill-[#0a7cff] text-white" /> : null}
						</span>
						{thread.contactSubtitle ? (
							<span className="block truncate text-[15px] font-semibold leading-[19px] text-[#0a63f2]">{thread.contactSubtitle}</span>
						) : null}
					</span>
				</button>
				<span className="absolute end-[17px] top-[55px] flex items-center gap-[23px] text-[#0a7cff]" aria-hidden="true">
					<Phone size={25} strokeWidth={0} fill="currentColor" />
					<Video size={30} strokeWidth={0} fill="currentColor" />
				</span>
			</header>

			<div ref={scrollRef} onScroll={paintBlues} className={`${peek ? 'justify-end ' : ''}relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-white ps-[13px] pe-[9px] pb-[6px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
				{messages.map((message, index) => {
					const mine = message.side === 'out';
					const samePrev = index > 0 && messages[index - 1].side === message.side && !starts[index] && !cardLike(message) && !cardLike(messages[index - 1]);
					const sameNext = index + 1 < messages.length && messages[index + 1].side === message.side && !starts[index + 1] && !cardLike(message) && !cardLike(messages[index + 1]);
					const small = 5;
					const big = 21;
					const corners = mine
						? {
								borderTopRightRadius: samePrev ? small : big,
								borderBottomRightRadius: sameNext ? small : big,
							}
						: {
								borderTopLeftRadius: samePrev ? small : big,
								borderBottomLeftRadius: sameNext ? small : big,
							};
					return (
						<div key={message.id} className="contents">
							{starts[index] ? <p className={ms.stamp}>{messengerStamp(days[index], clocks[index])}</p> : null}
							<div className={cn('relative flex w-full items-end', mine ? 'justify-end' : 'justify-start', samePrev && 'mt-[3px]', !samePrev && !starts[index] && 'mt-[8px]', message.reaction && 'mb-[14px]')}>
								{mine ? null : (
									<span className="me-[13px] h-[31px] w-[31px] shrink-0">
										{sameNext ? null : (
											<AvatarCircle src={thread.contactAvatar} label={thread.contactName} size={31} fallbackKind={chatAvatarKind} />
										)}
									</span>
								)}
								<span className={cn('relative flex flex-col', mine && 'items-end')}>
									<Quote message={message} mine={mine} contactName={thread.contactName} />
									<span className="relative inline-flex">
										<MessageBody message={message} mine={mine} blue="#0068ff" corners={corners} />
										{message.reaction ? <span className={ms.reaction}>{message.reaction}</span> : null}
									</span>
								</span>
							</div>
							{index === lastOutIndex && index === messages.length - 1 && thread.seenAvatar ? (
								<span className="mt-[4px] flex justify-end pe-[13px]">
									<AvatarCircle src={thread.contactAvatar} label="" size={18} fallbackKind={chatAvatarKind} />
								</span>
							) : null}
						</div>
					);
				})}
			</div>
			{thread.showJumpDown ? (
				<span className="pointer-events-none absolute bottom-[96px] start-1/2 z-20 grid h-[44px] w-[44px] -translate-x-1/2 place-items-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M12 4v16M5 13l7 7 7-7" />
					</svg>
				</span>
			) : null}

			<footer className={ms.composer} aria-hidden="true">
				<span className="grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full bg-[#0019b8] text-white">
					<Plus size={19} strokeWidth={3} />
				</span>
				<IconCameraSolid size={29} className="shrink-0" />
				<ImageIcon size={26} strokeWidth={2.4} className="shrink-0" />
				<Mic size={26} strokeWidth={2.4} className="shrink-0" />
				<span className={ms.field}>
					Aa
					<Smile size={27} strokeWidth={2.2} className="text-[#0019b8]" />
				</span>
				<ThumbsUp size={27} strokeWidth={0} fill="currentColor" className="shrink-0" />
			</footer>
			<IosHomeIndicator className="relative z-10 shrink-0 !bg-white" />
		</div>
	);
}
