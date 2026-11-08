'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { Ban, ChevronDown, CornerUpRight, Info, Lock, Mic, UserPlus } from 'lucide-react';
import { FC_ASSETS } from './assets';
import { cn } from '@/utils/cn';
import { IOS_WA_FONT, tw } from './styles';
import { ph } from './phone-styles';
import { ensureIosWaFonts } from './ios-font-and-match';
import { resolveFakeChatMediaUrl } from './media-url';
import { resolveBubbleTime } from './defaults';
import { dayPillLabel, resolveMessageDays } from './chat-dates';
import {
	AvatarCircle,
	IconBackChevron,
	IconPhoneCall,
	IconVideoCall,
	IosStatusBar,
	ReadTicks,
} from './IphoneChrome';
import './bubble-tail.css';

const QUOTE_TEAL = '#078d70';

/** First strong character is Arabic/Hebrew → message renders right-to-left. */
const RTL_FIRST_STRONG = /^[^A-Za-zÀ-ɏ֐-ࣿיִ-﷿ﹰ-﻿]*[֐-ࣿיִ-﷿ﹰ-﻿]/;

function Meta({ message, mine, light = false, className = '' }) {
	return (
		<span className={cn(!light && ph.meta, className)}>
			<span>{resolveBubbleTime(message)}</span>
			{mine ? <ReadTicks state={message.ticks || 'read'} /> : null}
		</span>
	);
}

function StatusRingIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
			<circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.6 1.5" />
			<circle cx="8" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.2" />
		</svg>
	);
}

/** "You • Status": the story a message replies to, with its thumbnail. */
function StoryQuote({ story, mine, contactName }) {
	const color = story.color || QUOTE_TEAL;
	const author = story.author || (mine ? contactName : 'You');
	return (
		<div className={cn(ph.quote, mine && ph.quoteOut)}>
			<span className={ph.quoteBar} style={{ background: color }} />
			<div className={ph.quoteBody}>
				<span className={ph.quoteAuthor} style={{ color }}>
					{author} • Status
				</span>
				<span className={ph.quoteText}>
					<StatusRingIcon />
					<span className={ph.quoteTextInner} dir="auto">
						{story.text || (story.kind === 'video' ? 'Video' : 'Photo')}
					</span>
				</span>
			</div>
			{story.src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img className={ph.quoteThumb} src={resolveFakeChatMediaUrl(story.src)} alt="" />
			) : (
				<span className={ph.quoteThumbEmpty} />
			)}
		</div>
	);
}

function MessageQuote({ reply, mine, contactName }) {
	const color = reply.color || QUOTE_TEAL;
	return (
		<div className={cn(ph.quote, mine && ph.quoteOut)}>
			<span className={ph.quoteBar} style={{ background: color }} />
			<div className={ph.quoteBody}>
				<span className={ph.quoteAuthor} style={{ color }}>
					{reply.author || contactName}
				</span>
				<span className={ph.quoteText}>
					{reply.kind === 'voice' ? <Mic size={15} strokeWidth={2} className="shrink-0" /> : null}
					<span className={ph.quoteTextInner} dir="auto">
						{reply.text}
					</span>
				</span>
			</div>
			{reply.src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img className={ph.quoteThumb} src={resolveFakeChatMediaUrl(reply.src)} alt="" />
			) : null}
		</div>
	);
}

function Quotes({ message, mine, contactName }) {
	return (
		<>
			{message.story ? <StoryQuote story={message.story} mine={mine} contactName={contactName} /> : null}
			{message.reply ? <MessageQuote reply={message.reply} mine={mine} contactName={contactName} /> : null}
		</>
	);
}

