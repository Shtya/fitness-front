'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  ChevronDown,
  Check,
  Rows3,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

/* ═══════════════════════════════════════════════════════════════
   PRETTY PAGINATION
═══════════════════════════════════════════════════════════════ */
export function PrettyPagination({
  page,
  totalPages,
  onPageChange,
  className = '',
  showEdges = true,
  maxButtons = 7,
  compactUntil = 520,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const t = useTranslations('pagination');
  const [isCompact, setIsCompact] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= compactUntil);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [compactUntil]);

  const clamp = p => Math.max(1, Math.min(totalPages || 1, p));
  const go = p => onPageChange?.(clamp(p));

  const items = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const count = Math.max(3, maxButtons);
    const set = new Set([1, totalPages, page]);

    if (page - 1 >= 1) set.add(page - 1);
    if (page + 1 <= totalPages) set.add(page + 1);

    while (set.size < Math.min(count, 7)) {
      const min = Math.min(...set);
      const max = Math.max(...set);
      if (min > 2) set.add(min - 1);
      else if (max < totalPages - 1) set.add(max + 1);
      else break;
    }

    const sorted = [...set].sort((a, b) => a - b);
    const out = [];

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
      out.push(p);
    }

    if (out.filter(x => x !== '…').length < 3) return [1, 2, 3, '…', totalPages];
    return out;
  }, [page, totalPages, maxButtons]);

  if (!totalPages || totalPages <= 1) return null;

  const showPageSize =
    typeof pageSize === 'number' && !!onPageSizeChange && !isCompact;

  return (
    <nav
      className={`flex  flex-wrap items-center justify-center gap-3 ${className}`}
      role="navigation"
      aria-label={t('aria_label')}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative  bg-card w-fit inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lg shadow-slate-200/60 backdrop-blur-md"
      >
        {/* Ambient top-edge glow */}
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary-300), transparent)', opacity: 0.7 }}
        />
        {/* Soft inner bg tint */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.025]"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
        />

        {/* ── Page size selector ── */}
        {showPageSize && mounted && (
          <>
            <PageSizeSelect
              value={pageSize}
              onChange={onPageSizeChange}
              options={pageSizeOptions}
              t={t}
            />
            <div
              className="h-6 w-px mx-0.5 flex-shrink-0"
              style={{ background: 'linear-gradient(180deg, transparent, var(--color-primary-200), transparent)' }}
            />
          </>
        )}

        {/* ── Navigation ── */}
        <div className="flex items-center gap-0.5">
          {showEdges && !isCompact && (
            <NavBtn onClick={() => go(1)} disabled={page <= 1} label={t('first_page')}>
              <ChevronsLeft size={15} strokeWidth={2.5} className="rtl:rotate-180" />
            </NavBtn>
          )}
          <NavBtn onClick={() => go(page - 1)} disabled={page <= 1} label={t('previous_page')}>
            <ChevronLeft size={15} strokeWidth={2.5} className="rtl:rotate-180" />
          </NavBtn>

          {/* ── Compact display ── */}
          {isCompact ? (
            <div
              className="mx-1 flex h-9 min-w-[96px] items-center justify-center gap-1 rounded-xl px-3 tabular-nums"
              style={{
                border: '1.5px solid var(--color-primary-200)',
                background: 'linear-gradient(135deg, var(--color-primary-50), white)',
              }}
            >
              <span className="text-sm font-black" style={{ color: 'var(--color-primary-700)' }}>{page}</span>
              <span className="text-xs font-light text-slate-300 mx-0.5">/</span>
              <span className="text-sm font-semibold text-slate-500">{totalPages}</span>
            </div>
          ) : (
            /* ── Page number buttons ── */
            <div className="flex items-center gap-0.5 px-0.5">
              <AnimatePresence mode="popLayout">
                {items.map((it, idx) =>
                  it === '…' ? (
                    <motion.span
                      key={`ellipsis-${idx}`}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.14 }}
                      className="inline-flex h-9 w-6 items-center justify-center text-slate-400"
                    >
                      <MoreHorizontal size={13} strokeWidth={2} />
                    </motion.span>
                  ) : (
                    <PageNumber key={it} p={it} active={it === page} onClick={() => go(it)} t={t} />
                  )
                )}
              </AnimatePresence>
            </div>
          )}

          <NavBtn onClick={() => go(page + 1)} disabled={page >= totalPages} label={t('next_page')}>
            <ChevronRight size={15} strokeWidth={2.5} className="rtl:rotate-180" />
          </NavBtn>
          {showEdges && !isCompact && (
            <NavBtn onClick={() => go(totalPages)} disabled={page >= totalPages} label={t('last_page')}>
              <ChevronsRight size={15} strokeWidth={2.5} className="rtl:rotate-180" />
            </NavBtn>
          )}
        </div>

        {/* ── Page counter chip (always visible, non-compact) ── */}
        {!isCompact && (
          <>
            <div
              className="h-6 w-px mx-0.5 flex-shrink-0"
              style={{ background: 'linear-gradient(180deg, transparent, var(--color-primary-200), transparent)' }}
            />
            <div className="flex h-9 select-none items-center gap-1 rounded-xl px-2.5 tabular-nums text-xs">
              <span className="font-bold text-slate-700">{page}</span>
              <span className="font-light text-slate-300">/</span>
              <span className="text-slate-400 font-medium">{totalPages}</span>
              <span className="text-slate-400 font-normal ltr:ml-1 rtl:mr-1">{t('pages_suffix')}</span>
            </div>
          </>
        )}
      </motion.div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE NUMBER BUTTON
