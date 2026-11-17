'use client';

import { useSyncExternalStore } from 'react';

/*
 * Voice note that keeps playing after its bubble leaves the screen (you open another chat,
 * or the thread list drops it while scrolling), like WhatsApp's "now playing" bar.
 *
 * The bubble hands its own <audio> element over before React removes it: the element is
 * moved under <body> in the same task, so the browser never pauses it (a media element is
 * only paused when it is still out of the document once the task ends). The bar at the top
 * reads its state from here; coming back to the bubble takes the playback back.
 */

let dock = null; // { audio, objectUrl, conversationId, messageId, attachmentId, title, playing, currentTime, duration }
let snapshot = null;
const listeners = new Set();
let detachAudio = null;

// The chat on screen right now; a bubble snapshots it when it starts playing.
let currentContext = { conversationId: '', title: '' };

function emit() {
	snapshot = dock
		? {
				conversationId: dock.conversationId,
				messageId: dock.messageId,
				attachmentId: dock.attachmentId,
				title: dock.title,
				playing: dock.playing,
				currentTime: dock.currentTime,
				duration: dock.duration,
			}
		: null;
	listeners.forEach(listener => listener());
}

export function setVoiceDockContext(context) {
	currentContext = {
		conversationId: String(context?.conversationId || ''),
		title: String(context?.title || ''),
	};
}

export function getVoiceDockContext() {
	return currentContext;
}

/**
 * Take over a playing <audio>. Call it while the element is still in the document (a
 * layout-effect cleanup), so moving it keeps it playing.
 */
export function dockVoiceAudio({ audio, objectUrl = null, context, messageId = '', attachmentId = '', fallbackDuration = 0 }) {
	if (!audio || typeof document === 'undefined') return false;
	closeVoiceDock();
	document.body.appendChild(audio);
	const durationOf = () =>
		Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number(fallbackDuration) || 0;
	dock = {
		audio,
		objectUrl,
		conversationId: String(context?.conversationId || ''),
		title: String(context?.title || ''),
		messageId: String(messageId || ''),
		attachmentId: String(attachmentId || ''),
		playing: !audio.paused,
		currentTime: audio.currentTime || 0,
		duration: durationOf(),
	};
	const onTime = () => {
		if (!dock || dock.audio !== audio) return;
		dock.currentTime = audio.currentTime || 0;
		dock.duration = durationOf();
		emit();
	};
	const onPlay = () => {
		if (!dock || dock.audio !== audio) return;
		dock.playing = true;
		emit();
	};
	const onPause = () => {
		if (!dock || dock.audio !== audio) return;
		dock.playing = false;
		emit();
	};
	const onEnded = () => closeVoiceDock();
	audio.addEventListener('timeupdate', onTime);
	audio.addEventListener('durationchange', onTime);
	audio.addEventListener('play', onPlay);
	audio.addEventListener('pause', onPause);
	audio.addEventListener('ended', onEnded);
	audio.addEventListener('error', onEnded);
	detachAudio = () => {
		audio.removeEventListener('timeupdate', onTime);
		audio.removeEventListener('durationchange', onTime);
		audio.removeEventListener('play', onPlay);
		audio.removeEventListener('pause', onPause);
		audio.removeEventListener('ended', onEnded);
		audio.removeEventListener('error', onEnded);
	};
	emit();
	return true;
}

/** Stop and drop the docked voice note. */
export function closeVoiceDock() {
	if (!dock) return;
	const { audio, objectUrl } = dock;
	detachAudio?.();
	detachAudio = null;
	dock = null;
	try {
		audio.pause();
	} catch {
		/* ignore */
	}
	audio.remove();
	if (objectUrl) {
		try {
			URL.revokeObjectURL(objectUrl);
		} catch {
			/* ignore */
		}
	}
	emit();
}

/**
 * The bubble for this voice note is back on screen: hand the position back (and stop the
 * docked copy) so the bubble carries on from there. Returns null when it is not docked.
 */
export function takeBackDockedVoice(messageId, attachmentId) {
	if (!dock) return null;
	const sameMessage = messageId && dock.messageId === String(messageId);
	const sameAttachment = attachmentId && dock.attachmentId === String(attachmentId);
	if (!sameMessage && !sameAttachment) return null;
	const handBack = { currentTime: dock.audio.currentTime || 0, playing: !dock.audio.paused };
	closeVoiceDock();
	return handBack;
}

export function isVoiceDocked() {
	return Boolean(dock);
}

export function toggleVoiceDock() {
	if (!dock) return;
	if (dock.audio.paused) void dock.audio.play().catch(() => undefined);
	else dock.audio.pause();
}

export function seekVoiceDock(ratio) {
	if (!dock) return;
	const duration = dock.duration;
	if (!(duration > 0)) return;
	try {
		dock.audio.currentTime = Math.max(0, Math.min(duration, ratio * duration));
	} catch {
		/* ignore */
	}
}

export function setVoiceDockRate(rate) {
	if (dock) dock.audio.playbackRate = rate;
}

export function pauseVoiceDock() {
	if (dock && !dock.audio.paused) dock.audio.pause();
}

function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useVoiceDock() {
	return useSyncExternalStore(
		subscribe,
		() => snapshot,
		() => null,
	);
}
