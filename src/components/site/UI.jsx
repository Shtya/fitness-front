'use client';

import { motion } from 'framer-motion';

export const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

export function Container({ className = '', children }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
export function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`py-14 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}
export function Button({ as: As = 'button', variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition';
  const styles = variant === 'primary' ? 'bg-main' : variant === 'ghost' ? 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800' : 'bg-slate-800 text-white hover:bg-slate-700';
  const Comp = As;
  return <Comp className={`${base} ${styles} ${className}`} {...props} />;
}
export function Badge({ children }) {
  return <span className='inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'>{children}</span>;
}
export function Card({ className = '', children }) {
  return <div className={`relative rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.05)] ${className}`}>{children}</div>;
}
export function Input({ className = '', ...props }) {
  return <input className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`} {...props} />;
}
export function Textarea({ className = '', ...props }) {
  return <textarea className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`} {...props} />;
}
export function Select({ className = '', ...props }) {
  return <select className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`} {...props} />;
}

export function Feature({ icon: Icon, title, children }) {
  return (
    <div className='flex items-start gap-3'>
      {Icon && (
        <div className='mt-1 w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 grid place-items-center'>
          <Icon className='w-5 h-5' />
        </div>
      )}
      <div>
        <div className='font-semibold'>{title}</div>
        <div className='text-slate-600 text-sm mt-1'>{children}</div>
      </div>
    </div>
  );
}
