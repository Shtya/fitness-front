'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { mediaPreviewFromRaw, voiceDurationSecondsFromSource } from '../whatsapp-utils';
import { MediaAttachment } from './WaMessageMedia';
import { MORE_REACTIONS, QUICK_REACTIONS } from './WaMessageMenus';

function computeReactionPickerPosition(anchorRect, options = {}) {
	const gap = 8;
	const margin = 10;
	const width = options.width || 312;
	const height = options.height || 56;
	const mine = Boolean(options.mine);
	const viewportW =
		typeof window === 'undefined' ? 1280 : window.innerWidth || 1280;
	const viewportH =
		typeof window === 'undefined' ? 720 : window.innerHeight || 720;
	const rect = anchorRect || {
		top: margin,
		bottom: margin + 32,
		left: viewportW - width - margin,
		right: viewportW - margin,
		width: 32,
		height: 32,
	};
	const clampedWidth = Math.min(width, viewportW - margin * 2);
	const clampedHeight = Math.min(height, viewportH - margin * 2);
	const spaceBelow = viewportH - rect.bottom - margin;
	const spaceAbove = rect.top - margin;
	const openUp = spaceBelow < clampedHeight && spaceAbove > spaceBelow;
	let top = openUp ? rect.top - gap - clampedHeight : rect.bottom + gap;
	top = Math.max(margin, Math.min(top, viewportH - clampedHeight - margin));
	let left = mine ? rect.right - clampedWidth : rect.left;
	left = Math.max(margin, Math.min(left, viewportW - clampedWidth - margin));
	return { top, left, width: clampedWidth, placement: openUp ? 'top' : 'bottom' };
}

