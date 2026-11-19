'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Check, Download, Image as ImageIcon, ImageOff, Loader2, Expand, MessageCircle, Mic, RefreshCw, User, Video } from 'lucide-react';
import api from '@/utils/axios';
import { mediaPreviewFromRaw, normalizeWhatsAppIdentity, voiceDurationSecondsFromSource, isLocalMediaUrl, localMediaFileUrl, isPlayableVideoUrl, mediaDimensionsForAttachment, rememberMediaDimensions, reservedMediaBoxStyle, isPortraitMediaDims } from '../whatsapp-utils';
import { downloadContactVcard, extractRawVcardFromMessage, parseContactFromMessage } from '../whatsapp-contact';
import { WhatsAppFileTypeIcon } from '../whatsapp-file-icons';
import { demoApi } from '../demo/demo-api';
import { toMediaFile } from '../wa-save-file';
import { saveMediaFiles } from '../wa-save-prompt';
import { getAttachmentStreamUrl, absoluteApiUrl, peekAttachmentStreamUrl } from '../whatsapp-media-stream';
import { isDemoId, rawDemoId } from '../demo/demo-read-model';
import { forgetAttachmentBlob, isPersistedAttachmentId, requestAttachmentBlob } from './wa-attachment-blobs';
import { VoiceMessage, useNearViewport } from './WaVoiceMessage';
import { retainShownImage, wasImageShown } from './wa-image-memory';
import { ChatVideoPlayer } from './WaVideoPlayer';

function localAttachmentPreview(attachment) {
	return localMediaFileUrl(attachment);
}

export function ImageMessage({
	url,
	alt,
	onOpen,
	className = '',
	previewUrl = null,
	loading = false,
	unavailable = false,
	cover = true,
	selectMode = false,
	retryLabel = 'Tap to retry',
	loadingLabel = 'Loading media…',
	mediaWidth = 0,
	mediaHeight = 0,
	cacheKey = '',
	onFullError = null,
}) {
	// A photo already shown this session is held in memory (wa-image-memory): show it at once.
	const [loaded, setLoaded] = useState(() => wasImageShown(url));
	const [broken, setBroken] = useState(false);
	const [previewReady, setPreviewReady] = useState(false);
	// True once the picture has finished fading in; until then the skeleton stays underneath so
	// the fade starts from the skeleton, not from an empty bubble.
	const [settled, setSettled] = useState(() => wasImageShown(url));
	const fullImgRef = useRef(null);
	const previewImgRef = useRef(null);

	const bindFullImg = node => {
		fullImgRef.current = node;
		// Already in the browser's cache (seen before): show it at once, no fade, no skeleton.
		if (node?.complete && node.naturalWidth > 0) {
			setLoaded(true);
			setSettled(true);
			retainShownImage(node.currentSrc || node.src);
		}
	};

	const bindPreviewImg = node => {
		previewImgRef.current = node;
		if (node?.complete && node.naturalWidth > 0) {
			setPreviewReady(true);
		}
	};

	useEffect(() => {
		const img = fullImgRef.current;
		const ready = Boolean(img?.complete && img.naturalWidth > 0) || wasImageShown(url);
		setLoaded(ready);
		setSettled(ready);
		setBroken(false);
	}, [url]);

	useEffect(() => {
		setPreviewReady(false);
	}, [previewUrl]);

	useEffect(() => {
		const img = fullImgRef.current;
		if (!img || !url) return;
		if (img.complete && img.naturalWidth > 0) {
			setLoaded(true);
		}
	}, [url]);

	useEffect(() => {
		const img = previewImgRef.current;
		if (!img || !previewUrl) return;
		if (img.complete && img.naturalWidth > 0) {
			setPreviewReady(true);
		}
	}, [previewUrl]);

	const previewSrc = previewUrl || null;
	const hasFull = Boolean(url) && !broken;
	const isBroken = Boolean(broken || (unavailable && !hasFull));
	const isPending =
		!isBroken &&
		(loading || (Boolean(url) && !loaded && !broken) || (!url && Boolean(previewSrc || loading)));
	const isSticker = String(className).includes('wa-sticker-asset');
	const reserveAspect = !cover && !isSticker;
	const knownWidth = Number(mediaWidth) || 0;
	const knownHeight = Number(mediaHeight) || 0;
	const reservedRatio =
		knownWidth > 0 && knownHeight > 0 ? `${Math.round(knownWidth)} / ${Math.round(knownHeight)}` : '4 / 5';
	const boxStyle = reserveAspect
		? { aspectRatio: reservedRatio, '--wa-media-ar': reservedRatio }
		: undefined;
	const rememberNaturalSize = node => {
		const width = Number(node?.naturalWidth) || 0;
		const height = Number(node?.naturalHeight) || 0;
		if (cacheKey && width > 0 && height > 0) {
			rememberMediaDimensions(cacheKey, width, height);
		}
	};
	const showFrame = reserveAspect && (isPending || isBroken) && !url && !previewSrc;
	// The skeleton holds the exact final box until the decoded picture fades in; the heavier
	// "Loading media…" overlay only shows when that takes long (slow network, CSS delay).
	const showSkeleton = !isBroken && !previewReady && !settled && (isPending || loaded || Boolean(previewSrc));
	const showBlockingLoad = isPending && !previewReady;
	const showSpinnerOnly = isPending && previewReady;
	const fitClass = cover
		? 'absolute inset-0 z-[1] h-full w-full object-cover'
		: reserveAspect
			? 'wa-photo-main absolute inset-0 z-[1] h-full w-full object-contain'
			: 'wa-photo-main relative z-[1] block h-auto w-full max-w-full';

	return (
		<button
			type="button"
			data-wa-press-surface
			aria-label={isBroken ? retryLabel : alt || 'Open image preview'}
			aria-busy={isPending}
			onClick={event => {
				if (selectMode) {
					// Keep bubbling so the message row can toggle selection (images included).
					return;
				}
				onOpen?.(event);
			}}
			disabled={selectMode && isBroken && !previewSrc}
			style={boxStyle}
			className={`wa-photo-open relative block overflow-hidden ${
				cover
					? 'h-full min-h-0 w-full'
					: reserveAspect
						? 'wa-photo-reserved h-auto w-full max-w-full'
						: showFrame
							? 'wa-photo-frame'
							: 'h-auto w-full max-w-full'
			} ${isPending ? 'is-loading' : isBroken ? 'is-unavailable' : 'is-ready'} ${
				previewSrc ? 'wa-photo-has-preview' : 'wa-photo-no-preview'
			} ${selectMode ? 'wa-photo-select-mode' : ''} ${className}`}
		>
			{showFrame ? <span className="wa-photo-sizer" aria-hidden="true" /> : null}
			{showSkeleton ? <span className="wa-photo-skeleton" aria-hidden="true" /> : null}
			{previewSrc ? (
				<img
					ref={bindPreviewImg}
					src={previewSrc}
					alt=""
					aria-hidden="true"
					draggable={false}
					onLoad={event => {
						setPreviewReady(true);
						rememberNaturalSize(event.currentTarget);
					}}
					className={`wa-photo-placeholder ${
						cover
							? 'absolute inset-0 h-full w-full object-cover'
							: 'absolute inset-0 z-0 h-full w-full object-contain'
					} ${loaded && !broken ? 'is-faded' : isBroken ? 'is-failed-preview' : 'is-visible'}`}
				/>
			) : null}
			{isBroken ? (
				<div
					className={`wa-photo-state ${
						cover ? 'absolute inset-0' : 'absolute inset-0'
					}`}
				>
					<span className="wa-photo-state__icon" aria-hidden="true">
						<ImageOff size={28} strokeWidth={1.75} />
					</span>
					<span className="wa-photo-state__action" aria-hidden="true">
						<RefreshCw size={18} strokeWidth={2.4} />
					</span>
					<span className="wa-photo-state__label">{retryLabel}</span>
				</div>
			) : url ? (
				<img
					ref={bindFullImg}
					src={url}
					alt={alt}
					draggable={false}
					// Keeps full-resolution decode off the main thread during scroll.
					decoding="async"
					// Eager: rows only exist near the viewport (virtualised thread) and the URL is only set
					// once near it. loading="lazy" made a photo that was already shown start from
					// scratch each time its row mounted again (not complete in the first frame), so it
					// went skeleton → fade on every scroll back.
					loading="eager"
					width={knownWidth > 0 ? Math.round(knownWidth) : undefined}
					height={knownHeight > 0 ? Math.round(knownHeight) : undefined}
					onLoad={event => {
						const node = event.currentTarget;
						rememberNaturalSize(node);
						setBroken(false);
						// Reveal only once decoded, so the picture appears in one step (never half-drawn
						// or blank for a frame while decoding="async" finishes).
						const reveal = () => {
							if (fullImgRef.current !== node) return;
							retainShownImage(node.currentSrc || node.src);
							setLoaded(true);
							// After the 180ms fade (also when transitions are off: reduced motion).
							window.setTimeout(() => {
								if (fullImgRef.current === node) setSettled(true);
							}, 220);
						};
						if (typeof node.decode === 'function') node.decode().then(reveal, reveal);
						else reveal();
					}}
					onError={() => {
						setBroken(true);
						setLoaded(false);
						onFullError?.();
					}}
					className={`${fitClass} wa-photo-full ${loaded ? 'is-loaded' : 'is-pending'}`}
				/>
			) : null}
			{showBlockingLoad ? (
				<div className="wa-photo-state is-loading-state is-delayed" aria-hidden="true">
					<span className="wa-photo-state__icon wa-photo-state__icon--muted">
						<ImageIcon size={28} strokeWidth={1.75} />
					</span>
					<span className="wa-photo-download__ring">
						<Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
					</span>
					<span className="wa-photo-state__label wa-photo-state__label--soft">{loadingLabel}</span>
				</div>
			) : null}
			{showSpinnerOnly ? (
				<div className="wa-photo-state is-loading-state is-loading-preview" aria-hidden="true">
					<span className="wa-photo-download__ring">
						<Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
					</span>
				</div>
			) : null}
			{!isBroken && onOpen && !isPending && hasFull && loaded ? (
				<span className="wa-photo-open-hint" aria-hidden="true">
					<Expand size={15} strokeWidth={2.4} />
				</span>
			) : null}
		</button>
	);
}

