'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const FullScreenLoading = () => {
  const t = useTranslations('common');
  return (
    <div
      className='
        fixed inset-0 flex flex-col items-center justify-center
        bg-white bg-opacity-90 z-[9999]
        text-xl text-gray-700 font-inter rounded-lg shadow-lg
      '>
      <Image src='/images/helhal-logo.png' alt='Helhal Logo' width={801} height={800} className='w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain' priority />

      <p className='mt-2 md:mt-4'>{t('loading')}</p>
    </div>
  );
};

export default FullScreenLoading;
