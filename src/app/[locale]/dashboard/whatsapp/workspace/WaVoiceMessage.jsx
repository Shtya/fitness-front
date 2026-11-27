'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, BookmarkPlus, Download, Loader2, Mic, MoreHorizontal, RefreshCw } from 'lucide-react';
import { seekRatio, isLocalMediaUrl } from '../whatsapp-utils';
import { markVoicePlayed, useVoicePlayed } from '../voice-played-store';
import { demoApi } from '../demo/demo-api';
import { getAttachmentStreamUrl, forgetAttachmentStreamUrl, voicePlaybackFormat, withPlaybackFormat } from '../whatsapp-media-stream';
import { rawDemoId } from '../demo/demo-read-model';
import { forgetAttachmentBlob, getCachedAttachmentBlob, isPersistedAttachmentId, isUsefulWaveform, prepareVoicePlaybackFromBlob, requestAttachmentBlob } from './wa-attachment-blobs';
import { Avatar } from './WaAvatar';
import { getVoiceSpeed, nextVoiceSpeed, setVoiceSpeed, useVoiceSpeed } from './wa-voice-speed';
import './wa-voice-premium.css';
import { closeVoiceDock, dockVoiceAudio, getVoiceDockContext, pauseVoiceDock, takeBackDockedVoice } from './wa-voice-dock';

/**
 * Defers media requests until the bubble is close to the viewport. Only an IntersectionObserver:
 * reading a rect here forced style and layout for every media row mounted during a scroll.
 */
export function useNearViewport(elementRef, { rootMargin = '600px' } = {}) {
	const [isNear, setIsNear] = useState(false);
	useEffect(() => {
		if (isNear) return undefined;
		let cancelled = false;
		let observer = null;
		let raf = 0;
		let settleTimer = 0;
		let tries = 0;

		const markNear = () => {
			if (!cancelled) setIsNear(true);
		};

		const attach = () => {
			if (cancelled) return;
			const node = elementRef.current;
			// Ref is often null on the first effect tick — retry until mounted.
			if (!node) {
				if (tries++ < 90) raf = window.requestAnimationFrame(attach);
				else markNear();
				return;
			}
			if (typeof IntersectionObserver === 'undefined') {
				markNear();
				return;
			}
			observer = new IntersectionObserver(
				entries => {
					if (entries.some(entry => entry.isIntersecting)) {
						markNear();
						return;
					}
					// Zero-size tiles never intersect — load anyway after a short settle.
					const rect = entries[entries.length - 1]?.boundingClientRect;
					if (rect && !(rect.width > 0 || rect.height > 0) && !settleTimer) {
						settleTimer = window.setTimeout(markNear, 750);
					}
				},
				// The thread is the root: a margin on the viewport would be clipped by the scroller.
				{ root: node.closest('.wa-message-wallpaper'), rootMargin },
			);
			observer.observe(node);
		};

		attach();
		return () => {
			cancelled = true;
			if (raf) window.cancelAnimationFrame(raf);
			if (settleTimer) window.clearTimeout(settleTimer);
			observer?.disconnect();
		};
	}, [elementRef, isNear, rootMargin]);
	return isNear;
}

function seededWaveform(seed = '', count = 40) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	const bars = [];
	for (let i = 0; i < count; i++) {
		hash = (hash * 1103515245 + 12345) >>> 0;
		const noise = ((hash >>> 8) % 100) / 100;
		// Mix LCG noise with a slow envelope so placeholder never looks like a flat line.
		const envelope = 0.35 + 0.65 * Math.abs(Math.sin((i + 1) * 0.55 + (hash % 7) * 0.2));
		bars.push(Math.max(0.18, Math.min(1, 0.22 + noise * 0.55 * envelope + envelope * 0.28)));
	}
	return bars;
}

export function formatClock(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Wait until the element can start playback.
 *
 * Do not call `audio.load()` here — restarting an in-flight fetch is what left
 * some bubbles spinning forever (canplay never came, error was swallowed while
 * ignoreAudioErrorRef was set). The browser already fetches when `src` is set.
 *
 * Ignore MEDIA_ERR_ABORTED / empty errors: swapping `src` aborts the previous
 * resource and used to reject this waiter immediately, leaving play() unreached
 * while the UI spinner stayed up for the outer attempt.
 */
function waitForAudioCanPlay(audio, timeoutMs = 6_000) {
	if (!audio) return Promise.reject(new Error('Audio element missing'));
	// HAVE_CURRENT_DATA is enough to begin; waiting for HAVE_FUTURE_DATA stranded
	// short voice notes that never buffered ahead.
	if (audio.readyState >= 2) return Promise.resolve();
	return new Promise((resolve, reject) => {
		let settled = false;
		let timer = 0;
		const finish = (ok, error) => {
			if (settled) return;
			settled = true;
			if (timer) window.clearTimeout(timer);
			audio.removeEventListener('canplay', onReady);
			audio.removeEventListener('loadeddata', onReady);
			audio.removeEventListener('loadedmetadata', onReady);
			audio.removeEventListener('error', onError);
			if (ok) resolve();
			else reject(error || new Error('Audio failed to load'));
		};
		const onReady = () => finish(true);
		const onError = () => {
			const code = audio.error?.code;
			// 1 = MEDIA_ERR_ABORTED (src swap). Keep waiting for the new resource.
			if (!audio.error || code === 1) return;
			finish(false, new Error(audio.error?.message || 'Audio failed to load'));
		};
		timer = window.setTimeout(
			() => finish(false, new Error('Audio load timed out')),
			timeoutMs,
		);
		audio.addEventListener('canplay', onReady);
		audio.addEventListener('loadeddata', onReady);
		audio.addEventListener('loadedmetadata', onReady);
		audio.addEventListener('error', onError);
		if (audio.readyState >= 1) finish(true);
	});
}

function isBenignAudioPlayError(error) {
	const name = String(error?.name || '');
	// AbortError: a newer play() / src change cancelled this attempt — not a bad file.
	// NotAllowedError: autoplay policy; the click gesture usually clears it on retry.
	return name === 'AbortError' || name === 'NotAllowedError';
}

function VoicePlayIcon() {
	return (
		<svg className="wa-voice-play-icon is-play" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
			{/* Centroid sits on x=12.5, so the triangle reads as centred in the disc. */}
			<path fill="currentColor" d="M8.6 6.4c0-1.06 1.15-1.72 2.07-1.19l9.06 5.6c.86.53.86 1.79 0 2.32l-9.06 5.6c-.92.53-2.07-.13-2.07-1.19V6.4Z" />
		</svg>
	);
}

function VoicePauseIcon() {
	return (
		<svg className="wa-voice-play-icon is-pause" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
			<rect x="6.5" y="5" width="4" height="14" rx="1.6" fill="currentColor" />
			<rect x="13.5" y="5" width="4" height="14" rx="1.6" fill="currentColor" />
		</svg>
	);
}

function VoiceMicIcon() {
	return (
		<svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
			/>
		</svg>
	);
}

function VoiceLoadingIcon() {
	return (
		<svg className="wa-voice-play-icon wa-voice-play-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
			<path fill="currentColor" d="M12 2a10 10 0 1 0 10 10h-2.2A7.8 7.8 0 1 1 12 4.2V2Z" opacity="0.35" />
			<path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2.2A7.8 7.8 0 0 0 12 4.2V2Z" />
		</svg>
	);
}

function VoicePlaybackButton({ playing, loading, failed, onClick, labels = {} }) {
	const ar = String(labels.retry || labels.tapToRetry || '').includes('إعادة') ||
		String(labels.tapToRetry || '').includes('اضغط');
	const label = loading
		? ar ? 'جاري التحميل' : 'Loading voice message'
		: failed
			? labels.retry || (ar ? 'إعادة المحاولة' : 'Retry voice message')
			: playing
				? ar ? 'إيقاف الصوت' : 'Pause voice message'
				: ar ? 'تشغيل الصوت' : 'Play voice message';
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={`wa-voice-play wa-vp grid shrink-0 place-items-center ${playing ? 'is-playing' : ''} ${loading ? 'is-loading' : ''} ${failed ? 'is-failed' : ''}`}
		>
			{loading ? <VoiceLoadingIcon /> : playing ? <VoicePauseIcon /> : <VoicePlayIcon />}
		</button>
	);
}