export function ContactMessageCard({
	message,
	locale = 'en',
	accountId = null,
	conversations = [],
	onOpenConversation = null,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const [opening, setOpening] = useState(false);
	const contact = useMemo(() => parseContactFromMessage(message), [message]);
	const displayName =
		String(contact?.displayName || '').trim() || (ar ? 'جهة اتصال' : 'Contact');
	const phones = Array.isArray(contact?.phones) ? contact.phones : [];
	// Cards for numbers WhatsApp could not match carry no waid; an international number still opens a chat.
	const fallbackPhone = String(phones[0]?.phone || '').trim();
	const fallbackDigits = /^(\+|00)/.test(fallbackPhone)
		? fallbackPhone.replace(/\D/g, '').replace(/^00/, '')
		: '';
	const primaryWaId =
		String(
			contact?.waId || phones[0]?.waId || (fallbackDigits.length >= 7 ? `${fallbackDigits}@c.us` : ''),
		).trim() || null;
	const rawVcard = useMemo(() => extractRawVcardFromMessage(message), [message]);

	const openMessageChat = async event => {
		event.preventDefault();
		event.stopPropagation();
		if (!primaryWaId || !accountId || opening) return;
		setOpening(true);
		try {
			let target =
				conversations.find(item => {
					const identities = [
						item?.providerChatId,
						item?.contact?.waId,
						item?.contact?.phoneNumber,
					];
					return identities.some(
						identity =>
							normalizeWhatsAppIdentity(identity) ===
							normalizeWhatsAppIdentity(primaryWaId),
					);
				}) || null;
			if (!target) {
				const { data } = await api.post(
					`/whatsapp/accounts/${accountId}/conversations/open`,
					{
						chatId: primaryWaId,
						title: displayName,
					},
				);
				target = data;
			}
			if (target?.id && typeof onOpenConversation === 'function') {
				onOpenConversation(target.id, target);
			}
		} catch (error) {
			toast.error(
				error?.response?.data?.message ||
					error?.message ||
					(ar ? 'تعذر فتح المحادثة' : 'Could not open chat'),
			);
		} finally {
			setOpening(false);
		}
	};

	const saveContact = event => {
		event.preventDefault();
		event.stopPropagation();
		if (!contact) return;
		const payload = rawVcard ? { ...contact, __rawVcard: rawVcard } : contact;
		downloadContactVcard(payload)
			.then(result => {
				if (result.status === 'downloaded') {
					toast.success(ar ? 'تم تنزيل جهة الاتصال' : 'Contact saved');
				}
			})
			.catch(() => toast.error(ar ? 'تعذر حفظ جهة الاتصال' : 'Could not save contact'));
	};

	return (
		<div className="wa-contact-card" onPointerDown={event => event.stopPropagation()}>
			<div className="wa-contact-card-head">
				<span className="wa-contact-avatar" aria-hidden="true">
					<User size={22} strokeWidth={2} />
				</span>
				<div className="wa-contact-copy" dir="auto">
					<p className="wa-contact-name">{displayName}</p>
					{phones.length ? (
						<ul className="wa-contact-phones">
							{phones.map((phone, index) => (
								<li key={`${phone.waId || phone.phone || index}`} className="wa-contact-phone">
									{phone.label ? (
										<span className="wa-contact-phone-label">{phone.label}</span>
									) : null}
									<span dir="ltr" className="wa-contact-phone-value">
										{phone.formatted || phone.phone}
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className="wa-contact-sub">{ar ? 'بطاقة جهة اتصال' : 'Contact card'}</p>
					)}
				</div>
			</div>
			<div className="wa-contact-actions">
				<button
					type="button"
					className="wa-contact-action"
					onClick={openMessageChat}
					disabled={!primaryWaId || opening || !accountId}
				>
					{opening ? (
						<Loader2 size={14} className="animate-spin" />
					) : (
						<MessageCircle size={14} />
					)}
					<span>{ar ? 'مراسلة' : 'Message'}</span>
				</button>
				<button
					type="button"
					className="wa-contact-action"
					onClick={saveContact}
					disabled={!contact}
				>
					<Download size={14} />
					<span>{ar ? 'حفظ' : 'Save contact'}</span>
				</button>
			</div>
		</div>
	);
}

/**
 * Large videos play through a signed URL, but Save used to re-download them with
 * axios XHR — Chrome aborts that mid-transfer the same way it did for stories.
 * Native fetch against the signed URL (token in the query) is what the player already trusts.
 */
async function fetchBlobFromSignedAttachment(attachmentId, hint = null, { timeout = 180_000 } = {}) {
	const streamUrl = await getAttachmentStreamUrl(attachmentId, hint);
	const controller = typeof AbortController === 'function' ? new AbortController() : null;
	const timer =
		controller && timeout > 0
			? window.setTimeout(() => controller.abort(), timeout)
			: 0;
	try {
		const response = await fetch(streamUrl, {
			mode: 'cors',
			credentials: 'omit',
			signal: controller?.signal,
		});
		if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
		const blob = await response.blob();
		if (!blob?.size) throw new Error('Media unavailable');
		const headerType = String(response.headers.get('content-type') || '')
			.split(';')[0]
			.trim()
			.toLowerCase();
		const blobType = String(blob.type || '')
			.split(';')[0]
			.trim()
			.toLowerCase();
		if (
			(!blobType || blobType === 'application/octet-stream') &&
			(headerType.startsWith('image/') ||
				headerType.startsWith('video/') ||
				headerType.startsWith('audio/'))
		) {
			return new Blob([blob], { type: headerType });
		}
		return blob;
	} finally {
		if (timer) window.clearTimeout(timer);
	}
}

async function assertBlobMatchesKind(blob, kind, { fileSizeBytes = null } = {}) {
	const type = String(kind || '').toLowerCase();
	if (!blob) return blob;
	if (type === 'video') {
		const mime = String(blob.type || '')
			.split(';')[0]
			.trim()
			.toLowerCase();
		if (mime.startsWith('image/')) {
			throw new Error('Video is still a thumbnail');
		}
		const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
		if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
			throw new Error('Video is still a thumbnail');
		}
		return blob;
	}
	if (type === 'image') {
		const expected = Number(fileSizeBytes) || 0;
		if (blob.size > 0 && blob.size < 3_500) {
			throw new Error('Image is still a thumbnail');
		}
		if (expected > 40_000 && blob.size < Math.max(12_000, expected * 0.12)) {
			throw new Error('Image is still a thumbnail');
		}
	}
	return blob;
}

function durationFromFileName(fileName) {
	const match = String(fileName || '').match(/voice-(\d+(?:\.\d+)?)s/i);
	if (!match) return 0;
	const value = Number(match[1]);
	return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatAttachmentSize(value) {
	const bytes = Number(value);
	if (!Number.isFinite(bytes) || bytes <= 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
	if (bytes < 1024 ** 3) {
		return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
	}
	return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function attachmentExtension(fileName, mimeType) {
	const parts = String(fileName || '')
		.split('.')
		.map(part => part.trim())
		.filter(Boolean);
	if (parts.length) {
		const last = parts[parts.length - 1];
		if (last.length <= 5) return last.toUpperCase();
		const previous = parts.length > 1 ? parts[parts.length - 2] : '';
		if (previous && previous.length <= 5) return previous.toUpperCase();
		return last.slice(0, 4).toUpperCase();
	}
	const subtype = String(mimeType || '').split('/')[1]?.split(/[;+]/)[0] || '';
	if (!subtype || subtype === 'octet-stream') return 'FILE';
	return subtype.slice(0, 4).toUpperCase();
}

/**
 * A photo/video URL the browser can show right now: an already signed stream URL from the
 * session cache. Rows that mount again (virtualised thread, older pages) paint the picture in
 * their first frame with this, instead of "Loading media…" and then the picture.
 */
function cachedMediaUrl(attachment) {
	const type = String(attachment?.type || '').toLowerCase();
	if (!['image', 'sticker', 'video'].includes(type)) return null;
	const id = String(attachment?.id || '');
	if (!isPersistedAttachmentId(id) || attachment?.demoAttachment || isDemoId(id)) return null;
	return peekAttachmentStreamUrl(id, attachment);
}

export function MediaAttachment({
	attachment,
	mine,
	labels,
	onImageReady,
	onOpenImage,
	onOpenDocument,
	className = '',
	layout = 'inline',
	sessionReady = true,
	messageRaw = null,
	messageDurationSeconds = 0,
	messageId = '',
	messageStatus = '',
	selectMode = false,
	selected = false,
	onToggleSelect = null,
	hideFileActions = false,
	avatarLabel = '?',
	avatarSrc = '',
	onTranscribe = null,
	onSendAsVoice = null,
	onSaveToLibrary = null,
	sendAsVoiceLabel = '',
	sendingAsVoice = false,
	sentAt = null,
}) {
	const locale = useLocale();
	const initialLocalPreview = localAttachmentPreview(attachment);
	const [url, setUrl] = useState(() => initialLocalPreview || cachedMediaUrl(attachment));
	const [loading, setLoading] = useState(() => !(initialLocalPreview || cachedMediaUrl(attachment)));
	const urlRef = useRef(url);
	urlRef.current = url;
	const [failed, setFailed] = useState(false);
	const [fileAction, setFileAction] = useState('');
	const [retryNonce, setRetryNonce] = useState(0);
	const containerRef = useRef(null);
	const wasSessionReadyRef = useRef(sessionReady);
	const autoRetryCountRef = useRef(0);
	const loadGenRef = useRef(0);
	const type = String(attachment?.type || '').toLowerCase();
	const isNearViewport = useNearViewport(
		containerRef,
		type === 'video' ? { rootMargin: '1200px' } : { rootMargin: '900px' },
	);
	const isVoice = type === 'audio' || type === 'ptt' || type === 'voice';
	const isDocument = !['image', 'sticker', 'video', 'audio', 'ptt', 'voice'].includes(type);
	const demoAttachment = Boolean(attachment?.demoAttachment || isDemoId(attachment?.id));
	const localPreview = localAttachmentPreview(attachment);
	const inlinePreview =
		isLocalMediaUrl(attachment?.previewDataUrl) ? attachment.previewDataUrl : null;
	const previewDataUrl =
		inlinePreview ||
		(type === 'image' || type === 'sticker' || type === 'video' ? localPreview : null) ||
		(['image', 'sticker', 'video'].includes(type)
			? mediaPreviewFromRaw(messageRaw)
			: null);
	const isGallery = layout === 'gallery';
	const isSingleMedia = layout === 'single';
	const alreadyOnDisk =
		String(attachment?.downloadStatus || '').toLowerCase() === 'downloaded';
	const canFetchWithoutSession = demoAttachment || alreadyOnDisk;
	const downloadStatus = String(attachment?.downloadStatus || '').toLowerCase();
	const attachmentIdStr = String(attachment?.id || '');
	const isPendingAttachment =
		attachmentIdStr.startsWith('pending-att:') || attachmentIdStr.startsWith('pending:');
	const mediaDims = mediaDimensionsForAttachment(attachment, messageRaw);
	const mediaBoxStyle = reservedMediaBoxStyle(
		mediaDims,
		type === 'video' ? '16 / 9' : '4 / 5',
	);
	const reservedPortrait = isPortraitMediaDims(mediaDims);

	const loadAttachmentBlob = useCallback(async () => {
		// Outgoing optimistic media already has the file as a blob/data URL.
		const localUrl = localAttachmentPreview(attachment);
		if (localUrl) {
			const response = await fetch(localUrl);
			if (!response.ok) throw new Error(`Local media fetch failed (${response.status})`);
			return response.blob();
		}
		const attachmentId = String(attachment?.id || '');
		if (demoAttachment && attachmentId) return demoApi.getMedia(rawDemoId(attachmentId));
		if (
			attachmentId.startsWith('pending-att:') ||
			attachmentId.startsWith('pending:') ||
			!isPersistedAttachmentId(attachmentId)
		) {
			if (attachment?.url) {
				const href = absoluteApiUrl(attachment.url) || attachment.url;
				const response = await fetch(href, {
					mode: 'cors',
					credentials: 'omit',
					headers: (() => {
						const token =
							typeof window !== 'undefined'
								? window.localStorage?.getItem('accessToken')
								: null;
						return token ? { Authorization: `Bearer ${token}` } : undefined;
					})(),
				});
				if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
				return response.blob();
			}
			throw new Error('Attachment is unavailable');
		}
		if (attachment?.id) {
			if (demoAttachment) return demoApi.getMedia(rawDemoId(attachment.id));
			const kind = String(attachment?.type || '').toLowerCase();
			const isHeavyMedia = kind === 'video';
			if (isHeavyMedia) {
				try {
					const streamed = await fetchBlobFromSignedAttachment(attachment.id, attachment, {
						timeout: 180_000,
					});
					return assertBlobMatchesKind(streamed, kind, {
						fileSizeBytes: attachment?.fileSizeBytes,
					});
				} catch {
					/* fall through to the authenticated content path */
				}
			}
			try {
				const blob = await requestAttachmentBlob(attachment.id, {
					timeout: isHeavyMedia ? 180_000 : 45_000,
					priority: true,
					kind,
				});
				return assertBlobMatchesKind(blob, kind, {
					fileSizeBytes: attachment?.fileSizeBytes,
				});
			} catch (firstError) {
				// Short retry — media often fails while WA is still hydrating.
				await new Promise(resolve => window.setTimeout(resolve, 500));
				try {
					forgetAttachmentBlob(String(attachment.id || ''));
					if (isHeavyMedia) {
						try {
							const streamed = await fetchBlobFromSignedAttachment(
								attachment.id,
								attachment,
								{ timeout: 180_000 },
							);
							return assertBlobMatchesKind(streamed, kind, {
								fileSizeBytes: attachment?.fileSizeBytes,
							});
						} catch {
							/* keep going to axios retry */
						}
					}
					const blob = await requestAttachmentBlob(attachment.id, {
						timeout: isHeavyMedia ? 180_000 : 60_000,
						priority: true,
						kind,
					});
					return assertBlobMatchesKind(blob, kind, {
						fileSizeBytes: attachment?.fileSizeBytes,
					});
				} catch {
					throw firstError;
				}
			}
		}
		if (attachment?.url) {
			const href = absoluteApiUrl(attachment.url) || attachment.url;
			const token =
				typeof window !== 'undefined' ? window.localStorage?.getItem('accessToken') : null;
			const response = await fetch(href, {
				mode: 'cors',
				credentials: 'omit',
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			});
			if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
			return response.blob();
		}
		throw new Error('Attachment is unavailable');
	}, [attachment, demoAttachment]);

	useEffect(() => {
		autoRetryCountRef.current = 0;
		const local = localMediaFileUrl(attachment);
		if (local) {
			setUrl(local);
			setFailed(false);
			setLoading(false);
			return;
		}
		const cached = cachedMediaUrl(attachment);
		setUrl(cached);
		setFailed(false);
		setLoading(!cached);
		// Only reset when the attachment id changes — url/downloadStatus churn from
		// live sync used to cancel in-flight video fetches and leave "Loading media…".
		// eslint-disable-next-line react-hooks/exhaustive-deps -- identity only
	}, [attachment?.id]);

	useEffect(() => {
		if (sessionReady && !wasSessionReadyRef.current) {
			autoRetryCountRef.current = 0;
			setFailed(false);
			setRetryNonce(value => value + 1);
		}
		wasSessionReadyRef.current = sessionReady;
	}, [sessionReady]);

	useEffect(() => {
		const attachmentId = String(attachment?.id || '');
		if (!attachmentId) return undefined;
		const onReady = event => {
			const readyId = String(event?.detail?.attachmentId || '');
			if (readyId !== attachmentId) return;
			forgetAttachmentBlob(attachmentId);
			autoRetryCountRef.current = 0;
			setFailed(false);
			setLoading(true);
			setRetryNonce(value => value + 1);
		};
		window.addEventListener('wa-attachment-ready', onReady);
		return () => window.removeEventListener('wa-attachment-ready', onReady);
	}, [attachment?.id]);

	useEffect(() => {
		if (!failed || !sessionReady || !isNearViewport) return undefined;
		if (autoRetryCountRef.current >= 4) return undefined;
		const timer = window.setTimeout(() => {
			autoRetryCountRef.current += 1;
			forgetAttachmentBlob(String(attachment?.id || ''));
			setFailed(false);
			setRetryNonce(value => value + 1);
		}, 900 * Math.max(1, autoRetryCountRef.current + 1));
		return () => window.clearTimeout(timer);
	}, [failed, sessionReady, isNearViewport, attachment?.id]);

	useEffect(() => {
		let cancelled = false;
		let objectUrl = null;
		const loadGen = ++loadGenRef.current;
		if (isVoice || isDocument) {
			setLoading(false);
			return undefined;
		}
		const attachmentId = String(attachment?.id || '');
		if (attachmentId.startsWith('live:') || attachmentId.startsWith('live-att:')) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		const localUrl = localMediaFileUrl(attachment);
		// Sender already has the file — show it immediately, never hit the API for pending-att.
		if (localUrl && (isPendingAttachment || !isPersistedAttachmentId(attachmentId))) {
			setUrl(localUrl);
			setLoading(false);
			setFailed(false);
			return undefined;
		}
		if (!attachment?.id && !attachment?.url) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		if (!isNearViewport) {
			if (
				!localUrl &&
				!urlRef.current &&
				sessionReady &&
				isPersistedAttachmentId(attachmentId) &&
				(demoAttachment || canFetchWithoutSession || downloadStatus !== 'failed')
			) {
				setLoading(true);
			}
			return undefined;
		}
		// Our own sent media: the local file is already on screen and is the same picture the
		// server stores. Re-reading it (new object URL) or swapping to the server copy changed
		// the <img> src after the send was confirmed, which is what flashed the bubble.
		if (localUrl) {
			setUrl(current => (current === localUrl ? current : localUrl));
			setFailed(false);
			setLoading(false);
			if (['image', 'sticker', 'video'].includes(type)) return undefined;
		}
		// Cached media streams offline; pending media needs a linked WhatsApp session.
		if (!sessionReady && !canFetchWithoutSession && !localUrl) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		// No durable server id yet and no local file — nothing to fetch.
		if (!isPersistedAttachmentId(attachmentId) && !demoAttachment && !localUrl) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		// Already showing a URL (cached on mount): refresh it quietly. Flipping to "loading" here
		// put the loading overlay over a picture that was already on screen.
		if (!localUrl && !urlRef.current) {
			setLoading(true);
			setFailed(false);
		}
		// Images and video both stream from a signed URL. Blob-fetching an image over
		// an authenticated XHR blocked painting until the last byte arrived and threw
		// away progressive decode, Range support and the browser's HTTP cache.
		const useSignedStream =
			['video', 'image', 'sticker'].includes(type) &&
			!demoAttachment &&
			isPersistedAttachmentId(attachmentId) &&
			!localUrl;
		const finishBlob = blob => {
			if (cancelled || loadGenRef.current !== loadGen) return;
			const kind = String(attachment?.type || '').toLowerCase();
			const mime = String(attachment?.mimeType || blob?.type || '').toLowerCase();
			let nextBlob = blob;
			if (
				(kind === 'image' || kind === 'sticker') &&
				(!mime || mime.includes('octet-stream'))
			) {
				nextBlob = blob.slice(0, blob.size, 'image/jpeg');
			} else if (kind === 'video' && (!mime || mime.includes('octet-stream'))) {
				nextBlob = blob.slice(0, blob.size, 'video/mp4');
			} else if (
				['audio', 'ptt', 'voice'].includes(kind) &&
				(!mime || mime.includes('octet-stream'))
			) {
				nextBlob = blob.slice(0, blob.size, 'audio/ogg');
			}
			objectUrl = URL.createObjectURL(nextBlob);
			setUrl(objectUrl);
			setFailed(false);
		};
		const load = useSignedStream
			? getAttachmentStreamUrl(attachmentId, attachment)
					.then(streamUrl => {
						if (cancelled || loadGenRef.current !== loadGen) return;
						// Same URL as on screen: no state change, no re-render, no reload.
						setUrl(current => (current === streamUrl ? current : streamUrl));
						setFailed(false);
					})
					.catch(() => loadAttachmentBlob().then(finishBlob))
			: loadAttachmentBlob().then(finishBlob);
		load
			.catch(error => {
				// Keep local preview if fetch of durable copy fails.
				if (!cancelled && loadGenRef.current === loadGen && !localUrl) {
					const detail = String(
						error instanceof Error ? error.message : error || '',
					).toLowerCase();
					const isThumbnail =
						detail.includes('thumbnail') || detail.includes('still a thumbnail');
					if (
						isThumbnail &&
						(type === 'video' || type === 'image') &&
						autoRetryCountRef.current < 6
					) {
						autoRetryCountRef.current += 1;
						forgetAttachmentBlob(attachmentId);
						window.setTimeout(
							() => setRetryNonce(value => value + 1),
							1200 * autoRetryCountRef.current,
						);
						setLoading(true);
						return;
					}
					setFailed(true);
				}
			})
			.finally(() => {
				if (loadGenRef.current === loadGen) setLoading(false);
			});
		return () => {
			cancelled = true;
			if (objectUrl) {
				const stale = objectUrl;
				window.setTimeout(() => URL.revokeObjectURL(stale), 60_000);
			}
		};
		// Intentionally omit onImageReady / url — unstable parent callbacks were
		// cancelling in-flight video/image fetches and leaving "Loading media…".
		// eslint-disable-next-line react-hooks/exhaustive-deps -- load once per id/viewport/retry
	}, [
		attachment?.id,
		demoAttachment,
		isDocument,
		isNearViewport,
		isPendingAttachment,
		isVoice,
		loadAttachmentBlob,
		retryNonce,
		sessionReady,
		type,
	]);

	useEffect(() => {
		if (!url || (type !== 'image' && type !== 'sticker')) return;
		onImageReady?.(attachment.id, {
			id: attachment.id,
			url,
			previewUrl: previewDataUrl || null,
			fileName: attachment.fileName,
		});
	}, [attachment.id, attachment.fileName, onImageReady, type, url]);

	const saveAttachmentToDevice = async blob => {
		const file = toMediaFile(blob, {
			fileName: attachment.fileName,
			mimeType: attachment.mimeType,
			kind: type || 'document',
			sentAt,
		});
		const result = await saveMediaFiles([file], { locale });
		if (result.status === 'downloaded') {
			toast.success(labels.downloadStarted || (locale === 'ar' ? 'بدأ التحميل' : 'Download started'));
		}
	};

	/** ~50 MB: pulling this through JS memory OOM/aborts; stream from a signed URL instead. */
	const LARGE_ATTACHMENT_BLOB_BYTES = 48 * 1024 * 1024;
	const IN_APP_OFFICE_MAX_BYTES = 15 * 1024 * 1024;

	const attachmentDeclaredBytes = () =>
		Number(
			attachment?.fileSizeBytes ?? attachment?.sizeBytes ?? attachment?.size ?? 0,
		) || 0;

	const shouldStreamAttachmentOffBlob = action => {
		if (demoAttachment || !isPersistedAttachmentId(String(attachment?.id || ''))) {
			return false;
		}
		const bytes = attachmentDeclaredBytes();
		if (bytes >= LARGE_ATTACHMENT_BLOB_BYTES) return true;
		if (!isDocument) return false;
		// Documents without a known size (FIG/ZIP/…) often hide a huge payload.
		if (action === 'download') return true;
		const extension = String(
			attachmentExtension(attachment.fileName, attachment.mimeType) || '',
		)
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '');
		// Documents the in-app viewer can show stay on the blob path. Excel and Word used to be
		// left out, so "Open" handed them to the browser, which downloaded them instead.
		if (['xls', 'xlsx', 'docx'].includes(extension)) {
			// Spreadsheets and Word files are read in the page; past ~15 MB that gets slow.
			return bytes > IN_APP_OFFICE_MAX_BYTES;
		}
		return !['pdf', 'txt', 'csv', 'json', 'md', 'markdown', 'log'].includes(extension);
	};

	const ensureAttachmentOnDisk = async () => {
		const attachmentId = String(attachment?.id || '');
		const bytes = attachmentDeclaredBytes();
		const timeout = Math.min(
			45 * 60_000,
			Math.max(180_000, Math.ceil(Math.max(bytes, 32 * 1024 * 1024) / (256 * 1024)) * 1000),
		);
		await api.post(`/whatsapp/attachments/${attachmentId}/download`, null, { timeout });
	};

	const openAttachmentViaSignedUrl = async ({ download = false } = {}) => {
		await ensureAttachmentOnDisk();
		const streamUrl = await getAttachmentStreamUrl(attachment.id, attachment);
		if (!streamUrl) throw new Error('Media unavailable');
		if (download) {
			const anchor = document.createElement('a');
			anchor.href = streamUrl;
			anchor.download = attachment.fileName || 'download';
			anchor.rel = 'noopener';
			anchor.style.display = 'none';
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			toast.success(
				labels.downloadStarted || (locale === 'ar' ? 'بدأ التحميل' : 'Download started'),
			);
			return;
		}
		window.open(streamUrl, '_blank', 'noopener,noreferrer');
	};

	const formatMediaLimitError = raw => {
		const text = String(raw || '');
		const match = text.match(/exceeds limit\s*\((\d+)\s*bytes(?:;\s*max\s*(\d+)\s*bytes)?\)/i);
		if (!match) return text.slice(0, 160);
		const sizeMb = Math.max(1, Math.round(Number(match[1]) / (1024 * 1024)));
		if (locale === 'ar') {
			return `الملف كبير جدًا (${sizeMb} ميجا). حدّث السيرفر أو حاول التحميل مرة أخرى.`;
		}
		return `This file is too large (${sizeMb} MB) for the current media limit.`;
	};

	const handleFileAction = async action => {
		if (fileAction) return;
		setFileAction(action);
		try {
			if (shouldStreamAttachmentOffBlob(action)) {
				await openAttachmentViaSignedUrl({ download: action === 'download' });
				return;
			}
			const blob = await loadAttachmentBlob();
			if (action === 'download') {
				await saveAttachmentToDevice(blob);
			} else if (typeof onOpenDocument === 'function') {
				const fileName = attachment.fileName || labels.fileAttachment || 'attachment';
				const extension = String(attachmentExtension(fileName, attachment.mimeType) || '')
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '');
				let previewBlob = blob;
				let previewMime = attachment.mimeType || blob?.type || '';
				if (extension === 'pdf') {
					previewMime = 'application/pdf';
					if (!String(blob?.type || '').toLowerCase().includes('pdf')) {
						previewBlob = blob.slice(0, blob.size, 'application/pdf');
					}
				}
				onOpenDocument({
					name: fileName,
					fileName: attachment.fileName,
					mimeType: previewMime,
					blob: previewBlob,
					attachmentId: attachment.id,
				});
			} else {
				const objectUrl = URL.createObjectURL(blob);
				window.open(objectUrl, '_blank', 'noopener,noreferrer');
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			}
		} catch (error) {
			const raw =
				error?.response?.data?.message ||
				(typeof error?.message === 'string' ? error.message : '') ||
				String(error?.name || '');
			const aborted =
				error?.name === 'AbortError' ||
				/aborted|timeout|network error|failed to fetch/i.test(String(raw));
			const oversized = /exceeds limit/i.test(String(raw));
			const reason =
				!aborted && raw && !/^(Media unavailable|Attachment is unavailable)$/i.test(raw)
					? oversized
						? formatMediaLimitError(raw)
						: String(raw).slice(0, 160)
					: '';
			if (action === 'download') {
				const title = aborted
					? locale === 'ar'
						? 'انقطع التحميل. حاول الحفظ مرة تانية.'
						: 'The download was interrupted. Tap Save again.'
					: locale === 'ar'
						? 'تعذر حفظ الملف'
						: 'Could not save the file';
				toast.error(reason ? `${title}: ${reason}` : title);
			} else {
				setFailed(true);
				if (reason) {
					toast.error(`${locale === 'ar' ? 'تعذر فتح الملف' : 'Could not open the file'}: ${reason}`);
				}
			}
		} finally {
			setFileAction('');
		}
	};

	if (isVoice) {
		const fromName = durationFromFileName(attachment.fileName);
		const fromMessage =
			Number(messageDurationSeconds) > 0
				? Number(messageDurationSeconds)
				: voiceDurationSecondsFromSource({
						raw: messageRaw,
						attachments: [attachment],
					});
		return (
			<VoiceMessage
				attachmentId={attachment.id}
				url={localMediaFileUrl(attachment, type) || attachment.url}
				mine={mine}
				mimeType={attachment.mimeType}
				fileName={attachment.fileName}
				demoAttachment={demoAttachment}
				seed={String(attachment.id || attachment.fileName || attachment.url)}
				fallbackDuration={fromName || fromMessage || 0}
				labels={labels}
				sessionReady={sessionReady}
				downloadStatus={attachment.downloadStatus}
				attachmentType={type || 'ptt'}
				avatarLabel={avatarLabel}
				avatarSrc={avatarSrc}
				messageId={messageId}
				messageStatus={messageStatus}
				onTranscribe={typeof onTranscribe === 'function' ? onTranscribe : null}
				onEditAsVoice={
					typeof onSendAsVoice === 'function' ? () => onSendAsVoice(attachment) : null
				}
				onSaveToLibrary={
					typeof onSaveToLibrary === 'function' ? () => onSaveToLibrary(attachment) : null
				}
				onDownload={isPendingAttachment ? null : () => handleFileAction('download')}
				downloading={fileAction === 'download'}
				menuLabels={labels}
			/>
		);
	}

	if (isDocument) {
		const extension = attachmentExtension(attachment.fileName, attachment.mimeType);
		const extKey = String(extension || '')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '');
		const size = formatAttachmentSize(
			attachment.sizeBytes ?? attachment.size ?? attachment.fileSize,
		);
		const details = [extension, size].filter(Boolean).join(' · ');
		const isWord = extKey === 'doc' || extKey === 'docx';
		const isExcel = extKey === 'xls' || extKey === 'xlsx' || extKey === 'csv';
		const isPdf = extKey === 'pdf';
		const fileIconKey = isPdf ? 'pdf' : isExcel ? 'xlsx' : isWord ? 'doc' : extKey;
		const saveLabel = labels.saveAsFile || labels.downloadFile;
		const canToggleSelect = selectMode && typeof onToggleSelect === 'function';
		return (
			<div
				ref={containerRef}
				role={canToggleSelect ? 'checkbox' : undefined}
				aria-checked={canToggleSelect ? selected : undefined}
				tabIndex={canToggleSelect ? 0 : undefined}
				onClick={
					canToggleSelect
						? event => {
								event.preventDefault();
								event.stopPropagation();
								onToggleSelect(String(attachment?.id || ''));
							}
						: undefined
				}
				onKeyDown={
					canToggleSelect
						? event => {
								if (event.key !== 'Enter' && event.key !== ' ') return;
								event.preventDefault();
								event.stopPropagation();
								onToggleSelect(String(attachment?.id || ''));
							}
						: undefined
				}
				className={`wa-file-card ${mine ? 'is-outgoing' : 'is-incoming'}${selectMode ? ' is-select-mode' : ''}${selected ? ' is-selected' : ''}`}
				data-ext={extKey || undefined}
			>
				{selectMode ? (
					<span className={`wa-file-card-check${selected ? ' is-on' : ''}`} aria-hidden="true">
						{selected ? <Check size={12} strokeWidth={3} /> : null}
					</span>
				) : null}
				<div className="wa-file-card-head">
					<span className="wa-file-card-icon wa-file-card-icon-image" data-ext={extKey || undefined} aria-hidden="true">
						<WhatsAppFileTypeIcon extKey={fileIconKey} />
					</span>
					<span className="wa-file-card-copy">
						<span className="wa-file-card-name" title={attachment.fileName}>
							{attachment.fileName || labels.fileAttachment}
						</span>
						<span className="wa-file-card-details">
							{details || labels.fileAttachment}
						</span>
					</span>
				</div>
				{!selectMode && !hideFileActions ? (
					<div className="wa-file-card-actions">
						<button
							type="button"
							onClick={() => handleFileAction('open')}
							disabled={Boolean(fileAction)}
							className="wa-file-card-action"
						>
							{fileAction === 'open' ? <Loader2 size={14} className="animate-spin" /> : null}
							{labels.openFile}
						</button>
						<button
							type="button"
							onClick={() => handleFileAction('download')}
							disabled={Boolean(fileAction)}
							className="wa-file-card-action"
						>
							{fileAction === 'download' ? <Loader2 size={14} className="animate-spin" /> : null}
							{saveLabel}
						</button>
					</div>
				) : null}
				{failed && !selectMode && !hideFileActions ? (
					<p className="wa-file-card-error">{labels.mediaUnavailable}</p>
				) : null}
			</div>
		);
	}

	if ((type === 'image' || type === 'sticker') && (url || previewDataUrl || loading || failed)) {
		return (
			<div
				ref={containerRef}
				className={
					isGallery
						? `absolute inset-0 overflow-hidden ${className}`
						: isSingleMedia
							? `relative w-full max-w-full overflow-hidden ${className}`
							: `relative w-full max-w-full overflow-hidden ${className}`
				}
			>
				<ImageMessage
					url={url || null}
					previewUrl={previewDataUrl}
					loading={Boolean((loading || !url) && !failed)}
					unavailable={Boolean(failed && !url)}
					alt={attachment.fileName || 'image'}
					cover={isGallery}
					selectMode={selectMode}
					mediaWidth={mediaDims?.width}
					mediaHeight={mediaDims?.height}
					cacheKey={attachment?.id}
					retryLabel={labels.tapToRetry || labels.retry || 'Tap to retry'}
					loadingLabel={labels.loadingMedia || 'Loading media…'}
					onFullError={() => {
						forgetAttachmentBlob(String(attachment?.id || ''));
						setUrl(null);
						setFailed(true);
						setLoading(false);
					}}
					onOpen={() => {
						if (selectMode) return;
						if (url) {
							onOpenImage?.(attachment.id);
							return;
						}
						autoRetryCountRef.current = 0;
						forgetAttachmentBlob(String(attachment?.id || ''));
						setFailed(false);
						setLoading(true);
						setRetryNonce(value => value + 1);
					}}
					className={`${type === 'sticker' ? 'wa-sticker-asset' : 'wa-photo-asset'}${isSingleMedia ? ' wa-photo-asset-single' : ''}`}
				/>
			</div>
		);
	}

	if (loading) {
		const videoPoster =
			type === 'video' &&
			previewDataUrl &&
			!isPlayableVideoUrl(previewDataUrl)
				? previewDataUrl
				: null;
		return (
			<div
				ref={containerRef}
				className={
					type === 'video'
						? `wa-media-card wa-media-card--video mb-2 ${reservedPortrait ? 'is-portrait' : ''} ${className}${videoPoster ? ' has-poster' : ''}`
						: `wa-media-card mb-2 ${className}`
				}
				style={{
					...mediaBoxStyle,
					...(videoPoster
						? {
								backgroundImage: `url(${videoPoster})`,
								backgroundSize: 'cover',
								backgroundPosition: 'center',
							}
						: {}),
				}}
			>
				<span className="wa-media-card__icon" aria-hidden="true">
					{type === 'video' ? <Video size={28} strokeWidth={1.75} /> : <ImageIcon size={28} strokeWidth={1.75} />}
				</span>
				<span className="wa-photo-download__ring">
					<Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
				</span>
				<span className="wa-media-card__label">{labels.loadingMedia}</span>
			</div>
		);
	}
	if (failed || !url) {
		const retry = () => {
			autoRetryCountRef.current = 0;
			setFailed(false);
			setRetryNonce(value => value + 1);
		};
		if (!isGallery) {
			return (
				<button
					ref={containerRef}
					type="button"
					onClick={retry}
					className={`wa-media-card ${type === 'video' ? `wa-media-card--video${reservedPortrait ? ' is-portrait' : ''}` : ''} mb-2 text-start ${className}`}
					style={type === 'video' || type === 'image' ? mediaBoxStyle : undefined}
				>
					<span className="wa-media-card__icon" aria-hidden="true">
						{type === 'video' ? (
							<Video size={28} strokeWidth={1.75} />
						) : type === 'audio' || type === 'ptt' ? (
							<Mic size={28} strokeWidth={1.75} />
						) : (
							<ImageOff size={28} strokeWidth={1.75} />
						)}
					</span>
					<span className="wa-photo-state__action" aria-hidden="true">
						<RefreshCw size={18} strokeWidth={2.4} />
					</span>
					<span className="wa-media-card__label">
						{labels.tapToRetry || labels.mediaUnavailable || 'Tap to retry'}
					</span>
				</button>
			);
		}
		return (
			<button
				ref={containerRef}
				type="button"
				onClick={retry}
				className={`wa-media-unavailable absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-1.5 overflow-hidden px-3 text-center text-xs ${mine ? 'text-emerald-950/80' : 'text-slate-600'} ${className}`}
			>
				<span className="relative z-[1] grid h-11 w-11 place-items-center rounded-full bg-black/35 text-white shadow-sm">
					{type === 'audio' || type === 'ptt' ? (
						<Mic size={18} className="shrink-0" />
					) : type === 'video' ? (
						<Video size={18} className="shrink-0" />
					) : (
						<WhatsAppFileTypeIcon extKey="file" className="h-[18px] w-[18px] object-contain" />
					)}
				</span>
				<span className="relative z-[1] min-w-0">
					<span className="block font-semibold text-white drop-shadow">
						{labels.mediaUnavailable}
					</span>
					<span className="mt-0.5 block text-[10px] text-white/85 drop-shadow">
						{labels.tapToRetry || 'Tap to retry'}
					</span>
				</span>
			</button>
		);
	}
	if (type === 'image' || type === 'sticker') {
		return (
			<ImageMessage
				url={url}
				previewUrl={previewDataUrl}
				alt={attachment.fileName || 'image'}
				onOpen={() => onOpenImage?.(attachment.id)}
				cover={false}
				mediaWidth={mediaDims?.width}
				mediaHeight={mediaDims?.height}
				cacheKey={attachment?.id}
				className={`${className} ${type === 'sticker' ? 'wa-sticker-asset' : 'wa-photo-asset'}`}
			/>
		);
	}
	if (type === 'video') {
		const playable = isPlayableVideoUrl(url);
		if (!playable) {
			const videoPoster =
				previewDataUrl && !isPlayableVideoUrl(previewDataUrl) ? previewDataUrl : null;
			const stillFetching =
				loading ||
				downloadStatus === 'pending' ||
				downloadStatus === 'downloading';
			if (stillFetching) {
				return (
					<div
						ref={containerRef}
						className={`wa-media-card wa-media-card--video mb-2 ${reservedPortrait ? 'is-portrait' : ''} ${className}${videoPoster ? ' has-poster' : ''}`}
						style={{
							...mediaBoxStyle,
							...(videoPoster
								? {
										backgroundImage: `url(${videoPoster})`,
										backgroundSize: 'cover',
										backgroundPosition: 'center',
									}
								: {}),
						}}
					>
						<span className="wa-media-card__icon" aria-hidden="true">
							<Video size={28} strokeWidth={1.75} />
						</span>
						<span className="wa-photo-download__ring">
							<Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
						</span>
						<span className="wa-media-card__label">{labels.loadingMedia}</span>
					</div>
				);
			}
			return (
				<button
					ref={containerRef}
					type="button"
					onClick={() => {
						autoRetryCountRef.current = 0;
						setFailed(false);
						setRetryNonce(value => value + 1);
					}}
					className={`wa-media-card wa-media-card--video mb-2 text-start ${reservedPortrait ? 'is-portrait' : ''} ${className}${videoPoster ? ' has-poster' : ''}`}
					style={{
						...mediaBoxStyle,
						...(videoPoster
							? {
									backgroundImage: `url(${videoPoster})`,
									backgroundSize: 'cover',
									backgroundPosition: 'center',
								}
							: {}),
					}}
				>
					<span className="wa-media-card__icon" aria-hidden="true">
						<Video size={28} strokeWidth={1.75} />
					</span>
					<span className="wa-photo-state__action" aria-hidden="true">
						<RefreshCw size={18} strokeWidth={2.4} />
					</span>
					<span className="wa-media-card__label">
						{labels.tapToRetry || labels.mediaUnavailable || 'Tap to retry'}
					</span>
				</button>
			);
		}
		const videoPoster =
			previewDataUrl && !isPlayableVideoUrl(previewDataUrl) ? previewDataUrl : null;
		return (
			<ChatVideoPlayer
				url={url}
				poster={videoPoster}
				className={className}
				selectMode={selectMode}
				containerRef={containerRef}
				durationHint={messageDurationSeconds}
				aspectWidth={mediaDims?.width}
				aspectHeight={mediaDims?.height}
				cacheKey={attachment?.id}
				playLabel={labels.playVideo || labels.play || 'Play'}
				pauseLabel={labels.pauseVideo || labels.recordingPause || 'Pause'}
				muteLabel={labels.muteVideo || 'Mute'}
				unmuteLabel={labels.unmuteVideo || 'Unmute'}
				expandLabel={labels.expandVideo || 'Expand video'}
				collapseLabel={labels.exitVideoFullscreen || 'Exit fullscreen'}
				closeLabel={labels.close || 'Close'}
				speedLabel={labels.playbackSpeed || 'Playback speed'}
				downloadLabel={labels.saveAsFile || labels.downloadFile || 'Download'}
				downloading={fileAction === 'download'}
				onDownload={() => handleFileAction('download')}
				transcribeLabel={labels.transcribe || 'Transcribe'}
				onTranscribe={typeof onTranscribe === 'function' ? onTranscribe : null}
				moreLabel={labels.moreActions || 'More'}
				onSendAsVoice={
					typeof onSendAsVoice === 'function' ? () => onSendAsVoice(attachment) : null
				}
				sendAsVoiceLabel={sendAsVoiceLabel || labels.sendAsVoice || 'Send as voice message'}
				sendingAsVoice={sendingAsVoice}
				onSaveToLibrary={
					typeof onSaveToLibrary === 'function' ? () => onSaveToLibrary(attachment) : null
				}
				saveToLibraryLabel={labels.saveToLibrary || 'Save to library'}
				onError={event => {
					if (event.currentTarget.currentSrc !== url) return;
					setFailed(true);
					setUrl(null);
				}}
			/>
		);
	}
	if (selectMode) {
		return (
			<div
				ref={containerRef}
				className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-black/5 ${className}`}
			>
				<WhatsAppFileTypeIcon
					extKey={attachmentExtension(attachment.fileName, attachment.mimeType)}
					className="h-3.5 w-3.5 object-contain"
				/>
				<span>{attachment.fileName || attachment.type || 'file'}</span>
			</div>
		);
	}
	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs underline bg-black/5`}
		>
			<WhatsAppFileTypeIcon
				extKey={attachmentExtension(attachment.fileName, attachment.mimeType)}
				className="h-3.5 w-3.5 object-contain"
			/>
			<span>{attachment.fileName || attachment.type || 'file'}</span>
		</a>
	);
}
