import { useCountdown } from '@/hooks/workouts/useCountdown';
import { BellRing, Check, Minus, Pause, Play, Plus, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { restChimeUrl, unlockAudio } from '@/lib/workouts/rest-chime';
import { cancelRestPush, scheduleRestPush } from '@/lib/workouts/rest-timer-push';

export function toMMSS(seconds) {
	const s = Math.max(0, Math.round(Number(seconds) || 0));
	const m = Math.floor(s / 60);
	const ss = s % 60;
	return `${m}:${ss < 10 ? '0' : ''}${ss}`;
}
export function mmssToSeconds(str) {
	if (!str) return 0;
	const raw = String(str).trim();
	if (/^\d+$/.test(raw)) return Number(raw);
	const [m = '0', s = '0'] = raw.split(':');
	return (Number(m) || 0) * 60 + (Number(s) || 0);
}

const cx = (...a) => a.filter(Boolean).join(' ');
const GRADIENT = 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))';
const PRESETS = [45, 60, 90, 120, 180];
const PERSIST_KEY = 'mw.rest.timer.v1';
/** Back much later than the end (the push already rang): one short chime, no loop. */
const LATE_MS = 30_000;

function Ring({ size = 76, progress, warning, children }) {
	const stroke = 6;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
				<defs>
					<linearGradient id="rt-ring" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stopColor="var(--color-gradient-from)" />
						<stop offset="100%" stopColor="var(--color-gradient-to)" />
					</linearGradient>
				</defs>
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[var(--color-primary-100)] dark:stroke-white/10" />
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					strokeWidth={stroke}
					strokeLinecap="round"
					stroke={warning ? '#f97316' : 'url(#rt-ring)'}
					strokeDasharray={c}
					strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
					style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }}
				/>
			</svg>
			<div className="absolute inset-0 grid place-items-center text-center">{children}</div>
		</div>
	);
}

