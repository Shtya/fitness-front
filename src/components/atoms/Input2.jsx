'use client';

import React, { forwardRef } from 'react';

export const Input = forwardRef(({ label, name, value, onChange, type = 'text', required = false, disabled = false, error, className = '', ...props }, ref) => {
  const base = 'peer w-full h-[35px] rounded-lg border bg-white/90 px-2 pt-1 text-sm outline-none placeholder-transparent transition ';
  const ok = 'border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-200/40';
  const bad = 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200';

  return (
    <div className={`relative ${className}`}>
      <input ref={ref} id={name} name={name} type={type} value={value ?? ''} onChange={e => onChange?.(e.target?.value ?? e)} required={required} disabled={disabled} placeholder=' ' className={`${base} ${error ? bad : ok} disabled:opacity-60`} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...props} />

      <label htmlFor={name} className={['rounded-[8px_8px_0_0] absolute pointer-events-none left-2 z-10 px-2 text-slate-500', 'transition-all duration-150 ease-out', 'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[12px]', 'peer-focus:bg-white peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px]', 'peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-[11px]', error ? 'text-rose-600' : ''].join(' ')}>
        {label}
        {required && <span className='ml-0.5 text-rose-500'>*</span>}
      </label>

      {error && (
        <p id={`${name}-error`} className='mt-1 text-xs text-rose-600'>
          {error}
        </p>
      )}
    </div>
  );
});
Input.displayName = 'Input';
