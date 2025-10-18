import { useCountdown } from '@/hooks/workouts/useCountdown';
import { Clock, Edit3, Play, Minus, Pause, Plus, X, Bell, BellOff } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* --------------------------- Pure helpers --------------------------- */
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

/* =========================== Prettier Timer =========================== */
export const RestTimerCard = React.memo(function RestTimerCard({
  alerting,
  setAlerting,
  initialSeconds,
  audioEl,
  className = '',
  // Tweaks
  smallStep = 15, // +/- buttons step when clicked
  holdStep = 5, // +/- step when held
  holdIntervalMs = 120,
  alertLoopMs = 30000,
}) {
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();

  // Local state
  const [seconds, setSeconds] = useState(() => Number(initialSeconds || 90) || 90);

  // Refs
  const holdRef = useRef(null);
  const alertTimeoutRef = useRef(null);
  const hasAlertFiredRef = useRef(false);

  useEffect(() => {
    setSeconds(Number(initialSeconds || 90) || 90);
  }, [initialSeconds]);

  /* --------------------------- Haptics --------------------------- */
  const haptic = useCallback((ms = 10) => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator;
    if (!nav || typeof nav.vibrate !== 'function') return;
    try {
      nav.vibrate(ms);
    } catch {}
  }, []);

  /* --------------------------- Alert control --------------------------- */
  const stopAlert = useCallback(() => {
    try {
      const el = audioEl?.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
        el.loop = false;
      }
    } catch {}
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setAlerting(false);
  }, [audioEl, setAlerting]);

  // Fire alert once when countdown reaches 0
  useEffect(() => {
    if (!running && duration > 0 && remaining === 0 && !hasAlertFiredRef.current) {
      const el = audioEl?.current;
      if (!el) return;
      hasAlertFiredRef.current = true;
      try {
        el.currentTime = 0;
        el.loop = true;
        const p = el.play?.();
        if (p?.catch) p.catch(() => {});
        setAlerting(true);
        alertTimeoutRef.current = setTimeout(stopAlert, alertLoopMs);
      } catch {}
    }
    return () => {
      if (alertTimeoutRef.current && alerting) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [running, remaining, duration, audioEl, setAlerting, alertLoopMs, alerting, stopAlert]);

  /* --------------------------- Time controls --------------------------- */
  const step = useCallback(delta => {
    setSeconds(s => Math.max(0, s + delta));
  }, []);
  const dec = useCallback(() => {
    step(-smallStep);
    haptic();
  }, [haptic, smallStep, step]);
  const inc = useCallback(() => {
    step(+smallStep);
    haptic();
  }, [haptic, smallStep, step]);

  const startHold = useCallback(
    delta => {
      step(delta);
      if (holdRef.current) clearInterval(holdRef.current);
      holdRef.current = setInterval(() => step(delta), holdIntervalMs);
    },
    [holdIntervalMs, step],
  );
  const endHold = useCallback(() => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (holdRef.current) clearInterval(holdRef.current);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    },
    [],
  );

  const handleStart = useCallback(() => {
    hasAlertFiredRef.current = false;
    stopAlert();
    start(seconds);
    haptic(20);
  }, [seconds, start, haptic, stopAlert]);

  /* --------------------------- SVG ring math --------------------------- */
  const ring = useMemo(() => {
    const R = 22; // bigger ring
    const C = 2 * Math.PI * R;
    const pct = duration > 0 ? remaining / duration : 0;
    const dash = C * pct;
    return { R, C, dash, pct };
  }, [remaining, duration]);

  /* --------------------------- Derived label --------------------------- */
  const timeLabel = useMemo(() => toMMSS(running ? remaining : seconds), [running, remaining, seconds]);

  /* --------------------------- UI --------------------------- */
  return (
    <div className={`  pt-2 pb-2 ${className}`}>
      <div className={['  bg-white relative flex items-center gap-3 rounded-lg border border-slate-200 backdrop-blur px-3 py-2.5'].join(' ')} role='group' aria-label='Rest timer'>
        {alerting && <div className='pointer-events-none absolute inset-0 rounded-lg ring-2 ring-rose-200/60' />}

        <button
          onClick={() => {
            if (running) {
              stop();
              stopAlert();
              haptic(20);
            }
          }}
          className={`
    relative shrink-0 grid place-items-center rounded-full 
    transition-all duration-300 ease-out 
    shadow-md hover:shadow-lg active:scale-[0.95]
    bg-gradient-to-br from-slate-50 via-white to-slate-100
    hover:from-indigo-50 hover:via-white hover:to-green-50
  `}
          title={running ? 'Stop timer' : 'Timer'}
          aria-label={running ? 'Stop timer' : 'Timer'}
          style={{
            width: 'clamp(58px, 8vw, 90px)',
            height: 'clamp(58px, 8vw, 90px)',
          }}>
          {/* SVG Timer Circle */}
          <svg width='100%' height='100%' viewBox='0 0 58 58' aria-hidden='true' className='drop-shadow-sm'>
            <defs>
              <linearGradient id='rtGrad' x1='0' y1='0' x2='1' y2='1'>
                <stop offset='0%' stopColor={alerting ? '#f43f5e' : '#6366f1'} />
                <stop offset='50%' stopColor={alerting ? '#f97316' : '#22c55e'} />
                <stop offset='100%' stopColor={alerting ? '#facc15' : '#3b82f6'} />
              </linearGradient>
              <filter id='glow'>
                <feGaussianBlur stdDeviation='2.5' result='coloredBlur' />
                <feMerge>
                  <feMergeNode in='coloredBlur' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
            </defs>

            {/* Background Ring */}
            <circle cx='29' cy='29' r={ring.R} stroke='#e5e7eb' strokeWidth='6' fill='none' />

            {/* Animated Progress Ring */}
            <circle cx='29' cy='29' r={ring.R} stroke='url(#rtGrad)' strokeWidth='6' fill='none' strokeLinecap='round' strokeDasharray={ring.C} strokeDashoffset={ring.C - ring.dash} className={`transition-[stroke-dashoffset,opacity] duration-200 ease-linear ${running ? 'opacity-100' : 'opacity-70'}`} transform='rotate(-90 29 29)' filter='url(#glow)' />
          </svg>

          {/* Time Label */}
          <span
            className={`
      absolute font-semibold tabular-nums
      text-slate-800 
      text-[11px] sm:text-[12px] md:text-[13px] 
      tracking-wide
    `}
            aria-live='polite'>
            {timeLabel}
          </span>

          {/* Animated Pulse When Alerting */}
          {alerting && <span className='absolute inset-0 rounded-full animate-ping bg-red-400/20'></span>}
        </button>

        {/* Center: controls & editor */}
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          {alerting && (
            <button onClick={stopAlert} className='inline-flex items-center gap-1.5 ml-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-2 py-[3px] text-[12px] hover:bg-rose-100' title='Stop alert sound'>
              <BellOff size={12} /> Stop sound
            </button>
          )}
          {!running && (
            <div className='ml-auto flex items-center gap-2'>
              <div className='inline-flex rounded-xl overflow-hidden border border-slate-200 bg-white'>
                <button onMouseDown={() => startHold(-holdStep)} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={() => startHold(-holdStep)} onTouchEnd={endHold} onClick={dec} className='px-2.5 h-8 text-xs hover:bg-slate-50' title={`-${smallStep}s (hold for -${holdStep}/tick)`}>
                  <Minus className=' w-[14px] ' />
                </button>
                <div className='px-2  h-8 grid place-items-center  text-sm font-semibold tabular-nums text-slate-800'>{toMMSS(seconds)}</div>
                <button onMouseDown={() => startHold(+holdStep)} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={() => startHold(+holdStep)} onTouchEnd={endHold} onClick={inc} className='px-2.5 h-8 text-xs hover:bg-slate-50 border-l border-slate-200' title={`+${smallStep}s (hold for +${holdStep}/tick)`}>
                  <Plus className=' w-[14px] ' />
                </button>
              </div>
            </div>
          )}
          <div className=' flex items-center gap-1.5'>
            {!running ? (
              <button onClick={handleStart} className='inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 h-8 text-xs hover:bg-indigo-100' title='Start'>
                <Play size={12} /> Start
              </button>
            ) : paused ? (
              <>
                <button
                  onClick={() => {
                    resume();
                    haptic();
                  }}
                  className='inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 h-8 text-xs hover:bg-emerald-100'
                  title='Resume'>
                  <Play size={12} /> Resume
                </button>
                <button
                  onClick={() => {
                    stop();
                    stopAlert();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 px-3 h-8 text-xs hover:bg-rose-50'
                  title='Stop'>
                  <X size={12} /> Stop
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    pause();
                    haptic();
                  }}
                  className='inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 h-8 text-xs hover:bg-slate-50'
                  title='Pause'>
                  <Pause size={12} /> Pause
                </button>
                <button
                  onClick={() => {
                    stop();
                    stopAlert();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 px-3 h-8 text-xs hover:bg-rose-50'
                  title='Stop'>
                  <X size={12} /> Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
