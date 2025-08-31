// components/atoms/Select.jsx
'use client';

import { useEffect, useRef, useState, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({  options, placeholder = 'Select an option', label, cnLabel, onChange, onBlur, className, cnPlaceholder , cnSelect, error = null, required = false, name, value, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [touched, setTouched] = useState(false);
  const selectRef = useRef(null);


	useEffect(() => {
    // Set the initial selected value based on the `value` prop passed from the parent component
    if (value) {
      const selectedOption = options.find(option => option.id == value);
      if (selectedOption) {
        setSelected(selectedOption.name);
      }
    }
  }, [value, options]);

	
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false);
        if (!touched) {
          setTouched(true);
          onBlur?.();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [touched, onBlur]);


  const handleSelect = option => {
    setSelected(option.name);
    setOpen(false);
    setTouched(true);
    onChange?.(option);
    onBlur?.();
  };

  const handleButtonClick = () => {
    setOpen(prev => !prev);
    if (!touched) {
      setTouched(true);
      onBlur?.();
    }
  };

  const getBorderClass = () => {
    if (error) return 'border-red-500 ring-2 ring-red-500/20';
    if (selected) return 'border-emerald-600';
    if (open) return 'border-emerald-600';
    return 'border-gray-300';
  };

  return (
    <div className={`${className} w-full`} ref={selectRef}>
      {label && (
        <label className={`${cnLabel} mb-1 block text-sm font-medium text-gray-600`}>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}

      <div className={`relative w-full `}>
        <button
          type='button'
          onClick={handleButtonClick}
          className={`${cnSelect} ${getBorderClass()} h-[40px] cursor-pointer w-full flex items-center justify-between rounded-md border px-4 py-2 text-sm transition
            bg-white text-gray-700 
            hover:bg-gray-50 hover:border-emerald-600/70 
            focus:outline-none focus:ring-2 focus:ring-emerald-600/50`}
          {...props}>
          <span className={`truncate ${cnPlaceholder} ${selected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{selected || placeholder}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180 text-emerald-600' : 'text-gray-400'}`} />
        </button>

        <div
          className={`absolute left-0 right-0 mt-2 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out z-50
          ${open ? 'max-h-[303px] opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 pointer-events-none'}`}>
          <ul className='divide-y divide-gray-100'>
            {options.map(opt => (
              <li
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className={`cursor-pointer px-4 py-2 text-sm transition 
                  ${selected === opt.name ? 'bg-emerald-600 text-white font-medium' : 'text-gray-700 hover:bg-emerald-600/90 hover:text-white'}`}>
                {opt.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className='text-red-500 text-sm mt-1'>{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
