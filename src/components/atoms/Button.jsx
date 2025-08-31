'use client';
import { Link } from '@/i18n/navigation';
import React from 'react';

export default function Button({ name, disabled, icon, srcImg, onClick, href, className = '', color = 'default', loading = false }) {
  const colorClasses = {
    default: 'gradient',
    red: 'bg-red-600 hover:bg-red-700',
    green: 'gradient',
    secondary: 'bg-slate-100 border border-slate-200 !text-slate-700 hover:bg-slate-200',
    outline: 'border-[2px] border-emerald-500 !text-emerald-500 hover:bg-emerald-500 hover:!text-white', // Add outline green color
  };

  const baseClass = `cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg text-lg max-md:text-base text-white px-4 py-2 transition-all duration-300`;

  const finalClass = `${baseClass} ${colorClasses[color]} ${disabled ? '!opacity-50 !cursor-not-allowed !pointer-events-none' : ''} ${className} 
    transform perspective-1000 
     `;

  const loadingContent = <div className='w-5 h-5 border-4 border-t-transparent border-white rounded-full animate-spin'></div>;

  const content = loading ? (
    loadingContent // Show spinner if loading is true
  ) : (
    <>
      {srcImg && <img src={srcImg} alt='icon' className='h-5 w-5 object-contain' />}
      {name && <span className='text-nowrap'>{name}</span>}
      {icon && <span className='!w-fit'>{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={finalClass}>
        {content}
      </Link>
    );
  }

  return (
    <button disabled={disabled || loading} onClick={onClick} className={finalClass}>
      {content}
    </button>
  );
}
