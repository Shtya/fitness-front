'use client';

import { useMemo, useRef } from 'react';
import { baseImg } from '@/utils/axios';

const FALLBACK_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <g fill="#94a3b8">
        <circle cx="24" cy="24" r="10"/>
        <rect x="42" y="18" width="60" height="12" rx="6"/>
      </g>
    </svg>`,
  );

export default function Img({ src, altSrc, alt = '', className = 'h-full w-full object-cover', fallback = FALLBACK_DATA_URI, loading = 'lazy', decoding = 'async', draggable = false, showBlur = true, ...rest }) {
  const errorHandledRef = useRef(false);

  const resolved = useMemo(() => {
    try {
      // Nullish / non-string => fallback
      if (src == null || typeof src !== 'string') return fallback;
      const trimmed = src.trim();
      if (!trimmed) return fallback;

      // Allow only https / data / blob
      if (trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
        return trimmed;
      }

      // Explicitly reject http:// (do NOT auto-upgrade silently)
      if (trimmed.startsWith('http://')) {
        return fallback;
      }

      // Relative path -> prefix with baseImg
      const base = String(baseImg || '').replace(/\/+$/, '');
      const rel = trimmed.replace(/^\/+/, '');
      if (!base) return fallback;
      return `${base}/${rel}`;
    } catch {
      return fallback;
    }
  }, [src, fallback]);

  const handleError = e => {
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;
    // stop further loops
    e.currentTarget.onerror = null;
    e.currentTarget.classList.add('!object-contain', 'bg-slate-50');
    e.currentTarget.src = altSrc || fallback;
  };

  const handleLoad = e => {
    if ((altSrc && e.currentTarget.src.includes(altSrc)) || e.currentTarget.src === fallback) {
      e.currentTarget.classList.add('!object-contain');
    } else {
      e.currentTarget.classList.remove('!object-contain');
    }
  };

  const showBlurBg = resolved !== fallback && typeof resolved === 'string' && !resolved.startsWith('data:') && !resolved.startsWith('blob:');

  return (
    <div className='relative w-full h-full overflow-hidden'>
      {showBlurBg && showBlur && (
        <img
          src={resolved}
          alt=''
          className='absolute inset-0 w-full h-full object-cover blur-[20px]'
          aria-hidden='true'
          // never let the bg layer trigger fallback swaps
          onError={e => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = 'none';
          }}
          loading={loading}
          decoding={decoding}
          draggable={false}
        />
      )}

      <img src={resolved} alt={resolved === fallback ? '' : alt} className={`relative ${className}`} onError={handleError} onLoad={handleLoad} loading={loading} decoding={decoding} draggable={draggable} {...rest} />
    </div>
  );
}
