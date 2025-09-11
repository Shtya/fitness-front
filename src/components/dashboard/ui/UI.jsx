'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { CheckCircle2, XCircle, Search, X, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

/* --------- Page Header --------- */
export function PageHeader({ className , icon: Icon, title, subtitle, actions = null }) {
  return (
    <div className={`flex items-center justify-between ${className} `} >
      <div className='flex items-center gap-3'>
        <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={spring} className='h-10 w-10 grid place-content-center rounded-xl bg-main text-white shadow-md'>
          {Icon ? <Icon className='w-5 h-5' /> : null}
        </motion.div>
        <div>
          <h1 className='text-2xl font-semibold'>{title}</h1>
          {subtitle ? <p className=' max-md:hidden text-sm text-slate-600'>{subtitle}</p> : null}
        </div>
      </div>
      {actions}
    </div>
  );
}

/* --------- Stat Card --------- */
export function StatCard({ icon: Icon, title, value, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='card-glow p-4'>
      <div className='flex items-center gap-3 h-full '>
        <div className='w-10 h-10 rounded-xl bg-main text-white grid place-content-center shadow-md'>{Icon ? <Icon className='w-5 h-5' /> : null}</div>
        <div>
          <div className='text-sm text-slate-600'>{title}</div>
          <div className='text-xl font-semibold'>{value}</div>
          {sub ? <div className='text-xs text-slate-500 mt-0.5'>{sub}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}

/* --------- Badge + Pills --------- */
export function Badge({ color = 'slate', children }) {
  const map = {
    green: 'bg-green-100 text-green-700 ring-green-600/10',
    red: 'bg-red-100 text-red-700 ring-red-600/10',
    blue: 'bg-blue-100 text-blue-700 ring-blue-600/10',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/10',
    amber: 'bg-amber-100 text-amber-800 ring-amber-600/10',
    slate: 'bg-slate-100 text-slate-700 ring-slate-600/10',
    violet: 'bg-violet-100 text-violet-700 ring-violet-600/10',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color]}`}>{children}</span>;
}
export const StatusPill = ({ status }) =>
  status === 'Active' ? (
    <Badge color='green'>
      <CheckCircle2 className='w-3 h-3' /> Active
    </Badge>
  ) : (
    <Badge color='red'>
      <XCircle className='w-3 h-3' /> Inactive
    </Badge>
  );

 
/* --------- Toolbar Button --------- */
export function ToolbarButton({ icon: Icon, children, onClick, variant = 'primary' }) {
  const styles = variant === 'primary' ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:opacity-95' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200';
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${styles}`}>
      {Icon ? <Icon className='w-4 h-4' /> : null} {children}
    </button>
  );
}

/* --------- Search Input --------- */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className='w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2' />
      <input value={value} onChange={onChange} placeholder={placeholder} className='w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
      {value ? (
        <button onClick={() => onChange({ target: { value: '' } })} className='absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100' aria-label='Clear'>
          <X className='w-4 h-4 text-slate-400' />
        </button>
      ) : null}
    </div>
  );
}

