'use client';

const WAVE_HEIGHTS = [
	8, 18, 13, 25, 10, 31, 16, 23, 9, 15, 28, 12, 35, 18, 24, 11, 30, 14, 9, 20, 32, 16, 27, 12, 8, 23, 18, 34, 15, 26,
	10, 19, 31, 14, 22, 9, 29, 17, 24, 12, 34, 18, 27, 10, 20, 31, 15, 23, 8, 17, 28, 13, 34, 18, 24, 11, 29, 15, 22, 9,
	31, 17, 25, 12,
];

function formatTimer(seconds) {
	const value = Math.max(0, Number(seconds) || 0);
	return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function VoiceRecordingBar({ seconds, labels, onCancel, onStop }) {
	return (
		<>
			<div className="wa-recording-panel" role="status" aria-live="polite">
				<div className="wa-recording-mic" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="8" y="3" width="8" height="12" rx="4" />
						<path d="M5 11a7 7 0 0 0 14 0" />
						<path d="M12 18v3" />
						<path d="M9 21h6" />
					</svg>
				</div>
				<div className="wa-recording-body">
					<div className="wa-recording-top">
						<div className="wa-recording-heading">
							<p className="wa-recording-title">{labels.recordingVoice}</p>
							<span className="wa-recording-live">
								<i className="wa-recording-live-dot" />
								{labels.recordingLive}
							</span>
						</div>
						<div className="wa-recording-timer">{formatTimer(seconds)}</div>
					</div>
					<div className="wa-recording-waveform" aria-hidden="true">
						{WAVE_HEIGHTS.map((height, index) => (
							<span
								key={`${height}-${index}`}
								style={{ height: `${Math.max(4, Math.round(height * 0.42))}px`, animationDelay: `${-(index % 9) * 90}ms` }}
							/>
						))}
					</div>
				</div>
			</div>
			<button
				type="button"
				className="wa-recording-cancel"
				title={labels.cancelRecording}
				aria-label={labels.cancelRecording}
				onClick={onCancel}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
				<span>{labels.recordingCancel}</span>
			</button>
			<button
				type="button"
				className="wa-recording-stop"
				title={labels.stopRecording}
				aria-label={labels.stopRecording}
				onClick={onStop}
			>
				<span className="wa-recording-stop-icon" />
				<span className="wa-recording-stop-label">{labels.stopRecording}</span>
			</button>
		</>
	);
}
