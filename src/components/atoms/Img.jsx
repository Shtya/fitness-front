'use client';

import { baseImg } from '@/utils/axios';
 import { useMemo } from 'react';

export default function Img({ src, altSrc, alt = '', className = 'h-full w-full object-cover', fallback = '/icons/no-img.png', loading = 'lazy', decoding = 'async', draggable = false, ...rest }) {
  const resolved = useMemo(() => {
    if (src === null || src === undefined) return fallback;
    if (typeof src !== 'string') return fallback;

    const trimmed = src.trim();
    if (!trimmed) return fallback;
		
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }

    // relative → join with baseImg safely
    try {
      const base = String(baseImg || '').replace(/\/+$/, '');
      const rel = trimmed.replace(/^\/+/, '');
      return `${base}/${rel}`;
    } catch {
      return fallback;
    }
  }, [src, fallback]);

  const handleError = e => {
    // show contained fallback to avoid ugly stretch
    e.currentTarget.classList.add('!object-contain', 'bg-slate-50');
    e.currentTarget.src = altSrc || fallback;
  };

  const handleLoad = e => {
    // if it successfully loads something that isn’t the fallback, keep object-cover
    if (e.currentTarget.src.includes(fallback)) {
      e.currentTarget.classList.add('!object-contain');
    } else {
      e.currentTarget.classList.remove('!object-contain');
    }
  };

  return <img src={resolved} alt={alt} className={className} onError={handleError} onLoad={handleLoad} loading={loading} decoding={decoding} draggable={draggable} {...rest} />;
}
