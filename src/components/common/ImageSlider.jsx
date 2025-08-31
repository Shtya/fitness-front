'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function ImageSlider({ images, title, className }) {
  return (
    <div className={`relative mt-12 ${className}`}>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='text-3xl max-md:text-xl font-[900]'>{title}</h1>

        <div className='flex items-center gap-2'>
          <button className='cards-prev cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-slate-200 duration-300 border border-slate-200' aria-label='Previous'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path d='M15 6l-6 6 6 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>

          <button className='cards-next cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-slate-200 duration-300 border border-slate-200' aria-label='Next'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path d='M9 6l6 6-6 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
        </div>
      </div>

      <Swiper
        modules={[Navigation, Pagination]}
        navigation={{ prevEl: '.cards-prev', nextEl: '.cards-next' }}
        pagination={{
          el: '.cards-pagination',
          clickable: true,
          bulletClass: 'cards-bullet',
          bulletActiveClass: 'cards-bullet-active',
          renderBullet: (_i, className) => `<span class="${className}"><span class="inner"></span></span>`,
        }}
        spaceBetween={10}
        slidesPerView={3}
        breakpoints={{
          1024: { slidesPerView: 3 }, 
          640: { slidesPerView: 2 },  
          480: { slidesPerView: 1 },  
        }}
      >
        {images.map((img, index) => (
          <SwiperSlide key={index}>
            <div className='group p-2 block h-fit overflow-hidden border border-slate-100  bg-white hover:bg-slate-100 duration-300 rounded-lg'>
              <img src={img.src} alt={img.alt || 'Image'} className='aspect-1/1 w-full h-full object-cover rounded-lg border border-slate-200' />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
