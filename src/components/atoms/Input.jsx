'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { X } from 'lucide-react';

export default function Input({
  cnInputParent,
  label,
  placeholder = '',
  name,
  type = 'text',
  value,
  onChange = () => {},
  onBlur,
  disabled = false,
  error,
  clearable = true,
  className = '',
  cnInput,
  icon,
  required,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const toStr = v => (v === null || v === undefined ? '' : String(v));
  const [internal, setInternal] = useState(toStr(value));

  useEffect(() => { setInternal(toStr(value)); }, [value]);

  function handleChange(e) {
    const next = e.target.value;
    setInternal(next);
    onChange(next);
  }

  function handleBlur(e) {
    setFocused(false);
    if (type === 'number') {
      const s = e.target.value.trim();
      if (s === '') onChange('');
      else { const n = Number(s); onChange(Number.isNaN(n) ? '' : n); }
    }
    onBlur?.(e);
  }

  function clearInput(e) {
    e.stopPropagation();
    setInternal('');
    onChange('');
    inputRef.current?.focus();
  }

  const showClear = clearable && !disabled && internal !== '';
  const hasError = error && error !== 'users';

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
        </label>
      )}

      <div className={[
        cnInputParent || '',
        'relative flex items-center rounded-lg border bg-white transition-all duration-200',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text',
        hasError
          ? 'border-rose-300 ring-2 ring-rose-100'
          : focused
            ? 'border-[color:var(--color-primary-400)] ring-2 ring-[color:var(--color-primary-200)]'
            : 'border-slate-200 hover:border-slate-300',
      ].join(' ')}>
        {icon && (
          <span className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex-shrink-0">
            {icon}
          </span>
        )}

        <input
          ref={inputRef}
          type={type}
          name={name}
          placeholder={placeholder}
          value={internal}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          disabled={disabled}
          className={[
            cnInput || '',
            'h-10 w-full !text-base rounded-lg bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400',
            icon ? 'ltr:pl-9 rtl:pr-9' : 'px-3',
            showClear ? 'ltr:pr-8 rtl:pl-8' : 'ltr:pr-3 rtl:pl-3',
          ].join(' ')}
          aria-invalid={!!hasError}
        />

        {showClear && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute rtl:left-2.5 ltr:right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            tabIndex={-1}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {hasError && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-100 shrink-0">
            <X className="h-2.5 w-2.5" />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}


export const Input2 = forwardRef(function Input2(
  {
    cnInputParent = '',
    label,
    placeholder = '',
    name,
    type = 'text',
    value,
    onChange,
    onBlur,
    disabled = false,
    error,
    clearable = true,
    className = '',
    cnInput = '',
    icon,
    required,
    ...rest
  },
  ref,
) {
  const val = value ?? '';
  const [focused, setFocused] = useState(false);
  const hasError = error && error !== 'users';

  const handleChange = e => onChange?.(e.target.value);
  const handleBlur = e => { setFocused(false); onBlur?.(e); };
  const clearInput = e => { e.stopPropagation(); onChange?.(''); };
  const showClear = clearable && !disabled && val !== '';

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
        </label>
      )}

      <div className={[
        cnInputParent,
        'relative flex items-center rounded-lg border bg-white transition-all duration-200',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text',
        hasError
          ? 'border-rose-300 ring-2 ring-rose-100'
          : focused
            ? 'border-[color:var(--color-primary-400)] ring-2 ring-[color:var(--color-primary-200)]'
            : 'border-slate-200 hover:border-slate-300',
      ].join(' ')}>
        {icon && (
          <span className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex-shrink-0">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          type={type}
          name={name}
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          disabled={disabled}
          className={[
            cnInput,
            'h-10 w-full rounded-lg bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400',
            icon ? 'ltr:pl-9 rtl:pr-9' : 'px-3',
            showClear ? 'ltr:pr-8 rtl:pl-8' : 'ltr:pr-3 rtl:pl-3',
          ].join(' ')}
          aria-invalid={!!hasError}
          {...rest}
        />

        {showClear && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute rtl:left-2.5 ltr:right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            tabIndex={-1}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {hasError && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-100 shrink-0">
            <X className="h-2.5 w-2.5" />
          </span>
          {error}
        </p>
      )}
    </div>
  );
});