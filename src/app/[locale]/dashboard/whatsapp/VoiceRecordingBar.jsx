'use client';

import { Pause, Play, Send, X } from 'lucide-react';

const WAVE_HEIGHTS = [
	8, 18, 13, 25, 10, 31, 16, 23, 9, 15, 28, 12, 35, 18, 24, 11, 30, 14, 9, 20, 32, 16, 27, 12, 8, 23, 18, 34, 15, 26,
	10, 19, 31, 14, 22, 9, 29, 17, 24, 12, 34, 18, 27, 10, 20, 31, 15, 23, 8, 17, 28, 13, 34, 18, 24, 11, 29, 15, 22, 9,
	31, 17, 25, 12,
];

function formatTimer(seconds) {
	const value = Math.max(0, Number(seconds) || 0);
	return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function VoiceRecordingBar({
	seconds,
	paused = false,
	labels,
	onCancel,
	onPause,
	onResume,
	onSend,
	onStop,
}) {
	const send = onSend || onStop;

	return (
		<>
			<div className={`wa-recording-panel${paused ? ' is-paused' : ''}`} role="status" aria-live="polite">
				<p className="sr-only">{labels.recordingVoice}</p>
				<div className="wa-recording-mic" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="8" y="3" width="8" height="12" rx="4" />
						<path d="M5 11a7 7 0 0 0 14 0" />
						<path d="M12 18v3" />
						<path d="M9 21h6" />
					</svg>
				</div>
				<span className="wa-recording-live">
					<i className="wa-recording-live-dot" />
					{paused ? labels.recordingPaused : labels.recordingLive}
				</span>
				<div className="wa-recording-waveform" aria-hidden="true">
					{WAVE_HEIGHTS.map((height, index) => (
						<span
							key={`${height}-${index}`}
							style={{ height: `${Math.max(3, Math.round(height * 0.28))}px`, animationDelay: `${-(index % 9) * 90}ms` }}
						/>
					))}
				</div>
				<div className="wa-recording-timer">{formatTimer(seconds)}</div>
			</div>
			<div className="wa-recording-actions">
				<button
					type="button"
					className="wa-recording-cancel"
					title={labels.cancelRecording}
					aria-label={labels.cancelRecording}
					onClick={onCancel}
				>
					<X size={15} strokeWidth={2.4} aria-hidden="true" />
					<span>{labels.recordingCancel}</span>
				</button>
				<button
					type="button"
					className="wa-recording-pause"
					title={paused ? labels.recordingResume : labels.recordingPause}
					aria-label={paused ? labels.recordingResume : labels.recordingPause}
					onClick={paused ? onResume : onPause}
				>
					{paused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
					<span>{paused ? labels.recordingResume : labels.recordingPause}</span>
				</button>
				<button
					type="button"
					className="wa-recording-send"
					title={labels.sendRecording || labels.send}
					aria-label={labels.sendRecording || labels.send}
					onClick={send}
				>
					<Send size={15} />
				</button>
			</div>
		</>
	);
}
