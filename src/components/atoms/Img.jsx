'use client';

import { baseImg } from '@/lib/axios';
import { useState } from 'react';

export default function Img({ src, alt = '', className = 'h-full w-full object-cover' }) {
   return (
    <img
      src={ src?.startsWith("http") ? src : baseImg +  src}
      alt={alt}
      className={`${className}`}
      onError={e => {
        e.target.classList.add('!object-contain');
        e.target.src = '/icons/no-img.png';
      }}
    />
  );
}
