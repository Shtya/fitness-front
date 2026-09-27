'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { FC_ASSETS } from './assets';
import { cn } from '@/utils/cn';
import { IOS_WA_FONT, tw } from './styles';
import { ensureIosWaFonts } from './ios-font-and-match';
import { resolveFakeChatMediaUrl } from './media-url';
import { resolveBubbleTime } from './defaults';
import { AvatarCircle, ReadTicks, VoiceWave } from './IphoneChrome';
import './bubble-tail.css';
import { Ban, Info, Lock, UserPlus } from 'lucide-react';

function MicBadge({ outline = '#dcf8c6' }) {
	return (
		<span className={tw.voiceMicBadge} style={{ boxShadow: `0 0 0 1.5px ${outline}` }} aria-hidden="true">
			<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z" />
			</svg>
		</span>
	);
}

function ReplyBlock({ reply, contactName }) {
	if (!reply) return null;
	return (
		<div className={tw.reply}>
			<span className={tw.replyAuthor}>{reply.author || contactName}</span>
			<span className={tw.replyText}>{reply.text}</span>
		</div>
	);
}

/** First strong character is Arabic/Hebrew → message renders right-to-left. */
const RTL_FIRST_STRONG = /^[^A-Za-z\u00C0-\u024F\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

function MessageBubble({
	message,
	contactAvatar,
	selfAvatar,
	contactName,
	contactAvatarKind = 'user',
	showTail = true,
	spacingClass = '',
}) {
	const mine = message.side === 'out';
	const ticks = mine ? message.ticks || 'read' : 'none';
	const bubbleShape = mine
		? showTail
			? tw.bubbleOutTail
			: tw.bubbleOutGroup
		: showTail
			? tw.bubbleInTail
			: tw.bubbleInGroup;
	const tailClass = showTail ? (mine ? 'fc-bubble-tail-out' : 'fc-bubble-tail-in') : '';
	const rtl = RTL_FIRST_STRONG.test(String(message.text || ''));

	if (message.type === 'image' || message.type === 'ticket') {
		return (
			<div className={cn(tw.row, mine ? tw.rowOut : tw.rowIn, spacingClass)}>
				<div
					className={cn(
						tw.bubble,
						tw.bubbleMedia,
						mine ? tw.bubbleOut : tw.bubbleIn,
						bubbleShape,
						tailClass,
					)}
				>
					<ReplyBlock reply={message.reply} contactName={contactName} />
					<div className={tw.media}>
						{message.src ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								className={cn(tw.mediaImg, message.type === 'ticket' && tw.mediaTicketImg)}
								src={resolveFakeChatMediaUrl(message.src)}
								alt=""
							/>
						) : (
							<div className={tw.mediaPlaceholder}>
								{message.type === 'ticket' ? 'Ticket' : 'Image'}
							</div>
						)}
						{message.caption ? <p className={tw.mediaCaption}>{message.caption}</p> : null}
					</div>
					<span className={cn(tw.meta, tw.bubbleMediaMeta)}>
						<span>{resolveBubbleTime(message)}</span>
						{mine ? <ReadTicks state={ticks} /> : null}
					</span>
				</div>
			</div>
		);
	}

	if (message.type === 'voice') {
		return (
			<div className={cn(tw.row, mine ? tw.rowOut : tw.rowIn, spacingClass)}>
				<div
					className={cn(
						tw.bubble,
						tw.bubbleVoice,
						mine ? tw.bubbleOut : tw.bubbleIn,
						bubbleShape,
						tailClass,
					)}
				>
					<div className={tw.voice}>
						<span className={tw.voiceAvatarWrap}>
							<AvatarCircle
								src={mine ? selfAvatar : contactAvatar}
								label={mine ? 'Me' : contactName}
								size={36}
								fallbackKind={
									mine
										? 'user'
										: contactAvatarKind === 'group'
											? 'group'
											: 'user'
								}
							/>
							<MicBadge outline={mine ? '#dcf8c6' : '#ffffff'} />
						</span>
						<button type="button" className={tw.voicePlay} tabIndex={-1} aria-hidden="true">
							<svg width="14" height="16" viewBox="0 0 12 14" fill="currentColor">
								<path d="M1 1.2v11.6L11 7z" />
							</svg>
						</button>
						<div className={tw.voiceBody}>
							<VoiceWave progress={0.12} />
							<span className={tw.voiceDur}>{message.duration || '0:03'}</span>
						</div>
					</div>
					<span className={cn(tw.meta, tw.bubbleVoiceMeta)}>
						<span>{resolveBubbleTime(message)}</span>
						{mine ? <ReadTicks state={ticks} /> : null}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className={cn(tw.row, mine ? tw.rowOut : tw.rowIn, spacingClass)} data-fc-fluid="box">
			<div
				className={cn(tw.bubble, mine ? tw.bubbleOut : tw.bubbleIn, bubbleShape, tailClass)}
				data-fc-fluid="bubble"
			>
				<ReplyBlock reply={message.reply} contactName={contactName} />
				<span className={rtl ? tw.bubbleLineRtl : tw.bubbleLine} data-fc-fluid="box">
					<span className={tw.bubbleText} dir="auto" data-fc-fluid="text">
						{message.text}
					</span>
					<span className={cn(tw.meta, rtl ? tw.metaBelow : tw.metaTail)} data-fc-fluid="meta">
						<span>{resolveBubbleTime(message)}</span>
						{mine ? <ReadTicks state={ticks} /> : null}
					</span>
				</span>
			</div>
		</div>
	);
}

/** Real crop for status + nav; time / avatar / name float on top. */
function ThreadHeaderShot({ status, thread, unreadBack, onOpenContact, onBackToList }) {
	return (
		<div className={tw.chromeShot}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				className={tw.chromeShotImg}
				src={FC_ASSETS.threadHeaderChrome}
				alt=""
				draggable={false}
			/>
			<span className={tw.chromeTimeFloat} dir="ltr">
				{status?.time || '4:44'}
			</span>
			<button
				type="button"
				className={tw.chromeBackHit}
				tabIndex={-1}
				aria-label="Back"
				onClick={onBackToList}
			/>
			{/* Cover baked “7” in the chrome crop, then draw live unread. */}
			<span className={tw.chromeBackBadgeCover} aria-hidden="true" />
			{unreadBack > 0 ? (
				<span className={tw.chromeBackBadgeFloat} aria-hidden="true">
					{unreadBack}
				</span>
			) : null}
			<button
				type="button"
				className={tw.chromePersonFloat}
				tabIndex={-1}
				onClick={onOpenContact}
				aria-label="Contact info"
			>
				<AvatarCircle
					src={thread.contactAvatar}
					label={thread.contactName}
					size={36}
					fallbackKind={thread.contactAvatarKind === 'group' ? 'group' : 'user'}
				/>
				<div className="min-w-0">
					<p className={tw.personName}>{thread.contactName}</p>
					<p className={tw.personSub}>{thread.contactSubtitle}</p>
				</div>
			</button>
		</div>
	);
}

function ThreadComposerShot() {
	return (
		<footer className={tw.composerShot}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				className={tw.composerShotImg}
				src={FC_ASSETS.threadComposer}
				alt=""
				draggable={false}
			/>
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

export default function ChatThreadPreview({
	status,
	thread,
	capturing = false,
	onOpenContact,
	onBackToList,
}) {
	const wallpaperStyle = {
		backgroundImage: thread.wallpaper
			? `url("${resolveFakeChatMediaUrl(thread.wallpaper)}")`
			: `url("${FC_ASSETS.wallpaper}")`,
	};
	const unreadBack = Number(thread.backBadge) || 0;
	const messages = thread.messages || [];
	const firstContact = Boolean(thread.firstContact);
	const showEncrypt = Boolean(thread.showEncryptionNotice) || firstContact;
	const dateLabel =
		thread.dateLabel ||
		(firstContact
			? new Date().toLocaleDateString('en-US', { weekday: 'long' })
			: '');

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
			<ThreadHeaderShot
				status={status}
				thread={thread}
				unreadBack={unreadBack}
				onOpenContact={onOpenContact}
				onBackToList={onBackToList}
			/>

			<div className={tw.wallpaper} style={wallpaperStyle}>
				<div ref={scrollRef} className={tw.threadScroll}>
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
						const samePrev = Boolean(prev && prev.side === message.side);
						const sameNext = Boolean(next && next.side === message.side);
						const spacingClass =
							index === 0 && !firstContact
								? ''
								: index === 0
									? tw.rowLoose
									: samePrev
										? tw.rowTight
										: tw.rowLoose;
						return (
							<MessageBubble
								key={message.id}
								message={message}
								contactAvatar={thread.contactAvatar}
								selfAvatar={thread.selfAvatar}
								contactName={thread.contactName}
								contactAvatarKind={thread.contactAvatarKind}
								showTail={!sameNext}
								spacingClass={spacingClass}
							/>
						);
					})}
				</div>
			</div>

			<ThreadComposerShot />
		</div>
	);
}
