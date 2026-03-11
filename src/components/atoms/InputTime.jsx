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
    top: 0, left: 0, width: 440, maxHeight: 340, where: 'bottom',
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
      if (!root.contains(e.target) && !(panel ? panel.contains(e.target) : false)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  // Keyboard
  useEffect(() => {
    const onKey = e => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Enter') { commit(tempH, tempM); setOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, tempH, tempM]);

  const commit = useCallback((h = tempH, m = tempM) => {
    onChange?.(`${pad(Number(h))}:${pad(Number(m))}`);
  }, [onChange, tempH, tempM]);

  const onManual = e => onChange?.(e?.target?.value ?? e);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minutes = useMemo(() => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => pad(i * minuteStep)), [minuteStep]);

  const isValid = useMemo(() => value ? hhmmRegex.test(value) : true, [value]);
  const selectedDisplay = useMemo(() => (value && hhmmRegex.test(value) ? value : `${tempH}:${tempM}`), [value, tempH, tempM]);

  const measureAndPlace = useCallback(() => {
    if (!open) return;
    const triggerEl = rootRef.current?.querySelector('input');
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) return;

    const margin = 8;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const r = triggerEl.getBoundingClientRect();
    const desiredWidth = Math.min(440, Math.max(360, r.width));

    const prev = { width: panelEl.style.width, maxHeight: panelEl.style.maxHeight, visibility: panelEl.style.visibility, position: panelEl.style.position, top: panelEl.style.top, left: panelEl.style.left };
    panelEl.style.width = `${desiredWidth}px`;
    panelEl.style.maxHeight = 'unset';
    panelEl.style.visibility = 'hidden';
    panelEl.style.position = 'fixed';
    panelEl.style.top = '0';
    panelEl.style.left = '-9999px';

    const panelHeight = panelEl.scrollHeight;
    const spaceBelow = vh - r.bottom - margin;
    const spaceAbove = r.top - margin;

    let where = 'bottom', top = r.bottom + margin, maxHeight = panelHeight;

    if (panelHeight <= spaceBelow) { where = 'bottom'; top = r.bottom + margin; maxHeight = Math.min(panelHeight, spaceBelow); }
    else if (panelHeight <= spaceAbove) { where = 'top'; top = Math.max(margin, r.top - margin - panelHeight); maxHeight = Math.min(panelHeight, spaceAbove); }
    else {
      if (spaceBelow >= spaceAbove) { where = 'bottom'; top = r.bottom + margin; maxHeight = Math.max(140, spaceBelow); }
      else { where = 'top'; top = Math.max(margin, r.top - margin - Math.max(140, spaceAbove)); maxHeight = Math.max(140, spaceAbove); }
    }

    let left = r.left;
    const rightOverflow = left + desiredWidth + margin - vw;
    if (rightOverflow > 0) left = Math.max(margin, left - rightOverflow);
    if (left < margin) left = margin;

    setPlacement({ top: Math.round(top), left: Math.round(left), width: Math.round(desiredWidth), maxHeight: Math.round(maxHeight), where });

    panelEl.style.width = prev.width; panelEl.style.maxHeight = prev.maxHeight; panelEl.style.visibility = prev.visibility;
    panelEl.style.position = prev.position; panelEl.style.top = prev.top; panelEl.style.left = prev.left;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => measureAndPlace()); });
    return () => cancelAnimationFrame(raf);
  }, [open, measureAndPlace]);

  useEffect(() => {
    if (!open) return;
    const reflow = () => measureAndPlace();
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => { window.removeEventListener('scroll', reflow, true); window.removeEventListener('resize', reflow); };
  }, [open, measureAndPlace]);

  const Panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: placement.where === 'bottom' ? -10 : 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement.where === 'bottom' ? -10 : 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26, mass: 0.7 }}
          style={{ position: 'fixed', top: placement.top, left: placement.left, width: 440, zIndex: 9999000000 }}
          className="overflow-hidden rounded-lg shadow-2xl ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] px-5 py-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_60%,rgba(255,255,255,0.15),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                  <Clock className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{t('timeField.choose')}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">{t('timeField.selectTime')}</p>
                </div>
              </div>

              {/* Live preview badge */}
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/15 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-sm">
                  <span className="text-base font-black tracking-widest text-white tabular-nums">{selectedDisplay}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none"
                  aria-label={t('timeField.close')}
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white" style={{ maxHeight: placement.maxHeight }}>
            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">
              {/* Hours column */}
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('timeField.hour')}</span>
                  <span className="rounded-lg bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-black text-[var(--color-primary-600)]">{tempH}</span>
                </div>
                <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                  {hours.map(h => {
                    const active = h === tempH;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => { setTempH(h); commit(h, tempM); }}
                        className={[
                          'relative h-9 rounded-lg text-xs font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] overflow-hidden',
                          active
                            ? 'text-white shadow-md scale-105 focus:ring-offset-1'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:scale-105',
                        ].join(' ')}
                        style={active ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', boxShadow: '0 4px 12px -4px var(--color-primary-500)' } : {}}
                      >
                        {active && (
                          <motion.div
                            layoutId="active-hour"
                            className="absolute inset-0 rounded-lg"
                            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10">{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes column */}
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('timeField.minutes')}</span>
                  <span className="rounded-lg bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-black text-[var(--color-primary-600)]">{tempM}</span>
                </div>
                <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                  {minutes.map(m => {
                    const active = m === tempM;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setTempM(m); commit(tempH, m); }}
                        className={[
                          'relative h-9 rounded-lg text-xs font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] overflow-hidden',
                          active
                            ? 'text-white shadow-md scale-105'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:scale-105',
                        ].join(' ')}
                        style={active ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', boxShadow: '0 4px 12px -4px var(--color-primary-500)' } : {}}
                      >
                        {active && (
                          <motion.div
                            layoutId="active-minute"
                            className="absolute inset-0 rounded-lg"
                            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
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
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">{t('timeField.selected')}</p>
                  <p className="text-sm font-black text-slate-900 tabular-nums tracking-wide">{selectedDisplay}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] focus:ring-offset-1"
                style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', boxShadow: '0 4px 14px -4px var(--color-primary-500)' }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
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
        <label htmlFor={name} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
          {t(labelKey)}
        </label>
      )}

      <div className="group relative">
        <input
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          id={name}
          name={name}
          value={value || ''}
          onChange={onManual}
          onPointerDown={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={t('timeField.placeholder')}
          className={[
            'h-10 w-full rounded-lg border bg-white px-3 pe-10 text-sm font-medium transition-all duration-200 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2',
            !isValid || error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
              : 'border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary-400)] focus:ring-[var(--color-primary-200)]',
          ].join(' ')}
          aria-invalid={!isValid || !!error}
        />
        <button
          type="button"
          aria-label={t('timeField.openPicker')}
          onPointerDown={() => setOpen(s => !s)}
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-[var(--color-primary-500)] group-focus-within:text-[var(--color-primary-500)]"
        >
          <Clock className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {(!isValid || error) && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-500"
          >
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-100">
              <X className="h-2.5 w-2.5" />
            </span>
            {error || t('timeField.invalid')}
          </motion.p>
        )}
      </AnimatePresence>

      {mounted ? createPortal(Panel, document.body) : null}
    </div>
  );
}