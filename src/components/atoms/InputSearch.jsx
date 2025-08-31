import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const InputSearch = ({ className, placeholder = 'Search here...', iconLeft, actionIcon, onSearch, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = e => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const handleChange = e => {
    setSearchTerm(e.target.value);
    onChange?.(e.target.value); // Trigger onChange callback if provided
  };

  return (
    <div className={`relative w-full ${className} max-w-[350px] `}>
      <div
        className={`relative flex items-center rounded-md bg-white h-[40px] px-2 py-2 text-sm gap-1
        transition border ${searchTerm ? 'border-emerald-600' : 'border-gray-300'} focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20`}>
        {/* Left icon */}
        {iconLeft && (
          <span className='flex-none text-slate-400'>
            <Image src={iconLeft} alt='icon' width={20} height={20} />
          </span>
        )}

        {/* Input field */}
        <input type='text' placeholder={placeholder} value={searchTerm} onChange={handleChange} className={`w-full bg-transparent outline-none text-slate-700 placeholder:text-gray-400 ${actionIcon && 'w-[calc(100%-50px)]'}`} />

        {/* Action button */}
        {actionIcon && (
          <button onClick={handleSearch} className='absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition'>
            <img src={actionIcon} alt='action icon' className='w-full' />
          </button>
        )}
      </div>

      {!actionIcon && (
        <button onClick={handleSearch} className='absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md  gradient text-white hover:opacity-90 duration-300 hover:scale-[1.05] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 cursor-pointer'>
          <ArrowRight className='w-5 h-5' />
        </button>
      )}
    </div>
  );
};

export default InputSearch;
