'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function Input({
  label,
  placeholder = '',
  name,
  type = 'text',
  value,
  onChange = () => {},
	onBlur ,
  disabled = false,
  error,
  clearable = true,
  className = '',
	cnInput
}) {
  const inputRef = useRef(null);
  const [internal, setInternal] = useState(value ?? '');

  function handleChange(e) {
    setInternal(e.target.value);
    onChange(e.target.value);
  }

  function clearInput(e) {
    e.stopPropagation();
    setInternal('');
    onChange('');
    inputRef.current?.focus();
  }

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div
        className={[
          'relative flex items-center',
          'rounded-lg border bg-white',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-text',
          error
            ? 'border-rose-500'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500',
          'focus-within:ring-4 focus-within:ring-indigo-100',
          'transition-colors',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type={type}
          name={name}
          placeholder={placeholder}
          value={internal}
					onBlur={onBlur}
          disabled={disabled}
          onChange={handleChange}
          className={`${cnInput} h-[43px] w-full rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-gray-400`}
        />

        {clearable && internal && !disabled && (
          <X
            size={16}
            className="absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer"
            onClick={clearInput}
          />
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
