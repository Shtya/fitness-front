// components/atoms/Textarea.jsx
'use client';

import { forwardRef, useState } from 'react';

const Textarea = forwardRef(({ cnLabel, className = '', label, placeholder = '', iconLeft, actionIcon, onAction, onChange, onBlur, cnInput, name, rows = 4, error = null, required = false, value, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  const str = value == null ? '' : String(value);
  const floated = focused || str.length > 0;

  return (
    <div className={`relative w-full ${className}`}>
      <div className={[
        cnInput || '',
        'relative rounded-[11px] border px-3 pt-3 pb-2 transition-all duration-200',
        'bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        error
          ? 'border-rose-300'
          : focused
            ? 'border-[var(--color-primary-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]'
            : 'border-[var(--gm-line,rgba(92,143,211,0.22))]',
      ].join(' ')}>
        {iconLeft ? (
          <span className="mb-1 inline-flex text-slate-400">
            <img src={iconLeft} alt="" className="w-4" />
          </span>
        ) : null}
        <textarea
          ref={ref}
          id={name}
          name={name}
          rows={rows}
          value={value}
          placeholder={label ? (floated ? (placeholder || ' ') : ' ') : placeholder}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          className="w-full resize-none bg-transparent text-[13px] text-[var(--gm-ink,#0b214d)] outline-none placeholder:text-[var(--gm-faint,#9aadc4)]"
          {...props}
        />
        {label ? (
          <label
            htmlFor={name}
            className={[
              cnLabel || '',
              'pointer-events-none absolute start-3 z-[1] px-1 transition-all duration-200',
              floated
                ? 'top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted,#56719a)]'
                : 'top-3.5 text-[13px] text-[var(--gm-faint,#7388a7)]',
              error && floated ? 'text-rose-500' : '',
            ].join(' ')}
          >
            {label}
            {required ? <span className="ms-0.5 text-rose-500">*</span> : null}
          </label>
        ) : null}
        {actionIcon ? (
          <button type="button" onClick={onAction} className="absolute end-2 top-2 rounded-lg bg-[var(--color-primary-600)] p-2 text-white">
            <img src={actionIcon} alt="" className="w-5" />
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-sm text-rose-500">{error}</p> : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