/* --------- Select (simple) --------- */
export function Select({ label, value, setValue, options, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label ? <span className='text-xs text-slate-500'>{label}</span> : null}
      <select value={value} onChange={e => setValue(e.target.value)} className='px-3 py-2 rounded-xl border border-slate-200 bg-white'>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* --------- Modal --------- */
export function Modal({ open, onClose, title, children, maxW = 'max-w-3xl' }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className='fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className='fixed z-50 inset-0 grid place-items-center p-4' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={spring}>
            <div className={`w-full ${maxW} card-glow p-5`}>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-lg font-semibold'>{title}</h3>
                <button onClick={onClose} className='w-9 h-9 rounded-lg border border-slate-200 grid place-content-center bg-white hover:bg-slate-50'>
                  <X className='w-5 h-5 text-slate-600' />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* --------- Empty State --------- */
export function EmptyState({ title = 'No data', subtitle = 'Adjust filters or add new records.', icon = null, action = null }) {
  return (
    <div className='text-center py-16'>
      <div className='mx-auto w-14 h-14 rounded-2xl bg-slate-100 grid place-content-center'>{icon}</div>
      <h3 className='mt-4 text-lg font-semibold'>{title}</h3>
      <p className='text-sm text-slate-600 mt-1'>{subtitle}</p>
      {action ? <div className='mt-6'>{action}</div> : null}
    </div>
  );
}

/* --------- RangeControl (min/max number) --------- */
export function RangeControl({ label, vMin, vMax, setMin, setMax, className = '' }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white ${className}`}>
      {label ? <span className='text-xs text-slate-500'>{label}</span> : null}
      <input type='number' placeholder='min' value={vMin} onChange={e => setMin(e.target.value)} className='w-16 outline-none' />
      <span className='text-slate-400'>—</span>
      <input type='number' placeholder='max' value={vMax} onChange={e => setMax(e.target.value)} className='w-16 outline-none' />
    </div>
  );
}

/* --------- MacroBar (P/C/F % visualization) --------- */
export function MacroBar({ p = 0, c = 0, f = 0, className = '' }) {
  const kcal = p * 4 + c * 4 + f * 9 || 1;
  const pp = Math.round(((p * 4) / kcal) * 100);
  const pc = Math.round(((c * 4) / kcal) * 100);
  const pf = 100 - pp - pc;
  return (
    <div className={`w-full`}>
      <div className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
        <div className='h-full bg-indigo-500' style={{ width: `${pp}%` }} />
        <div className='h-full bg-blue-500' style={{ width: `${pc}%` }} />
        <div className='h-full bg-amber-500' style={{ width: `${pf}%` }} />
      </div>
      <div className='mt-1 text-[10px] text-slate-600'>
        <span className='mr-2'>P {pp}%</span>
        <span className='mr-2'>C {pc}%</span>
        <span>F {pf}%</span>
      </div>
    </div>
  );
}

/* --------- TabsPill (animated tabs with shared pill) --------- */
export function TabsPill({ slice , tabs, active, onChange , className , id = 'ui-tabs-pill' }) {
  return (
    <LayoutGroup id={id}  >
      <div className={` ${className} max-md:overflow-x-auto max-md:w-[calc(100vw-20px)] max-md:max-w-fit  overflow-y-hidden inline-flex p-1 rounded-2xl   bg-slate-100/80 ring-1 ring-black/5 shadow-sm `}>
        {tabs.map(t => {
          const isActive = active === t.key;
          return (
            <motion.button key={t.key} type='button' onClick={() => onChange(t.key)} className='relative cursor-pointer select-none rounded-xl max-md:!rounded-[10px_10px_0_0] px-3 py-1.5 text-sm font-medium outline-none' whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 350, damping: 30 }}>
              {isActive && <motion.span layoutId='tabs-pill' className='absolute inset-0 after:!rounded-xl !rounded-xl   bg-second shadow-lg' transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
              <span className={`relative z-10 ${isActive ? 'text-white drop-shadow-sm' : 'text-slate-700'} capitalize`}>
                {t.icon ? <t.icon className='inline w-4 h-4 mr-1 -mt-0.5' /> : null}
                {slice ? t.label?.slice(0,slice)  : t.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/* --------- DateRangeControl (From/To date inputs) --------- */
export function DateRangeControl({ label = 'Date', from, to, setFrom, setTo, className = '' }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white ${className}`}>
      <span className='text-xs text-slate-500'>{label}</span>
      <input type='date' value={from} onChange={e => setFrom(e.target.value)} className='outline-none' />
      <span className='text-slate-400'>→</span>
      <input type='date' value={to} onChange={e => setTo(e.target.value)} className='outline-none' />
    </div>
  );
}

