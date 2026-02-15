'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
}) {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const t = useTranslations();

  const toStr = v => (v === null || v === undefined ? '' : String(v));
  const [internal, setInternal] = useState(toStr(value));

  useEffect(() => { setInternal(toStr(value)); }, [value]);

  function handleChange(e) {
    const next = e.target.value;
    setInternal(next);
    onChange(next);
  }

  function handleBlur(e) {
    if (type === 'number') {
      const s = e.target.value.trim();
      if (s === '') onChange('');
      else {
        const n = Number(s);
        onChange(Number.isNaN(n) ? '' : n);
      }
    }
    onBlur?.(e);
    // Remove focus ring
    if (wrapperRef.current) {
      wrapperRef.current.style.borderColor = error ? '#f43f5e' : '#cbd5e1';
      wrapperRef.current.style.boxShadow = 'none';
    }
  }

  function handleFocus() {
    if (wrapperRef.current) {
      wrapperRef.current.style.borderColor = 'var(--color-primary-500)';
      wrapperRef.current.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 15%, transparent)';
    }
  }

  function clearInput(e) {
    e.stopPropagation();
    setInternal('');
    onChange('');
    inputRef.current?.focus();
  }

  const showClear = clearable && !disabled && internal !== '';

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
          {label}
        </label>
      )}

      <div
        ref={wrapperRef}
        className={[
          cnInputParent || '',
          'relative flex items-center',
          'rounded-lg border bg-white',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text',
          'transition-all duration-200',
        ].join(' ')}
        style={{
          borderColor: error && error !== 'users' ? '#f43f5e' : '#cbd5e1',
        }}
        onMouseEnter={e => {
          // Only show hover border if not focused
          if (document.activeElement !== inputRef.current && wrapperRef.current) {
            wrapperRef.current.style.borderColor = error && error !== 'users' ? '#f43f5e' : 'var(--color-primary-300)';
          }
        }}
        onMouseLeave={e => {
          if (document.activeElement !== inputRef.current && wrapperRef.current) {
            wrapperRef.current.style.borderColor = error && error !== 'users' ? '#f43f5e' : '#cbd5e1';
          }
        }}
      >
        {/* Left icon */}
        {icon && (
          <span className='absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex-shrink-0'>
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
          onFocus={handleFocus}
          disabled={disabled}
          className={[
            'input-3d',
            cnInput || '',
            'h-[43px] w-full rounded-lg py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400',
            icon ? 'ltr:pl-9 rtl:pr-9' : 'px-3.5',
            showClear ? 'ltr:pr-9 rtl:pl-9' : 'ltr:pr-3.5 rtl:pl-3.5',
          ].join(' ')}
          aria-invalid={!!error}
        />

        {showClear && (
          <X
            size={16}
            className='absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 transition'
            onClick={clearInput}
          />
        )}
      </div>

      {error && error !== 'users' && (
        <p className='mt-1.5 text-xs text-rose-500 flex items-center gap-1'>
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
    ...rest
  },
  ref,
) {
  const val = value ?? '';
  const wrapperRef = useRef(null);

  const handleChange = e => { onChange?.(e.target.value); };
  const handleBlur = e => {
    onBlur?.(e);
    if (wrapperRef.current) {
      wrapperRef.current.style.borderColor = error ? '#f43f5e' : '#cbd5e1';
      wrapperRef.current.style.boxShadow = 'none';
    }
  };
  const handleFocus = () => {
    if (wrapperRef.current) {
      wrapperRef.current.style.borderColor = 'var(--color-primary-500)';
      wrapperRef.current.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 15%, transparent)';
    }
  };
  const clearInput = e => { e.stopPropagation(); onChange?.(''); };
  const showClear = clearable && !disabled && val !== '';

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-semibold text-slate-600 tracking-wide uppercase' style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
          {label}
        </label>
      )}

      <div
        ref={wrapperRef}
        className={[
          cnInputParent,
          'relative flex items-center rounded-lg border bg-white',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text',
          'transition-all duration-200',
        ].join(' ')}
        style={{ borderColor: error && error !== 'users' ? '#f43f5e' : '#cbd5e1' }}
        onMouseEnter={() => {
          if (wrapperRef.current && document.activeElement?.tagName !== 'INPUT') {
            wrapperRef.current.style.borderColor = error && error !== 'users' ? '#f43f5e' : 'var(--color-primary-300)';
          }
        }}
        onMouseLeave={() => {
          if (wrapperRef.current && document.activeElement?.tagName !== 'INPUT') {
            wrapperRef.current.style.borderColor = error && error !== 'users' ? '#f43f5e' : '#cbd5e1';
          }
        }}
      >
        {icon && (
          <span className='absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex-shrink-0'>
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
          onFocus={handleFocus}
          disabled={disabled}
          className={[
            'input-3d',
            cnInput,
            'h-[43px] w-full rounded-lg py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400',
            icon ? 'ltr:pl-9 rtl:pr-9' : 'px-3.5',
            showClear ? 'ltr:pr-9 rtl:pl-9' : 'ltr:pr-3.5 rtl:pl-3.5',
          ].join(' ')}
          aria-invalid={!!error}
          {...rest}
        />

        {showClear && (
          <X
            size={16}
            className='absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 transition'
            onClick={clearInput}
          />
        )}
      </div>

      {error && error !== 'users' && (
        <p className='mt-1.5 text-xs text-rose-500'>{error}</p>
      )}
    </div>
  );
});