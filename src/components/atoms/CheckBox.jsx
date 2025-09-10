import { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';

const CheckBox = ({ label, initialChecked, onChange, className }) => {
  const [checked, setChecked] = useState(initialChecked || false);

  useEffect(() => {
    setChecked(initialChecked);
  }, [initialChecked]);

  const handleCheck = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    if (onChange) {
      onChange(newChecked); // notify parent
    }
  };

  return (
    <label className={`inline-flex flex-none items-center gap-3 cursor-pointer select-none ${className}`}>
      <span
        onClick={handleCheck}
        aria-hidden
        className={`relative h-5 w-5 rounded-[6px] border transition-colors duration-200
          ${checked ? 'bg-blue-600 border-blue-600' : 'bg-blue-50 border-blue-200 hover:border-blue-300'}`}>
        {checked && <FaCheck className='!text-white h-3 w-3 absolute left-[2px] top-[2px]' />}
      </span>

      {/* real input for accessibility */}
      <input type='checkbox' checked={checked} onChange={() => {}} className='hidden' />

      <span onClick={handleCheck} className='text-slate-800 text-[15px] leading-none'>
        {label}
      </span>
    </label>
  );
};

export default CheckBox;