/** The same message always draws the same waveform. */
function waveBars(seed) {
	let hash = 0;
	for (const char of String(seed || 'voice')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return Array.from({ length: 34 }, (_, index) => {
		hash = (hash * 1664525 + 1013904223 + index) >>> 0;
		return 5 + (hash >>> 24) % 19;
	});
}

function VoiceBubble({ message, mine, avatar, contactName, kind, tailClass }) {
	const played = Boolean(message.played);
	const progress = played ? Math.max(0, Math.min(1, Number(message.progress ?? (mine ? 0 : 0.97)))) : 0;
	const bars = waveBars(message.id);
	const heard = mine ? '#6f7f73' : '#111b21';
	const unheard = mine ? '#9bab97' : '#b5b9bc';
	const dotColor = played ? '#7cb9f0' : mine ? '#111b21' : '#7cb9f0';
	const person = (
		<span className={ph.voiceAvatar}>
			<AvatarCircle src={avatar} label={mine ? 'Me' : contactName} size={50} fallbackKind={kind} />
			<span
				className={ph.voiceMic}
				style={{ [mine ? 'right' : 'left']: -6, color: played ? '#7cb9f0' : '#7d8a80' }}
			>
				<Mic size={19} strokeWidth={2.2} fill="currentColor" />
			</span>
		</span>
	);
	return (
		<div className={cn(ph.voice, mine ? ph.bubbleOut : ph.bubbleIn, mine ? ph.tailOut : ph.tailIn, tailClass)}>
			<Quotes message={message} mine={mine} contactName={contactName} />
			<div className={ph.voiceRow}>
				{mine ? <span className="me-[20px]">{person}</span> : null}
				<span className={ph.voicePlay}>
					<svg width="18" height="20" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
						<path d="M1 .8v12.4L11.4 7z" />
					</svg>
				</span>
				<span className={cn(ph.voiceWave, mine ? 'me-[5px] ms-[8px]' : 'ms-[22px]')}>
					{bars.map((height, index) => (
						<span
							key={index}
							className={ph.voiceBar}
							style={{
								height,
								background: index / bars.length <= progress && progress > 0 ? heard : unheard,
							}}
						/>
					))}
					<span className={ph.voiceDot} style={{ left: `${progress * 100}%`, background: dotColor }} />
				</span>
				{mine ? null : <span className="ms-[20px]">{person}</span>}
			</div>
			<div className={ph.voiceFoot} style={{ paddingInlineStart: mine ? 107 : 50 }}>
				<span className={ph.voiceDur}>{message.duration || '0:03'}</span>
				{message.transcribe ? null : <Meta message={message} mine={mine} />}
			</div>
			{message.transcribe ? (
				<div className="flex items-end justify-between">
					<span className={ph.transcribe}>Transcribe</span>
					<Meta message={message} mine={mine} />
				</div>
			) : null}
		</div>
	);
}

function MediaBubble({ message, mine, contactName }) {
	const video = message.type === 'video';
	const hasQuote = Boolean(message.story || message.reply);
	const captionText = String(message.caption || '').trim();
	const overlayMeta = !captionText;
	const frame = (
		<span className={cn(ph.media, (hasQuote || captionText) && '!rounded-[14px] !shadow-none')}>
			{message.src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img className={ph.mediaImg} src={resolveFakeChatMediaUrl(message.src)} alt="" />
			) : (
				<span className={ph.mediaEmpty} />
			)}
			{video ? (
				<span className={ph.mediaPlay}>
					<svg width="26" height="30" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
						<path d="M1 .8v12.4L11.4 7z" />
					</svg>
				</span>
			) : null}
			{overlayMeta || video ? <span className={ph.mediaShade} /> : null}
			<span className={ph.mediaFoot}>
				<span className="inline-flex items-center">
					{video && message.hd ? <span className={ph.mediaHd}>HD</span> : null}
					{video ? message.duration || '0:15' : ''}
				</span>
				{overlayMeta ? (
					<span className="inline-flex items-center gap-[4px]">
						<span>{resolveBubbleTime(message)}</span>
						{mine ? <ReadTicks state={message.ticks || 'read'} /> : null}
					</span>
				) : null}
			</span>
		</span>
	);
	const wrapped = hasQuote || captionText;
	return (
		<span className="relative inline-block">
			{wrapped ? (
				<span className={cn('block w-[299px] max-w-full rounded-[20px] p-[5px] shadow-[0_1px_0.5px_rgba(11,20,26,0.12)]', mine ? ph.bubbleOut : ph.bubbleIn)}>
					{hasQuote ? (
						<span className="block px-[6px] pt-[1px]">
							<Quotes message={message} mine={mine} contactName={contactName} />
						</span>
					) : null}
					{frame}
					{captionText ? (
						<p className={ph.caption} dir="auto">
							{captionText}
						</p>
					) : null}
					{overlayMeta ? null : (
						<span className="flex justify-end px-[7px] pb-[1px]">
							<Meta message={message} mine={mine} />
						</span>
					)}
				</span>
			) : (
				frame
			)}
			{message.forward ? (
				<span className={ph.forward} style={mine ? { left: -46 } : { right: -46 }}>
					<CornerUpRight size={20} strokeWidth={2.6} />
				</span>
			) : null}
		</span>
	);
}

