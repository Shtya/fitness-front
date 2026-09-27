'use client';

import { useEffect, useRef, useState } from 'react';
import {
	Bell,
	Bookmark,
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	HardDrive,
	Image as ImageIcon,
	Lock,
	Palette,
	Phone,
	Plus,
	Search,
	ShieldCheck,
	Timer,
	Users,
	Video,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { FC_ASSETS } from './assets';
import { AvatarCircle, IosHomeIndicator, IosStatusBar, PhoneNotch } from './IphoneChrome';
import { IOS_WA_FONT, tw } from './styles';

const WA_GREEN = '#1dab61';

/** Prefer cropped folder icon; Lucide fallback when extract is unusable (near-black). */
function CiIcon({ src, fallback: Fallback, size = 22 }) {
	const [failed, setFailed] = useState(!src);
	if (failed || !src) {
		return <Fallback size={size} strokeWidth={1.85} color={WA_GREEN} />;
	}
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt=""
			className={tw.ciRowIconImg}
			draggable={false}
			onError={() => setFailed(true)}
		/>
	);
}

function ActionIcon({ src, fallback: Fallback }) {
	const [failed, setFailed] = useState(!src);
	if (failed || !src) {
		return <Fallback size={26} strokeWidth={1.85} color={WA_GREEN} />;
	}
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt=""
			className={tw.ciActionIcon}
			draggable={false}
			onError={() => setFailed(true)}
		/>
	);
}

function Row({
	icon,
	label,
	sub,
	value,
	chevron = true,
	tone,
	trailing,
	groupIcon,
}) {
	return (
		<div className={tw.ciRow}>
			{groupIcon ? (
				<span className={tw.ciGroupIcon}>{groupIcon}</span>
			) : icon ? (
				<span className={tw.ciRowIcon}>{icon}</span>
			) : null}
			<span className={tw.ciRowBody}>
				<p className={cn(tw.ciRowLabel, tone === 'green' && tw.ciGreen, tone === 'red' && tw.ciRed)}>
					{label}
				</p>
				{sub ? <p className={tw.ciRowSub}>{sub}</p> : null}
			</span>
			{value != null && value !== '' ? <span className={tw.ciRowValue}>{value}</span> : null}
			{trailing || null}
			{chevron ? <ChevronRight size={18} strokeWidth={2.2} className={tw.ciChevron} /> : null}
		</div>
	);
}

function Toggle({ on }) {
	if (!on) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={FC_ASSETS.switchOff}
				alt=""
				className={tw.ciToggleImg}
				draggable={false}
				aria-hidden="true"
			/>
		);
	}
	return (
		<span className={cn(tw.ciToggle, tw.ciToggleOn)} aria-hidden="true">
			<span className={cn(tw.ciToggleKnob, tw.ciToggleKnobOn)} />
		</span>
	);
}

/**
 * Full WhatsApp iOS Contact Info — same item list as the reference screenshots.
 * Scroll works; scrollbar hidden. Items never flex-shrink away.
 */
