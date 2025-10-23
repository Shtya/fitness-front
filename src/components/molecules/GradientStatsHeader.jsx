// components/ui/GradientStatsHeader.tsx
'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export function GradientStatsHeader({ hiddenStats , className = '', children, loadingStats, title, desc, onClick, btnName }) {
  return (
    <div className={'relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur ' + className}>
      {/* Background Decorations */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
        <div
          className='absolute inset-0 opacity-15'
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            backgroundPosition: '-1px -1px',
          }}
        />
        <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
        <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
      </div>

      <div className='relative p-4 sm:p-8 text-white'>
        <div className=' max-md:items-center max-md:flex-row flex flex-col md:flex-row md:items-center justify-between gap-3 '>
          <div>
            <h1 className='text-xl md:text-4xl font-semibold'>{title}</h1>
            <p className='text-white/85 mt-1 max-md:hidden '>{desc}</p>
          </div>

          {btnName && <button onClick={onClick} className=' max-md:w-fit group relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm  font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30 transition-transform active:scale-[.98]'>
            <Plus size={16} />
            <span>{btnName}</span>
          </button>}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className={`mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 ${hiddenStats && "max-md:hidden"} `}>
          {loadingStats ? <KpiSkeleton /> : children}
        </motion.div>
      </div>
    </div>
  );
}
function KpiSkeleton() {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full  col-span-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='card-glow p-[10px] '>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg shimmer' />
            <div className='flex-1'>
              <div className='h-3 shimmer w-24 rounded mb-2' />
              <div className='h-4 shimmer w-16 rounded' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