function MessageBubble({ message, selfAvatar, contactAvatar, contactName, contactAvatarKind, showTail, gapClass }) {
	const mine = message.side === 'out';
	const tailClass = showTail ? (mine ? 'fc-bubble-tail-out' : 'fc-bubble-tail-in') : '';
	const rtl = RTL_FIRST_STRONG.test(String(message.text || ''));
	let body;
	if (message.type === 'voice') {
		body = (
			<VoiceBubble
				message={message}
				mine={mine}
				avatar={mine ? selfAvatar : contactAvatar}
				contactName={contactName}
				kind={!mine && contactAvatarKind === 'group' ? 'group' : 'user'}
				tailClass={tailClass}
			/>
		);
	} else if (message.type === 'image' || message.type === 'video' || message.type === 'ticket') {
		body = <MediaBubble message={message} mine={mine} contactName={contactName} />;
	} else {
		body = (
			<div
				className={cn(ph.bubble, mine ? ph.bubbleOut : ph.bubbleIn, showTail && (mine ? ph.tailOut : ph.tailIn), tailClass)}
				data-fc-fluid="bubble"
			>
				<Quotes message={message} mine={mine} contactName={contactName} />
				<span className={rtl ? ph.lineRtl : ph.line} data-fc-fluid="box">
					<span className={ph.text} dir="auto" data-fc-fluid="text">
						{message.text}
					</span>
					<Meta message={message} mine={mine} className={rtl ? ph.metaBelow : ph.metaInline} />
				</span>
			</div>
		);
	}
	return (
		<div className={cn(ph.row, mine ? ph.rowOut : ph.rowIn, gapClass, message.reaction && ph.hasReaction)} data-fc-fluid="box">
			<span className="relative inline-flex max-w-full">
				{body}
				{message.reaction ? <span className={ph.reaction}>{message.reaction}</span> : null}
			</span>
		</div>
	);
}

function ThreadHeader({ status, thread, unreadBack, onOpenContact, onBackToList }) {
	return (
		<header className={ph.header}>
			<IosStatusBar {...status} />
			<button type="button" className={ph.back} tabIndex={-1} aria-label="Back" onClick={onBackToList}>
				<IconBackChevron className="h-[24px] w-[15px]" />
				{unreadBack > 0 ? <span className={ph.backCount}>{unreadBack}</span> : null}
			</button>
			<button type="button" className={ph.person} tabIndex={-1} onClick={onOpenContact} aria-label="Contact info">
				<span className={ph.personAvatar}>
					<AvatarCircle
						src={thread.contactAvatar}
						label={thread.contactName}
						size={40}
						fallbackKind={thread.contactAvatarKind === 'group' ? 'group' : 'user'}
					/>
					{thread.disappearing ? (
						<span className={ph.personTimer} aria-hidden="true">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={FC_ASSETS.infoDisappearing} alt="" className="h-[13px] w-[13px] object-contain" draggable={false} />
						</span>
					) : null}
				</span>
				<span className="min-w-0">
					<p className={ph.personName} dir="auto">
						{thread.contactName}
					</p>
					{thread.contactSubtitle ? <p className={ph.personSub}>{thread.contactSubtitle}</p> : null}
				</span>
			</button>
			<span className={ph.headerActions} aria-hidden="true">
				<IconVideoCall className="h-[23px] w-[34px]" />
				<IconPhoneCall className="h-[27px] w-[27px]" />
			</span>
		</header>
	);
}

function ThreadComposerShot() {
	return (
		<footer className={tw.composerShot}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className={tw.composerShotImg} src={FC_ASSETS.threadComposer} alt="" draggable={false} />
		</footer>
	);
}

function EncryptionBanner() {
	return (
		<div className={tw.encryptBanner}>
			<Lock size={12} className="mt-0.5 shrink-0 text-[#54656f]" strokeWidth={2.2} />
			<p className={tw.encryptBannerText}>
				Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or
				share them. <span className={tw.encryptLink}>Learn more</span>
			</p>
		</div>
	);
}

