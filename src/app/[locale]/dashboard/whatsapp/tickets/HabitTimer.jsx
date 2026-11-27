'use client';

/*
 * Focus timer button (Habits, Wall, Docs). Pick a preset or your own time; the button counts
 * down while you work and a soft chime plays when it ends. The timer itself lives in
 * habit-timer-store.js, so every button, the floating dock on other WhatsApp tabs, a reload
 * and other browser tabs all show the same timer — and it rings (with a browser notification)
 * wherever you are.
 */

import { useEffect, useRef, useState } from 'react';
import { BellRing, Check, Minus, Pause, Play, Plus, RotateCcw, Square, Timer, X } from 'lucide-react';
import { langClass } from './tickets-ui';
import { addMinute, clearTimer, clock, finishIfDue, hasDock, isRunning, pauseTimer, resumeTimer, startTimer, timeLeft, useTimer } from './habit-timer-store';
import './habits-timer.css';

const PRESETS = [5, 10, 15, 25, 45, 60];

export const TIMER_COPY = {
	en: {
		timer: 'Timer',
		setTimer: 'Set a timer',
		minutes: 'min',
		start: 'Start',
		pause: 'Pause',
		resume: 'Resume',
		stop: 'Stop',
		addMin: '+1 min',
		timeUp: 'Time’s up!',
		timeUpFor: h => `Time’s up for “${h}”`,
		wellDone: 'Well done — take a breath.',
		markDone: 'Mark it done today',
		marked: 'Marked done',
		again: 'Again',
		close: 'Close',
		custom: 'Custom',
		running: 'Running',
		paused: 'Paused',
	},
	ar: {
		timer: 'مؤقت',
		setTimer: 'اضبط مؤقت',
		minutes: 'د',
		start: 'ابدأ',
		pause: 'إيقاف مؤقت',
		resume: 'كمّل',
		stop: 'إنهاء',
		addMin: '+١ د',
		timeUp: 'الوقت خلص!',
		timeUpFor: h => `الوقت خلص لـ «${h}»`,
		wellDone: 'برافو — خد نفس.',
		markDone: 'علّمها خلصت النهارده',
		marked: 'اتعلّمت',
		again: 'تاني',
		close: 'إغلاق',
		custom: 'وقت تاني',
		running: 'شغال',
		paused: 'متوقف',
	},
};

/** What the browser notification says when the time is up. */
export const notifyCopy = t => ({ title: t.timeUp, body: t.wellDone, bodyFor: label => t.timeUpFor(label) });

