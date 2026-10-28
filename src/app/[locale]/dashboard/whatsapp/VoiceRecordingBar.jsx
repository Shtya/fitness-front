'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, Pause, Play, Send, Trash2 } from 'lucide-react';

const LEVEL_BARS = 110;
const SUMMARY_BARS = 64;
const SAMPLE_MS = 80;
const HISTORY_LIMIT = 4000;

function formatTimer(seconds) {
	const value = Math.max(0, Number(seconds) || 0);
	return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

/** Squash the whole take into `count` bars (loudest sample per slice) for the preview wave. */
function summarize(history, count) {
	if (!history.length) return [];
	const out = [];
	const size = history.length / count;
	for (let index = 0; index < count; index += 1) {
		let peak = 0;
		const from = Math.floor(index * size);
		const to = Math.max(from + 1, Math.floor((index + 1) * size));
		for (let cursor = from; cursor < to && cursor < history.length; cursor += 1) peak = Math.max(peak, history[cursor]);
		out.push(peak);
	}
	return out;
}

/**
 * Real microphone levels for the live waveform (silence draws flat), plus the whole
 * take so far for the preview. Browsers can hand back a suspended AudioContext when it
 * is created outside a click; it then reads pure silence, so it is resumed explicitly.
 */
function useLiveLevels(stream, active) {
	const [levels, setLevels] = useState(() => Array(LEVEL_BARS).fill(0));
	const historyRef = useRef([]);
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
			analyser.fftSize = 1024;
			analyser.smoothingTimeConstant = 0.6;
			source.connect(analyser);
			analyserRef.current = analyser;
			if (context.state === 'suspended') context.resume().catch(() => {});
		} catch {
			return undefined;
		}
		return () => {
			analyserRef.current = null;
			context?.close?.().catch(() => {});
		};
	}, [stream]);

	useEffect(() => {
		if (!active) return undefined;
		const buffer = new Uint8Array(1024);
		const timer = window.setInterval(() => {
			const analyser = analyserRef.current;
			if (!analyser) return;
			analyser.getByteTimeDomainData(buffer);
			let sum = 0;
			for (let i = 0; i < buffer.length; i += 1) {
				const centered = (buffer[i] - 128) / 128;
				sum += centered * centered;
			}
			// Speech RMS rarely passes ~0.3. A square-root curve lifts quiet speech so
			// normal talking fills the bar without loud peaks clipping everything.
			const level = Math.min(1, Math.sqrt(Math.sqrt(sum / buffer.length) * 3.4));
			const shaped = level < 0.08 ? 0 : level;
			historyRef.current.push(shaped);
			if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.splice(0, historyRef.current.length - HISTORY_LIMIT);
			setLevels(current => [...current.slice(1), shaped]);
		}, SAMPLE_MS);
		return () => window.clearInterval(timer);
	}, [active]);

	return { levels, historyRef };
}

function IconButton({ className = '', label, children, ...props }) {
	return (
		<button type="button" className={`wa-vr__btn ${className}`} title={label} aria-label={label} {...props}>
			{children}
		</button>
	);
}

