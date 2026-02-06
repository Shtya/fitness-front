'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export function Switcher({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative cursor-pointer inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300',
        checked ? 'theme-gradient-bg' : 'bg-slate-300',
        'focus:outline-none focus:ring-2 ring-[color:var(--color-primary-300)]',
      ].join(' ')}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={[
          'absolute flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md',
          checked ? 'right-1' : 'left-1',
        ].join(' ')}
        // NOTE: framer-motion + layout handles positioning; no need for forced translate hacks
      >
        {checked ? (
          <Check className="h-3 w-3 text-[color:var(--color-primary-500)]" />
        ) : (
          <X className="h-3 w-3 text-slate-400" />
        )}
      </motion.span>
    </button>
  );
}
