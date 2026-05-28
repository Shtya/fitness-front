import { useCountdown } from '@/hooks/workouts/useCountdown';
import { Play, Minus, Pause, Plus, X, BellOff, RotateCcw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

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

export const RestTimerCard = React.memo(function RestTimerCard({
  alerting,
  setAlerting,
  initialSeconds,
  audioEl,
  className = '',
  smallStep = 15,
  holdStep = 5,
  holdIntervalMs = 120,
  alertLoopMs = 5000,
}) {
  const t = useTranslations('restTimer');
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();

  const [seconds, setSeconds] = useState(() => Number(initialSeconds || 90) || 90);
  const holdRef = useRef(null);
  const alertTimeoutRef = useRef(null);
  const hasAlertFiredRef = useRef(false);

  useEffect(() => { setSeconds(Number(initialSeconds || 90) || 90); }, [initialSeconds]);

  const haptic = useCallback((ms = 10) => {
    try { window.navigator?.vibrate?.(ms); } catch {}
  }, []);

  const stopAlert = useCallback(() => {
    if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); alertTimeoutRef.current = null; }
    try {
      const el = audioEl?.current;
      if (el) { el.pause?.(); el.currentTime = 0; el.loop = false; el.load?.(); }
    } catch {}
    setAlerting(false);
    hasAlertFiredRef.current = false;
  }, [audioEl, setAlerting]);

  useEffect(() => {
    if (!running && duration > 0 && remaining === 0 && !hasAlertFiredRef.current) {
      const el = audioEl?.current;
      if (!el) return;
      hasAlertFiredRef.current = true;
      try {
        el.currentTime = 0; el.loop = true;
        const p = el.play?.(); if (p?.catch) p.catch(() => {});
        setAlerting(true);
        alertTimeoutRef.current = setTimeout(stopAlert, alertLoopMs);
      } catch {}
    }
    return () => { if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); alertTimeoutRef.current = null; } };
  }, [running, remaining, duration, audioEl, setAlerting, alertLoopMs, stopAlert]);

  const step = useCallback(delta => setSeconds(s => Math.max(0, s + delta)), []);
  const dec = useCallback(() => { step(-smallStep); haptic(); }, [haptic, smallStep, step]);
  const inc = useCallback(() => { step(+smallStep); haptic(); }, [haptic, smallStep, step]);

  const startHold = useCallback(delta => {
    step(delta);
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = setInterval(() => step(delta), holdIntervalMs);
  }, [holdIntervalMs, step]);

  const endHold = useCallback(() => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  }, []);

  useEffect(() => () => {
    if (holdRef.current) clearInterval(holdRef.current);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
  }, []);

  const handleStart = useCallback(() => {
    hasAlertFiredRef.current = false; stopAlert(); start(seconds); haptic(20);
  }, [seconds, start, haptic, stopAlert]);

  const handleReset = useCallback(() => {
    stop(); stopAlert(); setSeconds(Number(initialSeconds || 90) || 90); haptic(15);
  }, [stop, stopAlert, initialSeconds, haptic]);

  /* Arc math */
  const arc = useMemo(() => {
    const R = 15, C = 2 * Math.PI * R;
    const pct = duration > 0 ? remaining / duration : 1;
    return { R, C, offset: C * (1 - pct) };
  }, [remaining, duration]);

  const timeLabel = useMemo(() => toMMSS(running ? remaining : seconds), [running, remaining, seconds]);
  const isWarning = running && remaining <= 10 && remaining > 0;
  const defaultSeconds = Number(initialSeconds || 90) || 90;
  const isDirty = !running && seconds !== defaultSeconds;

  return (
    <div className={cx('w-full', className)}>
      <style>{`
        @keyframes rt-pop   { from{transform:scale(.94);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes rt-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes rt-ping  { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.9);opacity:0} }
        .rt-pop   { animation: rt-pop   .15s cubic-bezier(.4,0,.2,1) both }
        .rt-blink { animation: rt-blink 1s ease-in-out infinite }
        .rt-ping  { animation: rt-ping  1.2s ease-out infinite }
      `}</style>

      {/* Alert pill */}
      {alerting && (
        <button
          onClick={stopAlert}
          className="rt-pop w-full mb-1.5 flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-500 active:scale-95 transition-transform"
        >
          <BellOff size={11} className="rt-blink" />
          {t('stopAlert')}
        </button>
      )}

      {/* ── Compact horizontal strip ── */}
      <div className="flex items-stretch rounded-lg border border-[var(--color-primary-100)] bg-white shadow-sm overflow-hidden h-12">

        {/* LEFT — arc + time */}
        <div className="flex items-center gap-1.5 pl-2.5 pr-2 bg-gradient-to-r from-[var(--color-primary-50)] to-transparent shrink-0">
          {/* mini arc */}
          <div className="relative w-8 h-8 shrink-0">
            <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden>
              <defs>
                <linearGradient id="rt-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-gradient-from)" />
                  <stop offset="100%" stopColor="var(--color-gradient-to)" />
                </linearGradient>
              </defs>
              <circle cx="18" cy="18" r={arc.R} stroke="#e5e7eb" strokeWidth="3.5" fill="none" transform="rotate(-90 18 18)" />
              <circle cx="18" cy="18" r={arc.R}
                stroke={isWarning ? '#f97316' : 'url(#rt-g)'}
                strokeWidth="3.5" fill="none" strokeLinecap="round"
                strokeDasharray={arc.C} strokeDashoffset={arc.offset}
                style={{ transition: 'stroke-dashoffset .3s linear, stroke .3s', opacity: running ? 1 : 0.35 }}
                transform="rotate(-90 18 18)"
              />
            </svg>
            {/* live dot */}
            {running && !paused && (
              <span className="absolute top-0 right-0">
                <span className={cx('absolute inline-block w-2 h-2 rounded-full rt-ping', isWarning ? 'bg-orange-400' : 'bg-[var(--color-primary-400)]')} />
                <span className={cx('relative inline-block w-2 h-2 rounded-full', isWarning ? 'bg-orange-400' : 'bg-[var(--color-primary-400)]')} />
              </span>
            )}
          </div>

          {/* time */}
          <span
            className={cx(
              'text-sm font-black tabular-nums tracking-tight md: leading-none min-w-[2.6rem] text-center',
              isWarning ? 'text-orange-500 rt-blink' : running ? 'text-[var(--color-primary-700)]' : 'text-slate-700',
            )}
            aria-live="polite"
          >
            {timeLabel}
          </span>
        </div>

        {/* DIVIDER */}
        <div className="w-px bg-[var(--color-primary-100)] self-stretch" />

        {/* CENTER — stepper (idle) or status label (running) */}
        {!running ? (
          <div className="flex items-center gap-1 px-2 flex-1 justify-center">
            <button
              onMouseDown={() => startHold(-holdStep)} onMouseUp={endHold}
              onMouseLeave={endHold} onTouchStart={() => startHold(-holdStep)} onTouchEnd={endHold}
              onClick={dec}
              className="w-7 h-7 rounded-lg border border-[var(--color-primary-200)] bg-white flex items-center justify-center text-[var(--color-primary-500)] active:scale-90 transition-transform shrink-0"
            >
              <Minus size={12} strokeWidth={2.5} />
            </button>

            <span className="text-[11px] font-bold text-[var(--color-primary-600)] tabular-nums w-9 text-center select-none">
              {toMMSS(seconds)}
            </span>

            <button
              onMouseDown={() => startHold(+holdStep)} onMouseUp={endHold}
              onMouseLeave={endHold} onTouchStart={() => startHold(+holdStep)} onTouchEnd={endHold}
              onClick={inc}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>

            {isDirty && (
              <button
                onClick={handleReset}
                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-400 active:scale-90 transition-all"
                title={t('actions.reset')}
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-2">
            <span className={cx(
              'text-[10px] font-bold uppercase tracking-widest',
              isWarning ? 'text-orange-400 rt-blink' : paused ? 'text-slate-400' : 'text-[var(--color-primary-400)]',
            )}>
              {isWarning
                ? (t('warning') || 'Almost!')
                : paused
                  ? (t('states.paused') || 'Paused')
                  : (t('states.running') || 'Resting')}
            </span>
          </div>
        )}

        {/* DIVIDER */}
        <div className="w-px bg-[var(--color-primary-100)] self-stretch" />

        {/* RIGHT — actions */}
        <div className="flex items-center gap-1 px-2 shrink-0">
          {!running ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-1 rounded-lg px-3 h-8 text-[11px] font-bold text-white active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
            >
              <Play size={10} fill="currentColor" className="translate-x-px" />
              {t('actions.start')}
            </button>
          ) : paused ? (
            <>
              <button
                onClick={() => { resume(); haptic(); }}
                className="flex items-center gap-1 rounded-lg px-2.5 h-8 text-[11px] font-bold border border-[var(--color-primary-200)] text-[var(--color-primary-700)] bg-[var(--color-primary-50)] active:scale-95 transition-transform"
              >
                <Play size={10} fill="currentColor" className="translate-x-px" />
                {t('actions.resume')}
              </button>
              <button
                onClick={() => { stop(); stopAlert(); haptic(20); }}
                className="w-7 h-7 rounded-lg border border-rose-100 flex items-center justify-center text-rose-300 hover:text-rose-500 hover:bg-rose-50 active:scale-90 transition-all"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { pause(); haptic(); }}
                className="flex items-center gap-1 rounded-lg px-2.5 h-8 text-[11px] font-bold border border-[var(--color-primary-200)] text-[var(--color-primary-700)] bg-white active:scale-95 transition-transform"
              >
                <Pause size={10} />
                {t('actions.pause')}
              </button>
              <button
                onClick={() => { stop(); stopAlert(); haptic(20); }}
                className="w-7 h-7 rounded-lg border border-rose-100 flex items-center justify-center text-rose-300 hover:text-rose-500 hover:bg-rose-50 active:scale-90 transition-all"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});