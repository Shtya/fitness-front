'use client';

import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	Check, CheckCheck, File as FileIcon, Loader2, Mic, Pause, Play, Video, X,
} from 'lucide-react';

import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import {
	cls, dateLabel, formatDuration, isMessageRead, resolveUrl, timeHHMM,
} from './chatUtils';

export function ChatAvatar({ user, size = 40, online = false, raised = false, tone = 'surface', className = '' }) {
	const px = typeof size === 'number' ? size : 40;
	const ring = raised ? Math.max(3, Math.round(px * 0.09)) : 0;
	const src = user?.avatar || user?.image || user?.profileImage || null;
	const letter = String(user?.name || user?.email || '?').trim().charAt(0).toUpperCase() || '?';
	const onPrimary = tone === 'onPrimary';
	return (
		<div className={cls('relative shrink-0', className)} style={{ width: px + ring * 2, height: px + ring * 2 }}>
			<div
				className={cls(
					'grid h-full w-full place-items-center',
					raised && !onPrimary && 'rounded-full border border-white/85 bg-[#eef2f9] shadow-[4px_4px_8px_rgba(100,116,139,0.4)]',
					raised && onPrimary && 'rounded-full border-[1.3px] border-t-white/50 border-s-white/40 border-b-[rgba(15,48,120,0.4)] border-e-[rgba(15,48,120,0.3)] bg-white/15 shadow-[2px_3px_6px_rgba(15,23,42,0.4)]',
				)}
				style={{ padding: ring }}
			>
				<div
					className='relative grid h-full w-full place-items-center overflow-hidden rounded-full text-white'
					style={{
						fontSize: Math.round(px * 0.38),
						background: src ? undefined : 'linear-gradient(135deg, var(--color-primary-700), var(--color-primary-400))',
						boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
					}}
				>
					{src ? (
						<Img src={src} alt={user?.name || user?.email || ''} className='h-full w-full object-cover' showBlur={false} />
					) : (
						<>
							<span className='pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-t-full bg-white/25' />
							<span className='relative font-semibold tracking-[-0.5px]'>{letter}</span>
						</>
					)}
				</div>
			</div>
			{online ? (
				<span className='absolute bottom-px end-px rounded-full bg-emerald-400 ring-2 ring-white' style={{ width: Math.round(px * 0.28), height: Math.round(px * 0.28) }} />
			) : null}
		</div>
	);
}

export function UnreadBadge({ count }) {
	if (!count || count <= 0) return null;
	return (
		<span className='grid h-5 min-w-5 place-items-center rounded-full bg-(--color-primary-500) px-1.5 font-en text-[11px] font-semibold text-white tabular-nums shadow-[2px_3px_5px_rgba(37,99,235,0.4)]'>
			{count > 99 ? '99+' : count}
		</span>
	);
}

function ReadTicks({ mine, msg }) {
	if (!mine) return null;
	const read = isMessageRead(msg);
	return (
		<span className='inline-flex items-center gap-0.5'>
			{read ? <CheckCheck size={14} className='text-(--color-primary-500)' strokeWidth={2.5} /> : <Check size={14} className='text-slate-400' strokeWidth={2.5} />}
		</span>
	);
}

