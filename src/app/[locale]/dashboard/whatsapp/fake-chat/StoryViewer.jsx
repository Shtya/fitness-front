'use client';

import { ChevronLeft, Ellipsis, Heart, Send, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AvatarCircle, IosHomeIndicator, IosStatusBar } from './IphoneChrome';
import { IOS_WA_FONT, tw } from './styles';
import { resolveFakeChatMediaUrl } from './media-url';

/**
 * A story opened full screen, as each app shows it: progress bars, who and when, the picture,
 * and the reply bar (WhatsApp "Reply", Messenger "Send message" with quick reactions).
 */
export function StoryViewer({ app, status, story, onClose }) {
	const messenger = app === 'messenger';
	const segments = Math.max(1, Math.min(8, Number(story?.segments) || 1));
	const current = Math.min(segments, Math.max(1, Number(story?.current) || 1));
	return (
		<div className={cn(tw.phone, '!bg-black text-white')} style={{ fontFamily: IOS_WA_FONT, '--fc-font': IOS_WA_FONT }}>
			<div className="absolute inset-0">
				{story?.src ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={resolveFakeChatMediaUrl(story.src)} alt="" className="h-full w-full object-cover" />
				) : (
					<span className="block h-full w-full bg-linear-to-br from-[#3f6f8c] via-[#5b4b7a] to-[#1d1d1f]" />
				)}
				<span className="absolute inset-x-0 top-0 h-[170px] bg-linear-to-b from-black/55 to-transparent" />
				<span className="absolute inset-x-0 bottom-0 h-[190px] bg-linear-to-t from-black/60 to-transparent" />
			</div>
			<div className="relative z-10 [&_*]:!text-white">
				<IosStatusBar {...status} />
			</div>
			<div className="relative z-10 mx-[8px] mt-[4px] flex gap-[4px]">
				{Array.from({ length: segments }, (_, index) => (
					<span key={index} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/40">
						<span
							className="block h-full bg-white"
							style={{ width: index + 1 < current ? '100%' : index + 1 === current ? `${Number(story?.progress ?? 35)}%` : '0%' }}
						/>
					</span>
				))}
			</div>
			<div className="relative z-10 mt-[12px] flex items-center gap-[10px] px-[12px]">
				{messenger ? null : (
					<button type="button" tabIndex={-1} onClick={onClose} className="-me-[4px] grid cursor-pointer place-items-center border-0 bg-transparent p-0 text-white" aria-label="Back">
						<ChevronLeft size={30} strokeWidth={2.4} />
					</button>
				)}
				<AvatarCircle src={story?.avatar} label={story?.name} size={messenger ? 38 : 36} />
				<span className="min-w-0 flex-1">
					<span className="block truncate text-left text-[16.5px] font-semibold leading-[20px] text-white" dir="auto">
						{story?.name || 'Story'}
					</span>
					<span className="block text-[13.5px] leading-[17px] text-white/85">{story?.time || '2h'}</span>
				</span>
				<Ellipsis size={24} strokeWidth={2.4} />
				{messenger ? (
					<button type="button" tabIndex={-1} onClick={onClose} className="ms-[10px] grid cursor-pointer place-items-center border-0 bg-transparent p-0 text-white" aria-label="Close">
						<X size={28} strokeWidth={2.2} />
					</button>
				) : null}
			</div>
			{story?.caption ? (
				<p className="absolute inset-x-[20px] bottom-[120px] z-10 m-0 text-center text-[18px] font-medium leading-[24px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]" dir="auto">
					{story.caption}
				</p>
			) : null}
			<div className="absolute inset-x-0 bottom-0 z-10">
				{messenger ? (
					<div className="flex items-center gap-[12px] px-[14px] pb-[6px]">
						<span className="flex h-[44px] min-w-0 flex-1 items-center rounded-full border border-white/70 ps-[18px] text-[17px] text-white/90">
							Send message
						</span>
						<span className="text-[28px] leading-none">👍</span>
						<span className="text-[28px] leading-none">❤️</span>
						<span className="text-[28px] leading-none">😂</span>
					</div>
				) : (
					<div className="flex items-center gap-[10px] px-[14px] pb-[6px]">
						<span className="flex h-[44px] min-w-0 flex-1 items-center rounded-full bg-black/35 ps-[18px] text-[17px] text-white/85 ring-1 ring-white/30">
							Reply
						</span>
						<Heart size={28} strokeWidth={2} />
						<Send size={26} strokeWidth={2} />
					</div>
				)}
				<IosHomeIndicator className="!bg-transparent [&_span]:!bg-white" />
			</div>
		</div>
	);
}
