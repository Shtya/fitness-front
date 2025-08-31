'use client';
import { Link } from '@/i18n/navigation';
import React from 'react';
 
const NotFound = () => {
  return (
    <main className='relative w-full h-auto lg:h-[680px]  !py-[40px] overflow-hidden'>
      <div className='absolute inset-0 bg-[#108A00]' aria-hidden='true' />

      <img src='/images/not-found/bg.png' alt='' className='absolute inset-0 h-full w-full object-cover opacity-60' loading='lazy' aria-hidden='true' />
      <div className='absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30' aria-hidden='true' />

      {/* content */}
      <section className='relative container h-full max-lg:!py-8 '>
        <div className=' h-full grid grid-cols-1 max-lg:justify-center lg:grid-cols-2 gap-10 items-center'>
          {/* text column */}
          <div className='text-white max-lg:text-center  '>
            <p className='mb-3 text-xl font-semibold uppercase tracking-wider text-emerald-100/90'>Error 404</p>
            <h1 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight'>Page not found</h1>
            <p className='mt-4 text-emerald-50/90 text-base sm:text-lg max-lg:mx-auto max-w-xl'>Sorry, the page you’re looking for doesn’t exist or has been moved. Try going back, or head to the homepage.</p>

             <div className='mt-8 flex max-lg:mx-auto max-lg:w-fit flex-wrap gap-3'>
              <Link href='/' className='inline-flex items-center rounded-xl bg-white text-emerald-700 px-5 py-2.5 font-semibold shadow-sm hover:shadow-md transition'> Back to Home  </Link>
              <button onClick={() => history.back()} className='inline-flex items-center rounded-xl border border-white/70 bg-transparent px-5 py-2.5 font-semibold text-white hover:bg-white/10 transition'> Go Back  </button>
            </div>
          </div>

          {/* illustration column */}
          <div className='relative !h-full max-lg:order-[-1] '>
            <div className='relative mx-auto lg:ml-auto max-w-[520px] !h-full w-full'>
              <div className='absolute !h-full -inset-4 rounded-3xl bg-white/10 blur-2xl' aria-hidden='true' />
              <img
                src='/images/not-found/camira.png'
                alt='Illustration'
                className='relative z-[1] w-full h-[calc(100%-20px)] mt-[10px] object-contain rounded-3xl shadow-2xl ring-1 ring-white/30'
                loading='lazy'
              />
            </div> 
          </div>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
