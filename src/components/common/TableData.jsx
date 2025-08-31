// components/common/Table.jsx
'use client';
import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import PriceTag from '@/components/atoms/priceTag';
import Pagination from '@/components/atoms/Pagination';
import Select from '../atoms/Select';

const TableData = ({ data, columns, actions, pagination, onPageChange, onLimitChange, loading = false }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentLimit, setCurrentLimit] = useState(pagination?.limit || 10);

  const handleImageClick = imageSrc => {
    setSelectedImage(imageSrc);
  };

  const closeImagePreview = () => {
    setSelectedImage(null);
  };

  const handleLimitChange = newLimit => {
    setCurrentLimit(newLimit);
    if (onLimitChange) {
      onLimitChange(newLimit);
    }
  };

  // Show loading state
  if (loading) return <SkeletonTable columns={columns} actions={actions} />;

  return (
    <div className='bg-white rounded-lg shadow-inner border border-slate-200 '>
      <div className='overflow-x-auto rounded-lg pb-12 '>
        <table className='w-full table-auto border-collapse'>
          <thead className='bg-slate-50 border-b border-b-slate-200 '>
            <tr>
              {columns.map(column => (
                <th key={column.key} className='px-4 py-5 text-base text-nowrap font-semibold text-center'>
                  {column.label}
                </th>
              ))}
              {actions && <th className='px-4 py-3 text-base text-nowrap font-semibold text-center'>Action</th>}
            </tr>
          </thead>

          <tbody className=''>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className='px-4 py-12 text-center'>
                  <div className='flex flex-col items-center justify-center space-y-3'>
                    <div className='w-16 h-16 flex items-center justify-center rounded-full bg-slate-100'>
                      <svg className='scale-150' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'>
                        <rect x='4' y='12' width='56' height='40' rx='4' ry='4' fill='#F1F5F9' stroke='#94A3B8' stroke-width='2' />
                        <path d='M4 20h56M20 12v40M44 12v40' stroke='#94A3B8' stroke-width='2' />
                        <path d='M24 32h16M24 40h16' stroke='#CBD5E1' stroke-width='2' stroke-linecap='round' />
                        <path d='M8 48h48' stroke='#94A3B8' stroke-width='2' />
                      </svg>
                    </div>
                    <p className='text-lg font-semibold text-slate-700'>No data found</p>
                    <p className='text-sm text-slate-500 max-w-sm'>There are no records to display here yet. Try adjusting your filters or create a new item to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className='text-center odd:bg-[#108A000D] odd:hover:bg-[#108A00]/10 hover:bg-gray-50'>
                  {columns.map(column => (
                    <td key={column.key} className='text-nowrap px-4 py-4 text-base font-[500] text-gray-800'>
                      {column.type === 'img' ? (
                        <div className='relative cursor-pointer w-[80px] h-12 mx-auto'>
                          <img
                            onClick={() => handleImageClick(row[column.key])}
                            src={row[column.key]}
                            alt='Image'
                            className='w-full h-full object-cover rounded-md'
                            onError={e => {
                              e.target.src = '/icons/no-img.png';
                              e.target.classList.add('!object-contain');
                            }}
                          />
                          <Eye className='absolute top-[-8px] right-[-8px] p-[2px] rounded-md bg-white' onClick={() => handleImageClick(row[column.key])} />
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
                  {actions && <td className='px-4 py-4 text-sm'>{actions && actions(index)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className='flex justify-between items-center mt-8 py-4 px-4 border-t border-t-slate-200'>
          <div className='flex items-center space-x-4'>
            <span className='text-sm text-nowrap text-[var(--main)] '>
              <span className='font-[600] text-base text-black/80 '>Showing</span> {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} <span className='font-[600] text-base text-black/80 '> of </span> {pagination.total}
            </span>

            {/* Limit selector */}
            <Select
              onChange={e => handleLimitChange(parseInt(e.id))}
              value={+currentLimit}
              options={[
                { id: '10', name: '10 per page' },
                { id: '20', name: '20 per page' },
                { id: '30', name: '30 per page' },
                { id: '40', name: '40 per page' },
              ]}
            />
          </div>

          {/* Pagination */}
          <Pagination className='!mt-0' page={pagination.page} totalPages={pagination.pages} setPage={onPageChange} />
        </div>
      )}

      {selectedImage && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
          <div className='relative bg-white p-4 rounded-md'>
            <button onClick={closeImagePreview} className='w-[45px] h-[45px] flex items-center justify-center cursor-pointer hover:opacity-90 hover:scale-[1.05] duration-300 absolute top-2 right-2 text-white bg-black rounded-full p-2'>
              <X />
            </button>
            <img src={selectedImage} alt='Preview' className='max-w-[90vw] max-h-[90vh]' />
          </div>
        </div>
      )}
    </div>
  );
};

export default TableData;

const getStatusClass = (status, column) => {
  if (!column.status) return 'text-gray-600';

  const statusMapping = column.status.find(item => item[0] === status);
  return statusMapping ? statusMapping[1] : 'text-gray-600';
};
const SkeletonCell = ({ className = '' }) => (
  <td className={`px-4 py-4 align-middle`}>
    <div className={`h-4 w-full rounded bg-slate-200 relative overflow-hidden ${className}`}>
      <span className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent' />
    </div>
  </td>
);

function SkeletonTable({ columns, actions }) {
  const colsCount = columns?.length || 4;
  const showActions = Boolean(actions);
  const totalCols = colsCount + (showActions ? 1 : 0);
  const headerArray = Array.from({ length: colsCount });
  const rows = 10;

  return (
    <div className='bg-white rounded-lg shadow-inner border border-slate-200'>
      <div className='overflow-x-auto rounded-lg pb-12'>
        <table className='w-full table-auto border-collapse'>
          <thead className='bg-slate-50 border-b border-b-slate-200'>
            <tr>
              {headerArray.map((_, i) => (
                <th key={`h-${i}`} className='px-4 py-5 text-center'>
                  <div className='h-4 w-32 mx-auto rounded bg-slate-200 relative overflow-hidden'>
                    <span className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent' />
                  </div>
                </th>
              ))}
              {showActions && (
                <th className='px-4 py-5 text-center'>
                  <div className='h-4 w-20 mx-auto rounded bg-slate-200 relative overflow-hidden'>
                    <span className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent' />
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={`r-${r}`} className='text-center odd:bg-[#108A000D] odd:hover:bg-[#108A00]/10 hover:bg-gray-50'>
                {Array.from({ length: colsCount }).map((__, c) => (
                  <SkeletonCell key={`c-${r}-${c}`} />
                ))}
                {showActions && (
                  <td className='px-4 py-4'>
                    <div className='h-8 w-20 mx-auto rounded bg-slate-200 relative overflow-hidden'>
                      <span className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent' />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* شريط معلومات أسفل الجدول كهيكل */}
      <div className='flex justify-between items-center mt-8 py-4 px-4 border-t border-t-slate-200'>
        <div className='flex items-center space-x-4'>
          <div className='h-4 w-56 rounded bg-slate-200 relative overflow-hidden'>
            <span className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent' />
          </div>
          <div className='h-9 w-36 rounded bg-slate-200 relative overflow-hidden' />
        </div>
        <div className='h-9 w-40 rounded bg-slate-200 relative overflow-hidden' />
      </div>
    </div>
  );
}
