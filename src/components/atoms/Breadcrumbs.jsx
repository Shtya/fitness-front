import { Link } from '@/i18n/navigation';
import React from 'react';

export default function Breadcrumbs({ items = [], className = '',  homeHref = '/' }) {
  const lastIndex = items.length - 1;

  return (
    <div className={`my-[20px] ${className}`} aria-label='Breadcrumb'>
      <ol className='flex items-center gap-2 w-fit rounded-md bg-slate-50 px-4 py-1 border border-slate-200/80 '>
        {/* Home */}
        <li className='flex items-center'>
          <Link href={homeHref} className='inline-flex items-center -ml-1.5 p-1.5 rounded-lg hover:bg-slate-100  ' title='Home'>
            <svg className='h-3 w-3 mt-1 ' width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M11.8314 5.57573L10.6299 4.37572L6.42472 0.175674C6.31207 0.0631898 6.15929 0 6 0C5.84071 0 5.68793 0.0631898 5.57528 0.175674L1.37011 4.37572L0.168634 5.57573C0.059205 5.68889 -0.00134602 5.84046 2.27095e-05 5.99778C0.00139144 6.1551 0.0645704 6.30559 0.175952 6.41683C0.287334 6.52808 0.438006 6.59118 0.595518 6.59255C0.75303 6.59391 0.904778 6.53344 1.01808 6.42414L1.19409 6.24834V10.8C1.19409 11.1182 1.32068 11.4235 1.546 11.6485C1.77132 11.8736 2.07692 12 2.39557 12H4.19779C4.35711 12 4.50991 11.9368 4.62257 11.8243C4.73523 11.7117 4.79852 11.5591 4.79852 11.4V8.99997C4.79852 8.84084 4.86182 8.68822 4.97448 8.5757C5.08714 8.46318 5.23994 8.39996 5.39926 8.39996H6.60074C6.76006 8.39996 6.91286 8.46318 7.02552 8.5757C7.13818 8.68822 7.20148 8.84084 7.20148 8.99997V11.4C7.20148 11.5591 7.26477 11.7117 7.37743 11.8243C7.49009 11.9368 7.64289 12 7.80221 12H9.60443C9.92308 12 10.2287 11.8736 10.454 11.6485C10.6793 11.4235 10.8059 11.1182 10.8059 10.8V6.24834L10.9819 6.42414C11.0952 6.53344 11.247 6.59391 11.4045 6.59255C11.562 6.59118 11.7127 6.52808 11.824 6.41683C11.9354 6.30559 11.9986 6.1551 12 5.99778C12.0013 5.84046 11.9408 5.68889 11.8314 5.57573Z' fill='#374151' />{' '}
            </svg>
          </Link>
        </li>

        {items.map((it, i) => {
          const isLast = i === lastIndex;
          return (
            <React.Fragment key={`${it.label}-${i}`}>
              <li aria-hidden className='text-slate-400 mt-1 opacity-60 '>
                <img src='/icons/arrow-right.svg' className='h-3 w-3' />
              </li>
              <li className='min-w-0 text-lg'>
                {isLast || !it.href ? (
                  <span className={`truncate text-[#009966] font-[500] opacity-80`} aria-current='page' title={it.label}>
                    {it.label}
                  </span>
                ) : (
                  <Link href={it.href} className='truncate opacity-80 font-[500] hover:text-slate-900 ' title={it.label}>
                    {it.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}
 