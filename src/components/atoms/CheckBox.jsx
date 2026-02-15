'use client';

import React, { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function CheckBox({ id = 'custom', label, initialChecked = false, onChange = () => {}, className = '' }) {
  const [checked, setChecked] = useState(!!initialChecked);

  useEffect(() => {
    setChecked(!!initialChecked);
  }, [initialChecked]);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onChange(next);
  };

  const onKeyDown = e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        id={id}
        type='button'
        role='checkbox'
        aria-checked={checked}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`input-3d-checkbox relative cursor-pointer flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all duration-300
          ${checked ? 'theme-gradient-bg shadow-md' : 'bg-white border-slate-300 hover:border-slate-400'}
          focus:outline-none focus:ring-2`}
        style={{
          borderColor: checked ? 'var(--color-primary-600)' : undefined,
          '--tw-ring-color': 'var(--color-primary-400)'
        }}
      >
        <motion.div 
          initial={false} 
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} 
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Check className='h-4 w-4 text-white' />
        </motion.div>
      </button>

      {label && (
        <span className='text-slate-800 text-[15px] leading-none cursor-pointer select-none' onClick={toggle}>
          {label}
        </span>
      )}
    </div>
  );
}