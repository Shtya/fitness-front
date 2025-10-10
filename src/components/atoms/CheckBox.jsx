'use client';

import React, { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function CheckBox({ label, initialChecked = false, onChange = () => {}, className = '' }) {
  const [checked, setChecked] = useState(!!initialChecked);
  const id = useId();

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
        className={`relative cursor-pointer flex h-6.5 w-6.5 items-center justify-center rounded-md border transition-colors duration-300
          ${checked ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600' : 'bg-white border-gray-300'}
          focus:outline-none focus:ring-2 focus:ring-blue-400`}>
        <motion.div initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          <Check className='h-4 w-4 text-white' />
        </motion.div>
      </button>

      {label && (
        <span className='text-slate-800 text-[15px] leading-none cursor-pointer' onClick={toggle}>
          {label}
        </span>
      )}
    </div>
  );
}
