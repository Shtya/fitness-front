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
  // Static semantic colors (intentionally NOT theme-driven)
  const staticColors = {
    violet:  { bg: '#7c3aed', hover: '#6d28d9', shadow: 'rgba(124,58,237,0.35)' },
    blue:    { bg: '#2563eb', hover: '#1d4ed8', shadow: 'rgba(37,99,235,0.35)' },
    green:   { bg: '#059669', hover: '#047857', shadow: 'rgba(5,150,105,0.35)' },
    success: { bg: '#059669', hover: '#047857', shadow: 'rgba(5,150,105,0.35)' },
    red:     { bg: '#e11d48', hover: '#be123c', shadow: 'rgba(225,29,72,0.35)' },
    danger:  { bg: '#e11d48', hover: '#be123c', shadow: 'rgba(225,29,72,0.35)' },
    yellow:  { bg: '#d97706', hover: '#b45309', shadow: 'rgba(217,119,6,0.35)' },
    warning: { bg: '#d97706', hover: '#b45309', shadow: 'rgba(217,119,6,0.35)' },
    black:   { bg: '#111827', hover: '#1f2937', shadow: 'rgba(17,24,39,0.4)' },
    gray:    { bg: '#374151', hover: '#1f2937', shadow: 'rgba(55,65,81,0.35)' },
  };

  const flatColors = {
    neutral: { bg: '#f1f5f9', hover: '#e2e8f0', text: '#1e293b', shadow: 'rgba(0,0,0,0.06)' },
    outline: { bg: 'transparent', hover: '#f8fafc', text: '#334155', border: '#e2e8f0', shadow: 'rgba(0,0,0,0.04)' },
    ghost:   { bg: 'transparent', hover: '#f1f5f9', text: '#475569', shadow: 'none' },
    subtle:  { bg: '#f8fafc', hover: '#f1f5f9', text: '#334155', shadow: 'rgba(0,0,0,0.04)' },
  };

  const isPrimary = color === 'primary';
  const isFlat = color in flatColors;
  const isStatic = color in staticColors;

  const [isHovered, setIsHovered] = useState(false);

  let inlineStyle = {};

  if (isPrimary) {
    inlineStyle = {
      background: isHovered
        ? 'linear-gradient(135deg, var(--color-primary-700), var(--color-primary-600))'
        : 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
      color: '#fff',
      boxShadow: isHovered
        ? '0 6px 20px -6px var(--color-primary-600)'
        : '0 4px 14px -6px var(--color-primary-500)',
      transition: 'background 0.2s ease, box-shadow 0.2s ease',
    };
  } else if (isStatic) {
    const c = staticColors[color];
    inlineStyle = {
      background: isHovered ? c.hover : c.bg,
      color: '#fff',
      boxShadow: isHovered ? `0 6px 18px -6px ${c.shadow}` : `0 3px 12px -6px ${c.shadow}`,
      transition: 'background 0.2s ease, box-shadow 0.2s ease',
    };
  } else if (isFlat) {
    const c = flatColors[color];
    inlineStyle = {
      background: isHovered ? c.hover : c.bg,
      color: c.text,
      border: c.border ? `1px solid ${c.border}` : undefined,
      boxShadow: c.shadow !== 'none' && isHovered ? `0 2px 8px -4px ${c.shadow}` : undefined,
      transition: 'background 0.2s ease, box-shadow 0.2s ease',
    };
  }

  const baseClass = [
    '!w-fit',
    'min-h-[38px]',
    'cursor-pointer',
    'inline-flex items-center justify-center gap-2',
    'rounded-xl',
    'text-sm font-semibold',
    'px-4 py-2',
    'transition-all duration-200',
    'outline-none',
    'focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] focus-visible:ring-offset-1',
    'active:scale-[.97]',
    disabled ? '!opacity-50 !cursor-not-allowed !pointer-events-none' : '',
    className,
  ].join(' ');

  const loadingContent = (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );

  const content = loading ? loadingContent : (
    <>
      {srcImg && <img src={srcImg} alt="icon" className="h-4 w-4 object-contain" />}
      {icon && <span className="flex-shrink-0 leading-none">{icon}</span>}
      {name && <span className="text-nowrap leading-none">{name}</span>}
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
    return <Link href={href} {...commonProps}>{content}</Link>;
  }

  return (
    <button type={type} disabled={disabled || loading} onClick={handleClick} {...commonProps}>
      {content}
    </button>
  );
}