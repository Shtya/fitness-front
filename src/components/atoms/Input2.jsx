'use client';

import React, { forwardRef, useState } from 'react';

export const Input = forwardRef(({ label, name, value, onChange, type = 'text', required = false, disabled = false, error, className = '', placeholder, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  const str = value == null ? '' : String(value);
  const floated = focused || str.length > 0;

  return (
    <div className={`relative w-full ${className}`}>
      <div className={[
        'relative flex h-11 items-center rounded-[11px] border px-3 transition-all duration-200',
        'bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        disabled ? 'cursor-not-allowed opacity-60' : '',
        error
          ? 'border-rose-300'
          : focused
            ? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]'
            : 'border-[var(--gm-line,rgba(92,143,211,0.22))] hover:border-[color-mix(in_srgb,var(--color-primary-400)_40%,transparent)]',
      ].join(' ')}>
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          value={str}
          required={required}
          disabled={disabled}
          placeholder={label ? (floated ? (placeholder || ' ') : ' ') : (placeholder || '')}
          onChange={(e) => onChange?.(e.target?.value ?? e)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className="h-full w-full bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none placeholder:text-[var(--gm-faint,#9aadc4)]"
          {...props}
        />
        {label ? (
          <label
            htmlFor={name}
            className={[
              'pointer-events-none absolute start-3 z-[1] px-1 transition-all duration-200',
              floated
                ? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
                : 'top-1/2 -translate-y-1/2 text-[13px] text-[var(--gm-faint,#7388a7)]',
              error && floated ? 'text-rose-500' : '',
            ].join(' ')}
          >
            {label}
            {required ? <span className="ms-0.5 text-rose-500">*</span> : null}
          </label>
        ) : null}
      </div>
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
});
Input.displayName = 'Input';
