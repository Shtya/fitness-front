'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, BookmarkPlus, Download, Maximize2, Minimize2, Mic, Pause, Play, Volume2, VolumeX, Video, X } from 'lucide-react';
import { rememberMediaDimensions } from '../whatsapp-utils';
import { MediaOverflowMenu, formatClock, pauseAllVoicePlayers } from './WaVoiceMessage';

/** Offered playback rates. Slower than 1× is not useful for chat video. */
const PLAYBACK_SPEEDS = [1, 1.5, 2, 3];

function formatPlaybackSpeed(rate) {
	// `1.5×`, but `2×` rather than `2.0×`.
	const value = Number(rate) || 1;
	return `${Number.isInteger(value) ? value : value.toFixed(1)}×`;
}

export function ChatVideoPlayer({
	url,
	poster,
	className = '',
	selectMode = false,
	containerRef,
	onError,
	onTranscribe,
	transcribeLabel,
	onDownload,
	downloadLabel = 'Download',
	downloading = false,
	onSendAsVoice,
	sendAsVoiceLabel = 'Send as voice message',
	sendingAsVoice = false,
	onSaveToLibrary,
	saveToLibraryLabel = 'Save to library',
	moreLabel = 'More',
	durationHint = 0,
	playLabel = 'Play',
	pauseLabel = 'Pause',
	muteLabel = 'Mute',
	unmuteLabel = 'Unmute',
	expandLabel = 'Expand video',
	collapseLabel = 'Exit fullscreen',
	closeLabel = 'Close',
	speedLabel = 'Playback speed',
	aspectWidth = 0,
	aspectHeight = 0,
	cacheKey = '',
}) {
	const videoRef = useRef(null);
	const paintedUrlRef = useRef('');
	const playbackSnapshotRef = useRef({
		time: 0,
		wasPlaying: false,
		muted: false,
		volume: 1,
	});
	const seekingRef = useRef(false);
	const [playing, setPlaying] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [muted, setMuted] = useState(false);
	const [volume, setVolume] = useState(1);
	const [speed, setSpeed] = useState(1);
	const [speedOpen, setSpeedOpen] = useState(false);
	const speedRef = useRef(null);
	const [duration, setDuration] = useState(() => {
		const value = Number(durationHint);
		return Number.isFinite(value) && value > 0 ? value : 0;
	});

	useEffect(() => {
		setPlaying(false);
		setExpanded(false);
		setCurrentTime(0);
		paintedUrlRef.current = '';
		const hint = Number(durationHint);
		setDuration(Number.isFinite(hint) && hint > 0 ? hint : 0);
	}, [url, durationHint]);

	// `expanded` is a dependency because entering fullscreen mounts a second <video>,
	// which starts at the element defaults rather than at whatever the user chose.
	useEffect(() => {
		const node = videoRef.current;
		if (!node) return;
		node.muted = muted;
		node.volume = Math.min(1, Math.max(0, volume));
		node.playbackRate = speed;
	}, [muted, volume, speed, expanded]);

	useEffect(() => {
		if (!speedOpen) return undefined;
		const onPointerDown = event => {
			if (!speedRef.current?.contains(event.target)) setSpeedOpen(false);
		};
		const onKeyDown = event => {
			if (event.key === 'Escape') setSpeedOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [speedOpen]);

	useEffect(() => {
		if (!expanded) return undefined;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKeyDown = event => {
			if (event.key === 'Escape') {
				setExpanded(false);
				return;
			}
			if (event.key === ' ' || event.key === 'k' || event.key === 'K') {
				event.preventDefault();
				const node = videoRef.current;
				if (!node) return;
				if (node.paused) void node.play().catch(() => {});
				else node.pause();
			}
			if (event.key === 'm' || event.key === 'M') {
				event.preventDefault();
				setMuted(current => !current);
			}
			if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
				event.preventDefault();
				const node = videoRef.current;
				if (!node) return;
				const delta = event.key === 'ArrowRight' ? 5 : -5;
				const next = Math.min(
					Number(node.duration) || 0,
					Math.max(0, (node.currentTime || 0) + delta),
				);
				try {
					node.currentTime = next;
					setCurrentTime(next);
				} catch {
					/* ignore */
				}
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [expanded]);

	useLayoutEffect(() => {
		if (!expanded) return;
		const node = videoRef.current;
		const snap = playbackSnapshotRef.current;
		if (!node) return;
		node.muted = snap.muted;
		node.volume = snap.volume;
		const resume = () => {
			if (snap.time > 0.01) {
				try {
					node.currentTime = snap.time;
					setCurrentTime(snap.time);
				} catch {
					/* ignore */
				}
			}
			if (snap.wasPlaying) void node.play().catch(() => {});
		};
		if (node.readyState >= 1) resume();
		else node.addEventListener('loadedmetadata', resume, { once: true });
	}, [expanded]);

	useEffect(() => {
		const pauseMine = () => {
			const node = videoRef.current;
			if (node && !node.paused) node.pause();
		};
		const onOtherVideo = event => {
			if (event.detail?.node === videoRef.current) return;
			pauseMine();
		};
		window.addEventListener('wa-inline-video-play', onOtherVideo);
		window.addEventListener('wa-inline-voice-play', pauseMine);
		return () => {
			window.removeEventListener('wa-inline-video-play', onOtherVideo);
			window.removeEventListener('wa-inline-voice-play', pauseMine);
		};
	}, []);

	const knownWidth = Number(aspectWidth) || 0;
	const knownHeight = Number(aspectHeight) || 0;
	const hasReservedAspect = knownWidth > 0 && knownHeight > 0;
	const reservedRatio = hasReservedAspect
		? `${Math.round(knownWidth)} / ${Math.round(knownHeight)}`
		: '16 / 9';
	const reservedPortrait = hasReservedAspect && knownHeight > knownWidth;
	const progressMax = duration > 0 ? duration : 0;
	const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;
	const progressPercent =
		progressMax > 0 ? Math.min(100, Math.max(0, (progressValue / progressMax) * 100)) : 0;

	const applySize = node => {
		const width = Number(node?.videoWidth) || 0;
		const height = Number(node?.videoHeight) || 0;
		if (cacheKey && width > 0 && height > 0) {
			rememberMediaDimensions(cacheKey, width, height);
		}
		const stage = node?.parentElement;
		const wrap = stage?.closest?.('.wa-video-wrap') || stage?.parentElement;
		const slot = containerRef?.current;
		if (!wrap || !slot || !width || !height || hasReservedAspect || expanded) return;
		const portrait = height > width;
		const landscape = width >= height;
		const ratio = `${width} / ${height}`;
		wrap.classList.toggle('is-portrait', portrait);
		wrap.classList.toggle('is-landscape', landscape);
		wrap.style.setProperty('--wa-video-ar', ratio);
		slot.classList.toggle('is-portrait', portrait);
		slot.classList.toggle('is-landscape', landscape);
		slot.style.setProperty('--wa-video-ar', ratio);
	};

	const paintPreview = node => {
		if (!node || poster || paintedUrlRef.current === url) return;
		if (!node.paused || node.readyState < 2) return;
		const length = Number(node.duration);
		if (!Number.isFinite(length) || length <= 0) return;
		paintedUrlRef.current = url;
		try {
			if (node.currentTime < 0.04) {
				node.currentTime = Math.min(0.04, length / 50);
			}
		} catch {
			paintedUrlRef.current = '';
		}
	};

	const bindVideoNode = node => {
		const length = Number(node?.duration);
		if (Number.isFinite(length) && length > 0) setDuration(length);
		if (!seekingRef.current) {
			setCurrentTime(Number(node?.currentTime) || 0);
		}
		applySize(node);
		paintPreview(node);
	};

	const togglePlayback = event => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		if (selectMode) return;
		const node = videoRef.current;
		if (!node) return;
		if (node.paused) {
			void node.play().catch(error => {
				// A metadata seek for the poster frame can leave the element in a bad
				// readyState; one retry after load usually recovers.
				const name = String(error?.name || '');
				if (name === 'AbortError' || name === 'NotAllowedError') {
					const resume = () => {
						void node.play().catch(() => {});
					};
					if (node.readyState >= 2) resume();
					else node.addEventListener('canplay', resume, { once: true });
				}
			});
			return;
		}
		node.pause();
	};

	const toggleMute = event => {
		event.preventDefault();
		event.stopPropagation();
		if (selectMode) return;
		setMuted(current => {
			const next = !current;
			if (!next && volume <= 0.01) setVolume(0.6);
			return next;
		});
	};

	const onVolumeChange = event => {
		event.stopPropagation();
		const next = Number(event.target.value);
		if (!Number.isFinite(next)) return;
		const clamped = Math.min(1, Math.max(0, next));
		setVolume(clamped);
		setMuted(clamped <= 0.001);
	};

	const onSeekInput = event => {
		event.stopPropagation();
		const next = Number(event.target.value);
		if (!Number.isFinite(next)) return;
		seekingRef.current = true;
		setCurrentTime(next);
	};

	const onSeekCommit = event => {
		event.stopPropagation();
		const node = videoRef.current;
		const next = Number(event.target.value);
		seekingRef.current = false;
		if (!node || !Number.isFinite(next)) return;
		try {
			node.currentTime = next;
			setCurrentTime(next);
		} catch {
			/* ignore */
		}
	};

	const closeExpanded = useCallback(() => {
		const node = videoRef.current;
		playbackSnapshotRef.current = {
			time: node?.currentTime || currentTime || 0,
			wasPlaying: node ? !node.paused : playing,
			muted,
			volume,
		};
		setExpanded(false);
	}, [currentTime, muted, playing, volume]);

	const toggleExpanded = event => {
		event.preventDefault();
		event.stopPropagation();
		if (selectMode) return;
		if (expanded) {
			closeExpanded();
			return;
		}
		const node = videoRef.current;
		playbackSnapshotRef.current = {
			time: node?.currentTime || currentTime || 0,
			wasPlaying: node ? !node.paused : playing,
			muted,
			volume,
		};
		setExpanded(true);
	};

	const slotStyle = {
		aspectRatio: reservedRatio,
		'--wa-video-ar': reservedRatio,
	};

	// Secondary actions live behind a single "more" button instead of each owning a
	// permanent slot in the bar.
	const menuItems = [
		typeof onSendAsVoice === 'function' && {
			key: 'send-as-voice',
			label: sendAsVoiceLabel,
			icon: <Mic size={15} strokeWidth={2.1} />,
			busy: sendingAsVoice,
			onSelect: onSendAsVoice,
		},
		typeof onTranscribe === 'function' && {
			key: 'transcribe',
			label: transcribeLabel,
			icon: <AudioLines size={15} strokeWidth={2.1} />,
			busy: false,
			onSelect: onTranscribe,
		},
		typeof onSaveToLibrary === 'function' && {
			key: 'save-to-library',
			label: saveToLibraryLabel,
			icon: <BookmarkPlus size={15} strokeWidth={2.1} />,
			onSelect: onSaveToLibrary,
		},
		typeof onDownload === 'function' && {
			key: 'download',
			label: downloadLabel,
			icon: <Download size={15} strokeWidth={2.1} />,
			busy: downloading,
			onSelect: onDownload,
		},
	].filter(Boolean);

	const renderControls = fullscreen => (
		<div
			className={`wa-video-controls ${fullscreen ? 'is-expanded' : ''}`}
			onClick={event => event.stopPropagation()}
			onPointerDown={event => event.stopPropagation()}
		>
			<button
				type="button"
				className="wa-video-controls__btn wa-video-controls__btn--play"
				aria-label={playing ? pauseLabel : playLabel}
				title={playing ? pauseLabel : playLabel}
				onClick={togglePlayback}
			>
				{playing ? (
					<Pause size={fullscreen ? 19 : 17} strokeWidth={2.2} fill="currentColor" />
				) : (
					<Play
						size={fullscreen ? 19 : 17}
						strokeWidth={2.2}
						fill="currentColor"
						className="ms-px"
					/>
				)}
			</button>
			<span className="wa-video-controls__time" aria-hidden="true">
				{formatClock(currentTime)}
				<span className="wa-video-controls__time-sep">/</span>
				{formatClock(duration)}
			</span>
			<div className="wa-video-controls__seek-wrap">
				<input
					type="range"
					className="wa-video-controls__seek"
					min={0}
					max={progressMax || 0}
					step={0.05}
					value={progressValue}
					disabled={progressMax <= 0}
					aria-label="Seek"
					style={{ '--wa-video-progress': `${progressPercent}%` }}
					onChange={onSeekInput}
					onInput={onSeekInput}
					onMouseUp={onSeekCommit}
					onTouchEnd={onSeekCommit}
					onKeyUp={onSeekCommit}
					onBlur={onSeekCommit}
				/>
			</div>
			{/* Volume slider stays collapsed until the speaker is hovered or focused,
			    so the resting bar is play · time · seek · volume · more · fullscreen. */}
			<div className="wa-video-controls__volume">
				<button
					type="button"
					className="wa-video-controls__btn"
					aria-label={muted || volume <= 0.001 ? unmuteLabel : muteLabel}
					title={muted || volume <= 0.001 ? unmuteLabel : muteLabel}
					aria-pressed={!(muted || volume <= 0.001)}
					onClick={toggleMute}
				>
					{muted || volume <= 0.001 ? (
						<VolumeX size={fullscreen ? 19 : 17} strokeWidth={2.2} />
					) : (
						<Volume2 size={fullscreen ? 19 : 17} strokeWidth={2.2} />
					)}
				</button>
				{/* Floats above the speaker rather than expanding beside it, so the
				    control bar keeps its width and the slider never covers the seek bar. */}
				<div className="wa-video-controls__volume-panel">
					<input
						type="range"
						className="wa-video-controls__volume-slider"
						min={0}
						max={1}
						step={0.01}
						value={muted ? 0 : volume}
						aria-label="Volume"
						aria-orientation="vertical"
						style={{
							'--wa-video-volume': `${Math.round((muted ? 0 : volume) * 100)}%`,
						}}
						onChange={onVolumeChange}
						onInput={onVolumeChange}
					/>
				</div>
			</div>
			{/* Playback rate sits with the other playback controls. The label doubles as
			    the current value, so the chosen speed is readable without opening it. */}
			<div className="wa-video-controls__speed" ref={speedRef}>
				<button
					type="button"
					className="wa-video-controls__btn wa-video-controls__btn--speed"
					aria-label={speedLabel}
					title={speedLabel}
					aria-haspopup="true"
					aria-expanded={speedOpen}
					onClick={() => setSpeedOpen(current => !current)}
				>
					{formatPlaybackSpeed(speed)}
				</button>
				{speedOpen ? (
					<div className="wa-video-speed-menu" role="menu">
						{PLAYBACK_SPEEDS.map(step => (
							<button
								key={step}
								type="button"
								role="menuitemradio"
								aria-checked={step === speed}
								className={`wa-video-speed-option ${step === speed ? 'is-active' : ''}`}
								onClick={() => {
									setSpeed(step);
									setSpeedOpen(false);
								}}
							>
								{formatPlaybackSpeed(step)}
							</button>
						))}
					</div>
				) : null}
			</div>
			{/* Fullscreen keeps these in the bar, where there is room for them. */}
			{fullscreen ? renderChromeActions(true) : null}
		</div>
	);

	// "More" and fullscreen are not playback controls, so inline they float over the
	// top corner instead of crowding the timeline row.
	const renderChromeActions = fullscreen => (
		<>
			<MediaOverflowMenu
				items={menuItems}
				label={moreLabel}
				iconSize={fullscreen ? 19 : 17}
			/>
			<button
				type="button"
				className="wa-video-controls__btn"
				title={fullscreen ? collapseLabel : expandLabel}
				aria-label={fullscreen ? collapseLabel : expandLabel}
				aria-pressed={fullscreen}
				onClick={toggleExpanded}
			>
				{fullscreen ? (
					<Minimize2 size={fullscreen ? 19 : 17} strokeWidth={2.2} />
				) : (
					<Maximize2 size={fullscreen ? 19 : 17} strokeWidth={2.2} />
				)}
			</button>
		</>
	);

	const renderVideoWrap = fullscreen => (
		<div
			className={`wa-video-wrap ${playing ? 'is-playing' : 'is-paused'} ${
				!playing && currentTime < 0.05 && !fullscreen ? 'is-fresh' : ''
			} ${
				fullscreen ? 'is-expanded' : ''
			} ${hasReservedAspect ? (reservedPortrait ? 'is-portrait' : 'is-landscape') : ''} ${
				selectMode ? 'pointer-events-none' : ''
			}`}
			style={fullscreen ? undefined : slotStyle}
			role={fullscreen ? 'dialog' : undefined}
			aria-modal={fullscreen ? 'true' : undefined}
			aria-label={fullscreen ? expandLabel : undefined}
			onClick={event => event.stopPropagation()}
		>
			{fullscreen ? (
				<div className="wa-video-viewer-chrome">
					<button
						type="button"
						className="wa-video-viewer-close"
						aria-label={closeLabel}
						title={closeLabel}
						onClick={toggleExpanded}
					>
						<X size={22} strokeWidth={2.2} />
					</button>
				</div>
			) : null}
			<div className="wa-video-stage">
				<video
					ref={videoRef}
					key={url}
					controls={false}
					controlsList="nodownload nofullscreen noremoteplayback"
					disablePictureInPicture
					playsInline
					// `auto` had every near-viewport video pulling its whole file at once,
					// starving the images on screen. Metadata is enough for poster+duration.
					preload="metadata"
					poster={poster || undefined}
					src={url}
					className="wa-video-asset"
					onLoadedMetadata={event => bindVideoNode(event.currentTarget)}
					onLoadedData={event => paintPreview(event.currentTarget)}
					onDurationChange={event => {
						const length = Number(event.currentTarget.duration);
						if (Number.isFinite(length) && length > 0) setDuration(length);
					}}
					onTimeUpdate={event => {
						if (seekingRef.current) return;
						setCurrentTime(Number(event.currentTarget.currentTime) || 0);
					}}
					onPlay={event => {
						setPlaying(true);
						pauseAllVoicePlayers();
						window.dispatchEvent(
							new CustomEvent('wa-inline-video-play', {
								detail: { node: event.currentTarget },
							}),
						);
					}}
					onPause={() => setPlaying(false)}
					onEnded={event => {
						setPlaying(false);
						try {
							event.currentTarget.currentTime = 0;
							setCurrentTime(0);
						} catch {
							/* ignore */
						}
					}}
					onClick={togglePlayback}
					onError={onError}
				/>
			</div>
			{!selectMode && !fullscreen ? (
				<div
					className="wa-video-topbar"
					onClick={event => event.stopPropagation()}
					onPointerDown={event => event.stopPropagation()}
				>
					{renderChromeActions(false)}
				</div>
			) : null}
			{!selectMode && !playing ? (
				<button
					type="button"
					className="wa-video-play"
					data-wa-press-surface
					aria-label={playLabel}
					onClick={togglePlayback}
				>
					<span className="wa-video-play__icon" aria-hidden="true">
						<Play size={24} strokeWidth={2.2} fill="currentColor" className="ms-0.5" />
					</span>
				</button>
			) : null}
			{!selectMode && !playing && currentTime < 0.05 && !fullscreen && duration > 0 ? (
				<span className="wa-video-chip" aria-hidden="true">
					<Video size={13} strokeWidth={2.4} />
					{formatClock(duration)}
				</span>
			) : null}
			{!selectMode ? renderControls(fullscreen) : null}
		</div>
	);

	return (
		<>
			<div
				ref={containerRef}
				className={`wa-video-slot ${expanded ? 'is-expanded-open' : ''} ${
					hasReservedAspect ? (reservedPortrait ? 'is-portrait' : 'is-landscape') : ''
				} ${className}`}
				style={slotStyle}
			>
				{!expanded ? renderVideoWrap(false) : null}
				{expanded ? (
					<div className="wa-video-slot-spacer" style={slotStyle} aria-hidden="true" />
				) : null}
			</div>
			{expanded && typeof document !== 'undefined'
				? createPortal(
						<div className="wa-video-viewer-root" role="presentation">
							<div
								className="wa-video-viewer-backdrop"
								aria-hidden="true"
								onClick={closeExpanded}
							/>
							{renderVideoWrap(true)}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
