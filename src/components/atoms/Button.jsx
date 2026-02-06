'use client';
import { Link } from '@/i18n/navigation';
import React, { useState } from 'react';

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
  type = 'button',
}) {
  // Static semantic colors (these are intentionally NOT theme-driven)
  const staticColors = {
    violet:  { bg: '#7e22ce', hover: '#6b21a8', ring: 'rgba(139,92,246,0.4)' },
    blue:    { bg: '#2563eb', hover: '#1d4ed8', ring: 'rgba(59,130,246,0.4)' },
    green:   { bg: '#059669', hover: '#047857', ring: 'rgba(16,185,129,0.4)' },
    success: { bg: '#059669', hover: '#047857', ring: 'rgba(16,185,129,0.4)' },
    red:     { bg: '#e11d48', hover: '#be123c', ring: 'rgba(244,63,94,0.4)' },
    danger:  { bg: '#e11d48', hover: '#be123c', ring: 'rgba(244,63,94,0.4)' },
    yellow:  { bg: '#f59e0b', hover: '#d97706', ring: 'rgba(245,158,11,0.4)' },
    warning: { bg: '#f59e0b', hover: '#d97706', ring: 'rgba(245,158,11,0.4)' },
    black:   { bg: '#000000', hover: '#1a1a1a', ring: 'rgba(0,0,0,0.4)' },
    gray:    { bg: '#1f2937', hover: '#111827', ring: 'rgba(107,114,128,0.4)' },
  };

  // Flat/ghost style colors (no filled background)
  const flatColors = {
    neutral: { bg: '#e5e7eb', hover: '#d1d5db', text: '#111827', ring: 'rgba(156,163,175,0.3)' },
    outline: { bg: 'transparent', hover: '#f9fafb', text: '#1f2937', ring: 'rgba(156,163,175,0.3)', border: '#d1d5db' },
    ghost:   { bg: 'transparent', hover: '#f3f4f6', text: '#1f2937', ring: 'rgba(156,163,175,0.2)' },
    subtle:  { bg: '#f3f4f6', hover: '#e5e7eb', text: '#111827', ring: 'rgba(156,163,175,0.3)' },
  };

  const isPrimary = color === 'primary';
  const isFlat = color in flatColors;
  const isStatic = color in staticColors;

  // --- Build inline style ---
  const [isHovered, setIsHovered] = useState(false);

  let inlineStyle = {};
  let textColor = '#ffffff';

  if (isPrimary) {
    // Uses CSS variables — follows the theme palette
    inlineStyle = {
      background: isHovered
        ? 'var(--color-primary-700)'
        : 'var(--color-primary-600)',
      color: '#fff',
      transition: 'background 0.2s ease, box-shadow 0.2s ease',
    };
  } else if (isStatic) {
    const c = staticColors[color];
    inlineStyle = {
      background: isHovered ? c.hover : c.bg,
      color: '#fff',
      transition: 'background 0.2s ease',
    };
  } else if (isFlat) {
    const c = flatColors[color];
    inlineStyle = {
      background: isHovered ? c.hover : c.bg,
      color: c.text,
      border: c.border ? `1px solid ${c.border}` : undefined,
      transition: 'background 0.2s ease',
    };
    textColor = c.text;
  }

  const baseClass = [
    '!w-fit',
    'min-h-[40px]',
    'cursor-pointer',
    'inline-flex items-center justify-center gap-2',
    'rounded-xl',
    'text-sm font-semibold',
    'px-4 !py-[5px]',
    'transition-all duration-200',
    'outline-none',
    disabled ? '!opacity-50 !cursor-not-allowed !pointer-events-none' : '',
    className,
  ].join(' ');

  const loadingContent = (
    <div className='w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin' />
  );

  const content = loading ? loadingContent : (
    <>
      {srcImg && <img src={srcImg} alt='icon' className='h-5 w-5 object-contain' />}
      {icon && <span className='!w-fit flex-shrink-0'>{icon}</span>}
      {name && <span className='text-nowrap'>{name}</span>}
    </>
  );

  const handleClick = e => {
    if (disabled || loading) return;
    if (onClick) { e.preventDefault(); onClick(e); }
  };

  const commonProps = {
    style: inlineStyle,
    className: baseClass,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (href) {
    return (
      <Link href={href} {...commonProps}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      {...commonProps}
    >
      {content}
    </button>
  );
}