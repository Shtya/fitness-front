'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const BAR_COUNT = 52;

function seededWaveform(seed = '', count = BAR_COUNT) {
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	const bars = [];
	for (let i = 0; i < count; i += 1) {
		hash = (hash * 1103515245 + 12345) >>> 0;
		bars.push(0.28 + (((hash >>> 8) % 100) / 100) * 0.72);
	}
	return bars;
}

function waveformPeaksFromAudioBuffer(audioBuffer, count = BAR_COUNT) {
	const channel = audioBuffer?.getChannelData?.(0);
	if (!channel?.length) return [];
	const blockSize = Math.max(1, Math.floor(channel.length / count));
	const peaks = [];
	for (let index = 0; index < count; index += 1) {
		const start = index * blockSize;
		const end = Math.min(channel.length, start + blockSize);
		let peak = 0;
		for (let cursor = start; cursor < end; cursor += 1) {
			peak = Math.max(peak, Math.abs(channel[cursor]));
		}
		peaks.push(peak);
	}
	const maxPeak = Math.max(...peaks, 0.001);
	return peaks.map(peak => Math.max(0.18, Math.min(1, peak / maxPeak)));
}

function formatClock(seconds) {
	const value = Math.max(0, Math.floor(Number(seconds) || 0));
	const mm = Math.floor(value / 60);
	const ss = String(value % 60).padStart(2, '0');
	return `${mm}:${ss}`;
}

export default function TranscriptVoicePlayer({ src, seed = '' }) {
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(0);
	const [current, setCurrent] = useState(0);
	const fallbackPeaks = useMemo(() => seededWaveform(src || seed, BAR_COUNT), [src, seed]);
	const [peaks, setPeaks] = useState(fallbackPeaks);

	useEffect(() => {
		setPeaks(fallbackPeaks);
	}, [fallbackPeaks]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !src) return undefined;

		const sync = () => {
			const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
			setDuration(nextDuration);
			setCurrent(audio.currentTime || 0);
			setProgress(nextDuration > 0 ? audio.currentTime / nextDuration : 0);
			setPlaying(!audio.paused && !audio.ended);
		};

		const onEnded = () => {
			setPlaying(false);
			setProgress(0);
			setCurrent(0);
		};

		audio.addEventListener('timeupdate', sync);
		audio.addEventListener('loadedmetadata', sync);
		audio.addEventListener('durationchange', sync);
		audio.addEventListener('play', sync);
		audio.addEventListener('pause', sync);
		audio.addEventListener('ended', onEnded);
		return () => {
			audio.removeEventListener('timeupdate', sync);
			audio.removeEventListener('loadedmetadata', sync);
			audio.removeEventListener('durationchange', sync);
			audio.removeEventListener('play', sync);
			audio.removeEventListener('pause', sync);
			audio.removeEventListener('ended', onEnded);
		};
	}, [src]);

	useEffect(() => {
		if (!src) return undefined;
		let cancelled = false;
		const controller = new AbortController();

		(async () => {
			try {
				const response = await fetch(src, { signal: controller.signal });
				const buffer = await response.arrayBuffer();
				const AudioCtx = window.AudioContext || window.webkitAudioContext;
				if (!AudioCtx) return;
				const context = new AudioCtx();
				try {
					const decoded = await context.decodeAudioData(buffer.slice(0));
					const next = waveformPeaksFromAudioBuffer(decoded, BAR_COUNT);
					if (!cancelled && next.length) setPeaks(next);
				} finally {
					await context.close();
				}
			} catch {
				// Keep the seeded waveform if decode is blocked or aborted.
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [src]);

	const seek = event => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
		audio.currentTime = ratio * audio.duration;
		setProgress(ratio);
		setCurrent(audio.currentTime);
	};

	const toggle = async () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (!audio.paused) {
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
	};

	return (
		<div className="transcript-voice-player" dir="ltr">
			<audio ref={audioRef} src={src} preload="metadata" />
			<button
				type="button"
				onClick={toggle}
				aria-label={playing ? 'Pause voice message' : 'Play voice message'}
				className={`wa-voice-play ${playing ? 'is-playing' : ''}`}
			>
				{playing ? (
					<svg className="wa-voice-play-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M7 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 0h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
						/>
					</svg>
				) : (
					<svg className="wa-voice-play-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
						<path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.06-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
					</svg>
				)}
			</button>
			<button
				type="button"
				onClick={seek}
				aria-label="Seek voice message"
				className="wa-voice-waveform relative flex min-w-0 flex-1 items-center"
			>
				<span className="wa-voice-waveform-bars" aria-hidden="true">
					{peaks.map((height, index) => {
						const played = peaks.length > 0 && (index + 0.5) / peaks.length <= progress;
						return (
							<span
								key={index}
								className={`wa-voice-bar ${played ? 'is-played-incoming' : 'is-unplayed'} ${
									playing ? 'is-shake' : ''
								}`}
								style={{
									height: `${Math.round(8 + height * 22)}px`,
									animationDelay: `${(index % 8) * 70}ms`,
								}}
							/>
						);
					})}
				</span>
				{progress > 0.01 ? (
					<span className="wa-voice-thumb is-incoming" style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
				) : null}
			</button>
			<span className="wa-voice-duration">{formatClock(playing || current > 0 ? current : duration)}</span>
		</div>
	);
}
