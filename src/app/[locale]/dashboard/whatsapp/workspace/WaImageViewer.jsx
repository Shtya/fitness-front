'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Loader2, Minimize2, Plus, ZoomIn, ZoomOut, X } from 'lucide-react';
import { relativeTime, isLocalMediaUrl, rememberMediaDimensions, viewerNeighborIds, viewerThumbSrc, viewerFullSrc, isInlineImageDataUrl } from '../whatsapp-utils';
import { toMediaFile } from '../wa-save-file';
import { saveMediaFiles } from '../wa-save-prompt';
import { getCachedAttachmentBlob, isPersistedAttachmentId, requestAttachmentBlob } from './wa-attachment-blobs';

const CHAT_VIEWER_ZOOM_MIN = 1;

const CHAT_VIEWER_ZOOM_MAX = 4;

const CHAT_VIEWER_ZOOM_STEP = 0.35;

/** Full-screen profile photo (WhatsApp CDN URL) with zoom — portals to body. */
export function ProfilePhotoViewer({ src, label = '', onClose, onRequestFreshUrl }) {
	const [url, setUrl] = useState(src || '');
	const [visible, setVisible] = useState(false);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [loadingFresh, setLoadingFresh] = useState(false);
	const dragRef = useRef(null);
	const stageRef = useRef(null);
	const refreshUrlRef = useRef(onRequestFreshUrl);
	refreshUrlRef.current = onRequestFreshUrl;
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		setUrl(src || '');
	}, [src]);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => setVisible(true));
		const onKey = event => {
			if (event.key === 'Escape') onCloseRef.current?.();
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener('keydown', onKey);
		};
	}, []);

	useEffect(() => {
		const refresh = refreshUrlRef.current;
		if (!refresh) return undefined;
		let cancelled = false;
		setLoadingFresh(true);
		void Promise.resolve(refresh())
			.then(next => {
				if (cancelled || !next) return;
				setUrl(String(next));
			})
			.finally(() => {
				if (!cancelled) setLoadingFresh(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const resetTransform = useCallback(() => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
	}, []);

	const clampZoom = value =>
		Math.min(CHAT_VIEWER_ZOOM_MAX, Math.max(CHAT_VIEWER_ZOOM_MIN, value));

	const adjustZoom = useCallback(delta => {
		setZoom(current => clampZoom(Number((current + delta).toFixed(2))));
		if (delta < 0) {
			setPan(current => ({
				x: current.x * 0.85,
				y: current.y * 0.85,
			}));
		}
	}, []);

	const onStagePointerDown = useCallback(
		event => {
			if (event.button !== 0) return;
			event.currentTarget.setPointerCapture?.(event.pointerId);
			dragRef.current = {
				x: event.clientX,
				y: event.clientY,
				panX: pan.x,
				panY: pan.y,
				moved: false,
				zoomAtStart: zoom,
			};
		},
		[pan.x, pan.y, zoom],
	);

	const onStagePointerMove = useCallback(event => {
		const drag = dragRef.current;
		if (!drag) return;
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
		if (drag.zoomAtStart > 1.02) {
			setPan({ x: drag.panX + dx, y: drag.panY + dy });
		}
	}, []);

	const onStagePointerUp = useCallback(() => {
		dragRef.current = null;
	}, []);

	const onStageDoubleClick = useCallback(() => {
		if (zoom > 1.05) {
			resetTransform();
			return;
		}
		setZoom(2.25);
	}, [resetTransform, zoom]);

	const onWheel = useCallback(
		event => {
			event.preventDefault();
			adjustZoom(event.deltaY > 0 ? -CHAT_VIEWER_ZOOM_STEP : CHAT_VIEWER_ZOOM_STEP);
		},
		[adjustZoom],
	);

	if (!src && !url) return null;

	const zoomLabel = `${Math.round(zoom * 100)}%`;
	const viewer = (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={label || 'Profile photo'}
			className={`wa-chat-image-viewer wa-chat-image-viewer--profile ${visible ? 'is-visible' : ''}`}
			onClick={onClose}
		>
			<div className="wa-chat-image-viewer__backdrop" aria-hidden="true" />
			<div className="wa-chat-image-viewer__shell" onClick={event => event.stopPropagation()}>
				<div className="wa-chat-image-viewer__stage">
					<header className="wa-chat-image-viewer__toolbar wa-chat-image-viewer__toolbar--overlay">
						<div className="wa-chat-image-viewer__meta">
							<span className="wa-chat-image-viewer__caption" title={label}>
								{label || (loadingFresh ? '…' : '')}
							</span>
						</div>
						<div className="wa-chat-image-viewer__actions">
							<span className="wa-chat-image-viewer__zoom-label">{zoomLabel}</span>
							<button
								type="button"
								aria-label="Zoom out"
								className="wa-chat-image-viewer__icon-btn"
								onClick={() => adjustZoom(-CHAT_VIEWER_ZOOM_STEP)}
							>
								<ZoomOut size={20} />
							</button>
							<button
								type="button"
								aria-label="Zoom in"
								className="wa-chat-image-viewer__icon-btn"
								onClick={() => adjustZoom(CHAT_VIEWER_ZOOM_STEP)}
							>
								<ZoomIn size={20} />
							</button>
							<button
								type="button"
								aria-label="Reset zoom"
								className="wa-chat-image-viewer__icon-btn"
								onClick={resetTransform}
							>
								<Minimize2 size={18} />
							</button>
							<button
								type="button"
								onClick={onClose}
								aria-label="Close image viewer"
								className="wa-chat-image-viewer__icon-btn is-close"
							>
								<X size={22} />
							</button>
						</div>
					</header>
					<div
						ref={stageRef}
						className="wa-chat-image-viewer__canvas-wrap"
						onPointerDown={onStagePointerDown}
						onPointerMove={onStagePointerMove}
						onPointerUp={onStagePointerUp}
						onPointerCancel={onStagePointerUp}
						onDoubleClick={onStageDoubleClick}
						onWheel={onWheel}
					>
						<div
							className="wa-chat-image-viewer__canvas"
							style={{
								transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
							}}
						>
							{url ? (
								<img
									key={url}
									src={url}
									alt={label || 'Profile photo'}
									referrerPolicy="no-referrer"
									draggable={false}
									className="wa-chat-image-viewer__image wa-chat-image-viewer__image--profile is-ready"
								/>
							) : (
								<div className="wa-chat-image-viewer__placeholder" aria-hidden="true">
									<ImageIcon size={42} strokeWidth={1.5} />
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== 'undefined' ? createPortal(viewer, document.body) : null;
}

export function ChatImageViewer({
	images,
	activeId,
	onClose,
	onChange,
	hasMoreOlder = false,
	loadingOlder = false,
	onLoadMore,
	loadMoreLabel = 'Load older',
}) {
	const locale = useLocale();
	const index = images.findIndex(image => String(image.id) === String(activeId));
	const image = images[index];
	const canNavigate = images.length > 1;
	const [blobUrls, setBlobUrls] = useState({});
	const [brokenUrls, setBrokenUrls] = useState({});
	const [fullReady, setFullReady] = useState(false);
	const [visible, setVisible] = useState(false);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [slideDir, setSlideDir] = useState(0);
	const blobUrlsRef = useRef({});
	const ownedUrlsRef = useRef(new Set());
	const thumbRefs = useRef({});
	const thumbStripRef = useRef(null);
	const viewerOpenRef = useRef(false);
	const stageRef = useRef(null);
	const dragRef = useRef(null);

	const markBroken = useCallback(src => {
		if (!src) return;
		setBrokenUrls(current => (current[src] ? current : { ...current, [src]: true }));
	}, []);

	const rememberBlobUrl = useCallback((id, url) => {
		if (!id || !url) return;
		blobUrlsRef.current = { ...blobUrlsRef.current, [id]: url };
		setBlobUrls(blobUrlsRef.current);
	}, []);

	const ensureViewerBlob = useCallback(async id => {
		const attachmentId = String(id || '');
		if (!attachmentId || blobUrlsRef.current[attachmentId]) return;
		if (!isPersistedAttachmentId(attachmentId)) return;
		try {
			const cached = getCachedAttachmentBlob(attachmentId);
			const blob = cached || (await requestAttachmentBlob(attachmentId, {
				timeout: 60_000,
				priority: true,
				kind: 'image',
			}));
			if (blobUrlsRef.current[attachmentId]) return;
			const url = URL.createObjectURL(blob);
			if (!viewerOpenRef.current || blobUrlsRef.current[attachmentId]) {
				URL.revokeObjectURL(url);
				return;
			}
			ownedUrlsRef.current.add(url);
			rememberBlobUrl(attachmentId, url);
		} catch {
			/* keep preview placeholder */
		}
	}, [rememberBlobUrl]);

	const resetTransform = useCallback(() => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
	}, []);

	const [savingImage, setSavingImage] = useState(false);
	const canSaveImage = Boolean(
		image &&
			(isPersistedAttachmentId(String(image.id || '')) ||
				(image.url && isLocalMediaUrl(image.url) && !isInlineImageDataUrl(image.url))),
	);
	const saveCurrentImage = useCallback(async () => {
		if (!image || savingImage) return;
		const id = String(image.id || '');
		setSavingImage(true);
		try {
			let blob = isPersistedAttachmentId(id) ? getCachedAttachmentBlob(id) : null;
			if (!blob && isPersistedAttachmentId(id)) {
				blob = await requestAttachmentBlob(id, { timeout: 60_000, priority: true, kind: 'image' });
			}
			if (!blob && image.url && isLocalMediaUrl(image.url) && !isInlineImageDataUrl(image.url)) {
				const response = await fetch(image.url);
				if (response.ok) blob = await response.blob();
			}
			if (!blob) throw new Error('Original image is unavailable');
			const file = toMediaFile(blob, {
				fileName: image.fileName,
				mimeType: image.mimeType,
				kind: 'image',
				sentAt: image.sentAt,
			});
			const result = await saveMediaFiles([file], { locale });
			if (result.status === 'downloaded') {
				toast.success(locale === 'ar' ? 'بدأ التحميل' : 'Download started');
			}
		} catch {
			toast.error(locale === 'ar' ? 'تعذر حفظ الصورة' : 'Could not save the image');
		} finally {
			setSavingImage(false);
		}
	}, [image, locale, savingImage]);

	const clampZoom = value =>
		Math.min(CHAT_VIEWER_ZOOM_MAX, Math.max(CHAT_VIEWER_ZOOM_MIN, value));

	const adjustZoom = useCallback(delta => {
		setZoom(current => clampZoom(Number((current + delta).toFixed(2))));
		if (delta < 0) {
			setPan(current => ({
				x: current.x * 0.85,
				y: current.y * 0.85,
			}));
		}
	}, []);

	const goTo = useCallback(
		(nextIndex, direction = 0) => {
			if (!images.length) return;
			const wrapped =
				((nextIndex % images.length) + images.length) % images.length;
			setSlideDir(direction);
			resetTransform();
			setFullReady(false);
			onChange(images[wrapped].id);
		},
		[images, onChange, resetTransform],
	);

	const previous = useCallback(() => goTo(index - 1, -1), [goTo, index]);
	const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);

	useEffect(() => {
		return () => {
			ownedUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
			ownedUrlsRef.current.clear();
		};
	}, []);

	useEffect(() => {
		if (!image) {
			if (!viewerOpenRef.current) return undefined;
			viewerOpenRef.current = false;
			setVisible(false);
			ownedUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
			ownedUrlsRef.current.clear();
			blobUrlsRef.current = {};
			setBlobUrls({});
			setBrokenUrls({});
			resetTransform();
			return undefined;
		}
		viewerOpenRef.current = true;
		const neighborIds = new Set(viewerNeighborIds(images, image.id, 3));
		images.forEach((item, itemIndex) => {
			if (Math.abs(itemIndex - index) <= 10 && !isInlineImageDataUrl(item.previewUrl)) {
				neighborIds.add(String(item.id));
			}
		});
		neighborIds.forEach(id => {
			void ensureViewerBlob(id);
		});
		const frame = window.requestAnimationFrame(() => setVisible(true));
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.cancelAnimationFrame(frame);
			document.body.style.overflow = prevOverflow;
		};
	}, [ensureViewerBlob, image, images, index, resetTransform]);

	useLayoutEffect(() => {
		setFullReady(false);
		resetTransform();
	}, [image?.id, resetTransform]);

	useLayoutEffect(() => {
		const strip = thumbStripRef.current;
		const node = thumbRefs.current[String(activeId || '')];
		if (!strip || !node) return;
		const targetLeft = node.offsetLeft - (strip.clientWidth - node.offsetWidth) / 2;
		strip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
	}, [activeId, index]);

	const onThumbStripWheel = useCallback(event => {
		const strip = thumbStripRef.current;
		if (!strip) return;
		event.stopPropagation();
		if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
			strip.scrollLeft += event.deltaY;
			event.preventDefault();
		}
	}, []);

	useEffect(() => {
		if (!image) return undefined;
		const onKeyDown = event => {
			if (event.key === 'Escape') onClose();
			if (event.key === 'ArrowLeft' && canNavigate) previous();
			if (event.key === 'ArrowRight' && canNavigate) next();
			if (event.key === '+' || event.key === '=') {
				event.preventDefault();
				adjustZoom(CHAT_VIEWER_ZOOM_STEP);
			}
			if (event.key === '-') {
				event.preventDefault();
				adjustZoom(-CHAT_VIEWER_ZOOM_STEP);
			}
			if (event.key === '0') resetTransform();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [adjustZoom, canNavigate, image, next, onClose, previous, resetTransform]);

	useEffect(() => {
		const stage = stageRef.current;
		if (!stage || !image) return undefined;
		const onWheel = event => {
			event.preventDefault();
			event.stopPropagation();
			const delta = event.deltaY > 0 ? -CHAT_VIEWER_ZOOM_STEP : CHAT_VIEWER_ZOOM_STEP;
			adjustZoom(delta);
		};
		stage.addEventListener('wheel', onWheel, { passive: false });
		return () => stage.removeEventListener('wheel', onWheel);
	}, [adjustZoom, image]);

	/*
	 * Touch gestures: one finger pans (when zoomed) or swipes to the next photo; two fingers
	 * pinch-zoom around the point between them; a quick double tap zooms in / out. Pointer
	 * positions are kept relative to the stage centre, where the canvas transform originates.
	 */
	const pointersRef = useRef(new Map());
	const pinchRef = useRef(null);
	const lastTapRef = useRef({ at: 0, x: 0, y: 0 });
	const lastPointerTypeRef = useRef('mouse');
	const zoomRef = useRef(zoom);
	const panRef = useRef(pan);
	zoomRef.current = zoom;
	panRef.current = pan;

	const stagePoint = useCallback(event => {
		const rect = stageRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return { x: event.clientX - (rect.left + rect.width / 2), y: event.clientY - (rect.top + rect.height / 2) };
	}, []);

	/** Zoom to `nextZoom` keeping the content under stage point `at` fixed. */
	const zoomAround = useCallback((nextZoom, at, fromZoom = zoomRef.current, fromPan = panRef.current) => {
		const z = clampZoom(nextZoom);
		if (z <= 1.001) {
			setZoom(1);
			setPan({ x: 0, y: 0 });
			return;
		}
		const qx = (at.x - fromPan.x) / fromZoom;
		const qy = (at.y - fromPan.y) / fromZoom;
		setZoom(z);
		setPan({ x: at.x - z * qx, y: at.y - z * qy });
	}, []);

	const startDrag = (event, point) => {
		dragRef.current = {
			pointerId: event.pointerId,
			startX: point.clientX,
			startY: point.clientY,
			originPan: { ...panRef.current },
			zoomAtStart: zoomRef.current,
			moved: false,
		};
	};

	const onStagePointerDown = useCallback(
		event => {
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			lastPointerTypeRef.current = event.pointerType;
			const stage = stageRef.current;
			if (!stage) return;
			stage.setPointerCapture?.(event.pointerId);
			pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY, ...stagePoint(event) });
			if (pointersRef.current.size === 2) {
				const [a, b] = [...pointersRef.current.values()];
				pinchRef.current = {
					startDist: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
					startZoom: zoomRef.current,
					startPan: { ...panRef.current },
				};
				dragRef.current = null;
				return;
			}
			if (pointersRef.current.size > 2) return;
			// Double tap (touch / pen): zoom in at the tap point, or back out.
			if (event.pointerType !== 'mouse') {
				const now = Date.now();
				const point = stagePoint(event);
				const last = lastTapRef.current;
				if (now - last.at < 300 && Math.hypot(point.x - last.x, point.y - last.y) < 30) {
					lastTapRef.current = { at: 0, x: 0, y: 0 };
					if (zoomRef.current > 1.05) resetTransform();
					else zoomAround(2.5, point, 1, { x: 0, y: 0 });
					dragRef.current = null;
					return;
				}
				lastTapRef.current = { at: now, ...point };
			}
			startDrag(event, event);
		},
		[resetTransform, stagePoint, zoomAround],
	);

	const onStagePointerMove = useCallback(
		event => {
			if (!pointersRef.current.has(event.pointerId)) return;
			pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY, ...stagePoint(event) });
			const pinch = pinchRef.current;
			if (pinch && pointersRef.current.size >= 2) {
				const [a, b] = [...pointersRef.current.values()];
				const dist = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
				const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
				const z = clampZoom(pinch.startZoom * (dist / pinch.startDist));
				// Keep the content that was under the fingers' midpoint under it while zooming.
				const qx = (mid.x - pinch.startPan.x) / pinch.startZoom;
				const qy = (mid.y - pinch.startPan.y) / pinch.startZoom;
				setZoom(z);
				setPan(z <= 1.001 ? { x: 0, y: 0 } : { x: mid.x - z * qx, y: mid.y - z * qy });
				return;
			}
			const drag = dragRef.current;
			if (!drag || drag.pointerId !== event.pointerId) return;
			const dx = event.clientX - drag.startX;
			const dy = event.clientY - drag.startY;
			if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
			if (drag.zoomAtStart > 1.02) {
				setPan({
					x: drag.originPan.x + dx,
					y: drag.originPan.y + dy,
				});
			}
		},
		[stagePoint],
	);

	const onStagePointerUp = useCallback(
		event => {
			pointersRef.current.delete(event.pointerId);
			if (pinchRef.current) {
				if (pointersRef.current.size < 2) {
					pinchRef.current = null;
					if (zoomRef.current < 1.02) resetTransform();
					// The finger still down continues as a pan from where it is now.
					const [rest] = [...pointersRef.current.entries()];
					if (rest) startDrag({ pointerId: rest[0] }, rest[1]);
				}
				return;
			}
			const drag = dragRef.current;
			if (!drag || drag.pointerId !== event.pointerId) return;
			const dx = event.clientX - drag.startX;
			dragRef.current = null;
			if (drag.zoomAtStart <= 1.02 && drag.moved && Math.abs(dx) > 72 && canNavigate) {
				if (dx > 0) previous();
				else next();
			}
		},
		[canNavigate, next, previous, resetTransform],
	);

	const onStageDoubleClick = useCallback(
		event => {
			event.preventDefault();
			event.stopPropagation();
			// Touch double taps are handled in pointerdown (with the tap point).
			if (lastPointerTypeRef.current !== 'mouse') return;
			if (zoom > 1.05) {
				resetTransform();
				return;
			}
			zoomAround(2.25, stagePoint(event), 1, { x: 0, y: 0 });
		},
		[resetTransform, stagePoint, zoom, zoomAround],
	);

	if (!image) return null;

	const fullSrc = viewerFullSrc(image, blobUrls, brokenUrls);
	const previewSrc = isInlineImageDataUrl(image.previewUrl) ? image.previewUrl : null;
	const displaySrc =
		(fullSrc && !brokenUrls[fullSrc] ? fullSrc : null) || previewSrc || null;
	const hasDistinctFull = Boolean(fullSrc && fullSrc !== previewSrc);
	const metaParts = [
		image.sentAt ? relativeTime(image.sentAt, Date.now(), locale) : null,
		!image.fromMe && image.senderName ? image.senderName : null,
		image.fileName || null,
	].filter(Boolean);
	const metaLine = metaParts.join(' · ');
	const zoomLabel = `${Math.round(zoom * 100)}%`;

	const viewer = (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Chat image viewer"
			className={`wa-chat-image-viewer wa-iv ${visible ? 'is-visible' : ''}`}
			onClick={onClose}
		>
			<div className="wa-chat-image-viewer__backdrop" aria-hidden="true">
				{displaySrc ? <img src={displaySrc} alt="" className="wa-iv__ambient" draggable={false} /> : null}
			</div>
			<div className="wa-chat-image-viewer__shell" onClick={event => event.stopPropagation()}>
				<div className="wa-chat-image-viewer__stage">
					<header className="wa-chat-image-viewer__toolbar wa-chat-image-viewer__toolbar--overlay">
						<div className="wa-chat-image-viewer__meta wa-iv__meta">
							<span className="wa-iv__avatar" aria-hidden="true">
								{(image.fromMe ? 'You' : image.senderName || image.fileName || '•').trim().charAt(0).toUpperCase()}
							</span>
							<span className="wa-iv__who">
								<b title={image.fromMe ? 'You' : image.senderName || ''}>
									{image.fromMe ? 'You' : image.senderName || 'Photo'}
								</b>
								{metaLine ? (
									<small title={metaLine}>
										{[image.sentAt ? relativeTime(image.sentAt, Date.now(), locale) : null, image.fileName || null]
											.filter(Boolean)
											.join(' · ')}
									</small>
								) : null}
							</span>
							{canNavigate ? (
								<span className="wa-chat-image-viewer__counter wa-iv__counter">
									{index + 1}
									<i>/</i>
									{images.length}
								</span>
							) : null}
						</div>
						<div className="wa-chat-image-viewer__actions">
							<div className="wa-iv__zoom" role="group" aria-label="Zoom">
								<button
									type="button"
									aria-label="Zoom out"
									className="wa-chat-image-viewer__icon-btn"
									disabled={zoom <= CHAT_VIEWER_ZOOM_MIN + 0.001}
									onClick={() => adjustZoom(-CHAT_VIEWER_ZOOM_STEP)}
								>
									<ZoomOut size={18} />
								</button>
								<button
									type="button"
									className="wa-chat-image-viewer__zoom-label"
									onClick={resetTransform}
									title="Reset zoom (0)"
									aria-label={`Zoom ${zoomLabel}, reset`}
								>
									{zoomLabel}
								</button>
								<button
									type="button"
									aria-label="Zoom in"
									className="wa-chat-image-viewer__icon-btn"
									disabled={zoom >= CHAT_VIEWER_ZOOM_MAX - 0.001}
									onClick={() => adjustZoom(CHAT_VIEWER_ZOOM_STEP)}
								>
									<ZoomIn size={18} />
								</button>
								<button
									type="button"
									aria-label="Fit to screen"
									title="Fit (0)"
									className="wa-chat-image-viewer__icon-btn"
									disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
									onClick={resetTransform}
								>
									<Minimize2 size={16} />
								</button>
							</div>
							{canSaveImage ? (
								<button
									type="button"
									aria-label={locale === 'ar' ? 'حفظ الصورة' : 'Save image'}
									title={locale === 'ar' ? 'حفظ الصورة' : 'Save image'}
									className="wa-chat-image-viewer__icon-btn"
									disabled={savingImage}
									aria-busy={savingImage || undefined}
									onClick={event => {
										event.stopPropagation();
										void saveCurrentImage();
									}}
								>
									{savingImage ? (
										<Loader2 size={20} className="animate-spin" />
									) : (
										<Download size={20} />
									)}
								</button>
							) : null}
							<button
								type="button"
								onClick={onClose}
								aria-label="Close image viewer"
								className="wa-chat-image-viewer__icon-btn is-close"
							>
								<X size={22} />
							</button>
						</div>
					</header>

					{canNavigate ? (
						<>
							<button
								type="button"
								aria-label="Previous image"
								onClick={previous}
								className="wa-chat-image-viewer__nav is-prev"
							>
								<ChevronLeft size={30} strokeWidth={2.25} />
							</button>
							<button
								type="button"
								aria-label="Next image"
								onClick={next}
								className="wa-chat-image-viewer__nav is-next"
							>
								<ChevronRight size={30} strokeWidth={2.25} />
							</button>
						</>
					) : null}

					<div
						ref={stageRef}
						className={`wa-chat-image-viewer__canvas-wrap ${
							slideDir < 0 ? 'is-slide-from-left' : slideDir > 0 ? 'is-slide-from-right' : ''
						}`}
						onPointerDown={onStagePointerDown}
						onPointerMove={onStagePointerMove}
						onPointerUp={onStagePointerUp}
						onPointerCancel={onStagePointerUp}
						onDoubleClick={onStageDoubleClick}
					>
						<div
							className="wa-chat-image-viewer__canvas"
							style={{
								transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
							}}
						>
							{displaySrc ? (
								<>
									{previewSrc && hasDistinctFull && !fullReady ? (
										<img
											src={previewSrc}
											alt=""
											draggable={false}
											className="wa-chat-image-viewer__preview"
										/>
									) : null}
									<img
										key={displaySrc}
										src={displaySrc}
										alt={image.fileName || 'Chat image'}
										draggable={false}
										className={`wa-chat-image-viewer__image ${
											!hasDistinctFull || fullReady ? 'is-ready' : 'is-pending'
										}`}
										onLoad={event => {
											setFullReady(true);
											rememberMediaDimensions(
												image.id,
												event.currentTarget.naturalWidth,
												event.currentTarget.naturalHeight,
											);
										}}
										onError={() => {
											if (displaySrc) markBroken(displaySrc);
										}}
									/>
								</>
							) : (
								<div className="wa-chat-image-viewer__placeholder" aria-hidden="true">
									<ImageIcon size={42} strokeWidth={1.5} />
								</div>
							)}
							{!displaySrc ? (
								<span className="wa-chat-image-viewer__spinner" aria-hidden="true">
									<Loader2 size={30} strokeWidth={2.2} className="animate-spin" />
								</span>
							) : null}
						</div>
					</div>

					{canNavigate ? (
						<div className="wa-chat-image-viewer__thumbs-wrap wa-chat-image-viewer__thumbs-wrap--overlay wa-iv__strip">
							<div className="wa-chat-image-viewer__thumbs-fade is-start" aria-hidden="true" />
							<div
								ref={thumbStripRef}
								className="wa-chat-image-viewer__thumbs"
								onClick={event => event.stopPropagation()}
								onWheel={onThumbStripWheel}
							>
								{hasMoreOlder && onLoadMore ? (
									<button
										type="button"
										disabled={loadingOlder}
										onClick={() => void onLoadMore()}
										className="wa-chat-image-viewer__thumb is-load-more"
										aria-label={loadMoreLabel}
										title={loadMoreLabel}
									>
										{loadingOlder ? (
											<Loader2 size={22} strokeWidth={2.2} className="animate-spin" />
										) : (
											<>
												<Plus size={22} strokeWidth={2.2} />
												<span>{loadMoreLabel}</span>
											</>
										)}
									</button>
								) : null}
								{images.map(item => {
									const rawThumb = viewerThumbSrc(item, blobUrls);
									const thumbSrc = rawThumb && !brokenUrls[rawThumb] ? rawThumb : null;
									const selected = String(item.id) === String(activeId);
									return (
										<button
											key={item.id}
											type="button"
											ref={node => {
												thumbRefs.current[String(item.id)] = node;
											}}
											onClick={() => {
												const itemIndex = images.findIndex(
													row => String(row.id) === String(item.id),
												);
												if (itemIndex < 0) return;
												goTo(
													itemIndex,
													itemIndex > index ? 1 : itemIndex < index ? -1 : 0,
												);
											}}
											className={`wa-chat-image-viewer__thumb ${selected ? 'is-active' : ''}`}
										>
											{thumbSrc ? (
												<img
													src={thumbSrc}
													alt=""
													loading="lazy"
													draggable={false}
													onError={() => markBroken(thumbSrc)}
												/>
											) : (
												<span className="wa-chat-image-viewer__thumb-ph" aria-hidden="true">
													<ImageIcon size={20} strokeWidth={1.75} />
												</span>
											)}
										</button>
									);
								})}
							</div>
							<div className="wa-chat-image-viewer__thumbs-fade is-end" aria-hidden="true" />
						</div>
					) : null}
				</div>
			</div>
		</div>
	);

	return typeof document !== 'undefined' ? createPortal(viewer, document.body) : null;
}
