'use client';
import { Link } from '@/i18n/navigation';
import React from 'react';

export default function Button({
  name,
  disabled,
  icon,
  srcImg,
  onClick,
  href,
  className = '',
  color = 'primary',
  loading = false,
  type = 'button', // Added type prop
}) {
  const colorClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400/50',
    blue: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400/50',
    green: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400/50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400/50',
    red: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400/50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400/50',
    yellow: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400/50',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400/50',
    black: 'bg-black text-white hover:bg-black/90 focus-visible:ring-black/40',
    gray: 'bg-gray-800 text-white hover:bg-gray-900 focus-visible:ring-gray-400/40',
    neutral: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300',
    outline: 'bg-transparent !text-gray-800 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-300',
    ghost: 'bg-transparent text-gray-800 hover:bg-gray-100 focus-visible:ring-gray-200',
    subtle: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300',
  };

  const baseClass = `cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg text-lg max-md:text-base px-4 !py-[5px] transition-all duration-300`;

  const finalClass = `${baseClass} ${colorClasses[color]} ${disabled ? '!opacity-50 !cursor-not-allowed !pointer-events-none' : ''} ${className} transform perspective-1000`;

  const loadingContent = <div className='w-5 h-5 border-4 border-t-transparent border-white rounded-full animate-spin'></div>;

  const content = loading ? (
    loadingContent
  ) : (
    <>
      {srcImg && <img src={srcImg} alt='icon' className='h-5 w-5 object-contain' />}
      {name && <span className='text-nowrap'>{name}</span>}
      {icon && <span className='!w-fit'>{icon}</span>}
    </>
  );

  const handleClick = e => {
    if (disabled || loading) return;
    if (onClick) {
      e.preventDefault(); // Prevent default behavior
      onClick(e);
    }
  };

  if (href) {
    return (
      <Link href={href} className={finalClass}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type} // Use the type prop
      disabled={disabled || loading}
      onClick={handleClick}
      className={finalClass}>
      {content}
    </button>
  );
}