function VoiceWaveform({
	peaks,
	progress,
	mine,
	loading,
	failed,
	onSeek,
	onScrubStart,
	onScrubMove,
	onScrubEnd,
}) {
	const items = isUsefulWaveform(peaks) ? peaks : seededWaveform(String(peaks?.length || 'voice'), 40);
	const dragRef = useRef(null);
	const suppressClickRef = useRef(false);
	const [dragRatio, setDragRatio] = useState(null);
	const progressRatio = Math.max(0, Math.min(1, Number(progress) || 0));
	const clamped = dragRatio ?? progressRatio;
	const lastIndex = Math.max(1, items.length - 1);

	// Waveform bars are always LTR (WhatsApp-style); do not flip for page RTL.
	const ratioAt = (event, element) => {
		const rect = element.getBoundingClientRect();
		return seekRatio(event.clientX, rect.left, rect.width, false);
	};

	const handlePointerDown = event => {
		suppressClickRef.current = false;
		if (loading || failed || event.button > 0) return;
		const element = event.currentTarget;
		if (event.pointerType === 'touch') {
			// On touch only the thumb grabs — holding / swiping elsewhere keeps the
			// bubble's long-press menu and swipe-to-reply.
			const rect = element.getBoundingClientRect();
			const thumbX = rect.left + 6 + (rect.width - 12) * progressRatio;
			if (Math.abs(event.clientX - thumbX) > 22) return;
		}
		event.stopPropagation();
		try {
			element.setPointerCapture(event.pointerId);
		} catch {
			/* capture is best-effort */
		}
		const ratio = ratioAt(event, element);
		dragRef.current = { id: event.pointerId, x: event.clientX, moved: false, ratio };
		setDragRatio(ratio);
		onScrubStart?.();
		onScrubMove?.(ratio);
	};

	const handlePointerMove = event => {
		const drag = dragRef.current;
		if (!drag || drag.id !== event.pointerId) return;
		event.stopPropagation();
		if (Math.abs(event.clientX - drag.x) > 3) drag.moved = true;
		drag.ratio = ratioAt(event, event.currentTarget);
		setDragRatio(drag.ratio);
		onScrubMove?.(drag.ratio);
	};

	const finishDrag = event => {
		const drag = dragRef.current;
		if (!drag || drag.id !== event.pointerId) return;
		dragRef.current = null;
		event.stopPropagation();
		suppressClickRef.current = true;
		setDragRatio(null);
		onScrubEnd?.(drag.ratio);
	};

	const handleKeyDown = event => {
		if (loading || failed) return;
		const step = event.shiftKey ? 0.2 : 0.05;
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? 1
					: event.key === 'ArrowLeft'
						? progressRatio - step
						: event.key === 'ArrowRight'
							? progressRatio + step
							: null;
		if (next == null) return;
		event.preventDefault();
		onScrubEnd?.(Math.max(0, Math.min(1, next)));
	};

	return (
		<button
			type="button"
			dir="ltr"
			data-wa-press-surface
			onClick={event => {
				if (suppressClickRef.current) {
					suppressClickRef.current = false;
					return;
				}
				onSeek?.(event);
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={finishDrag}
			onPointerCancel={finishDrag}
			onKeyDown={handleKeyDown}
			disabled={loading || failed}
			role="slider"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(clamped * 100)}
			aria-label="Seek voice message"
			className={`wa-voice-waveform relative flex min-w-0 flex-1 items-center disabled:opacity-60 ${failed ? 'is-failed' : ''} ${dragRatio != null ? 'is-scrubbing' : ''}`}
		>
			<span className="wa-voice-waveform-bars" aria-hidden="true">
				{items.map((height, index) => {
					// Bars use space-between: centers sit at index/(n-1), same axis as the thumb.
					const played =
						items.length <= 1 ? clamped > 0 : index / lastIndex <= clamped + 1e-6;
					const px = Math.round(4 + Number(height) * 20);
					return (
						<span
							key={index}
							className={`wa-voice-bar ${played ? (mine ? 'is-played-outgoing' : 'is-played-incoming') : 'is-unplayed'}`}
							style={{
								'--wa-bar-h': `${px}px`,
								height: `${px}px`,
							}}
						/>
					);
				})}
			</span>
			{!failed ? (
				<span
					className={`wa-voice-thumb ${mine ? 'is-outgoing' : 'is-incoming'}`}
					style={{ left: `calc(6px + (100% - 12px) * ${clamped})` }}
				/>
			) : null}
		</button>
	);
}

function VoicePlaybackRate({ value, onChange }) {
	return (
		<button
			type="button"
			onClick={event => {
				event.stopPropagation();
				onChange();
			}}
			className="wa-voice-rate shrink-0"
		>
			{value}×
		</button>
	);
}

function VoiceAvatar({ label = '?', src = '', mine = false }) {
	return (
		<div className={`wa-voice-avatar-wrap ${mine ? 'is-outgoing' : 'is-incoming'}`}>
			<Avatar label={label} size={11} src={src} className="wa-voice-avatar" />
			<span className="wa-voice-mic-badge" aria-hidden="true">
				<VoiceMicIcon />
			</span>
		</div>
	);
}

function VoiceMessageLayout({ mine, children }) {
	return <div className={`wa-voice-layout ${mine ? 'is-outgoing' : 'is-incoming'}`}>{children}</div>;
}

function assertAudioBlob(blob) {
	if (!blob) throw new Error('Empty audio');
	const type = String(blob.type || '').toLowerCase();
	if (type.includes('application/json') || type.includes('text/')) {
		throw new Error('Attachment response was not audio');
	}
	if (blob.size < 32) throw new Error('Audio too small');
	return blob;
}

// WhatsApp Web keeps exactly one voice note audible and rolls into the next note
// of the thread when one ends. Each bubble owns its own <audio>, so exclusivity
// and hand-off are coordinated here instead of by a shared player instance.
const voicePlayers = new Map();

let activeVoicePlayerToken = null;

let voicePlayerTokenSeq = 0;

function nextVoicePlayerToken() {
	voicePlayerTokenSeq += 1;
	return `wa-voice-${voicePlayerTokenSeq}`;
}

function registerVoicePlayer(token, handlers) {
	voicePlayers.set(token, handlers);
	return () => {
		voicePlayers.delete(token);
		if (activeVoicePlayerToken === token) activeVoicePlayerToken = null;
	};
}

function claimVoicePlayback(token) {
	closeVoiceDock();
	if (activeVoicePlayerToken && activeVoicePlayerToken !== token) {
		voicePlayers.get(activeVoicePlayerToken)?.pause?.();
	}
	activeVoicePlayerToken = token;
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('wa-inline-voice-play'));
	}
}

