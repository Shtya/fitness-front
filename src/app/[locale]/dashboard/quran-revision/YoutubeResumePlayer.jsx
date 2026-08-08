'use client';

import { useEffect, useRef, useState } from 'react';

const LS_PROGRESS = 'so7ba:quran-revision:yt-progress:v1';
const RESUME_MIN_SEC = 5;
const NEAR_END_SEC = 15;
const SAVE_EVERY_MS = 4000;
/** Logical player size that nudges YouTube ABR toward 144p (API quality setters are no-ops). */
const LQ_W = 256;
const LQ_H = 144;

export function loadYtProgressMap() {
	try {
		const raw = localStorage.getItem(LS_PROGRESS);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function getYtResumeSeconds(videoId) {
	if (!videoId) return 0;
	const entry = loadYtProgressMap()[videoId];
	const sec = Math.floor(Number(entry?.seconds) || 0);
	return sec >= RESUME_MIN_SEC ? sec : 0;
}

export function saveYtProgress(videoId, seconds) {
	if (!videoId) return;
	const sec = Math.floor(Number(seconds) || 0);
	if (sec < RESUME_MIN_SEC) return;
	const map = loadYtProgressMap();
	map[videoId] = { seconds: sec, updatedAt: Date.now() };
	try {
		localStorage.setItem(LS_PROGRESS, JSON.stringify(map));
	} catch {
		/* ignore quota */
	}
}

export function clearYtProgress(videoId) {
	if (!videoId) return;
	const map = loadYtProgressMap();
	if (!(videoId in map)) return;
	delete map[videoId];
	try {
		localStorage.setItem(LS_PROGRESS, JSON.stringify(map));
	} catch {
		/* ignore */
	}
}

export function formatResumeLabel(seconds, isAr) {
	const s = Math.max(0, Math.floor(seconds || 0));
	const m = Math.floor(s / 60);
	const r = s % 60;
	const raw = `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
	if (!isAr) return raw;
	return raw.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

let ytApiPromise = null;

function loadYoutubeApi() {
	if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
	if (window.YT?.Player) return Promise.resolve(window.YT);
	if (ytApiPromise) return ytApiPromise;

	ytApiPromise = new Promise((resolve, reject) => {
		const prev = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			try { prev?.(); } catch { /* ignore */ }
			if (window.YT?.Player) resolve(window.YT);
			else reject(new Error('YT API missing'));
		};

		if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
			const tag = document.createElement('script');
			tag.src = 'https://www.youtube.com/iframe_api';
			tag.async = true;
			document.head.appendChild(tag);
		}

		if (window.YT?.Player) resolve(window.YT);
	});

	return ytApiPromise;
}

function postQualityCommand(player, quality = 'tiny') {
	try {
		const iframe = player?.getIframe?.();
		iframe?.contentWindow?.postMessage(
			JSON.stringify({
				event: 'command',
				func: 'setPlaybackQuality',
				args: [quality],
			}),
			'*',
		);
		iframe?.contentWindow?.postMessage(
			JSON.stringify({
				event: 'command',
				func: 'setPlaybackQualityRange',
				args: [quality, quality],
			}),
			'*',
		);
	} catch {
		/* cross-origin / missing */
	}
}

/**
 * YouTube embed that resumes from last localStorage position and tracks progress.
 * lowQuality: full visual size, but mounts a small logical player + scale-up so ABR stays near 144p
 * (YouTube removed working setPlaybackQuality support).
 */
export default function YoutubeResumePlayer({
	videoId,
	playing = false,
	lowQuality = false,
	title = 'YouTube',
	className = '',
	onProgress,
}) {
	const stageRef = useRef(null);
	const mountRef = useRef(null);
	const playerRef = useRef(null);
	const playingRef = useRef(playing);
	const onProgressRef = useRef(onProgress);
	const [lqScale, setLqScale] = useState(1);
	playingRef.current = playing;
	onProgressRef.current = onProgress;

	useEffect(() => {
		if (!lowQuality) return undefined;
		const stage = stageRef.current;
		if (!stage) return undefined;

		const update = () => {
			const w = stage.clientWidth || LQ_W;
			setLqScale(Math.max(1, w / LQ_W));
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(stage);
		return () => ro.disconnect();
	}, [lowQuality, videoId]);

	useEffect(() => {
		const mount = mountRef.current;
		if (!videoId || !mount) return undefined;

		let cancelled = false;
		let pollId = 0;
		const host = document.createElement('div');
		host.className = 'qr-yt-host';
		mount.innerHTML = '';
		mount.appendChild(host);

		const persist = (player, { clearIfEnded = false } = {}) => {
			try {
				const t = player?.getCurrentTime?.();
				const dur = player?.getDuration?.() || 0;
				if (typeof t !== 'number' || Number.isNaN(t)) return;
				if (clearIfEnded || (dur > 0 && t >= dur - NEAR_END_SEC)) {
					clearYtProgress(videoId);
					onProgressRef.current?.(0);
					return;
				}
				if (t >= RESUME_MIN_SEC) {
					saveYtProgress(videoId, t);
					onProgressRef.current?.(Math.floor(t));
				}
			} catch {
				/* player tearing down */
			}
		};

		const lockTiny = player => {
			if (!lowQuality || !player) return;
			try {
				if (typeof player.setPlaybackQualityRange === 'function') {
					player.setPlaybackQualityRange('tiny', 'tiny');
				}
				if (typeof player.setPlaybackQuality === 'function') {
					player.setPlaybackQuality('tiny');
				}
			} catch {
				/* no-op on modern YouTube */
			}
			postQualityCommand(player, 'tiny');
		};

		loadYoutubeApi().then(YT => {
			if (cancelled || !host.isConnected) return;

			const resumeAt = getYtResumeSeconds(videoId);
			const playerVars = {
				rel: 0,
				modestbranding: 1,
				playsinline: 1,
				controls: 1,
				enablejsapi: 1,
				autoplay: playingRef.current ? 1 : 0,
			};
			if (typeof window !== 'undefined') playerVars.origin = window.location.origin;
			if (resumeAt > 0) playerVars.start = resumeAt;
			if (lowQuality) playerVars.vq = 'tiny';

			playerRef.current = new YT.Player(host, {
				videoId,
				width: lowQuality ? LQ_W : '100%',
				height: lowQuality ? LQ_H : '100%',
				playerVars,
				events: {
					onReady: e => {
						if (cancelled) return;
						lockTiny(e.target);
						if (resumeAt > 0) {
							try { e.target.seekTo(resumeAt, true); } catch { /* ignore */ }
						}
						if (playingRef.current) {
							try { e.target.playVideo(); } catch { /* ignore */ }
						}
						onProgressRef.current?.(resumeAt);
					},
					onStateChange: e => {
						if (cancelled) return;
						if (e.data === YT.PlayerState.PLAYING) lockTiny(e.target);
						if (e.data === YT.PlayerState.BUFFERING) lockTiny(e.target);
						if (e.data === YT.PlayerState.PAUSED) persist(e.target);
						if (e.data === YT.PlayerState.ENDED) persist(e.target, { clearIfEnded: true });
					},
					onPlaybackQualityChange: e => {
						if (cancelled || !lowQuality) return;
						if (e.data && e.data !== 'tiny' && e.data !== 'small') {
							lockTiny(e.target);
						}
					},
				},
			});

			pollId = window.setInterval(() => {
				persist(playerRef.current);
				lockTiny(playerRef.current);
			}, SAVE_EVERY_MS);
		}).catch(() => {
			/* API blocked */
		});

		return () => {
			cancelled = true;
			window.clearInterval(pollId);
			persist(playerRef.current);
			try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
			playerRef.current = null;
			if (mountRef.current) mountRef.current.innerHTML = '';
		};
	}, [videoId, lowQuality]);

	useEffect(() => {
		const player = playerRef.current;
		if (!player?.playVideo || !player?.pauseVideo) return;
		try {
			if (playing) player.playVideo();
			else player.pauseVideo();
		} catch {
			/* ignore */
		}
	}, [playing]);

	return (
		<div
			className={cx(className, 'qr-yt-stage', lowQuality && 'is-lq')}
			title={title}
			ref={stageRef}
		>
			{lowQuality ? (
				<div
					className="qr-yt-lq-scaler"
					style={{
						width: LQ_W,
						height: LQ_H,
						transform: `scale(${lqScale})`,
					}}
				>
					<div ref={mountRef} className="qr-yt-mount" />
				</div>
			) : (
				<div ref={mountRef} className="qr-yt-mount is-full" />
			)}
		</div>
	);
}

function cx(...a) {
	return a.filter(Boolean).join(' ');
}
