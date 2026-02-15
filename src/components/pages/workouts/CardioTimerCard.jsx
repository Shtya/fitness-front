'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Minus, Pause, Plus, X, RotateCcw } from 'lucide-react';
import { useCountdown } from '@/hooks/workouts/useCountdown';
import { useTranslations } from 'next-intl';

/* --------------------------- Pure helpers --------------------------- */
function toMMSS(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? '0' : ''}${ss}`;
}

export default function CardioTimerCard({
  durationSeconds = 0,
  note,
  className = '',
  // Tweaks
  smallStep = 15,
  holdStep = 5,
  holdIntervalMs = 120,
}) {
  const t = useTranslations('cardioTimer');
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();

  // Local state
  const initial = Math.max(0, Math.round(Number(durationSeconds) || 0));
  const [seconds, setSeconds] = useState(initial);
  const [showControls, setShowControls] = useState(false);

  // Refs
  const holdRef = useRef(null);
  const prevInitialRef = useRef(initial);

  // Only reset seconds when the initial prop actually changes
  useEffect(() => {
    if (prevInitialRef.current !== initial) {
      setSeconds(initial);
      prevInitialRef.current = initial;
    }
  }, [initial]);

  /* --------------------------- Haptics --------------------------- */
  const haptic = useCallback((ms = 10) => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator;
    if (!nav || typeof nav.vibrate !== 'function') return;
    try {
      nav.vibrate(ms);
    } catch {}
  }, []);

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
    },
    [],
  );

  const handleStart = useCallback(() => {
    start(seconds);
    haptic(20);
  }, [seconds, start, haptic]);

  const handleReset = useCallback(() => {
    stop();
    setSeconds(initial);
    haptic(15);
  }, [stop, initial, haptic]);

  /* --------------------------- SVG ring math --------------------------- */
  const ring = useMemo(() => {
    const R = 32;
    const C = 2 * Math.PI * R;
    const pct = duration > 0 ? remaining / duration : 0;
    const dash = C * pct;
    return { R, C, dash, pct };
  }, [remaining, duration]);

  const timeLabel = useMemo(() => toMMSS(running ? remaining : seconds), [running, remaining, seconds]);

  // Calculate warning state (last 10 seconds)
  const isWarning = running && remaining <= 10 && remaining > 0;
  const isComplete = !running && duration > 0 && remaining === 0;

  return (
    <div className={`mt-3 ${className}`}>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.03);
            opacity: 0.9;
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(-90deg); }
          25% { transform: translateX(-1px) rotate(-90deg); }
          75% { transform: translateX(1px) rotate(-90deg); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { 
            filter: drop-shadow(0 0 4px var(--color-primary-400));
          }
          50% { 
            filter: drop-shadow(0 0 8px var(--color-primary-300));
          }
        }

        @keyframes complete-pulse {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 8px #10b981);
          }
          50% { 
            transform: scale(1.02);
            filter: drop-shadow(0 0 14px #10b981);
          }
        }

        .timer-ring-warning {
          animation: pulse-ring 1s ease-in-out infinite;
        }

        .timer-ring-complete {
          animation: complete-pulse 0.8s ease-in-out infinite;
        }

        .timer-glow {
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .timer-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
      `}</style>

      <div
        className='relative rounded-lg border backdrop-blur shadow-lg transition-all duration-500'
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.95))',
          borderColor: 'var(--color-primary-200)',
          boxShadow: '0 8px 32px -6px rgba(99, 102, 241, 0.15)',
        }}
        role='group'
        aria-label={t('ariaLabel')}
      >
        {/* Main Content - Row Layout */}
        <div className='flex items-center gap-3 p-3'>
          {/* Timer Circle */}
          <button
            onClick={() => {
              if (running) {
                stop();
                haptic(20);
              } else {
                setShowControls(!showControls);
              }
            }}
            className={`
              relative shrink-0 grid place-items-center rounded-full
              transition-all duration-500 ease-out
              focus-visible:outline-none focus-visible:ring-3
              ${running ? 'shadow-lg hover:shadow-xl active:scale-[0.96]' : 'shadow-md hover:shadow-lg active:scale-[0.94]'}
              ${isComplete ? 'timer-ring-complete' : isWarning ? 'timer-ring-warning' : running ? 'timer-glow' : ''}
            `}
            style={{
              ['--tw-ring-color']: 'var(--color-primary-200)',
              width: '72px',
              height: '72px',
              background: running
                ? 'linear-gradient(135deg, #ffffff, var(--color-primary-50))'
                : 'linear-gradient(135deg, var(--color-primary-100), #ffffff)',
            }}
            title={running ? t('stopTimer') : t('configureTimer')}
            aria-label={running ? t('stopTimer') : t('configureTimer')}
          >
            {/* Outer glow ring when running */}
            {running && (
              <div 
                className='absolute inset-0 rounded-full opacity-20 blur-lg transition-opacity duration-500'
                style={{
                  background: 'radial-gradient(circle, var(--color-primary-400), transparent)',
                }}
              />
            )}

            <svg width='100%' height='100%' viewBox='0 0 80 80' aria-hidden='true'>
              <defs>
                <linearGradient id='cardioGradTheme' x1='0' y1='0' x2='1' y2='1'>
                  <stop offset='0%' stopColor='var(--color-gradient-from)' />
                  <stop offset='50%' stopColor='var(--color-gradient-via)' />
                  <stop offset='100%' stopColor='var(--color-gradient-to)' />
                </linearGradient>
                
                <filter id='cardioGlow'>
                  <feGaussianBlur stdDeviation='1.2' result='coloredBlur'/>
                  <feMerge>
                    <feMergeNode in='coloredBlur'/>
                    <feMergeNode in='SourceGraphic'/>
                  </feMerge>
                </filter>
              </defs>

              {/* Background track */}
              <circle 
                cx='40' 
                cy='40' 
                r={ring.R} 
                stroke='#e5e7eb' 
                strokeWidth='6' 
                fill='none' 
                opacity='0.3'
              />

              {/* Progress ring */}
              <circle
                cx='40'
                cy='40'
                r={ring.R}
                stroke={isWarning ? '#f97316' : isComplete ? '#10b981' : 'url(#cardioGradTheme)'}
                strokeWidth='6'
                fill='none'
                strokeLinecap='round'
                strokeDasharray={ring.C}
                strokeDashoffset={ring.C - ring.dash}
                className={`transition-all duration-300 ease-linear ${isWarning ? 'timer-shake' : ''}`}
                style={{
                  filter: running ? 'url(#cardioGlow)' : 'none',
                  opacity: running ? 1 : 0.5,
                }}
                transform='rotate(-90 40 40)'
              />
            </svg>

            {/* Time display */}
            <div className='absolute inset-0 flex flex-col items-center justify-center'>
              <span 
                className={`font-bold tabular-nums tracking-tight transition-all duration-300 text-xl ${
                  isWarning ? 'text-orange-600' : isComplete ? 'text-emerald-600' : 'text-slate-800'
                }`}
                aria-live='polite'
              >
                {timeLabel}
              </span> 
            </div>
          </button>

          {/* Right Side - Controls */}
          <div className='flex-1 flex flex-col gap-2 min-w-0'>
            {/* Time Adjustment - Only show when not running */}
            {!running && (
              <div className='flex items-center gap-1.5'>
                <button
                  onMouseDown={() => startHold(-holdStep)}
                  onMouseUp={endHold}
                  onMouseLeave={endHold}
                  onTouchStart={() => startHold(-holdStep)}
                  onTouchEnd={endHold}
                  onClick={dec}
                  className='w-8 h-8 rounded-lg grid place-items-center transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow border'
                  style={{
                    background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
                    borderColor: 'var(--color-primary-200)',
                    color: 'var(--color-primary-700)',
                  }}
                  title={t('adjustTime', { seconds: -smallStep })}
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>

                <div 
                  className='flex-1 px-3 py-1.5 rounded-lg border shadow-inner font-bold text-base tabular-nums text-center'
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9), var(--color-primary-50))',
                    borderColor: 'var(--color-primary-200)',
                    color: 'var(--color-primary-800)',
                  }}
                >
                  {toMMSS(seconds)}
                </div>

                <button
                  onMouseDown={() => startHold(+holdStep)}
                  onMouseUp={endHold}
                  onMouseLeave={endHold}
                  onTouchStart={() => startHold(+holdStep)}
                  onTouchEnd={endHold}
                  onClick={inc}
                  className='w-8 h-8 rounded-lg grid place-items-center transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow'
                  style={{
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    color: '#ffffff',
                  }}
                  title={t('adjustTime', { seconds: smallStep })}
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>

                {seconds !== initial && (
                  <button
                    onClick={handleReset}
                    className='w-8 h-8 rounded-lg grid place-items-center border transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow'
                    style={{
                      background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
                      borderColor: 'var(--color-primary-200)',
                      color: 'var(--color-primary-600)',
                    }}
                    title={t('actions.reset')}
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Action Buttons Row */}
            <div className='flex items-center gap-1.5'>
              {!running ? (
                <button
                  onClick={handleStart}
                  className='flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold border transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 shadow-md hover:shadow-lg'
                  style={{
                    ['--tw-ring-color']: 'var(--color-primary-300)',
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    borderColor: 'var(--color-primary-600)',
                    color: '#ffffff',
                  }}
                >
                  <Play size={13} fill='currentColor' />
                  <span>{t('actions.start')}</span>
                </button>
              ) : paused ? (
                <>
                  <button
                    onClick={() => {
                      resume();
                      haptic();
                    }}
                    className='flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 shadow-md hover:shadow-lg'
                    style={{
                      ['--tw-ring-color']: 'var(--color-primary-300)',
                      background: 'linear-gradient(135deg, var(--color-secondary-50), var(--color-secondary-100))',
                      borderColor: 'var(--color-primary-300)',
                      color: 'var(--color-primary-700)',
                    }}
                  >
                    <Play size={13} fill='currentColor' />
                    <span>{t('actions.resume')}</span>
                  </button>
                  <button
                    onClick={() => {
                      stop();
                      haptic(20);
                    }}
                    className='w-8 h-8 rounded-lg grid place-items-center border transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow hover:bg-rose-50'
                    style={{ 
                      borderColor: '#fecdd3', 
                      color: '#e11d48',
                      background: '#ffffff',
                    }}
                    title={t('actions.stop')}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      pause();
                      haptic();
                    }}
                    className='flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 shadow-sm hover:shadow-md'
                    style={{ 
                      ['--tw-ring-color']: 'var(--color-primary-200)', 
                      borderColor: 'var(--color-primary-300)',
                      background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
                      color: 'var(--color-primary-700)',
                    }}
                  >
                    <Pause size={13} />
                    <span>{t('actions.pause')}</span>
                  </button>
                  <button
                    onClick={() => {
                      stop();
                      haptic(20);
                    }}
                    className='w-8 h-8 rounded-lg grid place-items-center border transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow hover:bg-rose-50'
                    style={{ 
                      borderColor: '#fecdd3', 
                      color: '#e11d48',
                      background: '#ffffff',
                    }}
                    title={t('actions.stop')}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Note section - appears below main controls */}
        {!!note && (
          <div className='px-3 pb-3'>
            <div
              className='rounded-lg border px-3 py-2 text-xs'
              style={{
                borderColor: 'var(--color-primary-200)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
                color: 'var(--color-slate-700)',
              }}
            >
              <span className='font-semibold text-slate-800'>{t('note')}:</span>{' '}
              <span className='text-slate-600'>{String(note)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}