export function pauseAllVoicePlayers() {
	pauseVoiceDock();
	// Only pause voice/audio. Including `video` here made ChatVideoPlayer's onPlay
	// instantly pause itself (play → onPlay → pauseAllVoicePlayers → pause), so the
	// centre Play button looked broken.
	if (typeof document !== 'undefined') {
		document.querySelectorAll('audio').forEach(media => {
			if (!media.paused) media.pause();
		});
	}
	if (!activeVoicePlayerToken) return;
	voicePlayers.get(activeVoicePlayerToken)?.pause?.();
	activeVoicePlayerToken = null;
}

function releaseVoicePlayback(token) {
	if (activeVoicePlayerToken === token) activeVoicePlayerToken = null;
}

/** Nearest voice bubble that follows `token` in document (thread) order. */
function nextVoicePlayerAfter(token) {
	const anchor = voicePlayers.get(token)?.element?.();
	if (!anchor?.compareDocumentPosition) return null;
	let best = null;
	voicePlayers.forEach((handlers, key) => {
		if (key === token) return;
		const node = handlers.element?.();
		if (!node) return;
		if (!(anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
		if (
			!best ||
			best.node.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING
		) {
			best = { node, handlers };
		}
	});
	return best?.handlers || null;
}

export function VoiceMessage({
	url,
	attachmentId,
	mine,
	mimeType: sourceMimeType,
	fileName,
	demoAttachment = false,
	seed,
	fallbackDuration = 0,
	labels = {},
	sessionReady = true,
	downloadStatus = '',
	attachmentType = 'ptt',
	avatarLabel = '?',
	avatarSrc = '',
	onTranscribe,
	onEditAsVoice,
	onSaveToLibrary,
	onDownload,
	downloading = false,
	menuLabels = {},
	messageId = '',
	messageStatus = '',
}) {
	const audioRef = useRef(null);
	const containerRef = useRef(null);
	const objectUrlRef = useRef(null);
	const voiceBlobRef = useRef(null);
	const loadPromiseRef = useRef(null);
	const analyzedRef = useRef(false);
	const ignoreAudioErrorRef = useRef(false);
	const playGenerationRef = useRef(0);
	const pendingSeekRef = useRef(null);
	const scrubRef = useRef(null);
	const wasSessionReadyRef = useRef(sessionReady);
	const playerTokenRef = useRef(null);
	if (!playerTokenRef.current) playerTokenRef.current = nextVoicePlayerToken();
	const startPlaybackRef = useRef(null);
	// Which chat this note was playing in, for the "now playing" bar once it leaves the screen.
	const playContextRef = useRef(null);
	const dockInfoRef = useRef({});
	const [playing, setPlaying] = useState(false);
	// Outgoing: the recipient's real "played" receipt. Incoming: whether this browser
	// has listened (WhatsApp does not expose that to linked devices).
	const playedLocally = useVoicePlayed(mine ? '' : messageId);
	const played = mine ? String(messageStatus || '').toLowerCase() === 'played' : playedLocally;
	useEffect(() => {
		if (playing && !mine) markVoicePlayed(messageId);
	}, [playing, mine, messageId]);
	const [playLoading, setPlayLoading] = useState(false);
	const [loadFailed, setLoadFailed] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackUrl, setPlaybackUrl] = useState(null);
	// Shared by every voice note: the speed you last picked is the default for the next one.
	const playbackRate = useVoiceSpeed();
	const [prefetchNonce, setPrefetchNonce] = useState(0);
	const fallbackBars = useMemo(() => seededWaveform(seed, 36), [seed]);
	const [bars, setBars] = useState(fallbackBars);
	const [duration, setDuration] = useState(
		Number.isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 0,
	);
	const canFetchAttachment = demoAttachment || isPersistedAttachmentId(attachmentId);
	// Demo media and in-browser recordings never go through the converting endpoint.
	const playbackFormat = demoAttachment ? '' : voicePlaybackFormat();
	const mimeType = playbackFormat ? 'audio/mp4' : sourceMimeType;
	const isNearViewport = useNearViewport(containerRef, { rootMargin: '900px' });
	const alreadyOnDisk = String(downloadStatus || '').toLowerCase() === 'downloaded';

	useEffect(() => {
		if (Number.isFinite(fallbackDuration) && fallbackDuration > 0) {
			setDuration(current => (current > 0 ? current : fallbackDuration));
		}
	}, [fallbackDuration]);

	// Reset only when the attachment identity changes — MIME/url churn after
	// download must not revoke a live blob and fake a Retry state.
	useEffect(() => {
		setBars(fallbackBars);
		setPlaybackUrl(null);
		setCurrentTime(0);
		pendingSeekRef.current = null;
		scrubRef.current = null;
		setPlaying(false);
		setLoadFailed(false);
		setPlayLoading(false);
		voiceBlobRef.current = null;
		loadPromiseRef.current = null;
		analyzedRef.current = false;
		ignoreAudioErrorRef.current = true;
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = null;
		}
		const timer = window.setTimeout(() => {
			ignoreAudioErrorRef.current = false;
		}, 0);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- identity-only reset
	}, [attachmentId, demoAttachment]);

	useEffect(() => {
		if (sessionReady && !wasSessionReadyRef.current) {
			setLoadFailed(false);
			setPrefetchNonce(value => value + 1);
		}
		wasSessionReadyRef.current = sessionReady;
	}, [sessionReady]);

	useEffect(() => {
		const id = String(attachmentId || '');
		if (!id) return undefined;
		const onReady = event => {
			if (String(event?.detail?.attachmentId || '') !== id) return;
			forgetAttachmentBlob(id);
			voiceBlobRef.current = null;
			analyzedRef.current = false;
			setLoadFailed(false);
			setPrefetchNonce(value => value + 1);
		};
		window.addEventListener('wa-attachment-ready', onReady);
		return () => window.removeEventListener('wa-attachment-ready', onReady);
	}, [attachmentId]);

	const hydrateFromBlob = useCallback(
		async (blob, { analyze = false } = {}) => {
			if (!blob) return null;
			voiceBlobRef.current = blob;
			const reuseObjectUrl =
				objectUrlRef.current && voiceBlobRef.current === blob ? objectUrlRef.current : null;
			const prepared = await prepareVoicePlaybackFromBlob(blob, mimeType || blob.type, {
				analyze: false,
				reuseObjectUrl,
			});
			if (
				objectUrlRef.current &&
				objectUrlRef.current !== prepared.objectUrl &&
				!prepared.reused
			) {
				ignoreAudioErrorRef.current = true;
				URL.revokeObjectURL(objectUrlRef.current);
			}
			objectUrlRef.current = prepared.objectUrl;
			setPlaybackUrl(prepared.objectUrl);
			setLoadFailed(false);
			ignoreAudioErrorRef.current = false;
			if (analyze && !analyzedRef.current) {
				void (async () => {
					try {
						const refined = await prepareVoicePlaybackFromBlob(blob, mimeType || blob.type, {
							analyze: true,
							reuseObjectUrl: prepared.objectUrl,
						});
						if (isUsefulWaveform(refined.waveform)) setBars(refined.waveform);
						if (refined.duration > 0) {
							setDuration(current => (current > 0 ? current : refined.duration));
						}
						analyzedRef.current = true;
					} catch {
						/* keep seeded waveform */
					}
				})();
			}
			return prepared.objectUrl;
		},
		[mimeType],
	);

	const ensurePlaybackReady = useCallback(async ({ priority = false, analyze = false, softFail = false, preferBlob = false } = {}) => {
		const existingUrl = objectUrlRef.current;
		// Already playable — never block the spinner on waveform analysis.
		if (existingUrl && voiceBlobRef.current) {
			setPlaybackUrl(current => (current === existingUrl ? current : existingUrl));
			if (analyze && !analyzedRef.current) {
				void (async () => {
					try {
						const refined = await prepareVoicePlaybackFromBlob(
							voiceBlobRef.current,
							mimeType || voiceBlobRef.current.type,
							{ analyze: true, reuseObjectUrl: existingUrl },
						);
						if (isUsefulWaveform(refined.waveform)) setBars(refined.waveform);
						if (refined.duration > 0) {
							setDuration(current => (current > 0 ? current : refined.duration));
						}
						analyzedRef.current = true;
					} catch {
						/* analysis is best-effort — keep seeded bars */
					}
				})();
			}
			return existingUrl;
		}

		// Signed stream URLs are fine for prefetch, but a user click that already failed
		// once with the stream must go through the authenticated blob path instead.
		if (
			!preferBlob &&
			!demoAttachment &&
			isPersistedAttachmentId(attachmentId) &&
			!isLocalMediaUrl(url)
		) {
			const existingStream =
				playbackUrl && /^https?:/i.test(String(playbackUrl)) ? playbackUrl : null;
			if (existingStream) {
				return existingStream;
			}
			try {
				const streamUrl = withPlaybackFormat(await getAttachmentStreamUrl(attachmentId), playbackFormat);
				setPlaybackUrl(streamUrl);
				setLoadFailed(false);
				return streamUrl;
			} catch {
				/* fall through to the authenticated blob download */
			}
		}

		if (loadPromiseRef.current) {
			const pendingUrl = await loadPromiseRef.current.catch(() => null);
			if (objectUrlRef.current && voiceBlobRef.current) {
				if (analyze && !analyzedRef.current) {
					void ensurePlaybackReady({ analyze: true, softFail: true });
				}
				return objectUrlRef.current || pendingUrl;
			}
		}

		const run = (async () => {
			// playLoading is owned by startPlayback / toggle — never flip it here.
			// Background prefetch (softFail) and in-flight blob fetches used to clear
			// the spinner mid-click or leave it stuck across overlapping attempts.
			if (!softFail) setLoadFailed(false);
			try {
				let blob = voiceBlobRef.current;
				if (!blob) {
					const cached = canFetchAttachment
						? getCachedAttachmentBlob(attachmentId, playbackFormat)
						: null;
					if (cached) {
						blob = cached;
					}
				}
				if (!blob) {
					const fetchBlob = async () => {
						const localUrl = isLocalMediaUrl(url) ? url : null;
						if (localUrl) {
							const response = await fetch(localUrl);
							if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
							return assertAudioBlob(await response.blob());
						}
						if (canFetchAttachment) {
							let next = demoAttachment
								? await demoApi.getMedia(rawDemoId(attachmentId))
								: await requestAttachmentBlob(attachmentId, {
										timeout: priority ? 45_000 : softFail ? 25_000 : 35_000,
										priority: priority || !softFail || alreadyOnDisk,
										kind: attachmentType || 'ptt',
										format: playbackFormat,
									});
							if (
								next &&
								(!next.type ||
									String(next.type).includes('octet-stream') ||
									String(next.type).includes('application/ogg') ||
									!String(next.type).toLowerCase().startsWith('audio/'))
							) {
								next = next.slice(0, next.size, mimeType || 'audio/ogg; codecs=opus');
							}
							return assertAudioBlob(next);
						}
						if (url) {
							const response = url.startsWith('blob:')
								? await fetch(url)
								: await fetch(url, { mode: 'cors', credentials: 'omit' });
							if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
							return assertAudioBlob(await response.blob());
						}
						throw new Error('Voice message unavailable');
					};

					try {
						blob = await fetchBlob();
					} catch (firstError) {
						if (!priority) throw firstError;
						forgetAttachmentBlob(attachmentId);
						voiceBlobRef.current = null;
						await new Promise(resolve => window.setTimeout(resolve, 450));
						blob = await fetchBlob();
					}
					voiceBlobRef.current = blob;
				}

				const reuseObjectUrl =
					objectUrlRef.current && voiceBlobRef.current === blob ? objectUrlRef.current : null;
				// Create a playable URL immediately — analyze waveform in the background.
				const prepared = await prepareVoicePlaybackFromBlob(blob, mimeType || blob.type, {
					analyze: false,
					reuseObjectUrl,
				});
				if (
					objectUrlRef.current &&
					objectUrlRef.current !== prepared.objectUrl &&
					!prepared.reused
				) {
					ignoreAudioErrorRef.current = true;
					URL.revokeObjectURL(objectUrlRef.current);
				}
				objectUrlRef.current = prepared.objectUrl;
				setPlaybackUrl(prepared.objectUrl);
				setLoadFailed(false);
				ignoreAudioErrorRef.current = false;
				if (analyze && !analyzedRef.current) {
					void (async () => {
						try {
							const refined = await prepareVoicePlaybackFromBlob(blob, mimeType || blob.type, {
								analyze: true,
								reuseObjectUrl: prepared.objectUrl,
							});
							if (isUsefulWaveform(refined.waveform)) setBars(refined.waveform);
							if (refined.duration > 0) {
								setDuration(current => (current > 0 ? current : refined.duration));
							}
							analyzedRef.current = true;
						} catch {
							/* keep seeded waveform */
						}
					})();
				}
				return prepared.objectUrl;
			} catch (error) {
				if (!softFail) setLoadFailed(true);
				throw error;
			} finally {
				loadPromiseRef.current = null;
			}
		})();

		loadPromiseRef.current = run;
		return run;
	}, [
		alreadyOnDisk,
		attachmentId,
		attachmentType,
		canFetchAttachment,
		demoAttachment,
		mimeType,
		playbackFormat,
		playbackUrl,
		url,
	]);

	useEffect(() => {
		if (!isNearViewport) return undefined;
		const localUrl = isLocalMediaUrl(url) ? url : null;
		if (localUrl) {
			let cancelled = false;
			void (async () => {
				try {
					const response = await fetch(localUrl);
					if (!response.ok || cancelled) return;
					const blob = assertAudioBlob(await response.blob());
					if (cancelled) return;
					await hydrateFromBlob(blob, { analyze: true });
				} catch {
					/* durable fetch may still succeed */
				}
			})();
			return () => {
				cancelled = true;
			};
		}
		const cached = canFetchAttachment
			? getCachedAttachmentBlob(attachmentId, playbackFormat)
			: null;
		if (cached) {
			void hydrateFromBlob(cached, { analyze: true });
		}
		return undefined;
	}, [attachmentId, canFetchAttachment, hydrateFromBlob, isNearViewport, playbackFormat, url]);

	useEffect(() => {
		if (!isNearViewport) return undefined;
		if (!canFetchAttachment && !url) return undefined;
		if (!sessionReady && !alreadyOnDisk && !url) return undefined;
		if (playbackUrl && (voiceBlobRef.current || /^https?:/i.test(String(playbackUrl)))) {
			return undefined;
		}
		// Prefetch a real blob (not the signed stream). Stream URLs for ogg/opus
		// often never reach canplay and left the play button spinning.
		void ensurePlaybackReady({
			analyze: true,
			softFail: true,
			priority: true,
			preferBlob: true,
		}).catch(() => {});
		return undefined;
	}, [
		alreadyOnDisk,
		canFetchAttachment,
		ensurePlaybackReady,
		isNearViewport,
		playbackUrl,
		prefetchNonce,
		sessionReady,
		url,
	]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return undefined;
		// Keep the element src in sync without putting `src={...}` on JSX — a
		// controlled attribute re-applied on parent re-renders aborts in-flight
		// blob loads and is what made canplay never arrive.
		const next = playbackUrl || '';
		const current = audio.getAttribute('src') || '';
		if (next && current !== next) {
			ignoreAudioErrorRef.current = true;
			audio.src = next;
			window.setTimeout(() => {
				ignoreAudioErrorRef.current = false;
			}, 0);
		} else if (!next && current) {
			ignoreAudioErrorRef.current = true;
			audio.removeAttribute('src');
			audio.load();
			window.setTimeout(() => {
				ignoreAudioErrorRef.current = false;
			}, 0);
		}

		const applyDuration = value => {
			if (Number.isFinite(value) && value > 0 && value !== Infinity) {
				setDuration(currentDuration => (currentDuration > 0 ? currentDuration : value));
			}
		};

		const onTime = () => {
			const time = audio.currentTime || 0;
			setCurrentTime(time);
			if (!(audio.duration > 0 && Number.isFinite(audio.duration)) && time > 0) {
				setDuration(currentDuration => Math.max(currentDuration, Math.ceil(time)));
			}
		};
		const onEnd = () => {
			const endedAt = audio.currentTime || 0;
			if (endedAt > 0) setDuration(currentDuration => Math.max(currentDuration, endedAt));
			setPlaying(false);
			setCurrentTime(0);
			releaseVoicePlayback(playerTokenRef.current);
			nextVoicePlayerAfter(playerTokenRef.current)?.playFromStart?.();
		};
		// Another bubble claiming playback pauses this element directly.
		const onPause = () => setPlaying(false);
		const onMeta = () => applyDuration(audio.duration);
		const onError = () => {
			// Src swaps and intentional reloads set ignoreAudioErrorRef so a mid-load
			// abort does not look like a permanent failure.
			if (ignoreAudioErrorRef.current) return;
			if (!audio.error || audio.error.code === 1) return;
			setLoadFailed(true);
			setPlaying(false);
			setPlayLoading(false);
		};

		audio.addEventListener('loadedmetadata', onMeta);
		audio.addEventListener('durationchange', onMeta);
		audio.addEventListener('timeupdate', onTime);
		audio.addEventListener('ended', onEnd);
		audio.addEventListener('pause', onPause);
		audio.addEventListener('error', onError);
		if (audio.readyState >= 1) onMeta();
		return () => {
			audio.removeEventListener('loadedmetadata', onMeta);
			audio.removeEventListener('durationchange', onMeta);
			audio.removeEventListener('timeupdate', onTime);
			audio.removeEventListener('ended', onEnd);
			audio.removeEventListener('pause', onPause);
			audio.removeEventListener('error', onError);
		};
	}, [playbackUrl]);

	dockInfoRef.current = { messageId, attachmentId, duration };

	// Leaving the screen while playing (another chat, or the thread list dropping the bubble):
	// hand the playing <audio> to the "now playing" bar so it carries on. A layout cleanup runs
	// before React takes the bubble out of the page, which is what keeps the element playing.
	useLayoutEffect(
		() => () => {
			const audio = audioRef.current;
			if (!audio || audio.paused || audio.ended || !audio.currentSrc) return;
			const info = dockInfoRef.current;
			const docked = dockVoiceAudio({
				audio,
				objectUrl: objectUrlRef.current,
				context: playContextRef.current || getVoiceDockContext(),
				messageId: info.messageId,
				attachmentId: info.attachmentId,
				fallbackDuration: info.duration,
			});
			// The bar owns the blob URL now.
			if (docked) objectUrlRef.current = null;
		},
		[],
	);

	// Back on screen while the bar plays this note: carry on here from the same spot.
	useEffect(() => {
		const back = takeBackDockedVoice(messageId, attachmentId);
		if (!back) return;
		pendingSeekRef.current = back.currentTime;
		setCurrentTime(back.currentTime);
		if (back.playing) void startPlaybackRef.current?.();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the bubble mounts
	}, []);

	useEffect(
		() => () => {
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		},
		[],
	);

	// Hard stop for a spinner that somehow survives a cancelled attempt. A first
	// play can legitimately take longer while the server pulls the file from
	// WhatsApp; that fetch has its own timeout and clears the spinner itself.
	useEffect(() => {
		if (!playLoading) return undefined;
		const timer = window.setTimeout(() => {
			if (loadPromiseRef.current) return;
			setPlayLoading(false);
			setLoadFailed(true);
			ignoreAudioErrorRef.current = false;
		}, 12_000);
		return () => window.clearTimeout(timer);
	}, [playLoading]);

	const startPlayback = async ({ fromStart = false } = {}) => {
		const generation = ++playGenerationRef.current;
		const isStale = () => generation !== playGenerationRef.current;
		let didStart = false;
		setPlayLoading(true);
		setLoadFailed(false);
		try {
			const hadRealFailure = loadFailed && !voiceBlobRef.current && !objectUrlRef.current;
			if (hadRealFailure) {
				forgetAttachmentBlob(attachmentId);
				forgetAttachmentStreamUrl(attachmentId);
				voiceBlobRef.current = null;
				analyzedRef.current = false;
				ignoreAudioErrorRef.current = true;
				setPlaybackUrl(null);
			}

			const tryPlay = async readyUrl => {
				const audio = audioRef.current;
				if (!audio || !readyUrl || isStale()) return false;
				ignoreAudioErrorRef.current = true;
				// Keep React state in sync for duration/meta effects — but assign src
				// imperatively so a re-render cannot slap the old stream URL back on.
				setPlaybackUrl(current => (current === readyUrl ? current : readyUrl));
				if ((audio.getAttribute('src') || '') !== readyUrl) {
					audio.src = readyUrl;
				}
				// Blob URLs are usually ready immediately; try play() first so we do
				// not sit on a spinner waiting for canplay that a src-swap aborted.
				const kickPlay = async () => {
					const pendingSeek = pendingSeekRef.current;
					if (fromStart || pendingSeek != null) {
						try {
							audio.currentTime = fromStart ? 0 : pendingSeek;
						} catch {
							/* ignore */
						}
						pendingSeekRef.current = null;
					}
					audio.playbackRate = getVoiceSpeed();
					playContextRef.current = getVoiceDockContext();
					claimVoicePlayback(playerTokenRef.current);
					await audio.play();
				};
				try {
					if (audio.readyState >= 1) {
						await kickPlay();
					} else {
						await waitForAudioCanPlay(audio, 5_000);
						if (isStale()) return false;
						await kickPlay();
					}
				} catch (firstPlayError) {
					if (isStale()) return false;
					if (isBenignAudioPlayError(firstPlayError) && firstPlayError?.name === 'AbortError') {
						// Src/play race — one short retry after the element settles.
						await waitForAudioCanPlay(audio, 4_000);
						if (isStale()) return false;
						await kickPlay();
					} else if (audio.readyState < 2) {
						await waitForAudioCanPlay(audio, 4_000);
						if (isStale()) return false;
						await kickPlay();
					} else {
						throw firstPlayError;
					}
				}
				ignoreAudioErrorRef.current = false;
				if (isStale()) {
					audio.pause();
					return false;
				}
				didStart = true;
				setPlaying(true);
				setLoadFailed(false);
				return true;
			};

			// User click: go straight to the authenticated blob. The signed stream URL
			// is fine for images/video, but ogg/opus from it often never reaches canplay.
			let readyUrl = await ensurePlaybackReady({
				priority: true,
				analyze: true,
				preferBlob: true,
			});
			if (isStale()) return;
			try {
				if (await tryPlay(readyUrl)) return;
			} catch (blobError) {
				if (isStale()) return;
				if (isBenignAudioPlayError(blobError)) return;
				// Fall through to stream as a last resort (cached signed URL).
			}

			if (isStale()) return;
			readyUrl = await ensurePlaybackReady({ priority: true, analyze: true });
			if (isStale()) return;
			try {
				if (await tryPlay(readyUrl)) return;
			} catch (streamError) {
				if (isStale()) return;
				if (isBenignAudioPlayError(streamError)) return;
				throw streamError;
			}
			if (!isStale()) setLoadFailed(true);
		} catch (error) {
			if (isStale()) return;
			releaseVoicePlayback(playerTokenRef.current);
			setPlaying(false);
			if (!isBenignAudioPlayError(error)) {
				setLoadFailed(true);
			}
			ignoreAudioErrorRef.current = false;
		} finally {
			// Always clear the spinner for *this* attempt. Early `return`s used to leave
			// playLoading true forever, which is the stuck spinner in the screenshot.
			if (generation === playGenerationRef.current) {
				setPlayLoading(false);
				if (!didStart) ignoreAudioErrorRef.current = false;
			}
		}
	};
	startPlaybackRef.current = startPlayback;

	const toggle = async () => {
		// A second tap while loading cancels a stuck spinner instead of queuing
		// another attempt that never clears.
		if (playing || playLoading) {
			playGenerationRef.current += 1;
			audioRef.current?.pause();
			setPlaying(false);
			setPlayLoading(false);
			ignoreAudioErrorRef.current = false;
			releaseVoicePlayback(playerTokenRef.current);
			return;
		}
		await startPlayback();
	};

	useEffect(
		() =>
			registerVoicePlayer(playerTokenRef.current, {
				element: () => containerRef.current,
				pause: () => audioRef.current?.pause(),
				playFromStart: () => {
					void startPlaybackRef.current?.({ fromStart: true });
				},
			}),
		[],
	);

	const cyclePlaybackRate = () => {
		setVoiceSpeed(nextVoiceSpeed(playbackRate));
	};

	// Follow the shared speed, also when it is changed on another voice note.
	useEffect(() => {
		if (audioRef.current) audioRef.current.playbackRate = playbackRate;
	}, [playbackRate]);

	const seekToRatio = ratio => {
		if (!duration || loadFailed) return;
		const target = Math.max(0, Math.min(1, Number(ratio) || 0)) * duration;
		const audio = audioRef.current;
		if (audio && playbackUrl && audio.readyState >= 1) {
			try {
				audio.currentTime = target;
				pendingSeekRef.current = null;
			} catch {
				pendingSeekRef.current = target;
			}
		} else {
			// Not loaded yet — startPlayback applies it on the first play.
			pendingSeekRef.current = target;
		}
		setCurrentTime(target);
	};

	const seekTo = event => {
		const rect = event.currentTarget.getBoundingClientRect();
		// Waveform bars are always LTR (WhatsApp-style); do not flip seek for page RTL.
		seekToRatio(seekRatio(event.clientX, rect.left, rect.width, false));
	};

	const beginScrub = () => {
		const audio = audioRef.current;
		const wasPlaying = Boolean(audio && !audio.paused);
		scrubRef.current = { wasPlaying };
		if (wasPlaying) audio.pause();
	};

	const previewScrub = ratio => {
		if (duration > 0) setCurrentTime(Math.max(0, Math.min(1, ratio)) * duration);
	};

	const endScrub = ratio => {
		const wasPlaying = Boolean(scrubRef.current?.wasPlaying);
		scrubRef.current = null;
		seekToRatio(ratio);
		if (wasPlaying) void startPlaybackRef.current?.();
	};

	const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
	// Keep the spinner up for the whole canplay wait — a stream URL alone is not
	// enough evidence that audio is ready, and hiding it early made clicks look dead.
	const showPlaySpinner = playLoading && !playing;
	const waveformBusy = loadFailed || showPlaySpinner;
	const statusLabel = loadFailed
		? labels.tapToRetry || labels.failed || 'Tap to retry'
		: formatClock(currentTime > 0 ? currentTime : duration);

	// Same secondary actions the video bubble offers, minus the ones that only make
	// sense for a picture track.
	const menuItems = [
		typeof onEditAsVoice === 'function' && {
			key: 'edit-as-voice',
			label: menuLabels.editAsVoice || 'Edit & send as voice',
			icon: <AudioLines size={15} strokeWidth={2.1} />,
			onSelect: onEditAsVoice,
		},
		typeof onTranscribe === 'function' && {
			key: 'transcribe',
			label: menuLabels.transcribe || 'Transcribe',
			icon: <Mic size={15} strokeWidth={2.1} />,
			onSelect: onTranscribe,
		},
		typeof onSaveToLibrary === 'function' && {
			key: 'save-to-library',
			label: menuLabels.saveToLibrary || 'Save to library',
			icon: <BookmarkPlus size={15} strokeWidth={2.1} />,
			onSelect: onSaveToLibrary,
		},
		typeof onDownload === 'function' && {
			key: 'download',
			label: menuLabels.download || 'Download',
			icon: <Download size={15} strokeWidth={2.1} />,
			busy: downloading,
			onSelect: onDownload,
		},
	].filter(Boolean);

	return (
		<div
			ref={containerRef}
			className={`wa-voice-message ${mine ? 'is-outgoing' : 'is-incoming'} ${played ? 'is-played' : 'is-unplayed'} ${playing ? 'is-playing' : ''} ${loadFailed ? 'is-failed' : ''} ${showPlaySpinner ? 'is-loading' : ''}`}
		>
			<audio
				ref={audioRef}
				preload="auto"
				className="hidden"
			/>
			<VoiceMessageLayout mine={mine}>
				{mine ? <VoiceAvatar label={avatarLabel} src={avatarSrc} mine /> : null}
				<div className="wa-voice-track">
					<div className="wa-voice-track-row">
						<VoicePlaybackButton
							playing={playing}
							loading={showPlaySpinner}
							failed={loadFailed}
							onClick={() => void toggle()}
							labels={labels}
						/>
						<div className="wa-voice-main">
							<div className="wa-voice-main-row">
								<VoiceWaveform
									peaks={bars}
									progress={progress}
									mine={mine}
									loading={waveformBusy}
									failed={loadFailed}
									onSeek={seekTo}
									onScrubStart={beginScrub}
									onScrubMove={previewScrub}
									onScrubEnd={endScrub}
								/>
								{!loadFailed ? (
									<VoicePlaybackRate value={playbackRate} onChange={cyclePlaybackRate} />
								) : (
									<button
										type="button"
										className="wa-voice-retry"
										onClick={event => {
											event.stopPropagation();
											void toggle();
										}}
									>
										<RefreshCw size={11} strokeWidth={2.4} />
										<span>{labels.retry || 'Retry'}</span>
									</button>
								)}
							</div>
							<div className="wa-voice-track-meta">
								<span className={`wa-voice-duration ${loadFailed ? 'is-failed' : ''}`}>
									{statusLabel}
								</span>
								<MediaOverflowMenu
									items={menuItems}
									label={menuLabels.more || 'More'}
									iconSize={15}
									className="wa-voice-more"
								/>
							</div>
						</div>
					</div>
				</div>
				{!mine ? <VoiceAvatar label={avatarLabel} src={avatarSrc} mine={false} /> : null}
			</VoiceMessageLayout>
		</div>
	);
}

