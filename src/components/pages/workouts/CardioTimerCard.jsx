'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { useCountdown } from '@/hooks/workouts/useCountdown';

const cx = (...c) => c.filter(Boolean).join(' ');

function toMMSS(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? '0' : ''}${ss}`;
}

export default function CardioTimerCard({ durationSeconds = 0, note, className = '' }) {
  const initial = Math.max(0, Math.round(Number(durationSeconds) || 0));
  const { remaining, running, paused, start, pause, resume, stop, duration } = useCountdown();

  // if cardio exercise changes, reset internal "ready" time
  const [readySeconds, setReadySeconds] = useState(initial);
  useEffect(() => setReadySeconds(initial), [initial]);

  const handleStart = useCallback(() => {
    start(readySeconds);
  }, [readySeconds, start]);

  const timeLabel = useMemo(() => toMMSS(running ? remaining : readySeconds), [running, remaining, readySeconds]);

  // simple ring math (optional pretty)
  const ring = useMemo(() => {
    const R = 22;
    const C = 2 * Math.PI * R;
    const pct = duration > 0 ? remaining / duration : 0;
    const dash = C * pct;
    return { R, C, dash };
  }, [remaining, duration]);

  return (
    <div className={cx('mt-3', className)}>
      <div
        className='bg-white relative rounded-2xl border backdrop-blur px-3 py-3'
        style={{
          borderColor: 'var(--color-primary-200)',
          boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
        }}
      >
        <div className='flex items-center gap-3'>
          <div
            className='relative shrink-0 grid place-items-center rounded-full shadow-md'
            style={{
              width: 'clamp(62px, 8vw, 92px)',
              height: 'clamp(62px, 8vw, 92px)',
              background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
            }}
            title='Cardio timer'
          >
            <svg width='100%' height='100%' viewBox='0 0 58 58' aria-hidden='true'>
              <defs>
                <linearGradient id='cardioGrad' x1='0' y1='0' x2='1' y2='1'>
                  <stop offset='0%' stopColor='var(--color-gradient-from)' />
                  <stop offset='50%' stopColor='var(--color-gradient-via)' />
                  <stop offset='100%' stopColor='var(--color-gradient-to)' />
                </linearGradient>
              </defs>

              <circle cx='29' cy='29' r={ring.R} stroke='#e5e7eb' strokeWidth='6' fill='none' />

              <circle
                cx='29'
                cy='29'
                r={ring.R}
                stroke='url(#cardioGrad)'
                strokeWidth='6'
                fill='none'
                strokeLinecap='round'
                strokeDasharray={ring.C}
                strokeDashoffset={ring.C - ring.dash}
                className='transition-[stroke-dashoffset,opacity] duration-200 ease-linear'
                transform='rotate(-90 29 29)'
                opacity={running ? 1 : 0.7}
              />
            </svg>

            <span className='absolute font-semibold tabular-nums text-slate-800 text-[12px] tracking-wide' aria-live='polite'>
              {timeLabel}
            </span>
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              {!running ? (
                <button
                  onClick={handleStart}
                  className='inline-flex items-center gap-1 rounded-2xl px-3 h-9 text-xs font-semibold border focus-visible:outline-none focus-visible:ring-4'
                  style={{
                    ['--tw-ring-color']: 'var(--color-primary-200)',
                    background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                    borderColor: 'var(--color-primary-200)',
                    color: 'var(--color-primary-800)',
                  }}
                  title='Start cardio'
                >
                  <Play size={12} /> Start
                </button>
              ) : paused ? (
                <>
                  <button
                    onClick={resume}
                    className='inline-flex items-center gap-1 rounded-2xl px-3 h-9 text-xs font-semibold border focus-visible:outline-none focus-visible:ring-4'
                    style={{
                      ['--tw-ring-color']: 'var(--color-primary-200)',
                      background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                      borderColor: 'var(--color-primary-200)',
                      color: 'var(--color-primary-800)',
                    }}
                    title='Resume'
                  >
                    <Play size={12} /> Resume
                  </button>

                  <button
                    onClick={stop}
                    className='inline-flex items-center gap-1 rounded-2xl border px-3 h-9 text-xs hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4'
                    style={{ ['--tw-ring-color']: 'var(--color-primary-200)', borderColor: '#fecdd3', color: '#e11d48' }}
                    title='Stop'
                  >
                    <X size={12} /> Stop
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={pause}
                    className='inline-flex items-center gap-1 rounded-2xl border px-3 h-9 text-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4'
                    style={{ ['--tw-ring-color']: 'var(--color-primary-200)', borderColor: 'var(--color-primary-200)' }}
                    title='Pause'
                  >
                    <Pause size={12} /> Pause
                  </button>

                  <button
                    onClick={stop}
                    className='inline-flex items-center gap-1 rounded-2xl border px-3 h-9 text-xs hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4'
                    style={{ ['--tw-ring-color']: 'var(--color-primary-200)', borderColor: '#fecdd3', color: '#e11d48' }}
                    title='Stop'
                  >
                    <X size={12} /> Stop
                  </button>
                </>
              )}
            </div>

            {!!note && (
              <div
                className='mt-2 rounded-2xl border px-3 py-2 text-sm text-slate-700'
                style={{
                  borderColor: 'var(--color-primary-200)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
                }}
              >
                <span className='font-semibold'>Note:</span> {String(note)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