/* --------- StatusBadge (multi-status) --------- */
export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const map = {
    active: { cls: 'bg-green-100 text-green-700 ring-green-600/10', icon: CheckCircle2 },
    completed: { cls: 'bg-blue-100 text-blue-700 ring-blue-600/10', icon: CheckCircle2 },
    pending: { cls: 'bg-amber-100 text-amber-800 ring-amber-600/10', icon: Clock },
    expired: { cls: 'bg-slate-200 text-slate-700 ring-slate-600/10', icon: XCircle },
    inactive: { cls: 'bg-slate-200 text-slate-700 ring-slate-600/10', icon: XCircle },
  };
  const conf = map[s] || map.inactive;
  const Icon = conf.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${conf.cls}`}>
      <Icon className='w-3 h-3' /> {status}
    </span>
  );
}

/* --------- MiniTrend (tiny sparkline) --------- */
export function MiniTrend({ points = [], className = '' }) {
  if (!points?.length) return <div className={`h-8 ${className}`} />;
  const min = Math.min(...points),
    max = Math.max(...points);
  const norm = v => (max === min ? 0.5 : (v - min) / (max - min));
  const w = 60,
    h = 24,
    pad = 2;
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const d = points
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - norm(v)) * (h - pad * 2);
      return `${i ? 'L' : 'M'}${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-16 h-6 ${className}`}>
      <path d={d} fill='none' stroke='currentColor' strokeWidth='2' className='text-indigo-500' />
    </svg>
  );
}

/* --------- ProgressRing (circular %) --------- */
export function ProgressRing({ value = 0, size = 72, stroke = 8, className = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} className={className}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke='#E5E7EB' strokeWidth={stroke} fill='none' />
      <circle cx={size / 2} cy={size / 2} r={r} stroke='url(#gradRing)' strokeWidth={stroke} fill='none' strokeDasharray={`${dash} ${c - dash}`} strokeLinecap='round' transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <defs>
        <linearGradient id='gradRing' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='#4F46E5' />
          <stop offset='100%' stopColor='#3B82F6' />
        </linearGradient>
      </defs>
      <text x='50%' y='50%' dominantBaseline='middle' textAnchor='middle' className='fill-slate-700 text-sm font-semibold'>
        {pct}%
      </text>
    </svg>
  );
}

/* --------- RadioPills (single-select pill group) --------- */
export function RadioPills({ label, value, onChange, options = [], className = '' }) {
  return (
    <div className={className}>
      {label ? <div className='text-sm text-slate-600 mb-1'>{label}</div> : null}
      <div className='flex flex-wrap gap-2'>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button type='button' key={String(opt.value)} onClick={() => onChange?.(opt.value)} className={['px-3 py-1.5 rounded-xl border text-sm transition', active ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'].join(' ')}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------- FileDrop (click/drag file input) --------- */
export function FileDrop({ label = 'Upload', accept = 'image/*', multiple = false, onFiles, className = '' }) {
  const id = Math.random().toString(36).slice(2);
  const onChange = e => onFiles?.(e.target.files);
  const onDrop = e => {
    e.preventDefault();
    onFiles?.(e.dataTransfer.files);
  };
  return (
    <label htmlFor={id} onDragOver={e => e.preventDefault()} onDrop={onDrop} className={['flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 bg-white hover:bg-slate-50 cursor-pointer', className].join(' ')}>
      <span className='text-sm text-slate-600'>{label}</span>
      <span className='text-xs text-slate-500'>Click or drag & drop</span>
      <input id={id} type='file' accept={accept} multiple={multiple} onChange={onChange} className='hidden' />
    </label>
  );
}

/* --------- Avatar (initials fallback + status dot) --------- */
export function Avatar({ src, name = '', size = 40, dot = null, className = '' }) {
  const initials = (
    name
      ? name
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
      : 'U'
  ).toUpperCase();
  return (
    <div className={`relative grid place-content-center rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-medium ${className}`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name} className='w-full h-full object-cover rounded-full' /> : initials}
      {dot ? <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${dot === 'online' ? 'bg-emerald-500' : dot === 'away' ? 'bg-amber-400' : 'bg-slate-400'}`} /> : null}
    </div>
  );
}

