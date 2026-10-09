'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play, Send, Trash2 } from 'lucide-react';

const LEVEL_BARS = 44;
const SAMPLE_MS = 90;

function formatTimer(seconds) {
	const value = Math.max(0, Number(seconds) || 0);
	return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

/**
 * Real microphone levels for the live waveform. The bars used to be a fixed pattern
 * that kept bouncing even when the mic picked up nothing; now silence draws flat.
 */
function useLiveLevels(stream, active) {
	const [levels, setLevels] = useState(() => Array(LEVEL_BARS).fill(0));
	const contextRef = useRef(null);
	const analyserRef = useRef(null);

	useEffect(() => {
		if (!stream || typeof window === 'undefined') return undefined;
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtx) return undefined;
		let context;
		try {
			context = new AudioCtx();
			const source = context.createMediaStreamSource(stream);
			const analyser = context.createAnalyser();
			analyser.fftSize = 512;
			source.connect(analyser);
			contextRef.current = context;
			analyserRef.current = analyser;
		} catch {
			return undefined;
		}
		return () => {
			analyserRef.current = null;
			contextRef.current = null;
			context?.close?.().catch(() => {});
		};
	}, [stream]);

	useEffect(() => {
		if (!active) return undefined;
		const buffer = new Uint8Array(512);
		const timer = window.setInterval(() => {
			const analyser = analyserRef.current;
			if (!analyser) return;
			analyser.getByteTimeDomainData(buffer);
			let sum = 0;
			for (let i = 0; i < buffer.length; i += 1) {
				const centered = (buffer[i] - 128) / 128;
				sum += centered * centered;
			}
			// Speech RMS rarely passes ~0.3; scale so normal talking fills the bar.
			const level = Math.min(1, Math.sqrt(sum / buffer.length) * 3.2);
			setLevels(current => [...current.slice(1), level]);
		}, SAMPLE_MS);
		return () => window.clearInterval(timer);
	}, [active]);

	return levels;
}

export function VoiceRecordingBar({
	seconds,
	paused = false,
	labels,
	stream = null,
	onCancel,
	onPause,
	onResume,
	onPreview,
	previewActive = false,
	previewPlaying = false,
	previewProgress = 0,
	previewCurrentTime = 0,
	previewDuration = 0,
	onPreviewSeek,
	onSend,
	onStop,
}) {
	const send = onSend || onStop;
	const levels = useLiveLevels(stream, !paused && !previewActive);
	// WebM from MediaRecorder starts with a placeholder duration; until the real one
	// is known, the recorded seconds are the honest total.
	const previewTotal = Number(previewDuration) >= 1 ? Number(previewDuration) : Math.max(1, Number(seconds) || 0);
	const previewRatio =
		Number(previewDuration) >= 1
			? Math.min(1, Math.max(0, Number(previewProgress) || 0))
			: Math.min(1, Math.max(0, (Number(previewCurrentTime) || 0) / previewTotal));
	const status = previewActive
		? previewPlaying
			? labels.recordingPreviewPlaying || 'Playing'
			: labels.recordingPreviewPaused || labels.recordingPreviewMode || 'Preview'
		: paused
			? labels.recordingPaused || 'Paused'
			: labels.recordingVoice || 'Recording';
	const previewToggleTitle = previewActive
		? previewPlaying
			? labels.recordingPreviewPause || labels.recordingPause
			: labels.recordingPreviewResume || labels.recordingResume
		: labels.recordingPreview;
	const pauseTitle = paused ? labels.recordingResume : labels.recordingPause;

	return (
		<div
			className={`wa-ui-rec${paused ? ' is-paused' : ''}${previewActive ? ' is-preview' : ''}`}
			role="group"
			aria-label={labels.recordingVoice}
		>
			<button
				type="button"
				className="wa-ui-icon-btn wa-ui-rec__discard"
				title={labels.cancelRecording}
				aria-label={labels.cancelRecording}
				onClick={onCancel}
			>
				<Trash2 size={19} strokeWidth={1.9} aria-hidden="true" />
			</button>

			<div className="wa-ui-rec__status" role="status" aria-live="polite">
				<span className="wa-ui-rec__dot" aria-hidden="true" />
				<span className="wa-ui-rec__time">
					{previewActive
						? `${formatTimer(previewCurrentTime)} / ${formatTimer(previewTotal)}`
						: formatTimer(seconds)}
				</span>
				<span className="sr-only">{status}</span>
			</div>

			{previewActive ? (
				<div className="wa-ui-rec__track">
					<div className="wa-ui-rec__track-fill" style={{ width: `${previewRatio * 100}%` }} />
					<input
						type="range"
						min={0}
						max={1000}
						step={1}
						value={Math.round(previewRatio * 1000)}
						className="wa-ui-rec__range"
						aria-label={labels.recordingPreviewSeek || 'Preview progress'}
						onChange={event => onPreviewSeek?.(Number(event.target.value) / 1000)}
						onInput={event => onPreviewSeek?.(Number(event.target.value) / 1000)}
					/>
				</div>
			) : (
				<div className="wa-ui-rec__wave" aria-hidden="true">
					{levels.map((level, index) => (
						<span key={index} style={{ height: `${Math.max(3, Math.round(level * 26))}px` }} />
					))}
				</div>
			)}

			{onPreview ? (
				<button
					type="button"
					className={`wa-ui-icon-btn${previewActive ? ' is-on' : ''}`}
					title={previewToggleTitle}
					aria-label={previewToggleTitle}
					aria-pressed={previewActive}
					onClick={onPreview}
				>
					{previewActive && previewPlaying ? (
						<Pause size={18} strokeWidth={2} />
					) : previewActive ? (
						<Play size={18} strokeWidth={2} />
					) : (
						<Headphones size={18} strokeWidth={1.9} />
					)}
				</button>
			) : null}

			<button
				type="button"
				className="wa-ui-icon-btn wa-ui-rec__pause"
				title={pauseTitle}
				aria-label={pauseTitle}
				onClick={paused ? onResume : onPause}
			>
				{paused ? (
					<span className="wa-ui-rec__resume-dot" aria-hidden="true" />
				) : (
					<Pause size={18} strokeWidth={2} fill="currentColor" />
				)}
			</button>

			<button
				type="button"
				className="wa-ui-rec__send"
				title={labels.sendRecording || labels.send}
				aria-label={labels.sendRecording || labels.send}
				onClick={send}
			>
				<Send size={18} strokeWidth={2} className="rtl:-scale-x-100" />
			</button>
		</div>
	);
}