export default function HabitTimer({ ar, habits = [], onMarkDone }) {
	const t = TIMER_COPY[ar ? 'ar' : 'en'];
	const timer = useTimer();
	const [open, setOpen] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const [minutes, setMinutes] = useState(25);
	const [marked, setMarked] = useState(false);
	const wrap = useRef(null);
	const baseTitle = useRef('');
	const wasDone = useRef(Boolean(timer?.done));

	const running = isRunning(timer);
	const left = timeLeft(timer, now);

	// tick while running; at zero the store rings once (whichever button / dock gets there first)
	useEffect(() => {
		if (!running) return undefined;
		const id = window.setInterval(() => {
			setNow(Date.now());
			finishIfDue(notifyCopy(t));
		}, 250);
		return () => window.clearInterval(id);
	}, [running, t]);

	// it just finished (here, in the dock or in another tab): show "time's up" on this button
	useEffect(() => {
		const done = Boolean(timer?.done);
		if (done && !wasDone.current) {
			setMarked(false);
			setOpen(true);
		}
		wasDone.current = done;
	}, [timer?.done]);

	// time left in the tab title while running (the dock does this on the WhatsApp page)
	useEffect(() => {
		if (hasDock()) return undefined;
		if (!baseTitle.current) baseTitle.current = document.title;
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
		document.title = baseTitle.current;
		return undefined;
	}, [running, left, timer?.done, t.timeUp]);

	useEffect(() => {
		if (!open) return undefined;
		const away = e => !wrap.current?.contains(e.target) && setOpen(false);
		const esc = e => e.key === 'Escape' && setOpen(false);
		document.addEventListener('pointerdown', away);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', esc);
		};
	}, [open]);

	const start = (mins = minutes) => {
		setNow(Date.now());
		startTimer(mins);
		setMarked(false);
	};
	const stop = () => {
		clearTimer();
		setOpen(true);
	};

	const pct = timer && timer.total ? Math.min(1, Math.max(0, 1 - left / timer.total)) : 0;
	const habit = timer?.habitId ? habits.find(h => h.id === timer.habitId) : null;

	return (
		<div className="ht" ref={wrap}>
			<button
				type="button"
				className={`hb-toolbtn ht-btn${timer ? ' is-active' : ''}${timer?.done ? ' is-done' : ''}${open ? ' is-on' : ''}`}
				onClick={() => setOpen(v => !v)}
				aria-expanded={open}
				aria-label={timer ? `${t.timer} ${clock(left)}` : t.setTimer}
				title={t.setTimer}
			>
				{timer ? (
					<span className="ht-mini" style={{ '--p': pct }} aria-hidden>
						{timer.done ? <BellRing size={13} /> : null}
					</span>
				) : (
					<Timer size={17} />
				)}
				{timer && !timer.done ? <span className="ht-btn__time">{clock(left)}</span> : null}
			</button>

			{open ? (
				<div className="ht-pop" role="dialog" aria-label={t.timer} dir={ar ? 'rtl' : 'ltr'}>
					{timer?.done ? (
						<div className="ht-done">
							<span className="ht-done__bell" aria-hidden>
								<BellRing size={30} />
							</span>
							<b className={habit ? langClass(habit.title) : ''}>{habit ? t.timeUpFor(habit.title) : t.timeUp}</b>
							<small>{t.wellDone}</small>
							<div className="ht-acts">
								{habit && onMarkDone ? (
									<button
										type="button"
										className="ht-act is-primary"
										disabled={marked}
										onClick={() => {
											onMarkDone(habit.id);
											setMarked(true);
										}}
									>
										<Check size={16} aria-hidden />
										{marked ? t.marked : t.markDone}
									</button>
								) : null}
								<button type="button" className="ht-act" onClick={() => start(timer.total / 60_000)}>
									<RotateCcw size={15} aria-hidden />
									{t.again}
								</button>
								<button
									type="button"
									className="ht-act is-ghost"
									onClick={() => {
										clearTimer();
										setOpen(false);
									}}
								>
									{t.close}
								</button>
							</div>
						</div>
					) : timer ? (
						<div className="ht-run">
							<div className={`ht-ring${running ? '' : ' is-paused'}`} style={{ '--p': pct }}>
								<div className="ht-ring__in">
									<b>{clock(left)}</b>
									<small className={habit ? langClass(habit.title) : ''}>{habit ? habit.title : running ? t.running : t.paused}</small>
								</div>
							</div>
							<div className="ht-acts">
								{running ? (
									<button type="button" className="ht-act is-primary" onClick={pauseTimer}>
										<Pause size={16} aria-hidden />
										{t.pause}
									</button>
								) : (
									<button
										type="button"
										className="ht-act is-primary"
										onClick={() => {
											setNow(Date.now());
											resumeTimer();
										}}
									>
										<Play size={16} aria-hidden />
										{t.resume}
									</button>
								)}
								<button type="button" className="ht-act" onClick={addMinute}>
									{t.addMin}
								</button>
								<button type="button" className="ht-act is-ghost" onClick={stop} aria-label={t.stop}>
									<Square size={14} aria-hidden />
									{t.stop}
								</button>
							</div>
						</div>
					) : (
						<div className="ht-set">
							<header>
								<b>{t.setTimer}</b>
								<button type="button" className="ht-x" onClick={() => setOpen(false)} aria-label={t.close}>
									<X size={16} />
								</button>
							</header>
							<div className="ht-presets">
								{PRESETS.map(m => (
									<button key={m} type="button" className={minutes === m ? 'is-on' : ''} onClick={() => setMinutes(m)}>
										<b>{m}</b>
										<small>{t.minutes}</small>
									</button>
								))}
							</div>
							<div className="ht-custom">
								<span>{t.custom}</span>
								<button type="button" onClick={() => setMinutes(m => Math.max(1, m - 1))} aria-label="-1">
									<Minus size={15} />
								</button>
								<input
									type="number"
									min={1}
									max={240}
									value={minutes}
									onChange={e => setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
									aria-label={t.minutes}
								/>
								<button type="button" onClick={() => setMinutes(m => Math.min(240, m + 1))} aria-label="+1">
									<Plus size={15} />
								</button>
								<span>{t.minutes}</span>
							</div>
							<button type="button" className="ht-start" onClick={() => start()}>
								<Play size={17} aria-hidden />
								{t.start} · {minutes} {t.minutes}
							</button>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}