/* --------- AutoGrowTextarea (composer-friendly) --------- */
export function AutoGrowTextarea({ value, onChange, minRows = 1, maxRows = 6, className = '', ...props }) {
  const [rows, setRows] = useState(minRows);
  useEffect(() => {
    const el = document.getElementById(props.id || 'autogrow-textarea');
    if (!el) return;
    el.rows = minRows;
    const current = Math.min(maxRows, Math.ceil(el.scrollHeight / 24));
    setRows(current);
  }, [value, minRows, maxRows, props.id]);
  return <textarea id={props.id || 'autogrow-textarea'} rows={rows} value={value} onChange={onChange} className={`w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${className}`} {...props} />;
}

/* --------- TypingDots (animated typing indicator) --------- */
export function TypingDots({ className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className='sr-only'>typing…</span>
      <span className='w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]' />
      <span className='w-2 h-2 rounded-full bg-slate-400 animate-bounce' />
      <span className='w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]' />
    </div>
  );
}

/* --------- Switch (toggle) --------- */
export function Switch({ checked, onChange, label, className = '' }) {
  return (
    <button type='button' onClick={() => onChange?.(!checked)} className={`inline-flex items-center ${className}`} aria-pressed={checked}>
      <span className={`w-11 h-6 rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow transition translate-y-0.5 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </span>
      {label ? <span className='ml-2 text-sm text-slate-700'>{label}</span> : null}
    </button>
  );
}

/* --------- TimeRangeControl (HH:MM → HH:MM) --------- */
export function TimeRangeControl({ label = 'Quiet hours', from, to, setFrom, setTo, className = '' }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white ${className}`}>
      <span className='text-xs text-slate-500'>{label}</span>
      <input type='time' value={from} onChange={e => setFrom(e.target.value)} className='outline-none' />
      <span className='text-slate-400'>→</span>
      <input type='time' value={to} onChange={e => setTo(e.target.value)} className='outline-none' />
    </div>
  );
}

// at top ensure: import { useState, useEffect } from "react";

/* --------- HealthBadge (ok/warn/down) --------- */
export function HealthBadge({ status = 'ok', label }) {
  const map = {
    ok: 'bg-emerald-100 text-emerald-700 ring-emerald-600/10',
    warn: 'bg-amber-100 text-amber-800 ring-amber-600/10',
    down: 'bg-red-100 text-red-700 ring-red-600/10',
  };
  const cls = map[status] || map.ok;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ring-1 ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-emerald-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
      {label || status}
    </span>
  );
}

/* --------- KeyField (mask + copy + reveal) --------- */
export function KeyField({ label = 'API Key', value = '', masked = true, onReveal, onCopy, onRegen }) {
  const [show, setShow] = useState(!masked);
  const display = show ? value : value.replace(/./g, '•');
  return (
    <div className='w-full'>
      <div className='text-sm text-slate-600'>{label}</div>
      <div className='mt-1 flex items-center gap-2'>
        <input readOnly className='flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-sm' value={display} />
        <button
          type='button'
          onClick={() => {
            setShow(s => !s);
            onReveal?.(!show);
          }}
          className='px-2 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm'>
          {show ? 'Hide' : 'Show'}
        </button>
        <button
          type='button'
          onClick={() => {
            navigator.clipboard.writeText(value);
            onCopy?.();
          }}
          className='px-2 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm'>
          Copy
        </button>
        {onRegen && (
          <button type='button' onClick={onRegen} className='px-2 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white text-sm'>
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}

/* --------- ConfirmDialog (lightweight confirm) --------- */
export function ConfirmDialog({ open, title = 'Are you sure?', desc, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/30 backdrop-blur-[2px]' onClick={onClose} />
      <div className='absolute inset-0 grid place-items-center'>
        <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl'>
          <div className='text-lg font-semibold'>{title}</div>
          {desc ? <div className='mt-1 text-sm text-slate-600'>{desc}</div> : null}
          <div className='mt-4 flex items-center justify-end gap-2'>
            <button onClick={onClose} className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50'>
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm?.();
                onClose?.();
              }}
              className='px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------- Field (label + control wrapper) --------- */
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label ? <label className='text-sm text-slate-600'>{label}</label> : null}
      <div className='mt-1'>{children}</div>
      {hint ? <div className='mt-1 text-xs text-slate-500'>{hint}</div> : null}
    </div>
  );
}

