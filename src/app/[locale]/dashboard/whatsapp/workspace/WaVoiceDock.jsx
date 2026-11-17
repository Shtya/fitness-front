'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Pause, Play, X } from 'lucide-react';
import { closeVoiceDock, seekVoiceDock, setVoiceDockRate, toggleVoiceDock, useVoiceDock } from './wa-voice-dock';
import { nextVoiceSpeed, setVoiceSpeed, useVoiceSpeed } from './wa-voice-speed';

function clock(seconds) {
	const total = Math.max(0, Math.floor(Number(seconds) || 0));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * "Now playing" bar for a voice note whose bubble is off screen. Shows at the top of the
 * window; the title opens that chat.
 */
export default function WaVoiceDock({ locale = 'en', onOpenConversation }) {
	const dock = useVoiceDock();
	const speed = useVoiceSpeed();
	const ar = locale === 'ar';

	useEffect(() => {
		if (dock) setVoiceDockRate(speed);
	}, [dock, speed]);

	// Lets other floating bars (the minimized transcription) sit below this one.
	const docked = Boolean(dock);
	useEffect(() => {
		if (typeof document === 'undefined') return undefined;
		document.body.classList.toggle('wa-has-voice-dock', docked);
		return () => document.body.classList.remove('wa-has-voice-dock');
	}, [docked]);

	if (!dock || typeof document === 'undefined') return null;
	const progress = dock.duration > 0 ? Math.min(1, dock.currentTime / dock.duration) : 0;
	const title = dock.title || (ar ? 'رسالة صوتية' : 'Voice message');

	return createPortal(
		<div className="wa-voice-dock" dir={ar ? 'rtl' : 'ltr'} role="region" aria-label={ar ? 'رسالة صوتية شغالة' : 'Voice message playing'}>
			<button
				type="button"
				className="wa-voice-dock__play"
				onClick={toggleVoiceDock}
				aria-label={dock.playing ? (ar ? 'إيقاف مؤقت' : 'Pause') : ar ? 'تشغيل' : 'Play'}
			>
				{dock.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
			</button>
			<button
				type="button"
				className="wa-voice-dock__info"
				onClick={() => dock.conversationId && onOpenConversation?.(dock.conversationId)}
				title={ar ? 'افتح المحادثة' : 'Open chat'}
			>
				<span className="wa-voice-dock__title">
					<Mic size={13} aria-hidden="true" />
					<span>{title}</span>
				</span>
				<span className="wa-voice-dock__time" dir="ltr">
					{clock(dock.currentTime)}
					{dock.duration > 0 ? ` / ${clock(dock.duration)}` : ''}
				</span>
			</button>
			<button
				type="button"
				className="wa-voice-dock__speed"
				onClick={() => setVoiceSpeed(nextVoiceSpeed(speed))}
				aria-label={ar ? 'سرعة التشغيل' : 'Playback speed'}
			>
				{speed}x
			</button>
			<button
				type="button"
				className="wa-voice-dock__close"
				onClick={closeVoiceDock}
				aria-label={ar ? 'إيقاف وإغلاق' : 'Stop and close'}
			>
				<X size={16} />
			</button>
			<span
				className="wa-voice-dock__bar"
				role="slider"
				tabIndex={-1}
				aria-label={ar ? 'موضع التشغيل' : 'Position'}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress * 100)}
				onPointerDown={event => {
					const rect = event.currentTarget.getBoundingClientRect();
					if (!rect.width) return;
					const x = (event.clientX - rect.left) / rect.width;
					seekVoiceDock(ar ? 1 - x : x);
				}}
			>
				<span className="wa-voice-dock__fill" style={{ transform: `scaleX(${progress})` }} />
			</span>
		</div>,
		document.body,
	);
}
