// app/thank-you/page.jsx
'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Home, FileText, PlusCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ThankYouPage() {
  const t = useTranslations('ThankYouPage');

  return (
    <div className='relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-indigo-50 via-white to-emerald-50'>
      {/* soft background orbs */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -top-20 -right-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl' />
        <div className='absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl' />
      </div>

      <div className='relative w-full max-w-2xl'>
        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }} className='rounded-lg border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(2,6,23,0.08)]'>
          <div className='px-8 py-10 sm:px-10'>
            {/* Success badge */}
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }} className='mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 border border-emerald-200'>
              <CheckCircle2 className='size-9 text-emerald-600' />
            </motion.div>

            {/* Title & copy */}
            <div className='mt-6 text-center'>
              <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>{t('title')}</h1>
              <p className='mt-3 text-slate-600 leading-relaxed'>{t('description')}</p>

              {/* Tiny hint row */}
              <div className='mt-2 text-xs text-slate-400'>{t('hint')}</div>
            </div>
          </div>
        </motion.div>

        {/* Minimal confetti grid accents */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.25, duration: 0.6 }} aria-hidden className='mt-8 grid grid-cols-12 gap-1 max-w-xl mx-auto'>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full ${i % 4 === 0 ? 'bg-emerald-300/70' : i % 4 === 1 ? 'bg-indigo-300/70' : i % 4 === 2 ? 'bg-blue-300/70' : 'bg-cyan-300/70'}`} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
