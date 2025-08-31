'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function AnimatedCheckbox({ checked, onChange }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative cursor-pointer flex h-6 w-6 items-center justify-center rounded-md border transition-colors duration-300
        ${checked ? 'gradient border-green-500' : 'bg-white border-gray-300'}
        focus:outline-none focus:ring-2 focus:ring-green-400`}
    >
      {/* Animated Icon */}
      <motion.div
        initial={false}
        animate={{
          scale: checked ? 1 : 0,
          opacity: checked ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <Check className="h-4 w-4 text-white" />
      </motion.div>
    </button>
  );
}
