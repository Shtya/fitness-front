'use client';

import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import api, { baseImg } from '@/lib/axios';
import { File, FileText, ImageIcon, Music, Video } from 'lucide-react';

// Get file icon based on type
export const getFileIcon = mimeType => {
   if (mimeType?.startsWith('image')) {
    return <ImageIcon className='w-18 h-full text-blue-500' />;
  } else if (mimeType?.startsWith('video')) {
    return <Video className='w-18 h-full text-purple-500' />;
  } else if (mimeType?.startsWith('audio')) {
    return <Music className='w-18 h-full text-green-500' />;
  } else if (mimeType === 'application/pdf' || mimeType === "document" ) {
    return <FileText className='w-18 h-full text-red-500' />;
  } else {
    return <File className='w-18 h-full text-gray-400' />;
  }
};

export default function AttachFilesButton({ hiddenFiles, className, onChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOkButton, setShowOkButton] = useState(false);

  // Fetch user assets on modal open
  useEffect(() => {
    if (isModalOpen) {
      fetchUserAssets();
    }
  }, [isModalOpen]);

  const fetchUserAssets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets');
      setAttachments(response.data.records || response.data);
    } catch (error) {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleFileChange = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      formData.append('category', 'general');

      const response = await api.post('/assets/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add newly uploaded files to attachments
      const newFiles = response.data.assets || response.data;
      setAttachments(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleFileSelect = file => {
    const updatedFiles = selectedFiles.includes(file) ? selectedFiles.filter(f => f.id !== file.id) : [...selectedFiles, file];

    setSelectedFiles(updatedFiles);
    setShowOkButton(updatedFiles.length > 0);
  };

  const handleOkClick = () => {
    onChange?.(selectedFiles);
    toggleModal();
  };

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation(); // Prevent triggering select
    try {
      await api.delete(`/assets/${fileId}`);
      setAttachments(prev => prev.filter(file => file.id !== fileId));
      setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const modalContent = (
    <div
      className='fixed inset-0 z-50 bg-gray-800/50 backdrop-blur-lg flex items-center justify-center transition-opacity duration-300 ease-in-out'
      onClick={e => {
        if (e.target === e.currentTarget) {
          toggleModal();
        }
      }}>
      <div className='bg-white p-6 rounded-lg w-full max-w-[90vw] sm:max-w-[700px] shadow-lg max-h-[80vh] overflow-hidden flex flex-col'>
        <h3 className='text-lg font-semibold mb-4'>Uploaded Attachments</h3>

        <div className='flex-1 overflow-y-auto'>
          <div>
            <h3 className='text-sm font-semibold text-gray-700 mb-3'>Your Files</h3>

            <div className='grid grid-cols-2 sm:grid-cols-3 gap-4 p-2 bg-gray-50 border border-gray-200 rounded-lg'>
              {/* Upload Button */}
              <label className='hover:scale-[.98] flex flex-col items-center justify-center text-center p-2 h-[130px] w-full border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition duration-300 relative'>
                <input type='file' className='sr-only' onChange={handleFileChange} multiple disabled={uploading || loading} />
                <FiUpload className='h-6 w-6 text-indigo-400' />
                <span className='mt-1 text-xs text-indigo-600'>Upload</span>

                {(uploading || loading) && (
                  <div className='absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-lg'>
                    <FaSpinner className='animate-spin h-5 w-5 text-indigo-500' />
                  </div>
                )}
              </label>

              {/* User Uploaded Files */}
              {attachments.map(asset => (
                <button key={asset.id} onClick={() => handleFileSelect(asset)} className={`cursor-pointer hover:scale-[.98] duration-300 h-fit group relative shadow-inner rounded-lg border border-gray-200 hover:border-indigo-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 p-2 bg-white ${selectedFiles.some(f => f.id === asset.id) ? '!border-[var(--main)] !bg-[var(--main)]/20 border' : ''}`}>
                  <button onClick={e => handleDeleteFile(asset.id, e)} className='absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity'>
                    <FiX className='w-3 h-3' />
                  </button>

                  {asset.mimeType?.startsWith('image/') ? <img src={baseImg + asset.url} alt={asset.filename} className='aspect-square mx-auto w-[100px] object-contain rounded' /> : <div className=' mx-auto aspect-square w-[100px] flex items-center justify-center  rounded-md'>{getFileIcon(asset.mimeType)}</div>}
                  <p className='mt-2 text-xs text-gray-600 text-center truncate' title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className='text-xs text-gray-400'>{Math.round(asset.size / 1024)} KB</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OK Button */}
        {showOkButton && (
          <div className='flex justify-center mt-4 pt-4 border-t'>
            <button onClick={handleOkClick} className='cursor-pointer px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'>
              Finish Selection ({selectedFiles.length} files selected)
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <div className='flex items-center gap-4 mt-6 mb-6'>
        <button onClick={toggleModal} className='flex-none px-10 flex items-center gap-2 py-2 rounded-4xl border border-[#108A00] text-[#108A00] cursor-pointer hover:bg-green-50 transition-colors'>
          <img src={'/icons/attachment-green.svg'} alt='' className='w-5 h-5' />
          <span className='font-medium'>Attach Files</span>
        </button>

        {!hiddenFiles && (
          <ul className='flex flex-wrap items-center gap-2 w-full'>
            {selectedFiles.map((file, index) => (
              <li key={index} className='flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm'>
                <span className='truncate max-w-[120px]' title={file.filename}>
                  {file.filename}
                </span>
                <button onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== file.id))} className='text-red-500 hover:text-red-700'>
                  <FiX className='w-3 h-3' />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && ReactDOM.createPortal(modalContent, document.body)}
    </div>
  );
}