/* --------- SectionCard (settings block) --------- */
export function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card-glow p-5 ${className}`}>
      <div className='mb-3'>
        <div className='font-semibold'>{title}</div>
        {subtitle ? <div className='text-sm text-slate-600'>{subtitle}</div> : null}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>{children}</div>
    </div>
  );
}

/* --------- SaveBar (sticky actions) --------- */
export function SaveBar({ onSave, onCancel, saving = false }) {
  return (
    <div className='sticky bottom-3 z-10'>
      <div className='mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-3 shadow'>
        <div className='flex items-center justify-end gap-2'>
          <button onClick={onCancel} className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50'>
            Cancel
          </button>
          <button onClick={onSave} className='px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white disabled:opacity-60' disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- ColorSwatchPicker (brand color) --------- */
export function ColorSwatchPicker({ value, onChange, options = ['#4F46E5', '#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#06B6D4', '#8B5CF6'] }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {options.map(hex => (
        <button key={hex} type='button' title={hex} onClick={() => onChange?.(hex)} className={`w-8 h-8 rounded-lg ring-2 ${value === hex ? 'ring-slate-900/40' : 'ring-transparent'}`} style={{ background: hex }} />
      ))}
      <input type='color' value={value} onChange={e => onChange?.(e.target.value)} className='w-10 h-8 rounded-lg border border-slate-200 bg-white' title='Custom' />
    </div>
  );
}

/* --------- AvatarUpload (photo + preview) --------- */
export function AvatarUpload({ name = '', src = '', onFile }) {
  const [preview, setPreview] = useState(src);
  return (
    <div className='flex items-center gap-3'>
      <div className='w-16 h-16 rounded-full overflow-hidden bg-slate-100'>{preview ? <img src={preview} alt={name} className='w-full h-full object-cover' /> : null}</div>
      <div className='flex items-center gap-2'>
        <label className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'>
          Upload
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) {
                setPreview(URL.createObjectURL(f));
                onFile?.(f);
              }
            }}
          />
        </label>
        {preview && (
          <button
            onClick={() => {
              setPreview('');
              onFile?.(null);
            }}
            className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50'>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// Money input with currency prefix
export function MoneyInput({ value, onChange, currency = 'EGP', className = '' }) {
  return (
    <div className={`flex items-center rounded-xl border border-slate-200 bg-white ${className}`}>
      <span className='px-3 text-slate-500 text-sm'>{currency}</span>
      <input type='number' step='0.01' min='0' className='flex-1 px-3 py-2 rounded-r-xl outline-none' value={value} onChange={e => onChange?.(e.target.value)} />
    </div>
  );
}

// Percentage input (0–100)
export function PercentInput({ value, onChange, className = '' }) {
  return (
    <div className={`flex items-center rounded-xl border border-slate-200 bg-white ${className}`}>
      <input type='number' step='0.1' min='0' max='100' className='flex-1 px-3 py-2 rounded-l-xl outline-none' value={value} onChange={e => onChange?.(e.target.value)} />
      <span className='px-3 text-slate-500 text-sm'>%</span>
    </div>
  );
}

/* ---- StatPill (small KPI) ---- */
export function StatPill({ label, value, sub }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-3'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='text-xl font-semibold'>{value}</div>
      {sub ? <div className='text-xs text-slate-500 mt-0.5'>{sub}</div> : null}
    </div>
  );
}

/* ---- CapacityMeter ---- */
export function CapacityMeter({ current = 0, max = 100 }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100));
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4'>
      <div className='flex items-end justify-between'>
        <div>
          <div className='text-xs text-slate-500'>Current occupancy</div>
          <div className='text-3xl font-semibold'>
            {current}/{max}
          </div>
        </div>
        <div className='text-sm text-slate-600'>{pct}%</div>
      </div>
      <div className='mt-3 h-3 w-full rounded-full bg-slate-100 overflow-hidden'>
        <div className={`h-full ${pct < 70 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* TimeSlotPicker — 30-min steps */
export function TimeSlotPicker({ value = { start: '18:00', end: '19:00' }, onChange }) {
  const slots = [];
  for (let h = 5; h <= 23; h++) for (let m of [0, 30]) slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  return (
    <div className='grid grid-cols-2 gap-2'>
      <select className='inp' value={value.start} onChange={e => onChange?.({ ...value, start: e.target.value })}>
        {slots.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select className='inp' value={value.end} onChange={e => onChange?.({ ...value, end: e.target.value })}>
        {slots.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

/* MiniMonth — lightweight date picker (no deps) */
export function MiniMonth({ date = new Date(), onChange }) {
  const d0 = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(d0);
  start.setDate(1 - ((d0.getDay() + 6) % 7)); // week starts Mon
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const isSame = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today = new Date();
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-3'>
      <div className='flex items-center justify-between mb-2'>
        <button className='px-2 py-1 rounded-lg border border-slate-200' onClick={() => onChange?.(new Date(date.getFullYear(), date.getMonth() - 1, 1))}>
          ‹
        </button>
        <div className='font-semibold'>{date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button className='px-2 py-1 rounded-lg border border-slate-200' onClick={() => onChange?.(new Date(date.getFullYear(), date.getMonth() + 1, 1))}>
          ›
        </button>
      </div>
      <div className='grid grid-cols-7 text-xs text-slate-500 mb-1'>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className='text-center py-1'>
            {d}
          </div>
        ))}
      </div>
      <div className='grid grid-cols-7 gap-1'>
        {cells.map((c, i) => {
          const inMonth = c.getMonth() === date.getMonth();
          const isToday = isSame(c, today);
          return (
            <button key={i} onClick={() => onChange?.(new Date(c))} className={`py-1.5 rounded-lg text-sm ${inMonth ? '' : 'opacity-40'} ${isToday ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'} `}>
              {c.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* TagInput — quick label entry */
export function TagInput({ value = [], onChange, placeholder = 'Add tag and press Enter' }) {
  const add = t => {
    const v = t.trim();
    if (!v) return;
    onChange?.([...new Set([...(value || []), v])]);
  };
  return (
    <div className='rounded-xl border border-slate-200 bg-white px-2 py-1 flex flex-wrap gap-1'>
      {(value || []).map(t => (
        <span key={t} className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs'>
          {t}
          <button onClick={() => onChange?.(value.filter(x => x !== t))} className='text-slate-500 hover:text-slate-700'>
            ×
          </button>
        </span>
      ))}
      <input
        className='flex-1 min-w-[120px] px-2 py-1 outline-none'
        placeholder={placeholder}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
      />
    </div>
  );
}

/* SegmentPicker — build simple audience filters for campaigns */
export function SegmentPicker({ value = { role: 'All', status: 'All', tags: [], query: '' }, onChange }) {
  const v = value || {};
  const set = patch => onChange?.({ ...v, ...patch });
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-3 space-y-2'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
        <div>
          <label className='text-sm text-slate-600'>Role</label>
          <select className='inp mt-1' value={v.role} onChange={e => set({ role: e.target.value })}>
            {['All', 'Lead', 'Client', 'Trial', 'Member'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className='text-sm text-slate-600'>Status</label>
          <select className='inp mt-1' value={v.status} onChange={e => set({ status: e.target.value })}>
            {['All', 'New', 'Qualified', 'Trial', 'Member', 'Churn risk'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className='text-sm text-slate-600'>Text query</label>
          <input className='inp mt-1' placeholder='Name, email, phone…' value={v.query} onChange={e => set({ query: e.target.value })} />
        </div>
      </div>
      <div>
        <label className='text-sm text-slate-600'>Tags</label>
        <div className='mt-1'>
          <TagInput value={v.tags || []} onChange={tags => set({ tags })} />
        </div>
      </div>
    </div>
  );
}

/* === FileDropzone: drag & drop + multi-select === */
export function FileDropzone({ onFiles, accept = '*/*', className = '' }) {
  function handle(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer ? e.dataTransfer.files : e.target.files || []);
    onFiles?.(files);
  }
  return (
    <label onDrop={handle} onDragOver={e => e.preventDefault()} className={`grid place-items-center cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 p-6 text-center ${className}`}>
      <input type='file' multiple accept={accept} className='hidden' onChange={handle} />
      <div>
        <div className='text-sm font-semibold'>Drop files here or click to upload</div>
        <div className='text-xs text-slate-500 mt-1'>Images, videos, PDFs…</div>
      </div>
    </label>
  );
}

/* === TagChips: quick include/exclude filter === */
export function TagChips({ tags = [], selected = [], onToggle }) {
  const all = Array.from(new Set(tags)).sort();
  return (
    <div className='flex flex-wrap gap-1'>
      {all.map(t => {
        const on = selected.includes(t);
        return (
          <button key={t} onClick={() => onToggle?.(t)} className={`px-2 py-1 rounded-full text-xs border ${on ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
            #{t}
          </button>
        );
      })}
    </div>
  );
}

/* NumberStepper */
export function NumberStepper({ value = 0, min = 0, step = 1, onChange }) {
  return (
    <div className='inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden'>
      <button type='button' onClick={() => onChange?.(Math.max(min, value - step))} className='px-2 py-1 text-slate-600 hover:bg-slate-50'>
        −
      </button>
      <input type='number' className='w-16 text-center outline-none px-1 py-1' value={value} min={min} onChange={e => onChange?.(+e.target.value)} />
      <button type='button' onClick={() => onChange?.(value + step)} className='px-2 py-1 text-slate-600 hover:bg-slate-50'>
        +
      </button>
    </div>
  );
}

/* --- RingProgress (SVG donut) --- */
export function RingProgress({ value = 0, size = 96, stroke = 10, track = 0.12, children }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div style={{ width: size, height: size }} className='relative grid  place-items-center'>
      <svg width={size} height={size} className='-rotate-90'>
        <circle cx={size / 2} cy={size / 2} r={r} stroke='currentColor' className='text-slate-200/70' strokeWidth={stroke} fill='none' />
        <circle cx={size / 2} cy={size / 2} r={r} stroke='currentColor' className='text-indigo-500' strokeWidth={stroke} strokeLinecap='round' fill='none' strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className='absolute grid place-items-center'>{children}</div>
    </div>
  );
}
 
/* --- ProgressBar (horizontal) --- */
export function ProgressBar({ value = 0, max = 100 }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className='w-full h-2.5 rounded-full bg-slate-100 overflow-hidden'>
      <div className='h-full bg-indigo-500' style={{ width: `${pct}%` }} />
    </div>
  );
}

/* --- RestTimer (reusable) --- */
export function RestTimer({ initial = 90 }) {
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  function reset(v = initial) {
    setSeconds(v);
    setRunning(false);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1'>
      <span className='tabular-nums text-sm'>
        {mm}:{ss}
      </span>
      <div className='flex items-center gap-1'>
        <button type='button' onClick={() => setRunning(r => !r)} className='px-2 py-0.5 rounded-lg border border-slate-200 text-xs bg-white hover:bg-slate-50'>
          {running ? 'Pause' : 'Start'}
        </button>
        <button type='button' onClick={() => reset()} className='px-2 py-0.5 rounded-lg border border-slate-200 text-xs bg-white hover:bg-slate-50'>
          Reset
        </button>
      </div>
    </div>
  );
}

/* CalendarToolbar: period nav + view switch */
export function CalendarToolbar({ date, setDate, view, setView }) {
  const d = new Date(date);
  function addDays(n) {
    setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
  }
  function addMonths(n) {
    setDate(new Date(d.getFullYear(), d.getMonth() + n, 1));
  }
  function startOfWeek(dt) {
    const day = (dt.getDay() + 6) % 7;
    const nd = new Date(dt);
    nd.setDate(dt.getDate() - day);
    return nd;
  }
  const label =
    view === 'week'
      ? (() => {
          const s = startOfWeek(d),
            e = new Date(s);
          e.setDate(s.getDate() + 6);
          return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        })()
      : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden'>
        <button onClick={() => (view === 'week' ? addDays(-7) : addMonths(-1))} className='px-3 py-2 hover:bg-slate-50'>
          ‹
        </button>
        <button onClick={() => setDate(new Date())} className='px-3 py-2 border-x border-slate-200 hover:bg-slate-50'>
          Today
        </button>
        <button onClick={() => (view === 'week' ? addDays(7) : addMonths(1))} className='px-3 py-2 hover:bg-slate-50'>
          ›
        </button>
      </div>
      <div className='text-sm font-semibold'>{label}</div>
      <div className='ml-auto inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden'>
        {['month', 'week', 'list'].map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-2 text-sm ${view === v ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* BadgeDot: tiny colored dot + label */
export function BadgeDot({ color = 'slate', children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-${color}-100 text-${color}-800`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500`} /> {children}
    </span>
  );
}

export function PhotoGrid({ photos = [], onOpen }) {
  if (!photos.length) return <div className='rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500'>No photos yet. Upload from the Check‑in tab.</div>;
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2'>
      {photos.map((p, idx) => (
        <button key={p.id || idx} onClick={() => onOpen?.(idx)} className='group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100'>
          <img src={p.url} alt={p.label || 'Progress photo'} className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105' />
          <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1.5'>
            <div className='text-[10px] text-white/90 truncate'>{p.date || ''}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* --- Lightbox: simple image viewer with prev/next --- */
export function Lightbox({ open, setOpen, photos = [], index = 0, setIndex }) {
  if (!open) return null;
  const p = photos[index];
  function prev() {
    setIndex(i => (i - 1 + photos.length) % photos.length);
  }
  function next() {
    setIndex(i => (i + 1) % photos.length);
  }
  return (
    <div className='fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center'>
      <button onClick={() => setOpen(false)} className='absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20'>
        Close
      </button>
      <button onClick={prev} className='absolute left-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20'>
        ‹
      </button>
      <button onClick={next} className='absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20'>
        ›
      </button>
      <div className='max-w-[92vw] max-h-[86vh]'>
        {p ? <img src={p.url} alt={p.label || 'photo'} className='max-h-[86vh] max-w-[92vw] rounded-xl shadow-2xl' /> : null}
        <div className='mt-2 text-center text-white/90 text-xs'>
          {p?.date} {p?.label ? `• ${p.label}` : ''}
        </div>
      </div>
    </div>
  );
}

/* --- MiniLine: tiny inline line chart (no external lib) --- */
export function MiniLine({ data = [], xKey = 'date', yKey = 'value', height = 56 }) {
  if (!data.length) return <div className='h-14' />;
  const w = 260;
  const h = height;
  const pad = 6;
  const xs = data.map(d => new Date(d[xKey]).getTime());
  const ys = data.map(d => Number(d[yKey]) || 0);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  const yMin = Math.min(...ys),
    yMax = Math.max(...ys);
  const nx = t => (xMax === xMin ? pad : pad + (w - 2 * pad) * ((t - xMin) / (xMax - xMin)));
  const ny = v => (yMax === yMin ? h / 2 : h - (pad + (h - 2 * pad) * ((v - yMin) / (yMax - yMin))));
  const pts = data.map(d => `${nx(new Date(d[xKey]).getTime())},${ny(Number(d[yKey]) || 0)}`).join(' ');
  return (
    <svg width={w} height={h} className='overflow-visible'>
      <polyline points={pts} fill='none' stroke='currentColor' className='text-indigo-500' strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
    </svg>
  );
}

 



 
 