export default function ContactInfoPreview({
	status,
	thread,
	capturing = false,
	onBack,
}) {
	const info = thread?.contactInfo || {};
	const title = thread?.contactName || info.phone || '';
	const phone = info.phone || title;
	const rawAbout = String(info.about || '').trim();
	const aboutLooksLikePhone =
		!rawAbout ||
		rawAbout === `~${title}` ||
		rawAbout === `~${phone}` ||
		/~\s*\+?\d/.test(rawAbout);
	const about = aboutLooksLikePhone ? '' : rawAbout;
	const scrollRef = useRef(null);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return undefined;
		const onScroll = () => setScrolled(el.scrollTop > 72);
		onScroll();
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	}, [title]);

	const navTitle = scrolled ? title || 'Contact info' : 'Contact info';
	const groupName = about || title || phone;
	const createGroupLabel = groupName.startsWith('~')
		? `Create group with ${groupName}`
		: `Create group with ${groupName ? `~ ${groupName}` : ''}`.trim();

	return (
		<div
			className={cn(tw.phone, tw.phoneList, capturing && tw.phoneCapturing)}
			dir="ltr"
			style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}
		>
			{/* Real iOS screenshots have no drawn notch graphic. */}
			<PhoneNotch hidden />
			<div className={cn(tw.ciChrome, 'shrink-0')}>
				<IosStatusBar {...status} />
				<div className={tw.ciNav}>
					<button
						type="button"
						className={tw.ciBack}
						tabIndex={-1}
						aria-label="Back"
						onClick={onBack}
					>
						<ChevronLeft size={28} strokeWidth={2.4} />
					</button>
					<p className={tw.ciNavTitle} dir="auto">
						{navTitle}
					</p>
				</div>
			</div>

			<div className={cn(tw.ciRoot, 'min-h-0 flex-1')}>
				<div className={tw.ciScroll} ref={scrollRef}>
					{/* Hero */}
					<div className={tw.ciHero}>
						<AvatarCircle
							src={thread?.contactAvatar}
							label={title || phone}
							size={110}
							fallbackKind={thread?.contactAvatarKind === 'group' ? 'group' : 'user'}
						/>
						<p className={tw.ciHeroPhone} dir="auto">
							{title}
						</p>
						{about ? (
							<p className={tw.ciHeroAbout} dir="auto">
								{about}
							</p>
						) : null}
					</div>

					{/* Voice / Video / Search */}
					<div className={tw.ciActions}>
						<button type="button" className={tw.ciAction} tabIndex={-1}>
							<ActionIcon src={FC_ASSETS.infoVoice} fallback={Phone} />
							Voice
						</button>
						<button type="button" className={tw.ciAction} tabIndex={-1}>
							<ActionIcon src={FC_ASSETS.infoVideo} fallback={Video} />
							Video
						</button>
						<button type="button" className={tw.ciAction} tabIndex={-1}>
							<ActionIcon src={FC_ASSETS.infoSearch} fallback={Search} />
							Search
						</button>
					</div>

					{/* Create new contact */}
					<div className={tw.ciCard}>
						<div className={cn(tw.ciRow, 'last:border-b-0')}>
							<span className={cn(tw.ciRowLabel, tw.ciGreen)}>Create new contact</span>
						</div>
					</div>

					{/* Media / Storage / Kept */}
					<div className={tw.ciCard}>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoMedia} fallback={ImageIcon} />}
							label="Media, links and docs"
							value={String(info.mediaCount ?? '1')}
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoStorage} fallback={HardDrive} />}
							label="Manage storage"
							value={info.storage || '191 KB'}
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoKept} fallback={Bookmark} />}
							label="Kept messages"
							value={info.keptMessages || 'None'}
						/>
					</div>

					{/* Notifications / Theme / Save to Photos */}
					<div className={tw.ciCard}>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoNotifications} fallback={Bell} />}
							label="Notifications"
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoTheme} fallback={Palette} />}
							label="Chat theme"
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoSavePhotos} fallback={Download} />}
							label="Save to Photos"
							value={info.saveToPhotos || 'Off'}
						/>
					</div>

					{/* Disappearing messages */}
					<div className={tw.ciCard}>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoDisappearing} fallback={Timer} />}
							label="Disappearing messages"
							value={info.disappearing || '24 hours'}
						/>
					</div>

					{/* Transcript / Lock / Privacy / Encryption */}
					<div className={tw.ciCard}>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoTranscript} fallback={FileText} />}
							label="Transcript language"
							sub={info.transcriptLanguage || 'Arabic (Saudi Arabia)'}
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoLockChat} fallback={Lock} />}
							label="Lock chat"
							sub="Lock and hide this chat on this device."
							chevron={false}
							trailing={<Toggle on={Boolean(info.lockChat)} />}
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoPrivacy} fallback={ShieldCheck} />}
							label="Advanced chat privacy"
							value={info.advancedPrivacy || 'Off'}
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoEncryption} fallback={Lock} />}
							label="Encryption"
							sub="Messages and calls are end-to-end encrypted. Tap to verify."
						/>
					</div>

					{/* Groups */}
					<p className={tw.ciSectionTitle}>{info.groupsLabel || 'No groups in common'}</p>
					<div className={tw.ciCard}>
						<Row
							groupIcon={<Plus size={18} strokeWidth={2.4} />}
							label={createGroupLabel}
						/>
						<Row
							icon={<CiIcon src={FC_ASSETS.infoAddGroup} fallback={Users} />}
							label="Add to group"
						/>
					</div>

					{/* Favourites / list / export / clear */}
					<div className={tw.ciCard}>
						<Row label="Add to Favourites" tone="green" chevron={false} />
						<Row label="Add to list" tone="green" chevron={false} />
						<Row label="Export chat" tone="green" chevron={false} />
						<Row label="Clear chat" tone="red" chevron={false} />
					</div>

					{/* Block / Report */}
					<div className={tw.ciCard}>
						<Row label={`Block ${title || phone}`} tone="red" chevron={false} />
						<Row label={`Report ${title || phone}`} tone="red" chevron={false} />
					</div>
				</div>
			</div>

			<IosHomeIndicator className="shrink-0 bg-[#f2f2f7]" />
		</div>
	);
}
