import React from 'react';

const Tabs = ({ tabs  , activeTab , setActiveTab }) => {
  const handleTabChange = tab => {
    setActiveTab(tab);
  };

  return (
    <div className='flex items-center justify-start  w-full space-x-1  mb-6 relative'>
      <div className='absolute bottom-0 left-0 w-full h-[6px] bg-[#108A00]/20 '></div>
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => handleTabChange(tab.value)} className={` px-3 py-4 text-lg font-normal relative ${activeTab === tab.value ? ' after:absolute after:w-full after:h-[6px] after:bg-[#108A00] after:bottom-0 after:left-0 text-[#108A00] ' : 'text-black'} hover:text-[#108A00] after:duration-300 cursor-pointer hover:after:absolute hover:after:w-full hover:after:h-[6px] hover:after:bg-[#108A00] hover:after:bottom-0 hover:after:left-0 focus:outline-none`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
