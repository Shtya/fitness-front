// components/TimeField.jsx
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, X, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const pad = n => String(n).padStart(2, '0');

export function TimeField({ 
  labelKey = 'timeField.label', 
  name = 'time', 
  value, 
  onChange, 
  className = '', 
  error, 
  minuteStep = 5, 
  showLabel = true 
}) {
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const [tempH, setTempH] = useState('08');
  const [tempM, setTempM] = useState('00');
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  const [placement, setPlacement] = useState({
    top: 0,
    left: 0,
    width: 360,
    maxHeight: 320,
    where: 'bottom',
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const v = (value || '').trim();
    if (hhmmRegex.test(v)) {
      const [h, m] = v.split(':');
      setTempH(pad(Number(h)));
      setTempM(pad(Number(m)));
    }
  }, [value]);

  // Outside click
  useEffect(() => {
    const onDoc = e => {
      if (!open) return;
      const root = rootRef.current;
      const panel = panelRef.current;
      if (!root) return;
      const insideTrigger = root.contains(e.target);
      const insidePanel = panel ? panel.contains(e.target) : false;
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  // Keyboard handling
  useEffect(() => {
    const onKey = e => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Enter') {
        commit(tempH, tempM);
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, tempH, tempM]);

  const commit = useCallback(
    (h = tempH, m = tempM) => {
      const val = `${pad(Number(h))}:${pad(Number(m))}`;
      onChange?.(val);
    },
    [onChange, tempH, tempM],
  );

  const onManual = e => {
    const v = e?.target?.value ?? e;
    onChange?.(v);
  };

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minutes = useMemo(() => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => pad(i * minuteStep)), [minuteStep]);

  const isValid = useMemo(() => (value ? hhmmRegex.test(value) : true), [value]);
  const selectedDisplay = useMemo(() => (value && hhmmRegex.test(value) ? value : `${tempH}:${tempM}`), [value, tempH, tempM]);

  // Viewport-aware placement
  const measureAndPlace = useCallback(() => {
    if (!open) return;
    const triggerEl = rootRef.current?.querySelector('input');
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) return;

    const margin = 8;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const r = triggerEl.getBoundingClientRect();

    const desiredWidth = Math.min(380, Math.max(360, r.width));

    const prev = {
      width: panelEl.style.width,
      maxHeight: panelEl.style.maxHeight,
      visibility: panelEl.style.visibility,
      position: panelEl.style.position,
      top: panelEl.style.top,
      left: panelEl.style.left,
    };
    panelEl.style.width = `${desiredWidth}px`;
    panelEl.style.maxHeight = 'unset';
    panelEl.style.visibility = 'hidden';
    panelEl.style.position = 'fixed';
    panelEl.style.top = '0';
    panelEl.style.left = '-9999px';

    const panelHeight = panelEl.scrollHeight;

    const spaceBelow = vh - r.bottom - margin;
    const spaceAbove = r.top - margin;

    let where = 'bottom';
    let top = r.bottom + margin;
    let maxHeight = panelHeight;

    if (panelHeight <= spaceBelow) {
      where = 'bottom';
      top = r.bottom + margin;
      maxHeight = Math.min(panelHeight, spaceBelow);
    } else if (panelHeight <= spaceAbove) {
      where = 'top';
      top = Math.max(margin, r.top - margin - panelHeight);
      maxHeight = Math.min(panelHeight, spaceAbove);
    } else {
      if (spaceBelow >= spaceAbove) {
        where = 'bottom';
        top = r.bottom + margin;
        maxHeight = Math.max(140, spaceBelow);
      } else {
        where = 'top';
        top = Math.max(margin, r.top - margin - Math.max(140, spaceAbove));
        maxHeight = Math.max(140, spaceAbove);
      }
    }

    let left = r.left;
    const rightOverflow = left + desiredWidth + margin - vw;
    if (rightOverflow > 0) left = Math.max(margin, left - rightOverflow);
    if (left < margin) left = margin;

    setPlacement({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(desiredWidth),
      maxHeight: Math.round(maxHeight),
      where,
    });

    panelEl.style.width = prev.width;
    panelEl.style.maxHeight = prev.maxHeight;
    panelEl.style.visibility = prev.visibility;
    panelEl.style.position = prev.position;
    panelEl.style.top = prev.top;
    panelEl.style.left = prev.left;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => measureAndPlace());
    });
    return () => cancelAnimationFrame(raf);
  }, [open, measureAndPlace]);

  useEffect(() => {
    if (!open) return;
    const reflow = () => measureAndPlace();
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    };
  }, [open, measureAndPlace]);

  const Panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: placement.where === 'bottom' ? -8 : 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement.where === 'bottom' ? -8 : 8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 0.8 }}
          style={{
            position: 'fixed',
            top: placement.top,
            left: placement.left,
            width: 440,
            zIndex: 9999000000,
          }}
          className='overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-sm'>


          <div className='relative overflow-hidden bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] px-5 py-4'>
            {/* Subtle pattern overlay */}
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] opacity-60' />
            
            <div className='relative flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm ring-1 ring-white/30'>
                  <Clock className='h-5 w-5 text-white' />
                </div>
                <div>
                  <p className='text-sm font-semibold tracking-wide text-white'>{t('timeField.choose')}</p>
                  <p className='text-xs text-white/80'>{t('timeField.selectTime')}</p>
                </div>
              </div>
              <button 
                type='button' 
                onClick={() => setOpen(false)} 
                className='rounded-lg bg-white/10 p-1.5 backdrop-blur-sm ring-1 ring-white/20 transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40' 
                aria-label={t('timeField.close')}
              >
                <X className='h-4 w-4 text-white' />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className='bg-white' style={{ maxHeight: placement.maxHeight }}>
            <div className='grid grid-cols-2 gap-5 p-5'>
              {/* Hours */}
              <div>
                <div className='mb-3 flex items-center justify-between'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-slate-600'>
                    {t('timeField.hour')}
                  </span>
                  <span className='text-xs font-bold text-[var(--color-primary-600)]'>{tempH}</span>
                </div>
                <div className='scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 grid max-h-44 grid-cols-6 gap-1.5 overflow-y-auto'>
                  {hours.map(h => {
                    const active = h === tempH;
                    return (
                      <button
                        key={h}
                        type='button'
                        onClick={() => {
                          setTempH(h);
                          commit(h, tempM);
                        }}
                        className={[
                          'relative h-9 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2',
                          active
                            ? 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg shadow-[var(--color-primary-500)]/30 ring-2 ring-[var(--color-primary-200)] focus:ring-[var(--color-primary-300)] scale-105'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:scale-105 focus:ring-[var(--color-primary-200)]',
                        ].join(' ')}
                      >
                         {active && (
                          <motion.div
                            layoutId="active-hour"
                            className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]"
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          />
                        )}
                        <span className="relative z-10">{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <div className='mb-3 flex items-center justify-between'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-slate-600'>
                    {t('timeField.minutes')}
                  </span>
                  <span className='text-xs font-bold text-[var(--color-primary-600)]'>{tempM}</span>
                </div>
                <div className='scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 grid max-h-44 grid-cols-6 gap-1.5 overflow-y-auto'>
                  {minutes.map(m => {
                    const active = m === tempM;
                    return (
                      <button
                        key={m}
                        type='button'
                        onClick={() => {
                          setTempM(m);
                          commit(tempH, m);
                        }}
                        className={[
                          'relative h-9 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2',
                          active
                            ? 'bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg shadow-[var(--color-primary-500)]/30 ring-2 ring-[var(--color-primary-200)] focus:ring-[var(--color-primary-300)] scale-105'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:scale-105 focus:ring-[var(--color-primary-200)]',
                        ].join(' ')}
                      >
                         {active && (
                          <motion.div
                            layoutId="active-minute"
                            className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]"
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          />
                        )}
                        <span className="relative z-10">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-4'>
              <div className='flex items-center gap-2'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'>
                  <Clock className='h-4 w-4' />
                </div>
                <div>
                  <p className='text-xs text-slate-500'>{t('timeField.selected')}</p>
                  <p className='text-sm font-bold text-slate-900'>{selectedDisplay}</p>
                </div>
              </div>
              <button 
                type='button' 
                onClick={() => setOpen(false)} 
                className='group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary-500)]/30 ring-1 ring-[var(--color-primary-200)] transition-all hover:shadow-xl hover:shadow-[var(--color-primary-500)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] focus:ring-offset-2'
              >
                <CheckCircle2 className='h-4 w-4 transition-transform group-hover:scale-110' />
                {t('timeField.done')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {showLabel && (
        <label htmlFor={name} className='mb-2 block text-sm font-semibold text-slate-700'>
          {t(labelKey)}
        </label>
      )}

      <div className='group relative'>
        <input
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck='false'
          id={name}
          name={name}
          value={value || ''}
          onChange={onManual}
          onPointerDown={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={t('timeField.placeholder')}
          className={[
            'w-full rounded-lg border bg-white px-4 py-3 pe-11 text-sm font-medium shadow-sm transition-all duration-200',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-4',
            !isValid || error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-200 focus:border-[var(--color-primary-500)] focus:ring-[var(--color-primary-100)] group-hover:border-slate-300',
            'disabled:cursor-not-allowed disabled:opacity-60',
          ].join(' ')}
          aria-invalid={!isValid || !!error}
          aria-describedby={!isValid || error ? `${name}-error` : undefined}
        />
        <button
          type='button'
          aria-label={t('timeField.openPicker')}
          onPointerDown={() => setOpen(s => !s)}
          className='absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-[var(--color-primary-600)] group-focus-within:text-[var(--color-primary-600)]'
        >
          <Clock className='h-5 w-5' />
        </button>
      </div>

      {!isValid || error ? (
        <motion.p 
          id={`${name}-error`} 
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className='mt-2 flex items-center gap-1.5 text-xs text-rose-600'
        >
          <span className='inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-100'>
            <X className='h-3 w-3' />
          </span>
          {error || t('timeField.invalid')}
        </motion.p>
      ) : null}

      {mounted ? createPortal(Panel, document.body) : null}
    </div>
  );
}