/**
 * Overflow menu for media bubbles. Shared by the video control bar and voice
 * notes so both get the same secondary actions with one implementation.
 *
 * Away-clicks are matched by attribute rather than ref containment: the video's
 * fullscreen viewer renders through a portal, so one ref cannot cover both trees
 * and the menu would close before its own click landed.
 *
 * The popup is portalled with fixed coordinates: the video frame clips its
 * overflow, so a menu opened from the top bar was invisible and taps on it
 * landed on the message above.
 */
const MEDIA_MENU_ITEM_HEIGHT = 35;

const MEDIA_MENU_MIN_WIDTH = 190;

function mediaMenuPosition(trigger, itemCount) {
	const rect = trigger.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const height = itemCount * MEDIA_MENU_ITEM_HEIGHT + 12;
	const spaceAbove = rect.top;
	const spaceBelow = vh - rect.bottom;
	const openUp = spaceAbove >= height + 8 || spaceAbove > spaceBelow;
	const rtl = getComputedStyle(trigger).direction === 'rtl';
	const maxStart = vw - 8 - MEDIA_MENU_MIN_WIDTH;
	return {
		position: 'fixed',
		zIndex: 20040,
		top: openUp ? 'auto' : rect.bottom + 8,
		bottom: openUp ? vh - rect.top + 8 : 'auto',
		left: rtl ? Math.max(8, Math.min(rect.left, maxStart)) : 'auto',
		right: rtl ? 'auto' : Math.max(8, Math.min(vw - rect.right, maxStart)),
		maxHeight: Math.max(120, (openUp ? spaceAbove : spaceBelow) - 16),
		overflowY: 'auto',
	};
}

