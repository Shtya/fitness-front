'use client';

import { isBadStubAvatar } from './assets';
import { resolveFakeChatMediaUrl } from './media-url';
import { cn } from '@/utils/cn';
import { tw } from './styles';
import { useEffect, useState } from 'react';

/** Crisp black iOS status glyphs — light UI (PNG assets were dark-mode / empty). */
export function IconCellular({ className = '' }) {
	return (
		<svg className={className} width="17" height="11" viewBox="0 0 17 11" aria-hidden="true">
			<rect x="0" y="7.5" width="3" height="3.5" rx="0.6" fill="currentColor" />
			<rect x="4.5" y="5.5" width="3" height="5.5" rx="0.6" fill="currentColor" />
			<rect x="9" y="3" width="3" height="8" rx="0.6" fill="currentColor" />
			<rect x="13.5" y="0.5" width="3" height="10.5" rx="0.6" fill="currentColor" />
		</svg>
	);
}

export function IconWifi({ className = '' }) {
	return (
		<svg className={className} width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
			<path
				d="M1.2 4.2a9.2 9.2 0 0 1 13.6 0"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinecap="round"
			/>
			<path
				d="M3.6 6.6a5.8 5.8 0 0 1 8.8 0"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinecap="round"
			/>
			<path
				d="M6.1 9a2.5 2.5 0 0 1 3.8 0"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinecap="round"
			/>
			<circle cx="8" cy="11" r="1.15" fill="currentColor" />
		</svg>
	);
}

export function IconBattery({ className = '', level = 1 }) {
	const fillW = Math.max(1.5, Math.min(18, 18 * level));
	return (
		<svg className={className} width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
			<rect
				x="0.6"
				y="0.75"
				width="21"
				height="10.5"
				rx="2.4"
				stroke="currentColor"
				strokeWidth="1.2"
				opacity="0.4"
			/>
			<path
				d="M23.2 3.8v4.4c.9-.4 1.4-1 1.4-2.2s-.5-1.8-1.4-2.2Z"
				fill="currentColor"
				opacity="0.4"
			/>
			<rect x="2.2" y="2.35" width={fillW} height="7.3" rx="1.4" fill="currentColor" />
		</svg>
	);
}

