'use client';

import { useState, useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { CalendarDays } from 'lucide-react';
import Image from 'next/image';

export default function InputDate({ cnLabel, cnInput, className, label, placeholder = 'Select date', onChange }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      flatpickr(inputRef.current, {
        dateFormat: 'd M Y',
        onChange: selectedDates => {
          const date = selectedDates[0];
          if (date) {
            const formatted = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            setValue(formatted);
            onChange?.(date);
          }
        },
      });
    }
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {label && <label className={`mb-1 block text-sm font-medium text-gray-600 ${cnLabel}`}>{label}</label>}

      <div
        className={` ${cnInput} relative flex items-center rounded-md bg-white h-[40px] px-2 py-2 text-sm gap-1 
        transition border ${value ? 'border-emerald-600' : 'border-gray-300'} focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20`}>
        <span className='flex-none text-slate-400'>
          <Image src={'/icons/calendar.svg'} alt='icon' width={20} height={20} />
        </span>

        {/* ✅ Flatpickr input */}
        <input ref={inputRef} type='text' placeholder={placeholder} value={value} readOnly className='w-full bg-transparent outline-none text-slate-700 placeholder:text-gray-400 cursor-pointer' />
      </div>
    </div>
  );
}
