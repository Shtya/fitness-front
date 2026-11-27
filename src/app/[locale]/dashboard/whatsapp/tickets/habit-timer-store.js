'use client';

/*
 * The focus timer's single source of truth, shared by every timer button (Habits, Wall, Docs)
 * and the floating dock that keeps it visible on any WhatsApp tab. Kept in localStorage, so a
 * reload or another browser tab sees the same timer; changes are broadcast with an event.
 *
 * Shape: { total, endAt?, left?, habitId?, label?, done?, doneAt? }
 *   running: endAt > 0 · paused: left > 0 (endAt 0) · finished: done true
 */

import { useSyncExternalStore } from 'react';

const LS = 'wa-habit-timer:v1';
const EVT = 'wa-habit-timer-change';
/** A timer that ended longer ago than this (page was closed) is shown finished, without ringing. */
const STALE_RING_MS = 2 * 60_000;

let raw = null;
let parsed = null;

function read() {
	if (typeof window === 'undefined') return null;
	let next = null;
	try {
		next = window.localStorage.getItem(LS);
	} catch {
		next = memory;
	}
	if (next !== raw) {
		raw = next;
		try {
			const v = JSON.parse(next || 'null');
			parsed = v && typeof v === 'object' && v.total > 0 ? v : null;
		} catch {
			parsed = null;
		}
	}
	return parsed;
}
let memory = null; // private mode: the timer still works in this tab

export function getTimer() {
	return read();
}

export function setTimer(next) {
	const value = next ? JSON.stringify(next) : null;
	try {
		if (value) window.localStorage.setItem(LS, value);
		else window.localStorage.removeItem(LS);
	} catch {
		memory = value;
	}
	window.dispatchEvent(new Event(EVT));
}

function subscribe(cb) {
	const onStorage = e => {
		if (e.key === LS) cb();
	};
	window.addEventListener(EVT, cb);
	window.addEventListener('storage', onStorage);
	return () => {
		window.removeEventListener(EVT, cb);
		window.removeEventListener('storage', onStorage);
	};
}

/** The current timer (null when none), live across components and browser tabs. */
export function useTimer() {
	return useSyncExternalStore(subscribe, read, () => null);
}

export const isRunning = t => Boolean(t && t.endAt && !t.done);
export const timeLeft = (t, now = Date.now()) => (!t ? 0 : t.done ? 0 : t.endAt ? t.endAt - now : t.left || 0);

export function clock(ms) {
	const s = Math.max(0, Math.ceil(ms / 1000));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = String(s % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/* ─── actions ─── */
export function startTimer(minutes, { habitId = '', label = '' } = {}) {
	unlockAudio();
	askNotifications();
	const total = Math.round(minutes * 60_000);
	setTimer({ total, endAt: Date.now() + total, habitId, label });
}
export function pauseTimer() {
	const t = read();
	if (isRunning(t)) setTimer({ ...t, left: Math.max(0, t.endAt - Date.now()), endAt: 0 });
}
export function resumeTimer() {
	const t = read();
	if (!t || t.done || !t.left) return;
	unlockAudio();
	setTimer({ ...t, endAt: Date.now() + t.left, left: 0 });
}
export function addMinute() {
	const t = read();
	if (!t || t.done) return;
	setTimer(t.endAt ? { ...t, total: t.total + 60_000, endAt: t.endAt + 60_000 } : { ...t, total: t.total + 60_000, left: (t.left || 0) + 60_000 });
}
export function clearTimer() {
	setTimer(null);
}

/**
 * Finish a timer whose time is up. Only the first caller rings (several buttons, the dock and
 * other browser tabs all watch the same timer): returns true when this call rang.
 */
export function finishIfDue(copy) {
	const t = read();
	if (!isRunning(t) || t.endAt > Date.now()) return false;
	const late = Date.now() - t.endAt > STALE_RING_MS;
	setTimer({ ...t, done: true, doneAt: Date.now() });
	if (late) return false;
	chime();
	try {
		navigator.vibrate?.([200, 120, 200, 120, 400]);
	} catch {
		/* no vibration */
	}
	notify(copy, t);
	return true;
}

/* ─── sound: three soft bell notes, three times (Web Audio, no file) ─── */
let audio = null;
export function unlockAudio() {
	try {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!audio && AC) audio = new AC();
		void audio?.resume?.();
	} catch {
		/* no sound on this browser */
	}
}
export function chime() {
	unlockAudio();
	const ctx = audio;
	if (!ctx) return;
	const notes = [1046.5, 1318.5, 1568]; // C6 E6 G6
	const now = ctx.currentTime + 0.05;
	for (let round = 0; round < 3; round += 1) {
		notes.forEach((freq, i) => {
			const t0 = now + round * 1.3 + i * 0.18;
			[1, 2.01].forEach((mult, k) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.value = freq * mult;
				gain.gain.setValueAtTime(0.0001, t0);
				gain.gain.exponentialRampToValueAtTime(k ? 0.05 : 0.22, t0 + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
				osc.connect(gain).connect(ctx.destination);
				osc.start(t0);
				osc.stop(t0 + 1.15);
			});
		});
	}
}

/* ─── browser notification (works from any tab, even when this one is in the background) ─── */
export function askNotifications() {
	try {
		if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
	} catch {
		/* not supported */
	}
}
function notify(copy, t) {
	try {
		if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
		const title = copy?.title || 'Time’s up!';
		const body = t?.label ? copy?.bodyFor?.(t.label) || t.label : copy?.body || '';
		const n = new Notification(title, { body, tag: 'wa-habit-timer', renotify: true, requireInteraction: true, silent: false });
		n.onclick = () => {
			window.focus();
			n.close();
		};
	} catch {
		/* some browsers only allow notifications from a service worker */
	}
}

/* ─── one owner for the title / dock: the dock on the WhatsApp page, the button elsewhere ─── */
let docks = 0;
export function registerDock() {
	docks += 1;
	return () => {
		docks -= 1;
	};
}
export const hasDock = () => docks > 0;
