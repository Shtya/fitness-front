'use client';

import { useSyncExternalStore } from 'react';

/**
 * One voice-note speed for every player: pick 1.5x on one voice note and the next one you play
 * starts at 1.5x too. Saved in this browser so it survives a reload.
 */
const STORAGE_KEY = 'wa-voice-speed-v1';
export const VOICE_SPEEDS = [1, 1.5, 2];

let speed = null;
const listeners = new Set();

function read() {
	if (speed != null) return speed;
	speed = 1;
	try {
		const stored = Number(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : NaN);
		if (VOICE_SPEEDS.includes(stored)) speed = stored;
	} catch {
		/* storage blocked: start at 1x */
	}
	return speed;
}

export function getVoiceSpeed() {
	return read();
}

export function setVoiceSpeed(next) {
	const value = VOICE_SPEEDS.includes(Number(next)) ? Number(next) : 1;
	if (value === read()) return;
	speed = value;
	try {
		window.localStorage.setItem(STORAGE_KEY, String(value));
	} catch {
		/* kept for this session only */
	}
	for (const listener of listeners) listener();
}

/** 1 → 1.5 → 2 → 1, like WhatsApp. */
export function nextVoiceSpeed(current) {
	const index = VOICE_SPEEDS.indexOf(Number(current));
	return VOICE_SPEEDS[(index + 1) % VOICE_SPEEDS.length];
}

function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useVoiceSpeed() {
	return useSyncExternalStore(subscribe, read, () => 1);
}