export function VoiceRecordingBar({
	seconds,
	paused = false,
	ready = false,
	sending = false,
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
	const live = !ready && !paused && !previewActive;
	const { levels, historyRef } = useLiveLevels(stream, live);
	// WebM from MediaRecorder starts with a placeholder duration; until the real one
	// is known, the recorded seconds are the honest total.
	const previewTotal = Number(previewDuration) >= 1 ? Number(previewDuration) : Math.max(1, Number(seconds) || 0);
	const previewRatio =
		Number(previewDuration) >= 1
			? Math.min(1, Math.max(0, Number(previewProgress) || 0))
			: Math.min(1, Math.max(0, (Number(previewCurrentTime) || 0) / previewTotal));
	const status = ready
		? labels.voiceReadyHint || labels.voiceReadyToSend || 'Ready to send'
		: previewActive
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

	// The take as a fixed-width waveform: real levels when we have them, a gentle
	// placeholder for a draft restored after a failed send.
	const summary = summarize(historyRef.current, SUMMARY_BARS);
	const takeBars = summary.length
		? summary
		: Array.from({ length: SUMMARY_BARS }, (_, index) => 0.25 + 0.35 * Math.abs(Math.sin(index * 0.7)));
	const showTake = ready || previewActive || paused;
	const playedUntil = previewActive ? previewRatio : 1;

	const stateClass = ready ? 'is-ready' : previewActive ? 'is-preview' : paused ? 'is-paused' : 'is-live';

	return (
		<div className={`wa-vr ${stateClass}`} role="group" aria-label={status} aria-busy={sending || undefined}>
			<IconButton className="is-discard" label={labels.cancelRecording} onClick={onCancel}>
				<Trash2 size={18} strokeWidth={2} aria-hidden="true" />
			</IconButton>

			<div className="wa-vr__status" role="status" aria-live="polite">
				<span className="wa-vr__dot" aria-hidden="true" />
				<span className="wa-vr__time">
					{previewActive
						? `${formatTimer(previewCurrentTime)} / ${formatTimer(previewTotal)}`
						: formatTimer(seconds)}
				</span>
				<span className="wa-vr__label">{status}</span>
			</div>

			<div className="wa-vr__stage">
				{showTake ? (
					<div className={`wa-vr__take${previewActive ? ' is-seekable' : ''}`}>
						<div className="wa-vr__bars is-take" aria-hidden="true">
							{takeBars.map((level, index) => (
								<span
									key={index}
									className={index / takeBars.length < playedUntil ? 'is-played' : ''}
									style={{ '--h': Math.max(0.12, level) }}
								/>
							))}
						</div>
						{previewActive ? (
							<>
								<span className="wa-vr__playhead" style={{ insetInlineStart: `${previewRatio * 100}%` }} aria-hidden="true" />
								<input
									type="range"
									min={0}
									max={1000}
									step={1}
									value={Math.round(previewRatio * 1000)}
									className="wa-vr__range"
									aria-label={labels.recordingPreviewSeek || 'Preview progress'}
									onChange={event => onPreviewSeek?.(Number(event.target.value) / 1000)}
									onInput={event => onPreviewSeek?.(Number(event.target.value) / 1000)}
								/>
							</>
						) : null}
					</div>
				) : (
					<div className="wa-vr__bars is-live" aria-hidden="true">
						{levels.map((level, index) => (
							<span key={index} style={{ '--h': Math.max(0.08, level) }} />
						))}
					</div>
				)}
			</div>

			{!ready && onPreview ? (
				<IconButton
					className={previewActive ? 'is-on' : ''}
					label={previewToggleTitle}
					aria-pressed={previewActive}
					onClick={onPreview}
					disabled={sending}
				>
					{previewActive && previewPlaying ? (
						<Pause size={17} strokeWidth={2.2} fill="currentColor" />
					) : previewActive ? (
						<Play size={17} strokeWidth={2.2} fill="currentColor" />
					) : (
						<Headphones size={18} strokeWidth={2} />
					)}
				</IconButton>
			) : null}

			{!ready ? (
				<IconButton
					className={`is-pause${paused ? ' is-resume' : ''}`}
					label={pauseTitle}
					onClick={paused ? onResume : onPause}
					disabled={sending}
				>
					{paused ? <Mic size={18} strokeWidth={2.2} /> : <Pause size={16} strokeWidth={2.4} fill="currentColor" />}
				</IconButton>
			) : null}

			<button
				type="button"
				className="wa-vr__send"
				title={labels.sendRecording || labels.send}
				aria-label={labels.sendRecording || labels.send}
				onClick={send}
				disabled={sending}
			>
				<Send size={19} strokeWidth={2.2} className="rtl:-scale-x-100" />
			</button>
		</div>
	);
}
