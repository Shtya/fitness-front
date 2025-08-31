'use client';
import { motion } from 'framer-motion';
import { Menu, Bell, Search, Sparkles, User, Dumbbell } from 'lucide-react';

export default function Header({ onMenu }) {
  return (
    <div className='sticky top-0 z-40'>
      <div className='absolute inset-0 bg-gradient-to-b from-white/80 to-white/50 backdrop-blur-xl border-b border-slate-200/70' />

      <div className='sticky top-0 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur-md'>
        <div className='mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-3'>
              <button onClick={onMenu} className='lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white hover:shadow-sm active:scale-95 transition' aria-label='Open menu'>
                <Menu className='w-5 h-5' />
              </button>
              <div className='hidden lg:flex items-center gap-2 text-lg lg:text-xl font-semibold'>
                <Sparkles className='w-5 h-5 text-emerald-600' />
                <span>Radiant Dashboard</span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button className='relative rounded-xl border border-slate-200 p-2 hover:bg-slate-50'>
              <Bell className='size-5 text-slate-600' />
              <span className='absolute -right-1 -top-1 size-2.5 rounded-full bg-rose-500' />
            </button>
            <button className='rounded-xl size-9  bg-main text-white grid place-content-center font-semibold shadow'>MA</button>
          </div>
        </div>
      </div>
 
    </div>
  );
}
