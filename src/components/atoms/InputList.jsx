import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { Plus, X } from 'lucide-react';

const InputList = ({ label, value, setValue , onChange , getValues, fieldName, placeholder, errors, renderItem, onKeyPressHandler, onRemoveItemHandler }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddItem = () => {
    if (inputValue.trim()) {
      const currentItems = getValues(fieldName) || [];
      setValue(fieldName, [...currentItems, inputValue.trim()], { shouldValidate: true });
      setInputValue('');
			onChange?.([...currentItems, inputValue.trim()])
    }
  };

  const handleRemoveItem = index => {
    const updatedItems = value.filter((_, i) => i !== index);
    setValue(fieldName, updatedItems, { shouldValidate: true });
    if (onRemoveItemHandler) onRemoveItemHandler(index);
  };

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-gray-700 mb-2'>{label}</label>

      <div className='flex gap-2 mb-2'>
        <Input
          error={errors[fieldName]?.message}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyPress={
            onKeyPressHandler ||
            (e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItem();
              }
            })
          }
        />

        <Button
          type='button'
          onClick={handleAddItem}
          // name={addItemLabel}
          color='green'
          icon={<Plus />}
          className=' -mt-[2px] !px-3  !h-[45px] !max-w-fit'
        />
      </div>

      <div className='mt-2 flex flex-wrap gap-2'>
        {value?.map((item, index) => (
          <span key={index} className='bg-green-100 text-green-800 px-3 py-1 rounded-full text-base cursor-pointer hover:opacity-80 duration-300 flex items-center'>
            {renderItem ? renderItem(item, index) : item}
            <button type='button' onClick={() => handleRemoveItem(index)} className='ml-2 text-green-600 hover:text-green-800'>
              <X size={16} className='cursor-pointer' />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default InputList;
