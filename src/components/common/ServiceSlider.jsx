'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import ServiceCard from '../pages/services/ServiceCard';
import { swiperSettings } from '@/config/Swiper';
import { useEffect, useState } from 'react';
import ServiceCardSkeleton from '../skeleton/ServiceCardSkeleton';

export default function ServiceSlider({ services, title, className , swiperConfig=swiperSettings }) {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`relative mt-12 ${className}`}>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl max-md:text-xl font-[900]">{title}</h1>
        </div>

        {/* Skeleton grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => ( <ServiceCardSkeleton key={i} /> ))}
        </div>
      </div>
    );
  }


  return (
    <div className={`relative mt-12 ${className}`}>
      <div className='mb-8 flex items-center justify-between'>
        <h1 className='text-3xl max-md:text-xl font-[900]'>{title}</h1>

        <div className='flex items-center gap-2'>
          <button className='cards-prev2 cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-slate-200 duration-300 border border-slate-200' aria-label='Previous'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path d='M15 6l-6 6 6 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>

          <button className='cards-next2 cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-slate-200 duration-300 border border-slate-200' aria-label='Next'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path d='M9 6l6 6-6 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
        </div>
      </div>

      <Swiper
        modules={[Navigation, Pagination]}
        {...swiperConfig}>
        {services.map((service, index) => (
          <SwiperSlide key={index} className='py-4' >
            <ServiceCard isHoverScale={false} key={index} service={service} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
