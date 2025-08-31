import { useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';

export const SelectInput = ({ label, options = [], register, error, disabled = false, ...props }) => {
  const [selectedValue, setSelectedValue] = useState(options[0]?.value);
  const [hoveredTab, setHoveredTab] = useState(null);

  const handleSelect = value => {
    if (!disabled) {
      setSelectedValue(value);
    }
  };

  return (
    <div className='w-full mb-5'>
      {/* Box container for Select Input */}
      <div className='p-4 border border-slate-200  rounded-xl shadow-inner '>
         {label && <label className='block text-sm text-gray-600 mb-2'>{label}</label>}

        <LayoutGroup id={`select-tabs-${Math.random()}`}>
          {/* Button Group with animation */}
          <div className='flex items-center space-x-2'>
            {options.map(option => {
              const isActive = selectedValue === option.value;
              const isHovered = hoveredTab === option.value;

              return (
                <motion.button
                  key={option.value}
                  type='button'
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHoveredTab(option.value)}
                  onMouseLeave={() => setHoveredTab(null)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative cursor-pointer rounded-2xl px-6 py-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500/60
                    ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 shadow-inner text-gray-700'}
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    ${isHovered && !disabled ? 'bg-emerald-600 text-white' : ''}  
                  `}
                  disabled={disabled} // Ensure button is truly disabled for interactivity
                >
                  {/* Active pill animation */}
                  {isActive && <motion.span layoutId='active-pill' className='absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg' transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}

                  <span className={`relative z-10 transition-colors ${isActive ? 'text-white drop-shadow-sm' : 'text-gray-700'}`}>{option.label}</span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>

        {/* Hidden input to bind the selected value */}
        <input
          type='hidden'
          value={selectedValue}
          {...register} // Pass register to bind this value with react-hook-form
          {...props}
        />

        {/* Error message */}
        {error && <p className='mt-1 text-sm text-red-600 flex items-center gap-1'>⚠ {error}</p>}
      </div>
    </div>
  );
};
