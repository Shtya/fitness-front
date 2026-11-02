import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Countdown kept as an end time, not a ticking counter.
 *
 * Phones freeze a page's timers while the user is in another app; a counter that subtracts one
 * per tick simply stopped there. The remaining time is now always `endAt - now`, re-read when
 * the page comes back. With `persistKey` the timer also survives the page being reloaded (iOS
 * often discards a backgrounded PWA).
 *
 * `onFinish({ late })` runs once when the time is up; `late` is how many ms after the end the
 * page noticed (large when it was in the background).
 */
export function useCountdown({ persistKey, onFinish } = {}) {
	const [timer, setTimer] = useState({ duration: 0, endAt: 0, pausedLeft: null });
	const [now, setNow] = useState(() => Date.now());
	const finishRef = useRef(onFinish);
	finishRef.current = onFinish;
	const firedRef = useRef(0);

	const running = timer.endAt > 0;
	const paused = running && timer.pausedLeft != null;

	const save = useCallback(
		next => {
			setTimer(next);
			if (!persistKey) return;
			try {
				if (next.endAt > 0) localStorage.setItem(persistKey, JSON.stringify(next));
				else localStorage.removeItem(persistKey);
			} catch {
				/* private mode */
			}
		},
		[persistKey],
	);

	// Restore a timer that was running when the page went away.
	useEffect(() => {
		if (!persistKey) return;
		try {
			const saved = JSON.parse(localStorage.getItem(persistKey) || 'null');
			if (saved?.endAt > 0 && Number(saved.duration) > 0) setTimer(saved);
		} catch {
			/* ignore */
		}
	}, [persistKey]);

	useEffect(() => {
		if (!running || paused) return undefined;
		const tick = () => setNow(Date.now());
		tick();
		const id = setInterval(tick, 250);
		const onWake = () => tick();
		document.addEventListener('visibilitychange', onWake);
		window.addEventListener('focus', onWake);
		window.addEventListener('pageshow', onWake);
		return () => {
			clearInterval(id);
			document.removeEventListener('visibilitychange', onWake);
			window.removeEventListener('focus', onWake);
			window.removeEventListener('pageshow', onWake);
		};
	}, [running, paused]);

	const remainingMs = !running ? 0 : paused ? timer.pausedLeft : Math.max(0, timer.endAt - now);
	const remaining = Math.ceil(remainingMs / 1000);

	useEffect(() => {
		if (!running || paused || now < timer.endAt || firedRef.current === timer.endAt) return;
		firedRef.current = timer.endAt;
		const late = now - timer.endAt;
		save({ duration: timer.duration, endAt: 0, pausedLeft: null });
		finishRef.current?.({ late });
	}, [running, paused, now, timer, save]);

	const start = useCallback(
		seconds => {
			const sec = Math.max(0, Math.round(Number(seconds) || 0));
			if (!sec) return 0;
			const endAt = Date.now() + sec * 1000;
			setNow(Date.now());
			save({ duration: sec, endAt, pausedLeft: null });
			return endAt;
		},
		[save],
	);

	const pause = useCallback(() => {
		if (!running || paused) return;
		save({ ...timer, pausedLeft: Math.max(0, timer.endAt - Date.now()) });
	}, [running, paused, timer, save]);

	/** Returns the new end time so callers can reschedule anything tied to it. */
	const resume = useCallback(() => {
		if (!running || !paused) return 0;
		const endAt = Date.now() + timer.pausedLeft;
		setNow(Date.now());
		save({ ...timer, endAt, pausedLeft: null });
		return endAt;
	}, [running, paused, timer, save]);

	/** Adds (or removes) time while running; returns the new end time. */
	const addSeconds = useCallback(
		delta => {
			if (!running) return 0;
			const ms = delta * 1000;
			if (paused) {
				save({ ...timer, duration: Math.max(1, timer.duration + delta), pausedLeft: Math.max(1000, timer.pausedLeft + ms) });
				return 0;
			}
			const endAt = Math.max(Date.now() + 1000, timer.endAt + ms);
			save({ ...timer, duration: Math.max(1, timer.duration + delta), endAt });
			return endAt;
		},
		[running, paused, timer, save],
	);

	const stop = useCallback(() => {
		save({ duration: 0, endAt: 0, pausedLeft: null });
	}, [save]);

	return {
		duration: timer.duration,
		endAt: running && !paused ? timer.endAt : 0,
		remaining,
		running,
		paused,
		start,
		pause,
		resume,
		stop,
		addSeconds,
	};
}