═══════════════════════════════════════════════════════════════ */
function PageNumber({ p, active, onClick, t }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.75 }}
      whileHover={!active ? { scale: 1.1, y: -1.5 } : {}}
      whileTap={{ scale: 0.91 }}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={t('go_to_page', { page: p })}
      title={t('go_to_page', { page: p })}
      className={[
        'relative h-9 min-w-[36px] px-2 rounded-xl text-sm font-bold transition-colors duration-150 overflow-hidden',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] focus-visible:ring-offset-1',
        active ? 'text-white' : 'text-slate-600 hover:text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)]',
      ].join(' ')}
      style={active ? {
        background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
        boxShadow: '0 4px 14px -5px var(--color-primary-500), 0 0 0 1.5px var(--color-primary-300)',
      } : {}}
    >
      {/* Shared-layout animated background for active page */}
      {active && (
        <motion.span
          layoutId="pag-active-pill"
          className="absolute inset-0 rounded-xl"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
      {/* Active shimmer sweep */}
      {active && (
        <motion.span
          className="pointer-events-none absolute inset-0"
          animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
      <span className="relative z-10 tabular-nums">{p}</span>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV BUTTON
═══════════════════════════════════════════════════════════════ */
function NavBtn({ children, onClick, disabled, label }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.12, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      aria-label={label}
      title={label}
      className={[
        'h-9 w-9 inline-flex items-center justify-center rounded-xl transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] focus-visible:ring-offset-1',
        disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-500 hover:bg-[color:var(--color-primary-50)] hover:text-[color:var(--color-primary-600)]',
      ].join(' ')}
    >
      {children}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE SIZE SELECT — portal-rendered, overflow-safe
═══════════════════════════════════════════════════════════════ */
function PageSizeSelect({ value, onChange, options, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ── Measure & position ── */
  const openDropdown = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r   = el.getBoundingClientRect();
    const vh  = window.innerHeight;
    const estimatedH = options.length * 46 + 20;
    const spaceBelow = vh - r.bottom - 8;
    const openUp = spaceBelow < estimatedH && r.top > estimatedH;

    setPos({
      top:    openUp ? r.top - estimatedH - 6 : r.bottom + 6,
      left:   r.left,
      width:  Math.max(r.width, 156),
      openUp,
    });
    setIsOpen(true);
  }, [options.length]);

  /* ── Close on outside pointer ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [isOpen]);

  /* ── Close on scroll / resize ── */
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [isOpen]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  /* ── Portal dropdown ── */
  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          role="listbox"
          aria-label={t('page_size_label')}
          initial={{ opacity: 0, y: pos.openUp ? 8 : -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.openUp ? 8 : -8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 440, damping: 30, mass: 0.65 }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
          className="rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl shadow-slate-300/40 backdrop-blur-md"
        >
          {/* Top edge glow */}
          <div
            className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary-300), transparent)', opacity: 0.6 }}
          />
          {/* Subtle bg tint */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.018]"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          />

          <div className="relative space-y-0.5">
            {options.map(opt => {
              const sel = opt === value;
              return (
                <motion.button
                  key={opt}
                  role="option"
                  aria-selected={sel}
                  type="button"
                  whileHover={!sel ? { x: 3 } : {}}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onChange?.(opt); setIsOpen(false); }}
                  className={[
                    'w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold',
                    'transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]',
                    sel
                      ? 'text-white'
                      : 'text-slate-600 hover:bg-[color:var(--color-primary-50)] hover:text-[color:var(--color-primary-700)]',
                  ].join(' ')}
                  style={sel ? {
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    boxShadow: '0 3px 10px -4px var(--color-primary-500)',
                  } : {}}
                >
                  {/* Shimmer on selected */}
                  {sel && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 rounded-xl"
                      animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  )}

                  <span className="relative z-10 tabular-nums font-bold">{opt}</span>
                  <span className={`relative z-10 text-[10px] font-medium ${sel ? 'text-white/65' : 'text-slate-400'}`}>
                    {t('rows_label')}
                  </span>

                  <AnimatePresence>
                    {sel && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                        className="relative z-10 ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-white/25"
                      >
                        <Check size={11} strokeWidth={3} className="text-white" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('page_size_label')}
        className={[
          'h-9 rounded-xl px-3 inline-flex items-center gap-2.5 border transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] focus-visible:ring-offset-1',
          isOpen
            ? 'border-[color:var(--color-primary-300)] bg-[color:var(--color-primary-50)]'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80',
        ].join(' ')}
      >
        <Rows3 size={13} strokeWidth={2} className={isOpen ? 'text-[color:var(--color-primary-500)]' : 'text-slate-400'} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t('rows_label')}
        </span>
        <span className="text-sm font-black tabular-nums" style={{ color: 'var(--color-primary-700)' }}>
          {value}
        </span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={12} strokeWidth={2.5} className="text-slate-400" />
        </motion.span>
      </motion.button>

      {mounted ? createPortal(dropdown, document.body) : null}
    </>
  );
}