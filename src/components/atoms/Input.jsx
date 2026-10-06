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
  const floated = focused || internal !== '';

  return (
    <div className={`relative w-full ${className}`}>
      <div className={[
        cnInputParent || '',
        'relative flex h-11 items-center rounded-[11px] border px-3 transition-all duration-200',
        'bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        disabled ? 'cursor-not-allowed opacity-60' : '',
        hasError
          ? 'border-rose-300'
          : focused
            ? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent),inset_0_1px_0_rgba(255,255,255,0.8)]'
            : 'border-[var(--gm-line,rgba(92,143,211,0.22))] hover:border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]',
      ].join(' ')}>
        {icon ? (
          <span className="pointer-events-none me-2 shrink-0 text-[var(--gm-muted,#5879a5)]">{icon}</span>
        ) : null}
        <input
          ref={inputRef}
          type={type}
          name={name}
          placeholder={floated ? (placeholder || ' ') : ' '}
          value={internal}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          disabled={disabled}
          required={required}
          className={[
            cnInput || '',
            'h-full w-full bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none placeholder:text-[var(--gm-faint,#9aadc4)]',
            !floated && 'placeholder:text-transparent',
          ].join(' ')}
          aria-invalid={!!hasError}
        />
        {label ? (
          <label className={[
            'pointer-events-none absolute z-[1] px-1 text-[var(--gm-faint,#7388a7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)]',
            icon ? 'start-9' : 'start-3',
            floated
              ? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
              : 'top-1/2 -translate-y-1/2 text-[13px]',
            hasError && floated ? 'text-rose-500' : '',
          ].join(' ')}>
            {label}{required ? <span className="ms-0.5 text-rose-500">*</span> : null}
          </label>
        ) : null}
        {showClear ? (
          <button
            type="button"
            onClick={clearInput}
            className="ms-1 grid size-6 shrink-0 place-items-center rounded-md text-[var(--gm-muted,#7388a7)] hover:bg-[var(--gm-paper,#fff)] hover:text-rose-500"
            tabIndex={-1}
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {hasError ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
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
  const val = value == null ? '' : String(value);
  const [focused, setFocused] = useState(false);
  const hasError = error && error !== 'users';
  const floated = focused || val !== '';

  const handleChange = e => onChange?.(e.target.value);
  const handleBlur = e => { setFocused(false); onBlur?.(e); };
  const clearInput = e => { e.stopPropagation(); onChange?.(''); };
  const showClear = clearable && !disabled && val !== '';

  return (
    <div className={`relative w-full ${className}`}>
      <div className={[
        cnInputParent,
        'relative flex h-11 items-center rounded-[11px] border px-3 transition-all duration-200',
        'bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        disabled ? 'cursor-not-allowed opacity-60' : '',
        hasError
          ? 'border-rose-300'
          : focused
            ? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent),inset_0_1px_0_rgba(255,255,255,0.8)]'
            : 'border-[var(--gm-line,rgba(92,143,211,0.22))] hover:border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]',
      ].join(' ')}>
        {icon ? (
          <span className="pointer-events-none me-2 shrink-0 text-[var(--gm-muted,#5879a5)]">{icon}</span>
        ) : null}
        <input
          ref={ref}
          type={type}
          name={name}
          placeholder={floated ? (placeholder || ' ') : ' '}
          value={val}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          disabled={disabled}
          required={required}
          className={[
            cnInput,
            'h-full w-full bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none placeholder:text-[var(--gm-faint,#9aadc4)]',
            !floated && 'placeholder:text-transparent',
          ].join(' ')}
          aria-invalid={!!hasError}
          {...rest}
        />
        {label ? (
          <label className={[
            'pointer-events-none absolute z-[1] px-1 text-[var(--gm-faint,#7388a7)] transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)]',
            icon ? 'start-9' : 'start-3',
            floated
              ? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
              : 'top-1/2 -translate-y-1/2 text-[13px]',
            hasError && floated ? 'text-rose-500' : '',
          ].join(' ')}>
            {label}{required ? <span className="ms-0.5 text-rose-500">*</span> : null}
          </label>
        ) : null}
        {showClear ? (
          <button
            type="button"
            onClick={clearInput}
            className="ms-1 grid size-6 shrink-0 place-items-center rounded-md text-[var(--gm-muted,#7388a7)] hover:bg-[var(--gm-paper,#fff)] hover:text-rose-500"
            tabIndex={-1}
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {hasError ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
});