export function VoiceBubble({ url, duration = 0, mine = false }) {
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [dur, setDur] = useState(duration || 0);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return undefined;
		const onTime = () => {
			const d = audio.duration || dur || 0;
			setProgress(d ? audio.currentTime / d : 0);
		};
		const onMeta = () => {
			if (Number.isFinite(audio.duration)) setDur(audio.duration);
		};
		const onEnded = () => {
			setPlaying(false);
			setProgress(0);
		};
		audio.addEventListener('timeupdate', onTime);
		audio.addEventListener('loadedmetadata', onMeta);
		audio.addEventListener('ended', onEnded);
		return () => {
			audio.removeEventListener('timeupdate', onTime);
			audio.removeEventListener('loadedmetadata', onMeta);
			audio.removeEventListener('ended', onEnded);
		};
	}, [dur, url]);

	async function toggle() {
		const audio = audioRef.current;
		if (!audio || !url) return;
		if (playing) {
			audio.pause();
			setPlaying(false);
			return;
		}
		try {
			await audio.play();
			setPlaying(true);
		} catch {
			setPlaying(false);
		}
	}

	return (
		<div className={cls('flex min-w-[180px] max-w-[260px] items-center gap-2.5', mine ? 'text-(--color-primary-900)' : 'text-slate-700')}>
			<button
				type='button'
				onClick={toggle}
				aria-label={playing ? 'Pause' : 'Play'}
				className={cls(
					'grid size-9 shrink-0 place-items-center rounded-full transition active:scale-95',
					mine ? 'bg-(--color-primary-500) text-white' : 'text-white',
				)}
				style={mine ? undefined : { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
			>
				{playing ? <Pause className='size-4' /> : <Play className='ms-0.5 size-4' />}
			</button>
			<div className='min-w-0 flex-1'>
				<div className='flex h-5 items-end gap-px'>
					{Array.from({ length: 22 }).map((_, i) => {
						const barH = 4 + Math.abs(Math.sin(i * 0.75) * 10) + Math.abs(Math.cos(i * 1.2) * 4);
						const filled = i / 22 <= progress;
						return (
							<span
								key={i}
								className={cls('w-[3px] rounded-full', filled ? 'bg-(--color-primary-500)' : 'bg-slate-300')}
								style={{ height: `${Math.max(4, barH)}px` }}
							/>
						);
					})}
				</div>
				<div className={cls('mt-1 font-en text-[10px] font-medium tabular-nums', mine ? 'text-(--color-primary-700)' : 'text-slate-400')}>
					{formatDuration(playing ? progress * (dur || duration || 0) : dur || duration || 0)}
				</div>
			</div>
			<audio ref={audioRef} src={url} preload='metadata' />
		</div>
	);
}

function MessageContent({ m, mine, t }) {
	if (m.messageType === 'text' && m.content) {
		return <MultiLangText className='whitespace-pre-wrap break-words text-[15px] leading-relaxed'>{m.content}</MultiLangText>;
	}
	if (m.messageType === 'image' && Array.isArray(m.attachments)) {
		return (
			<div className={cls('grid gap-1.5', m.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
				{m.attachments.map((a, i) => {
					const href = resolveUrl(a.url);
					return (
						<a key={i} href={href} target='_blank' rel='noreferrer' className='block overflow-hidden rounded-xl transition-opacity hover:opacity-95'>
							{a.local || String(a.url || '').startsWith('blob:') ? (
								<img src={a.url} alt={a.name} className='h-40 w-full object-cover' />
							) : (
								<Img src={a.url} alt={a.name} className='h-40 w-full object-cover' showBlur={false} />
							)}
						</a>
					);
				})}
			</div>
		);
	}
	if (m.messageType === 'video' && Array.isArray(m.attachments)) {
		return (
			<div className='space-y-2'>
				{m.attachments.map((a, i) => (
					<video key={i} src={resolveUrl(a.url)} controls className='max-h-64 w-full overflow-hidden rounded-xl border border-white/20' />
				))}
			</div>
		);
	}
	if (m.messageType === 'voice' || (m.messageType === 'file' && /^audio\//.test(m.attachments?.[0]?.type || m.attachments?.[0]?.mimeType || ''))) {
		const att = Array.isArray(m.attachments) ? m.attachments[0] : null;
		const voiceUrl = resolveUrl(m.voiceUri || att?.url || '');
		if (!voiceUrl) return null;
		return <VoiceBubble url={voiceUrl} duration={m.voiceDuration || att?.duration || 0} mine={mine} />;
	}
	if (m.messageType === 'file' && Array.isArray(m.attachments)) {
		return (
			<div className='space-y-2'>
				{m.attachments.map((a, i) => (
					<a
						key={i}
						href={resolveUrl(a.url)}
						target='_blank'
						rel='noreferrer'
						className={cls(
							'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
							mine ? 'border-(--color-primary-200) bg-(--color-primary-50) text-(--color-primary-900)' : 'border-slate-200 bg-white text-slate-800',
						)}
					>
						<FileIcon className='size-4 shrink-0 text-(--color-primary-600)' />
						<span className='min-w-0 flex-1 truncate text-sm font-medium'>{a.name}</span>
						<span className='font-en text-[10px] tabular-nums text-slate-400'>
							{a.size ? `${Math.round(a.size / 1024)} KB` : ''}
						</span>
					</a>
				))}
			</div>
		);
	}
	return null;
}

export const MessageList = memo(function MessageList({ msgs, me, endRef, t, locale, typing, onContentReady }) {
	const groups = [];
	let lastDate = '';
	msgs.forEach(m => {
		const d = new Date(m.created_at).toDateString();
		if (d !== lastDate) {
			groups.push({ type: 'sep', label: dateLabel(m.created_at, t, locale), id: `sep-${m.created_at}` });
			lastDate = d;
		}
		groups.push({ type: 'msg', data: m });
	});

	useLayoutEffect(() => {
		onContentReady?.();
	}, [msgs.length, typing, onContentReady]);

	return (
		<div className='flex min-h-full flex-col justify-end gap-1'>
			{groups.map(item => {
				if (item.type === 'sep') {
					return (
						<div key={item.id} className='py-3'>
							<span className='mx-auto block w-fit rounded-full border border-white/80 bg-[#eef2f9] px-3.5 py-1 text-[11px] font-semibold text-(--color-primary-600) shadow-[3px_3px_8px_rgba(100,116,139,0.22)]'>
								{item.label}
							</span>
						</div>
					);
				}
				const m = item.data;
				const mine = (m?.sender?.id ?? m?.senderId) === me?.id;
				const other = m?.sender || m?.from || m?.user || {};
				const pending = !!m.pending;
				return (
					<div key={m.id || m.tempId} className={cls('flex items-start gap-1.5 px-1', mine ? 'justify-end' : 'justify-start', pending && 'opacity-70')}>
						{!mine && <ChatAvatar user={other} size={26} raised className='mt-0.5' />}
						<div
							className={cls(
								'max-w-[76%] border border-white/80 px-3 py-2 shadow-[3px_4px_10px_rgba(100,116,139,0.22)]',
								mine
									? 'rounded-2xl bg-(--color-primary-100) text-(--color-primary-900) ltr:rounded-tr-sm rtl:rounded-tl-sm'
									: 'rounded-2xl bg-[#eef2f9] text-slate-800 ltr:rounded-tl-sm rtl:rounded-tr-sm',
							)}
						>
							<MessageContent m={m} mine={mine} t={t} />
							<div className={cls('mt-1 flex items-center justify-end gap-1 font-en text-[10px] font-medium tabular-nums', mine ? 'text-(--color-primary-600)' : 'text-slate-400')}>
								{pending && <Loader2 className='size-3 animate-spin opacity-80' />}
								<span>{timeHHMM(m.created_at, locale)}</span>
								{!pending && <ReadTicks mine={mine} msg={m} />}
							</div>
						</div>
					</div>
				);
			})}

			{typing && (
				<div className='flex items-end justify-start gap-1.5 px-1'>
					<div className='grid size-[26px] place-items-center rounded-full border border-white/80 bg-[#eef2f9] text-(--color-primary-600) shadow-[2px_2px_6px_rgba(100,116,139,0.22)]'>
						<span className='text-[10px] font-black'>…</span>
					</div>
					<div className='rounded-2xl border border-white/80 bg-[#eef2f9] px-3.5 py-3 shadow-[3px_4px_10px_rgba(100,116,139,0.22)] ltr:rounded-tl-sm rtl:rounded-tr-sm'>
						<div className='flex h-3.5 items-center gap-1'>
							{[0, 150, 300].map(delay => (
								<span key={delay} className='size-1.5 animate-bounce rounded-full bg-(--color-primary-500)' style={{ animationDelay: `${delay}ms` }} />
							))}
						</div>
					</div>
				</div>
			)}
			<div ref={endRef} className='h-px w-full shrink-0' />
		</div>
	);
});

export function MessageSkeleton() {
	return (
		<div className='flex min-h-full flex-col justify-end gap-3'>
			{Array.from({ length: 6 }).map((_, i) => {
				const mine = i % 2 === 1;
				return (
					<div key={i} className={cls('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
						{!mine && <span className='gm-skel size-8 rounded-full!' />}
						<span className={cls('gm-skel h-14 rounded-2xl!', mine ? 'w-48' : 'w-56')} />
					</div>
				);
			})}
		</div>
	);
}

export function AttachPreview({ attaches, onRemove, t }) {
	if (!attaches?.length) return null;
	return (
		<div className='flex gap-2 overflow-x-auto px-0.5 pb-3'>
			{attaches.map((a, idx) => (
				<div key={idx} className='relative shrink-0'>
					{/^\s*image\//.test(a.type) ? (
						<img src={a.url} alt={a.name} className='size-16 rounded-[12px] border border-(--gm-line) object-cover shadow-sm' />
					) : (
						<div className='grid h-16 w-24 place-items-center rounded-[12px] border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--gm-paper) 80%, transparent)' }}>
							{/^\s*video\//.test(a.type) ? <Video className='size-5 gm-muted' /> : /^\s*audio\//.test(a.type) ? <Mic className='size-5 gm-muted' /> : <FileIcon className='size-5 gm-muted' />}
						</div>
					)}
					<button
						type='button'
						onClick={() => onRemove(idx)}
						aria-label={t('composer.remove')}
						title={t('composer.remove')}
						className='absolute -top-1.5 grid size-6 place-items-center rounded-full bg-(--gm-ink) text-white shadow-md transition hover:bg-(--gm-danger) active:scale-95 ltr:-right-1.5 rtl:-left-1.5'
					>
						<X className='size-3' strokeWidth={2.5} />
					</button>
				</div>
			))}
		</div>
	);
}