export function MediaOverflowMenu({ items, label = 'More', iconSize = 17, className = '' }) {
	const [open, setOpen] = useState(false);
	const [menuStyle, setMenuStyle] = useState(null);
	const usable = (items || []).filter(Boolean);

	useEffect(() => {
		if (!open) return undefined;
		const onAway = event => {
			if (event.target?.closest?.('[data-wa-media-menu]')) return;
			setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		const onViewportChange = event => {
			if (event.target?.closest?.('[data-wa-media-menu]')) return;
			setOpen(false);
		};
		document.addEventListener('pointerdown', onAway, true);
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', onViewportChange);
		window.addEventListener('scroll', onViewportChange, true);
		return () => {
			document.removeEventListener('pointerdown', onAway, true);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onViewportChange);
			window.removeEventListener('scroll', onViewportChange, true);
		};
	}, [open]);

	useEffect(() => {
		if (!usable.length) setOpen(false);
	}, [usable.length]);

	if (!usable.length) return null;

	return (
		<div className={`wa-video-controls__more ${className}`} data-wa-media-menu>
			<button
				type="button"
				className="wa-video-controls__btn"
				title={label}
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={event => {
					event.preventDefault();
					event.stopPropagation();
					if (open) {
						setOpen(false);
						return;
					}
					setMenuStyle(mediaMenuPosition(event.currentTarget, usable.length));
					setOpen(true);
				}}
			>
				<MoreHorizontal size={iconSize} strokeWidth={2.2} />
			</button>
			{open && menuStyle && typeof document !== 'undefined' ? createPortal(
				<div
					className="wa-video-menu"
					role="menu"
					data-wa-media-menu
					style={menuStyle}
					onPointerDown={event => event.stopPropagation()}
					onClick={event => event.stopPropagation()}
				>
					{usable.map(item => (
						<button
							key={item.key}
							type="button"
							role="menuitem"
							className="wa-video-menu__item"
							disabled={item.busy}
							onClick={event => {
								event.preventDefault();
								event.stopPropagation();
								if (item.busy) return;
								setOpen(false);
								item.onSelect(event);
							}}
						>
							<span className="wa-video-menu__icon" aria-hidden="true">
								{item.busy ? (
									<Loader2 size={15} strokeWidth={2.2} className="animate-spin" />
								) : (
									item.icon
								)}
							</span>
							<span className="wa-video-menu__label">{item.label}</span>
						</button>
					))}
				</div>,
				document.body,
			) : null}
		</div>
	);
}