function UnknownContactCard({ phone, about, country, avatar, avatarKind }) {
	return (
		<div className={tw.unknownCard}>
			<AvatarCircle
				src={avatar}
				label={phone || about || '?'}
				size={72}
				fallbackKind={avatarKind === 'group' ? 'group' : 'user'}
			/>
			{phone ? (
				<p className={tw.unknownPhone} dir="ltr">
					{phone}
				</p>
			) : null}
			{about ? <p className={tw.unknownAbout}>{about}</p> : null}
			<p className={tw.unknownMeta}>
				Phone number from <span className={tw.unknownMetaStrong}>{country || 'Egypt'}</span>
				{' • '}
				Not a contact
				{' • '}
				No common groups
			</p>
			<button type="button" className={tw.unknownSafety} tabIndex={-1}>
				<span className="grid h-4 w-4 place-items-center rounded-full bg-[#027a5a] text-white">
					<Info size={10} strokeWidth={2.5} />
				</span>
				Safety tools
			</button>
			<div className={tw.unknownActions}>
				<button type="button" className={cn(tw.unknownBtn, tw.unknownBtnBlock)} tabIndex={-1}>
					<Ban size={16} strokeWidth={2.2} />
					Block
				</button>
				<button type="button" className={cn(tw.unknownBtn, tw.unknownBtnAdd)} tabIndex={-1}>
					<UserPlus size={16} strokeWidth={2.2} />
					Add
				</button>
			</div>
		</div>
	);
}

export default function ChatThreadPreview({ status, thread, capturing = false, onOpenContact, onBackToList, peek = false }) {
	const wallpaperStyle = {
		backgroundImage: thread.wallpaper
			? `url("${resolveFakeChatMediaUrl(thread.wallpaper)}")`
			: `url("${FC_ASSETS.wallpaper}")`,
	};
	const unreadBack = Number(thread.backBadge) || 0;
	const messages = thread.messages || [];
	const firstContact = Boolean(thread.firstContact);
	const showEncrypt = Boolean(thread.showEncryptionNotice) || firstContact;
	const days = resolveMessageDays(messages);
	const hasDatedMessages = days.some(Boolean);
	// A fixed label only when no message carries a date; otherwise the pills come from the dates.
	const dateLabel = hasDatedMessages
		? ''
		: thread.dateLabel || (firstContact ? new Date().toLocaleDateString('en-US', { weekday: 'long' }) : '');

	const scrollRef = useRef(null);

	useEffect(() => {
		ensureIosWaFonts();
	}, []);

	const lastMessage = messages[messages.length - 1];
	const lastMessageKey = lastMessage
		? `${messages.length}:${lastMessage.id}:${lastMessage.text || lastMessage.src || ''}`
		: '';

	/** Like WhatsApp: newest message stays visible above the composer. */
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [lastMessageKey, firstContact, showEncrypt, dateLabel]);

	return (
		<div className={cn(tw.phone, capturing && tw.phoneCapturing)} style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<ThreadHeader
				status={status}
				thread={thread}
				unreadBack={unreadBack}
				onOpenContact={onOpenContact}
				onBackToList={onBackToList}
			/>

			<div className={ph.wallpaper} style={wallpaperStyle}>
				<div ref={scrollRef} className={cn(ph.scroll, peek && 'justify-end')}>
					{firstContact || showEncrypt || dateLabel ? (
						<div className={tw.threadIntro}>
							{dateLabel ? <span className={tw.datePill}>{dateLabel}</span> : null}
							{showEncrypt ? <EncryptionBanner /> : null}
							{firstContact ? (
								<UnknownContactCard
									phone={thread.firstContactPhone || thread.contactName}
									about={thread.firstContactAbout}
									country={thread.firstContactCountry}
									avatar={thread.contactAvatar}
									avatarKind={thread.contactAvatarKind}
								/>
							) : null}
						</div>
					) : null}

					{messages.map((message, index) => {
						const prev = messages[index - 1];
						const next = messages[index + 1];
						const newDay = Boolean(days[index]) && days[index] !== days[index - 1];
						const nextNewDay = index + 1 < messages.length && days[index + 1] !== days[index];
						const samePrev = Boolean(prev && prev.side === message.side) && !newDay;
						const sameNext = Boolean(next && next.side === message.side) && !nextNewDay;
						return (
							<div key={message.id} className="contents">
								{newDay ? <span className={ph.dayPill}>{dayPillLabel(days[index])}</span> : null}
								<MessageBubble
									message={message}
									contactAvatar={thread.contactAvatar}
									selfAvatar={thread.selfAvatar}
									contactName={thread.contactName}
									contactAvatarKind={thread.contactAvatarKind}
									showTail={!sameNext}
									gapClass={index === 0 || newDay ? '' : samePrev ? ph.gapSame : ph.gapSwitch}
								/>
							</div>
						);
					})}
				</div>
				{thread.showJumpDown ? (
					<span className={ph.jump} aria-hidden="true">
						<ChevronDown size={24} strokeWidth={2.6} />
					</span>
				) : null}
			</div>

			<ThreadComposerShot />
		</div>
	);
}
