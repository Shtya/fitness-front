'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiUpload, FiX, FiCheck, FiAlertCircle, FiSearch } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import api, { baseImg } from '@/utils/axios';
import { File, FileText, ImageIcon, Music, Video } from 'lucide-react';

// ---- helpers --------------------------------------------------------------

const cx = (...cls) => cls.filter(Boolean).join(' ');

const safeJoin = (base, rel) => {
  const b = String(base || '').replace(/\/+$/, '');
  const r = String(rel || '').replace(/^\/+/, '');
  return r ? `${b}/${r}` : b;
};

export const getFileIcon = mimeType => {
  if (mimeType?.startsWith('image')) return <ImageIcon className='w-12 h-12 text-blue-500' />;
  if (mimeType?.startsWith('video')) return <Video className='w-12 h-12 text-purple-500' />;
  if (mimeType?.startsWith('audio')) return <Music className='w-12 h-12 text-green-500' />;
  if (mimeType === 'application/pdf' || mimeType === 'document') return <FileText className='w-12 h-12 text-red-500' />;
  return <File className='w-12 h-12 text-gray-400' />;
};

const BYTES_IN_KB = 1024;

// format size nicely
const formatSize = bytes => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// small toast-ish inline message
const InlineNotice = ({ tone = 'info', children }) => {
  const map = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <div className={cx('flex items-center gap-2 text-sm border rounded-lg px-3 py-2', map[tone] || map.info)}>
      <FiAlertCircle className='shrink-0' />
      <div className='min-w-0'>{children}</div>
    </div>
  );
};

// ---- component ------------------------------------------------------------

