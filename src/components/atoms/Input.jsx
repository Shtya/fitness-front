'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function Input({cnInputParent ,  label, placeholder = '', name, type = 'text', value, onChange = () => {}, onBlur, disabled = false, error, clearable = true, className = '', cnInput }) {
  const inputRef = useRef(null);

  // keep internal state as a STRING so 0 is not treated as empty/falsy
  const toStr = v => (v === null || v === undefined ? '' : String(v));
  const [internal, setInternal] = useState(toStr(value));

  // sync internal when parent value changes
  useEffect(() => {
    setInternal(toStr(value));
  }, [value]);

  function handleChange(e) {
    const next = e.target.value;
    setInternal(next);
    onChange(next);
  }

  function handleBlur(e) {
    // Optional: normalize numbers on blur (without turning '' into 0)
    if (type === 'number') {
      const s = e.target.value.trim();
      if (s === '') {
        onChange('');
      } else {
        const n = Number(s);
        onChange(Number.isNaN(n) ? '' : n);
      }
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

  return (
    <div className={`w-full relative ${className}`}>
      {label && <label className='mb-1.5 block text-sm font-medium text-slate-700'>{label}</label>}

      <div className={[ cnInputParent , 'relative flex items-center', 'rounded-lg border bg-white', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text', error ? 'border-rose-500' : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500', 'focus-within:ring-4 focus-within:ring-indigo-100', 'transition-colors'].join(' ')}>
        <input ref={inputRef} type={type} name={name} placeholder={placeholder} value={internal} onChange={handleChange} onBlur={handleBlur} disabled={disabled} className={`input-3d ${cnInput || ''} h-[40px] ltr:pr-[28px] rtl:pl-[28px] w-full rounded-lg px-3  py-2  text-sm text-slate-900 outline-none placeholder:text-gray-400`} aria-invalid={!!error} />

        {showClear && <X size={16} className='absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60 transition hover:opacity-100' onClick={clearInput} />}
      </div>

      {error && <p className='mt-1.5 text-xs text-rose-600'>{error}</p>}
    </div>
  );
}
