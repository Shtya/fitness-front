'use client';

import { useState, useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function InputDate({
  cnLabel,
  cnInput,
  className,
  label,
  placeholder = 'Select date',
  onChange,
  defaultValue,   // ✅ NEW PROP
}) {
  const inputRef = useRef(null);
  const t = useTranslations("common");

  const initDate = defaultValue ? new Date(defaultValue) : new Date();

  const format = d =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const [value, setValue] = useState(format(initDate));

  useEffect(() => {
    onChange?.(initDate);

    if (inputRef.current) {
      flatpickr(inputRef.current, {
        dateFormat: 'd M Y',
        defaultDate: initDate, // ⭐ Uses the passed value
        onChange: selectedDates => {
          const date = selectedDates[0];
          if (date) {
            setValue(format(date));
            onChange?.(date);
          }
        },
      });
    }
  }, [defaultValue]); // ⭐ re-init if defaultValue changes

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className={`mb-[6px] block text-sm font-medium text-gray-600 ${cnLabel}`}>
          {label}
        </label>
      )}

      <div
        className={`${cnInput} relative flex items-center rounded-lg bg-white h-[40px] px-2 py-2 text-sm gap-1 
        transition border border-slate-300 hover:border-slate-400 
        focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100`}>
        <span className="flex-none text-slate-400">
          <Image src={'/icons/calendar.svg'} alt="icon" width={20} height={20} />
        </span>

        <input
          ref={inputRef}
          type="text"
          placeholder={t("selectDate")}
          value={value}
          readOnly
          className="w-full bg-transparent outline-none text-slate-700 placeholder:text-gray-400 cursor-pointer"
        />
      </div>
    </div>
  );
}