export const RestTimerCard = React.memo(function RestTimerCard({
	alerting,
	setAlerting,
	initialSeconds,
	audioEl,
	exerciseName = '',
	className = '',
	smallStep = 15,
	alertLoopMs = 7000,
}) {
	const t = useTranslations('restTimer');
	const locale = useLocale();
	const defaultSeconds = Number(initialSeconds || 90) || 90;
	const [seconds, setSeconds] = useState(defaultSeconds);
	const [finished, setFinished] = useState(false);
	const alertTimeoutRef = useRef(null);

	useEffect(() => { setSeconds(defaultSeconds); }, [defaultSeconds]);

	const haptic = useCallback((pattern = 10) => {
		try { window.navigator?.vibrate?.(pattern); } catch { }
	}, []);

	useEffect(() => {
		const el = audioEl?.current;
		if (el && !String(el.src).startsWith('blob:')) el.src = restChimeUrl();
	}, [audioEl]);

	const stopAlert = useCallback(() => {
		if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); alertTimeoutRef.current = null; }
		try {
			const el = audioEl?.current;
			if (el) { el.pause?.(); el.currentTime = 0; el.loop = false; }
		} catch { }
		setAlerting(false);
	}, [audioEl, setAlerting]);

	const ring = useCallback(({ late }) => {
		setFinished(true);
		haptic([180, 90, 180, 90, 260]);
		const el = audioEl?.current;
		if (!el) return;
		try {
			if (!String(el.src).startsWith('blob:')) el.src = restChimeUrl();
			el.currentTime = 0;
			el.loop = late < LATE_MS;
			const p = el.play?.();
			if (p?.catch) p.catch(() => { });
			if (el.loop) {
				setAlerting(true);
				alertTimeoutRef.current = setTimeout(stopAlert, alertLoopMs);
			}
		} catch { }
	}, [audioEl, haptic, setAlerting, stopAlert, alertLoopMs]);

	const { remaining, running, paused, start, pause, resume, stop, addSeconds, duration, endAt } = useCountdown({
		persistKey: PERSIST_KEY,
		onFinish: ring,
	});

	// Finished while the app is on screen: drop the push so the phone does not ring twice.
	// In the background this never runs (the page is frozen), so the push goes out.
	useEffect(() => {
		if (!endAt) return undefined;
		const id = setTimeout(() => {
			if (document.visibilityState === 'visible') cancelRestPush();
		}, Math.max(0, endAt - Date.now() - 1500));
		return () => clearTimeout(id);
	}, [endAt]);

	useEffect(() => () => { if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current); }, []);

	const notify = useCallback(end => {
		if (!end) return;
		scheduleRestPush(end, {
			title: t('notifyTitle'),
			body: exerciseName ? t('notifyBodyExercise', { exercise: exerciseName }) : t('notifyBody'),
		});
	}, [t, exerciseName]);

	const handleStart = useCallback((value = seconds) => {
		stopAlert();
		setFinished(false);
		unlockAudio(audioEl?.current);
		const end = start(value);
		notify(end);
		haptic(20);
	}, [seconds, start, stopAlert, audioEl, notify, haptic]);

	const handlePause = useCallback(() => { pause(); cancelRestPush(); haptic(); }, [pause, haptic]);
	const handleResume = useCallback(() => { notify(resume()); haptic(); }, [resume, notify, haptic]);
	const handleStop = useCallback(() => { stop(); stopAlert(); cancelRestPush(); setFinished(false); haptic(15); }, [stop, stopAlert, haptic]);
	const handleAdd = useCallback(delta => {
		const end = addSeconds(delta);
		if (end) notify(end);
		haptic();
	}, [addSeconds, notify, haptic]);
	const handleDone = useCallback(() => { stopAlert(); setFinished(false); haptic(); }, [stopAlert, haptic]);

	const step = useCallback(delta => { setSeconds(s => Math.max(15, Math.min(600, s + delta))); haptic(); }, [haptic]);

	const endsAtLabel = useMemo(() => {
		if (!endAt) return '';
		try {
			return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(endAt);
		} catch {
			return '';
		}
	}, [endAt, locale]);

	const warning = running && !paused && remaining <= 5 && remaining > 0;
	const progress = running ? remaining / Math.max(1, duration) : 1;

	/* ── Finished ── */
	if (finished && !running) {
		return (
			<div className={cx('w-full', className)}>
				<div
					className="rt-in relative flex items-center gap-3 overflow-hidden rounded-[22px] p-3 text-white shadow-[0_10px_30px_-12px_rgba(16,185,129,0.7)]"
					style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
					role="status"
					aria-live="assertive"
				>
					<style>{`
						@keyframes rt-in{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}
						@keyframes rt-ring{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(5deg)}}
						.rt-in{animation:rt-in .22s cubic-bezier(.2,.8,.2,1) both}
						.rt-bell{animation:rt-ring 1.1s ease-in-out infinite;transform-origin:50% 10%}
					`}</style>
					<span className="pointer-events-none absolute -end-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
					<span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
						<BellRing size={24} className={alerting ? 'rt-bell' : ''} />
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-[15px] font-extrabold leading-tight">{t('finished')}</p>
						<p className="mt-0.5 truncate text-[12.5px] font-medium text-white/85">{t('finishedHint')}</p>
					</div>
					<button
						type="button"
						onClick={handleDone}
						className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-white px-4 text-[13px] font-extrabold text-emerald-700 shadow-sm transition active:scale-95"
					>
						<Check size={15} strokeWidth={3} />
						{t('actions.done')}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={cx('w-full', className)}>
			<div className="relative flex items-center gap-3 rounded-[22px] border border-[var(--color-primary-100)] bg-white p-3 shadow-[0_8px_24px_-14px_rgba(30,64,175,0.45)] dark:border-white/10 dark:bg-white/[0.04]">
				<Ring progress={progress} warning={warning}>
					<div className="leading-none">
						<span
							className={cx(
								'block font-en text-[18px] font-black tabular-nums tracking-tight',
								warning ? 'text-orange-500' : running ? 'text-[var(--color-primary-700)] dark:text-white' : 'text-slate-800 dark:text-white',
							)}
							aria-live="polite"
						>
							{toMMSS(running ? remaining : seconds)}
						</span>
						<span className="mt-1 block text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
							{running ? (paused ? t('states.paused') : t('states.running')) : t('title')}
						</span>
					</div>
				</Ring>

				{!running ? (
					<>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-1">
								<span className="text-[12px] font-bold text-slate-500 dark:text-slate-300">{t('title')}</span>
								<div className="flex items-center gap-1" dir="ltr">
									<button
										type="button"
										onClick={() => step(-smallStep)}
										aria-label={`-${smallStep}s`}
										className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] transition active:scale-90 dark:bg-white/10 dark:text-white"
									>
										<Minus size={13} strokeWidth={2.75} />
									</button>
									<button
										type="button"
										onClick={() => step(+smallStep)}
										aria-label={`+${smallStep}s`}
										className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] transition active:scale-90 dark:bg-white/10 dark:text-white"
									>
										<Plus size={13} strokeWidth={2.75} />
									</button>
								</div>
							</div>
							<div className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none]" dir="ltr">
								{PRESETS.map(value => {
									const on = seconds === value;
									return (
										<button
											key={value}
											type="button"
											onClick={() => { setSeconds(value); haptic(); }}
											aria-pressed={on}
											className={cx(
												'h-7 shrink-0 rounded-full px-2.5 font-en text-[11.5px] font-bold tabular-nums transition active:scale-95',
												on
													? 'text-white shadow-[0_4px_10px_-4px_rgba(37,99,235,0.7)]'
													: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200',
											)}
											style={on ? { background: GRADIENT } : undefined}
										>
											{toMMSS(value)}
										</button>
									);
								})}
							</div>
						</div>
						<button
							type="button"
							onClick={() => handleStart()}
							aria-label={t('actions.start')}
							title={t('actions.start')}
							className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.8)] transition active:scale-95"
							style={{ background: GRADIENT }}
						>
							<Play size={22} fill="currentColor" className="translate-x-[2px]" />
						</button>
					</>
				) : (
					<>
						<div className="min-w-0 flex-1">
							<p className={cx('text-[13.5px] font-extrabold leading-tight', warning ? 'text-orange-500' : 'text-slate-800 dark:text-white')}>
								{warning ? t('warning') : paused ? t('states.paused') : t('resting')}
							</p>
							<p className="mt-1 text-[11.5px] font-medium text-slate-400">
								{paused ? t('pausedHint') : endsAtLabel ? t('endsAt', { time: endsAtLabel }) : ''}
							</p>
							<button
								type="button"
								onClick={() => handleAdd(smallStep)}
								className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-[var(--color-primary-50)] px-2.5 font-en text-[11.5px] font-bold text-[var(--color-primary-600)] transition active:scale-95 dark:bg-white/10 dark:text-white"
								dir="ltr"
							>
								<Plus size={12} strokeWidth={2.75} />
								{smallStep}s
							</button>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<button
								type="button"
								onClick={handleStop}
								aria-label={t('actions.stop')}
								title={t('actions.stop')}
								className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition active:scale-90 dark:bg-white/10 dark:text-slate-200"
							>
								<X size={17} strokeWidth={2.5} />
							</button>
							<button
								type="button"
								onClick={paused ? handleResume : handlePause}
								aria-label={paused ? t('actions.resume') : t('actions.pause')}
								title={paused ? t('actions.resume') : t('actions.pause')}
								className="grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.8)] transition active:scale-95"
								style={{ background: GRADIENT }}
							>
								{paused
									? <Play size={22} fill="currentColor" className="translate-x-[2px]" />
									: <Pause size={22} fill="currentColor" />}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
});
