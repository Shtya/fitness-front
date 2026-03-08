'use client';

import MultiLangText from '@/components/atoms/MultiLangText';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle, Search, X, Clock } from 'lucide-react';
import React, { useEffect, useMemo, useLayoutEffect, useState, useRef } from 'react';

export const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

/* ─────────────────────────── Page Header ─────────────────────────── */
export function PageHeader({ className = '', icon: Icon, title, subtitle, actions = null }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className='flex items-center gap-3'>
        {Icon && (
          <motion.div
            initial={{ rotate: -8, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={spring}
            className='h-10 w-10 grid place-content-center rounded-xl theme-primary-bg text-white shadow-md'>
            <Icon className='w-5 h-5' />
          </motion.div>
        )}
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
          {subtitle && (
            <p className='max-md:hidden text-sm text-slate-500 mt-0.5'>{subtitle}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

/* ─────────────────────────── Stat Cards ─────────────────────────── */
export function StatCard({ resPhone, cnParent, cn, icon: Icon, title, value }) {
  return (
    <div className={`${cnParent ?? ''} ${resPhone ? 'max-md:h-fit' : ''} relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3 text-white`}>
      <div className={`flex items-center justify-between gap-2 ${resPhone ? 'max-md:flex-col' : ''}`}>
        <div className={`grid place-items-center rounded-lg bg-white/15 p-2 ${resPhone ? 'max-md:hidden' : ''}`}>
          <Icon className='h-5 w-5' />
        </div>
        <div className={`flex items-center gap-2 flex-1 justify-between max-md:flex-wrap max-md:gap-[2px] ${cn ?? ''} ${resPhone ? 'max-md:flex-col max-md:gap-[2px]' : ''}`}>
          <p className={`text-sm text-white/85 ${resPhone ? 'max-md:text-center max-md:text-xs' : ''}`}>{title}</p>
          <p className='text-lg font-bold tracking-tight flex-none'>{value}</p>
        </div>
      </div>
    </div>
  );
}

export function StatCardArray({ icon: Icon, title = [], value = [] }) {
  return (
    <div className='relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='grid place-items-center rounded-lg bg-white/15 border border-slate-100/30 p-2'>
          <Icon className='h-5 w-5' />
        </div>
        <div className='w-full'>
          {title.map((t, i) => (
            <div key={i} className='mt-[-5px] flex items-center gap-2 flex-1 justify-between'>
              <p className='text-xs font-semibold text-white/85'>{t}</p>
              <p className='text-xl font-semibold'>{String(value[i]).padStart(2, '0')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Badge / Pills ─────────────────────────── */
export function Badge({ color = 'slate', children }) {
  const map = {
    green:   'bg-green-100 text-green-700 ring-1 ring-green-600/10',
    red:     'bg-red-100 text-red-700 ring-1 ring-red-600/10',
    blue:    'bg-blue-100 text-blue-700 ring-1 ring-blue-600/10',
    indigo:  'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-600/10',
    amber:   'bg-amber-100 text-amber-800 ring-1 ring-amber-600/10',
    slate:   'bg-slate-100 text-slate-700 ring-1 ring-slate-600/10',
    violet:  'bg-violet-100 text-violet-700 ring-1 ring-violet-600/10',
    primary: 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-600)]/10',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[color] ?? map.slate}`}>
      {children}
    </span>
  );
}

export const StatusPill = ({ status }) =>
  status === 'Active' ? (
    <Badge color='green'><CheckCircle2 className='w-3 h-3' /> Active</Badge>
  ) : (
    <Badge color='red'><XCircle className='w-3 h-3' /> Inactive</Badge>
  );

/* ─────────────────────────── Toolbar Button ─────────────────────────── */
export function ToolbarButton({ icon: Icon, children, onClick, variant = 'primary' }) {
  const cls = variant === 'primary'
    ? 'theme-gradient-bg text-white hover:opacity-95 shadow-sm'
    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${cls}`}>
      {Icon && <Icon className='w-4 h-4' />}
      {children}
    </button>
  );
}

/* ─────────────────────────── Search Input ─────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className='w-4 h-4 text-slate-400 absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 pointer-events-none' />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[
          'w-full ltr:pl-9 ltr:pr-9 rtl:pr-9 rtl:pl-9 py-2.5 rounded-lg border bg-white text-sm outline-none transition-all duration-200',
          'border-slate-200 placeholder:text-slate-400 text-slate-800',
          'focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        ].join(' ')}
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: '' } })}
          aria-label='Clear'
          className='absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors'>
          <X className='w-3.5 h-3.5' />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── Select ─────────────────────────── */
export function Select({ label, value, setValue, options, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className='text-xs text-slate-500 whitespace-nowrap'>{label}</span>}
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        className={[
          'px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none transition-all duration-200',
          'focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
        ].join(' ')}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */
export function Modal({ scrollRef, cn, maxHBody, open, onClose, title, children, maxH, maxW = 'max-w-3xl' }) {
  const shouldReduce = useReducedMotion();
  const containerRef = useRef(null);
  const closeBtnRef  = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll(
          'a, button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const [first, last] = [focusables[0], focusables[focusables.length - 1]];
        if (!e.shiftKey && document.activeElement === last)  { e.preventDefault(); first.focus(); }
        if (e.shiftKey  && document.activeElement === first) { e.preventDefault(); last.focus();  }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);

  const overlayVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { duration: 0.18 } },
    exit:   { opacity: 0, transition: { duration: 0.18 } },
  };

  const panelVariants = shouldReduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, y: 18, scale: 0.975, filter: 'blur(6px)' },
        show:   { opacity: 1, y: 0,  scale: 1,     filter: 'blur(0px)', transition: { ...spring, opacity: { duration: 0.2 }, filter: { duration: 0.2 } } },
        exit:   { opacity: 0, y: 10, scale: 0.985, filter: 'blur(4px)', transition: { duration: 0.15 } },
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`${cn ?? ''} fixed inset-0 z-[1100000] grid place-items-center px-4 md:p-4`}
          initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>

          {/* Backdrop */}
          <motion.button
            aria-hidden
            type='button'
            onClick={onClose}
            className='fixed inset-0 bg-black/50 backdrop-blur-[6px]'
            initial='hidden' animate='show' exit='exit'
            variants={overlayVariants}
          />

          {/* Panel */}
          <motion.div
            role='dialog'
            aria-modal='true'
            aria-label={title}
            ref={containerRef}
            className={[
              'relative w-full rounded-xl md:rounded-2xl',
              'border border-white/10 border-t-2 border-t-[var(--color-primary-200)]',
              'bg-gradient-to-b from-white/80 to-white backdrop-blur-2xl',
              'shadow-2xl md:p-6 p-4',
              maxW, maxH ?? '',
            ].join(' ')}
            initial='hidden' animate='show' exit='exit'
            variants={panelVariants}>

            {/* Mobile drag handle */}
            <div className='md:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200' />

            {/* Header */}
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-base md:text-lg font-semibold theme-primary-text leading-snug'>{title}</h3>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                className='grid h-8 w-8 place-content-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors'>
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Body */}
            <div
              ref={scrollRef}
              className={`${maxHBody ?? ''} max-h-[80vh] overflow-y-auto  rtl:pl-1 rtl:-ml-1  ltr:pr-1 ltr:-mr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200`}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── Empty State ─────────────────────────── */
export function EmptyState({ title = 'No data', subtitle = 'Adjust filters or add new records.', icon = null, action = null }) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 py-20 text-center'>
      {icon && (
        <div className='grid h-14 w-14 place-items-center rounded-2xl bg-slate-100'>
          {icon}
        </div>
      )}
      <div>
        <h3 className='text-base font-semibold text-slate-800'>{title}</h3>
        <p className='mt-1 text-sm text-slate-500'>{subtitle}</p>
      </div>
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
}

/* ─────────────────────────── RangeControl ─────────────────────────── */
export function RangeControl({ label, vMin, vMax, setMin, setMax, className = '' }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white ${className}`}>
      {label && <span className='text-xs text-slate-500 whitespace-nowrap'>{label}</span>}
      <input
        type='number'
        placeholder='min'
        value={vMin}
        onChange={e => setMin(e.target.value)}
        className='w-16 outline-none text-sm text-slate-800 bg-transparent'
      />
      <span className='text-slate-300 select-none'>—</span>
      <input
        type='number'
        placeholder='max'
        value={vMax}
        onChange={e => setMax(e.target.value)}
        className='w-16 outline-none text-sm text-slate-800 bg-transparent'
      />
    </div>
  );
}

/* ─────────────────────────── MacroBar ─────────────────────────── */
export function MacroBar({ p = 0, c = 0, f = 0, className = '' }) {
  const kcal = p * 4 + c * 4 + f * 9 || 1;
  const pp = Math.round(((p * 4) / kcal) * 100);
  const pc = Math.round(((c * 4) / kcal) * 100);
  const pf = 100 - pp - pc;
  return (
    <div className='w-full'>
      <div className={`relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
        <div className='absolute inset-y-0 left-0 theme-primary-bg' style={{ width: `${pp}%` }} />
        <div className='absolute inset-y-0 theme-gradient-bg opacity-80' style={{ left: `${pp}%`, width: `${pc}%` }} />
        <div className='absolute inset-y-0 bg-amber-500' style={{ left: `${pp + pc}%`, width: `${pf}%` }} />
      </div>
      <div className='mt-1.5 flex gap-3 text-[10px] text-slate-500'>
        <span>P <b className='text-slate-700'>{pp}%</b></span>
        <span>C <b className='text-slate-700'>{pc}%</b></span>
        <span>F <b className='text-slate-700'>{pf}%</b></span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Tabs Pill ─────────────────────────── */
const shimmerCSS = `
@keyframes tabsShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.tabs-skeleton{background:linear-gradient(90deg,#e9eef5 0%,#f5f7fb 30%,#e9eef5 60%);background-size:200% 100%;animation:tabsShimmer 1.2s linear infinite;}
`;
function InjectShimmer() {
  useEffect(() => {
    if (document.getElementById('tabs-shimmer-style')) return;
    const s = document.createElement('style');
    s.id = 'tabs-shimmer-style';
    s.innerHTML = shimmerCSS;
    document.head.appendChild(s);
  }, []);
  return null;
}

export function TabsPill({
  outerCn, isLoading, sliceInPhone = true, hiddenArrow = false,
  tabs = [], active, onChange, className = '', id = 'ui-tabs-pill', skeletonCount = 5,
}) {
  const scrollerRef = useRef(null);
  const tabRefs     = useRef({});

  const activeIndex = useMemo(
    () => Math.max(0, tabs.findIndex(t => t.key === active)),
    [tabs, active],
  );
  const hasPrev = !isLoading && activeIndex > 0;
  const hasNext = !isLoading && activeIndex < tabs.length - 1;

  const goPrev = () => { if (hasPrev) onChange(tabs[activeIndex - 1]?.key); };
  const goNext = () => { if (hasNext) onChange(tabs[activeIndex + 1]?.key); };

  useEffect(() => {
    if (isLoading) return;
    tabRefs.current[active]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active, isLoading]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onKey = e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    scroller.addEventListener('keydown', onKey);
    return () => scroller.removeEventListener('keydown', onKey);
  }, [activeIndex, tabs]);

  const arrowBtn = (label, onClick, disabled, Icon) => (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={[
        'max-md:hidden inline-flex items-center justify-center h-9 w-8 rounded-lg border transition-all duration-150',
        'bg-white border-slate-200 text-slate-600',
        'hover:bg-slate-50 hover:border-[var(--color-primary-200)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]',
      ].join(' ')}>
      <Icon className='rtl:scale-x-[-1] w-4 h-4' />
    </button>
  );

  return (
    <div className={`${outerCn ?? ''} w-full overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200`}>
      <InjectShimmer />
      <div className='w-fit flex items-center gap-2'>
        {!hiddenArrow && arrowBtn('Previous tab', goPrev, !hasPrev, ChevronLeft)}

        <div ref={scrollerRef} tabIndex={0} className='outline-none'>
          <LayoutGroup id={id}>
            <div className={`inline-flex p-1 rounded-xl border border-slate-200 bg-slate-100/80 ring-1 ring-black/5 ${isLoading ? 'gap-1.5' : 'gap-0.5'}`}>
              {isLoading
                ? Array.from({ length: skeletonCount }).map((_, i) => {
                    const widths = [64, 84, 72, 92, 68, 88, 76];
                    return (
                      <div
                        key={`skel-${i}`}
                        aria-hidden
                        className='h-7 rounded-lg tabs-skeleton'
                        style={{ width: widths[i % widths.length] }}
                      />
                    );
                  })
                : tabs.map(t => {
                    const isActive = active === t.key;
                    return (
                      <motion.button
                        key={t.key}
                        type='button'
                        ref={el => (tabRefs.current[t.key] = el)}
                        onClick={() => onChange(t.key)}
                        className='relative cursor-pointer select-none rounded-lg px-3 py-1.5 text-sm font-medium outline-none'
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}>
                        {isActive && (
                          <motion.span
                            layoutId='tabs-pill'
                            className='absolute inset-0 rounded-lg theme-gradient-bg shadow-md'
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-1 text-nowrap capitalize ${isActive ? 'text-white drop-shadow-sm' : 'text-slate-600'}`}>
                          {t.icon && <t.icon className='max-md:hidden inline w-3.5 h-3.5 mr-0.5' />}
                          <MultiLangText className={`${sliceInPhone ? '' : '!hidden'} md:hidden`}>{t.label?.slice(0, 3)}</MultiLangText>
                          <MultiLangText className={`${sliceInPhone ? 'max-md:hidden' : '!flex'}`}>{t.label}</MultiLangText>
                        </span>
                      </motion.button>
                    );
                  })
              }
            </div>
          </LayoutGroup>
        </div>

        {!hiddenArrow && arrowBtn('Next tab', goNext, !hasNext, ChevronRight)}
      </div>
    </div>
  );
}

/* ─────────────────────────── DateRangeControl ─────────────────────────── */
export function DateRangeControl({ label = 'Date', from, to, setFrom, setTo, className = '' }) {
  const inputCls = 'outline-none text-sm text-slate-800 bg-transparent focus:ring-1 focus:ring-[var(--color-primary-300)] rounded transition-shadow';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white ${className}`}>
      {label && <span className='text-xs text-slate-500 whitespace-nowrap'>{label}</span>}
      <input type='date' value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
      <span className='text-slate-300 select-none'>→</span>
      <input type='date' value={to}   onChange={e => setTo(e.target.value)}   className={inputCls} />
    </div>
  );
}

/* ─────────────────────────── StatusBadge ─────────────────────────── */
export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const map = {
    active:    { cls: 'bg-green-100 text-green-700 ring-green-600/10',  Icon: CheckCircle2 },
    completed: { cls: 'bg-blue-100 text-blue-700 ring-blue-600/10',     Icon: CheckCircle2 },
    pending:   { cls: 'bg-amber-100 text-amber-800 ring-amber-600/10',  Icon: Clock },
    expired:   { cls: 'bg-slate-100 text-slate-600 ring-slate-600/10',  Icon: XCircle },
    inactive:  { cls: 'bg-slate-100 text-slate-600 ring-slate-600/10',  Icon: XCircle },
  };
  const { cls, Icon } = map[s] ?? map.inactive;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      <Icon className='w-3 h-3' /> {status}
    </span>
  );
}

/* ─────────────────────────── MiniTrend ─────────────────────────── */
export function MiniTrend({ points = [], className = '' }) {
  if (!points?.length) return <div className={`h-8 ${className}`} />;
  const min = Math.min(...points), max = Math.max(...points);
  const norm = v => (max === min ? 0.5 : (v - min) / (max - min));
  const W = 60, H = 24, pad = 2;
  const step = (W - pad * 2) / Math.max(1, points.length - 1);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${pad + i * step},${pad + (1 - norm(v)) * (H - pad * 2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-16 h-6 ${className}`}>
      <defs>
        <linearGradient id='miniTrendGrad' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%'   stopColor='var(--color-gradient-from)' />
          <stop offset='100%' stopColor='var(--color-gradient-to)' />
        </linearGradient>
      </defs>
      <path d={d} fill='none' stroke='url(#miniTrendGrad)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

/* ─────────────────────────── ProgressRing ─────────────────────────── */
export function ProgressRing({ value = 0, size = 72, stroke = 8, className = '' }) {
  const r    = (size - stroke) / 2;
  const c    = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} className={className}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke='#E5E7EB' strokeWidth={stroke} fill='none' />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke='url(#gradRing)' strokeWidth={stroke} fill='none'
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap='round'
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id='gradRing' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%'   stopColor='var(--color-gradient-from)' />
          <stop offset='100%' stopColor='var(--color-gradient-to)' />
        </linearGradient>
      </defs>
      <text x='50%' y='50%' dominantBaseline='middle' textAnchor='middle' className='fill-slate-700 text-sm font-semibold'>
        {pct}%
      </text>
    </svg>
  );
}

/* ─────────────────────────── RadioPills ─────────────────────────── */
export function RadioPills({ label, value, onChange, options = [], className = '' }) {
  return (
    <div className={className}>
      {label && <div className='text-sm text-slate-500 mb-1.5'>{label}</div>}
      <div className='flex flex-wrap gap-2'>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              type='button'
              key={String(opt.value)}
              onClick={() => onChange?.(opt.value)}
              className={[
                'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150',
                active
                  ? 'theme-gradient-bg text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
              ].join(' ')}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── FileDrop ─────────────────────────── */
export function FileDrop({ label = 'Upload', accept = 'image/*', multiple = false, onFiles, className = '' }) {
  const id = Math.random().toString(36).slice(2);
  return (
    <label
      htmlFor={id}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onFiles?.(e.dataTransfer.files); }}
      className={[
        'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6',
        'bg-white hover:bg-slate-50 cursor-pointer transition-colors duration-200',
        'border-[var(--color-primary-200)] hover:border-[var(--color-primary-400)]',
        className,
      ].join(' ')}>
      <span className='text-sm font-medium text-slate-700'>{label}</span>
      <span className='text-xs text-slate-400'>Click or drag & drop</span>
      <input id={id} type='file' accept={accept} multiple={multiple} onChange={e => onFiles?.(e.target.files)} className='hidden' />
    </label>
  );
}

/* ─────────────────────────── Avatar ─────────────────────────── */
export function Avatar({ src, name = '', size = 40, dot = null, className = '' }) {
  const initials = (name ? name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'U').toUpperCase();
  const dotCls = { online: 'bg-emerald-500', away: 'bg-amber-400' };
  return (
    <div
      className={`relative grid place-content-center rounded-full theme-gradient-bg text-white font-semibold text-sm ${className}`}
      style={{ width: size, height: size }}>
      {src
        ? <img src={src} alt={name} className='w-full h-full object-cover rounded-full' />
        : initials}
      {dot && (
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${dotCls[dot] ?? 'bg-slate-400'}`} />
      )}
    </div>
  );
}

/* ─────────────────────────── AutoGrowTextarea ─────────────────────────── */
export function AutoGrowTextarea({ value, onChange, minRows = 1, maxRows = 6, className = '', ...props }) {
  const [rows, setRows] = useState(minRows);
  useEffect(() => {
    const el = document.getElementById(props.id || 'autogrow-textarea');
    if (!el) return;
    el.rows = minRows;
    setRows(Math.min(maxRows, Math.ceil(el.scrollHeight / 24)));
  }, [value, minRows, maxRows, props.id]);
  return (
    <textarea
      id={props.id || 'autogrow-textarea'}
      rows={rows}
      value={value}
      onChange={onChange}
      className={[
        'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none resize-none transition-all duration-200',
        'focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
        className,
      ].join(' ')}
      {...props}
    />
  );
}

/* ─────────────────────────── TypingDots ─────────────────────────── */
export function TypingDots({ className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label='typing…'>
      <span className='sr-only'>typing…</span>
      <span className='w-2 h-2 rounded-full bg-[var(--color-primary-400)] animate-bounce [animation-delay:-0.2s]' />
      <span className='w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-bounce' />
      <span className='w-2 h-2 rounded-full bg-[var(--color-primary-600)] animate-bounce [animation-delay:0.2s]' />
    </div>
  );
}

/* ─────────────────────────── Switch ─────────────────────────── */
export function Switch({ checked, onChange, label, className = '' }) {
  return (
    <button
      type='button'
      onClick={() => onChange?.(!checked)}
      aria-pressed={checked}
      className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${checked ? 'theme-primary-bg' : 'bg-slate-300'}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </span>
      {label && <span className='text-sm text-slate-700'>{label}</span>}
    </button>
  );
}

/* ─────────────────────────── TimeRangeControl ─────────────────────────── */
export function TimeRangeControl({ label = 'Quiet hours', from, to, setFrom, setTo, className = '' }) {
  const inputCls = 'outline-none text-sm text-slate-800 bg-transparent focus:ring-1 focus:ring-[var(--color-primary-300)] rounded transition-shadow';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white ${className}`}>
      {label && <span className='text-xs text-slate-500 whitespace-nowrap'>{label}</span>}
      <input type='time' value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
      <span className='text-slate-300 select-none'>→</span>
      <input type='time' value={to}   onChange={e => setTo(e.target.value)}   className={inputCls} />
    </div>
  );
}

/* ─────────────────────────── HealthBadge ─────────────────────────── */
export function HealthBadge({ status = 'ok', label }) {
  const map = {
    ok:   'bg-emerald-100 text-emerald-700 ring-emerald-600/10',
    warn: 'bg-amber-100 text-amber-800 ring-amber-600/10',
    down: 'bg-red-100 text-red-700 ring-red-600/10',
  };
  const dotCls = { ok: 'bg-emerald-500', warn: 'bg-amber-500', down: 'bg-red-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${map[status] ?? map.ok}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls[status] ?? dotCls.ok}`} />
      {label || status}
    </span>
  );
}

/* ─────────────────────────── KeyField ─────────────────────────── */
export function KeyField({ label = 'API Key', value = '', masked = true, onReveal, onCopy, onRegen }) {
  const [show, setShow] = useState(!masked);
  const display = show ? value : value.replace(/./g, '•');
  const btnCls = 'px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700 transition-colors';
  return (
    <div className='w-full space-y-1.5'>
      <div className='text-sm font-medium text-slate-600'>{label}</div>
      <div className='flex items-center gap-2'>
        <input
          readOnly
          className='flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-sm text-slate-800'
          value={display}
        />
        <button type='button' className={btnCls} onClick={() => { setShow(s => !s); onReveal?.(!show); }}>
          {show ? 'Hide' : 'Show'}
        </button>
        <button type='button' className={btnCls} onClick={() => { navigator.clipboard.writeText(value); onCopy?.(); }}>
          Copy
        </button>
        {onRegen && (
          <button type='button' className='px-2.5 py-1.5 rounded-lg theme-gradient-bg text-white text-sm shadow-sm hover:opacity-95 transition-opacity' onClick={onRegen}>
            Regen
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── ConfirmDialog ─────────────────────────── */
export function ConfirmDialog({ open, title = 'Are you sure?', desc, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/30 backdrop-blur-[2px]' onClick={onClose} />
      <div className='absolute inset-0 grid place-items-center p-4'>
        <div className='w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl'>
          <div className='text-base font-semibold theme-primary-text'>{title}</div>
          {desc && <div className='mt-1.5 text-sm text-slate-500 leading-relaxed'>{desc}</div>}
          <div className='mt-5 flex items-center justify-end gap-2'>
            <button onClick={onClose} className='px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors'>
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm?.(); onClose?.(); }}
              className='px-3.5 py-2 rounded-lg theme-gradient-bg text-white text-sm shadow-sm hover:opacity-95 transition-opacity'>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Field ─────────────────────────── */
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className='block text-sm font-medium text-slate-700'>{label}</label>}
      {children}
      {hint && <div className='text-xs text-slate-400'>{hint}</div>}
    </div>
  );
}

/* ─────────────────────────── SectionCard ─────────────────────────── */
export function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[var(--color-primary-100)] bg-white p-5 shadow-sm ${className}`}>
      <div className='mb-4'>
        <div className='font-semibold theme-primary-text'>{title}</div>
        {subtitle && <div className='mt-0.5 text-sm text-slate-500'>{subtitle}</div>}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>{children}</div>
    </div>
  );
}

/* ─────────────────────────── SaveBar ─────────────────────────── */
export function SaveBar({ onSave, onCancel, saving = false }) {
  return (
    <div className='sticky bottom-3 z-10'>
      <div className='mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white/90 backdrop-blur-md p-3 shadow-lg'>
        <div className='flex items-center justify-end gap-2'>
          <button onClick={onCancel} className='px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors'>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className='px-4 py-2 rounded-lg theme-gradient-bg text-white text-sm shadow-sm hover:opacity-95 disabled:opacity-60 transition-opacity'>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── ColorSwatchPicker ─────────────────────────── */
export function ColorSwatchPicker({ value, onChange, options = ['#4F46E5', '#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#06B6D4', '#8B5CF6'] }) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {options.map(hex => (
        <button
          key={hex}
          type='button'
          title={hex}
          onClick={() => onChange?.(hex)}
          className={`w-8 h-8 rounded-lg ring-2 transition-all duration-150 hover:scale-105 ${value === hex ? 'ring-slate-800/50 scale-110' : 'ring-transparent'}`}
          style={{ background: hex }}
        />
      ))}
      <input
        type='color'
        value={value}
        onChange={e => onChange?.(e.target.value)}
        title='Custom color'
        className='w-10 h-8 rounded-lg border border-slate-200 bg-white cursor-pointer p-0.5'
      />
    </div>
  );
}

/* ─────────────────────────── AvatarUpload ─────────────────────────── */
export function AvatarUpload({ name = '', src = '', onFile }) {
  const [preview, setPreview] = useState(src);
  return (
    <div className='flex items-center gap-4'>
      <div className='h-16 w-16 overflow-hidden rounded-full bg-slate-100 ring-2 ring-[var(--color-primary-200)]'>
        {preview && <img src={preview} alt={name} className='h-full w-full object-cover' />}
      </div>
      <div className='flex items-center gap-2'>
        <label className='cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors'>
          Upload
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { setPreview(URL.createObjectURL(f)); onFile?.(f); }
            }}
          />
        </label>
        {preview && (
          <button onClick={() => { setPreview(''); onFile?.(null); }} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors'>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── MoneyInput ─────────────────────────── */
export function MoneyInput({ value, onChange, currency = 'EGP', className = '' }) {
  return (
    <div className={`flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
      <span className='border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500'>{currency}</span>
      <input
        type='number'
        step='0.01'
        min='0'
        className='flex-1 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-200)] transition-shadow'
        value={value}
        onChange={e => onChange?.(e.target.value)}
      />
    </div>
  );
}

/* ─────────────────────────── PercentInput ─────────────────────────── */
export function PercentInput({ value, onChange, className = '' }) {
  return (
    <div className={`flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
      <input
        type='number'
        step='0.1'
        min='0'
        max='100'
        className='flex-1 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-200)] transition-shadow'
        value={value}
        onChange={e => onChange?.(e.target.value)}
      />
      <span className='border-l border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500'>%</span>
    </div>
  );
}

/* ─────────────────────────── StatPill ─────────────────────────── */
export function StatPill({ label, value, sub }) {
  return (
    <div className='rounded-xl border border-[var(--color-primary-100)] bg-white p-3 shadow-sm'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='text-xl font-bold theme-primary-text tracking-tight mt-0.5'>{value}</div>
      {sub && <div className='mt-1 text-xs text-slate-400'>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────── CapacityMeter ─────────────────────────── */
export function CapacityMeter({ current = 0, max = 100 }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100));
  const barCls = pct < 70 ? 'theme-gradient-bg' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className='rounded-xl border border-[var(--color-primary-100)] bg-white p-4 shadow-sm'>
      <div className='flex items-end justify-between'>
        <div>
          <div className='text-xs text-slate-500 mb-0.5'>Current occupancy</div>
          <div className='text-3xl font-bold theme-primary-text tracking-tight'>{current}<span className='text-lg text-slate-400'>/{max}</span></div>
        </div>
        <div className='text-sm font-semibold text-slate-600'>{pct}%</div>
      </div>
      <div className='mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100'>
        <div className={`h-full transition-all duration-500 ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────── TimeSlotPicker ─────────────────────────── */
export function TimeSlotPicker({ value = { start: '18:00', end: '19:00' }, onChange }) {
  const slots = [];
  for (let h = 5; h <= 23; h++)
    for (const m of [0, 30])
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const selectCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)] transition-all';
  return (
    <div className='grid grid-cols-2 gap-2'>
      <select className={selectCls} value={value.start} onChange={e => onChange?.({ ...value, start: e.target.value })}>
        {slots.map(s => <option key={s}>{s}</option>)}
      </select>
      <select className={selectCls} value={value.end}   onChange={e => onChange?.({ ...value, end:   e.target.value })}>
        {slots.map(s => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

/* ─────────────────────────── MiniMonth ─────────────────────────── */
export function MiniMonth({ date = new Date(), onChange }) {
  const d0    = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(d0);
  start.setDate(1 - ((d0.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const isSame = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today  = new Date();
  return (
    <div className='rounded-xl border border-[var(--color-primary-100)] bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between mb-3'>
        <button className='rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 transition-colors' onClick={() => onChange?.(new Date(date.getFullYear(), date.getMonth() - 1, 1))}>‹</button>
        <div className='text-sm font-semibold theme-primary-text'>{date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button className='rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 transition-colors' onClick={() => onChange?.(new Date(date.getFullYear(), date.getMonth() + 1, 1))}>›</button>
      </div>
      <div className='grid grid-cols-7 mb-1'>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className='text-center py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider'>{d}</div>
        ))}
      </div>
      <div className='grid grid-cols-7 gap-0.5'>
        {cells.map((c, i) => {
          const inMonth = c.getMonth() === date.getMonth();
          const isToday = isSame(c, today);
          return (
            <button
              key={i}
              onClick={() => onChange?.(new Date(c))}
              className={[
                'py-1.5 rounded-lg text-sm transition-all duration-150',
                !inMonth ? 'opacity-30' : '',
                isToday ? 'theme-gradient-bg text-white shadow-sm font-semibold' : 'text-slate-700 hover:bg-slate-100',
              ].join(' ')}>
              {c.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── TagInput ─────────────────────────── */
export function TagInput({ value = [], onChange, placeholder = 'Add tag and press Enter' }) {
  const add = t => {
    const v = t.trim();
    if (!v) return;
    onChange?.([...new Set([...(value || []), v])]);
  };
  return (
    <div className='flex flex-wrap gap-1.5 items-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus-within:border-[var(--color-primary-400)] focus-within:ring-2 focus-within:ring-[var(--color-primary-200)] transition-all duration-200'>
      {(value || []).map(t => (
        <span key={t} className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'>
          {t}
          <button onClick={() => onChange?.(value.filter(x => x !== t))} className='ml-0.5 text-[var(--color-primary-500)] hover:text-[var(--color-primary-800)] transition-colors'>×</button>
        </span>
      ))}
      <input
        className='flex-1 min-w-[120px] px-1 py-0.5 text-sm text-slate-800 outline-none bg-transparent placeholder:text-slate-400'
        placeholder={placeholder}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(e.currentTarget.value); e.currentTarget.value = ''; }
        }}
      />
    </div>
  );
}

/* ─────────────────────────── SegmentPicker ─────────────────────────── */
export function SegmentPicker({ value = { role: 'All', status: 'All', tags: [], query: '' }, onChange }) {
  const v   = value || {};
  const set = patch => onChange?.({ ...v, ...patch });
  const selectCls = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)] transition-all';
  const inputCls  = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)] transition-all';
  return (
    <div className='rounded-xl border border-[var(--color-primary-100)] bg-white p-4 space-y-3 shadow-sm'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <div>
          <label className='text-xs font-medium text-slate-500 uppercase tracking-wider'>Role</label>
          <select className={selectCls} value={v.role} onChange={e => set({ role: e.target.value })}>
            {['All', 'Lead', 'Client', 'Trial', 'Member'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className='text-xs font-medium text-slate-500 uppercase tracking-wider'>Status</label>
          <select className={selectCls} value={v.status} onChange={e => set({ status: e.target.value })}>
            {['All', 'New', 'Qualified', 'Trial', 'Member', 'Churn risk'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className='text-xs font-medium text-slate-500 uppercase tracking-wider'>Text query</label>
          <input className={inputCls} placeholder='Name, email, phone…' value={v.query} onChange={e => set({ query: e.target.value })} />
        </div>
      </div>
      <div>
        <label className='text-xs font-medium text-slate-500 uppercase tracking-wider'>Tags</label>
        <div className='mt-1'><TagInput value={v.tags || []} onChange={tags => set({ tags })} /></div>
      </div>
    </div>
  );
}

/* ─────────────────────────── FileDropzone ─────────────────────────── */
export function FileDropzone({ onFiles, accept = '*/*', className = '' }) {
  function handle(e) {
    e.preventDefault();
    onFiles?.(Array.from(e.dataTransfer ? e.dataTransfer.files : e.target.files || []));
  }
  return (
    <label
      onDrop={handle}
      onDragOver={e => e.preventDefault()}
      className={[
        'grid place-items-center cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200',
        'bg-slate-50 hover:bg-white border-[var(--color-primary-200)] hover:border-[var(--color-primary-400)]',
        className,
      ].join(' ')}>
      <input type='file' multiple accept={accept} className='hidden' onChange={handle} />
      <div>
        <div className='text-sm font-semibold text-slate-700'>Drop files here or click to upload</div>
        <div className='mt-1 text-xs text-slate-400'>Images, videos, PDFs…</div>
      </div>
    </label>
  );
}

/* ─────────────────────────── TagChips ─────────────────────────── */
export function TagChips({ tags = [], selected = [], onToggle }) {
  return (
    <div className='flex flex-wrap gap-1.5'>
      {Array.from(new Set(tags)).sort().map(t => {
        const on = selected.includes(t);
        return (
          <button
            key={t}
            onClick={() => onToggle?.(t)}
            className={[
              'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-150',
              on ? 'theme-gradient-bg text-white border-transparent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            ].join(' ')}>
            #{t}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── NumberStepper ─────────────────────────── */
export function NumberStepper({ value = 0, min = 0, step = 1, onChange }) {
  return (
    <div className='inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white'>
      <button
        type='button'
        onClick={() => onChange?.(Math.max(min, value - step))}
        className='px-3 py-2 text-slate-600 hover:bg-slate-50 border-r border-slate-200 transition-colors text-base leading-none'>
        −
      </button>
      <input
        type='number'
        className='w-16 text-center py-2 text-sm text-slate-800 outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-[var(--color-primary-200)]'
        value={value}
        min={min}
        onChange={e => onChange?.(+e.target.value)}
      />
      <button
        type='button'
        onClick={() => onChange?.(value + step)}
        className='px-3 py-2 text-slate-600 hover:bg-slate-50 border-l border-slate-200 transition-colors text-base leading-none'>
        +
      </button>
    </div>
  );
}

/* ─────────────────────────── RingProgress ─────────────────────────── */
export function RingProgress({ value = 0, size = 96, stroke = 10, children }) {
  const v    = Math.max(0, Math.min(100, value));
  const r    = (size - stroke) / 2;
  const c    = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className='relative grid place-items-center' style={{ width: size, height: size }}>
      <svg width={size} height={size} className='-rotate-90'>
        <circle cx={size / 2} cy={size / 2} r={r} stroke='currentColor' className='text-slate-100' strokeWidth={stroke} fill='none' />
        <circle cx={size / 2} cy={size / 2} r={r} stroke='url(#ringGrad2)' strokeWidth={stroke} strokeLinecap='round' fill='none' strokeDasharray={`${dash} ${c - dash}`} />
        <defs>
          <linearGradient id='ringGrad2' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%'   stopColor='var(--color-gradient-from)' />
            <stop offset='100%' stopColor='var(--color-gradient-to)' />
          </linearGradient>
        </defs>
      </svg>
      <div className='absolute grid place-items-center'>{children}</div>
    </div>
  );
}

/* ─────────────────────────── ProgressBar ─────────────────────────── */
export function ProgressBar({ value = 0, max = 100 }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className='w-full h-2.5 overflow-hidden rounded-full bg-slate-100'>
      <div className='h-full theme-gradient-bg transition-all duration-500' style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─────────────────────────── RestTimer ─────────────────────────── */
export function RestTimer({ initial = 90 }) {
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = (v = initial) => { setSeconds(v); setRunning(false); };
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const btnCls = 'px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 transition-colors';

  return (
    <div className='inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5'>
      <span className='tabular-nums text-sm font-bold theme-primary-text'>{mm}:{ss}</span>
      <div className='flex items-center gap-1'>
        <button type='button' onClick={() => setRunning(r => !r)} className={btnCls}>{running ? 'Pause' : 'Start'}</button>
        <button type='button' onClick={() => reset()}             className={btnCls}>Reset</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── CalendarToolbar ─────────────────────────── */
export function CalendarToolbar({ date, setDate, view, setView }) {
  const d = new Date(date);
  const addDays   = n => setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
  const addMonths = n => setDate(new Date(d.getFullYear(), d.getMonth() + n, 1));
  const startOfWeek = dt => { const day = (dt.getDay() + 6) % 7; const nd = new Date(dt); nd.setDate(dt.getDate() - day); return nd; };

  const label = view === 'week'
    ? (() => { const s = startOfWeek(d), e = new Date(s); e.setDate(s.getDate() + 6); return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`; })()
    : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-sm divide-x divide-slate-200'>
        <button onClick={() => view === 'week' ? addDays(-7) : addMonths(-1)} className='px-3 py-2 text-slate-600 hover:bg-slate-50 transition-colors'>‹</button>
        <button onClick={() => setDate(new Date())} className='px-3 py-2 text-slate-600 hover:bg-slate-50 transition-colors'>Today</button>
        <button onClick={() => view === 'week' ? addDays(7)  : addMonths(1)}  className='px-3 py-2 text-slate-600 hover:bg-slate-50 transition-colors'>›</button>
      </div>
      <div className='text-sm font-semibold theme-primary-text'>{label}</div>
      <div className='ml-auto inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm divide-x divide-slate-200'>
        {['month', 'week', 'list'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 transition-colors capitalize ${view === v ? 'theme-gradient-bg text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── BadgeDot ─────────────────────────── */
export function BadgeDot({ color = 'slate', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-${color}-100 text-${color}-800`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500`} />
      {children}
    </span>
  );
}

/* ─────────────────────────── PhotoGrid ─────────────────────────── */
export function PhotoGrid({ photos = [], onOpen }) {
  if (!photos.length) {
    return (
      <div className='rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400'>
        No photos yet. Upload from the Check‑in tab.
      </div>
    );
  }
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2'>
      {photos.map((p, idx) => (
        <button
          key={p.id || idx}
          onClick={() => onOpen?.(idx)}
          className='group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-primary-100)] bg-slate-100 hover:shadow-md hover:border-[var(--color-primary-300)] transition-all duration-200'>
          <img src={p.url} alt={p.label || 'Progress photo'} className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105' />
          <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5'>
            <div className='text-[10px] text-white/90 truncate'>{p.date || ''}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── Lightbox ─────────────────────────── */
export function Lightbox({ open, setOpen, photos = [], index = 0, setIndex }) {
  if (!open) return null;
  const p = photos[index];
  const prev = () => setIndex(i => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex(i => (i + 1) % photos.length);
  const navBtn = 'absolute top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20 transition-colors';
  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm'>
      <button onClick={() => setOpen(false)} className='absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20 transition-colors'>
        Close
      </button>
      <button onClick={prev} className={`${navBtn} left-4`}>‹</button>
      <button onClick={next} className={`${navBtn} right-4`}>›</button>
      <div className='max-w-[92vw] max-h-[86vh] text-center'>
        {p && <img src={p.url} alt={p.label || 'photo'} className='max-h-[86vh] max-w-[92vw] rounded-xl shadow-2xl' />}
        <div className='mt-2 text-xs text-white/70'>{p?.date}{p?.label ? ` · ${p.label}` : ''}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────── MiniLine ─────────────────────────── */
export function MiniLine({ data = [], xKey = 'date', yKey = 'value', height = 56 }) {
  if (!data.length) return <div className='h-14' />;
  const W = 260, H = height, pad = 6;
  const xs = data.map(d => new Date(d[xKey]).getTime());
  const ys = data.map(d => Number(d[yKey]) || 0);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  const [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  const nx = t => xMax === xMin ? pad : pad + (W - 2 * pad) * ((t - xMin) / (xMax - xMin));
  const ny = v => yMax === yMin ? H / 2  : H - (pad + (H - 2 * pad) * ((v - yMin) / (yMax - yMin)));
  const pts = data.map(d => `${nx(new Date(d[xKey]).getTime())},${ny(Number(d[yKey]) || 0)}`).join(' ');
  return (
    <svg width={W} height={H} className='overflow-visible'>
      <defs>
        <linearGradient id='miniLineGrad' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%'   stopColor='var(--color-gradient-from)' />
          <stop offset='100%' stopColor='var(--color-gradient-to)' />
        </linearGradient>
      </defs>
      <polyline points={pts} fill='none' stroke='url(#miniLineGrad)' strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
    </svg>
  );
}