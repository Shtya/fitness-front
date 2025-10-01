// components/atoms/Textarea.jsx
'use client';

import { forwardRef } from 'react';

const Textarea = forwardRef(({ cnLabel, className, label, placeholder = 'Enter text', iconLeft, actionIcon, onAction, onChange, onBlur, name, rows = 4, error = null, required = false, ...props }, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className={`mb-1 block text-sm font-medium text-gray-600 ${cnLabel}`}>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}

      <div className={`relative flex items-center rounded-md bg-white transition border ${error ? 'border-red-500 ring-2 ring-red-500/20' : props.value ? 'border-emerald-600' : 'border-gray-300'} focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20`}>
        {iconLeft && (
          <span className='flex-none text-slate-400 pl-2'>
            <img src={iconLeft} alt='' className='w-4' />
          </span>
        )}

        <textarea ref={ref} id={name} name={name} placeholder={placeholder} onChange={onChange} onBlur={onBlur} rows={rows} className='p-2 w-full bg-transparent outline-none text-slate-700 placeholder:text-gray-400 resize-none' {...props} />

        {actionIcon && (
          <button type='button' onClick={onAction} className='cursor-pointer flex items-center justify-center h-full aspect-1/1 absolute right-0 top-1/2 -translate-y-1/2 flex-none gradient p-2 text-white transition'>
            <img src={actionIcon} alt='' className='w-[25px]' />
          </button>
        )}
      </div>

      {error && <p className='text-red-500 text-sm mt-1'>{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