export function MessageAttachments({
	attachments,
	mine,
	labels,
	onImageReady,
	onOpenImage,
	onOpenDocument,
	sessionReady = true,
	messageRaw = null,
	message = null,
	selectMode = false,
	selectedAttachmentIds = null,
	onToggleAttachmentSelect = null,
	hideFileActions = false,
	avatarLabel = '?',
	avatarSrc = '',
	onTranscribe = null,
	onSendAsVoice = null,
	onSaveToLibrary = null,
	sendAsVoiceLabel = '',
	sendingAsVoice = false,
}) {
	const rawPreview = mediaPreviewFromRaw(messageRaw);
	const voiceDuration = voiceDurationSecondsFromSource(message || { raw: messageRaw, attachments });
	const normalized = (Array.isArray(attachments) ? attachments : []).map(attachment => {
		const kind = String(attachment?.type || '').toLowerCase();
		if (!['image', 'sticker', 'video'].includes(kind)) return attachment;
		if (attachment?.previewDataUrl) return attachment;
		return rawPreview ? { ...attachment, previewDataUrl: rawPreview } : attachment;
	});
	const images = normalized.filter(attachment =>
		['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()),
	);
	const otherAttachments = normalized.filter(attachment =>
		!['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()),
	);
	const visibleImages = images.slice(0, 4);

	const tileClass = index => {
		if (visibleImages.length === 1) return 'wa-photo-tile-single';
		if (visibleImages.length === 3 && index === 0) return 'row-span-2';
		return '';
	};
	const gridClass =
		visibleImages.length === 1
			? 'grid-cols-1'
			: visibleImages.length === 3
				? 'grid-cols-2 grid-rows-2'
				: 'grid-cols-2';
	const galleryCountClass =
		visibleImages.length === 2
			? 'wa-media-gallery-2'
			: visibleImages.length > 2
				? 'wa-media-gallery-quad'
				: '';

	return (
		<>
			{images.length > 0 && (
				<div className={`wa-media-gallery ${mine ? 'wa-media-gallery-mine' : 'wa-media-gallery-other'} ${visibleImages.length === 1 ? 'wa-media-gallery-single' : ''} ${galleryCountClass} grid overflow-hidden rounded-none ${gridClass} gap-[2px]`}>
					{visibleImages.map((attachment, index) => (
						<div key={attachment.clientKey || attachment.id} className={`wa-photo-tile relative min-h-0 min-w-0 overflow-hidden ${tileClass(index)}`}>
							<MediaAttachment
								attachment={attachment}
								mine={mine}
								labels={labels}
								onImageReady={onImageReady}
								onOpenImage={onOpenImage}
								onOpenDocument={onOpenDocument}
								layout={visibleImages.length === 1 ? 'single' : 'gallery'}
								sessionReady={sessionReady}
								selectMode={selectMode}
								className={visibleImages.length === 1 ? '' : 'rounded-none'}
							/>
							{index === 3 && images.length > 4 && (
								<div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center bg-black/55 text-[2rem] font-semibold tracking-wide text-white">
									+{images.length - 4}
								</div>
							)}
						</div>
					))}
					{images.slice(4).map(attachment => (
						<div key={attachment.clientKey || attachment.id} className="hidden">
							<MediaAttachment
								attachment={attachment}
								mine={mine}
								labels={labels}
								onImageReady={onImageReady}
								onOpenImage={onOpenImage}
								onOpenDocument={onOpenDocument}
								sessionReady={sessionReady}
								selectMode={selectMode}
							/>
						</div>
					))}
				</div>
			)}
			{otherAttachments.map(attachment => (
				<MediaAttachment
					key={attachment.clientKey || attachment.id}
					attachment={attachment}
					mine={mine}
					labels={labels}
					onImageReady={onImageReady}
					onOpenImage={onOpenImage}
					onOpenDocument={onOpenDocument}
					sessionReady={sessionReady}
					selectMode={selectMode}
					selected={Boolean(selectedAttachmentIds?.has?.(String(attachment.id)))}
					onToggleSelect={onToggleAttachmentSelect}
					hideFileActions={hideFileActions}
					messageRaw={messageRaw}
					messageDurationSeconds={voiceDuration}
					messageId={message?.id || ''}
					messageStatus={message?.status || ''}
					avatarLabel={avatarLabel}
					avatarSrc={avatarSrc}
					onTranscribe={onTranscribe}
					onSendAsVoice={onSendAsVoice}
					onSaveToLibrary={onSaveToLibrary}
					sendAsVoiceLabel={sendAsVoiceLabel}
					sendingAsVoice={sendingAsVoice}
					sentAt={message?.sentAt || message?.createdAt || null}
				/>
			))}
		</>
	);
}

export function MessageReactionPicker({
	open,
	locale,
	mine,
	busy,
	anchorRect,
	activeEmoji,
	onReact,
	onClose,
}) {
	const [mounted, setMounted] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [pos, setPos] = useState(() => computeReactionPickerPosition(anchorRect, { mine }));
	const pickerRef = useRef(null);

	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) setExpanded(false);
	}, [open]);

	useLayoutEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const measured = pickerRef.current?.getBoundingClientRect();
			setPos(
				computeReactionPickerPosition(anchorRect, {
					mine,
					width: measured?.width || (expanded ? 300 : 312),
					height: measured?.height || (expanded ? 200 : 56),
				}),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRect, mine, expanded]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;
	if (!mounted || typeof document === 'undefined') return null;
	const ar = locale === 'ar';

	return createPortal(
		<>
			<button
				type="button"
				tabIndex={-1}
				aria-label={ar ? 'إغلاق التفاعل' : 'Close reactions'}
				onPointerDown={event => {
					event.preventDefault();
					event.stopPropagation();
					onClose();
				}}
				className="wa-reaction-picker-backdrop"
			/>
			<div
			ref={pickerRef}
			data-message-reaction-picker
			role="dialog"
			aria-label={ar ? 'تفاعل مع الرسالة' : 'React to message'}
			className={`wa-reaction-picker ${expanded ? 'is-expanded' : ''} ${mine ? 'is-outgoing' : 'is-incoming'}`}
			style={{ top: pos.top, left: pos.left }}
			onPointerDown={event => event.stopPropagation()}
		>
			<div className="wa-reaction-picker-row">
				{QUICK_REACTIONS.map(emoji => (
					<button
						key={emoji}
						type="button"
						disabled={busy}
						aria-pressed={activeEmoji === emoji}
						onClick={() => onReact(emoji)}
						className={`wa-reaction-picker-btn ${activeEmoji === emoji ? 'is-active' : ''}`}
					>
						<span className="wa-reaction-picker-emoji">{emoji}</span>
					</button>
				))}
				<button
					type="button"
					aria-label={ar ? 'المزيد من التفاعلات' : 'More reactions'}
					aria-expanded={expanded}
					onClick={() => setExpanded(current => !current)}
					className={`wa-reaction-picker-more ${expanded ? 'is-open' : ''}`}
				>
					{expanded ? <X size={16} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
				</button>
			</div>
			{expanded && (
				<div className="wa-reaction-picker-grid">
					{MORE_REACTIONS.map(emoji => (
						<button
							key={emoji}
							type="button"
							disabled={busy}
							aria-pressed={activeEmoji === emoji}
							onClick={() => onReact(emoji)}
							className={`wa-reaction-picker-btn ${activeEmoji === emoji ? 'is-active' : ''}`}
						>
							<span className="wa-reaction-picker-emoji">{emoji}</span>
						</button>
					))}
				</div>
			)}
		</div>
		</>,
		document.body,
	);
}
