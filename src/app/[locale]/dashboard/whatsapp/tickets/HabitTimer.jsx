'use client';

/*
 * Focus timer next to the calendar on the Habits tab. Pick a preset or your own time, optionally
 * for one habit; the button counts down while you work, and a soft chime plays when it ends
 * (with "mark the habit done" if you picked one). The end time is kept in localStorage, so a
 * reload or another tab does not lose it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, Minus, Pause, Play, Plus, RotateCcw, Square, Timer, X } from 'lucide-react';
import { langClass } from './tickets-ui';
import './habits-timer.css';

const LS = 'wa-habit-timer:v1';
const PRESETS = [5, 10, 15, 25, 45, 60];

const T = {
	en: {
		timer: 'Timer',
		setTimer: 'Set a timer',
		minutes: 'min',
		forHabit: 'For a habit (optional)',
		none: 'Just a timer',
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
		forHabit: 'لعادة معيّنة (اختياري)',
		none: 'مؤقت عادي',
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

const clock = ms => {
	const s = Math.max(0, Math.ceil(ms / 1000));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = String(s % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

function readSaved() {
	try {
		const v = JSON.parse(window.localStorage.getItem(LS) || 'null');
		return v && typeof v === 'object' && v.total > 0 ? v : null;
	} catch {
		return null;
	}
}
function save(v) {
	try {
		if (v) window.localStorage.setItem(LS, JSON.stringify(v));
		else window.localStorage.removeItem(LS);
	} catch {
		/* private mode: the timer still runs in this tab */
	}
}

/* ─── the chime: three soft bell notes, three times (made with Web Audio, no file) ─── */
function chime(ctx) {
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

export default function HabitTimer({ ar, habits = [], onMarkDone }) {
	const t = T[ar ? 'ar' : 'en'];
	const [timer, setTimer] = useState(null); // { total, endAt?, left?, habitId?, label?, done? }
	const [open, setOpen] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const [minutes, setMinutes] = useState(25);
	const [habitId, setHabitId] = useState('');
	const [marked, setMarked] = useState(false);
	const wrap = useRef(null);
	const audio = useRef(null);
	const baseTitle = useRef('');

	// Coming back to the page: pick the timer up where it is (or show it finished).
	useEffect(() => {
		const saved = readSaved();
		if (saved) setTimer(saved.endAt && saved.endAt <= Date.now() && !saved.left ? { ...saved, done: true } : saved);
	}, []);

	const update = useCallback(next => {
		setTimer(next);
		save(next && !next.done ? next : null);
	}, []);

	const ensureAudio = () => {
		try {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!audio.current && AC) audio.current = new AC();
			void audio.current?.resume?.();
		} catch {
			/* no sound on this browser */
		}
	};

	const running = Boolean(timer && timer.endAt && !timer.done);
	const left = timer ? (timer.done ? 0 : timer.endAt ? timer.endAt - now : timer.left) : 0;

	// tick while running; ring the bell at zero
	useEffect(() => {
		if (!running) return undefined;
		const id = window.setInterval(() => {
			const n = Date.now();
			setNow(n);
			if (timer.endAt - n <= 0) {
				window.clearInterval(id);
				ensureAudio();
				chime(audio.current);
				navigator.vibrate?.([200, 120, 200, 120, 400]);
				setMarked(false);
				update({ ...timer, done: true });
				setOpen(true);
			}
		}, 250);
		return () => window.clearInterval(id);
	}, [running, timer, update]);

	// time left in the tab title while running; a flashing title when it is over
	useEffect(() => {
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
		ensureAudio(); // unlocks sound now, while there is a click
		const total = Math.round(mins * 60_000);
		const h = habits.find(x => x.id === habitId);
		setNow(Date.now());
		update({ total, endAt: Date.now() + total, habitId: h?.id || '', label: h?.title || '' });
		setMarked(false);
	};
	const pause = () => update({ ...timer, left: Math.max(0, timer.endAt - Date.now()), endAt: 0 });
	const resume = () => {
		ensureAudio();
		setNow(Date.now());
		update({ ...timer, endAt: Date.now() + timer.left, left: 0 });
	};
	const addMinute = () =>
		update(timer.endAt ? { ...timer, total: timer.total + 60_000, endAt: timer.endAt + 60_000 } : { ...timer, total: timer.total + 60_000, left: timer.left + 60_000 });
	const stop = () => {
		update(null);
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
					<Timer size={18} />
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
										update(null);
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
									<button type="button" className="ht-act is-primary" onClick={pause}>
										<Pause size={16} aria-hidden />
										{t.pause}
									</button>
								) : (
									<button type="button" className="ht-act is-primary" onClick={resume}>
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