export function IconBackChevron({ className = '' }) {
	return (
		<svg className={className} width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
			<path
				d="M10.2 1.6 2.1 10l8.1 8.4"
				stroke="currentColor"
				strokeWidth="2.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function IconVideoCall({ className = '' }) {
	return (
		<svg className={className} width="28" height="18" viewBox="0 0 28 18" fill="none" aria-hidden="true">
			<rect x="0.75" y="1.5" width="17.5" height="15" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
			<path
				d="M20.2 6.2 26.6 3.4v11.2L20.2 11.8V6.2Z"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function IconPhoneCall({ className = '' }) {
	return (
		<svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
			<path
				d="M15.9 12.7c-.8 0-1.6-.1-2.3-.4l-.7.7a9.7 9.7 0 0 1-4.2-4.2l.7-.7a5.4 5.4 0 0 1-.4-2.3c0-.7-.6-1.3-1.3-1.3H5.3C4.6 4.5 4 5.1 4 5.8 4 12.3 9.2 17.5 15.7 17.5c.7 0 1.3-.6 1.3-1.3v-2.2c0-.7-.6-1.3-1.1-1.3Z"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function IconPlus({ className = '' }) {
	return (
		<svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
			<path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

export function IconCamera({ className = '' }) {
	return (
		<svg className={className} width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
			<path
				d="M8.2 2.2h5.6l1.2 1.8H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.9l1.3-1.8Z"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinejoin="round"
			/>
			<circle cx="11" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.55" />
		</svg>
	);
}

export function IconSticker({ className = '' }) {
	return (
		<svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
			<path
				d="M4 3.5h9.2L18.5 8.8V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V5A1.5 1.5 0 0 1 4 3.5Z"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
			<path d="M13.2 3.6v4.2h4.3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
		</svg>
	);
}

export function IconMic({ className = '' }) {
	return (
		<svg className={className} width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
			<path d="M7 11.2a2.7 2.7 0 0 0 2.7-2.7V3.7a2.7 2.7 0 1 0-5.4 0v4.8A2.7 2.7 0 0 0 7 11.2Zm4.5-2.7a4.5 4.5 0 0 1-9 0H1a6 6 0 0 0 5.2 5.9V17h1.6v-2.6A6 6 0 0 0 13 8.5h-1.5Z" />
		</svg>
	);
}

/** iOS status bar — light WhatsApp chrome (no notch graphic; real screenshots omit it). */
export function IosStatusBar({ time = '4:44', wifi = true, battery = 1 }) {
	return (
		<div className={tw.statusBar} dir="ltr">
			<span className={tw.statusTime}>{time}</span>
			<div className={tw.statusIcons} aria-hidden="true">
				<IconCellular className={tw.iconCell} />
				{wifi ? <IconWifi className={tw.iconWifi} /> : null}
				<IconBattery className={tw.iconBattery} level={battery} />
			</div>
		</div>
	);
}

export function IosHomeIndicator({ className = '' }) {
	return (
		<div className={cn(tw.homeIndicator, className)} aria-hidden="true">
			<span className={tw.homeBar} />
		</div>
	);
}

/** Real iOS screenshots do not paint a black notch — hide by default. */
export function PhoneNotch({ hidden = true }) {
	if (hidden) return null;
	return <div className={tw.notch} aria-hidden="true" />;
}

/** WhatsApp iOS composer + home indicator (DOM, not stretched PNG). */
export function ThreadComposer() {
	return (
		<footer className={tw.composer}>
			<div className={tw.composerRow}>
				<button type="button" className={tw.composerPlus} tabIndex={-1} aria-hidden="true">
					<IconPlus />
				</button>
				<div className={tw.composerField}>
					<span className={tw.composerFieldGrow} />
					<span className={tw.composerSticker} aria-hidden="true">
						<IconSticker />
					</span>
				</div>
				<button type="button" className={tw.composerCam} tabIndex={-1} aria-hidden="true">
					<IconCamera />
				</button>
				<button type="button" className={tw.composerMic} tabIndex={-1} aria-hidden="true">
					<IconMic />
				</button>
			</div>
			<IosHomeIndicator className={tw.homeIndicatorThread} />
		</footer>
	);
}

/** Clean WA-style person silhouette (flat white on gradient). */
function UserStubIcon({ size }) {
	const s = Math.round(size * 0.78);
	return (
		<svg
			className={tw.avatarStubSvg}
			width={s}
			height={s}
			viewBox="0 0 40 40"
			fill="currentColor"
			aria-hidden="true"
		>
			<circle cx="20" cy="13.5" r="8.2" />
			<ellipse cx="20" cy="36.5" rx="15.5" ry="12.5" />
		</svg>
	);
}

/** Clean WA-style group silhouette (two people). */
function GroupStubIcon({ size }) {
	const s = Math.round(size * 0.82);
	return (
		<svg
			className={tw.avatarStubSvg}
			width={s}
			height={s}
			viewBox="0 0 40 40"
			fill="currentColor"
			aria-hidden="true"
		>
			<circle cx="27" cy="13" r="6.2" />
			<ellipse cx="27" cy="35.5" rx="11" ry="10.5" />
			<circle cx="14.5" cy="14" r="7.4" />
			<ellipse cx="14.5" cy="36.5" rx="13.5" ry="11.5" />
		</svg>
	);
}

/**
 * Photo when `src` loads; otherwise WhatsApp-like gradient + flat SVG
 * (user vs group) — no pixelated extract PNGs.
 */
export function AvatarCircle({
	src,
	label = '?',
	size = 40,
	className = '',
	fallbackKind = 'user',
}) {
	const [failed, setFailed] = useState(false);
	const showPhoto = Boolean(src) && !failed && !isBadStubAvatar(src);
	const isGroup = fallbackKind === 'group';

	useEffect(() => {
		setFailed(false);
	}, [src]);

	return (
		<span
			className={cn(
				tw.avatar,
				!showPhoto && (isGroup ? tw.avatarStubGroup : tw.avatarStubUser),
				className,
			)}
			style={{ width: size, height: size }}
			title={label || undefined}
		>
			{showPhoto ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					className={tw.avatarImg}
					src={resolveFakeChatMediaUrl(src)}
					alt=""
					decoding="async"
					onError={() => setFailed(true)}
				/>
			) : isGroup ? (
				<GroupStubIcon size={size} />
			) : (
				<UserStubIcon size={size} />
			)}
		</span>
	);
}

/** WhatsApp iOS ack ticks — thin overlapping strokes (sent / delivered / read). */
export function ReadTicks({ state = 'read' }) {
	if (!state || state === 'none') return null;
	const color = state === 'read' ? '#34b7f1' : '#8696a0';
	const double = state !== 'sent';
	return (
		<svg
			width={double ? 16 : 11}
			height={11}
			viewBox={double ? '0 0 16 11' : '0 0 11 11'}
			aria-hidden="true"
			className="shrink-0"
			style={{ color, display: 'block' }}
		>
			{/* Primary check */}
			<path
				d={double ? 'M1.2 6.2 4.15 9.1 10.4 1.85' : 'M1.2 6.2 4.15 9.1 9.7 1.85'}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{double ? (
				<path
					d="M5.55 6.2 8.5 9.1 14.8 1.85"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.55"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			) : null}
		</svg>
	);
}

export function VoiceWave({ progress = 0.1 }) {
	const bars = [
		4, 8, 5, 12, 7, 15, 9, 14, 6, 11, 8, 16, 10, 13, 5, 9, 12, 15, 8, 11, 6, 10, 7, 13, 9, 5, 8, 12, 6,
		10, 14, 8, 5, 9, 7, 11,
	];
	const scrubLeft = Math.max(0, Math.min(96, progress * 100));
	return (
		<span className={tw.voiceWave} aria-hidden="true">
			{bars.map((h, i) => (
				<span key={i} className={tw.voiceWaveBar} style={{ height: h }} />
			))}
			<span className={tw.voiceScrub} style={{ left: `${scrubLeft}%` }} />
		</span>
	);
}
