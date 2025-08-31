import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Modal } from './Modal';
import { baseImg } from '@/lib/axios';

const AttachmentList = ({ attachments , className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleAttachmentClick = file => {
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const isImage = file => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
  };

  const handleOpenInNewTab = file => {
    window.open(baseImg + file?.url, '_blank');
  };

  return (
    <div className={`mt-3 grid grid-cols-2 w-full  items-center gap-2 xl:gap-4 ${className} `}>
      {attachments?.length > 0 &&
        attachments.map((f, i) => (
          <div key={i} className='flex items-center  w-full gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer hover:bg-gray-100' onClick={() => handleAttachmentClick(f)}>
            <div className='w-12 h-12 flex-none rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-500 flex items-center justify-center'>
              <Paperclip className='w-6 h-6 text-white' />
            </div>
            <div className='min-w-0'>
              <div className='truncate text-sm font-medium text-gray-900'>{f.name}</div>
              <div className='text-xs text-gray-500'>{f.type}</div>
            </div>
          </div>
        ))}


      {isModalOpen && selectedFile && (
        <Modal title={'Preview File'} onClose={handleCloseModal}>
          {isImage(selectedFile) ? (
            <img src={baseImg + selectedFile?.url} alt={selectedFile?.name} className='w-full' />
          ) : (
            // Provide option to open in a new tab for non-image files (e.g., PDFs, Word docs)
            <div className='text-center'>
              <p className='text-gray-600'>This file cannot be previewed directly.</p>
              <button onClick={() => handleOpenInNewTab(selectedFile)} className='mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300'>
                Open in New Tab
              </button>
              <a href={baseImg + selectedFile?.url} download={selectedFile?.name} className='mt-4 ml-2 inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-300'>
                Download
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AttachmentList;