export default function AttachFilesButton({
  hiddenFiles,
  className = '',
  onChange,
  // optional constraints
  accept = undefined, // e.g. "image/*,application/pdf"
  maxFiles = 20,
  maxTotalBytes = 200 * 1024 * 1024, // 200 MB
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selected, setSelected] = useState([]); // [{id,...}]
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
 
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  // open → fetch assets
  useEffect(() => {
    if (isModalOpen) {
      fetchUserAssets();
      // esc to close
      const onKey = e => e.key === 'Escape' && setIsModalOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [isModalOpen]);

  const fetchUserAssets = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.get('/assets');
      const data = res?.data?.records || res?.data || [];
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      setAttachments([]);
      setErrorMsg('Failed to load your files. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => setIsModalOpen(v => !v);

  const isSelected = id => selected.some(s => s.id === id);

  const handleFileSelectToggle = file => {
    setSelected(prev => (isSelected(file.id) ? prev.filter(s => s.id !== file.id) : [...prev, file]));
  };

  const handleOkClick = () => {
    onChange?.(selected);
    setIsModalOpen(false);
  };

  const afterUploadMerge = (newFiles = []) => {
    // merge by id, avoid duplicates
    setAttachments(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      newFiles.forEach(n => map.set(n.id, n));
      return Array.from(map.values());
    });
  };

  const doUpload = async files => {
    if (!files?.length) return;
    setErrorMsg('');

    // basic limits
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (files.length > maxFiles) {
      setErrorMsg(`You can upload up to ${maxFiles} files at once.`);
      return;
    }
    if (totalBytes > maxTotalBytes) {
      setErrorMsg(`Total upload size exceeds ${formatSize(maxTotalBytes)}.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('category', 'general');

      const res = await api.post('/assets/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newFiles = res?.data?.assets || res?.data || [];
      afterUploadMerge(Array.isArray(newFiles) ? newFiles : []);
    } catch (err) {
      console.error('Upload error', err);
      setErrorMsg('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
 
  // drag & drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const stop = e => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = e => {
      stop(e);
      if (uploading) return;
      const files = Array.from(e.dataTransfer?.files || []);
      doUpload(files);
      el.classList.remove('ring-2', 'ring-indigo-300');
    };
    const onDragEnter = e => {
      stop(e);
      el.classList.add('ring-2', 'ring-indigo-300');
    };
    const onDragOver = stop;
    const onDragLeave = e => {
      stop(e);
      el.classList.remove('ring-2', 'ring-indigo-300');
    };

    el.addEventListener('drop', onDrop);
    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    return () => {
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
    };
  }, [uploading]);

  const handleDeleteFile = async (fileId, e) => {
    e?.stopPropagation?.();
    if (uploading) return;
    try {
      await api.delete(`/assets/${fileId}`);
      setAttachments(prev => prev.filter(f => f.id !== fileId));
      setSelected(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Delete error', err);
      setErrorMsg('Failed to delete file. Please try again.');
    }
  };

 
  // ---- modal view ---------------------------------------------------------

  const modalContent = (
    <div className='fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center' onClick={e => e.target === e.currentTarget && setIsModalOpen(false)} role='dialog' aria-modal='true' aria-label='Attach files'>
      <div className='bg-white w-full max-w-[800px] rounded-lg shadow-2xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col'>
        {/* header */}
        <div className='flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-200'>
          <div className='min-w-0'>
            <h3 className='text-lg font-semibold text-slate-900'>Your files</h3>
            <p className='text-xs text-slate-500'>Upload new files or pick from your library</p>
          </div>
          <button onClick={() => setIsModalOpen(false)} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300' aria-label='Close'>
            <FiX className='w-4 h-4' />
          </button>
        </div>

        {/* body */}
        <div className='flex-1 overflow-y-auto p-5 space-y-4'>
           
          {errorMsg ? <InlineNotice tone='error'>{errorMsg}</InlineNotice> : null}

          {/* grid */}
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {/* uploader card as a tile */}
            <button type='button' onClick={() => fileInputRef.current?.click()} disabled={uploading || loading} className={cx('group aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition', 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100', (uploading || loading) && 'opacity-60 cursor-not-allowed')}>
              <FiUpload className='w-6 h-6 text-indigo-500' />
              <span className='mt-1 text-xs text-indigo-700'>Upload</span>
            </button>

            {/* files */}
            {attachments.map(asset => {
              const selectedState = isSelected(asset.id);
              const url = asset?.mimeType?.startsWith('image/') ? safeJoin(baseImg, asset.url) : null;

              return (
                <div key={asset.id} onClick={() => handleFileSelectToggle(asset)} className={cx('group relative rounded-lg border p-2 bg-white transition cursor-pointer', 'hover:border-indigo-300 hover:shadow-sm', selectedState ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200')} tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleFileSelectToggle(asset)}>
                  {/* checkmark */}
                  <div className={cx('absolute top-2 left-2 w-6 h-6 rounded-full border flex items-center justify-center transition', selectedState ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/90 border-slate-300 text-transparent group-hover:text-slate-300')}>
                    <FiCheck className='w-4 h-4' />
                  </div>

                  {/* delete */}
                  <button type='button' onClick={e => handleDeleteFile(asset.id, e)} className='absolute top-2 right-2 w-7 h-7 rounded-lg border border-slate-200 bg-white/90 text-slate-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-rose-400' aria-label={`Delete ${asset.filename}`} disabled={uploading}>
                    <FiX className='w-4 h-4 mx-auto' />
                  </button>

                  {/* preview */}
                  <div className='aspect-square rounded-lg overflow-hidden flex items-center justify-center bg-slate-50'>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={asset.filename || 'image'} loading='lazy' className='w-full h-full object-contain' />
                    ) : (
                      <div className='flex items-center justify-center w-full h-full'>{getFileIcon(asset.mimeType)}</div>
                    )}
                  </div>

                  {/* meta */}
                  <div className='mt-2 text-xs'>
                    <div className='truncate text-slate-800' title={asset.filename}>
                      {asset.filename}
                    </div>
                    <div className='text-slate-500'>{formatSize(asset.size)}</div>
                  </div>
                </div>
              );
            })}
 
          </div>
        </div>

        {/* footer */}
        <div className='px-5 py-4 border-t bg-slate-50 flex items-center justify-between gap-3'>
          <div className='text-xs text-slate-500'>
            Total files: <span className='font-medium'>{attachments.length}</span>
          </div>

          <div className='flex items-center gap-2'>
            <button type='button' onClick={() => setIsModalOpen(false)} className='inline-flex items-center justify-center h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-300'>
              Cancel
            </button>

            <button type='button' onClick={handleOkClick} disabled={!selected.length} className={cx('inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white transition focus:outline-none focus:ring-2', selected.length ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400' : 'bg-emerald-300 cursor-not-allowed')}>
              Finish Selection {selected.length ? `(${selected.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- main trigger -------------------------------------------------------

  return (
    <div className={cx('relative', className)}>
      <div className='flex items-center gap-4 my-6'>
        <button type='button' onClick={toggleModal} className='flex-none px-5 py-2 inline-flex items-center gap-2 rounded-full border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-300'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src='/icons/attachment-green.svg' alt='' className='w-5 h-5' />
          <span className='font-medium'>Attach Files</span>
        </button>

        {!hiddenFiles && (
          <ul className='flex flex-wrap items-center gap-2 w-full'>
            {selected.map(file => (
              <li key={file.id} className='flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-sm'>
                <span className='truncate max-w-[160px]' title={file.filename}>
                  {file.filename}
                </span>
                <button type='button' onClick={() => setSelected(prev => prev.filter(f => f.id !== file.id))} className='text-slate-500 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300 rounded' aria-label={`Remove ${file.filename}`}>
                  <FiX className='w-3.5 h-3.5' />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && createPortal(modalContent, document.body)}
    </div>
  );
}
