import { useState } from 'react';
import { FaCheck } from 'react-icons/fa';

const CheckBox = ({ label, initialChecked, onChange, className }) => {
  const [checked, setChecked] = useState(initialChecked || false);

  const handleCheck = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    if (onChange) {
      onChange(newChecked); // Pass the new state to the parent
    }
  };

  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer select-none ${className}`}>
      <span
        className={` relative h-5 w-5 rounded-[6px] border transition  ${checked ? 'bg-emerald-600 border-emerald-600' : 'bg-[#108A0033] border-[#108A0063]'}`}
        onClick={handleCheck}
        aria-hidden>
        {checked && <FaCheck className='!text-white h-3 w-3 absolute left-[2px] top-[2px]' />} {/* Display check icon when checked */}
      </span>
      <input type='checkbox' checked={checked} onChange={() => {}} className='hidden' />
      <span onClick={handleCheck} className='text-gray-800 text-[15px]'>{label}</span>
    </label>
  );
};

export default CheckBox;
