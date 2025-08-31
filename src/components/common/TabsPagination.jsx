// Pagination.js - A reusable pagination component
import React, { useEffect } from 'react';
import Select from '../atoms/Select';

const TabsPagination = ({ currentPage, totalPages, onPageChange, onItemsPerPageChange, itemsPerPage }) => {
  
	useEffect(()=> {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	} ,[currentPage])
	return (
    totalPages > 1 && ( // Only show pagination if there is more than one page
      <div className='flex justify-between w-full items-center space-x-4 mt-6'>
        <div className='flex items-center space-x-2'>
          {/* Previous Button */}
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className='px-4 py-2 cursor-pointer gradient text-white rounded-l-md disabled:!opacity-30'>
            Prev
          </button>
          <span className='px-4 py-2'>{`Page ${currentPage} of ${totalPages}`}</span>
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className='px-4 py-2 cursor-pointer gradient text-white rounded-r-md disabled:opacity-30'>
            Next
          </button>
        </div>

        {/* Items per page selector using the Select component */}
        <Select
          options={[
            { id: 1, name: '5' },
            { id: 2, name: '10' },
            { id: 3, name: '20' },
            { id: 4, name: '50' },
          ]}
          value={itemsPerPage}
          onChange={selectedOption => onItemsPerPageChange(Number(selectedOption.name))}
          placeholder='Select items per page'
          cnLabel='text-sm text-gray-600'
          cnSelect='  text-sm text-gray-700'
					className=" mt-6 mb-8 !w-fit ml-auto"
        />
      </div>
    )
  );
};

export default TabsPagination;
