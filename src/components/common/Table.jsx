"use client"
import { useState } from 'react';
import Pagination from '../atoms/Pagination';
import { Eye, X } from 'lucide-react';
import PriceTag from '../atoms/priceTag';

const Table = ({ data, columns, actions }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const rowsPerPage = 10;

  // Handle pagination (change current page)
  const handlePageChange = page => {
    setCurrentPage(page);
  };

  // Get current rows to display
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = data.slice(startIndex, startIndex + rowsPerPage);

  const getStatusClass = (status, column) => {
    const statusMapping = column.status.find(item => item[0] === status);
    return statusMapping ? statusMapping[1] : 'text-gray-600'; // Default color if no match
  };

  const handleImageClick = imageSrc => {
    setSelectedImage(imageSrc);
  };

  // Close image preview
  const closeImagePreview = () => {
    setSelectedImage(null);
  };

  return (
    <div className='bg-white rounded-lg shadow-inner border border-slate-200 '>
      <div className='overflow-x-auto rounded-lg pb-12 '>
        <table className='w-full table-auto border-collapse'>
          <thead className='bg-slate-50 border-b border-b-slate-200 '>
            <tr>
              {columns.map(column => (
                <th key={column.key} className='  px-4 py-5 text-base text-nowrap font-semibold  text-center'>
                  {column.label}
                </th>
              ))}
              {actions && <th className='px-4 py-3 text-base text-nowrap font-semibold  text-center'>Action</th>}
            </tr>
          </thead>

          <tbody className=''>
            {currentRows.map((row, index) => (
              <tr key={index} className=' text-center odd:bg-[#108A000D] odd:hover:bg-[#108A00]/10 hover:bg-gray-50'>
                {columns.map((column) => (
                  <td key={column.key} className="text-nowrap px-4 py-4 text-sm text-gray-800">
                    {column.type === 'img' ? (
                      <div className="relative cursor-pointer w-[80px] h-12 mx-auto">
                        <img
                          onClick={() => handleImageClick(row[column.key])}
                          src={row[column.key]}
                          alt="Image"
                          className="w-full h-full object-cover rounded-md"
                        />
                        <Eye
                          className="absolute top-[-8px] right-[-8px] p-[2px] rounded-md bg-white"
                          onClick={() => handleImageClick(row[column.key])}
                        />
                      </div>
                    ) : column.key === 'status' ? (
                      <span className={getStatusClass(row[column.key], column)}>{row[column.key]}</span>
                    ) : column.type === 'price' ? (
                      <PriceTag price={row[column.key]} />
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
                {actions && <td className='px-4 py-4 text-sm'>{actions && actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='flex justify-between items-center mt-8 py-4 px-4 border-t border-t-slate-200 '>
        <span className='text-sm text-gray-500'>
          Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, data.length)} of {data.length}
        </span>

        {/* Pagination */}
        <Pagination className='!mt-0' page={currentPage} totalPages={Math.ceil(data.length / rowsPerPage)} setPage={handlePageChange} />
      </div>

      {selectedImage && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
          <div className='relative bg-white p-4 rounded-md'>
            <button onClick={closeImagePreview} className=' w-[45px] h-[45px] flex items-center justify-center cursor-pointer hover:opacity-90 hover:scale-[1.05] duration-300 absolute top-2 right-2 text-white bg-black rounded-full p-2'>
              <X />
            </button>
            <img src={selectedImage} alt='Preview' className='max-w-[90vw] max-h-[90vh]' />
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
