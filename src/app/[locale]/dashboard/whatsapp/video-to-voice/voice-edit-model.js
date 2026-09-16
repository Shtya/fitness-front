/**
 * Pure state maths for the video → voice mini editor.
 *
 * Kept out of the component so the trim clamping and payload shaping can be
 * tested without a DOM, and so the same rules cannot drift between the slider
 * handles and the numeric time inputs.
 */

/** Mirrors VOICE_EDIT_MAX_SECONDS on the server (WhatsApp PTT ceiling). */
export const MAX_VOICE_SECONDS = 299;
export const MIN_SELECTION_SECONDS = 1;
export const MIN_GAIN = 0.25;
export const MAX_GAIN = 3;

export const DEFAULT_EDIT_STATE = {
	start: 0,
	end: null,
	gain: 1,
	removeBackgroundMusic: false,
	noiseReduction: false,
	voiceEnhancement: false,
};

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function round(value) {
	return Math.round(Number(value) * 100) / 100;
}

/** `mm:ss`, or `h:mm:ss` past an hour. */
export function formatClock(seconds) {
	const total = Math.max(0, Math.floor(Number(seconds) || 0));
	const secs = String(total % 60).padStart(2, '0');
	const mins = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);
	if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${secs}`;
	return `${mins}:${secs}`;
}

/** Accepts `45`, `1:23` or `1:02:03`. Returns null when unparseable. */
export function parseClock(text) {
	const raw = String(text ?? '').trim();
	if (!raw) return null;
	const parts = raw.split(':');
	if (parts.length > 3 || parts.some((part) => part !== '' && !/^\d+(\.\d+)?$/.test(part))) {
		return null;
	}
	const numbers = parts.map((part) => (part === '' ? 0 : Number(part)));
	if (numbers.some((value) => !Number.isFinite(value))) return null;
	const seconds = numbers.reduce((total, value) => total * 60 + value, 0);
	return Number.isFinite(seconds) ? seconds : null;
}

/** Effective end of the selection when `end` is left open. */
export function resolveEnd(state, sourceSeconds) {
	const source = Number(sourceSeconds) || 0;
	if (state.end != null) return clamp(state.end, 0, source);
	return Math.min(source, state.start + MAX_VOICE_SECONDS);
}

export function selectionSeconds(state, sourceSeconds) {
	return round(Math.max(0, resolveEnd(state, sourceSeconds) - state.start));
}

/**
 * Moves one trim handle while keeping the window legal.
 *
 * The moving handle is the one that gets clamped — the opposite edge never
 * shifts on its own, so dragging never feels like it is fighting the user.
 */
export function moveTrimHandle(state, sourceSeconds, edge, nextValue) {
	const source = Number(sourceSeconds) || 0;
	const value = Number(nextValue);
	if (!Number.isFinite(value) || source <= 0) return state;
	const end = resolveEnd(state, source);

	if (edge === 'start') {
		const lowest = Math.max(0, end - MAX_VOICE_SECONDS);
		const highest = Math.max(lowest, end - MIN_SELECTION_SECONDS);
		return { ...state, start: round(clamp(value, lowest, highest)) };
	}

	const lowest = Math.min(source, state.start + MIN_SELECTION_SECONDS);
	const highest = Math.min(source, state.start + MAX_VOICE_SECONDS);
	const nextEnd = round(clamp(value, lowest, highest));
	// Snapping back to `null` at the far edge keeps "whole clip" as the default so
	// the request stays untrimmed when the user never touched the handles.
	return { ...state, end: nextEnd >= source ? null : nextEnd };
}

/** Full-clip default, clipped to the PTT ceiling for long videos. */
export function initialEditState(sourceSeconds) {
	const source = Number(sourceSeconds) || 0;
	if (source > MAX_VOICE_SECONDS) {
		return { ...DEFAULT_EDIT_STATE, end: MAX_VOICE_SECONDS };
	}
	return { ...DEFAULT_EDIT_STATE };
}

export function setGain(state, nextGain) {
	const value = Number(nextGain);
	if (!Number.isFinite(value)) return state;
	return { ...state, gain: round(clamp(value, MIN_GAIN, MAX_GAIN)) };
}

/** `1` → `100%`; used as the volume readout. */
export function gainPercentLabel(gain) {
	return `${Math.round((Number(gain) || 1) * 100)}%`;
}

export function isDefaultEditState(state, sourceSeconds) {
	const baseline = initialEditState(sourceSeconds);
	return (
		state.start === baseline.start &&
		state.end === baseline.end &&
		state.gain === baseline.gain &&
		!state.removeBackgroundMusic &&
		!state.noiseReduction &&
		!state.voiceEnhancement
	);
}

/** Request body for both the preview and the send endpoints. */
export function buildEditPayload(state, sourceSeconds) {
	const source = Number(sourceSeconds) || 0;
	const payload = {
		startSeconds: round(state.start),
		gain: round(state.gain),
		removeBackgroundMusic: Boolean(state.removeBackgroundMusic),
		noiseReduction: Boolean(state.noiseReduction),
		voiceEnhancement: Boolean(state.voiceEnhancement),
	};
	// Only send an explicit end when it actually cuts something off, so the server
	// keeps its own "to the end of the source" behaviour otherwise.
	const end = state.end;
	if (end != null && end < source) payload.endSeconds = round(end);
	return payload;
}

/**
 * A cache key for rendered previews: identical settings should not re-render, and
 * changing any setting must invalidate the audio the user is listening to.
 */
export function editSignature(state, sourceSeconds) {
	const payload = buildEditPayload(state, sourceSeconds);
	return [
		payload.startSeconds,
		payload.endSeconds ?? 'end',
		payload.gain,
		payload.removeBackgroundMusic ? 'iso' : '-',
		payload.noiseReduction ? 'dn' : '-',
		payload.voiceEnhancement ? 'enh' : '-',
	].join('|');
}
