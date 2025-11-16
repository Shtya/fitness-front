'use client';

import { useState, useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function InputDate({
  cnLabel,
  cnInput,
  className = '',
  label,
  placeholder = 'Select date',
  onChange,
  defaultValue, // string | Date
}) {
  const inputRef = useRef(null);
  const fpRef = useRef(null); // keep flatpickr instance
  const t = useTranslations('common');

  const toDate = v => {
    if (!v) return new Date();
    if (v instanceof Date) return v;
    // try parse string
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const format = d =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const [value, setValue] = useState(() => format(toDate(defaultValue)));

  useEffect(() => {
    const initDate = toDate(defaultValue);
    setValue(format(initDate));
    onChange?.(initDate);

    if (!inputRef.current) return;

    // destroy old instance if exists
    if (fpRef.current) {
      fpRef.current.destroy();
      fpRef.current = null;
    }

    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: 'd M Y',
      defaultDate: initDate,
      disableMobile: true, // 🔥 force flatpickr on mobile (no native date UI)
      onChange: selectedDates => {
        const date = selectedDates?.[0];
        if (date) {
          setValue(format(date));
          onChange?.(date);
        }
      },
    });

    // cleanup on unmount
    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
        fpRef.current = null;
      }
    };
  }, [defaultValue]); // re-init when defaultValue changes

  return (
    <div className={`w-full ${className}`}>
      {label && <label className={`mb-[6px] block text-sm font-medium text-gray-600 ${cnLabel}`}>{label}</label>}

      <div
        className={`${cnInput} relative flex items-center gap-2 rounded-lg bg-white h-[40px] px-2 py-2 text-sm 
        transition border border-slate-300 hover:border-slate-400 
        focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100`}>
        <span className=' flex-none text-slate-400'>
          <Image src='/icons/calendar.svg' alt='icon' width={20} height={20} />
        </span>

        <input
          ref={inputRef}
          type='text'
          // dir='ltr'  
          placeholder={t('selectDate') || placeholder}
          value={value}
          readOnly
          className=' font-number w-full bg-transparent outline-none text-slate-700 placeholder:text-gray-400 cursor-pointer'
        />
      </div>
    </div>
  );
}
