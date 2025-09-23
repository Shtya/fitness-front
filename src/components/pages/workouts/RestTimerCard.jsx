import { useCountdown } from '@/hooks/workouts/useCountdown';
import { Clock, Edit3, Play, Minus, Pause, Plus, X } from 'lucide-react';
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

export const RestTimerCard = React.memo(function RestTimerCard({
  alerting,
  setAlerting,
  initialSeconds,
  audioEl,
  className = '',
  // Tweaks
  smallStep = 15, // +/- buttons step when clicked
  holdStep = 5, // +/- step when held
  holdIntervalMs = 120, // long-press interval
  alertLoopMs = 30000, // auto-stop alert after this
}) {
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();

  // Local state
  const [seconds, setSeconds] = useState(() => Number(initialSeconds || 90) || 90);
  const [showInput, setShowInput] = useState(false);

  // Refs
  const inputRef = useRef(null);
  const holdRef = useRef(null);
  const alertTimeoutRef = useRef(null);
  const hasAlertFiredRef = useRef(false);

  useEffect(() => {
    setSeconds(Number(initialSeconds || 90) || 90);
  }, [initialSeconds]);

  /* --------------------------- Haptics (throttled) --------------------------- */
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

  // Fire alert once when countdown reaches 0 after a valid run
  useEffect(() => {
    if (!running && duration > 0 && remaining === 0 && !hasAlertFiredRef.current) {
      const el = audioEl?.current;
      if (!el) return;
      hasAlertFiredRef.current = true;
      try {
        el.currentTime = 0;
        el.loop = true;
        const maybePromise = el.play?.();
        // best effort: some browsers require user gesture; ignore rejections
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => {});
        }
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

  useEffect(() => {
    // safety cleanup on unmount
    return () => {
      if (holdRef.current) clearInterval(holdRef.current);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    hasAlertFiredRef.current = false; // fresh run
    stopAlert(); // silence any previous loop
    start(seconds);
    haptic(20);
  }, [seconds, start, haptic, stopAlert]);

  const toggleEdit = useCallback(() => {
    setShowInput(v => !v);
    // focus next frame
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const commitInput = useCallback(e => {
    setSeconds(mmssToSeconds(e.target.value));
    setShowInput(false);
  }, []);

  /* --------------------------- SVG ring math --------------------------- */
  const ring = useMemo(() => {
    const R = 17;
    const C = 2 * Math.PI * R;
    const pct = duration > 0 ? remaining / duration : 0;
    const dash = C * pct;
    return { R, C, dash, pct };
  }, [remaining, duration]);

  /* --------------------------- Derived label --------------------------- */
  const timeLabel = useMemo(() => toMMSS(running ? remaining : seconds), [running, remaining, seconds]);

  return (
    <div className={`px-2 pt-2 pb-2 ${className}`}>
      <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2'>
        {/* Left: tiny ring (stop also silences alert) */}
        <button
          onClick={() => {
            if (running) {
              stop();
              stopAlert();
              haptic(20);
            }
          }}
          className='relative shrink-0 grid place-items-center rounded-full'
          title={running ? 'Stop' : 'Timer'}
          aria-label={running ? 'Stop timer' : 'Timer'}
          style={{ width: 44, height: 44 }}>
          <svg width='44' height='44' viewBox='0 0 44 44' aria-hidden='true'>
            <circle cx='22' cy='22' r={ring.R} stroke='#e5e7eb' strokeWidth='6' fill='none' />
            <circle cx='22' cy='22' r={ring.R} stroke='currentColor' strokeWidth='6' fill='none' strokeDasharray={ring.C} strokeDashoffset={ring.C - ring.dash} className={`transition-[stroke-dashoffset] duration-200 ease-linear ${running ? 'text-indigo-600' : 'text-slate-300'}`} transform='rotate(-90 22 22)' />
          </svg>
          <span className='absolute text-[10px] font-semibold text-slate-700 tabular-nums' aria-live='polite'>
            {timeLabel}
          </span>
        </button>

        {/* Stop sound (only while alert is looping) */}
        {alerting && (
          <button onClick={stopAlert} className='inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 px-2.5 py-1 text-xs hover:bg-red-100' title='Stop alert sound'>
            <X size={12} /> Stop sound
          </button>
        )}

        {/* Middle: controls */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1.5'>
            {!running ? (
              <button onClick={handleStart} className='inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs hover:bg-indigo-100' title='Start'>
                <Clock size={12} /> Start
              </button>
            ) : paused ? (
              <>
                <button
                  onClick={() => {
                    resume();
                    haptic();
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs hover:bg-emerald-100'
                  title='Resume'>
                  <Play size={12} /> Resume
                </button>
                <button
                  onClick={() => {
                    stop();
                    stopAlert();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50'
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
                  className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50'
                  title='Pause'>
                  <Pause size={12} /> Pause
                </button>
                <button
                  onClick={() => {
                    stop();
                    stopAlert();
                    haptic(20);
                  }}
                  className='inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50'
                  title='Stop'>
                  <X size={12} /> Stop
                </button>
              </>
            )}

            {/* +/- tiny controls (only when idle) */}
            {!running && (
              <div className='ml-auto inline-flex rounded-lg overflow-hidden border border-slate-200'>
                <button onMouseDown={() => startHold(-holdStep)} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={() => startHold(-holdStep)} onTouchEnd={endHold} onClick={dec} className='px-2 py-1.5 text-xs hover:bg-slate-50' title={`-${smallStep}s (hold for -${holdStep}/tick)`}>
                  <Minus size={12} />
                </button>
                <button onMouseDown={() => startHold(+holdStep)} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={() => startHold(+holdStep)} onTouchEnd={endHold} onClick={inc} className='px-2 py-1.5 text-xs hover:bg-slate-50 border-l border-slate-200' title={`+${smallStep}s (hold for +${holdStep}/tick)`}>
                  <Plus size={12} />
                </button>
                <button onClick={toggleEdit} className='px-2 py-1.5 text-xs hover:bg-slate-50 border-l border-slate-200' title='Edit mm:ss'>
                  <Edit3 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Inline editor (idle only) */}
          {!running && showInput && (
            <div className='mt-1 flex items-center gap-1.5'>
              <div className='relative ml-auto'>
                <input ref={inputRef} type='text' defaultValue={toMMSS(seconds)} onBlur={commitInput} onKeyDown={e => e.key === 'Enter' && commitInput(e)} className='h-7 w-[76px] rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 tabular-nums' placeholder='mm:ss' inputMode='numeric' aria-label='Set custom time (mm:ss)' />
                <span className='absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 select-none'>mm:ss</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
