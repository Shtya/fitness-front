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
      className={`relative cursor-pointer inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300
        ${checked ? 'bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 ' : 'bg-gray-300'}
        focus:outline-none focus:ring-2 focus:ring-indigo-400`}
    >
      {/* Circle Knob */}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className={`absolute ${checked ? "right-1" : "left-1"} flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md`}
        style={{
          transform: checked ? '!translateX(28px)' : '!translateX(0px)',
        }}
      >
        {checked ? (
          <Check className="h-3 w-3 text-indigo-500" />
        ) : (
          <X className="h-3 w-3 text-gray-400" />
        )}
      </motion.span>
    </button>
  );
}
