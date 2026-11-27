'use client';

/*
 * The focus timer, visible on every WhatsApp tab: a small floating pill while it runs (hidden
 * when a timer button is already on screen), and "time's up" with a chime and a browser
 * notification when it ends — whichever tab you are on. Also owns the tab-title countdown.
 */

import { useEffect, useRef, useState } from 'react';
import { BellRing, Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { TIMER_COPY, notifyCopy } from './HabitTimer';
import { clearTimer, clock, finishIfDue, isRunning, pauseTimer, registerDock, resumeTimer, startTimer, timeLeft, useTimer } from './habit-timer-store';
import './habits-timer.css';

/** A timer button that is actually on screen (in a visible tab, not display:none). */
const buttonOnScreen = () => [...document.querySelectorAll('.ht-btn')].some(b => b.getClientRects().length > 0);

export default function HabitTimerDock({ ar }) {
	const t = TIMER_COPY[ar ? 'ar' : 'en'];
	const timer = useTimer();
	const [now, setNow] = useState(() => Date.now());
	const [covered, setCovered] = useState(false);
	const baseTitle = useRef('');
	const running = isRunning(timer);
	const left = timeLeft(timer, now);

	useEffect(() => registerDock(), []);

	// tick (and ring at zero) on every tab; also notice whether a timer button is showing
	useEffect(() => {
		if (!timer) return undefined;
		const tick = () => {
			setNow(Date.now());
			setCovered(buttonOnScreen());
			if (running) finishIfDue(notifyCopy(t));
		};
		tick();
		const id = window.setInterval(tick, running ? 250 : 1000);
		return () => window.clearInterval(id);
	}, [timer, running, t]);

	// the tab title: the time left while running, flashing when it is over
	useEffect(() => {
		if (!baseTitle.current) baseTitle.current = document.title.replace(/^(⏱ [\d:]+ · |⏰ .*)/, '');
		if (running) {
			document.title = `⏱ ${clock(left)} · ${baseTitle.current}`;
			return undefined;
		}
		if (timer?.done) {
			let on = false;
			const id = window.setInterval(() => {
				on = !on;
				document.title = on ? `⏰ ${t.timeUp}` : baseTitle.current;
			}, 900);
			return () => {
				window.clearInterval(id);
				document.title = baseTitle.current;
			};
		}
		if (baseTitle.current) document.title = baseTitle.current;
		return undefined;
	}, [running, left, timer?.done, t.timeUp]);

	if (!timer || covered) return null;
	const pct = timer.total ? Math.min(1, Math.max(0, 1 - left / timer.total)) : 0;

	return (
		<div className={`ht-dock${timer.done ? ' is-done' : ''}`} role={timer.done ? 'alert' : 'status'} dir={ar ? 'rtl' : 'ltr'} aria-label={t.timer}>
			{timer.done ? (
				<>
					<span className="ht-dock__bell" aria-hidden>
						<BellRing size={17} />
					</span>
					<span className="ht-dock__text">
						<b>{timer.label ? t.timeUpFor(timer.label) : t.timeUp}</b>
						<small>{t.wellDone}</small>
					</span>
					<button type="button" className="ht-dock__btn" onClick={() => startTimer(timer.total / 60_000, { habitId: timer.habitId, label: timer.label })} title={t.again} aria-label={t.again}>
						<RotateCcw size={15} />
					</button>
					<button type="button" className="ht-dock__btn" onClick={clearTimer} title={t.close} aria-label={t.close}>
						<X size={16} />
					</button>
				</>
			) : (
				<>
					<span className={`ht-mini ht-dock__ring${running ? '' : ' is-paused'}`} style={{ '--p': pct }} aria-hidden />
					<span className="ht-dock__text">
						<b className="ht-dock__time">{clock(left)}</b>
						<small>{timer.label || (running ? t.running : t.paused)}</small>
					</span>
					{running ? (
						<button type="button" className="ht-dock__btn" onClick={pauseTimer} title={t.pause} aria-label={t.pause}>
							<Pause size={15} />
						</button>
					) : (
						<button
							type="button"
							className="ht-dock__btn"
							onClick={() => {
								setNow(Date.now());
								resumeTimer();
							}}
							title={t.resume}
							aria-label={t.resume}
						>
							<Play size={15} />
						</button>
					)}
					<button type="button" className="ht-dock__btn" onClick={clearTimer} title={t.stop} aria-label={t.stop}>
						<Square size={13} />
					</button>
				</>
			)}
		</div>
	);
}
